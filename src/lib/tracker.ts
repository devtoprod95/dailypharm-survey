// ─── 접근/활동 추적 ──────────────────────────────────────────
// 페이지 진입 및 주요 행동을 Firestore(access_logs)에 저장하고 텔레그램으로 알린다.
// 추적 실패가 서비스 동작을 방해하면 안 되므로 모든 에러는 조용히 무시한다.

import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { getPageTitle } from "./pageTitles";

export const ACCESS_LOG_COLLECTION = "access_logs";
/**
 * IP별 설정 컬렉션. 문서 ID = IP
 *  - track(boolean, 기본 true): false 면 해당 IP는 로그 자체를 기록하지 않음(모니터링 제외)
 */
export const IP_SETTING_COLLECTION = "tracker_ip_settings";

/** 추적에서 제외할 경로 (쿼리스트링 제외한 pathname 기준) */
const EXCLUDED_PATHS = new Set<string>([
  "/", // 최신 설문으로 리다이렉트되는 진입 경로
  "/access-logs", // 로그 조회 페이지 자체
  "/admin-login", // 관리자 로그인
]);

const IP_CACHE_KEY = "tracker_ip";

export type LogType = "page" | "action";

export function normalizePath(path: string): string {
  const pure = path.split("?")[0].split("#")[0];
  return pure.length > 1 ? pure.replace(/\/+$/, "") : pure || "/";
}

/** 공개 랜딩 상세(/landing/view/*)는 모두 추적 제외 */
const EXCLUDED_PREFIXES = ["/landing/view/"];

export function isExcludedPath(path: string): boolean {
  const p = normalizePath(path);
  return EXCLUDED_PATHS.has(p) || EXCLUDED_PREFIXES.some((prefix) => p.startsWith(prefix));
}

/** 현재 해시 라우터 경로 (예: "/landing/view/abc?x=1") */
function currentHashPath(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

let ipPromise: Promise<string> | null = null;

/** 공인 IP 조회 (세션 동안 캐시). 실패 시 "unknown" */
export function getClientIp(): Promise<string> {
  if (ipPromise) return ipPromise;
  const cached = sessionStorage.getItem(IP_CACHE_KEY);
  if (cached) {
    ipPromise = Promise.resolve(cached);
    return ipPromise;
  }
  ipPromise = (async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      if (!res.ok) return "unknown";
      const data = await res.json();
      const ip = (data.ip as string) || "unknown";
      if (ip !== "unknown") sessionStorage.setItem(IP_CACHE_KEY, ip);
      return ip;
    } catch {
      return "unknown";
    }
  })();
  return ipPromise;
}

/**
 * 같은 경로의 연속 호출만 걸러낸다. (React StrictMode 의 이펙트 이중 실행 방지용, 2초)
 * 기록 자체는 접근할 때마다 남기고, 같은 항목의 집계는 요약 배치에서 ×N 으로 묶는다.
 */
const GUARD_MS = 2000;
const recentCalls = new Map<string, number>();

function isRapidRepeat(key: string): boolean {
  const now = Date.now();
  const last = recentCalls.get(key) ?? 0;
  recentCalls.set(key, now);
  return now - last < GUARD_MS;
}

const trackCache = new Map<string, { enabled: boolean; at: number }>();
const TRACK_TTL_MS = 60 * 1000;

/** 해당 IP가 모니터링 제외 대상이 아니면 true (설정 없음/조회 실패 시 true) */
async function isTrackingEnabled(ip: string): Promise<boolean> {
  const cached = trackCache.get(ip);
  if (cached && Date.now() - cached.at < TRACK_TTL_MS) return cached.enabled;
  let enabled = true;
  try {
    const snap = await getDoc(doc(db, IP_SETTING_COLLECTION, ip));
    if (snap.exists() && snap.data().track === false) enabled = false;
  } catch {
    /* 조회 실패 시 기본값 유지 */
  }
  trackCache.set(ip, { enabled, at: Date.now() });
  return enabled;
}

async function record(params: {
  type: LogType;
  path: string;
  action?: string;
  detail?: string;
  dedupe: boolean;
}): Promise<void> {
  try {
    if (params.dedupe && isRapidRepeat(params.path)) return;
    const ip = await getClientIp();
    if (!(await isTrackingEnabled(ip))) return;

    // 텔레그램은 여기서 보내지 않는다. notified=false 로 쌓아 두면 GitHub Actions 배치(access-digest)가 요약 발송한다.
    await addDoc(collection(db, ACCESS_LOG_COLLECTION), {
      type: params.type,
      ip,
      path: params.path,
      title: getPageTitle(params.path),
      action: params.action ?? "",
      detail: params.detail ?? "",
      userAgent: navigator.userAgent,
      notified: false,
      created_at: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[tracker] 기록 실패:", e);
  }
}

/** 페이지 진입 기록 (제외 경로는 무시, 같은 IP·경로는 5분 내 중복 무시) */
export function trackPageView(path: string): void {
  const normalized = normalizePath(path);
  if (isExcludedPath(normalized)) return;
  void record({ type: "page", path: normalized, dedupe: true });
}

/** 주요 행동 기록. 현재 페이지가 제외 대상이면 무시한다. */
export function trackAction(action: string, detail?: string): void {
  const path = normalizePath(currentHashPath());
  if (isExcludedPath(path)) return;
  void record({ type: "action", path, action, detail, dedupe: false });
}

// ─── 텔레그램 알림 유틸 ──────────────────────────────────────
// 방법 A: 클라이언트(브라우저)에서 Telegram Bot API 를 직접 호출한다.
// 주의: VITE_ 환경변수는 빌드 시 번들에 평문으로 포함되어 노출된다.
//       개인 알림 용도로만 사용하며, 토큰 노출 위험을 감수한 구성이다.

const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string | undefined;
const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID as string | undefined;

/** 텔레그램 HTML parse_mode 에서 문제되는 특수문자를 이스케이프 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** HTML 태그를 제거하고 순수 텍스트만 추출 (상세 내용 미리보기용) */
function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}

export interface FeatureRequestNotice {
  typeLabel: string;
  title: string;
  author: string;
  contentHtml: string;
}

/**
 * 건의 등록 알림을 텔레그램으로 전송한다.
 * 환경변수가 설정되지 않았거나 전송에 실패해도 예외를 던지지 않는다.
 * (알림 실패가 건의 등록 자체를 방해하면 안 되므로 조용히 무시)
 */
export async function sendFeatureRequestNotice(
  notice: FeatureRequestNotice
): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("[telegram] 봇 토큰/챗 ID 가 설정되지 않아 알림을 건너뜁니다.");
    return;
  }

  const preview = stripHtml(notice.contentHtml);
  const trimmedPreview =
    preview.length > 500 ? preview.slice(0, 500) + "…" : preview;

  const text =
    `📮 <b>새 건의가 등록되었습니다</b>\n\n` +
    `• <b>유형:</b> ${escapeHtml(notice.typeLabel)}\n` +
    `• <b>제목:</b> ${escapeHtml(notice.title)}\n` +
    `• <b>작성자:</b> ${escapeHtml(notice.author)}\n\n` +
    `<b>내용</b>\n${escapeHtml(trimmedPreview)}`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn("[telegram] 알림 전송 실패:", res.status, errBody);
    }
  } catch (e) {
    console.warn("[telegram] 알림 전송 중 오류:", e);
  }
}


export interface AccessLogNoticeItem {
  type: "page" | "action";
  title: string;
  action: string;
  detail: string;
  time: Date | null;
}

const MAX_MESSAGE_LEN = 3800; // 텔레그램 4096자 제한 여유

function fmtHm(d: Date | null): string {
  return d
    ? d.toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit" })
    : "--:--";
}

function logLabel(l: AccessLogNoticeItem): string {
  return l.type === "action"
    ? `[활동] ${l.action}${l.detail ? ` (${l.detail})` : ""}`
    : `[페이지] ${l.title}`;
}

/** 로그 목록을 텔레그램 길이 제한에 맞춰 여러 메시지로 만든다. (연속 동일 항목은 ×N 으로 합침) */
function buildAccessLogMessages(ip: string, logs: AccessLogNoticeItem[]): string[] {
  // 시간 오름차순
  const sorted = [...logs].sort((a, b) => (a.time?.getTime() ?? 0) - (b.time?.getTime() ?? 0));
  const merged: { time: Date | null; label: string; n: number }[] = [];
  for (const l of sorted) {
    const label = logLabel(l);
    const last = merged[merged.length - 1];
    if (last && last.label === label) last.n++;
    else merged.push({ time: l.time, label, n: 1 });
  }

  const title = `📍 <b>${escapeHtml(ip)}</b> (${logs.length}건)`;
  const header = `📊 <b>방문 기록 (수동 전송)</b>\n${title}`;
  const contHeader = `📊 <b>방문 기록 (계속)</b>\n${title}`;

  const messages: string[] = [];
  let cur = header;
  for (const m of merged) {
    const line = `${fmtHm(m.time)} ${escapeHtml(m.label)}${m.n > 1 ? ` ×${m.n}` : ""}`;
    if (cur.length + line.length + 1 > MAX_MESSAGE_LEN) {
      messages.push(cur);
      cur = contHeader;
    }
    cur += `\n${line}`;
  }
  messages.push(cur);
  return messages;
}

/**
 * 특정 IP 의 접근 로그를 텔레그램으로 전송한다.
 * 알림과 달리 사용자가 직접 누르는 동작이므로, 실패하면 예외를 던진다.
 */
export async function sendAccessLogNotice(
  ip: string,
  logs: AccessLogNoticeItem[]
): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error("텔레그램 봇 토큰/챗 ID 가 설정되지 않았습니다.");
  }
  for (const text of buildAccessLogMessages(ip, logs)) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`텔레그램 전송 실패 (${res.status}) ${errBody}`);
    }
  }
}

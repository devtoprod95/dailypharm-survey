// 경로 → 한글 페이지명. 알림/로그에서 URL 대신 이 이름을 사용한다.
const STATIC_TITLES: Record<string, string> = {
  "/landing": "랜딩 관리",
  "/landing/store": "랜딩 작성",
  "/deploy": "배포 관리",
  "/excel-down": "설문 리스트",
  "/feature-request": "건의함",
  "/test": "시스템 테스트",
  "/access-logs": "방문자 모니터링",
  "/admin-login": "관리자 로그인",
};

/** 경로에 해당하는 한글 페이지명. 등록되지 않은 경로는 경로 그대로 반환 */
export function getPageTitle(path: string): string {
  const p = path.split("?")[0].replace(/\/+$/, "") || "/";
  if (STATIC_TITLES[p]) return STATIC_TITLES[p];

  let m = p.match(/^\/landing\/store\/(.+)$/);
  if (m) return `랜딩 수정 (${decodeURIComponent(m[1])})`;

  m = p.match(/^\/landing\/view\/(.+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    return id === "preview" ? "랜딩 미리보기" : `랜딩 상세 (${id})`;
  }
  return p;
}

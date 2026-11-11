// 접근 로그 관리 권한(비밀번호 통과 여부). 세션 동안만 유지된다.
const AUTH_KEY = "access_log_auth";
export const ACCESS_AUTH_EVENT = "access-auth-change";

export function isAccessAuthed(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}

export function setAccessAuthed(value: boolean): void {
  if (value) sessionStorage.setItem(AUTH_KEY, "1");
  else sessionStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event(ACCESS_AUTH_EVENT));
}

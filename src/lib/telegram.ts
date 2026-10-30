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

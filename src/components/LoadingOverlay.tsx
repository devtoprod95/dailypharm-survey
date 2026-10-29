import { createPortal } from "react-dom";

interface LoadingOverlayProps {
  /** 오버레이 표시 여부 */
  open: boolean;
  /** 메인 메시지 (예: "등록하는 중...") */
  message?: string;
  /** 보조 설명 (예: "이미지 처리에 시간이 걸릴 수 있어요") */
  description?: string;
}

/**
 * 화면 전체를 덮는 로딩 오버레이.
 * 작업(등록/수정/삭제, 이미지 업로드 등) 진행 중 사용자 입력을 막고
 * 진행 상태를 시각적으로 보여준다.
 */
export default function LoadingOverlay({ open, message = "처리 중입니다...", description }: LoadingOverlayProps) {
  if (!open) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes lo-spin { to { transform: rotate(360deg); } }
        @keyframes lo-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lo-pop { from { opacity: 0; transform: translateY(8px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes lo-pulse { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
      `}</style>
      <div
        role="alert"
        aria-live="assertive"
        aria-busy="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          animation: "lo-fade 0.2s ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            padding: "34px 40px",
            borderRadius: 20,
            background: "#ffffff",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            minWidth: 240,
            animation: "lo-pop 0.25s ease-out",
          }}
        >
          {/* 그라데이션 링 스피너 */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "conic-gradient(from 0deg, #27ae60, #5b8def, #27ae60)",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 6px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 6px))",
              animation: "lo-spin 0.9s linear infinite",
            }}
          />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1f2937" }}>{message}</div>
            {description && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "#6b7280",
                  animation: "lo-pulse 1.6s ease-in-out infinite",
                }}
              >
                {description}
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

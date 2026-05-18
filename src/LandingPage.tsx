import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

export default function LandingPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // 💡 무한 루프 방지용 확실한 안전장치 (strict mode 등에서 두 번 실행 차단)
  const isFetched = useRef(false); 

  useEffect(() => {
    // 이미 패치 진행 중이거나 완료했다면 리턴해서 두 번 실행 차단
    if (isFetched.current) return;
    isFetched.current = true;

    const redirectToLatestSurvey = async () => {
      try {
        const surveyRef = collection(db, "survey_list");
        const q = query(surveyRef, orderBy("created_at", "desc"), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const latestDoc = querySnapshot.docs[0];
          
          // 💡 문서의 ID를 안전하게 추출 (survey-2026-05)
          const latestId = latestDoc.data().name.trim(); 

          if (latestId) {
            // 💡 절대 주소인 /landing/ID 형태로 replace 이동
            navigate(`/landing/${latestId}`, { replace: true });
          } else {
            setError("최신 설문지의 고유 ID(문서 ID)가 유효하지 않습니다.");
          }
        } else {
          setError("파이어베이스 'survey_list' 컬렉션에 등록된 문서가 하나도 없습니다.");
        }
      } catch (err) {
        console.error("최신 랜딩 페이지 로드 중 오류 발생:", err);
        setError("서버에서 페이지 정보를 불러오지 못했습니다. 콘솔 창을 확인하세요.");
      }
    };

    redirectToLatestSurvey();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      {error ? (
        <div className="text-center box-border max-w-sm">
          <p className="text-red-500 font-bold text-[16px] break-keep mb-3">
            ❌ {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-[13px] bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-200"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-bold text-[15px] mt-2">
            최신 신청 페이지로 연결 중입니다...
          </p>
        </div>
      )}
    </div>
  );
}
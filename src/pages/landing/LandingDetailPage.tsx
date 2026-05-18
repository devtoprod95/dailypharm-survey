import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase"; 
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// --- 기본 fallback 설정 체계 보정 ---
const INITIAL_CONFIG = {
  title: "팜스타트 대행 서비스 신청",
  subtitle: "✨ 현재 팜스타트 패키지 신청 시 39만원 이상 절감 혜택 제공 중!",
  show_title: true,
  show_subtitle: true,
  show_disagree_notice: true,
  show_footer_notice1: true,
  show_footer_notice2: true,
  submit_button_text: "무료 상담하고 혜택 받기",
  disagree_notice_text: "※ 미동의 시 상담 및 이벤트 혜택 수령이 불가능합니다.",
  footer_notice_text1: "정보는 서비스 안내 및 상담 목적으로만 사용됩니다.",
  footer_notice_text2: "관련 문의 이메일 : pharmstart@dailypharm.com",
  fields: {}, // 동적 필드가 저장될 공간
  terms_privacy: { show: true, title: "개인정보 수집 및 이용 동의 (필수)", content: "" },
  terms_third_party: { show: true, title: "개인정보 제3자 제공 동의 (필수)", content: "" }
};

export default function LandingDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const [landingData, setLandingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 동적 필드 입력을 위해 객체 형태로 상태 관리
  const [form, setForm] = useState<Record<string, string>>({});
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchLandingConfig = async () => {
      if (!name) return;
      setLoading(true);
      try {
        const q = query(collection(db, "survey_list"), where("name", "==", name.trim()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const rawData = docSnap.data();
          
          const mergedData = {
            ...INITIAL_CONFIG,
            ...rawData,
            fields: rawData.fields || {},
            terms_privacy: { ...INITIAL_CONFIG.terms_privacy, ...rawData.terms_privacy },
            terms_third_party: { ...INITIAL_CONFIG.terms_third_party, ...rawData.terms_third_party },
          };

          setLandingData(mergedData);

          // 🔥 받아온 동적 필드 정보에 맞춰 form State 초기화 객체 생성
          const initialFormValues: Record<string, string> = {};
          Object.keys(mergedData.fields).forEach((key) => {
            initialFormValues[key] = "";
          });
          setForm(initialFormValues);

        } else {
          alert("존재하지 않거나 삭제된 랜딩 페이지입니다.");
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("랜딩 데이터 로드 오류:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLandingConfig();
  }, [name, navigate]);

  // 🔥 입력 변경 핸들러 (타입별 입력 제어 추가)
  const handleInputChange = (key: string, value: string, type: string) => {
    // 숫자 타입(number)인 경우 문자가 들어오지 못하게 사전에 차단
    if (type === "number") {
      const onlyNums = value.replace(/[^0-9-]/g, "");
      setForm((prev) => ({ ...prev, [key]: onlyNums }));
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || !landingData) return;

    setErrorField(null);

    // 🔥 동적 필드 유효성 검사 루프 파트
    const phoneRegex = /^010-?\d{3,4}-?\d{4}$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const fieldEntries = Object.entries(landingData.fields);
    
    for (const [key, config] of fieldEntries as [string, any][]) {
      if (!config || config.show === false) continue;

      const userValue = (form[key] || "").trim();

      // 1. 필수값 체크
      if (config.required && !userValue) {
        alert(`[${config.label}] 항목을 입력해주세요.`);
        setErrorField(key);
        document.getElementById(`field-container-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // 2. 입력값이 존재할 때 타입별 포맷 벨리데이션 체크
      if (userValue) {
        if (config.type === "number" && !phoneRegex.test(userValue)) {
          alert(`[${config.label}] 항목에 올바른 연락처 형식을 입력해주세요. (예: 010-1234-5678)`);
          setErrorField(key);
          document.getElementById(`field-container-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (config.type === "email" && !emailRegex.test(userValue)) {
          alert(`[${config.label}] 항목에 올바른 이메일 주소 형식을 입력해주세요.`);
          setErrorField(key);
          document.getElementById(`field-container-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }
    }

    // 약관동의 체크
    if (landingData.terms_privacy?.show && !agree1) {
      alert(`${landingData.terms_privacy.title || "개인정보 수집 및 이용 동의"}에 체크해 주세요.`);
      document.getElementById("consent-section-wrapper")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (landingData.terms_third_party?.show && !agree2) {
      alert(`${landingData.terms_third_party.title || "개인정보 제3자 제공 동의"}에 체크해 주세요.`);
      document.getElementById("consent-section-wrapper")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);

    try {
      if (name) {
        // 🔥 어떤 데이터인지 보기 편하도록 라벨명을 키값으로 매핑한 전송용 결과 데이터 생성
        const submissionAnswers: Record<string, string> = {};
        Object.entries(landingData.fields).forEach(([key, config]: [string, any]) => {
          if (config.show !== false) {
            // 연락처 숫자 타입의 경우 하이픈을 제거하고 깨끗한 숫자만 가공해서 저장
            let finalVal = form[key] || "";
            if (config.type === "number") {
              finalVal = finalVal.replace(/-/g, "");
            }
            submissionAnswers[config.label || key] = finalVal.trim();
          }
        });

        await addDoc(collection(db, name), {
          target: landingData.name || name,
          ...form,
          created_at: serverTimestamp(),
        });
      } else {
        alert("신청이 실패했습니다. 관리자에 문의해주세요.");
        return;
      }

      alert("신청이 완료되었습니다.");
      
      // Form 초기화
      const clearedForm: Record<string, string> = {};
      Object.keys(form).forEach((k) => (clearedForm[k] = ""));
      setForm(clearedForm);
      setAgree1(false);
      setAgree2(false);
      
    } catch (error) {
      console.error("Firebase 전송 에러:", error);
      alert("신청이 실패했습니다. 관리자에 문의해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-500 font-bold">
        페이지 구성을 불러오는 중입니다...
      </div>
    );
  }

  if (!landingData) return null;

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden w-full flex flex-col items-center touch-pan-y">
      
      {/* 1. 상단 동적 배너 이미지 섹션 */}
      {landingData.show_top_image && (
        <section className={`w-full max-w-[480px] bg-white transition-all duration-300 flex items-center justify-center ${isImageLoaded ? "h-auto" : "min-h-[200px]"}`}>
          <img
            src={`${import.meta.env.BASE_URL}${landingData.top_image_url?.replace(/^\//, '') || 'assets/landing.png'}`}
            alt="랜딩 이미지"
            className="w-full h-auto block object-contain"
            onLoad={() => setIsImageLoaded(true)}
            loading="eager"
          />
        </section>
      )}

      {/* 2. 메인 서베이 입력 카드 폼 */}
      <section className="w-full max-w-[480px] py-6 px-4 box-border">
        <div className="w-full bg-white rounded-3xl border border-gray-200 shadow-xl px-5 py-10 sm:px-8 box-border overflow-hidden">
          
          {/* 타이틀 영역 */}
          {(landingData.show_title || landingData.show_subtitle) && (
            <div className="text-center mb-8">
              {landingData.show_title && (
                <h2 className="text-[22px] font-black text-gray-900 mb-2 tracking-tight break-keep">
                  {landingData.title}
                </h2>
              )}
              {landingData.show_subtitle && (
                <p className="text-[15px] font-bold text-gray-800 break-keep leading-relaxed mt-4 bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">
                  {landingData.subtitle}
                </p>
              )}
            </div>
          )}

          {/* 🔥 무작위 시스템 키 구조에 종속되지 않고, key(field_1, field_2...) 기준으로 오름차순 정렬하여 노출 */}
          <div className="space-y-5 mb-8 w-full">
            {Object.entries(landingData.fields)
              // 🔥 name -> phone -> pharmacy 순서로 최상단 고정, 나머지는 오름차순 정렬
              .sort(([keyA], [keyB]) => {
                const fixedKeys = ["name", "phone", "pharmacy"];
                const isA_Fixed = fixedKeys.includes(keyA);
                const isB_Fixed = fixedKeys.includes(keyB);

                if (isA_Fixed && isB_Fixed) {
                  return fixedKeys.indexOf(keyA) - fixedKeys.indexOf(keyB);
                }
                if (isA_Fixed) return -1;
                if (isB_Fixed) return 1;

                return keyA.localeCompare(keyB, undefined, { numeric: true, sensitivity: 'base' });
              })
              .map(([key, config]: [string, any]) => {
                if (!config || config.show === false) return null;
                
                // 인풋 플레이스홀더 분기 정의
                let placeholderText = `${config.label}을(를) 입력해주세요.`;
                if (config.type === "number") placeholderText = "010-0000-0000";
                if (config.type === "email") placeholderText = "example@email.com";

                return (
                  <div key={key} id={`field-container-${key}`} className="flex flex-col gap-2 w-full">
                    <label className="text-[14px] font-bold text-gray-800 ml-1">
                      {config.label} {config.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={config.type === "email" ? "email" : "text"}
                      inputMode={config.type === "number" ? "tel" : "text"}
                      placeholder={placeholderText}
                      value={form[key] || ""}
                      onChange={(e) => handleInputChange(key, e.target.value, config.type)}
                      className={`w-full border rounded-xl px-4 py-3.5 text-[16px] outline-none transition-all duration-300 box-border ${errorField === key ? "border-red-500 bg-red-50" : "border-gray-300 focus:border-teal-500"}`}
                    />
                  </div>
                );
              })}
          </div>

          {/* 동의 영역 */}
          <div id="consent-section-wrapper">
            {landingData.terms_privacy?.show && (
              <ConsentBlock 
                title={landingData.terms_privacy.title} 
                checked={agree1} 
                onChange={setAgree1}
                content={landingData.terms_privacy.content}
              />
            )}
            
            {landingData.terms_third_party?.show && (
              <ConsentBlock 
                title={landingData.terms_third_party.title} 
                checked={agree2} 
                onChange={setAgree2}
                content={landingData.terms_third_party.content}
              />
            )}
          </div>

          {/* 경고 안내 문구 */}
          {landingData.show_disagree_notice && (
            <div className="text-center mb-6">
              <p className="text-red-500 text-[14px] font-bold break-keep">
                {landingData.disagree_notice_text}
              </p>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl text-[17px] font-bold text-white shadow-lg transition-all ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-[#2D3136] hover:bg-black active:scale-95 cursor-pointer"}`}
          >
            {isSubmitting ? "신청 데이터를 보내는 중..." : landingData.submit_button_text}
          </button>

          {/* 푸터 영역 */}
          {landingData.show_footer_notice1 && (
            <p className="text-center text-gray-800 text-[14px] mt-6 font-bold">
              {landingData.footer_notice_text1}
            </p>
          )}

          {/* 푸터 안내문구 2 */}
          {landingData.show_footer_notice2 && (
            <p className="text-center text-gray-500 text-[12px] mt-3 font-bold break-keep">
              {landingData.footer_notice_text2}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function ConsentBlock({ title, checked, onChange, content }: any) {
  return (
    <div className="mb-6 w-full box-border">
      <h3 className="text-[15px] font-bold text-gray-900 mb-3 ml-1">{title}</h3>
      <div className="bg-[#F2F2F2] rounded-xl p-4 mb-3 border border-gray-100 max-h-[160px] overflow-y-auto">
        <div className="text-[13px] leading-[1.8] text-gray-700 font-medium whitespace-pre-line break-all">
          {content}
        </div>
      </div>
      <label 
        className="flex items-center gap-3 cursor-pointer select-none w-fit group mb-6"
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${checked ? "bg-teal-600 border-teal-600" : "bg-white border-gray-300"}`}>
          {checked && <svg className="w-4 h-4 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <span className="text-[15px] font-bold text-gray-800">동의합니다</span>
      </label>
    </div>
  );
}
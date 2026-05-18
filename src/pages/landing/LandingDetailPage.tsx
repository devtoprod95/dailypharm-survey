import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase"; 
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// --- DB 스키마에 맞춘 기본값 체계 보정 ---
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
  fields: {
    name: { show: true, label: "성함", required: true },
    phone: { show: true, label: "연락처", required: true },
    pharmacy: { show: true, label: "약국명", required: true },
  },
  terms_privacy: {
    show: true,
    title: "개인정보 수집 및 이용 동의 (필수)",
    content: ""
  },
  terms_third_party: {
    show: true,
    title: "개인정보 제3자 제공 동의 (필수)",
    content: ""
  }
};

export default function LandingDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const [landingData, setLandingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ name: "", phone: "", pharmacy: "" });
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const pharmacyRef = useRef<HTMLDivElement>(null);
  const agreeRef = useRef<HTMLDivElement>(null);

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
          
          // 💡 파베 구조(Map 내부의 Map)에 대응하기 위해 깊은 병합 처리
          setLandingData({
            ...INITIAL_CONFIG,
            ...rawData,
            fields: {
              name: { ...INITIAL_CONFIG.fields.name, ...rawData.fields?.name },
              phone: { ...INITIAL_CONFIG.fields.phone, ...rawData.fields?.phone },
              pharmacy: { ...INITIAL_CONFIG.fields.pharmacy, ...rawData.fields?.pharmacy },
            },
            terms_privacy: { ...INITIAL_CONFIG.terms_privacy, ...rawData.terms_privacy },
            terms_third_party: { ...INITIAL_CONFIG.terms_third_party, ...rawData.terms_third_party },
          });
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || !landingData) return;

    const phoneRegex = /^010-?\d{3,4}-?\d{4}$/;
    setErrorField(null);

    // 💡 DB 구조에 맞춰 유효성 검사 조건문 변경 (fields.name.show 및 필수여부 체크)
    if (landingData.fields?.name?.show && landingData.fields?.name?.required && !form.name.trim()) {
      alert(`${landingData.fields.name.label || '성함'}을 입력해주세요.`);
      setErrorField("name");
      nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    
    if (landingData.fields?.phone?.show) {
      if (landingData.fields?.phone?.required && !form.phone.trim()) {
        alert(`${landingData.fields.phone.label || '연락처'}를 입력해주세요.`);
        setErrorField("phone");
        phoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      } else if (form.phone.trim() && !phoneRegex.test(form.phone.trim())) {
        alert("올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)");
        setErrorField("phone");
        phoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    if (landingData.fields?.pharmacy?.show && landingData.fields?.pharmacy?.required && !form.pharmacy.trim()) {
      alert(`${landingData.fields.pharmacy.label || '약국명'}을 입력해주세요.`);
      setErrorField("pharmacy");
      pharmacyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (landingData.terms_privacy?.show && !agree1) {
      alert(`${landingData.terms_privacy.title || "개인정보 수집 및 이용 동의"}에 체크해 주세요.`);
      agreeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (landingData.terms_third_party?.show && !agree2) {
      alert(`${landingData.terms_third_party.title || "개인정보 제3자 제공 동의"}에 체크해 주세요.`);
      agreeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanPhone = form.phone.trim().replace(/-/g, "");

      await addDoc(collection(db, name.trim()), {
        target: landingData.name || name,
        name: landingData.fields?.name?.show ? form.name.trim() : "",
        phone: landingData.fields?.phone?.show ? cleanPhone : "",
        pharmacy: landingData.fields?.pharmacy?.show ? form.pharmacy.trim() : "",
        created_at: serverTimestamp(),
      });

      alert("신청이 완료되었습니다.");
      setForm({ name: "", phone: "", pharmacy: "" });
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
          
          {/* 타이틀 영역 제어 (show_subtitle, subtitle 명칭 보정) */}
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

          {/* 입력 인풋 필드 동적 노출 제어 (객체 내부 매핑 맵 구조 대응) */}
          <div className="space-y-5 mb-8 w-full">
            {[
              { key: "name", config: landingData.fields?.name, placeholder: "성함을 입력해주세요.", ref: nameRef },
              { key: "phone", config: landingData.fields?.phone, placeholder: "010-0000-0000", ref: phoneRef },
              { key: "pharmacy", config: landingData.fields?.pharmacy, placeholder: "약국 이름을 입력해주세요.", ref: pharmacyRef },
            ].map(({ key, config, placeholder, ref }) => {
              if (!config || config.show === false) return null;
              return (
                <div key={key} ref={ref} className="flex flex-col gap-2 w-full">
                  <label className="text-[14px] font-bold text-gray-800 ml-1">
                    {config.label} {config.required && "*"}
                  </label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className={`w-full border rounded-xl px-4 py-3.5 text-[16px] outline-none transition-all duration-300 box-border ${errorField === key ? "border-red-500 bg-red-50" : "border-gray-300 focus:border-teal-500"}`}
                  />
                </div>
              );
            })}
          </div>

          {/* 동의 영역 (content 문자열을 줄바꿈단위로 깔끔히 노출) */}
          <div ref={agreeRef}>
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

          {/* 추가된 주의사항 안내 문구 노출 제어 */}
          {landingData.show_disagree_notice && (
            <div className="text-center mb-6">
              <p className="text-red-500 text-[14px] font-bold break-keep">
                {landingData.disagree_notice_text}
              </p>
            </div>
          )}

          {/* 버튼명 DB 매핑 */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl text-[17px] font-bold text-white shadow-lg transition-all ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-[#2D3136] hover:bg-black active:scale-95 cursor-pointer"}`}
          >
            {isSubmitting ? "신청 데이터를 보내는 중..." : landingData.submit_button_text}
          </button>

          {/* 푸터 안내문구 DB 매핑 */}
          {landingData.show_footer_notice1 && (
            <p className="text-center text-gray-800 text-[14px] mt-6 font-bold">
              {landingData.footer_notice_text1}
            </p>
          )}

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

// 💡 통짜 데이터 텍스트 내부 줄바꿈 보존을 위해 whitespace-pre-line 테일윈드 스타일 적용
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
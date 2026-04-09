import { useState, useRef } from "react";
import { db } from "./lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function App() {
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (isSubmitting) return;

    const phoneRegex = /^010-?\d{3,4}-?\d{4}$/;
    setErrorField(null);

    // --- 유효성 검사 시작 ---
    if (!form.name.trim()) {
      alert("성함을 입력해주세요.");
      setErrorField("name");
      nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    
    if (!form.phone.trim()) {
      alert("연락처를 입력해주세요.");
      setErrorField("phone");
      phoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    } else if (!phoneRegex.test(form.phone.trim())) {
      alert("올바른 연락처 형식이 아닙니다.");
      setErrorField("phone");
      phoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!form.pharmacy.trim()) {
      alert("약국명을 입력해주세요.");
      setErrorField("pharmacy");
      pharmacyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!agree1 || !agree2) {
      alert("모든 필수 약관에 동의해주세요.");
      agreeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // --- 유효성 검사 끝 ---

    setIsSubmitting(true);

    try {
      // 하이픈 제거 로직: 모든 "-"를 찾아 제거
      const cleanPhone = form.phone.trim().replace(/-/g, "");

      await addDoc(collection(db, "survey"), {
        target: '대행서비스 신청 페이지',
        name: form.name.trim(),
        phone: cleanPhone, // 가공된 번호 저장
        pharmacy: form.pharmacy.trim(),
        created_at: serverTimestamp(),
      });

      alert("신청이 완료되었습니다.");
      
      // 전송 성공 후 상태 초기화
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

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden w-full flex flex-col items-center touch-pan-y">
      <section className={`w-full max-w-[480px] bg-white transition-all duration-300 flex items-center justify-center ${isImageLoaded ? "h-auto" : "min-h-[300px]"}`}>
        <img
          src={`${import.meta.env.BASE_URL}assets/landing.png`}
          alt="배너"
          className="w-full h-auto block object-contain"
          onLoad={() => setIsImageLoaded(true)}
          loading="eager"
        />
      </section>

      <section className="w-full max-w-[480px] py-10 px-4 box-border">
        <div className="w-full bg-white rounded-3xl border border-gray-200 shadow-xl px-5 py-10 sm:px-8 box-border overflow-hidden">
          <div className="text-center mb-10">
            <h2 className="text-[22px] font-black text-gray-900 mb-2 tracking-tight break-keep">팜스타트 대행 서비스 신청</h2>
          </div>

          <div className="space-y-5 mb-10 w-full">
            {[
              { label: "성함", key: "name", placeholder: "성함을 입력해주세요", ref: nameRef },
              { label: "연락처", key: "phone", placeholder: "010-0000-0000", ref: phoneRef },
              { label: "약국명", key: "pharmacy", placeholder: "약국 이름을 입력해주세요", ref: pharmacyRef },
            ].map(({ label, key, placeholder, ref }) => (
              <div key={key} ref={ref} className="flex flex-col gap-2 w-full">
                <label className="text-[14px] font-bold text-gray-800 ml-1">{label} *</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className={`w-full border rounded-xl px-4 py-3.5 text-[16px] outline-none transition-all duration-300 box-border ${errorField === key ? "border-red-500 bg-red-50" : "border-gray-300 focus:border-teal-500"}`}
                />
              </div>
            ))}
          </div>

          <div ref={agreeRef}>
            <ConsentBlock title="개인정보 수집 동의 (필수)" checked={agree1} onChange={setAgree1} />
            <ConsentBlock title="제3자 제공 동의 (필수)" checked={agree2} onChange={setAgree2} />
          </div>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className={`w-full py-4.5 rounded-xl text-[17px] font-bold text-white shadow-lg transition-all ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-[#2D3136] hover:bg-black active:scale-95 cursor-pointer"}`}
          >
            {isSubmitting ? "신청 데이터를 보내는 중..." : "무료 상담하고 혜택 받기"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ConsentBlock({ title, checked, onChange }: any) {
  return (
    <div className="mb-6 w-full box-border">
      <h3 className="text-[15px] font-bold text-gray-900 mb-3 ml-1">{title}</h3>
      <label 
        className="flex items-center gap-3 cursor-pointer select-none w-fit group"
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
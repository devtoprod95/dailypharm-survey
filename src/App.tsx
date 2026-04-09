import { useState, useRef } from "react";

export default function App() {
  const [form, setForm] = useState({ name: "", phone: "", pharmacy: "" });
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);

  const nameRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const pharmacyRef = useRef<HTMLDivElement>(null);
  const agreeRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    const phoneRegex = /^010-?\d{3,4}-?\d{4}$/;
    setErrorField(null);

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
      alert("올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)");
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
      alert("개인정보 수집 및 제3자 제공에 모두 동의해주세요.");
      agreeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    alert("상담 신청이 완료되었습니다!");
  };

  return (
    // touch-pan-y: 가로 스와이프 차단, overflow-x-hidden: 강제 고정
    <div className="min-h-screen bg-white font-sans overflow-x-hidden w-full flex flex-col items-center touch-pan-y">
      
      {/* 배너 영역 */}
      <section className="w-full max-w-[480px] bg-white">
        <img
          src={`${import.meta.env.BASE_URL}assets/landing.png`}
          alt="배너"
          className="w-full h-auto block"
        />
      </section>

      {/* 폼 영역 */}
      <section className="w-full max-w-[480px] py-10 px-4 box-border">
        <div className="w-full bg-white rounded-3xl border border-gray-200 shadow-xl px-5 py-10 sm:px-8 box-border overflow-hidden">
          
          <div className="text-center mb-10">
            <h2 className="text-[22px] font-black text-gray-900 mb-2 tracking-tight break-keep">
              팜스타트 대행 서비스 신청
            </h2>
            <p className="text-[13px] font-semibold text-gray-600 break-keep">
              ✨ 현재 패키지 신청 시 <span className="text-yellow-600">39만원 이상 절감 혜택</span> 제공 중!
            </p>
          </div>

          <div className="space-y-5 mb-10 w-full">
            {[
              { label: "성함", key: "name", placeholder: "성함을 입력해주세요", ref: nameRef },
              { label: "연락처", key: "phone", placeholder: "010-0000-0000", ref: phoneRef },
              { label: "약국명", key: "pharmacy", placeholder: "약국 이름을 입력해주세요", ref: pharmacyRef },
            ].map(({ label, key, placeholder, ref }) => (
              <div key={key} ref={ref} className="flex flex-col gap-2 w-full">
                <label className="text-[14px] font-bold text-gray-800 ml-1">
                  {label} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => {
                    setForm({ ...form, [key]: e.target.value });
                    if (errorField === key) setErrorField(null);
                  }}
                  // text-[16px]로 설정하여 iOS 자동 줌인 방지 (중요!)
                  className={`w-full border rounded-xl px-4 py-3.5 text-[16px] outline-none transition-all duration-300 box-border appearance-none ${
                    errorField === key 
                      ? "border-red-500 ring-4 ring-red-100 animate-pulse bg-red-50" 
                      : "border-gray-300 focus:ring-2 focus:ring-teal-500 bg-white"
                  }`}
                />
              </div>
            ))}
          </div>

          <div ref={agreeRef} className="w-full box-border">
            <ConsentBlock
              title="개인정보 수집 및 이용 동의 (필수)"
              rows={[
                ["수집 업체", "데일리팜"],
                ["수집 목적", "상담 정보 제공"],
                ["수집 항목", "성명/약국명/연락처"],
                ["보관 기간", "1년"],
              ]}
              checked={agree1}
              onChange={setAgree1}
            />

            <ConsentBlock
              title="개인정보 제3자 제공 동의 (필수)"
              rows={[
                ["제공받는 자", "킹메이커"],
                ["이용 목적", "마케팅 활용"],
                ["수집 항목", "성명/약국명/연락처"],
                ["보유 기간", "목적 달성 시"],
              ]}
              checked={agree2}
              onChange={setAgree2}
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-[#2D3136] rounded-xl text-[17px] font-bold text-white shadow-lg cursor-pointer active:scale-95 transition-transform"
          >
            무료 상담하고 혜택 받기
          </button>
        </div>
      </section>
    </div>
  );
}

function ConsentBlock({ title, rows, checked, onChange }: any) {
  return (
    <div className="mb-8 w-full box-border overflow-hidden">
      <h3 className="text-[15px] font-bold text-gray-900 mb-3 ml-1 leading-tight">{title}</h3>
      <div className="border border-gray-200 rounded-xl px-4 py-4 bg-gray-50 mb-4 box-border">
        {rows.map(([label, value]: any) => (
          <p key={label} className="text-[12px] text-gray-600 leading-normal mb-1 last:mb-0 break-keep">
            <span className="font-bold text-gray-700 inline-block min-w-[65px]">{label}</span> : {value}
          </p>
        ))}
      </div>
      <label className="flex items-center gap-3 cursor-pointer select-none group w-fit">
        <div
          onClick={(e) => { e.preventDefault(); onChange(!checked); }}
          className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${
            checked ? "bg-teal-600 border-teal-600" : "bg-white border-gray-300"
          }`}
        >
          {checked && (
            <svg className="w-4 h-4 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span className="text-[15px] font-bold text-gray-800">동의합니다</span>
      </label>
    </div>
  );
}
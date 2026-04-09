import { useState } from "react";

export default function App() {
  const [form, setForm] = useState({ name: "", phone: "", pharmacy: "" });
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);

  const handleSubmit = () => {
    if (!form.name.trim()) return alert("성함을 입력해주세요.");
    
    // 연락처 유효성 검사 (010으로 시작하는 10~11자리 숫자 또는 하이픈 포함 형식)
    const phoneRegex = /^010-?\d{3,4}-?\d{4}$/;
    if (!form.phone.trim()) {
      return alert("연락처를 입력해주세요.");
    } else if (!phoneRegex.test(form.phone.trim())) {
      return alert("올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)");
    }

    if (!form.pharmacy.trim()) return alert("약국명을 입력해주세요.");

    if (!agree1 || !agree2) {
      alert("개인정보 수집 및 제3자 제공에 모두 동의해주세요.");
      return;
    }

    alert("상담 신청이 완료되었습니다!");
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* 배너 영역 */}
      <section className="w-full flex justify-center bg-white">
        <img
          src={`${import.meta.env.BASE_URL}assets/landing.png`}
          alt="배너"
          className="w-full max-w-[480px] h-auto block"
        />
      </section>

      {/* 폼 영역: 배경색 흰색 유지 및 테두리로 영역 구분 */}
      <section className="w-full flex justify-center py-10 px-4 bg-white">
        <div className="w-full max-w-[480px] bg-white rounded-3xl border border-gray-200 shadow-xl px-7 py-10">
          <div className="text-center mb-10">
            <h2 className="text-[24px] font-black text-gray-900 mb-2 tracking-tight">
              팜스타트 대행 서비스 신청
            </h2>
            <p className="text-[14px] font-semibold text-gray-600">
              ✨ 현재 패키지 신청 시 <span className="text-yellow-600">39만원 이상 절감 혜택</span> 제공 중!
            </p>
          </div>

          <div className="space-y-5 mb-10">
            {[
              { label: "성함", key: "name", placeholder: "실명을 입력해주세요" },
              { label: "연락처", key: "phone", placeholder: "010-0000-0000" },
              { label: "약국명", key: "pharmacy", placeholder: "약국 이름을 입력해주세요" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="flex flex-col gap-2">
                <label className="text-[14px] font-bold text-gray-800 ml-1">
                  {label} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all bg-white"
                />
              </div>
            ))}
          </div>

          <ConsentBlock
            title="개인정보 수집 및 이용 동의 (필수)"
            rows={[
              ["수집 업체", "데일리팜"],
              ["수집 목적", "SNS 온라인 대행 6개월 패키지 상담 정보 제공"],
              ["수집 항목", "성명/약국명/연락처"],
              ["보관 기간", "신청 후 1년"],
            ]}
            checked={agree1}
            onChange={setAgree1}
          />

          <ConsentBlock
            title="개인정보 제3자 제공 동의 (필수)"
            rows={[
              ["제공받는 자", "킹메이커"],
              ["이용 목적", "SNS 온라인 대행 운영 및 서비스 광고 및 마케팅"],
              ["수집 항목", "성명/약국명/연락처"],
              ["보유 및 이용 기간", "목적 달성 시까지"],
            ]}
            checked={agree2}
            onChange={setAgree2}
          />

          <p className="text-center text-[13px] text-red-500 font-bold mt-4 mb-8">
            ※ 미동의 시 상담 및 혜택 수령이 불가능합니다.
          </p>

          <button
            onClick={handleSubmit}
            className="w-full py-4.5 bg-[#2D3136] rounded-xl text-[17px] font-bold text-white hover:bg-black active:scale-[0.97] transition-all shadow-lg"
          >
            무료 상담하고 혜택 받기
          </button>

          <p className="text-center text-[12px] text-gray-400 mt-6">
            입력하신 정보는 상담 목적으로만 안전하게 보호됩니다.
          </p>
        </div>
      </section>
    </div>
  );
}

function ConsentBlock({
  title,
  rows,
  checked,
  onChange,
}: {
  title: string;
  rows: [string, string][];
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="mb-8">
      <h3 className="text-[15px] font-bold text-gray-900 mb-3 ml-1">{title}</h3>
      <div className="border border-gray-200 rounded-xl px-4 py-4 bg-gray-50 mb-4">
        {rows.map(([label, value]) => (
          <p key={label} className="text-[12px] text-gray-600 leading-relaxed mb-0.5 last:mb-0">
            <span className="font-bold text-gray-700">{label}</span> : {value}
          </p>
        ))}
      </div>
      
      <label className="flex items-center gap-3 cursor-pointer select-none w-fit group">
        <div
          onClick={(e) => {
            e.preventDefault(); 
            onChange(!checked);
          }}
          className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${
            checked ? "bg-teal-600 border-teal-600" : "bg-white border-gray-300 group-hover:border-teal-500"
          }`}
        >
          {checked && (
            <svg className="w-4 h-4 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span className="text-[15px] font-bold text-gray-800" onClick={() => onChange(!checked)}>
          동의합니다
        </span>
      </label>
    </div>
  );
}
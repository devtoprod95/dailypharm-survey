import { useState, useEffect, useRef } from 'react'

function useInView() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setInView(true)
    }, { threshold: 0.2 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return { ref, inView }
}

interface Bar { label: string; value: number; highlight?: boolean }

function BarChart({ title, subtitle, badge, bars, color }: { title: string; subtitle: string; badge: string; bars: Bar[]; color: string }) {
  const { ref, inView } = useInView()
  const max = Math.max(...bars.map(b => b.value))
  return (
    <div ref={ref} className="bg-white rounded-2xl p-6 shadow-sm border border-purple-50 h-full">
      <p className="text-gray-400 text-xs mb-0.5">{title}</p>
      <p className="font-extrabold text-gray-900 text-base mb-1">{subtitle}</p>
      <span className="inline-block text-xs font-bold px-3 py-0.5 rounded-full text-white mb-5" style={{ backgroundColor: color }}>{badge}</span>
      <div className="flex items-end gap-2" style={{ height: 100 }}>
        {bars.map((bar, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end" style={{ height: 88 }}>
              <div
                className="w-full rounded-t-lg transition-all duration-700 ease-out"
                style={{
                  height: inView ? `${(bar.value / max) * 88}px` : 0,
                  backgroundColor: bar.highlight ? color : '#e9d5ff',
                  transitionDelay: `${i * 120}ms`,
                }}
              />
            </div>
            <span className="text-[10px] text-gray-400 text-center leading-tight whitespace-pre-line">{bar.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    { q: '증가의 기준은 어떻게 정하나요?', a: '매출 보장 상품은 마케팅 시작 후 6개월 매출 합산 대비, 전동일 6개월 이후 매출을 비교합니다.' },
    { q: '보장은 어떻게 되나요?', a: '총 6개월 패키지 진행 기간 동안, 최소 600만 원 이상의 매출 상승을 100% 보장합니다.' },
    { q: '보장 패키지의 최소 계약 단위가 6개월인가요?', a: '프리미엄 패키지 이상의 상품을 구매하셔야 무제한 매출 보장을 받으실 수 있습니다.' },
  ]

  return (
    <div className="bg-white overflow-x-hidden" style={{ fontFamily: "'Pretendard', -apple-system, sans-serif" }}>

      {/* ───── HERO ───── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 py-28 lg:py-40 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #c4b5fd 0%, #a78bfa 25%, #7c3aed 65%, #4c1d95 100%)' }}
      >
        <div className="relative z-10 w-full max-w-xl lg:max-w-3xl mx-auto">
          <p className="text-white/80 text-sm lg:text-base font-medium tracking-widest mb-5">약사님은 복약지도만 하세요</p>
          <h1
            className="text-white font-extrabold leading-tight mb-10"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)' }}
          >
            매출은<br />마케팅 전문가가<br />올립니다
          </h1>
          <div className="flex justify-center gap-4 mb-10">
            {[0, 0.15, 0.3].map((delay, i) => (
              <span key={i} className="text-4xl animate-bounce" style={{ animationDelay: `${delay}s`, willChange: 'transform' }}>💊</span>
            ))}
          </div>
          <button
            className="w-full lg:w-auto lg:px-16 bg-[#1a237e] hover:bg-[#283593] active:scale-95 transition-all duration-200 text-white font-bold py-5 px-6 rounded-2xl shadow-2xl shadow-purple-900/50 text-base lg:text-lg"
            onClick={() => window.open('https://open.kakao.com', '_blank')}
          >
            지금 바로 입점 대기 현황 확인<br />
            <span className="font-normal text-white/60 text-sm">내 지역 약국을 알아보세요</span>
          </button>
        </div>
      </section>

      {/* ───── STATS ───── */}
      <section className="bg-white py-20 px-6 lg:py-28">
        <div className="max-w-xl lg:max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-20">
            <div className="text-center lg:text-left lg:flex-1 mb-10 lg:mb-0">
              <p className="text-gray-400 text-sm lg:text-base mb-3">마케팅 4개월 만에</p>
              <h2 className="font-extrabold text-gray-900 leading-tight mb-3" style={{ fontSize: 'clamp(1.8rem, 4vw, 3.2rem)' }}>
                매약 매출<br /><span className="text-violet-600">1,720만 원</span> 상승!
              </h2>
              <p className="text-gray-400 text-sm lg:text-base">전국 수많은 약국들이 증명하고 있습니다</p>
            </div>
            <div className="lg:flex-1 bg-gradient-to-br from-violet-50 to-purple-100 rounded-3xl p-8 lg:p-10 shadow-lg border border-purple-100 text-center">
              <div className="flex justify-center gap-4 mb-6">
                <span className="text-7xl lg:text-8xl drop-shadow-lg">☕</span>
                <span className="text-7xl lg:text-8xl drop-shadow-lg" style={{ transform: 'rotate(-10deg)' }}>☕</span>
              </div>
              <div className="bg-violet-600 text-white rounded-2xl py-4 px-6 shadow-lg shadow-violet-300/50">
                <p className="text-xs lg:text-sm font-medium text-violet-200 mb-1">지금 상담 완료 시</p>
                <p className="text-xl lg:text-2xl font-extrabold">스타벅스 아메리카노 100% 증정!</p>
              </div>
              <p className="text-gray-400 text-[10px] lg:text-xs mt-3">(단, 전문가와 통화 및 상품 상담 완료 시 제공)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── CHARTS ───── */}
      <section className="py-20 px-6 lg:py-28" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)' }}>
        <div className="max-w-xl lg:max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gray-400 text-sm lg:text-base mb-2">데이터는 거짓말하지 않습니다</p>
            <h2 className="font-extrabold text-gray-900 leading-tight" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}>
              마케팅을 시작한 약국들의<br />
              <span className="text-violet-600">놀라운 변화</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <BarChart title="마케팅 3개월 차" subtitle="매약매출" badge="+41%" color="#7c3aed"
              bars={[{ label: '1개월', value: 55 }, { label: '2개월', value: 72 }, { label: '3개월', value: 100, highlight: true }]} />
            <BarChart title="전년 동월 대비" subtitle="매약매출" badge="+34%" color="#a855f7"
              bars={[{ label: '3월', value: 60 }, { label: '4월', value: 75 }, { label: '5월', value: 100, highlight: true }]} />
            <BarChart title="전년 대비 외부" subtitle="처방건수" badge="+263% 상승" color="#7c3aed"
              bars={[{ label: '마케팅\n1개월 후', value: 28 }, { label: '현재', value: 100, highlight: true }]} />
            <BarChart title="마케팅 2개월 차" subtitle="방문객수" badge="+23%" color="#a855f7"
              bars={[{ label: '2월', value: 65 }, { label: '3월', value: 80 }, { label: '4월', value: 100, highlight: true }]} />
          </div>
        </div>
      </section>

      {/* ───── EVENT ───── */}
      <section className="bg-white py-20 px-6 lg:py-28">
        <div className="max-w-xl lg:max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <span className="inline-block bg-violet-100 text-violet-700 text-xs lg:text-sm font-bold px-4 py-1.5 rounded-full tracking-wide">
              놓치기 아쉬워! ✨
            </span>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl"
            style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 60%, #c084fc 100%)' }}>
            <div className="p-8 lg:p-16 text-center">
              <p className="text-violet-200 text-xs lg:text-sm font-bold tracking-widest mb-2">4월 특별 이벤트 안내</p>
              <h2 className="text-white font-extrabold leading-tight mb-8" style={{ fontSize: 'clamp(1.8rem, 4vw, 3.5rem)' }}>
                상담 완료 시<br />커피 쿠폰 증정
              </h2>
              <div className="flex justify-center items-center gap-4 mb-8">
                <span className="text-6xl lg:text-8xl">☕</span>
                <span className="text-white/40 text-3xl font-thin">|</span>
                <div className="text-white text-left">
                  <p className="text-violet-200 text-xs lg:text-sm">상담 완료 시</p>
                  <p className="font-extrabold text-xl lg:text-2xl leading-tight">스타벅스<br />아메리카노</p>
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-2xl p-5 lg:p-8 text-sm lg:text-base text-white/90 leading-relaxed text-left max-w-2xl mx-auto">
                상담 신청 후 전문가와 통화 및 대행 서비스 상담을 완료하신 모든 분께{' '}
                <strong className="text-white">'스타벅스 아메리카노 기프티콘'</strong>을 보내드립니다.
              </div>
              <p className="text-violet-300 text-[10px] lg:text-xs mt-4 leading-relaxed">
                (단, 실질적인 마케팅 상담이 선행된 경우에 한해 증정됩니다.)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <section className="py-20 px-6 pb-40 lg:py-28 lg:pb-48" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)' }}>
        <div className="max-w-xl lg:max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gray-400 text-xs lg:text-sm mb-2">약국 전용 무제한 패키지</p>
            <h2 className="font-extrabold text-gray-900" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
              자주 묻는 <span className="text-violet-600">Q&A</span>
            </h2>
          </div>
          <div className="space-y-3 mb-10">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-purple-50">
                <button
                  className="w-full flex items-center gap-3 p-5 lg:p-6 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="w-8 h-8 flex-shrink-0 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">Q</span>
                  <span className="flex-1 font-semibold text-gray-800 text-sm lg:text-base">{faq.q}</span>
                  <span
                    className="text-violet-400 text-xs transition-transform duration-200"
                    style={{ display: 'inline-block', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)' }}
                  >▾</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 lg:px-6 pb-5 lg:pb-6 flex gap-3">
                    <span className="w-8 h-8 flex-shrink-0 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center">A</span>
                    <p className="text-gray-500 text-sm lg:text-base leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            className="w-full py-5 lg:py-6 rounded-2xl font-extrabold text-white lg:text-xl shadow-xl shadow-violet-300 active:scale-95 transition-transform text-lg"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
            onClick={() => window.open('https://open.kakao.com', '_blank')}
          >
            지금 무료 상담 신청하기 →
          </button>
          <p className="text-gray-400 text-xs lg:text-sm text-center mt-3">전문가가 직접 연락드립니다</p>
        </div>
      </section>

      {/* ───── FLOATING CTA ───── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-6 pb-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-xl lg:max-w-2xl mx-auto pointer-events-auto">
          <button
            className="w-full py-4 lg:py-5 rounded-2xl font-extrabold text-white text-base lg:text-lg shadow-2xl shadow-violet-500/50 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #c084fc)' }}
            onClick={() => window.open('https://open.kakao.com', '_blank')}
          >
            <span>💬</span>
            <span>지금 바로 무료 상담받기</span>
          </button>
        </div>
      </div>

    </div>
  )
}
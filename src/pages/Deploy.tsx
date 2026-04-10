import { useState } from 'react';
import { CloudArrowUpIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function Deploy() {
  // 상태에 'confirm'만 추가했습니다.
  const [status, setStatus] = useState<'idle' | 'confirm' | 'loading' | 'success'>('idle');

  const handleDeploy = async () => {
    setStatus('loading');

    // 보안 주의: 실제 운영 서비스라면 백엔드(Firebase 등)에서 처리하는 게 안전합니다.
    const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
    const REPO_OWNER = 'devtoprod95';
    const REPO_NAME = 'dailypharm-survey';

    try {
      const response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            event_type: 'manual-deploy', // YAML 파일의 types와 일치
          }),
        }
      );

      if (response.ok) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        throw new Error('배포 요청 실패');
      }
    } catch (error) {
      console.error(error);
      alert("배포 요청 중 오류가 발생했습니다. 토큰이나 권한을 확인해 보세요.");
      setStatus('idle');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 p-8">
        
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-50 rounded-full">
            <CloudArrowUpIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">시스템 배포</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            클릭 한 번으로 최신 데이터를 <br />
            운영 서버에 즉시 반영합니다.
          </p>
        </div>

        {/* 버튼 영역: 높이를 고정(h-[60px])하여 상태 변경 시에도 UI가 안 흔들리게 함 */}
        <div className="relative overflow-hidden h-[60px] w-full rounded-2xl">
          {status === 'idle' && (
            <button
              onClick={() => setStatus('confirm')}
              className="w-full h-full bg-slate-900 hover:bg-black text-white font-bold text-lg transition-all"
            >
              배포하기
            </button>
          )}

          {status === 'confirm' && (
            <div className="flex h-full gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button
                onClick={() => setStatus('idle')}
                className="flex-1 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleDeploy}
                className="flex-[2] bg-blue-500 text-white font-bold rounded-2xl hover:bg-blue-600"
              >
                진짜 배포할까요?
              </button>
            </div>
          )}

          {(status === 'loading' || status === 'success') && (
            <div className={`w-full h-full flex items-center justify-center gap-3 font-bold text-white transition-colors duration-300 ${status === 'loading' ? 'bg-gray-400' : 'bg-green-500'}`}>
              {status === 'loading' ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  <span>처리 중...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-6 h-6" />
                  <span>배포완료! 적용 시간이 발생될 수 있어 참고바랍니다.</span>
                </>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-400 uppercase tracking-widest font-medium">
          Github Actions Workflow Trigger
        </p>
      </div>
    </div>
  );
}
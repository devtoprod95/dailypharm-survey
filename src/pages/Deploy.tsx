import React, { useState } from 'react';
import { PhotoIcon, ArrowUpTrayIcon, CheckCircleIcon, ExclamationCircleIcon, KeyIcon } from '@heroicons/react/24/outline';

export default function Deploy() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [token, setToken] = useState('');

  const REPO_OWNER = "devtoprod95";
  const REPO_NAME = "dailypharm-survey";
  const FILE_PATH = "public/assets/landing_pending.png";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handlePush = async () => {
    if (!token) return alert("GitHub 토큰을 입력해주세요.");
    if (!file) return alert("교체할 이미지를 선택해주세요.");
    
    setStatus('loading');

    try {
      let sha = null;

      // 2. 파일을 Base64로 인코딩
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Content = (reader.result as string).split(',')[1];

        // 3. GitHub API로 파일 직접 푸시
        const res = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `token ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: "upload: 새로운 랜딩 이미지 대기열 추가",
              content: base64Content,
              sha: sha, 
              branch: "main"
            }),
          }
        );

        if (res.ok) {
          setStatus('success');
          setFile(null); // 파일 선택 초기화
          setTimeout(() => setStatus('idle'), 5000);
        } else {
          setStatus('error');
        }
      };
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    /* flex와 min-h-screen을 추가하여 화면 정중앙에 배치 */
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full mx-auto">
        <header className="mb-8 text-center"> {/* 헤더도 중앙 정렬이 어울리도록 text-center 추가 */}
          <h1 className="text-2xl font-bold text-gray-800">배포 관리 시스템</h1>
          <p className="text-gray-500 text-sm mt-1">랜딩 페이지 이미지를 교체하고 배포합니다.</p>
        </header>
        
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 space-y-6">
          
          {/* 토큰 입력 섹션 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <KeyIcon className="w-4 h-4" /> GitHub Personal Access Token
            </label>
            <input 
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_로 시작하는 토큰을 붙여넣으세요"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
            />
            <p className="mt-1 text-[11px] text-gray-400 font-medium">* 토큰은 어디에도 저장되지 않으며 브라우저를 새로고침하면 삭제됩니다.</p>
          </div>

          {/* 이미지 업로드 섹션 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">교체할 이미지</label>
            <div className="relative group border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-blue-500 hover:bg-blue-50 transition-all text-center">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleFileChange} 
                accept="image/png, image/jpeg, image/jpg" 
              />
              <PhotoIcon className="mx-auto h-10 w-10 text-gray-400 group-hover:text-blue-500" />
              <p className="mt-2 text-sm text-gray-600">
                {file ? (
                  <span className="text-blue-600 font-bold">{file.name}</span>
                ) : (
                  "이미지 파일을 드래그하거나 클릭하세요 (PNG, JPG, JPEG만 선택 가능)"
                )}
              </p>
            </div>
          </div>

          {/* 실행 버튼 */}
          <button
            onClick={handlePush}
            disabled={status === 'loading'}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-3 ${
              status === 'loading' ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {status === 'loading' ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                서버에 반영 중...
              </>
            ) : status === 'success' ? (
              <><CheckCircleIcon className="w-6 h-6" /> 배포 요청 성공!</>
            ) : (
              <><ArrowUpTrayIcon className="w-5 h-5" /> 이미지 교체 및 배포 시작</>
            )}
          </button>

          {status === 'success' && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-center text-sm text-green-700 font-semibold leading-relaxed">
                ✅ GitHub 푸시 완료! <br />
                약 2~3분 뒤 사이트에서 확인 가능합니다.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-100 flex items-center justify-center gap-3">
              <ExclamationCircleIcon className="w-6 h-6 text-red-700 shrink-0" />
              <div className="flex flex-col text-left"> {/* 텍스트 정렬은 아이콘 옆에서 왼쪽 정렬이 더 깔끔합니다 */}
                <p className="text-sm text-red-700 font-semibold leading-relaxed">
                  토큰이 틀렸거나 권한이 없습니다.
                </p>
                <p className="text-sm text-red-700 font-semibold leading-relaxed">
                  관리자에 문의 바랍니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
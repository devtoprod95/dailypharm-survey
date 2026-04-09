import { useEffect, useState, useRef } from "react"; // 1. useRef 추가
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function FirebaseTest() {
  const [status, setStatus] = useState("준비 중...");
  const [log, setLog] = useState<string[]>([]);
  
  // 2. 실행 여부를 저장할 useRef 생성
  const hasRun = useRef(false);

  const addLog = (msg: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    // 3. 이미 실행되었다면 즉시 리턴하여 중복 실행 방지
    if (hasRun.current) return;
    hasRun.current = true;

    const runTest = async () => {
      setStatus("테스트 데이터 전송 중...");
      addLog("1. 함수 실행됨");

      try {
        addLog("2. db 객체 확인: " + (db ? "있음" : "없음"));
        
        const docRef = await addDoc(collection(db, "test_logs"), {
          message: "접속 테스트",
          timestamp: serverTimestamp(),
        });


        let logActive = false;
        const baseTime = new Date();
        if( logActive ){
            for (let i = 1; i <= 20; i++) {
                const customTime = new Date(baseTime.getTime() + i * 60000);
    
                await addDoc(collection(db, "survey"), {
                    target: '대행서비스 신청 페이지',
                    name: `김도한${i}`,
                    phone: `0102546${(6499 + i).toString()}`,
                    pharmacy: `약국${i}`,
                    created_at: customTime,
                });
            }
        }
        
        setStatus("테스트 완료! (성공)");
        addLog(`3. 성공! 문서 ID: ${docRef.id}`);
      } catch (error: any) {
        addLog(`❌ 에러 발생: ${error.code} / ${error.message}`);
        setStatus("테스트 실패");
      }
    };

    runTest();
  }, []);

  return (
    <div className="p-10 font-sans">
      <h1 className="text-2xl font-bold mb-4">🔥 Firebase 연결 테스트</h1>
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-lg mb-2">상태: <span className="font-bold text-blue-600">{status}</span></p>
        <div className="mt-4 p-3 bg-black text-green-400 rounded-md font-mono text-sm min-h-[150px]">
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
      <button 
        onClick={() => {
          // 버튼 클릭 시에는 다시 실행될 수 있도록 초기화 후 리로드
          hasRun.current = false;
          window.location.reload();
        }}
        className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-black"
      >
        다시 테스트하기
      </button>
    </div>
  );
}
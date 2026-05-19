import { useEffect, useState, useRef } from "react"; // 1. useRef 추가
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, writeBatch, doc, deleteField } from "firebase/firestore";

export default function FirebaseTest() {
  const [status, setStatus] = useState("준비 중...");
  const [log, setLog] = useState<string[]>([]);
  
  // 2. 실행 여부를 저장할 useRef 생성
  const hasRun = useRef(false);

  const addLog = (msg: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const runModiColumn = async () => {

    const COLLECTION_NAME = "survey";
    
    try {
      console.log(`${COLLECTION_NAME} 컬렉션 마이그레이션 시작...`);
      const collRef = collection(db, COLLECTION_NAME);
      const querySnapshot = await getDocs(collRef);
      
      if (querySnapshot.empty) {
        console.log(`${COLLECTION_NAME} 컬렉션에 문서가 존재하지 않습니다.`);
        alert("변경할 문서가 없습니다.");
        return;
      }

      // 대량 작업을 안전하게 처리하기 위한 바치(Batch) 생성
      const batch = writeBatch(db);
      let updatedCount = 0;

      querySnapshot.docs.forEach((documentSnapshot) => {
        const data = documentSnapshot.data();
        const docRef = doc(db, COLLECTION_NAME, documentSnapshot.id);
        
        // 업데이트할 객체 동적 생성
        const updatePayload: Record<string, any> = {};
        let hasChanges = false;

        // 1. name -> 성함
        if (data.name !== undefined) {
          updatePayload["성함"] = data.name;
          updatePayload["name"] = deleteField(); // 기존 영문 필드 삭제
          hasChanges = true;
        }

        // 2. phone -> 연락처
        if (data.phone !== undefined) {
          updatePayload["연락처"] = data.phone;
          updatePayload["phone"] = deleteField(); // 기존 영문 필드 삭제
          hasChanges = true;
        }

        // 3. pharmacy -> 약국명
        if (data.pharmacy !== undefined) {
          updatePayload["약국명"] = data.pharmacy;
          updatePayload["pharmacy"] = deleteField(); // 기존 영문 필드 삭제
          hasChanges = true;
        }

        // 변경 사항이 있는 문서만 바치에 추가
        if (hasChanges) {
          batch.update(docRef, updatePayload);
          updatedCount++;
        }
      });

      // 최종 변경 사항 커밋
      if (updatedCount > 0) {
        await batch.commit();
        console.log(`성공: 총 ${updatedCount}개의 문서가 한글 라벨로 수정되었습니다.`);
        alert(`성공: 총 ${updatedCount}개의 문서 항목이 정상적으로 변경되었습니다.`);
      } else {
        console.log("이미 모두 수정되었거나, 변경 대상 필드가 있는 문서가 없습니다.");
        alert("변경할 대상 문서가 없습니다.");
      }
    } catch (error) {
      console.error("survey 마이그레이션 중 오류 발생:", error);
      alert("항목 변경 중 오류가 발생했습니다. 개발자 도구 콘솔을 확인해주세요.");
    }
  }

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
    // runModiColumn();
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
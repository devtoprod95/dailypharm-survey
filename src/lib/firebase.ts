import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, limit } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// 초기화
const app = initializeApp(firebaseConfig);

// 서비스 인스턴스 내보내기
export const db = getFirestore(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

/**
 * Firestore의 gh_token 컬렉션(문서 1개)에서 token 필드를 불러온다.
 * 더 이상 사용자 입력/환경변수(VITE_GH_TOKEN)에 의존하지 않는다.
 * @throws 토큰이 없거나 조회에 실패하면 에러를 던진다.
 */
export async function getGithubToken(): Promise<string> {
  const snap = await getDocs(query(collection(db, "gh_token"), limit(1)));
  if (snap.empty) {
    throw new Error("GitHub 토큰 설정(gh_token 컬렉션)이 존재하지 않습니다.");
  }
  const token = snap.docs[0].data()?.token as string | undefined;
  if (!token) {
    throw new Error("GitHub 토큰이 설정되어 있지 않습니다. (gh_token.token)");
  }
  return token;
}

export default app;
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.tsx'
import FirebaseTest from './pages/FirebaseTest.tsx'
import './index.css'

// 라우터 설정 생성
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    // 이제 /dailypharm-survey/test 로 접속하면 이 컴포넌트가 뜹니다.
    path: "/test", 
    element: <FirebaseTest />,
  },
], {
  // 프로젝트가 실행되는 기본 경로(Base URL)를 지정합니다.
  basename: "/dailypharm-survey", 
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
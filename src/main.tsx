import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import LandingPage from './LandingPage.tsx'
import FirebaseTest from './pages/FirebaseTest.tsx'
import './index.css'
import AdminExcelPage from './pages/AdminExcelPage.tsx'
import Deploy from './pages/Deploy.tsx'

import { PAGE_LIST } from './config/pages';
import Layout from './components/Layout.tsx'
import LandingListPage from './pages/landing/LandingListPage.tsx'
import LandingDetailPage from './pages/landing/view/LandingDetailPage.tsx'
import LandingFormPage from './pages/landing/store/LandingFormPage.tsx'

const router = createHashRouter([
  // 💡 1. 샵(#) 뒤에 아무것도 없는 기본 진입시 최신 리다이렉트 컴포넌트 실행
  {
    path: "/",
    element: <LandingPage /> 
  },
  
  // 2. 기존 PAGE_LIST 동적 매핑 구조 (메인 중복 방지)
  ...PAGE_LIST
    .filter(page => page.path !== "/") 
    .map(page => ({
      path: page.path,
      element: (
        <Layout>
          {
            page.path === "/landing" ? <LandingListPage /> :
            page.path === "/deploy" ? <Deploy /> :
            page.path === "/excel-down" ? <AdminExcelPage /> : <FirebaseTest />
          }
        </Layout>
      )
    })),

  // 3. 랜딩 페이지 작성/수정 (관리자)
  {
    path: "/landing/store",          // 추가 (id 없음)
    element: (
      <Layout>
        <LandingFormPage />
      </Layout>
    )
  },
  {
    path: "/landing/store/:id",      // 수정 (id 있음)
    element: (
      <Layout>
        <LandingFormPage />
      </Layout>
    )
  },

  // 4. 랜딩 페이지 상세 (공개용)
  {
    path: "/landing/view/:id",
    element: <LandingDetailPage />
  }
]); // 💡 무한 루프 원인인 basename: "/dailypharm-survey" 옵션을 과감히 제거했습니다!

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
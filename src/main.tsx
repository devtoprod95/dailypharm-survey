import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom' // createHashRouter로 변경
import App from './App.tsx'
import FirebaseTest from './pages/FirebaseTest.tsx'
import './index.css'
import AdminExcelPage from './pages/AdminExcelPage.tsx'
import Deploy from './pages/Deploy.tsx'

import { PAGE_LIST } from './config/pages';
import Layout from './components/Layout.tsx'

const router = createHashRouter(
    PAGE_LIST.map(page => ({
        path: page.path,
        element: page.path === "/" ? (
            // 메인 페이지는 레이아웃 없이 단독으로!
            <App />
        ) : (
            // 그 외 모든 페이지는 공통 레이아웃 적용
            <Layout>
                {page.path === "/deploy" ? <Deploy /> :
                 page.path === "/excel-down" ? <AdminExcelPage /> : <FirebaseTest />}
            </Layout>
        )
    }))
);

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom' // createHashRouter로 변경
import App from './App.tsx'
import FirebaseTest from './pages/FirebaseTest.tsx'
import './index.css'
import AdminExcelPage from './pages/AdminExcelPage.tsx'

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/test",
    element: <FirebaseTest />,
  },
  {
    path: "/excel-down",
    element: <AdminExcelPage />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
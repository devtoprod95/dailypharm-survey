import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom' // createHashRouter로 변경
import App from './App.tsx'
import FirebaseTest from './pages/FirebaseTest.tsx'
import './index.css'

// createBrowserRouter 대신 createHashRouter 사용
const router = createHashRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/test",
    element: <FirebaseTest />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
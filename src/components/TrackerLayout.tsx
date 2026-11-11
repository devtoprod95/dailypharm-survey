import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { trackPageView } from "../lib/tracker";

/** 모든 라우트의 부모. 경로가 바뀔 때마다 페이지 접근을 기록한다. */
export default function TrackerLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return <Outlet />;
}

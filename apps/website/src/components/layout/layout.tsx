import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function Layout() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}
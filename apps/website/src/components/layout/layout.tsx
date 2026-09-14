import { Suspense, useEffect } from "react";
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
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Suspense fallback={<div className="route-fallback" aria-hidden="true" />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

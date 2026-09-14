import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./components/layout/layout";
import { Landing } from "./pages/landing";
import { Features } from "./pages/features";
import { Pricing } from "./pages/pricing";
import { Download } from "./pages/download";
import { Faq } from "./pages/faq";
import { Support } from "./pages/support";
import { Privacy } from "./pages/privacy";
import { Terms } from "./pages/terms";
import { Refund } from "./pages/refund";
import { Login } from "./pages/login";
import { Account } from "./pages/account";
import { Admin } from "./pages/admin";
import { NotFound } from "./pages/not-found";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="features" element={<Features />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="download" element={<Download />} />
        <Route path="faq" element={<Faq />} />
        <Route path="support" element={<Support />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="refund" element={<Refund />} />
        <Route path="login" element={<Login />} />
        <Route path="account" element={<Account />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
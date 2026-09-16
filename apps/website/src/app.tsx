import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./components/layout/layout";
import { AuthProvider } from "./lib/auth-context";
import type { AppSupabaseClient } from "./lib/supabase";

const Landing = lazy(() =>
  import("./pages/landing").then((m) => ({ default: m.Landing })),
);
const Features = lazy(() =>
  import("./pages/features").then((m) => ({ default: m.Features })),
);
const Pricing = lazy(() =>
  import("./pages/pricing").then((m) => ({ default: m.Pricing })),
);
const Download = lazy(() =>
  import("./pages/download").then((m) => ({ default: m.Download })),
);
const Faq = lazy(() =>
  import("./pages/faq").then((m) => ({ default: m.Faq })),
);
const Support = lazy(() =>
  import("./pages/support").then((m) => ({ default: m.Support })),
);
const Privacy = lazy(() =>
  import("./pages/privacy").then((m) => ({ default: m.Privacy })),
);
const Terms = lazy(() =>
  import("./pages/terms").then((m) => ({ default: m.Terms })),
);
const Refund = lazy(() =>
  import("./pages/refund").then((m) => ({ default: m.Refund })),
);
const Login = lazy(() =>
  import("./pages/login").then((m) => ({ default: m.Login })),
);
const Account = lazy(() =>
  import("./pages/account").then((m) => ({ default: m.Account })),
);
const ResetPassword = lazy(() =>
  import("./pages/reset-password").then((m) => ({ default: m.ResetPassword })),
);
const Admin = lazy(() =>
  import("./pages/admin").then((m) => ({ default: m.Admin })),
);
const NotFound = lazy(() =>
  import("./pages/not-found").then((m) => ({ default: m.NotFound })),
);

export function AppRoutes({ client }: { client?: AppSupabaseClient | null }) {
  return (
    <AuthProvider client={client}>
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
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export function App({ client }: { client?: AppSupabaseClient | null }) {
  return (
    <BrowserRouter>
      <AppRoutes client={client} />
    </BrowserRouter>
  );
}

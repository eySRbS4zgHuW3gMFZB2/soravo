/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UMAMI_HOST_URL?: string;
  readonly VITE_UMAMI_WEBSITE_ID?: string;
  // WEB-010: runs the dev-only E2E harness (browser test doubles). Defaults to
  // unset so normal dev and production builds are never affected.
  readonly VITE_E2E_TEST_MODE?: string;
}

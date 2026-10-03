// Reuses the @soravo/payment-domain flat config (same rule set: recommended
// + no-unused-vars). A relative re-export — not a new dependency — because
// pnpm isolation means `@eslint/js` only resolves from a workspace package
// directory, and this function dir is intentionally not a package (it ships
// to the Deno Edge runtime, not npm).
import config from "../../../packages/payment-domain/eslint.config.js";

export default config;

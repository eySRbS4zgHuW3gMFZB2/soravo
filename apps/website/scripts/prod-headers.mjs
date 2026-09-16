// Soravo production security headers generator (WEB-011 / WEB-012, ADR-014).
//
// The deployed static assets directory needs a `_headers` file that Cloudflare
// Pages parses and applies to static asset responses (ADR-014 decision 4). The
// Content-Security-Policy must come from the ACTUAL resource graph: it depends
// on the build-time environment (VITE_SUPABASE_URL and/or VITE_UMAMI_HOST_URL
// when those integrations are enabled), so a hand-authored file in `public/`
// cannot safely represent production. Instead this module is driven at build
// time by Vite's resolved environment (via the plugin in `vite.config.ts`) so
// the emitted CSP always matches the bundle that was built. No runtime server
// or Cloudflare Worker runtime is introduced and no wildcard CSP source is used.
//
// Cloudflare Pages path: SPA fallback relies on Pages' default single-page
// application rendering, which requires that the dist tree contains NO top-level
// `404.html` and NO `_redirects`; `verifyDist` enforces that so React Router
// direct navigation works without an added server function.
//
// Security posture (09_SECURITY_BASELINE.md §17, ASVS 3.4.x):
// - default-src 'self'; script-src 'self' (+ Umami origin only when enabled)
// - style-src 'self' 'unsafe-inline' (React/shadcn inline style attributes)
// - connect-src 'self' (+ Supabase HTTPS origin, + Umami origin when enabled)
// - img-src 'self' data:; font-src 'self'; object-src 'none'
// - frame-ancestors 'none'; base-uri 'self'; form-action 'self'
// - HSTS is intentionally deferred until deployment stability is verified
//   (ADR-014, 09_SECURITY_BASELINE.md §17) and is NOT emitted here.

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

// The complete allowlist of client-safe VITE_* identifiers the website may
// reference. Anything else found in the bundle/source is a secret-leak suspect.
export const ALLOWED_VITE_KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_UMAMI_HOST_URL",
  "VITE_UMAMI_WEBSITE_ID",
  "VITE_E2E_TEST_MODE",
];

const SECRET_SUSPECT_PATTERN = /razorpay/i;

function isHttpOrigin(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (!url.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

// Emits the Content-Security-Policy value for a given build env record.
export function buildCsp(env = {}) {
  const scriptSources = ["'self'"];
  const connectSources = ["'self'"];

  const umamiHost = typeof env.VITE_UMAMI_HOST_URL === "string" ? env.VITE_UMAMI_HOST_URL.trim() : "";
  if (umamiHost && isHttpOrigin(umamiHost)) {
    const origin = new URL(umamiHost).origin;
    scriptSources.push(origin);
    connectSources.push(origin);
  }

  const supabaseUrl = typeof env.VITE_SUPABASE_URL === "string" ? env.VITE_SUPABASE_URL.trim() : "";
  if (supabaseUrl && isHttpOrigin(supabaseUrl)) {
    connectSources.push(new URL(supabaseUrl).origin);
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${connectSources.join(" ")}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

// Emits the Cloudflare Pages `_headers` file text (`/*` matches every path;
// Pages applies the `/*` rule to static asset responses, and the project uses
// no Pages Functions so the rule also covers SPA-fallback responses).
export function buildHeadersText(env = {}) {
  const headers = [
    ["Content-Security-Policy", buildCsp(env)],
    ["Cross-Origin-Opener-Policy", "same-origin"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["X-Content-Type-Options", "nosniff"],
    ["X-Frame-Options", "DENY"],
  ];
  const lines = ["/*"];
  for (const [name, value] of headers) lines.push(`  ${name}: ${value}`);
  return lines.join("\n") + "\n";
}

export async function writeProductionHeaders(distDir, env = {}) {
  await mkdir(distDir, { recursive: true });
  const target = path.join(distDir, "_headers");
  const content = buildHeadersText(env);
  await writeFile(target, content, "utf8");
  return target;
}

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

// Verifies the production dist directory satisfies the WEB-011/WEB-012
// invariants (security headers/CSP, SEO assets, Pages SPA fallback shape,
// no E2E harness, no Razorpay references). Throws on the first violation so a
// broken build fails the pipeline.
export async function verifyDist(distDir) {
  const problems = [];
  const read = async (name) => {
    try {
      return await readFile(path.join(distDir, name), "utf8");
    } catch {
      problems.push(`missing expected production file: ${name}`);
      return null;
    }
  };

  // Cloudflare Pages SPA fallback (ADR-014 decision 3): Pages performs default
  // SPA rendering ONLY when the output has no top-level `404.html`. A `_redirects`
  // file would take precedence over `_headers`, so the Pages output must contain
  // neither. These negatives make the intended serving contract deterministic.
  for (const forbidden of ["404.html", "_redirects"]) {
    try {
      await readFile(path.join(distDir, forbidden));
      problems.push(`Cloudflare Pages SPA fallback requires NO ${forbidden} in the Pages output`);
    } catch {
      // absent as required
    }
  }

  const headers = await read("_headers");
  if (headers) {
    const requiredHeaders = [
      "Content-Security-Policy",
      "Cross-Origin-Opener-Policy",
      "Permissions-Policy",
      "Referrer-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
    ];
    for (const name of requiredHeaders) {
      if (!headers.includes(`${name}:`)) problems.push(`_headers missing ${name}`);
    }
    if (headers.includes("Strict-Transport-Security")) {
      problems.push("HSTS must remain deferred until deployment stability is verified");
    }
    const cspMatch = headers.match(/Content-Security-Policy:\s*([^\n]+)/);
    if (cspMatch) {
      const csp = cspMatch[1];
      if (/\b\*\b/.test(csp)) problems.push("CSP contains a wildcard source (*)");
      if (/\bhttps:\b/.test(csp)) problems.push("CSP contains a bare https: source");
      if (/\bhttp:\b/.test(csp)) problems.push("CSP contains a bare http: source");
      if (SECRET_SUSPECT_PATTERN.test(csp)) problems.push("CSP references a Razorpay domain before Razorpay integration");
    } else {
      problems.push("_headers missing Content-Security-Policy value");
    }
  }

  const robots = await read("robots.txt");
  if (robots) {
    if (!robots.includes("User-agent: *") || !robots.includes("Allow: /")) {
      problems.push("robots.txt does not allow public crawling");
    }
    if (!robots.includes("Sitemap: https://soravo.xyz/sitemap.xml")) {
      problems.push("robots.txt does not reference the canonical sitemap");
    }
  }

  const sitemap = await read("sitemap.xml");
  if (sitemap) {
    if (!sitemap.includes("https://soravo.xyz/")) problems.push("sitemap.xml missing canonical origin");
    for (const forbidden of ["/account", "/admin", "/login", "/reset-password"]) {
      if (sitemap.includes(`https://soravo.xyz${forbidden}`)) {
        problems.push(`sitemap.xml must not list private route ${forbidden}`);
      }
    }
  }

  const favicon = await read("favicon.svg");
  if (favicon && !favicon.includes("<svg")) problems.push("favicon.svg is not a valid SVG");

  const indexHtml = await read("index.html");
  if (indexHtml) {
    for (const token of [
      'property="og:title"',
      'property="og:description"',
      'property="og:type"',
      'property="og:url"',
      'name="twitter:card"',
      'name="twitter:title"',
      'name="twitter:description"',
      'rel="canonical" href="https://soravo.xyz/"',
      'rel="icon" type="image/svg+xml" href="/favicon.svg"',
      'name="description"',
    ]) {
      if (!indexHtml.includes(token)) problems.push(`index.html missing ${token}`);
    }
    for (const marker of ["e2e-harness", "test-scenario", "VITE_E2E_TEST_MODE"]) {
      if (indexHtml.includes(marker)) problems.push(`index.html contains E2E harness marker ${marker}`);
    }
  }

  for (const file of await walk(distDir)) {
    const relative = path.relative(distDir, file);
    if (relative === "_headers") continue;
    const content = await readFile(file, "utf8");
    if (SECRET_SUSPECT_PATTERN.test(content)) {
      problems.push(`Razorpay reference found in production asset ${relative}`);
    }
    if (/e2e-harness|test-scenario|VITE_E2E_TEST_MODE/.test(content)) {
      problems.push(`E2E harness marker found in production asset ${relative}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Production build verification failed (WEB-011):\n- ${problems.join("\n- ")}`);
  }
}
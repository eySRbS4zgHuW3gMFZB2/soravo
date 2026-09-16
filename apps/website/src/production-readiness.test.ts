import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  ALLOWED_VITE_KEYS,
  buildCsp,
  buildHeadersText,
} from "../scripts/prod-headers.mjs";

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(SITE_ROOT, "src");

async function readText(relPath: string): Promise<string> {
  return readFile(path.join(SITE_ROOT, relPath), "utf8");
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(child, out);
    else out.push(child);
  }
  return out;
}

const EXPECTED_CANONICAL = "https://soravo.xyz/";
const PUBLIC_ROUTES = [
  "/",
  "/features",
  "/pricing",
  "/download",
  "/faq",
  "/support",
  "/privacy",
  "/terms",
  "/refund",
];
const PRIVATE_ROUTES = ["/account", "/admin", "/login", "/reset-password"];

describe("production content-security-policy", () => {
  it("emits the restrictive baseline when no integrations are configured", () => {
    expect(buildCsp({})).toBe(
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );
  });

  it("never contains broad wildcard sources", () => {
    const csp = buildCsp({ VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_UMAMI_HOST_URL: "https://analytics.example.com" });
    expect(csp).not.toMatch(/\b\*\b/);
    expect(csp).not.toMatch(/\bhttps:\b/);
    expect(csp).not.toMatch(/\bhttp:\b/);
  });

  it("adds only the exact Supabase origin to connect-src when configured", () => {
    const csp = buildCsp({ VITE_SUPABASE_URL: "https://abc.supabase.co" });
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co");
    expect(csp).toContain("script-src 'self'");
  });

  it("adds only the exact Umami origin to script-src and connect-src when configured", () => {
    const csp = buildCsp({ VITE_UMAMI_HOST_URL: "https://analytics.example.com" });
    expect(csp).toContain("script-src 'self' https://analytics.example.com");
    expect(csp).toContain("connect-src 'self' https://analytics.example.com");
  });

  it("keeps Razorpay domains out of the CSP until payment integration", () => {
    const csp = buildCsp({ VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_UMAMI_HOST_URL: "https://analytics.example.com" });
    expect(csp.toLowerCase()).not.toContain("razorpay");
  });

  it("keeps the baseline directives always present", () => {
    const csp = buildCsp({ VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_UMAMI_HOST_URL: "https://analytics.example.com" });
    for (const directive of [
      "default-src 'self';",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' data:;",
      "font-src 'self';",
      "object-src 'none';",
      "frame-ancestors 'none';",
      "base-uri 'self';",
      "form-action 'self'",
    ]) {
      expect(csp).toContain(directive);
    }
  });
});

describe("production security headers file", () => {
  const headers = buildHeadersText({});

  it("contains every required security header", () => {
    for (const name of [
      "Content-Security-Policy",
      "Cross-Origin-Opener-Policy",
      "Permissions-Policy",
      "Referrer-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
    ]) {
      expect(headers).toContain(`${name}:`);
    }
  });

  it("denies camera, microphone and geolocation permissions", () => {
    expect(headers).toContain("Permissions-Policy: camera=(), microphone=(), geolocation=()");
  });

  it("does not enable HSTS before deployment stability is verified", () => {
    expect(headers).not.toContain("Strict-Transport-Security");
  });

  it("does not reference Razorpay domains", () => {
    expect(headers.toLowerCase()).not.toContain("razorpay");
  });
});

describe("robots.txt", () => {
  it("allows public crawling and references the canonical sitemap", async () => {
    const robots = await readText("public/robots.txt");
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain(`Sitemap: ${EXPECTED_CANONICAL}sitemap.xml`);
  });
});

describe("sitemap.xml", () => {
  it("derives its URL list from real public routes only", async () => {
    const sitemap = await readText("public/sitemap.xml");
    const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
    expect(locations).toHaveLength(PUBLIC_ROUTES.length);
    for (const route of PUBLIC_ROUTES) {
      expect(locations).toContain(`${EXPECTED_CANONICAL}${route === "/" ? "" : route.slice(1)}`);
    }
  });

  it("excludes private, auth and admin routes", async () => {
    const sitemap = await readText("public/sitemap.xml");
    for (const route of PRIVATE_ROUTES) {
      expect(sitemap).not.toContain(route);
    }
  });

  it("uses https://soravo.xyz as the canonical production origin in every URL", async () => {
    const sitemap = await readText("public/sitemap.xml");
    for (const location of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
      expect(location[1]).toMatch(/^https:\/\/soravo\.xyz\//);
      expect(location[1]).not.toContain("www");
    }
  });
});

describe("favicon", () => {
  it("ships a valid SVG favicon in the public directory", async () => {
    const favicon = await readText("public/favicon.svg");
    expect(favicon.trim()).toMatch(/^<svg/);
    expect(favicon).toContain("</svg>");
  });
});

describe("index.html metadata", () => {
  it("contains full Open Graph and Twitter metadata", async () => {
    const html = await readText("index.html");
    for (const token of [
      'property="og:title"',
      'property="og:description"',
      'property="og:type"',
      'property="og:url"',
      'name="twitter:card"',
      'name="twitter:title"',
      'name="twitter:description"',
    ]) {
      expect(html).toContain(token);
    }
  });

  it("declares a canonical URL consistent with ADR-014", async () => {
    const html = await readText("index.html");
    expect(html).toContain(`rel="canonical" href="${EXPECTED_CANONICAL}"`);
  });

  it("links the favicon and keeps the existing description and title", async () => {
    const html = await readText("index.html");
    expect(html).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"');
    expect(html).toContain('name="description"');
    expect(html).toContain("<title>Soravo");
  });

  it("intentionally omits og:image (optional asset, not fabricated)", async () => {
    const html = await readText("index.html");
    expect(html).not.toContain('property="og:image"');
  });
});

describe("website source guardrails", () => {
  it("references no Razorpay domains yet", async () => {
    const files = [...(await walk(SRC_DIR)), path.join(SITE_ROOT, "index.html"), path.join(SITE_ROOT, "public", "robots.txt"), path.join(SITE_ROOT, "public", "sitemap.xml"), path.join(SITE_ROOT, "public", "favicon.svg")].filter((file) => !/\.test\.(ts|tsx)$/.test(file));
    for (const file of files) {
      const content = await readFile(file, "utf8");
      expect(content.toLowerCase()).not.toContain("razorpay");
    }
  });

  it("references only allowlisted client-safe VITE_ identifiers", async () => {
    const allowed = new Set(ALLOWED_VITE_KEYS);
    const files = [...(await walk(SRC_DIR)), path.join(SITE_ROOT, "index.html")];
    let found = 0;
    for (const file of files) {
      const content = await readFile(file, "utf8");
      for (const match of content.matchAll(/\bVITE_[A-Z0-9_]+/g)) {
        found += 1;
        expect(allowed.has(match[0])).toBe(true);
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it("keeps the E2E harness strictly dev-gated in the entry point", async () => {
    const main = await readText("src/main.tsx");
    expect(main).toContain("import.meta.env.DEV");
    expect(main).toContain('VITE_E2E_TEST_MODE === "true"');
  });
});
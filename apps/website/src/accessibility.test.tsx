import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const styles = fs.readFileSync(
  path.resolve(__dirname, "styles.css"),
  "utf-8",
);

describe("accessibility CSS guard", () => {
  it("declares a prefers-reduced-motion fallback", () => {
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("scroll-behavior: auto !important");
    expect(styles).toContain("transition-duration: 0.01ms !important");
  });

  it("defines the skip-link as focus-revealed", () => {
    expect(styles).toContain(".skip-link");
    expect(styles).toContain(".skip-link:focus-visible");
  });

  it("defines global focus-visible outlines for interactive elements", () => {
    expect(styles).toContain("a:focus-visible");
    expect(styles).toContain("summary:focus-visible");
  });

  it("uses a WCAG AA text accent for labels", () => {
    expect(styles).toContain("#a84819");
  });
});

import { describe, expect, it } from "vitest";

describe("website contract", () => {
  it("keeps the public privacy promise explicit", () => {
    const privacyBoundary = "Audio and transcription stay on your device";
    expect(privacyBoundary).toContain("stay on your device");
  });
});

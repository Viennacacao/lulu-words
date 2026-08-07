import { describe, expect, it } from "vitest";
import { normalizeDeepSeekBaseUrl } from "../src/core/services/DeepSeekService";

describe("DeepSeek service", () => {
  it("normalizes a secure base URL", () => {
    expect(normalizeDeepSeekBaseUrl(" https://api.deepseek.com/// ")).toBe("https://api.deepseek.com");
  });

  it("rejects an insecure API endpoint", () => {
    expect(() => normalizeDeepSeekBaseUrl("http://api.deepseek.com")).toThrow("https://");
  });
});

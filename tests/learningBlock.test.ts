import { describe, expect, it } from "vitest";
import { splitBilingualExample } from "../src/features/learning/LearningBlock";

describe("six-row learning block", () => {
  it("splits an explicit bilingual example into English and Chinese rows", () => {
    expect(splitBilingualExample("Airmail is quicker.\n航空邮递更快。")).toEqual({
      example: "Airmail is quicker.",
      translation: "航空邮递更快。",
    });
  });

  it("splits a compact bilingual example at the first Chinese character", () => {
    expect(splitBilingualExample("Keep going.继续前进。")).toEqual({
      example: "Keep going.",
      translation: "继续前进。",
    });
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { wordbookManifests } from "../src/data/wordbooks";
import type { LearningWord } from "../src/features/learning/session";

const load = (file: string) =>
  JSON.parse(
    readFileSync(resolve("public/wordbooks", file), "utf-8"),
  ) as LearningWord[];

describe("bundled wordbooks", () => {
  it("contains six validated, non-empty offline wordbooks", () => {
    expect(wordbookManifests).toHaveLength(6);

    for (const manifest of wordbookManifests) {
      const words = load(manifest.file);
      const ids = new Set(words.map((word) => word.id));

      expect(words).toHaveLength(manifest.wordCount);
      expect(ids.size).toBe(words.length);
      expect(words.length).toBeGreaterThan(500);
      expect(
        words.every(
          (word) =>
            word.id.startsWith("word:") &&
            word.word.length > 0 &&
            word.meaning.length > 0 &&
            typeof word.phonetic === "string" &&
            typeof word.example === "string",
        ),
      ).toBe(true);
    }
  });

  it("uses stable word ids so progress is shared across wordbooks", () => {
    const cet4 = new Set(load("cet4.json").map((word) => word.id));
    const cet6 = load("cet6.json").map((word) => word.id);
    const overlap = cet6.filter((id) => cet4.has(id));

    expect(overlap.length).toBeGreaterThan(1000);
  });
});

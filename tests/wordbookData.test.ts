import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWordbook, wordbookManifests } from "../src/data/wordbooks";
import type { LearningWord } from "../src/features/learning/session";

const load = (file: string) =>
  parseWordbook(
    readFileSync(resolve("src/assets/wordbooks", file), "utf-8"),
    file,
  );

const sampleWord: LearningWord = {
  id: "word:sample",
  word: "sample",
  phonetic: "/ˈsæmpəl/",
  meaning: "样本",
  mnemonic: "",
  phrases: "sample data",
  example: "This is a sample.",
};

describe("bundled wordbooks", () => {
  it("contains six validated, non-empty offline wordbooks", () => {
    expect(wordbookManifests).toHaveLength(6);

    for (const manifest of wordbookManifests) {
      const words = load(manifest.file);
      const ids = new Set(words.map((word) => word.id));

      expect(words).toHaveLength(manifest.wordCount);
      expect(ids.size).toBe(words.length);
      expect(words.length).toBeGreaterThan(300);
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

  it("parses both JSON arrays and JSONL files", () => {
    expect(parseWordbook(JSON.stringify([sampleWord]))).toEqual([sampleWord]);
    expect(
      parseWordbook(`\n${JSON.stringify(sampleWord)}\n\n${JSON.stringify({
        ...sampleWord,
        id: "word:second",
        word: "second",
      })}\n`),
    ).toHaveLength(2);
  });

  it("reports the original line number for invalid JSONL", () => {
    expect(() =>
      parseWordbook(`${JSON.stringify(sampleWord)}\n\n{bad json}`, "测试词库"),
    ).toThrow("词库格式错误：测试词库 第 3 行不是有效的 JSON");
  });

  it("rejects entries with incomplete learning fields", () => {
    expect(() =>
      parseWordbook(JSON.stringify([{ id: "word:broken" }]), "测试词库"),
    ).toThrow("词库格式错误：测试词库 第 1 条单词字段不完整");
  });

  it("uses stable word ids so progress is shared across wordbooks", () => {
    const cet4 = new Set(load("cet4.json").map((word) => word.id));
    const cet6 = load("cet6.json").map((word) => word.id);
    const overlap = cet6.filter((id) => cet4.has(id));

    expect(overlap.length).toBeGreaterThan(1000);
  });
});

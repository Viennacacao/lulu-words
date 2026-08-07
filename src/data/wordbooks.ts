import type { LearningWord } from "../features/learning/session";

export type WordbookId = "cet4" | "cet6" | "ielts" | "toefl" | "pte" | "toeic";

export interface WordbookManifest {
  id: WordbookId;
  name: string;
  shortName: string;
  description: string;
  wordCount: number;
  file: string;
  sourceName: string;
  sourceUrl: string;
  license: "MIT" | "自有词库";
  official: boolean;
}

export const wordbookManifests: WordbookManifest[] = [
  {
    id: "cet4",
    name: "大学英语四级",
    shortName: "CET-4",
    description: "四级考试核心与常用词汇",
    wordCount: 3846,
    file: "cet4.json",
    sourceName: "ECDICT",
    sourceUrl: "https://github.com/skywind3000/ECDICT",
    license: "MIT",
    official: false,
  },
  {
    id: "cet6",
    name: "大学英语六级",
    shortName: "CET-6",
    description: "六级考试核心与进阶词汇",
    wordCount: 5406,
    file: "cet6.json",
    sourceName: "ECDICT",
    sourceUrl: "https://github.com/skywind3000/ECDICT",
    license: "MIT",
    official: false,
  },
  {
    id: "ielts",
    name: "雅思",
    shortName: "IELTS",
    description: "雅思常见学术与生活场景词汇",
    wordCount: 5038,
    file: "ielts.json",
    sourceName: "ECDICT",
    sourceUrl: "https://github.com/skywind3000/ECDICT",
    license: "MIT",
    official: false,
  },
  {
    id: "toefl",
    name: "托福",
    shortName: "TOEFL",
    description: "托福阅读、听力常见学术词汇",
    wordCount: 6970,
    file: "toefl.json",
    sourceName: "ECDICT",
    sourceUrl: "https://github.com/skywind3000/ECDICT",
    license: "MIT",
    official: false,
  },
  {
    id: "pte",
    name: "PTE 学术核心",
    shortName: "PTE",
    description: "基于 Academic Word List 的非官方 PTE 学术核心词",
    wordCount: 569,
    file: "pte.json",
    sourceName: "Jianyuanxi/AWL",
    sourceUrl: "https://github.com/Jianyuanxi/AWL",
    license: "MIT",
    official: false,
  },
  {
    id: "toeic",
    name: "托业",
    shortName: "TOEIC",
    description: "个人整理的托业核心词汇",
    wordCount: 366,
    file: "momo_toeic.jsonl",
    sourceName: "个人词库",
    sourceUrl: "",
    license: "自有词库",
    official: false,
  },
];

export function getWordbookManifest(id: WordbookId) {
  return wordbookManifests.find((wordbook) => wordbook.id === id) ?? wordbookManifests[0];
}

const bundledWordbooks = import.meta.glob<string>("../assets/wordbooks/*", {
  query: "?raw",
  import: "default",
});

function isLearningWord(value: unknown): value is LearningWord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.word === "string" &&
    typeof candidate.phonetic === "string" &&
    typeof candidate.meaning === "string" &&
    typeof candidate.mnemonic === "string" &&
    typeof candidate.phrases === "string" &&
    typeof candidate.example === "string"
  );
}

function validateWords(entries: unknown[], name: string): LearningWord[] {
  if (entries.length === 0) throw new Error(`词库为空：${name}`);

  return entries.map((entry, index) => {
    if (!isLearningWord(entry)) {
      throw new Error(`词库格式错误：${name} 第 ${index + 1} 条单词字段不完整`);
    }
    return entry;
  });
}

export function parseWordbook(text: string, name = "词库"): LearningWord[] {
  const trimmed = text.trim();
  if (!trimmed) throw new Error(`词库为空：${name}`);

  if (trimmed.startsWith("[")) {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error(`词库格式错误：${name} 不是有效的 JSON 数组`);
    }

    if (!Array.isArray(data)) {
      throw new Error(`词库格式错误：${name} 顶层必须是 JSON 数组`);
    }
    return validateWords(data, name);
  }

  const entries: unknown[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      throw new Error(`词库格式错误：${name} 第 ${index + 1} 行不是有效的 JSON`);
    }
  }

  return validateWords(entries, name);
}

export async function loadWordbook(id: WordbookId): Promise<LearningWord[]> {
  const manifest = getWordbookManifest(id);
  const modulePath = `../assets/wordbooks/${manifest.file}`;
  const loadBundledText = bundledWordbooks[modulePath];
  if (!loadBundledText) throw new Error(`无法读取内置词库：${manifest.name}`);

  return parseWordbook(await loadBundledText(), manifest.name);
}

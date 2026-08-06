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
  license: "MIT";
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
    description: "办公、商务、出行等托业高频场景词汇",
    wordCount: 1018,
    file: "toeic.json",
    sourceName: "ringooai/open-vocabularies + ECDICT",
    sourceUrl: "https://github.com/ringooai/open-vocabularies",
    license: "MIT",
    official: false,
  },
];

export function getWordbookManifest(id: WordbookId) {
  return wordbookManifests.find((wordbook) => wordbook.id === id) ?? wordbookManifests[0];
}

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

export async function loadWordbook(id: WordbookId): Promise<LearningWord[]> {
  const manifest = getWordbookManifest(id);
  const response = await fetch(`/wordbooks/${manifest.file}`);
  if (!response.ok) throw new Error(`无法读取词库：${manifest.name}`);

  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error(`词库格式错误：${manifest.name}`);
  const words = data.filter(isLearningWord);
  if (words.length === 0) throw new Error(`词库为空：${manifest.name}`);
  return words;
}

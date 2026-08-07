import { invoke } from "@tauri-apps/api/core";

export interface DeepSeekSettings { apiKey: string; baseUrl: string; model: string; }
export interface DeepSeekContext { word: string; phonetic?: string; meaning?: string; phrases?: string; example?: string; }

export function normalizeDeepSeekBaseUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (!normalized.startsWith("https://")) throw new Error("API 地址必须使用 https://");
  return normalized;
}

function contextText(context: DeepSeekContext) {
  return [
    `当前单词：${context.word}`,
    context.phonetic && `音标：${context.phonetic}`,
    context.meaning && `释义：${context.meaning}`,
    context.phrases && `短语：${context.phrases}`,
    context.example && `例句：${context.example}`,
  ].filter(Boolean).join("\n");
}

export async function askDeepSeek(settings: DeepSeekSettings, prompt: string, context: DeepSeekContext) {
  if (!settings.apiKey.trim()) throw new Error("请先在“我的”中填写 DeepSeek API Key");
  if (!prompt.trim()) throw new Error("请输入问题");
  if (!("__TAURI_INTERNALS__" in window)) throw new Error("AI 助手请在桌面应用中使用");
  return invoke<string>("ask_deepseek", {
    request: {
      apiKey: settings.apiKey.trim(),
      baseUrl: normalizeDeepSeekBaseUrl(settings.baseUrl),
      model: settings.model.trim() || "deepseek-v4-flash",
      prompt: prompt.trim(),
      context: contextText(context),
    },
  });
}

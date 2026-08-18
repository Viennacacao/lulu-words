import type { WordbookId } from "../../data/wordbooks";

export type AppView = "study" | "wordbooks" | "texts" | "statistics" | "profile";

export interface AppPreferences {
  selectedWordbookId: WordbookId;
  dailyGoal: number;
  fontSize: number;
  documentZoom: number;
  voiceRate: number;
  showKeyboardHints: boolean;
  learningRows: 6 | 8;
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
}

export const defaultPreferences: AppPreferences = {
  selectedWordbookId: "cet4",
  dailyGoal: 20,
  fontSize: 17,
  documentZoom: 1,
  voiceRate: 0.85,
  showKeyboardHints: true,
  learningRows: 6,
  deepseekApiKey: import.meta.env.VITE_DEEPSEEK_API_KEY ?? "",
  deepseekBaseUrl: import.meta.env.VITE_DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  deepseekModel: import.meta.env.VITE_DEEPSEEK_MODEL ?? "deepseek-v4-flash",
};

export class AppPreferencesStore {
  private readonly key = "lulu-words.preferences.v1";

  constructor(private readonly storage: Storage = window.localStorage) {}

  load(): AppPreferences {
    const serialized = this.storage.getItem(this.key);
    if (!serialized) return defaultPreferences;

    try {
      const saved = JSON.parse(serialized) as Partial<AppPreferences>;
      return { ...defaultPreferences, ...saved };
    } catch {
      return defaultPreferences;
    }
  }

  save(preferences: AppPreferences) {
    this.storage.setItem(this.key, JSON.stringify(preferences));
  }
}

export function clampDocumentFontSize(fontSize: number) {
  return Math.min(20, Math.max(15, Math.round(fontSize)));
}

import { describe, expect, it } from "vitest";
import {
  AppPreferencesStore,
  clampDocumentFontSize,
  defaultPreferences,
} from "../src/core/preferences/AppPreferences";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("AppPreferencesStore", () => {
  it("persists local-only learning and appearance preferences", () => {
    const storage = new MemoryStorage();
    const store = new AppPreferencesStore(storage);
    const preferences = {
      ...defaultPreferences,
      selectedWordbookId: "ielts" as const,
      dailyGoal: 35,
      fontSize: 19,
    };

    store.save(preferences);

    expect(new AppPreferencesStore(storage).load()).toEqual(preferences);
  });

  it("keeps real document font size within a safe layout range", () => {
    expect(clampDocumentFontSize(8)).toBe(15);
    expect(clampDocumentFontSize(18.7)).toBe(19);
    expect(clampDocumentFontSize(30)).toBe(20);
  });
});

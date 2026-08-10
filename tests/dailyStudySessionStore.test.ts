import { describe, expect, it } from "vitest";
import { sampleWords } from "../src/data/sampleWords";
import {
  DailyStudySessionStore,
  getLocalStudyDateKey,
} from "../src/features/learning/DailyStudySessionStore";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("DailyStudySessionStore", () => {
  it("uses a local calendar date instead of a UTC date", () => {
    expect(getLocalStudyDateKey(new Date(2026, 7, 10, 0, 5))).toBe("2026-08-10");
  });

  it("restores only the matching day and wordbook", () => {
    const store = new DailyStudySessionStore(new MemoryStorage());
    const session = {
      version: 1 as const,
      dateKey: "2026-08-10",
      wordbookId: "cet4" as const,
      queue: [{ word: sampleWords[0], kind: "review" as const }],
      currentIndex: 0,
      completedCount: 4,
      initialReviewCount: 8,
      initialNewCount: 12,
      complete: false,
      updatedAt: "2026-08-10T08:00:00.000Z",
    };
    store.save(session);

    expect(store.load("2026-08-10", "cet4")).toEqual(session);
    expect(store.load("2026-08-11", "cet4")).toBeUndefined();
    expect(store.load("2026-08-10", "cet6")).toBeUndefined();
  });
});

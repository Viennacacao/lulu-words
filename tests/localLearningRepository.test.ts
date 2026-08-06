import { describe, expect, it } from "vitest";
import { LearningProgressService } from "../src/core/services/LearningProgressService";
import { FsrsReviewScheduler } from "../src/core/scheduler/FsrsReviewScheduler";
import { LocalLearningRepository } from "../src/infrastructure/persistence/LocalLearningRepository";
import { sampleWords } from "../src/data/sampleWords";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("LocalLearningRepository", () => {
  it("persists mnemonics and review cards across repository instances", async () => {
    const storage = new MemoryStorage();
    const firstRepository = new LocalLearningRepository(storage);
    const firstService = new LearningProgressService(
      firstRepository,
      new FsrsReviewScheduler(),
    );

    await firstService.initialize(sampleWords);
    firstService.saveMnemonic("abandon", "本地保存的助记");
    firstService.recordReview(
      "abandon",
      "good",
      new Date("2026-08-06T08:00:00.000Z"),
    );
    await firstService.flush();

    const secondRepository = new LocalLearningRepository(storage);
    await secondRepository.initialize(sampleWords);
    const progress = await secondRepository.loadProgress();
    const card = await secondRepository.getReviewCard("abandon");

    expect(progress.mnemonicOverrides.abandon).toBe("本地保存的助记");
    expect(progress.reviewedCount).toBe(1);
    expect(card?.reps).toBe(1);
    expect(await secondRepository.loadStatistics(new Date("2030-01-01T00:00:00.000Z"))).toEqual({
      reviewedCount: 1,
      todayReviewedCount: 0,
      uniqueReviewedCount: 1,
      dueCount: 1,
      mnemonicCount: 1,
      ratings: { again: 0, hard: 0, good: 1 },
    });
  });

  it("serializes rapid reviews so no log is lost", async () => {
    const repository = new LocalLearningRepository(new MemoryStorage());
    const service = new LearningProgressService(
      repository,
      new FsrsReviewScheduler(),
    );
    await service.initialize(sampleWords);

    service.recordReview("abandon", "again");
    service.recordReview("meticulous", "hard");
    service.recordReview("resilient", "good");
    await service.flush();

    expect((await repository.loadProgress()).reviewedCount).toBe(3);
  });
});

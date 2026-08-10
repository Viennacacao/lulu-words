import type { LearningRepository } from "../repository/LearningRepository";
import type { ReviewScheduler } from "../scheduler/ReviewScheduler";
import type { LearningWord, Rating } from "../../features/learning/session";

export class LearningProgressService {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly repository: LearningRepository,
    private readonly scheduler: ReviewScheduler,
  ) {}

  async initialize(words: LearningWord[]) {
    await this.repository.initialize(words);
    return this.repository.loadProgress();
  }

  async createDailyPlan(
    words: LearningWord[],
    dailyGoal: number,
    now = new Date(),
  ) {
    await this.flush();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const [dueWords, reviewedToday] = await Promise.all([
      this.repository.loadDueReviewWords(now),
      this.repository.loadReviewCountSince(startOfDay),
    ]);
    const sortedReviews = dueWords.sort(
      (left, right) =>
        this.scheduler.retrievability(left.card, now) -
          this.scheduler.retrievability(right.card, now) ||
        new Date(left.card.due).getTime() - new Date(right.card.due).getTime(),
    );
    const remainingCapacity = Math.max(
      0,
      dailyGoal - reviewedToday - sortedReviews.length,
    );
    const newWords = await this.repository.loadUnseenWords(words, remainingCapacity);

    return {
      items: [
        ...sortedReviews.map(({ word }) => ({ word, kind: "review" as const })),
        ...newWords.map((word) => ({ word, kind: "new" as const })),
      ],
      reviewCount: sortedReviews.length,
      newCount: newWords.length,
      reviewedToday,
    };
  }

  async previewReview(wordId: string, now = new Date()) {
    await this.flush();
    return this.scheduler.preview(
      await this.repository.getReviewCard(wordId),
      now,
    );
  }

  recordReview(wordId: string, rating: Rating, now = new Date()): Promise<void> {
    this.queue = this.queue.then(async () => {
      const previousCard = await this.repository.getReviewCard(wordId);
      const scheduled = this.scheduler.grade(previousCard, rating, now);
      await this.repository.saveReview(wordId, rating, scheduled);
    });
    return this.queue;
  }

  saveMnemonic(wordId: string, content: string): Promise<void> {
    this.queue = this.queue.then(() =>
      this.repository.saveMnemonic(wordId, content),
    );
    return this.queue;
  }

  async loadStatistics(now = new Date()) {
    await this.flush();
    return this.repository.loadStatistics(now);
  }

  async flush(): Promise<void> {
    await this.queue;
  }
}

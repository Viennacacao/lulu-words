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

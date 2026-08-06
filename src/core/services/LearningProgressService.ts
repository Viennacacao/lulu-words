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

  recordReview(wordId: string, rating: Rating, now = new Date()): void {
    this.queue = this.queue.then(async () => {
      const previousCard = await this.repository.getReviewCard(wordId);
      const scheduled = this.scheduler.grade(previousCard, rating, now);
      await this.repository.saveReview(wordId, rating, scheduled);
    });
  }

  saveMnemonic(wordId: string, content: string): void {
    this.queue = this.queue.then(() =>
      this.repository.saveMnemonic(wordId, content),
    );
  }

  async flush(): Promise<void> {
    await this.queue;
  }
}

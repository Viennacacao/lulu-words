import type {
  HydratedProgress,
  LearningRepository,
} from "../../core/repository/LearningRepository";
import type {
  ReviewCardSnapshot,
  ScheduledReview,
} from "../../core/scheduler/ReviewScheduler";
import type { LearningWord, Rating } from "../../features/learning/session";

interface LocalReviewLog {
  wordId: string;
  rating: Rating;
  review: ScheduledReview;
}

interface LocalLearningData {
  version: 1;
  cards: Record<string, ReviewCardSnapshot>;
  mnemonics: Record<string, string>;
  logs: LocalReviewLog[];
}

const emptyData = (): LocalLearningData => ({
  version: 1,
  cards: {},
  mnemonics: {},
  logs: [],
});

export class LocalLearningRepository implements LearningRepository {
  private readonly key = "lulu-words.progress.v1";

  constructor(private readonly storage: Storage = window.localStorage) {}

  async initialize(_words: LearningWord[]): Promise<void> {
    if (!this.storage.getItem(this.key)) this.write(emptyData());
  }

  async loadProgress(): Promise<HydratedProgress> {
    const data = this.read();
    return {
      mnemonicOverrides: data.mnemonics,
      reviewedCount: data.logs.length,
    };
  }

  async getReviewCard(
    wordId: string,
  ): Promise<ReviewCardSnapshot | undefined> {
    return this.read().cards[wordId];
  }

  async saveReview(
    wordId: string,
    rating: Rating,
    review: ScheduledReview,
  ): Promise<void> {
    const data = this.read();
    data.cards[wordId] = review.card;
    data.logs.push({ wordId, rating, review });
    this.write(data);
  }

  async saveMnemonic(wordId: string, content: string): Promise<void> {
    const data = this.read();
    data.mnemonics[wordId] = content;
    this.write(data);
  }

  private read(): LocalLearningData {
    const serialized = this.storage.getItem(this.key);
    if (!serialized) return emptyData();

    try {
      const parsed = JSON.parse(serialized) as LocalLearningData;
      return parsed.version === 1 ? parsed : emptyData();
    } catch {
      return emptyData();
    }
  }

  private write(data: LocalLearningData): void {
    this.storage.setItem(this.key, JSON.stringify(data));
  }
}

import type {
  DueReviewWord,
  HydratedProgress,
  LearningStatistics,
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
  version: 2;
  words: Record<string, LearningWord>;
  cards: Record<string, ReviewCardSnapshot>;
  mnemonics: Record<string, string>;
  logs: LocalReviewLog[];
}

const emptyData = (): LocalLearningData => ({
  version: 2,
  words: {},
  cards: {},
  mnemonics: {},
  logs: [],
});

export class LocalLearningRepository implements LearningRepository {
  private readonly key = "lulu-words.progress.v1";

  constructor(private readonly storage: Storage = window.localStorage) {}

  async initialize(words: LearningWord[]): Promise<void> {
    const data = this.read();
    for (const word of words) data.words[word.id] = word;
    this.write(data);
  }

  async loadProgress(): Promise<HydratedProgress> {
    const data = this.read();
    return {
      mnemonicOverrides: data.mnemonics,
      reviewedCount: data.logs.length,
    };
  }

  async loadStatistics(now = new Date()): Promise<LearningStatistics> {
    const data = this.read();
    const ratings = { again: 0, hard: 0, good: 0 };
    for (const log of data.logs) ratings[log.rating] += 1;
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    return {
      reviewedCount: data.logs.length,
      todayReviewedCount: data.logs.filter(
        (log) => new Date(log.review.log.reviewedAt).getTime() >= startOfDay.getTime(),
      ).length,
      uniqueReviewedCount: new Set(data.logs.map((log) => log.wordId)).size,
      dueCount: Object.values(data.cards).filter(
        (card) => new Date(card.due).getTime() <= now.getTime(),
      ).length,
      mnemonicCount: Object.keys(data.mnemonics).length,
      ratings,
    };
  }

  async loadDueReviewWords(now: Date): Promise<DueReviewWord[]> {
    const data = this.read();
    return Object.entries(data.cards)
      .filter(([, card]) => new Date(card.due).getTime() <= now.getTime())
      .flatMap(([wordId, card]) => {
        const word = data.words[wordId];
        return word ? [{ word, card }] : [];
      });
  }

  async loadUnseenWords(words: LearningWord[], limit: number): Promise<LearningWord[]> {
    if (limit <= 0) return [];
    const cards = this.read().cards;
    return words.filter((word) => !cards[word.id]).slice(0, limit);
  }

  async loadReviewCountSince(since: Date): Promise<number> {
    return this.read().logs.filter(
      (log) => new Date(log.review.log.reviewedAt).getTime() >= since.getTime(),
    ).length;
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
      const parsed = JSON.parse(serialized) as LocalLearningData | (Omit<LocalLearningData, "version" | "words"> & { version: 1 });
      if (parsed.version === 2) return parsed;
      if (parsed.version === 1) {
        return { ...parsed, version: 2, words: {} };
      }
      return emptyData();
    } catch {
      return emptyData();
    }
  }

  private write(data: LocalLearningData): void {
    this.storage.setItem(this.key, JSON.stringify(data));
  }
}

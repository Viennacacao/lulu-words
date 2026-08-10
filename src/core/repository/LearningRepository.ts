import type { LearningWord, Rating } from "../../features/learning/session";
import type {
  ReviewCardSnapshot,
  ScheduledReview,
} from "../scheduler/ReviewScheduler";

export interface HydratedProgress {
  mnemonicOverrides: Record<string, string>;
  reviewedCount: number;
}

export interface LearningStatistics {
  reviewedCount: number;
  todayReviewedCount: number;
  uniqueReviewedCount: number;
  dueCount: number;
  mnemonicCount: number;
  ratings: Record<Rating, number>;
}

export interface DueReviewWord {
  word: LearningWord;
  card: ReviewCardSnapshot;
}

export interface LearningRepository {
  initialize(words: LearningWord[]): Promise<void>;
  loadProgress(): Promise<HydratedProgress>;
  loadStatistics(now?: Date): Promise<LearningStatistics>;
  loadDueReviewWords(now: Date): Promise<DueReviewWord[]>;
  loadUnseenWords(words: LearningWord[], limit: number): Promise<LearningWord[]>;
  loadReviewCountSince(since: Date): Promise<number>;
  getReviewCard(wordId: string): Promise<ReviewCardSnapshot | undefined>;
  saveReview(
    wordId: string,
    rating: Rating,
    review: ScheduledReview,
  ): Promise<void>;
  saveMnemonic(wordId: string, content: string): Promise<void>;
}

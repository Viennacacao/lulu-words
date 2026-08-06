import type { LearningWord, Rating } from "../../features/learning/session";
import type {
  ReviewCardSnapshot,
  ScheduledReview,
} from "../scheduler/ReviewScheduler";

export interface HydratedProgress {
  mnemonicOverrides: Record<string, string>;
  reviewedCount: number;
}

export interface LearningRepository {
  initialize(words: LearningWord[]): Promise<void>;
  loadProgress(): Promise<HydratedProgress>;
  getReviewCard(wordId: string): Promise<ReviewCardSnapshot | undefined>;
  saveReview(
    wordId: string,
    rating: Rating,
    review: ScheduledReview,
  ): Promise<void>;
  saveMnemonic(wordId: string, content: string): Promise<void>;
}

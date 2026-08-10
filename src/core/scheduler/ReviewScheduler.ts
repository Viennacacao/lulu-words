import type { Rating } from "../../features/learning/session";

export interface ReviewCardSnapshot {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview?: string;
}

export interface ReviewLogSnapshot {
  rating: number;
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reviewedAt: string;
}

export interface ScheduledReview {
  card: ReviewCardSnapshot;
  log: ReviewLogSnapshot;
}

export interface ReviewScheduler {
  grade(
    card: ReviewCardSnapshot | undefined,
    rating: Rating,
    now: Date,
  ): ScheduledReview;
  preview(
    card: ReviewCardSnapshot | undefined,
    now: Date,
  ): Record<Rating, ScheduledReview>;
  retrievability(card: ReviewCardSnapshot, now: Date): number;
}

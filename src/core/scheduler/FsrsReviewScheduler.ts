import {
  Rating as FsrsRating,
  createEmptyCard,
  fsrs,
  type Card,
  type Grade,
  type ReviewLog,
} from "ts-fsrs";
import type { Rating } from "../../features/learning/session";
import type {
  ReviewCardSnapshot,
  ReviewLogSnapshot,
  ReviewScheduler,
  ScheduledReview,
} from "./ReviewScheduler";

const ratingMap: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
};

function serializeCard(card: Card): ReviewCardSnapshot {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review?.toISOString(),
  };
}

function deserializeCard(card: ReviewCardSnapshot): Card {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

function serializeLog(log: ReviewLog): ReviewLogSnapshot {
  return {
    rating: log.rating,
    state: log.state,
    due: log.due.toISOString(),
    stability: log.stability,
    difficulty: log.difficulty,
    elapsedDays: log.elapsed_days,
    lastElapsedDays: log.last_elapsed_days,
    scheduledDays: log.scheduled_days,
    learningSteps: log.learning_steps,
    reviewedAt: log.review.toISOString(),
  };
}

export class FsrsReviewScheduler implements ReviewScheduler {
  private readonly scheduler = fsrs({ enable_fuzz: false });

  grade(
    card: ReviewCardSnapshot | undefined,
    rating: Rating,
    now: Date,
  ): ScheduledReview {
    const sourceCard = card ? deserializeCard(card) : createEmptyCard(now);
    const result = this.scheduler.next(sourceCard, now, ratingMap[rating]);

    return {
      card: serializeCard(result.card),
      log: serializeLog(result.log),
    };
  }

  preview(
    card: ReviewCardSnapshot | undefined,
    now: Date,
  ): Record<Rating, ScheduledReview> {
    const sourceCard = card ? deserializeCard(card) : createEmptyCard(now);
    const preview = this.scheduler.repeat(sourceCard, now);
    const toScheduledReview = (rating: Rating): ScheduledReview => {
      const result = preview[ratingMap[rating]];
      return {
        card: serializeCard(result.card),
        log: serializeLog(result.log),
      };
    };

    return {
      again: toScheduledReview("again"),
      hard: toScheduledReview("hard"),
      good: toScheduledReview("good"),
    };
  }

  retrievability(card: ReviewCardSnapshot, now: Date): number {
    return this.scheduler.get_retrievability(deserializeCard(card), now, false);
  }
}

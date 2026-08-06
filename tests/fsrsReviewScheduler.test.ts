import { describe, expect, it } from "vitest";
import { FsrsReviewScheduler } from "../src/core/scheduler/FsrsReviewScheduler";

describe("FsrsReviewScheduler", () => {
  it("maps the three product ratings to FSRS and creates a review card", () => {
    const scheduler = new FsrsReviewScheduler();
    const now = new Date("2026-08-06T08:00:00.000Z");

    const again = scheduler.grade(undefined, "again", now);
    const hard = scheduler.grade(undefined, "hard", now);
    const good = scheduler.grade(undefined, "good", now);

    expect(again.log.rating).toBe(1);
    expect(hard.log.rating).toBe(2);
    expect(good.log.rating).toBe(3);
    expect(good.card.reps).toBe(1);
    expect(new Date(good.card.due).getTime()).toBeGreaterThan(now.getTime());
  });

  it("continues scheduling from a persisted card snapshot", () => {
    const scheduler = new FsrsReviewScheduler();
    const firstTime = new Date("2026-08-06T08:00:00.000Z");
    const first = scheduler.grade(undefined, "good", firstTime);
    const secondTime = new Date(first.card.due);
    const second = scheduler.grade(first.card, "good", secondTime);

    expect(second.card.reps).toBe(2);
    expect(second.card.lastReview).toBe(secondTime.toISOString());
    expect(new Date(second.card.due).getTime()).toBeGreaterThan(
      secondTime.getTime(),
    );
  });
});

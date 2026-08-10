import { describe, expect, it } from "vitest";
import {
  createLearningSession,
  getCurrentMnemonic,
  learningSessionReducer,
  type LearningWord,
} from "../src/features/learning/session";

const words: LearningWord[] = [
  {
    id: "one",
    word: "one",
    phonetic: "/wʌn/",
    meaning: "一",
    mnemonic: "first mnemonic",
    phrases: "one by one",
    example: "One example.",
  },
  {
    id: "two",
    word: "two",
    phonetic: "/tuː/",
    meaning: "二",
    mnemonic: "second mnemonic",
    phrases: "two of us",
    example: "Two examples.",
  },
];

describe("learningSessionReducer", () => {
  it("loads another wordbook without losing global progress", () => {
    const initial = createLearningSession(words);
    const hydrated = learningSessionReducer(initial, {
      type: "HYDRATE_PROGRESS",
      mnemonicOverrides: { one: "saved" },
      reviewedCount: 9,
    });
    const loaded = learningSessionReducer(hydrated, {
      type: "LOAD_WORDS",
      words: [words[1]],
    });

    expect(loaded.words).toEqual([words[1]]);
    expect(loaded.currentIndex).toBe(0);
    expect(loaded.reviewedCount).toBe(9);
    expect(loaded.mnemonicOverrides.one).toBe("saved");
  });

  it("hydrates saved progress without changing the current learning state", () => {
    const initial = createLearningSession(words);
    const hydrated = learningSessionReducer(initial, {
      type: "HYDRATE_PROGRESS",
      mnemonicOverrides: { one: "saved mnemonic" },
      reviewedCount: 12,
    });

    expect(hydrated.phase).toBe("recall");
    expect(hydrated.reviewedCount).toBe(12);
    expect(getCurrentMnemonic(hydrated)).toBe("saved mnemonic");
  });

  it("does not grade a concealed answer", () => {
    const initial = createLearningSession(words);
    const result = learningSessionReducer(initial, {
      type: "GRADE",
      rating: "good",
    });

    expect(result).toEqual(initial);
  });

  it("reveals, grades and advances to the next word", () => {
    const initial = createLearningSession(words);
    const revealed = learningSessionReducer(initial, { type: "TOGGLE_ANSWER" });
    const graded = learningSessionReducer(revealed, {
      type: "GRADE",
      rating: "hard",
    });

    expect(revealed.phase).toBe("revealed");
    expect(graded.currentIndex).toBe(1);
    expect(graded.phase).toBe("recall");
    expect(graded.lastRating).toBe("hard");
    expect(graded.reviewedCount).toBe(1);
  });

  it("saves a mnemonic override for the current word", () => {
    let state = createLearningSession(words);
    state = learningSessionReducer(state, { type: "TOGGLE_ANSWER" });
    state = learningSessionReducer(state, { type: "START_MNEMONIC_EDIT" });
    state = learningSessionReducer(state, {
      type: "CHANGE_MNEMONIC",
      value: "  my mnemonic  ",
    });
    state = learningSessionReducer(state, { type: "SAVE_MNEMONIC" });

    expect(state.phase).toBe("revealed");
    expect(getCurrentMnemonic(state)).toBe("my mnemonic");
  });

  it("cancels mnemonic editing without changing the stored mnemonic", () => {
    let state = createLearningSession(words);
    state = learningSessionReducer(state, { type: "TOGGLE_ANSWER" });
    state = learningSessionReducer(state, { type: "START_MNEMONIC_EDIT" });
    state = learningSessionReducer(state, {
      type: "CHANGE_MNEMONIC",
      value: "discard me",
    });
    state = learningSessionReducer(state, { type: "CANCEL_MNEMONIC_EDIT" });

    expect(getCurrentMnemonic(state)).toBe("first mnemonic");
    expect(state.phase).toBe("revealed");
  });

  it("hides and restores without losing the current session", () => {
    let state = createLearningSession(words);
    state = learningSessionReducer(state, { type: "NEXT" });
    state = learningSessionReducer(state, { type: "TOGGLE_HIDDEN" });
    state = learningSessionReducer(state, { type: "TOGGLE_HIDDEN" });

    expect(state.hidden).toBe(false);
    expect(state.currentIndex).toBe(1);
    expect(state.phase).toBe("recall");
  });

  it("wraps navigation at both ends", () => {
    const initial = createLearningSession(words);
    const previous = learningSessionReducer(initial, { type: "PREVIOUS" });
    const next = learningSessionReducer(previous, { type: "NEXT" });

    expect(previous.currentIndex).toBe(1);
    expect(next.currentIndex).toBe(0);
  });

  it("stays consistent across one hundred review transitions", () => {
    let state = createLearningSession(words);

    for (let index = 0; index < 100; index += 1) {
      state = learningSessionReducer(state, { type: "TOGGLE_ANSWER" });
      state = learningSessionReducer(state, {
        type: "GRADE",
        rating: index % 2 === 0 ? "good" : "again",
      });
    }

    expect(state.reviewedCount).toBe(100);
    expect(state.currentIndex).toBe(0);
    expect(state.phase).toBe("recall");
  });

  it("runs a finite planned queue and places forgotten words later", () => {
    let state = createLearningSession(words);
    state = learningSessionReducer(state, {
      type: "LOAD_STUDY_QUEUE",
      items: words.map((word, index) => ({
        word,
        kind: index === 0 ? "review" : "new",
      })),
      plan: {
        dateKey: "2026-08-10",
        wordbookId: "cet4",
        initialReviewCount: 1,
        initialNewCount: 1,
        completedCount: 0,
      },
    });
    state = learningSessionReducer(state, { type: "TOGGLE_ANSWER" });
    state = learningSessionReducer(state, { type: "GRADE", rating: "again" });

    expect(state.words.map((word) => word.id)).toEqual(["one", "two", "one"]);
    expect(state.queueKinds).toEqual(["review", "new", "relearning"]);
    expect(state.currentIndex).toBe(1);
    expect(state.studyPlan?.completedCount).toBe(1);
    expect(state.studyPlan?.complete).toBe(false);

    for (let index = 0; index < 2; index += 1) {
      state = learningSessionReducer(state, { type: "TOGGLE_ANSWER" });
      state = learningSessionReducer(state, { type: "GRADE", rating: "good" });
    }
    expect(state.studyPlan?.complete).toBe(true);
    expect(state.studyPlan?.completedCount).toBe(3);
  });

  it("does not let arrow navigation skip items in a planned queue", () => {
    let state = createLearningSession(words);
    state = learningSessionReducer(state, {
      type: "LOAD_STUDY_QUEUE",
      items: words.map((word) => ({ word, kind: "new" })),
      plan: {
        dateKey: "2026-08-10",
        wordbookId: "cet4",
        initialReviewCount: 0,
        initialNewCount: 2,
        completedCount: 0,
      },
    });

    expect(learningSessionReducer(state, { type: "NEXT" }).currentIndex).toBe(0);
    expect(learningSessionReducer(state, { type: "PREVIOUS" }).currentIndex).toBe(0);
  });
});

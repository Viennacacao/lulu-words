export type SessionPhase = "recall" | "revealed" | "editingMnemonic";
export type Rating = "again" | "hard" | "good";
export type StudyQueueKind = "review" | "new" | "relearning";

export interface StudyPlanState {
  dateKey: string;
  wordbookId: string;
  initialReviewCount: number;
  initialNewCount: number;
  completedCount: number;
  complete: boolean;
}

export interface LearningWord {
  id: string;
  word: string;
  phonetic: string;
  meaning: string;
  mnemonic: string;
  phrases: string;
  example: string;
}

export interface LearningSessionState {
  words: LearningWord[];
  currentIndex: number;
  phase: SessionPhase;
  hidden: boolean;
  mnemonicDraft: string;
  mnemonicOverrides: Record<string, string>;
  lastRating?: Rating;
  reviewedCount: number;
  queueKinds: StudyQueueKind[];
  studyPlan?: StudyPlanState;
}

export type LearningSessionAction =
  | { type: "LOAD_WORDS"; words: LearningWord[] }
  | {
      type: "LOAD_STUDY_QUEUE";
      items: Array<{ word: LearningWord; kind: StudyQueueKind }>;
      plan: Omit<StudyPlanState, "complete"> & { complete?: boolean };
      currentIndex?: number;
    }
  | {
      type: "HYDRATE_PROGRESS";
      mnemonicOverrides: Record<string, string>;
      reviewedCount: number;
    }
  | { type: "TOGGLE_ANSWER" }
  | { type: "GRADE"; rating: Rating }
  | { type: "NEXT" }
  | { type: "PREVIOUS" }
  | { type: "TOGGLE_HIDDEN" }
  | { type: "START_MNEMONIC_EDIT" }
  | { type: "CHANGE_MNEMONIC"; value: string }
  | { type: "SAVE_MNEMONIC" }
  | { type: "CANCEL_MNEMONIC_EDIT" };

export function createLearningSession(
  words: LearningWord[],
): LearningSessionState {
  if (words.length === 0) {
    throw new Error("Learning session requires at least one word.");
  }

  return {
    words,
    currentIndex: 0,
    phase: "recall",
    hidden: false,
    mnemonicDraft: words[0].mnemonic,
    mnemonicOverrides: {},
    reviewedCount: 0,
    queueKinds: words.map(() => "new"),
  };
}

export function getCurrentWord(state: LearningSessionState): LearningWord {
  return state.words[state.currentIndex];
}

export function getCurrentMnemonic(state: LearningSessionState): string {
  const word = getCurrentWord(state);
  return state.mnemonicOverrides[word.id] ?? word.mnemonic;
}

function moveTo(
  state: LearningSessionState,
  nextIndex: number,
  lastRating = state.lastRating,
): LearningSessionState {
  const normalizedIndex =
    (nextIndex + state.words.length) % state.words.length;
  const nextWord = state.words[normalizedIndex];

  return {
    ...state,
    currentIndex: normalizedIndex,
    phase: "recall",
    mnemonicDraft:
      state.mnemonicOverrides[nextWord.id] ?? nextWord.mnemonic,
    lastRating,
  };
}

export function learningSessionReducer(
  state: LearningSessionState,
  action: LearningSessionAction,
): LearningSessionState {
  switch (action.type) {
    case "LOAD_WORDS": {
      if (action.words.length === 0) return state;
      const firstWord = action.words[0];
      return {
        ...state,
        words: action.words,
        currentIndex: 0,
        phase: "recall",
        mnemonicDraft:
          state.mnemonicOverrides[firstWord.id] ?? firstWord.mnemonic,
        lastRating: undefined,
        queueKinds: action.words.map(() => "new"),
        studyPlan: undefined,
      };
    }

    case "LOAD_STUDY_QUEUE": {
      const queueWords = action.items.map((item) => item.word);
      const queueKinds = action.items.map((item) => item.kind);
      const complete = action.plan.complete ?? queueWords.length === 0;
      if (queueWords.length === 0) {
        return {
          ...state,
          phase: "recall",
          queueKinds: [],
          studyPlan: { ...action.plan, complete },
        };
      }
      const currentIndex = Math.min(
        queueWords.length - 1,
        Math.max(0, action.currentIndex ?? 0),
      );
      const currentWord = queueWords[currentIndex];
      return {
        ...state,
        words: queueWords,
        queueKinds,
        currentIndex,
        phase: "recall",
        mnemonicDraft:
          state.mnemonicOverrides[currentWord.id] ?? currentWord.mnemonic,
        lastRating: undefined,
        studyPlan: { ...action.plan, complete },
      };
    }

    case "HYDRATE_PROGRESS": {
      const currentWord = getCurrentWord(state);
      return {
        ...state,
        mnemonicOverrides: action.mnemonicOverrides,
        mnemonicDraft:
          action.mnemonicOverrides[currentWord.id] ?? currentWord.mnemonic,
        reviewedCount: action.reviewedCount,
      };
    }

    case "TOGGLE_ANSWER":
      if (state.hidden || state.phase === "editingMnemonic") return state;
      return {
        ...state,
        phase: state.phase === "recall" ? "revealed" : "recall",
      };

    case "GRADE":
      if (state.hidden || state.phase !== "revealed") return state;
      if (state.studyPlan) {
        if (state.studyPlan.complete) return state;
        const words = [...state.words];
        const queueKinds = [...state.queueKinds];
        if (action.rating === "again") {
          const insertAt = Math.min(state.currentIndex + 8, words.length);
          words.splice(insertAt, 0, words[state.currentIndex]);
          queueKinds.splice(insertAt, 0, "relearning");
        }
        const nextIndex = state.currentIndex + 1;
        const complete = nextIndex >= words.length;
        const currentIndex = complete ? Math.max(0, words.length - 1) : nextIndex;
        const nextWord = words[currentIndex];
        return {
          ...state,
          words,
          queueKinds,
          currentIndex,
          phase: "recall",
          mnemonicDraft:
            state.mnemonicOverrides[nextWord.id] ?? nextWord.mnemonic,
          lastRating: action.rating,
          reviewedCount: state.reviewedCount + 1,
          studyPlan: {
            ...state.studyPlan,
            completedCount: state.studyPlan.completedCount + 1,
            complete,
          },
        };
      }
      return {
        ...moveTo(state, state.currentIndex + 1, action.rating),
        reviewedCount: state.reviewedCount + 1,
      };

    case "NEXT":
      if (state.phase === "editingMnemonic") return state;
      if (state.studyPlan) return state;
      return moveTo(state, state.currentIndex + 1);

    case "PREVIOUS":
      if (state.phase === "editingMnemonic") return state;
      if (state.studyPlan) return state;
      return moveTo(state, state.currentIndex - 1);

    case "TOGGLE_HIDDEN":
      return { ...state, hidden: !state.hidden };

    case "START_MNEMONIC_EDIT":
      if (state.hidden || state.phase !== "revealed") return state;
      return {
        ...state,
        phase: "editingMnemonic",
        mnemonicDraft: getCurrentMnemonic(state),
      };

    case "CHANGE_MNEMONIC":
      if (state.phase !== "editingMnemonic") return state;
      return { ...state, mnemonicDraft: action.value };

    case "SAVE_MNEMONIC": {
      if (state.phase !== "editingMnemonic") return state;
      const word = getCurrentWord(state);
      return {
        ...state,
        phase: "revealed",
        mnemonicOverrides: {
          ...state.mnemonicOverrides,
          [word.id]: state.mnemonicDraft.trim(),
        },
      };
    }

    case "CANCEL_MNEMONIC_EDIT":
      if (state.phase !== "editingMnemonic") return state;
      return {
        ...state,
        phase: "revealed",
        mnemonicDraft: getCurrentMnemonic(state),
      };
  }
}

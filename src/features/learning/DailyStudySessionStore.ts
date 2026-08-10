import type { WordbookId } from "../../data/wordbooks";
import type { LearningWord, StudyQueueKind } from "./session";

export interface PersistedDailyStudySession {
  version: 1;
  dateKey: string;
  wordbookId: WordbookId;
  queue: Array<{ word: LearningWord; kind: StudyQueueKind }>;
  currentIndex: number;
  completedCount: number;
  initialReviewCount: number;
  initialNewCount: number;
  complete: boolean;
  updatedAt: string;
}

export function getLocalStudyDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export class DailyStudySessionStore {
  private readonly key = "lulu-words.daily-study-session.v1";

  constructor(private readonly storage: Storage = window.localStorage) {}

  load(dateKey: string, wordbookId: WordbookId): PersistedDailyStudySession | undefined {
    try {
      const session = JSON.parse(
        this.storage.getItem(this.key) ?? "null",
      ) as PersistedDailyStudySession | null;
      if (
        !session ||
        session.version !== 1 ||
        session.dateKey !== dateKey ||
        session.wordbookId !== wordbookId ||
        !Array.isArray(session.queue)
      ) {
        return undefined;
      }
      return session;
    } catch {
      return undefined;
    }
  }

  save(session: PersistedDailyStudySession) {
    this.storage.setItem(this.key, JSON.stringify(session));
  }

  clear() {
    this.storage.removeItem(this.key);
  }
}

import Database from "@tauri-apps/plugin-sql";
import type {
  HydratedProgress,
  LearningStatistics,
  LearningRepository,
} from "../../core/repository/LearningRepository";
import type {
  ReviewCardSnapshot,
  ScheduledReview,
} from "../../core/scheduler/ReviewScheduler";
import type { LearningWord, Rating } from "../../features/learning/session";

interface MnemonicRow {
  word_id: string;
  content: string;
}

interface CountRow {
  count: number;
}

interface RatingCountRow {
  rating_name: Rating;
  count: number;
}

interface CardRow {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
}

export class SqliteLearningRepository implements LearningRepository {
  private database?: Database;

  async initialize(words: LearningWord[]): Promise<void> {
    this.database = await Database.load("sqlite:lulu-words.db");

    const batchSize = 80;
    for (let offset = 0; offset < words.length; offset += batchSize) {
      const batch = words.slice(offset, offset + batchSize);
      const placeholders = batch
        .map((_, rowIndex) => {
          const start = rowIndex * 7;
          return `($${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6}, $${start + 7})`;
        })
        .join(", ");
      const values = batch.flatMap((word) => [
        word.id,
        word.word,
        word.phonetic,
        word.meaning,
        word.mnemonic,
        word.phrases,
        word.example,
      ]);

      await this.database.execute(
        `INSERT INTO words (id, word, phonetic, meaning, default_mnemonic, phrases, example)
         VALUES ${placeholders}
         ON CONFLICT(id) DO UPDATE SET
           word = excluded.word,
           phonetic = excluded.phonetic,
           meaning = excluded.meaning,
           default_mnemonic = excluded.default_mnemonic,
           phrases = excluded.phrases,
           example = excluded.example`,
        values,
      );
    }
  }

  async loadProgress(): Promise<HydratedProgress> {
    const database = this.getDatabase();
    const mnemonicRows = await database.select<MnemonicRow[]>(
      "SELECT word_id, content FROM mnemonics",
    );
    const countRows = await database.select<CountRow[]>(
      "SELECT COUNT(*) AS count FROM review_logs",
    );

    return {
      mnemonicOverrides: Object.fromEntries(
        mnemonicRows.map((row) => [row.word_id, row.content]),
      ),
      reviewedCount: countRows[0]?.count ?? 0,
    };
  }

  async loadStatistics(now = new Date()): Promise<LearningStatistics> {
    const database = this.getDatabase();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const [reviewed, todayReviewed, uniqueReviewed, due, mnemonics, ratingRows] = await Promise.all([
      database.select<CountRow[]>("SELECT COUNT(*) AS count FROM review_logs"),
      database.select<CountRow[]>(
        "SELECT COUNT(*) AS count FROM review_logs WHERE reviewed_at >= $1",
        [startOfDay.toISOString()],
      ),
      database.select<CountRow[]>("SELECT COUNT(DISTINCT word_id) AS count FROM review_logs"),
      database.select<CountRow[]>(
        "SELECT COUNT(*) AS count FROM review_cards WHERE due <= $1",
        [now.toISOString()],
      ),
      database.select<CountRow[]>("SELECT COUNT(*) AS count FROM mnemonics"),
      database.select<RatingCountRow[]>(
        "SELECT rating_name, COUNT(*) AS count FROM review_logs GROUP BY rating_name",
      ),
    ]);
    const ratings = { again: 0, hard: 0, good: 0 };
    for (const row of ratingRows) ratings[row.rating_name] = row.count;

    return {
      reviewedCount: reviewed[0]?.count ?? 0,
      todayReviewedCount: todayReviewed[0]?.count ?? 0,
      uniqueReviewedCount: uniqueReviewed[0]?.count ?? 0,
      dueCount: due[0]?.count ?? 0,
      mnemonicCount: mnemonics[0]?.count ?? 0,
      ratings,
    };
  }

  async getReviewCard(
    wordId: string,
  ): Promise<ReviewCardSnapshot | undefined> {
    const rows = await this.getDatabase().select<CardRow[]>(
      `SELECT due, stability, difficulty, elapsed_days, scheduled_days,
              learning_steps, reps, lapses, state, last_review
       FROM review_cards WHERE word_id = $1`,
      [wordId],
    );
    const row = rows[0];
    if (!row) return undefined;

    return {
      due: row.due,
      stability: row.stability,
      difficulty: row.difficulty,
      elapsedDays: row.elapsed_days,
      scheduledDays: row.scheduled_days,
      learningSteps: row.learning_steps,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      lastReview: row.last_review ?? undefined,
    };
  }

  async saveReview(
    wordId: string,
    rating: Rating,
    review: ScheduledReview,
  ): Promise<void> {
    const database = this.getDatabase();
    const card = review.card;
    const log = review.log;

    await database.execute(
      `INSERT INTO review_cards (
         word_id, due, stability, difficulty, elapsed_days, scheduled_days,
         learning_steps, reps, lapses, state, last_review, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT(word_id) DO UPDATE SET
         due = excluded.due,
         stability = excluded.stability,
         difficulty = excluded.difficulty,
         elapsed_days = excluded.elapsed_days,
         scheduled_days = excluded.scheduled_days,
         learning_steps = excluded.learning_steps,
         reps = excluded.reps,
         lapses = excluded.lapses,
         state = excluded.state,
         last_review = excluded.last_review,
         updated_at = excluded.updated_at`,
      [
        wordId,
        card.due,
        card.stability,
        card.difficulty,
        card.elapsedDays,
        card.scheduledDays,
        card.learningSteps,
        card.reps,
        card.lapses,
        card.state,
        card.lastReview ?? null,
        log.reviewedAt,
      ],
    );

    await database.execute(
      `INSERT INTO review_logs (
         word_id, rating_name, rating, state, due, stability, difficulty,
         elapsed_days, last_elapsed_days, scheduled_days, learning_steps, reviewed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        wordId,
        rating,
        log.rating,
        log.state,
        log.due,
        log.stability,
        log.difficulty,
        log.elapsedDays,
        log.lastElapsedDays,
        log.scheduledDays,
        log.learningSteps,
        log.reviewedAt,
      ],
    );
  }

  async saveMnemonic(wordId: string, content: string): Promise<void> {
    await this.getDatabase().execute(
      `INSERT INTO mnemonics (word_id, content, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT(word_id) DO UPDATE SET
         content = excluded.content,
         updated_at = excluded.updated_at`,
      [wordId, content, new Date().toISOString()],
    );
  }

  private getDatabase(): Database {
    if (!this.database) {
      throw new Error("SQLite repository has not been initialized.");
    }
    return this.database;
  }
}

import { isTauri } from "@tauri-apps/api/core";
import type { LearningRepository } from "../../core/repository/LearningRepository";
import { LocalLearningRepository } from "./LocalLearningRepository";
import { SqliteLearningRepository } from "./SqliteLearningRepository";

export function createLearningRepository(): LearningRepository {
  return isTauri()
    ? new SqliteLearningRepository()
    : new LocalLearningRepository();
}

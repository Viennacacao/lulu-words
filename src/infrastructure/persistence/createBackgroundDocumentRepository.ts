import { isTauri } from "@tauri-apps/api/core";
import type { BackgroundDocumentRepository } from "../../core/repository/BackgroundDocumentRepository";
import { LocalBackgroundDocumentRepository } from "./LocalBackgroundDocumentRepository";
import { SqliteBackgroundDocumentRepository } from "./SqliteBackgroundDocumentRepository";

export function createBackgroundDocumentRepository(): BackgroundDocumentRepository {
  return isTauri()
    ? new SqliteBackgroundDocumentRepository()
    : new LocalBackgroundDocumentRepository();
}

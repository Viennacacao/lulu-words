import { invoke } from "@tauri-apps/api/core";

export interface NovelLibraryEntry {
  id: string;
  name: string;
  fingerprint: string;
  size: number;
  importedAt: string;
}

interface StoredNovel {
  entry: NovelLibraryEntry;
  text: string;
}

export function isDesktopApp() {
  return "__TAURI_INTERNALS__" in window;
}

function assertDesktopApp() {
  if (!isDesktopApp()) {
    throw new Error("小说书架持久化需要在桌面 App 中使用");
  }
}

function hashText(value: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createNovelLibraryId(fingerprint: string) {
  return `novel-${hashText(fingerprint, 2166136261)}-${hashText(fingerprint, 2246822519)}`;
}

export class NovelLibraryService {
  async list(): Promise<NovelLibraryEntry[]> {
    assertDesktopApp();
    return invoke<NovelLibraryEntry[]>("list_novels");
  }

  async save(name: string, text: string, fingerprint: string): Promise<NovelLibraryEntry> {
    assertDesktopApp();
    const entry: NovelLibraryEntry = {
      id: createNovelLibraryId(fingerprint),
      name,
      fingerprint,
      size: new TextEncoder().encode(text).byteLength,
      importedAt: new Date().toISOString(),
    };
    return invoke<NovelLibraryEntry>("save_novel", { request: { entry, text } });
  }

  async load(id: string): Promise<StoredNovel> {
    assertDesktopApp();
    return invoke<StoredNovel>("load_novel", { id });
  }

  async delete(id: string): Promise<void> {
    assertDesktopApp();
    await invoke("delete_novel", { id });
  }
}

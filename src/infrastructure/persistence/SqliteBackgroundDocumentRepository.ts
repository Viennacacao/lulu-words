import Database from "@tauri-apps/plugin-sql";
import type {
  BackgroundDocumentRecord,
  BackgroundDocumentRepository,
  StoredBackgroundDocument,
} from "../../core/repository/BackgroundDocumentRepository";
import {
  BACKGROUND_DOCUMENT_LIMITS,
  blocksJsonBytes,
} from "./backgroundDocumentLimits";

interface BackgroundDocumentRow {
  id: string;
  name: string;
  author: string;
  kind: "txt" | "docx";
  blocks_json: string;
  created_at: string;
  updated_at: string;
}

interface CountRow {
  count: number;
}

interface SizeRow {
  total: number;
}

function rowToDocument(row: BackgroundDocumentRow): StoredBackgroundDocument {
  return {
    id: row.id,
    name: row.name,
    author: row.author,
    kind: row.kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    blocks: JSON.parse(row.blocks_json),
  };
}

function recordFromRow(row: BackgroundDocumentRow): BackgroundDocumentRecord {
  const { blocks: _blocks, ...record } = rowToDocument(row);
  return record;
}

export class SqliteBackgroundDocumentRepository implements BackgroundDocumentRepository {
  private database?: Database;

  private async getDatabase(): Promise<Database> {
    if (!this.database) {
      this.database = await Database.load("sqlite:lulu-words.db");
    }
    return this.database;
  }

  async list(): Promise<BackgroundDocumentRecord[]> {
    const rows = await (await this.getDatabase()).select<BackgroundDocumentRow[]>(
      "SELECT id, name, author, kind, blocks_json, created_at, updated_at FROM background_documents ORDER BY updated_at DESC",
    );
    return rows.map(recordFromRow);
  }

  async load(id: string): Promise<StoredBackgroundDocument | undefined> {
    const rows = await (await this.getDatabase()).select<BackgroundDocumentRow[]>(
      "SELECT id, name, author, kind, blocks_json, created_at, updated_at FROM background_documents WHERE id = $1",
      [id],
    );
    const row = rows[0];
    return row ? rowToDocument(row) : undefined;
  }

  async save(document: StoredBackgroundDocument): Promise<void> {
    const database = await this.getDatabase();
    const [countRows, sizeRows] = await Promise.all([
      database.select<CountRow[]>("SELECT COUNT(*) AS count FROM background_documents"),
      database.select<SizeRow[]>(
        "SELECT SUM(LENGTH(blocks_json)) AS total FROM background_documents",
      ),
    ]);
    const count = countRows[0]?.count ?? 0;
    const totalBytes = sizeRows[0]?.total ?? 0;
    const bytes = blocksJsonBytes(document.blocks);
    if (count >= BACKGROUND_DOCUMENT_LIMITS.maxDocuments) {
      throw new Error(`已保存背景文档最多 ${BACKGROUND_DOCUMENT_LIMITS.maxDocuments} 篇，请先删除不需要的文档`);
    }
    if (totalBytes + bytes > BACKGROUND_DOCUMENT_LIMITS.maxTotalBytes) {
      throw new Error("已保存背景文档总容量超过 20MB，请先删除不需要的文档");
    }

    await database.execute(
      `INSERT INTO background_documents (id, name, author, kind, blocks_json, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         author = excluded.author,
         kind = excluded.kind,
         blocks_json = excluded.blocks_json,
         updated_at = excluded.updated_at`,
      [
        document.id,
        document.name,
        document.author,
        document.kind,
        JSON.stringify(document.blocks),
        document.createdAt,
        document.updatedAt,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    await (await this.getDatabase()).execute(
      "DELETE FROM background_documents WHERE id = $1",
      [id],
    );
  }
}

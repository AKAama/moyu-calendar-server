import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class DataStore {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY, type TEXT NOT NULL, visitor_id TEXT,
        payload TEXT NOT NULL DEFAULT '{}', user_agent TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS bingo_scores (
        date TEXT NOT NULL, visitor_id TEXT NOT NULL, display_name TEXT NOT NULL,
        score INTEGER NOT NULL, title TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (date, visitor_id)
      );
    `);
  }

  addEvent(type: string, visitorId: string | null, payload: unknown, userAgent: string | null) {
    this.db.prepare('INSERT INTO events (type, visitor_id, payload, user_agent) VALUES (?, ?, ?, ?)')
      .run(type, visitorId, JSON.stringify(payload ?? {}), userAgent);
  }

  saveBingo(date: string, visitorId: string, displayName: string, score: number, title: string) {
    this.db.prepare(`INSERT INTO bingo_scores (date, visitor_id, display_name, score, title)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(date, visitor_id) DO UPDATE SET
        display_name=excluded.display_name, score=MAX(score, excluded.score),
        title=CASE WHEN excluded.score >= score THEN excluded.title ELSE title END,
        updated_at=CURRENT_TIMESTAMP`).run(date, visitorId, displayName, score, title);
  }

  leaderboard(date: string) {
    return this.db.prepare(`SELECT display_name AS displayName, score, title
      FROM bingo_scores WHERE date=? ORDER BY score DESC, updated_at ASC LIMIT 20`).all(date);
  }

  eventSummary() {
    return this.db.prepare(`SELECT type, COUNT(*) AS count FROM events GROUP BY type ORDER BY count DESC`).all();
  }

  close() { this.db.close(); }
}

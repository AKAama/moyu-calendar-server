import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ContentBlocklistRule } from './content-safety.js';

const PRESET_LUNCH_ITEMS = [
  ['老乡鸡', '系统饭搭子'],
  ['大米先生', '系统饭搭子'],
  ['麦当劳', '系统饭搭子'],
  ['肯德基', '系统饭搭子'],
  ['麻辣烫', '系统饭搭子'],
  ['黄焖鸡', '系统饭搭子'],
  ['兰州拉面', '系统饭搭子'],
  ['沙县小吃', '系统饭搭子'],
  ['便利店饭团', '系统饭搭子'],
] as const;

interface ContentBlocklistSeedEntry {
  pattern: string;
  patternType: 'exact' | 'contains' | 'regex';
  category: string;
}

function loadContentBlocklistSeed(): ContentBlocklistSeedEntry[] {
  const seedUrl = new URL('../data/content-blocklist.seed.json', import.meta.url);
  return JSON.parse(readFileSync(seedUrl, 'utf8')) as ContentBlocklistSeedEntry[];
}

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
      CREATE TABLE IF NOT EXISTS lunch_items (
        id INTEGER PRIMARY KEY,
        item TEXT NOT NULL,
        name TEXT NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('preset', 'user')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS lunch_pick_queue (
        item_id INTEGER PRIMARY KEY,
        queue_order INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(item_id) REFERENCES lunch_items(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS content_blocklist (
        id INTEGER PRIMARY KEY,
        pattern TEXT NOT NULL,
        pattern_type TEXT NOT NULL CHECK(pattern_type IN ('exact', 'contains', 'regex')),
        category TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'preset',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pattern, pattern_type, category)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS lunch_items_preset_item_idx
        ON lunch_items(item) WHERE source = 'preset';
    `);
    this.seedLunchItems();
    this.seedContentBlocklist();
  }

  private seedLunchItems() {
    const insert = this.db.prepare('INSERT OR IGNORE INTO lunch_items (item, name, source) VALUES (?, ?, ?)');
    for (const [item, name] of PRESET_LUNCH_ITEMS) {
      insert.run(item, name, 'preset');
    }
  }

  private seedContentBlocklist() {
    const insert = this.db.prepare(`INSERT OR IGNORE INTO content_blocklist
      (pattern, pattern_type, category, source, enabled) VALUES (?, ?, ?, ?, ?)`);
    for (const entry of loadContentBlocklistSeed()) {
      insert.run(entry.pattern, entry.patternType, entry.category, 'preset', 1);
    }
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

  listLunchItems() {
    return this.db.prepare(`SELECT id, item, name, source, created_at AS createdAt
      FROM lunch_items ORDER BY id ASC`).all();
  }

  addLunchItem(item: string, name: string) {
    const result = this.db.prepare('INSERT INTO lunch_items (item, name, source) VALUES (?, ?, ?)')
      .run(item, name, 'user');
    return this.db.prepare(`SELECT id, item, name, source, created_at AS createdAt
      FROM lunch_items WHERE id=?`).get(result.lastInsertRowid);
  }

  listEnabledContentBlocklistRules() {
    return this.db.prepare(`SELECT id, pattern, pattern_type AS patternType, category
      FROM content_blocklist WHERE enabled=1 ORDER BY id ASC`).all() as unknown as ContentBlocklistRule[];
  }

  addContentBlocklistRule(pattern: string, category: string, source = 'llm') {
    this.db.prepare(`INSERT OR IGNORE INTO content_blocklist
      (pattern, pattern_type, category, source, enabled) VALUES (?, ?, ?, ?, ?)`)
      .run(pattern, 'exact', category, source, 1);
  }

  private refillLunchPickQueue() {
    const ids = this.db.prepare('SELECT id FROM lunch_items ORDER BY id ASC').all() as Array<{ id: number }>;
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    this.db.exec('DELETE FROM lunch_pick_queue');
    const insert = this.db.prepare('INSERT INTO lunch_pick_queue (item_id, queue_order) VALUES (?, ?)');
    shuffled.forEach((entry, index) => insert.run(entry.id, index));
  }

  private nextQueuedLunchItem() {
    return this.db.prepare(`SELECT lunch_items.id, lunch_items.item, lunch_items.name,
        lunch_items.source, lunch_items.created_at AS createdAt
      FROM lunch_pick_queue
      JOIN lunch_items ON lunch_items.id = lunch_pick_queue.item_id
      ORDER BY lunch_pick_queue.queue_order ASC
      LIMIT 1`).get();
  }

  pickLunchItem() {
    let item = this.nextQueuedLunchItem();
    if (!item) {
      this.refillLunchPickQueue();
      item = this.nextQueuedLunchItem();
    }
    if (!item) return null;

    this.db.prepare('DELETE FROM lunch_pick_queue WHERE item_id=?').run((item as { id: number }).id);
    return item;
  }

  eventSummary() {
    return this.db.prepare(`SELECT type, COUNT(*) AS count FROM events GROUP BY type ORDER BY count DESC`).all();
  }

  close() { this.db.close(); }
}

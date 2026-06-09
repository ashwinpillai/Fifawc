import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'wc26.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY,
      match_number INTEGER NOT NULL,
      stage TEXT NOT NULL,
      group_name TEXT,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      kickoff_ist TEXT NOT NULL,
      winner TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      pick TEXT NOT NULL CHECK(pick IN ('home', 'away', 'draw')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, match_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as c FROM matches').get().c;
  if (count === 0) {
    const matches = JSON.parse(
      readFileSync(join(__dirname, '..', 'data', 'matches.json'), 'utf-8')
    );
    const insert = db.prepare(`
      INSERT INTO matches (id, match_number, stage, group_name, home_team, away_team, kickoff_ist)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    db.exec('BEGIN');
    for (const row of matches) {
      insert.run(
        row.id,
        row.matchNumber,
        row.stage,
        row.group,
        row.homeTeam,
        row.awayTeam,
        row.kickoffIST
      );
    }
    db.exec('COMMIT');
  }
}

export default db;

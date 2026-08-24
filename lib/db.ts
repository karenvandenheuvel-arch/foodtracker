import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

declare global {
  var __foodtrackerDb: Database.Database | undefined;
}

function createDb() {
  const databasePath = process.env.DATABASE_PATH || "./data/foodtracker.sqlite";
  const resolved = path.resolve(process.cwd(), databasePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  const db = new Database(resolved);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      weight REAL,
      height REAL,
      age INTEGER,
      gender TEXT NOT NULL DEFAULT 'man'
    );

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      photo TEXT NOT NULL,
      kcal REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      confidence TEXT NOT NULL,
      items_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      name TEXT NOT NULL,
      duration INTEGER NOT NULL,
      kcal INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_exercises_date ON exercises(date);

    CREATE TABLE IF NOT EXISTS daily_steps (
      date TEXT PRIMARY KEY,
      steps INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.prepare(
    `INSERT OR IGNORE INTO profile (id, weight, height, age, gender) VALUES (1, NULL, NULL, NULL, 'man')`
  ).run();

  return db;
}

export function getDb() {
  if (!global.__foodtrackerDb) {
    global.__foodtrackerDb = createDb();
  }
  return global.__foodtrackerDb;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

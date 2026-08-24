import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";

type GlobalWithDb = typeof globalThis & { __foodtrackerDb?: Database.Database };

/**
 * Points lib/db.ts's lazily-created singleton at a fresh temp SQLite file and
 * closes any previously cached connection, so each test starts from a clean
 * database regardless of import/module caching order.
 */
export function useFreshTestDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "foodtracker-test-"));
  const dbPath = path.join(dir, "test.sqlite");

  const g = globalThis as GlobalWithDb;
  g.__foodtrackerDb?.close();
  g.__foodtrackerDb = undefined;
  process.env.DATABASE_PATH = dbPath;

  return dbPath;
}

export function closeTestDb() {
  const g = globalThis as GlobalWithDb;
  g.__foodtrackerDb?.close();
  g.__foodtrackerDb = undefined;
}

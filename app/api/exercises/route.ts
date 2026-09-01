import { NextResponse } from "next/server";
import { getDb, todayIso } from "@/lib/db";
import { normalizeLogDate } from "@/lib/date";
import { EXERCISE_TYPES, exerciseKcal } from "@/lib/nutrition";
import type { ExerciseEntry } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayIso();

  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM exercises WHERE date = ? ORDER BY time DESC, id DESC")
    .all(date) as ExerciseEntry[];
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, duration, weightKg, date: dateInput } = body;

  const type = EXERCISE_TYPES.find((t) => t.name === name);
  const durationNum = Number(duration);
  if (!type || !durationNum || durationNum <= 0) {
    return NextResponse.json({ error: "Ongeldige sportsessie." }, { status: 400 });
  }

  const date = normalizeLogDate(dateInput);
  if (!date) {
    return NextResponse.json({ error: "Ongeldige datum." }, { status: 400 });
  }

  const weight = Number(weightKg) > 0 ? Number(weightKg) : 70;
  const kcal = exerciseKcal(type.met, weight, durationNum);

  const time = new Date().toISOString();

  const db = getDb();
  const result = db
    .prepare(`INSERT INTO exercises (date, time, name, duration, kcal) VALUES (?, ?, ?, ?, ?)`)
    .run(date, time, type.name, durationNum, kcal);

  const row = db.prepare("SELECT * FROM exercises WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}

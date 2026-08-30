import { NextResponse } from "next/server";
import { getDb, todayIso } from "@/lib/db";
import { rowToMeal, type MealRow } from "@/lib/meals";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayIso();

  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM meals WHERE date = ? ORDER BY time DESC, id DESC")
    .all(date) as MealRow[];
  return NextResponse.json(rows.map(rowToMeal));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { note = "", photo, kcal, protein, carbs, fat, confidence, items } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Ongeldige maaltijdgegevens." }, { status: 400 });
  }

  const now = new Date();
  const date = todayIso();
  const time = now.toISOString();
  const photoValue = typeof photo === "string" ? photo : "";

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO meals (date, time, note, photo, kcal, protein, carbs, fat, confidence, items_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(date, time, note, photoValue, kcal, protein, carbs, fat, confidence, JSON.stringify(items));

  const row = db.prepare("SELECT * FROM meals WHERE id = ?").get(result.lastInsertRowid) as MealRow;
  return NextResponse.json(rowToMeal(row), { status: 201 });
}

import { NextResponse } from "next/server";
import { getDb, todayIso } from "@/lib/db";
import type { Meal, MealItem } from "@/lib/types";

function rowToMeal(row: any): Meal {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    note: row.note,
    photo: row.photo,
    kcal: row.kcal,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    confidence: row.confidence,
    items: JSON.parse(row.items_json) as MealItem[],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayIso();

  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM meals WHERE date = ? ORDER BY time DESC, id DESC")
    .all(date);
  return NextResponse.json(rows.map(rowToMeal));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { note = "", photo, kcal, protein, carbs, fat, confidence, items } = body;

  if (!photo || !Array.isArray(items)) {
    return NextResponse.json({ error: "Ongeldige maaltijdgegevens." }, { status: 400 });
  }

  const now = new Date();
  const date = todayIso();
  const time = now.toISOString();

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO meals (date, time, note, photo, kcal, protein, carbs, fat, confidence, items_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(date, time, note, photo, kcal, protein, carbs, fat, confidence, JSON.stringify(items));

  const row = db.prepare("SELECT * FROM meals WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(rowToMeal(row), { status: 201 });
}

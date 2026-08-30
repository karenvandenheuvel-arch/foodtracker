import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { rowToMeal, type MealRow } from "@/lib/meals";

const SCAN_LIMIT = 200;
const RESULT_LIMIT = 16;

function signature(meal: ReturnType<typeof rowToMeal>): string {
  const note = meal.note.trim().toLowerCase();
  if (note) return note;
  return meal.items.map((it) => it.name.trim().toLowerCase()).join("|");
}

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM meals ORDER BY time DESC LIMIT ?")
    .all(SCAN_LIMIT) as MealRow[];

  const seen = new Set<string>();
  const library = [];
  for (const row of rows) {
    const meal = rowToMeal(row);
    const key = signature(meal);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    library.push(meal);
    if (library.length >= RESULT_LIMIT) break;
  }

  return NextResponse.json(library);
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { rowToMeal, type MealRow } from "@/lib/meals";
import type { MealItem } from "@/lib/types";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM meals WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}

function isPlainItem(item: unknown): item is Record<string, unknown> {
  return typeof item === "object" && item !== null;
}

function normalizeItem(raw: Record<string, unknown>): MealItem {
  return {
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Item",
    group: (typeof raw.group === "string" ? raw.group : "Overig") as MealItem["group"],
    kcal: Number(raw.kcal) || 0,
    protein: Number(raw.protein) || 0,
    carbs: Number(raw.carbs) || 0,
    fat: Number(raw.fat) || 0,
    source: raw.source === "database" ? "database" : "schatting",
  };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { note = "", items } = body;

  if (!Array.isArray(items) || items.length === 0 || !items.every(isPlainItem)) {
    return NextResponse.json({ error: "Ongeldige maaltijdgegevens." }, { status: 400 });
  }

  const normalizedItems = items.map(normalizeItem);
  const totals = normalizedItems.reduce(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const db = getDb();
  const result = db
    .prepare(
      `UPDATE meals SET note = ?, kcal = ?, protein = ?, carbs = ?, fat = ?, items_json = ? WHERE id = ?`
    )
    .run(
      typeof note === "string" ? note : "",
      totals.kcal,
      totals.protein,
      totals.carbs,
      totals.fat,
      JSON.stringify(normalizedItems),
      Number(id)
    );

  if (result.changes === 0) {
    return NextResponse.json({ error: "Maaltijd niet gevonden." }, { status: 404 });
  }

  const row = db.prepare("SELECT * FROM meals WHERE id = ?").get(Number(id)) as MealRow;
  return NextResponse.json(rowToMeal(row));
}

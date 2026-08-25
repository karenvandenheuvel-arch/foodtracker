import type { Meal, MealItem } from "@/lib/types";

export type MealRow = Omit<Meal, "items"> & { items_json: string };

export function rowToMeal(row: MealRow): Meal {
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

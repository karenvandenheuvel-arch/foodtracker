import { getDb } from "./db";
import { addDays, todayIso } from "./date";
import { bmr, stepsKcal } from "./nutrition";
import type { DayBalance } from "./types";

type ProfileRow = { weight: number | null; height: number | null; age: number | null; gender: "man" | "vrouw" };

export function getBalanceHistory(days: number): DayBalance[] {
  const db = getDb();

  const profile = db.prepare("SELECT weight, height, age, gender FROM profile WHERE id = 1").get() as
    | ProfileRow
    | undefined;
  const weightForCalc = profile?.weight || 70;
  const restingBurn = profile ? bmr(profile) : null;
  const dailyResting = restingBurn ? Math.round(restingBurn * 1.2) : 0;

  const end = todayIso();
  const start = addDays(end, -(days - 1));

  const mealRows = db
    .prepare("SELECT date, SUM(kcal) as kcal FROM meals WHERE date >= ? AND date <= ? GROUP BY date")
    .all(start, end) as { date: string; kcal: number }[];
  const exerciseRows = db
    .prepare("SELECT date, SUM(kcal) as kcal FROM exercises WHERE date >= ? AND date <= ? GROUP BY date")
    .all(start, end) as { date: string; kcal: number }[];
  const stepRows = db
    .prepare("SELECT date, steps FROM daily_steps WHERE date >= ? AND date <= ?")
    .all(start, end) as { date: string; steps: number }[];

  const intakeByDate = Object.fromEntries(mealRows.map((r) => [r.date, r.kcal]));
  const exerciseByDate = Object.fromEntries(exerciseRows.map((r) => [r.date, r.kcal]));
  const stepsByDate = Object.fromEntries(stepRows.map((r) => [r.date, r.steps]));

  const result: DayBalance[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const intakeKcal = Math.round(intakeByDate[date] || 0);
    const exerciseBurned = exerciseByDate[date] || 0;
    const stepsBurned = stepsByDate[date] ? stepsKcal(stepsByDate[date], weightForCalc) : 0;
    const burnedKcal = dailyResting + exerciseBurned + stepsBurned;
    const hasActivity = intakeKcal > 0 || exerciseBurned > 0 || stepsBurned > 0;
    result.push({ date, intakeKcal, burnedKcal, balance: intakeKcal - burnedKcal, hasActivity });
  }
  return result;
}

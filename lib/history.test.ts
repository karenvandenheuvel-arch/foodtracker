import { beforeEach, describe, expect, it } from "vitest";
import { useFreshTestDb } from "@/test/db-helpers";
import { getDb } from "./db";
import { addDays, todayIso } from "./date";
import { getBalanceHistory } from "./history";

beforeEach(() => {
  useFreshTestDb();
});

describe("getBalanceHistory", () => {
  it("zero-fills days without any logged data", () => {
    const history = getBalanceHistory(3);
    expect(history).toHaveLength(3);
    expect(
      history.every((d) => d.intakeKcal === 0 && d.burnedKcal === 0 && d.balance === 0 && d.hasActivity === false)
    ).toBe(true);
    expect(history[history.length - 1].date).toBe(todayIso());
  });

  it("marks a day with a profile set but no logged activity as hasActivity: false", () => {
    const db = getDb();
    db.prepare("UPDATE profile SET weight = 70, height = 180, age = 30, gender = 'man' WHERE id = 1").run();

    const history = getBalanceHistory(3);
    expect(history.every((d) => d.hasActivity === false)).toBe(true);
    // resting burn is still reflected in burnedKcal even with no activity logged
    expect(history.every((d) => d.burnedKcal === 2016)).toBe(true);
  });

  it("aggregates meals, exercises and steps per day, ordered oldest first", () => {
    const db = getDb();
    const today = todayIso();
    const yesterday = addDays(today, -1);

    db.prepare("UPDATE profile SET weight = 70, height = 180, age = 30, gender = 'man' WHERE id = 1").run();

    db.prepare(
      `INSERT INTO meals (date, time, note, photo, kcal, protein, carbs, fat, confidence, items_json)
       VALUES (?, ?, '', '', ?, 0, 0, 0, 'hoog', '[]')`
    ).run(yesterday, `${yesterday}T08:00:00.000Z`, 500);
    db.prepare(
      `INSERT INTO meals (date, time, note, photo, kcal, protein, carbs, fat, confidence, items_json)
       VALUES (?, ?, '', '', ?, 0, 0, 0, 'hoog', '[]')`
    ).run(today, `${today}T08:00:00.000Z`, 800);

    db.prepare(`INSERT INTO exercises (date, time, name, duration, kcal) VALUES (?, ?, 'Hardlopen', 30, 300)`).run(
      today,
      `${today}T09:00:00.000Z`
    );
    db.prepare(`INSERT INTO daily_steps (date, steps) VALUES (?, 10000)`).run(today);

    const history = getBalanceHistory(2);
    expect(history.map((d) => d.date)).toEqual([yesterday, today]);

    // BMR(70,180,30,man) = 1680 -> resting = 1680 * 1.2 = 2016
    expect(history[0]).toEqual({
      date: yesterday,
      intakeKcal: 500,
      burnedKcal: 2016,
      balance: 500 - 2016,
      hasActivity: true,
    });

    // stepsKcal(10000, 70) = 350; burned = 2016 + 300 (exercise) + 350 (steps) = 2666
    expect(history[1]).toEqual({
      date: today,
      intakeKcal: 800,
      burnedKcal: 2666,
      balance: 800 - 2666,
      hasActivity: true,
    });
  });
});

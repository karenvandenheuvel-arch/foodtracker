import { beforeEach, describe, expect, it } from "vitest";
import { useFreshTestDb } from "@/test/db-helpers";
import { getDb } from "@/lib/db";
import { GET } from "./route";

beforeEach(() => {
  useFreshTestDb();
});

function insertMeal(overrides: Partial<{ date: string; time: string; note: string; photo: string }> = {}) {
  const db = getDb();
  const items = [{ name: "Kiwi", group: "Fruit", kcal: 42, protein: 0.8, carbs: 10, fat: 0.4, source: "schatting" }];
  db.prepare(
    `INSERT INTO meals (date, time, note, photo, kcal, protein, carbs, fat, confidence, items_json)
     VALUES (@date, @time, @note, @photo, 42, 0.8, 10, 0.4, 'gemiddeld', @items_json)`
  ).run({
    date: overrides.date ?? "2024-01-01",
    time: overrides.time ?? "2024-01-01T08:00:00.000Z",
    note: overrides.note ?? "2 kiwi's",
    photo: overrides.photo ?? "",
    items_json: JSON.stringify(items),
  });
}

describe("GET /api/meals/library", () => {
  it("returns an empty list when nothing has been logged yet", async () => {
    const res = await GET();
    expect(await res.json()).toEqual([]);
  });

  it("deduplicates repeated notes, keeping only the most recent occurrence", async () => {
    insertMeal({ date: "2024-01-01", time: "2024-01-01T08:00:00.000Z", note: "2 kiwi's" });
    insertMeal({ date: "2024-01-03", time: "2024-01-03T08:00:00.000Z", note: "2 kiwi's" });
    insertMeal({ date: "2024-01-02", time: "2024-01-02T08:00:00.000Z", note: "Havermout met banaan" });

    const res = await GET();
    const library = await res.json();

    expect(library).toHaveLength(2);
    expect(library[0].note).toBe("2 kiwi's");
    expect(library[0].date).toBe("2024-01-03");
    expect(library[1].note).toBe("Havermout met banaan");
  });

  it("falls back to the item names as a dedup key when there is no note", async () => {
    insertMeal({ date: "2024-01-01", time: "2024-01-01T08:00:00.000Z", note: "" });
    insertMeal({ date: "2024-01-02", time: "2024-01-02T08:00:00.000Z", note: "" });

    const res = await GET();
    const library = await res.json();
    expect(library).toHaveLength(1);
    expect(library[0].date).toBe("2024-01-02");
  });
});

import { describe, expect, it } from "vitest";
import { clampToGroup, normalizeItem } from "./gemini";

describe("clampToGroup", () => {
  it("passes through known food groups", () => {
    expect(clampToGroup("Fruit")).toBe("Fruit");
    expect(clampToGroup("Zuivel")).toBe("Zuivel");
  });

  it("falls back to Overig for unknown values", () => {
    expect(clampToGroup("Snoep")).toBe("Overig");
    expect(clampToGroup("")).toBe("Overig");
  });
});

describe("normalizeItem", () => {
  it("normalizes a well-formed Gemini item", () => {
    expect(
      normalizeItem({
        name: "Appel",
        group: "Fruit",
        kcal: 72.4,
        protein: 0.42,
        carbs: 19.06,
        fat: 0.17,
        source: "database",
      })
    ).toEqual({
      name: "Appel",
      group: "Fruit",
      kcal: 72,
      protein: 0.4,
      carbs: 19.1,
      fat: 0.2,
      source: "database",
    });
  });

  it("fills in sane defaults for missing or malformed fields", () => {
    expect(normalizeItem({})).toEqual({
      name: "Onbekend item",
      group: "Overig",
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      source: "schatting",
    });
  });

  it("clamps negative values to zero", () => {
    const item = normalizeItem({ name: "Test", group: "Fruit", kcal: -10, protein: -1, carbs: -2, fat: -3 });
    expect(item.kcal).toBe(0);
    expect(item.protein).toBe(0);
    expect(item.carbs).toBe(0);
    expect(item.fat).toBe(0);
  });

  it("falls back to Overig for an unrecognized group", () => {
    expect(normalizeItem({ name: "Mystery", group: "Snacks" }).group).toBe("Overig");
  });

  it("only accepts 'database' as a non-schatting source", () => {
    expect(normalizeItem({ source: "database" }).source).toBe("database");
    expect(normalizeItem({ source: "iets anders" }).source).toBe("schatting");
  });

  it("truncates overly long names to 120 characters", () => {
    const longName = "a".repeat(200);
    expect(normalizeItem({ name: longName }).name).toHaveLength(120);
  });
});

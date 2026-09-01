import { describe, expect, it } from "vitest";
import { addDays, isValidDateIso, normalizeLogDate, todayIso } from "./date";

describe("isValidDateIso", () => {
  it("accepts a well-formed ISO date", () => {
    expect(isValidDateIso("2026-01-01")).toBe(true);
  });

  it("rejects malformed or non-string values", () => {
    expect(isValidDateIso("2026-1-1")).toBe(false);
    expect(isValidDateIso("not-a-date")).toBe(false);
    expect(isValidDateIso(undefined)).toBe(false);
    expect(isValidDateIso(20260101)).toBe(false);
  });
});

describe("normalizeLogDate", () => {
  it("defaults to today when no date is given", () => {
    expect(normalizeLogDate(undefined)).toBe(todayIso());
    expect(normalizeLogDate(null)).toBe(todayIso());
  });

  it("accepts today and any date in the past", () => {
    expect(normalizeLogDate(todayIso())).toBe(todayIso());
    expect(normalizeLogDate(addDays(todayIso(), -1))).toBe(addDays(todayIso(), -1));
  });

  it("rejects a date in the future", () => {
    expect(normalizeLogDate(addDays(todayIso(), 1))).toBeNull();
  });

  it("rejects a malformed date", () => {
    expect(normalizeLogDate("not-a-date")).toBeNull();
  });
});

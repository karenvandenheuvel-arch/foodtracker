import { describe, expect, it } from "vitest";
import { bmr, exerciseKcal, stepsKcal } from "./nutrition";

describe("bmr", () => {
  it("returns null when any required field is missing", () => {
    expect(bmr({ weight: null, height: 180, age: 30, gender: "man" })).toBeNull();
    expect(bmr({ weight: 70, height: null, age: 30, gender: "man" })).toBeNull();
    expect(bmr({ weight: 70, height: 180, age: null, gender: "man" })).toBeNull();
  });

  it("applies the Mifflin-St Jeor formula for men (+5)", () => {
    // 10*70 + 6.25*180 - 5*30 + 5 = 700 + 1125 - 150 + 5 = 1680
    expect(bmr({ weight: 70, height: 180, age: 30, gender: "man" })).toBe(1680);
  });

  it("applies the Mifflin-St Jeor formula for women (-161)", () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
    expect(bmr({ weight: 60, height: 165, age: 25, gender: "vrouw" })).toBe(1345);
  });
});

describe("exerciseKcal", () => {
  it("computes kcal burned from MET, weight and duration", () => {
    // 9.8 * 3.5 * 70 / 200 * 30 = 359.8 -> 360
    expect(exerciseKcal(9.8, 70, 30)).toBe(360);
  });

  it("returns 0 for zero duration", () => {
    expect(exerciseKcal(9.8, 70, 0)).toBe(0);
  });
});

describe("stepsKcal", () => {
  it("computes kcal burned from step count and weight", () => {
    // 10000 * 0.0005 * 70 = 350
    expect(stepsKcal(10000, 70)).toBe(350);
  });

  it("returns 0 for zero steps", () => {
    expect(stepsKcal(0, 70)).toBe(0);
  });
});

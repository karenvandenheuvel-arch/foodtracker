import type { Confidence, FoodGroup } from "./nutrition";

export type MealItem = {
  name: string;
  group: FoodGroup;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "database" | "schatting";
};

export type AnalyzeResult = {
  items: MealItem[];
  confidence: Confidence;
  note: string;
};

export type Meal = {
  id: number;
  date: string;
  time: string;
  note: string;
  photo: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: Confidence;
  items: MealItem[];
};

export type ExerciseEntry = {
  id: number;
  date: string;
  time: string;
  name: string;
  duration: number;
  kcal: number;
};

export type ProfileRecord = {
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: "man" | "vrouw";
};

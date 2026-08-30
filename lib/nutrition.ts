export const FOOD_GROUPS = [
  "Zuivel",
  "Eiwitbronnen",
  "Granen",
  "Groenten",
  "Fruit",
  "Overig",
] as const;

export type FoodGroup = (typeof FOOD_GROUPS)[number];

export const GROUP_COLORS: Record<FoodGroup, string> = {
  Zuivel: "#7A8FA6",
  Eiwitbronnen: "#B24A3B",
  Granen: "#C97A2B",
  Groenten: "#4A5D3A",
  Fruit: "#8C6B9E",
  Overig: "#8A887E",
};

export type Confidence = "hoog" | "gemiddeld" | "laag";

export const CONFIDENCE_STYLE: Record<Confidence, { color: string; label: string }> = {
  hoog: { color: "var(--ok)", label: "Hoge betrouwbaarheid" },
  gemiddeld: { color: "var(--warn)", label: "Gemiddelde betrouwbaarheid" },
  laag: { color: "var(--alert)", label: "Lage betrouwbaarheid" },
};

// Eenvoudige MET-tabel — kcal/min = MET * 3.5 * gewicht(kg) / 200
export const EXERCISE_TYPES = [
  { name: "Wandelen (rustig)", met: 3.5 },
  { name: "Wandelen (stevig)", met: 4.5 },
  { name: "Hardlopen", met: 9.8 },
  { name: "Fietsen", met: 7.5 },
  { name: "Zwemmen", met: 6.0 },
  { name: "Krachttraining", met: 5.0 },
  { name: "Cardio / fitness", met: 7.0 },
  { name: "Aerobics", met: 7.3 },
  { name: "Yoga", met: 2.5 },
  { name: "Voetbal", met: 7.0 },
] as const;

export function exerciseKcal(met: number, weightKg: number, minutes: number) {
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes);
}

export function stepsKcal(steps: number, weightKg: number) {
  // ruwe vuistregel: ~0.0005 kcal per stap per kg lichaamsgewicht
  return Math.round(steps * 0.0005 * weightKg);
}

export type Profile = {
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: "man" | "vrouw";
};

export function bmr({ weight, height, age, gender }: Profile) {
  if (!weight || !height || !age) return null;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === "vrouw" ? base - 161 : base + 5);
}

// Algemene richtlijnen (AMDR) voor het aandeel van elke macro in de dagelijkse
// energie-inname, gebruikt als benchmark op het dashboard.
export type MacroKey = "protein" | "carbs" | "fat";

export const MACRO_TARGETS: Record<MacroKey, { min: number; max: number }> = {
  protein: { min: 10, max: 20 },
  carbs: { min: 45, max: 65 },
  fat: { min: 20, max: 35 },
};

export const MACRO_COLORS: Record<MacroKey, string> = {
  protein: "#B24A3B",
  carbs: "#C97A2B",
  fat: "#7A8FA6",
};

export type MacroStatus = "laag" | "binnen bereik" | "hoog";

export function macroStatus(pct: number, target: { min: number; max: number }): MacroStatus {
  if (pct < target.min) return "laag";
  if (pct > target.max) return "hoog";
  return "binnen bereik";
}

import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { FOOD_GROUPS, type FoodGroup } from "./nutrition";
import type { AnalyzeResult, MealItem } from "./types";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY ontbreekt. Voeg deze toe aan .env.local (zie .env.example)."
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    confidence: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["hoog", "gemiddeld", "laag"],
      description:
        "Hoog als je de gerechten zeker herkent, gemiddeld bij een goede schatting, laag als je moet gokken.",
    },
    note: {
      type: SchemaType.STRING,
      description: "Korte Nederlandstalige toelichting op de analyse (1-2 zinnen).",
    },
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: "Naam van het voedingsitem, in het Nederlands." },
          group: { type: SchemaType.STRING, format: "enum", enum: Array.from(FOOD_GROUPS) },
          kcal: { type: SchemaType.NUMBER, description: "Energie in kcal voor deze portie." },
          protein: { type: SchemaType.NUMBER, description: "Eiwitten in gram." },
          carbs: { type: SchemaType.NUMBER, description: "Koolhydraten in gram." },
          fat: { type: SchemaType.NUMBER, description: "Vetten in gram." },
          source: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["database", "schatting"],
            description: "'database' als dit een bekend standaardproduct is, anders 'schatting'.",
          },
        },
        required: ["name", "group", "kcal", "protein", "carbs", "fat", "source"],
      },
    },
  },
  required: ["confidence", "note", "items"],
};

const SYSTEM_PROMPT = `Je bent een Nederlandstalige voedingsanalist die maaltijdfoto's beoordeelt voor een voedingstracker-app.

Taak: bekijk de foto van de maaltijd en, indien gegeven, de beschrijving van de gebruiker. Herken de afzonderlijke voedingsitems en schat per item de voedingswaarden voor de zichtbare portie in.

Richtlijnen:
- Splits de maaltijd op in losse items (bv. "Kipfilet", "Rijst, gekookt", "Gemengde salade") in plaats van één grote schatting, tenzij het echt één samengesteld gerecht is.
- Ken elk item een van deze groepen toe: Zuivel, Eiwitbronnen, Granen, Groenten, Fruit, Overig.
- Gebruik realistische porties op basis van wat je op de foto ziet.
- Als de beschrijving van de gebruiker een specifiek merk of product noemt (bv. "skyr van de Aldi"), gebruik die informatie om nauwkeuriger te schatten en markeer die items als source "database". Items die je puur visueel inschat zijn source "schatting".
- Geef een algehele confidence: "hoog" als je zeker bent van de herkenning, "gemiddeld" bij een redelijke schatting, "laag" als de foto onduidelijk is of je moet gokken.
- Antwoord uitsluitend met geldige JSON volgens het opgegeven schema, geen extra tekst.`;

function clampToGroup(value: string): FoodGroup {
  return (FOOD_GROUPS as readonly string[]).includes(value) ? (value as FoodGroup) : "Overig";
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

type RawGeminiItem = Record<string, unknown>;

function normalizeItem(raw: RawGeminiItem): MealItem {
  return {
    name: String(raw?.name ?? "Onbekend item").slice(0, 120),
    group: clampToGroup(String(raw?.group ?? "Overig")),
    kcal: Math.max(0, Math.round(Number(raw?.kcal) || 0)),
    protein: Math.max(0, round1(Number(raw?.protein) || 0)),
    carbs: Math.max(0, round1(Number(raw?.carbs) || 0)),
    fat: Math.max(0, round1(Number(raw?.fat) || 0)),
    source: raw?.source === "database" ? "database" : "schatting",
  };
}

export async function analyzeMealWithGemini(photoDataUrl: string, note: string): Promise<AnalyzeResult> {
  const match = /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/.exec(photoDataUrl);
  if (!match) {
    throw new Error("Ongeldige foto. Probeer een nieuwe foto te maken of te kiezen.");
  }
  const [, mimeType, base64Data] = match;

  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3,
    },
  });

  const userPrompt = note.trim()
    ? `Beschrijving van de gebruiker bij deze foto: "${note.trim()}"`
    : "De gebruiker gaf geen beschrijving mee. Baseer je analyse volledig op de foto.";

  let text: string;
  try {
    const result = await model.generateContent([
      { text: userPrompt },
      { inlineData: { mimeType, data: base64Data } },
    ]);
    text = result.response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Gemini-aanvraag mislukt: ${message}`);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Gemini gaf geen geldige JSON terug. Probeer het opnieuw.");
  }

  const items = Array.isArray(parsed?.items) && parsed.items.length > 0
    ? (parsed.items as RawGeminiItem[]).map(normalizeItem)
    : [
        {
          name: "Onbekend gerecht",
          group: "Overig" as FoodGroup,
          kcal: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          source: "schatting" as const,
        },
      ];

  const confidence: AnalyzeResult["confidence"] =
    parsed?.confidence === "hoog" || parsed?.confidence === "gemiddeld" || parsed?.confidence === "laag"
      ? parsed.confidence
      : "laag";

  return {
    items,
    confidence,
    note: typeof parsed?.note === "string" && parsed.note ? parsed.note : "Analyse door Gemini.",
  };
}

import { NextResponse } from "next/server";
import { analyzeMealFromDescription, analyzeMealWithGemini } from "@/lib/gemini";

export async function POST(request: Request) {
  let body: { photo?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const { photo, note = "" } = body;

  try {
    if (photo && typeof photo === "string") {
      const result = await analyzeMealWithGemini(photo, note);
      return NextResponse.json(result);
    }
    if (note && typeof note === "string" && note.trim()) {
      const result = await analyzeMealFromDescription(note);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Geef een foto of beschrijving op." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout bij analyseren.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

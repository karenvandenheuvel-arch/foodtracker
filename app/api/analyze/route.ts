import { NextResponse } from "next/server";
import { analyzeMealWithGemini } from "@/lib/gemini";

export async function POST(request: Request) {
  let body: { photo?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const { photo, note = "" } = body;
  if (!photo || typeof photo !== "string") {
    return NextResponse.json({ error: "Geen foto meegegeven." }, { status: 400 });
  }

  try {
    const result = await analyzeMealWithGemini(photo, note);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout bij analyseren.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

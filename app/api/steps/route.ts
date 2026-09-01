import { NextResponse } from "next/server";
import { getDb, todayIso } from "@/lib/db";
import { normalizeLogDate } from "@/lib/date";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayIso();

  const db = getDb();
  const row = db.prepare("SELECT steps FROM daily_steps WHERE date = ?").get(date) as
    | { steps: number }
    | undefined;
  return NextResponse.json({ date, steps: row?.steps ?? 0 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const steps = Math.max(0, Math.round(Number(body.steps) || 0));
  const date = normalizeLogDate(body.date);
  if (!date) {
    return NextResponse.json({ error: "Ongeldige datum." }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO daily_steps (date, steps) VALUES (?, ?)
     ON CONFLICT(date) DO UPDATE SET steps = excluded.steps`
  ).run(date, steps);

  return NextResponse.json({ date, steps });
}

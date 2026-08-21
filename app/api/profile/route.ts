import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { ProfileRecord } from "@/lib/types";

export async function GET() {
  const db = getDb();
  const row = db.prepare("SELECT weight, height, age, gender FROM profile WHERE id = 1").get() as ProfileRecord;
  return NextResponse.json(row);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const weight = body.weight === "" || body.weight == null ? null : Number(body.weight);
  const height = body.height === "" || body.height == null ? null : Number(body.height);
  const age = body.age === "" || body.age == null ? null : Number(body.age);
  const gender = body.gender === "vrouw" ? "vrouw" : "man";

  const db = getDb();
  db.prepare(
    `UPDATE profile SET weight = ?, height = ?, age = ?, gender = ? WHERE id = 1`
  ).run(weight, height, age, gender);

  const row = db.prepare("SELECT weight, height, age, gender FROM profile WHERE id = 1").get();
  return NextResponse.json(row);
}

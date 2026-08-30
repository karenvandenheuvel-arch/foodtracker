import { NextResponse } from "next/server";
import { getBalanceHistory } from "@/lib/history";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get("days"));
  const days = Math.min(60, Math.max(1, Number.isFinite(requested) && requested > 0 ? requested : 14));
  return NextResponse.json(getBalanceHistory(days));
}

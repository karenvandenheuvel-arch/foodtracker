export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateIso: string, delta: number) {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function formatDateLabel(dateIso: string) {
  const today = todayIso();
  if (dateIso === today) return "Vandaag";
  if (dateIso === addDays(today, -1)) return "Gisteren";
  const d = new Date(`${dateIso}T00:00:00Z`);
  return d.toLocaleDateString("nl-BE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function isValidDateIso(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// Resolves a client-supplied `date` field for logging endpoints: missing
// defaults to today, anything malformed or in the future is rejected (null).
export function normalizeLogDate(value: unknown): string | null {
  if (value === undefined || value === null) return todayIso();
  if (!isValidDateIso(value)) return null;
  return value <= todayIso() ? value : null;
}

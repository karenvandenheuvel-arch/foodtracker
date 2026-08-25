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

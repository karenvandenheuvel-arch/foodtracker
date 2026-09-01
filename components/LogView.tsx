"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Plus, Minus, Check, X, Info, Trash2, Pencil, PenLine, UtensilsCrossed, Repeat } from "lucide-react";
import { styles } from "./styles";
import { CONFIDENCE_STYLE } from "@/lib/nutrition";
import EditMealForm from "./EditMealForm";
import type { AnalyzeResult, Meal, MealItem } from "@/lib/types";

export type NewMealInput = {
  note: string;
  photo: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: AnalyzeResult["confidence"];
  items: MealItem[];
};

type Props = {
  mealLog: Meal[];
  intakeKcal: number;
  isToday: boolean;
  dateLabel: string;
  onAddMeal: (meal: NewMealInput) => Promise<void>;
  onRemoveMeal: (id: number) => Promise<void>;
  onUpdateMeal: (id: number, patch: { note: string; items: MealItem[] }) => Promise<void>;
  libraryMeals: Meal[];
  onQuickAddMeal: (meal: Meal) => Promise<void>;
};

type Totals = { kcal: number; protein: number; carbs: number; fat: number };

// A quick-added library item gets a new id once the library list is refetched
// (the just-created row supersedes the older one with the same note in the
// dedup), so "in-flight" / "just logged" state is tracked by this signature
// instead of by id, matching the server's own dedup key in the library route.
function mealKey(meal: Meal): string {
  const note = meal.note.trim().toLowerCase();
  if (note) return note;
  return meal.items.map((it) => it.name.trim().toLowerCase()).join("|");
}

function scale(totals: Totals, multiplier: number): Totals {
  return {
    kcal: Math.round(totals.kcal * multiplier),
    protein: Math.round(totals.protein * multiplier * 10) / 10,
    carbs: Math.round(totals.carbs * multiplier * 10) / 10,
    fat: Math.round(totals.fat * multiplier * 10) / 10,
  };
}

export default function LogView({
  mealLog,
  intakeKcal,
  isToday,
  dateLabel,
  onAddMeal,
  onRemoveMeal,
  onUpdateMeal,
  libraryMeals,
  onQuickAddMeal,
}: Props) {
  const [mode, setMode] = useState<"photo" | "text">("photo");
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "analyzing" | "result">("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [quickAddingKey, setQuickAddingKey] = useState<string | null>(null);
  const [justAddedKey, setJustAddedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (mode === "photo" && !photo) return;
    if (mode === "text" && !note.trim()) return;
    setStatus("analyzing");
    setAnalyzeError(null);
    setPortionMultiplier(1);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "photo" ? { photo, note } : { note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analyse mislukt.");
      setResult(data as AnalyzeResult);
      setStatus("result");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analyse mislukt.");
      setStatus("idle");
    }
  };

  const totals: Totals | null = result
    ? result.items.reduce(
        (acc, it) => ({
          kcal: acc.kcal + it.kcal,
          protein: acc.protein + it.protein,
          carbs: acc.carbs + it.carbs,
          fat: acc.fat + it.fat,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      )
    : null;

  const scaled = totals ? scale(totals, portionMultiplier) : null;

  const resetForm = () => {
    setPhoto(null);
    setNote("");
    setStatus("idle");
    setResult(null);
    setPortionMultiplier(1);
    setAnalyzeError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmLog = async () => {
    if (!result || !scaled) return;
    setSaving(true);
    const scaledItems = result.items.map((it) => ({
      ...it,
      kcal: Math.round(it.kcal * portionMultiplier),
      protein: Math.round(it.protein * portionMultiplier * 10) / 10,
      carbs: Math.round(it.carbs * portionMultiplier * 10) / 10,
      fat: Math.round(it.fat * portionMultiplier * 10) / 10,
    }));
    try {
      await onAddMeal({ note, photo: photo ?? "", ...scaled, items: scaledItems, confidence: result.confidence });
      resetForm();
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  };

  const quickAdd = async (meal: Meal) => {
    const key = mealKey(meal);
    setQuickAddingKey(key);
    try {
      await onQuickAddMeal(meal);
      setJustAddedKey(key);
      setTimeout(() => setJustAddedKey((k) => (k === key ? null : k)), 1800);
    } catch {
      // errors surface via the normal history/dashboard refresh; nothing extra to show here
    } finally {
      setQuickAddingKey(null);
    }
  };

  return (
    <>
      {mealLog.length > 0 && (
        <div style={styles.dayStrip}>
          <span style={styles.dayStripLabel}>{isToday ? "Ingenomen vandaag" : `Ingenomen — ${dateLabel}`}</span>
          <span style={styles.dayStripValue}>{intakeKcal} kcal</span>
          <span style={styles.dayStripCount}>
            {mealLog.length} {mealLog.length === 1 ? "maaltijd" : "maaltijden"}
          </span>
        </div>
      )}

      {!isToday && (
        <div style={styles.card}>
          <p style={styles.hint}>
            <Info size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Je logt voor{" "}
            {dateLabel.toLowerCase()}, niet voor vandaag.
          </p>
        </div>
      )}

      {status !== "result" && libraryMeals.length > 0 && (
        <div style={{ ...styles.card, marginBottom: 16 }}>
          <div style={styles.labelTitle}>EERDER GELOGD</div>
          <div style={styles.labelSub}>tik om {isToday ? "vandaag" : dateLabel.toLowerCase()} opnieuw te loggen</div>
          <div style={styles.libraryStrip}>
            {libraryMeals.map((m) => (
              <button
                key={m.id}
                type="button"
                style={{ ...styles.libraryChip, opacity: quickAddingKey === mealKey(m) ? 0.5 : 1 }}
                onClick={() => quickAdd(m)}
                disabled={quickAddingKey !== null}
              >
                {m.photo ? (
                  <img src={m.photo} alt="" style={styles.libraryChipThumb} />
                ) : (
                  <div style={{ ...styles.noPhotoThumb, borderRadius: "50%", width: 60, height: 60 }}>
                    {quickAddingKey === mealKey(m) ? (
                      <Loader2 size={18} style={{ animation: "spin 0.9s linear infinite" }} />
                    ) : justAddedKey === mealKey(m) ? (
                      <Check size={20} color="var(--ok)" />
                    ) : (
                      <UtensilsCrossed size={20} />
                    )}
                  </div>
                )}
                <span style={styles.libraryChipLabel}>{m.note || m.items[0]?.name || "Item"}</span>
                <span style={styles.libraryChipKcal}>{justAddedKey === mealKey(m) ? "Gelogd!" : `${m.kcal} kcal`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {status !== "result" && (
        <div style={styles.card}>
          <div style={styles.modeToggle}>
            <button
              type="button"
              style={{ ...styles.modeToggleBtn, ...(mode === "photo" ? styles.modeToggleBtnActive : {}) }}
              onClick={() => setMode("photo")}
            >
              <Camera size={14} /> Foto
            </button>
            <button
              type="button"
              style={{ ...styles.modeToggleBtn, ...(mode === "text" ? styles.modeToggleBtnActive : {}) }}
              onClick={() => setMode("text")}
            >
              <PenLine size={14} /> Beschrijving
            </button>
          </div>

          {mode === "photo" ? (
            <>
              <div
                style={{ ...styles.photoDrop, backgroundImage: photo ? `url(${photo})` : "none" }}
                onClick={() => fileInputRef.current?.click()}
              >
                {!photo && (
                  <div style={styles.photoDropInner}>
                    <Camera size={28} strokeWidth={1.5} color="var(--ink-soft)" />
                    <span style={styles.photoDropText}>Tik om een foto te nemen of te kiezen</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
              </div>

              <label style={styles.label}>Wat zie je op de foto? (optioneel, maar helpt enorm)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="bv. het witte is skyr van de Aldi, met havermout en een banaan"
                style={styles.textarea}
                rows={2}
              />
            </>
          ) : (
            <>
              <label style={styles.label}>Wat heb je gegeten?</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="bv. 2 kiwi's"
                style={styles.textarea}
                rows={3}
              />
            </>
          )}

          <button
            style={{
              ...styles.primaryBtn,
              opacity: (mode === "photo" ? photo : note.trim()) && status !== "analyzing" ? 1 : 0.5,
              cursor: (mode === "photo" ? photo : note.trim()) && status !== "analyzing" ? "pointer" : "not-allowed",
            }}
            disabled={(mode === "photo" ? !photo : !note.trim()) || status === "analyzing"}
            onClick={handleAnalyze}
          >
            {status === "analyzing" ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 0.9s linear infinite" }} /> Analyseren...
              </>
            ) : (
              "Analyseer maaltijd"
            )}
          </button>

          <p style={styles.hint}>
            <Info size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            {mode === "photo"
              ? "Analyse via Gemini (foto + notitie). Voeg een duidelijke beschrijving toe voor een nauwkeurigere schatting."
              : "Analyse via Gemini op basis van je beschrijving. Vermeld hoeveelheden voor een nauwkeurigere schatting."}
          </p>

          {analyzeError && <p style={styles.errorBox}>{analyzeError}</p>}
        </div>
      )}

      {status === "result" && result && scaled && (
        <div style={styles.card}>
          <div style={styles.thumbRow}>
            {photo ? (
              <img src={photo} alt="maaltijd" style={styles.thumb} />
            ) : (
              <div style={styles.noPhotoThumb}>
                <UtensilsCrossed size={22} />
              </div>
            )}
            <div>
              <div style={{ ...styles.confidenceDot, background: CONFIDENCE_STYLE[result.confidence].color }} />
              <span style={styles.confidenceLabel}>{CONFIDENCE_STYLE[result.confidence].label}</span>
              <p style={styles.resultNote}>{result.note}</p>
            </div>
          </div>

          <div style={styles.labelPanel}>
            <div style={styles.labelTitle}>VOEDINGSWAARDEN</div>
            <div style={styles.labelSub}>per portie ({Math.round(portionMultiplier * 100)}%)</div>
            <div style={styles.thickRule} />
            <div style={styles.kcalRow}>
              <span style={styles.kcalLabel}>Energie</span>
              <span style={styles.kcalValue}>{scaled.kcal} kcal</span>
            </div>
            <div style={styles.thickRule} />
            {(
              [
                ["Eiwitten", scaled.protein],
                ["Koolhydraten", scaled.carbs],
                ["Vetten", scaled.fat],
              ] as const
            ).map(([label, val]) => (
              <div key={label} style={styles.macroRow}>
                <span>{label}</span>
                <span style={styles.macroValue}>{val} g</span>
              </div>
            ))}
            <div style={styles.thinRule} />
            <div>
              {result.items.map((it, i) => (
                <div key={i} style={styles.itemRow}>
                  <span style={styles.itemName}>
                    {it.name}
                    <span style={styles.itemSource}> · {it.group}</span>
                  </span>
                  <span style={styles.itemKcal}>{it.kcal} kcal</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.portionRow}>
            <span style={styles.portionLabel}>Portiegrootte bijstellen</span>
            <div style={styles.portionControls}>
              <button
                style={styles.stepBtn}
                onClick={() => setPortionMultiplier((p) => Math.max(0.25, Math.round((p - 0.25) * 100) / 100))}
              >
                <Minus size={14} />
              </button>
              <span style={styles.portionValue}>{Math.round(portionMultiplier * 100)}%</span>
              <button style={styles.stepBtn} onClick={() => setPortionMultiplier((p) => Math.round((p + 0.25) * 100) / 100)}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          {analyzeError && <p style={styles.errorBox}>{analyzeError}</p>}

          <div style={styles.actionRow}>
            <button style={styles.secondaryBtn} onClick={resetForm}>
              <X size={15} /> Opnieuw
            </button>
            <button style={{ ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={confirmLog} disabled={saving}>
              {saving ? <Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} /> : <Check size={15} />}{" "}
              {isToday ? "Loggen" : `Loggen voor ${dateLabel.toLowerCase()}`}
            </button>
          </div>
        </div>
      )}

      {mealLog.length > 0 && status !== "result" && (
        <div style={styles.historySection}>
          <div style={styles.historyHeader}>Gelogde maaltijden</div>
          {mealLog.map((m) =>
            editingId === m.id ? (
              <EditMealForm
                key={m.id}
                meal={m}
                onCancel={() => setEditingId(null)}
                onSave={async (patch) => {
                  await onUpdateMeal(m.id, patch);
                  setEditingId(null);
                }}
              />
            ) : (
              <div key={m.id} style={styles.historyRow}>
                {m.photo ? (
                  <img src={m.photo} alt="" style={styles.historyThumb} />
                ) : (
                  <div style={styles.noPhotoThumbSmall}>
                    <UtensilsCrossed size={16} />
                  </div>
                )}
                <div style={styles.historyMeta}>
                  <div style={styles.historyNote}>{m.note || "Geen notitie"}</div>
                  <div style={styles.historyTime}>
                    {new Date(m.time).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div style={styles.historyKcal}>{m.kcal} kcal</div>
                <button
                  style={styles.iconBtn}
                  onClick={() => quickAdd(m)}
                  disabled={quickAddingKey !== null}
                  aria-label={`Opnieuw loggen voor ${isToday ? "vandaag" : dateLabel.toLowerCase()}`}
                  title={`Opnieuw loggen voor ${isToday ? "vandaag" : dateLabel.toLowerCase()}`}
                >
                  {quickAddingKey === mealKey(m) ? (
                    <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} />
                  ) : justAddedKey === mealKey(m) ? (
                    <Check size={13} color="var(--ok)" />
                  ) : (
                    <Repeat size={13} />
                  )}
                </button>
                <button style={styles.iconBtn} onClick={() => setEditingId(m.id)} aria-label="Maaltijd bewerken">
                  <Pencil size={13} />
                </button>
                <button style={styles.iconBtn} onClick={() => onRemoveMeal(m.id)} aria-label="Maaltijd verwijderen">
                  <Trash2 size={13} />
                </button>
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}

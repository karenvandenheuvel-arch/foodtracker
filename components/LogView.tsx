"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Plus, Minus, Check, X, Info, Trash2, Pencil } from "lucide-react";
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
};

type Totals = { kcal: number; protein: number; carbs: number; fat: number };

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
}: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "analyzing" | "result">("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!photo) return;
    setStatus("analyzing");
    setAnalyzeError(null);
    setPortionMultiplier(1);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo, note }),
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
    if (!result || !scaled || !photo) return;
    setSaving(true);
    const scaledItems = result.items.map((it) => ({
      ...it,
      kcal: Math.round(it.kcal * portionMultiplier),
      protein: Math.round(it.protein * portionMultiplier * 10) / 10,
      carbs: Math.round(it.carbs * portionMultiplier * 10) / 10,
      fat: Math.round(it.fat * portionMultiplier * 10) / 10,
    }));
    try {
      await onAddMeal({ note, photo, ...scaled, items: scaledItems, confidence: result.confidence });
      resetForm();
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setSaving(false);
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
            <Info size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Je bekijkt {dateLabel.toLowerCase()}.
            Nieuwe maaltijden loggen kan alleen voor vandaag.
          </p>
        </div>
      )}

      {isToday && status !== "result" && (
        <div style={styles.card}>
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
              capture="environment"
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

          <button
            style={{
              ...styles.primaryBtn,
              opacity: photo && status !== "analyzing" ? 1 : 0.5,
              cursor: photo && status !== "analyzing" ? "pointer" : "not-allowed",
            }}
            disabled={!photo || status === "analyzing"}
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
            <Info size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} /> Analyse via Gemini (foto + notitie).
            Voeg een duidelijke beschrijving toe voor een nauwkeurigere schatting.
          </p>

          {analyzeError && <p style={styles.errorBox}>{analyzeError}</p>}
        </div>
      )}

      {status === "result" && result && scaled && (
        <div style={styles.card}>
          <div style={styles.thumbRow}>
            <img src={photo!} alt="maaltijd" style={styles.thumb} />
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
              {saving ? <Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} /> : <Check size={15} />} Loggen
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
                <img src={m.photo} alt="" style={styles.historyThumb} />
                <div style={styles.historyMeta}>
                  <div style={styles.historyNote}>{m.note || "Geen notitie"}</div>
                  <div style={styles.historyTime}>
                    {new Date(m.time).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div style={styles.historyKcal}>{m.kcal} kcal</div>
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

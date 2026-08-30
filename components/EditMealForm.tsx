"use client";

import { useState } from "react";
import { Check, Minus, Plus, Trash2, X } from "lucide-react";
import { styles } from "./styles";
import { FOOD_GROUPS } from "@/lib/nutrition";
import type { Meal, MealItem } from "@/lib/types";

type Props = {
  meal: Meal;
  onCancel: () => void;
  onSave: (patch: { note: string; items: MealItem[] }) => Promise<void>;
};

function emptyItem(): MealItem {
  return { name: "", group: "Overig", kcal: 0, protein: 0, carbs: 0, fat: 0, source: "schatting" };
}

export default function EditMealForm({ meal, onCancel, onSave }: Props) {
  const [note, setNote] = useState(meal.note);
  const [items, setItems] = useState<MealItem[]>(meal.items.map((it) => ({ ...it })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateItem = (index: number, patch: Partial<MealItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const scaleItem = (index: number, factor: number) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              kcal: Math.round(it.kcal * factor),
              protein: Math.round(it.protein * factor * 10) / 10,
              carbs: Math.round(it.carbs * factor * 10) / 10,
              fat: Math.round(it.fat * factor * 10) / 10,
            }
          : it
      )
    );
  };

  const totalKcal = items.reduce((s, it) => s + (Number(it.kcal) || 0), 0);

  const save = async () => {
    if (items.length === 0) {
      setError("Voeg minstens één item toe.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ note, items });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bijwerken mislukt.");
      setSaving(false);
    }
  };

  return (
    <div style={styles.editMealCard}>
      <label style={styles.label}>Notitie</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} style={styles.textarea} rows={2} />

      {items.map((it, i) => (
        <div key={i} style={styles.editItemBlock}>
          <div style={styles.editItemHeader}>
            <input
              value={it.name}
              onChange={(e) => updateItem(i, { name: e.target.value })}
              style={{ ...styles.input, flex: 1 }}
              placeholder="Naam"
            />
            <button style={styles.iconBtn} onClick={() => removeItem(i)} aria-label="Item verwijderen" type="button">
              <Trash2 size={13} />
            </button>
          </div>
          <div style={styles.editItemGrid}>
            <select
              value={it.group}
              onChange={(e) => updateItem(i, { group: e.target.value as MealItem["group"] })}
              style={{ ...styles.input, ...styles.editItemNum }}
            >
              {FOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={it.kcal}
              onChange={(e) => updateItem(i, { kcal: Number(e.target.value) })}
              style={{ ...styles.input, ...styles.editItemNum }}
              placeholder="kcal"
            />
            <input
              type="number"
              value={it.protein}
              onChange={(e) => updateItem(i, { protein: Number(e.target.value) })}
              style={{ ...styles.input, ...styles.editItemNum }}
              placeholder="eiwit g"
            />
            <input
              type="number"
              value={it.carbs}
              onChange={(e) => updateItem(i, { carbs: Number(e.target.value) })}
              style={{ ...styles.input, ...styles.editItemNum }}
              placeholder="koolh. g"
            />
            <input
              type="number"
              value={it.fat}
              onChange={(e) => updateItem(i, { fat: Number(e.target.value) })}
              style={{ ...styles.input, ...styles.editItemNum }}
              placeholder="vet g"
            />
          </div>
          <div style={styles.editItemQuantityRow}>
            <span style={styles.editItemQuantityLabel}>Hoeveelheid aanpassen (schaalt kcal &amp; macro&apos;s mee)</span>
            <button
              style={styles.quantityStepBtn}
              onClick={() => scaleItem(i, 0.8)}
              type="button"
              aria-label="Minder van dit item"
              title="20% minder"
            >
              <Minus size={12} />
            </button>
            <button
              style={styles.quantityStepBtn}
              onClick={() => scaleItem(i, 1.25)}
              type="button"
              aria-label="Meer van dit item"
              title="25% meer"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      ))}

      <button style={styles.secondaryBtn} onClick={addItem} type="button">
        <Plus size={14} /> Item toevoegen
      </button>

      <div style={styles.editMealTotal}>
        Totaal: <span style={styles.mono}>{Math.round(totalKcal)} kcal</span>
      </div>

      {error && <p style={styles.errorBox}>{error}</p>}

      <div style={styles.actionRow}>
        <button style={styles.secondaryBtn} onClick={onCancel} type="button">
          <X size={15} /> Annuleren
        </button>
        <button style={{ ...styles.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving} type="button">
          {saving ? "Opslaan..." : (
            <>
              <Check size={15} /> Opslaan
            </>
          )}
        </button>
      </div>
    </div>
  );
}

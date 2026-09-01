"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Flame, Footprints, Loader2, Plus, Trash2 } from "lucide-react";
import { styles } from "./styles";
import { EXERCISE_TYPES, stepsKcal } from "@/lib/nutrition";
import type { ExerciseEntry } from "@/lib/types";

type ProfileInput = {
  weight: string;
  height: string;
  age: string;
  gender: "man" | "vrouw";
};

type Props = {
  profile: ProfileInput;
  onProfileChange: (patch: Partial<ProfileInput>) => void;
  profileComplete: boolean;
  restingBurn: number | null;
  weightForCalc: number;
  isToday: boolean;
  dateLabel: string;
  steps: string;
  onStepsChange: (steps: string) => void;
  onLogSteps: () => Promise<void>;
  exerciseLog: ExerciseEntry[];
  onAddExercise: (name: string, duration: number) => Promise<void>;
  onRemoveExercise: (id: number) => Promise<void>;
};

export default function ProfileView({
  profile,
  onProfileChange,
  profileComplete,
  restingBurn,
  weightForCalc,
  isToday,
  dateLabel,
  steps,
  onStepsChange,
  onLogSteps,
  exerciseLog,
  onAddExercise,
  onRemoveExercise,
}: Props) {
  const [exerciseType, setExerciseType] = useState<string>(EXERCISE_TYPES[0].name);
  const [exerciseDuration, setExerciseDuration] = useState("");
  const [adding, setAdding] = useState(false);
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [loggingSteps, setLoggingSteps] = useState(false);
  const [stepsLogged, setStepsLogged] = useState(false);

  const addExercise = async () => {
    const duration = Number(exerciseDuration);
    if (!exerciseDuration || duration <= 0) return;
    setAdding(true);
    try {
      await onAddExercise(exerciseType, duration);
      setExerciseDuration("");
    } finally {
      setAdding(false);
    }
  };

  const logSteps = async () => {
    setLoggingSteps(true);
    setStepsLogged(false);
    try {
      await onLogSteps();
      setStepsLogged(true);
    } finally {
      setLoggingSteps(false);
    }
  };

  return (
    <div style={styles.card}>
      <button
        type="button"
        onClick={() => setPersonalInfoOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div>
          <div style={styles.labelTitle}>PROFIEL</div>
          <div style={styles.labelSub}>
            {personalInfoOpen
              ? "voor een nauwkeurige verbruiksberekening (Mifflin-St Jeor)"
              : profileComplete
              ? `${profile.weight} kg · ${profile.height} cm · ${profile.age} jaar · ${profile.gender === "vrouw" ? "vrouw" : "man"}`
              : "nog niet ingevuld — tik om in te vullen"}
          </div>
        </div>
        {personalInfoOpen ? <ChevronUp size={18} color="var(--ink-soft)" /> : <ChevronDown size={18} color="var(--ink-soft)" />}
      </button>

      {personalInfoOpen && (
        <>
          <div style={styles.thickRule} />

          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Gewicht (kg)</label>
              <input
                type="number"
                value={profile.weight}
                onChange={(e) => onProfileChange({ weight: e.target.value })}
                style={styles.input}
                placeholder="70"
              />
            </div>
            <div>
              <label style={styles.label}>Lengte (cm)</label>
              <input
                type="number"
                value={profile.height}
                onChange={(e) => onProfileChange({ height: e.target.value })}
                style={styles.input}
                placeholder="175"
              />
            </div>
            <div>
              <label style={styles.label}>Leeftijd</label>
              <input
                type="number"
                value={profile.age}
                onChange={(e) => onProfileChange({ age: e.target.value })}
                style={styles.input}
                placeholder="30"
              />
            </div>
            <div>
              <label style={styles.label}>Geslacht</label>
              <select
                value={profile.gender}
                onChange={(e) => onProfileChange({ gender: e.target.value as "man" | "vrouw" })}
                style={styles.input}
              >
                <option value="man">Man</option>
                <option value="vrouw">Vrouw</option>
              </select>
            </div>
          </div>

          {profileComplete && (
            <div style={styles.bmrBox}>
              <Flame size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
              Geschat rustverbruik: <strong style={styles.mono}>{restingBurn} kcal/dag</strong> (excl. sport en stappen)
            </div>
          )}
        </>
      )}

      <div style={styles.thinRule} />

      <div style={styles.labelTitle}>STAPPEN {isToday ? "VANDAAG" : dateLabel.toUpperCase()}</div>
      <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
        <Footprints size={18} color="var(--ink-soft)" />
        <input
          type="number"
          value={steps}
          onChange={(e) => {
            onStepsChange(e.target.value);
            setStepsLogged(false);
          }}
          style={{ ...styles.input, flex: 1 }}
          placeholder="bv. 8500"
        />
        <span style={styles.mono}>{steps ? stepsKcal(Number(steps), weightForCalc) : 0} kcal</span>
      </div>
      <button
        style={{ ...styles.primaryBtn, marginTop: 10, opacity: loggingSteps ? 0.6 : 1 }}
        onClick={logSteps}
        disabled={loggingSteps}
      >
        {loggingSteps ? (
          <Loader2 size={15} style={{ animation: "spin 0.9s linear infinite" }} />
        ) : stepsLogged ? (
          <Check size={15} />
        ) : (
          <Footprints size={15} />
        )}
        {stepsLogged ? "Opgeslagen" : isToday ? "Stappen loggen" : `Stappen loggen voor ${dateLabel.toLowerCase()}`}
      </button>

      <div style={styles.thinRule} />

      <div style={styles.labelTitle}>{isToday ? "SPORTSESSIE TOEVOEGEN" : `SPORTSESSIE TOEVOEGEN — ${dateLabel.toUpperCase()}`}</div>
      <div style={styles.formGrid}>
        <div>
          <label style={styles.label}>Type</label>
          <select value={exerciseType} onChange={(e) => setExerciseType(e.target.value)} style={styles.input}>
            {EXERCISE_TYPES.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={styles.label}>Duur (min)</label>
          <input
            type="number"
            value={exerciseDuration}
            onChange={(e) => setExerciseDuration(e.target.value)}
            style={styles.input}
            placeholder="30"
          />
        </div>
      </div>
      <button style={{ ...styles.primaryBtn, marginTop: 10, opacity: adding ? 0.6 : 1 }} onClick={addExercise} disabled={adding}>
        <Plus size={15} /> {isToday ? "Sessie loggen" : `Sessie loggen voor ${dateLabel.toLowerCase()}`}
      </button>

      {exerciseLog.length > 0 && (
        <div style={styles.historySection}>
          <div style={styles.historyHeader}>{isToday ? "Vandaag gesport" : `Gesport — ${dateLabel}`}</div>
          {exerciseLog.map((e) => (
            <div key={e.id} style={styles.historyRow}>
              <div style={styles.historyMeta}>
                <div style={styles.historyNote}>
                  {e.name} · {e.duration} min
                </div>
                <div style={styles.historyTime}>
                  {new Date(e.time).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div style={styles.historyKcal}>-{e.kcal} kcal</div>
              <button style={styles.iconBtn} onClick={() => onRemoveExercise(e.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

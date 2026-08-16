"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User, LayoutDashboard, ListChecks } from "lucide-react";
import { styles } from "@/components/styles";
import LogView, { type NewMealInput } from "@/components/LogView";
import DashboardView from "@/components/DashboardView";
import ProfileView from "@/components/ProfileView";
import { bmr, stepsKcal } from "@/lib/nutrition";
import type { ExerciseEntry, Meal } from "@/lib/types";

type View = "log" | "dashboard" | "profiel";

type ProfileInput = { weight: string; height: string; age: string; gender: "man" | "vrouw" };

const EMPTY_PROFILE: ProfileInput = { weight: "", height: "", age: "", gender: "man" };

export default function VoedingsTracker() {
  const [view, setView] = useState<View>("log");
  const [loaded, setLoaded] = useState(false);

  const [profile, setProfile] = useState<ProfileInput>(EMPTY_PROFILE);
  const [steps, setSteps] = useState("");
  const [mealLog, setMealLog] = useState<Meal[]>([]);
  const [exerciseLog, setExerciseLog] = useState<ExerciseEntry[]>([]);

  const profileSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- initial load ----
  useEffect(() => {
    (async () => {
      const [profileRes, mealsRes, exercisesRes, stepsRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/meals"),
        fetch("/api/exercises"),
        fetch("/api/steps"),
      ]);
      const [profileData, mealsData, exercisesData, stepsData] = await Promise.all([
        profileRes.json(),
        mealsRes.json(),
        exercisesRes.json(),
        stepsRes.json(),
      ]);
      setProfile({
        weight: profileData.weight != null ? String(profileData.weight) : "",
        height: profileData.height != null ? String(profileData.height) : "",
        age: profileData.age != null ? String(profileData.age) : "",
        gender: profileData.gender === "vrouw" ? "vrouw" : "man",
      });
      setMealLog(mealsData);
      setExerciseLog(exercisesData);
      setSteps(stepsData.steps ? String(stepsData.steps) : "");
      setLoaded(true);
    })();
  }, []);

  const profileComplete = Boolean(profile.weight && profile.height && profile.age);
  const weightForCalc = Number(profile.weight) || 70;

  // ---- profile persistence (debounced) ----
  const handleProfileChange = useCallback((patch: Partial<ProfileInput>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current);
      profileSaveTimer.current = setTimeout(() => {
        fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
      }, 400);
      return next;
    });
  }, []);

  const handleStepsChange = useCallback((value: string) => {
    setSteps(value);
    if (stepsSaveTimer.current) clearTimeout(stepsSaveTimer.current);
    stepsSaveTimer.current = setTimeout(() => {
      fetch("/api/steps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: Number(value) || 0 }),
      });
    }, 400);
  }, []);

  // ---- meals ----
  const addMeal = useCallback(async (meal: NewMealInput) => {
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meal),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Opslaan van maaltijd mislukt.");
    setMealLog((prev) => [data as Meal, ...prev]);
  }, []);

  const removeMeal = useCallback(async (id: number) => {
    setMealLog((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/meals/${id}`, { method: "DELETE" });
  }, []);

  // ---- exercises ----
  const addExercise = useCallback(
    async (name: string, duration: number) => {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, duration, weightKg: weightForCalc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan van sportsessie mislukt.");
      setExerciseLog((prev) => [data as ExerciseEntry, ...prev]);
    },
    [weightForCalc]
  );

  const removeExercise = useCallback(async (id: number) => {
    setExerciseLog((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/exercises/${id}`, { method: "DELETE" });
  }, []);

  // ---- derived dashboard cijfers ----
  const intakeKcal = mealLog.reduce((s, m) => s + m.kcal, 0);
  const exerciseBurned = exerciseLog.reduce((s, e) => s + e.kcal, 0);
  const stepsBurned = steps ? stepsKcal(Number(steps), weightForCalc) : 0;
  const restingBurn = useMemo(() => {
    const b = bmr({
      weight: Number(profile.weight) || null,
      height: Number(profile.height) || null,
      age: Number(profile.age) || null,
      gender: profile.gender,
    });
    return b ? Math.round(b * 1.2) : null;
  }, [profile]);
  const totalBurned = (restingBurn || 0) + exerciseBurned + stepsBurned;
  const balance = intakeKcal - totalBurned;

  const macroTotals = mealLog.reduce(
    (acc, m) => ({ protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
    { protein: 0, carbs: 0, fat: 0 }
  );
  const macroKcal = macroTotals.protein * 4 + macroTotals.carbs * 4 + macroTotals.fat * 9;

  const groupTotals = useMemo(() => {
    const map: Record<string, number> = {};
    mealLog.forEach((m) => m.items.forEach((it) => { map[it.group] = (map[it.group] || 0) + it.kcal; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [mealLog]);
  const groupMax = Math.max(1, ...groupTotals.map(([, v]) => v));

  if (!loaded) {
    return (
      <div style={styles.app}>
        <div style={styles.shell}>
          <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.eyebrow}>VOEDINGSTRACKER</div>
          <h1 style={styles.h1}>Voedingslabel</h1>
          <p style={styles.sub}>Foto, activiteit en balans op één plek.</p>
        </header>

        <nav style={styles.tabs}>
          {(
            [
              { id: "log" as const, label: "Loggen", icon: ListChecks },
              { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
              { id: "profiel" as const, label: "Profiel", icon: User },
            ]
          ).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)} style={{ ...styles.tab, ...(view === id ? styles.tabActive : {}) }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </nav>

        {view === "log" && (
          <LogView mealLog={mealLog} intakeKcal={intakeKcal} onAddMeal={addMeal} onRemoveMeal={removeMeal} />
        )}

        {view === "dashboard" && (
          <DashboardView
            profileComplete={profileComplete}
            weightForCalc={weightForCalc}
            intakeKcal={intakeKcal}
            totalBurned={totalBurned}
            balance={balance}
            restingBurn={restingBurn}
            steps={Number(steps) || 0}
            stepsBurned={stepsBurned}
            exerciseCount={exerciseLog.length}
            exerciseBurned={exerciseBurned}
            macroTotals={macroTotals}
            macroKcal={macroKcal}
            groupTotals={groupTotals}
            groupMax={groupMax}
          />
        )}

        {view === "profiel" && (
          <ProfileView
            profile={profile}
            onProfileChange={handleProfileChange}
            profileComplete={profileComplete}
            restingBurn={restingBurn}
            weightForCalc={weightForCalc}
            steps={steps}
            onStepsChange={handleStepsChange}
            exerciseLog={exerciseLog}
            onAddExercise={addExercise}
            onRemoveExercise={removeExercise}
          />
        )}
      </div>
    </div>
  );
}

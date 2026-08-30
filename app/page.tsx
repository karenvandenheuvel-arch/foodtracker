"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User, LayoutDashboard, ListChecks } from "lucide-react";
import { styles } from "@/components/styles";
import LogView, { type NewMealInput } from "@/components/LogView";
import DashboardView from "@/components/DashboardView";
import ProfileView from "@/components/ProfileView";
import DateNav from "@/components/DateNav";
import { bmr, stepsKcal } from "@/lib/nutrition";
import { formatDateLabel, todayIso } from "@/lib/date";
import type { DayBalance, ExerciseEntry, Meal, MealItem } from "@/lib/types";

type View = "log" | "dashboard" | "profiel";

type ProfileInput = { weight: string; height: string; age: string; gender: "man" | "vrouw" };

const EMPTY_PROFILE: ProfileInput = { weight: "", height: "", age: "", gender: "man" };

export default function VoedingsTracker() {
  const [view, setView] = useState<View>("log");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [dayLoaded, setDayLoaded] = useState(false);
  const loaded = profileLoaded && dayLoaded;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => todayIso());

  const [profile, setProfile] = useState<ProfileInput>(EMPTY_PROFILE);
  const [steps, setSteps] = useState("");
  const [mealLog, setMealLog] = useState<Meal[]>([]);
  const [exerciseLog, setExerciseLog] = useState<ExerciseEntry[]>([]);
  const [libraryMeals, setLibraryMeals] = useState<Meal[]>([]);
  const [history, setHistory] = useState<DayBalance[]>([]);

  const profileSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isToday = selectedDate === todayIso();
  const dateLabel = useMemo(() => formatDateLabel(selectedDate), [selectedDate]);

  // ---- profile (loaded once, independent of the selected day) ----
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);

    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error(`Server gaf status ${res.status} terug.`);
        const profileData = await res.json();
        if (cancelled) return;
        setProfile({
          weight: profileData.weight != null ? String(profileData.weight) : "",
          height: profileData.height != null ? String(profileData.height) : "",
          age: profileData.age != null ? String(profileData.age) : "",
          gender: profileData.gender === "vrouw" ? "vrouw" : "man",
        });
        setProfileLoaded(true);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Gegevens laden is mislukt.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  // ---- meals/exercises/steps for the selected day ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const qs = `?date=${selectedDate}`;
        const [mealsRes, exercisesRes, stepsRes] = await Promise.all([
          fetch(`/api/meals${qs}`),
          fetch(`/api/exercises${qs}`),
          fetch(`/api/steps${qs}`),
        ]);
        for (const res of [mealsRes, exercisesRes, stepsRes]) {
          if (!res.ok) throw new Error(`Server gaf status ${res.status} terug.`);
        }
        const [mealsData, exercisesData, stepsData] = await Promise.all([
          mealsRes.json(),
          exercisesRes.json(),
          stepsRes.json(),
        ]);
        if (cancelled) return;
        setMealLog(mealsData);
        setExerciseLog(exercisesData);
        setSteps(stepsData.steps ? String(stepsData.steps) : "");
        setDayLoaded(true);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Gegevens laden is mislukt.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, loadAttempt]);

  // ---- library of previously logged meals (for quick re-logging) ----
  const refreshLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/meals/library");
      if (!res.ok) return;
      const data = await res.json();
      setLibraryMeals(data);
    } catch {
      // library is a convenience feature; ignore failures silently
    }
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  // ---- balance history (for the dashboard evolution chart) ----
  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history?days=14");
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data);
    } catch {
      // history chart is a convenience feature; ignore failures silently
    }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const profileComplete = Boolean(profile.weight && profile.height && profile.age);
  const weightForCalc = Number(profile.weight) || 70;

  // ---- profile persistence (debounced) ----
  const handleProfileChange = useCallback(
    (patch: Partial<ProfileInput>) => {
      setProfile((prev) => {
        const next = { ...prev, ...patch };
        if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current);
        profileSaveTimer.current = setTimeout(() => {
          fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          }).then(() => refreshHistory());
        }, 400);
        return next;
      });
    },
    [refreshHistory]
  );

  const handleStepsChange = useCallback(
    (value: string) => {
      if (!isToday) return;
      setSteps(value);
    },
    [isToday]
  );

  const logSteps = useCallback(async () => {
    if (!isToday) return;
    const res = await fetch("/api/steps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps: Number(steps) || 0 }),
    });
    if (!res.ok) throw new Error("Opslaan van stappen mislukt.");
    refreshHistory();
  }, [isToday, steps, refreshHistory]);

  // ---- meals ----
  // Note: the backend always logs against today's date, regardless of which
  // date is currently being viewed (quick re-logging an older meal targets
  // "today", not the viewed date) — so only merge the result into the visible
  // list when today's log is what's on screen.
  const addMeal = useCallback(
    async (meal: NewMealInput) => {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meal),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan van maaltijd mislukt.");
      if (isToday) {
        setMealLog((prev) => [data as Meal, ...prev]);
      }
      refreshLibrary();
      refreshHistory();
    },
    [isToday, refreshLibrary, refreshHistory]
  );

  const quickAddMeal = useCallback(
    async (meal: Meal) => {
      await addMeal({
        note: meal.note,
        photo: meal.photo,
        kcal: meal.kcal,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        confidence: meal.confidence,
        items: meal.items,
      });
    },
    [addMeal]
  );

  const removeMeal = useCallback(
    async (id: number) => {
      setMealLog((prev) => prev.filter((m) => m.id !== id));
      await fetch(`/api/meals/${id}`, { method: "DELETE" });
      refreshHistory();
    },
    [refreshHistory]
  );

  const updateMeal = useCallback(
    async (id: number, patch: { note: string; items: MealItem[] }) => {
      const res = await fetch(`/api/meals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bijwerken van maaltijd mislukt.");
      setMealLog((prev) => prev.map((m) => (m.id === id ? (data as Meal) : m)));
      refreshHistory();
    },
    [refreshHistory]
  );

  // ---- exercises ----
  const addExercise = useCallback(
    async (name: string, duration: number) => {
      if (!isToday) return;
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, duration, weightKg: weightForCalc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan van sportsessie mislukt.");
      setExerciseLog((prev) => [data as ExerciseEntry, ...prev]);
      refreshHistory();
    },
    [weightForCalc, isToday, refreshHistory]
  );

  const removeExercise = useCallback(
    async (id: number) => {
      setExerciseLog((prev) => prev.filter((e) => e.id !== id));
      await fetch(`/api/exercises/${id}`, { method: "DELETE" });
      refreshHistory();
    },
    [refreshHistory]
  );

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
          {loadError ? (
            <div style={styles.card}>
              <p style={styles.errorBox}>{loadError}</p>
              <button
                style={styles.primaryBtn}
                onClick={() => {
                  setLoadError(null);
                  setLoadAttempt((n) => n + 1);
                }}
              >
                Opnieuw proberen
              </button>
            </div>
          ) : (
            <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Laden...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <h1 style={styles.h1}>Foodtracker</h1>
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

        <DateNav date={selectedDate} onChange={setSelectedDate} />

        {view === "log" && (
          <LogView
            mealLog={mealLog}
            intakeKcal={intakeKcal}
            isToday={isToday}
            dateLabel={dateLabel}
            onAddMeal={addMeal}
            onRemoveMeal={removeMeal}
            onUpdateMeal={updateMeal}
            libraryMeals={libraryMeals}
            onQuickAddMeal={quickAddMeal}
          />
        )}

        {view === "dashboard" && (
          <DashboardView
            profileComplete={profileComplete}
            weightForCalc={weightForCalc}
            isToday={isToday}
            dateLabel={dateLabel}
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
            history={history}
          />
        )}

        {view === "profiel" && (
          <ProfileView
            profile={profile}
            onProfileChange={handleProfileChange}
            profileComplete={profileComplete}
            restingBurn={restingBurn}
            weightForCalc={weightForCalc}
            isToday={isToday}
            dateLabel={dateLabel}
            steps={steps}
            onStepsChange={handleStepsChange}
            onLogSteps={logSteps}
            exerciseLog={exerciseLog}
            onAddExercise={addExercise}
            onRemoveExercise={removeExercise}
          />
        )}
      </div>
    </div>
  );
}

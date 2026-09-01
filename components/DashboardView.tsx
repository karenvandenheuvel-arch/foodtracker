"use client";

import { useState } from "react";
import { Info, Footprints, Dumbbell } from "lucide-react";
import { styles } from "./styles";
import { GROUP_COLORS, MACRO_COLORS, MACRO_TARGETS, macroStatus, type FoodGroup, type MacroKey } from "@/lib/nutrition";
import BalanceHistoryChart from "./BalanceHistoryChart";
import BreakdownModal, { type BreakdownRow } from "./BreakdownModal";
import type { DayBalance, Meal } from "@/lib/types";

type Props = {
  mealLog: Meal[];
  profileComplete: boolean;
  weightForCalc: number;
  isToday: boolean;
  dateLabel: string;
  intakeKcal: number;
  totalBurned: number;
  balance: number;
  restingBurn: number | null;
  steps: number;
  stepsBurned: number;
  exerciseCount: number;
  exerciseBurned: number;
  macroTotals: { protein: number; carbs: number; fat: number };
  macroKcal: number;
  groupTotals: [string, number][];
  groupMax: number;
  history: DayBalance[];
};

const MACRO_LABELS: Record<MacroKey, string> = {
  protein: "Eiwit",
  carbs: "Koolhydraten",
  fat: "Vet",
};

function macroBreakdown(mealLog: Meal[], macro: MacroKey): BreakdownRow[] {
  const rows: BreakdownRow[] = [];
  mealLog.forEach((m) => {
    m.items.forEach((it) => {
      const value = Math.round(it[macro] * 10) / 10;
      if (value <= 0) return;
      rows.push({ label: it.name, sublabel: m.note || undefined, value });
    });
  });
  return rows.sort((a, b) => b.value - a.value);
}

function groupBreakdown(mealLog: Meal[], group: FoodGroup): BreakdownRow[] {
  const rows: BreakdownRow[] = [];
  mealLog.forEach((m) => {
    m.items.forEach((it) => {
      if (it.group !== group) return;
      rows.push({ label: it.name, sublabel: m.note || undefined, value: it.kcal });
    });
  });
  return rows.sort((a, b) => b.value - a.value);
}

export default function DashboardView({
  mealLog,
  profileComplete,
  weightForCalc,
  isToday,
  dateLabel,
  intakeKcal,
  totalBurned,
  balance,
  restingBurn,
  steps,
  stepsBurned,
  exerciseCount,
  exerciseBurned,
  macroTotals,
  macroKcal,
  groupTotals,
  groupMax,
  history,
}: Props) {
  const [openMacro, setOpenMacro] = useState<MacroKey | null>(null);
  const [openGroup, setOpenGroup] = useState<FoodGroup | null>(null);
  const macroPct: Record<MacroKey, number> | null =
    macroKcal > 0
      ? {
          protein: Math.round(((macroTotals.protein * 4) / macroKcal) * 100),
          carbs: Math.round(((macroTotals.carbs * 4) / macroKcal) * 100),
          fat: Math.round(((macroTotals.fat * 9) / macroKcal) * 100),
        }
      : null;
  return (
    <div style={styles.card}>
      {!profileComplete && (
        <div style={styles.warnBox}>
          <Info size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
          Vul je profiel (gewicht, lengte, leeftijd) in voor een nauwkeurige verbruiksberekening. Nu gebruikt als
          schatting: {weightForCalc} kg.
        </div>
      )}

      <div style={styles.labelTitle}>ENERGIEBALANS</div>
      <div style={styles.labelSub}>
        inname versus verbruik {isToday ? "vandaag" : `— ${dateLabel.toLowerCase()}`}
      </div>
      <div style={styles.thickRule} />

      <div style={styles.balanceGrid}>
        <div>
          <div style={styles.balanceLabel}>Ingenomen</div>
          <div style={styles.balanceValue}>{intakeKcal}</div>
        </div>
        <div>
          <div style={styles.balanceLabel}>Verbruikt</div>
          <div style={styles.balanceValue}>{totalBurned}</div>
        </div>
        <div>
          <div style={styles.balanceLabel}>{balance >= 0 ? "Overschot" : "Tekort"}</div>
          <div style={{ ...styles.balanceValue, color: balance >= 0 ? "var(--warn)" : "var(--ok)" }}>
            {balance >= 0 ? "+" : ""}
            {balance}
          </div>
        </div>
      </div>

      <div style={styles.burnBreakdown}>
        <div style={styles.burnRow}>
          <span>Rustverbruik (BMR × 1.2)</span>
          <span style={styles.mono}>{restingBurn ?? "—"} kcal</span>
        </div>
        <div style={styles.burnRow}>
          <span>
            <Footprints size={13} style={{ verticalAlign: "-2px" }} /> Stappen ({steps || 0})
          </span>
          <span style={styles.mono}>{stepsBurned} kcal</span>
        </div>
        <div style={styles.burnRow}>
          <span>
            <Dumbbell size={13} style={{ verticalAlign: "-2px" }} /> Sport ({exerciseCount})
          </span>
          <span style={styles.mono}>{exerciseBurned} kcal</span>
        </div>
      </div>

      <div style={styles.thinRule} />
      <div style={styles.labelTitle}>EVOLUTIE</div>
      <div style={styles.labelSub}>energiebalans van de afgelopen {history.length} dagen</div>
      <BalanceHistoryChart data={history} />

      <div style={styles.thinRule} />
      <div style={styles.labelTitle}>MACRO&apos;S</div>
      <div style={styles.labelSub}>
        {macroPct ? "vergeleken met de aanbevolen verdeling" : "nog geen data"}
      </div>
      {macroPct && (
        <div style={{ marginTop: 8 }}>
          {(Object.keys(MACRO_TARGETS) as MacroKey[]).map((key) => {
            const pct = macroPct[key];
            const target = MACRO_TARGETS[key];
            const status = macroStatus(pct, target);
            const statusColor = status === "binnen bereik" ? "var(--ok)" : "var(--warn)";
            return (
              <button
                key={key}
                type="button"
                onClick={() => setOpenMacro(key)}
                style={{
                  ...styles.macroBenchRow,
                  display: "block",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={styles.macroBenchHeader}>
                  <span>{MACRO_LABELS[key]}</span>
                  <span style={{ ...styles.macroBenchStatus, color: statusColor }}>
                    {pct}% · {status}
                  </span>
                </div>
                <div style={styles.macroBenchTrack}>
                  <div
                    style={{
                      ...styles.macroBenchTarget,
                      left: `${target.min}%`,
                      width: `${target.max - target.min}%`,
                    }}
                  />
                  <div
                    style={{
                      ...styles.macroBenchFill,
                      width: `${Math.min(100, pct)}%`,
                      background: MACRO_COLORS[key],
                    }}
                  />
                </div>
                <div style={styles.macroBenchCaption}>
                  aanbevolen {target.min}–{target.max}%
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div style={styles.thinRule} />
      <div style={styles.labelTitle}>VOEDINGSGROEPEN</div>
      <div style={styles.labelSub}>kcal per groep {isToday ? "vandaag" : `— ${dateLabel.toLowerCase()}`}</div>
      <div style={{ marginTop: 8 }}>
        {groupTotals.length === 0 && <div style={styles.emptyText}>Nog geen maaltijden gelogd.</div>}
        {groupTotals.map(([group, kcal]) => (
          <button
            key={group}
            type="button"
            onClick={() => setOpenGroup(group as FoodGroup)}
            style={{
              ...styles.groupRow,
              display: "block",
              width: "100%",
              background: "transparent",
              border: "none",
              padding: 0,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={styles.groupLabelRow}>
              <span style={styles.groupDot}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: GROUP_COLORS[group as FoodGroup] || "#8A887E",
                  }}
                />{" "}
                {group}
              </span>
              <span style={styles.mono}>{kcal} kcal</span>
            </div>
            <div style={styles.groupBarTrack}>
              <div style={{ width: `${(kcal / groupMax) * 100}%`, background: GROUP_COLORS[group as FoodGroup] || "#8A887E" }} />
            </div>
          </button>
        ))}
      </div>

      {openMacro && (
        <BreakdownModal
          title={MACRO_LABELS[openMacro].toUpperCase()}
          subtitle={`waar kwam ${MACRO_LABELS[openMacro].toLowerCase()} vandaan${
            isToday ? " vandaag" : ` — ${dateLabel.toLowerCase()}`
          }`}
          unit="g"
          rows={macroBreakdown(mealLog, openMacro)}
          onClose={() => setOpenMacro(null)}
        />
      )}

      {openGroup && (
        <BreakdownModal
          title={openGroup.toUpperCase()}
          subtitle={`kcal per item${isToday ? " vandaag" : ` — ${dateLabel.toLowerCase()}`}`}
          unit="kcal"
          rows={groupBreakdown(mealLog, openGroup)}
          onClose={() => setOpenGroup(null)}
        />
      )}
    </div>
  );
}

"use client";

import { Info, Footprints, Dumbbell } from "lucide-react";
import { styles } from "./styles";
import { GROUP_COLORS, type FoodGroup } from "@/lib/nutrition";

type Props = {
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
};

export default function DashboardView({
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
}: Props) {
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
      <div style={styles.labelTitle}>MACRO&apos;S</div>
      <div style={styles.labelSub}>
        {macroKcal > 0
          ? `${Math.round(((macroTotals.protein * 4) / macroKcal) * 100)}% eiwit · ${Math.round(
              ((macroTotals.carbs * 4) / macroKcal) * 100
            )}% koolhydraten · ${Math.round(((macroTotals.fat * 9) / macroKcal) * 100)}% vet`
          : "nog geen data"}
      </div>
      <div style={styles.macroBarTrack}>
        {macroKcal > 0 && (
          <>
            <div style={{ width: `${((macroTotals.protein * 4) / macroKcal) * 100}%`, background: "#B24A3B" }} />
            <div style={{ width: `${((macroTotals.carbs * 4) / macroKcal) * 100}%`, background: "#C97A2B" }} />
            <div style={{ width: `${((macroTotals.fat * 9) / macroKcal) * 100}%`, background: "#7A8FA6" }} />
          </>
        )}
      </div>

      <div style={styles.thinRule} />
      <div style={styles.labelTitle}>VOEDINGSGROEPEN</div>
      <div style={styles.labelSub}>kcal per groep, vandaag</div>
      <div style={{ marginTop: 8 }}>
        {groupTotals.length === 0 && <div style={styles.emptyText}>Nog geen maaltijden gelogd.</div>}
        {groupTotals.map(([group, kcal]) => (
          <div key={group} style={styles.groupRow}>
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
          </div>
        ))}
      </div>
    </div>
  );
}

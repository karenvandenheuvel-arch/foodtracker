"use client";

import { useState } from "react";
import { styles } from "./styles";
import type { DayBalance } from "@/lib/types";

type Props = { data: DayBalance[] };

const WIDTH_PER_DAY = 24;
const HEIGHT = 110;
const TOP_MARGIN = 14;
const BOTTOM_MARGIN = 16;
const PLOT_HEIGHT = HEIGHT - TOP_MARGIN - BOTTOM_MARGIN;
const ZERO_Y = TOP_MARGIN + PLOT_HEIGHT / 2;

function dayInitial(dateIso: string) {
  return new Date(`${dateIso}T00:00:00Z`).toLocaleDateString("nl-BE", { weekday: "narrow", timeZone: "UTC" });
}

function formatShortDate(dateIso: string) {
  return new Date(`${dateIso}T00:00:00Z`).toLocaleDateString("nl-BE", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default function BalanceHistoryChart({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const hasAnyData = data.some((d) => d.hasActivity);
  const maxAbs = Math.max(200, ...data.map((d) => Math.abs(d.balance)));
  const width = data.length * WIDTH_PER_DAY;

  const shownIndex = activeIndex ?? data.length - 1;
  const shown = data[shownIndex];

  return (
    <div>
      <div style={styles.historyInfoRow}>
        <span style={styles.historyInfoDate}>
          {shownIndex === data.length - 1 ? "Vandaag" : formatShortDate(shown.date)}
        </span>
        <span style={{ ...styles.historyInfoValue, color: shown.balance >= 0 ? "var(--warn)" : "var(--ok)" }}>
          {shown.balance >= 0 ? "+" : ""}
          {shown.balance} kcal
        </span>
      </div>

      {!hasAnyData ? (
        <div style={styles.emptyText}>Nog geen historiek — log een paar dagen om je evolutie te zien.</div>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label="Energiebalans van de afgelopen dagen"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <line x1={0} y1={ZERO_Y} x2={width} y2={ZERO_Y} stroke="var(--rule-thin)" strokeWidth={1} />
          {data.map((d, i) => {
            const barHeight = Math.min(PLOT_HEIGHT / 2, (Math.abs(d.balance) / maxAbs) * (PLOT_HEIGHT / 2));
            const x = i * WIDTH_PER_DAY;
            const barWidth = WIDTH_PER_DAY - 6;
            const y = d.balance >= 0 ? ZERO_Y - barHeight : ZERO_Y;
            const color = d.balance >= 0 ? "var(--warn)" : "var(--ok)";
            const isActive = i === shownIndex;
            return (
              <g
                key={d.date}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => setActiveIndex(i)}
                style={{ cursor: "pointer" }}
              >
                <rect x={x} y={0} width={WIDTH_PER_DAY} height={HEIGHT} fill="transparent" />
                <rect
                  x={x + 3}
                  y={y}
                  width={barWidth}
                  height={Math.max(1.5, barHeight)}
                  rx={2}
                  fill={color}
                  opacity={isActive ? 1 : 0.55}
                />
                <text
                  x={x + WIDTH_PER_DAY / 2}
                  y={HEIGHT - 3}
                  textAnchor="middle"
                  fontSize={8.5}
                  fill={isActive ? "var(--ink)" : "var(--ink-soft)"}
                  fontWeight={isActive ? 700 : 400}
                >
                  {dayInitial(d.date)}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      <div style={styles.historyLegend}>
        <span style={styles.historyLegendItem}>
          <span style={{ ...styles.historyLegendDot, background: "var(--ok)" }} /> Tekort (verbruik &gt; inname)
        </span>
        <span style={styles.historyLegendItem}>
          <span style={{ ...styles.historyLegendDot, background: "var(--warn)" }} /> Overschot (inname &gt; verbruik)
        </span>
      </div>
    </div>
  );
}

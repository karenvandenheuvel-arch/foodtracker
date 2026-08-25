"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { styles } from "./styles";
import { addDays, formatDateLabel, todayIso } from "@/lib/date";

type Props = {
  date: string;
  onChange: (date: string) => void;
};

export default function DateNav({ date, onChange }: Props) {
  const isToday = date === todayIso();

  return (
    <div style={styles.dateNav}>
      <button style={styles.dateNavBtn} onClick={() => onChange(addDays(date, -1))} aria-label="Vorige dag">
        <ChevronLeft size={16} />
      </button>

      <label style={styles.dateNavLabel}>
        <CalendarDays size={13} style={{ marginRight: 6, verticalAlign: "-2px" }} />
        {formatDateLabel(date)}
        <input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          style={styles.dateNavInput}
          aria-label="Kies een datum"
        />
      </label>

      <button
        style={{ ...styles.dateNavBtn, opacity: isToday ? 0.3 : 1, cursor: isToday ? "default" : "pointer" }}
        onClick={() => !isToday && onChange(addDays(date, 1))}
        disabled={isToday}
        aria-label="Volgende dag"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

"use client";

import { X } from "lucide-react";
import { styles } from "./styles";

export type BreakdownRow = {
  label: string;
  sublabel?: string;
  value: number;
};

type Props = {
  title: string;
  subtitle: string;
  unit: string;
  rows: BreakdownRow[];
  onClose: () => void;
};

export default function BreakdownModal({ title, subtitle, unit, rows, onClose }: Props) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.labelTitle}>{title}</div>
            <div style={styles.labelSub}>{subtitle}</div>
          </div>
          <button type="button" style={styles.iconBtn} onClick={onClose} aria-label="Sluiten">
            <X size={18} />
          </button>
        </div>
        <div style={styles.thickRule} />

        {rows.length === 0 ? (
          <div style={styles.emptyText}>Geen bijdragende items gevonden.</div>
        ) : (
          rows.map((row, i) => (
            <div key={i} style={styles.modalRow}>
              <div style={styles.modalRowLabelRow}>
                <span style={styles.modalRowLabel}>
                  {row.label}
                  {row.sublabel && <span style={styles.modalRowSub}> · {row.sublabel}</span>}
                </span>
                <span style={styles.mono}>
                  {row.value} {unit}
                </span>
              </div>
              <div style={styles.modalRowBarTrack}>
                <div style={{ ...styles.modalRowBarFill, width: `${(row.value / max) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

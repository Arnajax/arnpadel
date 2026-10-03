"use client";

// Kleine invoerbouwstenen voor de toernooitool: kant (links/rechts/allebei) en tijd per half uur.

export type Side = "L" | "R" | "B";

const SIDE_LABEL: Record<Side, string> = { L: "Links", R: "Rechts", B: "Allebei" };

/** Drie knoppen: welke kant speel je? Verplicht, want het schema zet nooit twee linksspelers samen. */
export function SideSelect({ value, onChange, label = "Ik speel" }: { value: Side | null; onChange: (s: Side) => void; label?: string }) {
  return (
    <div className="tn-field">
      <span className="tn-legend">{label}</span>
      <div className="tn-seg tn-seg--3" role="radiogroup" aria-label={label}>
        {(["L", "R", "B"] as Side[]).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={value === s} onClick={() => onChange(s)}>
            {SIDE_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

export const sideShort = (s: string | undefined) => (s === "L" ? "L" : s === "R" ? "R" : "L/R");
export const sideWord = (s: string | undefined) => (s === "L" ? "links" : s === "R" ? "rechts" : "links en rechts");

/** Alle hele en halve uren van 6:00 tot 23:30. Banen boek je per half uur. */
const HALF_HOURS = Array.from({ length: 36 }, (_, i) => {
  const min = 6 * 60 + i * 30;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
});

const pretty = (hhmm: string) => `${Number(hhmm.slice(0, 2))}:${hhmm.slice(3)}`;

export function TimeSelect({
  id,
  label,
  value,
  onChange,
  after,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  after?: string; // alleen tijden ná deze tijd (voor "Tot")
}) {
  const options = after ? HALF_HOURS.filter((h) => h > after) : HALF_HOURS.slice(0, -1);
  const list = options.includes(value) || !value ? options : [value, ...options];
  return (
    <div className="tn-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="tn-input tn-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {list.map((h) => (
          <option key={h} value={h}>
            {pretty(h)}
          </option>
        ))}
      </select>
    </div>
  );
}

"use client";

import { useState } from "react";

import { roundSplits } from "../../_lib/toernooi/core.js";

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Indeling van de speeltijd: kies uit wat precies past (2 uur: 2 x 60, 3 x 40, 4 x 30 ...) of
 * "Anders..." met eigen aantal rondes en minuten.
 */
export default function RoundSplit({
  id,
  start,
  end,
  rounds,
  minutes,
  onChange,
}: {
  id: string;
  start: string;
  end: string;
  rounds: number;
  minutes: number;
  onChange: (rounds: number, minutes: number) => void;
}) {
  const duration = /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) ? toMin(end) - toMin(start) : 0;
  const splits = (duration > 0 ? roundSplits(duration) : []) as { rounds: number; minutes: number }[];
  const inList = splits.some((s) => s.rounds === rounds && s.minutes === minutes);
  const [custom, setCustom] = useState(!inList && duration > 0);
  const value = custom ? "anders" : `${rounds}x${minutes}`;
  const left = duration - rounds * minutes;

  return (
    <div className="tn-field">
      <label htmlFor={id}>Indeling</label>
      <select
        id={id}
        className="tn-input tn-select"
        value={value}
        onChange={(e) => {
          if (e.target.value === "anders") {
            setCustom(true);
            return;
          }
          setCustom(false);
          const [r, m] = e.target.value.split("x").map(Number);
          onChange(r, m);
        }}
      >
        {!inList && !custom && <option value={`${rounds}x${minutes}`}>{`${rounds} × ${minutes} min`}</option>}
        {splits.map((s) => (
          <option key={`${s.rounds}x${s.minutes}`} value={`${s.rounds}x${s.minutes}`}>
            {`${s.rounds} × ${s.minutes} min`}
          </option>
        ))}
        <option value="anders">Anders…</option>
      </select>
      {custom && (
        <div className="tn-split-custom">
          <input
            className="tn-input"
            inputMode="numeric"
            aria-label="Aantal rondes"
            value={rounds || ""}
            onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0, minutes)}
          />
          <span>×</span>
          <input
            className="tn-input"
            inputMode="numeric"
            aria-label="Minuten per ronde"
            value={minutes || ""}
            onChange={(e) => onChange(rounds, Number(e.target.value.replace(/\D/g, "")) || 0)}
          />
          <span>min</span>
        </div>
      )}
      {duration > 0 && left < 0 && <span className="tn-hint tn-hint--bad">Past niet: dat is {rounds * minutes} min, je hebt {duration} min.</span>}
      {duration > 0 && left > 0 && custom && <span className="tn-hint">Er blijft {left} min over.</span>}
    </div>
  );
}

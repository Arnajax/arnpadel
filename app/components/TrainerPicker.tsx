"use client";

import type { Trainer } from "../_lib/trainers";
import { TiltCard } from "./TiltCard";

interface Props {
  trainers: Trainer[];
  onSelect: (trainerId: string) => void;
  selectedId?: string | null;
}

export default function TrainerPicker({ trainers, onSelect, selectedId }: Props) {
  const visibleTrainers = selectedId
    ? trainers.filter(t => t.id === selectedId)
    : trainers;
  return (
    <div
      className="tp-grid"
      style={{ "--tp-cols": visibleTrainers.length } as React.CSSProperties}
    >
      {visibleTrainers.map((trainer) => {
        const isSelected = selectedId === trainer.id;
        const isUnavailable = !trainer.bookable;
        return (
        <TiltCard
          key={trainer.id}
          tiltLimit={isSelected ? 0 : 8}
          scale={isSelected ? 1 : 1.03}
          style={{ borderRadius: 20 }}
        >
        <button
          className={`tp-card${isSelected ? " tp-card--selected" : ""}${isUnavailable ? " tp-card--unavailable" : ""}`}
          onClick={() => !isUnavailable && onSelect(trainer.id)}
          aria-disabled={isUnavailable}
        >
          <div className="tp-photo-wrap">
            <img
              src={trainer.photoSrc}
              alt={trainer.name}
              className="tp-photo"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/arn-photo.jpg";
              }}
            />
            {isUnavailable && trainer.returnNote && (
              <div className="tp-unavailable-badge">{trainer.returnNote}</div>
            )}
          </div>
          <div className="tp-body">
            <p className="tp-role">{trainer.role}</p>
            <h3 className="tp-name">{trainer.name}</h3>
            <p className="tp-niveau">Niveau 3 – 9</p>
            <div className="tp-cta-btn">{trainer.cta} {isUnavailable ? "" : "→"}</div>
          </div>
        </button>
        </TiltCard>
        );
      })}
    </div>
  );
}

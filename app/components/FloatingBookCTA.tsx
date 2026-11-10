"use client";

import { useState, useEffect } from "react";

interface Props {
  onBook: () => void;
}

/* Verberg de zwevende knop zolang een van deze in beeld is: daar staat al een
   boekknop (hero, trainers, Kobro), een eigen knop (community) of de footer. */
const HIDE_WHEN_VISIBLE = [".hero", "#trainers", ".kobro-ctas", ".community-cta", ".site-footer"];

export default function FloatingBookCTA({ onBook }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const targets = HIDE_WHEN_VISIBLE.flatMap(sel => Array.from(document.querySelectorAll(sel)));
    const inView = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) inView.add(e.target);
        else inView.delete(e.target);
      }
      setVisible(inView.size === 0);
    });
    targets.forEach(t => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <button
      onClick={onBook}
      aria-label="Boek nu"
      style={{
        position: "fixed",
        bottom: "calc(20px + env(safe-area-inset-bottom))",
        right: 16,
        zIndex: 200,
        background: "var(--court)",
        color: "var(--cream)",
        border: "none",
        borderRadius: 999,
        padding: "0 22px",
        height: 48,
        fontSize: "0.92rem",
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
        boxShadow: "0 6px 20px oklch(0.20 0.025 152 / 0.22)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.25s, transform 0.25s",
        whiteSpace: "nowrap",
      }}
    >
      Boek nu →
    </button>
  );
}

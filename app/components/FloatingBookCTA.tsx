"use client";

import { useState, useEffect } from "react";

interface Props {
  onBook: () => void;
}

export default function FloatingBookCTA({ onBook }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY >= window.innerHeight);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={onBook}
      aria-label="Boek nu"
      style={{
        position: "fixed",
        bottom: 28,
        right: 24,
        zIndex: 200,
        background: "var(--green)",
        color: "#fff",
        border: "none",
        borderRadius: 999,
        padding: "0 28px",
        height: 56,
        fontSize: "0.95rem",
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
        boxShadow: "0 8px 32px rgba(0,194,124,0.35)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.25s, transform 0.25s",
        whiteSpace: "nowrap",
        minWidth: 120,
      }}
    >
      Boek nu →
    </button>
  );
}

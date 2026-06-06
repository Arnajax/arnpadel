"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Trainer } from "../_lib/trainers";

export default function TrainerShowcase({ trainers }: { trainers: Trainer[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 680);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const count = trainers.length;
  const active = trainers[activeIndex];

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveIndex((p) => (p + 1) % count);
    }, 6000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [count]);

  const go = useCallback((dir: 1 | -1) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveIndex((p) => (p + dir + count) % count);
  }, [count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Native touch listeners — fire immediately on touchmove, no disambiguation delay
  useEffect(() => {
    const el = imageContainerRef.current;
    if (!el) return;
    let startX: number | null = null;
    let startY: number | null = null;
    let fired = false;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      fired = false;
    };
    const onMove = (e: TouchEvent) => {
      if (startX === null || startY === null) return;
      const dx = e.touches[0].clientX - startX;
      const dy = Math.abs(e.touches[0].clientY - startY);
      // Horizontal movement: prevent scroll and immediately fire swipe
      if (Math.abs(dx) > dy) {
        e.preventDefault();
        if (!fired && Math.abs(dx) > 10) {
          fired = true;
          go(dx > 0 ? -1 : 1);
        }
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (!fired && startX !== null) {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 10) go(dx > 0 ? -1 : 1);
      }
      startX = null;
      startY = null;
      fired = false;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [go]);

  // Mouse drag for desktop
  const mouseStartX = useRef<number | null>(null);
  const mouseFired = useRef(false);

  function handleMouseDown(e: React.MouseEvent) {
    mouseStartX.current = e.clientX;
    mouseFired.current = false;
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (mouseFired.current || mouseStartX.current === null || e.buttons === 0) return;
    const dx = e.clientX - mouseStartX.current;
    if (Math.abs(dx) > 25) {
      mouseFired.current = true;
      go(dx > 0 ? -1 : 1);
    }
  }
  function handleMouseUp(e: React.MouseEvent) {
    if (!mouseFired.current && mouseStartX.current !== null) {
      const dx = e.clientX - mouseStartX.current;
      if (Math.abs(dx) > 25) go(dx > 0 ? -1 : 1);
    }
    mouseStartX.current = null;
    mouseFired.current = false;
  }

  function getImgStyle(index: number): React.CSSProperties {
    const relative = ((index - activeIndex) + count) % count;
    const transition = "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)";

    if (relative === 0) return {
      zIndex: 3, opacity: 1, pointerEvents: "none",
      transform: "translateX(0) rotate(0deg) scale(1)",
      transition,
    };
    if (relative === 1) return {
      zIndex: 2, opacity: 0.85, pointerEvents: "auto", cursor: "pointer",
      transform: isMobile
        ? "translateX(72%) rotate(8deg) scale(0.82)"
        : "translateX(58%) rotate(12deg) scale(0.82)",
      transition,
    };
    return {
      zIndex: 1, opacity: 0.75, pointerEvents: "auto", cursor: "pointer",
      transform: isMobile
        ? "translateX(-66%) rotate(-7deg) scale(0.76)"
        : "translateX(-52%) rotate(-10deg) scale(0.76)",
      transition,
    };
  }

  const quoteVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
  };

  return (
    <section className="ts-section">
      <div className="ts-inner">
        <h2 className="ts-heading">Onze trainers</h2>
        <p className="ts-subline">Persoonlijk, to-the-point en altijd afgestemd op jouw niveau.</p>

        <div className="ts-tabs">
          {trainers.map((t, i) => (
            <button
              key={t.id}
              className={`ts-tab${i === activeIndex ? " ts-tab--active" : ""}`}
              onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); setActiveIndex(i); }}
            >
              <img src={t.photoSrc} className="ts-tab-avatar" alt={t.name} onError={(e) => { (e.target as HTMLImageElement).src = "/arn-photo.jpg"; }} />
              <span>{t.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        <div className="ts-grid">
          {/* Foto carousel */}
          <div
            className="ts-images"
            ref={imageContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {trainers.map((t, i) => (
              <img
                key={t.id}
                src={t.photoSrc}
                alt={t.name}
                className="ts-img"
                style={getImgStyle(i)}
                onClick={() => { if (i !== activeIndex) { if (intervalRef.current) clearInterval(intervalRef.current); setActiveIndex(i); } }}
                onError={(e) => { (e.target as HTMLImageElement).src = "/arn-photo.jpg"; }}
              />
            ))}
          </div>

          {/* Tekst */}
          <div className="ts-content">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                variants={quoteVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.28, ease: "easeInOut" }}
              >
                <p className="ts-role">{active.role}</p>
                <h3 className="ts-name">{active.name}</h3>
                {active.stats.length > 0 && (
                  <div className="ts-stats">
                    {active.stats.map((s) => (
                      <div key={s.label} className="ts-stat">
                        <span className="ts-stat-label">{s.label}</span>
                        <span className="ts-stat-value">{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <motion.div className="ts-bio">
                  {active.bio.map((para, i) => (
                    <p key={i} className="ts-para">
                      {para.split(" ").map((word, wi) => (
                        <motion.span
                          key={wi}
                          initial={{ filter: "blur(8px)", opacity: 0, y: 4 }}
                          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut", delay: 0.02 * wi }}
                          style={{ display: "inline-block" }}
                        >
                          {word}&nbsp;
                        </motion.span>
                      ))}
                    </p>
                  ))}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ts-section {
          background: var(--cream);
          border-top: 1px solid var(--border);
          padding: 80px 20px;
        }
        .ts-inner {
          max-width: 960px;
          margin: 0 auto;
        }
        .ts-heading {
          font-size: clamp(1.8rem, 4vw, 2.4rem);
          font-weight: 800;
          color: var(--ink);
          margin: 0 0 8px;
          letter-spacing: -0.01em;
          text-align: center;
        }
        .ts-subline {
          text-align: center;
          color: var(--muted);
          font-size: 0.97rem;
          margin: 0 0 56px;
        }
        .ts-tabs {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          margin-bottom: 2.5rem;
          flex-wrap: wrap;
        }
        .ts-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 6px 18px 6px 8px;
          border-radius: 999px;
          border: 1.5px solid var(--border);
          background: #141414;
          color: #d1d5db;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
        }
        .ts-tab:hover {
          background: #222;
          border-color: var(--court);
          color: #fff;
        }
        .ts-tab--active {
          background: var(--court);
          border-color: var(--court);
          color: #fff;
        }
        .ts-tab-avatar {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          object-fit: cover;
          object-position: top center;
          flex-shrink: 0;
        }
        .ts-grid {
          display: grid;
          gap: 3rem;
        }
        .ts-images {
          position: relative;
          width: 86%;
          height: 22rem;
          overflow: visible;
          user-select: none;
          touch-action: pan-y;
          cursor: grab;
        }
        .ts-images:active {
          cursor: grabbing;
        }
        .ts-img {
          position: absolute;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          border-radius: 1.25rem;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
          user-select: none;
          -webkit-user-drag: none;
        }
        .ts-content {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .ts-role {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--court);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 0 0 6px;
        }
        .ts-name {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 800;
          color: var(--ink);
          margin: 0 0 20px;
          letter-spacing: -0.01em;
        }
        .ts-stats {
          display: flex;
          gap: 0;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border);
        }
        .ts-stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-right: 20px;
          border-right: 1px solid var(--border);
        }
        .ts-stat:last-child {
          border-right: none;
          padding-right: 0;
          padding-left: 20px;
        }
        .ts-stat:not(:first-child):not(:last-child) {
          padding-left: 20px;
        }
        .ts-stat-value {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--ink);
          line-height: 1;
        }
        .ts-stat-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .ts-bio {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ts-para {
          font-size: 0.97rem;
          line-height: 1.75;
          color: var(--muted);
          margin: 0;
        }
        @media (max-width: 679px) {
          .ts-content {
            align-items: center;
            text-align: center;
          }
          .ts-stats {
            justify-content: center;
          }
          .ts-images {
            height: 17rem;
            width: 68%;
            margin: 0 auto;
          }
        }
        @media (min-width: 680px) {
          .ts-grid {
            grid-template-columns: 0.85fr 1fr;
            gap: 6rem;
            align-items: center;
          }
          .ts-images {
            width: 72%;
          }
        }
      `}</style>
    </section>
  );
}

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TrainerShowcase from "./components/TrainerShowcase";
import TrainerPicker from "./components/TrainerPicker";
import FloatingBookCTA from "./components/FloatingBookCTA";
import { TRAINERS } from "./_lib/trainers";
import { PRICE_FROM } from "./_lib/constants";
import type { Slot } from "./_lib/slots";

interface FormData {
  name: string;
  phone: string;
  players: number;
}

type SlotId = string | number;

interface BookingResult {
  slot_id: SlotId;
  ok: boolean;
  error?: string;
  datum?: string;
  tijd?: string;
  prijs?: number;
}

const DAY_FULL_NL  = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
const CAL_HEADERS  = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
const MONTH_LONG_NL  = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const MONTH_SHORT_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const CONTACT_STORAGE_KEY = "arnpadel-booking-contact";

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function parseDateLocal(key: string): Date {
  const [y,mo,d] = key.split("-").map(Number);
  return new Date(y, mo-1, d);
}
function slotDateKey(s: string): string { return s.slice(0,10); }
function getTime(slot: Slot): string { return slot.time ?? slot.date.split("T")[1]?.slice(0,5) ?? ""; }
function isPiekSlot(time: string, dateStr?: string): boolean {
  if (dateStr) {
    const wd = parseDateLocal(slotDateKey(dateStr)).getDay(); // 0=zo, 6=za
    if (wd === 0 || wd === 6) return true;                     // heel weekend = piek
  }
  const hour = parseInt(time.split(":")[0], 10);
  return !isNaN(hour) && hour >= 17;                           // doordeweeks vanaf 17:00 = piek
}
function getBaanhuur(time: string, dateStr?: string): number { return isPiekSlot(time, dateStr) ? 30 : 20; }
function getPrice(players: number, time: string, dateStr?: string): number {
  const lesprijs = players <= 2 ? 60 : 70;
  return lesprijs + getBaanhuur(time, dateStr);
}
function monOffset(d: Date): number { return (d.getDay()+6)%7; }

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
function ChevronDown() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function CheckCircle() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}

export default function HomePageClient({
  initialSlots,
}: {
  initialSlots: Slot[];
}) {
  const [slots]                     = useState<Slot[]>(initialSlots);
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<SlotId>>(() => new Set());
  const [viewYear, setViewYear]     = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth]   = useState(new Date().getMonth());
  const [formData, setFormData]     = useState<FormData>({ name: "", phone: "", players: 2 });
  const [playersSelected, setPlayersSelected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    name: string;
    players: number;
    bookedSlots: Slot[];
    failedSlots: { slot: Slot | null; error: string }[];
    total: number;
    trainerName: string;
  } | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const bookingRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const formRef    = useRef<HTMLDivElement>(null);
  const hasScrolledToForm = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CONTACT_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<FormData>;
      setFormData((current) => ({
        ...current,
        name: typeof parsed.name === "string" ? parsed.name : current.name,
        phone: typeof parsed.phone === "string" ? parsed.phone : current.phone,
      }));
    } catch {
      // Ignore corrupt local data.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CONTACT_STORAGE_KEY,
        JSON.stringify({ name: formData.name, phone: formData.phone })
      );
    } catch {
      // Ignore storage failures.
    }
  }, [formData.name, formData.phone]);

  // Slots gefilterd op geselecteerde trainer
  const filteredSlots = useMemo(() => {
    if (!selectedTrainer) return slots;
    return slots.filter((s) => (s as Slot & { trainer_id?: string }).trainer_id === selectedTrainer);
  }, [slots, selectedTrainer]);

  // Spring naar eerste beschikbare maand wanneer trainer wordt gekozen
  useEffect(() => {
    if (!selectedTrainer || filteredSlots.length === 0) return;
    const first = filteredSlots.map(s => slotDateKey(s.date)).sort()[0];
    const d = parseDateLocal(first);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [selectedTrainer, filteredSlots]);

  // Auto-scroll naar kalender bij trainerselectie
  useEffect(() => {
    if (selectedTrainer !== null) {
      setTimeout(() => calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }, [selectedTrainer]);

  // Auto-scroll naar form alleen bij eerste slot in cart (niet bij elke toevoeging)
  useEffect(() => {
    if (selectedSlotIds.size === 0) {
      hasScrolledToForm.current = false;
      return;
    }
    if (!hasScrolledToForm.current) {
      hasScrolledToForm.current = true;
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    }
  }, [selectedSlotIds]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of filteredSlots) {
      const k = slotDateKey(s.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [filteredSlots]);

  // Slot-lookup voor cart-render
  const slotById = useMemo(() => {
    const map = new Map<SlotId, Slot>();
    for (const s of filteredSlots) map.set(s.id, s);
    return map;
  }, [filteredSlots]);

  // Count badges per kalenderdag: hoeveel slots staan in cart op die dag
  const selectedCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of selectedSlotIds) {
      const slot = slotById.get(id);
      if (!slot) continue;
      const k = slotDateKey(slot.date);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [selectedSlotIds, slotById]);

  // Cart als gesorteerde lijst (datum oplopend, dan tijd)
  const cartSlots = useMemo(() => {
    const arr: Slot[] = [];
    for (const id of selectedSlotIds) {
      const slot = slotById.get(id);
      if (slot) arr.push(slot);
    }
    arr.sort((a, b) => a.date.localeCompare(b.date));
    return arr;
  }, [selectedSlotIds, slotById]);

  const totalPrice = cartSlots.reduce(
    (sum, s) => sum + getPrice(formData.players, getTime(s), s.date),
    0
  );

  const calCells = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
    const offset = monOffset(new Date(viewYear, viewMonth, 1));
    const cells: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    return cells;
  }, [viewYear, viewMonth]);

  const today = toDateKey(new Date());

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); }
    else setViewMonth(m => m-1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); }
    else setViewMonth(m => m+1);
  }
  function handleSelectDate(key: string) {
    setSelectedDate(key);
    setError(null);
  }
  function handleToggleSlot(id: SlotId) {
    setSelectedSlotIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  }
  function handleRemoveFromCart(id: SlotId) {
    setSelectedSlotIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }
  function handleSelectTrainer(trainerId: string) {
    setSelectedTrainer(trainerId);
    setSelectedDate(null);
    setSelectedSlotIds(new Set());
    setError(null);
    setSuccessData(null);
  }
  function handleBackToTrainers() {
    setSelectedTrainer(null);
    setSelectedDate(null);
    setSelectedSlotIds(new Set());
    setError(null);
    setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }
  function handleBookMore() {
    // Behoud trainer + datum, wis selectie + success
    setSuccessData(null);
    setSelectedSlotIds(new Set());
    setError(null);
    setTimeout(() => calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSlotIds.size === 0) { setError("Selecteer eerst minstens één tijdslot."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const slotIds = Array.from(selectedSlotIds);
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          players: formData.players,
          slotIds,
          trainerId: selectedTrainer ?? "arn",
        }),
      });
      const payload = await res.json().catch(() => null) as
        | { success?: boolean; results?: BookingResult[]; message?: string; error?: string }
        | null;
      if (!res.ok || !payload) {
        throw new Error(payload?.error ?? payload?.message ?? `Fout: ${res.status}`);
      }
      const results: BookingResult[] = payload.results ?? [];
      const bookedSlots: Slot[] = [];
      const failedSlots: { slot: Slot | null; error: string }[] = [];
      for (const r of results) {
        const slot = slotById.get(r.slot_id) ?? null;
        if (r.ok) {
          if (slot) bookedSlots.push(slot);
        } else {
          failedSlots.push({ slot, error: r.error ?? "Onbekende fout" });
        }
      }
      if (bookedSlots.length === 0) {
        throw new Error(payload.message ?? "Geen van de slots kon worden geboekt — ze zijn waarschijnlijk net vergeven.");
      }
      const trainer = TRAINERS.find(t => t.id === selectedTrainer) ?? TRAINERS[0];
      setSuccessData({
        name: formData.name,
        players: formData.players,
        bookedSlots,
        failedSlots,
        total: bookedSlots.reduce((sum, s) => sum + getPrice(formData.players, getTime(s), s.date), 0),
        trainerName: trainer.name,
      });
      setFormData((current) => ({ ...current, players: 2 }));
      setPlayersSelected(false);
      setSelectedSlotIds(new Set());
      setSelectedDate(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er is iets misgegaan.");
    } finally {
      setSubmitting(false);
    }
  }

  const daySlots = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];
  const selectedTrainerData = TRAINERS.find(t => t.id === selectedTrainer);

  return (
    <div className="page-root">

      {/* ── TOPNAV ── */}
      <nav className="site-nav">
        <div className="site-nav-left">
          <a href="#trainers" className="site-nav-link">Trainers</a>
          <a href="#rackettest" className="site-nav-link">Rackets testen</a>
        </div>
        <div className="site-nav-center">
          <img src="/phh-pin.svg" alt="" aria-hidden className="site-nav-logo-img" style={{ height: 22, width: "auto" }} />
          <span className="site-nav-wordmark">Padel <span className="site-nav-wordmark-hub">Hub</span> Hoorn</span>
        </div>
        <div className="site-nav-right">
          <button className="site-nav-cta" onClick={() => bookingRef.current?.scrollIntoView({ behavior: "smooth" })}>
            Boek nu →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <video className="hero-video" autoPlay muted loop playsInline preload="metadata" poster="/hero-poster.jpg">
          <source src="/hero.webm" type="video/webm"/>
          <source src="/hero.mp4"  type="video/mp4"/>
        </video>
        <div className="hero-overlay" aria-hidden/>
        <div className="hero-glow"    aria-hidden/>
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="hero-badge-dot"/>
            Hoorn · Sportcentrum
          </div>
          <h1 className="hero-title">
            Boek een les
          </h1>
          <p className="hero-sub">
            Padelles bij Sportcentrum Hoorn, alleen of met maximaal 3 vrienden.
          </p>
          <button className="hero-cta" onClick={() => bookingRef.current?.scrollIntoView({ behavior:"smooth" })}>
            Kies je trainer →
          </button>
          <p className="hero-proof">Vanaf {PRICE_FROM} per persoon · Geen abonnement</p>
        </div>
        <button className="hero-scroll" onClick={() => bookingRef.current?.scrollIntoView({ behavior:"smooth" })} aria-label="Scroll naar trainers">
          <ChevronDown/>
        </button>
      </section>

      {/* ── BOOKING ── */}
      <section className="bk-section" id="trainers" ref={bookingRef}>
        <div className="bk-inner">

          {/* ── TRAINER PICKER (altijd zichtbaar; filtert naar geselecteerde) ── */}
          {!selectedTrainer && (
            <>
              <h2 className="section-title" style={{ textAlign:"center", marginBottom:16 }}>Kies je trainer</h2>
              <p className="section-sub">Klik op een trainer om beschikbare lessen te zien.</p>
            </>
          )}
          <TrainerPicker trainers={TRAINERS} onSelect={handleSelectTrainer} selectedId={selectedTrainer} />

          {/* ── KALENDER REVEAL (soepel naar beneden) ── */}
          <AnimatePresence>
          {selectedTrainer && (
            <motion.div
              ref={calendarRef}
              key={selectedTrainer}
              className="cal-reveal"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="cal-trainer-bar">
                <img
                  src={selectedTrainerData?.photoSrc ?? "/arn-photo.jpg"}
                  alt={selectedTrainerData?.name ?? "Trainer"}
                  className="cal-trainer-bar-photo"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/arn-photo.jpg"; }}
                />
                <div className="cal-trainer-bar-info">
                  <p className="cal-trainer-bar-role">{selectedTrainerData?.role}</p>
                  <p className="cal-trainer-bar-name">{selectedTrainerData?.name}</p>
                </div>
                <button className="cal-trainer-bar-back" onClick={handleBackToTrainers}>← andere trainer</button>
              </div>
              <div>
                {filteredSlots.length === 0 ? (
                  <div className="empty-state">
                    Geen beschikbare lessen bij {selectedTrainerData?.name ?? "deze trainer"} — check later opnieuw of kies een andere trainer.
                  </div>
                ) : successData ? (
                  <div className="success-block">
                    <CheckCircle/>
                    <h3 className="success-title">Aanvraag verzonden! 🎾</h3>
                    <p className="success-sub">
                      {successData.bookedSlots.length === 1
                        ? `Je aanvraag is ontvangen. ${successData.trainerName.split(" ")[0]} neemt zo spoedig mogelijk contact op via WhatsApp.`
                        : `Je ${successData.bookedSlots.length} aanvragen zijn ontvangen. ${successData.trainerName.split(" ")[0]} neemt zo spoedig mogelijk contact op via WhatsApp.`}
                    </p>
                    <div className="success-card">
                      <div className="success-card-row">
                        <span className="success-card-label">Naam</span>
                        <span className="success-card-value">{successData.name}</span>
                      </div>
                      <div className="success-card-row">
                        <span className="success-card-label">Trainer</span>
                        <span className="success-card-value">{successData.trainerName}</span>
                      </div>
                      <div className="success-card-row">
                        <span className="success-card-label">Spelers</span>
                        <span className="success-card-value">{successData.players}</span>
                      </div>
                      <div className="success-card-row" style={{ alignItems: "flex-start" }}>
                        <span className="success-card-label">{successData.bookedSlots.length === 1 ? "Slot" : `Slots (${successData.bookedSlots.length})`}</span>
                        <span className="success-card-value" style={{ textAlign: "right" }}>
                          {successData.bookedSlots.map((s) => {
                            const t = getTime(s);
                            const p = getPrice(successData.players, t, s.date);
                            return (
                              <span key={s.id} style={{ display: "block" }}>
                                ✅ {DAY_FULL_NL[parseDateLocal(slotDateKey(s.date)).getDay()]}{" "}
                                {parseDateLocal(slotDateKey(s.date)).getDate()}{" "}
                                {MONTH_SHORT_NL[parseDateLocal(slotDateKey(s.date)).getMonth()]} · {t}
                                {successData.bookedSlots.length > 1 && <> — €{p}</>}
                              </span>
                            );
                          })}
                          {successData.failedSlots.map((f, i) => (
                            <span key={`f-${i}`} style={{ display: "block", color: "#a00" }}>
                              ❌ {f.slot
                                ? `${DAY_FULL_NL[parseDateLocal(slotDateKey(f.slot.date)).getDay()]} ${parseDateLocal(slotDateKey(f.slot.date)).getDate()} ${MONTH_SHORT_NL[parseDateLocal(slotDateKey(f.slot.date)).getMonth()]} · ${getTime(f.slot)}`
                                : "onbekend slot"}
                              {" "}
                              <small>({f.error})</small>
                            </span>
                          ))}
                        </span>
                      </div>
                      <div className="success-card-row success-card-row--total">
                        <span className="success-card-label">Totaal</span>
                        <span className="success-card-total">€{successData.total}</span>
                      </div>
                    </div>
                    <button className="btn-primary" style={{ marginTop:24 }} onClick={handleBookMore}>
                      Nog meer slots boeken
                    </button>
                  </div>
                ) : (
                  <div className="bk-layout">

                    {/* ── LEFT: Calendar ── */}
                    <div className="bk-cal-col">
                      <div className="bk-cal-desktop">
                        <div className="bk-cal-nav">
                          <button className="bk-cal-arrow" onClick={prevMonth} aria-label="Vorige maand"><ChevronLeft/></button>
                          <span className="bk-cal-title">{MONTH_LONG_NL[viewMonth]} {viewYear}</span>
                          <button className="bk-cal-arrow" onClick={nextMonth} aria-label="Volgende maand"><ChevronRight/></button>
                        </div>
                        <div className="bk-cal-headers">
                          {CAL_HEADERS.map(h => <span key={h} className="bk-cal-hdr">{h}</span>)}
                        </div>
                        <div className="bk-cal-grid">
                          {calCells.map((d, i) => {
                            if (!d) return <span key={`pad-${i}`} className="bk-cell bk-cell--pad"/>;
                            const key   = toDateKey(d);
                            const avail = slotsByDate.has(key);
                            const sel   = selectedDate === key;
                            const isToday = key === today;
                            const selCount = selectedCountByDate.get(key) ?? 0;
                            return (
                              <button
                                key={key}
                                disabled={!avail}
                                onClick={() => avail && handleSelectDate(key)}
                                className={[
                                  "bk-cell",
                                  avail   ? "bk-cell--avail"  : "bk-cell--grey",
                                  sel     ? "bk-cell--sel"    : "",
                                  isToday ? "bk-cell--today"  : "",
                                  selCount > 0 ? "bk-cell--in-cart" : "",
                                ].filter(Boolean).join(" ")}
                              >
                                {d.getDate()}
                                {avail && selCount === 0 && <span className="bk-cell-dot"/>}
                                {selCount > 0 && <span className="bk-cell-count">{selCount}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* ── RIGHT: Slots + Form ── */}
                    <div className="bk-slots-col">
                      {!selectedDate ? (
                        <p className="bk-placeholder">← Kies een dag in de kalender</p>
                      ) : (
                        <>
                          <h3 className="bk-slots-heading">
                            Beschikbaar op{" "}
                            {DAY_FULL_NL[parseDateLocal(selectedDate).getDay()]}{" "}
                            {parseDateLocal(selectedDate).getDate()}{" "}
                            {MONTH_SHORT_NL[parseDateLocal(selectedDate).getMonth()]}
                          </h3>
                          <p className="bk-slots-hint">Tip: tik meerdere tijden aan om in één keer te boeken.</p>

                          <div className="bk-slots-list">
                            {daySlots.map(slot => {
                              const active = selectedSlotIds.has(slot.id);
                              return (
                                <button
                                  key={slot.id}
                                  onClick={() => handleToggleSlot(slot.id)}
                                  className={`bk-slot-row${active ? " bk-slot-row--active" : ""}`}
                                  aria-pressed={active}
                                >
                                  <span className="bk-slot-check" aria-hidden>{active ? "✓" : ""}</span>
                                  <span className="bk-slot-time">{getTime(slot)}</span>
                                  <span className="bk-slot-meta">{slot.duration} min</span>
                                </button>
                              );
                            })}
                          </div>

                          {selectedSlotIds.size > 0 && (
                            <div className="bk-form-wrap" ref={formRef}>
                              {/* Cart-overzicht */}
                              <div className="bk-cart">
                                <div className="bk-cart-head">
                                  <span className="bk-cart-title">Jouw selectie ({cartSlots.length})</span>
                                  <span className="bk-cart-total">€{totalPrice}</span>
                                </div>
                                <ul className="bk-cart-list">
                                  {cartSlots.map(s => {
                                    const d = parseDateLocal(slotDateKey(s.date));
                                    const t = getTime(s);
                                    return (
                                      <li key={s.id} className="bk-cart-row">
                                        <span className="bk-cart-label">
                                          {DAY_FULL_NL[d.getDay()].slice(0,2)} {d.getDate()} {MONTH_SHORT_NL[d.getMonth()]} · {t}
                                          <small className="bk-cart-meta"> · {s.duration} min</small>
                                        </span>
                                        <span className="bk-cart-price">€{getPrice(formData.players, t, s.date)}</span>
                                        <button
                                          type="button"
                                          className="bk-cart-remove"
                                          onClick={() => handleRemoveFromCart(s.id)}
                                          aria-label={`Verwijder ${t} uit selectie`}
                                        >✕</button>
                                      </li>
                                    );
                                  })}
                                </ul>
                                <small className="bk-cart-note">incl. baanhuur (€20 dal / €30 piek: vanaf 17:00 &amp; weekend)</small>
                              </div>

                              {error && <div className="error-msg">{error}</div>}
                              <form onSubmit={handleSubmit} className="bk-form">
                                <div className="field">
                                  <label className="field-label">Aantal spelers <small style={{ fontWeight: 400, color: "#666" }}>(geldt voor alle gekozen lessen)</small></label>
                                  <div className="players-grid">
                                    {[1,2,3,4].map(n => (
                                      <button
                                        key={n} type="button"
                                        className={`player-btn${playersSelected && formData.players === n ? " player-btn--active" : ""}`}
                                        onClick={() => {
                                          setFormData(f => ({ ...f, players: n }));
                                          setPlayersSelected(true);
                                        }}
                                      >{n}</button>
                                    ))}
                                  </div>
                                  {playersSelected && (
                                    <p className="price-hint">
                                      {cartSlots.length === 1
                                        ? <>Prijs: <strong style={{ color:"#16a34a" }}>€{totalPrice}</strong> <small style={{ color:"#6b7280" }}>(incl. €{getBaanhuur(getTime(cartSlots[0]), cartSlots[0].date)} baanhuur)</small></>
                                        : <>Totaal: <strong style={{ color:"#16a34a" }}>€{totalPrice}</strong> <small style={{ color:"#6b7280" }}>voor {cartSlots.length} lessen</small></>}
                                    </p>
                                  )}
                                </div>
                                <div className="field">
                                  <label className="field-label" htmlFor="bk-name">Naam</label>
                                  <input
                                    id="bk-name" type="text" required
                                    className="field-input" placeholder="Jouw naam"
                                    value={formData.name}
                                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                                  />
                                </div>
                                <div className="field">
                                  <label className="field-label" htmlFor="bk-phone">Telefoon</label>
                                  <input
                                    id="bk-phone" type="tel" required
                                    className="field-input" placeholder="06 12 34 56 78"
                                    value={formData.phone}
                                    onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                                  />
                                </div>
                                <button type="submit" disabled={submitting} className="btn-confirm">
                                  {submitting
                                    ? <span className="spinner-row"><span className="spinner"/>Versturen…</span>
                                    : cartSlots.length === 1
                                      ? "Bevestig boeking"
                                      : `Bevestig boeking (${cartSlots.length} lessen · €${totalPrice})`}
                                </button>
                              </form>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* ── ANDERE TRAINERS (onder kalender) ── */}
          {selectedTrainer && TRAINERS.filter(t => t.bookable && t.id !== selectedTrainer).length > 0 && (
            <div className="other-trainers-row">
              <p className="other-trainers-label">Of boek bij een andere trainer</p>
              <div className="other-trainers-chips">
                {TRAINERS.filter(t => t.bookable && t.id !== selectedTrainer).map(trainer => (
                  <button
                    key={trainer.id}
                    className="other-trainer-chip"
                    onClick={() => handleSelectTrainer(trainer.id)}
                  >
                    <img
                      src={trainer.photoSrc}
                      alt={trainer.name}
                      className="other-trainer-chip-photo"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/arn-photo.jpg"; }}
                    />
                    <span className="other-trainer-chip-name">{trainer.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── KOBRO RACKETTEST ── */}
      <section className="kobro-section" id="rackettest">
        <div className="kobro-inner">
          <div className="kobro-logos">
            <span className="kobro-brand">Padel Hub Hoorn</span>
            <span className="kobro-times">×</span>
            <a href="https://kobro.nl" target="_blank" rel="noopener noreferrer" className="kobro-brand kobro-brand--link">
              {/* TODO: replace with official Kobro SVG logo once available */}
              Kobro
            </a>
          </div>
          <h2 className="kobro-heading">Twijfel over je racket? Test er gratis meerdere tijdens je les.</h2>
          <p className="kobro-body">
            Kobro zit pal naast Sportcentrum Hoorn. Tijdens je les kun je verschillende rackets meenemen en uitproberen. Handig als je twijfelt over een nieuw racket of net begint.
          </p>
          <div className="kobro-ctas">
            <button className="kobro-cta-primary" onClick={() => bookingRef.current?.scrollIntoView({ behavior: "smooth" })}>
              Plan je les →
            </button>
            <a href="https://kobro.nl" target="_blank" rel="noopener noreferrer" className="kobro-cta-secondary">
              Bekijk rackets bij Kobro →
            </a>
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <TrainerShowcase trainers={TRAINERS} />

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-col">
            <h4 className="footer-col-head">Contact</h4>
            <ul className="footer-col-list">
              <li>Sportcentrum Hoorn</li>
              <li>Holenweg 14a, 1624 PB Hoorn</li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-head">Lessen</h4>
            <ul className="footer-col-list">
              <li>Privé (1 persoon)</li>
              <li>Duo (2 personen)</li>
              <li>Trio (3 personen)</li>
              <li>4 personen</li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-head">Trainers</h4>
            <ul className="footer-col-list">
              <li>Arn Braunschweiger</li>
              <li>Wessel Molenkamp</li>
              <li>Floris Coffeng</li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-head">Juridisch</h4>
            <ul className="footer-col-list">
              <li><a href="/voorwaarden" className="footer-link">Annulering &amp; voorwaarden</a></li>
              <li><a href="/voorwaarden" className="footer-link">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-copy">© {new Date().getFullYear()} Padel Hub Hoorn</p>
        </div>
      </footer>

      {/* ── FLOATING BOOK CTA ── */}
      <FloatingBookCTA onBook={() => bookingRef.current?.scrollIntoView({ behavior: "smooth" })} />
    </div>
  );
}

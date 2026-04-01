"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import AboutSection from "./components/AboutSection";

interface Slot {
  id: string | number;
  date: string;
  time: string;
  duration: number;
  maxPlayers: number;
}

interface FormData {
  name: string;
  phone: string;
  players: number;
}

const DAY_FULL_NL  = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
const CAL_HEADERS  = ["Ma","Di","Wo","Do","Vr","Za","Zo"];
const MONTH_LONG_NL  = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const MONTH_SHORT_NL = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function parseDateLocal(key: string): Date {
  const [y,mo,d] = key.split("-").map(Number);
  return new Date(y, mo-1, d);
}
function slotDateKey(s: string): string { return s.slice(0,10); }
function getTime(slot: Slot): string { return slot.time ?? slot.date.split("T")[1]?.slice(0,5) ?? ""; }
function getPrice(players: number): number { return players <= 2 ? 80 : 90; }
function monOffset(d: Date): number { return (d.getDay()+6)%7; } // Mon=0

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

export default function Home() {
  const [slots, setSlots]           = useState<Slot[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | number | null>(null);
  const [viewYear, setViewYear]     = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth]   = useState(new Date().getMonth());
  const [formData, setFormData]     = useState<FormData>({ name: "", phone: "", players: 2 });
  const [playersSelected, setPlayersSelected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ name: string; players: number; slot: Slot; total: number } | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const slotsRef  = useRef<HTMLDivElement>(null);
  const formRef   = useRef<HTMLDivElement>(null);

  // Fetch slots
  useEffect(() => {
    fetch("/api/slots")
      .then(r => r.json())
      .then((data: { slots?: Slot[] } | Slot[]) => {
        setSlots(Array.isArray(data) ? data : (data.slots ?? []));
        setLoading(false);
      })
      .catch(() => { setSlots([]); setLoading(false); });
  }, []);

  // Jump calendar to month of first slot
  useEffect(() => {
    if (slots.length === 0) return;
    const first = slots.map(s => slotDateKey(s.date)).sort()[0];
    const d = parseDateLocal(first);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [slots]);

  // Auto-scroll to form when a slot is selected
  useEffect(() => {
    if (selectedSlotId !== null) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    }
  }, [selectedSlotId]);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = slotDateKey(s.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [slots]);

  // Calendar cells for current view month (nulls = padding)
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
    setSelectedSlotId(null);
    setError(null);
  }
  function handleSelectSlot(id: string | number) {
    setSelectedSlotId(id);
    setPlayersSelected(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlotId) { setError("Selecteer eerst een tijdslot."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          players: formData.players,
          slotIds: [selectedSlotId],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? `Fout: ${res.status}`);
      }
      const slot = slots.find(s => s.id === selectedSlotId)!;
      setSuccessData({ name: formData.name, players: formData.players, slot, total: getPrice(formData.players) });
      setFormData({ name: "", phone: "", players: 2 });
      setPlayersSelected(false);
      setSelectedSlotId(null);
      setSelectedDate(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er is iets misgegaan.");
    } finally {
      setSubmitting(false);
    }
  }

  const daySlots    = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];
  const price       = getPrice(formData.players);

  return (
    <div className="page-root">

      {/* ── HERO ── */}
      <section className="hero">
        <video className="hero-video" autoPlay muted loop playsInline>
          <source src="/hero.webm" type="video/webm"/>
          <source src="/hero.mp4"  type="video/mp4"/>
        </video>
        <div className="hero-overlay" aria-hidden/>
        <div className="hero-glow"    aria-hidden/>
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="hero-badge-dot"/>
            Top-150 NL · Hoorn
          </div>
          <h1 className="hero-title">
            Niet meer verliezen<br/>van je vrienden.
          </h1>
          <p className="hero-sub">
            Van potjes naar finales. Privé padelles in Hoorn met Arn Braunschweiger.
          </p>
          <button className="hero-cta" onClick={() => slotsRef.current?.scrollIntoView({ behavior:"smooth" })}>
            Boek je eerste training →
          </button>
          <p className="hero-proof">Geen abonnement · Gewoon één les boeken</p>
        </div>
        <button className="hero-scroll" onClick={() => slotsRef.current?.scrollIntoView({ behavior:"smooth" })} aria-label="Scroll naar slots">
          <ChevronDown/>
        </button>
      </section>

      {/* ── BOOKING ── */}
      <section className="bk-section" ref={slotsRef}>
        <div className="bk-inner">
          <h2 className="section-title" style={{ textAlign:"center" }}>Boek hier je les</h2>

          {loading ? (
            <div className="bk-skeleton">
              <div className="bk-skeleton-cal"/>
              <div className="bk-skeleton-slots"/>
            </div>
          ) : slots.length === 0 ? (
            <div className="empty-state">
              Geen slots beschikbaar — volg{" "}
              <a href="https://instagram.com/arnpadel" target="_blank" rel="noopener noreferrer" className="empty-link">@arnpadel</a>
              {" "}op Instagram voor updates.
            </div>
          ) : successData ? (
            <div className="success-block">
              <CheckCircle/>
              <h3 className="success-title">Aanvraag verzonden! 🎾</h3>
              <p className="success-sub">
                Je aanvraag is ontvangen. Arn neemt zo spoedig mogelijk contact op via WhatsApp.
              </p>
              <div className="success-card">
                <div className="success-card-row">
                  <span className="success-card-label">Naam</span>
                  <span className="success-card-value">{successData.name}</span>
                </div>
                <div className="success-card-row">
                  <span className="success-card-label">Spelers</span>
                  <span className="success-card-value">{successData.players}</span>
                </div>
                <div className="success-card-row">
                  <span className="success-card-label">Slot</span>
                  <span className="success-card-value">
                    {DAY_FULL_NL[parseDateLocal(slotDateKey(successData.slot.date)).getDay()]}{" "}
                    {parseDateLocal(slotDateKey(successData.slot.date)).getDate()}{" "}
                    {MONTH_SHORT_NL[parseDateLocal(slotDateKey(successData.slot.date)).getMonth()]} · {getTime(successData.slot)}
                  </span>
                </div>
                <div className="success-card-row success-card-row--total">
                  <span className="success-card-label">Totaal</span>
                  <span className="success-card-total">€{successData.total}</span>
                </div>
              </div>
              <button className="btn-primary" style={{ marginTop:24 }} onClick={() => setSuccessData(null)}>
                Nog een slot boeken
              </button>
            </div>
          ) : (
            <div className="bk-layout">

              {/* ── LEFT / TOP: Calendar ── */}
              <div className="bk-cal-col">

                {/* Desktop full-month calendar */}
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
                          ].filter(Boolean).join(" ")}
                        >
                          {d.getDate()}
                          {avail && <span className="bk-cell-dot"/>}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* ── RIGHT / BELOW: Slots + Form ── */}
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

                    <div className="bk-slots-list">
                      {daySlots.map(slot => {
                        const active = selectedSlotId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            onClick={() => handleSelectSlot(slot.id)}
                            className={`bk-slot-row${active ? " bk-slot-row--active" : ""}`}
                          >
                            <span className="bk-slot-time">{getTime(slot)}</span>
                            <span className="bk-slot-meta">{slot.duration} min</span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedSlotId && (
                      <div className="bk-form-wrap" ref={formRef}>
                        {error && <div className="error-msg">{error}</div>}
                        <form onSubmit={handleSubmit} className="bk-form">
                          <div className="field">
                            <label className="field-label">Aantal spelers</label>
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
                                Prijs: <strong style={{ color:"#16a34a" }}>€{getPrice(formData.players)}</strong>
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
                              : "Bevestig boeking"}
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
      </section>

      {/* ── ABOUT ── */}
      <AboutSection/>

      {/* ── WHATSAPP CTA ── */}
      <div className="wa-cta-section">
        <a href="https://wa.me/31629896879" target="_blank" rel="noopener noreferrer" className="wa-cta-btn">
          WhatsApp
        </a>
      </div>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <p className="footer-copy">© {new Date().getFullYear()} Arn Braunschweiger</p>
          <div className="footer-links">
            <span>📍 Sportcentrum Hoorn</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

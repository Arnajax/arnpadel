"use client";

import { useState, useEffect, useRef, useMemo } from "react";

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

const DAY_NL = ["ZO", "MA", "DI", "WO", "DO", "VR", "ZA"];
const MONTH_NL = [
  "jan", "feb", "mrt", "apr", "mei", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateLocal(dateKey: string): Date {
  const [y, mo, d] = dateKey.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function slotDateKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function getTime(slot: Slot): string {
  return slot.time ?? slot.date.split("T")[1]?.slice(0, 5) ?? "";
}

function getPrice(players: number): number {
  return players <= 2 ? 80 : 90;
}

function ChevronDown() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckCircle() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#00c27c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

export default function Home() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string | number>>(new Set());
  const [formData, setFormData] = useState<FormData>({ name: "", phone: "", players: 2 });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const prevSlotCount = useRef(0);

  useEffect(() => {
    fetch("/api/slots")
      .then((res) => res.json())
      .then((data: { slots?: Slot[] } | Slot[]) => {
        setSlots(Array.isArray(data) ? data : (data.slots ?? []));
        setLoading(false);
      })
      .catch(() => { setSlots([]); setLoading(false); });
  }, []);

  useEffect(() => {
    if (selectedSlotIds.size > 0 && prevSlotCount.current === 0) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
    prevSlotCount.current = selectedSlotIds.size;
  }, [selectedSlotIds.size]);

  const firstSlotDate = useMemo(() => {
    if (slots.length === 0) return null;
    return slots.map((s) => slotDateKey(s.date)).sort()[0];
  }, [slots]);

  const weekDays = useMemo(() => {
    if (!firstSlotDate) return [];
    const base = parseDateLocal(firstSlotDate);
    base.setDate(base.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [firstSlotDate, weekOffset]);

  function hasSlotsForDate(dateKey: string): boolean {
    return slots.some((s) => slotDateKey(s.date) === dateKey);
  }

  function slotsForDate(dateKey: string): Slot[] {
    return slots.filter((s) => slotDateKey(s.date) === dateKey);
  }

  function handleSelectDate(dateKey: string) {
    if (!hasSlotsForDate(dateKey)) return;
    setSelectedDate(dateKey);
    setSelectedSlotIds(new Set());
    setError(null);
    setTimeout(() => {
      slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function toggleSlot(id: string | number) {
    setSelectedSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSlotIds.size === 0) {
      setError("Selecteer eerst een of meer slots hierboven.");
      return;
    }
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
          slotIds: Array.from(selectedSlotIds),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message ?? `Fout: ${res.status}`);
      }
      setSuccess(true);
      setFormData({ name: "", phone: "", players: 2 });
      setSelectedSlotIds(new Set());
      setSelectedDate(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er is iets misgegaan.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSlotsData = slots.filter((s) => selectedSlotIds.has(s.id));
  const price = getPrice(formData.players);
  const totalPrice = price * selectedSlotIds.size;
  const daySlots = selectedDate ? slotsForDate(selectedDate) : [];

  return (
    <div className="page-root">
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-glow" aria-hidden />
        <div className="hero-inner">
          <p className="hero-eyebrow">Privéles padel · Hoorn</p>
          <h1 className="hero-title">
            Verbeter je padel.<br />Nu boeken.
          </h1>
          <p className="hero-sub">
            Privéles met Arn Braunschweiger&nbsp;—&nbsp;Top-150 NL&nbsp;—&nbsp;Hoorn
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">9+</span>
              <span className="stat-label">jaar ervaring</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">Top-150</span>
              <span className="stat-label">Nederland</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">Alle</span>
              <span className="stat-label">niveaus</span>
            </div>
          </div>
        </div>
        <button
          className="hero-scroll"
          onClick={() => slotsRef.current?.scrollIntoView({ behavior: "smooth" })}
          aria-label="Scroll naar slots"
        >
          <ChevronDown />
        </button>
      </section>

      {/* ── STEP 1: WEEK CALENDAR STRIP ── */}
      <section className="slots-section" ref={slotsRef}>
        <div className="section-inner">
          <h2 className="section-title">Kies je moment</h2>

          {loading ? (
            <div className="cal-strip">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="cal-day cal-day--skeleton" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="empty-state">
              Geen slots beschikbaar — volg{" "}
              <a
                href="https://instagram.com/arnpadel"
                target="_blank"
                rel="noopener noreferrer"
                className="empty-link"
              >
                @arnpadel
              </a>{" "}
              op Instagram voor updates.
            </div>
          ) : (
            <div className="cal-nav">
              <button
                className="cal-arrow"
                onClick={() => setWeekOffset((o) => o - 1)}
                disabled={weekOffset === 0}
                aria-label="Vorige week"
              >
                <ChevronLeft />
              </button>

              <div className="cal-strip">
                {weekDays.map((d) => {
                  const key = toDateKey(d);
                  const available = hasSlotsForDate(key);
                  const isSelected = selectedDate === key;
                  return (
                    <button
                      key={key}
                      className={`cal-day${available ? " cal-day--available" : " cal-day--disabled"}${isSelected ? " cal-day--active" : ""}`}
                      onClick={() => handleSelectDate(key)}
                      disabled={!available}
                      aria-pressed={isSelected}
                    >
                      <span className="cal-day-abbr">{DAY_NL[d.getDay()]}</span>
                      <span className="cal-day-num">{d.getDate()}</span>
                      <span className="cal-day-month">{MONTH_NL[d.getMonth()]}</span>
                      {available && <span className="cal-dot" />}
                    </button>
                  );
                })}
              </div>

              <button
                className="cal-arrow"
                onClick={() => setWeekOffset((o) => o + 1)}
                aria-label="Volgende week"
              >
                <ChevronRight />
              </button>
            </div>
          )}

          {/* ── STEP 2: TIME SLOT CHIPS ── */}
          {selectedDate && daySlots.length > 0 && (
            <div className="chips-section">
              <div className="chips-row">
                {daySlots.map((slot) => {
                  const isChipSelected = selectedSlotIds.has(slot.id);
                  return (
                    <button
                      key={slot.id}
                      className={`chip${isChipSelected ? " chip--active" : ""}`}
                      onClick={() => toggleSlot(slot.id)}
                      aria-pressed={isChipSelected}
                    >
                      <span className="chip-time">{getTime(slot)}</span>
                      <span className="chip-dur">{slot.duration} min</span>
                    </button>
                  );
                })}
              </div>
              {selectedSlotIds.size > 0 && (
                <p className="slot-count">
                  {selectedSlotIds.size} slot{selectedSlotIds.size > 1 ? "s" : ""} geselecteerd
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── STEP 3: BOOKING FORM ── */}
      {selectedSlotIds.size > 0 && (
        <section className="form-section" ref={formRef}>
          <div className="section-inner">
            {success ? (
              <div className="success-block">
                <CheckCircle />
                <h3 className="success-title">Aanvraag ontvangen!</h3>
                <p className="success-sub">
                  Arn stuurt je een WhatsApp bevestiging.
                </p>
                <button
                  className="btn-primary"
                  style={{ marginTop: 24 }}
                  onClick={() => {
                    setSuccess(false);
                    slotsRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Nog een slot boeken
                </button>
              </div>
            ) : (
              <>
                <h2 className="section-title section-title--light">Aanvraag indienen</h2>

                <div className="summary-pills">
                  {selectedSlotsData.map((slot) => (
                    <span key={slot.id} className="selected-pill">
                      <span className="selected-pill-dot" />
                      {DAY_NL[new Date(slot.date).getDay()]}&nbsp;
                      {new Date(slot.date).getDate()}&nbsp;
                      {MONTH_NL[new Date(slot.date).getMonth()]}&nbsp;·&nbsp;
                      {getTime(slot)}
                    </span>
                  ))}
                </div>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit} className="booking-form">
                  <div className="field">
                    <label className="field-label" htmlFor="name">Naam</label>
                    <input
                      id="name"
                      type="text"
                      required
                      className="field-input"
                      placeholder="Jouw naam"
                      value={formData.name}
                      onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label" htmlFor="phone">Telefoon</label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      className="field-input"
                      placeholder="06 12 34 56 78"
                      value={formData.phone}
                      onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  <div className="field">
                    <label className="field-label">Aantal spelers</label>
                    <div className="players-grid">
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`player-btn${formData.players === n ? " player-btn--active" : ""}`}
                          onClick={() => setFormData((f) => ({ ...f, players: n }))}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="price-hint">
                      €{price} per slot · Totaal:{" "}
                      <strong style={{ color: "#00c27c" }}>€{totalPrice}</strong>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary btn-submit"
                  >
                    {submitting ? (
                      <span className="spinner-row">
                        <span className="spinner" />
                        Versturen…
                      </span>
                    ) : (
                      "Verstuur aanvraag 🎾"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Arn Braunschweiger</span>
        <span className="footer-dot">·</span>
        <a href="https://instagram.com/arnpadel" target="_blank" rel="noopener noreferrer" className="footer-link">
          Instagram
        </a>
        <span className="footer-dot">·</span>
        <a href="https://wa.me/31612345678" target="_blank" rel="noopener noreferrer" className="footer-link">
          WhatsApp
        </a>
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";

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

function parseDate(dateStr: string): Date {
  // handle both "2025-05-05" and "2025-05-05T10:00:00"
  return new Date(dateStr);
}

function getDayAbbr(dateStr: string): string {
  return DAY_NL[parseDate(dateStr).getDay()];
}

function getDayNum(dateStr: string): number {
  return parseDate(dateStr).getDate();
}

function getMonthAbbr(dateStr: string): string {
  return MONTH_NL[parseDate(dateStr).getMonth()];
}

function getTime(slot: Slot): string {
  return slot.time ?? slot.date.split("T")[1]?.slice(0, 5) ?? "";
}

function getPrice(players: number): number {
  return players <= 2 ? 80 : 90;
}

function SkeletonCard() {
  return (
    <div className="slot-card animate-pulse">
      <div style={{ height: 16, background: "#1a1a2e22", borderRadius: 6, width: "40%", marginBottom: 8 }} />
      <div style={{ height: 36, background: "#1a1a2e22", borderRadius: 6, width: "60%", marginBottom: 8 }} />
      <div style={{ height: 14, background: "#1a1a2e11", borderRadius: 6, width: "30%", marginBottom: 20 }} />
      <div style={{ height: 42, background: "#00c27c33", borderRadius: 10 }} />
    </div>
  );
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
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: "", phone: "", players: 2 });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/slots")
      .then((res) => res.json())
      .then((data: { slots?: Slot[] } | Slot[]) => { setSlots(Array.isArray(data) ? data : (data.slots ?? [])); setLoading(false); })
      .catch(() => { setSlots([]); setLoading(false); });
  }, []);

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setSuccess(false);
    setError(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) { setError("Selecteer eerst een slot hierboven."); return; }
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
          slotId: selectedSlot.id,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message ?? `Fout: ${res.status}`);
      }
      setSuccess(true);
      setFormData({ name: "", phone: "", players: 2 });
      setSelectedSlot(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Er is iets misgegaan.");
    } finally {
      setSubmitting(false);
    }
  }

  const price = getPrice(formData.players);

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

      {/* ── SLOTS ── */}
      <section className="slots-section" ref={slotsRef}>
        <div className="section-inner">
          <h2 className="section-title">Kies je moment</h2>

          {loading ? (
            <div className="slots-grid">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
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
            <div className="slots-grid">
              {slots.map((slot) => {
                const isSelected = selectedSlot?.id === slot.id;
                const time = getTime(slot);
                return (
                  <div
                    key={slot.id}
                    className={`slot-card${isSelected ? " slot-card--selected" : ""}`}
                  >
                    <div className="slot-date">
                      <span className="slot-day">{getDayAbbr(slot.date)}</span>
                      <span className="slot-num">{getDayNum(slot.date)}</span>
                      <span className="slot-month">{getMonthAbbr(slot.date)}</span>
                    </div>
                    <div className="slot-time">{time}</div>
                    <div className="slot-meta">
                      <span className="slot-pill">{slot.duration} min</span>
                    </div>
                    <div className="slot-price">vanaf €80</div>
                    <button
                      className={`slot-btn${isSelected ? " slot-btn--active" : ""}`}
                      onClick={() => handleSelectSlot(slot)}
                    >
                      {isSelected ? "Geselecteerd ✓" : "Boek"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── BOOKING FORM ── */}
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
                onClick={() => { setSuccess(false); slotsRef.current?.scrollIntoView({ behavior: "smooth" }); }}
              >
                Nog een slot boeken
              </button>
            </div>
          ) : (
            <>
              <h2 className="section-title section-title--light">Aanvraag indienen</h2>

              {selectedSlot && (
                <div className="selected-pill">
                  <span className="selected-pill-dot" />
                  {getDayAbbr(selectedSlot.date)}&nbsp;{getDayNum(selectedSlot.date)}&nbsp;{getMonthAbbr(selectedSlot.date)}&nbsp;·&nbsp;{getTime(selectedSlot)}
                </div>
              )}

              {!selectedSlot && (
                <p className="form-hint">
                  Selecteer eerst een slot hierboven om verder te gaan.
                </p>
              )}

              {error && (
                <div className="error-msg">{error}</div>
              )}

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
                    Totaal: <strong style={{ color: "#00c27c" }}>€{price}</strong>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedSlot}
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

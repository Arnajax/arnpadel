"use client";

import { useState } from "react";

type Niveau = "beginner" | "gevorderd" | "competitie";
const NIVEAUS: { id: Niveau; label: string }[] = [
  { id: "beginner", label: "Beginner" },
  { id: "gevorderd", label: "Gevorderd" },
  { id: "competitie", label: "Competitie" },
];

// Pas dit nummer aan als de business-WhatsApp wijzigt.
const WHATSAPP = "31646016499";

export default function VideoAnalyseClient() {
  const [niveau, setNiveau] = useState<Niveau | null>(null);
  const [form, setForm] = useState({
    naam: "",
    telefoon: "",
    email: "",
    focuspunt: "",
    bericht: "",
    website: "", // honeypot
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!niveau) {
      setError("Kies eerst je niveau.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/video-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, niveau }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? `Er ging iets mis (${res.status}).`);
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is iets misgegaan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    const waText = encodeURIComponent(`Hoi! Ik heb een video-analyse aangevraagd (${form.naam}). Hier is mijn video:`);
    return (
      <div className="success-block">
        <h3 className="success-title">Aanvraag ontvangen 🎥</h3>
        <p className="success-sub">
          Top! We nemen contact op. Stuur je video via WhatsApp, dan analyseren we je techniek en
          krijg je concrete verbeterpunten terug.
        </p>
        <a
          href={`https://wa.me/${WHATSAPP}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-confirm"
          style={{ display: "inline-block", textAlign: "center", marginBottom: 16 }}
        >
          Stuur je video via WhatsApp →
        </a>
        <p className="fp-note">
          Tip: film vanaf de zijkant of achter de baan, zodat je slagen goed in beeld zijn. Een paar
          rally&apos;s of een hele game is genoeg.
        </p>
        <a href="/" className="btn-primary" style={{ marginTop: 24, display: "inline-block" }}>
          Terug naar home
        </a>
      </div>
    );
  }

  return (
    <form className="fp-card" onSubmit={handleSubmit}>
      <h2 className="fp-card-title">Vraag je video-analyse aan</h2>

      <div className="field">
        <label className="field-label">Je niveau</label>
        <div className="fp-seg fp-seg--three">
          {NIVEAUS.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`fp-seg-btn${niveau === n.id ? " fp-seg-btn--active" : ""}`}
              onClick={() => setNiveau(n.id)}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="v-naam">Naam</label>
        <input id="v-naam" type="text" required className="field-input" placeholder="Jouw naam"
          value={form.naam} onChange={(e) => set("naam", e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="v-phone">Telefoon</label>
        <input id="v-phone" type="tel" required className="field-input" placeholder="06 12 34 56 78"
          value={form.telefoon} onChange={(e) => set("telefoon", e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="v-email">E-mail</label>
        <input id="v-email" type="email" required className="field-input" placeholder="naam@email.nl"
          value={form.email} onChange={(e) => set("email", e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="v-focus">
          Waar wil je op gecoacht worden? <small style={{ fontWeight: 400, color: "#666" }}>(optioneel)</small>
        </label>
        <input id="v-focus" type="text" className="field-input" placeholder="bv. forehand, positiespel, smash"
          value={form.focuspunt} onChange={(e) => set("focuspunt", e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="v-bericht">
          Bericht <small style={{ fontWeight: 400, color: "#666" }}>(optioneel)</small>
        </label>
        <textarea id="v-bericht" className="field-input fp-textarea" placeholder="Iets dat we moeten weten?"
          value={form.bericht} onChange={(e) => set("bericht", e.target.value)} />
      </div>

      {/* honeypot */}
      <div className="fp-hp" aria-hidden>
        <label htmlFor="v-website">Website</label>
        <input id="v-website" type="text" tabIndex={-1} autoComplete="off"
          value={form.website} onChange={(e) => set("website", e.target.value)} />
      </div>

      {error && <div className="error-msg">{error}</div>}

      <button type="submit" disabled={submitting} className="btn-confirm">
        {submitting ? "Versturen…" : "Aanvragen"}
      </button>
      <p className="fp-note">Na je aanvraag stuur je de video eenvoudig via WhatsApp. Geen upload nodig.</p>
    </form>
  );
}

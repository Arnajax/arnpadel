"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

// Indicatie-prijslogica — moet de CLINIC_*-constanten in padel_booking.py spiegelen.
// De server blijft autoritatief: bij verzenden komt het echte bedrag terug.
const PREVIEW = { ppEuro: 27.5, minDeelnemers: 8, tweedeTrainerVanaf: 13, tweedeTrainerEuro: 75, extraUurEuro: 17.5 };

type ClinicType = "bedrijfsuitje" | "vrienden";

interface OfferteResult {
  offerte_bedrag: number;
  prijs_pp: number;
  billable_deelnemers?: number;
  extra_uur?: boolean;
  extra_uur_bedrag?: number;
}

type ExtraKey = "extra_uur" | "borrel" | "diner";

export default function ClinicsClient() {
  const [type, setType] = useState<ClinicType | null>(null);
  const [form, setForm] = useState({
    contactpersoon: "",
    bedrijf_of_gelegenheid: "",
    deelnemers: "",
    voorkeursdatum: "",
    telefoon: "",
    email: "",
    bericht: "",
    website: "", // honeypot
  });
  const [extras, setExtras] = useState<Record<ExtraKey, boolean>>({
    extra_uur: false,
    borrel: false,
    diner: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<OfferteResult | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleExtra(k: ExtraKey) {
    setExtras((e) => ({ ...e, [k]: !e[k] }));
  }

  // Live richtprijs-indicatie zodra het aantal deelnemers bekend is.
  const preview = useMemo(() => {
    const n = parseInt(form.deelnemers, 10);
    if (!Number.isFinite(n) || n < 1) return null;
    const billable = Math.max(n, PREVIEW.minDeelnemers);
    let total = billable * PREVIEW.ppEuro;
    if (n >= PREVIEW.tweedeTrainerVanaf) total += PREVIEW.tweedeTrainerEuro;
    if (extras.extra_uur) total += billable * PREVIEW.extraUurEuro;
    return { total, billable, n };
  }, [form.deelnemers, extras.extra_uur]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) {
      setError("Kies eerst het type clinic.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...extras, type, deelnemers: Number(form.deelnemers) }),
      });
      const data = (await res.json().catch(() => null)) as
        | (OfferteResult & { error?: string })
        | null;
      if (!res.ok || !data) {
        throw new Error(data?.error ?? `Er ging iets mis (${res.status}).`);
      }
      setSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is iets misgegaan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="success-block">
        <h3 className="success-title">Aanvraag ontvangen 🎾</h3>
        <p className="success-sub">
          Bedankt! Hieronder je richtprijs op basis van het aantal deelnemers. We nemen snel
          contact op om de clinic in te plannen en de offerte definitief te maken.
        </p>
        <div className="fp-offerte" style={{ marginBottom: 20 }}>
          <span className="fp-offerte-label">Richtprijs</span>
          <span className="fp-offerte-amount">€{success.offerte_bedrag.toFixed(2)}</span>
        </div>
        <p className="fp-note">
          Indicatie voor een clinic van 1 uur op basis van €{success.prijs_pp.toFixed(2)} per persoon
          {success.billable_deelnemers ? ` × ${success.billable_deelnemers} deelnemers` : ""}, inclusief trainer en begeleiding.
          {success.extra_uur ? ` Inclusief een 2e uur met toernooibegeleiding (+€${(success.extra_uur_bedrag ?? 0).toFixed(2)}).` : ""}
          {(extras.borrel || extras.diner) ? " Borrel, hapjes of diner stemmen we erbij af in de offerte." : ""}
          {" "}De definitieve prijs stemmen we samen af.
        </p>
        <Link href="/" className="btn-primary" style={{ marginTop: 24, display: "inline-block" }}>
          Terug naar home
        </Link>
      </div>
    );
  }

  return (
    <form className="fp-card" onSubmit={handleSubmit}>
      <h2 className="fp-card-title">Vraag een offerte aan</h2>

      <div className="field">
        <label className="field-label" id="c-type-label">Type clinic</label>
        <div className="fp-seg" role="radiogroup" aria-labelledby="c-type-label">
          <button
            type="button" role="radio" aria-checked={type === "bedrijfsuitje"}
            className={`fp-seg-btn${type === "bedrijfsuitje" ? " fp-seg-btn--active" : ""}`}
            onClick={() => setType("bedrijfsuitje")}
          >
            Bedrijfsuitje / teambuilding
          </button>
          <button
            type="button" role="radio" aria-checked={type === "vrienden"}
            className={`fp-seg-btn${type === "vrienden" ? " fp-seg-btn--active" : ""}`}
            onClick={() => setType("vrienden")}
          >
            Vrienden / groep
          </button>
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="c-org">
          {type === "vrienden" ? "Gelegenheid" : "Bedrijfsnaam"}{" "}
          <small style={{ fontWeight: 400, color: "#666" }}>(optioneel)</small>
        </label>
        <input id="c-org" type="text" className="field-input"
          placeholder={type === "vrienden" ? "bv. verjaardag, vrijgezellenfeest" : "bv. ACME B.V."}
          value={form.bedrijf_of_gelegenheid} onChange={(e) => set("bedrijf_of_gelegenheid", e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="c-deelnemers">Aantal deelnemers</label>
        <input id="c-deelnemers" type="number" required min={1} max={100} inputMode="numeric"
          className="field-input" placeholder="bv. 12"
          value={form.deelnemers} onChange={(e) => set("deelnemers", e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="c-datum">
          Voorkeursdatum of periode <small style={{ fontWeight: 400, color: "#666" }}>(optioneel)</small>
        </label>
        <input id="c-datum" type="text" className="field-input" placeholder="bv. zaterdag in juli, of een vrijdagavond"
          value={form.voorkeursdatum} onChange={(e) => set("voorkeursdatum", e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label">Maak het compleet <small style={{ fontWeight: 400, color: "#666" }}>(optioneel)</small></label>
        <div className="cl-opts">
          <button type="button" className={`cl-opt${extras.extra_uur ? " cl-opt--active" : ""}`} onClick={() => toggleExtra("extra_uur")} aria-pressed={extras.extra_uur}>
            <span className="cl-opt-check" aria-hidden>{extras.extra_uur ? "✓" : "+"}</span>
            <span className="cl-opt-text"><strong>Toernooibegeleiding (+1 uur)</strong></span>
          </button>
          <button type="button" className={`cl-opt${extras.borrel ? " cl-opt--active" : ""}`} onClick={() => toggleExtra("borrel")} aria-pressed={extras.borrel}>
            <span className="cl-opt-check" aria-hidden>{extras.borrel ? "✓" : "+"}</span>
            <span className="cl-opt-text"><strong>Borrel &amp; hapjes</strong><small>Napraten met een drankje en wat lekkers (prijs in offerte)</small></span>
          </button>
          <button type="button" className={`cl-opt${extras.diner ? " cl-opt--active" : ""}`} onClick={() => toggleExtra("diner")} aria-pressed={extras.diner}>
            <span className="cl-opt-check" aria-hidden>{extras.diner ? "✓" : "+"}</span>
            <span className="cl-opt-text"><strong>Diner erbij</strong><small>Voor of na de clinic samen aan tafel (prijs in offerte)</small></span>
          </button>
        </div>
      </div>

      {preview && (
        <div className="cl-preview" aria-live="polite">
          <div className="cl-preview-row">
            <span className="cl-preview-label">Richtprijs (indicatie)</span>
            <span className="cl-preview-amount">€{preview.total.toFixed(0)}</span>
          </div>
          <p className="cl-preview-note">
            Voor 1 uur, €{PREVIEW.ppEuro.toFixed(2).replace(".", ",")} p.p. × {preview.billable}
            {preview.n >= PREVIEW.tweedeTrainerVanaf ? " + 2e trainer" : ""}
            {extras.extra_uur ? " + 2e uur toernooibegeleiding" : ""}. Vul je gegevens in voor de definitieve offerte.
          </p>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="c-contact">Contactpersoon</label>
        <input id="c-contact" type="text" required className="field-input" placeholder="Jouw naam"
          value={form.contactpersoon} onChange={(e) => set("contactpersoon", e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="c-phone">Telefoon</label>
        <input id="c-phone" type="tel" required className="field-input" placeholder="06 12 34 56 78"
          value={form.telefoon} onChange={(e) => set("telefoon", e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="c-email">E-mail</label>
        <input id="c-email" type="email" required className="field-input" placeholder="naam@bedrijf.nl"
          value={form.email} onChange={(e) => set("email", e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="c-bericht">
          Bericht <small style={{ fontWeight: 400, color: "#666" }}>(optioneel)</small>
        </label>
        <textarea id="c-bericht" className="field-input fp-textarea" placeholder="Vertel kort wat je voor ogen hebt."
          value={form.bericht} onChange={(e) => set("bericht", e.target.value)} />
      </div>

      {/* honeypot */}
      <div className="fp-hp" aria-hidden>
        <label htmlFor="c-website">Website</label>
        <input id="c-website" type="text" tabIndex={-1} autoComplete="off"
          value={form.website} onChange={(e) => set("website", e.target.value)} />
      </div>

      {error && <div className="error-msg" role="alert">{error}</div>}

      <button type="submit" disabled={submitting} className="btn-confirm">
        {submitting ? "Versturen…" : "Bevestig en vraag offerte aan"}
      </button>
      <p className="fp-note">Je krijgt direct een richtprijs te zien. Geen betaling, geen verplichting.</p>
    </form>
  );
}

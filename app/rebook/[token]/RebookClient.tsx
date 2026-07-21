"use client";

import { useState } from "react";
import Link from "next/link";

export type RebookInfo = {
  ok: boolean;
  error?: string;
  trainer_id?: string;
  trainer_naam?: string;
  naam?: string;
  datum?: string; // YYYY-MM-DD (zelfde tijd +1 week)
  tijd?: string; // HH:MM
  aantal_spelers?: number;
  available?: boolean;
  already?: boolean;
  expired?: boolean;
  site_url?: string;
};

const DAY_NL = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MONTH_NL = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDatum(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return `${DAY_NL[dt.getDay()]} ${d} ${MONTH_NL[m - 1]}`;
}

const COURT = "#15633a";

export default function RebookClient({ token, info }: { token: string; info: RebookInfo | null }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "unavailable" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const siteUrl = info?.site_url ?? "/";
  const trainerVoornaam = (info?.trainer_naam ?? "").split(" ")[0] || "de trainer";

  async function confirm() {
    setState("loading");
    try {
      const res = await fetch(`/api/rebook/${encodeURIComponent(token)}`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setState("done");
      } else if (data && data.available === false) {
        setState("unavailable");
        setMessage(data.message ?? "Die tijd is net vergeven.");
      } else {
        setState("error");
        setMessage(data?.error ?? "Er ging iets mis. Probeer het zo opnieuw.");
      }
    } catch {
      setState("error");
      setMessage("Geen verbinding. Probeer het zo opnieuw.");
    }
  }

  // ── Onbruikbare token / laadfout ──
  if (!info || !info.ok) {
    return (
      <Shell>
        <h1 style={h1}>Link werkt niet</h1>
        <p style={sub}>{info?.error ?? "Deze rebook-link is ongeldig of verlopen."}</p>
        <Link href="/" style={secondaryBtn}>Naar de site →</Link>
      </Shell>
    );
  }

  const when = `${formatDatum(info.datum)} om ${info.tijd}`;

  // ── Eindstaten ──
  if (state === "done") {
    return (
      <Shell>
        <Check />
        <h1 style={h1}>Aangevraagd! 🎾</h1>
        <p style={sub}>Je aanvraag voor <b>{when}</b> is binnen. {trainerVoornaam} bevestigt zo via WhatsApp.</p>
      </Shell>
    );
  }
  if (state === "unavailable" || info.expired || info.available === false) {
    const txt = info.expired
      ? "Deze les is inmiddels geweest."
      : (message || "Die tijd is volgende week niet meer vrij.");
    return (
      <Shell>
        <h1 style={h1}>Kies een andere tijd</h1>
        <p style={sub}>{txt}</p>
        <a href={siteUrl} style={primaryBtn}>Bekijk beschikbare tijden →</a>
      </Shell>
    );
  }
  if (info.already) {
    return (
      <Shell>
        <Check />
        <h1 style={h1}>Al aangevraagd</h1>
        <p style={sub}>Je hebt <b>{when}</b> al aangevraagd. {trainerVoornaam} neemt contact op via WhatsApp.</p>
      </Shell>
    );
  }

  // ── Beschikbaar: bevestigen ──
  return (
    <Shell>
      <h1 style={h1}>Zelfde tijd, volgende week?</h1>
      <p style={sub}>Boek je vaste moment met {trainerVoornaam} in één tik.</p>
      <div style={card}>
        <Row label="Trainer" value={info.trainer_naam ?? ""} />
        <Row label="Wanneer" value={when} />
        <Row label="Spelers" value={String(info.aantal_spelers ?? 2)} />
      </div>
      <button onClick={confirm} disabled={state === "loading"} style={{ ...primaryBtn, opacity: state === "loading" ? 0.6 : 1 }}>
        {state === "loading" ? "Bezig…" : "Ja, boek dezelfde tijd →"}
      </button>
      {state === "error" && <p style={{ ...sub, color: "#b00020", marginTop: 12 }}>{message}</p>}
      <a href={siteUrl} style={secondaryBtn}>Liever een andere tijd?</a>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#f6f5f0",
      color: "#1a2b3c",
      padding: "32px 20px",
      fontFamily: "var(--font-space-grotesk), var(--font-inter), system-ui, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>{children}</div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eceae3" }}>
      <span style={{ color: "#6b7280", fontSize: "0.92rem" }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{value}</span>
    </div>
  );
}

function Check() {
  return (
    <div style={{ width: 56, height: 56, borderRadius: "50%", background: COURT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    </div>
  );
}

const h1: React.CSSProperties = { fontSize: "1.5rem", fontWeight: 800, margin: "0 0 8px" };
const sub: React.CSSProperties = { color: "#6b7280", fontSize: "0.98rem", margin: "0 0 24px", lineHeight: 1.5 };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #eceae3", borderRadius: 14, padding: "8px 18px", marginBottom: 24, textAlign: "left" };
const primaryBtn: React.CSSProperties = { display: "block", width: "100%", background: COURT, color: "#fff", border: "none", borderRadius: 12, padding: "16px 20px", fontSize: "1.02rem", fontWeight: 700, cursor: "pointer", textDecoration: "none", textAlign: "center" };
const secondaryBtn: React.CSSProperties = { display: "inline-block", marginTop: 16, color: "#6b7280", fontSize: "0.92rem", textDecoration: "underline" };

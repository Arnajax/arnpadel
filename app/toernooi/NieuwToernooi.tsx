"use client";

import { useEffect, useState } from "react";

import { DEFAULT_LOCATION, DEFAULT_TITLE, PRESETS, addDays, defaultSplit } from "../_lib/toernooi/core.js";
import RoundSplit from "./_lib/RoundSplit";
import { SideSelect, TimeSelect, type Side } from "./_lib/controls";
import { api, resizeToJpeg, saveMine, type View } from "./_lib/client";

const CODE_KEY = "phh-toernooi-organisatiecode";

async function checkCode(code: string) {
  const res = await fetch("/api/toernooi/code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  }).catch(() => null);
  return !!res && res.ok;
}

const readCode = () => {
  try {
    return window.localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
};

type Created = { code: string; admin_key: string; player: { id: string; token: string } | null };

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export default function NieuwToernooi({ defaultDate, needsCode }: { defaultDate: string; needsCode: boolean }) {
  const [form, setForm] = useState({
    title: DEFAULT_TITLE,
    location: DEFAULT_LOCATION,
    date: defaultDate,
    start: "09:00",
    end: "11:00",
    organizer_name: "",
    price_text: "",
    pay_url: "",
    website: "",
  });
  const [courts, setCourts] = useState(3);
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [maxTouched, setMaxTouched] = useState(false);
  // Indeling: standaard wat het best in de speeltijd past (2 uur → 3 x 40). Volgt de tijd, tot je zelf kiest.
  const [split, setSplit] = useState<{ rounds: number; minutes: number; auto: boolean }>(() => ({ ...defaultSplit(120), auto: true }));
  const [header, setHeader] = useState<string>(PRESETS[0]);
  const [ownPhoto, setOwnPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [plays, setPlays] = useState(true);
  const [organizerSide, setOrganizerSide] = useState<Side | null>(null);
  // Wachtwoord voor organisatoren: eerst de deur, dan het formulier. Spelers hebben het niet nodig.
  const [orgCode, setOrgCode] = useState("");
  const [unlocked, setUnlocked] = useState(!needsCode);
  const [gateInput, setGateInput] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al eens goed ingevuld op deze telefoon? Dan meteen door.
  useEffect(() => {
    if (!needsCode) return;
    const saved = readCode();
    if (!saved) return;
    checkCode(saved).then((ok) => {
      if (ok) {
        setOrgCode(saved);
        setUnlocked(true);
      }
    });
  }, [needsCode]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setGateBusy(true);
    setGateError(null);
    const code = gateInput.trim().toLowerCase();
    if (await checkCode(code)) {
      try {
        window.localStorage.setItem(CODE_KEY, code);
      } catch {
        // niet erg: dan vraagt hij het de volgende keer weer
      }
      setOrgCode(code);
      setUnlocked(true);
    } else {
      setGateError("Dat wachtwoord klopt niet.");
    }
    setGateBusy(false);
  }

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("van");
    if (!from) return;
    // "Volgende week weer": zelfde instellingen, een week later.
    api<View>(`/api/toernooi/${encodeURIComponent(from)}`)
      .then((v) => {
        setForm((f) => ({
          ...f,
          title: v.title,
          location: v.location,
          date: addDays(v.date, 7),
          start: v.start,
          end: v.end,
          organizer_name: v.organizer_name,
          price_text: v.price_text ?? "",
          pay_url: "",
        }));
        setCourts(v.courts);
        setMaxPlayers(v.max_players);
        setMaxTouched(v.max_players !== v.courts * 4);
        setSplit({ rounds: v.rounds, minutes: v.round_minutes, auto: false });
        if (v.header.kind === "preset") setHeader(v.header.id);
      })
      .catch(() => undefined);
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Andere tijd: indeling opnieuw kiezen als die automatisch was of niet meer past.
  function setTime(k: "start" | "end", v: string) {
    const next = { ...form, [k]: v };
    setForm(next);
    if (!/^\d{2}:\d{2}$/.test(next.start) || !/^\d{2}:\d{2}$/.test(next.end)) return;
    const duration = toMinutes(next.end) - toMinutes(next.start);
    if (duration <= 0) return;
    if (split.auto || split.rounds * split.minutes > duration) setSplit({ ...defaultSplit(duration), auto: true });
  }

  function changeCourts(n: number) {
    const c = Math.min(8, Math.max(1, n));
    setCourts(c);
    if (!maxTouched) setMaxPlayers(c * 4);
  }

  const duration = /^\d{2}:\d{2}$/.test(form.start) && /^\d{2}:\d{2}$/.test(form.end) ? toMinutes(form.end) - toMinutes(form.start) : 0;

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const blob = await resizeToJpeg(file, { size: 1600, square: false, maxBytes: 280 * 1024 });
      if (ownPhoto) URL.revokeObjectURL(ownPhoto.url);
      setOwnPhoto({ blob, url: URL.createObjectURL(blob) });
      setHeader("eigen");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deze foto lukt niet. Kies een andere.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.organizer_name.trim()) {
      setError("Vul je naam in, dan weten spelers wie organiseert.");
      return;
    }
    if (duration <= 0) {
      setError("De eindtijd moet na de begintijd liggen.");
      return;
    }
    if (split.rounds < 1 || split.minutes < 5 || split.rounds * split.minutes > duration) {
      setError("Deze indeling past niet in de speeltijd. Kies een andere.");
      return;
    }
    if (plays && !organizerSide) {
      setError("Kies of je zelf links, rechts of allebei speelt.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        ...form,
        create_code: orgCode,
        organizer_side: organizerSide,
        courts,
        max_players: maxPlayers,
        rounds: split.rounds,
        round_minutes: split.minutes,
        header: { kind: "preset", id: header === "eigen" ? PRESETS[0] : header },
        organizer_plays: plays,
      };
      const created = await api<Created>("/api/toernooi", { method: "POST", body: JSON.stringify(body) });
      saveMine(created.code, {
        adminKey: created.admin_key,
        playerId: created.player?.id,
        token: created.player?.token,
      });
      if (header === "eigen" && ownPhoto) {
        await fetch(`/api/toernooi/${created.code}/photo`, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg", "x-target": "header", "x-beheer": created.admin_key },
          body: ownPhoto.blob,
        }).catch(() => undefined);
      }
      // De sleutel gaat ook mee in het #-deel: werkt zelfs als deze browser niets onthoudt.
      window.location.assign(`/toernooi/${created.code}?nieuw=1#beheer=${created.admin_key}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Er ging iets mis.";
      if (/wachtwoord/i.test(msg)) {
        setUnlocked(false);
        setGateError(msg);
      }
      setError(msg);
      setBusy(false);
    }
  }

  if (!unlocked) {
    return (
      <form className="tn-card tn-card--framed" onSubmit={unlock} noValidate>
        <p className="tn-card-label">Alleen voor organisatoren</p>
        <p className="tn-note" style={{ marginTop: 0, marginBottom: 14 }}>
          Vul het wachtwoord in om een toernooi klaar te zetten. Meedoen kan iedereen via de link die de organisator deelt.
        </p>
        {gateError && <p className="tn-error" role="alert">{gateError}</p>}
        <div className="tn-field">
          <label htmlFor="tn-gate">Wachtwoord</label>
          <input
            id="tn-gate"
            className="tn-input"
            type="password"
            autoComplete="current-password"
            autoCapitalize="none"
            value={gateInput}
            onChange={(e) => setGateInput(e.target.value)}
          />
        </div>
        <button type="submit" className="tn-btn tn-btn--block" disabled={gateBusy || !gateInput.trim()}>
          {gateBusy ? "Even kijken…" : "Verder →"}
        </button>
      </form>
    );
  }

  return (
    <form className="tn-card tn-card--framed" onSubmit={submit} noValidate>
      <p className="tn-card-label">Nieuw toernooi</p>
      {error && <p className="tn-error" role="alert">{error}</p>}

      <div className="tn-row">
        <div className="tn-field">
          <label htmlFor="tn-date">Datum</label>
          <input id="tn-date" type="date" className="tn-input" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="tn-field">
          <label htmlFor="tn-loc">Waar</label>
          <input id="tn-loc" className="tn-input" maxLength={50} value={form.location} onChange={(e) => set("location", e.target.value)} />
        </div>
      </div>

      <div className="tn-row">
        <TimeSelect id="tn-start" label="Van" value={form.start} onChange={(v) => setTime("start", v)} />
        <TimeSelect id="tn-end" label="Tot" value={form.end} after={form.start} onChange={(v) => setTime("end", v)} />
      </div>

      <div className="tn-row">
        <div className="tn-field">
          <span className="tn-legend">Banen</span>
          <div className="tn-stepper">
            <button type="button" aria-label="Minder banen" onClick={() => changeCourts(courts - 1)}>−</button>
            <output aria-live="polite">{courts}</output>
            <button type="button" aria-label="Meer banen" onClick={() => changeCourts(courts + 1)}>+</button>
          </div>
        </div>
        <RoundSplit
          id="tn-split"
          start={form.start}
          end={form.end}
          rounds={split.rounds}
          minutes={split.minutes}
          onChange={(r, m) => setSplit({ rounds: r, minutes: m, auto: false })}
        />
      </div>

      <div className="tn-field">
        <label htmlFor="tn-name">Jouw naam</label>
        <input id="tn-name" className="tn-input" autoComplete="given-name" maxLength={40} value={form.organizer_name} onChange={(e) => set("organizer_name", e.target.value)} placeholder="Bijvoorbeeld Wessel" />
      </div>
      <label className="tn-check">
        <input type="checkbox" checked={plays} onChange={(e) => setPlays(e.target.checked)} />
        Ik speel zelf mee
      </label>
      {plays && <SideSelect label="Ik speel" value={organizerSide} onChange={setOrganizerSide} />}


      <details className="tn-more">
        <summary>Meer opties</summary>
        <div className="tn-field">
          <label htmlFor="tn-title">Naam van het toernooi</label>
          <input id="tn-title" className="tn-input" value={form.title} maxLength={60} onChange={(e) => set("title", e.target.value)} />
        </div>

        <div className="tn-field">
          <label htmlFor="tn-max">Max spelers</label>
          <input
            id="tn-max"
            type="number"
            inputMode="numeric"
            min={4}
            max={40}
            className="tn-input"
            value={maxPlayers}
            onChange={(e) => {
              setMaxTouched(true);
              setMaxPlayers(Number(e.target.value));
            }}
          />
        </div>

        <div className="tn-field">
          <span className="tn-legend">Sfeerfoto</span>
          <div className="tn-pics">
            {PRESETS.map((id: string) => (
              <button key={id} type="button" className="tn-pic" aria-pressed={header === id} aria-label={`Sfeerfoto ${id.slice(-1)}`} onClick={() => setHeader(id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/toernooi/${id}.jpg`} alt="" />
              </button>
            ))}
            {ownPhoto ? (
              <button type="button" className="tn-pic" aria-pressed={header === "eigen"} aria-label="Eigen foto" onClick={() => setHeader("eigen")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ownPhoto.url} alt="" />
              </button>
            ) : (
              <label className="tn-pic tn-pic--own">
                <input type="file" accept="image/*" hidden onChange={pickPhoto} />
                Eigen foto
              </label>
            )}
          </div>
        </div>

        <div className="tn-row">
          <div className="tn-field">
            <label htmlFor="tn-price">Prijs p.p.</label>
            <input id="tn-price" className="tn-input" maxLength={20} value={form.price_text} onChange={(e) => set("price_text", e.target.value)} placeholder="€7,50" />
          </div>
          <div className="tn-field">
            <label htmlFor="tn-pay">Tikkie-link</label>
            <input id="tn-pay" className="tn-input" inputMode="url" value={form.pay_url} onChange={(e) => set("pay_url", e.target.value)} placeholder="Kan ook later" />
          </div>
        </div>
      </details>


      <div className="tn-hp" aria-hidden>
        <label htmlFor="tn-website">Website</label>
        <input id="tn-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
      </div>

      <button type="submit" className="tn-btn tn-btn--block" disabled={busy} style={{ marginTop: 18 }}>
        {busy ? "Even klaarzetten…" : "Zet klaar →"}
      </button>
      <p className="tn-note">Je krijgt meteen een link voor de groep en je eigen beheerlink.</p>
    </form>
  );
}

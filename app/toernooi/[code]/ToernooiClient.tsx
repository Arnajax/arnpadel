"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BOOK_URL,
  PRESETS,
  adminSelfText,
  courtName,
  formatDateShort,
  initials,
  inviteText,
  isOpenSlot,
  isSportcentrumHoorn,
  prettyTime,
  scheduleText,
  schedulePageRanges,
  shortNames,
  updateText,
} from "@/app/_lib/toernooi/core.js";
import RoundSplit from "../_lib/RoundSplit";
import { SideSelect, TimeSelect, sideShort, sideWord, type Side } from "../_lib/controls";
import {
  api,
  copyText,
  headerSrc,
  loadMine,
  photoSrc,
  resizeToJpeg,
  saveMine,
  waLink,
  type Mine,
  type Player,
  type View,
} from "../_lib/client";

type Confirm = { title: string; text: string; label: string; danger?: boolean; run: () => Promise<unknown> | void };

function Avatar({ code, p, size }: { code: string; p: Pick<Player, "id" | "photo" | "name">; size?: "lg" }) {
  const src = photoSrc(code, p);
  return (
    <span className={`tn-avatar${size === "lg" ? " tn-avatar--lg" : ""}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" /> : initials(p.name)}
    </span>
  );
}

export default function ToernooiClient({ initial }: { initial: View }) {
  const code = initial.code;
  const [view, setView] = useState<View>(initial);
  const [mine, setMine] = useState<Mine>({});
  const [isNew, setIsNew] = useState(false);
  const [origin, setOrigin] = useState("https://padelhubhoorn.nl");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [leaveMode, setLeaveMode] = useState(false);
  const [name, setName] = useState("");
  const [side, setSide] = useState<Side | null>(null);
  const [hp, setHp] = useState("");
  // De foto's horen bij één versie van het toernooi; delen kan pas als die versie klaar is.
  const [png, setPng] = useState<{ v: number; files: File[] } | null>(null);
  const [pngTry, setPngTry] = useState(0); // opnieuw proberen na een tijdelijke fout
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const admin = !!view.admin && !!mine.adminKey;
  const adminKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    adminKeyRef.current = mine.adminKey;
  }, [mine.adminKey]);
  const url = `${origin}/toernooi/${code}`;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(
    async (key?: string) => {
      try {
        const v = await api<View>(`/api/toernooi/${code}`, { adminKey: key });
        // Een trager antwoord mag een nieuwere stand (bv. net gehusseld) niet overschrijven.
        setView((cur) => (v.version >= cur.version ? v : cur));
        return v;
      } catch {
        return null;
      }
    },
    [code],
  );

  // Eerste keer: sleutel uit het #-deel halen, onthouden en uit de adresbalk wissen.
  useEffect(() => {
    setOrigin(window.location.origin);
    const params = new URLSearchParams(window.location.search);
    if (params.get("nieuw") === "1") setIsNew(true);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    let m: Mine = loadMine(code);
    const fromLink = hash.get("beheer");
    let keepHash = false;
    if (fromLink) {
      const saved = saveMine(code, { adminKey: fromLink });
      m = saved;
      keepHash = !saved.persisted; // kan deze browser niets bewaren, laat de sleutel dan in de link staan
    }
    if ((fromLink && !keepHash) || params.has("nieuw")) {
      window.history.replaceState(null, "", `/toernooi/${code}${keepHash ? window.location.hash : ""}`);
    }
    setMine(m);
    refresh(m.adminKey).then((v) => {
      if (v && m.adminKey && !v.admin) setMine(saveMine(code, { adminKey: undefined }));
      if (v && m.playerId && !v.players.some((p) => p.id === m.playerId)) {
        setMine(saveMine(code, { playerId: undefined, token: undefined }));
      }
    });
  }, [code, refresh]);

  // Live bijwerken zolang de pagina open staat.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") refresh(mine.adminKey);
    };
    const id = setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh, mine.adminKey]);

  // De schema-foto alvast ophalen, zodat delen op de iPhone direct in de tik kan gebeuren.
  const hasSchedule = !!view.schedule;
  const pageCount = (schedulePageRanges(view) as unknown[]).length;
  useEffect(() => {
    if (!admin || !hasSchedule) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const v = view.version;
    Promise.all(
      Array.from({ length: pageCount }, (_, i) =>
        fetch(`/api/toernooi/${code}/schema.png?deel=${i + 1}&v=${v}`, { cache: "no-store" }).then((r) =>
          r.ok ? r.blob() : Promise.reject(new Error(String(r.status))),
        ),
      ),
    )
      .then((blobs) => {
        if (!cancelled) {
          setPng({ v, files: blobs.map((b, i) => new File([b], `speelschema-${code}-${i + 1}.png`, { type: "image/png" })) });
        }
      })
      // Net veranderd (409): verse stand ophalen. Andere fout: na even wachten opnieuw proberen.
      .catch((err: Error) => {
        if (cancelled) return;
        if (err.message === "409") refresh(adminKeyRef.current);
        retry = setTimeout(() => setPngTry((n) => n + 1), Math.min(10000, 1500 * (pngTry + 1)));
      });
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
    };
  }, [admin, code, hasSchedule, pageCount, view.version, refresh, pngTry]);
  const pngFiles = png && png.v === view.version && view.schedule ? png.files : null;

  const me = view.players.find((p) => p.id === mine.playerId) ?? null;
  const inPlayers = view.players.filter((p) => p.status === "in");
  const reserves = view.players.filter((p) => p.status === "reserve");
  const names = useMemo(() => shortNames(view.players, 16) as Map<string, string>, [view.players]);
  const hasOpenSlot = !!view.schedule && JSON.stringify(view.schedule.rounds).includes('"open:');
  const full = view.counts.in >= view.max_players || (!!view.schedule && !hasOpenSlot);
  const pct = Math.min(100, Math.round((view.counts.in / view.max_players) * 100));

  async function run(label: string, fn: () => Promise<void>): Promise<boolean> {
    setBusy(label);
    setError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis. Probeer het nog eens.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function uploadPhoto(target: string, blob: Blob, token?: string) {
    const headers: Record<string, string> = { "Content-Type": "image/jpeg", "x-target": target };
    if (token) headers["x-token"] = token;
    if (admin && mine.adminKey) headers["x-beheer"] = mine.adminKey;
    const res = await fetch(`/api/toernooi/${code}/photo`, { method: "POST", headers, body: blob });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "De foto is niet gelukt.");
    return data.view as View;
  }

  async function changeMyPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !me) return;
    await run("photo", async () => {
      const blob = await resizeToJpeg(file, { size: 400, square: true, maxBytes: 120 * 1024 });
      const v = await uploadPhoto(`player:${me.id}`, blob, mine.token);
      setView((cur) => ({ ...v, admin: cur.admin, log: cur.log, pending_update: cur.pending_update }));
      flash("Foto staat erop");
    });
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vul je naam in.");
      return;
    }
    if (!side) {
      setError("Kies of je links, rechts of allebei speelt.");
      return;
    }
    run("join", async () => {
      const res = await api<{ player: { id: string; token: string; status: string }; view: View }>(`/api/toernooi/${code}/join`, {
        method: "POST",
        body: JSON.stringify({ name, side, website: hp }),
      });
      setMine(saveMine(code, { playerId: res.player.id, token: res.player.token }));
      const v = res.view;
      setView((cur) => ({ ...v, admin: cur.admin, log: cur.log, pending_update: cur.pending_update }));
      setName("");
      flash(res.player.status === "in" ? "Je doet mee 🎾" : "Je staat op de reservelijst");
      if (admin) refresh(mine.adminKey);
    });
  }

  function changeMySide(next: Side) {
    if (!me || !mine.token) return;
    run("side", async () => {
      const res = await api<{ view: View }>(`/api/toernooi/${code}/side`, {
        method: "POST",
        body: JSON.stringify({ player_id: me.id, token: mine.token, side: next }),
      });
      setView((cur) => ({ ...res.view, admin: cur.admin, log: cur.log, pending_update: cur.pending_update }));
      flash(`Je speelt ${sideWord(next)}`);
    });
  }

  // Organisator: tik op L / R / L/R bij een speler om de kant te wisselen.
  function cycleSide(p: Player) {
    const order: Side[] = ["L", "R", "B"];
    const next = order[(order.indexOf((p.side as Side) ?? "B") + 1) % 3];
    adminAction("side", { player_id: p.id, side: next }, `${p.name}: ${sideWord(next)}`);
  }

  function leavePlayer(p: Player, how: "self" | "other") {
    const self = how === "self";
    setConfirm({
      title: self ? "Afmelden?" : `${p.name} afmelden?`,
      text: self
        ? `Je plek gaat naar de eerste op de reservelijst.`
        : admin
          ? `${p.name} gaat van de lijst. Staat er iemand op de reservelijst, dan schuift die door.`
          : `Doe dit alleen als jij ${p.name} bent of het met ${p.name} hebt afgesproken. De organisator ziet dit in het logboek.`,
      label: "Afmelden",
      danger: true,
      run: () =>
        run("leave", async () => {
          const res = await api<{ view: View }>(`/api/toernooi/${code}/leave`, {
            method: "POST",
            adminKey: admin ? mine.adminKey : undefined,
            body: JSON.stringify({ player_id: p.id, token: self ? mine.token : undefined }),
          });
          if (p.id === mine.playerId) setMine(saveMine(code, { playerId: undefined, token: undefined }));
          setView((cur) => ({ ...res.view, admin: cur.admin && admin }));
          setLeaveMode(false);
          flash("Afgemeld");
          if (admin) refresh(mine.adminKey);
        }),
    });
  }

  async function adminAction(action: string, extra: Record<string, unknown> = {}, done?: string): Promise<boolean> {
    return run(action, async () => {
      const res = await api<{ view: View }>(`/api/toernooi/${code}/admin`, {
        method: "POST",
        adminKey: mine.adminKey,
        body: JSON.stringify({ action, ...extra }),
      });
      setView((cur) => (res.view.version >= cur.version ? res.view : cur));
      if (done) flash(done);
    });
  }

  async function copyLink() {
    flash((await copyText(url)) ? "Link gekopieerd" : url);
  }

  function shareSchedule() {
    const text = scheduleText(view, url);
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (pngFiles && nav.canShare?.({ files: pngFiles })) {
      nav.share({ files: pngFiles, text }).catch(() => undefined);
      return;
    }
    // Geen deelmenu (desktop): foto's downloaden en tekst kopiëren.
    const files = pngFiles ?? [];
    files.forEach((f) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f);
      a.download = f.name;
      a.click();
    });
    copyText(text).then((ok) => ok && flash(files.length > 1 ? "Foto's gedownload, tekst gekopieerd" : "Foto gedownload, tekst gekopieerd"));
  }

  // Pas als "gedeeld" markeren als de organisator bevestigt dat het bericht echt verstuurd is.
  const [sentIds, setSentIds] = useState<number[] | null>(null);
  function sendUpdate() {
    setSentIds((view.pending_update ?? []).map((u) => u.id));
    window.open(waLink(updateText(view, url)), "_blank");
  }
  function confirmUpdateSent() {
    if (!sentIds) return;
    adminAction("shared", { ids: sentIds }, "Update gedeeld").then(() => setSentIds(null));
  }

  const when = `${formatDateShort(view.date)} · ${prettyTime(view.start)}-${prettyTime(view.end)} · ${view.location}`;
  const gridClass = `tn-grid${admin ? "" : " tn-grid--no-admin"}${view.schedule ? "" : " tn-grid--no-schedule"}`;
  const myRank = me?.status === "reserve" ? reserves.findIndex((p) => p.id === me.id) + 1 : 0;

  return (
    <>
      <div className={`tn-hero${admin ? " tn-hero--compact" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={headerSrc(view)} alt="" />
      </div>
      <main className="tn-wrap">
        <header className="tn-head">
          <p className="tn-eyebrow">{when}</p>
          <h1 className="tn-title">{view.title}</h1>
          <p className="tn-sub">
            Georganiseerd door {view.organizer_name} · {view.courts} {view.courts === 1 ? "baan" : "banen"} · {view.rounds} × {view.round_minutes} min
            {view.price_text ? ` · ${view.price_text} p.p.` : ""}
          </p>
        </header>

        {error && (
          <p className="tn-error" role="alert" style={{ marginTop: 16 }}>
            {error}
          </p>
        )}

        <div className={gridClass}>
          {admin && (
            <section className="tn-area-admin" aria-label="Beheer">
              {isNew && (
                <div className="tn-welcome" style={{ marginBottom: 16 }}>
                  <h2 className="tn-h2">Je toernooi staat klaar 🎾</h2>
                  <p>Zet de link in de groep. Bewaar ook je beheerlink, dan kun je altijd terug, ook vanaf een andere telefoon.</p>
                  <div className="tn-btns">
                    <a className="tn-btn tn-btn--wa" href={waLink(inviteText(view, url))} target="_blank" rel="noreferrer">
                      Deel in de groep
                    </a>
                    <a
                      className="tn-btn tn-btn--ghost"
                      href={waLink(adminSelfText(view, `${url}#beheer=${mine.adminKey}`))}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Stuur beheerlink naar jezelf
                    </a>
                  </div>
                </div>
              )}
              <AdminPanel
                view={view}
                code={code}
                busy={busy}
                pngReady={!!pngFiles}
                pageCount={pageCount}
                onInvite={() => window.open(waLink(inviteText(view, url)), "_blank")}
                onCopy={copyLink}
                onSchedule={() =>
                  view.schedule
                    ? setConfirm({
                        title: "Nieuwe indeling maken?",
                        text: "Het huidige schema vervalt. Heb je het al gedeeld, deel dan ook het nieuwe.",
                        label: "Hussel opnieuw",
                        run: () => adminAction("schedule", {}, "Nieuw schema staat klaar"),
                      })
                    : adminAction("schedule", {}, "Schema staat klaar")
                }
                onShare={shareSchedule}
                onUpdate={sendUpdate}
                updateOpened={!!sentIds}
                onUpdateSent={confirmUpdateSent}
                onAction={adminAction}
                onAdminLink={() => window.open(waLink(adminSelfText(view, `${url}#beheer=${mine.adminKey}`)), "_blank")}
                onPickHeader={async (file) => {
                  await run("header", async () => {
                    const blob = await resizeToJpeg(file, { size: 1600, square: false, maxBytes: 280 * 1024 });
                    const v = await uploadPhoto("header", blob);
                    setView((cur) => ({ ...v, admin: true, log: cur.log, pending_update: cur.pending_update }));
                    flash("Sfeerfoto aangepast");
                  });
                }}
                onDelete={() =>
                  setConfirm({
                    title: "Toernooi verwijderen?",
                    text: "De lijst, foto's en het schema zijn dan weg. Dit kun je niet terugdraaien.",
                    label: "Verwijderen",
                    danger: true,
                    run: () =>
                      run("delete", async () => {
                        await api(`/api/toernooi/${code}/admin`, {
                          method: "POST",
                          adminKey: mine.adminKey,
                          body: JSON.stringify({ action: "delete" }),
                        });
                        saveMine(code, { adminKey: undefined, playerId: undefined, token: undefined });
                        window.location.assign("/toernooi");
                      }),
                  })
                }
              />
            </section>
          )}

          <section className="tn-area-join tn-card tn-card--framed" aria-label="Aanmelden">
            <div className="tn-count">
              <span className="tn-count-big">{view.counts.in}</span>
              <span className="tn-count-rest">
                van {view.max_players} plekken{view.counts.reserve ? ` · ${view.counts.reserve} reserve` : ""}
              </span>
            </div>
            <div className="tn-bar" aria-hidden>
              <span style={{ width: `${pct}%` }} />
            </div>

            {me ? (
              <div>
                <p className="tn-ok">
                  <span className="tn-ok-mark" aria-hidden>✓</span>
                  {me.status === "in" ? `Je doet mee, ${names.get(me.id)}` : `Je staat op de reservelijst (nr. ${myRank})`}
                </p>
                <p className="tn-note" style={{ marginTop: 0 }}>
                  {me.status === "in"
                    ? view.schedule
                      ? `Je speelt ${sideWord(me.side)}. Je wedstrijden zijn groen gemarkeerd in het schema.`
                      : `Je speelt ${sideWord(me.side)}. Het schema volgt zodra de organisator het maakt.`
                    : "Zegt iemand af, dan schuif je vanzelf door. Houd de groep in de gaten."}
                </p>
                {!view.schedule && mine.token && (
                  <div style={{ marginTop: 12 }}>
                    <SideSelect label="Andere kant?" value={me.side as Side} onChange={changeMySide} />
                  </div>
                )}
                <div className="tn-photo-pick" style={{ marginTop: 16 }}>
                  <label className="tn-photo-btn">
                    <input type="file" accept="image/*" hidden onChange={changeMyPhoto} />
                    <Avatar code={code} p={me} size="lg" />
                    {busy === "photo" ? "Foto uploaden…" : me.photo ? "Andere foto" : "Zet je foto erbij (komt op het schema)"}
                  </label>
                </div>
                <div className="tn-btns">
                  {view.pay_url && me.status === "in" && (
                    <a className="tn-btn" href={view.pay_url} target="_blank" rel="noreferrer">
                      Betaal je deel{view.price_text ? ` (${view.price_text})` : ""}
                    </a>
                  )}
                  <button type="button" className="tn-btn tn-btn--danger tn-btn--small" onClick={() => leavePlayer(me, "self")}>
                    Afmelden
                  </button>
                </div>
              </div>
            ) : !view.signup_open ? (
              <p className="tn-note" style={{ marginTop: 0 }}>
                De aanmelding is gesloten. Wil je toch mee? Vraag het aan {view.organizer_name}.
              </p>
            ) : (
              <form onSubmit={join} noValidate>
                <div className="tn-field">
                  <label htmlFor="tn-join-name">Je naam</label>
                  <input
                    id="tn-join-name"
                    className="tn-input"
                    autoComplete="name"
                    maxLength={40}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Voornaam en eventueel achternaam"
                  />
                </div>
                <SideSelect value={side} onChange={setSide} />
                <div className="tn-hp" aria-hidden>
                  <label htmlFor="tn-join-website">Website</label>
                  <input id="tn-join-website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
                </div>
                <button type="submit" className="tn-btn tn-btn--block" disabled={busy === "join"}>
                  {busy === "join" ? "Even geduld…" : full ? "Zet me op de reservelijst" : "Ik doe mee →"}
                </button>
                {full && <p className="tn-note">Het zit vol. Zegt iemand af, dan schuif je vanzelf door.</p>}
              </form>
            )}
            {view.pay_url && !(me && me.status === "in") && (
              <a className="tn-btn tn-btn--ghost tn-btn--block" style={{ marginTop: 14 }} href={view.pay_url} target="_blank" rel="noreferrer">
                Speel je mee? Betaal je deel{view.price_text ? ` (${view.price_text})` : ""}
              </a>
            )}
            <p className="tn-note">Je naam en foto zijn alleen zichtbaar voor wie deze link heeft.</p>
          </section>

          {view.schedule && (
            <section className="tn-area-schedule" aria-label="Speelschema">
              <ScheduleView view={view} names={names} meId={me?.status === "in" ? me.id : null} pageCount={pageCount} />
            </section>
          )}

          <section className="tn-area-players tn-card" aria-label="Deelnemers">
            <h2 className="tn-h2">Wie doet er mee</h2>
            {inPlayers.length > 0 && (
              <p className="tn-note" style={{ marginTop: 0 }}>
                {inPlayers.filter((p) => p.side === "L").length} links · {inPlayers.filter((p) => p.side === "R").length} rechts ·{" "}
                {inPlayers.filter((p) => p.side !== "L" && p.side !== "R").length} allebei
              </p>
            )}
            {inPlayers.length === 0 ? (
              <p className="tn-note" style={{ marginTop: 0 }}>Nog niemand. Jij als eerste?</p>
            ) : (
              <ul className={`tn-people${admin ? " tn-people--list" : ""}`} style={{ marginTop: 12 }}>
                {inPlayers.map((p) => (
                  <PersonChip key={p.id} code={code} p={p} me={p.id === mine.playerId} removable={admin || (leaveMode && p.id !== mine.playerId)} onRemove={() => leavePlayer(p, "other")} onSide={admin ? () => cycleSide(p) : undefined} />
                ))}
              </ul>
            )}
            {reserves.length > 0 && (
              <>
                <p className="tn-card-label tn-sublabel">Reservelijst</p>
                <ol className={`tn-people${admin ? " tn-people--list" : ""}`}>
                  {reserves.map((p, i) => (
                    <PersonChip key={p.id} code={code} p={p} prefix={`${i + 1}.`} me={p.id === mine.playerId} removable={admin || (leaveMode && p.id !== mine.playerId)} onRemove={() => leavePlayer(p, "other")} onSide={admin ? () => cycleSide(p) : undefined} />
                  ))}
                </ol>
              </>
            )}
            {!admin && view.players.length > 0 && (
              <p className="tn-note">
                <button type="button" className="tn-link" onClick={() => setLeaveMode((x) => !x)}>
                  {leaveMode ? "Klaar" : "Afmelden vanaf een andere telefoon?"}
                </button>
                {leaveMode ? " Tik op het kruisje bij je naam." : ""}
              </p>
            )}
          </section>
        </div>
      </main>

      {confirm && (
        <div className="tn-sheet-bg" role="presentation" onClick={() => setConfirm(null)}>
          <div className="tn-sheet" role="dialog" aria-modal="true" aria-label={confirm.title} onClick={(e) => e.stopPropagation()}>
            <h2 className="tn-h2">{confirm.title}</h2>
            <p className="tn-note" style={{ marginTop: 6, marginBottom: 18 }}>{confirm.text}</p>
            <div className="tn-btns">
              <button type="button" className="tn-btn tn-btn--ghost" onClick={() => setConfirm(null)}>
                Annuleren
              </button>
              <button
                type="button"
                className={`tn-btn${confirm.danger ? " tn-btn--danger" : ""}`}
                onClick={() => {
                  const c = confirm;
                  setConfirm(null);
                  c.run();
                }}
              >
                {confirm.label}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="tn-toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

function PersonChip({
  code,
  p,
  me,
  prefix,
  removable,
  onRemove,
  onSide,
}: {
  code: string;
  p: Player;
  me: boolean;
  prefix?: string;
  removable: boolean;
  onRemove: () => void;
  onSide?: () => void;
}) {
  return (
    <li className={`tn-person${me ? " tn-person--me" : ""}`}>
      <Avatar code={code} p={p} />
      <span className="tn-person-name">
        {prefix ? `${prefix} ` : ""}
        {p.name}
        {me ? " (jij)" : ""}
      </span>
      {onSide ? (
        <button type="button" className="tn-side tn-side--btn" aria-label={`Kant van ${p.name}: ${sideWord(p.side)}. Tik om te wisselen.`} onClick={onSide}>
          {sideShort(p.side)}
        </button>
      ) : (
        <span className="tn-side" aria-label={sideWord(p.side)}>{sideShort(p.side)}</span>
      )}
      {removable && (
        <button type="button" className="tn-person-x" aria-label={`${p.name} afmelden`} onClick={onRemove}>
          ✕
        </button>
      )}
    </li>
  );
}

function ScheduleView({ view, names, meId, pageCount }: { view: View; names: Map<string, string>; meId: string | null; pageCount: number }) {
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const label = (id: string) => (isOpenSlot(id) ? "Open plek" : names.get(id) ?? "?");
  const face = (id: string) => {
    const p = byId.get(id);
    if (!p) return <span key={id} className="tn-avatar tn-avatar--open" aria-hidden />;
    return <Avatar key={id} code={view.code} p={p} />;
  };
  const team = (ids: string[]) => (
    <div className="tn-team">
      <span className="tn-faces">{ids.map(face)}</span>
      <span className="tn-team-names">
        {ids.map((id, i) => (
          <span key={id}>
            {i > 0 ? " & " : ""}
            {id === meId ? <strong>{label(id)}</strong> : label(id)}
          </span>
        ))}
      </span>
    </div>
  );
  return (
    <div className="tn-card">
      <h2 className="tn-h2">Speelschema</h2>
      <p className="tn-note" style={{ marginTop: 0 }}>
        {meId ? "Jouw wedstrijden zijn groen." : `${view.schedule!.rounds.length} rondes van ${view.round_minutes} minuten.`} Eerste naam speelt links.{" "}
        Bewaar als foto:{" "}
        {Array.from({ length: pageCount }, (_, i) => (
          <span key={i}>
            {i > 0 ? " · " : ""}
            <a className="tn-link" href={`/api/toernooi/${view.code}/schema.png?deel=${i + 1}&v=${view.version}`} target="_blank" rel="noreferrer">
              {pageCount > 1 ? `foto ${i + 1}` : "foto"}
            </a>
          </span>
        ))}
      </p>
      <div className="tn-rounds">
        {view.schedule!.rounds.map((round, ri) => (
          <div className="tn-round" key={ri}>
            <div className="tn-round-head">
              <b>RONDE {ri + 1}</b>
              <span>{view.slots[ri] ? `${view.slots[ri].start}-${view.slots[ri].end}` : ""}</span>
            </div>
            {round.matches.map((m) => {
              const mine = !!meId && [...m.a, ...m.b].includes(meId);
              const court = courtName(view, m.court) as string;
              return (
                <div key={m.court} className={`tn-match${mine ? " tn-match--me" : ""}`}>
                  <div className="tn-court">
                    Baan
                    <b>{court.replace(/^Baan\s+/i, "")}</b>
                  </div>
                  <div>
                    {team(m.a)}
                    <div className="tn-vs">VS</div>
                    {team(m.b)}
                  </div>
                </div>
              );
            })}
            {round.rest.length > 0 && (
              <div className={`tn-rest${meId && round.rest.includes(meId) ? " tn-rest--me" : ""}`}>
                <b>RUST</b>
                {round.rest.map(label).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPanel({
  view,
  code,
  busy,
  pngReady,
  pageCount,
  onInvite,
  onCopy,
  onSchedule,
  onShare,
  onUpdate,
  updateOpened,
  onUpdateSent,
  onAction,
  onAdminLink,
  onPickHeader,
  onDelete,
}: {
  view: View;
  code: string;
  busy: string | null;
  pngReady: boolean;
  pageCount: number;
  onInvite: () => void;
  onCopy: () => void;
  onSchedule: () => void;
  onShare: () => void;
  onUpdate: () => void;
  updateOpened: boolean;
  onUpdateSent: () => void;
  onAction: (action: string, extra?: Record<string, unknown>, done?: string) => Promise<boolean>;
  onAdminLink: () => void;
  onPickHeader: (file: File) => void;
  onDelete: () => void;
}) {
  const [addName, setAddName] = useState("");
  const [addSide, setAddSide] = useState<Side | null>(null);
  // Eigen invoer wint; zonder invoer tonen we wat er is opgeslagen.
  const [draft, setDraft] = useState<string[] | null>(null);
  const labels = draft ?? Array.from({ length: view.courts }, (_, i) => view.court_labels[i] ?? "");
  const fromView = () => ({
    location: view.location,
    max_players: String(view.max_players),
    courts: String(view.courts),
    start: view.start,
    end: view.end,
    rounds: String(view.rounds),
    round_minutes: String(view.round_minutes),
    price_text: view.price_text ?? "",
    pay_url: view.pay_url ?? "",
  });
  // Alleen wat je hier echt aanpast gaat mee, zodat een tweede tabblad geen oude waarden terugzet.
  const [settings, setSettings] = useState(fromView);
  const [settingsBase, setSettingsBase] = useState(fromView);

  const need = Math.max(0, 4 - view.counts.in);
  const pending = view.pending_update ?? [];
  const fitsMore = !!view.schedule && view.counts.reserve > 0 && view.counts.in < view.max_players;

  return (
    <div className="tn-card tn-admin">
      <p className="tn-card-label">Beheer · alleen jij ziet dit</p>


      {view.schedule && view.side_clashes > 0 && (
        <p className="tn-error" role="status">
          Let op: in {view.side_clashes} {view.side_clashes === 1 ? "koppel staan" : "koppels staan"} twee spelers op dezelfde kant.
          Hussel opnieuw, of tik bij een speler op L / R om de kant te wisselen.
        </p>
      )}
      {(
        <div className="tn-next">
          {view.schedule && pending.length > 0 ? (
            <>
              <p className="tn-step-t">Volgende stap: laat de groep weten wat er veranderd is</p>
              <ul className="tn-next-list">
                {pending.map((u) => (
                  <li key={u.id}>{u.text}</li>
                ))}
              </ul>
              {updateOpened ? (
                <button type="button" className="tn-btn tn-btn--block" onClick={onUpdateSent}>
                  Verstuurd? Ja, gedeeld
                </button>
              ) : (
                <button type="button" className="tn-btn tn-btn--wa tn-btn--block" onClick={onUpdate}>
                  Stuur update in de groep
                </button>
              )}
              <p className="tn-step-d" style={{ marginTop: 10, marginBottom: 0 }}>
                Of{" "}
                <button type="button" className="tn-link" onClick={onShare} disabled={!pngReady}>
                  {pngReady ? (pageCount > 1 ? "deel het schema opnieuw (foto's)" : "deel het schema opnieuw") : "foto's maken…"}
                </button>
              </p>
            </>
          ) : !view.schedule && need > 0 ? (
            <>
              <p className="tn-step-t">Volgende stap: zet de link in de groep</p>
              <p className="tn-step-d">Nog {need} {need === 1 ? "speler" : "spelers"} nodig voor een schema. Iedereen meldt zich zelf aan.</p>
              <button type="button" className="tn-btn tn-btn--wa tn-btn--block" onClick={onInvite}>
                Deel in de groep
              </button>
            </>
          ) : !view.schedule ? (
            <>
              <p className="tn-step-t">Volgende stap: maak het schema</p>
              <p className="tn-step-d">
                {view.counts.in} spelers{view.counts.in < view.max_players ? ` van de ${view.max_players}` : ""}. Wie zich daarna aanmeldt, komt op de reservelijst.
              </p>
              <button type="button" className="tn-btn tn-btn--block" onClick={onSchedule} disabled={busy === "schedule"}>
                {busy === "schedule" ? "Rekenen…" : "Maak het schema"}
              </button>
            </>
          ) : (
            <>
              <p className="tn-step-t">Volgende stap: deel het schema</p>
              <p className="tn-step-d">
                {pageCount > 1 ? `${pageCount} foto's die elk precies op een telefoonscherm passen.` : "Eén foto voor de groep."}
                {fitsMore ? ` Er passen nog ${Math.min(view.counts.reserve, view.max_players - view.counts.in)} reserve(s) bij: hussel opnieuw om ze mee te nemen.` : ""}
              </p>
              <button type="button" className="tn-btn tn-btn--wa tn-btn--block" onClick={onShare} disabled={!pngReady}>
                {pngReady ? (pageCount > 1 ? "Deel schema (foto's)" : "Deel schema als foto") : "Foto's maken…"}
              </button>
            </>
          )}
        </div>
      )}

      <ul className="tn-checklist">
        <li className={`tn-check-row${view.counts.in > 1 ? " tn-step--done" : ""}`}>
          <span className="tn-step-n">{view.counts.in > 1 ? "✓" : "1"}</span>
          <div className="tn-check-main">
            <p className="tn-step-t">Uitnodiging</p>
            <p className="tn-step-d">
              {view.counts.in} van {view.max_players} aangemeld{view.counts.reserve ? `, ${view.counts.reserve} reserve` : ""}
            </p>
          </div>
          <div className="tn-check-act">
            <button type="button" className="tn-btn tn-btn--ghost tn-btn--small" onClick={onInvite}>
              Deel
            </button>
            <button type="button" className="tn-btn tn-btn--ghost tn-btn--small" onClick={onCopy}>
              Kopieer
            </button>
          </div>
        </li>
        <li className={`tn-check-row${view.schedule ? " tn-step--done" : ""}`}>
          <span className="tn-step-n">{view.schedule ? "✓" : "2"}</span>
          <div className="tn-check-main">
            <p className="tn-step-t">Schema</p>
            <p className="tn-step-d">{view.schedule ? `${view.schedule.rounds.length} rondes klaar` : need > 0 ? `kan vanaf 4 spelers` : "nog niet gemaakt"}</p>
          </div>
          {view.schedule && (
            <div className="tn-check-act">
              <button type="button" className="tn-btn tn-btn--ghost tn-btn--small" onClick={onSchedule} disabled={busy === "schedule"}>
                {busy === "schedule" ? "Rekenen…" : "Hussel"}
              </button>
            </div>
          )}
        </li>
        <li className={`tn-check-row${view.court_labels.some(Boolean) ? " tn-step--done" : ""}`}>
          <span className="tn-step-n">{view.court_labels.some(Boolean) ? "✓" : "3"}</span>
          <div className="tn-check-main">
            <p className="tn-step-t">Banen</p>
            <p className="tn-step-d">
              {view.court_labels.some(Boolean) ? view.court_labels.filter(Boolean).map((l) => (/^\d+$/.test(l) ? `baan ${l}` : l)).join(", ") : `${view.courts} ${view.courts === 1 ? "baan" : "banen"} boeken`}
            </p>
          </div>
          <div className="tn-check-act">
            {isSportcentrumHoorn(view) && (
              <a className="tn-btn tn-btn--ghost tn-btn--small" href={BOOK_URL} target="_blank" rel="noreferrer">
                Boek ↗
              </a>
            )}
          </div>
          <details className="tn-courts-toggle" open={!!draft}>
            <summary>{view.court_labels.some(Boolean) ? "Baannummers wijzigen" : "Baannummers invullen"}</summary>
          <div className="tn-courts">
            {labels.map((l, i) => (
              <input
                key={i}
                className="tn-input"
                inputMode="numeric"
                maxLength={12}
                aria-label={`Baannummer ${i + 1}`}
                placeholder={String(i + 1)}
                value={l}
                onChange={(e) => setDraft(labels.map((x, j) => (j === i ? e.target.value : x)))}
              />
            ))}
            {draft && (
              <button type="button" className="tn-btn tn-btn--small" onClick={() => {
                  const changes = Object.fromEntries(labels.map((l, i) => [i, l]).filter(([i, l]) => l !== (view.court_labels[i as number] ?? "")));
                  onAction("courts", { changes }, "Baannummers opgeslagen").then((ok) => ok && setDraft(null));
                }}>
                Opslaan
              </button>
            )}
          </div>
          </details>
        </li>
      </ul>

      <details className="tn-more">
        <summary>Meer beheer</summary>

        <div className="tn-field">
          <label htmlFor="tn-add">Iemand toevoegen</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="tn-add" className="tn-input" maxLength={40} value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Naam" />
            <button
              type="button"
              className="tn-btn tn-btn--small"
              disabled={!addName.trim() || !addSide}
              onClick={() =>
                onAction("add", { name: addName, side: addSide }, `${addName.trim()} toegevoegd`).then((ok) => {
                  if (ok) {
                    setAddName("");
                    setAddSide(null);
                  }
                })
              }
            >
              Voeg toe
            </button>
          </div>
          <SideSelect label="Speelt" value={addSide} onChange={setAddSide} />
          <span className="tn-hint">Voor wie in de groep &quot;ik doe mee&quot; typt.</span>
        </div>

        <div className="tn-field">
          <span className="tn-legend">Aanmelding</span>
          <div>
            <button type="button" className="tn-btn tn-btn--ghost tn-btn--small" onClick={() => onAction("signup", { open: !view.signup_open })}>
              {view.signup_open ? "Sluit de aanmelding" : "Zet de aanmelding weer open"}
            </button>
          </div>
        </div>

        <details className="tn-more">
          <summary>Instellingen</summary>
          <div className="tn-field">
            <label htmlFor="tn-s-loc">Waar</label>
            <input id="tn-s-loc" className="tn-input" maxLength={50} value={settings.location} onChange={(e) => setSettings({ ...settings, location: e.target.value })} />
          </div>
          <div className="tn-row">
            <TimeSelect id="tn-s-start" label="Van" value={settings.start} onChange={(v) => setSettings({ ...settings, start: v })} />
            <TimeSelect id="tn-s-end" label="Tot" value={settings.end} after={settings.start} onChange={(v) => setSettings({ ...settings, end: v })} />
          </div>
          <RoundSplit
            id="tn-s-split"
            start={settings.start}
            end={settings.end}
            rounds={Number(settings.rounds)}
            minutes={Number(settings.round_minutes)}
            onChange={(r, m) => setSettings({ ...settings, rounds: String(r), round_minutes: String(m) })}
          />
          <div className="tn-row">
            <div className="tn-field">
              <label htmlFor="tn-s-courts">Banen</label>
              <input id="tn-s-courts" className="tn-input" inputMode="numeric" value={settings.courts} onChange={(e) => setSettings({ ...settings, courts: e.target.value })} />
            </div>
            <div className="tn-field">
              <label htmlFor="tn-s-max">Max spelers</label>
              <input id="tn-s-max" className="tn-input" inputMode="numeric" value={settings.max_players} onChange={(e) => setSettings({ ...settings, max_players: e.target.value })} />
            </div>
          </div>
          <div className="tn-row">
            <div className="tn-field">
              <label htmlFor="tn-s-price">Prijs p.p.</label>
              <input id="tn-s-price" className="tn-input" value={settings.price_text} onChange={(e) => setSettings({ ...settings, price_text: e.target.value })} />
            </div>
            <div className="tn-field">
              <label htmlFor="tn-s-pay">Tikkie-link</label>
              <input id="tn-s-pay" className="tn-input" inputMode="url" value={settings.pay_url} onChange={(e) => setSettings({ ...settings, pay_url: e.target.value })} />
            </div>
          </div>
          <button
            type="button"
            className="tn-btn tn-btn--small"
            onClick={() => {
              const numeric = new Set(["max_players", "courts", "rounds", "round_minutes"]);
              const patch: Record<string, unknown> = {};
              for (const k of Object.keys(settings) as (keyof typeof settings)[]) {
                if (settings[k] !== settingsBase[k]) patch[k] = numeric.has(k) ? Number(settings[k]) : settings[k];
              }
              // Tijd en indeling horen bij elkaar: verandert er één, stuur ze samen (de server checkt of het past).
              if (["start", "end", "rounds", "round_minutes"].some((k) => k in patch)) {
                patch.start = settings.start;
                patch.end = settings.end;
                patch.rounds = Number(settings.rounds);
                patch.round_minutes = Number(settings.round_minutes);
              }
              if (Object.keys(patch).length === 0) return;
              const sent = settings;
              onAction("settings", { patch }, "Opgeslagen").then((ok) => ok && setSettingsBase(sent));
            }}
          >
            Instellingen opslaan
          </button>
          <p className="tn-hint" style={{ display: "block", marginTop: 8 }}>
            Andere tijd, indeling of banen? Dan maak je het schema daarna opnieuw.
          </p>
        </details>

        <details className="tn-more">
          <summary>Sfeerfoto</summary>
          <div className="tn-pics">
            {PRESETS.map((id: string) => (
              <button
                key={id}
                type="button"
                className="tn-pic"
                aria-pressed={view.header.kind === "preset" && view.header.id === id}
                aria-label={`Sfeerfoto ${id.slice(-1)}`}
                onClick={() => onAction("settings", { patch: { header: { kind: "preset", id } } }, "Sfeerfoto aangepast")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/toernooi/${id}.jpg`} alt="" />
              </button>
            ))}
            <label className="tn-pic tn-pic--own">
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) onPickHeader(f);
                }}
              />
              Eigen foto
            </label>
          </div>
        </details>

        <div className="tn-btns" style={{ marginTop: 16 }}>
          <button type="button" className="tn-btn tn-btn--ghost tn-btn--small" onClick={onAdminLink}>
            Stuur beheerlink naar jezelf
          </button>
          <a className="tn-btn tn-btn--ghost tn-btn--small" href={`/toernooi?van=${code}`}>
            Volgende week weer →
          </a>
        </div>

        {view.log && view.log.length > 0 && (
          <details className="tn-more">
            <summary>Logboek</summary>
            <ul className="tn-log">
              {[...view.log].reverse().map((l, i) => (
                <li key={i}>
                  <time dateTime={l.at}>
                    {new Date(l.at).toLocaleString("nl-NL", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                  </time>
                  {l.text}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div style={{ marginTop: 18 }}>
          <button type="button" className="tn-btn tn-btn--danger tn-btn--small" onClick={onDelete}>
            Toernooi verwijderen
          </button>
        </div>
      </details>
    </div>
  );
}

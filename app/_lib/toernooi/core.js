// Spelregels van het mini-toernooi: aanmelden, reservelijst, doorschuiven, schema, deelteksten.
// Puur JS zonder I/O: elke functie krijgt een toernooi-object en geeft een nieuw object terug,
// of gooit een ToernooiError met een Nederlandse melding. Opslag en crypto zitten in de API-laag.

import { makeSchedule, sideClashCount, substitute } from "./americano.js";

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // geen 0/O/1/I/L
export const CODE_LENGTH = 6;
export const BOOK_URL = "https://sportcentrumhoorn.baanhuur.nl/planboard";
export const PRESETS = ["sfeer-1", "sfeer-2", "sfeer-3"];
export const LIMITS = { name: 40, title: 60, location: 50, price: 20, reserve: 10, players: 40, courts: 8, log: 50 };
export const DEFAULT_TITLE = "Vrijdagochtend toernooitje";
export const DEFAULT_LOCATION = "Sportcentrum Hoorn";
export const SIDES = { L: "links", R: "rechts", B: "beide" };
const SIDE_ORDER = { L: 0, B: 1, R: 2 };
const sidesOf = (t) => Object.fromEntries(t.players.map((p) => [p.id, p.side ?? "B"]));

/**
 * Schema om te tonen: in elk koppel de linksspeler eerst, op basis van de kanten van NU (dus ook goed
 * na een vervanging of als de organisator iemands kant wisselt). De indeling zelf verandert niet.
 */
export function displayRounds(t) {
  if (!t.schedule) return [];
  const sides = sidesOf(t);
  const order = (pair) => [...pair].sort((x, y) => (SIDE_ORDER[sides[x] ?? "B"] ?? 1) - (SIDE_ORDER[sides[y] ?? "B"] ?? 1));
  return t.schedule.rounds.map((r) => ({ ...r, matches: r.matches.map((m) => ({ ...m, a: order(m.a), b: order(m.b) })) }));
}
const validSide = (x) => x === "L" || x === "R" || x === "B";
const locationOf = (t) => t.location || DEFAULT_LOCATION;

/** Het planbord om banen te boeken kennen we alleen voor Sportcentrum Hoorn. */
export const isSportcentrumHoorn = (t) => /sportcentrum\s*hoorn/i.test(locationOf(t));

const OPEN_PREFIX = "open:";
const PAY_HOSTS = ["tikkie.me", "bunq.me", "betaalverzoek.rabobank.nl", "ing.nl", "abnamro.nl", "paypal.me"];
const DAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

export class ToernooiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const fail = (status, message) => {
  throw new ToernooiError(status, message);
};

// ── kleine helpers ─────────────────────────────────────────────────────────────

/** Maakt een code van willekeurige bytes (de API levert crypto.randomBytes). */
export function codeFromBytes(bytes) {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function isValidCode(code) {
  return typeof code === "string" && code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

export function cleanName(raw) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const isOpenSlot = (id) => typeof id === "string" && id.startsWith(OPEN_PREFIX);

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** "9:00" zonder voorloopnul, zoals mensen het schrijven. */
export function prettyTime(hhmm) {
  return fromMinutes(toMinutes(hhmm));
}

function parseDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/** "vrijdag 9 oktober" */
export function formatDateNl(iso) {
  const dt = parseDate(iso);
  if (!dt) return iso;
  return `${DAYS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
}

/** "VR 9 OKT" voor labels */
export function formatDateShort(iso) {
  const dt = parseDate(iso);
  if (!dt) return iso;
  return `${DAYS[dt.getUTCDay()].slice(0, 2)} ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()].slice(0, 3)}`.toUpperCase();
}

/** Komende vrijdag (vandaag telt niet mee) als YYYY-MM-DD. */
export function nextFriday(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() !== 5);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso, days) {
  const dt = parseDate(iso);
  if (!dt) return iso;
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export const playMinutes = (t) => toMinutes(t.end) - toMinutes(t.start);

/** Aantal rondes: zelf gekozen indeling (bv. 3 x 40), anders zoveel als er passen. */
export function roundCount(t) {
  const r = Number(t.rounds);
  if (Number.isInteger(r) && r >= 1) return r;
  return Math.max(1, Math.floor(playMinutes(t) / t.round_minutes));
}

/**
 * Indelingen die precies in de speeltijd passen, bv. 2 uur: 2 x 60, 3 x 40, 4 x 30, 6 x 20, 8 x 15.
 * Alleen hele minuten in stappen van 5, rondes van 15 tot 90 minuten.
 */
export function roundSplits(duration) {
  const out = [];
  for (let rounds = 2; rounds <= 8; rounds++) {
    const minutes = duration / rounds;
    if (Number.isInteger(minutes) && minutes % 5 === 0 && minutes >= 15 && minutes <= 90) out.push({ rounds, minutes });
  }
  return out;
}

/** Standaard: de indeling met rondes het dichtst bij 35 minuten (2 uur → 3 x 40, 1,5 uur → 3 x 30). */
export function defaultSplit(duration) {
  const splits = roundSplits(duration);
  if (!splits.length) {
    const minutes = Math.max(5, Math.min(90, Math.floor(duration / 2 / 5) * 5 || duration));
    return { rounds: Math.max(1, Math.floor(duration / minutes)), minutes };
  }
  return splits.reduce((best, s) => (Math.abs(s.minutes - 35) < Math.abs(best.minutes - 35) ? s : best));
}

/** Begin- en eindtijd per ronde. */
export function roundSlots(t) {
  const start = toMinutes(t.start);
  return Array.from({ length: roundCount(t) }, (_, i) => ({
    start: fromMinutes(start + i * t.round_minutes),
    end: fromMinutes(start + (i + 1) * t.round_minutes),
  }));
}

function payUrlOk(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return PAY_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const inPlayers = (t) => t.players.filter((p) => p.status === "in");
const reservePlayers = (t) => t.players.filter((p) => p.status === "reserve");

function addLog(t, now, text) {
  const log = [...(t.log ?? []), { at: now, text }];
  return log.slice(-LIMITS.log);
}

// Wijzigingen ná het schema die de organisator nog moet delen. Elk item heeft een id, zodat
// "gedeeld" alleen wist wat echt in het gedeelde bericht stond.
function addPending(t, text) {
  if (!t.schedule) return { pending_update: t.pending_update ?? [], pending_seq: t.pending_seq ?? 0 };
  const seq = (t.pending_seq ?? 0) + 1;
  return { pending_update: [...(t.pending_update ?? []), { id: seq, text }], pending_seq: seq };
}

/** Reserves schuiven door tot het maximum, in volgorde van de lijst. */
function promoteReserves(players, max, log, now) {
  let free = max - players.filter((p) => p.status === "in").length;
  const next = players.map((p) => {
    if (free > 0 && p.status === "reserve") {
      free -= 1;
      log = addLog({ log }, now, `${p.name} schuift door van de reservelijst.`);
      return { ...p, status: "in" };
    }
    return p;
  });
  return { players: next, log };
}

// ── instellingen ───────────────────────────────────────────────────────────────

/**
 * Controleert en normaliseert instellingen. Bij `partial` alleen de meegegeven velden.
 * Gooit bij de eerste fout.
 */
export function validateSettings(input, { partial = false } = {}) {
  const out = {};
  const has = (k) => input[k] !== undefined && input[k] !== null;
  const need = (k) => !partial || has(k);

  if (need("title")) {
    const title = cleanName(input.title ?? DEFAULT_TITLE) || DEFAULT_TITLE;
    if (title.length > LIMITS.title) fail(400, "De naam van het toernooi is te lang.");
    out.title = title;
  }
  if (need("location")) {
    const loc = cleanName(input.location ?? DEFAULT_LOCATION) || DEFAULT_LOCATION;
    if (loc.length > LIMITS.location) fail(400, "De plek is te lang.");
    out.location = loc;
  }
  if (need("date")) {
    if (!parseDate(input.date)) fail(400, "Kies een geldige datum.");
    out.date = input.date;
  }
  for (const k of ["start", "end"]) {
    if (need(k)) {
      if (!/^\d{2}:\d{2}$/.test(String(input[k])) || toMinutes(input[k]) >= 24 * 60 || Number(input[k].slice(3)) > 59) {
        fail(400, "Vul een geldige tijd in, bijvoorbeeld 09:00.");
      }
      // Banen boek je per half uur: alleen hele en halve uren.
      if (toMinutes(input[k]) % 30 !== 0) fail(400, "Kies een tijd op het hele of halve uur, bijvoorbeeld 9:00 of 9:30.");
      out[k] = input[k];
    }
  }
  if (need("round_minutes")) {
    const rm = Number(input.round_minutes);
    if (!Number.isInteger(rm) || rm < 5 || rm > 120) fail(400, "Een ronde duurt tussen 5 en 120 minuten.");
    out.round_minutes = rm;
  }
  if (has("rounds")) {
    const r = Number(input.rounds);
    if (!Number.isInteger(r) || r < 1 || r > 12) fail(400, "Kies 1 tot 12 rondes.");
    out.rounds = r;
  }
  if (need("courts")) {
    const c = Number(input.courts);
    if (!Number.isInteger(c) || c < 1 || c > LIMITS.courts) fail(400, `Kies 1 tot ${LIMITS.courts} banen.`);
    out.courts = c;
  }
  if (need("max_players")) {
    const fallback = (out.courts ?? Number(input.courts) ?? 3) * 4;
    const mp = has("max_players") ? Number(input.max_players) : fallback;
    if (!Number.isInteger(mp) || mp < 4 || mp > LIMITS.players) fail(400, `Kies 4 tot ${LIMITS.players} spelers.`);
    out.max_players = mp;
  }
  if (need("organizer_name")) {
    const n = cleanName(input.organizer_name);
    if (!n) fail(400, "Vul je naam in.");
    if (n.length > LIMITS.name) fail(400, "Je naam is te lang.");
    out.organizer_name = n;
  }
  if (has("header") || !partial) {
    const h = input.header ?? { kind: "preset", id: PRESETS[0] };
    if (h.kind === "preset" && PRESETS.includes(h.id)) out.header = { kind: "preset", id: h.id };
    else if (h.kind === "upload") out.header = { kind: "upload", v: Number(h.v) || 0 };
    else fail(400, "Kies een sfeerfoto.");
  }
  if (has("price_text")) {
    const p = cleanName(input.price_text);
    if (p.length > LIMITS.price) fail(400, "De prijs is te lang.");
    out.price_text = p || null;
  }
  if (has("pay_url")) {
    const u = String(input.pay_url).trim();
    if (u && !payUrlOk(u)) fail(400, "Dit lijkt geen Tikkie- of betaallink. Plak de link uit je bank-app.");
    out.pay_url = u || null;
  }

  const start = out.start ?? input.start;
  const end = out.end ?? input.end;
  if (!partial || has("start") || has("end")) {
    if (start && end && toMinutes(end) <= toMinutes(start)) fail(400, "De eindtijd moet na de begintijd liggen.");
    if (start && end && toMinutes(end) - toMinutes(start) > 6 * 60) fail(400, "Een toernooi duurt maximaal 6 uur.");
  }
  return out;
}

function checkRoundsFit(t) {
  if (playMinutes(t) < t.round_minutes) fail(400, "Er past geen hele ronde in deze tijd.");
  if (roundCount(t) * t.round_minutes > playMinutes(t)) {
    fail(400, `${roundCount(t)} rondes van ${t.round_minutes} minuten passen niet in ${playMinutes(t)} minuten. Kies een andere indeling.`);
  }
}

export function createTournament({ input, code, adminKeyHash, now }) {
  const s = validateSettings(input);
  // Geen indeling meegegeven: zoveel rondes als er passen (oude manier).
  if (s.rounds === undefined) s.rounds = Math.max(1, Math.floor((toMinutes(s.end) - toMinutes(s.start)) / s.round_minutes));
  checkRoundsFit(s);
  return {
    v: 1,
    version: 1,
    code,
    created_at: now,
    updated_at: now,
    ...s,
    price_text: s.price_text ?? null,
    pay_url: s.pay_url ?? null,
    court_labels: [],
    signup_open: true,
    admin_key_hash: adminKeyHash,
    players: [],
    log: [{ at: now, text: `Toernooi aangemaakt door ${s.organizer_name}.` }],
    pending_update: [],
    schedule: null,
  };
}

// ── aanmelden en afmelden ──────────────────────────────────────────────────────

/**
 * Meldt iemand aan. Vol = reservelijst. Staat er een schema met een open plek, dan krijgt de
 * nieuwe speler die plek.
 */
export function join(t, { id, name, side, tokenHash, now, byAdmin = false }) {
  const clean = cleanName(name);
  if (!clean) fail(400, "Vul je naam in.");
  if (!validSide(side)) fail(400, "Kies of je links, rechts of allebei speelt.");
  if (clean.length > LIMITS.name) fail(400, "Je naam is te lang.");
  if (!t.signup_open && !byAdmin) fail(409, "De aanmelding is gesloten. Vraag de organisator om je toe te voegen.");
  t = fillOpenSlots(t, now);
  const lower = clean.toLocaleLowerCase("nl");
  if (t.players.some((p) => p.name.toLocaleLowerCase("nl") === lower)) {
    fail(409, `${clean} staat er al op. Gebruik eventueel je achternaam erbij.`);
  }
  // Staat het schema al, dan kan iemand er alleen nog in op een open plek; anders reserve
  // (de organisator neemt reserves mee met "Hussel opnieuw").
  const open = t.schedule ? firstOpenSlot(t.schedule) : null;
  // Wie al op de reservelijst wacht, gaat voor: een nieuwkomer sluit achteraan aan.
  const waiting = reservePlayers(t).length > 0 && !open;
  const full = inPlayers(t).length >= t.max_players || (!!t.schedule && !open) || waiting;
  if (full && reservePlayers(t).length >= LIMITS.reserve) fail(409, "Het toernooi en de reservelijst zitten vol.");

  const player = {
    id,
    name: clean,
    photo: 0,
    token_hash: tokenHash ?? null,
    joined_at: now,
    side,
    status: full ? "reserve" : "in",
    added_by: byAdmin ? "admin" : "self",
  };
  let schedule = t.schedule;
  let pending = { pending_update: t.pending_update ?? [], pending_seq: t.pending_seq ?? 0 };
  let logText = full ? `${clean} staat op de reservelijst.` : `${clean} doet mee.`;
  if (!full && open) {
    schedule = { ...schedule, rounds: substitute(schedule.rounds, open, id) };
    pending = addPending(t, `${clean} speelt mee op de open plek.`);
    logText = `${clean} doet mee op de open plek.`;
  }
  return {
    t: { ...t, updated_at: now, players: [...t.players, player], schedule, ...pending, log: addLog(t, now, logText) },
    player,
  };
}

/** Open plekken in het schema gaan eerst naar wie al op de reservelijst wacht. */
function fillOpenSlots(t, now) {
  if (!t.schedule) return t;
  let next = t;
  for (;;) {
    const open = firstOpenSlot(next.schedule);
    const reserve = next.players.find((p) => p.status === "reserve");
    if (!open || !reserve || inPlayers(next).length >= next.max_players) return next;
    const text = `${reserve.name} speelt mee op de open plek.`;
    next = {
      ...next,
      updated_at: now,
      players: next.players.map((p) => (p.id === reserve.id ? { ...p, status: "in" } : p)),
      schedule: { ...next.schedule, rounds: substitute(next.schedule.rounds, open, reserve.id) },
      ...addPending(next, text),
      log: addLog(next, now, text),
    };
  }
}

function firstOpenSlot(schedule) {
  for (const round of schedule.rounds) {
    for (const m of round.matches) for (const p of [...m.a, ...m.b]) if (isOpenSlot(p)) return p;
    for (const p of round.rest) if (isOpenSlot(p)) return p;
  }
  return null;
}

/**
 * Meldt iemand af. `how`: "self" (met eigen token), "name" (zonder token, bevestigd in de UI),
 * "admin" (door de organisator). De eerste reserve schuift door en neemt in een bestaand schema
 * precies de plek van de afmelder over.
 */
export function leave(t, { playerId, now, how = "self" }) {
  const player = t.players.find((p) => p.id === playerId);
  if (!player) fail(404, "Deze speler staat niet (meer) op de lijst.");
  const rest = t.players.filter((p) => p.id !== playerId);
  const via = how === "admin" ? " (door organisator)" : "";

  if (player.status === "reserve") {
    return {
      t: { ...t, updated_at: now, players: rest, log: addLog(t, now, `${player.name} van de reservelijst af${via}.`) },
      promoted: null,
    };
  }

  const firstReserve = rest.find((p) => p.status === "reserve");
  let players = rest;
  let schedule = t.schedule;
  let text;
  if (firstReserve) {
    players = rest.map((p) => (p.id === firstReserve.id ? { ...p, status: "in" } : p));
    if (schedule) schedule = { ...schedule, rounds: substitute(schedule.rounds, playerId, firstReserve.id) };
    text = `${player.name} kan niet. ${firstReserve.name} neemt de plek over.`;
  } else {
    if (schedule) schedule = { ...schedule, rounds: substitute(schedule.rounds, playerId, `${OPEN_PREFIX}${playerId}`) };
    text = schedule ? `${player.name} kan niet. Er is een plek vrij.` : `${player.name} doet niet meer mee.`;
  }
  return {
    t: {
      ...t,
      updated_at: now,
      players,
      schedule,
      ...addPending(t, text),
      log: addLog(t, now, `${text}${via}`),
    },
    promoted: firstReserve ? { ...firstReserve, status: "in" } : null,
  };
}

/** Kant wijzigen. Speler zelf alleen zolang er nog geen schema is; de organisator altijd. */
export function setSide(t, playerId, side, { now, byAdmin = false }) {
  if (!validSide(side)) fail(400, "Kies links, rechts of allebei.");
  const p = t.players.find((x) => x.id === playerId);
  if (!p) fail(404, "Deze speler staat niet (meer) op de lijst.");
  if (t.schedule && !byAdmin) fail(409, "Het schema staat al. Vraag de organisator om je kant aan te passen.");
  return {
    ...t,
    updated_at: now,
    players: t.players.map((x) => (x.id === playerId ? { ...x, side } : x)),
    log: addLog(t, now, `${p.name} speelt ${SIDES[side]}.`),
  };
}

export function setPhoto(t, playerId, version, now) {
  if (!t.players.some((p) => p.id === playerId)) fail(404, "Deze speler staat niet (meer) op de lijst.");
  return { ...t, updated_at: now, players: t.players.map((p) => (p.id === playerId ? { ...p, photo: version } : p)) };
}

// ── beheer ─────────────────────────────────────────────────────────────────────

const SCHEDULE_FIELDS = ["start", "end", "round_minutes", "rounds", "courts"];

/** Past instellingen aan. Verandert de tijd of het aantal banen, dan vervalt het schema. */
export function updateSettings(t, patch, now) {
  const s = validateSettings({ ...patch }, { partial: true });
  delete s.organizer_name;
  const next = { ...t, ...s };
  if (toMinutes(next.end) <= toMinutes(next.start)) fail(400, "De eindtijd moet na de begintijd liggen.");
  if (toMinutes(next.end) - toMinutes(next.start) > 6 * 60) fail(400, "Een toernooi duurt maximaal 6 uur.");
  checkRoundsFit(next);
  const inCount = inPlayers(t).length;
  if (next.max_players < inCount) {
    fail(409, `Er doen al ${inCount} mensen mee. Meld eerst iemand af of kies minstens ${inCount}.`);
  }

  // Eerst bepalen of het schema vervalt; daarna pas reserves laten doorschuiven, zodat
  // wachtenden altijd vóór nieuwkomers gaan.
  let log = t.log;
  let schedule = t.schedule;
  let pending = { pending_update: t.pending_update ?? [], pending_seq: t.pending_seq ?? 0 };
  if (schedule && SCHEDULE_FIELDS.some((k) => s[k] !== undefined && s[k] !== t[k])) {
    schedule = null;
    pending = { pending_update: [], pending_seq: pending.pending_seq };
    log = addLog({ log }, now, "Tijd of banen gewijzigd: maak het schema opnieuw.");
  }
  let players = t.players;
  if (!schedule) ({ players, log } = promoteReserves(players, next.max_players, log, now));
  if (s.courts !== undefined && s.courts !== t.courts) next.court_labels = [];
  if (schedule && s.location !== undefined && s.location !== (t.location || DEFAULT_LOCATION)) {
    const text = `Nieuwe plek: ${s.location}.`;
    pending = addPending({ ...t, ...pending, schedule }, text);
    log = addLog({ log }, now, text);
  }
  return fillOpenSlots({ ...next, updated_at: now, players, schedule, ...pending, log }, now);
}

export function setSignupOpen(t, open, now) {
  return { ...t, signup_open: !!open, updated_at: now, log: addLog(t, now, open ? "Aanmelding weer open." : "Aanmelding gesloten.") };
}

/**
 * Baannummers. `changes` = { index: waarde } met alleen wat de organisator aanpaste, zodat twee
 * tabbladen elkaars nummers niet overschrijven (samengevoegd binnen de schrijfronde).
 */
export function setCourtLabels(t, changes, now) {
  const next = Array.from({ length: t.courts }, (_, i) => t.court_labels?.[i] ?? "");
  if (Array.isArray(changes)) changes.slice(0, t.courts).forEach((l, i) => (next[i] = cleanName(l).slice(0, 12)));
  else if (changes && typeof changes === "object") {
    for (const [k, v] of Object.entries(changes)) {
      const i = Number(k);
      if (Number.isInteger(i) && i >= 0 && i < t.courts) next[i] = cleanName(v).slice(0, 12);
    }
  } else fail(400, "Ongeldige baannummers.");
  const changed = next.some((l, i) => l !== (t.court_labels?.[i] ?? ""));
  if (!changed) return t;
  const named = next.map((l, i) => courtName({ court_labels: next }, i + 1)).join(", ");
  const text = `Banen: ${named}.`;
  return { ...t, court_labels: next, updated_at: now, ...addPending(t, text), log: addLog(t, now, text) };
}

export function generateSchedule(t, { seed, now }) {
  // Reserves die er nog bij passen gaan mee in het nieuwe schema.
  const promoted = promoteReserves(t.players, t.max_players, t.log, now);
  t = { ...t, players: promoted.players, log: promoted.log };
  const ids = inPlayers(t).map((p) => p.id);
  if (ids.length < 4) fail(409, "Je hebt minimaal 4 spelers nodig voor een schema.");
  const sides = Object.fromEntries(t.players.map((p) => [p.id, p.side ?? "B"]));
  const rounds = makeSchedule(ids, { courts: t.courts, rounds: roundCount(t), seed, sides });
  return {
    ...t,
    updated_at: now,
    schedule: { seed, generated_at: now, rounds },
    pending_update: [],
    log: addLog(t, now, t.schedule ? "Schema opnieuw gehusseld." : "Schema gemaakt."),
  };
}

/** Wist alleen de updates die echt in het gedeelde bericht stonden. */
export function markUpdateShared(t, ids, now) {
  const shared = new Set(Array.isArray(ids) ? ids.map(Number) : []);
  return { ...t, pending_update: (t.pending_update ?? []).filter((u) => !shared.has(u.id)), updated_at: now };
}

/** Naam van de baan: door de organisator ingevuld nummer, anders "Baan 1". */
export function courtName(t, court) {
  const label = t.court_labels?.[court - 1];
  if (!label) return `Baan ${court}`;
  return /^\d+$/.test(label) ? `Baan ${label}` : label;
}

// ── wat naar buiten gaat ───────────────────────────────────────────────────────

/** Publieke staat: nooit hashes of tokens. */
export function publicView(t, { admin = false } = {}) {
  const view = {
    code: t.code,
    title: t.title,
    location: locationOf(t),
    date: t.date,
    start: t.start,
    end: t.end,
    round_minutes: t.round_minutes,
    rounds: roundCount(t),
    courts: t.courts,
    court_labels: t.court_labels ?? [],
    max_players: t.max_players,
    organizer_name: t.organizer_name,
    header: t.header,
    price_text: t.price_text ?? null,
    pay_url: t.pay_url ?? null,
    signup_open: t.signup_open,
    players: t.players.map(({ id, name, photo, status, joined_at, added_by, side }) => ({ id, name, photo, status, joined_at, added_by, side: side ?? "B" })),
    counts: { in: inPlayers(t).length, reserve: reservePlayers(t).length },
    // Koppels met twee spelers van dezelfde kant (kan na een vervanging of bij een scheve mix).
    side_clashes: t.schedule ? sideClashCount(t.schedule.rounds, sidesOf(t)) : 0,
    slots: roundSlots(t),
    schedule: t.schedule ? { seed: t.schedule.seed, generated_at: t.schedule.generated_at, rounds: displayRounds(t) } : null,
    updated_at: t.updated_at,
    version: Number(t.version) || 1,
  };
  if (admin) {
    view.log = t.log ?? [];
    view.pending_update = t.pending_update ?? [];
  }
  return view;
}

const timeRange = (t) => `${prettyTime(t.start)}-${prettyTime(t.end)}`;

export function inviteText(t, url) {
  const lines = [
    `🎾 ${t.title}`,
    `${capitalize(formatDateNl(t.date))}, ${timeRange(t)} bij ${locationOf(t)}.`,
  ];
  if (t.price_text) lines.push(`Kosten: ${t.price_text} p.p.`);
  lines.push(`${t.max_players} plekken. Doe je mee? Meld je hier aan:`, url);
  return lines.join("\n");
}

export function scheduleText(t, url) {
  const lines = [
    "Het schema staat! 🎾",
    `${t.title}, ${formatDateNl(t.date)} om ${prettyTime(t.start)}.`,
    "Kun je toch niet? Meld je af via de link, dan schuift de reserve door.",
    url,
  ];
  if (t.pay_url) lines.push("", `Betalen: ${t.pay_url}`);
  return lines.join("\n");
}

export function updateText(t, url) {
  const items = (t.pending_update ?? []).map((u) => u.text);
  return [`Update ${t.title}:`, ...items, "", `Het actuele schema: ${url}`].join("\n");
}

export function adminSelfText(t, adminUrl) {
  return [
    `Beheerlink voor ${t.title} (${formatDateNl(t.date)}).`,
    "Bewaar dit bericht, hiermee beheer je het toernooi:",
    adminUrl,
  ].join("\n");
}

// ── schema-foto's: zo verdeeld dat elke foto op een telefoonscherm past ─────────

export const IMG = {
  W: 1080,
  PAD: 56,
  MAX_H: 2200, // 1080 x 2200 past op de breedte van een telefoonscherm, dus leesbaar zonder inzoomen
  FIRST_HEADER: 456,
  NEXT_HEADER: 182,
  FOOTER: 62,
  ROUND_GAP: 18,
  MATCH_ROW: 140, // koppel, "VS", koppel onder elkaar (128) + 6px lucht boven en onder
  MAX_ROUNDS_PER_PAGE: 3,
  REST_LINE: 34,
  REST_W: 1080 - 2 * 56 - 2 * 22 - 96, // breedte voor de rustnamen
  REST_FONT: 26,
};

/** restLines: aantal regels voor "Rust" (0 = niemand rust). */
export function roundBlockHeight(matches, restLines) {
  const rest = Number(restLines) || 0;
  return 22 + 34 + 10 + matches * IMG.MATCH_ROW + (rest ? 12 + rest * IMG.REST_LINE : 0) + 22;
}

/** Ruime schatting van het aantal regels dat de rustnamen nodig hebben (liever wat lucht dan afkappen). */
export function restLineCount(text) {
  if (!text) return 0;
  return Math.max(1, Math.ceil((text.length * IMG.REST_FONT * 0.62) / IMG.REST_W));
}

export function restText(round, names) {
  return round.rest.map((id) => (isOpenSlot(id) ? "Open plek" : names.get(id) ?? "?")).join(", ");
}

/**
 * Verdeelt de rondes over foto's. Geeft per foto [eerste ronde, eind] (eind exclusief).
 * Zo min mogelijk foto's, en de rondes daarna zo gelijk mogelijk verdeeld.
 */
export function paginateRounds(roundCount, matches, restLines) {
  const block = roundBlockHeight(matches, restLines) + IMG.ROUND_GAP;
  const fit = (header) => Math.max(1, Math.floor((IMG.MAX_H - 2 * IMG.PAD - header - IMG.FOOTER + IMG.ROUND_GAP) / block));
  const cap1 = Math.min(IMG.MAX_ROUNDS_PER_PAGE, fit(IMG.FIRST_HEADER));
  const capN = Math.min(IMG.MAX_ROUNDS_PER_PAGE, fit(IMG.NEXT_HEADER));
  const pages = roundCount <= cap1 ? 1 : 1 + Math.ceil((roundCount - cap1) / capN);
  const even = Math.ceil(roundCount / pages);
  const first = Math.min(cap1, even);
  const ranges = [[0, first]];
  let start = first;
  for (let p = 1; p < pages; p++) {
    const left = roundCount - start;
    const size = Math.min(capN, Math.ceil(left / (pages - p)));
    ranges.push([start, start + size]);
    start += size;
  }
  return ranges.filter(([a, b]) => b > a);
}

export function pageHeight(page, rounds, matches, restLines) {
  const header = page === 0 ? IMG.FIRST_HEADER : IMG.NEXT_HEADER;
  return IMG.PAD * 2 + header + rounds * roundBlockHeight(matches, restLines) + (rounds - 1) * IMG.ROUND_GAP + IMG.FOOTER;
}

/** Vorm van de schema-foto's: wedstrijden per ronde en het aantal rustregels (overal gelijk). */
export function scheduleShape(t) {
  const rounds = t.schedule.rounds;
  const names = shortNames(t.players, 12);
  return {
    matches: Math.max(...rounds.map((r) => r.matches.length)),
    restLines: Math.max(0, ...rounds.map((r) => restLineCount(restText(r, names)))),
  };
}

/** Hoeveel schema-foto's er voor dit toernooi zijn. */
export function schedulePageRanges(t) {
  if (!t.schedule) return [];
  const { matches, restLines } = scheduleShape(t);
  return paginateRounds(t.schedule.rounds.length, matches, restLines);
}

/**
 * Korte namen voor het schema, altijd uniek binnen het toernooi. Per speler wordt de naam pas
 * langer als dat nodig is: voornaam → + initiaal achternaam → + achternaam → volledige naam.
 * Afkappen (max) gebeurt alleen als de naam daarna nog steeds uniek is.
 */
export function shortNames(players, max = 14) {
  const levels = (name) => {
    const parts = String(name).split(" ").filter(Boolean);
    const first = parts[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    return [first, last ? `${first} ${last[0]}.` : first, last ? `${first} ${last}` : first, String(name)];
  };
  const opts = new Map(players.map((p) => [p.id, levels(p.name)]));
  const level = new Map(players.map((p) => [p.id, 0]));
  for (let round = 0; round < 4; round++) {
    const groups = new Map();
    for (const p of players) {
      const label = opts.get(p.id)[level.get(p.id)].toLowerCase();
      groups.set(label, [...(groups.get(label) ?? []), p.id]);
    }
    let bumped = false;
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) {
        if (level.get(id) < 3) {
          level.set(id, level.get(id) + 1);
          bumped = true;
        }
      }
    }
    if (!bumped) break;
  }
  const full = new Map(players.map((p) => [p.id, opts.get(p.id)[level.get(p.id)]]));
  const cut = (n) => (n.length > max ? `${n.slice(0, max - 1)}…` : n);
  const cutCounts = new Map();
  for (const n of full.values()) cutCounts.set(cut(n).toLowerCase(), (cutCounts.get(cut(n).toLowerCase()) ?? 0) + 1);
  const out = new Map();
  for (const [id, n] of full) out.set(id, cutCounts.get(cut(n).toLowerCase()) > 1 ? n : cut(n));
  return out;
}

export function initials(name) {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

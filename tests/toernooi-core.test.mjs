// Bewaakt de spelregels: aanmelden, reservelijst, doorschuiven (ook ná het schema), beheer,
// en dat er nooit een hash of token naar buiten lekt.

import assert from "node:assert/strict";
import { test } from "node:test";

import { scheduleViolations } from "../app/_lib/toernooi/americano.js";
import {
  ToernooiError,
  adminSelfText,
  codeFromBytes,
  createTournament,
  formatDateNl,
  formatDateShort,
  generateSchedule,
  inviteText,
  isOpenSlot,
  isValidCode,
  join,
  leave,
  markUpdateShared,
  setCourtLabels,
  setSide,
  defaultSplit,
  nextFriday,
  roundSplits,
  pageHeight,
  schedulePageRanges,
  scheduleShape,
  shortNames,
  publicView,
  roundSlots,
  scheduleText,
  updateSettings,
  updateText,
  validateSettings,
} from "../app/_lib/toernooi/core.js";

const NOW = "2026-10-03T10:00:00.000Z";
const BASE = {
  title: "Vrijdagochtend toernooitje",
  date: "2026-10-09",
  start: "09:00",
  end: "11:00",
  round_minutes: 20,
  courts: 3,
  organizer_name: "Wessel",
};

const fresh = (extra = {}) =>
  createTournament({ input: { ...BASE, ...extra }, code: "K7Q2MX", adminKeyHash: "adminhash", now: NOW });

function withPlayers(t, n, prefix = "p") {
  for (let i = 1; i <= n; i++) t = join(t, { side: "B", id: `${prefix}${i}`, name: `Speler ${prefix}${i}`, tokenHash: `tok${prefix}${i}`, now: NOW }).t;
  return t;
}

const status = (t) => Object.fromEntries(t.players.map((p) => [p.id, p.status]));

test("maken: standaardwaarden en validatie", () => {
  const t = fresh();
  assert.equal(t.max_players, 12);
  assert.equal(t.signup_open, true);
  assert.deepEqual(t.header, { kind: "preset", id: "sfeer-1" });
  assert.equal(roundSlots(t).length, 6);
  assert.deepEqual(roundSlots(t)[1], { start: "9:20", end: "9:40" });
  assert.throws(() => fresh({ end: "08:00" }), /eindtijd/);
  assert.throws(() => fresh({ date: "2026-02-30" }), /datum/);
  assert.throws(() => fresh({ courts: 0 }), /banen/);
  assert.throws(() => fresh({ organizer_name: "  " }), /naam/);
  assert.throws(() => fresh({ pay_url: "https://evil.example/tikkie" }), /Tikkie/);
  assert.equal(fresh({ pay_url: "https://tikkie.me/pay/abc" }).pay_url, "https://tikkie.me/pay/abc");
  assert.throws(() => fresh({ start: "09:00", end: "09:30", round_minutes: 40 }), /hele ronde/);
});

test("aanmelden: vol = reservelijst, dubbele naam geweigerd, reserve begrensd", () => {
  let t = withPlayers(fresh(), 12);
  assert.equal(t.players.filter((p) => p.status === "in").length, 12);
  const r = join(t, { side: "B", id: "r1", name: "Klaas", tokenHash: "x", now: NOW });
  assert.equal(r.player.status, "reserve");
  t = r.t;
  assert.throws(() => join(t, { side: "B", id: "x", name: "  klaas ", tokenHash: "y", now: NOW }), /staat er al op/);
  t = withPlayers(t, 9, "r");
  assert.equal(t.players.filter((p) => p.status === "reserve").length, 10);
  assert.throws(() => join(t, { side: "B", id: "z", name: "Zeta", tokenHash: "z", now: NOW }), ToernooiError);
});

test("aanmelding gesloten: alleen de organisator kan nog toevoegen", () => {
  let t = fresh();
  t = { ...t, signup_open: false };
  assert.throws(() => join(t, { side: "B", id: "a", name: "Anna", tokenHash: "a", now: NOW }), /gesloten/);
  assert.equal(join(t, { side: "B", id: "a", name: "Anna", now: NOW, byAdmin: true }).player.added_by, "admin");
});

test("afmelden vóór het schema: eerste reserve schuift door", () => {
  let t = withPlayers(fresh(), 12);
  t = join(t, { side: "B", id: "r1", name: "Klaas", tokenHash: "k", now: NOW }).t;
  t = join(t, { side: "B", id: "r2", name: "Lies", tokenHash: "l", now: NOW }).t;
  const out = leave(t, { playerId: "p3", now: NOW, how: "self" });
  assert.equal(out.promoted.id, "r1");
  assert.equal(status(out.t).r1, "in");
  assert.equal(status(out.t).r2, "reserve");
  assert.equal(out.t.players.some((p) => p.id === "p3"), false);
  assert.deepEqual(out.t.pending_update, []); // geen schema = niets te melden
});

test("afmelden ná het schema: reserve neemt precies die plek over", () => {
  let t = withPlayers(fresh(), 12);
  t = join(t, { side: "B", id: "r1", name: "Klaas", tokenHash: "k", now: NOW }).t;
  t = generateSchedule(t, { seed: 4, now: NOW });
  const before = JSON.stringify(t.schedule.rounds);
  const out = leave(t, { playerId: "p5", now: NOW, how: "name" });
  const after = JSON.stringify(out.t.schedule.rounds);
  assert.equal(after, before.replaceAll('"p5"', '"r1"'));
  const ids = out.t.players.filter((p) => p.status === "in").map((p) => p.id);
  assert.deepEqual(scheduleViolations(out.t.schedule.rounds, ids, 3), []);
  assert.match(out.t.pending_update[0].text, /Speler p5 kan niet\. Klaas neemt de plek over\./);
});

test("afmelden ná het schema zonder reserve: open plek, nieuwe aanmelding vult die", () => {
  let t = withPlayers(fresh(), 12);
  t = generateSchedule(t, { seed: 4, now: NOW });
  t = leave(t, { playerId: "p2", now: NOW, how: "admin" }).t;
  const flat = JSON.stringify(t.schedule.rounds);
  assert.equal(flat.includes('"p2"'), false);
  assert.ok(t.schedule.rounds.some((r) => r.matches.some((m) => [...m.a, ...m.b].some(isOpenSlot))));
  assert.match(t.pending_update.at(-1).text, /plek vrij/);
  t = join(t, { side: "B", id: "n1", name: "Nina", tokenHash: "n", now: NOW }).t;
  assert.equal(JSON.stringify(t.schedule.rounds).includes("open:"), false);
  assert.equal(JSON.stringify(t.schedule.rounds).includes('"n1"'), true);
  assert.match(t.pending_update.at(-1).text, /Nina speelt mee op de open plek/);
});

test("beheer: meer plekken laat reserves doorschuiven, minder dan aanwezig kan niet", () => {
  let t = withPlayers(fresh(), 12);
  t = join(t, { side: "B", id: "r1", name: "Klaas", tokenHash: "k", now: NOW }).t;
  t = join(t, { side: "B", id: "r2", name: "Lies", tokenHash: "l", now: NOW }).t;
  const up = updateSettings(t, { max_players: 13 }, NOW);
  assert.equal(status(up).r1, "in");
  assert.equal(status(up).r2, "reserve");
  assert.throws(() => updateSettings(t, { max_players: 8 }, NOW), /Er doen al 12/);
});

test("beheer: andere tijd of banen laat het schema vervallen, titel niet", () => {
  let t = generateSchedule(withPlayers(fresh(), 12), { seed: 1, now: NOW });
  assert.ok(updateSettings(t, { title: "Vrijdag Americano" }, NOW).schedule);
  assert.equal(updateSettings(t, { courts: 4 }, NOW).schedule, null);
  assert.equal(updateSettings(t, { end: "11:30" }, NOW).schedule, null);
});

test("na het schema: nieuwe aanmelding zonder open plek = reserve, hussel neemt reserves mee", () => {
  let t = generateSchedule(withPlayers(fresh(), 10), { seed: 2, now: NOW });
  const r = join(t, { side: "B", id: "late", name: "Laatkomer", tokenHash: "l", now: NOW });
  assert.equal(r.player.status, "reserve");
  t = generateSchedule(r.t, { seed: 3, now: NOW });
  assert.equal(status(t).late, "in");
  assert.ok(JSON.stringify(t.schedule.rounds).includes('"late"'));
});

test("schema vervalt door andere banen: wachtende reserves schuiven eerst door (Codex-scenario)", () => {
  let t = withPlayers(fresh({ courts: 1, max_players: 4 }), 4);
  t = join(t, { side: "B", id: "r1", name: "Klaas", tokenHash: "k", now: NOW }).t;
  t = generateSchedule(t, { seed: 1, now: NOW });
  t = updateSettings(t, { courts: 2, max_players: 8 }, NOW);
  assert.equal(t.schedule, null);
  assert.equal(status(t).r1, "in");
  const late = join(t, { side: "B", id: "n1", name: "Nieuw", tokenHash: "n", now: NOW });
  assert.equal(late.player.status, "in");
  assert.deepEqual(late.t.players.map((p) => p.id), ["p1", "p2", "p3", "p4", "r1", "n1"]);
});

test("nieuwkomer sluit achter wachtende reserves aan", () => {
  let t = withPlayers(fresh(), 3);
  t = { ...t, players: [...t.players, { id: "r1", name: "Wachter", photo: 0, token_hash: null, joined_at: NOW, status: "reserve", added_by: "self" }] };
  assert.equal(join(t, { side: "B", id: "n1", name: "Nieuw", tokenHash: "n", now: NOW }).player.status, "reserve");
});

test("update delen wist alleen wat gedeeld is (Codex-scenario)", () => {
  let t = withPlayers(fresh(), 12);
  t = join(t, { side: "B", id: "r1", name: "Klaas", tokenHash: "k", now: NOW }).t;
  t = generateSchedule(t, { seed: 1, now: NOW });
  t = leave(t, { playerId: "p1", now: NOW }).t; // A
  const seen = t.pending_update.map((u) => u.id);
  t = leave(t, { playerId: "p2", now: NOW }).t; // B komt binnen terwijl A gedeeld wordt
  t = markUpdateShared(t, seen, NOW);
  assert.equal(t.pending_update.length, 1);
  assert.match(t.pending_update[0].text, /Speler p2 kan niet/);
});

test("zesuursgrens geldt ook als je alleen de eindtijd aanpast (Codex-scenario)", () => {
  assert.throws(() => updateSettings(fresh(), { end: "16:00" }, NOW), /maximaal 6 uur/);
  assert.equal(updateSettings(fresh(), { end: "12:00" }, NOW).end, "12:00");
});

test("open plek gaat naar de wachtende reserve, niet naar een nieuwkomer (Codex-scenario)", () => {
  let t = generateSchedule(withPlayers(fresh(), 12), { seed: 1, now: NOW });
  t = leave(t, { playerId: "p3", now: NOW }).t; // open plek
  t = updateSettings(t, { max_players: 11 }, NOW);
  t = join(t, { side: "B", id: "k", name: "Klaas", tokenHash: "k", now: NOW }).t; // vol: reserve
  assert.equal(status(t).k, "reserve");
  t = updateSettings(t, { max_players: 12 }, NOW); // plek erbij: Klaas krijgt de open plek
  assert.equal(status(t).k, "in");
  assert.ok(JSON.stringify(t.schedule.rounds).includes('"k"'));
  const nieuw = join(t, { side: "B", id: "n", name: "Nieuw", tokenHash: "n", now: NOW });
  assert.equal(nieuw.player.status, "reserve");
});

test("korte namen zijn altijd uniek (Codex-scenario: Jan de Vries / Jan Visser)", () => {
  const names = shortNames([
    { id: "a", name: "Jan de Vries" },
    { id: "b", name: "Jan Visser" },
    { id: "c", name: "Jeroen Bakker" },
    { id: "d", name: "Jeroen Kok" },
    { id: "e", name: "Sanne" },
  ]);
  assert.equal(new Set(names.values()).size, 5);
  assert.equal(names.get("e"), "Sanne");
  assert.equal(names.get("c"), "Jeroen B.");
  assert.notEqual(names.get("a"), names.get("b"));
});

test("veel rustspelers: de foto maakt ruimte voor meerdere regels (Codex-scenario)", () => {
  const players = ["Annemarijn", "Hendrik-Jan", "Jan-Willem", "Maximiliaan", "Bartholomeus", "Christiaan", "Wilhelmina", "Gerdientje", "Sanne", "Bas", "Eva", "Noor", "Ruben", "Thijs", "Lotte", "Daan"];
  let t = fresh({ courts: 2, max_players: 16 });
  players.forEach((n, i) => { t = join(t, { side: "B", id: `x${i}`, name: n, tokenHash: `t${i}`, now: NOW }).t; });
  t = generateSchedule(t, { seed: 3, now: NOW });
  const shape = scheduleShape(t);
  assert.equal(shape.matches, 2);
  assert.ok(shape.restLines >= 2, `rustregels ${shape.restLines}`);
  for (const [i, [a, b]] of schedulePageRanges(t).entries()) assert.ok(pageHeight(i, b - a, shape.matches, shape.restLines) <= 2200);
});

test("indeling: 2 uur kan 2 x 60, 3 x 40, 4 x 30; 1,5 uur kan 3 x 30 (Arns voorbeelden)", () => {
  const two = roundSplits(120).map((x) => `${x.rounds}x${x.minutes}`);
  for (const want of ["2x60", "3x40", "4x30", "6x20"]) assert.ok(two.includes(want), `${want} ontbreekt`);
  assert.ok(roundSplits(90).some((x) => x.rounds === 3 && x.minutes === 30));
  assert.deepEqual(defaultSplit(120), { rounds: 3, minutes: 40 });
  assert.deepEqual(defaultSplit(90), { rounds: 3, minutes: 30 });
});

test("gekozen indeling bepaalt rondes en tijden; te veel past niet", () => {
  const t = fresh({ rounds: 2, round_minutes: 60 });
  assert.deepEqual(roundSlots(t), [{ start: "9:00", end: "10:00" }, { start: "10:00", end: "11:00" }]);
  const s = generateSchedule(withPlayers(t, 12), { seed: 1, now: NOW });
  assert.equal(s.schedule.rounds.length, 2);
  assert.equal(roundSlots(fresh({ rounds: 3, round_minutes: 40 }))[2].end, "11:00");
  assert.throws(() => fresh({ rounds: 4, round_minutes: 40 }), /passen niet/);
  assert.equal(publicView(t).rounds, 2);
  // andere indeling = schema vervalt
  assert.equal(updateSettings(s, { rounds: 4, round_minutes: 30 }, NOW).schedule, null);
});

test("plek: standaard Sportcentrum Hoorn, eigen plek komt in het uitnodigingsbericht", () => {
  assert.equal(fresh().location, "Sportcentrum Hoorn");
  const t = fresh({ location: "Padelcentrum Zaandam" });
  assert.match(inviteText(t, "https://x"), /bij Padelcentrum Zaandam\./);
  assert.equal(publicView(t).location, "Padelcentrum Zaandam");
  assert.equal(updateSettings(t, { location: "Hoorn" }, NOW).location, "Hoorn");
});

test("kant: verplicht bij aanmelden, links+links of rechts+rechts nooit samen", () => {
  assert.throws(() => join(fresh(), { id: "x", name: "Zonder kant", tokenHash: "t", now: NOW }), /links, rechts of allebei/);
  let t = fresh();
  for (let i = 0; i < 12; i++) t = join(t, { id: `s${i}`, name: `Speler ${i}`, side: i < 6 ? "L" : "R", tokenHash: `t${i}`, now: NOW }).t;
  t = generateSchedule(t, { seed: 5, now: NOW });
  const side = Object.fromEntries(t.players.map((p) => [p.id, p.side]));
  for (const r of t.schedule.rounds) for (const m of r.matches) for (const pair of [m.a, m.b]) {
    assert.notEqual(side[pair[0]], side[pair[1]], "twee dezelfde kant in een koppel");
    assert.equal(side[pair[0]], "L", "linksspeler hoort eerst");
  }
  assert.equal(publicView(t).side_clashes, 0);
});

test("kant wijzigen: speler alleen vóór het schema, organisator altijd", () => {
  let t = withPlayers(fresh(), 4);
  t = setSide(t, "p1", "L", { now: NOW });
  assert.equal(t.players[0].side, "L");
  t = generateSchedule(t, { seed: 1, now: NOW });
  assert.throws(() => setSide(t, "p1", "R", { now: NOW }), /schema staat al/);
  assert.equal(setSide(t, "p1", "R", { now: NOW, byAdmin: true }).players[0].side, "R");
});

test("baannummers: twee tabbladen overschrijven elkaar niet (Codex-scenario)", () => {
  let t = fresh();
  t = setCourtLabels(t, { 0: "4" }, NOW); // tab A
  t = setCourtLabels(t, { 1: "5" }, NOW); // tab B, gebaseerd op dezelfde lege lijst
  assert.deepEqual(t.court_labels, ["4", "5", ""]);
});

test("na het schema: plek of baannummers wijzigen komt in de groepsupdate (Codex-scenario)", () => {
  let t = generateSchedule(withPlayers(fresh(), 12), { seed: 1, now: NOW });
  t = updateSettings(t, { location: "Padelcentrum Zaandam" }, NOW);
  assert.ok(t.schedule, "schema blijft staan");
  assert.match(t.pending_update.at(-1).text, /Nieuwe plek: Padelcentrum Zaandam/);
  t = setCourtLabels(t, { 0: "7" }, NOW);
  assert.match(t.pending_update.at(-1).text, /Banen: Baan 7, Baan 2, Baan 3/);
});

test("invaller met 'rechts' staat op het schema als tweede naam (Codex-scenario)", () => {
  let t = fresh({ courts: 1, max_players: 4 });
  for (let i = 1; i <= 4; i++) t = join(t, { id: `p${i}`, name: `Speler ${i}`, side: "B", tokenHash: `t${i}`, now: NOW }).t;
  t = join(t, { id: "r", name: "Rechter", side: "R", tokenHash: "r", now: NOW }).t;
  t = generateSchedule(t, { seed: 3, now: NOW });
  const firstOfPair = t.schedule.rounds[0].matches[0].a[0];
  t = leave(t, { playerId: firstOfPair, now: NOW }).t; // reserve "rechts" neemt de eerste plek over
  for (const r of publicView(t).schedule.rounds) for (const m of r.matches) for (const pair of [m.a, m.b]) {
    if (pair.includes("r")) assert.equal(pair[1], "r", "rechtsspeler hoort als tweede");
  }
});

test("tijden alleen op het hele of halve uur", () => {
  assert.throws(() => fresh({ start: "09:15" }), /hele of halve uur/);
  assert.throws(() => fresh({ end: "11:05" }), /hele of halve uur/);
  assert.equal(fresh({ start: "09:30", end: "11:00" }).start, "09:30");
});

test("schema vraagt minimaal 4 spelers", () => {
  assert.throws(() => generateSchedule(withPlayers(fresh(), 3), { seed: 1, now: NOW }), /minimaal 4/);
});

test("publieke weergave lekt nooit hashes of tokens", () => {
  const t = withPlayers(fresh(), 5);
  for (const admin of [false, true]) {
    const json = JSON.stringify(publicView(t, { admin }));
    assert.equal(json.includes("hash"), false);
    assert.equal(json.includes("tokp1"), false);
    assert.equal(json.includes("adminhash"), false);
  }
  assert.equal(publicView(t).log, undefined);
  assert.ok(Array.isArray(publicView(t, { admin: true }).log));
});

test("deelteksten: helder, met link, zonder em-dash en zonder 'De Padel Hub Hoorn'", () => {
  let t = withPlayers(fresh({ price_text: "€7,50", pay_url: "https://tikkie.me/pay/x" }), 12);
  t = generateSchedule(t, { seed: 1, now: NOW });
  t = leave(t, { playerId: "p1", now: NOW }).t;
  const url = "https://padelhubhoorn.nl/toernooi/K7Q2MX";
  const texts = [inviteText(t, url), scheduleText(t, url), updateText(t, url), adminSelfText(t, `${url}#beheer=abc`)];
  for (const s of texts) {
    assert.ok(s.includes("padelhubhoorn.nl/toernooi/K7Q2MX"));
    assert.equal(s.includes("—"), false);
    assert.equal(/(De|The) Padel Hub Hoorn/.test(s), false);
  }
  assert.match(texts[0], /^🎾 Vrijdagochtend toernooitje\nVrijdag 9 oktober, 9:00-11:00 bij Sportcentrum Hoorn\./);
  assert.match(texts[0], /Kosten: €7,50 p\.p\./);
  assert.match(texts[1], /Betalen: https:\/\/tikkie\.me/);
  assert.match(texts[2], /Speler p1 kan niet/);
});

test("datums en codes", () => {
  assert.equal(formatDateNl("2026-10-09"), "vrijdag 9 oktober");
  assert.equal(formatDateShort("2026-10-09"), "VR 9 OKT");
  assert.equal(nextFriday(new Date("2026-10-03T08:00:00Z")), "2026-10-09");
  assert.equal(nextFriday(new Date("2026-10-09T08:00:00Z")), "2026-10-16");
  const code = codeFromBytes([0, 1, 2, 30, 31, 255]);
  assert.ok(isValidCode(code));
  assert.equal(isValidCode("K0Q2MX"), false);
  assert.equal(validateSettings({ courts: 4 }, { partial: true }).courts, 4);
});

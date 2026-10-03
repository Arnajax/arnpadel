// Bewaakt de Americano-indeling: harde regels voor elk formaat, en nul herhaalde partners in de
// situaties die de vrijdaggroep echt speelt.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  makeSchedule,
  sideClashCount,
  scheduleStats,
  scheduleViolations,
  substitute,
} from "../app/_lib/toernooi/americano.js";

const players = (n) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

function spread(map, ids) {
  const vals = ids.map((id) => map.get(id) ?? 0);
  return Math.max(...vals) - Math.min(...vals);
}

test("harde regels gelden voor elk formaat (4-24 spelers, 1-6 banen, 1-10 rondes)", () => {
  let checked = 0;
  for (let n = 4; n <= 24; n += 1) {
    for (let courts = 1; courts <= 6; courts += 1) {
      for (const rounds of [1, 5, 10]) {
        const ids = players(n);
        const sched = makeSchedule(ids, { courts, rounds, seed: n * 100 + courts * 10 + rounds });
        assert.equal(sched.length, rounds);
        assert.deepEqual(scheduleViolations(sched, ids, courts), [], `${n}/${courts}/${rounds}`);
        const perRound = Math.min(courts, Math.floor(n / 4));
        for (const round of sched) {
          assert.equal(round.matches.length, perRound);
          assert.equal(round.rest.length, n - perRound * 4);
        }
        const { games, rests } = scheduleStats(sched);
        assert.ok(spread(games, ids) <= 1, `wedstrijden ongelijk bij ${n}/${courts}/${rounds}`);
        assert.ok(spread(rests, ids) <= 1, `rust ongelijk bij ${n}/${courts}/${rounds}`);
        checked += 1;
      }
    }
  }
  assert.equal(checked, 21 * 6 * 3); // noemer: zoveel formaten echt gecontroleerd
});

const REAL = [
  [8, 2, 6],
  [8, 2, 7],
  [12, 3, 6],
  [12, 3, 8],
  [16, 4, 8],
  [13, 3, 8],
  [14, 3, 6],
  [15, 3, 7],
  [16, 3, 8],
  [20, 5, 8],
];

test("nul herhaalde partners in de echte scenario's (5 seeds elk)", () => {
  let checked = 0;
  for (const [n, courts, rounds] of REAL) {
    for (const seed of [1, 7, 42, 2026, 99991]) {
      const sched = makeSchedule(players(n), { courts, rounds, seed });
      assert.equal(scheduleStats(sched).partnerRepeats, 0, `${n}/${courts}/${rounds} seed ${seed}`);
      checked += 1;
    }
  }
  assert.equal(checked, REAL.length * 5);
});

test("zelfde seed geeft hetzelfde schema, andere seed (meestal) een ander", () => {
  const ids = players(12);
  const a = makeSchedule(ids, { courts: 3, rounds: 6, seed: 5 });
  const b = makeSchedule(ids, { courts: 3, rounds: 6, seed: 5 });
  const c = makeSchedule(ids, { courts: 3, rounds: 6, seed: 6 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("snel genoeg voor een serverless functie", () => {
  const t0 = Date.now();
  makeSchedule(players(24), { courts: 6, rounds: 12, seed: 3 });
  assert.ok(Date.now() - t0 < 3000);
});

test("vervangen houdt het schema geldig", () => {
  const ids = players(13);
  const sched = makeSchedule(ids, { courts: 3, rounds: 6, seed: 11 });
  const swapped = substitute(sched, "p4", "reserve1");
  const newIds = ids.map((id) => (id === "p4" ? "reserve1" : id));
  assert.deepEqual(scheduleViolations(swapped, newIds, 3), []);
  assert.equal(JSON.stringify(swapped).includes('"p4"'), false);
});

test("te weinig spelers geeft een duidelijke fout", () => {
  assert.throws(() => makeSchedule(players(3), { courts: 1, rounds: 3, seed: 1 }), /Minimaal 4/);
});

test("links/rechts: nooit twee van dezelfde kant samen als het kan (30 seeds per mix)", () => {
  const mixes = [[6, 6, 0, 3, 3], [4, 4, 4, 3, 6], [5, 3, 4, 3, 4], [3, 7, 3, 3, 6], [8, 8, 0, 4, 3]];
  let checked = 0;
  for (const [l, r, b, courts, rounds] of mixes) {
    const ids = [];
    const sides = {};
    let i = 0;
    for (const [side, n] of [["L", l], ["R", r], ["B", b]]) for (let k = 0; k < n; k++) { ids.push(`x${i}`); sides[`x${i++}`] = side; }
    for (let seed = 1; seed <= 30; seed++) {
      const sched = makeSchedule(ids, { courts, rounds, seed, sides });
      assert.equal(sideClashCount(sched, sides), 0, `${l}L ${r}R ${b}B seed ${seed}`);
      assert.deepEqual(scheduleViolations(sched, ids, courts), []);
      checked++;
    }
  }
  assert.equal(checked, 150);
});

test("links/rechts onmogelijk (8 rechts op 6 koppels): zo min mogelijk botsingen", () => {
  const ids = [];
  const sides = {};
  [["R", 8], ["L", 2], ["B", 2]].forEach(([side, n]) => { for (let k = 0; k < n; k++) { const id = `${side}${k}`; ids.push(id); sides[id] = side; } });
  const sched = makeSchedule(ids, { courts: 3, rounds: 3, seed: 1, sides });
  assert.equal(sideClashCount(sched, sides), 6); // per ronde minimaal 2 (8 rechts, 6 koppels)
});

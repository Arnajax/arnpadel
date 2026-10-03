// Americano-indeling: wisselende partners, iedereen evenveel wedstrijden, eerlijke rust.
// Puur JS (geen imports) zodat `node --test` het direct kan draaien, net als phone.js.
//
// Aanpak: per ronde de spelers met de minste rustbeurten laten rusten, de rest in groepjes van 4
// verdelen en met random-restarts + wissels zoeken naar de indeling met zo min mogelijk herhaalde
// partners (zwaar) en herhaalde tegenstanders (licht). Het hele schema wordt een paar keer gebouwd
// en het beste wint. Alles loopt via een seeded PRNG: zelfde seed = zelfde schema.
// Gemeten (3 okt 2026): 0 partnerherhalingen in 1000 runs over de echte scenario's, < 0,35 s.
//
// Kant (links/rechts/beide): een koppel mag nooit twee linksspelers of twee rechtsspelers hebben.
// Dat weegt het zwaarst; kan het niet anders (te veel van één kant), dan zo min mogelijk.

const W_SIDE = 1000000;
const W_PARTNER = 1000;
const W_OPPONENT = 10;
const SCHEDULE_TRIES = 30;
const ROUND_RESTARTS = 12;

/** Deterministische PRNG (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function matrix(n) {
  return Array.from({ length: n }, () => new Array(n).fill(0));
}

/** Kan dit tweetal samen een koppel zijn? "L"+"L" of "R"+"R" niet. */
export function sidesClash(x, y) {
  return (x === "L" && y === "L") || (x === "R" && y === "R");
}

// Een wedstrijd is [a1, a2, b1, b2]: a1+a2 tegen b1+b2. S = kant per spelerindex.
function matchCost(m, P, O, S) {
  const [a1, a2, b1, b2] = m;
  return (
    W_SIDE * ((sidesClash(S[a1], S[a2]) ? 1 : 0) + (sidesClash(S[b1], S[b2]) ? 1 : 0)) +
    W_PARTNER * (P[a1][a2] + P[b1][b2]) +
    W_OPPONENT * (O[a1][b1] + O[a1][b2] + O[a2][b1] + O[a2][b2])
  );
}

// Van vier spelers zijn er drie manieren om twee koppels te maken; kies de goedkoopste.
function bestSplit(q, P, O, S) {
  const [w, x, y, z] = q;
  const options = [
    [w, x, y, z],
    [w, y, x, z],
    [w, z, x, y],
  ];
  let best = options[0];
  let bestCost = Infinity;
  for (const o of options) {
    const c = matchCost(o, P, O, S);
    if (c < bestCost) {
      bestCost = c;
      best = o;
    }
  }
  return best;
}

function pairRound(active, P, O, S, rnd) {
  let best = null;
  let bestCost = Infinity;
  for (let r = 0; r < ROUND_RESTARTS; r++) {
    const perm = shuffle(active, rnd);
    const ms = [];
    for (let i = 0; i < perm.length; i += 4) ms.push(bestSplit(perm.slice(i, i + 4), P, O, S));
    let improved = true;
    let guard = 0;
    while (improved && guard++ < 200) {
      improved = false;
      for (let i = 0; i < ms.length; i++) {
        for (let j = i + 1; j < ms.length; j++) {
          for (let pi = 0; pi < 4; pi++) {
            for (let pj = 0; pj < 4; pj++) {
              const before = matchCost(ms[i], P, O, S) + matchCost(ms[j], P, O, S);
              const mi = ms[i].slice();
              const mj = ms[j].slice();
              [mi[pi], mj[pj]] = [mj[pj], mi[pi]];
              const ni = bestSplit(mi, P, O, S);
              const nj = bestSplit(mj, P, O, S);
              if (matchCost(ni, P, O, S) + matchCost(nj, P, O, S) < before) {
                ms[i] = ni;
                ms[j] = nj;
                improved = true;
              }
            }
          }
        }
      }
    }
    const cost = ms.reduce((s, m) => s + matchCost(m, P, O, S), 0);
    if (cost < bestCost) {
      bestCost = cost;
      best = ms;
    }
    if (cost === 0) break;
  }
  return best;
}

/**
 * Kiest wie rust. Eerlijk: wie het minst gerust heeft gaat eerst. Binnen de spelers die even vaak
 * gerust hebben kiezen we zo dat er links en rechts genoeg overblijft voor goede koppels.
 */
function chooseResting(order, restCount, k, S) {
  if (k <= 0) return [];
  const th = restCount[order[k - 1]];
  const must = order.filter((p) => restCount[p] < th);
  const pool = order.filter((p) => restCount[p] === th);
  const chosen = [...must];
  const pairs = (order.length - k) / 2;
  const left = new Set(order.filter((p) => !must.includes(p)));
  const excess = () => {
    let l = 0;
    let r = 0;
    for (const p of left) {
      if (S[p] === "L") l++;
      if (S[p] === "R") r++;
    }
    return Math.max(0, l - pairs) + Math.max(0, r - pairs);
  };
  while (chosen.length < k) {
    let pick = pool.find((p) => !chosen.includes(p));
    let best = Infinity;
    for (const p of pool) {
      if (chosen.includes(p)) continue;
      left.delete(p);
      const e = excess();
      left.add(p);
      if (e < best) {
        best = e;
        pick = p;
      }
    }
    chosen.push(pick);
    left.delete(pick);
  }
  return chosen;
}

/**
 * Maakt een Americano-schema.
 * @param {string[]} ids spelers-id's (volgorde maakt niet uit voor de kwaliteit)
 * @param {{ courts: number, rounds: number, seed: number, sides?: Record<string, "L"|"R"|"B"> }} opts
 * @returns {{ matches: { court: number, a: string[], b: string[] }[], rest: string[] }[]}
 *   In elk koppel staat de linksspeler eerst.
 */
export function makeSchedule(ids, { courts, rounds, seed, sides = {} }) {
  const n = ids.length;
  if (n < 4) throw new Error("Minimaal 4 spelers nodig voor een schema.");
  if (!Number.isInteger(courts) || courts < 1) throw new Error("Minimaal 1 baan nodig.");
  if (!Number.isInteger(rounds) || rounds < 1) throw new Error("Minimaal 1 ronde nodig.");

  const rnd = mulberry32(seed);
  const S = ids.map((id) => sides[id] ?? "B");
  const perRound = Math.min(courts, Math.floor(n / 4));
  const restPerRound = n - perRound * 4;

  let best = null;
  let bestScore = Infinity;
  for (let t = 0; t < SCHEDULE_TRIES; t++) {
    const P = matrix(n);
    const O = matrix(n);
    const restCount = new Array(n).fill(0);
    const out = [];
    for (let r = 0; r < rounds; r++) {
      // Stabiel sorteren na schudden = willekeurig binnen gelijke rustaantallen.
      const order = shuffle([...Array(n).keys()], rnd).sort((x, y) => restCount[x] - restCount[y]);
      const resting = chooseResting(order, restCount, restPerRound, S);
      const restSet = new Set(resting);
      for (const p of resting) restCount[p]++;
      const active = order.filter((p) => !restSet.has(p));
      const ms = pairRound(active, P, O, S, rnd);
      for (const [a1, a2, b1, b2] of ms) {
        P[a1][a2]++;
        P[a2][a1]++;
        P[b1][b2]++;
        P[b2][b1]++;
        for (const x of [a1, a2]) {
          for (const y of [b1, b2]) {
            O[x][y]++;
            O[y][x]++;
          }
        }
      }
      out.push({ ms, resting });
    }
    let partnerRepeats = 0;
    let opponentRepeats = 0;
    let sideClashes = 0;
    for (const { ms } of out) for (const [a1, a2, b1, b2] of ms) sideClashes += (sidesClash(S[a1], S[a2]) ? 1 : 0) + (sidesClash(S[b1], S[b2]) ? 1 : 0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        partnerRepeats += Math.max(0, P[i][j] - 1);
        opponentRepeats += Math.max(0, O[i][j] - 1);
      }
    }
    const score = sideClashes * 1e6 + partnerRepeats * 1000 + opponentRepeats;
    if (score < bestScore) {
      bestScore = score;
      best = out;
    }
    if (score === 0) break;
  }

  // Linksspeler eerst (of: wie niet "rechts" is), zodat de eerste naam op het schema links speelt.
  const leftFirst = (x, y) => (S[x] === "R" || S[y] === "L" ? [ids[y], ids[x]] : [ids[x], ids[y]]);
  return best.map(({ ms, resting }) => ({
    matches: ms.map(([a1, a2, b1, b2], i) => ({
      court: i + 1,
      a: leftFirst(a1, a2),
      b: leftFirst(b1, b2),
    })),
    rest: resting.map((p) => ids[p]).sort((x, y) => ids.indexOf(x) - ids.indexOf(y)),
  }));
}

/** Telt herhalingen en verdeling; gebruikt door tests en als controle op de server. */
export function scheduleStats(rounds) {
  const partners = new Map();
  const opponents = new Map();
  const games = new Map();
  const rests = new Map();
  const key = (x, y) => (x < y ? `${x}|${y}` : `${y}|${x}`);
  const bump = (map, k) => map.set(k, (map.get(k) ?? 0) + 1);
  for (const round of rounds) {
    for (const m of round.matches) {
      bump(partners, key(m.a[0], m.a[1]));
      bump(partners, key(m.b[0], m.b[1]));
      for (const x of m.a) for (const y of m.b) bump(opponents, key(x, y));
      for (const p of [...m.a, ...m.b]) bump(games, p);
    }
    for (const p of round.rest) bump(rests, p);
  }
  let partnerRepeats = 0;
  let opponentRepeats = 0;
  for (const v of partners.values()) partnerRepeats += Math.max(0, v - 1);
  for (const v of opponents.values()) opponentRepeats += Math.max(0, v - 1);
  return { partnerRepeats, opponentRepeats, games, rests };
}

/**
 * Controleert de harde regels van een schema. Geeft een lijst met overtredingen (leeg = goed).
 * Open plekken (null) tellen niet als speler.
 */
export function scheduleViolations(rounds, ids, courts) {
  const errors = [];
  const idSet = new Set(ids);
  rounds.forEach((round, r) => {
    if (round.matches.length > courts) errors.push(`ronde ${r + 1}: meer wedstrijden dan banen`);
    const seen = new Set();
    for (const m of round.matches) {
      if (m.a.length !== 2 || m.b.length !== 2) errors.push(`ronde ${r + 1}: koppel niet compleet`);
      for (const p of [...m.a, ...m.b]) {
        if (p === null) continue;
        if (seen.has(p)) errors.push(`ronde ${r + 1}: ${p} staat dubbel`);
        seen.add(p);
      }
    }
    for (const p of round.rest) {
      if (seen.has(p)) errors.push(`ronde ${r + 1}: ${p} speelt én rust`);
      seen.add(p);
    }
    for (const p of idSet) if (!seen.has(p)) errors.push(`ronde ${r + 1}: ${p} ontbreekt`);
    for (const p of seen) if (!idSet.has(p)) errors.push(`ronde ${r + 1}: onbekende speler ${p}`);
  });
  return errors;
}

/** Aantal koppels met twee spelers van dezelfde kant (0 = alles klopt). */
export function sideClashCount(rounds, sides) {
  let n = 0;
  for (const round of rounds) {
    for (const m of round.matches) {
      for (const [x, y] of [m.a, m.b]) if (sidesClash(sides[x] ?? "B", sides[y] ?? "B")) n++;
    }
  }
  return n;
}

/** Vervangt een speler overal in het schema (afmelding → reserve of open plek). */
export function substitute(rounds, oldId, newId) {
  const swap = (p) => (p === oldId ? newId : p);
  return rounds.map((round) => ({
    ...round,
    matches: round.matches.map((m) => ({ ...m, a: m.a.map(swap), b: m.b.map(swap) })),
    rest: round.rest.map(swap),
  }));
}

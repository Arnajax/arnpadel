// Bewaakt de telefoonvalidatie én de pariteit met de Python-kant (padel_booking.py).
// Drift tussen client en server betekent: formulier zegt OK, server geeft 400 —
// of erger, formulier laat iets door dat de server accepteert maar niemand kan bellen.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { canonicalPhone, formatPhone, phoneError } from "../app/_lib/phone.js";

// Vormen, geen echte klantnummers.
const CASES = [
  ["0612345678", "+31612345678"],
  ["06 12 34 56 78", "+31612345678"],
  ["06-12-34-56-78", "+31612345678"],
  ["+31612345678", "+31612345678"],
  ["+31 6 12 34 56 78", "+31612345678"],
  ["0031612345678", "+31612345678"],
  ["31612345678", "+31612345678"],
  ["612345678", "+31612345678"],
  ["(06) 12345678", "+31612345678"],
  ["06211544665", null], // 11 cijfers — de fout die deze validatie moet vangen
  ["061234567", null], // 9 cijfers, te kort
  ["0725123456", null], // vast nummer
  ["06abc12345", null],
  ["", null],
  ["   ", null],
  ["+4917612345678", null], // buitenlands mobiel
];

test("canonicalPhone normaliseert en weigert volgens verwachting", () => {
  for (const [input, expected] of CASES) {
    assert.equal(canonicalPhone(input), expected, `input: ${JSON.stringify(input)}`);
  }
});

test("phoneError zwijgt bij leeg en bij geldig, en benoemt de fout anders", () => {
  assert.equal(phoneError(""), null);
  assert.equal(phoneError("0612345678"), null);
  assert.match(phoneError("06211544665"), /11 cijfers/);
  assert.match(phoneError("061234567"), /9 cijfers/);
  assert.match(phoneError("06abc12345"), /alleen cijfers/);
  assert.match(phoneError("0725123456"), /geen mobiel nummer/);
});

test("formatPhone toont het nummer leesbaar terug aan de klant", () => {
  assert.equal(formatPhone("+31612345678"), "+31 6 12 34 56 78");
  assert.equal(formatPhone("+31621154466"), "+31 6 21 15 44 66");
});

test("pariteit met canonical_phone() in padel_booking.py", async (t) => {
  let python;
  try {
    python = execFileSync("python3", ["-c", "print(1)"], { encoding: "utf8" }).trim();
  } catch {
    return t.skip("python3 niet beschikbaar");
  }
  assert.equal(python, "1");

  // De kopie in tests/fixtures staat in git (GitHub-check). Het volledige VPS-bestand staat
  // alleen lokaal (er zit een sleutel in); is het er, dan moet de kopie er exact gelijk aan zijn.
  const FN = /^def canonical_phone\(raw: str\):[\s\S]*?\n(?=\S)/m;
  const kopie = (await readFile(new URL("./fixtures/canonical_phone_vps.py", import.meta.url), "utf8")).match(FN);
  assert.ok(kopie, "canonical_phone() niet gevonden in tests/fixtures/canonical_phone_vps.py");
  let vps = null;
  try {
    vps = await readFile(new URL("../padel-booking/padel_booking_vps.py", import.meta.url), "utf8");
  } catch {
    // Niet aanwezig (GitHub): de kopie is de bron.
  }
  if (vps !== null) {
    const live = vps.match(FN);
    assert.ok(live, "canonical_phone() niet gevonden in padel_booking_vps.py");
    assert.equal(kopie[0], live[0], "tests/fixtures/canonical_phone_vps.py loopt achter op padel_booking_vps.py");
  }
  const match = kopie;

  const script = `import re, json, sys\n${match[0]}\ncases = json.loads(sys.argv[1])\nprint(json.dumps([canonical_phone(c) for c in cases]))`;
  const inputs = CASES.map(([input]) => input);
  const out = execFileSync("python3", ["-c", script, JSON.stringify(inputs)], { encoding: "utf8" });
  const pythonResults = JSON.parse(out);

  inputs.forEach((input, i) => {
    assert.equal(
      pythonResults[i],
      canonicalPhone(input),
      `client/server oneens over ${JSON.stringify(input)}`,
    );
  });
});

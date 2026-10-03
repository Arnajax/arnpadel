// Bewaakt de fotocontrole: alleen complete JPEG's mogen erin, anders breekt het schema-plaatje.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { jpegInfo } from "../app/_lib/toernooi/jpeg.js";

test("echte JPEG wordt herkend met afmetingen", async () => {
  const bytes = new Uint8Array(await readFile(new URL("../public/toernooi/sfeer-1-og.jpg", import.meta.url)));
  assert.deepEqual(jpegInfo(bytes), { width: 1200, height: 630 });
});

test("kapotte of afgekapte bestanden worden geweigerd", async () => {
  const bytes = new Uint8Array(await readFile(new URL("../public/toernooi/sfeer-1-og.jpg", import.meta.url)));
  assert.equal(jpegInfo(new Uint8Array([0xff, 0xd8, 0xff, 0x00])), null); // Codex-scenario
  assert.equal(jpegInfo(bytes.slice(0, Math.floor(bytes.length / 2))), null); // halve upload
  assert.equal(jpegInfo(new Uint8Array(200).fill(0x41)), null);
  const png = new Uint8Array(200);
  png.set([0x89, 0x50, 0x4e, 0x47]);
  assert.equal(jpegInfo(png), null);
});

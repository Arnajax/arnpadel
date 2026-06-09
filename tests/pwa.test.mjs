import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";

async function readText(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function readBinary(path) {
  return readFile(new URL(`../${path}`, import.meta.url));
}

async function assertFile(path) {
  const info = await stat(new URL(`../${path}`, import.meta.url));
  assert.equal(info.isFile(), true, `${path} should be a file`);
}

function pngDimensions(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG", "file should be a PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("manifest defines a standalone Padel Hub install target", async () => {
  const manifest = await readText("app/manifest.ts");

  assert.match(manifest, /name:\s*"Padel Hub Hoorn"/);
  assert.match(manifest, /short_name:\s*"Padel Hub"/);
  assert.match(manifest, /start_url:\s*"\/"/);
  assert.match(manifest, /scope:\s*"\/"/);
  assert.match(manifest, /display:\s*"standalone"/);
  assert.match(manifest, /theme_color:\s*"#[0-9a-fA-F]{6}"/);
  assert.match(manifest, /\/pwa\/icon-192\.png/);
  assert.match(manifest, /\/pwa\/icon-512\.png/);
  assert.match(manifest, /\/pwa\/maskable-512\.png/);
  assert.match(manifest, /purpose:\s*"maskable"/);
});

test("app icons exist with the expected install sizes", async () => {
  const icon192 = pngDimensions(await readBinary("public/pwa/icon-192.png"));
  const icon512 = pngDimensions(await readBinary("public/pwa/icon-512.png"));
  const maskable512 = pngDimensions(await readBinary("public/pwa/maskable-512.png"));
  const appleIcon = pngDimensions(await readBinary("app/apple-icon.png"));

  assert.deepEqual(icon192, { width: 192, height: 192 });
  assert.deepEqual(icon512, { width: 512, height: 512 });
  assert.deepEqual(maskable512, { width: 512, height: 512 });
  assert.deepEqual(appleIcon, { width: 180, height: 180 });
});

test("service worker keeps booking online and provides an offline navigation fallback", async () => {
  const serviceWorker = await readText("public/sw.js");

  assert.match(serviceWorker, /OFFLINE_URL\s*=\s*"\/offline"/);
  assert.match(serviceWorker, /event\.request\.mode\s*===\s*"navigate"/);
  assert.match(serviceWorker, /\/api\//);
  assert.doesNotMatch(serviceWorker, /booking-batch/);
});

test("runtime registers the service worker and root layout mounts it", async () => {
  const runtime = await readText("app/components/PwaRuntime.tsx");
  const layout = await readText("app/layout.tsx");

  assert.match(runtime, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
  assert.match(layout, /<PwaRuntime \/>/);
  assert.match(layout, /appleWebApp:\s*{/);
  assert.match(layout, /themeColor:\s*"#[0-9a-fA-F]{6}"/);
});

test("offline page is available and intentionally minimal", async () => {
  const offlinePage = await readText("app/offline/page.tsx");

  assert.match(offlinePage, /Geen verbinding/);
  assert.match(offlinePage, /Padel Hub Hoorn/);
  await assertFile("app/offline/page.tsx");
});

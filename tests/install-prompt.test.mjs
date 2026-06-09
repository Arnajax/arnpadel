import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

import {
  EARLY_CAPTURE_SCRIPT,
  intendCustomAndroid,
  isMobile,
  isStandalone,
  dismissedActive,
  hasVisited,
  isInstalledMarked,
  lsGet,
} from "../app/_lib/install-eligibility.js";

async function readText(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

// Build a fresh fake browser environment for one scenario.
function makeEnv({
  pathname = "/",
  ua = "",
  maxTouchPoints = 0,
  coarse = false,
  displayStandalone = false,
  navStandalone = false,
  store = {},
} = {}) {
  const map = new Map(Object.entries(store));
  const localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
  const matchMedia = (q) => ({
    matches: q.includes("display-mode: standalone")
      ? displayStandalone
      : q.includes("pointer:coarse")
        ? coarse
        : false,
  });
  const navigator = {
    userAgent: ua,
    maxTouchPoints,
    standalone: navStandalone,
    platform: /iphone|ipad|ipod/i.test(ua) ? "iPhone" : "MacIntel",
  };
  const location = { pathname };
  return { localStorage, matchMedia, navigator, location };
}

// Run the inline capture script in a sandbox and fire `beforeinstallprompt`.
function runScript(env) {
  const listeners = {};
  const win = {
    __bip: null,
    addEventListener: (type, fn) => {
      (listeners[type] ||= []).push(fn);
    },
    dispatchEvent: () => true,
  };
  const ctx = {
    window: win,
    localStorage: env.localStorage,
    matchMedia: env.matchMedia,
    navigator: env.navigator,
    location: env.location,
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
  };
  vm.createContext(ctx);
  vm.runInContext(EARLY_CAPTURE_SCRIPT, ctx);
  const evt = { type: "beforeinstallprompt", defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
  for (const fn of listeners["beforeinstallprompt"] || []) fn(evt);
  return { prevented: win.__bip?.prevented === true, defaultPrevented: evt.defaultPrevented };
}

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const NOW = Date.now();

const scenarios = {
  "android second visit, eligible → intercept": {
    env: { ua: ANDROID_UA, maxTouchPoints: 5, coarse: true, store: { "phh-visited": "1" } },
    want: true,
  },
  "android first visit (not visited) → native": {
    env: { ua: ANDROID_UA, maxTouchPoints: 5, coarse: true, store: {} },
    want: false,
  },
  "android dismissed recently → native": {
    env: { ua: ANDROID_UA, maxTouchPoints: 5, coarse: true, store: { "phh-visited": "1", "phh-install-dismissed": String(NOW) } },
    want: false,
  },
  "android dismissal expired (15 days) → intercept": {
    env: { ua: ANDROID_UA, maxTouchPoints: 5, coarse: true, store: { "phh-visited": "1", "phh-install-dismissed": String(NOW - 15 * 864e5) } },
    want: true,
  },
  "android already installed marker → native": {
    env: { ua: ANDROID_UA, maxTouchPoints: 5, coarse: true, store: { "phh-visited": "1", "phh-installed": "1" } },
    want: false,
  },
  "android standalone → native": {
    env: { ua: ANDROID_UA, maxTouchPoints: 5, coarse: true, displayStandalone: true, store: { "phh-visited": "1" } },
    want: false,
  },
  "android non-home path → native": {
    env: { pathname: "/voorwaarden", ua: ANDROID_UA, maxTouchPoints: 5, coarse: true, store: { "phh-visited": "1" } },
    want: false,
  },
  "desktop chrome → native": {
    env: { ua: DESKTOP_UA, maxTouchPoints: 0, coarse: false, store: { "phh-visited": "1" } },
    want: false,
  },
  "narrow desktop (fine pointer) → native": {
    env: { ua: DESKTOP_UA, maxTouchPoints: 0, coarse: false, store: { "phh-visited": "1" } },
    want: false,
  },
};

test("inline capture script behaves correctly across the matrix", () => {
  for (const [name, { env, want }] of Object.entries(scenarios)) {
    const script = runScript(makeEnv(env));
    assert.equal(script.prevented, want, `inline script wrong for: ${name}`);
    // preventDefault is called iff we intend to show custom UI (else native is left intact).
    assert.equal(script.defaultPrevented, want, `preventDefault mismatch for: ${name}`);
  }
});

test("inline script embeds the EXACT module predicates (no drift possible)", () => {
  // The inline <script> can't import; it is built from these functions' source.
  // Asserting containment proves the gate logic and the keys cannot diverge.
  for (const fn of [
    lsGet,
    dismissedActive,
    isStandalone,
    isMobile,
    hasVisited,
    isInstalledMarked,
    intendCustomAndroid,
  ]) {
    assert.ok(
      EARLY_CAPTURE_SCRIPT.includes(fn.toString()),
      `EARLY_CAPTURE_SCRIPT must embed ${fn.name} verbatim`,
    );
  }
});

test("layout injects the shared capture script and homepage mounts the prompt", async () => {
  const layout = await readText("app/layout.tsx");
  assert.match(layout, /EARLY_CAPTURE_SCRIPT/);
  assert.match(layout, /from "\.\/_lib\/install-eligibility"/);

  const home = await readText("app/HomePageClient.tsx");
  assert.match(home, /<InstallPrompt/);
  assert.match(home, /bookingSucceeded=\{successData !== null\}/);
  assert.match(home, /!installPromptOpen && \(/);
});

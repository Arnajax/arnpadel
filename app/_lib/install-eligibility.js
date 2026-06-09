// Single source of truth for PWA install-prompt eligibility.
//
// The React component (InstallPrompt.tsx) imports these predicate functions and
// runs them at runtime. The early-capture <script> injected in layout.tsx CANNOT
// import a module, so EARLY_CAPTURE_SCRIPT below is generated from the *exact same*
// functions via Function.prototype.toString(). That makes drift between the inline
// script and the component impossible by construction (verified by tests/install-prompt.test.mjs).
//
// These predicates intentionally read ambient browser globals (localStorage,
// matchMedia, navigator, location) so the identical source works both when imported
// in the browser and when embedded in the inline script.

export const STORAGE = {
  dismissed: "phh-install-dismissed", // value = timestamp (ms) of last dismissal
  installed: "phh-installed", // value = "1" once installed (best-effort)
  visited: "phh-visited", // value = "1" after the first visit
};

export const DISMISS_TTL_MS = 14 * 864e5; // 14 days

export function lsGet(k) {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return null;
  }
}

export function lsSet(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch (e) {
    /* storage blocked (Safari private / disabled) — never throw */
  }
}

export function dismissedActive() {
  var v = lsGet("phh-install-dismissed");
  if (!v) return false;
  var t = parseInt(v, 10);
  return isFinite(t) && Date.now() - t < 14 * 864e5;
}

export function isStandalone() {
  try {
    return (
      matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone === true
    );
  } catch (e) {
    return false;
  }
}

export function isMobile() {
  try {
    return (
      /android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && matchMedia("(pointer:coarse)").matches)
    );
  } catch (e) {
    return false;
  }
}

export function hasVisited() {
  return !!lsGet("phh-visited");
}

export function isInstalledMarked() {
  return !!lsGet("phh-installed");
}

// Gate for intercepting the Android `beforeinstallprompt` event (the only place a
// preventDefault() suppresses a native affordance we must replace). iOS Safari /
// in-app guidance is handled separately in the component and is NOT gated on this.
export function intendCustomAndroid() {
  try {
    return (
      location.pathname === "/" &&
      isMobile() &&
      !isStandalone() &&
      !isInstalledMarked() &&
      !dismissedActive() &&
      hasVisited()
    );
  } catch (e) {
    return false;
  }
}

// Inline-capture script for layout.tsx <head>. Built from the SAME functions above
// so the keys, TTL and gate logic cannot diverge. preventDefault() is only called
// when we will actually show the custom Android button (intendCustomAndroid()),
// otherwise the browser-native banner is left intact (no regression).
export const EARLY_CAPTURE_SCRIPT = `(function(){window.__bip=null;
var lsGet=${lsGet.toString()};
var dismissedActive=${dismissedActive.toString()};
var isStandalone=${isStandalone.toString()};
var isMobile=${isMobile.toString()};
var hasVisited=${hasVisited.toString()};
var isInstalledMarked=${isInstalledMarked.toString()};
var intendCustomAndroid=${intendCustomAndroid.toString()};
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
window.addEventListener('beforeinstallprompt',function(e){var prevented=intendCustomAndroid();if(prevented)e.preventDefault();window.__bip={event:e,prevented:prevented};window.dispatchEvent(new Event('bip-ready'));});
window.addEventListener('appinstalled',function(){window.__bip=null;lsSet('phh-installed','1');lsSet('phh-install-dismissed',String(Date.now()));});})();`;

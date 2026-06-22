"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  STORAGE,
  lsSet,
  isStandalone,
  isMobile,
  isInstalledMarked,
  dismissedActive,
} from "../_lib/install-eligibility";

// `beforeinstallprompt` is not in the standard DOM lib.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
declare global {
  interface Window {
    __bip?: { event: BeforeInstallPromptEvent; prevented: boolean } | null;
    standalone?: boolean; // iOS Safari only
  }
}

type Variant = "android" | "ios-safari" | "ios-other" | "inapp" | null;

const REVEAL_MS = 1800;

function detectVariant(androidPromptable: boolean): Variant {
  // Never bother an already-installed user (best-effort), a dismissed user, or desktop.
  if (isStandalone() || isInstalledMarked() || dismissedActive()) return null;
  if (!isMobile()) return null;

  const ua = navigator.userAgent || "";
  // In-app browsers FIRST — they look WebKit/Safari-like but cannot add to home screen.
  const isInApp = /Instagram|FBAN|FBAV|FB_IAB|Line\/|; wv\)/i.test(ua);
  if (isInApp) return "inapp";

  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) {
    const isSafari =
      /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/i.test(ua);
    return isSafari ? "ios-safari" : "ios-other";
  }

  // Android / other: only when the captured event is ours to prompt (2nd-visit gate).
  return androidPromptable ? "android" : null;
}

function ShareGlyph() {
  return (
    <svg className="install-share-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3v12M12 3l-4 4M12 3l4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Props {
  /** True once a booking has just succeeded — the strongest non-blocking moment to ask. */
  bookingSucceeded: boolean;
  /** Notifies the parent so it can hide the floating book CTA while the sheet is open. */
  onOpenChange?: (open: boolean) => void;
}

export default function InstallPrompt({ bookingSucceeded, onOpenChange }: Props) {
  const [variant, setVariant] = useState<Variant>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const armedRef = useRef(false); // becomes true once an eligible variant is known

  // Resolve the variant on mount (and when the Android event arrives). Mark visited
  // so the Android 2nd-visit gate can pass next time.
  useEffect(() => {
    lsSet(STORAGE.visited, "1");

    function resolve() {
      const v = detectVariant(window.__bip?.prevented === true);
      setVariant(v);
      if (v) armedRef.current = true;
    }
    resolve();

    function onBipReady() {
      resolve();
    }
    function onInstalled() {
      lsSet(STORAGE.installed, "1");
      setOpen(false);
      setVariant(null);
    }
    window.addEventListener("bip-ready", onBipReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("bip-ready", onBipReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Keep the parent in sync (CTA coordination).
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const reveal = useCallback(() => {
    if (!armedRef.current) return;
    // Re-check just before showing — markers may have changed.
    if (isStandalone() || isInstalledMarked() || dismissedActive()) return;
    setOpen(true);
  }, []);

  // Reveal trigger 1: right after a successful booking.
  // setTimeout defers the setState call out of the effect body to avoid
  // the react-hooks/set-state-in-effect cascading-render lint error.
  useEffect(() => {
    if (bookingSucceeded && variant) {
      const t = setTimeout(reveal, 0);
      return () => clearTimeout(t);
    }
  }, [bookingSucceeded, variant, reveal]);

  // Reveal trigger 2: shortly after load. Deliberately does NOT reset on scroll (that
  // felt slow) — it only defers while a form field is focused, so we never interrupt
  // someone typing their booking details.
  useEffect(() => {
    if (!variant || open) return;
    let timer: ReturnType<typeof setTimeout>;
    function focusedInForm() {
      const el = document.activeElement;
      return !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    }
    function tryReveal() {
      if (focusedInForm()) {
        timer = setTimeout(tryReveal, 1200);
        return;
      }
      reveal();
    }
    timer = setTimeout(tryReveal, REVEAL_MS);
    return () => clearTimeout(timer);
  }, [variant, open, reveal]);

  const dismiss = useCallback(() => {
    lsSet(STORAGE.dismissed, String(Date.now()));
    setOpen(false);
  }, []);

  // Escape closes the sheet.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  async function installAndroid() {
    const bip = window.__bip;
    if (!bip?.prevented || !bip.event) return;
    window.__bip = null; // one-shot — guard against double taps / reuse
    setBusy(true);
    try {
      await bip.event.prompt();
      await bip.event.userChoice;
    } catch {
      /* user gesture lost or already used — fall through to close */
    }
    setBusy(false);
    // appinstalled (if accepted) also closes + marks; dismiss handles the rest.
    dismiss();
  }

  if (!open || !variant) return null;

  return (
    <div className="install-sheet" role="region" aria-label="Installeer Padel Hub">
      <button
        type="button"
        className="install-close"
        onClick={dismiss}
        aria-label="Sluiten"
      >
        ✕
      </button>

      <div className="install-row">
        <img
          src="/pwa/icon-192.png"
          alt=""
          aria-hidden="true"
          className="install-icon"
          width={48}
          height={48}
        />

        {variant === "android" && (
          <div className="install-body">
            <p className="install-title">Zet de app op je beginscherm</p>
            <button
              type="button"
              className="btn-primary install-cta"
              onClick={installAndroid}
              disabled={busy}
            >
              {busy ? "Bezig…" : "Installeer app"}
            </button>
          </div>
        )}

        {variant === "ios-safari" && (
          <div className="install-body">
            <p className="install-title">Zet de app op je beginscherm</p>
            <ol className="install-steps">
              <li>
                Tik op <ShareGlyph /> <strong>Deel</strong>
                <span className="install-hint"> (evt. via ⋯)</span>
              </li>
              <li>
                Kies <strong>&ldquo;Zet op beginscherm&rdquo;</strong>
                <span className="install-hint"> (evt. &ldquo;Toon meer&rdquo;)</span>
              </li>
            </ol>
          </div>
        )}

        {variant === "ios-other" && (
          <div className="install-body">
            <p className="install-title">Open in Safari</p>
            <p className="install-text">Daar kun je &apos;m op je beginscherm zetten.</p>
          </div>
        )}

        {variant === "inapp" && (
          <div className="install-body">
            <p className="install-title">Open in je browser</p>
            <p className="install-text">
              Tik <strong>⋯</strong> → <strong>Open in browser</strong>, dan op je
              beginscherm.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

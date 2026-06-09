"use client";

import { useEffect } from "react";

export default function PwaRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability should not block the booking flow.
    });
  }, []);

  return null;
}

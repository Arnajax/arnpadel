"use client";

import { useEffect } from "react";

export default function AutoLaunch({ href }: { href: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.href = href;
    }, 450);

    return () => window.clearTimeout(timer);
  }, [href]);

  return null;
}

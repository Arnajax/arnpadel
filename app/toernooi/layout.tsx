import type { Metadata } from "next";
import type { ReactNode } from "react";

import { FormFooter, FormTopbar } from "../components/FormPageShell";
import "./toernooi.css";

// Toernooipagina's zijn alleen voor wie de link heeft: niet in zoekmachines.
export const metadata: Metadata = {
  metadataBase: new URL("https://padelhubhoorn.nl"),
  robots: { index: false, follow: false },
};

export default function ToernooiLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fp-root tn-root">
      <FormTopbar />
      {children}
      <FormFooter />
    </div>
  );
}

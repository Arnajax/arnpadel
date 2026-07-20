import type { ReactNode } from "react";

/** Vaste topbar (logo + terug-link) — gedeeld door de aanvraagpagina's. */
export function FormTopbar() {
  return (
    <header className="fp-topbar">
      <a href="/" className="fp-brand">
        <img src="/phh-pin.svg" alt="" aria-hidden className="site-nav-logo-img" />
        <span className="site-nav-wordmark">
          Padel <span className="site-nav-wordmark-hub">Hub</span> Hoorn
        </span>
      </a>
      <a href="/" className="fp-back">← Terug naar home</a>
    </header>
  );
}

/** Vaste footer. */
export function FormFooter() {
  return (
    <footer className="fp-footer">
      <p className="fp-footer-copy">© {new Date().getFullYear()} Padel Hub Hoorn · Sportcentrum Hoorn</p>
    </footer>
  );
}

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  points?: string[];
  children: ReactNode;
}

/** Lichte pagina-shell (topbar + hero + footer) voor eenvoudige aanvraagformulieren. */
export default function FormPageShell({ eyebrow, title, intro, points, children }: Props) {
  return (
    <div className="fp-root">
      <FormTopbar />
      <main className="fp-main">
        <p className="fp-eyebrow">{eyebrow}</p>
        <h1 className="fp-title">{title}</h1>
        <p className="fp-intro">{intro}</p>
        {points && points.length > 0 && (
          <ul className="fp-points">
            {points.map((p) => (
              <li className="fp-point" key={p}>
                <span className="fp-point-mark" aria-hidden>✦</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
        {children}
      </main>
      <FormFooter />
    </div>
  );
}

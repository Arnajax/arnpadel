import type { Metadata } from "next";

import { nextFriday } from "../_lib/toernooi/core.js";
import NieuwToernooi from "./NieuwToernooi";

// Standaarddatum = komende vrijdag, dus elke keer vers uitrekenen.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Toernooitje organiseren · Padel Hub Hoorn",
  description: "Zet in een minuut een padeltoernooitje klaar. Spelers melden zich aan via een link, jij maakt met één tik het schema.",
};

export default function NieuwToernooiPage() {
  return (
    <main className="tn-wrap">
      <div className="tn-make">
        <section className="tn-make-intro">
          <p className="tn-eyebrow">Toernooitje organiseren</p>
          <h1 className="tn-title">Zet je toernooitje in één minuut klaar</h1>
          <p className="tn-sub">
            Spelers melden zich zelf aan via een link in de groep. Is het vol, dan maak je met één tik het
            schema en deel je het als foto.
          </p>
          <ul className="tn-make-points">
            <li>Vol is vol: wie later komt, staat op de reservelijst</li>
            <li>Zegt iemand af, dan schuift de reserve vanzelf door</li>
            <li>Wisselende partners en eerlijke rustbeurten, het schema rekent zichzelf uit</li>
          </ul>
        </section>
        <NieuwToernooi defaultDate={nextFriday(new Date())} needsCode={!!process.env.TOERNOOI_CREATE_CODE} />
      </div>
    </main>
  );
}

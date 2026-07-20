import type { Metadata } from "next";
import { FormTopbar, FormFooter } from "../components/FormPageShell";
import ClinicsClient from "./ClinicsClient";

export const metadata: Metadata = {
  title: "Padel clinics in Hoorn — Padel Hub Hoorn",
  description:
    "Een padelclinic voor je bedrijfsuitje, teambuilding of vriendengroep bij Sportcentrum Hoorn. Alle niveaus, materiaal aanwezig. Vraag een offerte aan en zie direct een richtprijs.",
};

const INCLUDED = [
  { t: "Ervaren trainer", d: "Een trainer die de clinic leidt en iedereen aan het spelen krijgt, van eerste keer tot competitie." },
  { t: "Baanhuur inbegrepen", d: "De banen zitten in de prijs. Jullie hoeven zelf niets te regelen." },
  { t: "Rackets te leen", d: "Geen materiaal? Geen punt. Rackets en ballen liggen klaar." },
  { t: "Borrel als optie", d: "Een drankje of borrel na afloop erbij? Dat regelen we op aanvraag." },
];

const STEPS = [
  { n: "01", t: "Vul je aanvraag in", d: "Type clinic, aantal mensen en je gegevens. Een minuut werk." },
  { n: "02", t: "Zie direct je richtprijs", d: "Je krijgt meteen een prijsindicatie op je scherm. Geen wachten op een mailtje." },
  { n: "03", t: "Wij plannen het in", d: "We nemen contact op, stemmen datum en wensen af en maken de offerte definitief." },
];

const TRAINERS = [
  { name: "Arn", src: "/arn-photo.jpg" },
  { name: "Wessel", src: "/wessel-photo.jpg" },
  { name: "Floris", src: "/floris-photo.jpg" },
];

const FAQ = [
  { q: "Hoeveel mensen kunnen er mee?", a: "Van een klein team tot een grote groep. Bij grotere groepen zetten we een tweede trainer in zodat iedereen genoeg speeltijd heeft." },
  { q: "Moet je al kunnen padellen?", a: "Nee. Clinics zijn voor alle niveaus, van wie nog nooit een racket vasthield tot gevorderde spelers. De trainer past het aan op de groep." },
  { q: "Hoe lang duurt een clinic?", a: "Een clinic duurt standaard een uur. Wil je er een tweede uur met begeleide wedstrijdjes (toernooivorm) aan vastplakken? Dat kan, vink het aan in het formulier en het telt mee in je richtprijs." },
  { q: "Kan er een borrel of diner bij?", a: "Zeker. Vink borrel & hapjes of een diner aan in je aanvraag, dan nemen we dat mee in de offerte. Ideaal om een bedrijfsuitje compleet te maken." },
  { q: "Wanneer kan een clinic?", a: "Overdag, 's avonds en in het weekend, alles is mogelijk. Geef je voorkeursdatum of periode door in de aanvraag, dan kijken we wat past." },
  { q: "Wat kost het?", a: "Een clinic start vanaf €27,50 per persoon (1 uur). Je ziet direct een richtprijs op basis van het aantal deelnemers en je keuzes. De definitieve offerte stemmen we samen af, zonder verplichting." },
];

export default function ClinicsPage() {
  return (
    <div className="fp-root">
      <FormTopbar />
      <main>

      {/* HERO */}
      <section className="cl-hero">
        {/* Probeert eerst de clinic-specifieke video; valt terug op de homepage-video.
            Nieuwe video? Zet clinics-hero.webm/.mp4 (+ clinics-hero-poster.jpg) in /public. */}
        <video className="cl-hero-video" autoPlay muted loop playsInline preload="metadata" poster="/hero-poster.jpg">
          <source src="/clinics-hero.webm" type="video/webm" />
          <source src="/clinics-hero.mp4" type="video/mp4" />
          <source src="/hero.webm" type="video/webm" />
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="cl-hero-overlay" aria-hidden />
        <div className="cl-hero-inner">
          <p className="cl-eyebrow">Clinics · Sportcentrum Hoorn</p>
          <h1 className="cl-hero-title">Het leukste uitje is er één waar iedereen meedoet</h1>
          <p className="cl-hero-sub">
            Een padelclinic voor je bedrijf, team of vriendengroep. Lekker actief, makkelijk te
            regelen en geschikt voor elk niveau. Wij verzorgen de trainer, de banen en de rackets.
          </p>
          <div className="cl-hero-cta-row">
            <a href="#offerte" className="cl-cta-primary">Bereken je richtprijs →</a>
            <a href="#hoe" className="cl-cta-ghost">Hoe het werkt</a>
          </div>
          <p className="cl-hero-proof">Vanaf €27,50 p.p. · Reactie binnen 24 uur · Alle niveaus welkom</p>
        </div>
      </section>

      {/* PROOF / CIJFERS */}
      <section className="cl-statband">
        <div className="cl-stats">
          <div className="cl-stat"><div className="cl-stat-v">20+</div><div className="cl-stat-l">clinics gegeven</div></div>
          <div className="cl-stat"><div className="cl-stat-v">&lt; 24 uur</div><div className="cl-stat-l">reactie op je aanvraag</div></div>
          <div className="cl-stat"><div className="cl-stat-v">vanaf €27,50</div><div className="cl-stat-l">per persoon</div></div>
          <div className="cl-stat"><div className="cl-stat-v">7/7</div><div className="cl-stat-l">overdag, avond &amp; weekend</div></div>
        </div>
      </section>

      {/* INTRO — groepsfoto links, voor wie rechts */}
      <section className="cl-section cl-intro">
        <figure className="cl-intro-media">
          <img src="/clinics-group.jpg" alt="Groep deelnemers tijdens een padelclinic bij Sportcentrum Hoorn" />
          <figcaption className="cl-intro-cap">Een echte groep, een echte clinic bij Sportcentrum Hoorn</figcaption>
        </figure>
        <div className="cl-intro-copy">
          <p className="cl-eyebrow" style={{ color: "var(--court)" }}>Voor bedrijven &amp; groepen</p>
          <h2 className="cl-h2">Een actief uitje waar iedereen aan meedoet</h2>
          <p className="cl-lede">Padel is in vijf minuten te snappen, dus niemand staat aan de kant. Wij verzorgen de trainer, de banen en de rackets, jullie komen spelen.</p>
          <div className="cl-usecases">
            <div className="cl-usecase">
              <span className="cl-usecase-tag">Bedrijven</span>
              <h3 className="cl-usecase-title">Bedrijfsuitje &amp; teambuilding</h3>
              <p className="cl-usecase-body">
                Even weg van kantoor en samen iets actiefs doen. De hele afdeling speelt direct mee,
                ongeacht conditie of ervaring. Borrel of diner erbij maakt het compleet.
              </p>
            </div>
            <div className="cl-usecase">
              <span className="cl-usecase-tag">Groepen</span>
              <h3 className="cl-usecase-title">Vrienden, verjaardag of vrijgezellenfeest</h3>
              <p className="cl-usecase-body">
                Met je vrienden de baan op voor een actieve middag of avond. Leuke wedstrijdvormen en
                genoeg afwisseling, zodat het van begin tot eind een feestje blijft.
              </p>
            </div>
          </div>
          <a href="#offerte" className="cl-cta-dark">Bereken je richtprijs →</a>
        </div>
      </section>

      {/* HOE HET WERKT */}
      <section className="cl-section cl-section--alt" id="hoe">
        <h2 className="cl-h2 cl-h2--center">In drie stappen geregeld</h2>
        <ol className="cl-steps">
          {STEPS.map((s) => (
            <li className="cl-step" key={s.n}>
              <span className="cl-step-n">{s.n}</span>
              <div>
                <h3 className="cl-step-t">{s.t}</h3>
                <p className="cl-step-d">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* WAT ZIT ERBIJ */}
      <section className="cl-section">
        <h2 className="cl-h2 cl-h2--center">Alles inbegrepen, jullie komen alleen spelen</h2>
        <div className="cl-incl">
          {INCLUDED.map((i) => (
            <div className="cl-incl-item" key={i.t}>
              <span className="cl-check" aria-hidden>✓</span>
              <div>
                <h3 className="cl-incl-t">{i.t}</h3>
                <p className="cl-incl-d">{i.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MID-FUNNEL CTA */}
      <section className="cl-section cl-cta-band">
        <a href="#offerte" className="cl-cta-dark">Bereken je richtprijs →</a>
        <p className="cl-cta-note">Direct een richtprijs · geen verplichting</p>
      </section>

      {/* TRAINERS */}
      <section className="cl-section cl-section--alt">
        <h2 className="cl-h2 cl-h2--center">Wie je clinic verzorgt</h2>
        <p className="cl-lede cl-lede--center">Onze trainers spelen zelf op niveau en weten een groep mee te krijgen, of het nu de eerste keer is of niet.</p>
        <div className="cl-trainers">
          {TRAINERS.map((t) => (
            <figure className="cl-trainer" key={t.name}>
              <img src={t.src} alt={t.name} className="cl-trainer-photo" />
              <figcaption className="cl-trainer-name">{t.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="cl-section">
        <h2 className="cl-h2 cl-h2--center">Veelgestelde vragen</h2>
        <dl className="cl-faq">
          {FAQ.map((f) => (
            <div className="cl-faq-item" key={f.q}>
              <dt className="cl-faq-q">{f.q}</dt>
              <dd className="cl-faq-a">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* OFFERTE */}
      <section className="cl-section cl-section--form cl-section--alt" id="offerte">
        <div className="cl-form-grid">
          <aside className="cl-form-aside">
            <p className="cl-eyebrow" style={{ color: "var(--court)" }}>Offerte op maat</p>
            <h2 className="cl-h2">Vraag je offerte aan</h2>
            <p className="cl-lede">Vul je gegevens in en je ziet meteen een richtprijs. Daarna nemen we contact op om datum en wensen af te stemmen.</p>
            <ul className="cl-aside-list">
              <li className="cl-aside-item"><span className="cl-aside-mark" aria-hidden>✦</span><span><strong>Direct een richtprijs</strong>, geen wachten op een mailtje</span></li>
              <li className="cl-aside-item"><span className="cl-aside-mark" aria-hidden>✦</span><span>Reactie binnen 24 uur</span></li>
              <li className="cl-aside-item"><span className="cl-aside-mark" aria-hidden>✦</span><span>Trainer, baanhuur en rackets inbegrepen</span></li>
              <li className="cl-aside-item"><span className="cl-aside-mark" aria-hidden>✦</span><span>Overdag, &apos;s avonds en in het weekend</span></li>
              <li className="cl-aside-item"><span className="cl-aside-mark" aria-hidden>✦</span><span>Borrel of diner erbij mogelijk</span></li>
              <li className="cl-aside-item"><span className="cl-aside-mark" aria-hidden>✦</span><span>Vrijblijvend, geen verplichting</span></li>
            </ul>
            <p className="cl-aside-note">Liever even bellen of appen? Dat kan ook, we denken graag mee over de invulling.</p>
          </aside>
          <ClinicsClient />
        </div>
      </section>

      </main>
      <FormFooter />
    </div>
  );
}

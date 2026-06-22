import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Annulering & Voorwaarden — Padel Hub Hoorn",
};

export default function VoorwaardenPage() {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "120px 24px 80px", fontFamily: "Inter, system-ui, sans-serif", color: "#1a1a2e" }}>
      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, marginBottom: 8 }}>
        Annulering &amp; Voorwaarden
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 40 }}>Padel Hub Hoorn — geldig per 2026</p>

      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Annulering</h2>
      <ul style={{ lineHeight: 1.8, paddingLeft: 20, marginBottom: 32 }}>
        <li>
          <strong>Tot 24 uur voor de les:</strong> kosteloos verzetten of annuleren.
        </li>
        <li>
          <strong>Binnen 24 uur:</strong> 100% van het lesgeld wordt in rekening gebracht, tenzij je ziek bent (bewijs vereist) of er sprake is van overmacht.
        </li>
        <li>
          <strong>No-show:</strong> 100% van het lesgeld wordt in rekening gebracht.
        </li>
      </ul>

      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Annulering door de trainer</h2>
      <p style={{ lineHeight: 1.8, marginBottom: 32 }}>
        Bij ziekte of overmacht aan de kant van de trainer wordt de les kosteloos verzet naar een ander moment. Er wordt geen lesgeld in rekening gebracht.
      </p>

      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Betaling</h2>
      <p style={{ lineHeight: 1.8, marginBottom: 32 }}>
        Betaling vindt plaats voor of direct na de les, in overleg met de trainer. Acceptabele betaalmethoden worden vooraf afgestemd.
      </p>

      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Privacy</h2>
      <p style={{ lineHeight: 1.8, marginBottom: 32 }}>
        Je naam en telefoonnummer worden gebruikt voor de bevestiging en planning van je boeking en niet gedeeld met derden. Na afronding van de les bewaren we deze gegevens niet langer, behalve wanneer je een rittenkaart hebt: dan houden we je telefoonnummer en het resterende ritsaldo bij zolang de kaart geldig is (maximaal 12 maanden), zodat we je saldo correct kunnen bijhouden.
      </p>

      <Link href="/" style={{ color: "#00a869", fontWeight: 600, textDecoration: "none" }}>← Terug naar home</Link>
    </div>
  );
}

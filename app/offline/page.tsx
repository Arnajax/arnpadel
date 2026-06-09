import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Geen verbinding | Padel Hub Hoorn",
};

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <section className="offline-panel" aria-labelledby="offline-title">
        <Image
          className="offline-mark"
          src="/phh-pin.svg"
          alt=""
          width={74}
          height={74}
          priority
          aria-hidden="true"
        />
        <p className="offline-kicker">Padel Hub Hoorn</p>
        <h1 id="offline-title">Geen verbinding</h1>
        <p>
          Je bent offline. Verbind opnieuw met internet om beschikbare lessen te
          bekijken of een boeking af te ronden.
        </p>
        <Link className="offline-action" href="/">
          Opnieuw proberen
        </Link>
      </section>
    </main>
  );
}

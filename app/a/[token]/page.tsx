import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AutoLaunch from "./AutoLaunch";
import { classifyCalendarClient, fetchCalendarBooking } from "../_lib/calendar";

export const dynamic = "force-dynamic";

export default async function CalendarLandingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const booking = await fetchCalendarBooking(token);

  if (!booking) {
    notFound();
  }

  const userAgent = (await headers()).get("user-agent") ?? "";
  const clientType = classifyCalendarClient(userAgent);

  if (clientType === "google") {
    redirect(`/a/${token}/google`);
  }

  const icsHref = `/a/${token}/ics`;
  const googleHref = `/a/${token}/google`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(201, 255, 214, 0.95), rgba(247, 248, 250, 1) 44%, rgba(233, 238, 245, 1) 100%)",
        color: "#111827",
        padding: "32px 16px",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      <AutoLaunch href={icsHref} />
      <section
        style={{
          maxWidth: 560,
          margin: "0 auto",
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(18px)",
          borderRadius: 28,
          padding: 28,
          boxShadow: "0 24px 60px rgba(17, 24, 39, 0.12)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(22, 163, 74, 0.10)",
            color: "#166534",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          ArnPadel
        </div>

        <h1
          style={{
            fontSize: "clamp(2rem, 4vw, 2.8rem)",
            lineHeight: 1.02,
            margin: "18px 0 12px",
          }}
        >
          Voeg je les toe aan je agenda
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: "#374151",
            margin: 0,
          }}
        >
          We openen alvast de agenda-import voor je. Werkt dat niet meteen, kies
          dan hieronder je gewenste optie.
        </p>

        <div
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 22,
            background: "#f8fafc",
            border: "1px solid rgba(148, 163, 184, 0.18)",
          }}
        >
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 8 }}>
            Les
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>
            {booking.booking.summary}
          </div>
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gap: 8,
              color: "#334155",
              fontSize: 16,
            }}
          >
            <div>
              {booking.booking.dateDisplay} om {booking.booking.time}
            </div>
            <div>
              {booking.booking.players} speler(s) · EUR{booking.booking.price}
            </div>
            <div>{booking.booking.location}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          <Link
            href={icsHref}
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              background: "#111827",
              color: "#ffffff",
              borderRadius: 18,
              padding: "16px 18px",
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            Open in Apple Agenda / Outlook
          </Link>
          <Link
            href={googleHref}
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              background: "#ffffff",
              color: "#111827",
              borderRadius: 18,
              padding: "16px 18px",
              fontSize: 17,
              fontWeight: 700,
              border: "1px solid rgba(15, 23, 42, 0.12)",
            }}
          >
            Open in Google Calendar
          </Link>
        </div>

        <p
          style={{
            marginTop: 18,
            marginBottom: 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: "#64748b",
          }}
        >
          iPhone en Outlook bepalen zelf in welke agenda het event terechtkomt.
          Als je meerdere agenda’s hebt, kan je dat daar nog aanpassen.
        </p>
      </section>
    </main>
  );
}

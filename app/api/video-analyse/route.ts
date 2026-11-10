import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { forwardSigned, clientIp, readJsonBody } from "../_lib/phhClient";

const NIVEAUS = new Set(["beginner", "gevorderd", "competitie"]);

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });

  // Honeypot.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const niveau = String(body.niveau ?? "").trim().toLowerCase();
  if (!NIVEAUS.has(niveau)) return NextResponse.json({ error: "Kies je niveau." }, { status: 400 });

  const naam = String(body.naam ?? "").trim();
  const email = String(body.email ?? "").trim();
  const telefoon = String(body.telefoon ?? "").trim();
  if (!naam || !email || !telefoon) {
    return NextResponse.json({ error: "Vul naam, e-mail en telefoon in." }, { status: 400 });
  }

  const payload = {
    request_id: crypto.randomUUID(),
    client_ip: clientIp(req),
    naam,
    email,
    telefoon,
    niveau,
    focuspunt: String(body.focuspunt ?? "").trim(),
    bericht: String(body.bericht ?? "").trim(),
  };

  const result = await forwardSigned("/video-analyse", payload);
  if (!result.ok) {
    const status = result.status === 429 ? 429 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result.data, { status: 200 });
}

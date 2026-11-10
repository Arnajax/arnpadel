import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { forwardSigned, clientIp, readJsonBody } from "../_lib/phhClient";

const TYPES = new Set(["bedrijfsuitje", "vrienden"]);

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body) return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });

  // Honeypot: bots vullen dit verborgen veld → stilletjes 200, niets doorsturen.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const type = String(body.type ?? "").trim().toLowerCase();
  if (!TYPES.has(type)) return NextResponse.json({ error: "Kies een type clinic." }, { status: 400 });

  const deelnemers = Number(body.deelnemers);
  if (!Number.isInteger(deelnemers) || deelnemers < 1 || deelnemers > 100) {
    return NextResponse.json({ error: "Vul een geldig aantal deelnemers in." }, { status: 400 });
  }

  const contactpersoon = String(body.contactpersoon ?? "").trim();
  const email = String(body.email ?? "").trim();
  const telefoon = String(body.telefoon ?? "").trim();
  if (!contactpersoon || !email || !telefoon) {
    return NextResponse.json({ error: "Vul naam, e-mail en telefoon in." }, { status: 400 });
  }

  const payload = {
    request_id: crypto.randomUUID(),
    client_ip: clientIp(req),
    type,
    contactpersoon,
    bedrijf_of_gelegenheid: String(body.bedrijf_of_gelegenheid ?? "").trim(),
    deelnemers,
    voorkeursdatum: String(body.voorkeursdatum ?? "").trim(),
    telefoon,
    email,
    bericht: String(body.bericht ?? "").trim(),
    extra_uur: body.extra_uur === true,
    borrel: body.borrel === true,
    diner: body.diner === true,
  };

  const result = await forwardSigned("/clinic-offerte", payload);
  if (!result.ok) {
    const status = result.status === 429 ? 429 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result.data, { status: 200 });
}

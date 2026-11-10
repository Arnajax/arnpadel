import crypto from "node:crypto";

import { errorResponse, json, readJson } from "@/app/_lib/toernooi/server";

// Controleert het organisatorswachtwoord (TOERNOOI_CREATE_CODE). Spelers met een link hebben het
// niet nodig; dit is alleen de deur naar "toernooi maken". Het aanmaken zelf controleert opnieuw.
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const required = process.env.TOERNOOI_CREATE_CODE;
    if (!required) return json({ ok: true });
    const given = Buffer.from(String(body.code ?? "").trim().toLowerCase());
    const want = Buffer.from(required.toLowerCase());
    const ok = given.length === want.length && crypto.timingSafeEqual(given, want);
    return ok ? json({ ok: true }) : json({ error: "Dat wachtwoord klopt niet." }, 403);
  } catch (err) {
    return errorResponse(err);
  }
}

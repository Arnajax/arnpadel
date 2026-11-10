// Gedeelde server-helpers voor de toernooi-API: sleutels, controle van beheerrechten, antwoorden.

import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { CODE_ALPHABET, ToernooiError, isValidCode } from "./core.js";
import { jpegInfo } from "./jpeg.js";
import type { Tournament } from "./store";

export const sha256 = (s: string) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

/** 128 bit, url-veilig. Voor beheersleutels en spelerstokens. */
export const newSecret = () => crypto.randomBytes(16).toString("base64url");

/** Korte speler-id (8 tekens), alleen intern gebruikt. */
export function newPlayerId() {
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length].toLowerCase();
  return out;
}

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

/** Beheerrechten: de sleutel van dit toernooi, of de master-sleutel van Arn (als die is ingesteld). */
export function isAdmin(t: Tournament, key: string | null | undefined): boolean {
  if (!key || key.length < 16) return false;
  const h = sha256(key);
  if (sameHash(h, t.admin_key_hash)) return true;
  const master = process.env.TOERNOOI_MASTER_KEY;
  return !!master && master.length >= 16 && sameHash(h, sha256(master));
}

export const adminKeyFrom = (req: Request) => req.headers.get("x-beheer");

export function tokenMatches(tokenHash: string | null, token: unknown): boolean {
  return typeof token === "string" && token.length >= 16 && !!tokenHash && sameHash(sha256(token), tokenHash);
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Zet een fout om in een net antwoord; onbekende fouten worden gelogd en niet gelekt. */
export function errorResponse(err: unknown) {
  if (err instanceof ToernooiError) return json({ error: err.message }, (err as ToernooiError & { status: number }).status);
  console.error("[toernooi]", err);
  return json({ error: "Er ging iets mis. Probeer het nog eens." }, 500);
}

export async function readJson(req: Request, maxBytes = 16 * 1024): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > maxBytes) throw new ToernooiError(413, "Te veel gegevens.");
  try {
    const parsed = JSON.parse(text || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // val door naar de fout hieronder
  }
  throw new ToernooiError(400, "Ongeldige aanvraag.");
}

export async function codeParam(params: Promise<{ code: string }>) {
  const { code } = await params;
  const upper = String(code ?? "").toUpperCase();
  if (!isValidCode(upper)) throw new ToernooiError(404, "Dit toernooi bestaat niet.");
  return upper;
}

/** Honeypot: bots vullen het verborgen veld "website" in. */
export const isBot = (body: Record<string, unknown>) => typeof body.website === "string" && body.website.trim() !== "";

/** Complete JPEG met afmetingen (de browser zet elke foto om naar JPEG). */
export const isJpeg = (b: Uint8Array) => jpegInfo(b) !== null;

export const MAX_PHOTO_BYTES = 300 * 1024;

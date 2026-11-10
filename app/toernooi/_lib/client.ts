// Browser-kant van de toernooitool: onthouden wie je bent, API-aanroepen, foto's verkleinen, delen.

export type Player = {
  id: string;
  name: string;
  photo: number;
  status: "in" | "reserve";
  joined_at: string;
  added_by: "self" | "admin";
  side: "L" | "R" | "B";
};

export type Match = { court: number; a: string[]; b: string[] };
export type Round = { matches: Match[]; rest: string[] };

export type View = {
  code: string;
  title: string;
  location: string;
  date: string;
  start: string;
  end: string;
  round_minutes: number;
  rounds: number;
  courts: number;
  court_labels: string[];
  max_players: number;
  organizer_name: string;
  header: { kind: "preset"; id: string } | { kind: "upload"; v: number };
  price_text: string | null;
  pay_url: string | null;
  signup_open: boolean;
  players: Player[];
  counts: { in: number; reserve: number };
  side_clashes: number;
  slots: { start: string; end: string }[];
  schedule: { seed: number; generated_at: string; rounds: Round[] } | null;
  updated_at: string;
  version: number;
  admin?: boolean;
  log?: { at: string; text: string }[];
  pending_update?: { id: number; text: string }[];
};

export type Mine = { adminKey?: string; playerId?: string; token?: string };

const keyFor = (code: string) => `phh-toernooi:${code}`;

// Opslag kan ontbreken of geblokkeerd zijn (privévenster, in-app browser). Daarom altijd ook
// in het geheugen bijhouden; `persisted` zegt of het écht bewaard is.
const memory = new Map<string, Mine>();

export function loadMine(code: string): Mine {
  // Het geheugen is altijd het nieuwst (ook als opslaan in localStorage mislukte).
  const mem = memory.get(code);
  if (mem) return { ...mem };
  try {
    const raw = window.localStorage.getItem(keyFor(code));
    if (raw) return JSON.parse(raw) as Mine;
  } catch {
    // geen opslag: leeg beginnen
  }
  return {};
}

export function saveMine(code: string, patch: Partial<Mine>): Mine & { persisted: boolean } {
  const next: Mine = { ...loadMine(code), ...patch };
  for (const k of Object.keys(next) as (keyof Mine)[]) if (next[k] === undefined) delete next[k];
  memory.set(code, next);
  let persisted = false;
  try {
    window.localStorage.setItem(keyFor(code), JSON.stringify(next));
    persisted = window.localStorage.getItem(keyFor(code)) === JSON.stringify(next);
  } catch {
    persisted = false;
  }
  return { ...next, persisted };
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** JSON-aanroep met automatische herhaling als het even druk is (503). */
export async function api<T>(path: string, init: RequestInit & { adminKey?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");
  if (init.adminKey) headers.set("x-beheer", init.adminKey);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(path, { ...init, headers, cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (res.ok) return data as T;
    if (res.status === 503 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1) + Math.random() * 400));
      continue;
    }
    throw new ApiError(res.status, (data && typeof data.error === "string" && data.error) || "Er ging iets mis. Probeer het nog eens.");
  }
}

/** Verkleint een foto in de browser en zet hem om naar JPEG onder `maxBytes`. */
export async function resizeToJpeg(file: File, { size, square, maxBytes }: { size: number; square: boolean; maxBytes: number }): Promise<Blob> {
  const bitmap = await loadBitmap(file);
  const sw = bitmap.width;
  const sh = bitmap.height;
  let sx = 0;
  let sy = 0;
  let cw = sw;
  let ch = sh;
  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    cw = side;
    ch = side;
  }
  const scale = Math.min(1, size / Math.max(cw, ch));
  const w = Math.round(cw * scale);
  const h = Math.round(ch * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kan de foto niet verwerken.");
  ctx.drawImage(bitmap, sx, sy, cw, ch, 0, 0, w, h);
  for (const q of [0.85, 0.75, 0.65, 0.5, 0.4]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= maxBytes) return blob;
  }
  throw new Error("Deze foto is te groot. Kies een andere.");
}

async function loadBitmap(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    } catch {
      // val terug op <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const waLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export function headerSrc(v: Pick<View, "code" | "header">) {
  return v.header.kind === "upload" ? `/api/toernooi/${v.code}/foto/sfeer-${v.header.v}` : `/toernooi/${v.header.id}.jpg`;
}

export const photoSrc = (code: string, p: Pick<Player, "id" | "photo">) =>
  p.photo ? `/api/toernooi/${code}/foto/foto-${p.id}-${p.photo}` : null;

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

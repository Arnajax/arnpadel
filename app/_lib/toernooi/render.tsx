// Het schema als PNG's (next/og). Satori kent alleen flexbox en geen oklch, dus eigen markup en
// hex-kleuren. Eén kolom met grote namen, verdeeld over foto's die elk op een telefoonscherm
// passen (WhatsApp toont een foto in zijn geheel). Alle hoogtes staan vast in core.js (IMG).

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import {
  IMG,
  courtName,
  displayRounds,
  formatDateShort,
  initials,
  isOpenSlot,
  pageHeight,
  prettyTime,
  roundBlockHeight,
  restText,
  roundSlots,
  schedulePageRanges,
  scheduleShape,
  shortNames,
} from "./core.js";
import { jpegInfo } from "./jpeg.js";
import { getStore, type Tournament } from "./store";

const C = {
  cream: "#f5f2e5",
  paper: "#fcfaf4",
  court: "#1c8b47",
  deep: "#07602f",
  ink: "#0d1910",
  muted: "#67766a",
  border: "#e0ded5",
  frame: "rgba(13,25,16,0.16)",
};

const W = IMG.W;
const PAD = IMG.PAD;
const CONTENT_W = W - PAD * 2;
const CARD_PAD = 22;
const COURT_W = 96;
const TEAM_W = CONTENT_W - CARD_PAD * 2 - COURT_W;
const FACES_W = 52 * 2 - 14;
const NAME_W = TEAM_W - FACES_W - 16;

// ── assets ─────────────────────────────────────────────────────────────────────

let fontCache: { name: string; data: Buffer; weight: 400 | 500 | 700; style: "normal" }[] | null = null;

async function fonts() {
  if (fontCache) return fontCache;
  const dir = join(process.cwd(), "assets/fonts");
  const [gm, gb, mr, mb] = await Promise.all(
    ["SpaceGrotesk-Medium.ttf", "SpaceGrotesk-Bold.ttf", "SpaceMono-Regular.ttf", "SpaceMono-Bold.ttf"].map((f) =>
      readFile(join(dir, f)),
    ),
  );
  fontCache = [
    { name: "Grotesk", data: gm, weight: 500, style: "normal" },
    { name: "Grotesk", data: gb, weight: 700, style: "normal" },
    { name: "Mono", data: mr, weight: 400, style: "normal" },
    { name: "Mono", data: mb, weight: 700, style: "normal" },
  ];
  return fontCache;
}

const PIN_SVG =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" fill="none"><defs><clipPath id="c"><path d="M90 176 C74 120 36 104 36 64 A54 54 0 1 1 144 64 C144 104 106 120 90 176Z"/></clipPath></defs><path d="M90 176 C74 120 36 104 36 64 A54 54 0 1 1 144 64 C144 104 106 120 90 176Z" fill="${C.court}"/><g clip-path="url(#c)"><path d="M-26 0C98 32 98 104 -26 136" stroke="${C.cream}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M206 0C82 32 82 104 206 136" stroke="${C.cream}" stroke-width="10" stroke-linecap="round" fill="none"/></g></svg>`,
  ).toString("base64");

const toDataUrl = (bytes: Uint8Array) => `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;

/** Sfeerfoto als data-URL: vooraf gemaakte (public/toernooi) of door de organisator geüpload. */
export async function headerImage(t: Tournament): Promise<string | null> {
  try {
    if (t.header.kind === "upload") {
      const hit = await getStore().getFile(`toernooien/${t.code}/sfeer-${t.header.v}.jpg`);
      return hit ? toDataUrl(hit.bytes) : null;
    }
    const bytes = await readFile(join(process.cwd(), "public/toernooi", `${t.header.id}.jpg`));
    return toDataUrl(bytes);
  } catch {
    return null;
  }
}

async function playerPhotos(t: Tournament) {
  const store = getStore();
  const entries = await Promise.all(
    t.players
      .filter((p) => p.photo)
      .map(async (p) => {
        const hit = await store.getFile(`toernooien/${t.code}/foto-${p.id}-${p.photo}.jpg`).catch(() => null);
        return [p.id, hit && jpegInfo(hit.bytes) ? toDataUrl(hit.bytes) : null] as const;
      }),
  );
  return new Map(entries.filter((e): e is readonly [string, string] => !!e[1]));
}

/**
 * Probeert de foto echt te tekenen met dezelfde renderer als het schema. Gooit de renderer een fout,
 * of tekent hij niets (kapotte beelddata wordt stil overgeslagen: dan is de uitkomst gelijk aan
 * alleen de achtergrond), dan weigeren we de foto.
 */
let emptyProbe: Buffer | null = null;
async function probe(src: string | null): Promise<Buffer> {
  const res = new ImageResponse(
    (
      <div style={{ display: "flex", width: 48, height: 48, background: "#ff00ff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} width={48} height={48} alt="" style={{ width: 48, height: 48, objectFit: "cover" }} /> : null}
      </div>
    ),
    { width: 48, height: 48 },
  );
  return Buffer.from(await res.arrayBuffer());
}

export async function canRenderJpeg(bytes: Uint8Array): Promise<boolean> {
  if (!jpegInfo(bytes)) return false;
  try {
    emptyProbe ??= await probe(null);
    const drawn = await probe(toDataUrl(bytes));
    return drawn.length > 0 && !drawn.equals(emptyProbe);
  } catch {
    return false;
  }
}

// ── onderdelen ─────────────────────────────────────────────────────────────────

/** Lange naamparen krijgen een kleinere letter, zodat er nooit iets wordt afgeknipt. */
export function nameFontSize(text: string) {
  // Ondergrens 15: zelfs twee namen van 40 tekens passen dan nog, kleiner in plaats van afgeknipt.
  return Math.max(15, Math.min(44, Math.floor(NAME_W / (text.length * 0.57))));
}

/** Eén lettergrootte per foto (rustiger), niet kleiner dan 32; wat dan nog niet past krimpt apart. */
function pageFontSize(texts: string[]) {
  return Math.max(32, Math.min(...texts.map(nameFontSize), 44));
}

function Avatar({ src, name, open, offset }: { src?: string; name: string; open?: boolean; offset: number }) {
  const base = {
    width: 52,
    height: 52,
    borderRadius: 26,
    border: `3px solid ${C.paper}`,
    marginLeft: offset,
    display: "flex",
  } as const;
  if (open) return <div style={{ ...base, background: C.cream, border: `2px dashed ${C.muted}` }} />;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} width={52} height={52} alt="" style={{ ...base, objectFit: "cover" }} />;
  }
  return (
    <div
      style={{
        ...base,
        background: C.court,
        color: C.cream,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Grotesk",
        fontWeight: 700,
        fontSize: 18,
      }}
    >
      {initials(name)}
    </div>
  );
}

const teamText = (ids: string[], names: Map<string, string>) =>
  ids.map((id) => (isOpenSlot(id) ? "Open plek" : names.get(id) ?? "?")).join(" & ");

function Team({ ids, names, photos, size }: { ids: string[]; names: Map<string, string>; photos: Map<string, string>; size: number }) {
  const label = (id: string) => (isOpenSlot(id) ? "Open plek" : names.get(id) ?? "?");
  const text = teamText(ids, names);
  return (
    <div style={{ display: "flex", alignItems: "center", width: TEAM_W, height: 56 }}>
      <div style={{ display: "flex", width: FACES_W, flexShrink: 0 }}>
        {ids.map((id, i) => (
          <Avatar key={id} src={photos.get(id)} name={label(id)} open={isOpenSlot(id)} offset={i === 0 ? 0 : -14} />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          marginLeft: 16,
          fontFamily: "Grotesk",
          fontWeight: 500,
          fontSize: Math.min(size, nameFontSize(text)),
          color: C.ink,
          letterSpacing: -0.4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          maxWidth: NAME_W,
        }}
      >
        {text}
      </div>
    </div>
  );
}

const mono = { fontFamily: "Mono", letterSpacing: 1.5 } as const;

function Brand({ right }: { right: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 44 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PIN_SVG} width={38} height={38} alt="" />
        <div style={{ display: "flex", marginLeft: 10, fontFamily: "Grotesk", fontWeight: 700, fontSize: 28, color: C.ink, letterSpacing: -0.3 }}>
          Padel&nbsp;<span style={{ color: C.court }}>Hub</span>&nbsp;Hoorn
        </div>
      </div>
      <div style={{ ...mono, display: "flex", fontSize: 18, color: C.muted }}>{right}</div>
    </div>
  );
}

// ── het schema ─────────────────────────────────────────────────────────────────

type Sched = { rounds: { matches: { court: number; a: string[]; b: string[] }[]; rest: string[] }[] };

/**
 * Rendert foto `page` (0-based) van het schema. Lukt dat niet (bijvoorbeeld door een foto die de
 * renderer niet snapt), dan nog een keer zonder foto's: het schema moet er altijd komen.
 */
export async function renderSchedulePng(t: Tournament, page = 0): Promise<Response> {
  const [header, photos] = await Promise.all([page === 0 ? headerImage(t) : null, playerPhotos(t)]);
  const headers = { "Content-Type": "image/png", "Cache-Control": "no-store" };
  try {
    const buf = await (await buildPage(t, page, header, photos)).arrayBuffer();
    return new Response(buf, { headers });
  } catch (err) {
    console.error("[toernooi] schema met foto's mislukt, opnieuw zonder", err);
    const buf = await (await buildPage(t, page, null, new Map())).arrayBuffer();
    return new Response(buf, { headers });
  }
}

async function buildPage(t: Tournament, page: number, header: string | null, photos: Map<string, string>): Promise<ImageResponse> {
  const rounds = displayRounds(t) as Sched["rounds"];
  const ranges = schedulePageRanges(t) as [number, number][];
  const [from, to] = ranges[page];
  const slots = roundSlots(t) as { start: string; end: string }[];
  const { matches: matchCount, restLines } = scheduleShape(t) as { matches: number; restLines: number };
  const hasRest = restLines > 0;
  const height = pageHeight(page, to - from, matchCount, restLines);
  const fontData = await fonts();
  const names = shortNames(t.players, 12) as Map<string, string>;
  const playing = t.players.filter((p) => p.status === "in").length;
  const title = String(t.title);
  const when = `${formatDateShort(String(t.date))} · ${prettyTime(String(t.start))}-${prettyTime(String(t.end))} · ${String(t.location || "Sportcentrum Hoorn").toUpperCase()}`;
  const pageLabel = ranges.length > 1 ? `[ FOTO ${page + 1} VAN ${ranges.length} ]` : "[ SPEELSCHEMA ]";
  const size = pageFontSize(rounds.slice(from, to).flatMap((r) => r.matches.flatMap((m) => [teamText(m.a, names), teamText(m.b, names)])));

  return new ImageResponse(
    (
      <div style={{ width: W, height, display: "flex", flexDirection: "column", background: C.cream, padding: PAD, position: "relative" }}>
        {/* merksignatuur: dunne inset-kaderlijn */}
        <div style={{ position: "absolute", top: 24, left: 24, right: 24, bottom: 24, border: `1.5px solid ${C.frame}`, display: "flex" }} />

        {page === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", height: IMG.FIRST_HEADER }}>
            <Brand right={pageLabel} />
            <div style={{ display: "flex", marginTop: 20, width: CONTENT_W, height: 190, borderRadius: 20, overflow: "hidden", background: C.border }}>
              {header ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={header} width={CONTENT_W} height={190} alt="" style={{ objectFit: "cover", width: CONTENT_W, height: 190 }} />
              ) : null}
            </div>
            <div style={{ ...mono, display: "flex", marginTop: 30, height: 26, fontSize: 22, color: C.court, fontWeight: 700 }}>{when}</div>
            <div
              style={{
                display: "flex",
                marginTop: 8,
                height: 66,
                alignItems: "center",
                fontFamily: "Grotesk",
                fontWeight: 700,
                fontSize: title.length > 28 ? 42 : 56,
                color: C.ink,
                letterSpacing: -1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {title}
            </div>
            <div style={{ display: "flex", marginTop: 6, height: 34, fontFamily: "Grotesk", fontWeight: 500, fontSize: 26, color: C.muted }}>
              {`${playing} spelers · ${t.courts} ${t.courts === 1 ? "baan" : "banen"} · ${rounds.length} × ${t.round_minutes} min · eerste naam speelt links`}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: IMG.NEXT_HEADER }}>
            <Brand right={pageLabel} />
            <div style={{ ...mono, display: "flex", marginTop: 24, height: 26, fontSize: 22, color: C.court, fontWeight: 700 }}>{when}</div>
            <div
              style={{
                display: "flex",
                marginTop: 8,
                height: 52,
                alignItems: "center",
                fontFamily: "Grotesk",
                fontWeight: 700,
                fontSize: 40,
                color: C.ink,
                letterSpacing: -0.8,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {`${title} · vervolg`}
            </div>
          </div>
        )}

        {/* rondes onder elkaar */}
        <div style={{ display: "flex", flexDirection: "column", gap: IMG.ROUND_GAP }}>
          {rounds.slice(from, to).map((round, k) => {
            const ri = from + k;
            return (
              <div
                key={ri}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: CONTENT_W,
                  height: roundBlockHeight(matchCount, restLines),
                  background: C.paper,
                  border: `1px solid ${C.border}`,
                  borderRadius: 18,
                  padding: CARD_PAD,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 34 }}>
                  <div style={{ ...mono, display: "flex", fontSize: 24, fontWeight: 700, color: C.court }}>{`RONDE ${ri + 1}`}</div>
                  <div style={{ ...mono, display: "flex", fontSize: 24, color: C.ink }}>
                    {slots[ri] ? `${slots[ri].start}-${slots[ri].end}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>
                  {round.matches.map((m, mi) => {
                    const court = courtName(t, m.court) as string;
                    const num = court.replace(/^Baan\s+/i, "");
                    return (
                      <div
                        key={m.court}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          height: IMG.MATCH_ROW,
                          paddingTop: 6,
                          paddingBottom: 6,
                          borderTop: mi === 0 ? "none" : `1px solid ${C.border}`,
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: COURT_W }}>
                          <div style={{ ...mono, display: "flex", fontSize: 15, color: C.muted, lineHeight: 1 }}>BAAN</div>
                          <div
                            style={{
                              display: "flex",
                              fontFamily: "Grotesk",
                              fontWeight: 700,
                              fontSize: num.length > 3 ? 22 : 44,
                              color: C.ink,
                              lineHeight: 1,
                              marginTop: 4,
                            }}
                          >
                            {num}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <Team ids={m.a} names={names} photos={photos} size={size} />
                          <div style={{ ...mono, display: "flex", alignItems: "center", height: 16, fontSize: 14, color: C.muted, marginLeft: FACES_W + 16 }}>VS</div>
                          <Team ids={m.b} names={names} photos={photos} size={size} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasRest ? (
                  <div style={{ display: "flex", alignItems: "flex-start", marginTop: 12, paddingTop: 6, borderTop: `1px solid ${C.border}`, height: restLines * IMG.REST_LINE }}>
                    <div style={{ ...mono, display: "flex", fontSize: 16, color: C.muted, fontWeight: 700, width: COURT_W, lineHeight: `${IMG.REST_LINE}px` }}>RUST</div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        width: IMG.REST_W,
                        fontFamily: "Grotesk",
                        fontWeight: 500,
                        fontSize: IMG.REST_FONT,
                        lineHeight: `${IMG.REST_LINE}px`,
                        color: C.ink,
                      }}
                    >
                      {round.rest.length ? restText(round, names) : "niemand"}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* voet */}
        <div style={{ ...mono, display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: IMG.FOOTER, fontSize: 18, color: C.muted }}>
          <div style={{ display: "flex" }}>{page === ranges.length - 1 ? "Kun je niet? Meld je af via de link." : "Verder op de volgende foto →"}</div>
          <div style={{ display: "flex", color: C.court, fontWeight: 700 }}>padelhubhoorn.nl</div>
        </div>
      </div>
    ),
    { width: W, height, fonts: fontData },
  );
}

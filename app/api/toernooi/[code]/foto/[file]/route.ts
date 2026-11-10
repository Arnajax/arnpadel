import { getStore } from "@/app/_lib/toernooi/store";
import { codeParam, errorResponse } from "@/app/_lib/toernooi/server";

// Opslag altijd vers lezen: Next mag de Blob-verzoeken nooit onthouden (anders botsen herhaalpogingen eindeloos).
export const fetchCache = "force-no-store";

// Serveert spelers- en sfeerfoto's uit de private opslag, maar alleen zolang ze nog aan het
// toernooi gekoppeld zijn (afgemeld = foto niet meer zichtbaar). Paden bevatten een versie.
const FILE_RE = /^(?:foto-([a-z0-9]{8})|sfeer)-(\d{10,16})$/;

export async function GET(_req: Request, { params }: { params: Promise<{ code: string; file: string }> }) {
  try {
    const code = await codeParam(params);
    const { file } = await params;
    const m = FILE_RE.exec(file);
    if (!m) return new Response("Niet gevonden", { status: 404 });
    const store = getStore();
    const current = await store.readDoc(code);
    const v = Number(m[2]);
    const linked = m[1]
      ? current?.doc.players.some((p) => p.id === m[1] && p.photo === v)
      : current?.doc.header.kind === "upload" && current.doc.header.v === v;
    if (!linked) return new Response("Niet gevonden", { status: 404 });
    const hit = await store.getFile(`toernooien/${code}/${file}.jpg`);
    if (!hit) return new Response("Niet gevonden", { status: 404 });
    return new Response(Buffer.from(hit.bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        // Alleen de browser mag bewaren, nooit de Vercel-cache: anders blijft een gewiste of
        // afgemelde foto nog een uur op te halen via de link.
        "Cache-Control": "private, max-age=3600",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

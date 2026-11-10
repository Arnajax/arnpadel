import { setPhoto, publicView, ToernooiError } from "@/app/_lib/toernooi/core.js";
import { canRenderJpeg } from "@/app/_lib/toernooi/render";
import { getStore, mutate, type Tournament } from "@/app/_lib/toernooi/store";
import {
  MAX_PHOTO_BYTES,
  adminKeyFrom,
  codeParam,
  errorResponse,
  isAdmin,
  isJpeg,
  json,
  tokenMatches,
} from "@/app/_lib/toernooi/server";

// Opslag altijd vers lezen: Next mag de Blob-verzoeken nooit onthouden (anders botsen herhaalpogingen eindeloos).
export const fetchCache = "force-no-store";

// Foto uploaden: de browser verkleint en zet om naar JPEG, wij controleren grootte en type.
// Doel (header x-target): "player:<id>" met eigen token of beheersleutel, of "header" (sfeerfoto,
// alleen beheer). Elke versie krijgt een eigen pad, zodat caches nooit een oude foto tonen.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = await codeParam(params);
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.length > MAX_PHOTO_BYTES) return json({ error: "Deze foto is te groot." }, 400);
    if (!isJpeg(bytes) || !(await canRenderJpeg(bytes))) return json({ error: "Dit bestand is geen foto." }, 400);

    const target = req.headers.get("x-target") ?? "";
    const adminKey = adminKeyFrom(req);
    const token = req.headers.get("x-token");
    const store = getStore();
    const current = await store.readDoc(code);
    if (!current) return json({ error: "Dit toernooi bestaat niet (meer)." }, 404);
    const admin = isAdmin(current.doc, adminKey);
    const version = Date.now();
    const now = new Date().toISOString();

    if (target === "header") {
      if (!admin) return json({ error: "Alleen de organisator kan de sfeerfoto wijzigen." }, 403);
      const path = `toernooien/${code}/sfeer-${version}.jpg`;
      await store.putFile(path, bytes, "image/jpeg");
      try {
        const { t } = await mutate(code, (doc) => ({
          t: { ...doc, header: { kind: "upload", v: version }, updated_at: now } as Tournament,
          result: null,
        }));
        return json({ view: publicView(t, { admin }) });
      } catch (err) {
        await store.deletePrefix(path).catch(() => 0); // geen losse foto's achterlaten
        throw err;
      }
    }

    const playerId = target.startsWith("player:") ? target.slice(7) : "";
    const player = current.doc.players.find((p) => p.id === playerId);
    if (!player) return json({ error: "Deze speler staat niet (meer) op de lijst." }, 404);
    if (!admin && !tokenMatches(player.token_hash, token)) {
      return json({ error: "Je kunt alleen je eigen foto wijzigen." }, 403);
    }
    const path = `toernooien/${code}/foto-${playerId}-${version}.jpg`;
    const previous = player.photo;
    await store.putFile(path, bytes, "image/jpeg");
    try {
      const { t } = await mutate(code, (doc) => {
        if (!doc.players.some((p) => p.id === playerId)) throw new ToernooiError(404, "Deze speler staat niet (meer) op de lijst.");
        return { t: setPhoto(doc, playerId, version, now) as Tournament, result: null };
      });
      if (previous) await store.deletePrefix(`toernooien/${code}/foto-${playerId}-${previous}.jpg`).catch(() => 0);
      return json({ view: publicView(t, { admin }) });
    } catch (err) {
      // Bijvoorbeeld net afgemeld tijdens het uploaden: foto weer weghalen.
      await store.deletePrefix(path).catch(() => 0);
      throw err;
    }
  } catch (err) {
    return errorResponse(err);
  }
}

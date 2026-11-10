import { leave, publicView, ToernooiError } from "@/app/_lib/toernooi/core.js";
import { getStore, mutate, type Tournament } from "@/app/_lib/toernooi/store";
import { adminKeyFrom, codeParam, errorResponse, isAdmin, json, readJson, tokenMatches } from "@/app/_lib/toernooi/server";

// Opslag altijd vers lezen: Next mag de Blob-verzoeken nooit onthouden (anders botsen herhaalpogingen eindeloos).
export const fetchCache = "force-no-store";

// Afmelden: met eigen token ("self"), als organisator ("admin"), of op naam zonder token
// ("name": de WhatsApp-browser onthoudt niets; de UI vraagt om bevestiging en het logboek toont het).
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = await codeParam(params);
    const body = await readJson(req);
    const playerId = String(body.player_id ?? "");
    const adminKey = adminKeyFrom(req);
    const now = new Date().toISOString();
    let photo = 0;
    const { t } = await mutate(code, (doc) => {
      const player = doc.players.find((p) => p.id === playerId);
      if (!player) throw new ToernooiError(404, "Deze speler staat niet (meer) op de lijst.");
      photo = player.photo;
      const how = isAdmin(doc, adminKey) ? "admin" : tokenMatches(player.token_hash, body.token) ? "self" : "name";
      return { t: leave(doc, { playerId, now, how }).t as Tournament, result: null };
    });
    if (photo) {
      await getStore().deletePrefix(`toernooien/${code}/foto-${playerId}-`).catch(() => 0);
    }
    return json({ view: publicView(t, { admin: isAdmin(t, adminKey) }) });
  } catch (err) {
    return errorResponse(err);
  }
}

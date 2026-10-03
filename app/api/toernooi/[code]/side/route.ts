import { publicView, setSide, ToernooiError } from "@/app/_lib/toernooi/core.js";
import { mutate, type Tournament } from "@/app/_lib/toernooi/store";
import { codeParam, errorResponse, json, readJson, tokenMatches } from "@/app/_lib/toernooi/server";

export const dynamic = "force-dynamic";
// Opslag altijd vers lezen: Next mag de Blob-verzoeken nooit onthouden (anders botsen herhaalpogingen eindeloos).
export const fetchCache = "force-no-store";

// Speler past zijn eigen kant aan (links / rechts / beide), alleen met eigen token en vóór het schema.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = await codeParam(params);
    const body = await readJson(req);
    const playerId = String(body.player_id ?? "");
    const now = new Date().toISOString();
    const { t } = await mutate(code, (doc) => {
      const player = doc.players.find((p) => p.id === playerId);
      if (!player) throw new ToernooiError(404, "Deze speler staat niet (meer) op de lijst.");
      if (!tokenMatches(player.token_hash, body.token)) throw new ToernooiError(403, "Je kunt alleen je eigen kant aanpassen.");
      return { t: setSide(doc, playerId, body.side, { now }) as Tournament, result: null };
    });
    return json({ view: publicView(t) });
  } catch (err) {
    return errorResponse(err);
  }
}

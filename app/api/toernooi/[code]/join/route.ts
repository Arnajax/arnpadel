import { join, publicView } from "@/app/_lib/toernooi/core.js";
import { mutate, type Tournament } from "@/app/_lib/toernooi/store";
import { codeParam, errorResponse, isBot, json, newPlayerId, newSecret, readJson, sha256 } from "@/app/_lib/toernooi/server";

// Opslag altijd vers lezen: Next mag de Blob-verzoeken nooit onthouden (anders botsen herhaalpogingen eindeloos).
export const fetchCache = "force-no-store";

// Aanmelden. Id en token worden vóór de schrijfpoging gemaakt, zodat een herhaling na een
// botsing dezelfde speler oplevert en niemand dubbel op de lijst komt.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = await codeParam(params);
    const body = await readJson(req);
    if (isBot(body)) return json({ error: "Ongeldige aanvraag." }, 400);
    const id = newPlayerId();
    const token = newSecret();
    const now = new Date().toISOString();
    const { t, result } = await mutate(code, (doc) => {
      const out = join(doc, { id, name: body.name, side: body.side, tokenHash: sha256(token), now });
      return { t: out.t as Tournament, result: out.player as { status: string } };
    });
    return json({ player: { id, token, status: result.status }, view: publicView(t) });
  } catch (err) {
    return errorResponse(err);
  }
}

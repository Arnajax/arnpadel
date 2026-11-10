import crypto from "node:crypto";

import { codeFromBytes, createTournament, join, ToernooiError } from "@/app/_lib/toernooi/core.js";
import { ConflictError, getStore, type Tournament } from "@/app/_lib/toernooi/store";
import { errorResponse, isBot, json, newPlayerId, newSecret, readJson, sha256 } from "@/app/_lib/toernooi/server";

// Opslag altijd vers lezen: Next mag de Blob-verzoeken nooit onthouden (anders botsen herhaalpogingen eindeloos).
export const fetchCache = "force-no-store";

// Nieuw toernooi. Geeft de code en de beheersleutel terug (de sleutel zelf slaan we nooit op).
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    if (isBot(body)) return json({ error: "Ongeldige aanvraag." }, 400);

    const requiredCode = process.env.TOERNOOI_CREATE_CODE;
    if (requiredCode && String(body.create_code ?? "").trim().toLowerCase() !== requiredCode.toLowerCase()) {
      return json({ error: "Het wachtwoord voor organisatoren klopt niet." }, 403);
    }

    const adminKey = newSecret();
    const now = new Date().toISOString();
    const store = getStore();

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = codeFromBytes(crypto.randomBytes(6));
      let t = createTournament({ input: body, code, adminKeyHash: sha256(adminKey), now }) as Tournament;

      // De organisator speelt meestal zelf mee: meteen op de lijst, met eigen token.
      let player: { id: string; token: string } | null = null;
      if (body.organizer_plays !== false) {
        const token = newSecret();
        const id = newPlayerId();
        t = join(t, { id, name: t.organizer_name, side: body.organizer_side, tokenHash: sha256(token), now }).t as Tournament;
        player = { id, token };
      }

      try {
        await store.writeDoc(code, t, null);
        return json({ code, admin_key: adminKey, player });
      } catch (err) {
        if (err instanceof ConflictError) continue; // code bestond al: nieuwe code
        throw err;
      }
    }
    throw new ToernooiError(503, "Kon geen vrije code vinden. Probeer het nog eens.");
  } catch (err) {
    return errorResponse(err);
  }
}

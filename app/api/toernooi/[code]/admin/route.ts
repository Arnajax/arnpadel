import crypto from "node:crypto";

import {
  ToernooiError,
  generateSchedule,
  join,
  leave,
  markUpdateShared,
  publicView,
  setCourtLabels,
  setSide,
  setSignupOpen,
  updateSettings,
} from "@/app/_lib/toernooi/core.js";
import { getStore, mutate, type Tournament } from "@/app/_lib/toernooi/store";
import { adminKeyFrom, codeParam, errorResponse, isAdmin, json, newPlayerId, readJson } from "@/app/_lib/toernooi/server";

// Opslag altijd vers lezen: Next mag de Blob-verzoeken nooit onthouden (anders botsen herhaalpogingen eindeloos).
export const fetchCache = "force-no-store";

type Action = "add" | "remove" | "side" | "settings" | "signup" | "schedule" | "courts" | "shared" | "delete";

// Alle beheeracties van de organisator. Sleutel in header x-beheer (toernooisleutel of master).
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = await codeParam(params);
    const body = await readJson(req);
    const action = String(body.action ?? "") as Action;
    const key = adminKeyFrom(req);
    const store = getStore();

    const current = await store.readDoc(code);
    if (!current) return json({ error: "Dit toernooi bestaat niet (meer)." }, 404);
    if (!isAdmin(current.doc, key)) return json({ error: "Je hebt geen beheerrechten voor dit toernooi." }, 403);

    if (action === "delete") {
      await store.deletePrefix(`toernooien/${code}/`);
      await store.deletePrefix(`toernooien/${code}.json`);
      return json({ deleted: true });
    }

    const now = new Date().toISOString();
    const id = newPlayerId(); // alleen gebruikt bij "add"
    const seed = crypto.randomInt(1, 2 ** 31 - 1); // alleen gebruikt bij "schedule"
    let removedPhoto = "";

    const { t } = await mutate(code, (doc) => {
      // Sleutel opnieuw controleren op de verse versie (hoort bij dezelfde lees-schrijfronde).
      if (!isAdmin(doc, key)) throw new ToernooiError(403, "Je hebt geen beheerrechten voor dit toernooi.");
      let next: unknown;
      switch (action) {
        case "add":
          next = join(doc, { id, name: body.name, side: body.side, tokenHash: null, now, byAdmin: true }).t;
          break;
        case "remove": {
          const playerId = String(body.player_id ?? "");
          const p = doc.players.find((x) => x.id === playerId);
          removedPhoto = p?.photo ? playerId : "";
          next = leave(doc, { playerId, now, how: "admin" }).t;
          break;
        }
        case "side":
          next = setSide(doc, String(body.player_id ?? ""), body.side, { now, byAdmin: true });
          break;
        case "settings":
          next = updateSettings(doc, (body.patch ?? {}) as Record<string, unknown>, now);
          break;
        case "signup":
          next = setSignupOpen(doc, body.open === true, now);
          break;
        case "schedule":
          next = generateSchedule(doc, { seed, now });
          break;
        case "courts":
          next = setCourtLabels(doc, body.changes ?? body.labels, now);
          break;
        case "shared":
          next = markUpdateShared(doc, body.ids, now);
          break;
        default:
          throw new ToernooiError(400, "Onbekende actie.");
      }
      return { t: next as Tournament, result: null };
    });

    if (removedPhoto) await store.deletePrefix(`toernooien/${code}/foto-${removedPhoto}-`).catch(() => 0);
    return json({ view: { ...publicView(t, { admin: true }), admin: true } });
  } catch (err) {
    return errorResponse(err);
  }
}

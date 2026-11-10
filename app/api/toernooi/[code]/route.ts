import { publicView } from "@/app/_lib/toernooi/core.js";
import { getStore } from "@/app/_lib/toernooi/store";
import { adminKeyFrom, codeParam, errorResponse, isAdmin, json } from "@/app/_lib/toernooi/server";

export const dynamic = "force-dynamic";
// Opslag altijd vers lezen: Next mag de Blob-verzoeken nooit onthouden (anders botsen herhaalpogingen eindeloos).
export const fetchCache = "force-no-store";

// Actuele stand. Met geldige beheersleutel (header x-beheer) ook logboek en openstaande update.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = await codeParam(params);
    const current = await getStore().readDoc(code);
    if (!current) return json({ error: "Dit toernooi bestaat niet (meer)." }, 404);
    const admin = isAdmin(current.doc, adminKeyFrom(req));
    return json({ ...publicView(current.doc, { admin }), admin });
  } catch (err) {
    return errorResponse(err);
  }
}

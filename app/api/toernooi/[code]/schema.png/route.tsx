import { schedulePageRanges } from "@/app/_lib/toernooi/core.js";
import { renderSchedulePng } from "@/app/_lib/toernooi/render";
import { getStore } from "@/app/_lib/toernooi/store";
import { codeParam, errorResponse, json } from "@/app/_lib/toernooi/server";

export const dynamic = "force-dynamic";
// Opslag altijd vers lezen: Next mag de Blob-verzoeken nooit onthouden (anders botsen herhaalpogingen eindeloos).
export const fetchCache = "force-no-store";

// Het schema als foto's om in de WhatsApp-groep te zetten: ?deel=1, 2, ... (zie schedulePageRanges).
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = await codeParam(params);
    const current = await getStore().readDoc(code);
    if (!current) return json({ error: "Dit toernooi bestaat niet (meer)." }, 404);
    if (!current.doc.schedule) return json({ error: "Er is nog geen schema." }, 409);
    // Alle foto's van één set moeten uit dezelfde versie komen; anders opnieuw laten ophalen.
    const wanted = new URL(req.url).searchParams.get("v");
    if (wanted !== null && Number(wanted) !== (Number(current.doc.version) || 1)) {
      return json({ error: "Het schema is net veranderd. Haal de foto's opnieuw op." }, 409);
    }
    const pages = schedulePageRanges(current.doc).length;
    const deel = Number(new URL(req.url).searchParams.get("deel") ?? "1");
    if (!Number.isInteger(deel) || deel < 1 || deel > pages) return json({ error: "Deze foto bestaat niet." }, 404);
    return await renderSchedulePng(current.doc, deel - 1);
  } catch (err) {
    return errorResponse(err);
  }
}

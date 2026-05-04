const VPS_BASE_URL = "http://89.167.75.216:5077";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const vpsRes = await fetch(
    `${VPS_BASE_URL}/calendar/ics/${encodeURIComponent(token)}`,
    {
      cache: "no-store",
    },
  );

  if (!vpsRes.ok) {
    return Response.json({ error: "Boeking niet gevonden" }, { status: 404 });
  }

  const icsText = await vpsRes.text();

  return new Response(icsText, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="padelles-${token}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}

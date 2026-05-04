import { redirect } from "next/navigation";
import { fetchCalendarBooking } from "../../_lib/calendar";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const booking = await fetchCalendarBooking(token);

  if (!booking) {
    return Response.json({ error: "Boeking niet gevonden" }, { status: 404 });
  }

  redirect(booking.booking.googleUrl);
}

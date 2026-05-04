const VPS_BASE_URL = "http://89.167.75.216:5077";

export interface CalendarBookingPayload {
  token: string;
  booking: {
    name: string;
    firstName: string;
    date: string;
    dateDisplay: string;
    time: string;
    duration: number;
    players: number;
    price: number;
    summary: string;
    location: string;
    googleUrl: string;
  };
}

export async function fetchCalendarBooking(
  token: string,
): Promise<CalendarBookingPayload | null> {
  const res = await fetch(
    `${VPS_BASE_URL}/calendar/${encodeURIComponent(token)}`,
    {
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as CalendarBookingPayload;
  if (!data?.booking?.summary || !data?.booking?.googleUrl) {
    return null;
  }

  return data;
}

export function classifyCalendarClient(userAgent: string): "google" | "fallback" {
  const ua = userAgent.toLowerCase();
  const isOutlook = ua.includes("outlook");
  const isAppleDevice =
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod") ||
    ua.includes("macintosh") ||
    ua.includes("mac os x");

  if (isOutlook || isAppleDevice) {
    return "fallback";
  }

  const isGoogleFriendly =
    ua.includes("android") ||
    ua.includes("windows") ||
    ua.includes("linux") ||
    ua.includes("x11") ||
    ua.includes("cros") ||
    ua.includes("gmail") ||
    ua.includes("google");

  return isGoogleFriendly ? "google" : "fallback";
}

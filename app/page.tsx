import HomePageClient from "./HomePageClient";
import { fetchSlots } from "./_lib/slots";
import type { Slot } from "./_lib/slots";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialSlots: Slot[] = [];

  try {
    initialSlots = await fetchSlots();
  } catch (error) {
    console.error("Failed to preload ArnPadel slots", error);
  }

  return <HomePageClient initialSlots={initialSlots} />;
}

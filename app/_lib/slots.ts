const VPS_SLOTS_URL = "http://89.167.75.216:5077/slots";
const SLOTS_TTL_MS = 30_000;

interface VpsSlot {
  id: string | number;
  datum: string;
  tijd: string;
  duur: number;
  max_spelers: number | string;
  trainer_id?: string;
  trainer_name?: string;
}

export interface Slot {
  id: string | number;
  date: string;
  time: string;
  duration: number;
  maxPlayers: number;
  trainer_id?: string;
  trainer_name?: string;
}

let slotsCache:
  | {
      expiresAt: number;
      value: Slot[];
    }
  | undefined;

async function fetchSlotsFromVps(): Promise<Slot[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(VPS_SLOTS_URL, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Slots fetch failed with status ${res.status}`);
    }

    const data = await res.json();
    const raw: VpsSlot[] = Array.isArray(data) ? data : (data.slots ?? []);

    return raw.map((slot) => ({
      id: slot.id,
      date: slot.datum,
      time: slot.tijd,
      duration: slot.duur,
      maxPlayers: Number(slot.max_spelers),
      trainer_id: slot.trainer_id,
      trainer_name: slot.trainer_name,
    }));
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSlots(options?: { force?: boolean }): Promise<Slot[]> {
  const force = options?.force ?? false;
  const now = Date.now();

  if (!force && slotsCache && slotsCache.expiresAt > now) {
    return slotsCache.value;
  }

  try {
    const slots = await fetchSlotsFromVps();
    slotsCache = {
      expiresAt: now + SLOTS_TTL_MS,
      value: slots,
    };
    return slots;
  } catch (error) {
    if (slotsCache) {
      console.warn("Serving stale ArnPadel slots cache after fetch error", error);
      return slotsCache.value;
    }
    throw error;
  }
}

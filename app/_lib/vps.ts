// Basisadres van de Padel Hub-API op de VPS. Alleen https: hier gaan persoonsgegevens overheen.
const raw = process.env.PHH_VPS_URL ?? "https://api.padelhubhoorn.nl";

if (!raw.startsWith("https://")) {
  throw new Error("PHH_VPS_URL moet met https:// beginnen");
}

export const VPS_BASE_URL = raw.replace(/\/+$/, "");

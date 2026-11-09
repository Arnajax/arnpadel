// Nep-VPS voor de boekingstest. Wordt via NODE_OPTIONS=--import in de Next-server
// geladen (zie playwright.config.mjs) en vervangt fetch in die server:
// - de echte boekings-API (api.padelhubhoorn.nl) is volledig geblokkeerd;
// - PHH_VPS_URL wijst naar https://nep-vps.invalid, die alleen vaste lesslots geeft.
// Zo haalt de homepage nep-slots op en kan geen enkele aanroep een echte boeking,
// Telegram-melding, mail of sheetregel opleveren.
import { NEP_VPS, NEP_SLOTS } from "./nep-data.mjs";

const echteFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  if (url.includes("padelhubhoorn.nl")) {
    console.error(`[nep-vps] GEBLOKKEERD: ${url}`);
    throw new Error(`nep-vps: echte API geblokkeerd (${url})`);
  }
  if (url.startsWith(NEP_VPS)) {
    if (new URL(url).pathname === "/slots") return Response.json({ slots: NEP_SLOTS });
    console.error(`[nep-vps] onverwacht verzoek: ${url}`);
    return Response.json({ error: "nep-vps: onverwacht verzoek" }, { status: 503 });
  }
  return echteFetch(input, init);
};

// Vaste testgegevens voor de boekingstest (gedeeld door nep-vps.mjs en boeken.spec.mjs).
export const NEP_VPS = "https://nep-vps.invalid";

// Eén les bij Arn, over 3 dagen om 10:00, in het formaat van de VPS (/slots).
const d = new Date();
d.setDate(d.getDate() + 3);
const datum = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const NEP_SLOTS = [
  { id: 90001, datum, tijd: "10:00", duur: 60, max_spelers: 4, trainer_id: "arn", trainer_name: "Arn Braunschweiger" },
];

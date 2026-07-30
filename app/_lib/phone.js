// Telefoonvalidatie voor NL mobiele nummers.
//
// Spiegelt exact `canonical_phone()` in padel_booking.py op de VPS. Client en server
// moeten hetzelfde nummer goed- of afkeuren, anders passeert een boeking het formulier
// en krijgt de klant alsnog een 400 van de server. tests/phone.test.mjs bewaakt dat
// die pariteit blijft kloppen (dezelfde testcases als de Python-kant).
//
// Waarom dit bestaat: telefoon is het enige kanaal naar de leerling. Een typefout
// betekende voorheen een geaccepteerde boeking met een onbereikbare klant — de fout
// kwam pas boven water als de trainer op een dode WhatsApp-link klikte.

/**
 * Canonicaliseer een NL mobiel nummer naar '+316XXXXXXXX'.
 * @param {string} raw
 * @returns {string|null} null bij ambigu / niet-NL-mobiel
 */
export function canonicalPhone(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/[\s\-.()]/g, "");
  let digits;
  if (s.startsWith("+")) digits = s.slice(1);
  else if (s.startsWith("00")) digits = s.slice(2);
  else digits = s;

  if (!/^\d+$/.test(digits)) return null;

  let local;
  if (digits.startsWith("31")) local = digits.slice(2);
  else if (digits.startsWith("06")) local = digits.slice(1);
  else if (digits.startsWith("6")) local = digits;
  else return null;

  return local.length === 9 && local.startsWith("6") ? "+31" + local : null;
}

/**
 * '+31621154466' → '+31 6 21 15 44 66' — leesbaar terugtonen aan de klant.
 * @param {string} canon
 * @returns {string}
 */
export function formatPhone(canon) {
  const local = canon.slice(3);
  const pairs = local.slice(1).match(/.{1,2}/g) ?? [];
  return `+31 ${local[0]} ${pairs.join(" ")}`;
}

/**
 * Menselijke foutmelding, of null als het nummer klopt (of nog leeg is — dan doet
 * `required` het werk en willen we niet meteen rood schreeuwen tijdens het typen).
 * @param {string} raw
 * @returns {string|null}
 */
export function phoneError(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  if (canonicalPhone(trimmed)) return null;

  const s = trimmed.replace(/[\s\-.()]/g, "");
  const digits = s.startsWith("+") ? s.slice(1) : s.startsWith("00") ? s.slice(2) : s;

  if (!/^\d+$/.test(digits)) {
    return "Gebruik alleen cijfers — bijvoorbeeld 06 12 34 56 78.";
  }

  let local = null;
  if (digits.startsWith("31")) local = digits.slice(2);
  else if (digits.startsWith("06")) local = digits.slice(1);
  else if (digits.startsWith("6")) local = digits;

  if (local === null || !local.startsWith("6")) {
    return "Dit lijkt geen mobiel nummer. We sturen de bevestiging via WhatsApp, dus vul je 06-nummer in.";
  }
  return `Dit nummer heeft ${local.length + 1} cijfers — een 06-nummer heeft er 10.`;
}

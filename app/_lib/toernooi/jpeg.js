// Controleert of bytes een complete JPEG zijn (begin, afmetingen, einde). Geen volledige decode,
// maar genoeg om kapotte of afgekapte bestanden te weigeren voordat ze het schema-plaatje breken.

const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

/** @returns {{ width: number, height: number } | null} */
export function jpegInfo(bytes) {
  const b = bytes;
  if (!b || b.length < 128 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let end = b.length;
  while (end > 2 && b[end - 1] === 0x00) end--; // sommige encoders vullen aan met nullen
  if (b[end - 2] !== 0xff || b[end - 1] !== 0xd9) return null;
  let i = 2;
  let size = null;
  while (i + 4 <= end) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > end) return null;
    if (SOF.has(marker)) {
      const height = (b[i + 5] << 8) | b[i + 6];
      const width = (b[i + 7] << 8) | b[i + 8];
      if (!width || !height || width > 10000 || height > 10000) return null;
      size = { width, height };
    }
    if (marker === 0xda) return size; // beelddata begint: afmetingen moeten er dan al zijn
    i += 2 + len;
  }
  return null;
}

# Kopie van canonical_phone() uit padel_booking.py op de VPS (de boekings-API).
# Alleen deze functie: het volledige bestand staat niet in git omdat er een sleutel in staat.
# Gebruikt door tests/phone.test.mjs, zodat de pariteitstest ook op GitHub draait.
# Lokaal controleert dezelfde test dat deze kopie gelijk is aan padel-booking/padel_booking_vps.py.
# Bron: /home/openclaw/padel_booking.py, sha256 ea38d86121a9b3a3..., 9 nov 2026.
import re


def canonical_phone(raw: str):
    """
    Canonicaliseer een NL mobiel nummer naar '+316XXXXXXXX'.
    Accepteert 06…, +316…, 00316…, 316…, 6…. Strip spaties/streepjes/punten/haakjes.
    Returnt None bij ambigu / niet-NL-mobiel (geen geldige kaart-key).
    """
    if not raw:
        return None
    s = re.sub(r"[\s\-\.\(\)]", "", str(raw))
    if s.startswith("+"):
        digits = s[1:]
    elif s.startswith("00"):
        digits = s[2:]
    else:
        digits = s
    if not digits.isdigit():
        return None
    if digits.startswith("31"):
        local = digits[2:]
    elif digits.startswith("06"):
        local = digits[1:]      # 0 strippen → 6XXXXXXXX
    elif digits.startswith("6"):
        local = digits
    else:
        return None
    if len(local) == 9 and local.startswith("6"):
        return "+31" + local
    return None

# einde kopie

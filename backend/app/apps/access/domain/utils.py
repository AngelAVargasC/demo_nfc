import re

_HEX_RE = re.compile(r"[^0-9a-fA-F]")


def normalize_uid(raw: str | None) -> str:
    """Normaliza un UID NFC a formato consistente: HEX mayúsculas separado por ':' cada byte.

    Ejemplos:
        "04a1b2c3" -> "04:A1:B2:C3"
        "04-A1-B2-C3" -> "04:A1:B2:C3"
        "04 A1 b2 c3" -> "04:A1:B2:C3"
        "" -> ""
    """
    if not raw:
        return ""
    clean = _HEX_RE.sub("", raw).upper()
    if not clean:
        return raw.strip().upper()
    if len(clean) % 2 == 1:
        clean = "0" + clean
    return ":".join(clean[i : i + 2] for i in range(0, len(clean), 2))

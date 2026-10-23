"""Tag every door in data/catalog.json with a colour look: light | medium | dark | grey | colour.

Run after extract_catalogs.py (or any time):  python tools/tag_looks.py
js/admin.js has the same rules (lookOf) for doors added from the admin page — keep them in sync.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "data" / "catalog.json"


def features(path):
    """Median luma, median chroma and share of non-wood colour — on a 40x82 centre crop."""
    im = Image.open(path).convert("RGB")
    w, h = im.size
    im = im.crop((int(w * .1), int(h * .06), int(w * .9), int(h * .94))).resize((40, 82), Image.BILINEAR)
    a = np.asarray(im, dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(axis=2), a.min(axis=2)
    luma = .299 * r + .587 * g + .114 * b
    chroma = mx - mn
    # Hue in degrees for chromatic pixels.
    d = np.where(chroma == 0, 1, chroma)
    hue = np.select(
        [mx == r, mx == g],
        [((g - b) / d) % 6, (b - r) / d + 2],
        (r - g) / d + 4) * 60
    chromatic = chroma > 22
    wood = chromatic & ((hue <= 55) | (hue >= 340))   # browns, from mahogany red to honey
    colour = chromatic & ~wood & (chroma > 40)
    return {
        "luma": float(np.median(luma)),
        "chroma": float(np.median(chroma)),
        "colour": float(colour.mean()),
    }


def look_of(f):
    if f["colour"] > 0.08:
        return "colour"
    if f["chroma"] < 16:
        return "grey" if f["luma"] > 95 else "dark"
    if f["luma"] > 138:
        return "light"
    if f["luma"] > 82:
        return "medium"
    return "dark"


def main():
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    stats = []
    for d in data["doors"]:
        f = features(ROOT / d["thumb"])
        d["look"] = look_of(f)
        stats.append(f)
    if "--stats" in sys.argv:
        for k in ("luma", "chroma", "colour"):
            v = np.array([s[k] for s in stats])
            print(k, np.percentile(v, [5, 25, 50, 75, 95]).round(2))
    counts = {}
    for d in data["doors"]:
        counts[d["look"]] = counts.get(d["look"], 0) + 1
    print(counts)
    if "--dry" not in sys.argv:
        CATALOG.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()

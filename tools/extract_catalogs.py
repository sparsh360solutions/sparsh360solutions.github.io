"""One-time extraction of door designs from supplier PDF catalogs.

Usage:  python tools/extract_catalogs.py <pdf_folder> [--only "name"]

Writes door images to doors/<catalog>/ and merges entries into data/catalog.json.
New catalogs after launch are added through admin.html instead.
"""
import argparse
import io
import json
import os
import re
import sys

import cv2
import numpy as np
import pymupdf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOOR_H = 900     # stored door image height (px)
THUMB_H = 260    # gallery thumbnail height (px)

# Per-catalog settings: brand, display name, url slug, how codes look, and how to normalise them.
CATALOGS = {
    "AASTHA SP-01": dict(brand="Aastha", name="Aastha Digital HD", slug="aastha-hd",
                         code=r"WL-DG-\d+"),
    "AASTHA SP-02": dict(brand="Aastha", name="Aastha Special Edition 02", slug="aastha-sp2",
                         code=r"SP-2\s*\(\d+\)", norm=lambda s: "SP2-%02d" % int(re.findall(r"\d+", s)[-1])),
    "AASTHA VOL -5": dict(brand="Aastha", name="Aastha Flora Vol 5", slug="aastha-vol5",
                          code=r"A\s*-\s*\d{3}"),
    "AASTHA VOL 3": dict(brand="Aastha", name="Aastha Vol 3", slug="aastha-vol3",
                         code=r"A\s*-\s*\d{3}"),
    "aastha vol 2": dict(brand="Aastha", name="Aastha Vol 2", slug="aastha-vol2",
                         code=r"(?<!\d)\d{3}(?!\d)", norm=lambda s: "A-" + re.findall(r"\d+", s)[-1]),
    "AASTHA Wonder": dict(brand="Wonder Sign", name="Wonder Door Print Book", slug="wonder",
                          code=r"Wonder\s*\d+", door_ratio=2.30,
                          norm=lambda s: "Wonder " + re.findall(r"\d+", s)[-1]),
    "Deluxe Print 22-23": dict(brand="Deluxe", name="Deluxe Print 22-23", slug="deluxe",
                               code=r"DX\s*-\s*\d{4}"),
    "Ramdev Door 942733": dict(brand="Ramdev", name="Ramdev Doors 1", slug="ramdev-1",
                               code=r"RD\s*-\s*\d{3}"),
    "Ramdev doors 9427336": dict(brand="Ramdev", name="Ramdev Doors 2", slug="ramdev-2",
                                 code=r"RD\s*-\s*\d{3}"),
}

_ocr = None


def ocr(img_rgb):
    """Return [(text, (x0,y0,x1,y1))] for an RGB numpy image."""
    global _ocr
    if _ocr is None:
        from rapidocr_onnxruntime import RapidOCR
        _ocr = RapidOCR()
    res, _ = _ocr(img_rgb)
    out = []
    for box, text, _conf in res or []:
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        out.append((text, (min(xs), min(ys), max(xs), max(ys))))
    return out


def is_door_shape(w, h):
    return w > 0 and 1.55 <= h / w <= 3.3


def embedded_door_rects(page):
    """Rects of images placed in the PDF that look like single doors."""
    rects = []
    for info in page.get_image_info():
        r = pymupdf.Rect(info["bbox"]) & page.rect
        if is_door_shape(r.width, r.height) and r.height > page.rect.height * 0.25:
            rects.append(r)
    return dedupe(rects)


def dedupe(rects):
    out = []
    for r in sorted(rects, key=lambda r: -r.get_area()):
        if not any((r & o).get_area() > 0.6 * r.get_area() for o in out):
            out.append(r)
    return out


def detect_doors(img, use_bg=True):
    """Find door-shaped panels on a flat catalog page image (RGB numpy). Returns pixel boxes."""
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    # Background = the most common (quantised) colour on the page.
    q = (img[::4, ::4] // 16).reshape(-1, 3).astype(np.int32)
    keys, counts = np.unique(q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2], return_counts=True)
    top = keys[counts.argmax()]
    bg = (np.array([top // 256, (top // 16) % 16, top % 16]) * 16 + 8).astype(float)
    diff = np.abs(img.astype(int) - bg).sum(axis=2)
    fg = (hsv[..., 1] > 55) | (hsv[..., 2] < 150)
    if use_bg:
        fg |= diff > 90
    fg = fg.astype(np.uint8) * 255
    k = max(3, w // 300)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((k * 3, k * 3), np.uint8))
    contours, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for c in contours:
        x, y, bw, bh = cv2.boundingRect(c)
        if bh < h * 0.2 or bw < w * 0.06:
            continue
        fill = cv2.contourArea(c) / float(bw * bh)
        if fill < 0.75:
            continue
        boxes.append((x, y, x + bw, y + bh))
    if use_bg and not any(is_door_shape(b[2] - b[0], b[3] - b[1]) for b in boxes):
        # Textured grey page backgrounds differ from the page colour; fall back to colour/darkness only.
        return detect_doors(img, use_bg=False)
    return boxes


def fixed_ratio(box, ratio):
    """Wonder pages show a faded mirror image under each door; the door itself has a fixed shape."""
    x0, y0, x1, y1 = box
    return (x0, y0, x1, min(y1, y0 + (x1 - x0) * ratio))


def find_code(words, box, page_h, rx, norm):
    """Pick the code text closest below the door box (words: [(text,(x0,y0,x1,y1))] in same units)."""
    x0, y0, x1, y1 = box
    cx = (x0 + x1) / 2
    best = None
    for text, (a, b, c, d) in words:
        m = re.search(rx, text, re.I)
        if not m:
            continue
        tx = (a + c) / 2
        if not (x0 - (x1 - x0) * 0.25 <= tx <= x1 + (x1 - x0) * 0.25):
            continue
        dy = b - y1
        if dy < -(y1 - y0) * 0.05 or dy > page_h * 0.25:
            continue
        score = abs(dy) + abs(tx - cx) * 0.5
        if best is None or score < best[0]:
            best = (score, m.group(0))
    if not best:
        return None
    s = re.sub(r"\s+", "", best[1]).upper()
    return norm(best[1]) if norm else s


def save_door(pil, path_full, path_thumb):
    pil = pil.convert("RGB")
    full = pil.resize((max(1, round(pil.width * DOOR_H / pil.height)), DOOR_H), Image.LANCZOS) \
        if pil.height > DOOR_H else pil
    full.save(path_full, "JPEG", quality=84, optimize=True, progressive=True)
    th = pil.resize((max(1, round(pil.width * THUMB_H / pil.height)), THUMB_H), Image.LANCZOS)
    th.save(path_thumb, "JPEG", quality=78, optimize=True)


def process(pdf_path, cfg, entries):
    doc = pymupdf.open(pdf_path)
    slug = cfg["slug"]
    out_dir = os.path.join(ROOT, "doors", slug)
    os.makedirs(os.path.join(out_dir, "t"), exist_ok=True)
    norm = cfg.get("norm")
    seen = set()
    count = 0
    for pn, page in enumerate(doc):
        rects = embedded_door_rects(page)
        # Render page at a resolution where doors end up ~DOOR_H tall or better.
        zoom = 2.0
        if rects:
            zoom = max(1.0, min(5.0, DOOR_H / min(r.height for r in rects)))
        else:
            zoom = max(1.0, min(4.0, 2600 / page.rect.height))
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
        img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[..., :3].copy()

        if rects:
            boxes = [(r.x0 * zoom, r.y0 * zoom, r.x1 * zoom, r.y1 * zoom) for r in rects]
        else:
            boxes = detect_doors(img)
            if cfg.get("door_ratio"):
                boxes = [fixed_ratio(b, cfg["door_ratio"]) for b in boxes if b[3] - b[1] > (b[2] - b[0]) * 1.8]
            boxes = [b for b in boxes if is_door_shape(b[2] - b[0], b[3] - b[1])]
        if not boxes:
            continue

        words = [(w[4], tuple(v * zoom for v in w[:4])) for w in page.get_text("words")]
        # Join neighbouring words on one line so codes like "SP-2 (3)" survive.
        lines = {}
        for w in page.get_text("words"):
            lines.setdefault((w[5], w[6]), []).append(w)
        for ws in lines.values():
            t = " ".join(x[4] for x in ws)
            words.append((t, (min(x[0] for x in ws) * zoom, min(x[1] for x in ws) * zoom,
                              max(x[2] for x in ws) * zoom, max(x[3] for x in ws) * zoom)))
        if not any(re.search(cfg["code"], t, re.I) for t, _ in words):
            words = ocr(img)

        boxes.sort(key=lambda b: (round(b[1] / (img.shape[0] * 0.15)), b[0]))
        for b in boxes:
            b = tuple(int(round(v)) for v in b)
            code = find_code(words, b, img.shape[0], cfg["code"], norm)
            if not code:
                if pn == 0:
                    continue  # cover page artwork, not a catalog design
                code = f"{slug.upper()}-P{pn + 1}-{count + 1}"
            base = code
            i = 2
            while code in seen:
                code = f"{base}-{i}"
                i += 1
            seen.add(code)
            fname = re.sub(r"[^A-Za-z0-9-]+", "-", code).strip("-").lower() + ".jpg"
            crop = Image.fromarray(img[b[1]:b[3], b[0]:b[2]])
            save_door(crop, os.path.join(out_dir, fname), os.path.join(out_dir, "t", fname))
            entries.append(dict(id=f"{slug}/{fname[:-4]}", code=code, brand=cfg["brand"],
                                catalog=cfg["name"], catalogId=slug,
                                img=f"doors/{slug}/{fname}", thumb=f"doors/{slug}/t/{fname}",
                                w=crop.width, h=crop.height, page=pn + 1))
            count += 1
    entries.sort(key=lambda e: [e["code"].startswith(slug.upper())] + [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", e["code"])])
    print(f"{os.path.basename(pdf_path)}: {count} doors", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--only")
    a = ap.parse_args()
    cat_path = os.path.join(ROOT, "data", "catalog.json")
    os.makedirs(os.path.dirname(cat_path), exist_ok=True)
    data = {"catalogs": [], "doors": []}
    if os.path.exists(cat_path):
        data = json.load(open(cat_path, encoding="utf-8"))
    for stem, cfg in CATALOGS.items():
        if a.only and a.only != stem:
            continue
        pdf = os.path.join(a.folder, stem + ".pdf")
        if not os.path.exists(pdf):
            print("missing", pdf)
            continue
        entries = []
        process(pdf, cfg, entries)
        data["doors"] = [d for d in data["doors"] if d["catalogId"] != cfg["slug"]] + entries
        data["catalogs"] = [c for c in data["catalogs"] if c["id"] != cfg["slug"]] + \
            [dict(id=cfg["slug"], name=cfg["name"], brand=cfg["brand"])]
    json.dump(data, open(cat_path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("total doors:", len(data["doors"]))


if __name__ == "__main__":
    main()

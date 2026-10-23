"""Render the sample rooms customers can use when they don't have a photo.

Each room is a wall (drawn flat, as an elevation) and a plank/tile floor, projected through a simple
pinhole camera so the door opening's four corners are known exactly.

    python tools/make_rooms.py

Writes assets/rooms/<id>.jpg, assets/rooms/t/<id>.jpg and data/rooms.json.
"""
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "rooms"
W, H = 1200, 1500          # final image
SS = 2                     # supersampling
PPM = 420                  # elevation pixels per metre
RNG = np.random.default_rng(7)


# ---------- helpers ----------
def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


def blur(a, s):
    return cv2.GaussianBlur(a, (0, 0), s)


def noise(h, w, scale, seed=None):
    """Smooth value noise in [-1, 1]."""
    rng = np.random.default_rng(seed) if seed is not None else RNG
    sh, sw = max(2, int(h / scale)), max(2, int(w / scale))
    n = rng.standard_normal((sh, sw)).astype(np.float32)
    n = cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC)
    return n / (np.abs(n).max() + 1e-6)


def wood(h, w, c1, c2, ring=0.06, streak=18, seed=None):
    """Vertical wood grain texture (h x w x 3)."""
    rng = np.random.default_rng(seed)
    lines = rng.standard_normal((max(2, h // 300), max(2, w // streak))).astype(np.float32)
    lines = cv2.resize(lines, (w, h), interpolation=cv2.INTER_CUBIC)
    fibres = rng.standard_normal((max(2, h // 30), max(2, w // 2))).astype(np.float32)
    fibres = cv2.resize(fibres, (w, h), interpolation=cv2.INTER_LINEAR)
    warp = noise(h, w, 260, rng.integers(1e9)) * 14
    x = np.arange(w, dtype=np.float32)[None, :] + warp
    rings = np.sin(x * ring + noise(h, w, 500, rng.integers(1e9)) * 2) * .5 + .5
    t = np.clip(.5 + lines * .14 + fibres * .09 + (rings - .5) * .32, 0, 1)[..., None]
    return hexrgb(c1) * (1 - t) + hexrgb(c2) * t


def plaster(h, w, base, amp=5, seed=None):
    rng = np.random.default_rng(seed)
    n = blur(rng.standard_normal((h, w)).astype(np.float32), 1.2) * amp * 2.2
    n += noise(h, w, 260, rng.integers(1e9)) * amp
    return hexrgb(base)[None, None, :] + n[..., None]


def rect(img, x0, y0, x1, y1, color, alpha=1.0):
    x0, y0, x1, y1 = (int(round(v)) for v in (x0, y0, x1, y1))
    img[y0:y1, x0:x1] = img[y0:y1, x0:x1] * (1 - alpha) + np.asarray(color, np.float32) * alpha


def shadow(img, mask, s, strength, dx=0, dy=0):
    """Darken img by a blurred, offset copy of mask (float 0..1)."""
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    m = blur(cv2.warpAffine(mask, M, (mask.shape[1], mask.shape[0])), s)
    img *= (1 - strength * m)[..., None]


def bevel_frame(img, x0, y0, x1, y1, t, color, depth=.22):
    """Picture frame / door casing: band of width t with a light top-left and darker bottom-right."""
    c = np.asarray(color, np.float32)
    rect(img, x0, y0, x1, y0 + t, c * (1 + depth * .6))        # top
    rect(img, x0, y0, x0 + t, y1, c * (1 + depth * .3))        # left
    rect(img, x1 - t, y0, x1, y1, c * (1 - depth * .5))        # right
    rect(img, x0, y1 - t, x1, y1, c * (1 - depth * .7))        # bottom
    # inner and outer hairlines
    rect(img, x0 + t - 3, y0 + t - 3, x1 - t + 3, y0 + t, c * .72)
    rect(img, x0 + t - 3, y0 + t, x0 + t, y1 - t + 3, c * .8)


def radial(h, w, cx, cy, r):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
    return np.clip(1 - d, 0, 1) ** 2


# ---------- camera ----------
class Camera:
    def __init__(self, yaw_deg, dist, eye, offset, f):
        self.th = np.radians(yaw_deg)
        self.dist, self.eye, self.offset, self.f = dist, eye, offset, f

    def wall_pt(self, u, v, wall_w):
        eu = np.array([np.cos(self.th), 0, np.sin(self.th)])
        c = np.array([self.offset, 0, -self.dist])
        return c + (u - wall_w / 2) * eu + np.array([0, v, 0])

    def floor_pt(self, u, depth, wall_w):
        n = np.array([-np.sin(self.th), 0, np.cos(self.th)])
        return self.wall_pt(u, 0, wall_w) + depth * n

    def project(self, p):
        x, y, z = p[0], p[1] - self.eye, p[2]
        return np.array([W * SS / 2 + self.f * SS * x / -z, H * SS * .5 - self.f * SS * y / -z])


def warp_into(canvas, mask_acc, src, src_quad, dst_quad):
    M = cv2.getPerspectiveTransform(np.float32(src_quad), np.float32(dst_quad))
    out = cv2.warpPerspective(src, M, (canvas.shape[1], canvas.shape[0]), flags=cv2.INTER_LINEAR,
                              borderMode=cv2.BORDER_CONSTANT)
    m = cv2.warpPerspective(np.ones(src.shape[:2], np.float32), M, (canvas.shape[1], canvas.shape[0]),
                            flags=cv2.INTER_LINEAR)
    canvas[:] = canvas * (1 - m[..., None]) + out * m[..., None]
    mask_acc[:] = np.maximum(mask_acc, m)


# ---------- rooms ----------
def room(spec):
    ww, wh, pad = spec["wall_w"], spec["wall_h"], 3.0   # wall extends `pad` m past the framed area
    EW, EH = int((ww + 2 * pad) * PPM), int(wh * PPM)
    E = plaster(EH, EW, spec["wall"], seed=spec["seed"])
    occl = np.zeros((EH, EW), np.float32)       # things that cast a shadow on the wall
    m2px = lambda u, v: ((u + pad) * PPM, EH - v * PPM)  # elevation metres -> pixels (v up)
    du, dw, dh, ct = spec["door_u"], .9, 2.1, spec["casing"]
    ctx = {"door": (m2px(du - ct, 0)[0], m2px(du + dw + ct, 0)[0])}

    # Wainscot panels / slats drawn first so the casing sits on top.
    for deco in spec.get("decor", []):
        deco(E, occl, m2px, EW, EH, ctx)

    # Cornice
    rect(E, 0, 0, EW, 26, hexrgb(spec["ceiling"]) * .97)
    rect(E, 0, 26, EW, 34, hexrgb(spec["ceiling"]) * .85)
    occl[0:34, :] = 1

    # Skirting
    sk_h = spec["skirt_h"] * PPM
    rect(E, 0, EH - sk_h, EW, EH, hexrgb(spec["skirt"]))
    rect(E, 0, EH - sk_h, EW, EH - sk_h + 4, hexrgb(spec["skirt"]) * 1.12)
    occl[int(EH - sk_h):int(EH - sk_h + 6), :] = 1

    # Door opening + casing
    x0, y0 = m2px(du, dh)
    x1, y1 = m2px(du + dw, 0)
    cx0, cy0, cx1 = x0 - ct * PPM, y0 - ct * PPM, x1 + ct * PPM
    x0, y0, x1, y1, cx0, cy0, cx1 = (int(round(v)) for v in (x0, y0, x1, y1, cx0, cy0, cx1))
    occl[cy0:y1, cx0:cx1] = 1
    shadow(E, occl, 9, .32, dx=6, dy=10)
    shadow(E, occl, 40, .12, dx=10, dy=24)
    casing = hexrgb(spec["casing_col"])
    cas = wood(y1 - cy0, cx1 - cx0, spec["casing_col"], spec["casing_col2"], seed=spec["seed"] + 3) \
        if spec.get("casing_wood") else np.full((y1 - cy0, cx1 - cx0, 3), casing, np.float32)
    E[cy0:y1, cx0:cx1] = cas
    bevel_frame(E, cx0, cy0, cx1, y1 + 40, ct * PPM, casing)
    E[cy0:y1, cx0:cx1] = E[cy0:y1, cx0:cx1] * .55 + cas * .45
    # Placeholder door (covered as soon as a design is picked)
    door = wood(y1 - y0, x1 - x0, "#b88a5c", "#9a6b40", seed=spec["seed"] + 9)
    E[y0:y1, x0:x1] = door
    inner = np.zeros((EH, EW), np.float32)
    inner[y0:y1, x0:x1] = 1
    rim = (inner - blur(inner, 6)).clip(0, 1)        # soft shade just inside the opening
    E *= (1 - .45 * rim)[..., None]

    # Wall light pool
    for lx, ly, lr, ls in spec["lights"]:
        px, py = m2px(lx, ly)
        E *= (1 + ls * radial(EH, EW, px, py, lr * PPM))[..., None]

    for deco in spec.get("decor_top", []):
        deco(E, occl, m2px, EW, EH, ctx)

    # ---- project
    cam = Camera(**spec["camera"])
    C = np.zeros((H * SS, W * SS, 3), np.float32)
    C[:] = hexrgb(spec["ceiling"])
    acc = np.zeros((H * SS, W * SS), np.float32)

    # Floor
    fd = spec["floor_depth"]
    FW, FH = int((ww + 2 * pad) * 160), int(fd * 160)
    F = spec["floor"](FH, FW)
    F *= (0.6 + 0.4 * np.clip(np.arange(FH, dtype=np.float32) / (FH * .15), 0, 1) ** .6)[:, None, None]
    fq = [cam.project(cam.floor_pt(u, d, ww)) for u, d in ((-pad, 0), (ww + pad, 0), (ww + pad, fd), (-pad, fd))]
    warp_into(C, acc, F, [(0, 0), (FW, 0), (FW, FH), (0, FH)], fq)

    wq = [cam.project(cam.wall_pt(u, v, ww)) for u, v in ((-pad, wh), (ww + pad, wh), (ww + pad, 0), (-pad, 0))]
    warp_into(C, acc, E, [(0, 0), (EW, 0), (EW, EH), (0, EH)], wq)

    # Contact shadow along wall base, on the floor
    base = np.zeros((H * SS, W * SS), np.float32)
    a, b = [cam.project(cam.wall_pt(u, 0, ww)) for u in (-pad, ww + pad)]
    cv2.line(base, tuple(int(v) for v in a), tuple(int(v) for v in b), 1.0, 10 * SS)
    shadow(C, base, 14 * SS, .35, dy=8 * SS)

    # Global light: soft gradient + vignette
    yy, xx = np.mgrid[0:H * SS, 0:W * SS].astype(np.float32)
    gx, gy = spec["key"]
    g = 1 + .14 * (1 - np.sqrt(((xx / (W * SS) - gx) ** 2) + ((yy / (H * SS) - gy) ** 2)) * 1.4)
    v = 1 - .38 * ((xx / (W * SS) - .5) ** 2 * 1.6 + (yy / (H * SS) - .46) ** 2 * 1.2)
    C *= (g * v)[..., None]
    C = np.clip(C, 0, 255)
    C = (C / 255) ** (1 / spec.get("gamma", 1.0)) * 255
    img = cv2.resize(C, (W, H), interpolation=cv2.INTER_AREA)
    # Film grain
    img += RNG.standard_normal(img.shape[:2]).astype(np.float32)[..., None] * 1.6
    img = np.clip(img, 0, 255).astype(np.uint8)

    quad = [cam.project(cam.wall_pt(u, v, ww)) / SS for u, v in
            ((du, dh), (du + dw, dh), (du + dw, 0), (du, 0))]
    return img, [[round(float(x), 1), round(float(y), 1)] for x, y in quad]


# ---------- decor ----------
def art(u, v, w, h, frame="#2b2420", mat="#f4efe6", palette=("#c9a46a", "#7d5a3c", "#e7d8bf")):
    def draw(E, occl, m2px, EW, EH, ctx):
        x0, y0 = m2px(u, v + h)
        x1, y1 = m2px(u + w, v)
        m = np.zeros(E.shape[:2], np.float32)
        m[int(y0):int(y1), int(x0):int(x1)] = 1
        shadow(E, m, 10, .35, dx=8, dy=14)
        rect(E, x0, y0, x1, y1, hexrgb(frame))
        bevel_frame(E, x0, y0, x1, y1, 16, hexrgb(frame), .5)
        mx0, my0, mx1, my1 = x0 + 16, y0 + 16, x1 - 16, y1 - 16
        rect(E, mx0, my0, mx1, my1, hexrgb(mat))
        ax0, ay0, ax1, ay1 = int(mx0 + 38), int(my0 + 38), int(mx1 - 38), int(my1 - 38)
        hh, ww_ = ay1 - ay0, ax1 - ax0
        canvas = np.full((hh, ww_, 3), hexrgb(palette[2]), np.float32)
        yy, xx = np.mgrid[0:hh, 0:ww_].astype(np.float32)
        # Soft abstract: a sun disc and two rolling hills
        sun = np.clip(1 - np.sqrt((xx - ww_ * .62) ** 2 + (yy - hh * .36) ** 2) / (ww_ * .2), 0, 1)
        canvas[sun > 0] = hexrgb(palette[0])
        hill1 = yy > hh * .62 + np.sin(xx / ww_ * 3.2) * hh * .07
        hill2 = yy > hh * .76 + np.sin(xx / ww_ * 2.2 + 1.5) * hh * .05
        canvas[hill1] = hexrgb(palette[1]) * 1.15
        canvas[hill2] = hexrgb(palette[1])
        canvas = blur(canvas, 1.2) + noise(hh, ww_, 30)[..., None] * 4
        E[ay0:ay1, ax0:ax1] = canvas
        rect(E, ax0 - 2, ay0 - 2, ax1 + 2, ay0, hexrgb(mat) * .85)
    return draw


def switch(u, v):
    def draw(E, occl, m2px, EW, EH, ctx):
        x0, y0 = m2px(u, v + .086)
        x1, y1 = m2px(u + .086, v)
        m = np.zeros(E.shape[:2], np.float32)
        m[int(y0):int(y1), int(x0):int(x1)] = 1
        shadow(E, m, 3, .3, dx=2, dy=3)
        rect(E, x0, y0, x1, y1, (238, 236, 232))
        rect(E, x0, y0, x1, y0 + 2, (250, 250, 250))
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        rect(E, cx - 6, cy - 11, cx + 6, cy + 11, (222, 220, 216))
        rect(E, cx - 6, cy - 11, cx + 6, cy - 2, (210, 208, 204))
    return draw


def wainscot(top, panel_w, col, line):
    def draw(E, occl, m2px, EW, EH, ctx):
        _, ty = m2px(0, top)
        rect(E, 0, ty, EW, EH, hexrgb(col))
        rect(E, 0, ty - 10, EW, ty + 8, hexrgb(col) * 1.06)     # chair rail
        rect(E, 0, ty + 8, EW, ty + 12, hexrgb(col) * .82)
        occl[int(ty - 10):int(ty + 12), :] = .8
        d0, d1 = ctx["door"]
        spans = []
        for a, b in ((0, d0), (d1, EW)):
            n = max(1, round((b - a) / (panel_w * PPM)))
            spans += [(a + (b - a) * i / n, a + (b - a) * (i + 1) / n) for i in range(n)]
        for a, b in spans:
            x0, x1 = a + 50, b - 50
            y0, y1 = ty + 60, EH - 0.16 * PPM - 50
            rect(E, x0, y0, x1, y0 + 3, hexrgb(line) * .8)
            rect(E, x0, y0, x0 + 3, y1, hexrgb(line) * .85)
            rect(E, x1 - 3, y0, x1, y1, hexrgb(line) * 1.08)
            rect(E, x0, y1 - 3, x1, y1, hexrgb(line) * 1.1)
    return draw


def slats(u0, u1, col, col2):
    def draw(E, occl, m2px, EW, EH, ctx):
        x0, _ = m2px(u0, 0)
        x1, _ = m2px(u1, 0)
        n = int((x1 - x0) / 46)
        tex = wood(EH, int(x1 - x0), col, col2, ring=.03, seed=21)
        for i in range(n):
            a = int(x0 + i * 46)
            E[:, a:a + 34] = tex[:, a - int(x0):a - int(x0) + 34]
            E[:, a + 34:a + 46] *= .38
            E[:, a:a + 3] *= 1.12
    return draw


def sconce(u, v):
    def draw(E, occl, m2px, EW, EH, ctx):
        x, y = m2px(u, v)
        E *= (1 + .55 * radial(EH, EW, x, y - 20, 300) + .35 * radial(EH, EW, x, y + 160, 260))[..., None]
        rect(E, x - 30, y - 70, x + 30, y + 18, (230, 214, 186))
        rect(E, x - 30, y - 70, x + 30, y - 64, (255, 246, 226))
        rect(E, x - 4, y + 18, x + 4, y + 52, (60, 52, 46))
        rect(E, x - 22, y + 50, x + 22, y + 64, (70, 60, 52))
    return draw


# ---------- floors ----------
def planks(c1, c2, plank_w=34, seed=0):
    def f(h, w):
        out = np.zeros((h, w, 3), np.float32)
        rng = np.random.default_rng(seed)
        for i, x in enumerate(range(0, w, plank_w)):
            t = wood(h, plank_w, c1, c2, ring=.09, streak=8, seed=seed + i)
            t *= rng.uniform(.88, 1.1)
            out[:, x:x + plank_w] = t[:, :min(plank_w, w - x)]
            out[:, x:x + 2] *= .55
            # staggered butt joints
            y = rng.integers(0, h)
            while y < h:
                out[y:y + 2, x:x + plank_w] *= .6
                y += rng.integers(int(h * .5), int(h * 1.2)) if h > 50 else h
        return out
    return f


def tiles(c, size=96, seed=0):
    def f(h, w):
        out = plaster(h, w, c, amp=6, seed=seed)
        rng = np.random.default_rng(seed)
        for y in range(0, h, size):
            for x in range(0, w, size):
                out[y:y + size, x:x + size] *= rng.uniform(.94, 1.05)
        out[::size, :] *= .55
        out[:, ::size] *= .55
        out += noise(h, w, 120, seed)[..., None] * 8
        return out
    return f


ROOMS = [
    {
        "id": "living", "name": "Warm living room", "seed": 11,
        "wall": "#d8c6aa", "skirt": "#5a3e2b", "skirt_h": .12, "ceiling": "#efe7da",
        "casing": .07, "casing_col": "#6b4a31", "casing_col2": "#56392a", "casing_wood": True,
        "wall_w": 4.2, "wall_h": 3.2, "door_u": 1.05,
        "lights": [(3.2, 2.6, 1.6, .18)],
        "decor_top": [art(2.3, 1.3, .95, .7), switch(2.1, 1.2)],
        "floor": planks("#9b7350", "#7d5a3c", 30, 3), "floor_depth": 3.2,
        "camera": dict(yaw_deg=0, dist=3.6, eye=1.35, offset=0.35, f=1250),
        "key": (.75, .2),
    },
    {
        "id": "bedroom", "name": "Calm bedroom", "seed": 23,
        "wall": "#c4ccc3", "skirt": "#f1efe9", "skirt_h": .14, "ceiling": "#f2f2ee",
        "casing": .075, "casing_col": "#f3f1ec", "casing_col2": "#f3f1ec",
        "wall_w": 4.6, "wall_h": 3.2, "door_u": 2.4,
        "decor": [wainscot(1.0, 0.95, "#e9e7e0", "#e9e7e0")],
        "lights": [(1.0, 2.8, 2.2, .16)],
        "decor_top": [art(.55, 1.35, .95, 1.05, frame="#c8b28a", mat="#fbf8f2",
                          palette=("#d9a07a", "#8fa59a", "#efe6d8")), switch(3.48, 1.15)],
        "floor": planks("#c9a882", "#b08d66", 36, 9), "floor_depth": 3.4,
        "camera": dict(yaw_deg=-16, dist=3.7, eye=1.4, offset=-0.2, f=1200),
        "key": (.2, .15), "gamma": 1.04,
    },
    {
        "id": "modern", "name": "Modern hallway", "seed": 37,
        "wall": "#e6e2dc", "skirt": "#2f2b28", "skirt_h": .08, "ceiling": "#f3f1ee",
        "casing": .05, "casing_col": "#2f2b28", "casing_col2": "#2f2b28",
        "wall_w": 4.4, "wall_h": 3.2, "door_u": 2.0,
        "decor": [slats(.2, 1.55, "#8a6544", "#6d4c32")],
        "lights": [(3.6, 2.9, 1.8, .2)],
        "decor_top": [switch(3.05, 1.15)],
        "floor": tiles("#8d8a86", 110, 5), "floor_depth": 3.0,
        "camera": dict(yaw_deg=28, dist=3.4, eye=1.45, offset=0.45, f=1150),
        "key": (.8, .25),
    },
]


def main():
    (OUT / "t").mkdir(parents=True, exist_ok=True)
    meta = []
    for spec in ROOMS:
        img, quad = room(spec)
        bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        cv2.imwrite(str(OUT / f"{spec['id']}.jpg"), bgr, [cv2.IMWRITE_JPEG_QUALITY, 86])
        cv2.imwrite(str(OUT / "t" / f"{spec['id']}.jpg"),
                    cv2.resize(bgr, (240, 300), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 82])
        meta.append({"id": spec["id"], "name": spec["name"], "img": f"assets/rooms/{spec['id']}.jpg",
                     "thumb": f"assets/rooms/t/{spec['id']}.jpg", "quad": quad})
        print(spec["id"], quad)
    (ROOT / "data" / "rooms.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()

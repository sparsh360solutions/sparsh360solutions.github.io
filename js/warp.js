// Perspective warp: draws a flat door image into a 4-corner quad on a canvas.

// Homography mapping unit square corners (0,0),(1,0),(1,1),(0,1) to quad p[0..3].
function squareToQuad(p) {
  const [x0, y0] = p[0], [x1, y1] = p[1], [x2, y2] = p[2], [x3, y3] = p[3];
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, h = 0;
  if (dx3 !== 0 || dy3 !== 0) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  return [
    x1 - x0 + g * x1, x3 - x0 + h * x3, x0,
    y1 - y0 + g * y1, y3 - y0 + h * y3, y0,
    g, h, 1,
  ];
}

function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
    B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
    C / det, -(a * h - b * g) / det, (a * e - b * d) / det,
  ];
}

// Cache of decoded door pixels, keyed by image element.
const pixelCache = new WeakMap();
function doorPixels(img) {
  let px = pixelCache.get(img);
  if (!px) {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    px = { w: c.width, h: c.height, data: cx.getImageData(0, 0, c.width, c.height).data };
    pixelCache.set(img, px);
  }
  return px;
}

/**
 * Warp `door` (loaded <img>) into `quad` ([[x,y]x4]: TL, TR, BR, BL in canvas pixels) on ctx.
 * opts.light: brightness multiplier (1 = unchanged). opts.shade: add soft edge shading for realism.
 */
function drawWarpedDoor(ctx, door, quad, opts = {}) {
  const light = opts.light ?? 1;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const xs = quad.map(q => q[0]), ys = quad.map(q => q[1]);
  const bx0 = Math.max(0, Math.floor(Math.min(...xs)) - 1), bx1 = Math.min(W, Math.ceil(Math.max(...xs)) + 1);
  const by0 = Math.max(0, Math.floor(Math.min(...ys)) - 1), by1 = Math.min(H, Math.ceil(Math.max(...ys)) + 1);
  const bw = bx1 - bx0, bh = by1 - by0;
  if (bw <= 0 || bh <= 0) return;

  const src = doorPixels(door);
  const inv = invert3(squareToQuad(quad));
  const out = ctx.getImageData(bx0, by0, bw, bh);
  const o = out.data, s = src.data, sw = src.w, sh = src.h;
  const SS = 2; // edge anti-aliasing via 2x2 coverage samples

  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      let cov = 0, r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = bx0 + x + (sx + 0.5) / SS, py = by0 + y + (sy + 0.5) / SS;
          const w = inv[6] * px + inv[7] * py + inv[8];
          const u = (inv[0] * px + inv[1] * py + inv[2]) / w;
          const v = (inv[3] * px + inv[4] * py + inv[5]) / w;
          if (u < 0 || u > 1 || v < 0 || v > 1) continue;
          // Bilinear sample.
          const fx = u * (sw - 1), fy = v * (sh - 1);
          const ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy;
          const ix1 = Math.min(ix + 1, sw - 1), iy1 = Math.min(iy + 1, sh - 1);
          const i00 = (iy * sw + ix) * 4, i10 = (iy * sw + ix1) * 4, i01 = (iy1 * sw + ix) * 4, i11 = (iy1 * sw + ix1) * 4;
          let shade = 1;
          if (opts.shade !== false) {
            // Gentle darkening toward the edges, like a door set in a frame.
            const e = Math.min(u, 1 - u) * 2.2, f = Math.min(v, 1 - v) * 4.5;
            shade = 0.86 + 0.14 * Math.min(1, e * 6, f * 6);
          }
          const k = light * shade;
          r += ((s[i00] * (1 - ax) + s[i10] * ax) * (1 - ay) + (s[i01] * (1 - ax) + s[i11] * ax) * ay) * k;
          g += ((s[i00 + 1] * (1 - ax) + s[i10 + 1] * ax) * (1 - ay) + (s[i01 + 1] * (1 - ax) + s[i11 + 1] * ax) * ay) * k;
          b += ((s[i00 + 2] * (1 - ax) + s[i10 + 2] * ax) * (1 - ay) + (s[i01 + 2] * (1 - ax) + s[i11 + 2] * ax) * ay) * k;
          cov++;
        }
      }
      if (!cov) continue;
      const a = cov / (SS * SS), j = (y * bw + x) * 4;
      o[j] = o[j] * (1 - a) + Math.min(255, r / cov) * a;
      o[j + 1] = o[j + 1] * (1 - a) + Math.min(255, g / cov) * a;
      o[j + 2] = o[j + 2] * (1 - a) + Math.min(255, b / cov) * a;
    }
  }
  ctx.putImageData(out, bx0, by0);
}

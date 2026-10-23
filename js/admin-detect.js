// Door detection inside catalog PDFs (browser port of tools/extract_catalogs.py).
// All boxes/words are in normalised page coordinates (0..1).
const Detect = (() => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const OPS = pdfjsLib.OPS;
  const REVIEW_H = 1100; // review render height (px)

  const isDoorShape = (w, h) => w > 0 && h / w >= 1.55 && h / w <= 3.3;
  const mul = (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];

  // Rects of images drawn on the page that look like single doors.
  async function embeddedDoorRects(page, viewport) {
    const ops = await page.getOperatorList();
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [], rects = [];
    const imageOps = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageXObjectRepeat, OPS.paintJpegXObject].filter(Boolean));
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i], args = ops.argsArray[i];
      if (fn === OPS.save) stack.push(ctm);
      else if (fn === OPS.restore) ctm = stack.pop() || ctm;
      else if (fn === OPS.transform) ctm = mul(ctm, args);
      else if (fn === OPS.paintFormXObjectBegin) { stack.push(ctm); if (args[0]) ctm = mul(ctm, args[0]); }
      else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() || ctm;
      else if (imageOps.has(fn)) {
        const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]]);
        const vp = pts.map(p => viewport.convertToViewportPoint(p[0], p[1]));
        const xs = vp.map(p => p[0]), ys = vp.map(p => p[1]);
        let x0 = Math.max(0, Math.min(...xs)) / viewport.width, x1 = Math.min(viewport.width, Math.max(...xs)) / viewport.width;
        let y0 = Math.max(0, Math.min(...ys)) / viewport.height, y1 = Math.min(viewport.height, Math.max(...ys)) / viewport.height;
        const wpx = (x1 - x0) * viewport.width, hpx = (y1 - y0) * viewport.height;
        if (isDoorShape(wpx, hpx) && y1 - y0 > 0.25) rects.push({ x0, y0, x1, y1 });
      }
    }
    // Drop near-duplicates (same image drawn twice).
    const area = r => (r.x1 - r.x0) * (r.y1 - r.y0);
    const inter = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    const out = [];
    rects.sort((a, b) => area(b) - area(a)).forEach(r => { if (!out.some(o => inter(r, o) > 0.6 * area(r))) out.push(r); });
    return out;
  }

  async function pageWords(page, viewport) {
    const tc = await page.getTextContent();
    const items = tc.items.filter(it => it.str && it.str.trim()).map(it => {
      const t = pdfjsLib.Util.transform(viewport.transform, it.transform);
      const h = Math.hypot(t[2], t[3]);
      return { text: it.str, x0: t[4], y0: t[5] - h, x1: t[4] + it.width * viewport.scale, y1: t[5] };
    });
    // Join items on one baseline so codes split across items ("SP-2", "(3)") survive.
    const lines = [];
    items.sort((a, b) => a.y1 - b.y1 || a.x0 - b.x0).forEach(it => {
      const l = lines.find(l => Math.abs(l.y1 - it.y1) < 3 && it.x0 - l.x1 < (it.y1 - it.y0) * 1.5 && it.x0 >= l.x0);
      if (l) { l.text += (it.x0 - l.x1 > 1 ? " " : "") + it.text; l.x1 = Math.max(l.x1, it.x1); }
      else lines.push({ ...it });
    });
    const W = viewport.width, H = viewport.height;
    return [...items, ...lines].map(w => ({ text: w.text, x0: w.x0 / W, y0: w.y0 / H, x1: w.x1 / W, y1: w.y1 / H }));
  }

  // ---- Image-based detection for pages that are one flat picture ----
  function boxFilter(src, w, h, k, op) {
    // Separable min (erode) / max (dilate) over a k×k window.
    const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h), r = k >> 1;
    const pick = op === "max" ? (a, b) => (a > b ? a : b) : (a, b) => (a < b ? a : b);
    const init = op === "max" ? 0 : 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = init;
      for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < w) v = pick(v, src[y * w + xx]); }
      tmp[y * w + x] = v;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = init;
      for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < h) v = pick(v, tmp[yy * w + x]); }
      out[y * w + x] = v;
    }
    return out;
  }

  function detectOnImage(data, w, h, useBg = true) {
    // Background = most common quantised colour.
    const counts = new Map();
    for (let i = 0; i < w * h; i += 4) {
      const j = i * 4, key = ((data[j] >> 4) << 8) | ((data[j + 1] >> 4) << 4) | (data[j + 2] >> 4);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let top = 0, best = -1;
    counts.forEach((c, k) => { if (c > best) { best = c; top = k; } });
    const bg = [((top >> 8) << 4) + 8, (((top >> 4) & 15) << 4) + 8, ((top & 15) << 4) + 8];

    let mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx ? ((mx - mn) / mx) * 255 : 0;
      let fg = sat > 55 || mx < 150;
      if (useBg && !fg) fg = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]) > 90;
      mask[i] = fg ? 255 : 0;
    }
    const k = Math.max(3, Math.round(w / 300));
    mask = boxFilter(boxFilter(mask, w, h, k, "min"), w, h, k, "max");               // open: drop text specks
    mask = boxFilter(boxFilter(mask, w, h, k * 3, "max"), w, h, k * 3, "min");       // close: join door parts

    // Fill holes: background reachable from the border stays background.
    const reach = new Uint8Array(w * h), stack = [];
    const push = i => { if (!mask[i] && !reach[i]) { reach[i] = 1; stack.push(i); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop(), x = i % w;
      if (x > 0) push(i - 1); if (x < w - 1) push(i + 1);
      if (i >= w) push(i - w); if (i < w * (h - 1)) push(i + w);
    }

    // Connected components of filled foreground.
    const label = new Int32Array(w * h), boxes = [];
    let id = 0;
    for (let s = 0; s < w * h; s++) {
      if (reach[s] || label[s]) continue;
      id++;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0;
      label[s] = id; stack.push(s);
      while (stack.length) {
        const i = stack.pop(), x = i % w, y = (i / w) | 0;
        n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < w * (h - 1) ? i + w : -1];
        for (const j of nb) if (j >= 0 && !reach[j] && !label[j]) { label[j] = id; stack.push(j); }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (bh < h * 0.2 || bw < w * 0.06 || n / (bw * bh) < 0.75) continue;
      boxes.push({ x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h });
    }
    const doors = boxes.filter(b => isDoorShape((b.x1 - b.x0) * w, (b.y1 - b.y0) * h));
    if (useBg && !doors.length) return detectOnImage(data, w, h, false);
    return doors;
  }

  // ---- Codes ----
  function codeFromText(text, prefix) {
    const t = text.replace(/\s+/g, " ").trim();
    let m = t.match(/[A-Za-z]{1,6}\s*-?\s*\d{1,3}\s*\(\s*\d+\s*\)/); // "SP-2 (3)"
    if (m) return m[0].replace(/\s+/g, "").toUpperCase();
    m = t.match(/[A-Za-z]{1,6}(?:\s*-\s*[A-Za-z]{1,6})*\s*-?\s*\d{2,5}/); // RD-114, WL-DG-1001, Wonder 12
    if (m) {
      const s = m[0].trim();
      return /^[A-Za-z]{4,}\s\d/.test(s) ? s : s.replace(/\s+/g, "").toUpperCase();
    }
    m = t.match(/\d{2,5}/);
    if (m) return (prefix || "") + m[0];
    return null;
  }

  function findCode(words, box, prefix) {
    const cx = (box.x0 + box.x1) / 2, bw = box.x1 - box.x0, bh = box.y1 - box.y0;
    let best = null;
    for (const wd of words) {
      const code = codeFromText(wd.text, prefix);
      if (!code) continue;
      const tx = (wd.x0 + wd.x1) / 2;
      if (tx < box.x0 - bw * 0.25 || tx > box.x1 + bw * 0.25) continue;
      const dy = wd.y0 - box.y1;
      if (dy < -bh * 0.05 || dy > 0.25) continue;
      const score = Math.abs(dy) + Math.abs(tx - cx) * 0.5;
      if (!best || score < best.score) best = { score, code };
    }
    return best ? best.code : null;
  }

  let ocrWorker = null;
  async function ocrBelow(canvas, box) {
    if (!ocrWorker) {
      if (!window.Tesseract) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
          s.onload = res; s.onerror = rej; document.head.appendChild(s);
        });
      }
      ocrWorker = await Tesseract.createWorker("eng");
    }
    const W = canvas.width, H = canvas.height, bw = (box.x1 - box.x0) * W;
    const x = Math.max(0, box.x0 * W - bw * 0.2), y = Math.min(H - 1, box.y1 * H);
    const w = Math.min(W - x, bw * 1.4), h = Math.min(H - y, H * 0.08);
    if (w < 4 || h < 4) return null;
    const c = document.createElement("canvas");
    c.width = w * 2; c.height = h * 2;
    c.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, c.width, c.height);
    const { data } = await ocrWorker.recognize(c);
    return data.text || "";
  }

  async function renderPage(page, height) {
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: height / base.height });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    return { canvas, viewport };
  }

  /** Analyse one page → { image (review canvas), doors: [{x0,y0,x1,y1, code}] } */
  async function analyzePage(page, pageIndex, prefix) {
    const { canvas, viewport } = await renderPage(page, REVIEW_H);
    let boxes = await embeddedDoorRects(page, viewport);
    if (!boxes.length) {
      // Detect at reduced size for speed.
      const k = Math.min(1, 800 / canvas.height);
      const dw = Math.round(canvas.width * k), dh = Math.round(canvas.height * k);
      const dc = document.createElement("canvas"); dc.width = dw; dc.height = dh;
      dc.getContext("2d").drawImage(canvas, 0, 0, dw, dh);
      boxes = detectOnImage(dc.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, dw, dh).data, dw, dh);
    }
    const words = await pageWords(page, viewport);
    const doors = [];
    for (const b of boxes.sort((a, b) => Math.round(a.y0 * 6) - Math.round(b.y0 * 6) || a.x0 - b.x0)) {
      let code = findCode(words, b, prefix);
      if (!code) {
        try {
          const t = await ocrBelow(canvas, b);
          if (t) code = codeFromText(t, prefix);
        } catch (e) { console.warn("OCR failed", e); }
      }
      if (!code && pageIndex === 0) continue; // cover artwork
      doors.push({ ...b, code: code || "" });
    }
    return { image: canvas, doors };
  }

  return { analyzePage, renderPage };
})();

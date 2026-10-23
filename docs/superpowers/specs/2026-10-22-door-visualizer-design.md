# Sparsh 360 Door Visualizer — Design

## Intent
Customers (on their own phones) and the Sparsh 360 owner (in the showroom, laptop or phone)
see how a lamination door design looks on a real wall before buying.

## Customer flow
1. Take or upload a photo of the wall.
2. Tap the 4 corners of where the door goes (draggable, with a magnifier for accuracy).
   The design is perspective-warped to those corners so angled photos still look real.
3. Pick a design from the gallery (all lamination designs, each labelled with its catalog code,
   filterable by brand/catalog, searchable by code). Tapping swaps it instantly.
4. Send via WhatsApp — two buttons:
   - **Share picture**: native share sheet with the composited image + door code
     (customer picks the Sparsh contact; number shown on screen).
   - **Chat with us**: opens `wa.me/<number>` with the door code pre-typed.
   - Also: download the picture.

No login for customers.

## Admin (owner only)
Suppliers keep sending new catalogs as PDFs.
- `admin.html`, unlocked by pasting a private GitHub token (stored only in that browser).
- Upload a PDF → processed in the browser: each door cut out, code read from the PDF text
  (or OCR when the page is a flat image).
- Review screen: fix codes, delete junk (covers/logos), adjust or draw crop boxes by hand,
  set brand/catalog name.
- Publish → commits images + updated `data/catalog.json` to the GitHub repo; live in ~1 min.
- Laptop/desktop only (PDFs are 50–90 MB).

## Constraints
- Hosted free on GitHub Pages (static only, no server). Plain HTML/CSS/JS, no build step.
- Works well on phones and laptops.
- Brand: Sparsh 360 kit — Wood Brown #5A3A22, Deep Taupe #3E2F25, Warm Beige #DCC7A7,
  Golden Accent #C89B3C, Forest Green #2E5D3A, Light Gray #F4F4F2; Montserrat +
  Noto Sans Devanagari; tagline "हर कोने में स्पर्श का एहसास".

## Builder's calls
- Initial 9 catalogs are processed once with a Python script (`tools/extract_catalogs.py`)
  for best quality; new catalogs go through the admin page.
- WhatsApp number lives in `js/config.js` (placeholder until the owner provides it).
- Rendering uses a canvas inverse-homography warp (same code for preview and export).

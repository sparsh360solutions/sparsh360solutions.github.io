# Sparsh 360 Door Studio

Customers photograph their wall, tap the 4 corners of the door, and see any lamination design on it —
then send the picture to Sparsh 360 on WhatsApp.

- `index.html` — customer app (phone + laptop)
- `admin.html` — owner page: add new supplier catalogs from PDF, rename/remove designs
- `data/catalog.json` + `doors/` — all designs (1,132 from the first 9 catalogs)
- `js/config.js` — **WhatsApp number goes here**
- `js/i18n.js` — all customer-facing text in English, Hindi and Gujarati
- `tools/extract_catalogs.py` — one-time script used for the first 9 catalogs
- `tools/tag_looks.py` — tags every door's colour (light / medium / dark / white & grey / colourful) for the
  gallery filter; doors added from the admin page are tagged automatically
- `tools/make_rooms.py` — renders the sample rooms (`assets/rooms/`, `data/rooms.json`) for visitors without a photo

Saved designs (♥) stay only in the visitor's own browser.

## Put it online (GitHub Pages, free)

1. Create the GitHub account (e.g. `sparsh360`).
2. Create a public repository named **`sparsh360.github.io`** (the site will be at `https://sparsh360.github.io`).
   Any other name works too; the site is then at `https://sparsh360.github.io/<repo-name>/`.
3. Upload this folder to it (everything except `Lamination/`, `.superpowers/`, `_test/`):
   ```
   git add .
   git commit -m "Sparsh 360 Door Studio"
   git branch -M main
   git remote add origin https://github.com/sparsh360/sparsh360.github.io.git
   git push -u origin main
   ```
4. On GitHub: repository **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**.
5. Wait ~1 minute and open the site.

## Adding a new catalog

1. Open `https://<your-site>/admin.html` on a laptop.
2. **Connect** tab: enter owner, repository, branch `main`, and a fine-grained token with
   *Contents: Read and write* on that one repository (steps are on the page).
3. **Add catalog** tab: choose the PDF, brand and catalog name → *Process PDF*.
4. Check each page: fix codes, remove non-doors, draw boxes around missed doors.
5. *Publish to website*. Live in about a minute.

## Run locally

```
python -m http.server 8000
```
then open http://localhost:8000.

## Security

- No server and no database: customer photos never leave the customer's phone (the preview is drawn in the browser).
- The only secret is the admin's GitHub token. It is a fine-grained token limited to this one repository
  (Contents: read/write), kept only in the admin's browser — for the current tab by default, or on that computer
  if "Remember" is ticked — and sent only to `api.github.com`. Use **Forget token** on shared computers.
  If a token is ever exposed, delete it on GitHub (Settings → Developer settings → Fine-grained tokens) and make a new one.
- Every page has a Content-Security-Policy; the public pages load scripts only from this site.
  The admin page also loads pdf.js (cdnjs) and Tesseract (jsDelivr), pinned with Subresource Integrity hashes.
- The admin page refuses to run inside a frame (clickjacking) and is excluded from search engines.
- Repository: secret scanning + push protection and Dependabot security updates are on; workflow actions are pinned to commit SHAs.

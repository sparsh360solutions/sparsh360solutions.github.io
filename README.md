# Sparsh 360 Door Studio

Customers photograph their wall, tap the 4 corners of the door, and see any lamination design on it —
then send the picture to Sparsh 360 on WhatsApp.

- `index.html` — customer app (phone + laptop)
- `admin.html` — owner page: add new supplier catalogs from PDF, rename/remove designs
- `data/catalog.json` + `doors/` — all designs (1,132 from the first 9 catalogs)
- `js/config.js` — **WhatsApp number goes here**
- `tools/extract_catalogs.py` — one-time script used for the first 9 catalogs

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

"""Build crawlable SEO pages from data/catalog.json.

Generates:
  designs/index.html          all brands and catalogs
  designs/<brand>.html        every design of one brand, grouped by catalog
  sitemap.xml                 pages + door images (image sitemap)
  sitemap.txt                 plain list of page URLs
  llms.txt                    plain-text summary for AI answer engines

Runs locally (python tools/build_seo.py) and in GitHub Actions whenever the catalog changes,
so catalogs published from admin.html get their pages automatically.
"""
import datetime
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://sparsh360solutions.github.io"
PHONE = "+91 70435 88033"
WA = "917043588033"
ASSET_V = "5"

esc = html.escape


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def natural(code):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", code)]


def head(title, desc, path, extra_ld):
    url = f"{SITE}/{path}"
    ld = json.dumps(extra_ld, ensure_ascii=False, indent=1)
    return f"""<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; manifest-src 'self'; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}">
  <link rel="canonical" href="{url}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#3E2F25">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Sparsh 360">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE}/assets/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="../assets/icons/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/icons/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="../assets/icons/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/base.css?v={ASSET_V}">
  <link rel="stylesheet" href="../css/designs.css?v={ASSET_V}">
  <script type="application/ld+json">
{ld}
  </script>
</head>
"""


def topbar():
    return """<body class="designs">
  <header class="topbar">
    <a href="../" class="brand"><img src="../assets/logo-dark.png" alt="Sparsh 360 — Doors | Interiors | Laminates" width="319" height="124"></a>
    <a class="btn btn-gold top-cta" href="../">Try doors on your wall</a>
  </header>
"""


def footer(brands):
    links = " ".join(f'<a href="{slug(b)}.html">{esc(b)} door designs</a>' for b in brands)
    return f"""  <footer class="d-foot">
    <div class="d-wrap">
      <nav aria-label="Brands">{links} <a href="./">All designs</a></nav>
      <p>Sparsh 360&trade; &middot; Doors | Interiors | Laminates &middot; Vadodara, Gujarat &middot; WhatsApp <a href="https://wa.me/{WA}">{PHONE}</a></p>
    </div>
  </footer>
</body>
</html>
"""


def door_figure(d):
    alt = f"{d['code']} – {d['brand']} lamination door design ({d['catalog']})"
    w, h = d.get("w") or 260, d.get("h") or 520
    tw = max(1, round(w * 260 / h))
    return (f'<li><a href="../?design={esc(d["id"])}" title="Try {esc(d["code"])} on your wall">'
            f'<img src="../{esc(d["thumb"])}" alt="{esc(alt)}" width="{tw}" height="260" loading="lazy" decoding="async">'
            f'<span>{esc(d["code"])}</span></a></li>')


def org_ld():
    return {
        "@type": "Store",
        "@id": f"{SITE}/#store",
        "name": "Sparsh 360",
        "description": "Doors, interiors and laminates — lamination door designs from Aastha, Ramdev, Deluxe and Wonder Sign.",
        "url": f"{SITE}/",
        "logo": f"{SITE}/assets/icons/android-chrome-512x512.png",
        "image": f"{SITE}/assets/og-image.jpg",
        "telephone": PHONE,
        "address": {"@type": "PostalAddress", "addressLocality": "Vadodara", "addressRegion": "Gujarat", "addressCountry": "IN"},
        "areaServed": [{"@type": "City", "name": "Vadodara"}, {"@type": "State", "name": "Gujarat"}],
        "sameAs": [f"https://wa.me/{WA}"],
    }


def build():
    data = json.load(open(os.path.join(ROOT, "data", "catalog.json"), encoding="utf-8"))
    doors, cats = data["doors"], data["catalogs"]
    brands = sorted({c["brand"] for c in cats}, key=lambda b: -sum(1 for d in doors if d["brand"] == b))
    out_dir = os.path.join(ROOT, "designs")
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        if f.endswith(".html"):
            os.remove(os.path.join(out_dir, f))

    # ---- brand pages ----
    for b in brands:
        bdoors = [d for d in doors if d["brand"] == b]
        bcats = [c for c in cats if c["brand"] == b]
        path = f"designs/{slug(b)}.html"
        title = f"{b} Lamination Door Designs ({len(bdoors)}) in Vadodara | Sparsh 360"
        desc = (f"Browse {len(bdoors)} {b} lamination door designs with design codes"
                f"{' (e.g. ' + ', '.join(d['code'] for d in bdoors[:3]) + ')' if bdoors else ''}. "
                f"See any design on your own wall and get the price on WhatsApp from Sparsh 360, Vadodara.")
        ld = {"@context": "https://schema.org", "@graph": [
            org_ld(),
            {"@type": "CollectionPage", "name": f"{b} lamination door designs", "url": f"{SITE}/{path}",
             "isPartOf": {"@id": f"{SITE}/#website"}, "about": f"{b} lamination doors",
             "mainEntity": {"@type": "ItemList", "numberOfItems": len(bdoors), "itemListElement": [
                 {"@type": "ListItem", "position": i + 1, "name": f"{d['code']} {b} lamination door",
                  "image": f"{SITE}/{d['img']}", "url": f"{SITE}/?design={d['id']}"}
                 for i, d in enumerate(bdoors[:200])]}},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Sparsh 360", "item": f"{SITE}/"},
                {"@type": "ListItem", "position": 2, "name": "Door designs", "item": f"{SITE}/designs/"},
                {"@type": "ListItem", "position": 3, "name": b, "item": f"{SITE}/{path}"}]},
        ]}
        parts = [head(title, desc, path, ld), topbar(), '  <main class="d-wrap">\n']
        parts.append(f'    <nav class="crumbs" aria-label="Breadcrumb"><a href="../">Home</a> / <a href="./">Door designs</a> / <span>{esc(b)}</span></nav>\n')
        parts.append(f'    <h1>{esc(b)} lamination door designs</h1>\n')
        parts.append(f'    <p class="d-lead">{len(bdoors)} {esc(b)} laminate door designs available at Sparsh 360, Vadodara, '
                     f'across {len(bcats)} catalog{"s" if len(bcats) != 1 else ""}. Tap any design to see it on a photo of your own wall, '
                     f'then send it to us on WhatsApp ({PHONE}) for price, sizes and delivery.</p>\n')
        parts.append('    <nav class="d-chips" aria-label="Brands">' + "".join(
            f'<a href="{slug(x)}.html"{" aria-current=\"page\"" if x == b else ""}>{esc(x)}</a>' for x in brands) + "</nav>\n")
        for c in bcats:
            cd = sorted([d for d in bdoors if d["catalogId"] == c["id"]], key=lambda d: natural(d["code"]))
            if not cd:
                continue
            parts.append(f'    <section id="{esc(c["id"])}"><h2>{esc(c["name"])} <small>{len(cd)} designs</small></h2>\n')
            parts.append('      <ul class="d-grid">' + "".join(door_figure(d) for d in cd) + "</ul>\n    </section>\n")
        parts.append("  </main>\n")
        parts.append(footer(brands))
        open(os.path.join(ROOT, path), "w", encoding="utf-8").write("".join(parts))

    # ---- index ----
    path = "designs/index.html"
    title = f"Lamination Door Designs Catalogue – {len(doors)}+ Designs | Sparsh 360 Vadodara"
    desc = (f"{len(doors)} lamination door designs from {', '.join(brands)}. "
            "Browse by brand and design code, try any door on your own wall, and enquire on WhatsApp.")
    ld = {"@context": "https://schema.org", "@graph": [
        org_ld(),
        {"@type": "CollectionPage", "name": "Lamination door designs", "url": f"{SITE}/{path}",
         "hasPart": [{"@type": "CollectionPage", "name": f"{b} lamination door designs", "url": f"{SITE}/designs/{slug(b)}.html"} for b in brands]},
    ]}
    parts = [head(title, desc, path, ld), topbar(), '  <main class="d-wrap">\n']
    parts.append('    <nav class="crumbs" aria-label="Breadcrumb"><a href="../">Home</a> / <span>Door designs</span></nav>\n')
    parts.append("    <h1>Lamination door designs</h1>\n")
    parts.append(f'    <p class="d-lead">Explore {len(doors)} laminated door designs from {len(brands)} leading brands. '
                 "Every design has a code you can quote to us. Tap any door to try it on your own wall.</p>\n")
    parts.append('    <ul class="brand-tiles">')
    for b in brands:
        bd = [d for d in doors if d["brand"] == b]
        sample = bd[len(bd) // 3] if bd else None
        img = f'<img src="../{esc(sample["thumb"])}" alt="{esc(b)} lamination door design" width="130" height="260" loading="lazy">' if sample else ""
        bc = [c["name"] for c in cats if c["brand"] == b]
        parts.append(f'<li><a href="{slug(b)}.html">{img}<b>{esc(b)}</b><span>{len(bd)} designs · {esc(", ".join(bc))}</span></a></li>')
    parts.append("</ul>\n  </main>\n")
    parts.append(footer(brands))
    open(os.path.join(ROOT, path), "w", encoding="utf-8").write("".join(parts))

    # ---- sitemap ----
    today = datetime.date.today().isoformat()
    urls = [(f"{SITE}/", "1.0", []), (f"{SITE}/designs/", "0.9", [])]
    for b in brands:
        urls.append((f"{SITE}/designs/{slug(b)}.html", "0.8", [d for d in doors if d["brand"] == b]))
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']
    for u, pr, imgs in urls:
        sm.append(f"  <url><loc>{u}</loc><lastmod>{today}</lastmod><priority>{pr}</priority>")
        for d in imgs[:1000]:
            sm.append(f"    <image:image><image:loc>{SITE}/{esc(d['img'])}</image:loc></image:image>")
        sm.append("  </url>")
    sm.append("</urlset>\n")
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(sm))
    # Plain-text sitemap as a simple fallback for search consoles.
    open(os.path.join(ROOT, "sitemap.txt"), "w", encoding="utf-8").write("\n".join(u for u, _, _ in urls) + "\n")

    # ---- llms.txt ----
    lines = [
        "# Sparsh 360 — Doors | Interiors | Laminates",
        "",
        "> Sparsh 360 (Vadodara, Gujarat, India) sells lamination (laminated) doors, interiors and laminates. Its free online Door Studio "
        f"lets customers photograph their wall and preview any of {len(doors)} lamination door designs on it, "
        f"then enquire on WhatsApp ({PHONE}).",
        "",
        "## Key facts",
        f"- Designs: {len(doors)} lamination door designs from " + ", ".join(
            f"{b} ({sum(1 for d in doors if d['brand'] == b)})" for b in brands),
        "- Location: Vadodara, Gujarat, India. Serves customers across Vadodara and Gujarat.",
        "- Each design has a supplier code (e.g. RD-114, WL-DG-1026, DX-3015, A-633) that customers can quote.",
        f"- Contact: WhatsApp / phone {PHONE} — price, sizes, finishes and delivery are shared on WhatsApp.",
        "- The Door Studio is free, works in the phone browser, and needs no app or sign-up.",
        "",
        "## Pages",
        f"- [Door Studio — try doors on your wall]({SITE}/)",
        f"- [All lamination door designs]({SITE}/designs/)",
    ] + [f"- [{b} lamination door designs]({SITE}/designs/{slug(b)}.html)" for b in brands] + [
        "",
        "## How the Door Studio works",
        "1. Take or upload a photo of the wall with the door frame.",
        "2. Drag 4 dots onto the corners of the door; the design is perspective-matched to the photo.",
        "3. Tap any design to see it on the wall, then share the picture on WhatsApp.",
        "",
    ]
    open(os.path.join(ROOT, "llms.txt"), "w", encoding="utf-8").write("\n".join(lines))
    print(f"built {len(brands)} brand pages, {len(doors)} designs")


if __name__ == "__main__":
    build()

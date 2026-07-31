#!/usr/bin/env python3
"""
Monkey Power static-site content generator.

Usage:
    python tools/build.py

Workflow:
1. Put a source image in source-artworks/
2. Add or edit its record in content/artworks.json
3. Run this script
"""

from pathlib import Path
from PIL import Image
from urllib.parse import quote
import json, shutil, html

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "artworks.json"
SOURCE = ROOT / "source-artworks"
ART = ROOT / "assets" / "art"
WORKS = ROOT / "works"

ART.mkdir(parents=True, exist_ok=True)
WORKS.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)

works = json.loads(CONTENT.read_text(encoding="utf-8"))
published = [w for w in works if w.get("status", "published") == "published"]
published.sort(key=lambda w: w.get("order", 999999))

for index, work in enumerate(published, start=1):
    work["order"] = index
    source_name = work.get("source")
    if source_name:
        src = SOURCE / source_name
        if not src.exists():
            raise FileNotFoundError(f"Missing source image: {src}")
        image = Image.open(src).convert("RGB")
        image_name = f'{work["id"]}.webp'
        thumb_name = f'{work["id"]}-thumb.webp'
        tiny_name = f'{work["id"]}-tiny.webp'

        image.save(ART / image_name, "WEBP", quality=86, method=6)
        thumb = image.copy()
        thumb.thumbnail((900, 1200), Image.Resampling.LANCZOS)
        thumb.save(ART / thumb_name, "WEBP", quality=78, method=6)
        tiny = image.copy()
        tiny.thumbnail((32, 32), Image.Resampling.LANCZOS)
        tiny.save(ART / tiny_name, "WEBP", quality=35, method=6)

        work.update({
            "image": f"assets/art/{image_name}",
            "thumb": f"assets/art/{thumb_name}",
            "tiny": f"assets/art/{tiny_name}",
            "width": image.width,
            "height": image.height,
        })

    work["url"] = f'works/{work["id"]}.html'

ROOT.joinpath("gallery.json").write_text(
    json.dumps(published, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

template = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#ffffff">
  <title>{title} — Monkey Power</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="https://example.com/works/{id}.html">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Monkey Power">
  <meta property="og:title" content="{title} — Monkey Power">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="https://example.com/{image}">
  <meta property="og:url" content="https://example.com/works/{id}.html">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title} — Monkey Power">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="https://example.com/{image}">
  <link rel="icon" href="../assets/brand/favicon.png">
  <link rel="stylesheet" href="../styles.css">
  <style>
    .work-page{{min-height:100dvh;padding:28px clamp(18px,4vw,64px) 60px}}
    .work-page-header{{display:flex;align-items:center;justify-content:space-between;margin-bottom:34px}}
    .work-page-header img{{width:min(310px,58vw)}}
    .back-link{{color:#111;text-decoration:none;font-size:14px}}
    .work-layout{{display:grid;grid-template-columns:minmax(0,1fr) minmax(290px,420px);gap:clamp(30px,5vw,80px);align-items:start}}
    .work-image{{width:100%;max-height:78dvh;object-fit:contain;background:#f5f5f5;border-radius:18px}}
    .work-info{{position:sticky;top:30px;padding-top:20px}}
    .work-info h1{{font-size:clamp(38px,5vw,72px);letter-spacing:-.06em;line-height:.95;margin:0 0 16px}}
    .work-info .meta{{margin-bottom:32px}}
    .work-info p{{color:#555;line-height:1.6}}
    .share-x{{display:inline-flex;margin-top:26px;padding:13px 18px;border:1px solid #ddd;border-radius:999px;color:#111;text-decoration:none}}
    @media(max-width:800px){{.work-layout{{display:block}}.work-info{{position:static;padding-top:30px}}}}
  </style>
</head>
<body>
  <main class="work-page">
    <header class="work-page-header">
      <a href="../index.html"><img src="../assets/brand/monkey-power-logo.png" alt="Monkey Power"></a>
      <a class="back-link" href="../index.html#gallery">Back to gallery</a>
    </header>
    <section class="work-layout">
      <img class="work-image" src="../{image}" alt="{alt}" width="{width}" height="{height}">
      <div class="work-info">
        <h1>{title}</h1>
        <p class="meta">{number} • {year}</p>
        <p>{description}</p>
        <a class="share-x" href="https://twitter.com/intent/tweet?text={tweet_text}&url=https://example.com/works/{id}.html">Share on X</a>
      </div>
    </section>
  </main>
</body>
</html>"""

for work in published:
    values = dict(work)
    values["title"] = html.escape(str(work["title"]))
    values["description"] = html.escape(str(work.get("description", "")))
    values["alt"] = html.escape(str(work.get("alt", work["title"])))
    values["tweet_text"] = quote(f'{work["title"]} — Monkey Power')
    WORKS.joinpath(f'{work["id"]}.html').write_text(
        template.format(**values), encoding="utf-8"
    )

urls = ['  <url><loc>https://example.com/</loc></url>']
urls.extend(
    f'  <url><loc>https://example.com/{w["url"]}</loc></url>'
    for w in published
)
ROOT.joinpath("sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + '\n'.join(urls)
    + '\n</urlset>\n',
    encoding="utf-8"
)

print(f"Built {len(published)} published artworks.")

# Monkey Power Release 1.0 — Launch Checklist

## Content
- Add all final artwork files to `source-artworks/`.
- Complete artwork records in `content/artworks.json`.
- Run `python tools/build.py`.
- Check titles, numbering, years, descriptions and image order.

## Identity
- Confirm the approved Monkey Power logo.
- Replace the placeholder contact email.
- Add the official X profile when available.

## Domain
- Replace `https://monkeypower.art` everywhere with the real domain.
- Confirm canonical URLs, Open Graph URLs and sitemap URLs.

## Hosting
- Deploy the complete project folder.
- Enable HTTPS.
- Enable Brotli or gzip compression.
- Keep long cache headers for `/assets/`.

## Testing
- Test desktop, tablet and mobile layouts.
- Test search, arrow keys, swipe/navigation, share and download.
- Validate every artwork page.
- Test X link previews.
- Run Lighthouse after deployment.
- Check the 404 page and offline/PWA behavior.

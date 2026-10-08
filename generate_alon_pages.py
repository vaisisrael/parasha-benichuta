#!/usr/bin/env python3
"""Create shareable Open Graph pages for every newsletter PDF."""
from pathlib import Path
from html import escape
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
FOLDER = ROOT / "alonim"
BASE = "https://www.parasha-week.co.il/alonim/"

def main():
    for pdf in sorted(FOLDER.glob("*.pdf")):
        png = pdf.with_suffix(".png")
        if not png.is_file():
            print(f"Skipping {pdf.name}: cover missing")
            continue
        name = pdf.stem
        url = BASE + quote(name) + ".html"
        image = BASE + quote(png.name)
        document = BASE + quote(pdf.name)
        title = escape(f"עלון פרשת {name} | פרשת השבוע בניחותא", quote=True)
        html = f"""<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="העלון המלא לפרשת {escape(name, quote=True)} לקריאה ולהדפסה">
<meta property="og:type" content="website">
<meta property="og:site_name" content="פרשת השבוע בניחותא">
<meta property="og:locale" content="he_IL">
<meta property="og:title" content="{title}">
<meta property="og:description" content="העלון המלא לקריאה ולהדפסה לקראת שבת">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{image}">
<meta property="og:image:secure_url" content="{image}">
<meta property="og:image:type" content="image/png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:image" content="{image}">
<style>body{{font-family:Arial,sans-serif;max-width:680px;margin:2rem auto;padding:1rem;text-align:center;line-height:1.6}}img{{width:100%;max-width:440px;height:auto}}a.button{{display:inline-block;background:#155e75;color:white;padding:.8rem 1.5rem;border-radius:.5rem;text-decoration:none;margin:1rem}}</style>
</head>
<body>
<h1>{title}</h1>
<p><a href="{document}"><img src="{image}" alt="שער עלון פרשת {escape(name, quote=True)}"></a></p>
<p><a class="button" href="{document}">לקריאת העלון ולהדפסה (PDF)</a></p>
</body></html>
"""
        pdf.with_suffix(".html").write_text(html, encoding="utf-8")
        print(f"Created {pdf.with_suffix('.html').name}")

if __name__ == "__main__":
    main()

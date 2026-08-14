#!/usr/bin/env python3
import csv
import json
import re
from pathlib import Path
from urllib.parse import quote

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / "content" / "posts" / "posts"
OUT = ROOT / "font-size-audit.csv"
SITE = "https://www.parasha-week.co.il/"

EXCLUDED_ANCESTORS = {"h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code", "table"}
TEXT_BLOCKS = {"p", "li", "div"}
SIZE_RE = re.compile(r"(?:^|;)\s*font-size\s*:\s*([^;]+)", re.I)
SPACE_RE = re.compile(r"\s+")


def norm_text(s: str) -> str:
    return SPACE_RE.sub(" ", s or "").strip()


def font_size(tag):
    style = tag.get("style") or ""
    m = SIZE_RE.search(style)
    return m.group(1).strip().lower() if m else None


def has_excluded_ancestor(tag):
    p = tag.parent
    while p is not None:
        if getattr(p, "name", None) in EXCLUDED_ANCESTORS:
            return True
        p = p.parent
    return False


def is_plain_text_block(tag):
    if tag.name not in TEXT_BLOCKS or has_excluded_ancestor(tag):
        return False
    if tag.name == "div" and tag.find(["p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "table"]):
        return False
    return bool(norm_text(tag.get_text(" ", strip=True)))


def collect_explicit_segments(block):
    items = []
    for tag in block.find_all(style=True):
        if has_excluded_ancestor(tag):
            continue
        size = font_size(tag)
        if not size:
            continue
        text = norm_text(tag.get_text(" ", strip=True))
        if not text:
            continue
        items.append((tag, size, text))
    if font_size(block):
        items.append((block, font_size(block), norm_text(block.get_text(" ", strip=True))))
    return items


def main():
    rows = []
    for path in sorted(POSTS_DIR.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue

        section = data.get("section") or ""
        labels = " ".join(data.get("labels") or [])
        if "אסיף" in section or "אסיף" in labels:
            continue

        html = data.get("content_html") or ""
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")

        title = data.get("title") or path.stem
        output_path = data.get("output_path") or f"posts/{path.stem}.html"
        url = SITE + quote(output_path, safe="/:.-_~")

        for block in soup.find_all(TEXT_BLOCKS):
            if not is_plain_text_block(block):
                continue
            block_text = norm_text(block.get_text(" ", strip=True))
            if len(block_text) < 8:
                continue

            segs = collect_explicit_segments(block)
            medium = [(t, s, x) for (t, s, x) in segs if s == "medium"]
            if not medium:
                continue

            for tag, size, text in segs:
                if size == "medium":
                    continue
                if tag is block and len(text) >= len(block_text) * 0.8:
                    continue
                ratio = len(text) / max(len(block_text), 1)
                if ratio > 0.45 or len(text) > 220:
                    continue

                rows.append({
                    "פוסט": title,
                    "מדור": section,
                    "טקסט חשוד": text[:220],
                    "גודל חריג": size,
                    "גודל סביבתי": "medium",
                    "סיבה לסימון": "שינוי גודל מקומי בתוך קטע טקסט רגיל שבו קיים medium",
                    "קישור": url,
                    "קובץ מקור": str(path.relative_to(ROOT)),
                })

    seen = set()
    unique = []
    for r in rows:
        key = (r["קובץ מקור"], r["טקסט חשוד"], r["גודל חריג"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(r)

    fields = ["פוסט", "מדור", "טקסט חשוד", "גודל חריג", "גודל סביבתי", "סיבה לסימון", "קישור", "קובץ מקור"]
    with OUT.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(unique)

    print(f"Audit complete: {len(unique)} candidates -> {OUT}")


if __name__ == "__main__":
    main()

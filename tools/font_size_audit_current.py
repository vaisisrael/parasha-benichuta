#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from urllib.parse import quote

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
POSTS_JSON_DIR = ROOT / "content" / "posts" / "posts"
OUT = ROOT / "font-size-audit-current.csv"
SITE = "https://www.parasha-week.co.il/"

EXCLUDED_ANCESTORS = {"h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code", "table"}
TEXT_BLOCKS = {"p", "li", "div"}
SIZE_RE = re.compile(r"(?:^|;)\s*font-size\s*:\s*([^;]+)", re.I)
SPACE_RE = re.compile(r"\s+")


def norm_text(value: str) -> str:
    return SPACE_RE.sub(" ", value or "").strip()


def font_size(tag):
    style = tag.get("style") or ""
    match = SIZE_RE.search(style)
    return match.group(1).strip().lower() if match else None


def has_excluded_ancestor(tag) -> bool:
    parent = tag.parent
    while parent is not None:
        if getattr(parent, "name", None) in EXCLUDED_ANCESTORS:
            return True
        parent = parent.parent
    return False


def is_plain_text_block(tag) -> bool:
    if tag.name not in TEXT_BLOCKS or has_excluded_ancestor(tag):
        return False
    if tag.name == "div" and tag.find(["p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "table"]):
        return False
    return bool(norm_text(tag.get_text(" ", strip=True)))


def local_context(block_text: str, suspect_text: str, radius: int = 90) -> str:
    idx = block_text.find(suspect_text)
    if idx < 0:
        return block_text[:180]
    start = max(0, idx - radius)
    end = min(len(block_text), idx + len(suspect_text) + radius)
    text = block_text[start:end]
    if start > 0:
        text = "…" + text
    if end < len(block_text):
        text += "…"
    return text


def load_posts_metadata() -> dict[str, dict]:
    metadata: dict[str, dict] = {}
    for path in POSTS_JSON_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if data.get("item_type") != "POST":
            continue
        output_path = data.get("output_path")
        if not output_path:
            continue
        metadata[output_path.replace("\\", "/")] = data
    return metadata


def main() -> None:
    metadata = load_posts_metadata()
    rows: list[dict[str, str]] = []

    for output_path, data in sorted(metadata.items()):
        section = (data.get("section") or "").replace("🔖", "", 1).strip()
        if section == "אסיף":
            continue

        html_path = ROOT / output_path
        if not html_path.exists():
            continue

        source = html_path.read_text(encoding="utf-8")
        soup = BeautifulSoup(source, "html.parser")
        content = soup.select_one(".post-content")
        if content is None:
            continue

        title = data.get("title") or html_path.stem
        url = SITE + quote(output_path, safe="/:.-_~")

        for block in content.find_all(TEXT_BLOCKS):
            if not is_plain_text_block(block):
                continue

            block_text = norm_text(block.get_text(" ", strip=True))
            if len(block_text) < 8:
                continue

            segments = []
            block_size = font_size(block)
            if block_size:
                segments.append((block, block_size, block_text))

            for tag in block.find_all(style=True):
                if has_excluded_ancestor(tag):
                    continue
                size = font_size(tag)
                if not size:
                    continue
                text = norm_text(tag.get_text(" ", strip=True))
                if text:
                    segments.append((tag, size, text))

            if not any(size == "medium" for _, size, _ in segments):
                continue

            for tag, size, text in segments:
                if size == "medium":
                    continue
                if tag is block and len(text) >= len(block_text) * 0.8:
                    continue

                ratio = len(text) / max(len(block_text), 1)
                if ratio > 0.45 or len(text) > 220:
                    continue

                if re.fullmatch(r"[\(\[\{]?\s*\d{1,3}\s*[\)\]\}\.]?", text):
                    continue

                rows.append({
                    "פוסט": title,
                    "מדור": section,
                    "טקסט חשוד": text[:220],
                    "גודל חריג": size,
                    "גודל סביבתי": "medium",
                    "טקסט סמוך": local_context(block_text, text),
                    "סיבה לסימון": "שינוי גודל מקומי בתוך טקסט רגיל; באותו קטע קיים medium",
                    "קישור": url,
                    "קובץ מקור": f"content/posts/posts/{html_path.stem}.json",
                })

    unique = []
    seen = set()
    for row in rows:
        key = (row["קישור"], row["טקסט חשוד"], row["גודל חריג"], row["טקסט סמוך"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)

    fields = [
        "פוסט", "מדור", "טקסט חשוד", "גודל חריג", "גודל סביבתי",
        "טקסט סמוך", "סיבה לסימון", "קישור", "קובץ מקור",
    ]
    with OUT.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(unique)

    print(f"Current audit complete: {len(unique)} candidates -> {OUT}")


if __name__ == "__main__":
    main()

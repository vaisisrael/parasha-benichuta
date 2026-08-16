from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
CONTENT_ROOT = ROOT / "content"
SERIES_NAMES = {"אידנקסה", "כבודינה", "המגדל"}
INDEX_META = '<meta name="robots" content="index, follow">'
NOINDEX_META = '<meta name="robots" content="noindex, follow">'


def is_series_item(data: dict) -> bool:
    explicit = data.get("series")
    if explicit in SERIES_NAMES:
        return True

    title = str(data.get("title", "")).strip()
    item_type = str(data.get("item_type", "")).strip().upper()
    if item_type == "PAGE" and title in SERIES_NAMES:
        return True

    labels = {str(label).strip() for label in data.get("labels", [])}
    for name in SERIES_NAMES:
        if f"🔖{name}" in labels:
            return True

    return False


def series_output_paths() -> list[str]:
    paths: list[str] = []

    for folder in (CONTENT_ROOT / "posts", CONTENT_ROOT / "pages"):
        if not folder.exists():
            continue

        for json_path in folder.rglob("*.json"):
            try:
                data = json.loads(json_path.read_text(encoding="utf-8"))
            except Exception:
                continue

            if not is_series_item(data):
                continue

            output_path = str(data.get("output_path", "")).strip().lstrip("/")
            if output_path:
                paths.append(output_path)

    # The three series landing pages are generated at these canonical paths.
    for name in SERIES_NAMES:
        paths.append(f"p/{name}.html")

    return sorted(set(paths))


def main() -> None:
    changed = 0
    missing = 0

    for rel_path in series_output_paths():
        path = ROOT / rel_path
        if not path.exists():
            missing += 1
            print(f"SKIP missing generated series page: {rel_path}")
            continue

        source = path.read_text(encoding="utf-8")

        if NOINDEX_META in source:
            print(f"KEEP noindex: {rel_path}")
            continue

        if INDEX_META not in source:
            raise RuntimeError(f"robots meta not found in generated series page: {rel_path}")

        source = source.replace(INDEX_META, NOINDEX_META, 1)
        path.write_text(source, encoding="utf-8")
        changed += 1
        print(f"NOINDEX: {rel_path}")

    # Safety check: this script must never remove the home page from Google.
    home = ROOT / "index.html"
    if not home.exists():
        raise RuntimeError("Home page index.html was not generated")

    home_source = home.read_text(encoding="utf-8")
    if NOINDEX_META in home_source:
        raise RuntimeError("Safety check failed: home page contains noindex")

    print(
        f"Series noindex complete: {changed} pages updated; "
        f"{missing} missing generated paths skipped; home page remains indexable"
    )


if __name__ == "__main__":
    main()

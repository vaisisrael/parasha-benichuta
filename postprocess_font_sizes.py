from __future__ import annotations

import html
import re
from pathlib import Path


FIXES: dict[str, list[tuple[str, str, str]]] = {
    "posts/שופטים-חוק-מלכי-ישראל.html": [
        ("large", "medium", "[וכאן, סטה לרגע הפסוק מעצם הציווי,"),
        ("large", "medium", "וְנִבֵּא באופן עגום את העתיד להיות."),
    ],
    "posts/שופטים-מה-אפשר-ללמוד-מהנמלה.html": [
        ("15px", "medium", "'"),
        (
            "large",
            "medium",
            "אַף אַתֶּם, הַתְקִינוּ לָכֶם מִצְווֹת מִן הָעוֹלָם הַזֶּה לָעוֹלָם הַבָּא.",
        ),
    ],
    "posts/שופטים-מילים-שמחברות-וגם-מפרידות.html": [
        ("large", "medium", "בתנועת שמלמעלה למטה."),
        ("large", "medium", "רַעֲפֵי הגגות"),
        (
            "large",
            "medium",
            "כפי הנראה, מקור המילה הוא בשפה הערבית והיא מבטאת ידיעה ואבחנה.",
        ),
    ],
}

TAG_RE = re.compile(
    r"<(?P<tag>[a-zA-Z0-9]+)\b(?P<attrs>[^>]*)>(?P<body>.*?)</(?P=tag)>",
    re.IGNORECASE | re.DOTALL,
)
STYLE_SIZE_RE = re.compile(r"(font-size\s*:\s*)([^;\"']+)", re.IGNORECASE)
TAG_STRIP_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")


def plain_text(value: str) -> str:
    value = TAG_STRIP_RE.sub(" ", value)
    value = html.unescape(value)
    return SPACE_RE.sub(" ", value).strip()


def replace_size_for_target(source: str, old_size: str, new_size: str, target: str) -> tuple[str, int]:
    replacements = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal replacements

        attrs = match.group("attrs")
        body = match.group("body")
        text = plain_text(body)

        if target not in text:
            return match.group(0)

        size_match = STYLE_SIZE_RE.search(attrs)
        if not size_match:
            return match.group(0)

        current_size = size_match.group(2).strip().lower()
        if current_size != old_size.lower():
            return match.group(0)

        new_attrs = (
            attrs[: size_match.start(2)]
            + new_size
            + attrs[size_match.end(2) :]
        )
        replacements += 1
        return f"<{match.group('tag')}{new_attrs}>{body}</{match.group('tag')}>"

    return TAG_RE.sub(repl, source), replacements


def normalize_special_space(source: str) -> tuple[str, int]:
    old = "font-family: Rubik; font-size: 20pt; white-space-collapse: preserve;"
    new = "font-family: Rubik; font-size: medium; white-space-collapse: preserve;"
    count = source.count(old)
    return source.replace(old, new), count


def main() -> None:
    total = 0
    print("Shoftim font-size pilot: starting")

    for rel_path, fixes in FIXES.items():
        path = Path(rel_path)
        if not path.exists():
            print(f"WARNING: missing generated post: {rel_path}")
            continue

        source = path.read_text(encoding="utf-8")
        original = source
        file_total = 0

        for old_size, new_size, target in fixes:
            source, count = replace_size_for_target(
                source,
                old_size,
                new_size,
                target,
            )
            file_total += count
            if count == 0:
                print(f"WARNING: target not changed in {rel_path}: {target[:60]}")

        if rel_path.endswith("שופטים-מילים-שמחברות-וגם-מפרידות.html"):
            source, count = normalize_special_space(source)
            file_total += count

        if source != original:
            path.write_text(source, encoding="utf-8")

        total += file_total
        print(f"{rel_path}: {file_total} size changes")

    print(f"Shoftim font-size pilot: {total} total changes")


if __name__ == "__main__":
    main()

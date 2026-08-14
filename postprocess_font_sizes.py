from __future__ import annotations

import re
from pathlib import Path


# Pilot corrections only. These are intentionally explicit and limited to
# already-reviewed accidental Blogger font-size changes in Parashat Shoftim.
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
        ("large", "medium", "בתנועת "),
        ("large", "medium", "רַעֲפֵי הגגות"),
        (
            "large",
            "medium",
            "כפי הנראה, מקור המילה הוא בשפה הערבית והיא מבטאת ידיעה ואבחנה.",
        ),
    ],
}

# Match a single opening tag whose own style contains the requested font-size,
# and whose text begins with the reviewed marker. This deliberately avoids
# parsing/re-writing the surrounding HTML, so nested Blogger spans remain intact.
def replace_size_before_marker(
    source: str,
    old_size: str,
    new_size: str,
    marker: str,
) -> tuple[str, int]:
    pattern = re.compile(
        r'(<(?:span|b)\b[^>]*\bstyle="[^">]*?font-size\s*:\s*)'
        + re.escape(old_size)
        + r'([^">]*"[^>]*>\s*)'
        + re.escape(marker),
        re.IGNORECASE,
    )

    def repl(match: re.Match[str]) -> str:
        return match.group(1) + new_size + match.group(2) + marker

    return pattern.subn(repl, source, count=1)


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
            raise RuntimeError(f"Missing generated post: {rel_path}")

        source = path.read_text(encoding="utf-8")
        original = source
        file_total = 0

        for old_size, new_size, marker in fixes:
            source, count = replace_size_before_marker(
                source,
                old_size,
                new_size,
                marker,
            )
            if count != 1:
                raise RuntimeError(
                    "Expected exactly one font-size correction, "
                    f"found {count}: {rel_path} | {old_size} -> {new_size} | {marker[:80]}"
                )
            file_total += count

        if rel_path.endswith("שופטים-מילים-שמחברות-וגם-מפרידות.html"):
            source, count = normalize_special_space(source)
            if count != 1:
                raise RuntimeError(
                    "Expected exactly one 20pt stray-space correction, "
                    f"found {count}: {rel_path}"
                )
            file_total += count

        if source == original:
            raise RuntimeError(f"No changes produced for {rel_path}")

        path.write_text(source, encoding="utf-8")
        total += file_total
        print(f"{rel_path}: {file_total} verified size changes")

    expected_total = 8
    if total != expected_total:
        raise RuntimeError(
            f"Expected {expected_total} Shoftim corrections, got {total}"
        )

    print(f"Shoftim font-size pilot: {total} verified total changes")


if __name__ == "__main__":
    main()

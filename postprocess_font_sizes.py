from __future__ import annotations

import html
import json
import re
from pathlib import Path


FIXES_FILE = Path("tools/font_size_large_fixes.json")
TAG_RE = re.compile(r"<\s*(/?)\s*([A-Za-z][\w:-]*)([^>]*)>", re.DOTALL)
FONT_LARGE_RE = re.compile(r"(font-size\s*:\s*)large\b", re.IGNORECASE)
STRIP_TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}


def plain_text(value: str) -> str:
    value = STRIP_TAG_RE.sub(" ", value)
    value = html.unescape(value).replace("\xa0", " ")
    return SPACE_RE.sub(" ", value).strip()


def matching_close(source: str, opening: re.Match[str]) -> tuple[int, int] | None:
    tag_name = opening.group(2).lower()
    if tag_name in VOID_TAGS or opening.group(0).rstrip().endswith("/>"):
        return None

    depth = 1
    for token in TAG_RE.finditer(source, opening.end()):
        if token.group(2).lower() != tag_name:
            continue

        is_closing = bool(token.group(1))
        is_self_closing = token.group(0).rstrip().endswith("/>") or tag_name in VOID_TAGS

        if is_closing:
            depth -= 1
            if depth == 0:
                return token.start(), token.end()
        elif not is_self_closing:
            depth += 1

    return None


def target_matches(candidate: str, target: str) -> bool:
    candidate = plain_text(candidate)
    target = plain_text(target)
    # The audit CSV stores at most 220 characters of the suspect text.
    if len(target) >= 220:
        return candidate.startswith(target)
    return candidate == target


def replace_one_reviewed_large(source: str, target: str) -> tuple[str, int]:
    candidates: list[tuple[int, int, int]] = []

    for opening in TAG_RE.finditer(source):
        if opening.group(1):
            continue
        if not FONT_LARGE_RE.search(opening.group(0)):
            continue

        close = matching_close(source, opening)
        if close is None:
            continue

        close_start, close_end = close
        body = source[opening.end():close_start]
        if target_matches(body, target):
            # Prefer the smallest matching element. Blogger often nests spans;
            # changing the innermost explicit large is the safest visible fix.
            candidates.append((close_end - opening.start(), opening.start(), opening.end()))

    if not candidates:
        return source, 0

    _, start, end = min(candidates)
    opening_html = source[start:end]
    new_opening, count = FONT_LARGE_RE.subn(r"\1medium", opening_html, count=1)
    if count != 1:
        return source, 0

    return source[:start] + new_opening + source[end:], 1


def main() -> None:
    data = json.loads(FIXES_FILE.read_text(encoding="utf-8"))
    posts: dict[str, list[str]] = data["posts"]
    expected = int(data["expected_targets"])

    listed_targets = sum(len(items) for items in posts.values())
    if listed_targets != expected:
        raise RuntimeError(
            f"Fix list is inconsistent: expected_targets={expected}, actual={listed_targets}"
        )

    total = 0
    changed_files = 0
    skipped_targets = 0
    skipped_files = 0

    for rel_path, targets in posts.items():
        path = Path(rel_path)
        if not path.exists():
            skipped_files += 1
            skipped_targets += len(targets)
            print(
                f"SKIP missing post: {rel_path} "
                f"({len(targets)} reviewed targets ignored)"
            )
            continue

        source = path.read_text(encoding="utf-8")
        original = source
        file_changes = 0

        for target in targets:
            source, count = replace_one_reviewed_large(source, target)
            if count != 1:
                raise RuntimeError(
                    "Reviewed large font-size target was not found exactly as expected: "
                    f"{rel_path} | {target[:120]}"
                )
            file_changes += count

        if source != original:
            path.write_text(source, encoding="utf-8")
            changed_files += 1

        total += file_changes
        print(f"{rel_path}: {file_changes} reviewed large font-size fixes")

    if total + skipped_targets != expected:
        raise RuntimeError(
            f"Expected {expected} reviewed rows; applied {total}, skipped {skipped_targets}"
        )

    print(
        f"Reviewed font-size cleanup complete: {total} large -> medium fixes "
        f"across {changed_files} generated posts; "
        f"skipped {skipped_targets} targets in {skipped_files} missing posts"
    )


if __name__ == "__main__":
    main()

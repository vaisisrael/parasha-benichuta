from __future__ import annotations

import argparse
import hashlib
import html
import json
import mimetypes
import re
import shutil
import urllib.request
from collections import Counter
from pathlib import Path
from urllib.parse import unquote, urlparse

CONTENT_ROOT = Path("content")
IMAGE_ROOT = Path("assets/images/content")
REPORT_PATH = Path("content/image-migration-report.json")

BLOGGER_HOST_MARKERS = (
    "blogger.googleusercontent.com",
    "blogspot.com",
    "googleusercontent.com",
)

ATTR_URL_RE = re.compile(
    r"""(?P<prefix>
        \b(?:src|href|data-src|data-original)\s*=\s*
        (?P<quote>["'])
    )
    (?P<url>https?://[^"'<>]+)
    (?P=quote)
    """,
    flags=re.I | re.X,
)

SRCSET_RE = re.compile(
    r"""(?P<prefix>
        \bsrcset\s*=\s*
        (?P<quote>["'])
    )
    (?P<value>[^"']+)
    (?P=quote)
    """,
    flags=re.I | re.X,
)

CSS_URL_RE = re.compile(
    r"""url\(
        (?P<quote>["']?)
        (?P<url>https?://[^)"']+)
        (?P=quote)
    \)""",
    flags=re.I | re.X,
)

SIZE_PATH_RE = re.compile(
    r"/(?:s\d+|w\d+(?:-h\d+)?(?:-[a-z0-9-]+)?)/",
    flags=re.I,
)

SIZE_SUFFIX_RE = re.compile(
    r"=(?:s|w)\d+(?:-h\d+)?(?:-[a-z0-9-]+)?$",
    flags=re.I,
)

IMAGE_EXT_RE = re.compile(
    r"\.(jpg|jpeg|png|webp|gif|svg)(?:$|\?)",
    flags=re.I,
)


def is_blogger_image(url: str) -> bool:
    try:
        parsed = urlparse(html.unescape(url))
    except ValueError:
        return False

    host = (parsed.hostname or "").lower()

    if not any(
        marker in host
        for marker in BLOGGER_HOST_MARKERS
    ):
        return False

    return bool(
        IMAGE_EXT_RE.search(parsed.path)
        or "blogger.googleusercontent.com" in host
        or "blogspot.com" in host
    )


def canonical_key(url: str) -> str:
    parsed = urlparse(html.unescape(url))

    path = unquote(parsed.path)

    path = SIZE_PATH_RE.sub(
        "/__SIZE__/",
        path,
    )

    path = SIZE_SUFFIX_RE.sub(
        "",
        path,
    )

    return (
        (parsed.hostname or "").lower()
        + path
    )


def size_score(url: str) -> int:
    score = 0

    for match in re.finditer(
        r"/(?:s|w)(\d+)(?:-h(\d+))?",
        url,
        flags=re.I,
    ):
        width = int(match.group(1))
        height = int(match.group(2) or width)

        score = max(
            score,
            width * height,
        )

    if "/s0/" in url.lower():
        score += 10**12

    if "=s0" in url.lower():
        score += 10**12

    return score


def extension_from_url(url: str) -> str:
    parsed = urlparse(url)

    match = re.search(
        r"\.(jpg|jpeg|png|webp|gif|svg)$",
        unquote(parsed.path),
        flags=re.I,
    )

    if not match:
        return ".jpg"

    ext = match.group(1).lower()

    if ext == "jpeg":
        return ".jpg"

    return "." + ext


def local_path_for_key(
    key: str,
    preferred_url: str,
) -> Path:
    digest = hashlib.sha256(
        key.encode("utf-8")
    ).hexdigest()[:18]

    return (
        IMAGE_ROOT
        / f"{digest}{extension_from_url(preferred_url)}"
    )


def collect_urls_from_html(
    content_html: str,
) -> list[str]:
    urls: list[str] = []

    for match in ATTR_URL_RE.finditer(content_html):
        url = html.unescape(
            match.group("url")
        )

        if is_blogger_image(url):
            urls.append(url)

    for match in SRCSET_RE.finditer(content_html):
        value = html.unescape(
            match.group("value")
        )

        for part in value.split(","):
            candidate = part.strip().split()[0]

            if (
                candidate
                and is_blogger_image(candidate)
            ):
                urls.append(candidate)

    for match in CSS_URL_RE.finditer(content_html):
        url = html.unescape(
            match.group("url")
        )

        if is_blogger_image(url):
            urls.append(url)

    return urls


def load_content_files() -> list[Path]:
    files = []

    for folder in (
        CONTENT_ROOT / "posts",
        CONTENT_ROOT / "pages",
    ):
        if folder.exists():
            files.extend(
                folder.rglob("*.json")
            )

    return sorted(files)


def build_inventory(
    content_files: list[Path],
) -> tuple[
    dict[str, list[str]],
    dict[str, set[str]],
]:
    variants: dict[str, list[str]] = {}
    files_by_key: dict[str, set[str]] = {}

    for path in content_files:
        data = json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )

        content_html = data.get(
            "content_html",
            "",
        )

        for url in collect_urls_from_html(
            content_html
        ):
            key = canonical_key(url)

            variants.setdefault(
                key,
                [],
            )

            if url not in variants[key]:
                variants[key].append(url)

            files_by_key.setdefault(
                key,
                set(),
            ).add(path.as_posix())

    return variants, files_by_key


def preferred_url(
    urls: list[str],
) -> str:
    return max(
        urls,
        key=size_score,
    )


def download_image(
    urls: list[str],
    destination: Path,
) -> str:
    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    last_error = None

    for url in sorted(
        urls,
        key=size_score,
        reverse=True,
    ):
        try:
            request = urllib.request.Request(
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 "
                        "ParashaBenichutaImageMigration/1.0"
                    )
                },
            )

            with urllib.request.urlopen(
                request,
                timeout=60,
            ) as response:
                data = response.read()

                if not data:
                    raise RuntimeError(
                        "empty response"
                    )

                content_type = (
                    response.headers.get(
                        "Content-Type",
                        "",
                    )
                    .split(";")[0]
                    .strip()
                    .lower()
                )

            if not data:
                raise RuntimeError(
                    "empty image"
                )

            destination.write_bytes(data)

            return content_type

        except Exception as error:
            last_error = error

    raise RuntimeError(
        f"download failed: {last_error}"
    )


def relative_url_for_content(
    content_file: Path,
    local_image: Path,
) -> str:
    # קובצי התוכן אינם דפי HTML.
    # נשמור בהם נתיב אתר קבוע מן השורש.
    return "/" + local_image.as_posix()


def rewrite_srcset_value(
    value: str,
    local_map: dict[str, str],
) -> str:
    parts = []

    for part in value.split(","):
        stripped = part.strip()

        if not stripped:
            continue

        pieces = stripped.split()

        url = html.unescape(
            pieces[0]
        )

        descriptor = (
            " ".join(pieces[1:])
            if len(pieces) > 1
            else ""
        )

        if is_blogger_image(url):
            local = local_map.get(
                canonical_key(url)
            )

            if local:
                url = local

        parts.append(
            (
                f"{url} {descriptor}"
                if descriptor
                else url
            )
        )

    return ", ".join(parts)


def rewrite_html(
    content_html: str,
    local_map: dict[str, str],
) -> str:
    def replace_attr(
        match: re.Match,
    ) -> str:
        url = html.unescape(
            match.group("url")
        )

        if not is_blogger_image(url):
            return match.group(0)

        local = local_map.get(
            canonical_key(url)
        )

        if not local:
            return match.group(0)

        quote = match.group("quote")

        return (
            match.group("prefix")
            + local
            + quote
        )

    result = ATTR_URL_RE.sub(
        replace_attr,
        content_html,
    )

    def replace_srcset(
        match: re.Match,
    ) -> str:
        quote = match.group("quote")

        rewritten = rewrite_srcset_value(
            match.group("value"),
            local_map,
        )

        return (
            match.group("prefix")
            + rewritten
            + quote
        )

    result = SRCSET_RE.sub(
        replace_srcset,
        result,
    )

    def replace_css(
        match: re.Match,
    ) -> str:
        url = html.unescape(
            match.group("url")
        )

        if not is_blogger_image(url):
            return match.group(0)

        local = local_map.get(
            canonical_key(url)
        )

        if not local:
            return match.group(0)

        quote = match.group("quote")

        return (
            "url("
            + quote
            + local
            + quote
            + ")"
        )

    return CSS_URL_RE.sub(
        replace_css,
        result,
    )


def remaining_blogger_urls(
    content_files: list[Path],
) -> list[str]:
    remaining = []

    for path in content_files:
        data = json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )

        remaining.extend(
            collect_urls_from_html(
                data.get(
                    "content_html",
                    "",
                )
            )
        )

    return sorted(set(remaining))


def write_report(
    report: dict,
) -> None:
    REPORT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    REPORT_PATH.write_text(
        json.dumps(
            report,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--apply",
        action="store_true",
    )

    args = parser.parse_args()

    content_files = load_content_files()

    if not content_files:
        print(
            "ERROR: no content JSON files found"
        )
        return 1

    variants, files_by_key = build_inventory(
        content_files
    )

    raw_urls = sorted(
        {
            url
            for urls in variants.values()
            for url in urls
        }
    )

    print(
        f"Content files: {len(content_files)}"
    )

    print(
        f"Unique Blogger image URLs: {len(raw_urls)}"
    )

    print(
        "Canonical image files after "
        f"deduplication: {len(variants)}"
    )

    print(
        "Duplicate/size variants removed: "
        f"{len(raw_urls) - len(variants)}"
    )

    if not args.apply:
        print(
            "\nDRY RUN OK — "
            "no images downloaded and "
            "no content files changed."
        )
        return 0

    if IMAGE_ROOT.exists():
        shutil.rmtree(
            IMAGE_ROOT
        )

    local_map: dict[str, str] = {}
    failures: list[dict] = []
    downloaded = 0

    for index, (
        key,
        urls,
    ) in enumerate(
        sorted(variants.items()),
        start=1,
    ):
        preferred = preferred_url(
            urls
        )

        destination = local_path_for_key(
            key,
            preferred,
        )

        print(
            f"[{index}/{len(variants)}] "
            f"{destination.as_posix()}"
        )

        try:
            content_type = download_image(
                urls,
                destination,
            )

            local_map[key] = (
                "/" + destination.as_posix()
            )

            downloaded += 1

        except Exception as error:
            failures.append(
                {
                    "key": key,
                    "urls": urls,
                    "error": str(error),
                }
            )

    if failures:
        report = {
            "status": "failed",
            "content_files": len(
                content_files
            ),
            "unique_blogger_image_urls": len(
                raw_urls
            ),
            "canonical_images": len(
                variants
            ),
            "downloaded_images": downloaded,
            "failed_images": len(
                failures
            ),
            "failures": failures,
        }

        write_report(report)

        print(
            f"\nERROR: {len(failures)} "
            "images could not be downloaded."
        )

        print(
            "No content JSON files were rewritten."
        )

        return 1

    for path in content_files:
        data = json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )

        old_html = data.get(
            "content_html",
            "",
        )

        new_html = rewrite_html(
            old_html,
            local_map,
        )

        data["content_html"] = new_html

        path.write_text(
            json.dumps(
                data,
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    remaining = remaining_blogger_urls(
        content_files
    )

    report = {
        "status": (
            "ok"
            if not remaining
            else "incomplete"
        ),
        "content_files": len(
            content_files
        ),
        "unique_blogger_image_urls_before": len(
            raw_urls
        ),
        "canonical_images_downloaded": downloaded,
        "duplicate_or_size_variants_removed": (
            len(raw_urls) - len(variants)
        ),
        "failed_images": 0,
        "remaining_blogger_image_urls": len(
            remaining
        ),
        "remaining_urls": remaining,
    }

    write_report(report)

    print()
    print(
        f"Downloaded local images: {downloaded}"
    )

    print(
        "Remaining Blogger image URLs: "
        f"{len(remaining)}"
    )

    if remaining:
        print(
            "ERROR: Blogger image URLs remain."
        )
        return 1

    print(
        "\nIMAGE MIGRATION OK — "
        "all detected Blogger image URLs "
        "now point to local files."
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(
        main()
    )

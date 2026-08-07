from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ATOM_NS = "http://www.w3.org/2005/Atom"
BLOGGER_NS = "http://schemas.google.com/blogger/2018"
NS = {
    "a": ATOM_NS,
    "b": BLOGGER_NS,
}

EXPECTED_POSTS = 946
EXPECTED_PAGES = 5

BOOK_ORDER = [
    "בראשית",
    "שמות",
    "ויקרא",
    "במדבר",
    "דברים",
]

SECTION_LABELS = [
    "🔖תקציר",
    "🔖אסיף",
    "🔖וורט",
    "🔖עברית",
    "🔖סיפור",
    "🔖יצירה",
    "🔖מושג",
    "🔖עיון",
    "🔖ראיון",
    "🔖מדרש",
    "🔖פיצוחים",
    "🔖משל",
    "🔖המחשה",
    "🔖ילדים",
    "🔖הלכה",
    "🔖בינה",
    "🔖המשחקיה",
]

BINA_LABELS = {
    "🔖בינה-א",
    "🔖בינה-ב",
    "🔖בינה-ג",
}

SERIES_BY_LABEL = {
    "📊אידנקסה": "אידנקסה",
    "🤖כבודינה": "כבודינה",
    "🏢המגדל": "המגדל",
    "🔖אידנקסה": "אידנקסה",
    "🔖כבודינה": "כבודינה",
    "🔖המגדל": "המגדל",
}

IMAGE_URL_RE = re.compile(
    r"""(?:src|href|data-src|data-original)\s*=\s*
        ["'](https?://[^"'<>]+)["']""",
    flags=re.I | re.X,
)

TAG_RE = re.compile(r"<[^>]+>")

IMAGE_EXTENSIONS = (
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
)


@dataclass
class ContentItem:
    schema_version: int
    item_type: str
    title: str
    description: str
    published: str
    updated: str
    labels: list[str]
    source_url: str
    output_path: str
    parasha_label: str | None
    parasha_name: str | None
    book: str | None
    section: str | None
    series: str | None
    content_html: str


def text(
    node: ET.Element,
    path: str,
    default: str = "",
) -> str:
    value = node.findtext(
        path,
        default=default,
        namespaces=NS,
    )

    return value or default


def normalize_spaces(value: str) -> str:
    return re.sub(
        r"\s+",
        " ",
        value or "",
    ).strip()


def strip_tags(value: str) -> str:
    return normalize_spaces(
        html.unescape(
            TAG_RE.sub(
                " ",
                value or "",
            )
        )
    )


def safe_slug(value: str) -> str:
    value = unicodedata.normalize(
        "NFKC",
        value or "",
    )

    value = value.strip().lower()

    value = re.sub(
        r"[\s_/]+",
        "-",
        value,
    )

    value = re.sub(
        r"[^\w\-\u0590-\u05ff]+",
        "",
        value,
        flags=re.UNICODE,
    )

    value = re.sub(
        r"-+",
        "-",
        value,
    ).strip("-")

    return value or "item"


def parasha_info(
    labels: list[str],
) -> tuple[
    str | None,
    str | None,
    str | None,
]:
    for label in labels:
        match = re.match(
            r"^([1-5])-\d{2}\s+פרשת\s+(.+)$",
            label.strip(),
        )

        if not match:
            continue

        book_number = int(
            match.group(1)
        )

        parasha_name = (
            match.group(2).strip()
        )

        book = BOOK_ORDER[
            book_number - 1
        ]

        return (
            label,
            parasha_name,
            book,
        )

    return None, None, None


def normalize_section(
    labels: list[str],
) -> str | None:
    if any(
        label in BINA_LABELS
        for label in labels
    ):
        return "🔖בינה"

    for label in labels:
        if label in SECTION_LABELS:
            return label

    return None


def series_name(
    labels: list[str],
    item_type: str,
    title: str,
) -> str | None:
    for label in labels:
        if label in SERIES_BY_LABEL:
            return SERIES_BY_LABEL[label]

    if (
        item_type == "PAGE"
        and title in {
            "אידנקסה",
            "כבודינה",
            "המגדל",
        }
    ):
        return title

    return None


def output_path_from_url(
    source_url: str,
    item_type: str,
    title: str,
) -> str:
    if source_url:
        path = urlparse(
            source_url
        ).path.lstrip("/")

        if (
            path
            and path.endswith(".html")
        ):
            return path

    folder = (
        "p"
        if item_type == "PAGE"
        else "posts"
    )

    return (
        f"{folder}/"
        f"{safe_slug(title)}.html"
    )


def source_url_from_entry(
    entry: ET.Element,
) -> str:
    for link in entry.findall(
        "a:link",
        NS,
    ):
        if (
            link.attrib.get("rel")
            == "alternate"
        ):
            return link.attrib.get(
                "href",
                "",
            )

    return ""


def parse_feed(
    feed_path: Path,
) -> list[ContentItem]:
    root = ET.parse(
        feed_path
    ).getroot()

    items: list[ContentItem] = []

    for entry in root.findall(
        "a:entry",
        NS,
    ):
        item_type = text(
            entry,
            "b:type",
        )

        status = text(
            entry,
            "b:status",
        )

        if (
            item_type
            not in {"POST", "PAGE"}
            or status != "LIVE"
        ):
            continue

        title = text(
            entry,
            "a:title",
            "ללא כותרת",
        ).strip()

        content_html = text(
            entry,
            "a:content",
        )

        description = text(
            entry,
            "b:metaDescription",
        ).strip()

        if not description:
            description = strip_tags(
                content_html
            )[:190]

        published = (
            text(
                entry,
                "a:published",
            )
            or text(
                entry,
                "b:created",
            )
        )

        updated = (
            text(
                entry,
                "a:updated",
            )
            or text(
                entry,
                "b:lastUpdated",
            )
        )

        labels = [
            category.attrib.get(
                "term",
                "",
            ).strip()
            for category
            in entry.findall(
                "a:category",
                NS,
            )
        ]

        labels = [
            label
            for label in labels
            if label
        ]

        source_url = (
            source_url_from_entry(
                entry
            )
        )

        output_path = (
            output_path_from_url(
                source_url,
                item_type,
                title,
            )
        )

        (
            parasha_label,
            parasha_name,
            book,
        ) = parasha_info(labels)

        section = normalize_section(
            labels
        )

        series = series_name(
            labels,
            item_type,
            title,
        )

        items.append(
            ContentItem(
                schema_version=1,
                item_type=item_type,
                title=title,
                description=description,
                published=published,
                updated=updated,
                labels=labels,
                source_url=source_url,
                output_path=output_path,
                parasha_label=(
                    parasha_label
                ),
                parasha_name=(
                    parasha_name
                ),
                book=book,
                section=section,
                series=series,
                content_html=content_html,
            )
        )

    return items


def content_file_path(
    item: ContentItem,
) -> Path:
    output = Path(
        item.output_path
    )

    without_suffix = output.with_suffix(
        ""
    )

    category = (
        "pages"
        if item.item_type == "PAGE"
        else "posts"
    )

    return (
        Path("content")
        / category
        / without_suffix
    ).with_suffix(".json")


def find_image_urls(
    content_html: str,
) -> list[str]:
    result: list[str] = []

    for match in IMAGE_URL_RE.finditer(
        content_html or ""
    ):
        url = html.unescape(
            match.group(1)
        )

        path = urlparse(
            url
        ).path.lower()

        if not path.endswith(
            IMAGE_EXTENSIONS
        ):
            continue

        if url not in result:
            result.append(url)

    return result


def host_name(
    url: str,
) -> str:
    return (
        urlparse(url).hostname
        or ""
    ).lower()


def validate(
    items: list[ContentItem],
) -> dict:
    posts = [
        item
        for item in items
        if item.item_type == "POST"
    ]

    pages = [
        item
        for item in items
        if item.item_type == "PAGE"
    ]

    output_paths = [
        item.output_path
        for item in items
    ]

    content_paths = [
        content_file_path(item).as_posix()
        for item in items
    ]

    duplicate_outputs = [
        path
        for path, count
        in Counter(
            output_paths
        ).items()
        if count > 1
    ]

    duplicate_content_files = [
        path
        for path, count
        in Counter(
            content_paths
        ).items()
        if count > 1
    ]

    series_counts = Counter(
        item.series
        for item in posts
        if item.series
    )

    if len(posts) != EXPECTED_POSTS:
        raise RuntimeError(
            "מספר הפוסטים אינו תקין: "
            f"נמצאו {len(posts)}, "
            f"ציפינו ל־{EXPECTED_POSTS}"
        )

    if len(pages) != EXPECTED_PAGES:
        raise RuntimeError(
            "מספר הדפים אינו תקין: "
            f"נמצאו {len(pages)}, "
            f"ציפינו ל־{EXPECTED_PAGES}"
        )

    if duplicate_outputs:
        raise RuntimeError(
            "נמצאו כתובות פלט כפולות:\n"
            + "\n".join(
                duplicate_outputs
            )
        )

    if duplicate_content_files:
        raise RuntimeError(
            "נמצאו קובצי תוכן כפולים:\n"
            + "\n".join(
                duplicate_content_files
            )
        )

    expected_series = {
        "אידנקסה": 20,
        "כבודינה": 13,
        "המגדל": 10,
    }

    for name, expected in (
        expected_series.items()
    ):
        actual = series_counts.get(
            name,
            0,
        )

        if actual != expected:
            raise RuntimeError(
                f"{name}: נמצאו "
                f"{actual} פרקים במקום "
                f"{expected}"
            )

    return {
        "posts": len(posts),
        "pages": len(pages),
        "series": dict(
            sorted(
                series_counts.items()
            )
        ),
        "duplicate_output_paths": (
            len(duplicate_outputs)
        ),
        "duplicate_content_files": (
            len(
                duplicate_content_files
            )
        ),
    }


def migration_report(
    items: list[ContentItem],
    validation: dict,
) -> dict:
    all_images: list[str] = []

    for item in items:
        all_images.extend(
            find_image_urls(
                item.content_html
            )
        )

    unique_images = sorted(
        set(all_images)
    )

    image_hosts = Counter(
        host_name(url)
        for url in unique_images
    )

    blogger_images = [
        url
        for url in unique_images
        if any(
            marker in host_name(url)
            for marker in (
                "blogger.googleusercontent.com",
                "googleusercontent.com",
                "blogspot.com",
            )
        )
    ]

    return {
        "generated_at": (
            datetime.now().isoformat(
                timespec="seconds"
            )
        ),
        "source_file": (
            "series-feed.atom"
        ),
        "schema_version": 1,
        "validation": validation,
        "content_files": len(items),
        "unique_image_urls": (
            len(unique_images)
        ),
        "blogger_image_urls": (
            len(blogger_images)
        ),
        "image_hosts": dict(
            sorted(
                image_hosts.items()
            )
        ),
        "next_required_step": (
            "העברת התמונות המקומיות "
            "והחלפת כתובות Blogger "
            "לפני העברת קובץ ה-Atom "
            "לארכיב"
        ),
    }


def write_json(
    destination: Path,
    value: dict,
) -> None:
    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    destination.write_text(
        json.dumps(
            value,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def apply_migration(
    root: Path,
    items: list[ContentItem],
    report: dict,
    force: bool,
) -> None:
    content_root = (
        root / "content"
    )

    if content_root.exists():
        if not force:
            raise RuntimeError(
                "התיקייה content כבר קיימת. "
                "כדי לבנות אותה מחדש יש "
                "להריץ עם --force."
            )

        shutil.rmtree(
            content_root
        )

    for item in items:
        relative = content_file_path(
            item
        )

        write_json(
            root / relative,
            asdict(item),
        )

    write_json(
        root
        / "content"
        / "migration-report.json",
        report,
    )

    manifest = {
        "schema_version": 1,
        "posts": [],
        "pages": [],
    }

    for item in items:
        record = {
            "title": item.title,
            "output_path": (
                item.output_path
            ),
            "content_file": (
                content_file_path(
                    item
                ).as_posix()
            ),
        }

        key = (
            "pages"
            if item.item_type == "PAGE"
            else "posts"
        )

        manifest[key].append(
            record
        )

    manifest["posts"].sort(
        key=lambda item: (
            item["output_path"]
        )
    )

    manifest["pages"].sort(
        key=lambda item: (
            item["output_path"]
        )
    )

    write_json(
        root
        / "content"
        / "manifest.json",
        manifest,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "המרת ייצוא Blogger "
            "לקובצי תוכן עצמאיים"
        )
    )

    parser.add_argument(
        "--feed",
        default="series-feed.atom",
        help="נתיב לקובץ ה-Atom",
    )

    parser.add_argument(
        "--apply",
        action="store_true",
        help="כתיבת הקבצים בפועל",
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help=(
            "מחיקת content קיימת "
            "ובנייתה מחדש"
        ),
    )

    args = parser.parse_args()

    root = Path(
        __file__
    ).resolve().parent

    feed_path = (
        root / args.feed
    )

    if not feed_path.exists():
        print(
            "ERROR: קובץ הייצוא "
            f"לא נמצא: {feed_path}"
        )
        return 1

    try:
        items = parse_feed(
            feed_path
        )

        validation = validate(
            items
        )

        report = migration_report(
            items,
            validation,
        )

        print(
            json.dumps(
                report,
                ensure_ascii=False,
                indent=2,
            )
        )

        if not args.apply:
            print(
                "\nDRY RUN OK — "
                "לא נכתב ולא נמחק שום קובץ."
            )
            return 0

        apply_migration(
            root,
            items,
            report,
            force=args.force,
        )

        print(
            "\nההמרה הושלמה בהצלחה."
        )

        print(
            "נוצרו:"
        )

        print(
            "  content/posts/"
        )

        print(
            "  content/pages/"
        )

        print(
            "  content/manifest.json"
        )

        print(
            "  content/migration-report.json"
        )

        return 0

    except Exception as error:
        print(
            f"ERROR: {error}"
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(
        main()
    )

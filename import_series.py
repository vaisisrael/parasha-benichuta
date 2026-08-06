from __future__ import annotations

import argparse
import hashlib
import html
import re
import shutil
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlparse

ATOM_NS = "http://www.w3.org/2005/Atom"
BLOGGER_NS = "http://schemas.google.com/blogger/2018"
NS = {"a": ATOM_NS, "b": BLOGGER_NS}

SERIES = {
    "אידנקסה": {
        "label": "📊אידנקסה",
        "description": "קומדיה על סטארט־אפ, בינה מלאכותית, ארגונים והפער שבין הצהרות להתנהגות.",
        "expected": 20,
    },
    "כבודינה": {
        "label": "🤖כבודינה",
        "description": "קומדיה דיסטופית־משפטית על מערכת חכמה שנכנסת אל אולם המשפט.",
        "expected": 13,
    },
    "המגדל": {
        "label": "🏢המגדל",
        "description": "קומדיית דיירים על בניין גבוה, ועד בית, קבוצות ווטסאפ וחיים משותפים.",
        "expected": 10,
    },
}

BOOK_ORDER = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"]

IMAGE_HOST_MARKERS = (
    "blogger.googleusercontent.com",
    "googleusercontent.com",
    "blogspot.com",
)

ATTR_URL_RE = re.compile(
    r"(?P<attr>\b(?:src|href|data-src|data-original)\s*=\s*)"
    r"(?P<quote>[\"'])(?P<url>https?://[^\"'<>]+)(?P=quote)",
    flags=re.I,
)

IMG_RE = re.compile(r"<img\b[^>]*>", flags=re.I)
TAG_RE = re.compile(r"<[^>]+>")

SIZE_RE = re.compile(
    r"/(?:s\d+|w\d+(?:-h\d+)?(?:-[a-z0-9-]+)?)/",
    flags=re.I,
)

EXT_RE = re.compile(
    r"\.(png|jpe?g|webp|gif)(?:$|\?)",
    flags=re.I,
)


@dataclass
class Entry:
    entry_type: str
    title: str
    content: str
    description: str
    filename: str
    number: int | None
    series_name: str


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


def normalize(value: str) -> str:
    return re.sub(
        r"\s+",
        " ",
        value or "",
    ).strip()


def strip_tags(value: str) -> str:
    return normalize(
        html.unescape(
            TAG_RE.sub(
                " ",
                value or "",
            )
        )
    )


def chapter_number(
    title: str,
) -> int | None:
    match = re.match(
        r"^\s*(\d{1,3})\s*[-–—:]",
        title or "",
    )

    return (
        int(match.group(1))
        if match
        else None
    )


def parse_feed(
    path: Path,
) -> list[Entry]:
    root = ET.parse(path).getroot()
    entries: list[Entry] = []

    label_to_series = {
        definition["label"]: name
        for name, definition
        in SERIES.items()
    }

    for element in root.findall(
        "a:entry",
        NS,
    ):
        entry_type = text(
            element,
            "b:type",
        )

        status = text(
            element,
            "b:status",
        )

        if (
            entry_type not in {
                "POST",
                "PAGE",
            }
            or status != "LIVE"
        ):
            continue

        title = text(
            element,
            "a:title",
            "ללא כותרת",
        ).strip()

        content = text(
            element,
            "a:content",
        )

        description = text(
            element,
            "b:metaDescription",
        ).strip()

        labels = [
            category.attrib
            .get("term", "")
            .strip()
            for category
            in element.findall(
                "a:category",
                NS,
            )
        ]

        series_name = next(
            (
                name
                for label, name
                in label_to_series.items()
                if label in labels
            ),
            None,
        )

        if (
            entry_type == "PAGE"
            and title in SERIES
        ):
            series_name = title

        if not series_name:
            continue

        number = (
            chapter_number(title)
            if entry_type == "POST"
            else None
        )

        if (
            entry_type == "POST"
            and number is None
        ):
            print(
                "WARNING: skipped chapter "
                f'without number: "{title}"'
            )
            continue

        filename = text(
            element,
            "b:filename",
        ).strip().lstrip("/")

        if not filename:
            filename = (
                f"p/{series_name}.html"
                if entry_type == "PAGE"
                else (
                    f"series/"
                    f"{series_name}/"
                    f"{number:02d}.html"
                )
            )

        entries.append(
            Entry(
                entry_type=entry_type,
                title=title,
                content=content,
                description=description,
                filename=filename,
                number=number,
                series_name=series_name,
            )
        )

    return entries


def is_image_url(
    url: str,
) -> bool:
    try:
        parsed = urlparse(
            html.unescape(url)
        )
    except ValueError:
        return False

    host = parsed.hostname or ""

    return (
        any(
            marker in host
            for marker
            in IMAGE_HOST_MARKERS
        )
        and bool(
            EXT_RE.search(
                parsed.path
                + (
                    "?" + parsed.query
                    if parsed.query
                    else ""
                )
            )
        )
    )


def canonical_key(
    url: str,
) -> str:
    parsed = urlparse(
        html.unescape(url)
    )

    path = SIZE_RE.sub(
        "/__SIZE__/",
        parsed.path,
    )

    path = re.sub(
        (
            r"=w\d+"
            r"(?:-h\d+)?"
            r"(?:-[a-z0-9-]+)?$"
        ),
        "",
        path,
        flags=re.I,
    )

    return (
        f"{parsed.netloc.lower()}"
        f"{path}"
    )


def image_score(
    url: str,
) -> int:
    score = 0

    for match in re.finditer(
        (
            r"/(?:s|w)(\d+)"
            r"(?:-h(\d+))?"
        ),
        url,
        flags=re.I,
    ):
        width = int(
            match.group(1)
        )

        height = int(
            match.group(2)
            or width
        )

        score = max(
            score,
            width * height,
        )

    if "/s0/" in url:
        score += 10**12

    return score


def safe_name(
    value: str,
) -> str:
    value = unicodedata.normalize(
        "NFKC",
        value,
    )

    value = re.sub(
        (
            r"[^\w"
            r"\u0590-\u05ff"
            r".-]+"
        ),
        "-",
        value,
        flags=re.UNICODE,
    )

    return (
        re.sub(
            r"-+",
            "-",
            value,
        )
        .strip("-.")
        or "image"
    )


def extension(
    url: str,
) -> str:
    match = re.search(
        r"\.(png|jpe?g|webp|gif)$",
        unquote(
            urlparse(url).path
        ),
        flags=re.I,
    )

    if not match:
        return ".jpg"

    ext = match.group(1).lower()

    return (
        ".jpg"
        if ext in {
            "jpg",
            "jpeg",
        }
        else f".{ext}"
    )


def collect_images(
    entries: list[Entry],
) -> dict[str, list[str]]:
    images: dict[
        str,
        list[str],
    ] = {}

    for entry in entries:
        for match in ATTR_URL_RE.finditer(
            entry.content
        ):
            url = html.unescape(
                match.group("url")
            )

            if not is_image_url(url):
                continue

            key = canonical_key(url)

            images.setdefault(
                key,
                [],
            )

            if url not in images[key]:
                images[key].append(url)

    return images


def build_image_map(
    images: dict[
        str,
        list[str],
    ],
) -> dict[str, str]:
    result: dict[
        str,
        str,
    ] = {}

    for key, urls in images.items():
        preferred = max(
            urls,
            key=image_score,
        )

        digest = hashlib.sha256(
            key.encode("utf-8")
        ).hexdigest()[:14]

        stem = safe_name(
            Path(
                unquote(
                    urlparse(
                        preferred
                    ).path
                )
            ).stem
        )[:60]

        result[key] = (
            "assets/images/series/"
            f"{digest}-{stem}"
            f"{extension(preferred)}"
        )

    return result


def download(
    url: str,
    destination: Path,
) -> None:
    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 "
                "ParashaBenichuta"
                "SeriesImporter/1.0"
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
            "empty image response"
        )

    destination.write_bytes(data)


def download_images(
    root: Path,
    images: dict[
        str,
        list[str],
    ],
    image_map: dict[
        str,
        str,
    ],
) -> None:
    for key, urls in sorted(
        images.items()
    ):
        relative = image_map[key]
        destination = root / relative

        if (
            destination.exists()
            and destination.stat().st_size > 0
        ):
            print(
                f"KEEP     {relative}"
            )
            continue

        last_error: (
            Exception | None
        ) = None

        for candidate in sorted(
            urls,
            key=image_score,
            reverse=True,
        ):
            try:
                print(
                    f"DOWNLOAD {relative}"
                )

                download(
                    candidate,
                    destination,
                )

                last_error = None
                break

            except Exception as error:
                last_error = error

        if last_error is not None:
            raise RuntimeError(
                "Failed to download "
                f"{relative}: "
                f"{last_error}"
            )


def prefix_for(
    output_path: str,
) -> str:
    return "../" * (
        len(
            Path(
                output_path
            ).parts
        )
        - 1
    )


def rewrite_images(
    content: str,
    output_path: str,
    image_map: dict[
        str,
        str,
    ],
) -> str:
    prefix = prefix_for(
        output_path
    )

    def replace(
        match: re.Match[str],
    ) -> str:
        url = html.unescape(
            match.group("url")
        )

        if not is_image_url(url):
            return match.group(0)

        local = image_map.get(
            canonical_key(url)
        )

        if not local:
            return match.group(0)

        return (
            f'{match.group("attr")}'
            f'{match.group("quote")}'
            f'{prefix}{local}'
            f'{match.group("quote")}'
        )

    rewritten = ATTR_URL_RE.sub(
        replace,
        content,
    )

    def clean_img(
        match: re.Match[str],
    ) -> str:
        tag = match.group(0)

        tag = re.sub(
            (
                r"\s(?:width|height|border|"
                r"data-original-width|"
                r"data-original-height)"
                r"=([\"']).*?\1"
            ),
            "",
            tag,
            flags=re.I,
        )

        tag = re.sub(
            r"\sstyle=([\"']).*?\1",
            "",
            tag,
            flags=re.I,
        )

        if "loading=" not in tag.lower():
            tag = (
                tag[:-1]
                + ' loading="lazy">'
            )

        return tag

    return IMG_RE.sub(
        clean_img,
        rewritten,
    )


def first_image(
    content: str,
) -> str | None:
    match = re.search(
        (
            r'<img\b[^>]*'
            r'\bsrc=["\']'
            r'([^"\']+)'
            r'["\']'
        ),
        content,
        flags=re.I,
    )

    return (
        match.group(1)
        if match
        else None
    )


def discover_parashot(
    root: Path,
    prefix: str,
) -> str:
    books_html: list[str] = []

    for book in BOOK_ORDER:
        book_dir = (
            root
            / "parashot"
            / book
        )

        links: list[str] = []

        if book_dir.exists():
            directories = sorted(
                path
                for path
                in book_dir.iterdir()
                if path.is_dir()
            )

            for parasha_dir in directories:
                index_path = (
                    parasha_dir
                    / "index.html"
                )

                name = parasha_dir.name

                if index_path.exists():
                    source = (
                        index_path.read_text(
                            encoding="utf-8",
                            errors="ignore",
                        )
                    )

                    match = re.search(
                        (
                            r"<h1[^>]*>"
                            r"\s*פרשת\s+"
                            r"([^<]+)"
                            r"</h1>"
                        ),
                        source,
                        flags=re.I,
                    )

                    if match:
                        name = (
                            html.unescape(
                                match.group(1)
                            )
                            .strip()
                        )

                links.append(
                    (
                        f'<li><a href="'
                        f'{prefix}parashot/'
                        f'{book}/'
                        f'{parasha_dir.name}/">'
                        f'{html.escape(name)}'
                        f'</a></li>'
                    )
                )

        books_html.append(
            (
                '<li class="has-sub">'
                f'<button type="button">'
                f'{book}'
                f'</button>'
                f'<ul>{"".join(links)}</ul>'
                f'</li>'
            )
        )

    return "".join(
        books_html
    )


def navigation(
    root: Path,
    prefix: str,
) -> str:
    return f"""
<header class="site-header">
  <div class="header-inner">

    <a
      class="brand"
      href="{prefix}"
      aria-label="פרשת השבוע בניחותא — דף הבית"
    >
      <img
        class="brand-logo"
        src="{prefix}assets/images/branding/logo.png"
        alt=""
        width="44"
        height="44"
      >
      <span>פרשת השבוע בניחותא</span>
    </a>

    <button
      class="menu-toggle"
      type="button"
      aria-expanded="false"
      aria-label="פתיחת תפריט"
    >☰</button>

    <nav
      class="main-nav"
      aria-label="ניווט ראשי"
    >
      <ul>

        <li class="has-sub">
          <button type="button">
            כל הפרשות
          </button>
          <ul>
            {discover_parashot(root, prefix)}
          </ul>
        </li>

        <li class="has-sub">
          <button type="button">
            סדרות
          </button>
          <ul>
            <li>
              <a href="{prefix}p/אידנקסה.html">
                אידנקסה
              </a>
            </li>
            <li>
              <a href="{prefix}p/כבודינה.html">
                כבודינה
              </a>
            </li>
            <li>
              <a href="{prefix}p/המגדל.html">
                המגדל
              </a>
            </li>
          </ul>
        </li>

        <li>
          <a href="{prefix}search/">
            חיפוש
          </a>
        </li>

        <li>
          <a href="{prefix}about/">
            אודות
          </a>
        </li>

      </ul>
    </nav>
  </div>
</header>
"""


def layout(
    root: Path,
    title: str,
    description: str,
    output_path: str,
    body: str,
) -> str:
    prefix = prefix_for(
        output_path
    )

    return f"""<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>
    {html.escape(title)} | פרשת השבוע בניחותא
  </title>

  <meta
    name="description"
    content="{html.escape(description or title, quote=True)}"
  >

  <link
    rel="icon"
    type="image/png"
    sizes="64x64"
    href="{prefix}assets/images/branding/favicon.png"
  >

  <link
    rel="shortcut icon"
    href="{prefix}assets/images/branding/favicon.ico"
  >

  <link
    rel="stylesheet"
    href="{prefix}assets/css/site.css"
  >

  <script
    defer
    src="{prefix}assets/js/site.js"
  ></script>
</head>

<body>

{navigation(root, prefix)}

<main class="site-main">
{body}
</main>

<footer class="site-footer">
  © פרשת השבוע בניחותא
</footer>

</body>
</html>
"""


def chapter_page(
    root: Path,
    entry: Entry,
    content: str,
) -> str:
    prefix = prefix_for(
        entry.filename
    )

    description = (
        entry.description
        or strip_tags(
            entry.content
        )[:180]
    )

    body = f"""
<article class="post-page series-chapter-page">

  <header class="post-header">

    <div class="post-meta">
      <a href="{prefix}p/{entry.series_name}.html">
        {html.escape(entry.series_name)}
      </a>
      · פרק {entry.number:02d}
    </div>

    <h1>
      {html.escape(entry.title)}
    </h1>

  </header>

  <div class="post-content">
    {content}
  </div>

</article>
"""

    return layout(
        root,
        entry.title,
        description,
        entry.filename,
        body,
    )


def series_page(
    root: Path,
    series_name: str,
    page_entry: Entry | None,
    chapters: list[Entry],
    image_map: dict[
        str,
        str,
    ],
) -> tuple[str, str]:
    output_path = (
        f"p/{series_name}.html"
    )

    description = (
        page_entry.description
        if (
            page_entry
            and page_entry.description
        )
        else SERIES[
            series_name
        ]["description"]
    )

    cover = None

    if page_entry:
        cover = first_image(
            rewrite_images(
                page_entry.content,
                output_path,
                image_map,
            )
        )

    if (
        not cover
        and chapters
    ):
        cover = first_image(
            rewrite_images(
                chapters[0].content,
                output_path,
                image_map,
            )
        )

    cover_html = (
        (
            '<img '
            'class="series-cover-image" '
            f'src="{html.escape(cover, quote=True)}" '
            f'alt="{html.escape(series_name)}">'
        )
        if cover
        else ""
    )

    cards: list[str] = []

    for chapter in sorted(
        chapters,
        key=lambda item: (
            item.number or 0
        ),
    ):
        local_content = rewrite_images(
            chapter.content,
            output_path,
            image_map,
        )

        image = first_image(
            local_content
        )

        image_html = (
            (
                f'<img '
                f'src="{html.escape(image, quote=True)}" '
                f'alt="" '
                f'loading="lazy">'
            )
            if image
            else (
                '<div '
                'class="card-placeholder">'
                '📖'
                '</div>'
            )
        )

        chapter_url = (
            f"../{chapter.filename}"
        )

        chapter_description = (
            chapter.description
            or strip_tags(
                chapter.content
            )[:190]
        )

        cards.append(
            f"""
<article class="card series-chapter-card">

  <a
    class="card-media"
    href="{html.escape(chapter_url, quote=True)}"
  >
    {image_html}
  </a>

  <div class="card-body">

    <div class="eyebrow">
      פרק {chapter.number:02d}
    </div>

    <h2>
      <a href="{html.escape(chapter_url, quote=True)}">
        {html.escape(chapter.title)}
      </a>
    </h2>

    <p>
      {html.escape(chapter_description)}
    </p>

    <a
      class="read-link"
      href="{html.escape(chapter_url, quote=True)}"
    >
      לקריאת הפרק
    </a>

  </div>

</article>
"""
        )

    body = f"""
<section class="series-hero">

  <div class="series-hero-media">
    {cover_html}
  </div>

  <div class="series-hero-copy">

    <div class="eyebrow">
      סדרת רשת
    </div>

    <h1>
      {html.escape(series_name)}
    </h1>

    <p>
      {html.escape(description)}
    </p>

    <div class="series-count">
      {len(chapters)} פרקים
    </div>

  </div>

</section>

<section class="series-chapters">

  <h2 class="series-chapters-title">
    פרקי הסדרה
  </h2>

  <div class="cards-grid series-grid">
    {"".join(cards)}
  </div>

</section>
"""

    return (
        output_path,
        layout(
            root,
            series_name,
            description,
            output_path,
            body,
        ),
    )


def backup(
    root: Path,
    relative: str,
    backup_root: Path,
) -> None:
    source = root / relative

    if source.exists():
        destination = (
            backup_root
            / relative
        )

        destination.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        shutil.copy2(
            source,
            destination,
        )


def write(
    root: Path,
    relative: str,
    content: str,
) -> None:
    destination = root / relative

    destination.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    destination.write_text(
        content,
        encoding="utf-8",
    )


def validate(
    entries: list[Entry],
    image_map: dict[
        str,
        str,
    ],
) -> None:
    for (
        series_name,
        definition,
    ) in SERIES.items():
        chapters = [
            entry
            for entry in entries
            if (
                entry.series_name
                == series_name
                and entry.entry_type
                == "POST"
            )
        ]

        expected = definition[
            "expected"
        ]

        numbers = sorted(
            entry.number
            for entry in chapters
            if entry.number
            is not None
        )

        if len(chapters) != expected:
            raise RuntimeError(
                f"{series_name}: "
                f"expected {expected}, "
                f"found {len(chapters)}"
            )

        if numbers != list(
            range(
                1,
                expected + 1,
            )
        ):
            raise RuntimeError(
                f"{series_name}: "
                "incomplete chapter "
                f"sequence: {numbers}"
            )

    if not image_map:
        raise RuntimeError(
            "No images found"
        )


def append_css(
    root: Path,
) -> None:
    css_path = (
        root
        / "assets/css/site.css"
    )

    marker = (
        "/* ===== דפי הסדרות ===== */"
    )

    css = r"""

/* ===== דפי הסדרות ===== */

.series-hero {
  display: grid;
  grid-template-columns:
    minmax(280px, .9fr)
    minmax(0, 1.1fr);
  align-items: center;
  gap: 30px;
  margin-bottom: 30px;
  padding: 28px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow);
}

.series-hero-media {
  overflow: hidden;
  border-radius: 18px;
}

.series-cover-image {
  display: block;
  width: 100%;
  height: auto;
}

.series-hero-copy h1 {
  margin: 0 0 12px;
  font-size: clamp(2.4rem, 5vw, 4rem);
  font-weight: 500;
  line-height: 1.1;
}

.series-hero-copy p {
  margin: 0;
  color: var(--muted);
  font-size: 1.08rem;
}

.series-count {
  margin-top: 16px;
  color: var(--accent);
  font-weight: 600;
}

.series-chapters-title {
  margin: 0 0 18px;
  color: var(--accent);
  font-size: 1.6rem;
  font-weight: 500;
}

.series-grid .card {
  display: flex;
  flex-direction: column;
}

.series-grid .card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.series-grid .read-link {
  margin-top: auto;
  padding-top: 16px;
}

@media (max-width: 700px) {
  .series-hero {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 18px;
  }

  .series-hero-copy h1 {
    font-size: 2.5rem;
  }
}
"""

    if not css_path.exists():
        raise FileNotFoundError(
            f"CSS file not found: {css_path}"
        )

    current = css_path.read_text(
        encoding="utf-8"
    )

    if marker not in current:
        css_path.write_text(
            current.rstrip() + css,
            encoding="utf-8",
        )

        print(
            "UPDATED  assets/css/site.css"
        )

    else:
        print(
            "KEEP     assets/css/site.css"
        )


def main() -> int:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--apply",
        action="store_true",
    )

    parser.add_argument(
        "--feed",
        default="series-feed.atom",
    )

    args = parser.parse_args()

    root = Path(
        __file__
    ).resolve().parent

    feed_path = (
        root
        / args.feed
    )

    if not feed_path.exists():
        print(
            "ERROR: file not found: "
            f"{feed_path}"
        )
        return 1

    entries = parse_feed(
        feed_path
    )

    images = collect_images(
        entries
    )

    image_map = build_image_map(
        images
    )

    validate(
        entries,
        image_map,
    )

    print("Series check:")

    for name in SERIES:
        count = len(
            [
                entry
                for entry in entries
                if (
                    entry.series_name
                    == name
                    and entry.entry_type
                    == "POST"
                )
            ]
        )

        print(
            f"  {name}: "
            f"{count} chapters"
        )

    print(
        "  unique local images: "
        f"{len(image_map)}"
    )

    if not args.apply:
        print(
            "\nDRY RUN OK — "
            "no files changed."
        )
        return 0

    download_images(
        root,
        images,
        image_map,
    )

    backup_root = (
        root
        / "backups"
        / (
            "series-"
            + datetime.now()
            .strftime(
                "%Y%m%d-%H%M%S"
            )
        )
    )

    for series_name in SERIES:
        page_entry = next(
            (
                entry
                for entry in entries
                if (
                    entry.series_name
                    == series_name
                    and entry.entry_type
                    == "PAGE"
                )
            ),
            None,
        )

        chapters = [
            entry
            for entry in entries
            if (
                entry.series_name
                == series_name
                and entry.entry_type
                == "POST"
            )
        ]

        (
            index_path,
            index_html,
        ) = series_page(
            root,
            series_name,
            page_entry,
            chapters,
            image_map,
        )

        backup(
            root,
            index_path,
            backup_root,
        )

        write(
            root,
            index_path,
            index_html,
        )

        print(
            f"WRITE    {index_path}"
        )

        for chapter in sorted(
            chapters,
            key=lambda item: (
                item.number or 0
            ),
        ):
            backup(
                root,
                chapter.filename,
                backup_root,
            )

            local_content = rewrite_images(
                chapter.content,
                chapter.filename,
                image_map,
            )

            write(
                root,
                chapter.filename,
                chapter_page(
                    root,
                    chapter,
                    local_content,
                ),
            )

            print(
                f"WRITE    "
                f"{chapter.filename}"
            )

    append_css(root)

    print(
        "\nBackup: "
        f"{backup_root.relative_to(root)}"
    )

    print(
        "Series import "
        "completed successfully."
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(
        main()
    )

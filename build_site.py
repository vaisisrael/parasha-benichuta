from __future__ import annotations

import html
import json
import re
import shutil
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


SECTION_LABELS = [
    "🔖תקציר", "🔖אסיף", "🔖וורט", "🔖עברית", "🔖סיפור", "🔖יצירה",
    "🔖מושג", "🔖עיון", "🔖ראיון", "🔖מדרש", "🔖פיצוחים", "🔖משל",
    "🔖המחשה", "🔖ילדים", "🔖הלכה", "🔖בינה", "🔖המשחקיה",
]
BINA_LABELS = {"🔖בינה-א", "🔖בינה-ב", "🔖בינה-ג"}

# דפי הסדרות והפרקים שלהן נוצרים באמצעות import_series.py.
# build_site.py אינו מוחק ואינו כותב אותם מחדש.
SERIES_LABELS = {
    "📊אידנקסה",
    "🤖כבודינה",
    "🏢המגדל",
    "🔖אידנקסה",
    "🔖כבודינה",
    "🔖המגדל",
}

BOOK_ORDER = ["בראשית", "שמות", "ויקרא", "במדבר", "דברים"]


@dataclass
class Item:
    item_type: str
    title: str
    content: str
    description: str
    published: datetime
    updated: datetime
    labels: list[str]
    source_url: str
    output_path: str
    parasha_label: str | None
    parasha_name: str | None
    book: str | None
    section: str | None


def parse_dt(value: str) -> datetime:
    if not value:
        return datetime.min

    return datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


def safe_slug(value: str) -> str:
    value = unicodedata.normalize(
        "NFKC",
        value,
    ).strip().lower()

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

        if match:
            book_num = int(
                match.group(1)
            )

            name = (
                match.group(2)
                .strip()
            )

            book = BOOK_ORDER[
                book_num - 1
            ]

            return (
                label,
                name,
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


def is_series_item(
    item: Item,
) -> bool:
    if any(
        label in SERIES_LABELS
        for label in item.labels
    ):
        return True

    return (
        item.item_type == "PAGE"
        and item.title.strip()
        in {
            "אידנקסה",
            "כבודינה",
            "המגדל",
        }
    )


def load_content_items(
    content_root: Path,
) -> list[Item]:
    """
    טוען את קובצי התוכן העצמאיים שנוצרו בהגירה.

    מבנה צפוי:
      content/posts/**/*.json
      content/pages/**/*.json
    """

    content_files = sorted(
        list(
            (content_root / "posts")
            .rglob("*.json")
        )
        + list(
            (content_root / "pages")
            .rglob("*.json")
        )
    )

    if not content_files:
        raise FileNotFoundError(
            "No content JSON files found "
            f"under: {content_root}"
        )

    items: list[Item] = []

    for path in content_files:
        data = json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )

        item_type = str(
            data.get(
                "item_type",
                "",
            )
        ).strip().upper()

        if item_type not in {
            "POST",
            "PAGE",
        }:
            raise ValueError(
                "Unsupported item_type "
                f"in {path}: {item_type!r}"
            )

        title = str(
            data.get(
                "title",
                "ללא כותרת",
            )
        ).strip() or "ללא כותרת"

        content = str(
            data.get(
                "content_html",
                "",
            )
        )

        description = str(
            data.get(
                "description",
                "",
            )
        )

        published = parse_dt(
            str(
                data.get(
                    "published",
                    "",
                )
            )
        )

        updated = parse_dt(
            str(
                data.get(
                    "updated",
                    "",
                )
            )
        )

        raw_labels = data.get(
            "labels",
            [],
        )

        labels = [
            str(label).strip()
            for label in raw_labels
            if str(label).strip()
        ]

        source_url = str(
            data.get(
                "source_url",
                "",
            )
        )

        output_path = str(
            data.get(
                "output_path",
                "",
            )
        ).strip()

        if not output_path:
            prefix = (
                "p"
                if item_type == "PAGE"
                else "posts"
            )

            output_path = (
                f"{prefix}/"
                f"{safe_slug(title)}.html"
            )

        (
            derived_parasha_label,
            derived_parasha_name,
            derived_book,
        ) = parasha_info(labels)

        parasha_label = (
            data.get(
                "parasha_label"
            )
            or derived_parasha_label
        )

        parasha_name = (
            data.get(
                "parasha_name"
            )
            or derived_parasha_name
        )

        book = (
            data.get("book")
            or derived_book
        )

        section = (
            data.get("section")
            or normalize_section(
                labels
            )
        )

        items.append(
            Item(
                item_type=item_type,
                title=title,
                content=content,
                description=description,
                published=published,
                updated=updated,
                labels=labels,
                source_url=source_url,
                output_path=output_path,
                parasha_label=parasha_label,
                parasha_name=parasha_name,
                book=book,
                section=section,
            )
        )

    return sorted(
        items,
        key=lambda item: (
            item.published
        ),
        reverse=True,
    )


def first_image(
    content: str,
) -> str | None:
    match = re.search(
        r'<img[^>]+src=["\']([^"\']+)["\']',
        content,
        flags=re.I,
    )

    return (
        match.group(1)
        if match
        else None
    )


def strip_tags(
    value: str,
) -> str:
    value = re.sub(
        (
            r"<script\b[^<]*"
            r"(?:(?!</script>)<[^<]*)*"
            r"</script>"
        ),
        " ",
        value,
        flags=re.I,
    )

    value = re.sub(
        (
            r"<style\b[^<]*"
            r"(?:(?!</style>)<[^<]*)*"
            r"</style>"
        ),
        " ",
        value,
        flags=re.I,
    )

    value = re.sub(
        r"<[^>]+>",
        " ",
        value,
    )

    return re.sub(
        r"\s+",
        " ",
        html.unescape(value),
    ).strip()


def excerpt(
    item: Item,
    length: int = 190,
) -> str:
    value = (
        item.description.strip()
        or strip_tags(
            item.content
        )
    )

    if len(value) <= length:
        return value

    return (
        value[
            : length - 1
        ].rstrip()
        + "…"
    )


def rel_prefix(
    output_path: str,
) -> str:
    depth = (
        len(
            Path(
                output_path
            ).parts
        )
        - 1
    )

    return "../" * depth


def nav_html(
    prefix: str,
    parashot: dict[
        str,
        list[str],
    ],
) -> str:
    parasha_books = []

    for book in BOOK_ORDER:
        names = parashot.get(
            book,
            [],
        )

        links = "".join(
            (
                f'<li><a href="'
                f'{prefix}parashot/'
                f'{safe_slug(book)}/'
                f'{safe_slug(name)}/">'
                f'{html.escape(name)}'
                f'</a></li>'
            )
            for name in names
        )

        parasha_books.append(
            (
                '<li class="has-sub">'
                f'<button type="button">'
                f'{book}'
                f'</button>'
                f'<ul>{links}</ul>'
                f'</li>'
            )
        )

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
      <span>
        פרשת השבוע בניחותא
      </span>
    </a>

    <button
      class="menu-toggle"
      type="button"
      aria-expanded="false"
      aria-label="פתיחת תפריט"
    >
      ☰
    </button>

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
            {''.join(parasha_books)}
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
    title: str,
    body: str,
    output_path: str,
    parashot: dict[
        str,
        list[str],
    ],
    description: str = "",
) -> str:
    prefix = rel_prefix(
        output_path
    )

    desc = html.escape(
        description or title,
        quote=True,
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
    content="{desc}"
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
    rel="apple-touch-icon"
    href="{prefix}assets/images/branding/logo.png"
  >

  <link
    rel="stylesheet"
    href="{prefix}assets/css/site.css"
  >

  <script
    defer
    src="{prefix}assets/js/site.js"
  ></script>

  <script
    defer
    src="{prefix}assets/js/shabbat-lock.js"
  ></script>

  <script
    defer
    src="{prefix}shorts/shorts.js"
  ></script>

</head>

<body>

{nav_html(prefix, parashot)}

<main class="site-main">
{body}
</main>

<footer class="site-footer">
  © פרשת השבוע בניחותא
</footer>

</body>
</html>
"""


def card(
    item: Item,
    prefix: str = "",
) -> str:
    image = first_image(
        item.content
    )

    image_html = (
        (
            f'<img '
            f'src="{html.escape(image, quote=True)}" '
            f'alt="">'
        )
        if image
        else (
            '<div class="card-placeholder">'
            '📖'
            '</div>'
        )
    )

    section = (
        item.section.removeprefix(
            "🔖"
        )
        if item.section
        else "תוכן"
    )

    return f"""
<article class="card">

  <a
    class="card-media"
    href="{prefix}{item.output_path}"
  >
    {image_html}
  </a>

  <div class="card-body">

    <div class="eyebrow">
      {html.escape(section)}
    </div>

    <h2>
      <a href="{prefix}{item.output_path}">
        {html.escape(item.title)}
      </a>
    </h2>

    <p>
      {html.escape(excerpt(item))}
    </p>

  </div>

</article>
"""


def whatsapp_card() -> str:
    channel_url = (
        "https://whatsapp.com/channel/"
        "0029Vb5xXFK2Jl87sO5f9f28"
    )

    return f"""
<aside class="whatsapp-card">

  <div
    class="whatsapp-card-icon"
    aria-hidden="true"
  >
    💬
  </div>

  <div class="whatsapp-card-content">

    <div class="eyebrow">
      נשארים בניחותא
    </div>

    <h2>
      רוצים לקבל את הפרשה בכל שבוע?
    </h2>

    <p>
      הצטרפו לערוץ הווטסאפ השקט וקבלו קישור
      לתכנים החדשים של פרשת השבוע.
    </p>

  </div>

  <a
    class="whatsapp-card-button"
    href="{channel_url}"
    target="_blank"
    rel="noopener noreferrer"
  >
    הצטרפות לערוץ
  </a>

</aside>
"""


def write_file(
    root: Path,
    relative: str,
    content: str,
) -> None:
    path = (
        root
        / relative
    )

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    path.write_text(
        content,
        encoding="utf-8",
    )


def build(
    items: list[Item],
    out: Path,
    config: dict,
) -> None:
    if out.exists():

        # assets אינה נמחקת ואינה נכתבת מחדש.
        # לכן:
        # site.css
        # site.js
        # הלוגו
        # favicon
        # redirect-map
        # והתמונות
        # נשמרים.

        for name in [
            "parashot",
            "sections",
        ]:
            target = (
                out
                / name
            )

            if target.exists():
                shutil.rmtree(
                    target
                )

        # דפי הסדרות ופרקיהן נשמרים
        # כפי שנוצרו ב-import_series.py.

        for item in items:
            if is_series_item(
                item
            ):
                continue

            target = (
                out
                / item.output_path
            )

            if target.exists():
                target.unlink()

    posts = [
        item
        for item in items
        if item.item_type
        == "POST"
    ]

    pages = [
        item
        for item in items
        if item.item_type
        == "PAGE"
    ]

    parashot: dict[
        str,
        list[str],
    ] = {
        book: []
        for book in BOOK_ORDER
    }

    for item in posts:
        if (
            item.book
            and item.parasha_name
            and item.parasha_name
            not in parashot[
                item.book
            ]
        ):
            parashot[
                item.book
            ].append(
                item.parasha_name
            )

    for book in BOOK_ORDER:
        labels = sorted(
            {
                item.parasha_label
                for item in posts
                if (
                    item.book == book
                    and item.parasha_label
                )
            }
        )

        parashot[
            book
        ] = [
            re.sub(
                (
                    r"^[1-5]-\d{2}"
                    r"\s+פרשת\s+"
                ),
                "",
                label,
            )
            for label in labels
        ]

    # פוסטים ודפים בודדים

    for item in items:

        # הסדרות נוצרות בנפרד.

        if is_series_item(
            item
        ):
            continue

        prefix = rel_prefix(
            item.output_path
        )

        chips = []

        if item.parasha_name:
            chips.append(
                (
                    f'<a href="'
                    f'{prefix}parashot/'
                    f'{safe_slug(item.book or "")}/'
                    f'{safe_slug(item.parasha_name)}/">'
                    f'פרשת '
                    f'{html.escape(item.parasha_name)}'
                    f'</a>'
                )
            )

        if item.section:
            section_name = (
                item.section.removeprefix(
                    "🔖"
                )
            )

            chips.append(
                (
                    f'<span>'
                    f'{html.escape(section_name)}'
                    f'</span>'
                )
            )

        meta = " · ".join(
            chips
        )

        date = (
            item.published.strftime(
                "%d.%m.%Y"
            )
            if (
                item.published
                != datetime.min
            )
            else ""
        )

        body = f"""
<article class="post-page">

  <header class="post-header">

    <div class="post-meta">
      {meta}
    </div>

    <h1>
      {html.escape(item.title)}
    </h1>

    <div class="post-date">
      {date}
    </div>

  </header>

  <div class="post-content">
    {item.content}
  </div>

</article>
"""

        write_file(
            out,
            item.output_path,
            layout(
                item.title,
                body,
                item.output_path,
                parashot,
                item.description,
            ),
        )

    # הפרשה הנוכחית נשארת
    # ידנית בשלב זה.

    current = (
        config.get(
            "current_parasha",
            "",
        )
        .strip()
    )

    current_items = [
        item
        for item in posts
        if (
            item.parasha_name
            == current
        )
    ]

    if (
        not current_items
        and posts
    ):
        current = next(
            (
                item.parasha_name
                for item in posts
                if item.parasha_name
            ),
            "",
        )

        current_items = [
            item
            for item in posts
            if (
                item.parasha_name
                == current
            )
        ]

    home_cards = "".join(
        card(item)
        for item in current_items
    )

    home_body = f"""
<section class="hero">

  <div class="eyebrow">
    הגיליון השבועי
  </div>

  <h1>
    פרשת {html.escape(current)}
  </h1>

  <p>
    כל התכנים של הפרשה הנוכחית במקום אחד
    — בלי גלישה לפרשה הבאה.
  </p>

</section>

<section class="cards-grid">
  {home_cards}
</section>

{whatsapp_card()}
"""

    write_file(
        out,
        "index.html",
        layout(
            f"פרשת {current}",
            home_body,
            "index.html",
            parashot,
        ),
    )

    # דפי פרשות

    for book in BOOK_ORDER:
        for name in parashot[
            book
        ]:
            group = [
                item
                for item in posts
                if (
                    item.book == book
                    and item.parasha_name
                    == name
                )
            ]

            relative = (
                f"parashot/"
                f"{safe_slug(book)}/"
                f"{safe_slug(name)}/"
                f"index.html"
            )

            prefix = rel_prefix(
                relative
            )

            body = (
                '<header class="archive-header">'
                f'<div class="eyebrow">'
                f'{book}'
                f'</div>'
                f'<h1>'
                f'פרשת {html.escape(name)}'
                f'</h1>'
                f'</header>'
                f'<section class="cards-grid">'
                f'{"".join(card(item, prefix) for item in group)}'
                f'</section>'
                f'{whatsapp_card()}'
            )

            write_file(
                out,
                relative,
                layout(
                    f"פרשת {name}",
                    body,
                    relative,
                    parashot,
                ),
            )

    # דפי מדורים אינם נוצרים עוד.
    # שם המדור נשמר בתוך הפוסטים ובכרטיסים,
    # אך אין עוד דפי ארכיון תחת sections/.

    # התיקיות:
    # games
    # family
    # search
    # about
    # אינן נמחקות ואינן נכתבות מחדש.

    report = {
        "generated_at": (
            datetime.now()
            .isoformat(
                timespec="seconds"
            )
        ),
        "posts": len(posts),
        "pages": len(pages),
        "current_parasha": current,
        "parashot": sum(
            len(names)
            for names
            in parashot.values()
        ),
        "sections": {
            section: len(
                [
                    item
                    for item in posts
                    if (
                        item.section
                        == section
                    )
                ]
            )
            for section
            in SECTION_LABELS
        },
    }

    write_file(
        out,
        "build-report.json",
        json.dumps(
            report,
            ensure_ascii=False,
            indent=2,
        ),
    )

    print(
        json.dumps(
            report,
            ensure_ascii=False,
            indent=2,
        )
    )


def load_config(
    path: Path,
) -> dict:
    if not path.exists():
        path.write_text(
            json.dumps(
                {
                    "current_parasha":
                    "ראה"
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    return json.loads(
        path.read_text(
            encoding="utf-8"
        )
    )


def main() -> int:
    script_dir = (
        Path(__file__)
        .resolve()
        .parent
    )

    content_root = (
        script_dir
        / "content"
    )

    output_root = (
        script_dir
    )

    config_path = (
        script_dir
        / "site_config.json"
    )

    try:
        items = load_content_items(
            content_root
        )

    except (
        FileNotFoundError,
        ValueError,
        json.JSONDecodeError,
    ) as error:
        print(
            f"ERROR: {error}"
        )

        return 1

    posts_count = sum(
        1
        for item in items
        if (
            item.item_type
            == "POST"
        )
    )

    pages_count = sum(
        1
        for item in items
        if (
            item.item_type
            == "PAGE"
        )
    )

    print(
        "Building site from "
        "independent content JSON files."
    )

    print(
        f"Content files loaded: "
        f"{len(items)}"
    )

    print(
        f"Posts: {posts_count}"
    )

    print(
        f"Pages: {pages_count}"
    )

    if (
        posts_count != 946
        or pages_count != 5
    ):
        print(
            "ERROR: unexpected content inventory. "
            "Expected 946 posts and 5 pages."
        )

        return 1

    config = load_config(
        config_path
    )

    build(
        items,
        output_root,
        config,
    )

    print(
        "\nSite build completed successfully."
    )

    print(
        "Source: "
        "content/posts + content/pages"
    )

    print(
        f"Open locally: "
        f"{output_root / 'index.html'}"
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(
        main()
    )

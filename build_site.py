from __future__ import annotations

import html
import json
import re
import shutil
import sys
import unicodedata
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ATOM_NS = "http://www.w3.org/2005/Atom"
BLOGGER_NS = "http://schemas.google.com/blogger/2018"
NS = {"a": ATOM_NS, "b": BLOGGER_NS}

SECTION_LABELS = [
    "🔖תקציר", "🔖אסיף", "🔖וורט", "🔖עברית", "🔖סיפור", "🔖יצירה",
    "🔖מושג", "🔖עיון", "🔖ראיון", "🔖מדרש", "🔖פיצוחים", "🔖משל",
    "🔖המחשה", "🔖ילדים", "🔖הלכה", "🔖בינה", "🔖המשחקיה",
]
BINA_LABELS = {"🔖בינה-א", "🔖בינה-ב", "🔖בינה-ג"}
SERIES_LABELS = {"🔖אידנקסה"}

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


def text(node, path: str, default: str = "") -> str:
    value = node.findtext(path, default=default, namespaces=NS)
    return value or default


def parse_dt(value: str) -> datetime:
    if not value:
        return datetime.min
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def safe_slug(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).strip().lower()
    value = re.sub(r"[\s_/]+", "-", value)
    value = re.sub(r"[^\w\-\u0590-\u05ff]+", "", value, flags=re.UNICODE)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "item"


def parasha_info(labels: list[str]) -> tuple[str | None, str | None, str | None]:
    # Expected form: "5-04 פרשת ראה"
    for label in labels:
        m = re.match(r"^([1-5])-\d{2}\s+פרשת\s+(.+)$", label.strip())
        if m:
            book_num = int(m.group(1))
            name = m.group(2).strip()
            book = BOOK_ORDER[book_num - 1]
            return label, name, book
    return None, None, None


def normalize_section(labels: list[str]) -> str | None:
    if any(label in BINA_LABELS for label in labels):
        return "🔖בינה"
    for label in labels:
        if label in SECTION_LABELS:
            return label
    return None


def output_path_from_url(url: str, item_type: str, title: str) -> str:
    if url:
        path = urlparse(url).path.lstrip("/")
        if path and path.endswith(".html"):
            return path
    prefix = "p" if item_type == "PAGE" else "posts"
    return f"{prefix}/{safe_slug(title)}.html"


def parse_feed(feed_path: Path) -> list[Item]:
    root = ET.parse(feed_path).getroot()
    items: list[Item] = []

    for entry in root.findall("a:entry", NS):
        item_type = text(entry, "b:type")
        status = text(entry, "b:status")
        if item_type not in {"POST", "PAGE"} or status != "LIVE":
            continue

        title = text(entry, "a:title", "ללא כותרת").strip()
        content = text(entry, "a:content")
        description = text(entry, "b:metaDescription")
        published = parse_dt(text(entry, "a:published") or text(entry, "b:created"))
        updated = parse_dt(text(entry, "a:updated") or text(entry, "b:lastUpdated"))
        labels = [cat.attrib.get("term", "").strip() for cat in entry.findall("a:category", NS)]
        labels = [x for x in labels if x]

        source_url = ""
        for link in entry.findall("a:link", NS):
            if link.attrib.get("rel") == "alternate":
                source_url = link.attrib.get("href", "")
                break

        parasha_label, parasha_name, book = parasha_info(labels)
        section = normalize_section(labels)
        output_path = output_path_from_url(source_url, item_type, title)

        items.append(Item(
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
        ))

    return sorted(items, key=lambda x: x.published, reverse=True)


def first_image(content: str) -> str | None:
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', content, flags=re.I)
    return m.group(1) if m else None


def strip_tags(value: str) -> str:
    value = re.sub(r"<script\b[^<]*(?:(?!</script>)<[^<]*)*</script>", " ", value, flags=re.I)
    value = re.sub(r"<style\b[^<]*(?:(?!</style>)<[^<]*)*</style>", " ", value, flags=re.I)
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def excerpt(item: Item, length: int = 190) -> str:
    value = item.description.strip() or strip_tags(item.content)
    return value if len(value) <= length else value[: length - 1].rstrip() + "…"


def rel_prefix(output_path: str) -> str:
    depth = len(Path(output_path).parts) - 1
    return "../" * depth


def nav_html(prefix: str, parashot: dict[str, list[str]]) -> str:
    parasha_books = []
    for book in BOOK_ORDER:
        names = parashot.get(book, [])
        links = "".join(
            f'<li><a href="{prefix}parashot/{safe_slug(book)}/{safe_slug(name)}/">{html.escape(name)}</a></li>'
            for name in names
        )
        parasha_books.append(
            f'<li class="has-sub"><button type="button">{book}</button><ul>{links}</ul></li>'
        )

    sections = "".join(
        f'<li><a href="{prefix}sections/{safe_slug(label.removeprefix("🔖"))}/">{html.escape(label.removeprefix("🔖"))}</a></li>'
        for label in SECTION_LABELS
    )

    return f"""
<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="{prefix}">פרשת השבוע בניחותא</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-label="פתיחת תפריט">☰</button>
    <nav class="main-nav" aria-label="ניווט ראשי">
      <ul>
        <li><a href="{prefix}">דף הבית</a></li>
        <li class="has-sub"><button type="button">כל הפרשות</button><ul>{''.join(parasha_books)}</ul></li>
        <li class="has-sub"><button type="button">מדורים</button><ul>{sections}</ul></li>
        <li><a href="{prefix}games/">משחקים</a></li>
        <li><a href="{prefix}series/">סדרות</a></li>
        <li><a href="{prefix}family/">דף המשפחה</a></li>
        <li><a href="{prefix}search/">חיפוש</a></li>
        <li><a href="{prefix}about/">אודות</a></li>
      </ul>
    </nav>
  </div>
</header>
"""


def layout(title: str, body: str, output_path: str, parashot: dict[str, list[str]], description: str = "") -> str:
    prefix = rel_prefix(output_path)
    desc = html.escape(description or title, quote=True)
    return f"""<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)} | פרשת השבוע בניחותא</title>
  <meta name="description" content="{desc}">
  <link rel="stylesheet" href="{prefix}assets/css/site.css">
  <script defer src="{prefix}assets/js/site.js"></script>
</head>
<body>
{nav_html(prefix, parashot)}
<main class="site-main">
{body}
</main>
<footer class="site-footer">© פרשת השבוע בניחותא</footer>
</body>
</html>
"""


def card(item: Item, prefix: str = "") -> str:
    img = first_image(item.content)
    img_html = f'<img src="{html.escape(img, quote=True)}" alt="">' if img else '<div class="card-placeholder">📖</div>'
    section = item.section.removeprefix("🔖") if item.section else "תוכן"
    return f"""
<article class="card">
  <a class="card-media" href="{prefix}{item.output_path}">{img_html}</a>
  <div class="card-body">
    <div class="eyebrow">{html.escape(section)}</div>
    <h2><a href="{prefix}{item.output_path}">{html.escape(item.title)}</a></h2>
    <p>{html.escape(excerpt(item))}</p>
  </div>
</article>
"""


def write_file(root: Path, relative: str, content: str) -> None:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build(items: list[Item], out: Path, config: dict) -> None:
    if out.exists():
        # Remove generated folders only; keep repository metadata and source scripts.
        for name in ["assets", "parashot", "sections", "games", "series", "family", "search", "about"]:
            target = out / name
            if target.exists():
                shutil.rmtree(target)
        for item in items:
            target = out / item.output_path
            if target.exists():
                target.unlink()

    posts = [x for x in items if x.item_type == "POST"]
    pages = [x for x in items if x.item_type == "PAGE"]

    parashot: dict[str, list[str]] = {book: [] for book in BOOK_ORDER}
    for item in posts:
        if item.book and item.parasha_name and item.parasha_name not in parashot[item.book]:
            parashot[item.book].append(item.parasha_name)
    # Preserve Torah order by the numeric label rather than alphabetical order.
    for book in BOOK_ORDER:
        labels = sorted({x.parasha_label for x in posts if x.book == book and x.parasha_label})
        parashot[book] = [re.sub(r"^[1-5]-\d{2}\s+פרשת\s+", "", x) for x in labels]

    # Individual posts/pages.
    for item in items:
        prefix = rel_prefix(item.output_path)
        chips = []
        if item.parasha_name:
            chips.append(f'<a href="{prefix}parashot/{safe_slug(item.book or "")}/{safe_slug(item.parasha_name)}/">פרשת {html.escape(item.parasha_name)}</a>')
        if item.section:
            chips.append(f'<a href="{prefix}sections/{safe_slug(item.section.removeprefix("🔖"))}/">{html.escape(item.section.removeprefix("🔖"))}</a>')
        meta = " · ".join(chips)
        date = item.published.strftime("%d.%m.%Y") if item.published != datetime.min else ""
        body = f"""
<article class="post-page">
  <header class="post-header">
    <div class="post-meta">{meta}</div>
    <h1>{html.escape(item.title)}</h1>
    <div class="post-date">{date}</div>
  </header>
  <div class="post-content">{item.content}</div>
</article>
"""
        write_file(out, item.output_path, layout(item.title, body, item.output_path, parashot, item.description))

    current = config.get("current_parasha", "").strip()
    current_items = [x for x in posts if x.parasha_name == current]
    if not current_items and posts:
        current = next((x.parasha_name for x in posts if x.parasha_name), "")
        current_items = [x for x in posts if x.parasha_name == current]

    home_cards = "".join(card(x) for x in current_items)
    home_body = f"""
<section class="hero">
  <div class="eyebrow">הגיליון השבועי</div>
  <h1>פרשת {html.escape(current)}</h1>
  <p>כל התכנים של הפרשה הנוכחית במקום אחד — בלי גלישה לפרשה הבאה.</p>
</section>
<section class="cards-grid">{home_cards}</section>
"""
    write_file(out, "index.html", layout(f"פרשת {current}", home_body, "index.html", parashot))

    # Parasha archives.
    for book in BOOK_ORDER:
        for name in parashot[book]:
            group = [x for x in posts if x.book == book and x.parasha_name == name]
            rel = f"parashot/{safe_slug(book)}/{safe_slug(name)}/index.html"
            body = f'<header class="archive-header"><div class="eyebrow">{book}</div><h1>פרשת {html.escape(name)}</h1></header><section class="cards-grid">' + "".join(card(x, rel_prefix(rel)) for x in group) + "</section>"
            write_file(out, rel, layout(f"פרשת {name}", body, rel, parashot))

    # Section archives.
    for section in SECTION_LABELS:
        group = [x for x in posts if x.section == section]
        rel = f"sections/{safe_slug(section.removeprefix('🔖'))}/index.html"
        body = f'<header class="archive-header"><div class="eyebrow">מדור</div><h1>{html.escape(section.removeprefix("🔖"))}</h1></header><section class="cards-grid">' + "".join(card(x, rel_prefix(rel)) for x in group) + "</section>"
        write_file(out, rel, layout(section.removeprefix("🔖"), body, rel, parashot))

    # Placeholder destinations, to prevent dead menu links during first preview.
    placeholders = {
        "games/index.html": ("משחקים", "כאן ירוכזו משחקי הפרשות."),
        "series/index.html": ("סדרות", "כאן ירוכזו אידנקסה, כבודינה והמגדל."),
        "family/index.html": ("דף המשפחה", "כאן יופיע דף המשפחה השבועי."),
        "search/index.html": ("חיפוש", "מנגנון החיפוש יתווסף בשלב הבא."),
        "about/index.html": ("אודות", "עמוד האודות יותאם בשלב הבא."),
    }
    for rel, (heading, paragraph) in placeholders.items():
        body = f'<header class="archive-header"><h1>{heading}</h1><p>{paragraph}</p></header>'
        write_file(out, rel, layout(heading, body, rel, parashot))

    css = r"""
:root{--bg:#f7f4ed;--paper:#fff;--ink:#26231f;--muted:#6c665d;--accent:#456246;--line:#ded8cc;--shadow:0 8px 26px rgba(50,42,30,.08)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:Arial,"Noto Sans Hebrew",sans-serif;line-height:1.65}a{color:inherit}.site-header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(8px)}.header-inner{max-width:1240px;margin:auto;padding:0 20px;display:flex;align-items:center;gap:28px;min-height:70px}.brand{text-decoration:none;font-size:1.25rem;font-weight:800;color:var(--accent);white-space:nowrap}.main-nav{margin-inline-start:auto}.main-nav ul{list-style:none;margin:0;padding:0;display:flex;align-items:center}.main-nav a,.main-nav button{display:block;border:0;background:none;text-decoration:none;font:inherit;padding:22px 12px;cursor:pointer}.main-nav>ul>li{position:relative}.main-nav li ul{display:none;position:absolute;right:0;top:100%;min-width:190px;background:#fff;border:1px solid var(--line);box-shadow:var(--shadow);flex-direction:column;align-items:stretch}.main-nav li:hover>ul,.main-nav li:focus-within>ul,.main-nav li.open>ul{display:flex}.main-nav li ul a,.main-nav li ul button{padding:10px 14px;width:100%;text-align:right}.main-nav li ul .has-sub>ul{right:100%;top:-1px}.menu-toggle{display:none;border:1px solid var(--line);background:#fff;border-radius:8px;padding:8px 12px;font-size:1.4rem}.site-main{max-width:1240px;margin:auto;padding:36px 20px 70px}.hero,.archive-header{background:linear-gradient(135deg,#fff,#f0eadc);border:1px solid var(--line);border-radius:22px;padding:42px;margin-bottom:28px}.hero h1,.archive-header h1{font-size:clamp(2rem,5vw,4rem);margin:.1em 0}.eyebrow{color:var(--accent);font-weight:800;font-size:.9rem}.cards-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.card{background:var(--paper);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:var(--shadow)}.card-media{display:block;aspect-ratio:16/9;background:#ece7dc;overflow:hidden}.card-media img{width:100%;height:100%;object-fit:cover}.card-placeholder{height:100%;display:grid;place-items:center;font-size:3rem}.card-body{padding:18px}.card h2{font-size:1.28rem;line-height:1.35;margin:.35em 0}.card h2 a{text-decoration:none}.card p{color:var(--muted);margin-bottom:0}.post-page{max-width:880px;margin:auto;background:#fff;border:1px solid var(--line);border-radius:20px;padding:clamp(22px,5vw,58px);box-shadow:var(--shadow)}.post-header{border-bottom:1px solid var(--line);margin-bottom:30px;padding-bottom:22px}.post-header h1{font-size:clamp(2rem,4.5vw,3.5rem);line-height:1.2;margin:.2em 0}.post-meta a{text-decoration:none;color:var(--accent);font-weight:700}.post-date{color:var(--muted)}.post-content{font-size:1.08rem;overflow-wrap:anywhere}.post-content img{max-width:100%;height:auto}.post-content iframe{max-width:100%}.post-content table{max-width:100%;border-collapse:collapse;display:block;overflow-x:auto}.site-footer{text-align:center;padding:30px;border-top:1px solid var(--line);color:var(--muted);background:#fff}
@media(max-width:900px){.cards-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.menu-toggle{display:block;margin-inline-start:auto}.main-nav{display:none;position:absolute;top:70px;right:0;left:0;background:#fff;border-bottom:1px solid var(--line);max-height:calc(100vh - 70px);overflow:auto}.main-nav.open{display:block}.main-nav ul{display:block}.main-nav a,.main-nav button{padding:13px 20px;width:100%;text-align:right}.main-nav li ul,.main-nav li ul .has-sub>ul{position:static;box-shadow:none;border:0;border-top:1px solid var(--line);padding-right:18px}.main-nav li:hover>ul{display:none}.main-nav li.open>ul{display:block}}
@media(max-width:620px){.cards-grid{grid-template-columns:1fr}.hero,.archive-header{padding:28px 22px}.site-main{padding-inline:14px}.post-page{border-radius:14px;padding:22px 18px}}
"""
    js = r"""
document.addEventListener('DOMContentLoaded',()=>{const toggle=document.querySelector('.menu-toggle');const nav=document.querySelector('.main-nav');if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});}document.querySelectorAll('.has-sub>button').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();btn.parentElement.classList.toggle('open');}));});
"""
    write_file(out, "assets/css/site.css", css.strip())
    write_file(out, "assets/js/site.js", js.strip())

    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "posts": len(posts),
        "pages": len(pages),
        "current_parasha": current,
        "parashot": sum(len(v) for v in parashot.values()),
        "sections": {s: len([x for x in posts if x.section == s]) for s in SECTION_LABELS},
    }
    write_file(out, "build-report.json", json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))


def load_config(path: Path) -> dict:
    if not path.exists():
        path.write_text(json.dumps({"current_parasha": "ראה"}, ensure_ascii=False, indent=2), encoding="utf-8")
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    default_feed = Path(r"C:\Users\user\Desktop\source\feed.atom")
    feed_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_feed
    out = script_dir
    config_path = script_dir / "site_config.json"

    if not feed_path.exists():
        print(f"ERROR: feed file not found: {feed_path}")
        print("Run: python build_site.py \"C:\\full\\path\\to\\feed.atom\"")
        return 1

    config = load_config(config_path)
    items = parse_feed(feed_path)
    build(items, out, config)
    print("\nSite build completed successfully.")
    print(f"Open locally: {out / 'index.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

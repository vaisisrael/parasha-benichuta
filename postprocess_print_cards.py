from __future__ import annotations

import html
import re
from pathlib import Path
from urllib.parse import urlencode


ROOT = Path(__file__).resolve().parent
PRINT_VERSION = "19"
DEEPLINK_VERSION = "1"


def print_card(prefix: str, parasha_name: str) -> str:
    regular_query = urlencode(
        {
            "parasha": parasha_name,
            "autoprint": "1",
            "v": PRINT_VERSION,
        }
    )

    compact_query = urlencode(
        {
            "parasha": parasha_name,
            "autoprint": "1",
            "mode": "compact",
            "v": PRINT_VERSION,
        }
    )

    return f"""
<aside class="print-card" data-print-parasha="{html.escape(parasha_name, quote=True)}">

  <style>
    .print-card-actions {{
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }}

    .print-card-actions .print-card-button {{
      min-width: 150px;
    }}

    .print-card-button-compact {{
      background: #ffffff;
      color: var(--accent-dark);
      border: 1px solid rgba(79, 109, 90, 0.38);
    }}

    .print-card-button-compact:hover,
    .print-card-button-compact:focus-visible {{
      background: var(--surface-soft);
      color: var(--accent-dark);
    }}

    @media (max-width: 700px) {{
      .print-card-actions {{
        grid-column: 1 / -1;
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
      }}

      .print-card-actions .print-card-button {{
        grid-column: auto;
        width: 100%;
        min-width: 0;
        padding-inline: 12px;
        white-space: normal;
        text-align: center;
      }}
    }}
  </style>

  <div
    class="print-card-icon"
    aria-hidden="true"
  >
    🖨️
  </div>

  <div class="print-card-content">

    <div class="eyebrow">
      לשולחן שבת
    </div>

    <h2>
      רוצים לקרוא גם בלי מסך?
    </h2>

    <p>
      בחרו הדפסה רגילה או חסכונית — שני עמודים על דף A4 לרוחב
    </p>

  </div>

  <div class="print-card-actions">
    <a
      class="print-card-button print-card-button-regular"
      data-print-mode="regular"
      href="{prefix}print.html?{regular_query}"
    >
      להדפסה רגילה
    </a>

    <a
      class="print-card-button print-card-button-compact"
      data-print-mode="compact"
      href="{prefix}print.html?{compact_query}"
    >
      להדפסה חסכונית
    </a>
  </div>

</aside>
<script>
(() => {{
  const card = document.currentScript.previousElementSibling;
  const regularLink = card?.querySelector('[data-print-mode="regular"]');
  const compactLink = card?.querySelector('[data-print-mode="compact"]');
  if (!card || !regularLink || !compactLink) return;

  const rootUrl = new URL("{prefix}", window.location.href);

  function normalize(value) {{
    return String(value || "").replace(/\\s+/g, " ").trim();
  }}

  function currentParasha() {{
    const active = document.querySelector(".parasha-choice.is-active");
    if (active) {{
      const name = normalize(active.dataset.parasha || active.textContent);
      if (name) return name;
    }}

    const heading = document.querySelector(".hero h1, .archive-header h1, main h1");
    if (!heading) return card.dataset.printParasha || "";

    return normalize(heading.textContent)
      .replace(/^פרש(?:ת|ות)\\s+/, "") || card.dataset.printParasha || "";
  }}

  function buildPrintUrl(name, mode) {{
    const url = new URL("print.html", rootUrl);
    url.searchParams.set("parasha", name);
    url.searchParams.set("autoprint", "1");
    if (mode === "compact") {{
      url.searchParams.set("mode", "compact");
    }}
    url.searchParams.set("v", "{PRINT_VERSION}");
    return url.href;
  }}

  function updatePrintLinks() {{
    const name = currentParasha();
    if (!name) return;

    card.dataset.printParasha = name;
    regularLink.href = buildPrintUrl(name, "regular");
    compactLink.href = buildPrintUrl(name, "compact");
  }}

  const observer = new MutationObserver(updatePrintLinks);
  observer.observe(document.body, {{
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "aria-pressed"]
  }});

  updatePrintLinks();
}})();
</script>
"""


def extract_parasha_name(text: str) -> str | None:
    match = re.search(
        r"<h1[^>]*>\s*פרשת\s+([^<]+?)\s*</h1>",
        text,
        flags=re.I | re.S,
    )

    if not match:
        return None

    return html.unescape(match.group(1)).strip()


def page_prefix(path: Path) -> str:
    relative = path.relative_to(ROOT)
    depth = len(relative.parts) - 1
    return "../" * depth


def replace_existing_print_card(text: str, replacement: str) -> tuple[str, bool]:
    pattern = re.compile(
        r"\s*<aside class=\"print-card\".*?</aside>\s*(?:<script>.*?</script>\s*)?",
        flags=re.I | re.S,
    )

    if not pattern.search(text):
        return text, False

    return pattern.sub(
        lambda _match: "\n" + replacement + "\n",
        text,
        count=1,
    ), True


def insert_after_whatsapp(text: str, replacement: str) -> str:
    pattern = re.compile(
        r"(<aside class=\"whatsapp-card\".*?</aside>)",
        flags=re.I | re.S,
    )

    if not pattern.search(text):
        raise ValueError("WhatsApp card not found")

    return pattern.sub(
        lambda match: match.group(1) + "\n" + replacement,
        text,
        count=1,
    )


def ensure_deeplink_script(text: str, prefix: str) -> str:
    marker = "assets/js/site-deeplink.js"
    if marker in text:
        return text

    script = (
        f'<script defer src="{prefix}{marker}?v={DEEPLINK_VERSION}"></script>'
    )

    if "</head>" not in text:
        return text

    return text.replace("</head>", f"  {script}\n</head>", 1)


def process_page(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    parasha_name = extract_parasha_name(text)

    if not parasha_name:
        return False

    prefix = page_prefix(path)
    replacement = print_card(
        prefix,
        parasha_name,
    )

    updated, replaced = replace_existing_print_card(
        text,
        replacement,
    )

    if not replaced:
        updated = insert_after_whatsapp(
            updated,
            replacement,
        )

    updated = ensure_deeplink_script(
        updated,
        prefix,
    )

    if updated == text:
        return False

    path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    targets = [ROOT / "index.html"]
    targets.extend(
        sorted((ROOT / "parashot").glob("*/*/index.html"))
    )

    changed = 0

    for path in targets:
        if not path.exists():
            continue

        try:
            if process_page(path):
                changed += 1
        except ValueError as error:
            raise RuntimeError(f"{path}: {error}") from error

    print(f"Print cards updated: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

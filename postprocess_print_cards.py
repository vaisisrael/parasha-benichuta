from __future__ import annotations

import html
import re
from pathlib import Path
from urllib.parse import urlencode


ROOT = Path(__file__).resolve().parent
PRINT_VERSION = "11"


def print_card(prefix: str, parasha_name: str) -> str:
    query = urlencode(
        {
            "parasha": parasha_name,
            "autoprint": "1",
            "v": PRINT_VERSION,
        }
    )

    return f"""
<aside class="print-card" data-print-parasha="{html.escape(parasha_name, quote=True)}">

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
      הדפיסו לפני שבת גרסה נקייה של העלון
    </p>

  </div>

  <a
    class="print-card-button"
    href="{prefix}print.html?{query}"
  >
    הדפסת העלון
  </a>

</aside>
<script>
(() => {{
  const card = document.currentScript.previousElementSibling;
  const link = card?.querySelector(".print-card-button");
  if (!card || !link) return;

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

  function updatePrintLink() {{
    const name = currentParasha();
    if (!name) return;

    card.dataset.printParasha = name;

    const url = new URL("print.html", rootUrl);
    url.searchParams.set("parasha", name);
    url.searchParams.set("autoprint", "1");
    url.searchParams.set("v", "{PRINT_VERSION}");
    link.href = url.href;
  }}

  const observer = new MutationObserver(updatePrintLink);
  observer.observe(document.body, {{
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "aria-pressed"]
  }});

  updatePrintLink();
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


def process_page(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    parasha_name = extract_parasha_name(text)

    if not parasha_name:
        return False

    replacement = print_card(
        page_prefix(path),
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

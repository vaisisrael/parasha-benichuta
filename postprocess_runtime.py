from pathlib import Path
import re

VERSION = "20260814-1"
PRINT_ASSET_VERSION = "17"
ROOT = Path(__file__).resolve().parent

PWA_HEAD = '''
  <meta name="theme-color" content="#4f6d5a">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/assets/images/branding/favicon.png">
  <link rel="stylesheet" href="/assets/css/pwa-install.css">
'''

PWA_SCRIPT = '''
  <script src="/assets/js/pwa-install.js"></script>
'''

ACCESSIBILITY_HEAD = '''
  <link rel="stylesheet" href="/assets/css/accessibility.css">
'''

ACCESSIBILITY_SCRIPT = '''
  <script src="/assets/js/accessibility.js"></script>
'''

SKIP_LINK = '''
<a class="skip-link" href="#main-content">דלגו לתוכן הראשי</a>
'''

FOOTER_HTML = '''<footer class="site-footer">
  © פרשת השבוע בניחותא ·
  <a href="/privacy/">מדיניות פרטיות</a> ·
  <a href="/accessibility/">הצהרת נגישות</a> ·
  <a href="/about/">יצירת קשר</a> ·
  <a href="https://gmara-benichuta.co.il/he/">עוד בניחותא: גמרא למתחילים בניחותא</a>
</footer>'''

TRACKING_SCRIPT = r'''
<script>
(() => {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a.print-card-button");
    if (!link) return;

    const destination = link.href;
    const normalClick =
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey;

    if (!normalClick) {
      if (typeof gtag === "function") {
        gtag("event", "print_parasha_click", {
          transport_type: "beacon"
        });
      }
      return;
    }

    event.preventDefault();

    let continued = false;
    const proceed = () => {
      if (continued) return;
      continued = true;
      window.location.href = destination;
    };

    if (typeof gtag === "function") {
      gtag("event", "print_parasha_click", {
        transport_type: "beacon",
        event_callback: proceed,
        event_timeout: 700
      });

      window.setTimeout(proceed, 800);
    } else {
      proceed();
    }
  }, true);
})();
</script>
'''

PRINT_PAGE_EVENT = '''        if (typeof gtag === "function") {
          gtag("event", "print_parasha_click", {
            transport_type: "beacon"
          });
        }

'''


def version_assets(text: str) -> str:
    replacements = {
        "assets/css/site.css\"": f"assets/css/site.css?v={VERSION}\"",
        "assets/js/site.js\"": f"assets/js/site.js?v={VERSION}\"",
        "shorts/shorts.js\"": f"shorts/shorts.js?v={VERSION}\"",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    return text


def version_print_assets(text: str) -> str:
    print_assets = [
        "assets/css/print.css",
        "assets/css/print-cover-v2.css",
        "assets/css/print-content-fixes.css",
        "assets/css/print-back-cover.css",
        "assets/css/print-compact.css",
        "assets/js/print-content-fixes.js",
        "assets/js/print-cover-v2.js",
        "assets/js/print.js",
        "assets/js/print-back-cover.js",
        "assets/js/print-finalize.js",
        "assets/js/print-compact.js",
    ]

    for asset in print_assets:
        text = text.replace(
            f'{asset}?v=16',
            f'{asset}?v={PRINT_ASSET_VERSION}',
        )
        text = text.replace(
            f'{asset}?v=15',
            f'{asset}?v={PRINT_ASSET_VERSION}',
        )

    return text


def add_pwa_assets(text: str) -> str:
    updated = text

    if 'rel="manifest" href="/manifest.webmanifest"' not in updated:
        updated = updated.replace(
            "</head>",
            PWA_HEAD + "\n</head>",
            1,
        )

    if 'src="/assets/js/pwa-install.js"' not in updated:
        updated = updated.replace(
            "</body>",
            PWA_SCRIPT + "\n</body>",
            1,
        )

    return updated


def add_accessibility(text: str) -> str:
    updated = text

    if 'href="/assets/css/accessibility.css"' not in updated:
        updated = updated.replace(
            "</head>",
            ACCESSIBILITY_HEAD + "\n</head>",
            1,
        )

    if 'class="skip-link"' not in updated:
        updated = updated.replace(
            "<body>",
            "<body>\n" + SKIP_LINK,
            1,
        )

    updated = re.sub(
        r'<main\s+class="([^"]*)"',
        r'<main id="main-content" tabindex="-1" class="\1"',
        updated,
        count=1,
    )

    if '<main>' in updated:
        updated = updated.replace(
            '<main>',
            '<main id="main-content" tabindex="-1">',
            1,
        )

    if 'src="/assets/js/accessibility.js"' not in updated:
        updated = updated.replace(
            "</body>",
            ACCESSIBILITY_SCRIPT + "\n</body>",
            1,
        )

    return updated


def replace_footer(text: str) -> str:
    if '<footer class="site-footer">' not in text:
        return text

    return re.sub(
        r'<footer class="site-footer">.*?</footer>',
        FOOTER_HTML,
        text,
        count=1,
        flags=re.S,
    )


def process_html(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    updated = version_assets(text)

    if path.name != "print.html":
        updated = add_pwa_assets(updated)
        updated = add_accessibility(updated)
        updated = replace_footer(updated)

    if path.name == "print.html" and path.parent == ROOT:
        updated = version_print_assets(updated)
        updated = updated.replace(PRINT_PAGE_EVENT, "", 1)

    if path.name == "index.html" and path.parent == ROOT:
        if "print_parasha_click" not in updated:
            updated = updated.replace(
                "</body>",
                TRACKING_SCRIPT + "\n</body>",
                1,
            )

    if updated != text:
        path.write_text(updated, encoding="utf-8")


def main() -> None:
    for path in ROOT.rglob("*.html"):
        if "_site" in path.parts:
            continue
        process_html(path)


if __name__ == "__main__":
    main()

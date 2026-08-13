from pathlib import Path

VERSION = "20260812-2"
ROOT = Path(__file__).resolve().parent

TRACKING_SCRIPT = r'''
<script>
(() => {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a.print-card-button");
    if (!link) return;

    const destination = link.href;
    const printMode = link.dataset.printMode || "regular";
    const normalClick =
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey;

    if (!normalClick) {
      if (typeof gtag === "function") {
        gtag("event", "print_parasha_click", {
          transport_type: "beacon",
          print_mode: printMode
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
        print_mode: printMode,
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
            transport_type: "beacon",
            print_mode: window.__printMode
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


def process_html(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    updated = version_assets(text)

    if path.name == "print.html" and path.parent == ROOT:
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

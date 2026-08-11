(() => {
  "use strict";

  const scriptUrl = document.currentScript?.src || window.location.href;
  const rootUrl = new URL("../../", scriptUrl);

  const fixedSectionImages = {
    "אסיף": {
      path: "assets/images/section-covers/asif.png",
      alt: "מדור אסיף"
    },
    "ילדים": {
      path: "assets/images/section-covers/children.png",
      alt: "מדור הילדים של פרשת השבוע"
    }
  };

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function currentParasha() {
    return normalizeText(new URL(window.location.href).searchParams.get("parasha"));
  }

  function cleanParashaPrefix(value) {
    const text = normalizeText(value);
    const parasha = currentParasha();
    if (!parasha) return text;

    const escaped = parasha.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(
      new RegExp(`^(?:פרשת\\s+)?${escaped}\\s*[:\\-–—]\\s*`, "u"),
      ""
    ).trim() || text;
  }

  function sectionName(section) {
    if (section.dataset.sectionName) return normalizeText(section.dataset.sectionName);
    const kicker = section.querySelector(".print-section-kicker");
    if (!kicker) return "";
    const copy = kicker.cloneNode(true);
    copy.querySelectorAll(".print-section-icon").forEach((el) => el.remove());
    return normalizeText(copy.textContent);
  }

  function replaceFirstImage(section, definition) {
    const content = section.querySelector(".print-post-content");
    const image = content?.querySelector("img");
    if (!content || !image || !definition) return;

    image.src = new URL(definition.path, rootUrl).href;
    image.alt = definition.alt;
    ["srcset", "sizes", "width", "height"].forEach((attr) => image.removeAttribute(attr));
    image.removeAttribute("style");

    image.closest("picture")?.querySelectorAll("source").forEach((source) => source.remove());
  }

  function markCreationImage(section) {
    const image = section.querySelector(".print-post-content img");
    if (!image) return;
    image.classList.add("print-creation-main-image");
    image.removeAttribute("width");
    image.removeAttribute("height");
  }

  function isHeading(element) {
    return /^H[1-6]$/.test(element?.tagName || "");
  }

  function headingLevel(element) {
    return isHeading(element) ? Number(element.tagName.slice(1)) : 7;
  }

  function markLadderCrossword(section) {
    const content = section.querySelector(".print-post-content");
    if (!content || content.querySelector(".print-ladder-crossword")) return;

    const pattern = /תשבץ[\s־-]*מדרג/u;
    const candidates = Array.from(content.querySelectorAll("h1,h2,h3,h4,h5,h6,p,div,strong"));
    const marker = candidates.find((el) => pattern.test(normalizeText(el.textContent)));
    if (!marker) return;

    if (!isHeading(marker)) {
      const block = marker.closest("div,section,table,ul,ol") || marker;
      block.classList.add("print-ladder-crossword");
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "print-ladder-crossword";
    const level = headingLevel(marker);
    marker.parentNode.insertBefore(wrapper, marker);

    let node = marker;
    while (node) {
      const next = node.nextElementSibling;
      wrapper.append(node);
      if (!next) break;
      if (isHeading(next) && headingLevel(next) <= level) break;
      node = next;
    }
  }

  function applySectionFixes(section) {
    if (!(section instanceof Element) || !section.classList.contains("print-section")) return;

    const name = sectionName(section);
    if (!name) return;
    section.dataset.sectionName = name;

    if (fixedSectionImages[name]) replaceFirstImage(section, fixedSectionImages[name]);
    if (name === "יצירה") markCreationImage(section);
    if (name === "פיצוחים") markLadderCrossword(section);
  }

  function applyAllSectionFixes() {
    document.querySelectorAll("#print-content > .print-section").forEach(applySectionFixes);
  }

  function cleanCoverIndex() {
    document.querySelectorAll("#magazine-cover-index .magazine-index-description").forEach((el) => {
      const cleaned = cleanParashaPrefix(el.textContent);
      if (cleaned) el.textContent = cleaned;
    });
  }

  function observeIndex() {
    const index = document.getElementById("magazine-cover-index");
    if (!index || index.dataset.cleanObserver === "1") return;
    index.dataset.cleanObserver = "1";
    const observer = new MutationObserver(cleanCoverIndex);
    observer.observe(index, { childList: true, subtree: true, characterData: true });
    cleanCoverIndex();
  }

  function init() {
    const content = document.getElementById("print-content");
    if (content) {
      new MutationObserver(() => {
        applyAllSectionFixes();
        observeIndex();
      }).observe(content, { childList: true, subtree: true });
    }

    const page = document.getElementById("print-page");
    if (page) {
      new MutationObserver(() => {
        observeIndex();
        cleanCoverIndex();
      }).observe(page, { childList: true, subtree: true });
    }

    applyAllSectionFixes();
    observeIndex();
    cleanCoverIndex();

    window.addEventListener("print-cover-ready", () => {
      applyAllSectionFixes();
      observeIndex();
      cleanCoverIndex();
    });

    window.addEventListener("beforeprint", () => {
      applyAllSectionFixes();
      cleanCoverIndex();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();

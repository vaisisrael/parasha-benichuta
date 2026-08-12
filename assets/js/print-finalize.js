(() => {
  "use strict";

  const FIRST_CONTENT_PAGE = 2;
  const PAGE_HEIGHT_MM = 249;

  function normalizeText(value) {
    return String(value || "")
      .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function currentParasha() {
    const requested = new URL(window.location.href).searchParams.get("parasha");
    if (requested) return normalizeText(requested);

    const title = normalizeText(document.getElementById("print-title")?.textContent);
    return title.replace(/^פרשת\s+/, "").trim();
  }

  function cleanParashaPrefix(value) {
    const text = normalizeText(value);
    const parasha = currentParasha();
    if (!parasha) return text;

    const escaped = parasha.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const cleaned = text.replace(
      new RegExp(`^(?:פרשת\\s+)?${escaped}\\s*[:\\-–—]\\s*`, "u"),
      ""
    ).trim();

    return cleaned || text;
  }

  function sectionName(section) {
    if (section.dataset.sectionName) return normalizeText(section.dataset.sectionName);

    const kicker = section.querySelector(".print-section-kicker");
    if (!kicker) return "";

    const copy = kicker.cloneNode(true);
    copy.querySelectorAll(".print-section-icon").forEach((el) => el.remove());
    return normalizeText(copy.textContent);
  }

  function visibleSections() {
    return Array.from(document.querySelectorAll("#print-content > .print-section"));
  }

  function cleanIndexDescriptions() {
    document.querySelectorAll("#magazine-cover-index .magazine-index-description").forEach((el) => {
      const cleaned = cleanParashaPrefix(el.textContent);
      if (cleaned) el.textContent = cleaned;
    });
  }

  async function waitForImages(root = document) {
    const images = Array.from(root.querySelectorAll("img")).filter((img) => !img.complete);
    if (!images.length) return;

    await Promise.race([
      Promise.all(images.map((img) => new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      }))),
      new Promise((resolve) => setTimeout(resolve, 7000))
    ]);
  }

  function getMeasurer() {
    let measurer = document.getElementById("print-page-measurer");
    if (measurer) return measurer;

    measurer = document.createElement("div");
    measurer.id = "print-page-measurer";
    measurer.setAttribute("aria-hidden", "true");
    document.body.append(measurer);
    return measurer;
  }

  function outerHeight(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.height
      + (parseFloat(style.marginTop) || 0)
      + (parseFloat(style.marginBottom) || 0);
  }

  function pageHeightPx(measurer) {
    const probe = document.createElement("div");
    probe.style.height = `${PAGE_HEIGHT_MM}mm`;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    measurer.append(probe);
    const height = probe.getBoundingClientRect().height || (PAGE_HEIGHT_MM * 96 / 25.4);
    probe.remove();
    return height;
  }

  function isAtomicBlock(element) {
    if (!(element instanceof Element)) return false;
    if (element.matches("img, table, pre, blockquote, ul, ol, figure")) return true;
    if (element.classList.contains("print-ladder-crossword")) return true;
    if (element.querySelector("img, table, pre, .print-ladder-crossword")) return true;
    return false;
  }

  function measurableBlocks(clone) {
    const result = [];
    const kicker = clone.querySelector(":scope > .print-section-kicker");
    const heading = clone.querySelector(":scope > h2");
    const body = clone.querySelector(":scope > .print-post-content");

    if (kicker) result.push(kicker);
    if (heading) result.push(heading);

    if (body) {
      for (const child of Array.from(body.children)) result.push(child);
      if (!body.children.length && normalizeText(body.textContent)) result.push(body);
    }

    return result;
  }

  function measureSectionPages(section) {
    const measurer = getMeasurer();
    measurer.replaceChildren();

    const clone = section.cloneNode(true);
    clone.removeAttribute("id");
    clone.classList.add("print-measure-section");
    measurer.append(clone);

    const pageHeight = pageHeightPx(measurer);
    const blocks = measurableBlocks(clone);
    if (!blocks.length) return 1;

    let pages = 1;
    let used = 0;

    for (const block of blocks) {
      const height = Math.max(0, outerHeight(block));
      if (!height) continue;

      if (isAtomicBlock(block) && height <= pageHeight) {
        if (used > 0 && used + height > pageHeight) {
          pages += 1;
          used = 0;
        }
        used += height;
        continue;
      }

      let remaining = height;
      while (remaining > 0) {
        const room = pageHeight - used;
        if (room <= 1) {
          pages += 1;
          used = 0;
          continue;
        }

        if (remaining <= room) {
          used += remaining;
          remaining = 0;
        } else {
          remaining -= room;
          pages += 1;
          used = 0;
        }
      }
    }

    return Math.max(1, pages);
  }

  function rebuildPageNumbers() {
    const index = document.getElementById("magazine-cover-index");
    if (!index) return;

    const rows = Array.from(index.querySelectorAll(".magazine-index-item"));
    let pageNumber = FIRST_CONTENT_PAGE;

    for (const section of visibleSections()) {
      const name = sectionName(section);
      const row = rows.find((item) => normalizeText(item.dataset.section) === name);

      if (row) {
        const page = row.querySelector(".magazine-index-page");
        if (page) page.textContent = String(pageNumber);
      }

      pageNumber += measureSectionPages(section);
    }

    getMeasurer().replaceChildren();
  }

  function applyFinalPrintState() {
    cleanIndexDescriptions();
    rebuildPageNumbers();
  }

  async function finalize() {
    window.__printFinalizeReady = false;

    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      const contentReady = !document.getElementById("print-status") && visibleSections().length > 0;
      const indexReady = document.querySelectorAll("#magazine-cover-index .magazine-index-item").length > 0;
      if (contentReady && indexReady && window.__printCoverReady === true) break;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    await waitForImages(document.getElementById("print-content") || document);

    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch {}
    }

    applyFinalPrintState();

    window.__printFinalizeReady = true;
    window.dispatchEvent(new CustomEvent("print-finalize-ready"));
  }

  document.addEventListener("DOMContentLoaded", finalize);

  window.addEventListener("print-cover-ready", () => {
    Promise.resolve().then(() => {
      window.addEventListener("beforeprint", applyFinalPrintState);
    });
  }, { once: true });
})();

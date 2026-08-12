(() => {
  "use strict";

  const PAGE_WIDTH_MM = 180;
  const PAGE_HEIGHT_MM = 249;
  const FIRST_CONTENT_PAGE = 2;

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
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

  function measureSectionPages(section) {
    const measurer = getMeasurer();
    measurer.replaceChildren();

    const clone = section.cloneNode(true);
    clone.removeAttribute("id");
    clone.classList.add("print-measure-section");
    measurer.append(clone);

    const pageWidth = measurer.clientWidth;
    if (!pageWidth) return 1;

    // המודד בנוי כעמודות בגודל שטח ההדפסה של A4.
    // כל עמודה היא עמוד מודפס אחד, ולכן scrollWidth משקף את מספר העמודים
    // גם כאשר יש break-inside, יתומים/אלמנות ותמונות שלא נשברות.
    const totalWidth = Math.max(measurer.scrollWidth, pageWidth);
    return Math.max(1, Math.ceil((totalWidth - 1) / pageWidth));
  }

  function rebuildPageNumbers() {
    const index = document.getElementById("magazine-cover-index");
    if (!index) return;

    let pageNumber = FIRST_CONTENT_PAGE;

    for (const section of visibleSections()) {
      const name = sectionName(section);
      const row = name
        ? Array.from(index.querySelectorAll(".magazine-index-item")).find(
            (item) => normalizeText(item.dataset.section) === name
          )
        : null;

      if (row) {
        const page = row.querySelector(".magazine-index-page");
        if (page) page.textContent = String(pageNumber);
      }

      pageNumber += measureSectionPages(section);
    }

    getMeasurer().replaceChildren();
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

    cleanIndexDescriptions();
    rebuildPageNumbers();

    window.__printFinalizeReady = true;
    window.dispatchEvent(new CustomEvent("print-finalize-ready"));
  }

  document.addEventListener("DOMContentLoaded", finalize);

  window.addEventListener("beforeprint", () => {
    // print-cover-v2 רץ קודם ועלול לבנות שוב את התוכן.
    // אנחנו רצים אחריו ומקבעים את הטקסט והמספור לפי העימוד הסופי.
    cleanIndexDescriptions();
    rebuildPageNumbers();
  });
})();

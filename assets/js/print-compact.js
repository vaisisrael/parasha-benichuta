(() => {
  "use strict";

  if (window.__printMode !== "compact") {
    window.__printCompactReady = true;
    return;
  }

  window.__printCompactReady = false;

  const PAGE_WIDTH_MM = 134.4;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitForSourceLayout() {
    const deadline = Date.now() + 32000;

    while (Date.now() < deadline) {
      const cover = document.querySelector("#print-page > .magazine-cover");
      const backCover = document.querySelector("#print-page > .print-back-cover");
      const sections = document.querySelectorAll("#print-content > .print-section");
      const indexRows = document.querySelectorAll(
        "#magazine-cover-index > .magazine-index-item"
      );

      if (
        cover &&
        backCover &&
        sections.length > 0 &&
        indexRows.length > 0 &&
        window.__printCoverReady === true &&
        window.__printBackCoverReady === true &&
        window.__printFinalizeReady === true
      ) {
        return true;
      }

      await sleep(60);
    }

    return false;
  }

  function createPageViewport(className = "") {
    const viewport = document.createElement("div");
    viewport.className = `compact-page-viewport ${className}`.trim();
    return viewport;
  }

  function stripIds(root) {
    if (!root) return;
    root.removeAttribute?.("id");
    root.querySelectorAll?.("[id]").forEach((element) => {
      element.removeAttribute("id");
    });
  }

  function sectionNameFrom(section) {
    if (section?.dataset?.sectionName) {
      return String(section.dataset.sectionName).replace(/🔖/g, "").trim();
    }
    const kicker = section?.querySelector(".print-section-kicker")?.cloneNode(true);
    kicker?.querySelectorAll?.(".print-section-icon")?.forEach((node) => node.remove());
    return String(kicker?.textContent || "").replace(/🔖/g, "").replace(/\s+/g, " ").trim();
  }

  function attachPageNumber(viewport, number) {
    if (!viewport || !Number.isFinite(number)) return viewport;
    viewport.dataset.logicalPage = String(number);
    const marker = document.createElement("div");
    marker.className = "compact-logical-page-number";
    marker.textContent = String(number);
    marker.setAttribute("aria-hidden", "true");
    viewport.append(marker);
    return viewport;
  }

  /*
    השער החסכוני עצמאי, אבל אזור ה-hero נשמר בתוך מעטפת magazine-cover-v2.
    כך כל הטקסט הדינמי שכבר נטען מ-print-cover.json (כותרת משנה, פסוק,
    מקור, badge וסגנונות inline) מקבל בדיוק את אותו CSS של השער הרגיל,
    בלי לשנות כלל את השער האנכי עצמו.
  */
  function createCompactCoverPage(source, compactPageBySection) {
    const viewport = createPageViewport("compact-cover-page");
    const cover = document.createElement("div");
    cover.className = "compact-cover-native";

    const heroFrame = document.createElement("div");
    heroFrame.className = "compact-cover-native-hero";

    const heroShell = document.createElement("div");
    heroShell.className = "compact-cover-hero-shell magazine-cover-v2";

    const sourceHero = source.querySelector(".magazine-cover-hero");
    if (sourceHero) {
      const heroClone = sourceHero.cloneNode(true);
      stripIds(heroClone);
      heroClone.classList.add("compact-cover-hero-source");
      heroShell.append(heroClone);
      heroFrame.append(heroShell);
    }

    const contents = document.createElement("section");
    contents.className = "compact-cover-native-contents";

    const sourceTitle = source.querySelector(".magazine-cover-contents-title");
    const title = document.createElement("h2");
    title.className = "compact-cover-native-title";
    title.textContent = sourceTitle?.textContent?.trim() || "מה מחכה לכם בפנים";

    const index = document.createElement("div");
    index.className = "compact-cover-native-index";

    const sourceRows = Array.from(source.querySelectorAll(".magazine-index-item"));
    for (const row of sourceRows) {
      const clone = row.cloneNode(true);
      stripIds(clone);
      clone.classList.add("compact-cover-native-item");

      const sectionName = String(row.dataset.section || "").replace(/🔖/g, "").trim();
      const compactPage = compactPageBySection.get(sectionName);
      const pageNode = clone.querySelector(".magazine-index-page");
      if (pageNode && Number.isFinite(compactPage)) {
        pageNode.textContent = String(compactPage);
      }

      index.append(clone);
    }

    contents.append(title, index);
    cover.append(heroFrame, contents);
    viewport.append(cover);
    return attachPageNumber(viewport, 1);
  }

  function createScaledBackPage(source, pageNumber) {
    const viewport = createPageViewport("compact-back-cover-page");
    const clone = source.cloneNode(true);
    stripIds(clone);
    clone.classList.add("compact-scaled-full-page");
    viewport.append(clone);
    return attachPageNumber(viewport, pageNumber);
  }

  function createSectionFlow(section) {
    const flow = document.createElement("div");
    flow.className = "compact-section-flow";

    const clone = section.cloneNode(true);
    stripIds(clone);
    clone.classList.add("compact-section-clone");
    flow.append(clone);

    return flow;
  }

  function measureSectionPageCount(section) {
    const host = document.createElement("div");
    host.className = "compact-measure-host";

    const flow = createSectionFlow(section);
    host.append(flow);
    document.body.append(host);

    const pageWidth = host.getBoundingClientRect().width || 1;
    const totalWidth = Math.max(flow.scrollWidth, pageWidth);
    const count = Math.max(1, Math.ceil((totalWidth - 1) / pageWidth));

    host.remove();
    return count;
  }

  function createSectionPage(section, pageIndex, pageNumber) {
    const viewport = createPageViewport("compact-content-page");
    const flow = createSectionFlow(section);

    flow.style.transform = `translateX(-${pageIndex * PAGE_WIDTH_MM}mm)`;
    viewport.append(flow);
    return attachPageNumber(viewport, pageNumber);
  }

  function createBlankPage() {
    return createPageViewport("compact-blank-page");
  }

  function createSheet(rightPage, leftPage) {
    const sheet = document.createElement("section");
    sheet.className = "compact-sheet";

    const right = document.createElement("div");
    right.className = "compact-sheet-half compact-sheet-right";
    right.append(rightPage || createBlankPage());

    const left = document.createElement("div");
    left.className = "compact-sheet-half compact-sheet-left";
    left.append(leftPage || createBlankPage());

    sheet.append(right, left);
    return sheet;
  }

  async function buildCompactLayout() {
    const ready = await waitForSourceLayout();
    if (!ready) {
      window.__printCompactReady = true;
      return;
    }

    const printPage = document.getElementById("print-page");
    const printContent = document.getElementById("print-content");
    const cover = printPage?.querySelector(":scope > .magazine-cover");
    const backCover = printPage?.querySelector(":scope > .print-back-cover");
    const sections = Array.from(
      printContent?.querySelectorAll(":scope > .print-section") || []
    );

    if (!printPage || !printContent || !cover || !backCover || !sections.length) {
      window.__printCompactReady = true;
      return;
    }

    /*
      קודם מודדים את כל המדורים ומקבעים את מספור ההדפסה החסכונית.
      המספרים בשער החסכוני מתייחסים מעתה לעמודי החצי האמיתיים שלו,
      ולא למספרי ההדפסה האנכית.
    */
    const sectionPlans = [];
    const compactPageBySection = new Map();
    let nextPageNumber = 2;

    for (const section of sections) {
      const pageCount = measureSectionPageCount(section);
      const sectionName = sectionNameFrom(section);
      if (sectionName && !compactPageBySection.has(sectionName)) {
        compactPageBySection.set(sectionName, nextPageNumber);
      }
      sectionPlans.push({ section, pageCount, firstPageNumber: nextPageNumber });
      nextPageNumber += pageCount;
    }

    const logicalPages = [];
    logicalPages.push(createCompactCoverPage(cover, compactPageBySection));

    for (const plan of sectionPlans) {
      for (let index = 0; index < plan.pageCount; index += 1) {
        logicalPages.push(
          createSectionPage(plan.section, index, plan.firstPageNumber + index)
        );
      }
    }

    logicalPages.push(createScaledBackPage(backCover, nextPageNumber));

    const compactRoot = document.createElement("div");
    compactRoot.id = "compact-print-root";
    compactRoot.setAttribute("aria-hidden", "true");

    for (let index = 0; index < logicalPages.length; index += 2) {
      compactRoot.append(
        createSheet(
          logicalPages[index],
          logicalPages[index + 1] || createBlankPage()
        )
      );
    }

    document.body.append(compactRoot);

    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );

    /* QA: תוכן עניינים, הטקסט הדינמי ומספור העמודים חייבים להגיע לעותק. */
    const sourceRowCount = cover.querySelectorAll(".magazine-index-item").length;
    const compactRowCount = compactRoot.querySelectorAll(
      ".compact-cover-native-index > .magazine-index-item"
    ).length;
    const sourceSubtitle = cover.querySelector(".magazine-cover-subtitle")?.textContent?.trim() || "";
    const compactSubtitle = compactRoot.querySelector(".compact-cover-page .magazine-cover-subtitle")?.textContent?.trim() || "";
    const numberedPages = compactRoot.querySelectorAll(".compact-logical-page-number").length;

    const qaPassed = Boolean(
      sourceRowCount > 0 &&
      compactRowCount === sourceRowCount &&
      sourceSubtitle === compactSubtitle &&
      numberedPages === logicalPages.length
    );

    compactRoot.dataset.coverQa = qaPassed ? "pass" : "fail";

    if (!qaPassed) {
      console.error("Compact print QA failed", {
        sourceRowCount,
        compactRowCount,
        sourceSubtitle,
        compactSubtitle,
        numberedPages,
        logicalPages: logicalPages.length
      });
    }

    window.__printCompactReady = true;
    window.dispatchEvent(new CustomEvent("print-compact-ready"));
  }

  document.addEventListener("DOMContentLoaded", buildCompactLayout);
})();

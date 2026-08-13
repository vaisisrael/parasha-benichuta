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

      if (
        cover &&
        backCover &&
        sections.length > 0 &&
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

  function createScaledFullPage(source, className) {
    const viewport = createPageViewport(className);
    const clone = source.cloneNode(true);
    clone.removeAttribute("id");
    clone.classList.add("compact-scaled-full-page");
    viewport.append(clone);
    return viewport;
  }

  function createSectionFlow(section) {
    const flow = document.createElement("div");
    flow.className = "compact-section-flow";

    const clone = section.cloneNode(true);
    clone.removeAttribute("id");
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

  function createSectionPage(section, pageIndex) {
    const viewport = createPageViewport("compact-content-page");
    const flow = createSectionFlow(section);

    flow.style.transform = `translateX(-${pageIndex * PAGE_WIDTH_MM}mm)`;
    viewport.append(flow);
    return viewport;
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

    const logicalPages = [];

    logicalPages.push(
      createScaledFullPage(cover, "compact-cover-page")
    );

    for (const section of sections) {
      const pageCount = measureSectionPageCount(section);
      for (let index = 0; index < pageCount; index += 1) {
        logicalPages.push(createSectionPage(section, index));
      }
    }

    logicalPages.push(
      createScaledFullPage(backCover, "compact-back-cover-page")
    );

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

    window.__printCompactReady = true;
    window.dispatchEvent(new CustomEvent("print-compact-ready"));
  }

  document.addEventListener("DOMContentLoaded", buildCompactLayout);
})();

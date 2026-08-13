(() => {
  "use strict";

  if (window.__printMode !== "compact") {
    window.__printCompactReady = true;
    return;
  }

  window.__printCompactReady = false;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function wrapAsPageSlot(element, className) {
    if (!element || element.closest(".compact-page-slot")) return null;

    const slot = document.createElement("div");
    slot.className = `compact-page-slot ${className}`;
    element.before(slot);
    slot.append(element);
    return slot;
  }

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

    if (!printPage || !printContent || !cover || !backCover) {
      window.__printCompactReady = true;
      return;
    }

    wrapAsPageSlot(cover, "compact-cover-slot");

    const sections = Array.from(
      printContent.querySelectorAll(":scope > .print-section")
    );

    sections.forEach((section, index) => {
      section.classList.toggle("compact-first-section", index === 0);
      printPage.insertBefore(section, backCover);
    });

    printContent.remove();

    wrapAsPageSlot(backCover, "compact-back-cover-slot");

    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );

    window.__printCompactReady = true;
    window.dispatchEvent(new CustomEvent("print-compact-ready"));
  }

  document.addEventListener("DOMContentLoaded", buildCompactLayout);
})();

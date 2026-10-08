(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  if (params.get("open") !== "games") return;

  let attempts = 0;

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function tryOpenGames() {
    attempts += 1;

    const card = Array.from(
      document.querySelectorAll(
        ".cards-grid.organized-regions .region-panel > .card"
      )
    ).find((item) =>
      normalize(item.querySelector(".eyebrow")?.textContent) === "משחקים"
    );

    if (!card) {
      if (attempts < 80) window.setTimeout(tryOpenGames, 75);
      return;
    }

    const section = card.closest(".content-region");
    const panel = card.closest(".region-panel");
    if (!section || !panel) return;

    const cards = Array.from(panel.querySelectorAll(":scope > .card"));
    const index = cards.indexOf(card);
    const tabs = Array.from(section.querySelectorAll(".region-tabs .region-tab"));
    const tab = tabs[index];

    if (tab && !tab.classList.contains("is-active")) {
      tab.click();
    }

    const openButton = card.querySelector(".inline-open-button");
    if (!openButton) {
      if (attempts < 80) window.setTimeout(tryOpenGames, 75);
      return;
    }

    openButton.click();

    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("open");
    history.replaceState(null, "", cleanUrl.href);
  }

  window.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(tryOpenGames, 80);
  });
})();

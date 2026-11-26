(() => {
  "use strict";

  const scriptUrl = document.currentScript?.src || window.location.href;
  const rootUrl = new URL("../../", scriptUrl);
  const coverConfigUrl = new URL("assets/data/print-cover.json", rootUrl);

  const parashaBooks = {
    "בראשית":"בראשית","נח":"בראשית","לך לך":"בראשית","וירא":"בראשית","חיי שרה":"בראשית","תולדות":"בראשית","ויצא":"בראשית","וישלח":"בראשית","וישב":"בראשית","מקץ":"בראשית","ויגש":"בראשית","ויחי":"בראשית",
    "שמות":"שמות","וארא":"שמות","בא":"שמות","בשלח":"שמות","יתרו":"שמות","משפטים":"שמות","תרומה":"שמות","תצווה":"שמות","כי תשא":"שמות","ויקהל":"שמות","פקודי":"שמות",
    "ויקרא":"ויקרא","צו":"ויקרא","שמיני":"ויקרא","תזריע":"ויקרא","מצורע":"ויקרא","אחרי מות":"ויקרא","קדושים":"ויקרא","אמור":"ויקרא","בהר":"ויקרא","בחקתי":"ויקרא",
    "במדבר":"במדבר","נשא":"במדבר","בהעלתך":"במדבר","שלח":"במדבר","קורח":"במדבר","חקת":"במדבר","בלק":"במדבר","פנחס":"במדבר","מטות":"במדבר","מסעי":"במדבר",
    "דברים":"דברים","ואתחנן":"דברים","עקב":"דברים","ראה":"דברים","שופטים":"דברים","כי תצא":"דברים","כי תבוא":"דברים","נצבים":"דברים","וילך":"דברים","האזינו":"דברים","וזאת הברכה":"דברים"
  };

  const fixedDescriptions = {
    "קצרים": "פנינים קצרות לקחת מהפרשה",
    "פיצוחים": "חידות מהנות לכל המשפחה"
  };

  const h1DescriptionSections = new Set([
    "סיפור", "תקציר", "משל", "יצירה", "ראיון", "וורט", "עברית", "מושג",
    "מדרש", "אסיף", "הלכה", "עיון", "המחשה"
  ]);

  let coverConfig = null;
  let h1BySection = new Map();
  let recalcTimer = 0;

  function normalizeText(value) {
    return String(value || "")
      .replace(/🔖/g, "")
      .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanParashaPrefix(value, parashaName = getParashaName()) {
    const text = normalizeText(value);
    const parasha = normalizeText(parashaName);
    if (!parasha) return text;

    const escaped = parasha.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const cleaned = text.replace(
      new RegExp(`^(?:פרשת\\s+)?${escaped}\\s*[:\\-–—]\\s*`, "u"),
      ""
    ).trim();

    return cleaned || text;
  }

  function safeSlug(value) {
    return String(value || "").normalize("NFKC").trim().toLowerCase()
      .replace(/[\s_/]+/g, "-").replace(/[^\w\u0590-\u05ff-]+/g, "")
      .replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  function getParashaName() {
    const requested = new URL(window.location.href).searchParams.get("parasha");
    if (requested) return normalizeText(requested);
    const title = normalizeText(document.getElementById("print-title")?.textContent);
    return title.replace(/^פרשת\s+/, "").trim();
  }

  async function loadConfig() {
    const response = await fetch(`${coverConfigUrl.href}?v=3`, { cache: "no-store" });
    if (!response.ok) throw new Error("לא ניתן לטעון את הגדרות שער ההדפסה");
    coverConfig = await response.json();
  }

  function applyConfiguredStyle(element, style) {
    if (!element || !style) return;
    const map = {
      font: "fontFamily",
      size: "fontSize",
      color: "color",
      weight: "fontWeight",
      margin_top: "marginTop",
      margin_bottom: "marginBottom",
      top: "top",
      left: "left"
    };

    for (const [key, cssKey] of Object.entries(map)) {
      const value = style[key];
      if (value === undefined || value === null || value === "") continue;
      element.style[cssKey] = key === "font"
        ? `"${value}", "Noto Sans Hebrew", Arial, sans-serif`
        : String(value);
    }
  }

  function applyCoverStyles(cover) {
    const styles = coverConfig?.defaults?.styles || {};
    const selectors = {
      brand: ".magazine-cover-brand",
      parasha: ".magazine-cover-parasha",
      subtitle: ".magazine-cover-subtitle",
      quote: ".magazine-cover-quote",
      quote_ref: ".magazine-cover-quote-ref",
      badge: ".magazine-cover-badge",
      contents_title: ".magazine-cover-contents-title",
      footer: ".magazine-cover-footer"
    };

    for (const [key, selector] of Object.entries(selectors)) {
      applyConfiguredStyle(cover.querySelector(selector), styles[key]);
    }
  }

  function makeCover(parashaName) {
    const defaults = coverConfig?.defaults || {};
    const item = coverConfig?.parashot?.[parashaName] || {};

    const cover = document.createElement("section");
    cover.className = "magazine-cover magazine-cover-v2";
    cover.id = "magazine-cover";
    cover.innerHTML = `
      <div class="magazine-cover-hero">
        <img class="magazine-cover-image" alt="">
        <div class="magazine-cover-wash" aria-hidden="true"></div>
        <div class="magazine-cover-overlay">
          <div class="magazine-cover-brand"></div>
          <div class="magazine-cover-badge"></div>
          <h1 class="magazine-cover-parasha"></h1>
          <div class="magazine-cover-subtitle"></div>
          <div class="magazine-cover-divider" aria-hidden="true"><span>♡</span></div>
          <div class="magazine-cover-quote"></div>
          <div class="magazine-cover-quote-ref"></div>
        </div>
      </div>
      <div class="magazine-cover-contents">
        <h2 class="magazine-cover-contents-title"></h2>
        <div class="magazine-cover-index" id="magazine-cover-index"></div>
      </div>
      <div class="magazine-cover-footer"></div>
    `;

    cover.querySelector(".magazine-cover-brand").textContent = defaults.brand || "פרשת השבוע בניחותא";
    cover.querySelector(".magazine-cover-badge").textContent = defaults.badge || "לכל המשפחה\nלשולחן שבת";
    cover.querySelector(".magazine-cover-parasha").textContent = parashaName;
    cover.querySelector(".magazine-cover-subtitle").textContent = item.subtitle || "";
    cover.querySelector(".magazine-cover-quote").textContent = item.quote ? `״${item.quote}״` : "";
    cover.querySelector(".magazine-cover-quote-ref").textContent = item.quote_ref || "";
    cover.querySelector(".magazine-cover-contents-title").textContent = defaults.contents_title || "מה מחכה לכם בפנים";
    cover.querySelector(".magazine-cover-footer").textContent = defaults.footer || "שבת שלום ומבורך";

    applyCoverStyles(cover);

    const image = cover.querySelector(".magazine-cover-image");
    if (item.image) {
      image.src = new URL(item.image, rootUrl).href;
      image.alt = `איור שער לפרשת ${parashaName}`;
    } else {
      cover.classList.add("cover-image-missing");
    }

    return cover;
  }

  async function waitForImage(image) {
    if (!image || !image.getAttribute("src") || image.complete) return;
    await Promise.race([
      new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      }),
      new Promise((resolve) => setTimeout(resolve, 5000))
    ]);
  }

  async function waitForPrintContent() {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const status = document.getElementById("print-status");
      const sections = document.querySelectorAll("#print-content > .print-section");
      if (!status && sections.length) return;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    throw new Error("טעינת תוכני ההדפסה נמשכה זמן רב מדי");
  }

  async function loadPostH1Map(parashaName) {
    const book = parashaBooks[parashaName];
    if (!book) return;

    const archiveUrl = new URL(`parashot/${safeSlug(book)}/${safeSlug(parashaName)}/`, rootUrl);
    try {
      const response = await fetch(archiveUrl.href, { cache: "no-store" });
      if (!response.ok) return;
      const archive = new DOMParser().parseFromString(await response.text(), "text/html");
      const cards = Array.from(archive.querySelectorAll(".cards-grid > .card"));
      const jobs = [];

      for (const card of cards) {
        const section = normalizeText(card.querySelector(".eyebrow")?.textContent);
        if (!h1DescriptionSections.has(section) || h1BySection.has(section)) continue;
        const link = card.querySelector("h2 a[href], .card-media[href]");
        if (!link) continue;
        const postUrl = new URL(link.getAttribute("href"), archiveUrl.href).href;

        jobs.push((async () => {
          try {
            const postResponse = await fetch(postUrl, { cache: "no-store" });
            if (!postResponse.ok) return;
            const postDoc = new DOMParser().parseFromString(await postResponse.text(), "text/html");
            const h1 = normalizeText(postDoc.querySelector("article h1, .post-header h1, main h1, h1")?.textContent);
            if (h1) h1BySection.set(section, cleanParashaPrefix(h1, parashaName));
          } catch {}
        })());
      }

      await Promise.all(jobs);
    } catch {}
  }

  function visibleSections() {
    return Array.from(document.querySelectorAll("#print-content > .print-section"));
  }

  function sectionNameFrom(sectionEl) {
    if (sectionEl.dataset.sectionName) return normalizeText(sectionEl.dataset.sectionName);

    const kicker = sectionEl.querySelector(".print-section-kicker");
    if (!kicker) return "";
    const copy = kicker.cloneNode(true);
    copy.querySelectorAll(".print-section-icon").forEach((el) => el.remove());
    return normalizeText(copy.textContent);
  }

  function descriptionFor(sectionName, sectionEl) {
    if (fixedDescriptions[sectionName]) return fixedDescriptions[sectionName];

    const source = h1DescriptionSections.has(sectionName)
      ? (h1BySection.get(sectionName) || normalizeText(sectionEl.querySelector("h2")?.textContent) || sectionName)
      : (normalizeText(sectionEl.querySelector("h2")?.textContent) || sectionName);

    return cleanParashaPrefix(source);
  }

  function cloneIcon(sectionEl) {
    const icon = sectionEl.querySelector(".print-section-icon");
    if (!icon) return document.createElement("span");
    const clone = icon.cloneNode(true);
    clone.classList.add("magazine-index-icon");
    return clone;
  }

  function printablePageHeightPx() {
    const mmToPx = 96 / 25.4;
    return (297 - 28 - 20) * mmToPx;
  }

  function calculatePageNumber(sectionEl) {
    const first = visibleSections()[0];
    if (!first) return 2;
    const relativeTop = sectionEl.getBoundingClientRect().top - first.getBoundingClientRect().top;
    return 2 + Math.max(0, Math.floor(relativeTop / printablePageHeightPx()));
  }

  function styleIndexItem(row) {
    const styles = coverConfig?.defaults?.styles || {};
    applyConfiguredStyle(row.querySelector(".magazine-index-name"), styles.section_name);
    applyConfiguredStyle(row.querySelector(".magazine-index-description"), styles.section_description);
    applyConfiguredStyle(row.querySelector(".magazine-index-page"), styles.page_number);
  }

  function buildIndex() {
    const index = document.getElementById("magazine-cover-index");
    if (!index) return;
    index.replaceChildren();

    for (const sectionEl of visibleSections()) {
      const sectionName = sectionNameFrom(sectionEl);
      if (!sectionName || sectionName === "משחקים") continue;

      const row = document.createElement("div");
      row.className = "magazine-index-item";
      row.dataset.section = sectionName;

      const icon = cloneIcon(sectionEl);
      const text = document.createElement("div");
      text.className = "magazine-index-text";

      const name = document.createElement("div");
      name.className = "magazine-index-name";
      name.textContent = sectionName;

      const description = document.createElement("div");
      description.className = "magazine-index-description";
      description.textContent = descriptionFor(sectionName, sectionEl);
      text.append(name, description);

      const page = document.createElement("div");
      page.className = "magazine-index-page";
      page.textContent = calculatePageNumber(sectionEl);

      row.append(icon, text, page);
      styleIndexItem(row);
      index.append(row);
    }
  }

  function scheduleRecalc() {
    clearTimeout(recalcTimer);
    recalcTimer = setTimeout(buildIndex, 80);
  }

  async function initCover() {
    try {
      window.__printCoverReady = false;
      await loadConfig();

      const parashaName = getParashaName();
      if (!parashaName) throw new Error("לא נמצאה פרשה לשער");

      const page = document.getElementById("print-page");
      const oldCover = page?.querySelector(".print-cover");
      if (!page || !oldCover) throw new Error("לא נמצא אזור ההדפסה");

      const cover = makeCover(parashaName);
      oldCover.insertAdjacentElement("afterend", cover);
      oldCover.classList.add("legacy-print-cover");

      const content = document.getElementById("print-content");
      if (content) {
        const observer = new MutationObserver(scheduleRecalc);
        observer.observe(content, { childList: true, subtree: true });
      }

      await waitForPrintContent();
      await Promise.all([
        loadPostH1Map(parashaName),
        waitForImage(cover.querySelector(".magazine-cover-image"))
      ]);

      buildIndex();

      if (document.fonts?.ready) {
        try { await document.fonts.ready; } catch {}
      }

      buildIndex();
      window.__printCoverReady = true;
      window.dispatchEvent(new CustomEvent("print-cover-ready"));
    } catch (error) {
      console.warn("לא ניתן לבנות את שער העלון", error);
      window.__printCoverReady = true;
    }
  }

  document.addEventListener("DOMContentLoaded", initCover);
})();

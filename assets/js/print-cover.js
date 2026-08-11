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
    return String(value || "").replace(/🔖/g, "").replace(/\s+/g, " ").trim();
  }

  function safeSlug(value) {
    return String(value || "").normalize("NFKC").trim().toLowerCase()
      .replace(/[\s_/]+/g, "-").replace(/[^\w\u0590-\u05ff-]+/g, "")
      .replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  function getParashaName() {
    const requested = new URL(window.location.href).searchParams.get("parasha");
    if (requested) return requested.trim();
    const title = normalizeText(document.getElementById("print-title")?.textContent);
    return title.replace(/^פרשת\s+/, "").trim();
  }

  function getFont(fonts, key) {
    return (fonts && fonts[key]) || "Noto Sans Hebrew";
  }

  function applyFonts(fonts) {
    const root = document.documentElement;
    const names = ["brand","parasha","subtitle","quote","quote_ref","contents_title","section_name","section_description","page_number","footer"];
    for (const name of names) {
      root.style.setProperty(`--cover-font-${name.replaceAll("_", "-")}`, `"${getFont(fonts, name)}", Arial, sans-serif`);
    }
  }

  async function loadConfig() {
    const response = await fetch(coverConfigUrl.href, { cache: "no-store" });
    if (!response.ok) throw new Error("לא ניתן לטעון את הגדרות שער ההדפסה");
    coverConfig = await response.json();
    return coverConfig;
  }

  function makeCover(parashaName) {
    const defaults = coverConfig?.defaults || {};
    const item = coverConfig?.parashot?.[parashaName] || {};
    applyFonts(defaults.fonts || {});

    const cover = document.createElement("section");
    cover.className = "magazine-cover";
    cover.id = "magazine-cover";
    cover.innerHTML = `
      <div class="magazine-cover-top">
        <div class="magazine-cover-brand"></div>
        <div class="magazine-cover-badge"></div>
        <h1 class="magazine-cover-parasha"></h1>
        <div class="magazine-cover-subtitle"></div>
        <div class="magazine-cover-quote"></div>
        <div class="magazine-cover-quote-ref"></div>
      </div>
      <div class="magazine-cover-image-wrap">
        <img class="magazine-cover-image" alt="">
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

    const image = cover.querySelector(".magazine-cover-image");
    if (item.image) {
      image.src = new URL(item.image, rootUrl).href;
      image.alt = `איור שער לפרשת ${parashaName}`;
      image.addEventListener("load", scheduleRecalc, { once: true });
      image.addEventListener("error", () => cover.classList.add("cover-image-missing"), { once: true });
    } else {
      cover.classList.add("cover-image-missing");
    }

    return cover;
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
            const h1 = normalizeText(postDoc.querySelector("article h1, main h1, .post-title, h1")?.textContent);
            if (h1) h1BySection.set(section, h1);
          } catch {}
        })());
      }
      await Promise.all(jobs);
    } catch {}
  }

  function descriptionFor(sectionName, sectionEl) {
    if (fixedDescriptions[sectionName]) return fixedDescriptions[sectionName];
    if (h1DescriptionSections.has(sectionName)) {
      return h1BySection.get(sectionName) || normalizeText(sectionEl.querySelector("h2")?.textContent) || sectionName;
    }
    return normalizeText(sectionEl.querySelector("h2")?.textContent) || sectionName;
  }

  function visibleSections() {
    return Array.from(document.querySelectorAll("#print-content > .print-section"));
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
    const content = document.getElementById("print-content");
    if (!content) return 2;
    const first = visibleSections()[0];
    if (!first) return 2;
    const relativeTop = sectionEl.getBoundingClientRect().top - first.getBoundingClientRect().top;
    return 2 + Math.max(0, Math.floor(relativeTop / printablePageHeightPx()));
  }

  function buildIndex() {
    const index = document.getElementById("magazine-cover-index");
    if (!index) return;
    index.replaceChildren();

    const sections = visibleSections();
    for (const sectionEl of sections) {
      const sectionName = normalizeText(sectionEl.querySelector(".print-section-kicker span")?.textContent);
      if (!sectionName || sectionName === "משחקים") continue;

      const row = document.createElement("div");
      row.className = "magazine-index-item";

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
      index.append(row);
    }
  }

  function scheduleRecalc() {
    window.clearTimeout(recalcTimer);
    recalcTimer = window.setTimeout(buildIndex, 80);
  }

  async function initCover() {
    try {
      await loadConfig();
      const parashaName = getParashaName();
      if (!parashaName) return;
      const page = document.getElementById("print-page");
      const oldCover = page?.querySelector(".print-cover");
      if (!page || !oldCover) return;

      const cover = makeCover(parashaName);
      oldCover.insertAdjacentElement("afterend", cover);
      oldCover.classList.add("legacy-print-cover");

      loadPostH1Map(parashaName).then(scheduleRecalc);

      const content = document.getElementById("print-content");
      if (content) {
        const observer = new MutationObserver(scheduleRecalc);
        observer.observe(content, { childList: true, subtree: true });
      }
      window.addEventListener("load", scheduleRecalc);
      window.addEventListener("beforeprint", buildIndex);
      scheduleRecalc();
    } catch (error) {
      console.warn("לא ניתן לבנות את שער העלון", error);
    }
  }

  document.addEventListener("DOMContentLoaded", initCover);
})();

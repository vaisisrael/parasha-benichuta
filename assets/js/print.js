(() => {
  "use strict";

  const sectionOrder = [
    "תקציר", "וורט", "עברית", "מושג", "עיון", "מדרש", "הלכה",
    "קצרים", "משל", "יצירה", "ראיון", "אסיף",
    "סיפור", "פיצוחים", "המחשה", "ילדים"
  ];

  const scriptUrl = document.currentScript?.src || window.location.href;
  const rootUrl = new URL("../../", scriptUrl);
  const configUrl = new URL("site_config.json", rootUrl);
  const shortsUrl = new URL("shorts/shorts.js", rootUrl);
  const shortsApiUrl = "https://script.google.com/macros/s/AKfycbzk_iC7Iph7qCoFhERhUNszUfVB42knXM6PSQ3H1FnRWPaL3l2cmI-z4CCQCVwGOpsHyw/exec";

  const parashaBooks = {
    "בראשית": "בראשית", "נח": "בראשית", "לך לך": "בראשית", "וירא": "בראשית",
    "חיי שרה": "בראשית", "תולדות": "בראשית", "ויצא": "בראשית", "וישלח": "בראשית",
    "וישב": "בראשית", "מקץ": "בראשית", "ויגש": "בראשית", "ויחי": "בראשית",
    "שמות": "שמות", "וארא": "שמות", "בא": "שמות", "בשלח": "שמות", "יתרו": "שמות",
    "משפטים": "שמות", "תרומה": "שמות", "תצווה": "שמות", "כי תשא": "שמות", "ויקהל": "שמות", "פקודי": "שמות",
    "ויקרא": "ויקרא", "צו": "ויקרא", "שמיני": "ויקרא", "תזריע": "ויקרא", "מצורע": "ויקרא",
    "אחרי מות": "ויקרא", "קדושים": "ויקרא", "אמור": "ויקרא", "בהר": "ויקרא", "בחקתי": "ויקרא",
    "במדבר": "במדבר", "נשא": "במדבר", "בהעלתך": "במדבר", "שלח": "במדבר", "קורח": "במדבר",
    "חקת": "במדבר", "בלק": "במדבר", "פנחס": "במדבר", "מטות": "במדבר", "מסעי": "במדבר",
    "דברים": "דברים", "ואתחנן": "דברים", "עקב": "דברים", "ראה": "דברים", "שופטים": "דברים",
    "כי תצא": "דברים", "כי תבוא": "דברים", "נצבים": "דברים", "וילך": "דברים",
    "האזינו": "דברים", "וזאת הברכה": "דברים"
  };

  const parashaLabels = {
    "בראשית": "1-01 פרשת בראשית", "נח": "1-02 פרשת נח", "לך לך": "1-03 פרשת לך לך", "וירא": "1-04 פרשת וירא",
    "חיי שרה": "1-05 פרשת חיי שרה", "תולדות": "1-06 פרשת תולדות", "ויצא": "1-07 פרשת ויצא", "וישלח": "1-08 פרשת וישלח",
    "וישב": "1-09 פרשת וישב", "מקץ": "1-10 פרשת מקץ", "ויגש": "1-11 פרשת ויגש", "ויחי": "1-12 פרשת ויחי",
    "שמות": "2-01 פרשת שמות", "וארא": "2-02 פרשת וארא", "בא": "2-03 פרשת בא", "בשלח": "2-04 פרשת בשלח",
    "יתרו": "2-05 פרשת יתרו", "משפטים": "2-06 פרשת משפטים", "תרומה": "2-07 פרשת תרומה", "תצווה": "2-08 פרשת תצווה",
    "כי תשא": "2-09 פרשת כי תשא", "ויקהל": "2-10 פרשת ויקהל", "פקודי": "2-11 פרשת פקודי",
    "ויקרא": "3-01 פרשת ויקרא", "צו": "3-02 פרשת צו", "שמיני": "3-03 פרשת שמיני", "תזריע": "3-04 פרשת תזריע",
    "מצורע": "3-05 פרשת מצורע", "אחרי מות": "3-06 פרשת אחרי מות", "קדושים": "3-07 פרשת קדושים", "אמור": "3-08 פרשת אמור",
    "בהר": "3-09 פרשת בהר", "בחקתי": "3-10 פרשת בחקתי",
    "במדבר": "4-01 פרשת במדבר", "נשא": "4-02 פרשת נשא", "בהעלתך": "4-03 פרשת בהעלתך", "שלח": "4-04 פרשת שלח",
    "קורח": "4-05 פרשת קורח", "חקת": "4-06 פרשת חקת", "בלק": "4-07 פרשת בלק", "פנחס": "4-08 פרשת פנחס",
    "מטות": "4-09 פרשת מטות", "מסעי": "4-10 פרשת מסעי",
    "דברים": "5-01 פרשת דברים", "ואתחנן": "5-02 פרשת ואתחנן", "עקב": "5-03 פרשת עקב", "ראה": "5-04 פרשת ראה",
    "שופטים": "5-05 פרשת שופטים", "כי תצא": "5-06 פרשת כי תצא", "כי תבוא": "5-07 פרשת כי תבוא",
    "נצבים": "5-08 פרשת נצבים", "וילך": "5-09 פרשת וילך", "האזינו": "5-10 פרשת האזינו", "וזאת הברכה": "5-11 פרשת וזאת הברכה"
  };

  const iconPaths = {
    "תקציר": '<rect x="21" y="17" width="22" height="30" rx="3"/><path d="M25 26H39M25 32H39M25 38H35"/>',
    "וורט": '<path d="M32 19C26.5 19 22 23.4 22 28.8C22 32.3 23.9 35 26.5 37.2C28 38.5 28.8 40 28.8 41.8H35.2C35.2 40 36 38.5 37.5 37.2C40.1 35 42 32.3 42 28.8C42 23.4 37.5 19 32 19Z"/><path d="M29 46H35M29.8 50H34.2"/>',
    "עברית": '<text x="32" y="39" text-anchor="middle" font-size="19" font-weight="700" fill="currentColor" stroke="none" font-family="Arial, Noto Sans Hebrew, sans-serif">אב</text>',
    "מושג": '<circle cx="29" cy="29" r="8"/><path d="M35.5 35.5L42 42M26 29H32"/>',
    "עיון": '<path d="M18 22C22.5 22 26 23.2 30 25.5V43C26 40.8 22.5 39.8 18 40V22ZM46 22C41.5 22 38 23.2 34 25.5V43C38 40.8 41.5 39.8 46 40V22ZM32 25V43"/>',
    "מדרש": '<path d="M22 22H39C41.8 22 44 24.2 44 27V37C44 39.8 41.8 42 39 42H22M22 22C19.8 22 18 23.8 18 26V38C18 40.2 19.8 42 22 42M24 26H36M24 31H36M24 36H33"/>',
    "הלכה": '<rect x="20" y="19" width="24" height="26" rx="3.5"/><path d="M38 19V30L34 27.5L30 30V19M24 35H36"/>',
    "קצרים": '<circle cx="23.5" cy="25" r="1.8" fill="currentColor" stroke="none"/><circle cx="23.5" cy="32" r="1.8" fill="currentColor" stroke="none"/><circle cx="23.5" cy="39" r="1.8" fill="currentColor" stroke="none"/><path d="M28 25H39M28 32H36M28 39H34"/>',
    "משל": '<path d="M22 41C27 39 26 33 31 31C36 29 37 24 42 22M22 41L26 40M22 41L24 37M42 22L38 23M42 22L40 26"/>',
    "יצירה": '<circle cx="25" cy="26" r="4.5"/><circle cx="39" cy="26" r="4.5"/><path d="M28.5 29.5L37 38M35.5 29.5L27 38"/>',
    "ראיון": '<path d="M18 23.5C18 20.5 20.5 18 23.5 18H33.5C36.5 18 39 20.5 39 23.5V29.5C39 32.5 36.5 35 33.5 35H27L22 39V35H23.5C20.5 35 18 32.5 18 29.5V23.5ZM32 28.5C32 25.7 34.2 23.5 37 23.5H41C43.8 23.5 46 25.7 46 28.5V33.5C46 36.3 43.8 38.5 41 38.5H39L35 42V38.5H37C34.2 38.5 32 36.3 32 33.5V28.5Z"/>',
    "אסיף": '<path d="M21 23H35C37.2 23 39 24.8 39 27V37C39 39.2 37.2 41 35 41H21C18.8 41 17 39.2 17 37V27C17 24.8 18.8 23 21 23ZM28 20H42C44.2 20 46 21.8 46 24V34C46 36.2 44.2 38 42 38H39M23 29H33M23 34H30"/>',
    "סיפור": '<path d="M19 22C23 22 26 23.1 30 25.2V43C26 41 23 40.2 19 40.5V22ZM45 22C41 22 38 23.1 34 25.2V43C38 41 41 40.2 45 40.5V22ZM32 27L33.4 30L36.6 30.4L34.2 32.5L34.9 35.6L32 34L29.1 35.6L29.8 32.5L27.4 30.4L30.6 30Z"/>',
    "פיצוחים": '<path d="M29 28C29 25.2 31.1 23.2 34 23.2C36.7 23.2 38.8 25 38.8 27.4C38.8 29.7 37.6 30.9 35.6 32.2C33.9 33.2 33.2 34.2 33.2 35.8"/><circle cx="33.2" cy="40.5" r="1.8" fill="currentColor" stroke="none"/><path d="M20 32L24 25H32L36 32L32 39H24Z"/>',
    "המחשה": '<rect x="18" y="21" width="28" height="22" rx="3.5"/><circle cx="38.5" cy="28" r="2.3" fill="currentColor" stroke="none"/><path d="M22.5 38L29 31L34 35L38 30L42 38"/>',
    "ילדים": '<path d="M31 42V28M31 28C31 24 34.1 21 38 21C41.9 21 45 24 45 28C45 32 41.9 35 38 35C34.1 35 31 32 31 28ZM31 42L27 46"/>'
  };

  function normalizeText(value) {
    return String(value || "").replace(/🔖/g, "").replace(/\s+/g, " ").trim();
  }

  function safeSlug(value) {
    return String(value || "").normalize("NFKC").trim().toLowerCase()
      .replace(/[\s_/]+/g, "-").replace(/[^\w\u0590-\u05ff-]+/g, "")
      .replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  function cleanPostTitle(title, parashaName) {
    const normalized = normalizeText(title);
    const escaped = parashaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return normalized.replace(new RegExp(`^(?:פרשת\\s+)?${escaped}\\s*[:\\-–—]\\s*`, "u"), "").trim() || normalized;
  }

  function getSectionIcon(sectionName) {
    const inner = iconPaths[sectionName] || iconPaths["תקציר"];
    return `
      <span class="print-section-icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" focusable="false">
          <circle cx="32" cy="32" r="24" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-opacity=".28" stroke-width="1.6"/>
          <circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" stroke-opacity=".16" stroke-width="1"/>
          <g fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
        </svg>
      </span>`;
  }

  async function getParashaName() {
    const requested = new URL(window.location.href).searchParams.get("parasha");
    if (requested && parashaBooks[requested]) return requested;

    const response = await fetch(configUrl.href, { cache: "no-store" });
    if (!response.ok) throw new Error("לא ניתן לקרוא את site_config.json");

    const config = await response.json();
    const values = Array.isArray(config.current_parasha) ? config.current_parasha : [config.current_parasha];
    const name = String(values[0] || "").trim();
    if (!parashaBooks[name]) throw new Error("לא הוגדרה פרשה תקינה להדפסה");
    return name;
  }

  function getArchiveUrl(parashaName) {
    const book = parashaBooks[parashaName];
    return new URL(`parashot/${safeSlug(book)}/${safeSlug(parashaName)}/`, rootUrl);
  }

  function absolutize(root, baseUrl) {
    root.querySelectorAll("[src]").forEach((el) => {
      const value = el.getAttribute("src");
      if (!value) return;
      try { el.setAttribute("src", new URL(value, baseUrl).href); } catch {}
    });
    root.querySelectorAll("[href]").forEach((el) => {
      const value = el.getAttribute("href");
      if (!value) return;
      try { el.setAttribute("href", new URL(value, baseUrl).href); } catch {}
    });
  }

  function sanitizeContent(root) {
    root.querySelectorAll(
      "script, style, button, input, select, textarea, iframe, video, audio, nav, " +
      ".post-back-navigation, .post-next-navigation, .read-link, .inline-open-button, " +
      ".inline-back-button, .card-action-loading"
    ).forEach((el) => el.remove());

    root.querySelectorAll("a").forEach((a) => {
      const span = document.createElement("span");
      span.innerHTML = a.innerHTML;
      a.replaceWith(span);
    });
  }

  function convertYouTubeUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        const id = parsed.pathname.replace(/^\/+/, "");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.hostname.includes("youtube.com")) {
        if (parsed.pathname.startsWith("/embed/")) return parsed.href;
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    } catch {}
    return null;
  }

  function containsVideoMedia(doc, postUrl) {
    const content = doc.querySelector(".post-content") || doc.querySelector("article") || doc.body;
    if (content.querySelector("iframe[src]")) return true;

    const video = content.querySelector("video");
    if (video?.getAttribute("src") || video?.querySelector("source[src]")) return true;

    for (const link of content.querySelectorAll("a[href]")) {
      try {
        const href = new URL(link.getAttribute("href"), postUrl).href;
        if (convertYouTubeUrl(href) || /\.(mp4|webm|ogg)(\?.*)?$/i.test(href)) return true;
      } catch {}
    }
    return false;
  }

  async function findSectionPosts(parashaName) {
    const archiveUrl = getArchiveUrl(parashaName);
    const response = await fetch(archiveUrl.href, { cache: "no-store" });
    if (!response.ok) throw new Error(`לא ניתן לטעון את פרשת ${parashaName}`);

    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const cards = Array.from(doc.querySelectorAll(".cards-grid > .card"));
    const result = new Map();

    for (const card of cards) {
      const section = normalizeText(card.querySelector(".eyebrow")?.textContent);
      if (!sectionOrder.includes(section) || result.has(section)) continue;

      const link = card.querySelector("h2 a[href], .card-media[href]");
      if (!link) continue;

      const title = normalizeText(card.querySelector("h2")?.textContent) || section;
      const url = new URL(link.getAttribute("href"), archiveUrl.href).href;
      result.set(section, { section, title, url });
    }

    return result;
  }

  function buildSectionShell(sectionName, title) {
    const section = document.createElement("section");
    section.className = "print-section";

    const kicker = document.createElement("div");
    kicker.className = "print-section-kicker";
    kicker.innerHTML = `${getSectionIcon(sectionName)}<span>${sectionName}</span>`;

    const heading = document.createElement("h2");
    heading.textContent = title;

    const body = document.createElement("div");
    body.className = "print-post-content";

    section.append(kicker, heading, body);
    return { section, body };
  }

  async function loadPost(entry, parashaName) {
    const response = await fetch(entry.url, { cache: "no-store" });
    if (!response.ok) throw new Error(`לא ניתן לטעון את מדור ${entry.section}`);

    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, "text/html");
    if (entry.section === "המחשה" && containsVideoMedia(doc, entry.url)) return null;

    const source = doc.querySelector(".post-content");
    if (!source) throw new Error(`לא נמצא תוכן במדור ${entry.section}`);

    const content = source.cloneNode(true);
    absolutize(content, entry.url);
    sanitizeContent(content);

    const { section, body } = buildSectionShell(entry.section, cleanPostTitle(entry.title, parashaName));
    body.append(...content.childNodes);
    return section;
  }

  function jsonp(params) {
    return new Promise((resolve, reject) => {
      const callbackName = `__printShortsCb${Date.now()}${Math.floor(Math.random() * 100000)}`;
      const script = document.createElement("script");
      const query = new URLSearchParams(params);
      query.set("prefix", callbackName);
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("Timeout"));
      }, 15000);

      function cleanup() {
        window.clearTimeout(timer);
        try { delete window[callbackName]; } catch { window[callbackName] = undefined; }
        script.remove();
      }

      window[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };
      script.onerror = () => {
        cleanup();
        reject(new Error("JSONP failed"));
      };
      script.src = `${shortsApiUrl}${shortsApiUrl.includes("?") ? "&" : "?"}${query.toString()}`;
      document.body.appendChild(script);
    });
  }

  async function loadShorts(parashaName) {
    const parashaLabel = parashaLabels[parashaName];
    if (!parashaLabel) return null;

    try {
      const data = await jsonp({ action: "bootstrap", activeParashot: parashaLabel });
      if (!data?.ok) return null;

      const types = Array.isArray(data.availableTypes) ? data.availableTypes : [];
      if (!types.length) return null;

      const { section, body } = buildSectionShell("קצרים", `קצרים מפרשת ${parashaName}`);
      const intro = document.createElement("p");
      intro.className = "print-shorts-intro";
      intro.textContent = `פנינים קצרות מפרשת ${parashaName}, מסודרות לפי סוגים.`;
      body.append(intro);

      for (const typeObj of types) {
        const items = data.itemsByType && Array.isArray(data.itemsByType[typeObj.key])
          ? data.itemsByType[typeObj.key]
          : [];
        if (!items.length) continue;

        const group = document.createElement("section");
        group.className = "print-shorts-group";
        const heading = document.createElement("h3");
        heading.textContent = typeObj.label || typeObj.key;
        group.append(heading);

        const list = document.createElement("ul");
        list.className = "print-shorts-list";
        for (const item of items) {
          const li = document.createElement("li");
          li.textContent = item.text || "";
          list.append(li);
        }
        group.append(list);
        body.append(group);
      }

      return body.children.length > 1 ? section : null;
    } catch (error) {
      console.warn("לא ניתן לטעון קצרים להדפסה", error);
      return null;
    }
  }

  async function waitForImages() {
    const pending = Array.from(document.images).filter((img) => !img.complete);
    if (!pending.length) return;

    await Promise.race([
      Promise.all(pending.map((img) => new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      }))),
      new Promise((resolve) => setTimeout(resolve, 2500))
    ]);
  }

  async function init() {
    const status = document.getElementById("print-status");
    const content = document.getElementById("print-content");
    const title = document.getElementById("print-title");

    try {
      const parashaName = await getParashaName();
      title.textContent = `פרשת ${parashaName}`;
      document.title = `פרשת ${parashaName} להדפסה | פרשת השבוע בניחותא`;
      document.documentElement.style.setProperty("--print-parasha", `"פרשת ${parashaName}"`);

      const entries = await findSectionPosts(parashaName);

      for (const sectionName of sectionOrder) {
        let section = null;

        if (sectionName === "קצרים") {
          section = await loadShorts(parashaName);
        } else if (entries.has(sectionName)) {
          section = await loadPost(entries.get(sectionName), parashaName);
        }

        if (section) content.append(section);
      }

      if (!content.children.length) {
        throw new Error(`לא נמצאו מדורים זמינים להדפסה בפרשת ${parashaName}`);
      }

      status.remove();

      if (new URL(window.location.href).searchParams.get("autoprint") === "1") {
        await waitForImages();
        requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
      }
    } catch (error) {
      console.error(error);
      title.textContent = "דף ההדפסה";
      status.textContent = error?.message || "אירעה שגיאה בהכנת ההדפסה.";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

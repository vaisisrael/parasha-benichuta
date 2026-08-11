(() => {
  "use strict";

  const wantedSections = ["תקציר", "וורט", "עברית"];

  const scriptUrl = document.currentScript?.src || window.location.href;
  const rootUrl = new URL("../../", scriptUrl);
  const configUrl = new URL("site_config.json", rootUrl);

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

  function normalizeText(value) {
    return String(value || "")
      .replace(/🔖/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function safeSlug(value) {
    return String(value || "")
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/[\s_/]+/g, "-")
      .replace(/[^\w\u0590-\u05ff-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function getParashaName() {
    const requested = new URL(window.location.href).searchParams.get("parasha");
    if (requested && parashaBooks[requested]) return requested;

    const response = await fetch(configUrl.href, { cache: "no-store" });
    if (!response.ok) throw new Error("לא ניתן לקרוא את site_config.json");

    const config = await response.json();
    const values = Array.isArray(config.current_parasha)
      ? config.current_parasha
      : [config.current_parasha];

    const name = String(values[0] || "").trim();
    if (!parashaBooks[name]) throw new Error("לא הוגדרה פרשה תקינה להדפסה");
    return name;
  }

  function getArchiveUrl(parashaName) {
    const book = parashaBooks[parashaName];
    return new URL(
      `parashot/${safeSlug(book)}/${safeSlug(parashaName)}/`,
      rootUrl
    );
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

  async function findSectionPosts(parashaName) {
    const archiveUrl = getArchiveUrl(parashaName);
    const response = await fetch(archiveUrl.href, { cache: "no-store" });
    if (!response.ok) throw new Error(`לא ניתן לטעון את פרשת ${parashaName}`);

    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const cards = Array.from(doc.querySelectorAll(".cards-grid > .card"));
    const result = new Map();

    for (const card of cards) {
      const section = normalizeText(card.querySelector(".eyebrow")?.textContent);
      if (!wantedSections.includes(section) || result.has(section)) continue;

      const link = card.querySelector("h2 a[href], .card-media[href]");
      if (!link) continue;

      const title = normalizeText(card.querySelector("h2")?.textContent) || section;
      const url = new URL(link.getAttribute("href"), archiveUrl.href).href;
      result.set(section, { section, title, url });
    }

    return result;
  }

  async function loadPost(entry) {
    const response = await fetch(entry.url, { cache: "no-store" });
    if (!response.ok) throw new Error(`לא ניתן לטעון את מדור ${entry.section}`);

    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const source = doc.querySelector(".post-content");
    if (!source) throw new Error(`לא נמצא תוכן במדור ${entry.section}`);

    const content = source.cloneNode(true);
    absolutize(content, entry.url);
    sanitizeContent(content);

    const section = document.createElement("section");
    section.className = "print-section";

    const kicker = document.createElement("div");
    kicker.className = "print-section-kicker";
    kicker.textContent = entry.section;

    const heading = document.createElement("h2");
    heading.textContent = entry.title;

    const body = document.createElement("div");
    body.className = "print-post-content";
    body.append(...content.childNodes);

    section.append(kicker, heading, body);
    return section;
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

      const entries = await findSectionPosts(parashaName);
      const missing = wantedSections.filter((name) => !entries.has(name));

      if (missing.length) {
        throw new Error(`חסרים בפרשת ${parashaName}: ${missing.join(", ")}`);
      }

      for (const sectionName of wantedSections) {
        content.append(await loadPost(entries.get(sectionName)));
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

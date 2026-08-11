(() => {
  "use strict";

  const wantedSections = ["תקציר", "וורט", "עברית"];

  const rootUrl = new URL("../", window.location.href);
  const configUrl = new URL("site_config.json", rootUrl);

  const parashaLabels = {
    "בראשית": ["בראשית", "בראשית"], "נח": ["בראשית", "נח"], "לך לך": ["בראשית", "לך לך"],
    "וירא": ["בראשית", "וירא"], "חיי שרה": ["בראשית", "חיי שרה"], "תולדות": ["בראשית", "תולדות"],
    "ויצא": ["בראשית", "ויצא"], "וישלח": ["בראשית", "וישלח"], "וישב": ["בראשית", "וישב"],
    "מקץ": ["בראשית", "מקץ"], "ויגש": ["בראשית", "ויגש"], "ויחי": ["בראשית", "ויחי"],
    "שמות": ["שמות", "שמות"], "וארא": ["שמות", "וארא"], "בא": ["שמות", "בא"], "בשלח": ["שמות", "בשלח"],
    "יתרו": ["שמות", "יתרו"], "משפטים": ["שמות", "משפטים"], "תרומה": ["שמות", "תרומה"],
    "תצווה": ["שמות", "תצווה"], "כי תשא": ["שמות", "כי תשא"], "ויקהל": ["שמות", "ויקהל"], "פקודי": ["שמות", "פקודי"],
    "ויקרא": ["ויקרא", "ויקרא"], "צו": ["ויקרא", "צו"], "שמיני": ["ויקרא", "שמיני"],
    "תזריע": ["ויקרא", "תזריע"], "מצורע": ["ויקרא", "מצורע"], "אחרי מות": ["ויקרא", "אחרי מות"],
    "קדושים": ["ויקרא", "קדושים"], "אמור": ["ויקרא", "אמור"], "בהר": ["ויקרא", "בהר"], "בחקתי": ["ויקרא", "בחקתי"],
    "במדבר": ["במדבר", "במדבר"], "נשא": ["במדבר", "נשא"], "בהעלתך": ["במדבר", "בהעלתך"],
    "שלח": ["במדבר", "שלח"], "קורח": ["במדבר", "קורח"], "חקת": ["במדבר", "חקת"],
    "בלק": ["במדבר", "בלק"], "פנחס": ["במדבר", "פנחס"], "מטות": ["במדבר", "מטות"], "מסעי": ["במדבר", "מסעי"],
    "דברים": ["דברים", "דברים"], "ואתחנן": ["דברים", "ואתחנן"], "עקב": ["דברים", "עקב"],
    "ראה": ["דברים", "ראה"], "שופטים": ["דברים", "שופטים"], "כי תצא": ["דברים", "כי תצא"],
    "כי תבוא": ["דברים", "כי תבוא"], "נצבים": ["דברים", "נצבים"], "וילך": ["דברים", "וילך"],
    "האזינו": ["דברים", "האזינו"], "וזאת הברכה": ["דברים", "וזאת הברכה"]
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
    if (requested && parashaLabels[requested]) return requested;

    const response = await fetch(configUrl.href, { cache: "no-store" });
    if (!response.ok) throw new Error("לא ניתן לקרוא את site_config.json");

    const config = await response.json();
    const current = Array.isArray(config.current_parasha)
      ? config.current_parasha
      : [config.current_parasha];

    const name = String(current[0] || "").trim();
    if (!parashaLabels[name]) throw new Error("לא הוגדרה פרשה תקינה להדפסה");
    return name;
  }

  function getArchiveUrl(parashaName) {
    const [book] = parashaLabels[parashaName];
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

      const params = new URL(window.location.href).searchParams;
      if (params.get("autoprint") === "1") {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const images = Array.from(document.images).filter((img) => !img.complete);
        await Promise.race([
          Promise.all(images.map((img) => new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          }))),
          new Promise((resolve) => setTimeout(resolve, 2500))
        ]);

        window.print();
      }
    } catch (error) {
      console.error(error);
      title.textContent = "דף ההדפסה";
      status.textContent = error?.message || "אירעה שגיאה בהכנת ההדפסה.";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

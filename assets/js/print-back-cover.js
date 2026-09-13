(() => {
  "use strict";

  const whatsappUrl =
    "https://whatsapp.com/channel/0029Vb5xXFK2Jl87sO5f9f28";

  const parashaMeta = {
    "בראשית": ["בראשית", "1-01 פרשת בראשית"],
    "נח": ["בראשית", "1-02 פרשת נח"],
    "לך לך": ["בראשית", "1-03 פרשת לך לך"],
    "וירא": ["בראשית", "1-04 פרשת וירא"],
    "חיי שרה": ["בראשית", "1-05 פרשת חיי שרה"],
    "תולדות": ["בראשית", "1-06 פרשת תולדות"],
    "ויצא": ["בראשית", "1-07 פרשת ויצא"],
    "וישלח": ["בראשית", "1-08 פרשת וישלח"],
    "וישב": ["בראשית", "1-09 פרשת וישב"],
    "מקץ": ["בראשית", "1-10 פרשת מקץ"],
    "ויגש": ["בראשית", "1-11 פרשת ויגש"],
    "ויחי": ["בראשית", "1-12 פרשת ויחי"],
    "שמות": ["שמות", "2-01 פרשת שמות"],
    "וארא": ["שמות", "2-02 פרשת וארא"],
    "בא": ["שמות", "2-03 פרשת בא"],
    "בשלח": ["שמות", "2-04 פרשת בשלח"],
    "יתרו": ["שמות", "2-05 פרשת יתרו"],
    "משפטים": ["שמות", "2-06 פרשת משפטים"],
    "תרומה": ["שמות", "2-07 פרשת תרומה"],
    "תצווה": ["שמות", "2-08 פרשת תצווה"],
    "כי תשא": ["שמות", "2-09 פרשת כי תשא"],
    "ויקהל": ["שמות", "2-10 פרשת ויקהל"],
    "פקודי": ["שמות", "2-11 פרשת פקודי"],
    "ויקרא": ["ויקרא", "3-01 פרשת ויקרא"],
    "צו": ["ויקרא", "3-02 פרשת צו"],
    "שמיני": ["ויקרא", "3-03 פרשת שמיני"],
    "תזריע": ["ויקרא", "3-04 פרשת תזריע"],
    "מצורע": ["ויקרא", "3-05 פרשת מצורע"],
    "אחרי מות": ["ויקרא", "3-06 פרשת אחרי מות"],
    "קדושים": ["ויקרא", "3-07 פרשת קדושים"],
    "אמור": ["ויקרא", "3-08 פרשת אמור"],
    "בהר": ["ויקרא", "3-09 פרשת בהר"],
    "בחקתי": ["ויקרא", "3-10 פרשת בחקתי"],
    "במדבר": ["במדבר", "4-01 פרשת במדבר"],
    "נשא": ["במדבר", "4-02 פרשת נשא"],
    "בהעלתך": ["במדבר", "4-03 פרשת בהעלתך"],
    "שלח": ["במדבר", "4-04 פרשת שלח"],
    "קורח": ["במדבר", "4-05 פרשת קורח"],
    "חקת": ["במדבר", "4-06 פרשת חקת"],
    "בלק": ["במדבר", "4-07 פרשת בלק"],
    "פנחס": ["במדבר", "4-08 פרשת פנחס"],
    "מטות": ["במדבר", "4-09 פרשת מטות"],
    "מסעי": ["במדבר", "4-10 פרשת מסעי"],
    "דברים": ["דברים", "5-01 פרשת דברים"],
    "ואתחנן": ["דברים", "5-02 פרשת ואתחנן"],
    "עקב": ["דברים", "5-03 פרשת עקב"],
    "ראה": ["דברים", "5-04 פרשת ראה"],
    "שופטים": ["דברים", "5-05 פרשת שופטים"],
    "כי תצא": ["דברים", "5-06 פרשת כי תצא"],
    "כי תבוא": ["דברים", "5-07 פרשת כי תבוא"],
    "נצבים": ["דברים", "5-08 פרשת נצבים"],
    "וילך": ["דברים", "5-09 פרשת וילך"],
    "האזינו": ["דברים", "5-10 פרשת האזינו"],
    "וזאת הברכה": ["דברים", "5-11 פרשת וזאת הברכה"]
  };

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function slug(value) {
    return String(value || "")
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/[\s_/]+/g, "-")
      .replace(/[^\w\u0590-\u05ff-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function currentParasha() {
    const fromQuery = new URL(window.location.href).searchParams.get("parasha");
    if (fromQuery) return normalize(fromQuery);

    return normalize(document.getElementById("print-title")?.textContent)
      .replace(/^פרשת\s+/, "");
  }

  function qrUrl(target) {
    const url = new URL("https://quickchart.io/qr");
    url.searchParams.set("text", target);
    url.searchParams.set("size", "320");
    url.searchParams.set("margin", "1");
    url.searchParams.set("ecLevel", "M");
    return url.href;
  }

  function gamesTarget(parasha) {
    const meta = parashaMeta[parasha];
    if (!meta) return "https://www.parasha-week.co.il/";

    const [book] = meta;
    const url = new URL(
      `parashot/${slug(book)}/${slug(parasha)}/`,
      "https://www.parasha-week.co.il/"
    );
    url.searchParams.set("open", "games");
    return url.href;
  }

  function createAction(icon, title, description, target, extra = "") {
    const action = document.createElement("article");
    action.className = "print-back-cover-action";
    action.innerHTML = `
      <div class="print-back-cover-action-icon" aria-hidden="true">${icon}</div>
      <h2>${title}</h2>
      <div class="print-back-cover-qr">
        <img src="${qrUrl(target)}" alt="">
      </div>
      <p>${description}</p>
      ${extra}
    `;
    return action;
  }

  async function waitForImages(root) {
    const images = Array.from(root.querySelectorAll("img"));
    if (!images.length) return;

    await Promise.race([
      Promise.all(images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      })),
      new Promise((resolve) => setTimeout(resolve, 7000))
    ]);
  }

  async function buildBackCover() {
    window.__printBackCoverReady = false;

    const printPage = document.getElementById("print-page");
    if (!printPage) return;

    document.getElementById("print-back-cover")?.remove();

    const parasha = currentParasha();
    const cover = document.createElement("section");
    cover.id = "print-back-cover";
    cover.className = "print-back-cover";
    cover.setAttribute("aria-label", "עמוד אחורי");

    const brand = document.createElement("header");
    brand.className = "print-back-cover-brand";
    brand.innerHTML = `
      <img class="print-back-cover-logo" src="assets/images/branding/logo.png" alt="פרשת השבוע בניחותא">
      <h1 class="print-back-cover-title">פרשת השבוע בניחותא</h1>
      <p class="print-back-cover-tagline">תוכן לפרשה, לשולחן שבת וגם למסך</p>
    `;

    const divider = document.createElement("div");
    divider.className = "print-back-cover-divider";

    const actions = document.createElement("section");
    actions.className = "print-back-cover-actions";

    actions.append(
      createAction(
        "💬",
        "רוצים לקבל את תכני הפרשה בכל שבוע?",
        "סרקו להצטרפות לערוץ הווטסאפ",
        whatsappUrl
      ),
      createAction(
        "🎲",
        "רוצים גם לשחק?",
        `משחקים אינטראקטיביים לילדים ולמשפחה${parasha ? ` — פרשת ${parasha}` : ""}`,
        gamesTarget(parasha),
        '<div class="print-back-cover-highlight">העלון נגמר כאן. המשחקים ממשיכים באתר.</div>'
      )
    );

    const contact = document.createElement("section");
    contact.className = "print-back-cover-contact";
    contact.innerHTML = `
      <div class="print-back-cover-contact-row">
        <span class="print-back-cover-contact-label">אתר</span>
        <span class="print-back-cover-contact-value">www.parasha-week.co.il</span>
      </div>
      <div class="print-back-cover-contact-row">
        <span class="print-back-cover-contact-label">מייל</span>
        <span class="print-back-cover-contact-value">parasha.week@gmail.com</span>
      </div>
    `;

    const footer = document.createElement("footer");
    footer.className = "print-back-cover-footer";
    footer.innerHTML = `
      <div><strong>© פרשת השבוע בניחותא</strong></div>
      <div>כל הזכויות שמורות</div>
    `;

    cover.append(brand, divider, actions, contact, footer);
    printPage.append(cover);

    await waitForImages(cover);

    window.__printBackCoverReady = true;
    window.dispatchEvent(new CustomEvent("print-back-cover-ready"));
  }

  document.addEventListener("DOMContentLoaded", buildBackCover);
})();

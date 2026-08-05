(() => {
  "use strict";

  const scriptUrl = document.currentScript?.src || "";
  const siteRoot = new URL("../../", scriptUrl || window.location.href);

  const parashaLabels = {
    "בראשית": "1-01 פרשת בראשית",
    "נח": "1-02 פרשת נח",
    "לך לך": "1-03 פרשת לך לך",
    "וירא": "1-04 פרשת וירא",
    "חיי שרה": "1-05 פרשת חיי שרה",
    "תולדות": "1-06 פרשת תולדות",
    "ויצא": "1-07 פרשת ויצא",
    "וישלח": "1-08 פרשת וישלח",
    "וישב": "1-09 פרשת וישב",
    "מקץ": "1-10 פרשת מקץ",
    "ויגש": "1-11 פרשת ויגש",
    "ויחי": "1-12 פרשת ויחי",

    "שמות": "2-01 פרשת שמות",
    "וארא": "2-02 פרשת וארא",
    "בא": "2-03 פרשת בא",
    "בשלח": "2-04 פרשת בשלח",
    "יתרו": "2-05 פרשת יתרו",
    "משפטים": "2-06 פרשת משפטים",
    "תרומה": "2-07 פרשת תרומה",
    "תצווה": "2-08 פרשת תצווה",
    "כי תשא": "2-09 פרשת כי תשא",
    "ויקהל": "2-10 פרשת ויקהל",
    "פקודי": "2-11 פרשת פקודי",

    "ויקרא": "3-01 פרשת ויקרא",
    "צו": "3-02 פרשת צו",
    "שמיני": "3-03 פרשת שמיני",
    "תזריע": "3-04 פרשת תזריע",
    "מצורע": "3-05 פרשת מצורע",
    "אחרי מות": "3-06 פרשת אחרי מות",
    "קדושים": "3-07 פרשת קדושים",
    "אמור": "3-08 פרשת אמור",
    "בהר": "3-09 פרשת בהר",
    "בחקתי": "3-10 פרשת בחקתי",

    "במדבר": "4-01 פרשת במדבר",
    "נשא": "4-02 פרשת נשא",
    "בהעלתך": "4-03 פרשת בהעלתך",
    "שלח": "4-04 פרשת שלח",
    "קורח": "4-05 פרשת קורח",
    "חקת": "4-06 פרשת חקת",
    "בלק": "4-07 פרשת בלק",
    "פנחס": "4-08 פרשת פנחס",
    "מטות": "4-09 פרשת מטות",
    "מסעי": "4-10 פרשת מסעי",

    "דברים": "5-01 פרשת דברים",
    "ואתחנן": "5-02 פרשת ואתחנן",
    "עקב": "5-03 פרשת עקב",
    "ראה": "5-04 פרשת ראה",
    "שופטים": "5-05 פרשת שופטים",
    "כי תצא": "5-06 פרשת כי תצא",
    "כי תבוא": "5-07 פרשת כי תבוא",
    "נצבים": "5-08 פרשת נצבים",
    "וילך": "5-09 פרשת וילך",
    "האזינו": "5-10 פרשת האזינו",
    "וזאת הברכה": "5-11 פרשת וזאת הברכה"
  };

  function getCurrentParasha() {
    const heading =
      document.querySelector(".hero h1") ||
      document.querySelector(".archive-header h1");

    if (!heading) return null;

    return heading.textContent
      .trim()
      .replace(/^פרשת\s+/, "");
  }

  function getGamesUrl(parashaName) {
    const label = parashaLabels[parashaName];
    if (!label) return null;

    const url = new URL("games/", siteRoot);
    url.searchParams.set("label", label);
    return url.href;
  }

  function setupNavigation() {
    const toggle = document.querySelector(".menu-toggle");
    const nav = document.querySelector(".main-nav");

    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
      });
    }

    document.querySelectorAll(".has-sub > button").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        button.parentElement.classList.toggle("open");
      });
    });
  }

  function removeOldGamesContent() {
    document.querySelectorAll(".card").forEach((card) => {
      const section = card.querySelector(".eyebrow")?.textContent.trim();
      if (section === "המשחקיה") {
        card.remove();
      }
    });

    document.querySelectorAll(".main-nav a").forEach((link) => {
      if (link.textContent.trim() === "המשחקיה") {
        link.closest("li")?.remove();
      }
    });
  }

  function updateGamesNavigation(parashaName) {
    const gamesUrl = getGamesUrl(parashaName);
    if (!gamesUrl) return;

    document.querySelectorAll(".main-nav a").forEach((link) => {
      if (link.textContent.trim() === "משחקים") {
        link.href = gamesUrl;
        link.textContent = `משחקי פרשת ${parashaName}`;
      }
    });
  }

  function addGamesCard(parashaName) {
    const gamesUrl = getGamesUrl(parashaName);
    if (!gamesUrl) return;

    const grid = document.querySelector(".cards-grid");
    if (!grid || grid.querySelector(".games-system-card")) return;

    const card = document.createElement("article");
    card.className = "card games-system-card";

    card.innerHTML = `
      <a class="card-media" href="${gamesUrl}">
        <div class="card-placeholder" aria-hidden="true">🎲</div>
      </a>
      <div class="card-body">
        <div class="eyebrow">משחקים</div>
        <h2>
          <a href="${gamesUrl}">משחקי פרשת ${parashaName}</a>
        </h2>
        <p>משחקים, חידות ואתגרים אינטראקטיביים סביב פרשת ${parashaName}.</p>
      </div>
    `;

    grid.prepend(card);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    removeOldGamesContent();

    const parashaName = getCurrentParasha();
    if (!parashaName) return;

    updateGamesNavigation(parashaName);
    addGamesCard(parashaName);
  });
})();


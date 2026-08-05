(() => {
  "use strict";

  const scriptUrl = document.currentScript?.src || "";
  const siteRoot = new URL(
    "../../",
    scriptUrl || window.location.href
  );

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

  const oldSiteHosts = new Set([
    "www.parasha-week.co.il",
    "parasha-week.co.il",
    "theweekparasha.blogspot.com"
  ]);

  const redirectMapUrl = new URL(
    "assets/data/redirect-map.json",
    siteRoot
  );

  /*
    תמונות מדור קבועות.
    כל פוסט השייך למדורים האלה יקבל
    את אותה תמונה, ללא תלות בתמונת הפוסט המקורית.
  */
  const fixedSectionImages = {
    "ילדים": {
      path: "assets/images/section-covers/children.png",
      alt: "מדור הילדים של פרשת השבוע"
    },

    "אסיף": {
      path: "assets/images/section-covers/asif.png",
      alt: "מדור אסיף — רעיונות ומחשבות מן הפרשה"
    },

    "משחקים": {
      path: "assets/images/section-covers/games.png",
      alt: "משחקי פרשת השבוע"
    },

    "המשחקיה": {
      path: "assets/images/section-covers/games.png",
      alt: "משחקי פרשת השבוע"
    }
  };

  /*
    סדר המדורים קובע את סדר הטאבים.
  */
  const regionDefinitions = [
    {
      id: "knowing",
      title: "מכירים את הפרשה",
      order: [
        "תקציר",
        "מושג",
        "וורט",
        "מדרש",
        "עברית",
        "עיון",
        "הלכה",
        "לימוד",
        "פרשה",
        "תנ״ך",
        "תנ\"ך"
      ]
    },
    {
      id: "stories",
      title: "סיפורים ורעיונות",
      order: [
        "סיפור",
        "יצירה",
        "משל",
        "ראיון",
        "אסיף",
        "הגות",
        "מחשבה",
        "שיר"
      ]
    },
    {
      id: "family",
      title: "לכל המשפחה",
      order: [
        "משחקים",
        "המשחקיה",
        "פיצוחים",
        "המחשה",
        "ילדים",
        "משפחה",
        "חידה",
        "חידות",
        "פעילות"
      ]
    }
  ];

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCurrentParasha() {
    const heading =
      document.querySelector(".hero h1") ||
      document.querySelector(".archive-header h1");

    if (!heading) {
      return null;
    }

    const name = normalizeText(heading.textContent)
      .replace(/^פרשת\s+/, "");

    return parashaLabels[name] ? name : null;
  }

  function getGamesUrl(parashaName) {
    const label = parashaLabels[parashaName];

    if (!label) {
      return null;
    }

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

        toggle.setAttribute(
          "aria-expanded",
          String(open)
        );
      });
    }

    document
      .querySelectorAll(".has-sub > button")
      .forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          button.parentElement.classList.toggle("open");
        });
      });
  }

  function removeHeroDescription() {
    const hero = document.querySelector(".hero");

    if (!hero) {
      return;
    }

    hero.querySelectorAll("p").forEach((paragraph) => {
      const text = normalizeText(paragraph.textContent);

      if (
        text ===
        "כל התכנים של הפרשה הנוכחית במקום אחד — בלי גלישה לפרשה הבאה."
      ) {
        paragraph.remove();
      }
    });

    hero.classList.add("hero-compact");
  }

  function isBinaText(text) {
    return (
      text === "בינה" ||
      text === "בינה מלאכותית"
    );
  }

  function removeBinaNavigation() {
    document
      .querySelectorAll(".main-nav li")
      .forEach((item) => {
        const ownControl = item.querySelector(
          ":scope > a, :scope > button"
        );

        if (!ownControl) {
          return;
        }

        const text = normalizeText(
          ownControl.textContent
        );

        if (isBinaText(text)) {
          item.remove();
        }
      });
  }

  function getCardLabel(card) {
    return normalizeText(
      card.querySelector(".eyebrow")?.textContent
    );
  }

  function isBinaCard(card) {
    const label = getCardLabel(card);

    const heading = normalizeText(
      card.querySelector("h2, h3")?.textContent
    );

    return (
      isBinaText(label) ||
      isBinaText(heading)
    );
  }

  function removeBinaCards() {
    document.querySelectorAll(".card").forEach((card) => {
      if (isBinaCard(card)) {
        card.remove();
      }
    });
  }

  function removeOldGamesContent() {
    document.querySelectorAll(".card").forEach((card) => {
      const label = getCardLabel(card);

      if (label === "המשחקיה") {
        card.remove();
      }
    });

    document.querySelectorAll(".main-nav a").forEach((link) => {
      const text = normalizeText(link.textContent);

      if (text === "המשחקיה") {
        link.closest("li")?.remove();
      }
    });
  }

  function updateGamesNavigation(parashaName) {
    const gamesUrl = getGamesUrl(parashaName);

    if (!gamesUrl) {
      return;
    }

    document.querySelectorAll(".main-nav a").forEach((link) => {
      const text = normalizeText(link.textContent);

      if (text === "משחקים") {
        link.href = gamesUrl;
        link.textContent =
          `משחקי פרשת ${parashaName}`;
      }
    });
  }

  function addGamesCard(parashaName) {
    const gamesUrl = getGamesUrl(parashaName);
    const grid = document.querySelector(".cards-grid");

    if (
      !gamesUrl ||
      !grid ||
      grid.querySelector(".games-system-card")
    ) {
      return;
    }

    const card = document.createElement("article");

    card.className =
      "card games-system-card fixed-cover-card";

    const imageUrl = new URL(
      fixedSectionImages["משחקים"].path,
      siteRoot
    ).href;

    card.innerHTML = `
      <a
        class="card-media"
        href="${gamesUrl}"
        aria-label="משחקי פרשת ${parashaName}"
      >
        <img
          src="${imageUrl}"
          alt="משחקי פרשת ${parashaName}"
        >
      </a>

      <div class="card-body">
        <div class="eyebrow">משחקים</div>

        <h2>
          <a href="${gamesUrl}">
            משחקי פרשת ${parashaName}
          </a>
        </h2>

        <p>
          משחקים, חידות ואתגרים אינטראקטיביים
          סביב פרשת ${parashaName}.
        </p>
      </div>
    `;

    grid.prepend(card);
  }

  /*
    מחליף את תמונת הפוסט המקורית
    בתמונה הקבועה של המדור.
  */
  function applyFixedSectionImages() {
    document.querySelectorAll(".card").forEach((card) => {
      const label = getCardLabel(card);
      const imageDefinition =
        fixedSectionImages[label];

      if (!imageDefinition) {
        return;
      }

      const media = card.querySelector(".card-media");

      if (!media) {
        return;
      }

      const imageUrl = new URL(
        imageDefinition.path,
        siteRoot
      ).href;

      let image = media.querySelector("img");

      if (!image) {
        image = document.createElement("img");
        media.replaceChildren(image);
      }

      image.src = imageUrl;
      image.alt = imageDefinition.alt;

      card.classList.add("fixed-cover-card");
    });
  }

  /*
    מוסיף את הקישור הדק והמעוצב
    בתחתית כל כרטיס.
  */
  function addReadLinks() {
    document.querySelectorAll(".card").forEach((card) => {
      if (card.querySelector(".read-link")) {
        return;
      }

      const sourceLink =
        card.querySelector("h2 a[href]") ||
        card.querySelector(".card-media[href]");

      const body = card.querySelector(".card-body");

      if (!sourceLink || !body) {
        return;
      }

      const label = getCardLabel(card);
      const readLink = document.createElement("a");

      readLink.className = "read-link";
      readLink.href = sourceLink.href;

      readLink.textContent =
        label === "משחקים" ||
        label === "המשחקיה"
          ? "לפתיחת המשחקים"
          : "לקריאת הפוסט";

      body.append(readLink);
    });
  }

  function findRegionForCard(card) {
    const label = getCardLabel(card);

    return regionDefinitions.find((region) =>
      region.order.includes(label)
    ) || regionDefinitions[0];
  }

  function getCardOrder(card, region) {
    const label = getCardLabel(card);
    const position = region.order.indexOf(label);

    return position === -1
      ? region.order.length
      : position;
  }

  function sortRegionCards(cards, region) {
    return [...cards].sort((cardA, cardB) => {
      return (
        getCardOrder(cardA, region) -
        getCardOrder(cardB, region)
      );
    });
  }

  function activateRegionCard(
    section,
    selectedIndex,
    moveFocus = false
  ) {
    const tabs = Array.from(
      section.querySelectorAll(".region-tab")
    );

    const cards = Array.from(
      section.querySelectorAll(
        ".region-panel > .card"
      )
    );

    tabs.forEach((tab, index) => {
      const active = index === selectedIndex;

      tab.classList.toggle("is-active", active);

      tab.setAttribute(
        "aria-selected",
        String(active)
      );

      tab.tabIndex = active ? 0 : -1;
    });

    cards.forEach((card, index) => {
      const active = index === selectedIndex;

      card.classList.toggle("is-active", active);
      card.hidden = !active;
    });

    if (moveFocus) {
      tabs[selectedIndex]?.focus();
    }
  }

  function setupRegionTabs(section) {
    const tabs = Array.from(
      section.querySelectorAll(".region-tab")
    );

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        activateRegionCard(section, index);
      });

      tab.addEventListener("keydown", (event) => {
        let nextIndex = null;

        if (
          event.key === "ArrowLeft" ||
          event.key === "ArrowDown"
        ) {
          nextIndex = (index + 1) % tabs.length;
        }

        if (
          event.key === "ArrowRight" ||
          event.key === "ArrowUp"
        ) {
          nextIndex =
            (index - 1 + tabs.length) % tabs.length;
        }

        if (event.key === "Home") {
          nextIndex = 0;
        }

        if (event.key === "End") {
          nextIndex = tabs.length - 1;
        }

        if (nextIndex === null) {
          return;
        }

        event.preventDefault();

        activateRegionCard(
          section,
          nextIndex,
          true
        );

        tabs[nextIndex].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest"
        });
      });
    });

    /*
      רק הטאב הראשון בכל אזור פעיל.
    */
    activateRegionCard(section, 0);
  }

  function createRegionElement(region, cards) {
    const section = document.createElement("section");

    section.className =
      `content-region content-region-${region.id}`;

    const header = document.createElement("div");
    header.className = "content-region-header";

    const heading = document.createElement("h2");
    heading.className = "content-region-title";
    heading.textContent = region.title;

    const headingId =
      `region-title-${region.id}`;

    heading.id = headingId;

    section.setAttribute(
      "aria-labelledby",
      headingId
    );

    const tabs = document.createElement("div");

    tabs.className = "region-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute(
      "aria-label",
      region.title
    );

    const panel = document.createElement("div");
    panel.className = "region-panel";

    cards.forEach((card, index) => {
      const label =
        getCardLabel(card) || `תוכן ${index + 1}`;

      const tab = document.createElement("button");

      const tabId =
        `region-${region.id}-tab-${index}`;

      const panelId =
        `region-${region.id}-card-${index}`;

      tab.type = "button";
      tab.className = "region-tab";
      tab.textContent = label;
      tab.id = tabId;

      tab.setAttribute("role", "tab");

      tab.setAttribute(
        "aria-controls",
        panelId
      );

      tab.setAttribute(
        "aria-selected",
        "false"
      );

      tab.tabIndex = -1;

      card.id = panelId;
      card.setAttribute("role", "tabpanel");

      card.setAttribute(
        "aria-labelledby",
        tabId
      );

      card.hidden = true;

      tabs.append(tab);
      panel.append(card);
    });

    header.append(heading, tabs);
    section.append(header, panel);

    setupRegionTabs(section);

    return section;
  }

  function organizeParashaCards() {
    const grid = document.querySelector(".cards-grid");

    if (
      !grid ||
      grid.classList.contains("organized-regions")
    ) {
      return;
    }

    const cards = Array.from(
      grid.querySelectorAll(":scope > .card")
    );

    if (!cards.length) {
      return;
    }

    const cardsByRegion = new Map(
      regionDefinitions.map((region) => [
        region.id,
        []
      ])
    );

    cards.forEach((card) => {
      const region = findRegionForCard(card);
      cardsByRegion.get(region.id).push(card);
    });

    grid.replaceChildren();
    grid.classList.add("organized-regions");

    regionDefinitions.forEach((region) => {
      const regionCards = sortRegionCards(
        cardsByRegion.get(region.id),
        region
      );

      if (!regionCards.length) {
        return;
      }

      grid.append(
        createRegionElement(region, regionCards)
      );
    });
  }

  async function repairInternalLinks() {
    let redirectMap;

    try {
      const response = await fetch(
        redirectMapUrl,
        { cache: "no-store" }
      );

      if (!response.ok) {
        console.error(
          "Redirect map could not be loaded:",
          response.status,
          redirectMapUrl.href
        );

        return;
      }

      redirectMap = await response.json();
    } catch (error) {
      console.error(
        "Redirect map error:",
        error
      );

      return;
    }

    document
      .querySelectorAll("a[href]")
      .forEach((link) => {
        const rawHref = link.getAttribute("href");

        if (!rawHref) {
          return;
        }

        let oldUrl;

        try {
          oldUrl = new URL(
            rawHref,
            window.location.href
          );
        } catch {
          return;
        }

        if (!oldSiteHosts.has(oldUrl.hostname)) {
          return;
        }

        const newPath =
          redirectMap[oldUrl.pathname];

        if (!newPath) {
          return;
        }

        const target = new URL(
          newPath.replace(/^\/+/, ""),
          siteRoot
        );

        target.search = oldUrl.search;
        target.hash = oldUrl.hash;

        link.href = target.href;
      });
  }

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      removeHeroDescription();
      removeBinaNavigation();
      removeBinaCards();
      removeOldGamesContent();
      setupNavigation();

      const parashaName = getCurrentParasha();

      if (parashaName) {
        updateGamesNavigation(parashaName);
        addGamesCard(parashaName);

        /*
          סדר הפעולות חשוב:
          קודם מחליפים תמונות ומוסיפים קישורים,
          ורק לאחר מכן מארגנים את הכרטיסים בטאבים.
        */
        applyFixedSectionImages();
        addReadLinks();
        organizeParashaCards();
      }

      repairInternalLinks();
    }
  );
})();

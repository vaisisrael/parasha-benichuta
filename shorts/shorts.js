(() => {
  "use strict";

  const scriptUrl = document.currentScript?.src || "";
  const shortsRoot = new URL("./", scriptUrl || window.location.href);

  const WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbzk_iC7Iph7qCoFhERhUNszUfVB42knXM6PSQ3H1FnRWPaL3l2cmI-z4CCQCVwGOpsHyw/exec";

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

  const regionPlans = [
    {
      className: "content-region-knowing",
      title: "מכירים את הפרשה",
      order: ["תקציר", "וורט", "עברית", "מושג", "עיון", "מדרש", "הלכה"]
    },
    {
      className: "content-region-stories",
      title: "ספרות",
      order: ["קצרים", "משל", "יצירה", "ראיון", "אסיף"]
    },
    {
      className: "content-region-family",
      title: "לכל המשפחה",
      order: ["משחקים", "סיפור", "פיצוחים", "המחשה", "ילדים"]
    }
  ];

  let jsonpCounter = 0;

  function ensureCss() {
    const href = new URL("shorts.css", shortsRoot).href;

    if (
      Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some((link) => link.href === href)
    ) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.append(link);
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/🔖/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCurrentParasha() {
    const activeChoice = document.querySelector(
      ".parasha-choice.is-active"
    );

    if (activeChoice) {
      const activeName = normalizeText(
        activeChoice.textContent
      );

      if (parashaLabels[activeName]) {
        return activeName;
      }
    }

    const headings = Array.from(
      document.querySelectorAll(
        ".hero h1, .archive-header h1, main h1"
      )
    );

    for (const heading of headings) {
      const name = normalizeText(
        heading.textContent
      )
        .replace(/^פרשת\s+/, "")
        .trim();

      if (parashaLabels[name]) {
        return name;
      }
    }

    return null;
  }

  function getCardLabel(card) {
    return normalizeText(card.querySelector(".eyebrow")?.textContent);
  }

  function jsonp(params) {
    return new Promise((resolve, reject) => {
      const callbackName = "__shortsJsonpCb" + (++jsonpCounter);
      const script = document.createElement("script");
      const query = new URLSearchParams(params);
      query.set("prefix", callbackName);

      const cleanup = () => {
        try {
          delete window[callbackName];
        } catch {
          window[callbackName] = undefined;
        }

        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };

      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("Timeout"));
      }, 15000);

      window[callbackName] = (data) => {
        window.clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        window.clearTimeout(timer);
        cleanup();
        reject(new Error("JSONP failed"));
      };

      script.src =
        WEB_APP_URL +
        (WEB_APP_URL.includes("?") ? "&" : "?") +
        query.toString();

      document.body.appendChild(script);
    });
  }

  function createShortsCard(parashaName) {
    const imageUrl = new URL("shorts.png", shortsRoot).href;
    const card = document.createElement("article");

    card.className = "card shorts-system-card fixed-cover-card";
    card.dataset.parashaName = parashaName;

    card.innerHTML = `
      <a class="card-media shorts-card-open" href="#" aria-label="פתיחת קצרים לפרשת ${parashaName}">
        <img src="${imageUrl}" alt="פתקים, סימניות ולוח תזכורות">
      </a>

      <div class="card-body">
        <div class="eyebrow">קצרים</div>

        <h2>
          <a class="shorts-card-open" href="#">
            מה תרצו לקחת מפרשת ${parashaName}?
          </a>
        </h2>

        <p>
          פנינים קצרות מן הפרשה, מסודרות לפי סוגים — לקריאה מהירה ולמחשבה.
        </p>

        <button class="inline-open-button shorts-card-open-button" type="button">
          לפתיחת הקצרים
        </button>
      </div>
    `;

    bindShortsCard(card, parashaName);
    return card;
  }

  function bindShortsCard(card, parashaName) {
    const open = (event) => {
      event?.preventDefault();
      openShortsInsideCard(card, parashaName);
    };

    card.querySelectorAll(".shorts-card-open").forEach((link) => {
      link.addEventListener("click", open);
    });

    card
      .querySelector(".shorts-card-open-button")
      ?.addEventListener("click", open);
  }

  function saveOriginalCard(card) {
    if (card.dataset.shortsOriginalSaved === "true") {
      return;
    }

    card.dataset.shortsOriginalHtml = card.innerHTML;
    card.dataset.shortsOriginalClass = card.className;
    card.dataset.shortsOriginalSaved = "true";
  }

  function restoreShortsCard(card, parashaName) {
    if (
      !card.dataset.shortsOriginalHtml ||
      !card.dataset.shortsOriginalClass
    ) {
      return;
    }

    card.className = card.dataset.shortsOriginalClass;
    card.innerHTML = card.dataset.shortsOriginalHtml;
    bindShortsCard(card, parashaName);
  }

  function openShortsInsideCard(card, parashaName) {
    saveOriginalCard(card);

    card.classList.add("inline-embed-card", "shorts-inline-card");

    const shell = document.createElement("div");
    shell.className = "inline-embed-shell";

    const toolbar = document.createElement("div");
    toolbar.className = "inline-embed-toolbar";

    const heading = document.createElement("div");
    heading.className = "inline-embed-title";
    heading.textContent = "קצרים";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "inline-back-button";
    close.textContent = "סגירת הכרטיס";

    close.addEventListener("click", () => {
      restoreShortsCard(card, parashaName);
    });

    const app = document.createElement("div");
    app.className = "shorts-app";

    app.innerHTML = `
      <div class="shorts-shell">

        <header class="shorts-hero">
          <p class="shorts-question">
            מה תרצו לקחת מפרשת ${parashaName}?
          </p>
        </header>

        <section
          class="shorts-types"
          aria-label="סוגי קצרים"
        ></section>

        <section
          class="shorts-result-wrap"
          hidden
        >
          <div class="shorts-result-card">
            <div class="shorts-current-type"></div>
            <div class="shorts-items"></div>
          </div>
        </section>

        <div
          class="shorts-message"
          aria-live="polite"
        >
          טוענים קצרים…
        </div>

      </div>
    `;

    toolbar.append(heading, close);
    shell.append(toolbar, app);
    card.replaceChildren(shell);

    loadShorts(app, parashaName);
  }

  async function loadShorts(app, parashaName) {
    const parashaLabel = parashaLabels[parashaName];

    const typesHost = app.querySelector(".shorts-types");
    const resultWrap = app.querySelector(".shorts-result-wrap");
    const currentType = app.querySelector(".shorts-current-type");
    const itemsHost = app.querySelector(".shorts-items");
    const message = app.querySelector(".shorts-message");

    if (!parashaLabel) {
      message.textContent = "לא הצלחנו לזהות את הפרשה.";
      return;
    }

    try {
      const data = await jsonp({
        action: "bootstrap",
        activeParashot: parashaLabel
      });

      if (!data || !data.ok) {
        throw new Error(
          data && data.error
            ? data.error
            : "Bootstrap failed"
        );
      }

      const types = Array.isArray(data.availableTypes)
        ? data.availableTypes
        : [];

      if (!types.length) {
        message.textContent =
          "עדיין אין קצרים זמינים לפרשה זו.";
        return;
      }

      message.textContent = "";

      function selectType(typeObj, button) {
        const items =
          data.itemsByType &&
          Array.isArray(data.itemsByType[typeObj.key])
            ? data.itemsByType[typeObj.key]
            : [];

        typesHost
          .querySelectorAll(".shorts-type-btn")
          .forEach((item) => {
            item.classList.remove("is-active");
          });

        button.classList.add("is-active");

        currentType.textContent =
          `${typeObj.icon || ""} ${typeObj.label || typeObj.key}`.trim();

        itemsHost.replaceChildren();

        if (!items.length) {
          const empty = document.createElement("p");
          empty.className = "shorts-empty";
          empty.textContent = "אין כרגע קצרים מסוג זה.";
          itemsHost.append(empty);
        } else {
          items.forEach((item) => {
            const row = document.createElement("div");
            row.className = "shorts-item";
            row.textContent = item.text || "";
            itemsHost.append(row);
          });
        }

        resultWrap.hidden = false;
      }

      types.forEach((typeObj, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "shorts-type-btn";

        const icon = document.createElement("span");
        icon.className = "shorts-type-icon";
        icon.textContent = typeObj.icon || "";

        const label = document.createElement("span");
        label.className = "shorts-type-text";
        label.textContent = typeObj.label || typeObj.key;

        button.append(icon, label);

        button.addEventListener("click", () => {
          selectType(typeObj, button);
        });

        typesHost.append(button);

        if (index === 0) {
          window.setTimeout(() => {
            selectType(typeObj, button);
          }, 0);
        }
      });
    } catch (error) {
      console.error("Shorts load error:", error);

      message.textContent =
        "לא ניתן היה לטעון כעת את הקצרים.";
    }
  }

  function ensureRegion(grid, plan) {
    let section = grid.querySelector(`.${plan.className}`);

    if (section) {
      return section;
    }

    section = document.createElement("section");
    section.className = `content-region ${plan.className}`;

    const header = document.createElement("div");
    header.className = "content-region-header";

    const heading = document.createElement("h2");
    heading.className = "content-region-title";

    const tabs = document.createElement("div");
    tabs.className = "region-tabs";
    tabs.setAttribute("role", "tablist");

    const panel = document.createElement("div");
    panel.className = "region-panel";

    header.append(heading, tabs);
    section.append(header, panel);

    grid.append(section);

    return section;
  }

  function rebuildRegion(section, plan, cards) {
    const heading = section.querySelector(".content-region-title");
    const tabs = section.querySelector(".region-tabs");
    const panel = section.querySelector(".region-panel");

    if (!tabs || !panel) {
      return;
    }

    if (heading) {
      heading.textContent = plan.title;
    }

    const orderedCards = plan.order
      .map((label) =>
        cards.find((card) => getCardLabel(card) === label)
      )
      .filter(Boolean);

    tabs.replaceChildren();
    panel.replaceChildren();

    orderedCards.forEach((card, index) => {
      const tab = document.createElement("button");

      tab.type = "button";
      tab.className = "region-tab";
      tab.textContent = getCardLabel(card);

      tab.addEventListener("click", () => {
        tabs
          .querySelectorAll(".region-tab")
          .forEach((item) => {
            item.classList.remove("is-active");
          });

        panel
          .querySelectorAll(":scope > .card")
          .forEach((item) => {
            item.classList.remove("is-active");
            item.hidden = true;
          });

        tab.classList.add("is-active");
        card.classList.add("is-active");
        card.hidden = false;
      });

      card.hidden = true;
      card.classList.remove("is-active");

      tabs.append(tab);
      panel.append(card);

      if (index === 0) {
        window.setTimeout(() => {
          tab.click();
        }, 0);
      }
    });
  }

  function reorganizeRegions(parashaName) {
    const grid = document.querySelector(
      ".cards-grid.organized-regions"
    );

    if (!grid) {
      return false;
    }

    const existingShortsCard = grid.querySelector(
      ".shorts-system-card"
    );

    if (
      grid.dataset.shortsOrganized === "true" &&
      existingShortsCard &&
      existingShortsCard.dataset.parashaName === parashaName
    ) {
      return true;
    }

    if (existingShortsCard) {
      existingShortsCard.remove();
    }

    const existingCards = Array.from(
      grid.querySelectorAll(
        ".content-region .region-panel > .card"
      )
    ).filter(
      (card) =>
        !card.classList.contains(
          "shorts-system-card"
        )
    );

    if (!existingCards.length) {
      return false;
    }

    const shortsCard = createShortsCard(
      parashaName
    );

    const allCards = [
      ...existingCards,
      shortsCard
    ];

    regionPlans.forEach((plan) => {
      const section = ensureRegion(
        grid,
        plan
      );

      rebuildRegion(
        section,
        plan,
        allCards
      );

      grid.append(section);
    });

    grid.dataset.shortsOrganized = "true";
    grid.dataset.shortsParasha = parashaName;

    return true;
  }

  function start() {
    ensureCss();

    let scheduledTimer = null;

    const organizeForCurrentParasha = () => {
      const parashaName = getCurrentParasha();

      if (!parashaName) {
        return;
      }

      let attempts = 0;

      const tryOrganize = () => {
        attempts += 1;

        if (
          reorganizeRegions(
            parashaName
          )
        ) {
          return;
        }

        if (attempts < 60) {
          window.setTimeout(
            tryOrganize,
            50
          );
        }
      };

      tryOrganize();
    };

    const scheduleOrganize = () => {
      if (scheduledTimer !== null) {
        window.clearTimeout(
          scheduledTimer
        );
      }

      scheduledTimer = window.setTimeout(
        () => {
          scheduledTimer = null;
          organizeForCurrentParasha();
        },
        30
      );
    };

    const observedRoot =
      document.querySelector("main") ||
      document.body;

    const observer = new MutationObserver(
      scheduleOrganize
    );

    observer.observe(
      observedRoot,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "class",
          "aria-pressed"
        ]
      }
    );

    scheduleOrganize();
  }

  document.addEventListener(
    "DOMContentLoaded",
    start
  );
})();

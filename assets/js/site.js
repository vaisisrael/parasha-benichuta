(() => {
  "use strict";

  const scriptUrl = document.currentScript?.src || "";
  const siteRoot = new URL("../../", scriptUrl || window.location.href);

  const parashaLabels = {
    "בראשית": "1-01 פרשת בראשית", "נח": "1-02 פרשת נח",
    "לך לך": "1-03 פרשת לך לך", "וירא": "1-04 פרשת וירא",
    "חיי שרה": "1-05 פרשת חיי שרה", "תולדות": "1-06 פרשת תולדות",
    "ויצא": "1-07 פרשת ויצא", "וישלח": "1-08 פרשת וישלח",
    "וישב": "1-09 פרשת וישב", "מקץ": "1-10 פרשת מקץ",
    "ויגש": "1-11 פרשת ויגש", "ויחי": "1-12 פרשת ויחי",

    "שמות": "2-01 פרשת שמות", "וארא": "2-02 פרשת וארא",
    "בא": "2-03 פרשת בא", "בשלח": "2-04 פרשת בשלח",
    "יתרו": "2-05 פרשת יתרו", "משפטים": "2-06 פרשת משפטים",
    "תרומה": "2-07 פרשת תרומה", "תצווה": "2-08 פרשת תצווה",
    "כי תשא": "2-09 פרשת כי תשא", "ויקהל": "2-10 פרשת ויקהל",
    "פקודי": "2-11 פרשת פקודי",

    "ויקרא": "3-01 פרשת ויקרא", "צו": "3-02 פרשת צו",
    "שמיני": "3-03 פרשת שמיני", "תזריע": "3-04 פרשת תזריע",
    "מצורע": "3-05 פרשת מצורע", "אחרי מות": "3-06 פרשת אחרי מות",
    "קדושים": "3-07 פרשת קדושים", "אמור": "3-08 פרשת אמור",
    "בהר": "3-09 פרשת בהר", "בחקתי": "3-10 פרשת בחקתי",

    "במדבר": "4-01 פרשת במדבר", "נשא": "4-02 פרשת נשא",
    "בהעלתך": "4-03 פרשת בהעלתך", "שלח": "4-04 פרשת שלח",
    "קורח": "4-05 פרשת קורח", "חקת": "4-06 פרשת חקת",
    "בלק": "4-07 פרשת בלק", "פנחס": "4-08 פרשת פנחס",
    "מטות": "4-09 פרשת מטות", "מסעי": "4-10 פרשת מסעי",

    "דברים": "5-01 פרשת דברים", "ואתחנן": "5-02 פרשת ואתחנן",
    "עקב": "5-03 פרשת עקב", "ראה": "5-04 פרשת ראה",
    "שופטים": "5-05 פרשת שופטים", "כי תצא": "5-06 פרשת כי תצא",
    "כי תבוא": "5-07 פרשת כי תבוא", "נצבים": "5-08 פרשת נצבים",
    "וילך": "5-09 פרשת וילך", "האזינו": "5-10 פרשת האזינו",
    "וזאת הברכה": "5-11 פרשת וזאת הברכה"
  };

  const fixedSectionImages = {
    "ילדים": {
      path: "assets/images/section-covers/children.png",
      alt: "מדור הילדים של פרשת השבוע"
    },
    "אסיף": {
      path: "assets/images/section-covers/asif.png",
      alt: "מדור אסיף"
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
      .replace(/🔖/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCurrentParasha() {
    const headings = Array.from(
      document.querySelectorAll(
        ".hero h1, .archive-header h1, main h1"
      )
    );

    for (const heading of headings) {
      const text = normalizeText(
        heading.textContent
      ).replace(/^פרשת\s+/, "");

      if (parashaLabels[text]) {
        return text;
      }
    }

    return null;
  }

  function normalizeParashaPageHeader(parashaName) {
    if (!parashaName) {
      return;
    }

    const archiveHeader =
      document.querySelector(".archive-header");

    if (!archiveHeader) {
      return;
    }

    archiveHeader.classList.remove(
      "archive-header"
    );

    archiveHeader.classList.add(
      "hero",
      "hero-compact"
    );

    let eyebrow =
      archiveHeader.querySelector(".eyebrow");

    if (!eyebrow) {
      eyebrow = document.createElement("div");
      eyebrow.className = "eyebrow";
      archiveHeader.prepend(eyebrow);
    }

    eyebrow.textContent = "הגיליון השבועי";

    const heading =
      archiveHeader.querySelector("h1");

    if (heading) {
      heading.textContent =
        `פרשת ${parashaName}`;
    }

    archiveHeader
      .querySelectorAll("p")
      .forEach((paragraph) => {
        paragraph.remove();
      });
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
    const toggle =
      document.querySelector(".menu-toggle");

    const nav =
      document.querySelector(".main-nav");

    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const open =
          nav.classList.toggle("open");

        toggle.setAttribute(
          "aria-expanded",
          String(open)
        );
      });
    }

    document
      .querySelectorAll(".has-sub > button")
      .forEach((button) => {
        button.addEventListener(
          "click",
          (event) => {
            event.preventDefault();

            button.parentElement
              .classList
              .toggle("open");
          }
        );
      });
  }

  function removeNavigationItems() {
    const unwanted = new Set([
      "מדורים",
      "דף המשפחה",
      "משחקים"
    ]);

    document
      .querySelectorAll(".main-nav li")
      .forEach((item) => {
        const ownControl =
          item.querySelector(
            ":scope > a, :scope > button"
          );

        if (!ownControl) {
          return;
        }

        const text = normalizeText(
          ownControl.textContent
        );

        if (
          unwanted.has(text) ||
          /^משחקי פרשת\s+/.test(text) ||
          text === "בינה" ||
          text === "בינה מלאכותית"
        ) {
          item.remove();
        }
      });
  }

  function removeHeroDescription() {
    const hero =
      document.querySelector(".hero");

    if (!hero) {
      return;
    }

    hero.querySelectorAll("p")
      .forEach((paragraph) => {
        const text = normalizeText(
          paragraph.textContent
        );

        if (
          text ===
          "כל התכנים של הפרשה הנוכחית במקום אחד — בלי גלישה לפרשה הבאה."
        ) {
          paragraph.remove();
        }
      });

    hero.classList.add("hero-compact");
  }

  function getCardLabel(card) {
    return normalizeText(
      card.querySelector(".eyebrow")
        ?.textContent
    );
  }

  function removeBinaCards() {
    document
      .querySelectorAll(".card")
      .forEach((card) => {
        const label = getCardLabel(card);

        if (
          label === "בינה" ||
          label === "בינה מלאכותית"
        ) {
          card.remove();
        }
      });
  }

  function removeOldGamesContent() {
    document
      .querySelectorAll(".card")
      .forEach((card) => {
        if (
          getCardLabel(card) === "המשחקיה"
        ) {
          card.remove();
        }
      });
  }

  function addGamesCard(parashaName) {
    const gamesUrl =
      getGamesUrl(parashaName);

    const grid =
      document.querySelector(".cards-grid");

    if (
      !gamesUrl ||
      !grid ||
      grid.querySelector(".games-system-card")
    ) {
      return;
    }

    const imageUrl = new URL(
      fixedSectionImages["משחקים"].path,
      siteRoot
    ).href;

    const card =
      document.createElement("article");

    card.className =
      "card games-system-card fixed-cover-card";

    card.dataset.gamesUrl = gamesUrl;

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

  function applyFixedSectionImagesToCards() {
    document
      .querySelectorAll(".card")
      .forEach((card) => {
        const label = getCardLabel(card);

        const imageDefinition =
          fixedSectionImages[label];

        if (!imageDefinition) {
          return;
        }

        const media =
          card.querySelector(".card-media");

        if (!media) {
          return;
        }

        let image =
          media.querySelector("img");

        if (!image) {
          image =
            document.createElement("img");

          media.replaceChildren(image);
        }

        image.src = new URL(
          imageDefinition.path,
          siteRoot
        ).href;

        image.alt = imageDefinition.alt;

        [
          "srcset",
          "sizes",
          "width",
          "height"
        ].forEach((attribute) => {
          image.removeAttribute(attribute);
        });

        card.classList.add(
          "fixed-cover-card"
        );
      });
  }

  function getPostSectionLabel() {
    const text = normalizeText(
      `${
        document.querySelector(".post-meta")
          ?.textContent || ""
      } ${
        document.querySelector(".post-header")
          ?.textContent || ""
      }`
    );

    return (
      Object
        .keys(fixedSectionImages)
        .find((label) => text.includes(label)) ||
      null
    );
  }

  function applyFixedSectionImageToPost() {
    const content =
      document.querySelector(".post-content");

    const imageDefinition =
      fixedSectionImages[
        getPostSectionLabel()
      ];

    const image =
      content?.querySelector("img");

    if (
      !content ||
      !imageDefinition ||
      !image
    ) {
      return;
    }

    image.src = new URL(
      imageDefinition.path,
      siteRoot
    ).href;

    image.alt = imageDefinition.alt;

    [
      "srcset",
      "sizes"
    ].forEach((attribute) => {
      image.removeAttribute(attribute);
    });

    image
      .closest("picture")
      ?.querySelectorAll("source")
      .forEach((source) => {
        source.remove();
      });
  }

  function removePostDate() {
    const header =
      document.querySelector(".post-header");

    if (!header) {
      return;
    }

    header
      .querySelectorAll(".post-date, time")
      .forEach((element) => {
        element.remove();
      });

    const datePattern =
      /^\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*$/;

    header
      .querySelectorAll("span, div, p")
      .forEach((element) => {
        if (element.children.length) {
          return;
        }

        const text = normalizeText(
          element.textContent
        );

        if (datePattern.test(text)) {
          element.remove();
        }
      });
  }

  function normalizePostMainImage() {
    const content =
      document.querySelector(".post-content");

    const image =
      content?.querySelector("img");

    if (!content || !image) {
      return;
    }

    [
      "width",
      "height",
      "srcset",
      "sizes",
      "align",
      "style"
    ].forEach((attribute) => {
      image.removeAttribute(attribute);
    });

    image.classList.add(
      "post-main-image"
    );

    const wrapper =
      image.closest("figure, p, div, a");

    if (
      wrapper &&
      wrapper !== content &&
      content.contains(wrapper)
    ) {
      [
        "width",
        "height",
        "align",
        "style"
      ].forEach((attribute) => {
        wrapper.removeAttribute(attribute);
      });

      wrapper.classList.add(
        "post-main-image-wrap"
      );
    }
  }

  function getCardPostUrl(card) {
    return (
      card.querySelector(
        "h2 a[href], .card-media[href]"
      )?.href ||
      null
    );
  }

  function getClickableCardLinks(card) {
    return Array.from(
      card.querySelectorAll(
        ".card-media[href], h2 a[href]"
      )
    );
  }

  function bindCardLinksToAction(
    card,
    action
  ) {
    getClickableCardLinks(card)
      .forEach((link) => {
        const replacement =
          link.cloneNode(true);

        link.replaceWith(replacement);

        replacement.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            event.stopPropagation();
            action();
          }
        );
      });
  }

  function convertYouTubeUrl(url) {
    try {
      const parsed = new URL(url);

      if (
        parsed.hostname.includes("youtu.be")
      ) {
        const videoId =
          parsed.pathname.replace(/^\/+/, "");

        return videoId
          ? `https://www.youtube.com/embed/${videoId}`
          : null;
      }

      if (
        parsed.hostname.includes(
          "youtube.com"
        )
      ) {
        if (
          parsed.pathname.startsWith(
            "/embed/"
          )
        ) {
          return parsed.href;
        }

        const videoId =
          parsed.searchParams.get("v");

        return videoId
          ? `https://www.youtube.com/embed/${videoId}`
          : null;
      }
    } catch {
      return null;
    }

    return null;
  }

  function extractMediaFromPostHtml(
    html,
    postUrl
  ) {
    const documentCopy =
      new DOMParser().parseFromString(
        html,
        "text/html"
      );

    const content =
      documentCopy.querySelector(
        ".post-content"
      ) ||
      documentCopy.querySelector("article") ||
      documentCopy.body;

    const iframe =
      content.querySelector("iframe[src]");

    if (iframe) {
      return {
        type: "iframe",
        src: new URL(
          iframe.getAttribute("src"),
          postUrl
        ).href,
        title:
          iframe.getAttribute("title") ||
          "המחשה"
      };
    }

    const video =
      content.querySelector("video");

    const directVideoSource =
      video?.getAttribute("src") ||
      video
        ?.querySelector("source[src]")
        ?.getAttribute("src");

    if (directVideoSource) {
      return {
        type: "video",
        src: new URL(
          directVideoSource,
          postUrl
        ).href
      };
    }

    const links = Array.from(
      content.querySelectorAll("a[href]")
    );

    for (const link of links) {
      const href = new URL(
        link.getAttribute("href"),
        postUrl
      ).href;

      const youtubeUrl =
        convertYouTubeUrl(href);

      if (youtubeUrl) {
        return {
          type: "iframe",
          src: youtubeUrl,
          title: "סרטון YouTube"
        };
      }

      if (
        /\.(mp4|webm|ogg)(\?.*)?$/i
          .test(href)
      ) {
        return {
          type: "video",
          src: href
        };
      }
    }

    return null;
  }

  async function findMediaForCard(card) {
    const postUrl =
      getCardPostUrl(card);

    if (!postUrl) {
      return null;
    }

    try {
      const response = await fetch(
        postUrl,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        return null;
      }

      const html = await response.text();

      return extractMediaFromPostHtml(
        html,
        postUrl
      );
    } catch {
      return null;
    }
  }

  function createMediaElement(media) {
    const wrapper =
      document.createElement("div");

    wrapper.className =
      "inline-video-wrap";

    if (media.type === "video") {
      const video =
        document.createElement("video");

      video.src = media.src;
      video.controls = true;
      video.playsInline = true;

      wrapper.append(video);
    } else {
      const iframe =
        document.createElement("iframe");

      iframe.src = media.src;
      iframe.title =
        media.title || "המחשה";

      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

      iframe.allowFullscreen = true;

      wrapper.append(iframe);
    }

    return wrapper;
  }

  function saveOriginalCard(card) {
    if (
      card.dataset.originalSaved === "true"
    ) {
      return;
    }

    card.dataset.originalHtml =
      card.innerHTML;

    card.dataset.originalClass =
      card.className;

    card.dataset.originalSaved = "true";
  }

  function restoreOriginalCard(card) {
    if (
      !card.dataset.originalHtml ||
      !card.dataset.originalClass
    ) {
      return;
    }

    card.className =
      card.dataset.originalClass;

    card.innerHTML =
      card.dataset.originalHtml;

    setupSingleCardAction(card);
  }

  function openInlineContent(
    card,
    title,
    contentElement
  ) {
    saveOriginalCard(card);

    card.classList.add(
      "inline-embed-card"
    );

    const shell =
      document.createElement("div");

    shell.className =
      "inline-embed-shell";

    const toolbar =
      document.createElement("div");

    toolbar.className =
      "inline-embed-toolbar";

    const heading =
      document.createElement("div");

    heading.className =
      "inline-embed-title";

    heading.textContent = title;

    const backButton =
      document.createElement("button");

    backButton.type = "button";

    backButton.className =
      "inline-back-button";

    backButton.textContent =
      "חזרה לכרטיס";

    backButton.addEventListener(
      "click",
      () => {
        restoreOriginalCard(card);
      }
    );

    toolbar.append(
      heading,
      backButton
    );

    shell.append(
      toolbar,
      contentElement
    );

    card.replaceChildren(shell);
  }

  function prepareEmbeddedGames(iframe) {
    try {
      const gameDocument =
        iframe.contentDocument ||
        iframe.contentWindow?.document;

      if (!gameDocument) {
        return;
      }

      const removeHomeLinks = () => {
        gameDocument
          .querySelectorAll("a, button")
          .forEach((element) => {
            const text = normalizeText(
              element.textContent
            );

            if (
              text === "חזרה לדף הבית" ||
              text === "לדף הבית" ||
              text === "חזרה לאתר" ||
              element.classList.contains(
                "back-home"
              ) ||
              element.classList.contains(
                "home-link"
              )
            ) {
              element.remove();
            }
          });
      };

      const openFirstGame = () => {
        if (
          iframe.dataset.firstGameOpened ===
          "true"
        ) {
          return;
        }

        const candidates = Array.from(
          gameDocument.querySelectorAll(
            "button, [role='button'], a[href], .game-card, .game-button, [data-game]"
          )
        );

        const preferredGames = [
          "גלילון",
          "מגירון",
          "חכמון",
          "מה ההבדל",
          "זיכרון",
          "חקי הבלש"
        ];

        let target = null;

        for (
          const gameName
          of preferredGames
        ) {
          target = candidates.find(
            (element) =>
              normalizeText(
                element.textContent
              ).includes(gameName)
          );

          if (target) {
            break;
          }
        }

        if (target) {
          iframe.dataset.firstGameOpened =
            "true";

          target.click();
        }
      };

      removeHomeLinks();
      openFirstGame();

      if (!iframe._gamesObserver) {
        iframe._gamesObserver =
          new MutationObserver(() => {
            removeHomeLinks();
            openFirstGame();
          });

        iframe._gamesObserver.observe(
          gameDocument.documentElement,
          {
            childList: true,
            subtree: true
          }
        );
      }
    } catch {
      /*
        אם הדפדפן מונע גישה ל-iframe,
        המשחקייה עדיין תוצג כרגיל.
      */
    }
  }

  function openGamesInsideCard(card) {
    const gamesUrl =
      card.dataset.gamesUrl;

    if (!gamesUrl) {
      return;
    }

    const iframe =
      document.createElement("iframe");

    iframe.className =
      "inline-embed-frame";

    iframe.src = gamesUrl;

    iframe.title =
      "משחקי פרשת השבוע";

    iframe.loading = "eager";
    iframe.allowFullscreen = true;

    iframe.addEventListener(
      "load",
      () => {
        iframe.dataset.firstGameOpened =
          "false";

        prepareEmbeddedGames(iframe);

        [
          250,
          600,
          1200,
          2200
        ].forEach((delay) => {
          window.setTimeout(() => {
            prepareEmbeddedGames(iframe);
          }, delay);
        });
      }
    );

    openInlineContent(
      card,
      "משחקי פרשת השבוע",
      iframe
    );
  }

  function appendReadLink(card) {
    if (
      card.querySelector(".read-link")
    ) {
      return;
    }

    const body =
      card.querySelector(".card-body");

    const postUrl =
      getCardPostUrl(card);

    if (!body || !postUrl) {
      return;
    }

    const link =
      document.createElement("a");

    link.className = "read-link";
    link.href = postUrl;

    link.textContent =
      "לקריאת הפוסט";

    body.append(link);
  }

  function setupGamesAction(card) {
    const body =
      card.querySelector(".card-body");

    if (!body) {
      return;
    }

    body
      .querySelectorAll(
        ".read-link, .inline-open-button, .card-action-loading"
      )
      .forEach((element) => {
        element.remove();
      });

    const openGames = () => {
      openGamesInsideCard(card);
    };

    bindCardLinksToAction(
      card,
      openGames
    );

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "inline-open-button";

    button.textContent =
      "לפתיחת המשחקים";

    button.addEventListener(
      "click",
      openGames
    );

    body.append(button);
  }

  async function setupIllustrationAction(
    card
  ) {
    const body =
      card.querySelector(".card-body");

    if (!body) {
      return;
    }

    body
      .querySelectorAll(
        ".read-link, .inline-open-button, .card-action-loading"
      )
      .forEach((element) => {
        element.remove();
      });

    const mediaPromise =
      findMediaForCard(card);

    const loading =
      document.createElement("span");

    loading.className =
      "card-action-loading";

    loading.textContent =
      "בודק את ההמחשה…";

    body.append(loading);

    const openIllustration =
      async () => {
        const media =
          card._inlineMedia ||
          await mediaPromise;

        if (media) {
          card._inlineMedia = media;

          openInlineContent(
            card,
            "המחשה לפרשת השבוע",
            createMediaElement(media)
          );
        }
      };

    bindCardLinksToAction(
      card,
      openIllustration
    );

    const media =
      await mediaPromise;

    loading.remove();

    if (!media) {
      appendReadLink(card);
      return;
    }

    card._inlineMedia = media;

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "inline-open-button";

    button.textContent =
      "להפעלת ההמחשה";

    button.addEventListener(
      "click",
      openIllustration
    );

    card
      .querySelector(".card-body")
      ?.append(button);
  }

  function setupSingleCardAction(card) {
    const label = getCardLabel(card);

    if (
      label === "משחקים" ||
      label === "המשחקיה"
    ) {
      setupGamesAction(card);
      return;
    }

    if (label === "המחשה") {
      setupIllustrationAction(card);
      return;
    }

    appendReadLink(card);
  }

  function findRegionForCard(card) {
    const label = getCardLabel(card);

    return (
      regionDefinitions.find(
        (region) =>
          region.order.includes(label)
      ) ||
      regionDefinitions[0]
    );
  }

  function createRegionElement(
    region,
    cards
  ) {
    const section =
      document.createElement("section");

    section.className =
      `content-region content-region-${region.id}`;

    const header =
      document.createElement("div");

    header.className =
      "content-region-header";

    const heading =
      document.createElement("h2");

    heading.className =
      "content-region-title";

    heading.textContent =
      region.title;

    const tabs =
      document.createElement("div");

    tabs.className = "region-tabs";

    tabs.setAttribute(
      "role",
      "tablist"
    );

    const panel =
      document.createElement("div");

    panel.className =
      "region-panel";

    cards.sort(
      (cardA, cardB) =>
        region.order.indexOf(
          getCardLabel(cardA)
        ) -
        region.order.indexOf(
          getCardLabel(cardB)
        )
    );

    cards.forEach(
      (card, index) => {
        const tab =
          document.createElement(
            "button"
          );

        tab.type = "button";

        tab.className =
          "region-tab";

        tab.textContent =
          getCardLabel(card) ||
          `תוכן ${index + 1}`;

        tab.addEventListener(
          "click",
          () => {
            tabs
              .querySelectorAll(
                ".region-tab"
              )
              .forEach((otherTab) => {
                otherTab.classList.remove(
                  "is-active"
                );
              });

            panel
              .querySelectorAll(
                ":scope > .card"
              )
              .forEach((otherCard) => {
                otherCard.classList.remove(
                  "is-active"
                );

                otherCard.hidden = true;
              });

            tab.classList.add(
              "is-active"
            );

            card.classList.add(
              "is-active"
            );

            card.hidden = false;
          }
        );

        card.hidden = true;

        tabs.append(tab);
        panel.append(card);
      }
    );

    header.append(
      heading,
      tabs
    );

    section.append(
      header,
      panel
    );

    tabs.firstElementChild?.click();

    return section;
  }

  function organizeParashaCards() {
    const grid =
      document.querySelector(".cards-grid");

    if (
      !grid ||
      grid.classList.contains(
        "organized-regions"
      )
    ) {
      return;
    }

    const cards = Array.from(
      grid.querySelectorAll(
        ":scope > .card"
      )
    );

    if (!cards.length) {
      return;
    }

    const grouped = new Map(
      regionDefinitions.map(
        (region) => [
          region.id,
          []
        ]
      )
    );

    cards.forEach((card) => {
      const region =
        findRegionForCard(card);

      grouped
        .get(region.id)
        .push(card);
    });

    grid.replaceChildren();

    grid.classList.add(
      "organized-regions"
    );

    regionDefinitions.forEach(
      (region) => {
        const regionCards =
          grouped.get(region.id);

        if (regionCards.length) {
          grid.append(
            createRegionElement(
              region,
              regionCards
            )
          );
        }
      }
    );
  }

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      removeNavigationItems();
      removeHeroDescription();
      removeBinaCards();
      removeOldGamesContent();

      removePostDate();
      applyFixedSectionImageToPost();
      normalizePostMainImage();

      setupNavigation();

      const parashaName =
        getCurrentParasha();

      normalizeParashaPageHeader(
        parashaName
      );

      if (parashaName) {
        addGamesCard(parashaName);

        applyFixedSectionImagesToCards();

        document
          .querySelectorAll(".card")
          .forEach(
            setupSingleCardAction
          );

        organizeParashaCards();
      }
    }
  );
})();

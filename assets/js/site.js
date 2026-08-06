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
    "פקודי": "2-11 פרשת פקודי", "ויקרא": "3-01 פרשת ויקרא",
    "צו": "3-02 פרשת צו", "שמיני": "3-03 פרשת שמיני",
    "תזריע": "3-04 פרשת תזריע", "מצורע": "3-05 פרשת מצורע",
    "אחרי מות": "3-06 פרשת אחרי מות", "קדושים": "3-07 פרשת קדושים",
    "אמור": "3-08 פרשת אמור", "בהר": "3-09 פרשת בהר",
    "בחקתי": "3-10 פרשת בחקתי", "במדבר": "4-01 פרשת במדבר",
    "נשא": "4-02 פרשת נשא", "בהעלתך": "4-03 פרשת בהעלתך",
    "שלח": "4-04 פרשת שלח", "קורח": "4-05 פרשת קורח",
    "חקת": "4-06 פרשת חקת", "בלק": "4-07 פרשת בלק",
    "פנחס": "4-08 פרשת פנחס", "מטות": "4-09 פרשת מטות",
    "מסעי": "4-10 פרשת מסעי", "דברים": "5-01 פרשת דברים",
    "ואתחנן": "5-02 פרשת ואתחנן", "עקב": "5-03 פרשת עקב",
    "ראה": "5-04 פרשת ראה", "שופטים": "5-05 פרשת שופטים",
    "כי תצא": "5-06 פרשת כי תצא", "כי תבוא": "5-07 פרשת כי תבוא",
    "נצבים": "5-08 פרשת נצבים", "וילך": "5-09 פרשת וילך",
    "האזינו": "5-10 פרשת האזינו", "וזאת הברכה": "5-11 פרשת וזאת הברכה"
  };

  const fixedSectionImages = {
    "ילדים": { path: "assets/images/section-covers/children.png", alt: "מדור הילדים של פרשת השבוע" },
    "אסיף": { path: "assets/images/section-covers/asif.png", alt: "מדור אסיף" },
    "משחקים": { path: "assets/images/section-covers/games.png", alt: "משחקי פרשת השבוע" },
    "המשחקיה": { path: "assets/images/section-covers/games.png", alt: "משחקי פרשת השבוע" }
  };

  const regionDefinitions = [
    { id: "knowing", title: "מכירים את הפרשה", order: ["תקציר","מושג","וורט","מדרש","עברית","עיון","הלכה","לימוד","פרשה","תנ״ך","תנ\"ך"] },
    { id: "stories", title: "סיפורים ורעיונות", order: ["סיפור","יצירה","משל","ראיון","אסיף","הגות","מחשבה","שיר"] },
    { id: "family", title: "לכל המשפחה", order: ["משחקים","המשחקיה","פיצוחים","המחשה","ילדים","משפחה","חידה","חידות","פעילות"] }
  ];

  function normalizeText(value) {
    return String(value || "").replace(/🔖/g, "").replace(/\s+/g, " ").trim();
  }

  function getCurrentParasha() {
    const headings = Array.from(document.querySelectorAll(".hero h1, .archive-header h1, main h1"));
    for (const heading of headings) {
      const text = normalizeText(heading.textContent).replace(/^פרשת\s+/, "");
      if (parashaLabels[text]) return text;
    }
    return null;
  }

  function normalizeParashaPageHeader(parashaName) {
    if (!parashaName) return;
    const archiveHeader = document.querySelector(".archive-header");
    if (!archiveHeader) return;

    archiveHeader.classList.remove("archive-header");
    archiveHeader.classList.add("hero", "hero-compact");

    let eyebrow = archiveHeader.querySelector(".eyebrow");
    if (!eyebrow) {
      eyebrow = document.createElement("div");
      eyebrow.className = "eyebrow";
      archiveHeader.prepend(eyebrow);
    }

    eyebrow.textContent = "הגיליון השבועי";
    const heading = archiveHeader.querySelector("h1");
    if (heading) heading.textContent = `פרשת ${parashaName}`;
    archiveHeader.querySelectorAll("p").forEach((p) => p.remove());
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

  function removeNavigationItems() {
    const unwanted = new Set(["מדורים", "דף המשפחה", "משחקים"]);
    document.querySelectorAll(".main-nav li").forEach((item) => {
      const own = item.querySelector(":scope > a, :scope > button");
      if (!own) return;
      const text = normalizeText(own.textContent);
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
    const hero = document.querySelector(".hero");
    if (!hero) return;
    hero.querySelectorAll("p").forEach((p) => {
      if (normalizeText(p.textContent) === "כל התכנים של הפרשה הנוכחית במקום אחד — בלי גלישה לפרשה הבאה.") {
        p.remove();
      }
    });
    hero.classList.add("hero-compact");
  }

  function getCardLabel(card) {
    return normalizeText(card.querySelector(".eyebrow")?.textContent);
  }

  function removeBinaCards() {
    document.querySelectorAll(".card").forEach((card) => {
      const label = getCardLabel(card);
      if (label === "בינה" || label === "בינה מלאכותית") card.remove();
    });
  }

  function removeOldGamesContent() {
    document.querySelectorAll(".card").forEach((card) => {
      if (getCardLabel(card) === "המשחקיה") card.remove();
    });
  }

  function addGamesCard(parashaName) {
    const gamesUrl = getGamesUrl(parashaName);
    const grid = document.querySelector(".cards-grid");
    if (!gamesUrl || !grid || grid.querySelector(".games-system-card")) return;

    const imageUrl = new URL(fixedSectionImages["משחקים"].path, siteRoot).href;
    const card = document.createElement("article");
    card.className = "card games-system-card fixed-cover-card";
    card.dataset.gamesUrl = gamesUrl;

    card.innerHTML = `
      <a class="card-media" href="${gamesUrl}" aria-label="משחקי פרשת ${parashaName}">
        <img src="${imageUrl}" alt="משחקי פרשת ${parashaName}">
      </a>
      <div class="card-body">
        <div class="eyebrow">משחקים</div>
        <h2><a href="${gamesUrl}">משחקי פרשת ${parashaName}</a></h2>
        <p>משחקים, חידות ואתגרים אינטראקטיביים סביב פרשת ${parashaName}.</p>
      </div>
    `;
    grid.prepend(card);
  }

  function applyFixedSectionImagesToCards() {
    document.querySelectorAll(".card").forEach((card) => {
      const def = fixedSectionImages[getCardLabel(card)];
      if (!def) return;
      const media = card.querySelector(".card-media");
      if (!media) return;
      let image = media.querySelector("img");
      if (!image) {
        image = document.createElement("img");
        media.replaceChildren(image);
      }
      image.src = new URL(def.path, siteRoot).href;
      image.alt = def.alt;
      ["srcset","sizes","width","height"].forEach((a) => image.removeAttribute(a));
      card.classList.add("fixed-cover-card");
    });
  }

  function getPostSectionLabel() {
    const text = normalizeText(
      `${document.querySelector(".post-meta")?.textContent || ""} ${document.querySelector(".post-header")?.textContent || ""}`
    );
    return Object.keys(fixedSectionImages).find((label) => text.includes(label)) || null;
  }

  function applyFixedSectionImageToPost() {
    const content = document.querySelector(".post-content");
    const def = fixedSectionImages[getPostSectionLabel()];
    const image = content?.querySelector("img");
    if (!content || !def || !image) return;

    image.src = new URL(def.path, siteRoot).href;
    image.alt = def.alt;
    ["srcset","sizes"].forEach((a) => image.removeAttribute(a));
    image.closest("picture")?.querySelectorAll("source").forEach((s) => s.remove());
  }

  function removePostDate() {
    const header = document.querySelector(".post-header");
    if (!header) return;
    header.querySelectorAll(".post-date, time").forEach((el) => el.remove());
    const re = /^\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*$/;
    header.querySelectorAll("span, div, p").forEach((el) => {
      if (!el.children.length && re.test(normalizeText(el.textContent))) el.remove();
    });
  }

  function normalizePostMainImage() {
    const content = document.querySelector(".post-content");
    const image = content?.querySelector("img");
    if (!content || !image) return;

    ["width","height","srcset","sizes","align","style"].forEach((a) => image.removeAttribute(a));
    image.classList.add("post-main-image");

    const wrapper = image.closest("figure, p, div, a");
    if (wrapper && wrapper !== content && content.contains(wrapper)) {
      ["width","height","align","style"].forEach((a) => wrapper.removeAttribute(a));
      wrapper.classList.add("post-main-image-wrap");
    }
  }

  function getCardPostUrl(card) {
    return card.querySelector("h2 a[href], .card-media[href]")?.href || null;
  }

  function getClickableCardLinks(card) {
    return Array.from(card.querySelectorAll(".card-media[href], h2 a[href]"));
  }

  function bindCardLinksToAction(card, action) {
    getClickableCardLinks(card).forEach((link) => {
      const replacement = link.cloneNode(true);
      link.replaceWith(replacement);
      replacement.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        action();
      });
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

  function extractMediaFromPostHtml(html, postUrl) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const content = doc.querySelector(".post-content") || doc.querySelector("article") || doc.body;
    const iframe = content.querySelector("iframe[src]");
    if (iframe) {
      return {
        type: "iframe",
        src: new URL(iframe.getAttribute("src"), postUrl).href,
        title: iframe.getAttribute("title") || "המחשה"
      };
    }

    const video = content.querySelector("video");
    const videoSrc = video?.getAttribute("src") || video?.querySelector("source[src]")?.getAttribute("src");
    if (videoSrc) return { type: "video", src: new URL(videoSrc, postUrl).href };

    for (const link of content.querySelectorAll("a[href]")) {
      const href = new URL(link.getAttribute("href"), postUrl).href;
      const youtube = convertYouTubeUrl(href);
      if (youtube) return { type: "iframe", src: youtube, title: "סרטון YouTube" };
      if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(href)) return { type: "video", src: href };
    }

    return null;
  }

  async function findMediaForCard(card) {
    const postUrl = getCardPostUrl(card);
    if (!postUrl) return null;
    try {
      const response = await fetch(postUrl, { cache: "no-store" });
      if (!response.ok) return null;
      return extractMediaFromPostHtml(await response.text(), postUrl);
    } catch {
      return null;
    }
  }

  function createMediaElement(media) {
    const wrap = document.createElement("div");
    wrap.className = "inline-video-wrap";

    if (media.type === "video") {
      const video = document.createElement("video");
      video.src = media.src;
      video.controls = true;
      video.playsInline = true;
      wrap.append(video);
    } else {
      const iframe = document.createElement("iframe");
      iframe.src = media.src;
      iframe.title = media.title || "המחשה";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      wrap.append(iframe);
    }

    return wrap;
  }

  function saveOriginalCard(card) {
    if (card.dataset.originalSaved === "true") return;
    card.dataset.originalHtml = card.innerHTML;
    card.dataset.originalClass = card.className;
    card.dataset.originalSaved = "true";
  }

  function restoreOriginalCard(card) {
    if (!card.dataset.originalHtml || !card.dataset.originalClass) return;
    card.className = card.dataset.originalClass;
    card.innerHTML = card.dataset.originalHtml;
    setupSingleCardAction(card);
  }

  function openInlineContent(card, title, contentElement) {
    saveOriginalCard(card);
    card.classList.add("inline-embed-card");

    const shell = document.createElement("div");
    shell.className = "inline-embed-shell";

    const toolbar = document.createElement("div");
    toolbar.className = "inline-embed-toolbar";

    const heading = document.createElement("div");
    heading.className = "inline-embed-title";
    heading.textContent = title;

    const back = document.createElement("button");
    back.type = "button";
    back.className = "inline-back-button";
    back.textContent = "חזרה לכרטיס";
    back.addEventListener("click", () => restoreOriginalCard(card));

    toolbar.append(heading, back);
    shell.append(toolbar, contentElement);
    card.replaceChildren(shell);
  }

  function prepareEmbeddedGames(iframe) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      const cleanup = () => {
        doc.querySelectorAll("a, button").forEach((el) => {
          const text = normalizeText(el.textContent);
          if (
            text === "חזרה לדף הבית" ||
            text === "לדף הבית" ||
            text === "חזרה לאתר" ||
            el.classList.contains("back-home") ||
            el.classList.contains("home-link")
          ) {
            el.remove();
          }
        });
      };

      const openFirst = () => {
        if (iframe.dataset.firstGameOpened === "true") return;
        const candidates = Array.from(
          doc.querySelectorAll("button, [role='button'], a[href], .game-card, .game-button, [data-game]")
        );

        const preferred = ["גלילון", "מגירון", "חכמון", "מה ההבדל", "זיכרון", "חקי הבלש"];
        let target = null;

        for (const name of preferred) {
          target = candidates.find((el) => normalizeText(el.textContent).includes(name));
          if (target) break;
        }

        if (target) {
          iframe.dataset.firstGameOpened = "true";
          target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
          target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          target.click();
        }
      };

      cleanup();
      openFirst();

      if (!iframe._gamesObserver) {
        iframe._gamesObserver = new MutationObserver(() => {
          cleanup();
          openFirst();
        });
        iframe._gamesObserver.observe(doc.documentElement, { childList: true, subtree: true });
      }
    } catch {}
  }

  function openGamesInsideCard(card) {
    const gamesUrl = card.dataset.gamesUrl;
    if (!gamesUrl) return;

    const iframe = document.createElement("iframe");
    iframe.className = "inline-embed-frame";
    iframe.src = gamesUrl;
    iframe.title = "משחקי פרשת השבוע";
    iframe.loading = "eager";
    iframe.allowFullscreen = true;

    iframe.addEventListener("load", () => {
      iframe.dataset.firstGameOpened = "false";
      prepareEmbeddedGames(iframe);
      [250, 600, 1200, 2200].forEach((ms) => setTimeout(() => prepareEmbeddedGames(iframe), ms));
    });

    openInlineContent(card, "משחקי פרשת השבוע", iframe);
  }

  function appendReadLink(card) {
    if (card.querySelector(".read-link")) return;
    const body = card.querySelector(".card-body");
    const url = getCardPostUrl(card);
    if (!body || !url) return;
    const link = document.createElement("a");
    link.className = "read-link";
    link.href = url;
    link.textContent = "לקריאת הפוסט";
    body.append(link);
  }

  function setupGamesAction(card) {
    const body = card.querySelector(".card-body");
    if (!body) return;
    body.querySelectorAll(".read-link, .inline-open-button, .card-action-loading").forEach((el) => el.remove());

    const open = () => openGamesInsideCard(card);
    bindCardLinksToAction(card, open);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "inline-open-button";
    button.textContent = "לפתיחת המשחקים";
    button.addEventListener("click", open);
    body.append(button);
  }

  async function setupIllustrationAction(card) {
    const body = card.querySelector(".card-body");
    if (!body) return;
    body.querySelectorAll(".read-link, .inline-open-button, .card-action-loading").forEach((el) => el.remove());

    const mediaPromise = findMediaForCard(card);
    const loading = document.createElement("span");
    loading.className = "card-action-loading";
    loading.textContent = "בודק את ההמחשה…";
    body.append(loading);

    const open = async () => {
      const media = card._inlineMedia || await mediaPromise;
      if (media) {
        card._inlineMedia = media;
        openInlineContent(card, "המחשה לפרשת השבוע", createMediaElement(media));
      }
    };

    bindCardLinksToAction(card, open);

    const media = await mediaPromise;
    loading.remove();

    if (!media) {
      appendReadLink(card);
      return;
    }

    card._inlineMedia = media;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "inline-open-button";
    button.textContent = "להפעלת ההמחשה";
    button.addEventListener("click", open);
    card.querySelector(".card-body")?.append(button);
  }

  function setupSingleCardAction(card) {
    const label = getCardLabel(card);
    if (label === "משחקים" || label === "המשחקיה") {
      setupGamesAction(card);
    } else if (label === "המחשה") {
      setupIllustrationAction(card);
    } else {
      appendReadLink(card);
    }
  }

  function findRegionForCard(card) {
    const label = getCardLabel(card);
    return regionDefinitions.find((r) => r.order.includes(label)) || regionDefinitions[0];
  }

  function closeOpenEmbedsInRegion(panel, exceptCard = null) {
    panel
      .querySelectorAll(":scope > .card.inline-embed-card")
      .forEach((openCard) => {
        if (openCard !== exceptCard) {
          restoreOriginalCard(openCard);
        }
      });
  }

  function updateTabsOverflowHint(tabsArea, tabs, hint) {
    const hasOverflow = tabs.scrollWidth > tabs.clientWidth + 4;
    tabsArea.classList.toggle("has-overflow", hasOverflow);
    hint.hidden = !hasOverflow;
  }

  function createRegionElement(region, cards) {
    const section = document.createElement("section");
    section.className = `content-region content-region-${region.id}`;

    const header = document.createElement("div");
    header.className = "content-region-header";

    const heading = document.createElement("h2");
    heading.className = "content-region-title";
    heading.textContent = region.title;

    const tabsArea = document.createElement("div");
    tabsArea.className = "region-tabs-area";

    const tabs = document.createElement("div");
    tabs.className = "region-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", region.title);

    const hint = document.createElement("div");
    hint.className = "region-tabs-hint";
    hint.textContent = "יש מדורים נוספים — החליקו לצדדים";
    hint.hidden = true;

    tabsArea.append(tabs, hint);

    const panel = document.createElement("div");
    panel.className = "region-panel";

    cards.sort(
      (a, b) =>
        region.order.indexOf(getCardLabel(a)) -
        region.order.indexOf(getCardLabel(b))
    );

    cards.forEach((card, index) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "region-tab";
      tab.textContent = getCardLabel(card) || `תוכן ${index + 1}`;

      tab.addEventListener("click", () => {
        const currentlyActive = panel.querySelector(":scope > .card.is-active");

        if (currentlyActive === card) {
          return;
        }

        closeOpenEmbedsInRegion(panel, card);

        tabs.querySelectorAll(".region-tab").forEach((otherTab) => {
          otherTab.classList.remove("is-active");
          otherTab.setAttribute("aria-selected", "false");
          otherTab.tabIndex = -1;
        });

        panel.querySelectorAll(":scope > .card").forEach((otherCard) => {
          otherCard.classList.remove("is-active");
          otherCard.hidden = true;
        });

        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        tab.tabIndex = 0;

        card.classList.add("is-active");
        card.hidden = false;
      });

      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", "false");
      tab.tabIndex = -1;

      card.hidden = true;
      tabs.append(tab);
      panel.append(card);
    });

    header.append(heading, tabsArea);
    section.append(header, panel);

    tabs.firstElementChild?.click();

    const refreshHint = () => {
      updateTabsOverflowHint(tabsArea, tabs, hint);
    };

    requestAnimationFrame(refreshHint);
    window.addEventListener("resize", refreshHint, { passive: true });

    tabs.addEventListener(
      "scroll",
      () => {
        if (tabs.scrollLeft !== 0) {
          hint.classList.add("was-scrolled");
        }
      },
      { passive: true }
    );

    return section;
  }

  function organizeParashaCards() {
    const grid = document.querySelector(".cards-grid");
    if (!grid || grid.classList.contains("organized-regions")) return;

    const cards = Array.from(grid.querySelectorAll(":scope > .card"));
    if (!cards.length) return;

    const grouped = new Map(regionDefinitions.map((r) => [r.id, []]));
    cards.forEach((card) => grouped.get(findRegionForCard(card).id).push(card));

    grid.replaceChildren();
    grid.classList.add("organized-regions");

    regionDefinitions.forEach((region) => {
      const regionCards = grouped.get(region.id);
      if (regionCards.length) grid.append(createRegionElement(region, regionCards));
    });
  }

  const redirectMapUrl = new URL("assets/data/redirect-map.json", siteRoot);

  const oldSiteHosts = new Set([
    "theweekparasha.blogspot.com",
    "www.theweekparasha.blogspot.com",
    "parasha-week.co.il",
    "www.parasha-week.co.il"
  ]);

  async function repairInternalLinks() {
    let redirectMap;

    try {
      const response = await fetch(redirectMapUrl, { cache: "no-store" });
      if (!response.ok) return;
      redirectMap = await response.json();
    } catch {
      return;
    }

    document.querySelectorAll("a[href]").forEach((link) => {
      const rawHref = link.getAttribute("href");
      if (
        !rawHref ||
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:") ||
        rawHref.startsWith("javascript:")
      ) {
        return;
      }

      let originalUrl;
      try {
        originalUrl = new URL(rawHref, window.location.href);
      } catch {
        return;
      }

      if (!oldSiteHosts.has(originalUrl.hostname)) return;

      const keys = [
        originalUrl.pathname,
        decodeURIComponent(originalUrl.pathname),
        originalUrl.pathname.replace(/\/+$/, "")
      ];

      const newPath = keys.map((key) => redirectMap[key]).find(Boolean);
      if (!newPath) return;

      const target = new URL(String(newPath).replace(/^\/+/, ""), siteRoot);
      target.search = originalUrl.search;
      target.hash = originalUrl.hash;
      link.href = target.href;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    removeNavigationItems();
    removeHeroDescription();
    removeBinaCards();
    removeOldGamesContent();
    removePostDate();
    applyFixedSectionImageToPost();
    normalizePostMainImage();
    setupNavigation();

    const parashaName = getCurrentParasha();
    normalizeParashaPageHeader(parashaName);

    if (parashaName) {
      addGamesCard(parashaName);
      applyFixedSectionImagesToCards();
      document.querySelectorAll(".card").forEach(setupSingleCardAction);
      organizeParashaCards();
    }

    repairInternalLinks();
    window.setTimeout(repairInternalLinks, 600);
  });
})();


(() => {
  "use strict";

  /*
    כאשר משחק או סרט פתוחים, ולוחצים על טאב אחר:
    סוגרים קודם את התוכן המוטמע ומחזירים את הכרטיס המקורי.

    שימוש בשלב capture מבטיח שהסגירה תתבצע
    לפני שהקוד הקיים מחליף את הטאב.
  */
  document.addEventListener(
    "click",
    (event) => {
      const selectedTab =
        event.target.closest(".region-tab");

      if (!selectedTab) {
        return;
      }

      /*
        לחיצה חוזרת על הטאב הפעיל אינה סוגרת אותו.
        הסגירה מתבצעת רק בבחירת מדור אחר.
      */
      if (
        selectedTab.classList.contains(
          "is-active"
        )
      ) {
        return;
      }

      document
        .querySelectorAll(
          ".card.inline-embed-card"
        )
        .forEach((openCard) => {
          const backButton =
            openCard.querySelector(
              ".inline-back-button"
            );

          /*
            עדיף להפעיל את כפתור החזרה הקיים,
            משום שהוא גם מחזיר את הכרטיס
            וגם מחבר מחדש את פעולות הלחיצה.
          */
          if (backButton) {
            backButton.click();
            return;
          }

          /*
            גיבוי למקרה שכפתור החזרה לא נמצא.
          */
          const originalHtml =
            openCard.dataset.originalHtml;

          const originalClass =
            openCard.dataset.originalClass;

          if (
            originalHtml &&
            originalClass
          ) {
            openCard.className =
              originalClass;

            openCard.innerHTML =
              originalHtml;
          }
        });
    },
    true
  );
})();

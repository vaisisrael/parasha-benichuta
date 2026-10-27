(() => {
  "use strict";

  let deferredInstallPrompt = null;

  const isStandalone = () => (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );

  const isIos = () => (
    (/iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
      (window.navigator.userAgent.includes("Macintosh") && window.navigator.maxTouchPoints > 1)) &&
    !window.MSStream
  );

  function closeMainMenu() {
    const nav = document.querySelector(".main-nav");
    const toggle = document.querySelector(".menu-toggle");

    nav?.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
  }

  function ensureIosDialog() {
    let dialog = document.querySelector("[data-pwa-install-dialog]");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "pwa-install-dialog";
    dialog.dataset.pwaInstallDialog = "";
    dialog.innerHTML = `
      <div class="pwa-install-dialog-inner">
        <h2>הוספה למסך הבית</h2>
        <p>באייפון ובאייפד אפשר להוסיף את האתר כאייקון:</p>
        <ol>
          <li>לחצו על כפתור השיתוף בדפדפן.</li>
          <li>בחרו „הוספה למסך הבית”.</li>
          <li>אשרו באמצעות „הוסף”.</li>
        </ol>
        <div class="pwa-install-dialog-actions">
          <button type="button" data-pwa-dialog-close>סגירה</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector("[data-pwa-dialog-close]")?.addEventListener("click", () => {
      dialog.close();
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    return dialog;
  }

  function ensureInstallMenuItem() {
    const navList = document.querySelector(".main-nav > ul");
    if (!navList) return null;

    const existing = navList.querySelector("[data-pwa-install-item]");
    if (existing) return existing;

    const item = document.createElement("li");
    item.dataset.pwaInstallItem = "";
    item.hidden = true;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.pwaInstall = "";
    button.textContent = "📱 הוספה למסך הבית";

    item.appendChild(button);
    navList.appendChild(item);

    button.addEventListener("click", async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        item.hidden = true;
      } else if (isIos() && !isStandalone()) {
        const dialog = ensureIosDialog();
        if (typeof dialog.showModal === "function") {
          dialog.showModal();
        } else {
          window.alert("לחצו על שיתוף ובחרו „הוספה למסך הבית”.");
        }
      }

      closeMainMenu();
    });

    return item;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const installItem = ensureInstallMenuItem();
    if (!installItem || isStandalone()) return;

    if (isIos()) {
      installItem.hidden = false;
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;

      if (!isStandalone()) {
        installItem.hidden = false;
      }
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      installItem.hidden = true;
    });
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js").catch(() => {
        // האתר ממשיך לפעול כרגיל גם אם רישום ה-Service Worker נכשל.
      });
    });
  }
})();

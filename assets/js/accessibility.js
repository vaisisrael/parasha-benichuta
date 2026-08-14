(() => {
  "use strict";

  function closeNavigation() {
    const nav = document.querySelector(".main-nav");
    const toggle = document.querySelector(".menu-toggle");

    if (nav) {
      nav.classList.remove("open");
      nav.querySelectorAll(".has-sub.open").forEach((item) => {
        item.classList.remove("open");
      });
    }

    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNavigation();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector("main");
    if (main && !main.id) {
      main.id = "main-content";
    }
  });
})();

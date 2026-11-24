"use strict";

(() => {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!("IntersectionObserver" in window) || !Element.prototype.animate) return;

  const root = document.documentElement;
  const hero = document.querySelector(".hero");
  const heroVisual = document.querySelector(".hero-visual");
  const heroTruck = document.querySelector(".hero-truck");
  const fleetImage = document.getElementById("fleet-image");
  const toggle = document.querySelector(".motion-toggle");
  const truckImages = [heroTruck, ...document.querySelectorAll(".service-image img"), fleetImage];
  const animations = new Map();
  const revisions = new WeakMap();
  const entered = new WeakSet();
  const visibleTrucks = new Set();
  let revealObserver;
  let truckObserver;
  let enabled = false;
  let manualPreference = null;
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;

  function revealGroup(selector, direction = "up", stagger = 85, delay = 0) {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.dataset.reveal = direction;
      element.style.setProperty("--reveal-delay", `${Math.min(index * stagger + delay, 400)}ms`);
    });
  }

  revealGroup(".header-inner", "down");
  revealGroup(".hero-copy > *", "up", 90);
  revealGroup(".hero-backdrop", "scale");
  revealGroup(".visual-note", "up", 0, 300);
  revealGroup(".hero-bottom", "up");
  revealGroup(".benefits-inner > div", "up", 85);
  revealGroup(".section-heading > *", "up", 100);
  revealGroup(".service-card", "up", 130);
  revealGroup(".about-copy > *", "up", 85);
  revealGroup(".about-detail", "up", 120);
  revealGroup(".fleet-copy > *", "up", 90);
  revealGroup(".fleet-display", "right");
  revealGroup(".contact-copy > *", "up", 85);
  revealGroup(".quote-form", "scale", 0, 100);
  revealGroup(".faq-inner > div:first-child > *", "up", 75);
  revealGroup(".faq-list > details", "up", 85);
  revealGroup(".footer-main > *", "up", 65);
  revealGroup(".footer-bottom", "up");

  function cancelTruck(image) {
    revisions.set(image, (revisions.get(image) || 0) + 1);
    animations.get(image)?.cancel();
    animations.delete(image);
  }

  async function driveIn(image, replay = false) {
    cancelTruck(image);
    const revision = revisions.get(image);
    // Decode first so a slow or lazy-loaded image never pops in halfway through.
    try { await image.decode(); } catch { return; }
    if (!enabled || !visibleTrucks.has(image) || revisions.get(image) !== revision) return;
    if (!replay && entered.has(image)) return;
    entered.add(image);

    const isHero = image === heroTruck;
    const isFleet = image === fleetImage;
    const fromLeft = image.closest(".image-mixer") !== null;
    const distance = (fromLeft ? -1 : 1) * (isHero ? 145 : isFleet ? 100 : 78);
    const delay = isHero ? 140 : isFleet ? 120 : 160;
    const animation = image.animate([
      { opacity: 0, translate: `${distance}px 10px`, rotate: `${fromLeft ? -.7 : .7}deg` },
      { offset: .2, opacity: 1 },
      { offset: .73, translate: `${fromLeft ? 6 : -6}px 0px`, rotate: "-.28deg" },
      { offset: .88, translate: "2px 2px", rotate: ".13deg" },
      { opacity: 1, translate: "0px 0px", rotate: "0deg" }
    ], {
      duration: isHero ? 1450 : 1100,
      delay,
      easing: "cubic-bezier(.16,1,.3,1)",
      fill: "both"
    });
    animations.set(image, animation);

    try { await animation.finished; } catch { return; }
    if (!enabled || revisions.get(image) !== revision) return;
    animation.cancel();

    // A brief suspension settle gives the cutout weight, then comes to rest.
    // It does not run endlessly while the visitor is reading.
    const settle = image.animate([
      { translate: "0px 0px", rotate: "0deg" },
      { offset: .24, translate: "0px 2px", rotate: ".1deg" },
      { offset: .52, translate: "0px -1px", rotate: "-.07deg" },
      { offset: .76, translate: "0px 1px", rotate: ".04deg" },
      { translate: "0px 0px", rotate: "0deg" }
    ], { duration: isHero ? 2400 : 1800, easing: "ease-in-out" });
    animations.set(image, settle);
    try { await settle.finished; } catch { return; }
    if (animations.get(image) === settle) animations.delete(image);
  }

  function updateScrollMotion() {
    frame = 0;
    if (!enabled) return;
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, scrollY / scrollable)) : 0;
    root.style.setProperty("--page-progress", progress.toFixed(4));

    if (visibleTrucks.has(heroTruck)) {
      const bounds = hero.getBoundingClientRect();
      const travel = Math.min(1, Math.max(0, -bounds.top / bounds.height));
      const mobile = innerWidth <= 700;
      const x = -travel * (mobile ? 16 : 44) + pointerX;
      const y = -travel * (mobile ? 12 : 28) + pointerY;
      heroVisual.style.setProperty("--hero-truck-x", `${x.toFixed(2)}px`);
      heroVisual.style.setProperty("--hero-truck-y", `${y.toFixed(2)}px`);
      heroVisual.style.setProperty("--hero-backdrop-y", `${(travel * 38).toFixed(2)}px`);
      heroVisual.style.setProperty("--ground-scale", (1 - travel * .08).toFixed(3));
      heroVisual.style.setProperty("--ground-opacity", (.7 - travel * .15).toFixed(3));
    }
  }

  function scheduleScrollMotion() {
    if (enabled && !frame) frame = requestAnimationFrame(updateScrollMotion);
  }

  function handlePointer(event) {
    if (event.pointerType !== "mouse" || !enabled) return;
    const bounds = heroVisual.getBoundingClientRect();
    pointerX = ((event.clientX - bounds.left) / bounds.width - .5) * 12;
    pointerY = ((event.clientY - bounds.top) / bounds.height - .5) * 6;
    scheduleScrollMotion();
  }

  function resetPointer() {
    pointerX = pointerY = 0;
    scheduleScrollMotion();
  }

  function revealFocused(event) {
    let element = event.target;
    while (element && element !== document.body) {
      if (element.hasAttribute("data-reveal")) {
        element.classList.add("is-revealed");
        revealObserver?.unobserve(element);
      }
      element = element.parentElement;
    }
  }

  function replayFleet() {
    if (enabled && visibleTrucks.has(fleetImage)) driveIn(fleetImage, true);
  }

  function enableMotion() {
    if (enabled) return;
    enabled = true;
    toggle.setAttribute("aria-pressed", "true");
    toggle.querySelector("span").textContent = "Pausar animações";
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: "0px 0px -24px 0px" });

    truckObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const image = entry.target;
        if (entry.isIntersecting) {
          visibleTrucks.add(image);
          driveIn(image);
          scheduleScrollMotion();
        } else {
          visibleTrucks.delete(image);
          cancelTruck(image);
        }
      });
    }, { threshold: .12 });

    root.classList.add("motion-ready");
    document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach(element => revealObserver.observe(element));
    truckImages.forEach(image => truckObserver.observe(image));
    window.addEventListener("scroll", scheduleScrollMotion, { passive: true });
    window.addEventListener("resize", scheduleScrollMotion, { passive: true });
    heroVisual.addEventListener("pointermove", handlePointer, { passive: true });
    heroVisual.addEventListener("pointerleave", resetPointer);
    document.addEventListener("focusin", revealFocused);
    document.addEventListener("concresul:fleet-change", replayFleet);
    scheduleScrollMotion();
  }

  function disableMotion() {
    enabled = false;
    toggle.setAttribute("aria-pressed", "false");
    toggle.querySelector("span").textContent = "Ativar animações";
    root.classList.remove("motion-ready");
    revealObserver?.disconnect();
    truckObserver?.disconnect();
    truckImages.forEach(cancelTruck);
    visibleTrucks.clear();
    cancelAnimationFrame(frame);
    frame = 0;
    heroVisual.style.removeProperty("--hero-truck-x");
    heroVisual.style.removeProperty("--hero-truck-y");
    window.removeEventListener("scroll", scheduleScrollMotion);
    window.removeEventListener("resize", scheduleScrollMotion);
    heroVisual.removeEventListener("pointermove", handlePointer);
    heroVisual.removeEventListener("pointerleave", resetPointer);
    document.removeEventListener("focusin", revealFocused);
    document.removeEventListener("concresul:fleet-change", replayFleet);
  }

  toggle.addEventListener("click", () => {
    manualPreference = !enabled;
    if (manualPreference) enableMotion();
    else disableMotion();
  });
  toggle.hidden = false;
  preference.addEventListener("change", () => {
    if (manualPreference === null) preference.matches ? disableMotion() : enableMotion();
  });
  if (!preference.matches) enableMotion();
})();

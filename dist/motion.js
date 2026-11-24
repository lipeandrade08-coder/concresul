"use strict";

(() => {
  if (!("IntersectionObserver" in window) || !Element.prototype.animate) return;

  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const toggle = document.querySelector(".motion-toggle");
  const fleetImage = document.getElementById("fleet-image");
  const heading = document.querySelector(".hero-copy");
  const heroImage = document.querySelector(".hero-truck");
  const truckImages = [...document.querySelectorAll(".service-image img"), fleetImage];
  const sections = document.querySelectorAll(
    ".section-heading, .service-card, .about-copy, .about-details, .fleet-copy, .fleet-display, .contact-copy, .quote-form, .faq-inner > div"
  );
  const targets = [heading, heroImage, ...sections, ...truckImages];
  const seen = new WeakSet();
  const running = new Map();
  let observer;
  let enabled = false;
  let manuallySet = false;

  function animate(element, from, options) {
    running.get(element)?.cancel();

    const animation = element.animate(
      [from, { opacity: 1, translate: "0px 0px" }],
      { easing: "cubic-bezier(.2,.7,.25,1)", fill: "backwards", ...options }
    );

    running.set(element, animation);
    animation.onfinish = () => running.delete(element);
  }

  function animateTruck(image, delay = 0) {
    const hero = image === heroImage;
    const facesRight = image.getAttribute("src").includes("bomba_estacionaria")
      || image.closest(".image-mixer") !== null;
    const distance = hero ? 30 : 18;
    const offset = facesRight ? -distance : distance;

    animate(image, { opacity: 0, translate: `${offset}px 0px` }, {
      duration: hero ? 670 : 420,
      delay
    });
  }

  function reveal(element) {
    seen.add(element);

    if (element === heroImage || truckImages.includes(element)) {
      animateTruck(element, element === heroImage ? 70 : 55);
      return;
    }

    const delay = element.matches(".service-card")
      ? [...element.parentElement.children].indexOf(element) * 65
      : 0;

    animate(element, { opacity: 0, translate: "0px 12px" }, {
      duration: 460,
      delay
    });
  }

  function setEnabled(next) {
    enabled = next;
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.querySelector("span").textContent = enabled ? "Pausar animações" : "Ativar animações";
    document.documentElement.classList.toggle("motion-paused", !enabled);

    observer?.disconnect();

    if (!enabled) {
      running.forEach(animation => animation.cancel());
      running.clear();
      return;
    }

    observer = new IntersectionObserver(entries => {
      if (!enabled) return;
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        observer.unobserve(target);
        if (!seen.has(target)) reveal(target);
      });
    }, { threshold: .08 });

    targets.forEach(element => {
      if (!seen.has(element)) observer.observe(element);
    });
  }

  document.addEventListener("focusin", event => {
    targets.forEach(element => {
      if (!element.contains(event.target)) return;
      observer?.unobserve(element);
      running.get(element)?.finish();
      seen.add(element);
    });
  });

  document.addEventListener("concresul:fleet-change", async () => {
    const selectedUrl = fleetImage.src;
    if (!enabled) return;

    try {
      await fleetImage.decode();
    } catch {
      return;
    }

    if (enabled && fleetImage.src === selectedUrl && seen.has(fleetImage)) animateTruck(fleetImage);
  });

  toggle.addEventListener("click", () => {
    manuallySet = true;
    setEnabled(!enabled);
  });

  preference.addEventListener("change", () => {
    if (!manuallySet) setEnabled(!preference.matches);
  });

  toggle.hidden = false;
  setEnabled(!preference.matches);
})();

"use strict";

(() => {
  const video = document.querySelector(".hero-video");
  const visual = video.closest(".hero-visual");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = navigator.connection;
  let inView = false;

  function shouldPlay() {
    return inView && !document.hidden && !reducedMotion.matches && !connection?.saveData;
  }

  function showPhoto() {
    visual.classList.remove("is-video-playing");
  }

  function syncPlayback() {
    if (!shouldPlay()) {
      video.pause();
      showPhoto();
      if ((reducedMotion.matches || connection?.saveData) && video.hasAttribute("src")) {
        video.removeAttribute("src");
        video.load();
      }
      return;
    }

    if (!video.hasAttribute("src")) video.src = video.dataset.src;
    if (video.paused) video.play()?.catch(showPhoto);
  }

  video.addEventListener("playing", () => {
    if (shouldPlay()) visual.classList.add("is-video-playing");
  });
  video.addEventListener("pause", showPhoto);
  video.addEventListener("error", showPhoto);
  reducedMotion.addEventListener("change", syncPlayback);
  connection?.addEventListener("change", syncPlayback);
  document.addEventListener("visibilitychange", syncPlayback);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    });
    observer.observe(visual);
  } else {
    inView = true;
    syncPlayback();
  }
})();

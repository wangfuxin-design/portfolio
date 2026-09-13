/* 侧边氛围增强脚本 · side-fx.js
   负责：滚动进度、当前分段高亮
*/
(function () {
  "use strict";

  const dots = document.querySelectorAll(".side-dots a");
  const fill = document.getElementById("sideProgressFill");
  const progressEl = document.querySelector(".side-progress");
  if (!dots.length) return;

  const sections = Array.from(dots).map((a) => {
    const id = a.getAttribute("href");
    return id ? document.querySelector(id) : null;
  });

  function setProgress() {
    const html = document.documentElement;
    const scrollable = html.scrollHeight - html.clientHeight;
    const ratio = scrollable > 0 ? html.scrollTop / scrollable : 0;
    const clamped = Math.max(0, Math.min(1, ratio));
    if (fill) fill.style.transform = "scaleY(" + clamped + ")";
    if (progressEl) progressEl.style.setProperty("--progress", clamped);
  }

  function setActive() {
    const threshold = window.innerHeight * 0.45;
    let currentId = "top";

    sections.forEach((sec) => {
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      if (rect.top <= threshold) {
        currentId = sec.id;
      }
    });

    dots.forEach((a) => {
      const href = a.getAttribute("href").slice(1);
      a.classList.toggle("is-active", href === currentId);
    });
  }

  function onScroll() {
    setProgress();
    setActive();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // 初始一次
  onScroll();
})();

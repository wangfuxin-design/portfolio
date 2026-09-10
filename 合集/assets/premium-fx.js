/**
 * premium-fx.js — 合集各页统一高级动效
 * 安全注入：不覆盖已有逻辑；reduced-motion / 触屏自动降级
 */
(function () {
  "use strict";
  if (window.__premiumFxInstalled) return;
  window.__premiumFxInstalled = true;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine =
    window.matchMedia("(hover: hover)").matches &&
    window.matchMedia("(pointer: fine)").matches;

  function css(text) {
    if (document.getElementById("premium-fx-style")) return;
    var s = document.createElement("style");
    s.id = "premium-fx-style";
    s.textContent = text;
    document.head.appendChild(s);
  }

  /* 顶部滚动进度 + 顶部细渐变边 */
  function progress() {
    if (document.getElementById("pfx-progress")) return;
    var bar = document.createElement("div");
    bar.id = "pfx-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    var tick = false;
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = p + "%";
      tick = false;
    }
    function onScroll() {
      if (!tick) {
        tick = true;
        requestAnimationFrame(update);
      }
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  /* 图片进入视口时轻微放大 settle */
  function imageSettle() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var imgs = document.querySelectorAll(
      "main img, article img, section img, .pic img, .cover img, .thumb img"
    );
    if (!imgs.length) return;

    css(
      "#pfx-progress{position:fixed;top:0;left:0;height:2px;width:0;z-index:9999;" +
        "background:linear-gradient(90deg,rgba(158,195,168,.95),rgba(201,184,146,.9));" +
        "pointer-events:none;transition:width .08s linear}" +
        ".pfx-img{opacity:.001;transform:scale(1.04);transition:opacity .7s cubic-bezier(.22,.61,.21,1),transform 1s cubic-bezier(.22,.61,.21,1)}" +
        ".pfx-img.pfx-in{opacity:1;transform:scale(1)}" +
        "@media (prefers-reduced-motion:reduce){.pfx-img{opacity:1!important;transform:none!important;transition:none!important}}"
    );

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("pfx-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -4% 0px", threshold: 0.05 }
    );

    imgs.forEach(function (img, i) {
      // 已有完整加载且在首屏的图不强制隐藏，避免闪一下
      img.classList.add("pfx-img");
      img.style.transitionDelay = Math.min(i * 0.03, 0.2) + "s";
      if (img.complete && img.naturalWidth) {
        // 延迟一帧再观察，保证初始态生效
      }
      io.observe(img);
      // 兜底
      setTimeout(function () {
        img.classList.add("pfx-in");
      }, 2800);
    });
  }

  /* 标题/区块更细腻的 reveal（兼容已有 .reveal） */
  function sectionPolish() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var heads = document.querySelectorAll("section h2, section .sec-head, .section-title");
    heads.forEach(function (h) {
      if (!h.classList.contains("reveal") && !h.classList.contains("vis")) {
        h.classList.add("pfx-head");
      }
    });

    if (!document.getElementById("pfx-head-style")) {
      var s = document.createElement("style");
      s.id = "pfx-head-style";
      s.textContent =
        ".pfx-head{opacity:0;transform:translateY(14px);transition:opacity .65s cubic-bezier(.22,.61,.21,1),transform .65s cubic-bezier(.22,.61,.21,1)}" +
        ".pfx-head.pfx-in{opacity:1;transform:none}" +
        "@media (prefers-reduced-motion:reduce){.pfx-head{opacity:1!important;transform:none!important;transition:none!important}}";
      document.head.appendChild(s);
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("pfx-in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".pfx-head").forEach(function (el) {
      io.observe(el);
      setTimeout(function () {
        el.classList.add("pfx-in");
      }, 2800);
    });
  }

  /* 导航链接 hover 下划线流动（仅当没有复杂 menu 时轻量加） */
  function navGlow() {
    if (!fine || reduce) return;
    var nav = document.querySelector("nav");
    if (!nav) return;
    nav.classList.add("pfx-nav");
    if (!document.getElementById("pfx-nav-style")) {
      var s = document.createElement("style");
      s.id = "pfx-nav-style";
      s.textContent =
        ".pfx-nav{transition:background .35s ease,box-shadow .35s ease,padding .35s ease}" +
        ".pfx-nav a{position:relative}" +
        ".pfx-nav .menu a::after,.pfx-nav a[href^='#']::after{content:'';position:absolute;left:0;right:auto;bottom:-4px;height:1px;width:0;background:currentColor;opacity:.55;transition:width .35s cubic-bezier(.22,.61,.21,1)}" +
        ".pfx-nav .menu a:hover::after,.pfx-nav a[href^='#']:hover::after{width:100%}";
      document.head.appendChild(s);
    }
  }

  /* 卡片/条目鼠标位置高光（若页面已有 .work 高光则跳过） */
  function rowGlow() {
    if (!fine || reduce) return;
    if (document.querySelector(".work")) return; // 合集 index 已有

    var rows = document.querySelectorAll(".card, .item, .lab-card, .video-card, .tile");
    if (!rows.length) return;

    if (!document.getElementById("pfx-row-style")) {
      var s = document.createElement("style");
      s.id = "pfx-row-style";
      s.textContent =
        ".pfx-row{position:relative;isolation:isolate}" +
        ".pfx-row::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .4s;border-radius:inherit;z-index:0;" +
        "background:radial-gradient(420px circle at var(--mx,50%) var(--my,50%),rgba(158,195,168,.10),transparent 60%)}" +
        ".pfx-row:hover::before{opacity:1}";
      document.head.appendChild(s);
    }

    rows.forEach(function (row) {
      row.classList.add("pfx-row");
      row.addEventListener(
        "pointermove",
        function (e) {
          var r = row.getBoundingClientRect();
          row.style.setProperty("--mx", e.clientX - r.left + "px");
          row.style.setProperty("--my", e.clientY - r.top + "px");
        },
        { passive: true }
      );
    });
  }

  /* 页面淡入 */
  function pageIn() {
    if (reduce) return;
    document.documentElement.classList.add("pfx-page");
    if (!document.getElementById("pfx-page-style")) {
      var s = document.createElement("style");
      s.id = "pfx-page-style";
      s.textContent =
        ".pfx-page body{opacity:0;transition:opacity .45s ease}" +
        ".pfx-page.pfx-ready body{opacity:1}" +
        "@media (prefers-reduced-motion:reduce){.pfx-page body{opacity:1!important;transition:none!important}}";
      document.head.appendChild(s);
    }
    requestAnimationFrame(function () {
      document.documentElement.classList.add("pfx-ready");
    });
  }

  function boot() {
    pageIn();
    progress();
    imageSettle();
    sectionPolish();
    navGlow();
    rowGlow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

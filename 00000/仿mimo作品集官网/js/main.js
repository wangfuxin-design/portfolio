/* 仿 MiMo 风格作品集 · 交互脚本 */

(function () {
  "use strict";

  const BRAND = "W A N G   F U X I N";
  const PATTERN_ROWS = 14;
  const SPAN_PER_ROW = 24;
  const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer =
    window.matchMedia("(hover: hover)").matches &&
    window.matchMedia("(pointer: fine)").matches;

  /* ---------- Hero 字母纹理 ---------- */
  function fillPattern(root) {
    if (!root) return;
    const frag = document.createDocumentFragment();
    for (let r = 0; r < PATTERN_ROWS; r++) {
      const row = document.createElement("div");
      row.className = "pattern-row " + (r % 2 === 0 ? "is-odd" : "is-even");
      row.setAttribute("aria-hidden", "true");
      for (let i = 0; i < SPAN_PER_ROW * 2; i++) {
        const span = document.createElement("span");
        span.textContent = BRAND;
        row.appendChild(span);
      }
      frag.appendChild(row);
    }
    root.appendChild(frag);
  }

  function buildHeroPattern() {
    fillPattern(document.getElementById("heroPattern"));
    fillPattern(document.getElementById("heroPatternAlt"));
  }

  /* ---------- 字幕：rAF 驱动速度（进场飞快 → 放缓 → 每 15s 冲一次） ---------- */
  function bindMarqueeSpeed() {
    if (!motionOK) return;

    // 像素/秒：进场极快，常态较慢，待机再冲
    const SPEED_FAST = 520;
    const SPEED_BASE = 42;
    const SPEED_BURST = 300;
    const EASE_MS = 4800;
    const BURST_MS = 1700;
    const IDLE_MS = 15000;

    const rows = Array.from(document.querySelectorAll(".pattern-row"));
    if (!rows.length) return;

    // 每行状态
    const meta = rows.map((row, i) => ({
      el: row,
      dir: i % 2 === 0 ? -1 : 1,
      offset: i % 2 === 0 ? 0 : -0,
      half: 1,
      speed: SPEED_FAST,
    }));

    function measure() {
      meta.forEach((m) => {
        m.half = Math.max(1, m.el.scrollWidth / 2);
        if (m.dir > 0) m.offset = -m.half;
        else if (m.offset <= -m.half || m.offset > 0) m.offset = 0;
      });
    }

    measure();
    window.addEventListener("resize", measure, { passive: true });

    // 速度控制
    let speed = SPEED_FAST;
    let target = SPEED_FAST;
    let mode = "ease"; // ease | hold | burst

    // 立刻满速
    meta.forEach((m) => (m.speed = SPEED_FAST));
    const tEase0 = performance.now();

    setInterval(() => {
      // 待机冲刺
      mode = "burst";
      target = SPEED_BURST;
      meta.forEach((m) => (m.speed = SPEED_BURST));
      setTimeout(() => {
        mode = "ease";
        target = SPEED_BASE;
      }, BURST_MS);
    }, IDLE_MS);

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (mode === "ease") {
        const p = Math.min(1, (now - tEase0) / EASE_MS);
        const e = 1 - Math.pow(1 - p, 3);
        speed = SPEED_FAST + (SPEED_BASE - SPEED_FAST) * e;
        meta.forEach((m) => (m.speed = speed));
      }

      meta.forEach((m) => {
        m.offset += m.speed * m.dir * dt;
        // 无缝回绕
        if (m.dir < 0) {
          if (m.offset <= -m.half) m.offset += m.half;
        } else {
          if (m.offset >= 0) m.offset -= m.half;
        }
        m.el.style.transform = "translate3d(" + m.offset.toFixed(2) + "px,0,0)";
      });

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 页面入场节奏 ---------- */
  function playIntro() {
    requestAnimationFrame(() => {
      document.body.classList.add("is-ready");
    });
  }

  /* ---------- 鼠标跟随反色揭示（Hero 英文层） ---------- */
  function bindHeroInvert() {
    const hero = document.getElementById("hero");
    const alt = document.getElementById("heroAlt");
    if (!hero || !alt) return;

    if (!motionOK || !finePointer) {
      alt.style.display = "none";
      return;
    }

    // 边缘光圈，跟 clip 同步
    let ring = document.getElementById("heroInvertRing");
    if (!ring) {
      ring = document.createElement("div");
      ring.id = "heroInvertRing";
      ring.setAttribute("aria-hidden", "true");
      hero.appendChild(ring);
    }

    const RADIUS = 170;
    const EASE = 0.2;

    let targetX = -400;
    let targetY = -400;
    let curX = -400;
    let curY = -400;
    let targetR = 0;
    let curR = 0;
    let hovering = false;
    let raf = 0;

    function applyClip() {
      const c =
        "circle(" + curR.toFixed(1) + "px at " + curX.toFixed(1) + "px " + curY.toFixed(1) + "px)";
      alt.style.clipPath = c;
      alt.style.webkitClipPath = c;
      ring.style.transform =
        "translate(" + (curX - RADIUS) + "px, " + (curY - RADIUS) + "px)";
      ring.style.width = RADIUS * 2 + "px";
      ring.style.height = RADIUS * 2 + "px";
      ring.style.opacity = curR > 8 ? String(Math.min(1, curR / RADIUS)) : "0";
    }

    function tick() {
      curX += (targetX - curX) * EASE;
      curY += (targetY - curY) * EASE;
      curR += (targetR - curR) * (hovering ? 0.24 : 0.16);
      applyClip();

      const settled =
        Math.abs(targetX - curX) < 0.15 &&
        Math.abs(targetY - curY) < 0.15 &&
        Math.abs(targetR - curR) < 0.2;

      if (hovering || !settled) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
        if (!hovering) {
          curX = targetX;
          curY = targetY;
          curR = 0;
          applyClip();
        }
      }
    }

    function ensureTick() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function onMove(e) {
      const rect = hero.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
      hovering = true;
      targetR = RADIUS;
      ensureTick();
    }

    function onLeave() {
      hovering = false;
      targetR = 0;
      ensureTick();
    }

    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerenter", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave, { passive: true });
  }

  /* ---------- 全页 difference 反色镜（Hero 以外区域） ---------- */
  function bindInvertLens() {
    if (!motionOK || !finePointer) return;

    const lens = document.createElement("div");
    lens.className = "invert-lens";
    lens.setAttribute("aria-hidden", "true");
    document.body.appendChild(lens);

    let x = -200;
    let y = -200;
    let tx = -200;
    let ty = -200;
    let raf = 0;
    let suppressed = false;

    // 反色镜让位区：项目行 / 卡片 / 笔记预览 / 按钮
    const suppressSel =
      ".card, .item-row, .project-row, .project-preview, .project-stack, .note-row, .notes-preview, .notes-layout, .btn, a.magnetic";

    function inSuppressZone(target) {
      if (!target || !target.closest) return false;
      return !!target.closest(suppressSel);
    }

    function tick() {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      lens.style.transform = "translate(" + x + "px, " + y + "px) translate(-50%, -50%)";
      if (Math.abs(tx - x) > 0.2 || Math.abs(ty - y) > 0.2) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    }

    function setSuppressed(on) {
      if (suppressed === on) return;
      suppressed = on;
      lens.classList.toggle("is-shrink", on);
    }

    window.addEventListener(
      "pointermove",
      (e) => {
        const hero = document.getElementById("hero");
        let inHero = false;
        if (hero) {
          const r = hero.getBoundingClientRect();
          inHero =
            e.clientY >= r.top &&
            e.clientY <= r.bottom &&
            e.clientX >= r.left &&
            e.clientX <= r.right;
        }

        // 卡片/列表上：圆镜回缩消失；Hero 内也收起（交给 clip 揭示层）
        const hide = inHero || inSuppressZone(e.target);
        setSuppressed(hide);
        lens.classList.toggle("is-off", inHero);
        lens.classList.toggle("is-on", !hide);

        tx = e.clientX;
        ty = e.clientY;
        if (!raf) raf = requestAnimationFrame(tick);
      },
      { passive: true }
    );

    document.addEventListener("pointerleave", () => {
      lens.classList.remove("is-on");
      setSuppressed(false);
    });
  }

  /* ---------- 项目：键帽弹起 + 右侧堆叠图预览 ---------- */
  function bindItemPop() {
    document.querySelectorAll("#projects .project-row").forEach((row) => {
      row.addEventListener("pointerdown", () => row.classList.add("is-press"));
      ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
        row.addEventListener(evt, () => row.classList.remove("is-press"));
      });
    });
    bindProjectPreview();
  }

  /* ---------- 项目右侧堆叠图：贴在触碰长条右侧对齐处 ---------- */
  function bindProjectPreview() {
    const list = document.getElementById("projectList");
    const stage = document.querySelector("#projects .projects-stage");
    const preview = document.getElementById("projectPreview");
    const stack = document.getElementById("projectStack");
    const dataRoot = document.querySelector("#projects .project-data");
    if (!list || !stage || !preview || !stack || !dataRoot) return;

    const rows = list.querySelectorAll(".project-row");
    let activeId = null;
    let hideTimer = 0;

    function anchorToRow(row) {
      // 仅宽屏用右侧定位；窄屏预览在下方
      if (window.innerWidth <= 1200) {
        preview.style.top = "";
        return;
      }
      const sRect = stage.getBoundingClientRect();
      const rRect = row.getBoundingClientRect();
      // 预览高度约 320，对齐该行中心
      const top = rRect.top - sRect.top + rRect.height / 2 - 160;
      preview.style.top = Math.max(0, top) + "px";
    }

    function clearPreview() {
      if (!activeId) return;
      activeId = null;
      rows.forEach((r) => r.classList.remove("is-active"));
      stack.classList.remove("is-open");
      stack.classList.add("is-close");
      preview.classList.remove("is-visible");
      stack.classList.remove("is-following");
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (activeId) return;
        stack.classList.remove("is-close");
        stack.hidden = true;
        stack.innerHTML = "";
      }, 300);
    }

    function showPreview(id, row) {
      const src = dataRoot.querySelector('[data-id="' + id + '"]');
      if (!src) return;

      clearTimeout(hideTimer);
      const same = activeId === id;
      activeId = id;
      rows.forEach((r) => r.classList.toggle("is-active", r === row));
      anchorToRow(row);

      if (!same) {
        const meta = src.querySelector(".note-meta");
        const imgs = src.querySelectorAll("img");
        stack.classList.remove("is-open", "is-close", "is-following");
        stack.innerHTML = "";
        stack.style.left = "";
        stack.style.top = "";
        imgs.forEach((img) => {
          const card = document.createElement("div");
          card.className = "stack-card";
          const clone = document.createElement("img");
          clone.src = img.getAttribute("src");
          clone.alt = "";
          clone.decoding = "async";
          card.appendChild(clone);
          stack.appendChild(card);
        });
        if (meta) {
          const cap = document.createElement("span");
          cap.className = "stack-caption";
          cap.textContent = meta.textContent;
          stack.appendChild(cap);
        }
      }

      stack.hidden = false;
      stack.style.visibility = "visible";
      preview.classList.add("is-visible");

      void stack.offsetWidth;
      stack.classList.remove("is-close");
      stack.classList.add("is-open");
    }

    rows.forEach((row) => {
      const id = row.getAttribute("data-project");
      row.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "touch") return;
        showPreview(id, row);
      });
      row.addEventListener("focus", () => showPreview(id, row));
      row.addEventListener("click", (e) => {
        if (!finePointer && activeId !== id) {
          e.preventDefault();
          showPreview(id, row);
        }
      });
    });

    list.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "touch") return;
      setTimeout(() => {
        if (!list.matches(":hover") && !list.contains(document.activeElement)) {
          clearPreview();
        }
      }, 50);
    });

    window.addEventListener(
      "scroll",
      () => {
        const row = list.querySelector(".project-row.is-active");
        if (row && activeId) anchorToRow(row);
      },
      { passive: true }
    );
  }

  /* ---------- 笔记：右侧空白区预览 ---------- */
  function bindNotesPreview() {
    const list = document.getElementById("notesList");
    const preview = document.getElementById("note-preview");
    const card = document.getElementById("notesPreviewCard");
    const dataRoot = document.querySelector("#notes .notes-data");
    if (!list || !preview || !card || !dataRoot) return;

    const rows = list.querySelectorAll(".note-row");
    const articles = dataRoot.querySelectorAll("article");
    let activeId = null;
    let tapOpen = false;

    function clearActive() {
      rows.forEach((r) => r.classList.remove("is-active"));
      preview.classList.remove("is-active");
      activeId = null;
      tapOpen = false;
      card.innerHTML =
        '<div class="notes-preview-empty"><span class="peek-tag">PREVIEW</span>' +
        "<p>将鼠标移到左侧笔记上，这里会显示正文预览。</p></div>";
    }

    function showNote(id) {
      const src = dataRoot.querySelector('article[data-id="' + id + '"]');
      if (!src) return;
      if (activeId === id && preview.classList.contains("is-active")) return;

      rows.forEach((r) => {
        r.classList.toggle("is-active", r.getAttribute("data-note") === String(id));
      });

      card.innerHTML = src.innerHTML;
      preview.classList.remove("is-active");
      // reflow 以重播入场动画
      void preview.offsetWidth;
      preview.classList.add("is-active");
      activeId = id;
    }

    rows.forEach((row) => {
      const id = row.getAttribute("data-note");

      row.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "touch") return;
        showNote(id);
        tapOpen = false;
      });

      row.addEventListener("focus", () => showNote(id));

      row.addEventListener("click", (e) => {
        // 桌面：阻止跳到锚点，预览已展示
        if (finePointer) {
          e.preventDefault();
          showNote(id);
          return;
        }
        // 触屏：第一次点开预览，再点保持（不跳转，内容在右侧）
        e.preventDefault();
        if (tapOpen && activeId === id) {
          // 再点收起
          clearActive();
        } else {
          showNote(id);
          tapOpen = true;
        }
      });
    });

    list.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "touch") return;
      // 移出列表时若焦点不在列表内则清空（桌面）
      if (!list.contains(document.activeElement)) {
        // 稍延迟，避免快速滑动闪烁
        setTimeout(() => {
          if (!list.matches(":hover") && !list.contains(document.activeElement)) {
            clearActive();
          }
        }, 80);
      }
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest) return;
      if (!e.target.closest("#notes") ) {
        clearActive();
      }
    });
  }

  /* ---------- 底部三卡：触碰向右延展，其余消失 ---------- */
  function bindWorksPreview() {
    const row = document.getElementById("worksMinis");
    if (!row) return;
    const cards = row.querySelectorAll(".panel-card");

    function clear() {
      row.classList.remove("is-hot");
      cards.forEach((c) => c.classList.remove("is-expand"));
    }

    cards.forEach((card) => {
      const open = () => {
        row.classList.add("is-hot");
        cards.forEach((c) => c.classList.toggle("is-expand", c === card));
      };
      const close = () => clear();

      card.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "touch") return;
        open();
      });
      card.addEventListener("pointerleave", (e) => {
        if (e.pointerType === "touch") return;
        setTimeout(() => {
          if (!row.matches(":hover")) close();
        }, 20);
      });
      card.addEventListener("focus", open);
      card.addEventListener("blur", close);
      card.addEventListener("click", (e) => {
        if (!finePointer) {
          if (!card.classList.contains("is-expand")) {
            e.preventDefault();
            open();
          }
        }
      });
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest || !e.target.closest("#worksMinis")) {
        if (finePointer) return;
        clear();
      }
    });
  }

  /* ---------- 精选大卡：悬停自动轮播 ---------- */
  function bindLandscapeSlideshow() {
    document.querySelectorAll(".card-lg[data-slideshow]").forEach((card) => {
      const slides = card.querySelectorAll(".card-slide");
      const dots = card.querySelectorAll(".card-dots span");
      if (slides.length < 2) return;

      let idx = 0;
      let timer = 0;

      function show(i) {
        idx = i % slides.length;
        slides.forEach((s, n) => s.classList.toggle("is-on", n === idx));
        if (dots.length) {
          dots.forEach((d, n) => d.classList.toggle("is-on", n === idx));
        }
      }

      function start() {
        if (timer) return;
        card.classList.add("is-slideshow");
        timer = setInterval(() => show(idx + 1), 1400);
      }

      function stop() {
        clearInterval(timer);
        timer = 0;
        card.classList.remove("is-slideshow");
        show(0);
      }

      card.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "touch") return;
        start();
      });
      card.addEventListener("pointerleave", (e) => {
        if (e.pointerType === "touch") return;
        stop();
      });
      card.addEventListener("focus", start);
      card.addEventListener("blur", stop);
      card.addEventListener("click", (e) => {
        if (!finePointer && !card.classList.contains("is-slideshow")) {
          e.preventDefault();
          start();
        }
      });
    });
  }

  /* ---------- 滚动进度条 ---------- */
  function bindScrollProgress() {
    if (!motionOK) return;
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = p + "%";
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  /* ---------- 磁吸按钮 ---------- */
  function bindMagnetic() {
    if (!motionOK || !finePointer) return;

    document.querySelectorAll(".magnetic").forEach((el) => {
      const strength = 10;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform =
          "translate(" + (x / r.width) * strength + "px, " + (y / r.height) * strength + "px)";
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "translate(0, 0)";
      });
    });
  }

  /* ---------- 卡片 3D 倾斜 ---------- */
  function bindCardTilt() {
    if (!motionOK || !finePointer) return;

    document.querySelectorAll(".card[data-tilt]").forEach((card) => {
      const max = 7;
      card.classList.add("is-tilting");
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * max * 2;
        const ry = (px - 0.5) * max * 2;
        card.style.transform =
          "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-4px)";
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ---------- 导航滚动态 ---------- */
  function bindNavScroll() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const onScroll = () => {
      nav.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- 移动端菜单 ---------- */
  function bindMobileNav() {
    const burger = document.getElementById("navBurger");
    const panel = document.getElementById("navMobile");
    if (!burger || !panel) return;

    const close = () => {
      panel.hidden = true;
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "打开菜单");
    };
    const open = () => {
      panel.hidden = false;
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "关闭菜单");
    };

    burger.addEventListener("click", () => {
      if (panel.hidden) open();
      else close();
    });
    panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) close();
    });
  }

  /* ---------- 滚动显现（含列表错落） ---------- */
  function bindReveal() {
    const targets = document.querySelectorAll(
      ".section-header, .about-grid, .showcase, .item-list, .contact-intro, .contact-banner"
    );
    targets.forEach((el) => el.classList.add("reveal"));

    if (!("IntersectionObserver" in window) || !motionOK) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
    );
    targets.forEach((el) => io.observe(el));
  }

  /* ---------- 卡片键盘可达 ---------- */
  function bindCards() {
    document.querySelectorAll(".card").forEach((card) => {
      if (card.tagName !== "A") {
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "link");
        card.setAttribute("aria-label", "查看项目详情");
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            card.click();
          }
        });
      }
    });
  }

  /* ---------- 黑框缩略图：点击放大灯箱 ---------- */
  function bindThumbsLightbox() {
    const box = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");
    const btnClose = document.getElementById("lightboxClose");
    const btnPrev = document.getElementById("lightboxPrev");
    const btnNext = document.getElementById("lightboxNext");
    if (!box || !img) return;

    /** 当前图集：css background-image 里的 url */
    let gallery = [];
    let idx = 0;

    function urlFromEl(el) {
      const bg = getComputedStyle(el).backgroundImage || "";
      const m = bg.match(/url\(["']?(.*?)["']?\)/);
      return m ? m[1] : "";
    }

    function openAt(i) {
      if (!gallery.length) return;
      idx = ((i % gallery.length) + gallery.length) % gallery.length;
      img.src = gallery[idx];
      box.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function close() {
      box.hidden = true;
      img.src = "";
      document.body.style.overflow = "";
    }

    document.querySelectorAll(".panel-thumbs").forEach((row) => {
      row.querySelectorAll("i").forEach((el, i, list) => {
        el.style.pointerEvents = "auto";
        el.style.cursor = "zoom-in";
        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          gallery = Array.from(list).map(urlFromEl).filter(Boolean);
          openAt(i);
        });
      });
    });

    btnClose && btnClose.addEventListener("click", close);
    btnPrev && btnPrev.addEventListener("click", () => openAt(idx - 1));
    btnNext && btnNext.addEventListener("click", () => openAt(idx + 1));
    box.addEventListener("click", (e) => {
      if (e.target === box) close();
    });
    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") openAt(idx - 1);
      if (e.key === "ArrowRight") openAt(idx + 1);
    });
  }

  /* ---------- 启动 ---------- */
  function init() {
    buildHeroPattern();
    bindMarqueeSpeed();
    playIntro();
    bindHeroInvert();
    bindInvertLens();
    bindItemPop();
    bindNotesPreview();
    bindWorksPreview();
    bindLandscapeSlideshow();
    bindScrollProgress();
    bindMagnetic();
    bindCardTilt();
    bindNavScroll();
    bindMobileNav();
    bindReveal();
    bindCards();
    bindThumbsLightbox();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ==========================================================
   RACORS — interactions only (no API, content is server-rendered)
   Each block registers one function on window.Racors; the boot
   block at the end runs them all.
   ========================================================== */

/* Page loader: waits for window load and lets the logo-fill animation finish.
   Sets html.is-loaded (starts the hero entrance). Safety timeout: 5s. */
(function () {
  "use strict";
  var root = document.documentElement;
  var loader = document.getElementById("rcPreloader");
  if (!loader) return;
  root.classList.add("is-loading");

  var start = Date.now();
  var MIN_SHOW = 2800;
  var MAX_WAIT = 5000;  // ms – never block the page longer than this
  var done = false;

  function finish() {
    if (done) return;
    done = true;
    setTimeout(function () {
      root.classList.remove("is-loading");
      root.classList.add("is-loaded");
      loader.setAttribute("aria-hidden", "true");
      setTimeout(function () { loader.remove(); }, 900);
      document.dispatchEvent(new CustomEvent("racors:loaded"));
    }, Math.max(0, MIN_SHOW - (Date.now() - start)));
  }

  if (document.readyState === "complete") finish();
  else window.addEventListener("load", finish);
  setTimeout(finish, MAX_WAIT);
})();

/* Smooth scrolling (Lenis): inertia wheel scrolling + smooth anchor links with header offset.
   Disabled for prefers-reduced-motion and if the library fails to load (native smooth scroll is used). */
(function () {
  "use strict";
  var R = (window.Racors = window.Racors || {});
  R.smoothScroll = function () {
    if (typeof window.Lenis !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Anchor offset for the sticky header comes from CSS `scroll-padding-top` (Lenis reads it).
    var lenis = new Lenis({ autoRaf: true, lerp: 0.09, smoothWheel: true, anchors: true });
    R.lenis = lenis;

    // Pause while the loader, a modal or the mobile menu is open
    if (document.documentElement.classList.contains("is-loading")) {
      lenis.stop();
      document.addEventListener("racors:loaded", function () { lenis.start(); }, { once: true });
    }
    ["show.bs.modal", "show.bs.offcanvas"].forEach(function (ev) {
      document.addEventListener(ev, function () { lenis.stop(); });
    });
    ["hidden.bs.modal", "hidden.bs.offcanvas"].forEach(function (ev) {
      document.addEventListener(ev, function () { lenis.start(); });
    });
  };

  /* Shared helper: smooth-scroll to an element (Lenis if active, native otherwise) */
  R.scrollTo = function (el) {
    if (!el) return;
    if (R.lenis) R.lenis.scrollTo(el, { force: true });
    else el.scrollIntoView({ behavior: "smooth" });
  };
})();

/* Hero slider (Swiper): horizontal slide with parallax layers, autoplay with progress dots,
   swipe, keyboard, arrows. Works with any number of server-rendered slides (1 slide = static hero). */
(function () {
  "use strict";
  var R = (window.Racors = window.Racors || {});
  R.heroSlider = function () {
    var el = document.querySelector('[data-component="hero-slider"]');
    if (!el || typeof window.Swiper !== "function") return;

    var slides = el.querySelectorAll(".swiper-slide");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var multi = slides.length > 1;

    if (!multi) { el.classList.add("is-single"); return; }

    var swiper = new Swiper(el, {
      speed: reduce ? 0 : 1200,
      parallax: !reduce,
      loop: true,
      grabCursor: true,
      keyboard: { enabled: true, onlyInViewport: true },
      autoplay: reduce ? false : { delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true },
      pagination: {
        el: el.querySelector(".rc-hero-pagination"),
        clickable: true,
        bulletElement: "button",
        bulletClass: "rc-hero-dot",
        bulletActiveClass: "is-active"
      },
      a11y: { enabled: true, prevSlideMessage: "Previous slide", nextSlideMessage: "Next slide", paginationBulletMessage: "Go to slide {{index}}" },
      on: {
        autoplayTimeLeft: function (s, time, progress) {
          var dot = el.querySelector(".rc-hero-dot.is-active");
          if (dot) dot.style.setProperty("--rc-progress", String(1 - progress));
        }
      }
    });
    // Start the timer after the page loader has gone, so slide 1 gets its full time
    if (swiper.autoplay && document.documentElement.classList.contains("is-loading")) {
      swiper.autoplay.stop();
      document.addEventListener("racors:loaded", function () { swiper.autoplay.start(); }, { once: true });
    }
    // Load the other slide images once the page is ready (they are lazy in the HTML)
    var preload = function () { el.querySelectorAll('img[loading="lazy"]').forEach(function (img) { img.loading = "eager"; }); };
    if (document.readyState === "complete") preload(); else window.addEventListener("load", preload);
  };
})();

/* Shared helper: split an element's text into letters for the "text morph swipe" effect.
   Screen readers keep the full word (aria-label); other child elements (icons) are kept.
   Skipped for scripts that must not be split (e.g. Arabic letters join together). */
(function () {
  "use strict";
  var R = (window.Racors = window.Racors || {});
  var SPLITTABLE = /^[\u0020-\u024F\u2010-\u2033]+$/; // Latin, punctuation, quotes/primes
  R.morphText = function (el) {
    if (!el || el.querySelector(".rc-morph")) return;
    var label = el.textContent.replace(/\s+/g, " ").trim();
    if (!label || !SPLITTABLE.test(label)) return;
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", label);
    var wrap = document.createElement("span");
    wrap.className = "rc-morph";
    wrap.setAttribute("aria-hidden", "true");
    Array.prototype.forEach.call(label, function (ch, i) {
      var c = document.createElement("span");
      c.className = "rc-morph__char";
      c.style.setProperty("--i", i);
      c.textContent = ch;
      wrap.appendChild(c);
    });
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3 || (n.nodeType === 1 && n.hasAttribute("data-field") && !n.children.length)) el.removeChild(n);
    });
    el.insertBefore(wrap, el.firstChild);
  };
})();

/* Dropdown items + tabs: letters morph on hover. Tabs: the blue fill swipes in from the
   direction of the previously active tab (old tab empties towards the new one). */
(function () {
  "use strict";
  var R = (window.Racors = window.Racors || {});
  R.tabsMorph = function () {
    document.querySelectorAll(".rc-dropdown .dropdown-item").forEach(R.morphText);

    document.querySelectorAll(".rc-tabs").forEach(function (group) {
      var tabs = Array.prototype.slice.call(group.querySelectorAll(".rc-tab"));
      tabs.forEach(R.morphText);
      function isOn(t) {
        return t.classList.contains("active") || t.classList.contains("is-active") ||
          t.getAttribute("aria-selected") === "true" || t.getAttribute("aria-pressed") === "true";
      }
      // Work out the swipe direction BEFORE the active tab changes. Bootstrap switches tabs in a
      // document-level capture listener on "click", so we use pointerdown / Enter / Space instead.
      function prepare(next) {
        if (!next) return;
        var prev = tabs.filter(isOn)[0];
        if (prev === next) { next.style.setProperty("--rc-tab-origin", "right"); return; } // toggling off (region filter)
        var fromLeft = !prev || tabs.indexOf(prev) < tabs.indexOf(next);
        next.style.setProperty("--rc-tab-origin", fromLeft ? "left" : "right");
        if (prev) prev.style.setProperty("--rc-tab-origin", fromLeft ? "right" : "left");
      }
      group.addEventListener("pointerdown", function (e) { prepare(e.target.closest(".rc-tab")); }, true);
      group.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") prepare(e.target.closest(".rc-tab"));
      }, true);
      group.addEventListener("keydown", function (e) {      // arrow keys in Bootstrap tabs
        var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (!(e.key in keys)) return;
        var prev = tabs.filter(isOn)[0];
        if (!prev) return;
        var dir = keys[e.key];
        var next = tabs[(tabs.indexOf(prev) + dir + tabs.length) % tabs.length];
        next.style.setProperty("--rc-tab-origin", dir > 0 ? "left" : "right");
        prev.style.setProperty("--rc-tab-origin", dir > 0 ? "right" : "left");
      }, true);
    });
  };
})();

/* Navigation: "text morph swipe" on hover + sliding underline indicator (desktop, ≥1200px).
   - Each link's text is split into letters (screen readers still read the full word via aria-label).
   - The underline follows the hovered / focused tab and returns to the active page on leave. */
(function () {
  "use strict";
  var R = (window.Racors = window.Racors || {});
  R.navMorph = function () {
    var nav = document.querySelector(".rc-nav");
    if (!nav) return;

    // 1. Split link text into letters
    nav.querySelectorAll(":scope > .nav-item > .nav-link:not(.rc-lang)").forEach(R.morphText);

    // 2. Sliding indicator
    var mq = window.matchMedia("(min-width: 1200px)");
    var bar = document.createElement("span");
    bar.className = "rc-nav-indicator";
    bar.setAttribute("aria-hidden", "true");
    nav.appendChild(bar);
    nav.classList.add("has-indicator");

    function moveTo(link) {
      if (!mq.matches || !link) { bar.classList.remove("is-ready"); return; }
      var navBox = nav.getBoundingClientRect();
      var box = link.getBoundingClientRect();
      var padL = parseFloat(getComputedStyle(link).paddingLeft) || 0;
      var padR = parseFloat(getComputedStyle(link).paddingRight) || 0;
      bar.style.width = Math.max(0, box.width - padL - padR) + "px";
      bar.style.transform = "translateX(" + (box.left - navBox.left + padL) + "px)";
      bar.classList.add("is-ready");
    }
    function active() { return nav.querySelector(".nav-link.active"); }

    nav.querySelectorAll(":scope > .nav-item > .nav-link").forEach(function (link) {
      link.addEventListener("mouseenter", function () { moveTo(link); });
      link.addEventListener("focus", function () { moveTo(link); });
    });
    nav.addEventListener("mouseleave", function () { moveTo(active()); });
    nav.addEventListener("focusout", function (e) { if (!nav.contains(e.relatedTarget)) moveTo(active()); });

    // Position without animating on first paint and on resize / font load
    function snap() {
      var t = bar.style.transition;
      bar.style.transition = "none";
      moveTo(active());
      void bar.offsetWidth;
      bar.style.transition = t;
    }
    snap();
    window.addEventListener("resize", snap);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(snap);
    if (mq.addEventListener) mq.addEventListener("change", snap);

    R.setActiveNav = function (link) {           // optional helper for backends / scroll-spy
      nav.querySelectorAll(".nav-link.active").forEach(function (l) { l.classList.remove("active"); l.removeAttribute("aria-current"); });
      if (link) { link.classList.add("active"); link.setAttribute("aria-current", "page"); }
      moveTo(active());
    };
  };
})();

/* Footer social icons: a blue highlight box glides to the hovered / focused icon
   (the icon "morph swipe" itself is pure CSS). */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).socialMorph = function () {
    document.querySelectorAll(".rc-social").forEach(function (wrap) {
      var links = wrap.querySelectorAll("a");
      if (!links.length) return;
      var box = document.createElement("span");
      box.className = "rc-social-indicator";
      box.setAttribute("aria-hidden", "true");
      wrap.insertBefore(box, wrap.firstChild);
      wrap.classList.add("has-indicator");

      var first = true;
      function moveTo(a) {
        var x = a.offsetLeft;
        if (first) {                       // appear in place, then glide from there on
          box.style.transition = "none";
          box.style.transform = "translateX(" + x + "px) scale(.6)";
          void box.offsetWidth;
          box.style.transition = "";
          first = false;
        }
        box.style.width = a.offsetWidth + "px";
        box.style.height = a.offsetHeight + "px";
        box.style.transform = "translateX(" + x + "px) scale(1)";
        wrap.classList.add("is-hovering");
      }
      function leave() {
        wrap.classList.remove("is-hovering");
        box.style.transform = box.style.transform.replace("scale(1)", "scale(.6)");
        first = true;
      }
      links.forEach(function (a) {
        a.addEventListener("mouseenter", function () { moveTo(a); });
        a.addEventListener("focus", function () { moveTo(a); });
      });
      wrap.addEventListener("mouseleave", leave);
      wrap.addEventListener("focusout", function (e) { if (!wrap.contains(e.relatedTarget)) leave(); });
    });
  };
})();

/* Product gallery: thumbnails swap the main image (with a short cross-fade). */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).productGallery = function () {
    document.querySelectorAll('[data-component="product-gallery"]').forEach(function (gallery) {
      var main = gallery.querySelector(".rc-gallery__main img");
      var thumbs = gallery.querySelectorAll(".rc-gallery__thumb");
      if (!main || !thumbs.length) return;
      thumbs.forEach(function (thumb) {
        thumb.addEventListener("click", function () {
          if (thumb.classList.contains("is-active")) return;
          thumbs.forEach(function (t) { t.classList.remove("is-active"); t.setAttribute("aria-pressed", "false"); });
          thumb.classList.add("is-active");
          thumb.setAttribute("aria-pressed", "true");
          main.classList.add("is-swapping");
          var next = new Image();
          next.onload = next.onerror = function () {
            main.src = thumb.getAttribute("data-full");
            main.alt = thumb.getAttribute("data-alt") || main.alt;
            requestAnimationFrame(function () { main.classList.remove("is-swapping"); });
          };
          next.src = thumb.getAttribute("data-full");
        });
      });
    });
  };
})();

/* Product listing filters: any change (checkbox, In Stock switch, sort) submits the GET form,
   so the server returns the filtered page. Page number is reset to 1 on every change.
   On mobile the filter panel has a "Show results" button instead of submitting on each tick. */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).productFilters = function () {
    var form = document.querySelector('[data-component="product-filters"]');
    if (!form) return;
    var desktop = window.matchMedia("(min-width: 992px)");
    var panel = document.getElementById("filterPanel");

    form.addEventListener("change", function (e) {
      var inPanel = panel && panel.contains(e.target);
      if (inPanel && !desktop.matches) return; // mobile: wait for "Show results"
      submit();
    });
    form.addEventListener("submit", function () {
      var page = form.querySelector('input[name="page"]');
      if (page) page.remove();
    });
    function submit() {
      form.classList.add("is-loading");
      if (typeof form.requestSubmit === "function") form.requestSubmit(); else form.submit();
    }
  };
})();

/* Inline forms with [data-validate] (e.g. product enquiry): browser validation with
   Bootstrap styles, then a normal POST. Busy state blocks double submits. */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).formValidate = function () {
    document.querySelectorAll("form[data-validate]").forEach(function (form) {
      var btn = form.querySelector('button[type="submit"]');
      var spinner = form.querySelector('[data-slot="spinner"]');
      form.addEventListener("input", function (e) { e.target.classList.remove("is-invalid"); });
      form.addEventListener("submit", function (e) {
        if (!form.checkValidity()) {
          e.preventDefault();
          form.classList.add("was-validated");
          var first = form.querySelector(":invalid");
          if (first) first.focus();
          return;
        }
        if (btn) { btn.disabled = true; btn.setAttribute("aria-busy", "true"); }
        if (spinner) spinner.classList.remove("d-none");
      });
      window.addEventListener("pageshow", function () {
        if (btn) { btn.disabled = false; btn.removeAttribute("aria-busy"); }
        if (spinner) spinner.classList.add("d-none");
      });
      // Server returned errors/flash -> bring the form into view
      if (form.querySelector('[data-flash]:not(.d-none), .is-invalid')) {
        setTimeout(function () { window.Racors.scrollTo && window.Racors.scrollTo(form); }, 600);
      }
    });
  };
})();

/* Scroll-spy (industry detail): the side menu stays fixed (CSS sticky) while the content scrolls;
   the active item switches automatically to the section in view, and a small bar shows reading progress.
   On mobile the menu is a horizontal sticky bar and the active item is kept in view. */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).scrollSpy = function () {
    var nav = document.querySelector('[data-component="scroll-spy"]');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
    var list = nav.querySelector(".rc-spy__list");
    var bar = nav.querySelector(".rc-spy__progress span");
    var content = sections[0] && sections[0].parentElement;
    var current = -1, ticking = false;

    // Height covered by the sticky header (+ the sticky menu bar on mobile)
    function covered() {
      var header = document.querySelector(".rc-header");
      var h = header ? header.offsetHeight : 64;
      if (!window.matchMedia("(min-width: 992px)").matches) h += nav.offsetHeight;
      return h;
    }
    // A section becomes active once its top passes this line (a third of the way down the screen)
    function activationLine() { return Math.max(covered() + 24, window.innerHeight * 0.33); }
    function setActive(i) {
      if (i === current) return;
      current = i;
      links.forEach(function (a, n) {
        a.classList.toggle("is-active", n === i);
        if (n === i) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
      var a = links[i];
      if (a && list && list.scrollWidth > list.clientWidth) {   // mobile bar: keep active link visible
        list.scrollTo({ left: a.offsetLeft - 16, behavior: "smooth" });
      }
    }
    function update() {
      ticking = false;
      var line = activationLine(), idx = 0;
      sections.forEach(function (sec, n) { if (sec && sec.getBoundingClientRect().top - line <= 0) idx = n; });
      // reached the bottom of the page -> last section
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = sections.length - 1;
      setActive(idx);
      if (bar && content) {
        var r = content.getBoundingClientRect();
        var total = r.height - window.innerHeight + line;
        var read = Math.min(1, Math.max(0, (line - r.top) / Math.max(1, total)));
        bar.style.setProperty("--rc-read", read.toFixed(3));
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    links.forEach(function (a, n) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();          // keep Lenis' own anchor handling from overriding our offset
        var target = sections[n];
        if (!target) return;
        var y = target.getBoundingClientRect().top + window.scrollY - covered() - 24;
        if (window.Racors.lenis) window.Racors.lenis.scrollTo(y);
        else window.scrollTo({ top: y, behavior: "smooth" });
        history.replaceState(null, "", a.getAttribute("href"));
      });
    });
    update();
  };
})();

/* Count-up numbers (about page stats): animate from 0 when they scroll into view. */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).countUp = function () {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var fmt = function (n) { return Math.round(n).toLocaleString("en-US"); };
    function run(el) {
      var target = parseFloat(el.getAttribute("data-count")) || 0;
      if (reduce) { el.textContent = fmt(target); return; }
      var start = null, dur = 1600 + Math.min(800, target / 10);
      function step(t) {
        if (!start) start = t;
        var p = Math.min(1, (t - start) / dur);
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));   // ease-out cubic
        if (p < 1) requestAnimationFrame(step);
      }
      el.textContent = "0";
      requestAnimationFrame(step);
    }
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { if (!reduce) el.textContent = "0"; io.observe(el); });
  };
})();

/* Milestones (any number of years)
   - Year buttons / arrow buttons / keyboard arrows switch the detail card.
   - The timeline scrolls sideways so the active year glides to the centre.
   - A blue line fills up to the active year; edges fade while there is more to scroll.
   - Mouse users can also drag the timeline; touch / trackpad scroll natively. */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).milestones = function () {
    document.querySelectorAll('[data-component="milestones"]').forEach(function (root) {
      var btns = Array.prototype.slice.call(root.querySelectorAll(".rc-mile"));
      var panes = Array.prototype.slice.call(root.querySelectorAll(".rc-mile-pane"));
      var track = root.querySelector(".rc-timeline");
      var list = root.querySelector(".rc-timeline__list");
      var count = root.querySelector(".rc-mile-card__count");
      if (!btns.length || !track) return;
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var current = Math.max(0, btns.findIndex(function (b) { return b.classList.contains("is-active"); }));

      function edges() {
        var scrollable = track.scrollWidth > track.clientWidth + 2;
        track.classList.toggle("is-scrollable", scrollable);
        track.classList.toggle("at-start", track.scrollLeft <= 2);
        track.classList.toggle("at-end", track.scrollLeft + track.clientWidth >= track.scrollWidth - 2);
      }
      function progress() {
        var li = btns[current].parentElement;
        var dot = btns[current].querySelector(".rc-mile__dot");
        var x = li.offsetLeft + (dot ? dot.offsetLeft + dot.offsetWidth / 2 : 10);
        list.style.setProperty("--rc-mile-progress", Math.round(x) + "px");
      }
      function centre(smooth) {
        var li = btns[current].parentElement;
        var left = li.offsetLeft + 9 - track.clientWidth / 2 + Math.min(li.offsetWidth, 160) / 2;
        track.scrollTo({ left: Math.max(0, left), behavior: smooth && !reduce ? "smooth" : "auto" });
      }
      function go(i, opts) {
        opts = opts || {};
        i = (i + btns.length) % btns.length;
        current = i;
        btns.forEach(function (b, n) { b.classList.toggle("is-active", n === i); b.setAttribute("aria-pressed", n === i ? "true" : "false"); });
        panes.forEach(function (p, n) { p.hidden = n !== i; p.classList.toggle("is-active", n === i); });
        if (count) count.textContent = (i + 1) + " / " + btns.length;
        progress();
        centre(opts.smooth !== false);
        if (opts.focus) btns[i].focus({ preventScroll: true });
      }

      btns.forEach(function (b, n) {
        b.addEventListener("click", function (e) { if (track.dataset.dragged) { e.preventDefault(); return; } go(n); });
      });
      root.querySelectorAll(".rc-mile-nav").forEach(function (nav) {
        nav.addEventListener("click", function () { go(current + Number(nav.getAttribute("data-dir"))); });
      });
      root.addEventListener("keydown", function (e) {
        if (!e.target.classList.contains("rc-mile")) return;
        var map = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: btns.length - 1 };
        if (e.key in map) { e.preventDefault(); go(map[e.key], { focus: true }); }
      });

      // Drag to scroll (mouse only)
      var down = false, startX = 0, startLeft = 0;
      track.addEventListener("pointerdown", function (e) {
        if (e.pointerType !== "mouse" || !track.classList.contains("is-scrollable")) return;
        down = true; startX = e.clientX; startLeft = track.scrollLeft; delete track.dataset.dragged;
      });
      window.addEventListener("pointermove", function (e) {
        if (!down) return;
        var dx = e.clientX - startX;
        if (Math.abs(dx) > 5) { track.dataset.dragged = "1"; track.classList.add("is-dragging"); }
        track.scrollLeft = startLeft - dx;
      });
      window.addEventListener("pointerup", function () {
        if (!down) return;
        down = false; track.classList.remove("is-dragging");
        setTimeout(function () { delete track.dataset.dragged; }, 0);
      });
      // Vertical mouse wheel over the timeline scrolls it sideways (only while it can still move)
      track.addEventListener("wheel", function (e) {
        if (!track.classList.contains("is-scrollable") || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        var canLeft = track.scrollLeft > 0, canRight = track.scrollLeft + track.clientWidth < track.scrollWidth - 1;
        if ((e.deltaY < 0 && canLeft) || (e.deltaY > 0 && canRight)) { e.preventDefault(); e.stopPropagation(); track.scrollLeft += e.deltaY; }
      }, { passive: false });

      track.addEventListener("scroll", edges, { passive: true });
      window.addEventListener("resize", function () { edges(); progress(); centre(false); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { edges(); progress(); centre(false); });
      edges();
      go(current, { smooth: false });
    });
  };
})();

/* Floating contact speed-dial: toggle open/close; Esc or an outside click closes it.
   Labels get the letter "morph swipe"; the toggle icon swap is pure CSS. */
(function () {
  "use strict";
  var R = (window.Racors = window.Racors || {});
  R.fab = function () {
    var fab = document.querySelector('[data-component="fab"]');
    if (!fab) return;
    var toggle = fab.querySelector(".rc-fab__toggle");
    var items = fab.querySelectorAll(".rc-fab__item");
    fab.querySelectorAll(".rc-fab__label").forEach(function (l) { if (R.morphText) R.morphText(l); });

    function set(open, focusFirst) {
      fab.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? toggle.dataset.labelClose : toggle.dataset.labelOpen);
      items.forEach(function (a) { a.tabIndex = open ? 0 : -1; });
      if (open && focusFirst) items[items.length - 1].focus();
    }
    set(false);
    toggle.addEventListener("click", function (e) {
      set(!fab.classList.contains("is-open"), e.detail === 0);   // keyboard activation -> move focus into the menu
    });
    document.addEventListener("click", function (e) { if (!fab.contains(e.target)) set(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && fab.classList.contains("is-open")) { set(false); toggle.focus(); }
    });
    items.forEach(function (a) { a.addEventListener("click", function () { setTimeout(function () { set(false); }, 150); }); });
  };
})();

/* Lightbox (images + videos). Any <a data-lightbox="group"> opens it; items of the same group
   form the slideshow (including tiles added later by "Load more").
     data-type="image" | "video"   (YouTube links are detected automatically)
     data-caption="…"  data-poster="…" (video poster)
   Prev/next, counter, caption, thumbnails, keyboard (← → Esc, Tab stays inside), swipe on touch. */
(function () {
  "use strict";
  var R = (window.Racors = window.Racors || {});
  var lb, media, countEl, capEl, thumbsEl, items = [], index = 0, lastFocus = null, group = null;

  function ytId(url) {
    var m = String(url).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    return m ? m[1] : null;
  }
  function typeOf(a) {
    if (ytId(a.getAttribute("href"))) return "youtube";
    return a.getAttribute("data-type") || (/\.(mp4|webm|ogg)(\?|$)/i.test(a.getAttribute("href")) ? "video" : "image");
  }
  function build() {
    lb = document.createElement("div");
    lb.className = "rc-lb";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Gallery viewer");
    lb.setAttribute("data-lenis-prevent", "");
    lb.innerHTML =
      '<div class="rc-lb__bar"><span class="rc-lb__count" aria-live="polite"></span>' +
      '<button type="button" class="rc-lb__btn rc-lb__close" aria-label="Close (Esc)"><i class="bi bi-x-lg"></i></button></div>' +
      '<div class="rc-lb__stage">' +
      '<button type="button" class="rc-lb__btn rc-lb__prev" aria-label="Previous"><i class="bi bi-arrow-left"></i></button>' +
      '<div class="rc-lb__media"></div>' +
      '<button type="button" class="rc-lb__btn rc-lb__next" aria-label="Next"><i class="bi bi-arrow-right"></i></button></div>' +
      '<div class="rc-lb__foot"><p class="rc-lb__caption"></p><div class="rc-lb__thumbs" role="tablist" aria-label="All items"></div></div>';
    document.body.appendChild(lb);
    media = lb.querySelector(".rc-lb__media");
    countEl = lb.querySelector(".rc-lb__count");
    capEl = lb.querySelector(".rc-lb__caption");
    thumbsEl = lb.querySelector(".rc-lb__thumbs");
    lb.querySelector(".rc-lb__close").addEventListener("click", close);
    lb.querySelector(".rc-lb__prev").addEventListener("click", function () { show(index - 1, -1); });
    lb.querySelector(".rc-lb__next").addEventListener("click", function () { show(index + 1, 1); });
    lb.addEventListener("click", function (e) {           // click on the dark backdrop closes
      if (e.target === lb || e.target.classList.contains("rc-lb__stage")) close();
    });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1, 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1, -1); }
      else if (e.key === "Tab") {                            // keep focus inside the dialog
        var f = Array.prototype.filter.call(lb.querySelectorAll("button, video, iframe, [href]"), function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // Swipe (touch / pen)
    var x0 = null, y0 = null;
    var stage = lb.querySelector(".rc-lb__stage");
    stage.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") { x0 = e.clientX; y0 = e.clientY; } });
    stage.addEventListener("pointerup", function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
  }
  function collect(a) {
    group = a.getAttribute("data-lightbox");
    items = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox="' + group + '"]'));
    return items.indexOf(a);
  }
  function renderThumbs() {
    thumbsEl.innerHTML = "";
    items.forEach(function (a, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "rc-lb__thumb"; b.setAttribute("role", "tab");
      b.setAttribute("aria-label", (a.getAttribute("data-caption") || "Item") + " (" + (i + 1) + ")");
      var img = a.querySelector("img");
      b.innerHTML = '<img src="' + (img ? img.currentSrc || img.src : "") + '" alt="">' + (typeOf(a) !== "image" ? '<i class="bi bi-play-fill"></i>' : "");
      b.addEventListener("click", function () { show(i, i > index ? 1 : -1); });
      thumbsEl.appendChild(b);
    });
  }
  function stopMedia() { media.querySelectorAll("video").forEach(function (v) { v.pause(); }); media.innerHTML = ""; }
  function show(i, dir) {
    if (!items.length) return;
    index = (i + items.length) % items.length;
    var a = items[index], type = typeOf(a), href = a.getAttribute("href"), cap = a.getAttribute("data-caption") || "";
    stopMedia();
    media.classList.remove("is-ready", "from-left", "from-right");
    if (dir) media.classList.add(dir > 0 ? "from-right" : "from-left");
    var spinner = document.createElement("span"); spinner.className = "rc-lb__spinner"; media.appendChild(spinner);
    var ready = function () { spinner.remove(); requestAnimationFrame(function () { media.classList.add("is-ready"); media.classList.remove("from-left", "from-right"); }); };

    if (type === "image") {
      var img = new Image();
      img.alt = cap; img.decoding = "async";
      img.onload = img.onerror = ready;
      img.src = href;
      media.appendChild(img);
    } else if (type === "youtube") {
      var wrap = document.createElement("div"); wrap.className = "rc-lb__frame";
      var ifr = document.createElement("iframe");
      ifr.src = "https://www.youtube-nocookie.com/embed/" + ytId(href) + "?autoplay=1&rel=0&modestbranding=1";
      ifr.title = cap || "Video"; ifr.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; ifr.allowFullscreen = true;
      ifr.onload = ready;
      wrap.appendChild(ifr); media.appendChild(wrap);
      setTimeout(ready, 1500);
    } else {
      var v = document.createElement("video");
      v.src = href; v.controls = true; v.playsInline = true; v.autoplay = true; v.preload = "metadata";
      var poster = a.getAttribute("data-poster"); if (poster) v.poster = poster;
      v.setAttribute("aria-label", cap || "Video");
      v.addEventListener("loadeddata", ready, { once: true });
      v.addEventListener("error", ready, { once: true });
      media.appendChild(v);
      setTimeout(ready, 1200);
    }
    countEl.textContent = (index + 1) + " / " + items.length;
    capEl.textContent = cap;
    Array.prototype.forEach.call(thumbsEl.children, function (t, n) {
      t.classList.toggle("is-active", n === index);
      t.setAttribute("aria-selected", n === index ? "true" : "false");
    });
    var at = thumbsEl.children[index];
    if (at) thumbsEl.scrollTo({ left: at.offsetLeft - thumbsEl.clientWidth / 2 + at.offsetWidth / 2, behavior: "smooth" });
    // preload neighbours (images only)
    [index + 1, index - 1].forEach(function (n) {
      var nb = items[(n + items.length) % items.length];
      if (nb && typeOf(nb) === "image") { var p = new Image(); p.src = nb.getAttribute("href"); }
    });
    var multi = items.length > 1;
    lb.querySelector(".rc-lb__prev").hidden = !multi;
    lb.querySelector(".rc-lb__next").hidden = !multi;
    thumbsEl.hidden = !multi;
  }
  function open(a) {
    if (!lb) build();
    lastFocus = document.activeElement;
    var i = collect(a);
    renderThumbs();
    document.documentElement.classList.add("rc-lb-open");
    if (R.lenis) R.lenis.stop();
    lb.classList.add("is-open");
    show(i, 0);
    lb.querySelector(".rc-lb__close").focus();
  }
  function close() {
    if (!lb || !lb.classList.contains("is-open")) return;
    stopMedia();
    lb.classList.remove("is-open");
    document.documentElement.classList.remove("rc-lb-open");
    if (R.lenis) R.lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  R.lightbox = function () {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[data-lightbox]");
      if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      open(a);
    });
  };
})();

/* "Load more": fetch the next page (normal server-rendered HTML, no API), append its tiles,
   and point the button at the page after that (or remove it on the last page).
   If fetching isn't possible (e.g. opened from disk) it simply navigates to the next page. */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).loadMore = function () {
    document.querySelectorAll("[data-load-more]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        var grid = document.querySelector(btn.getAttribute("data-target"));
        if (!grid || !window.fetch || location.protocol === "file:") return;   // fall back to normal navigation
        e.preventDefault();
        if (btn.getAttribute("aria-busy") === "true") return;
        var spinner = btn.querySelector('[data-slot="spinner"]');
        btn.setAttribute("aria-busy", "true");
        if (spinner) spinner.classList.remove("d-none");
        fetch(btn.href, { headers: { "X-Requested-With": "XMLHttpRequest" } })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, "text/html");
            var src = doc.querySelector(btn.getAttribute("data-target"));
            var added = src ? Array.prototype.slice.call(src.children) : [];
            added.forEach(function (node, n) {
              var el = document.importNode(node, true);
              var tile = el.querySelector(".rc-gtile") || el;
              tile.classList.add("is-new");
              tile.style.animationDelay = (n * 60) + "ms";
              grid.appendChild(el);
            });
            var next = doc.querySelector("[data-load-more]");
            if (next && added.length) btn.href = next.href; else btn.parentElement.remove();
            if (added[0]) { var first = grid.children[grid.children.length - added.length].querySelector("a"); if (first) first.focus({ preventScroll: true }); }
          })
          .catch(function () { location.href = btn.href; })
          .finally(function () {
            btn.removeAttribute("aria-busy");
            if (spinner) spinner.classList.add("d-none");
          });
      });
    });
  };
})();

/* Header: shadow when scrolled + close the mobile menu after a link/modal click. */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).header = function () {
    var header = document.querySelector('[data-component="header"]');
    if (!header) return;

    function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    document.querySelectorAll("#rcMenu a.nav-link:not(.dropdown-toggle), #rcMenu .dropdown-item, #rcMenu [data-bs-toggle='modal']")
      .forEach(function (el) {
        el.addEventListener("click", function () {
          var oc = window.bootstrap && bootstrap.Offcanvas.getInstance("#rcMenu");
          if (oc) oc.hide();
        });
      });
  };
})();

/* Fade-up on scroll for .rc-reveal elements. Respects prefers-reduced-motion. */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).reveal = function () {
    var items = document.querySelectorAll(".rc-reveal");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduce) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
  };
})();

/* Industries: Bootstrap tabs do the switching. This only adds deep links (/#industry-marine)
   and keeps the URL hash in sync when a tab is chosen. */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).industryTabs = function () {
    var tabs = document.querySelectorAll('#industries [data-bs-toggle="tab"]');
    if (!tabs.length || !window.bootstrap) return;

    function openFromHash() {
      var hash = window.location.hash;
      if (hash.indexOf("#industry-") !== 0) return;
      var btn = document.querySelector('#industries [data-bs-target="' + hash + '"]');
      if (btn) {
        bootstrap.Tab.getOrCreateInstance(btn).show();
        var go = function () { window.Racors.scrollTo(document.getElementById("industries")); };
        // wait for the page loader to finish so the scroll position is final
        if (document.documentElement.classList.contains("is-loading")) {
          document.addEventListener("racors:loaded", function () { setTimeout(go, 50); }, { once: true });
        } else go();
      }
    }

    tabs.forEach(function (btn) {
      btn.addEventListener("shown.bs.tab", function () {
        history.replaceState(null, "", btn.getAttribute("data-bs-target"));
      });
    });
    window.addEventListener("hashchange", openFromHash);
    openFromHash();
  };
})();

/* Client logo wall: region filter.
   Click a region -> only that region's logos are shown, the others are hidden.
   Click the active region again -> all logos are shown.
   Matching: button data-region === logo data-region. */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).regionFilter = function () {
    var filter = document.querySelector('[data-component="region-filter"]');
    var grid = document.getElementById("logoGrid");
    if (!filter || !grid) return;
    var buttons = filter.querySelectorAll("[data-region]");
    var logos = grid.querySelectorAll(".rc-logo");

    function apply(region) {
      buttons.forEach(function (b) {
        var on = b.getAttribute("data-region") === region;
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.classList.toggle("is-active", on);
      });
      logos.forEach(function (logo) {
        logo.hidden = !!region && logo.getAttribute("data-region") !== region;
      });
    }

    filter.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-region]");
      if (!btn) return;
      var region = btn.getAttribute("data-region");
      apply(btn.getAttribute("aria-pressed") === "true" ? null : region);
    });
  };
})();

/* Testimonials: CSS scroll-snap track + prev/next buttons (wraps at the ends). */
(function () {
  "use strict";
  (window.Racors = window.Racors || {}).testimonialSlider = function () {
    document.querySelectorAll('[data-component="testimonial-slider"]').forEach(function (root) {
      var track = root.querySelector(".rc-testimonials__track");
      if (!track) return;
      root.querySelectorAll(".rc-round-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var card = track.firstElementChild;
          var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
          var step = card ? card.getBoundingClientRect().width + gap : track.clientWidth;
          var dir = Number(btn.getAttribute("data-dir"));
          var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
          var atStart = track.scrollLeft <= 4;
          if (dir > 0 && atEnd) track.scrollTo({ left: 0 });
          else if (dir < 0 && atStart) track.scrollTo({ left: track.scrollWidth });
          else track.scrollBy({ left: dir * step });
        });
      });
    });
  };
})();

/* ==========================================================
   RACORS — app bootstrap
   Each component registers an init function on window.Racors.
   No API calls: all content is rendered by the server in the HTML.
   ========================================================== */
(function () {
  "use strict";
  var R = (window.Racors = window.Racors || {});

  function boot() {
    document.documentElement.classList.remove("no-js");
    document.querySelectorAll("[data-current-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    ["smoothScroll", "heroSlider", "navMorph", "tabsMorph", "socialMorph", "fab", "header", "reveal", "industryTabs", "regionFilter", "testimonialSlider", "productGallery", "productFilters", "formValidate", "scrollSpy", "countUp", "milestones", "lightbox", "loadMore"].forEach(function (name) {
      if (typeof R[name] !== "function") return;
      try { R[name](); } catch (err) { console.error("[racors] " + name + " failed", err); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

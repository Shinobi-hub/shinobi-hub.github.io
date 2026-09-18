/* ==========================================================================
   Shubham Dutta — site.js
   --------------------------------------------------------------------------
   All of the site's interactive behaviour. Loaded with `defer`, so it never
   blocks the page from rendering.

   Design rules followed here:
   1. NOTHING animates if the visitor has "reduce motion" switched on.
   2. Only `transform` and `opacity` are animated, so the browser can run
      them on the GPU and hold 60fps.
   3. Nothing changes the size of an element, so the page never jumps
      around while loading (no "layout shift").
   4. If JavaScript fails entirely, the page still shows all its content.

   Each feature is a small self-contained function at the bottom of the file.
   ========================================================================== */

(function () {
  'use strict';

  /* Does this visitor want reduced motion? Checked once and reused. */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Small helpers */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* Runs a function on the next animation frame, never more than once per
     frame. Used for scroll handlers so they stay cheap. */
  function rafThrottle(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; fn(); });
    };
  }


  /* ======================================================================
     THEME TOGGLE (dark / light)
     The initial theme is applied by a tiny inline script in <head> so the
     page never flashes the wrong colour. This only handles the button.
     ====================================================================== */
  function initTheme() {
    var btn = $('#theme-toggle');
    if (!btn) return;

    function label() {
      var isDark = document.documentElement.classList.contains('dark');
      btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
      btn.setAttribute('aria-pressed', String(isDark));
    }

    btn.addEventListener('click', function () {
      var isDark = document.documentElement.classList.toggle('dark');
      try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) { /* private mode */ }
      label();
    });

    label();
  }


  /* ======================================================================
     MOBILE NAVIGATION
     ====================================================================== */
  function initNav() {
    var toggle = $('#nav-toggle');
    var links = $('#nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    /* Close the menu after tapping a link */
    $$('a', links).forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    /* Escape closes it, and returns focus to the button */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('is-open')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }


  /* ======================================================================
     SCROLL PROGRESS BAR
     The thin accent line along the bottom of the sticky header.
     ====================================================================== */
  function initScrollProgress() {
    var bar = $('#scroll-progress');
    if (!bar) return;

    var update = rafThrottle(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, pct)) + ')';
    });

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }


  /* ======================================================================
     SCROLL REVEALS
     Adds .is-visible to elements as they scroll into view. The actual
     animation lives in site.css so it can be switched off there too.
     ====================================================================== */
  function initReveals() {
    var targets = $$('[data-reveal], [data-reveal-stagger]');
    if (!targets.length) return;

    /* Reduced motion, or no IntersectionObserver support: show everything
       immediately and do nothing else. */
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    /* Number the children of staggered groups so CSS can delay each one */
    $$('[data-reveal-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--i', i);
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);   /* reveal once, then stop watching */
      });
    }, {
      /* Trigger slightly before the element reaches the bottom of the
         screen, so it is already animating as it appears. */
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.05
    });

    targets.forEach(function (el) { io.observe(el); });
  }


  /* ======================================================================
     ACTIVE SECTION IN THE NAV
     Underlines whichever nav link matches the section you are looking at.
     ====================================================================== */
  function initActiveSection() {
    var links = $$('.nav-link[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var sections = [];
    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (section) { map[id] = link; sections.push(section); }
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.removeAttribute('aria-current'); });
          link.setAttribute('aria-current', 'true');
        }
      });
    }, {
      /* A band across the middle of the screen decides the "current" one */
      rootMargin: '-45% 0px -45% 0px'
    });

    sections.forEach(function (s) { io.observe(s); });
  }


  /* ======================================================================
     HERO VIDEO
     The poster image is what actually loads first and gets measured as the
     page's main content. The video only starts downloading after the page
     has finished loading, then fades in once it can play smoothly.
     This means the video can never slow down the page's loading score.
     ====================================================================== */
  function initHeroVideo() {
    var video = $('#hero-video');
    if (!video) return;

    /* Reduced motion, or the visitor is saving data: never load it. */
    var saveData = navigator.connection && navigator.connection.saveData;
    var slowLink = navigator.connection &&
                   /^(slow-)?2g$/.test(navigator.connection.effectiveType || '');

    if (reduceMotion || saveData || slowLink) {
      video.remove();
      return;
    }

    function start() {
      /* The <source> tag has its real URL in data-src so the browser does
         not begin downloading before we are ready. */
      $$('source', video).forEach(function (s) {
        if (s.dataset.src) { s.src = s.dataset.src; delete s.dataset.src; }
      });
      video.load();

      video.addEventListener('canplay', function () {
        var p = video.play();
        if (p && p.catch) { p.catch(function () { /* autoplay blocked; poster stays */ }); }
        video.classList.add('is-ready');
      }, { once: true });
    }

    /* Wait until the page has fully loaded, then start on an idle moment */
    if (document.readyState === 'complete') {
      scheduleIdle(start);
    } else {
      window.addEventListener('load', function () { scheduleIdle(start); }, { once: true });
    }

    /* Stop the video while the tab is hidden — saves battery */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { video.pause(); }
      else if (video.classList.contains('is-ready')) { video.play().catch(function () {}); }
    });
  }

  function scheduleIdle(fn) {
    if ('requestIdleCallback' in window) { requestIdleCallback(fn, { timeout: 2500 }); }
    else { setTimeout(fn, 600); }
  }


  /* ======================================================================
     ANIMATED NUMBER COUNTERS (the Bortex stats)
     The real number is already written in the HTML, so search engines and
     AI crawlers read the correct value even if this never runs. We measure
     the element's final width first and lock it, so counting up cannot
     make the layout jump.
     ====================================================================== */
  function initCounters() {
    var els = $$('[data-count-to]');
    if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    els.forEach(function (el) { io.observe(el); });
  }

  function countUp(el) {
    var target = parseFloat(el.dataset.countTo);
    if (isNaN(target)) return;

    var prefix = el.dataset.countPrefix || '';
    var suffix = el.dataset.countSuffix || '';
    var decimals = parseInt(el.dataset.countDecimals || '0', 10);
    var duration = 1400;

    /* Lock the width at its final size BEFORE we change the text */
    el.style.minWidth = el.getBoundingClientRect().width + 'px';
    el.style.display = 'inline-block';

    var startTime = null;

    function frame(now) {
      if (startTime === null) startTime = now;
      var t = Math.min(1, (now - startTime) / duration);
      /* easeOutExpo — fast at first, gently settling at the end */
      var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }


  /* ======================================================================
     STICKY PRODUCT RAIL
     In the Bortex section, the left column stays pinned while the four
     product cards scroll past it. This lights up the matching dot.
     Pinning itself is done with plain CSS `position: sticky` — no library.
     ====================================================================== */
  function initProductRail() {
    var dots = $$('[data-rail-dot]');
    var cards = $$('[data-rail-card]');
    if (!dots.length || !cards.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var name = entry.target.dataset.railCard;
        dots.forEach(function (d) {
          d.classList.toggle('is-active', d.dataset.railDot === name);
        });
      });
    }, { rootMargin: '-40% 0px -40% 0px' });

    cards.forEach(function (c) { io.observe(c); });
  }


  /* ======================================================================
     FOOTER CLOCK — local time in Bengaluru
     ====================================================================== */
  function initClock() {
    var el = $('#clock');
    if (!el) return;

    function tick() {
      var time = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Kolkata', hour12: false
      });
      el.textContent = time + ' IST · Bengaluru';
    }

    tick();
    setInterval(tick, 30000);   /* every 30s is plenty for hh:mm */
  }


  /* ======================================================================
     SMOOTH SCROLLING (Lenis)
     Optional polish. Loaded from a CDN only when motion is allowed. If the
     CDN is blocked or fails, the site simply uses normal browser scrolling
     and nothing breaks.

     TO REMOVE SMOOTH SCROLLING: delete this function and its call below.
     ====================================================================== */
  function initSmoothScroll() {
    if (reduceMotion) return;
    /* Skip on touch devices — native momentum scrolling is better there */
    if (window.matchMedia('(hover: none)').matches) return;

    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js';
    script.async = true;

    script.onload = function () {
      if (typeof Lenis !== 'function') return;

      /* Lenis replaces native scrolling, so turn off the CSS version */
      document.documentElement.style.scrollBehavior = 'auto';

      var lenis = new Lenis({ duration: 0.9, smoothWheel: true, touchMultiplier: 1.6 });

      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);

      /* Make in-page anchor links work with Lenis */
      $$('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          var id = a.getAttribute('href');
          if (id.length < 2) return;
          var target = document.querySelector(id);
          if (!target) return;
          e.preventDefault();
          lenis.scrollTo(target, { offset: -(parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--nav-h'), 10) || 64) });
        });
      });
    };

    script.onerror = function () { /* CDN unavailable — native scroll is fine */ };
    document.head.appendChild(script);
  }


  /* ======================================================================
     CURRENT YEAR in the footer, so the copyright never goes stale
     ====================================================================== */
  function initYear() {
    $$('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }


  /* ======================================================================
     START EVERYTHING
     ====================================================================== */
  function boot() {
    initTheme();
    initNav();
    initScrollProgress();
    initReveals();
    initActiveSection();
    initHeroVideo();
    initCounters();
    initProductRail();
    initClock();
    initYear();
    initSmoothScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

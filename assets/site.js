/* One Chat Hub · 单页官网交互（无依赖） */
(function () {
  'use strict';

  /* ---------- 截图语言切换 ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.shot-tab'));
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.getAttribute('data-shot');
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      Array.prototype.slice.call(document.querySelectorAll('.shot-panel')).forEach(function (p) {
        var on = p.id === target;
        p.classList.toggle('is-active', on);
        if (on) { p.removeAttribute('hidden'); } else { p.setAttribute('hidden', ''); }
      });
    });
  });

  /* ---------- 中英切换 ---------- */
  var dict = window.OCH_I18N || { zh: {}, en: {} };
  var langBtns = Array.prototype.slice.call(document.querySelectorAll('.lang-btn'));
  var LANG_KEY = 'och-site-lang';

  function pickLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'zh' || q === 'en') return q;
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) {}
    return 'zh';
  }

  function applyLang(lang, opts) {
    var t = dict[lang] || dict.zh;
    var isEn = lang === 'en';

    document.documentElement.setAttribute('lang', isEn ? 'en' : 'zh-CN');
    document.documentElement.setAttribute('data-lang', lang);

    Array.prototype.slice.call(document.querySelectorAll('[data-i18n]')).forEach(function (el) {
      var v = t[el.getAttribute('data-i18n')];
      if (v == null) return;
      if (el.tagName === 'TITLE') document.title = v;
      else el.innerHTML = v;
    });
    ['content', 'alt', 'aria-label'].forEach(function (attr) {
      var sel = { content: '[data-i18n-content]', alt: '[data-i18n-alt]', 'aria-label': '[data-i18n-aria]' }[attr];
      Array.prototype.slice.call(document.querySelectorAll(sel)).forEach(function (el) {
        var v = t[el.getAttribute('data-i18n-' + (attr === 'aria-label' ? 'aria' : attr))];
        if (v != null) el.setAttribute(attr, v);
      });
    });

    langBtns.forEach(function (b) {
      var on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    var shot = document.querySelector('.shot-tab[data-shot="shot-' + (isEn ? 'en' : 'zh') + '"]');
    if (shot) shot.click();

    var shotUrl = 'https://thinkjunior.github.io/one-chat-hub/assets/screenshot-' + (isEn ? 'en' : 'zh') + '.png';
    [document.querySelector('meta[property="og:image"]'), document.querySelector('meta[name="twitter:image"]')]
      .forEach(function (m) { if (m) m.setAttribute('content', shotUrl); });
    var heroImg = document.getElementById('hero-shot');
    if (heroImg) heroImg.src = 'assets/screenshot-' + (isEn ? 'en' : 'zh') + '.png';

    if (!opts || !opts.silent) {
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
      try {
        var u = new URL(location.href);
        if (isEn) u.searchParams.set('lang', 'en'); else u.searchParams.delete('lang');
        history.replaceState(null, '', u);
      } catch (e) {}
    }

    if (isEn) {
      var leftovers = [];
      Array.prototype.slice.call(document.querySelectorAll('header *, main *, footer *')).forEach(function (el) {
        if (el.children.length) return;
        if (!/[\u4e00-\u9fa5]/.test(el.textContent || '')) return;
        if (!el.closest('[data-i18n],[data-i18n-alt],[data-i18n-aria]')) leftovers.push(el.textContent.trim().slice(0, 24));
      });
      if (leftovers.length) console.warn('[i18n] 英文模式下仍有未接入词典的中文：', leftovers);
    }
  }

  langBtns.forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang')); });
  });
  applyLang(pickLang(), { silent: true });

  /* ---------- 入场动画 ---------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animated = document.querySelectorAll('.card, .spec, .platform-list li, .shot-panel');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'none';
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    animated.forEach(function (el, i) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = 'opacity .5s ease ' + (i % 6) * 40 + 'ms, transform .5s ease ' + (i % 6) * 40 + 'ms';
      io.observe(el);
    });
  }

  /* ---------- 导航高亮 ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll('section[id]'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + e.target.id;
          a.style.color = on ? 'var(--brand)' : '';
          a.style.fontWeight = on ? '650' : '';
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 顶栏阴影 ---------- */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (header) header.style.boxShadow = window.scrollY > 8
      ? '0 1px 0 rgba(226,231,240,.9), 0 8px 28px rgba(15,23,42,.06)'
      : 'none';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

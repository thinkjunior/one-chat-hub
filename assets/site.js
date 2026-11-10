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

/* ===== حالت روز / شب (مثل تلگرام) =====
   یک آیکون ماه (روز) یا خورشید (شب) در نوار بالا.
   همین فایل در ویندوز، اندروید و کافی‌نت یار استفاده می‌شود.
   میانبر Ctrl+T هم همین را عوض می‌کند. */
(function () {
  'use strict';
  var KEY = 'theme';
  var root = document.documentElement;

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function saved() {
    try { var s = localStorage.getItem(KEY); return (s === 'dark' || s === 'light') ? s : null; } catch (e) { return null; }
  }
  function current() { return root.getAttribute('data-theme') || systemTheme(); }

  // اعمال فوری تا صفحه با رنگ اشتباه چشمک نزند
  root.setAttribute('data-theme', saved() || systemTheme());

  var ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  var btn = null;

  function paint() {
    if (!btn) return;
    var dark = current() === 'dark';
    btn.innerHTML = dark ? ICON_SUN : ICON_MOON;   // در حالت شب خورشید (برو روز)، در روز ماه (برو شب)
    btn.title = dark ? 'حالت روز' : 'حالت شب';
    btn.setAttribute('aria-label', btn.title);
  }

  window.__toggleTheme = function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    paint();
  };

  function build() {
    if (btn) return;
    var st = document.createElement('style');
    st.textContent = '#mode-btn{width:44px;height:44px;flex:none;border-radius:14px;border:1px solid var(--l);' +
      'background:var(--c2);color:var(--t);display:inline-flex;align-items:center;justify-content:center;' +
      'cursor:pointer;padding:0;margin:0 6px;transition:background .15s,color .15s}' +
      '#mode-btn svg{width:21px;height:21px}#mode-btn:hover{background:var(--pl);color:var(--p)}';
    document.head.appendChild(st);
    btn = document.createElement('button');
    btn.id = 'mode-btn';
    btn.type = 'button';
    btn.onclick = function () { window.__toggleTheme(); };
    var host = document.querySelector('header .row') || document.querySelector('.side') || document.body;
    host.appendChild(btn);
    paint();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();

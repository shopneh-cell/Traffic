/* مجموعه‌ی آیکون یکدست (خطی) برای نسخه‌ی ویندوز */
(function () {
  'use strict';
  var P = {
    dash: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    sale: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 4h2.2l2.5 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6.1"/>',
    inv: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h6"/>',
    items: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    cust: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/><path d="M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a5 5 0 0 0-3-4.6"/>',
    buy: '<rect x="1" y="4" width="14" height="12" rx="1.5"/><path d="M15 9h4l3 3.5V16h-7"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/>',
    exp: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',
    rep: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-9"/>',
    set: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    forms: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    contracts: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h4"/>',
    layout: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    invoice: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    barcode: '<path d="M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="9" rx="2"/><path d="M6 14h12v7H6z"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 4h2.2l2.5 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 8H6.1"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-9"/>',
    wand: '<path d="M4 20L16 8"<path d="M14 4l2 2M18 2v3M20 6h-3M21 11l-1 1M9 3l1 1"/>'
  };
  function svg(name) {
    return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  window.TIcons = { svg: svg, names: Object.keys(P) };

  // اموجی‌های دکمه‌ها -> آیکون خطی
  var EMO = [['🗑','trash'],['✏️','edit'],['✏','edit'],['▥','barcode'],['🖨','print'],['💾','save'],['📂','folder'],
    ['🗂','folder'],['📥','download'],['📤','upload'],['⬆','upload'],['⬇','download'],['🔍','search'],['＋','plus'],
    ['➕','plus'],['☑','check'],['✕','x'],['🛒','cart'],['📊','chart'],['📷','scan'],['📄','forms'],['🧾','invoice'],
    ['🖼','layout'],['📑','contracts'],['📚','forms'],['🪄','wand'],['🧩','layout'],['📝','edit'],['👥','cust'],['🚚','buy']];
  function skinButtons(root) {
    (root || document).querySelectorAll('button').forEach(function (b) {
      if (b.dataset.skinBtn || b.children.length) return;
      for (var a = 0; a < b.attributes.length; a++) if (/^data-/.test(b.attributes[a].name) && b.attributes[a].name !== 'data-skin-btn') return;
      var t = b.textContent.trim();
      for (var i = 0; i < EMO.length; i++) {
        var e = EMO[i][0];
        if (t.indexOf(e) === 0) {
          var rest = t.slice(e.length).trim();
          b.innerHTML = svg(EMO[i][1]) + (rest ? '<span></span>' : '');
          if (rest) b.lastChild.textContent = rest;
          b.dataset.skinBtn = '1';
          return;
        }
      }
      b.dataset.skinBtn = '0';
    });
  }
  window.TIcons.skinButtons = skinButtons;

  // برنامه‌ی اصلی: آیکون منو و هدر را جایگزین می‌کند (با تغییر محتوای منو دوباره اعمال می‌شود)
  function skinMain() {
    document.querySelectorAll('#nav a').forEach(function (a) {
      if (a.dataset.skin) return;
      var m = (a.getAttribute('onclick') || '').match(/go\('(\w+)'\)/);
      var key = m ? m[1] : (/camTab/.test(a.getAttribute('onclick') || '') ? 'scan' : null);
      var i = a.querySelector('i');
      if (key && i && P[key]) { i.innerHTML = svg(key); i.className = 'nico'; a.dataset.skin = '1'; }
    });
    var bell = document.getElementById('bell');
    if (bell && !bell.dataset.skin) {
      var cnt = bell.querySelector('i'); var c = cnt ? cnt.outerHTML : '';
      bell.innerHTML = svg('bell') + c; bell.dataset.skin = '1';
    }
    document.querySelectorAll('header .ib').forEach(function (b) {
      var t = b.textContent.trim(), oc = b.getAttribute('onclick') || '';
      if (b.dataset.skin) return;
      if (t === '🔍' || /sh\(\)/.test(oc)) { b.innerHTML = svg('search'); b.dataset.skin = '1'; }
      else if (t === '☰') { b.innerHTML = svg('menu'); b.dataset.skin = '1'; }
      else if (t === '→') { b.innerHTML = svg('back'); b.dataset.skin = '1'; }
    });
  }
  window.TIcons.skinMain = skinMain;

  var raf = 0;
  function skinAll() { if (!document.getElementById('app')) return; skinMain(); skinButtons(document.getElementById('app')); skinButtons(document.getElementById('md')); }
  function watch() {
    if (document.getElementById('app')) skinAll();
    var nav = document.getElementById('nav'), hd = document.querySelector('header');
    var mo = new MutationObserver(function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(skinAll); });
    [nav, hd, document.getElementById('app'), document.getElementById('md')].forEach(function (el) {
      if (el) mo.observe(el, { childList: true, subtree: true });
    });
    // کافی‌نت یار: آیکون تب‌ها
    document.querySelectorAll('[data-icon]').forEach(function (el) { el.innerHTML = svg(el.getAttribute('data-icon')); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();

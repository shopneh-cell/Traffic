/* ===== نسخه‌ی ویندوز: جستجوی دقیق + میانبرها + حالت روشن/تیره =====
   توسط main.js بعد از بارگذاری صفحه اجرا می‌شود. */
(function () {
  'use strict';
  if (window.__trafficKeys) return;
  window.__trafficKeys = true;

  // ---------- جستجوی دقیق (فقط ویندوز) ----------
  // همه‌ی کلمات باید پیدا شوند؛ حدس تقریبی (فاصله‌ی ویرایشی) و نتیجه‌ی «تا حدی شبیه» نداریم.
  // اگر فقط عدد بنویسی، کد کالا دقیق مقایسه می‌شود.
  if (typeof window.nf === 'function') {
    window.fz = function (q, L, tx) {
      var full = nf(q).split(' ').filter(Boolean).join(' ');
      if (!full) return [];
      var T = full.split(' '), code = full.replace(/ /g, '');
      var digitsOnly = /^[0-9 ]+$/.test(String(q).trim());
      var out = [];
      L.forEach(function (o) {
        if (digitsOnly) {
          var cd = String(o.cd == null ? '' : o.cd);
          if (cd === code) out.push({ o: o, s: 1000 });
          else if (cd.indexOf(code) === 0) out.push({ o: o, s: 500 });
          return;
        }
        var s = nf(tx(o)), W = s.split(' '), score = 0, ok = true;
        for (var i = 0; i < T.length; i++) {
          var k = T[i];
          if (W.indexOf(k) >= 0) score += 3;
          else if (W.some(function (w) { return w.indexOf(k) === 0; })) score += 2;
          else if (s.indexOf(k) >= 0) score += 1;
          else { ok = false; break; }
        }
        if (!ok) return;
        var name = nf(o.n || '');
        if (name === full) score += 50;
        else if (name.indexOf(full) === 0) score += 20;
        else if (s.indexOf(full) >= 0) score += 8;
        out.push({ o: o, s: score });
      });
      out.sort(function (a, b) { return b.s - a.s || tx(a.o).localeCompare(tx(b.o), 'fa'); });
      return out.map(function (x) { return x.o; });
    };
  }

  // حالت روز/شب و Ctrl+T در www/mode.js است (window.__toggleTheme)

  function run(f) { try { f(); } catch (e) { /* ignore */ } }

  document.addEventListener('keydown', function (e) {
    var ctrl = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase();
    if (e.key === 'Escape') {
      var md = document.getElementById('md');
      if (md && md.innerHTML.trim()) { e.preventDefault(); md.innerHTML = ''; return; }
      var sb = document.getElementById('sbar');
      if (sb && sb.style.display !== 'none') { e.preventDefault(); sb.style.display = 'none'; }
      return;
    }
    if (e.key === 'F1') {
      e.preventDefault();
      alert('میانبرهای ترافیک:\n' +
        'Ctrl+F : جستجوی کالا، خدمت یا مشتری (با کد یا نام)\n' +
        'Ctrl+N : فروش جدید\n' +
        'Ctrl+I : فاکتورها\n' +
        'Ctrl+M : محصولات\n' +
        'Ctrl+K : مشتریان\n' +
        'Ctrl+T : حالت روز / شب\n' +
        'Esc : بستن جستجو و پنجره‌ها\n' +
        'F11 : تمام‌صفحه\n' +
        'F1 : همین راهنما');
      return;
    }
    if (!ctrl) return;
    if (k === 'f') {
      e.preventDefault();
      run(function () {
        var sb = document.getElementById('sbar');
        if (!sb || sb.style.display === 'none') { sh(); }
        else { var q = document.getElementById('q'); q.focus(); q.select(); }
      });
    }
    else if (k === 'n') { e.preventDefault(); run(function () { newSale(); }); }
    else if (k === 'i') { e.preventDefault(); run(function () { go('inv'); }); }
    else if (k === 'm') { e.preventDefault(); run(function () { go('items'); }); }
    else if (k === 'k') { e.preventDefault(); run(function () { go('cust'); }); }
    else if (k === 't') { e.preventDefault(); window.__toggleTheme(); }
  });
})();

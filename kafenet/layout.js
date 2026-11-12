/* عکس‌چین: تغییر اندازه (مثل Image Size فتوشاپ)، تعداد، چیدن روی صفحه‌ی A3/A4/A5 با حاشیه‌ی غیرقابل‌چاپ */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var PRESETS = { A3: [29.7, 42.0], A4: [21.0, 29.7], A5: [14.8, 21.0] };
  var CM = 2.54;

  var L = {
    items: [], sel: -1, search: '', page: 0,
    paper: { preset: 'A4', land: false, w: 21.0, h: 29.7 },
    m: { t: 0.6, b: 0.6, l: 0.6, r: 0.6 },
    gap: 0.3, dpi: 300, rot: true,
    pages: [], skipped: [], cache: new Map(),
    pp: { on: false, size: '3x4', border: 0.1, copies: 6, gap: 0.1, prev: null }
  };
  var PP_SIZE = { '3x4': [3, 4], '4x6': [4, 6] };
  var UNDO = [], lastSig = null, REG = {}, UID = 0, debounceT = {};
  function debounce(key, fn, ms) { return function (v) { clearTimeout(debounceT[key]); debounceT[key] = setTimeout(function () { fn(v); }, ms || 180); }; }

  function toNum(v) {
    if (v == null) return NaN;
    var s = String(v).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/[٫,]/g, '.');
    return parseFloat(s);
  }
  function fmt(v) { return (Math.round(v * 100) / 100).toString(); }
  function status(t) { $('lStatus').textContent = t; }
  var pickFolder = function () { return window.pickFolder(); };

  // ---------- افزودن عکس ----------
  $('lAdd').onclick = function () { $('lIn').click(); };
  $('lIn').onchange = async function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = '';
    for (var i = 0; i < files.length; i++) {
      status('در حال خواندن ' + (i + 1) + ' از ' + files.length + ' …');
      try {
        var full = await Scan.loadFile(files[i], 3000);
        var r = full.width / full.height, w, h;
        if (r >= 1) { w = 15; h = 15 / r; } else { h = 15; w = 15 * r; }
        L.items.push({ name: files[i].name, full: full, ratio: r, w: w, h: h, qty: 1,
          thumb: Scan.resizeCanvas(full, 120).toDataURL('image/jpeg', 0.8) });
      } catch (err) { status('خطا در «' + files[i].name + '»'); }
    }
    if (L.sel < 0 && L.items.length) L.sel = 0;
    changed(); status(L.items.length + ' عکس در فهرست است.');
  };

  // ---------- فهرست عکس‌ها ----------
  function renderList() {
    var box = $('lList'); box.innerHTML = '';
    var q = L.search.trim().toLowerCase();
    if (!L.items.length) { box.innerHTML = '<div class="hint">هنوز عکسی انتخاب نشده است.</div>'; return; }
    L.items.forEach(function (it, i) {
      if (q && it.name.toLowerCase().indexOf(q) < 0) return;
      var row = document.createElement('div');
      row.className = 'lrow' + (i === L.sel ? ' on' : '');
      row.innerHTML = '<img src="' + it.thumb + '">' +
        '<div class="ltxt"><b></b><small>' + fmt(it.w) + ' × ' + fmt(it.h) + ' سانتی‌متر</small></div>' +
        '<div class="qty"><button data-a="plus">+</button><span>' + it.qty + '</span><button data-a="minus">−</button></div>' +
        '<button class="del" data-a="del" title="حذف">✕</button>';
      row.querySelector('b').textContent = it.name;
      row.onclick = function (e) {
        var bt = e.target.closest && e.target.closest('[data-a]'), a = bt && bt.getAttribute('data-a');
        if (a === 'plus') it.qty++;
        else if (a === 'minus') it.qty = Math.max(0, it.qty - 1);
        else if (a === 'del') { L.items.splice(i, 1); if (L.sel >= L.items.length) L.sel = L.items.length - 1; changed(); return; }
        else L.sel = i;
        changed();
      };
      box.appendChild(row);
    });
  }
  $('lSearch').oninput = function () { L.search = this.value; renderList(); };

  // ---------- اندازه‌ی تصویر (مثل Image Size) ----------
  function selItem() { return L.items[L.sel] || null; }
  function renderSize() {
    var it = selItem();
    $('iW').disabled = $('iH').disabled = !it;
    if (!it) { $('iW').value = $('iH').value = ''; $('iPx').textContent = 'عکسی انتخاب نشده'; return; }
    $('iW').value = fmt(it.w); $('iH').value = fmt(it.h);
    var pw = Math.round(it.w / CM * L.dpi), ph = Math.round(it.h / CM * L.dpi);
    $('iPx').textContent = 'ابعاد پیکسلی: ' + pw + ' × ' + ph + ' پیکسل  (' + L.dpi + ' dpi)';
  }
  function setSize(which, v) {
    var it = selItem(); if (!it || !(v > 0)) return;
    if ($('iLink').checked) {
      if (which === 'w') { it.w = v; it.h = v / it.ratio; }
      else { it.h = v; it.w = v * it.ratio; }
    } else { if (which === 'w') it.w = v; else it.h = v; }
    changed();
  }
  var setW = debounce('w', function (v) { setSize('w', v); }), setH = debounce('h', function (v) { setSize('h', v); });
  $('iW').oninput = function () { setW(toNum(this.value)); };
  $('iH').oninput = function () { setH(toNum(this.value)); };
  $('iW').onchange = function () { setSize('w', toNum(this.value)); };
  $('iH').onchange = function () { setSize('h', toNum(this.value)); };
  $('iLink').onchange = function () { };
  $('iSame').onclick = function () {
    var it = selItem(); if (!it) return;
    L.items.forEach(function (x) {
      if ($('iLink').checked) { x.w = it.w; x.h = it.w / x.ratio; }
      else { x.w = it.w; x.h = it.h; }
    });
    changed(); status('اندازه‌ی این عکس برای همه‌ی عکس‌ها اعمال شد.');
  };

  // ---------- صفحه‌ی چاپ ----------
  function paperSize() {
    var P = L.paper, w, h;
    if (P.preset === 'custom') { w = P.w; h = P.h; }
    else { w = PRESETS[P.preset][0]; h = PRESETS[P.preset][1]; }
    return P.land ? [h, w] : [w, h];
  }
  function printable() {
    var p = paperSize();
    return { W: p[0], H: p[1], PW: p[0] - L.m.l - L.m.r, PH: p[1] - L.m.t - L.m.b };
  }

  // چیدن: ردیف به ردیف؛ اگر در ردیف جا نشد به ردیف بعد؛ اگر صفحه پر شد، صفحه‌ی بعد
  function pack(list, PW, PH, gap, allowRot) {
    var pages = [[]], x = 0, y = 0, rowH = 0, skipped = [], eps = 1e-9;
    list.forEach(function (it) {
      var opts = [[it.w, it.h, false]];
      if (allowRot && Math.abs(it.w - it.h) > 1e-9) opts.push([it.h, it.w, true]);
      opts = opts.filter(function (o) { return o[0] <= PW + eps && o[1] <= PH + eps; });
      if (!opts.length) { skipped.push(it); return; }
      var best = null, guard = 0;
      while (true) {
        best = null;
        opts.forEach(function (o) {
          if (x + o[0] <= PW + eps && y + o[1] <= PH + eps && (!best || o[1] < best[1])) best = o;
        });
        if (best) break;
        if (++guard > 1000) { best = opts[0]; break; }
        if (x > eps) { y += rowH + gap; x = 0; rowH = 0; }
        else { pages.push([]); x = 0; y = 0; rowH = 0; }
      }
      pages[pages.length - 1].push({ ref: it.ref, x: x, y: y, w: best[0], h: best[1], rot: best[2] });
      x += best[0] + gap; rowH = Math.max(rowH, best[1]);
    });
    if (pages.length && !pages[pages.length - 1].length) pages.pop();
    return { pages: pages, skipped: skipped };
  }

  function computeLayout() {
    var pa = printable(), list = [];
    if (L.pp.on) {
      var sz = PP_SIZE[L.pp.size], b = L.pp.border;
      L.items.forEach(function (it, i) {
        for (var k = 0; k < L.pp.copies; k++) list.push({ ref: i, w: sz[0] + 2 * b, h: sz[1] + 2 * b, name: it.name });
      });
      var rp = pack(list, pa.PW, pa.PH, L.pp.gap, false);
      L.pages = rp.pages; L.skipped = rp.skipped;
      if (L.page >= L.pages.length) L.page = Math.max(0, L.pages.length - 1);
      return;
    }
    L.items.forEach(function (it, i) {
      for (var k = 0; k < it.qty; k++) list.push({ ref: i, w: it.w, h: it.h, name: it.name });
    });
    // بلندترین‌ها اول، برای چیدن فشرده‌تر
    list.sort(function (a, b) { return Math.max(b.w, b.h) - Math.max(a.w, a.h); });
    var res = pack(list, pa.PW, pa.PH, L.gap, L.rot);
    L.pages = res.pages; L.skipped = res.skipped;
    if (L.page >= L.pages.length) L.page = Math.max(0, L.pages.length - 1);
  }

  // ---------- رسم صفحه ----------
  function resample(src, w, h) {
    var c = src;
    while (c.width > w * 2 && c.width > 4) {
      var t = document.createElement('canvas');
      t.width = Math.round(c.width / 2); t.height = Math.round(c.height / 2);
      var tx = t.getContext('2d'); tx.imageSmoothingQuality = 'high';
      tx.drawImage(c, 0, 0, t.width, t.height); c = t;
    }
    var o = document.createElement('canvas'); o.width = Math.max(1, w); o.height = Math.max(1, h);
    var ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high';
    ox.drawImage(c, 0, 0, o.width, o.height);
    return o;
  }
  function itemImg(ref, ow, oh, dpi) {
    var it = L.items[ref];
    var pw = Math.max(1, Math.round(ow / CM * dpi)), ph = Math.max(1, Math.round(oh / CM * dpi));
    var key = ref + '|' + pw + 'x' + ph;
    if (!L.cache.has(key)) L.cache.set(key, resample(it.full, pw, ph));
    return L.cache.get(key);
  }
  function ppImg(ref, wpx, hpx) {
    var key = 'pp' + ref + '|' + wpx + 'x' + hpx;
    if (L.cache.has(key)) return L.cache.get(key);
    var f = L.items[ref].full, r = wpx / hpx, sx = 0, sy = 0, sw = f.width, sh = f.height;
    if (f.width / f.height > r) { sw = f.height * r; sx = (f.width - sw) / 2; }
    else { sh = f.width / r; sy = (f.height - sh) / 2; }
    var c = document.createElement('canvas'); c.width = Math.round(sw); c.height = Math.round(sh);
    c.getContext('2d').drawImage(f, sx, sy, sw, sh, 0, 0, c.width, c.height);
    var out = resample(c, wpx, hpx);
    L.cache.set(key, out);
    return out;
  }

  function renderPage(pi, dpi, guides) {
    var pa = printable(), p = paperSize();
    var cw = Math.round(p[0] / CM * dpi), ch = Math.round(p[1] / CM * dpi);
    var c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch);
    var pg = L.pages[pi]; if (!pg) return c;
    pg.forEach(function (pl) {
      var bx = (L.m.l + pl.x) / CM * dpi, by = (L.m.t + pl.y) / CM * dpi;
      var bw = pl.w / CM * dpi, bh = pl.h / CM * dpi;
      if (L.pp.on) {
        var bpx = L.pp.border / CM * dpi, sz = PP_SIZE[L.pp.size];
        g.fillStyle = '#000'; g.fillRect(bx, by, bw, bh);               // کادر مشکی برای برش
        var pim = ppImg(pl.ref, Math.round(sz[0] / CM * dpi), Math.round(sz[1] / CM * dpi));
        g.drawImage(pim, bx + bpx, by + bpx, bw - 2 * bpx, bh - 2 * bpx);
        return;
      }
      var ow = pl.rot ? pl.h : pl.w, oh = pl.rot ? pl.w : pl.h;
      var im = itemImg(pl.ref, ow, oh, dpi);
      g.save(); g.translate(bx + bw / 2, by + bh / 2);
      if (pl.rot) g.rotate(Math.PI / 2);
      g.drawImage(im, -im.width / 2, -im.height / 2, im.width, im.height);
      g.restore();
    });
    if (guides) {
      g.save(); g.setLineDash([6, 6]); g.strokeStyle = 'rgba(220,40,40,.7)'; g.lineWidth = Math.max(1, dpi / 120);
      g.strokeRect(L.m.l / CM * dpi, L.m.t / CM * dpi, pa.PW / CM * dpi, pa.PH / CM * dpi);
      g.restore();
    }
    return c;
  }

  function renderPreview() {
    var cv = $('lCv'), box = $('lPrevBox'), ctxW = box.clientWidth || 400;
    if (!L.pages.length) {
      cv.width = 10; cv.height = 10; cv.getContext('2d').clearRect(0, 0, 10, 10);
      $('lPageInfo').textContent = L.items.length ? 'هیچ عکسی با تعداد بیشتر از صفر نیست' : '';
      return;
    }
    var pc = renderPage(L.page, Math.min(L.dpi, 110), true);
    cv.width = pc.width; cv.height = pc.height;
    cv.getContext('2d').drawImage(pc, 0, 0);
    $('lPageInfo').textContent = 'صفحه ' + (L.page + 1) + ' از ' + L.pages.length + '  ·  ' + (L.pages[L.page] || []).length + ' عکس در این صفحه';
  }

  function renderInfo() {
    var pa = printable(), p = paperSize(), total = 0;
    L.items.forEach(function (it) { total += it.qty; });
    var msg = 'صفحه‌ی چاپ: ' + fmt(p[0]) + ' × ' + fmt(p[1]) + ' سانتی‌متر · قابل‌چاپ: ' + fmt(pa.PW) + ' × ' + fmt(pa.PH) +
      ' · عکس: ' + total + ' · صفحه: ' + L.pages.length;
    if (L.pp.on) msg = 'پرسنلی ساز · ' + L.pp.size.replace('x', '×') + ' سانتی‌متر · ' + L.items.length + ' عکس · هر عکس یک ردیف ' + L.pp.copies + 'تایی · ' + L.dpi + ' dpi\n' + msg;
    if (L.skipped.length) {
      var cnt = {}; L.skipped.forEach(function (s) { cnt[s.name] = (cnt[s.name] || 0) + 1; });
      msg += '\n⚠ بزرگ‌تر از صفحه و چیده نشدند: ' + Object.keys(cnt).map(function (n) { return n + ' (' + cnt[n] + ' عدد)'; }).join('، ');
    }
    $('lInfo').textContent = msg;
  }

  function renderSettings() {
    $('pPreset').value = L.paper.preset;
    $('pLand').checked = L.paper.land;
    var ps = paperSize(); $('pW').value = fmt(ps[0]); $('pH').value = fmt(ps[1]);
    $('pW').disabled = $('pH').disabled = L.paper.preset !== 'custom';
    $('mT').value = fmt(L.m.t); $('mB').value = fmt(L.m.b); $('mL').value = fmt(L.m.l); $('mR').value = fmt(L.m.r);
    $('pGap').value = fmt(L.gap); $('pDpi').value = String(L.dpi); $('pRot').checked = L.rot;
  }

  function sig() {
    return JSON.stringify({
      it: L.items.map(function (x) { return [x.id, x.qty, +x.w.toFixed(3), +x.h.toFixed(3)]; }),
      pp: L.pp.on, sz: L.pp.size, dpi: L.dpi, paper: L.paper, m: L.m, gap: L.gap, rot: L.rot
    });
  }
  function applySig(s) {
    var o = JSON.parse(s);
    L.items = o.it.map(function (r) { var x = REG[r[0]]; if (!x) return null; x.qty = r[1]; x.w = r[2]; x.h = r[3]; return x; }).filter(Boolean);
    L.pp.on = o.pp; L.pp.size = o.sz; L.dpi = o.dpi; L.paper = o.paper; L.m = o.m; L.gap = o.gap; L.rot = o.rot;
    if (L.sel >= L.items.length) L.sel = L.items.length - 1;
  }
  function render() {
    L.items.forEach(function (x) { if (!x.id) x.id = ++UID; REG[x.id] = x; });
    computeLayout();
    renderList(); renderSize(); renderSettings(); renderInfo(); renderPreview(); syncPassportUi();
  }
  function changed() {
    var cur = sig();
    if (lastSig !== null && cur !== lastSig) { UNDO.push(lastSig); if (UNDO.length > 150) UNDO.shift(); }
    lastSig = cur;
    render();
  }
  window.layoutUndo = function () {
    if (!UNDO.length) { status('کاری برای برگشت نیست.'); return; }
    lastSig = UNDO.pop(); applySig(lastSig); render(); status('برگشت انجام شد.');
  };
  $('lUndo').onclick = function () { window.layoutUndo(); };

  // ---------- تنظیمات ورودی ----------
  $('pPreset').onchange = function () {
    L.paper.preset = this.value;
    if (this.value !== 'custom') { var s = PRESETS[this.value]; L.paper.w = s[0]; L.paper.h = s[1]; }
    changed();
  };
  $('pLand').onchange = function () { L.paper.land = this.checked; changed(); };
  $('pW').onchange = function () { var v = toNum(this.value); if (v > 0) L.paper.w = v; changed(); };
  $('pH').onchange = function () { var v = toNum(this.value); if (v > 0) L.paper.h = v; changed(); };
  ['t', 'b', 'l', 'r'].forEach(function (k) {
    $('m' + k.toUpperCase()).onchange = function () { var v = toNum(this.value); if (v >= 0) L.m[k] = v; changed(); };
  });
  $('pGap').onchange = function () { var v = toNum(this.value); if (v >= 0) L.gap = v; changed(); };
  $('pDpi').onchange = function () { L.dpi = parseInt(this.value, 10) || 300; changed(); };
  $('pRot').onchange = function () { L.rot = this.checked; changed(); };
  $('iLink').onchange = function () { };
  $('lPrev').onclick = function () { if (L.page > 0) { L.page--; renderPreview(); } };
  $('lNext').onclick = function () { if (L.page < L.pages.length - 1) { L.page++; renderPreview(); } };

  // ---------- حالت‌ها: چیدن عادی / پرسنلی ساز (عکس‌ها بین حالت‌ها حفظ می‌شوند) ----------
  // پرسنلی ساز: ۶۰۰ dpi، کاغذ A4 (برای ۴×۶ افقی)، هر عکس = یک ردیف ۶تایی با کادر مشکی
  function syncPassportUi() {
    $('lModeNormal').classList.toggle('on', !L.pp.on);
    $('lModePass').classList.toggle('on', L.pp.on);
    $('ppBox').style.display = L.pp.on ? 'block' : 'none';
    $('ppSize').value = L.pp.size;
  }
  function setMode(pass) {
    if (pass === L.pp.on) return;
    if (pass) {
      L.normal = { dpi: L.dpi, preset: L.paper.preset, land: L.paper.land };
      L.pp.on = true; L.dpi = 600; L.paper.preset = 'A4'; L.paper.land = L.pp.size === '4x6';
    } else {
      L.pp.on = false;
      if (L.normal) { L.dpi = L.normal.dpi; L.paper.preset = L.normal.preset; L.paper.land = L.normal.land; }
    }
    changed();
    status(pass ? 'حالت پرسنلی ساز ( ۶۰۰ dpi ) · عکس‌ها حفظ شدند' : 'حالت چیدن عادی · عکس‌ها حفظ شدند');
  }
  $('lModeNormal').onclick = function () { setMode(false); };
  $('lModePass').onclick = function () { setMode(true); };
  $('ppSize').onchange = function () {
    L.pp.size = this.value;
    if (L.pp.on) L.paper.land = this.value === '4x6';
    changed();
  };

  // ---------- خروجی ----------
  function pdfName() { return 'chidman-' + new Date().toISOString().slice(0, 10) + '.pdf'; }
  $('lPdf').onclick = async function () {
    if (!L.pages.length) return status('عکسی برای چیدن نیست.');
    var dir = await pickFolder(); if (dir === 'abort') return status('ذخیره لغو شد');
    var canv = [];
    for (var i = 0; i < L.pages.length; i++) {
      status('ساخت صفحه ' + (i + 1) + ' از ' + L.pages.length + ' …');
      await new Promise(function (r) { setTimeout(r, 15); });
      canv.push(renderPage(i, L.dpi, false));
    }
    var p = paperSize();
    var blob = mkpdf(canv, p[0] * 72 / CM, p[1] * 72 / CM);
    status(await saveFiles([{ name: pdfName(), blob: blob }], dir));
  };
  $('lPages').onclick = async function () {
    if (!L.pages.length) return status('عکسی برای چیدن نیست.');
    var dir = await pickFolder(); if (dir === 'abort') return status('ذخیره لغو شد');
    var files = [];
    for (var i = 0; i < L.pages.length; i++) {
      status('ساخت صفحه ' + (i + 1) + ' از ' + L.pages.length + ' …');
      var c = renderPage(i, L.dpi, false);
      var b = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.95); });
      files.push({ name: 'صفحه-' + (i + 1) + '.jpg', blob: b });
    }
    status(await saveFiles(files, dir));
  };
  $('lEach').onclick = async function () {
    if (!L.items.length) return status('عکسی وجود ندارد.');
    var dir = await pickFolder(); if (dir === 'abort') return status('ذخیره لغو شد');
    var files = [];
    for (var i = 0; i < L.items.length; i++) {
      var it = L.items[i];
      var pw = Math.max(1, Math.round(it.w / CM * L.dpi)), ph = Math.max(1, Math.round(it.h / CM * L.dpi));
      var c = resample(it.full, pw, ph);
      var b = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.95); });
      var base = it.name.replace(/\.[^.]+$/, '');
      files.push({ name: base + '_' + fmt(it.w).replace('.', '_') + 'x' + fmt(it.h).replace('.', '_') + 'cm.jpg', blob: b });
    }
    status(await saveFiles(files, dir));
  };

  function saveFiles(files, dir) {
    return window.saveFiles(files, dir, function (k, n) { status('ذخیره ' + k + ' از ' + n + ' …'); });
  }

  // ---------- شروع ----------
  window.addEventListener('resize', function () { renderPreview(); });
  window.layoutRefresh = changed;
  syncPassportUi();
  window.__layoutState = L; // برای تست

  changed();
})();

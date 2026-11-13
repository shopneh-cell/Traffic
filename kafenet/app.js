(function () {
  'use strict';
  var FILTERS = [
    ['magic', 'Magic Color'], ['pro', 'Magic Pro'], ['noshadow', 'No Shadow'], ['bw', 'سیاه‌وسفید'], ['original', 'اصلی']
  ];
  var S = { pages: [], cur: -1, filter: 'magic', mode: 'result', drag: -1, busy: false };
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d');

  function status(t) { $('st').textContent = t; }

  // ---------- تب‌ها ----------
  document.querySelectorAll('.tab').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('on', x === b); });
      ['forms', 'contracts', 'scan', 'layout', 'bg', 'invoice', 'sites'].forEach(function (k) {
        $('tab-' + k).style.display = b.dataset.tab === k ? 'flex' : 'none';
      });
    };
  });

  // ---------- فیلترها ----------
  function renderFilters() {
    $('filters').innerHTML = '';
    FILTERS.forEach(function (f) {
      var c = document.createElement('span');
      c.className = 'chip' + (S.filter === f[0] ? ' on' : '');
      c.textContent = f[1];
      c.onclick = function () { setFilter(f[0]); };
      $('filters').appendChild(c);
    });
  }
  function setFilter(k) {
    scanCommit();
    S.filter = k;
    var p = cur(), all = $('fAll').checked;
    if (all) S.pages.forEach(function (x) { x.filter = k; x.out = null; });
    else if (p) { p.filter = k; p.out = null; }
    renderFilters(); draw(); thumbs();
    scanCommit();
  }

  function cur() { return S.pages[S.cur] || null; }

  // ---------- گروه‌های منو: فرم‌ها و قراردادها / عکس یار ----------
  document.querySelectorAll('.navbtn[data-group]').forEach(function (g) {
    g.onclick = function () {
      var id = 'sub-' + (g.dataset.group === 'forms' ? 'forms' : 'photo');
      var sub = $(id), willOpen = !sub.classList.contains('open');
      document.querySelectorAll('.subnav').forEach(function (x) { x.classList.remove('open'); });
      document.querySelectorAll('.navbtn[data-group]').forEach(function (x) { x.classList.remove('open'); });
      if (willOpen) {
        sub.classList.add('open'); g.classList.add('open');
        var first = sub.querySelector('.tab'); if (first) first.click();
      }
    };
  });

  // ---------- برگشت (Undo) سفیدکننده ----------
  var SU = [], sLast = null;
  function scanSnap() {
    return S.pages.map(function (p) { return { r: p, c: p.corners.map(function (c) { return c.slice(); }), f: p.filter }; });
  }
  function scanSig(a) { return JSON.stringify(a.map(function (x) { return [x.c, x.f]; })) + '#' + a.length; }
  function scanCommit() {
    var now = scanSnap();
    if (sLast && scanSig(now) !== scanSig(sLast)) { SU.push(sLast); if (SU.length > 150) SU.shift(); }
    sLast = now;
  }
  $('sUndo').onclick = function () {
    if (!SU.length) { status('کاری برای برگشت نیست.'); return; }
    var prev = SU.pop();
    S.pages = prev.map(function (x) { return x.r; });
    prev.forEach(function (x) { x.r.corners = x.c.map(function (c) { return c.slice(); }); x.r.filter = x.f; x.r.out = null; });
    S.cur = Math.min(S.cur, S.pages.length - 1);
    if (S.pages[S.cur]) S.filter = S.pages[S.cur].filter;
    sLast = scanSnap();
    refresh(); status('برگشت انجام شد.');
  };
  // ---------- افزودن عکس ----------
  $('bAdd').onclick = function () { $('fIn').click(); };
  $('fIn').onchange = async function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    S.busy = true; setBtns();
    for (var i = 0; i < files.length; i++) {
      status('در حال آماده‌سازی ' + (i + 1) + ' از ' + files.length + ' …');
      try {
        var full = await Scan.loadFile(files[i], 4000);
        var wk = Scan.resizeCanvas(full, 1400);
        var corners = Scan.detect(Scan.resizeCanvas(wk, 320));
        S.pages.push({ name: files[i].name, full: full, wk: wk, corners: corners, filter: S.filter, out: null });
      } catch (err) {
        status('خطا در خواندن «' + files[i].name + '»: ' + err.message);
      }
    }
    S.cur = S.pages.length - 1;
    S.busy = false;
    status(S.pages.length + ' صفحه آماده است. گوشه‌ها به‌صورت خودکار تشخیص داده شدند.');
    refresh();
  };

  // ---------- تشخیص گوشه ----------
  function autoOne(p) {
    p.corners = Scan.detect(Scan.resizeCanvas(p.wk, 320));
    p.out = null;
  }
  $('bAuto').onclick = function () { var p = cur(); if (p) { autoOne(p); status('گوشه‌ها دوباره تشخیص داده شد.'); refresh(); } };
  $('bAutoAll').onclick = function () { S.pages.forEach(autoOne); status('همه‌ی صفحه‌ها تشخیص داده شد.'); refresh(); };
  function label(k) { var f = FILTERS.filter(function (x) { return x[0] === k; })[0]; return f ? f[1] : k; }

  // ---------- حالت نمایش ----------
  $('mRes').onclick = function () { S.mode = 'result'; refresh(); };
  $('mEdit').onclick = function () { S.mode = 'edit'; refresh(); };
  $('bDel').onclick = function () {
    if (S.cur < 0) return;
    S.pages.splice(S.cur, 1);
    S.cur = Math.min(S.cur, S.pages.length - 1);
    status('صفحه حذف شد.'); refresh();
  };

  // ---------- رسم ----------
  function ensureOut(p) {
    if (!p.out) p.out = Scan.apply(p.wk, p.corners, p.filter, 1400);
    return p.out;
  }

  function drawEdit(p) {
    cv.width = p.wk.width; cv.height = p.wk.height;
    ctx.drawImage(p.wk, 0, 0);
    var W = cv.width, H = cv.height, P = p.corners.map(function (c) { return [c[0] * W, c[1] * H]; });
    ctx.lineWidth = Math.max(2, W / 300);
    ctx.strokeStyle = '#ff3b30';
    ctx.beginPath();
    P.forEach(function (q, i) { i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    ctx.closePath(); ctx.stroke();
    var r = Math.max(9, W / 55);
    P.forEach(function (q) {
      ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,59,48,.9)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    });
  }

  function draw() {
    var p = cur();
    $('empty').style.display = p ? 'none' : 'block';
    cv.style.display = p ? 'block' : 'none';
    $('mRes').classList.toggle('on', S.mode === 'result');
    $('mEdit').classList.toggle('on', S.mode === 'edit');
    cv.classList.toggle('edit', !!p && S.mode === 'edit');
    if (!p) { $('hint').textContent = ''; return; }
    if (S.mode === 'edit') {
      drawEdit(p);
      $('hint').textContent = 'چهار نقطه‌ی قرمز را روی گوشه‌های کاغذ بکشید، سپس به «نتیجه» برگردید.';
    } else {
      var o = ensureOut(p);
      cv.width = o.width; cv.height = o.height;
      ctx.drawImage(o, 0, 0);
      $('hint').textContent = 'فیلتر: ' + label(p.filter) + '  ·  صفحه ' + (S.cur + 1) + ' از ' + S.pages.length;
    }
  }

  function thumbs() {
    var t = $('thumbs'); t.innerHTML = '';
    S.pages.forEach(function (p, i) {
      var d = document.createElement('div');
      d.className = 'th' + (i === S.cur ? ' on' : '');
      var img = document.createElement('img');
      img.src = ensureOut(p).toDataURL('image/jpeg', 0.7);
      var s = document.createElement('small'); s.textContent = (i + 1) + ' · ' + label(p.filter);
      var x = document.createElement('button'); x.className = 'x'; x.textContent = '✕';
      x.onclick = function (e) { e.stopPropagation(); S.pages.splice(i, 1); S.cur = Math.min(S.cur, S.pages.length - 1); refresh(); };
      d.onclick = function () { S.cur = i; refresh(); };
      d.appendChild(img); d.appendChild(s); d.appendChild(x);
      t.appendChild(d);
    });
  }

  function setBtns() {
    var has = S.pages.length > 0;
    $('bAuto').disabled = !cur() || S.busy;
    $('bAutoAll').disabled = !has || S.busy;
    $('bJpg').disabled = !cur() || S.busy;
    $('bJpgAll').disabled = !has || S.busy;
    $('bPdf').disabled = !has || S.busy;
    $('bDel').disabled = !cur() || S.busy;
  }

  function refresh() {
    scanCommit();
    renderFilters();
    draw(); thumbs(); setBtns();
  }

  // ---------- ویرایش گوشه با ماوس ----------
  function pos(e) {
    var r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
  }
  cv.addEventListener('pointerdown', function (e) {
    var p = cur(); if (!p || S.mode !== 'edit') return;
    var q = pos(e), W = cv.width, H = cv.height, best = -1, bd = 1e9;
    p.corners.forEach(function (c, i) {
      var d = Math.hypot(c[0] * W - q[0], c[1] * H - q[1]);
      if (d < bd) { bd = d; best = i; }
    });
    if (bd < W * 0.12) { S.drag = best; cv.setPointerCapture(e.pointerId); }
  });
  cv.addEventListener('pointermove', function (e) {
    var p = cur(); if (!p || S.drag < 0) return;
    var q = pos(e);
    p.corners[S.drag] = [Math.min(1, Math.max(0, q[0] / cv.width)), Math.min(1, Math.max(0, q[1] / cv.height))];
    p.out = null;
    drawEdit(p);
  });
  cv.addEventListener('pointerup', function () { if (S.drag >= 0) { S.drag = -1; scanCommit(); status('گوشه‌ها تنظیم شد.'); } });

  // ---------- ذخیره ----------
  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function fullOut(p) { return Scan.apply(p.full, p.corners, p.filter, 4000); }
  function toBlob(c, type, q) { return new Promise(function (ok) { c.toBlob(ok, type, q); }); }

  $('bJpg').onclick = async function () {
    var p = cur(); if (!p) return;
    var dir = await window.pickFolder(); if (dir === 'abort') return;
    status('در حال ساخت عکس با کیفیت کامل…');
    var c = fullOut(p), b = await toBlob(c, 'image/jpeg', 0.95);
    status(await window.saveFiles([{ name: 'scan-' + (S.cur + 1) + '.jpg', blob: b }], dir));
  };

  $('bJpgAll').onclick = async function () {
    if (!S.pages.length) return;
    var dir = await window.pickFolder(); if (dir === 'abort') return;
    var files = [];
    for (var i = 0; i < S.pages.length; i++) {
      status('ساخت عکس ' + (i + 1) + ' از ' + S.pages.length + ' با کیفیت کامل…');
      await new Promise(function (r) { setTimeout(r, 15); });
      var c = fullOut(S.pages[i]);
      var b = await toBlob(c, 'image/jpeg', 0.95);
      files.push({ name: 'scan-' + (i + 1) + '.jpg', blob: b });
    }
    status(await window.saveFiles(files, dir, function (k, n) { status('ذخیره ' + k + ' از ' + n + ' …'); }));
  };

  // صفحه‌ی A4 با نسبت حفظ‌شده
  function a4Page(c) {
    var W = 1654, H = 2339, pad = Math.round(W * 0.03);
    var k = Math.min((W - 2 * pad) / c.width, (H - 2 * pad) / c.height);
    var o = document.createElement('canvas'); o.width = W; o.height = H;
    var x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    var w = c.width * k, h = c.height * k;
    x.drawImage(c, (W - w) / 2, (H - h) / 2, w, h);
    return o;
  }

  $('bPdf').onclick = async function () {
    if (!S.pages.length) return;
    var dir = await window.pickFolder(); if (dir === 'abort') return;
    var pages = [];
    for (var i = 0; i < S.pages.length; i++) {
      status('ساخت PDF: صفحه ' + (i + 1) + ' از ' + S.pages.length + ' …');
      await new Promise(function (r) { setTimeout(r, 20); });
      pages.push(a4Page(fullOut(S.pages[i])));
    }
    status('در حال نوشتن فایل PDF…');
    var blob = mkpdf(pages, 595, 842);
    status(await window.saveFiles([{ name: 'scan-' + new Date().toISOString().slice(0, 10) + '.pdf', blob: blob }], dir));
  };

  // ---------- PDF (همان سازنده‌ی برنامه‌ی اصلی) ----------
  function mkpdf(cs, pw, ph) {
    var E = new TextEncoder(), parts = [], off = [], len = 0;
    var add = function (z) { var b = typeof z == 'string' ? E.encode(z) : z; parts.push(b); len += b.length; };
    var obj = function (i, s, bin) { off[i] = len; add(i + ' 0 obj\n' + s); if (bin) { add('\nstream\n'); add(bin); add('\nendstream'); } add('\nendobj\n'); };
    add('%PDF-1.4\n');
    var N = cs.length;
    obj(1, '<</Type/Catalog/Pages 2 0 R>>');
    obj(2, '<</Type/Pages/Kids[' + cs.map(function (_, i) { return (3 + 3 * i) + ' 0 R'; }).join(' ') + ']/Count ' + N + '>>');
    cs.forEach(function (c, i) {
      var j = Uint8Array.from(atob(c.toDataURL('image/jpeg', 0.85).split(',')[1]), function (z) { return z.charCodeAt(0); });
      var p = 3 + 3 * i, ct = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /I Do Q';
      obj(p, '<</Type/Page/Parent 2 0 R/MediaBox[0 0 ' + pw + ' ' + ph + ']/Resources<</XObject<</I ' + (p + 2) + ' 0 R>>>>/Contents ' + (p + 1) + ' 0 R>>');
      obj(p + 1, '<</Length ' + ct.length + '>>', ct);
      obj(p + 2, '<</Type/XObject/Subtype/Image/Width ' + c.width + '/Height ' + c.height + '/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ' + j.length + '>>', j);
    });
    var xo = len, T2 = 3 * N + 3;
    add('xref\n0 ' + T2 + '\n0000000000 65535 f \n' + off.slice(1).map(function (o) { return String(o).padStart(10, '0') + ' 00000 n \n'; }).join('') + 'trailer<</Size ' + T2 + '/Root 1 0 R>>\nstartxref\n' + xo + '\n%%EOF');
    return new Blob(parts, { type: 'application/pdf' });
  }

  renderFilters(); setBtns(); draw();
})();

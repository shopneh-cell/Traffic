/* عکس یار ‹ حذف پس‌زمینه ›: حذف هوشمند + قلم اصلاح (نگه‌دار / حذف) + برگشت + ذخیره */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var B = { items: [], cur: -1, brush: 'none', size: 18, view: 'res', back: 'checker', drawing: false, busy: false, color: '#2456b8' };
  var TIMER = null;

  function status(t) { $('bgStatus').textContent = t; }
  function cur() { return B.items[B.cur] || null; }

  // ---------- افزودن عکس ----------
  $('bgAdd').onclick = function () { $('bgIn').click(); };
  $('bgIn').onchange = async function (e) {
    var files = Array.prototype.slice.call(e.target.files || []); e.target.value = '';
    for (var i = 0; i < files.length; i++) {
      status('در حال خواندن ' + (i + 1) + ' از ' + files.length + ' …');
      try {
        var full = await Scan.loadFile(files[i], 2600);
        var ws = BGCore.workSize(full.width, full.height);
        var work = BGCore.workCanvas(full, ws.W, ws.H);
        B.items.push({ name: files[i].name, full: full, W: ws.W, H: ws.H, work: work,
          hints: new Uint8Array(ws.W * ws.H), mask: null, result: null, bgColor: [255, 255, 255], undo: [], redo: [] });
      } catch (err) { status('خطا در «' + files[i].name + '»'); }
    }
    if (B.cur < 0 && B.items.length) B.cur = 0;
    refresh(); status(B.items.length + ' عکس آماده است. «حذف هوشمند پس‌زمینه» را بزنید.');
  };

  // ---------- پردازش ----------
  function runAuto(it, done) {
    status('در حال حذف پس‌زمینه… (چند ثانیه)');
    B.busy = true; refreshBtns();
    setTimeout(function () {
      var seg = BGCore.segment(it.work, it.hints);
      it.mask = seg.mask; it.bgColor = seg.bgColor;
      it.result = BGCore.matte(it.full, it.mask, it.W, it.H, it.bgColor);
      B.busy = false; refreshBtns();
      if (done) done();
      refresh(); status('پس‌زمینه حذف شد. برای اصلاح، با قلم «نگه‌دار» یا «حذف» روی عکس بکشید.');
    }, 30);
  }
  $('bgAuto').onclick = function () { var it = cur(); if (it) runAuto(it); };

  // ---------- قلم اصلاح ----------
  function setBrush(m) { B.brush = m; ['bgBrushNone', 'bgBrushKeep', 'bgBrushDel'].forEach(function (id) { $(id).classList.remove('on'); }); $({ none: 'bgBrushNone', keep: 'bgBrushKeep', del: 'bgBrushDel' }[m]).classList.add('on'); $('bgCv').classList.toggle('brush', m !== 'none'); }
  $('bgBrushNone').onclick = function () { setBrush('none'); };
  $('bgBrushKeep').onclick = function () { setBrush('keep'); };
  $('bgBrushDel').onclick = function () { setBrush('del'); };
  $('bgSize').oninput = function () { B.size = +this.value; };

  function toWork(e, it) {
    var cv = $('bgCv'), r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * it.W / r.width, (e.clientY - r.top) * it.H / r.height];
  }
  function paint(it, x, y, val) {
    var rad = Math.max(1, B.size * it.W / 640), r2 = rad * rad;
    var x0 = Math.max(0, Math.floor(x - rad)), x1 = Math.min(it.W - 1, Math.ceil(x + rad));
    var y0 = Math.max(0, Math.floor(y - rad)), y1 = Math.min(it.H - 1, Math.ceil(y + rad));
    for (var yy = y0; yy <= y1; yy++) for (var xx = x0; xx <= x1; xx++) {
      var dx = xx - x, dy = yy - y; if (dx * dx + dy * dy <= r2) it.hints[yy * it.W + xx] = val;
    }
  }
  var lastP = null;
  $('bgCv').addEventListener('pointerdown', function (e) {
    var it = cur(); if (!it || B.brush === 'none' || B.busy) return;
    it.undo.push({ hints: it.hints.slice(), mask: it.mask ? it.mask.slice() : null, bgColor: it.bgColor.slice() });
    if (it.undo.length > 40) it.undo.shift();
    it.redo = [];
    B.drawing = true; lastP = toWork(e, it);
    $('bgCv').setPointerCapture(e.pointerId);
    paint(it, lastP[0], lastP[1], B.brush === 'keep' ? 1 : 2);
    refreshBtns(); drawView();
  });
  $('bgCv').addEventListener('pointermove', function (e) {
    var it = cur(); if (!it || !B.drawing) return;
    var p = toWork(e, it), val = B.brush === 'keep' ? 1 : 2;
    // خط پیوسته بین دو نقطه‌ی نمونه‌برداری
    var steps = Math.max(1, Math.ceil(Math.hypot(p[0] - lastP[0], p[1] - lastP[1]) / 2));
    for (var s = 1; s <= steps; s++) paint(it, lastP[0] + (p[0] - lastP[0]) * s / steps, lastP[1] + (p[1] - lastP[1]) * s / steps, val);
    lastP = p; drawView();
  });
  $('bgCv').addEventListener('pointerup', function () {
    var it = cur(); if (!it || !B.drawing) return;
    B.drawing = false;
    clearTimeout(TIMER);
    TIMER = setTimeout(function () { runAuto(it); }, 120);   // بعد از کشیدن قلم، دوباره حل می‌شود
  });

  // ---------- برگشت ----------
  function undoOne() {
    var it = cur(); if (!it || !it.undo.length) { status('کاری برای برگشت نیست.'); return; }
    it.redo.push({ hints: it.hints.slice(), mask: it.mask ? it.mask.slice() : null, bgColor: it.bgColor.slice() });
    var prev = it.undo.pop();
    it.hints = prev.hints; it.mask = prev.mask; it.bgColor = prev.bgColor;
    if (it.mask) { it.result = BGCore.matte(it.full, it.mask, it.W, it.H, it.bgColor); }
    refresh(); status('برگشت انجام شد.');
  }
  $('bgUndo').onclick = undoOne;

  // ---------- نمایش ----------
  function compose(res, back) {
    var c = document.createElement('canvas'); c.width = res.width; c.height = res.height;
    var x = c.getContext('2d');
    if (back === 'checker') {
      for (var yy = 0; yy < c.height; yy += 16) for (var xx = 0; xx < c.width; xx += 16) {
        x.fillStyle = ((xx + yy) / 16) % 2 ? '#d9dde6' : '#ffffff'; x.fillRect(xx, yy, 16, 16);
      }
    } else { x.fillStyle = back === 'white' ? '#ffffff' : B.color; x.fillRect(0, 0, c.width, c.height); }
    var tmp = document.createElement('canvas'); tmp.width = res.width; tmp.height = res.height;
    tmp.getContext('2d').putImageData(res, 0, 0);
    x.drawImage(tmp, 0, 0);
    return c;
  }
  function drawView() {
    var it = cur(), cv = $('bgCv'), empty = $('bgEmpty');
    if (!it) { cv.width = 2; cv.height = 2; empty.style.display = 'block'; cv.style.display = 'none'; return; }
    empty.style.display = 'none'; cv.style.display = 'block';
    var c;
    if (B.view === 'orig' || !it.result) { c = it.full; }
    else if (B.view === 'mask') {
      var m = document.createElement('canvas'); m.width = it.full.width; m.height = it.full.height;
      var mx = m.getContext('2d'), md = new ImageData(m.width, m.height);
      for (var i = 0; i < m.width * m.height; i++) { var v = it.result.data[i * 4 + 3]; md.data[i * 4] = md.data[i * 4 + 1] = md.data[i * 4 + 2] = v; md.data[i * 4 + 3] = 255; }
      mx.putImageData(md, 0, 0); c = m;
    } else { c = compose(it.result, B.back); }
    cv.width = c.width; cv.height = c.height;
    var x = cv.getContext('2d'); x.drawImage(c, 0, 0);
    // نشانه‌های قلم: سبز = نگه‌دار، قرمز = حذف
    if (it.hints && B.view !== 'orig') {
      var h = document.createElement('canvas'); h.width = it.W; h.height = it.H; var hx = h.getContext('2d'), hd = hx.createImageData(it.W, it.H);
      for (var j = 0; j < it.W * it.H; j++) { if (it.hints[j] === 1) { hd.data[j * 4] = 40; hd.data[j * 4 + 1] = 220; hd.data[j * 4 + 2] = 90; hd.data[j * 4 + 3] = 120; } else if (it.hints[j] === 2) { hd.data[j * 4] = 255; hd.data[j * 4 + 1] = 60; hd.data[j * 4 + 2] = 60; hd.data[j * 4 + 3] = 120; } }
      hx.putImageData(hd, 0, 0);
      x.imageSmoothingEnabled = true; x.drawImage(h, 0, 0, cv.width, cv.height);
    }
  }
  function refreshThumbs() {
    var box = $('bgThumbs'); box.innerHTML = '';
    B.items.forEach(function (it, i) {
      var d = document.createElement('div'); d.className = 'th' + (i === B.cur ? ' on' : '');
      var img = document.createElement('img'); img.className = 'bgthumb';
      var src = it.result ? compose(it.result, 'checker') : it.work;
      img.src = src.toDataURL('image/png');
      var s = document.createElement('small'); s.textContent = (i + 1) + ' · ' + (it.result ? 'حذف شد' : 'اصلی');
      var x = document.createElement('button'); x.className = 'x'; x.textContent = '✕';
      x.onclick = function (e) { e.stopPropagation(); B.items.splice(i, 1); B.cur = Math.min(B.cur, B.items.length - 1); refresh(); };
      d.onclick = function () { B.cur = i; refresh(); };
      d.appendChild(img); d.appendChild(s); d.appendChild(x); box.appendChild(d);
    });
  }
  function refreshBtns() {
    var it = cur();
    $('bgAuto').disabled = !it || B.busy;
    $('bgUndo').disabled = !it || !it.undo.length || B.busy;
    $('bgSave').disabled = !it || !it.result || B.busy;
    $('bgSaveAll').disabled = !B.items.some(function (x) { return x.result; }) || B.busy;
    $('bgColor').hidden = B.back !== 'color';
  }
  function refresh() { drawView(); refreshThumbs(); refreshBtns(); }

  $('bgView').onchange = function () { B.view = this.value; drawView(); };
  $('bgBack').onchange = function () { B.back = this.value; refresh(); };
  $('bgColor').oninput = function () { B.color = this.value; refresh(); };

  // ---------- ذخیره ----------
  function outCanvas(it) {
    // شفاف: PNG ؛ زمینه‌ی رنگی/سفید: JPG تخت
    var c = document.createElement('canvas'); c.width = it.full.width; c.height = it.full.height;
    if (B.back === 'checker') { var x = c.getContext('2d'); var tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height; tmp.getContext('2d').putImageData(it.result, 0, 0); x.drawImage(tmp, 0, 0); return { canvas: c, type: 'image/png', ext: '.png' }; }
    return { canvas: compose(it.result, B.back), type: 'image/jpeg', ext: '.jpg' };
  }
  async function blobOf(it) {
    var o = outCanvas(it);
    var blob = await new Promise(function (r) { o.canvas.toBlob(r, o.type, 0.95); });
    return { name: it.name.replace(/\.[^.]+$/, '') + '-bg' + o.ext, blob: blob };
  }
  $('bgSave').onclick = async function () {
    var it = cur(); if (!it || !it.result) return;
    var dir = await window.pickFolder(); if (dir === 'abort') return;
    status('در حال ساخت فایل…');
    var f = await blobOf(it);
    status(await window.saveFiles([f], dir));
  };
  $('bgSaveAll').onclick = async function () {
    var dir = await window.pickFolder(); if (dir === 'abort') return;
    var files = [];
    for (var i = 0; i < B.items.length; i++) if (B.items[i].result) { status('آماده‌سازی ' + (i + 1) + ' …'); files.push(await blobOf(B.items[i])); }
    if (!files.length) return status('هنوز پس‌زمینه‌ای حذف نشده است.');
    status(await window.saveFiles(files, dir));
  };

  window.bgRefresh = refresh;
  refresh();
})();

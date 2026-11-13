/* ===== روتوشر: عکس پرسنلی ۳×۴ و ۴×۶ سانتی‌متر (۳۰۰ dpi) =====
   - عکس از گالری یا (در اندروید) از دوربین گوشی
   - کادر ثابت با نسبت خروجی؛ عکس را با انگشت جابه‌جا و با نوار زوم بزرگ کن
   - روتوش خودکار: تنظیم روشنایی بر اساس میانگین نور، کنتراست ملایم، نرم‌کردن پوست
   - خروجی JPG با ابعاد دقیق (۳×۴ = ۳۵۴×۴۷۲ و ۴×۶ = ۴۷۲×۷۰۹ پیکسل) */
(function () {
  var DPI = 300, CM = 2.54;
  var SIZES = { '34': { w: 3, h: 4 }, '46': { w: 4, h: 6 } };
  var stage = document.getElementById('rtCv');
  if (!stage) return;
  var ctx = stage.getContext('2d');
  var R = { img: null, size: '34', zoom: 1, ox: 0, oy: 0, bright: 0, contrast: 0, smooth: 0 };
  var drag = null;

  function $r(id) { return document.getElementById(id); }
  function outPx(sz) { return { w: Math.round(SIZES[sz].w / CM * DPI), h: Math.round(SIZES[sz].h / CM * DPI) }; }

  // اندازه‌ی نمایش کادر: همان نسبت ۳:۴ یا ۴:۶، متناسب با عرض صفحه
  function resizeStage() {
    var box = stage.parentElement || document.body;
    var maxW = Math.max(200, Math.min(300, (box.clientWidth || 300) - 16));
    var s = SIZES[R.size];
    stage.width = Math.round(maxW);
    stage.height = Math.round(maxW * s.h / s.w);
  }

  function geom() {
    var W = stage.width, H = stage.height, img = R.img;
    var base = Math.max(W / img.width, H / img.height);
    var s = base * R.zoom;
    var dw = img.width * s, dh = img.height * s;
    return { s: s, dw: dw, dh: dh, x0: (W - dw) / 2 + R.ox, y0: (H - dh) / 2 + R.oy };
  }

  function clampOffsets() {
    var g = geom(), W = stage.width, H = stage.height;
    var mx = Math.max(0, (g.dw - W) / 2), my = Math.max(0, (g.dh - H) / 2);
    R.ox = Math.max(-mx, Math.min(mx, R.ox));
    R.oy = Math.max(-my, Math.min(my, R.oy));
  }

  // روشنایی و کنتراست و نرم‌کردن پوست روی یک canvas
  function adjust(c, w, h) {
    var x = c.getContext('2d');
    var d = x.getImageData(0, 0, w, h), px = d.data;
    var b = R.bright * 2.2, cc = R.contrast;
    var f = (259 * (cc + 255)) / (255 * (259 - cc));
    for (var i = 0; i < px.length; i += 4) {
      for (var k = 0; k < 3; k++) {
        var v = f * (px[i + k] - 128) + 128 + b;
        px[i + k] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
    x.putImageData(d, 0, 0);
    if (R.smooth > 0) softenSkin(c, w, h, R.smooth);
  }

  // محو ملایم: میانگین‌گیری جعبه‌ای و ترکیب با تصویر اصلی
  function softenSkin(c, w, h, amount) {
    var x = c.getContext('2d');
    var src = x.getImageData(0, 0, w, h), a = src.data;
    var r = amount >= 7 ? 3 : amount >= 4 ? 2 : 1;
    var tmp = new Uint8ClampedArray(a.length), out = new Uint8ClampedArray(a.length);
    var y, xx, k, sum, cnt, idx;
    for (y = 0; y < h; y++) for (xx = 0; xx < w; xx++) for (k = 0; k < 3; k++) {
      sum = 0; cnt = 0;
      for (var dx = -r; dx <= r; dx++) { var nx = xx + dx; if (nx < 0 || nx >= w) continue; sum += a[(y * w + nx) * 4 + k]; cnt++; }
      tmp[(y * w + xx) * 4 + k] = sum / cnt;
    }
    for (y = 0; y < h; y++) for (xx = 0; xx < w; xx++) for (k = 0; k < 3; k++) {
      sum = 0; cnt = 0;
      for (var dy = -r; dy <= r; dy++) { var ny = y + dy; if (ny < 0 || ny >= h) continue; sum += tmp[(ny * w + xx) * 4 + k]; cnt++; }
      idx = (y * w + xx) * 4 + k;
      out[idx] = sum / cnt;
    }
    var t = Math.min(0.6, amount / 14);
    for (var j = 0; j < a.length; j += 4) for (k = 0; k < 3; k++) {
      a[j + k] = a[j + k] * (1 - t) + out[j + k] * t;
    }
    x.putImageData(src, 0, 0);
  }

  // رندر کادر در ابعاد دلخواه
  function render(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    var g = geom(), k = w / stage.width;
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    x.drawImage(R.img, g.x0 * k, g.y0 * k, g.dw * k, g.dh * k);
    adjust(c, w, h);
    return c;
  }

  function drawPreview() {
    if (!R.img) return;
    resizeStage();
    clampOffsets();
    var p = render(stage.width, stage.height);
    ctx.clearRect(0, 0, stage.width, stage.height);
    ctx.drawImage(p, 0, 0);
    // کادر راهنما برای قرار دادن صورت (بیضی)
    ctx.strokeStyle = 'rgba(47,91,234,.85)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.ellipse(stage.width / 2, stage.height * 0.42, stage.width * 0.27, stage.height * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke(); ctx.setLineDash([]);
  }

  // روتوش خودکار: روشنایی بر اساس میانگین نور کادر، کنتراست ملایم، نرم‌کردن پوست
  function autoRetouch() {
    if (!R.img) return;
    var p = render(stage.width, stage.height), d = p.getContext('2d').getImageData(0, 0, p.width, p.height).data;
    var sum = 0, n = 0;
    for (var i = 0; i < d.length; i += 16) { sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++; }
    var mean = n ? sum / n : 200;
    // عکس پرسنلی باید روشن باشد: خودکار فقط عکس‌های تیره را روشن می‌کند و هیچ‌وقت تیره‌تر نمی‌کند
    R.bright = Math.max(0, Math.min(40, Math.round((175 - mean) * 0.3)));
    R.contrast = 12;
    R.smooth = 4;
    syncSliders();
    drawPreview();
    status('روتوش خودکار انجام شد. اگر خواستی، نوارها را تنظیم کن.');
  }

  function syncSliders() {
    $r('rtBright').value = R.bright;
    $r('rtContrast').value = R.contrast;
    $r('rtSmooth').value = R.smooth;
    $r('rtZoom').value = R.zoom;
  }

  function status(t) { var s = $r('rtStatus'); if (s) s.textContent = t; }

  function loadFile(file) {
    if (!file) return;
    var url = URL.createObjectURL(file);
    var im = new Image();
    im.onload = function () {
      R.img = im; R.zoom = 1; R.ox = 0; R.oy = 0;
      R.bright = 0; R.contrast = 0; R.smooth = 0; syncSliders();
      drawPreview();
      $r('rtAuto').disabled = false; $r('rtSave').disabled = false;
      status('عکس آماده است. کادر را با انگشت جابه‌جا کن، سپس روتوش خودکار را بزن.');
    };
    im.onerror = function () { status('این فایل عکس نیست یا باز نشد.'); };
    im.src = url;
  }

  function setSize(sz) {
    R.size = sz;
    document.querySelectorAll('.rt-size').forEach(function (b) { b.classList.toggle('on', b.dataset.size === sz); });
    drawPreview();
  }

  function save() {
    if (!R.img) return;
    var o = outPx(R.size);
    var c = render(o.w, o.h);
    c.toBlob(function (blob) {
      if (!blob) { status('ساخت فایل ناموفق بود.'); return; }
      var name = 'روتوش-' + (R.size === '34' ? '3x4' : '4x6') + '.jpg';
      if (window.desk && typeof downloadBlob === 'function') {
        downloadBlob(blob, name);
        status('فایل ذخیره شد: ' + name);
      } else {
        var url = URL.createObjectURL(blob);
        var box = $r('rtOut');
        box.innerHTML = '';
        var im = document.createElement('img'); im.src = url; im.alt = 'عکس روتوش‌شده';
        im.style.cssText = 'display:block;margin:8px auto;max-width:100%;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.25)';
        var p = document.createElement('p'); p.className = 'hint';
        p.textContent = 'خروجی: ' + o.w + '×' + o.h + ' پیکسل (' + (R.size === '34' ? '۳×۴' : '۴×۶') + ' سانتی‌متر، ۳۰۰ dpi). روی عکس نگه دارید و ذخیره کنید.';
        var dl = document.createElement('a'); dl.href = url; dl.download = name; dl.textContent = 'ذخیره‌ی فایل';
        dl.className = 'btn out'; dl.style.cssText = 'display:inline-flex;margin:6px auto;text-decoration:none';
        box.appendChild(im); box.appendChild(p); box.appendChild(dl);
        status('خروجی آماده شد.');
      }
    }, 'image/jpeg', 0.95);
  }

  // ---- رویدادها ----
  $r('rtPick').onclick = function () { $r('rtIn').click(); };
  $r('rtCam').onclick = function () { $r('rtCamIn').click(); };
  $r('rtIn').onchange = function (e) { loadFile(e.target.files[0]); e.target.value = ''; };
  $r('rtCamIn').onchange = function (e) { loadFile(e.target.files[0]); e.target.value = ''; };
  document.querySelectorAll('.rt-size').forEach(function (b) { b.onclick = function () { setSize(b.dataset.size); }; });
  $r('rtBright').oninput = function () { R.bright = +this.value; drawPreview(); };
  $r('rtContrast').oninput = function () { R.contrast = +this.value; drawPreview(); };
  $r('rtSmooth').oninput = function () { R.smooth = +this.value; drawPreview(); };
  $r('rtZoom').oninput = function () { R.zoom = +this.value; drawPreview(); };
  $r('rtAuto').onclick = autoRetouch;
  $r('rtSave').onclick = save;

  stage.style.touchAction = 'none';
  stage.addEventListener('pointerdown', function (e) { if (!R.img) return; drag = { x: e.clientX, y: e.clientY, ox: R.ox, oy: R.oy }; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    R.ox = drag.ox + (e.clientX - drag.x) * (stage.width / stage.getBoundingClientRect().width);
    R.oy = drag.oy + (e.clientY - drag.y) * (stage.height / stage.getBoundingClientRect().height);
    drawPreview();
  });
  stage.addEventListener('pointerup', function () { drag = null; });
  stage.addEventListener('pointercancel', function () { drag = null; });
  window.addEventListener('resize', function () { if (R.img) drawPreview(); });

  // ویندوز دوربین ندارد: فقط انتخاب از فایل
  if (window.desk) { var cb = $r('rtCam'); if (cb) cb.style.display = 'none'; }
  setSize('34');
  status('یک عکس انتخاب کن یا با دوربین بگیر.');
})();

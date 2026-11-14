/* ===== روتوشر حرفه‌ای عکس پرسنلی (۳×۴ و ۴×۶ سانتی‌متر، ۳۰۰ dpi) =====
   ترکیب دو نسخه: روتوشر کافی‌نت یار (چهره، کادربندی، پروفایل) + نمونه‌ی Traffic AI Retoucher
   (روشنایی، کنتراست، اشباع، گرمی رنگ، شارپنس، کاهش نویز، نمایش قبل/بعد، بازنشانی).
   ترتیب پردازش: تنظیم نور و رنگ → کاهش نویز → پوست و چهره → وضوح → خروجی */
(function () {
  var DPI = 300, CM = 2.54;
  var SIZES = { '34': { w: 3, h: 4 }, '46': { w: 4, h: 6 } };
  var PROFILES = {
    natural: { name: 'طبیعی',          wb: 0.5, shine: 0.3, red: 0.2, underEye: 0.2, teeth: 0.2, eyes: 0.2, sharp: 0.25, smooth: 3, contrast: 8 },
    fresh:   { name: 'شاداب',          wb: 0.7, shine: 0.5, red: 0.4, underEye: 0.5, teeth: 0.5, eyes: 0.5, sharp: 0.35, smooth: 5, contrast: 12 },
    pro:     { name: 'پرسنلی حرفه‌ای', wb: 0.8, shine: 0.6, red: 0.3, underEye: 0.4, teeth: 0.4, eyes: 0.4, sharp: 0.45, smooth: 4, contrast: 14 }
  };
  var NONE = { wb: 0, shine: 0, red: 0, underEye: 0, teeth: 0, eyes: 0, sharp: 0 };
  // مقادیر پیشنهادی نمونه‌ی Traffic AI Retoucher برای روتوش هوشمند
  var AUTO_PRESET = { sat: 8, warm: 2, sharp: 28, noise: 8 };

  var stage = document.getElementById('rtCv');
  if (!stage) return;
  var ctx = stage.getContext('2d');
  var R = {
    img: null, size: '34', zoom: 1, ox: 0, oy: 0,
    bright: 0, contrast: 0, smooth: 0, sat: 0, warm: 0, sharp: 0, noise: 0,
    profile: null, kp: null, steps: [], showOriginal: false
  };
  var drag = null;

  function $r(id) { return document.getElementById(id); }
  function outPx(sz) { return { w: Math.round(SIZES[sz].w / CM * DPI), h: Math.round(SIZES[sz].h / CM * DPI) }; }
  function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

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

  // میانگین جعبه‌ای جداکننده (سریع): یک بار افقی و یک بار عمودی
  function boxBlur(src, w, h, r) {
    var tmp = new Float32Array(src.length), out = new Float32Array(src.length), y, x, k, s, c;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      s = 0; c = 0;
      for (k = -r; k <= r; k++) { var nx = x + k; if (nx < 0 || nx >= w) continue; s += src[y * w + nx]; c++; }
      tmp[y * w + x] = s / c;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      s = 0; c = 0;
      for (k = -r; k <= r; k++) { var ny = y + k; if (ny < 0 || ny >= h) continue; s += tmp[ny * w + x]; c++; }
      out[y * w + x] = s / c;
    }
    return out;
  }
  function boxBlurRGB(a, w, h, r) {
    var N = w * h, out = new Float32Array(a.length), ch = new Float32Array(N), k, c;
    for (c = 0; c < 3; c++) {
      for (var i = 0; i < N; i++) ch[i] = a[i * 4 + c];
      var b = boxBlur(ch, w, h, r);
      for (k = 0; k < N; k++) out[k * 4 + c] = b[k];
    }
    return out;
  }

  // ۱) نور و رنگ: روشنایی، کنتراست، گرمی رنگ، اشباع (همان فرمول نمونه‌ی Traffic)
  function toneAdjust(a, N) {
    var b = R.bright, f = (259 * (R.contrast + 255)) / (255 * (259 - R.contrast));
    var warm = R.warm, sat = 1 + R.sat / 100;
    for (var i = 0; i < N * 4; i += 4) {
      var r = a[i] + b, g = a[i + 1] + b, bl = a[i + 2] + b;
      r = f * (r - 128) + 128; g = f * (g - 128) + 128; bl = f * (bl - 128) + 128;
      r += warm; bl -= warm;
      var gray = 0.299 * r + 0.587 * g + 0.114 * bl;
      r = gray + (r - gray) * sat; g = gray + (g - gray) * sat; bl = gray + (bl - gray) * sat;
      a[i] = clamp255(r); a[i + 1] = clamp255(g); a[i + 2] = clamp255(bl);
    }
  }

  // ۲) کاهش نویز: ترکیب ملایم با نسخه‌ی محوشده
  function denoise(a, w, h) {
    var t = (R.noise / 100) * 0.6;
    var bl = boxBlurRGB(a, w, h, 1);
    for (var i = 0; i < a.length; i += 4) for (var k = 0; k < 3; k++) a[i + k] = a[i + k] * (1 - t) + bl[i + k] * t;
  }

  // ۳) پوست و چهره و وضوح (ترتیب طبق راهنما)
  function enhance(im, w, h, T) {
    var P = R.profile ? PROFILES[R.profile] : NONE;
    var a = im.data, N = w * h, i, k, p, x, y;
    var steps = [];

    // تراز سفیدی (Gray World)
    if (P.wb > 0) {
      var sr = 0, sg = 0, sb = 0;
      for (i = 0; i < N * 4; i += 4) { sr += a[i]; sg += a[i + 1]; sb += a[i + 2]; }
      var mr = sr / N || 1, mg = sg / N || 1, mb = sb / N || 1, gray = (mr + mg + mb) / 3;
      var kk = [mr, mg, mb].map(function (m) { return Math.max(0.8, Math.min(1.25, 1 + P.wb * (gray / m - 1))); });
      for (i = 0; i < N * 4; i += 4) for (k = 0; k < 3; k++) a[i + k] = clamp255(a[i + k] * kk[k]);
      steps.push('تراز سفیدی');
    }

    // ماسک پوست (YCbCr) داخل ناحیه‌ی صورت
    var mask = new Float32Array(N), face = T.face;
    for (p = 0; p < N; p++) {
      var r = a[p * 4], g = a[p * 4 + 1], b2 = a[p * 4 + 2];
      var cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b2, cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b2;
      var inSkin = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
      var inFace = true;
      if (face) { x = p % w; y = (p - x) / w; var dx = (x - face.cx) / face.rx, dy = (y - face.cy) / face.ry; inFace = dx * dx + dy * dy <= 1; }
      mask[p] = inSkin && inFace ? 1 : 0;
    }
    mask = boxBlur(mask, w, h, 2);

    // کاهش براقی روی پوست
    if (P.shine > 0) {
      for (p = 0; p < N; p++) {
        var m = mask[p]; if (m < 0.05) continue;
        var L = 0.299 * a[p * 4] + 0.587 * a[p * 4 + 1] + 0.114 * a[p * 4 + 2];
        if (L > 200) { var f = 1 - P.shine * 0.35 * m * Math.min(1, (L - 200) / 55); for (k = 0; k < 3; k++) a[p * 4 + k] *= f; }
      }
      steps.push('کاهش براقی');
    }

    // کاهش قرمزی پوست
    if (P.red > 0) {
      for (p = 0; p < N; p++) {
        var mm = mask[p]; if (mm < 0.05) continue;
        var rr = a[p * 4], gg = a[p * 4 + 1];
        if (rr > gg) a[p * 4] = clamp255(rr - P.red * 0.3 * mm * (rr - gg));
      }
      steps.push('کاهش قرمزی');
    }

    // نرم‌سازی پوست: فقط روی ماسک پوست (لبه‌ها و جزئیات حفظ می‌شوند)
    var sm = R.smooth;
    if (sm > 0) {
      var blur = boxBlurRGB(a, w, h, sm >= 7 ? 3 : sm >= 4 ? 2 : 1);
      var amt = Math.min(0.7, sm / 12);
      for (p = 0; p < N; p++) {
        var t = mask[p] * amt; if (t < 0.01) continue;
        for (k = 0; k < 3; k++) a[p * 4 + k] = a[p * 4 + k] * (1 - t) + blur[p * 4 + k] * t;
      }
      steps.push('نرم‌سازی پوست');
    }

    // نقاط چهره (فقط اگر MediaPipe نقاط داده باشد)
    if (T.eyes && (P.underEye > 0 || P.eyes > 0 || P.teeth > 0)) {
      var d = T.d, e0 = T.eyes[0], e1 = T.eyes[1], mo = T.mouth;
      var spots = [
        { cx: e0.x, cy: e0.y + 0.2 * d, rx: 0.42 * d, ry: 0.14 * d, kind: 'under' },
        { cx: e1.x, cy: e1.y + 0.2 * d, rx: 0.42 * d, ry: 0.14 * d, kind: 'under' },
        { cx: e0.x, cy: e0.y, rx: 0.36 * d, ry: 0.12 * d, kind: 'eye' },
        { cx: e1.x, cy: e1.y, rx: 0.36 * d, ry: 0.12 * d, kind: 'eye' },
        { cx: mo.x, cy: mo.y, rx: 0.45 * d, ry: 0.16 * d, kind: 'teeth' }
      ];
      spots.forEach(function (s) {
        var strength = s.kind === 'under' ? P.underEye : s.kind === 'eye' ? P.eyes : P.teeth;
        if (strength <= 0) return;
        var x0 = Math.max(0, Math.floor(s.cx - s.rx)), x1 = Math.min(w - 1, Math.ceil(s.cx + s.rx));
        var y0 = Math.max(0, Math.floor(s.cy - s.ry)), y1 = Math.min(h - 1, Math.ceil(s.cy + s.ry));
        for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
          var ex = (x - s.cx) / s.rx, ey = (y - s.cy) / s.ry, dd = ex * ex + ey * ey;
          if (dd > 1) continue;
          var wgt = Math.pow(1 - dd, 1.2), q = (y * w + x) * 4;
          var R0 = a[q], G0 = a[q + 1], B0 = a[q + 2];
          var lum = 0.299 * R0 + 0.587 * G0 + 0.114 * B0;
          var mx = Math.max(R0, G0, B0), mn = Math.min(R0, G0, B0), sat = mx ? (mx - mn) / mx : 0;
          if (s.kind === 'under') {
            var lift = 22 * strength * wgt;
            a[q] = clamp255(R0 + lift); a[q + 1] = clamp255(G0 + lift); a[q + 2] = clamp255(B0 + lift * 0.6);
          } else if (s.kind === 'eye') {
            if (lum > 110 && sat < 0.3) { var tw = strength * 0.35 * wgt; a[q] = R0 + (255 - R0) * tw; a[q + 1] = G0 + (255 - G0) * tw; a[q + 2] = B0 + (255 - B0) * tw; }
            a[q] = clamp255(a[q] - strength * 8 * wgt);
          } else {
            if (lum > 130 && sat < 0.22) { var tt = strength * 0.4 * wgt; a[q] = R0 + (255 - R0) * tt; a[q + 1] = G0 + (255 - G0) * tt; a[q + 2] = B0 + (255 - B0) * tt; }
          }
        }
      });
      steps.push('زیر چشم', 'سفیدی چشم', 'سفیدی دندان');
    }

    // وضوح: شارپ پروفایل + شارپنس دستی
    var sharpAmt = Math.min(1, P.sharp + R.sharp / 100);
    if (sharpAmt > 0) {
      var soft = boxBlurRGB(a, w, h, 2), amt2 = sharpAmt * 0.8;
      for (i = 0; i < N * 4; i++) if (i % 4 !== 3) a[i] = clamp255(a[i] + amt2 * (a[i] - soft[i]));
      steps.push('وضوح');
    }
    return steps;
  }

  // رندر کادر در ابعاد دلخواه. forSave=false اگر نمایش قبل/بعد فعال باشد، نسخه‌ی اصلی برمی‌گردد.
  function render(w, h, forSave) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    var g = geom(), k = w / stage.width;
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    x.drawImage(R.img, g.x0 * k, g.y0 * k, g.dw * k, g.dh * k);
    if (R.showOriginal && !forSave) return c;
    var im = x.getImageData(0, 0, w, h), N = w * h;
    toneAdjust(im.data, N);
    if (R.noise > 0) denoise(im.data, w, h);
    var T = { face: null, eyes: null, mouth: null, d: 0 };
    if (R.kp && R.kp.length >= 2) {
      var iw = R.img.width, ih = R.img.height;
      var mp = function (q) { return { x: (g.x0 + q.x * iw * g.s) * k, y: (g.y0 + q.y * ih * g.s) * k }; };
      var e0 = mp(R.kp[0]), e1 = mp(R.kp[1]);
      var m0 = R.kp[3] ? mp(R.kp[3]) : { x: (e0.x + e1.x) / 2, y: (e0.y + e1.y) / 2 + 0.6 * Math.hypot(e0.x - e1.x, e0.y - e1.y) };
      var dd = Math.hypot(e0.x - e1.x, e0.y - e1.y);
      T.eyes = [e0, e1]; T.mouth = m0; T.d = dd;
      T.face = { cx: (e0.x + e1.x) / 2, cy: ((e0.y + e1.y) / 2 + m0.y) / 2, rx: 1.3 * dd, ry: 1.9 * dd };
    }
    var pre = ['نور و رنگ'];
    if (R.noise > 0) pre.push('کاهش نویز');
    var st = enhance(im, w, h, T);
    R.steps = pre.concat(st || []);
    x.putImageData(im, 0, 0);
    return c;
  }

  function drawPreview() {
    if (!R.img) return;
    resizeStage();
    clampOffsets();
    var p = render(stage.width, stage.height, false);
    ctx.clearRect(0, 0, stage.width, stage.height);
    ctx.drawImage(p, 0, 0);
    if (!R.showOriginal) {
      ctx.strokeStyle = 'rgba(47,91,234,.85)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(stage.width / 2, stage.height * 0.42, stage.width * 0.27, stage.height * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // ---- MediaPipe Face Detector (پکیج @mediapipe/tasks-vision از پروژه‌ی google-ai-edge/mediapipe) ----
  var fdPromise = null;
  function loadDetector() {
    if (fdPromise) return fdPromise;
    fdPromise = (async function () {
      var base = new URL('../mediapipe/', location.href);
      var mod = await import(new URL('vision_bundle.mjs', base).href);
      var vision = await mod.FilesetResolver.forVisionTasks(new URL('wasm', base).href);
      return await mod.FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: new URL('blaze_face_short_range.tflite', base).href },
        runningMode: 'IMAGE'
      });
    })();
    fdPromise.catch(function () { fdPromise = null; });
    return fdPromise;
  }

  // کادربندی: صورت حدود ۵۵٪ ارتفاع کادر و مرکز صورت وسط کادر
  function frameFace(box) {
    var W = stage.width, H = stage.height, img = R.img;
    var base = Math.max(W / img.width, H / img.height);
    var cx = box.originX + box.width / 2, cy = box.originY + box.height / 2;
    var s = (H * 0.55) / box.height;
    R.zoom = Math.max(1, Math.min(3, s / base));
    var g = geom();
    var x0 = W / 2 - cx * g.s, y0 = H / 2 - cy * g.s;
    R.ox = x0 - (W - g.dw) / 2;
    R.oy = y0 - (H - g.dh) / 2;
  }

  function syncSliders() {
    $r('rtBright').value = R.bright;
    $r('rtContrast').value = R.contrast;
    $r('rtSatur').value = R.sat;
    $r('rtWarm').value = R.warm;
    $r('rtSmooth').value = R.smooth;
    $r('rtSharp').value = R.sharp;
    $r('rtNoise').value = R.noise;
    $r('rtZoom').value = R.zoom;
    document.querySelectorAll('.rt-pf').forEach(function (b) { b.classList.toggle('on', b.dataset.pf === R.profile); });
    var cmp = $r('rtCompare'); if (cmp) cmp.textContent = R.showOriginal ? '👁 نمایش نتیجه' : '👁 نمایش قبل / بعد';
  }

  function status(t) { var s = $r('rtStatus'); if (s) s.textContent = t; }

  // روشنایی خودکار: فقط عکس تیره را روشن می‌کند (عکس پرسنلی باید روشن باشد)
  function autoLevels() {
    var p = render(stage.width, stage.height, true), d = p.getContext('2d').getImageData(0, 0, p.width, p.height).data;
    var sum = 0, n = 0;
    for (var i = 0; i < d.length; i += 16) { sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++; }
    var mean = n ? sum / n : 200;
    R.bright = Math.max(0, Math.min(40, Math.round((175 - mean) * 0.3)));
  }

  function applyProfile(key) {
    var P = PROFILES[key];
    R.profile = key;
    R.contrast = P.contrast; R.smooth = P.smooth;
  }

  function setButtons(on) {
    ['rtCompare', 'rtReset'].forEach(function (id) { var b = $r(id); if (b) b.disabled = !on; });
  }

  // روتوش کامل خودکار: تشخیص چهره + کادربندی + پروفایل + تنظیمات نمونه + نور
  function autoRetouch() {
    if (!R.img) return;
    status('در حال تشخیص چهره ...');
    var profileKey = R.profile || 'natural';
    R.showOriginal = false;
    var finish = function (msg) {
      applyProfile(profileKey);
      R.sat = AUTO_PRESET.sat; R.warm = AUTO_PRESET.warm; R.sharp = AUTO_PRESET.sharp; R.noise = AUTO_PRESET.noise;
      autoLevels(); syncSliders(); drawPreview();
      // پیام بعد از پردازش ساخته می‌شود تا فهرست مراحل تازه باشد
      status(typeof msg === 'function' ? msg() : msg);
    };
    (fdPromise ? fdPromise : loadDetector()).then(function (det) {
      var res = det.detect(R.img);
      if (!res.detections || !res.detections.length) {
        R.kp = null;
        finish('چهره‌ای پیدا نشد. کادر را دستی تنظیم کن؛ پوست و نور خودکار اعمال شد.');
        return;
      }
      var best = res.detections.reduce(function (a, b) { return (b.boundingBox.width * b.boundingBox.height) > (a.boundingBox.width * a.boundingBox.height) ? b : a; });
      R.kp = (best.keypoints || []).map(function (q) { return { x: q.x, y: q.y }; });
      frameFace(best.boundingBox);
      finish(function () { return 'روتوش انجام شد: ' + (R.steps.length ? R.steps.join('، ') : 'بدون مرحله‌ی چهره') + '.'; });
    }).catch(function () {
      R.kp = null;
      finish('تشخیص چهره در این دستگاه در دسترس نیست. کادر را دستی تنظیم کن؛ پوست و نور خودکار اعمال شد.');
    });
  }

  function loadUrl(url) {
    var im = new Image();
    im.onload = function () {
      R.img = im; R.zoom = 1; R.ox = 0; R.oy = 0; R.kp = null;
      R.bright = 0; R.contrast = 0; R.smooth = 0; R.sat = 0; R.warm = 0; R.sharp = 0; R.noise = 0;
      R.profile = null; R.steps = []; R.showOriginal = false;
      syncSliders(); drawPreview(); setButtons(true);
      $r('rtAuto').disabled = false; $r('rtSave').disabled = false;
      status('عکس آماده است. «روتوش هوشمند خودکار» را بزن یا تنظیمات را دستی تغییر بده.');
    };
    im.onerror = function () { status('عکس باز نشد.'); };
    im.src = url;
  }
  function loadFile(file) { if (!file) return; loadUrl(URL.createObjectURL(file)); }

  function nativeCamera() {
    var C = window.Capacitor;
    return !!(C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.Camera);
  }
  function nativePick(source) {
    status('در حال باز کردن ' + (source === 'CAMERA' ? 'دوربین' : 'گالری') + ' ...');
    window.Capacitor.Plugins.Camera.getPhoto({ resultType: 'uri', source: source, quality: 92, correctOrientation: true })
      .then(function (photo) { loadUrl(photo.webPath); })
      .catch(function () { status('انتخاب عکس لغو شد یا دسترسی داده نشد.'); });
  }

  function setSize(sz) {
    R.size = sz;
    document.querySelectorAll('.rt-size').forEach(function (b) { b.classList.toggle('on', b.dataset.size === sz); });
    drawPreview();
  }

  // ذخیره: همیشه نسخه‌ی پردازش‌شده (حتی اگر نمایش قبل فعال باشد)
  function save() {
    if (!R.img) return;
    var o = outPx(R.size);
    var c = render(o.w, o.h, true);
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

  function resetAll() {
    if (!R.img) return;
    R.bright = 0; R.contrast = 0; R.smooth = 0; R.sat = 0; R.warm = 0; R.sharp = 0; R.noise = 0;
    R.profile = null; R.showOriginal = false; R.steps = [];
    syncSliders(); drawPreview();
    status('تنظیمات به حالت اولیه برگشت.');
  }

  function toggleCompare() {
    if (!R.img) return;
    R.showOriginal = !R.showOriginal;
    syncSliders(); drawPreview();
    status(R.showOriginal ? 'نسخه‌ی اصلی نمایش داده می‌شود.' : 'نسخه‌ی پردازش‌شده نمایش داده می‌شود.');
  }

  // ---- رویدادها ----
  $r('rtPick').onclick = function () { if (nativeCamera()) nativePick('PHOTOS'); else $r('rtIn').click(); };
  $r('rtCam').onclick = function () { if (nativeCamera()) nativePick('CAMERA'); else $r('rtCamIn').click(); };
  $r('rtIn').onchange = function (e) { loadFile(e.target.files[0]); e.target.value = ''; };
  $r('rtCamIn').onchange = function (e) { loadFile(e.target.files[0]); e.target.value = ''; };
  document.querySelectorAll('.rt-size').forEach(function (b) { b.onclick = function () { setSize(b.dataset.size); }; });
  document.querySelectorAll('.rt-pf').forEach(function (b) { b.onclick = function () { applyProfile(b.dataset.pf); R.showOriginal = false; syncSliders(); drawPreview(); }; });
  var bind = function (id, key, scale) {
    var el = $r(id); if (!el) return;
    el.oninput = function () { R[key] = +this.value * (scale || 1); R.showOriginal = false; drawPreview(); };
  };
  bind('rtBright', 'bright'); bind('rtContrast', 'contrast'); bind('rtSatur', 'sat'); bind('rtWarm', 'warm');
  bind('rtSmooth', 'smooth'); bind('rtSharp', 'sharp'); bind('rtNoise', 'noise');
  $r('rtZoom').oninput = function () { R.zoom = +this.value; drawPreview(); };
  $r('rtAuto').onclick = autoRetouch;
  $r('rtSave').onclick = save;
  $r('rtCompare').onclick = toggleCompare;
  $r('rtReset').onclick = resetAll;

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

  if (window.desk) { var cb = $r('rtCam'); if (cb) cb.style.display = 'none'; }
  setSize('34');
  status('یک عکس انتخاب کن یا با دوربین بگیر، سپس روتوش را اجرا کن.');
})();

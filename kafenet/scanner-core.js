/* سفیدکننده (اسکنر سند) - هسته‌ی پردازش تصویر. بدون وابستگی خارجی. */
(function () {
  'use strict';
  var Scan = {};

  function otsu(g) {
    var h = new Array(256).fill(0), i, t;
    for (i = 0; i < g.length; i++) h[g[i]]++;
    var N = g.length, sum = 0;
    for (t = 0; t < 256; t++) sum += t * h[t];
    var sB = 0, wB = 0, best = -1, th = 128;
    for (t = 0; t < 256; t++) {
      wB += h[t];
      if (!wB) continue;
      var wF = N - wB;
      if (!wF) break;
      sB += t * h[t];
      var mB = sB / wB, mF = (sum - sB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; th = t; }
    }
    return th;
  }

  // تشخیص خودکار: بزرگ‌ترین ناحیه‌ی روشن (کاغذ) -> چهار گوشه (نرمال‌شده 0..1) به ترتیب TL,TR,BR,BL
  Scan.detect = function (canvas) {
    var w = canvas.width, h = canvas.height, n = w * h;
    var d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    var g = new Uint8Array(n), i, p;
    for (i = 0, p = 0; i < n; i++, p += 4) g[i] = (d[p] * 299 + d[p + 1] * 587 + d[p + 2] * 114) / 1000 | 0;
    var th = otsu(g), mask = new Uint8Array(n);
    for (i = 0; i < n; i++) mask[i] = g[i] > th ? 1 : 0;
    var lab = new Uint8Array(n), stack = new Int32Array(n), bestIds = null, bestN = 0;
    for (var s = 0; s < n; s++) {
      if (!mask[s] || lab[s]) continue;
      var sp = 0, ids = [];
      stack[sp++] = s; lab[s] = 1;
      while (sp) {
        var q = stack[--sp]; ids.push(q);
        var x = q % w, y = (q / w) | 0;
        if (x > 0 && mask[q - 1] && !lab[q - 1]) { lab[q - 1] = 1; stack[sp++] = q - 1; }
        if (x < w - 1 && mask[q + 1] && !lab[q + 1]) { lab[q + 1] = 1; stack[sp++] = q + 1; }
        if (y > 0 && mask[q - w] && !lab[q - w]) { lab[q - w] = 1; stack[sp++] = q - w; }
        if (y < h - 1 && mask[q + w] && !lab[q + w]) { lab[q + w] = 1; stack[sp++] = q + w; }
      }
      if (ids.length > bestN) { bestN = ids.length; bestIds = ids; }
    }
    if (!bestIds || bestN < n * 0.05) return Scan.defaultCorners();
    return Scan.minRectCorners(bestIds, w, h) || Scan.defaultCorners();
  };

  function distLine(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / L;
  }
  function dpOpen(pts, eps) {
    if (pts.length < 3) return pts;
    var a = pts[0], b = pts[pts.length - 1], md = -1, idx = -1, i;
    for (i = 1; i < pts.length - 1; i++) {
      var d = distLine(pts[i], a, b);
      if (d > md) { md = d; idx = i; }
    }
    if (md > eps) {
      var L = dpOpen(pts.slice(0, idx + 1), eps), R = dpOpen(pts.slice(idx), eps);
      return L.slice(0, -1).concat(R);
    }
    return [a, b];
  }
  // ساده‌سازی چندضلعی بسته با افزایش تدریجی tolerance تا رسیدن به ۴ رأس
  Scan.hullToQuad = function (hull) {
    var m = hull.length, far = 0, fd = -1, i;
    for (i = 1; i < m; i++) {
      var d = Math.hypot(hull[i][0] - hull[0][0], hull[i][1] - hull[0][1]);
      if (d > fd) { fd = d; far = i; }
    }
    var diag = Math.hypot(fd, 1);
    for (var eps = 1; eps < diag * 0.25; eps *= 1.12) {
      var P1 = dpOpen(hull.slice(0, far + 1), eps);
      var P2 = dpOpen(hull.slice(far).concat([hull[0]]), eps);
      var P = P1.slice(0, -1).concat(P2.slice(0, -1));
      if (P.length === 4) return P;
      if (P.length < 4) return null;
    }
    return null;
  };
  // ترتیب گوشه‌ها: TL, TR, BR, BL
  Scan.orderCorners = function (P, w, h) {
    var tl = P[0], tr = P[0], br = P[0], bl = P[0], i;
    for (i = 1; i < 4; i++) {
      var q = P[i];
      if (q[0] + q[1] < tl[0] + tl[1]) tl = q;
      if (q[0] + q[1] > br[0] + br[1]) br = q;
      if (q[0] - q[1] > tr[0] - tr[1]) tr = q;
      if (q[0] - q[1] < bl[0] - bl[1]) bl = q;
    }
    return [tl, tr, br, bl].map(function (r) {
      return [Math.min(1, Math.max(0, r[0] / w)), Math.min(1, Math.max(0, r[1] / h))];
    });
  };

  // کوچک‌ترین مستطیل محیطی ناحیه‌ی کاغذ (پوسته‌ی محدب + چرخش)، پس برگه‌ی کج صاف می‌شود
  Scan.minRectCorners = function (ids, w, h) {
    var pts = new Array(ids.length), i, k;
    for (i = 0; i < ids.length; i++) pts[i] = [ids[i] % w, (ids[i] / w) | 0];
    pts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], up = [], p;
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    }
    for (i = pts.length - 1; i >= 0; i--) {
      p = pts[i];
      while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
      up.push(p);
    }
    var hull = lo.slice(0, -1).concat(up.slice(0, -1));
    if (hull.length < 3) return null;
    // روش اول: ساده‌سازی پوسته به دقیقاً ۴ گوشه (برای کاغذ با پرسپکتیو و چرخش)
    var quad = Scan.hullToQuad(hull);
    if (quad) return Scan.orderCorners(quad, w, h);
    // روش دوم: کوچک‌ترین مستطیل محیطی (برای برگه‌ی کج)
    var best = null, bestA = Infinity;
    for (i = 0; i < hull.length; i++) {
      var a = hull[i], b = hull[(i + 1) % hull.length];
      var th = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(th), sn = Math.sin(th);
      var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
      for (k = 0; k < hull.length; k++) {
        var q = hull[k];
        var x = q[0] * c + q[1] * sn, y = -q[0] * sn + q[1] * c;
        if (x < minx) minx = x; if (x > maxx) maxx = x;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
      }
      var area = (maxx - minx) * (maxy - miny);
      if (area < bestA) { bestA = area; best = { th: th, minx: minx, maxx: maxx, miny: miny, maxy: maxy }; }
    }
    if (bestA < w * h * 0.05) return null;
    var cs = Math.cos(best.th), sn2 = Math.sin(best.th);
    var rc = [[best.minx, best.miny], [best.maxx, best.miny], [best.maxx, best.maxy], [best.minx, best.maxy]];
    var pc = rc.map(function (r) { return [r[0] * cs - r[1] * sn2, r[0] * sn2 + r[1] * cs]; });
    var start = 0;
    for (i = 1; i < 4; i++) if (pc[i][0] + pc[i][1] < pc[start][0] + pc[start][1]) start = i;
    var ord = [0, 1, 2, 3].map(function (j) { return pc[(start + j) % 4]; });
    return ord.map(function (r) {
      return [Math.min(1, Math.max(0, r[0] / w)), Math.min(1, Math.max(0, r[1] / h))];
    });
  };

  Scan.defaultCorners = function () { return [[0.04, 0.04], [0.96, 0.04], [0.96, 0.96], [0.04, 0.96]]; };

  // حل دستگاه ۸×۸ با حذف گاوسی
  function solve8(A, b) {
    var n = 8, M = A.map(function (r, i) { return r.concat([b[i]]); }), c, r, k;
    for (c = 0; c < n; c++) {
      var piv = c;
      for (r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      var tmp = M[c]; M[c] = M[piv]; M[piv] = tmp;
      var dv = M[c][c] || 1e-12;
      for (r = 0; r < n; r++) {
        if (r === c) continue;
        var f = M[r][c] / dv;
        if (!f) continue;
        for (k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map(function (row, i) { return row[n] / (row[i] || 1e-12); });
  }

  // هموگرافی که نقاط src را به dst می‌برد: خروجی ماتریس ۳×۳ به صورت آرایه‌ی ۹تایی
  function homography(src, dst) {
    var A = [], b = [], i;
    for (i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], u = dst[i][0], v = dst[i][1];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    var h = solve8(A, b);
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  }

  // صاف‌کردن پرسپکتیو: کاغذ مورب/زاویه‌دار -> مستطیل روبه‌رو
  Scan.warp = function (src, corners, maxSide) {
    var sw = src.width, sh = src.height;
    var P = corners.map(function (c) { return [c[0] * sw, c[1] * sh]; });
    function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
    var W = Math.round(Math.max(dist(P[0], P[1]), dist(P[3], P[2])));
    var H = Math.round(Math.max(dist(P[0], P[3]), dist(P[1], P[2])));
    W = Math.max(W, 40); H = Math.max(H, 40);
    var k = Math.min(1, maxSide / Math.max(W, H));
    W = Math.max(1, Math.round(W * k)); H = Math.max(1, Math.round(H * k));
    var D = [[0, 0], [W - 1, 0], [W - 1, H - 1], [0, H - 1]];
    var m = homography(D, P); // dst -> src
    var sd = src.getContext('2d').getImageData(0, 0, sw, sh).data;
    var out = new ImageData(W, H), od = out.data;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var den = m[6] * x + m[7] * y + 1;
        var sx = (m[0] * x + m[1] * y + m[2]) / den, sy = (m[3] * x + m[4] * y + m[5]) / den;
        var o = (y * W + x) * 4;
        if (sx < 0) sx = 0; if (sy < 0) sy = 0;
        if (sx > sw - 1) sx = sw - 1; if (sy > sh - 1) sy = sh - 1;
        var x0 = sx | 0, y0 = sy | 0, x1 = Math.min(x0 + 1, sw - 1), y1 = Math.min(y0 + 1, sh - 1);
        var fx = sx - x0, fy = sy - y0;
        var p00 = (y0 * sw + x0) * 4, p10 = (y0 * sw + x1) * 4, p01 = (y1 * sw + x0) * 4, p11 = (y1 * sw + x1) * 4;
        for (var c = 0; c < 3; c++) {
          od[o + c] = (sd[p00 + c] * (1 - fx) + sd[p10 + c] * fx) * (1 - fy) + (sd[p01 + c] * (1 - fx) + sd[p11 + c] * fx) * fy;
        }
        od[o + 3] = 255;
      }
    }
    return out;
  };

  // تخمین پس‌زمینه‌ی روشن (کاغذ) به‌صورت بیشینه‌ی محلی؛ متن تیره حذف می‌شود
  function background(id) {
    var w = id.width, h = id.height, d = id.data;
    var f = Math.max(2, Math.round(Math.max(w, h) / 400));   // شبکه‌ی ریزتر: بدون لکه‌ی بلوکی
    var sw = Math.ceil(w / f), sh = Math.ceil(h / f), ch = [0, 1, 2];
    var small = ch.map(function () { return new Float32Array(sw * sh); });
    for (var by = 0; by < sh; by++) for (var bx = 0; bx < sw; bx++) {
      var mx = [0, 0, 0];
      for (var y = by * f; y < Math.min(h, by * f + f); y++) for (var x = bx * f; x < Math.min(w, bx * f + f); x++) {
        var p = (y * w + x) * 4;
        if (d[p] > mx[0]) mx[0] = d[p];
        if (d[p + 1] > mx[1]) mx[1] = d[p + 1];
        if (d[p + 2] > mx[2]) mx[2] = d[p + 2];
      }
      for (var c = 0; c < 3; c++) small[c][by * sw + bx] = mx[c];
    }
    // دو بار میانگین‌گیری جعبه‌ای برای نرم‌شدن
    var tmp = new Float32Array(sw * sh);
    function blur(a, r) {
      for (var yy = 0; yy < sh; yy++) for (var xx = 0; xx < sw; xx++) {
        var s = 0, n = 0;
        for (var k = -r; k <= r; k++) { var q = xx + k; if (q >= 0 && q < sw) { s += a[yy * sw + q]; n++; } }
        tmp[yy * sw + xx] = s / n;
      }
      for (yy = 0; yy < sh; yy++) for (xx = 0; xx < sw; xx++) {
        s = 0; n = 0;
        for (k = -r; k <= r; k++) { q = yy + k; if (q >= 0 && q < sh) { s += tmp[q * sw + xx]; n++; } }
        a[yy * sw + xx] = s / n;
      }
    }
    small.forEach(function (a) { blur(a, 3); blur(a, 3); blur(a, 2); });  // هموارسازی بیشتر پس‌زمینه
    // بزرگ‌نمایی دوخطی به اندازه‌ی کامل
    var bg = ch.map(function () { return new Float32Array(w * h); });
    for (y = 0; y < h; y++) {
      var gy = Math.min(Math.max((y + 0.5) / f - 0.5, 0), sh - 1), y0 = gy | 0, y1 = Math.min(y0 + 1, sh - 1), fy = gy - y0;
      for (x = 0; x < w; x++) {
        var gx = Math.min(Math.max((x + 0.5) / f - 0.5, 0), sw - 1), x0 = gx | 0, x1 = Math.min(x0 + 1, sw - 1), fx = gx - x0;
        for (c = 0; c < 3; c++) {
          var a = small[c];
          bg[c][y * w + x] = (a[y0 * sw + x0] * (1 - fx) + a[y0 * sw + x1] * fx) * (1 - fy) + (a[y1 * sw + x0] * (1 - fx) + a[y1 * sw + x1] * fx) * fy;
        }
      }
    }
    return bg;
  }

  // حذف سایه: هر کانال بر پس‌زمینه‌اش تقسیم می‌شود
  function flatten(id) {
    var w = id.width, h = id.height, d = id.data, bg = background(id);
    var out = new ImageData(w, h), od = out.data;
    for (var i = 0, p = 0; i < w * h; i++, p += 4) {
      for (var c = 0; c < 3; c++) {
        var v = d[p + c] * 255 / Math.max(bg[c][i], 110);  // کف پس‌زمینه: نویز نواحی تیره تقویت نشود
        od[p + c] = v > 255 ? 255 : v;
      }
      od[p + 3] = 255;
    }
    return out;
  }

  function hist(vals) { var h = new Array(256).fill(0); for (var i = 0; i < vals.length; i++) h[vals[i] | 0]++; return h; }
  function pct(h, total, p) { var acc = 0; for (var i = 0; i < 256; i++) { acc += h[i]; if (acc >= total * p) return i; } return 255; }

  // کانال‌ها را جداگانه با صدک‌ها کش می‌دهد (سفید کردن کاغذ و کنتراست)
  function stretch(id, hiP, loP, gamma) {
    var d = id.data, n = id.width * id.height;
    for (var c = 0; c < 3; c++) {
      var vals = new Uint8Array(n);
      for (var i = 0, p = 0; i < n; i++, p += 4) vals[i] = d[p + c];
      var h = hist(vals), hi = Math.max(pct(h, n, hiP), 1), lo = pct(h, n, loP);
      for (i = 0, p = 0; i < n; i++, p += 4) {
        var v = (d[p + c] - lo) * 255 / Math.max(hi - lo, 1);
        v = v < 0 ? 0 : v > 255 ? 255 : v;
        if (gamma) v = 255 * Math.pow(v / 255, gamma);
        d[p + c] = v;
      }
    }
    return id;
  }

  function gray(id) {
    var d = id.data, n = id.width * id.height;
    for (var i = 0, p = 0; i < n; i++, p += 4) {
      var g = d[p] * 0.299 + d[p + 1] * 0.587 + d[p + 2] * 0.114;
      d[p] = d[p + 1] = d[p + 2] = g;
    }
    return id;
  }

  function saturate(id, s) {
    var d = id.data, n = id.width * id.height;
    for (var i = 0, p = 0; i < n; i++, p += 4) {
      var g = d[p] * 0.299 + d[p + 1] * 0.587 + d[p + 2] * 0.114;
      for (var c = 0; c < 3; c++) {
        var v = g + (d[p + c] - g) * s;
        d[p + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
    return id;
  }

  function sharpen(id, amt) {
    var w = id.width, h = id.height, d = id.data, n = w * h;
    var src = new Float32Array(n);
    for (var i = 0, p = 0; i < n; i++, p += 4) src[i] = d[p];
    var bl = new Float32Array(n), t = new Float32Array(n), r = 2, x, y, k;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var s = 0, c = 0;
      for (k = -r; k <= r; k++) { var q = x + k; if (q >= 0 && q < w) { s += src[y * w + q]; c++; } }
      t[y * w + x] = s / c;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      s = 0; c = 0;
      for (k = -r; k <= r; k++) { var q2 = y + k; if (q2 >= 0 && q2 < h) { s += t[q2 * w + x]; c++; } }
      bl[y * w + x] = s / c;
    }
    for (i = 0, p = 0; i < n; i++, p += 4) {
      var v = src[i] + amt * (src[i] - bl[i]);
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      d[p] = d[p + 1] = d[p + 2] = v;
    }
    return id;
  }

  function binarize(id, thr) {
    var d = id.data, n = id.width * id.height;
    for (var i = 0, p = 0; i < n; i++, p += 4) {
      var g = d[p] * 0.299 + d[p + 1] * 0.587 + d[p + 2] * 0.114;
      var v = g > thr ? 255 : 0;
      d[p] = d[p + 1] = d[p + 2] = v;
    }
    return id;
  }

  Scan.filters = {
    // اصلی: بدون تغییر
    original: function (id) { return id; },
    // No Shadow: فقط حذف سایه و کمی سفیدکردن کاغذ، رنگ طبیعی می‌ماند
    noshadow: function (id) { return stretch(flatten(id), 0.995, 0, 0); },
    // Magic Color: حذف سایه + سفیدکردن کاغذ + تقویت رنگ‌ها
    magic: function (id) { return saturate(stretch(flatten(id), 0.99, 0.01, 0.95), 1.25); },
    // Magic Pro: متن تیز و سیاه، پس‌زمینه‌ی کاملاً سفید (خاکستری)
    pro: function (id) {
      var f = gray(stretch(flatten(id), 0.985, 0.02, 0));
      f = stretch(f, 0.999, 0.03, 0);
      return sharpen(f, 0.8);
    },
    // سیاه‌وسفید (آستانه‌ی ثابت روی تصویر صاف‌شده)
    bw: function (id) { return binarize(gray(flatten(id)), 200); }
  };

  function toCanvas(id) {
    var c = document.createElement('canvas');
    c.width = id.width; c.height = id.height;
    c.getContext('2d').putImageData(id, 0, 0);
    return c;
  }

  // اعمال کامل: صاف‌کردن پرسپکتیو + فیلتر. خروجی canvas
  Scan.apply = function (src, corners, filter, maxSide) {
    var warped = Scan.warp(src, corners, maxSide);
    var f = Scan.filters[filter] || Scan.filters.magic;
    var out = f(warped);
    // کراپ حاشیه‌ی ۰٫۶٪ تا نوار تیره‌ی لبه‌ی عکس روی کاغذ نماند
    var m = Math.round(Math.min(out.width, out.height) * 0.006);
    if (m < 1 || out.width <= 2 * m || out.height <= 2 * m) return toCanvas(out);
    var c = toCanvas(out), r = document.createElement('canvas');
    r.width = out.width - 2 * m; r.height = out.height - 2 * m;
    r.getContext('2d').drawImage(c, m, m, r.width, r.height, 0, 0, r.width, r.height);
    return r;
  };

  // فایل تصویر -> canvas (با رعایت چرخش EXIF و محدودیت اندازه)
  Scan.loadFile = async function (file, maxSide) {
    var bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    var k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    var c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close && bmp.close();
    return c;
  };

  Scan.resizeCanvas = function (src, maxSide) {
    var k = Math.min(1, maxSide / Math.max(src.width, src.height));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(src.width * k)); c.height = Math.max(1, Math.round(src.height * k));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return c;
  };

  window.Scan = Scan;
})();

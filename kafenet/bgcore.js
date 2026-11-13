/* حذف هوشمند پس‌زمینه (بدون مدل یادگیری عمیق و بدون اینترنت)
   ۱) مدل رنگی پس‌زمینه از لبه‌ی عکس و مدل رنگی سوژه از مرکز (خوشه‌بندی k-means)
   ۲) برش منسجم با وزن‌های حساس به رنگ (لبه‌ها روی تغییر رنگ قطع می‌شوند)
   ۳) پاک‌سازی: بزرگ‌ترین جزء، پرکردن حفره‌ها
   ۴) نرم‌کردن لبه‌ها با فیلتر هدایت‌شده (guided filter) روی تصویر کامل
   ۵) پاک‌سازی رنگ لبه (decontamination) تا رنگ پس‌زمینه روی مو و لبه نماند */
(function () {
  'use strict';
  var WORK = 640;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- جعبه‌ی میانگین (sliding window) ----------
  function boxFilter(src, w, h, r) {
    var tmp = new Float32Array(w * h), out = new Float32Array(w * h), x, y, s, i;
    for (y = 0; y < h; y++) {
      s = 0; var row = y * w;
      for (x = -r; x <= r; x++) s += src[row + clamp(x, 0, w - 1)];
      for (x = 0; x < w; x++) {
        tmp[row + x] = s / (2 * r + 1);
        s += src[row + clamp(x + r + 1, 0, w - 1)] - src[row + clamp(x - r, 0, w - 1)];
      }
    }
    for (x = 0; x < w; x++) {
      s = 0;
      for (y = -r; y <= r; y++) s += tmp[clamp(y, 0, h - 1) * w + x];
      for (y = 0; y < h; y++) {
        out[y * w + x] = s / (2 * r + 1);
        s += tmp[clamp(y + r + 1, 0, h - 1) * w + x] - tmp[clamp(y - r, 0, h - 1) * w + x];
      }
    }
    return out;
  }

  // ---------- فیلتر هدایت‌شده: لبه‌های نرم با حفظ مرز تصویر ----------
  function guided(I, p, w, h, r, eps) {
    var n = w * h, i;
    var mI = boxFilter(I, w, h, r), mp = boxFilter(p, w, h, r);
    var Ip = new Float32Array(n), II = new Float32Array(n);
    for (i = 0; i < n; i++) { Ip[i] = I[i] * p[i]; II[i] = I[i] * I[i]; }
    var cIp = boxFilter(Ip, w, h, r), vI = boxFilter(II, w, h, r);
    var a = new Float32Array(n), b = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var cov = cIp[i] - mI[i] * mp[i], var_ = vI[i] - mI[i] * mI[i];
      a[i] = cov / (var_ + eps); b[i] = mp[i] - a[i] * mI[i];
    }
    var ma = boxFilter(a, w, h, r), mb = boxFilter(b, w, h, r), q = new Float32Array(n);
    for (i = 0; i < n; i++) q[i] = ma[i] * I[i] + mb[i];
    return q;
  }

  // ---------- k-means روی نمونه‌های رنگی ----------
  function kmeans(pts, k, iters) {
    var n = pts.length / 3, cs = [], i, j, it;
    if (n === 0) return [{ m: [128, 128, 128], v: [900, 900, 900], w: 0 }];
    for (i = 0; i < k; i++) { var idx = Math.floor((i + 0.5) * n / k) * 3; cs.push([pts[idx], pts[idx + 1], pts[idx + 2]]); }
    var lab = new Int32Array(n);
    for (it = 0; it < iters; it++) {
      var sum = []; for (j = 0; j < k; j++) sum.push([0, 0, 0, 0]);
      for (i = 0; i < n; i++) {
        var best = 0, bd = 1e18;
        for (j = 0; j < k; j++) {
          var dr = pts[i * 3] - cs[j][0], dg = pts[i * 3 + 1] - cs[j][1], db = pts[i * 3 + 2] - cs[j][2], d = dr * dr + dg * dg + db * db;
          if (d < bd) { bd = d; best = j; }
        }
        lab[i] = best; sum[best][0] += pts[i * 3]; sum[best][1] += pts[i * 3 + 1]; sum[best][2] += pts[i * 3 + 2]; sum[best][3]++;
      }
      for (j = 0; j < k; j++) if (sum[j][3]) cs[j] = [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]];
    }
    var out = [];
    for (j = 0; j < k; j++) {
      var cnt = 0, v = [0, 0, 0], m = cs[j];
      for (i = 0; i < n; i++) if (lab[i] === j) { cnt++; for (var c = 0; c < 3; c++) { var dd = pts[i * 3 + c] - m[c]; v[c] += dd * dd; } }
      for (var c2 = 0; c2 < 3; c2++) v[c2] = Math.max(60, cnt ? v[c2] / cnt : 400);
      if (cnt) out.push({ m: m, v: v, w: cnt / n });
    }
    return out.length ? out : [{ m: cs[0], v: [400, 400, 400], w: 1 }];
  }

  // هزینه‌ی منفی-لگاریتم‌درست‌نمایی یک پیکسل نسبت به یک مدل (گاوسی قطری)
  function cost(r, g, b, models) {
    var best = 1e18, c = [r, g, b];
    for (var k = 0; k < models.length; k++) {
      var M = models[k], d = 0;
      for (var j = 0; j < 3; j++) { var x = c[j] - M.m[j]; d += x * x / M.v[j] + Math.log(M.v[j]); }
      d = 0.5 * d - Math.log(M.w + 1e-6);
      if (d < best) best = d;
    }
    return best;
  }

  // ---------- کمک‌های رشد ناحیه ----------
  function boxBlurRGB(d, W, H, r) {
    var out = new Float32Array(W * H * 3), x, y, c, s, k;
    var tmp = new Float32Array(W * H * 3);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) for (c = 0; c < 3; c++) {
      s = 0; for (k = -r; k <= r; k++) s += d[(y * W + clamp(x + k, 0, W - 1)) * 4 + c];
      tmp[(y * W + x) * 3 + c] = s / (2 * r + 1);
    }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) for (c = 0; c < 3; c++) {
      s = 0; for (k = -r; k <= r; k++) s += tmp[(clamp(y + k, 0, H - 1) * W + x) * 3 + c];
      out[(y * W + x) * 3 + c] = s / (2 * r + 1);
    }
    return out;
  }
  // هر پیکسلی که از لبه با تغییر رنگ کمتر از tol قابل‌رسیدن است، پس‌زمینه است
  function growFromBorder(bl, W, H, tol) {
    var n = W * H, flood = new Uint8Array(n), st = new Int32Array(n), sp = 0, i, x, y;
    var t2 = tol * tol;
    // رنگ میانگین و پراکندگی لبه‌ها (مرجع پس‌زمینه)
    var mu = [0, 0, 0], cntB = 0;
    for (x = 0; x < W; x++) for (var e = 0; e < 2; e++) { var pe = e ? (H - 1) * W + x : x; for (var c = 0; c < 3; c++) mu[c] += bl[pe * 3 + c]; cntB++; }
    for (y = 0; y < H; y++) for (var f = 0; f < 2; f++) { var pf = f ? y * W + W - 1 : y * W; for (var c2 = 0; c2 < 3; c2++) mu[c2] += bl[pf * 3 + c2]; cntB++; }
    for (var c3 = 0; c3 < 3; c3++) mu[c3] /= cntB;
    var sd = 0, cntS = 0;
    for (x = 0; x < W; x += 3) { var pz = x; var dz = 0; for (var c4 = 0; c4 < 3; c4++) { var q = bl[pz * 3 + c4] - mu[c4]; dz += q * q; } sd += dz; cntS++; }
    var maxD2 = Math.pow(Math.max(120, 2.5 * Math.sqrt(sd / Math.max(1, cntS))), 2);
    function near(p) { var a = bl[p * 3] - mu[0], b = bl[p * 3 + 1] - mu[1], c = bl[p * 3 + 2] - mu[2]; return a * a + b * b + c * c < maxD2; }
    function ok(a, b) { var dr = bl[a * 3] - bl[b * 3], dg = bl[a * 3 + 1] - bl[b * 3 + 1], db = bl[a * 3 + 2] - bl[b * 3 + 2]; return dr * dr + dg * dg + db * db < t2 && near(b); }
    for (x = 0; x < W; x++) { seedPush(x); seedPush((H - 1) * W + x); }
    for (y = 0; y < H; y++) { seedPush(y * W); seedPush(y * W + W - 1); }
    function seedPush(p) { if (!flood[p]) { flood[p] = 1; st[sp++] = p; } }
    while (sp) {
      var u = st[--sp], ux = u % W, uy = (u / W) | 0;
      if (ux > 0 && !flood[u - 1] && ok(u, u - 1)) { flood[u - 1] = 1; st[sp++] = u - 1; }
      if (ux < W - 1 && !flood[u + 1] && ok(u, u + 1)) { flood[u + 1] = 1; st[sp++] = u + 1; }
      if (uy > 0 && !flood[u - W] && ok(u, u - W)) { flood[u - W] = 1; st[sp++] = u - W; }
      if (uy < H - 1 && !flood[u + W] && ok(u, u + W)) { flood[u + W] = 1; st[sp++] = u + W; }
    }
    return flood;
  }
  function hasBgNeighbour(flood, i, W, H) {
    var x = i % W, y = (i / W) | 0;
    if (x > 0 && flood[i - 1]) return true; if (x < W - 1 && flood[i + 1]) return true;
    if (y > 0 && flood[i - W]) return true; if (y < H - 1 && flood[i + W]) return true;
    return false;
  }

  // ---------- بستن مورفولوژیک (dilate سپس erode) ----------
  function closeMask(lab, W, H, r) {
    var n = W * H, a = new Uint8Array(n), i, x, y, k, v;
    // dilate
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      v = 0;
      for (var dy = -r; dy <= r && !v; dy++) for (var dx = -r; dx <= r; dx++) {
        var xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && lab[yy * W + xx]) { v = 1; break; }
      }
      a[y * W + x] = v;
    }
    // erode
    var out = new Uint8Array(n);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      v = 1;
      for (var ey = -r; ey <= r && v; ey++) for (var ex = -r; ex <= r; ex++) {
        var px = x + ex, py = y + ey;
        if (px < 0 || py < 0 || px >= W || py >= H || !a[py * W + px]) { v = 0; break; }
      }
      out[y * W + x] = v;
    }
    return out;
  }

  // ---------- قطعه‌بندی روی تصویر کاری ----------
  // img: ImageData(W,H) ، hints: Uint8Array (0 بدون، 1 نگه‌دار، 2 حذف)
  function segment(img, hints) {
    var W = img.width, H = img.height, d = img.data, n = W * H, i, x, y;
    // ---- ۱) رشد ناحیه‌ی پس‌زمینه از لبه‌ها روی تصویر کمی‌نرم‌شده ----
    var bl = boxBlurRGB(d, W, H, 1);           // نرمی کم: مرز سوژه تیز می‌ماند
    var flood = growFromBorder(bl, W, H, 30);  // تغییر رنگ کوچک نسبت به همسایه + نزدیک به رنگ لبه
    var bgCount = 0; for (i = 0; i < n; i++) bgCount += flood[i];
    var frac = bgCount / n;
    var bgPts = [], fgPts = [];
    var stepB = Math.max(1, Math.floor(n / 9000));
    for (i = 0; i < n; i += stepB) {
      var px = i * 4;
      if (flood[i]) bgPts.push(d[px], d[px + 1], d[px + 2]);
      else if (!hasBgNeighbour(flood, i, W, H)) fgPts.push(d[px], d[px + 1], d[px + 2]);
    }
    // اگر رشد نتوانست جداسازی کند (پس‌زمینه‌ی ناهمگون یا سوژه‌ی کاملاً هم‌رنگ)، مرکز را سوژه بگیر
    if (frac < 0.05 || frac > 0.97 || fgPts.length < 600) {
      bgPts = []; fgPts = [];
      var bw0 = Math.max(2, Math.round(Math.min(W, H) * 0.05));
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        var p0 = (y * W + x) * 4;
        if (x < bw0 || y < bw0 || x >= W - bw0 || y >= H - bw0) bgPts.push(d[p0], d[p0 + 1], d[p0 + 2]);
        if (x > W * 0.3 && x < W * 0.7 && y > H * 0.3 && y < H * 0.7) fgPts.push(d[p0], d[p0 + 1], d[p0 + 2]);
      }
    }
    var bgM = kmeans(bgPts, 8, 12);
    var fgM;
    {
    fgM = kmeans(fgPts, 3, 10);
    }

    // هزینه‌ها
    var cB = new Float32Array(n), cF = new Float32Array(n);
    for (i = 0; i < n; i++) {
      cB[i] = cost(d[i * 4], d[i * 4 + 1], d[i * 4 + 2], bgM);
      cF[i] = cost(d[i * 4], d[i * 4 + 1], d[i * 4 + 2], fgM);
    }
    if (hints) for (i = 0; i < n; i++) { if (hints[i] === 1) { cB[i] += 1e6; } else if (hints[i] === 2) { cF[i] += 1e6; } }

    // وزن‌های لبه‌ای حساس به رنگ (مرز روی تغییر رنگ)
    var wR = new Float32Array(n), wD = new Float32Array(n), sumSq = 0, cnt = 0;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var a = (y * W + x) * 4;
      if (x + 1 < W) { var b = a + 4, dr = d[a] - d[b], dg = d[a + 1] - d[b + 1], db = d[a + 2] - d[b + 2], s2 = dr * dr + dg * dg + db * db; wR[y * W + x] = s2; sumSq += s2; cnt++; }
      if (y + 1 < H) { var c2 = a + W * 4, er = d[a] - d[c2], eg = d[a + 1] - d[c2 + 1], eb = d[a + 2] - d[c2 + 2], s3 = er * er + eg * eg + eb * eb; wD[y * W + x] = s3; sumSq += s3; cnt++; }
    }
    var beta = 1 / (2 * Math.max(1, sumSq / Math.max(1, cnt)));
    var LAMBDA = 60;
    for (i = 0; i < n; i++) { wR[i] = LAMBDA * Math.exp(-beta * wR[i]); wD[i] = LAMBDA * Math.exp(-beta * wD[i]); }

    // برچسب اولیه و بهینه‌سازی ICM (۱ = سوژه)
    var lab = new Uint8Array(n);
    for (i = 0; i < n; i++) lab[i] = cF[i] < cB[i] ? 1 : 0;
    for (var it = 0; it < 14; it++) {
      var changed = 0;
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        var k = y * W + x, e0 = cB[k], e1 = cF[k];
        // همسایه‌ها (چپ، راست، بالا، پایین)
        if (x > 0) { var wl = wR[k - 1]; if (lab[k - 1]) e0 += wl; else e1 += wl; }
        if (x + 1 < W) { var wr = wR[k]; if (lab[k + 1]) e0 += wr; else e1 += wr; }
        if (y > 0) { var wu = wD[k - W]; if (lab[k - W]) e0 += wu; else e1 += wu; }
        if (y + 1 < H) { var wd = wD[k]; if (lab[k + W]) e0 += wd; else e1 += wd; }
        var nl = e1 < e0 ? 1 : 0;
        if (nl !== lab[k]) { lab[k] = nl; changed++; }
      }
      if (!changed) break;
    }

    // بستن مورفولوژیک (dilate سپس erode): فاصله‌های باریک بین بخش‌های سوژه پر می‌شوند
    lab = closeMask(lab, W, H, 2);
    // اجزای بزرگ سوژه نگه داشته می‌شوند (نه فقط بزرگ‌ترین؛ مثلاً کلاهک جدا)، نویز ریز حذف می‌شود
    var seen = new Uint8Array(n), comps = [], stack = new Int32Array(n);
    for (i = 0; i < n; i++) {
      if (!lab[i] || seen[i]) continue;
      var sp = 0, comp = [], nn = 0; stack[sp++] = i; seen[i] = 1;
      while (sp) {
        var u = stack[--sp]; comp.push(u); nn++;
        var ux = u % W, uy = (u / W) | 0;
        var nb = [];
        if (ux > 0) nb.push(u - 1); if (ux < W - 1) nb.push(u + 1); if (uy > 0) nb.push(u - W); if (uy < H - 1) nb.push(u + W);
        for (var t = 0; t < nb.length; t++) { var v = nb[t]; if (lab[v] && !seen[v]) { seen[v] = 1; stack[sp++] = v; } }
      }
      comps.push({ px: comp, n: nn });
    }
    var largest = 0; comps.forEach(function (c) { if (c.n > largest) largest = c.n; });
    var keep = new Uint8Array(n);
    comps.forEach(function (c) { if (c.n >= Math.max(40, largest * 0.02)) for (var z = 0; z < c.px.length; z++) keep[c.px[z]] = 1; });
    // کسانی که با نشانه‌ی «نگه‌دار» مشخص شده‌اند همیشه می‌مانند
    if (hints) for (i = 0; i < n; i++) if (hints[i] === 1) keep[i] = 1;
    // پرکردن حفره‌ها: هر پیکسل پس‌زمینه‌ای که به لبه نمی‌رسد جزو سوژه است
    var outside = new Uint8Array(n), st2 = new Int32Array(n), sp2 = 0;
    for (i = 0; i < n; i++) {
      var ix = i % W, iy = (i / W) | 0;
      if ((ix === 0 || iy === 0 || ix === W - 1 || iy === H - 1) && !keep[i] && !outside[i]) { outside[i] = 1; st2[sp2++] = i; }
    }
    while (sp2) {
      var uu = st2[--sp2], ux2 = uu % W, uy2 = (uu / W) | 0, cand = [];
      if (ux2 > 0) cand.push(uu - 1); if (ux2 < W - 1) cand.push(uu + 1); if (uy2 > 0) cand.push(uu - W); if (uy2 < H - 1) cand.push(uu + W);
      for (var z = 0; z < cand.length; z++) { var vv = cand[z]; if (!keep[vv] && !outside[vv]) { outside[vv] = 1; st2[sp2++] = vv; } }
    }
    var mask = new Uint8Array(n);
    for (i = 0; i < n; i++) mask[i] = outside[i] ? 0 : 1;
    if (hints) for (i = 0; i < n; i++) if (hints[i] === 2) mask[i] = 0;
    return { mask: mask, bgColor: bgM.slice().sort(function (a, b) { return b.w - a.w; })[0].m };
  }

  // ---------- ماسک کاری -> آلفای کامل با لبه‌ی نرم و رنگ پاک ----------
  function matte(full, mask, W, H, bg) {
    var w = full.width, h = full.height, n = w * h, i, x, y;
    var fd = full.getContext('2d').getImageData(0, 0, w, h).data;
    // ماسک کاری را به اندازه‌ی کامل بزرگ می‌کنیم (دوخطی)
    var m0 = new Float32Array(n);
    for (y = 0; y < h; y++) {
      var gy = clamp((y + 0.5) * H / h - 0.5, 0, H - 1), y0 = gy | 0, y1 = Math.min(y0 + 1, H - 1), fy = gy - y0;
      for (x = 0; x < w; x++) {
        var gx = clamp((x + 0.5) * W / w - 0.5, 0, W - 1), x0 = gx | 0, x1 = Math.min(x0 + 1, W - 1), fx = gx - x0;
        m0[y * w + x] = (mask[y0 * W + x0] * (1 - fx) + mask[y0 * W + x1] * fx) * (1 - fy) + (mask[y1 * W + x0] * (1 - fx) + mask[y1 * W + x1] * fx) * fy;
      }
    }
    // راهنمای خاکستری از خود تصویر
    var G = new Float32Array(n);
    for (i = 0; i < n; i++) G[i] = (fd[i * 4] * 0.299 + fd[i * 4 + 1] * 0.587 + fd[i * 4 + 2] * 0.114) / 255;
    var r = Math.max(2, Math.round(Math.max(w, h) / 220));
    var alpha = guided(G, m0, w, h, r, 1e-4);
    // ترکیب با ماسک سخت برای جلوگیری از نشت به پس‌زمینه‌ی کاملاً بیرون
    var out = new ImageData(w, h), od = out.data;
    var B = bg || [255, 255, 255];
    for (i = 0; i < n; i++) {
      var a = clamp(alpha[i], 0, 1);
      if (a < 0.02) a = 0;
      if (a > 0.98) a = 1;
      var o = i * 4;
      // پاک‌سازی رنگ لبه: I = a·F + (1−a)·B  ->  F = (I − (1−a)·B) / a
      var cR = fd[o], cG = fd[o + 1], cB2 = fd[o + 2];
      if (a > 0 && a < 1) {
        cR = clamp((cR - (1 - a) * B[0]) / a, 0, 255);
        cG = clamp((cG - (1 - a) * B[1]) / a, 0, 255);
        cB2 = clamp((cB2 - (1 - a) * B[2]) / a, 0, 255);
      }
      od[o] = cR; od[o + 1] = cG; od[o + 2] = cB2; od[o + 3] = Math.round(a * 255);
    }
    return out;
  }

  // ---------- API عمومی ----------
  // src: canvas کامل ; hints: Uint8Array روی تصویر کاری ; بازگشت: {result: ImageData(کامل), mask, W, H, hints}
  window.BGCore = {
    WORK: WORK,
    workSize: function (w, h) { var k = Math.min(1, WORK / Math.max(w, h)); return { W: Math.max(2, Math.round(w * k)), H: Math.max(2, Math.round(h * k)) }; },
    workCanvas: function (src, W, H) { var c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, W, H); return c; },
    segment: function (workCanvas, hints) {
      var W = workCanvas.width, H = workCanvas.height;
      var img = workCanvas.getContext('2d').getImageData(0, 0, W, H);
      return segment(img, hints);
    },
    matte: function (full, mask, W, H, bg) { return matte(full, mask, W, H, bg); }
  };
})();

/* ابزارهای رابط کاربری کافی‌نت یار: تاریخ شمسی با کشویی، پنجره‌ی ورودی متن (بدون prompt) */
(function () {
  'use strict';
  var MON = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var DAY = 86400000;

  // جلالی -> میلادی
  function j2g(jy, jm, jd) {
    var jy1 = jy - 979, jm1 = jm - 1, jd1 = jd - 1;
    var jdn = 365 * jy1 + Math.floor(jy1 / 33) * 8 + Math.floor((jy1 % 33 + 3) / 4);
    var ml = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    for (var i = 0; i < jm1; i++) jdn += ml[i];
    jdn += jd1;
    var gd = jdn + 79;
    var gy = 1600 + 400 * Math.floor(gd / 146097); gd = gd % 146097;
    var leap = true;
    if (gd >= 36525) { gd--; gy += 100 * Math.floor(gd / 36524); gd = gd % 36524; if (gd >= 365) gd++; else leap = false; }
    gy += 4 * Math.floor(gd / 1461); gd = gd % 1461;
    if (gd >= 366) { leap = false; gd--; gy += Math.floor(gd / 365); gd = gd % 365; }
    var gdm = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var gm = 0; gd++;
    while (gm < 12 && gd > gdm[gm + 1]) { gd -= gdm[gm + 1]; gm++; }
    return new Date(gy, gm, gd);
  }
  // میلادی -> جلالی [y, m, d]
  function g2j(gy, gm, gd) {
    var gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var gy2 = gm > 2 ? gy + 1 : gy;
    var days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
    var jy = -1595 + 33 * Math.floor(days / 12053); days %= 12053;
    jy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var jm, jd;
    if (days < 186) { jm = 1 + Math.floor(days / 31); jd = 1 + (days % 31); }
    else { jm = 7 + Math.floor((days - 186) / 30); jd = 1 + ((days - 186) % 30); }
    return [jy, jm, jd];
  }
  // طول ماه جلالی
  function monthLen(y, m) {
    if (m <= 6) return 31;
    if (m <= 11) return 30;
    return Math.round((j2g(y + 1, 1, 1) - j2g(y, 12, 1)) / DAY);
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function fa(s) { return String(s).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function jToday() { var n = new Date(); return g2j(n.getFullYear(), n.getMonth() + 1, n.getDate()); }

  // ورودی (ISO میلادی یا 'YYYY/MM/DD' جلالی) -> Date
  function parseAny(v) {
    if (!v) return new Date();
    v = String(v);
    if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(v)) {
      var p = v.split(/[\/\s]/).map(Number);
      return j2g(p[0], p[1], p[2]);
    }
    var d = new Date(v);
    return isNaN(d) ? new Date() : d;
  }

  // HTML یک تاریخ (و در صورت نیاز ساعت) با کشویی
  function sel(name, opts, cur) {
    return '<select data-dt="' + name + '">' + opts.map(function (o) {
      return '<option value="' + o[0] + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('') + '</select>';
  }
  window.dtHTML = function (key, label, value, withTime) {
    var d = parseAny(value), j = g2j(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var yNow = jToday()[0], years = [];
    for (var y = yNow - 3; y <= yNow + 2; y++) years.push(y);
    if (years.indexOf(j[0]) < 0) years.push(j[0]);
    years.sort(function (a, b) { return a - b; });
    var days = [], mons = [], hs = [], ms = [];
    for (var dd = 1; dd <= 31; dd++) days.push([dd, fa(dd)]);
    MON.forEach(function (m, i) { mons.push([i + 1, m]); });
    var h = '<div class="dtp"><span class="dtl">' + label + '</span><div class="dtrow">' +
      sel(key + '-d', days, j[2]) + sel(key + '-m', mons.map(function (x) { return x; }), j[1]) +
      sel(key + '-y', years.map(function (x) { return [x, fa(x)]; }), j[0]);
    if (withTime) {
      for (var hh = 0; hh < 24; hh++) hs.push([hh, fa(pad(hh))]);
      for (var mi = 0; mi < 60; mi += 5) ms.push([mi, fa(pad(mi))]);
      h += sel(key + '-h', hs, d.getHours()) + sel(key + '-i', ms, Math.floor(d.getMinutes() / 5) * 5);
    }
    return h + '</div></div>';
  };

  // خواندن کشویی‌ها: {jStr:'YYYY/MM/DD', iso:'YYYY-MM-DD[THH:MM]'}
  window.readDt = function (root, key, withTime) {
    function g(p) { var el = root.querySelector('[data-dt="' + key + '-' + p + '"]'); return el ? parseInt(el.value, 10) : 0; }
    var y = g('y'), m = g('m'), d = g('d');
    if (d > monthLen(y, m)) d = monthLen(y, m);
    var greg = j2g(y, m, d);
    var iso = greg.getFullYear() + '-' + pad(greg.getMonth() + 1) + '-' + pad(greg.getDate());
    if (withTime) iso += 'T' + pad(g('h')) + ':' + pad(g('i'));
    return { jStr: y + '/' + pad(m) + '/' + pad(d), iso: iso };
  };

  // نمایش فارسی یک زمان ISO: ۱۴۰۵/۰۸/۲۰ ۱۰:۰۵
  window.faDT = function (iso) {
    if (!iso) return '—';
    var d = parseAny(iso), j = g2j(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var t = /T/.test(String(iso)) ? ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : '';
    return fa(j[0] + '/' + pad(j[1]) + '/' + pad(j[2]) + t);
  };
  window.faDateStr = function (v) { var d = parseAny(v), j = g2j(d.getFullYear(), d.getMonth() + 1, d.getDate()); return j[0] + '/' + pad(j[1]) + '/' + pad(j[2]); };
  window.jToGreg = j2g;
  window.gToJ = g2j;

  // پنجره‌ی ورودی متن (جایگزین prompt که در Electron کار نمی‌کند)
  window.askText = function (title, def) {
    return new Promise(function (resolve) {
      var o = document.createElement('div');
      o.className = 'askov';
      o.innerHTML = '<div class="askbox"><div class="asktitle"></div><input class="askin">' +
        '<div class="askbtn"><button class="btn" data-ok>تأیید</button><button class="btn out" data-no>انصراف</button></div></div>';
      o.querySelector('.asktitle').textContent = title;
      var inp = o.querySelector('input');
      inp.value = def || '';
      function done(v) { o.remove(); resolve(v); }
      o.querySelector('[data-ok]').onclick = function () { done(inp.value.trim() || null); };
      o.querySelector('[data-no]').onclick = function () { done(null); };
      inp.onkeydown = function (e) {
        if (e.key === 'Enter') done(inp.value.trim() || null);
        if (e.key === 'Escape') done(null);
      };
      document.body.appendChild(o);
      inp.focus(); inp.select();
    });
  };
})();

/* ابزارهای مشترک کافی‌نت یار: ساخت PDF و ذخیره‌ی گروهی فایل‌ها */
(function () {
  'use strict';

  // سازنده‌ی PDF (همان منطق برنامه‌ی اصلی). ورودی: آرایه‌ی canvas، اندازه‌ی صفحه بر حسب point
  window.mkpdf = function (cs, pw, ph) {
    var E = new TextEncoder(), parts = [], off = [], len = 0;
    var add = function (z) { var b = typeof z == 'string' ? E.encode(z) : z; parts.push(b); len += b.length; };
    var obj = function (i, s, bin) { off[i] = len; add(i + ' 0 obj\n' + s); if (bin) { add('\nstream\n'); add(bin); add('\nendstream'); } add('\nendobj\n'); };
    add('%PDF-1.4\n');
    var N = cs.length;
    obj(1, '<</Type/Catalog/Pages 2 0 R>>');
    obj(2, '<</Type/Pages/Kids[' + cs.map(function (_, i) { return (3 + 3 * i) + ' 0 R'; }).join(' ') + ']/Count ' + N + '>>');
    cs.forEach(function (c, i) {
      var j = Uint8Array.from(atob(c.toDataURL('image/jpeg', 0.92).split(',')[1]), function (z) { return z.charCodeAt(0); });
      var p = 3 + 3 * i, ct = 'q ' + pw.toFixed(2) + ' 0 0 ' + ph.toFixed(2) + ' 0 0 cm /I Do Q';
      obj(p, '<</Type/Page/Parent 2 0 R/MediaBox[0 0 ' + pw.toFixed(2) + ' ' + ph.toFixed(2) + ']/Resources<</XObject<</I ' + (p + 2) + ' 0 R>>>>/Contents ' + (p + 1) + ' 0 R>>');
      obj(p + 1, '<</Length ' + ct.length + '>>', ct);
      obj(p + 2, '<</Type/XObject/Subtype/Image/Width ' + c.width + '/Height ' + c.height + '/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ' + j.length + '>>', j);
    });
    var xo = len, T2 = 3 * N + 3;
    add('xref\n0 ' + T2 + '\n0000000000 65535 f \n' + off.slice(1).map(function (o) { return String(o).padStart(10, '0') + ' 00000 n \n'; }).join('') + 'trailer<</Size ' + T2 + '/Root 1 0 R>>\nstartxref\n' + xo + '\n%%EOF');
    return new Blob(parts, { type: 'application/pdf' });
  };

  function downloadBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
  }

  // انتخاب پوشه باید همان لحظه‌ی کلیک انجام شود (قبل از رندر). برمی‌گرداند: پوشه | null (دانلود عادی) | 'abort'
  window.pickFolder = async function () {
    if (!window.showDirectoryPicker) return null;
    try { return await window.showDirectoryPicker({ mode: 'readwrite' }); }
    catch (e) { return e && e.name === 'AbortError' ? 'abort' : null; }
  };

  // ذخیره‌ی گروهی. dir: پوشه (از pickFolder) یا null. برمی‌گرداند متن وضعیت
  window.saveFiles = async function (files, dir, onProgress) {
    if (dir === 'abort') return 'ذخیره لغو شد';
    if (dir) {
      for (var i = 0; i < files.length; i++) {
        if (onProgress) onProgress(i + 1, files.length);
        var fh = await dir.getFileHandle(files[i].name, { create: true });
        var w = await fh.createWritable();
        await w.write(files[i].blob); await w.close();
      }
      return files.length + ' فایل در پوشه‌ی انتخابی ذخیره شد';
    }
    for (var k = 0; k < files.length; k++) {
      if (onProgress) onProgress(k + 1, files.length);
      downloadBlob(files[k].blob, files[k].name);
      await new Promise(function (r) { setTimeout(r, 450); });
    }
    return files.length + ' فایل در پوشه‌ی Downloads ذخیره شد';
  };

  window.downloadBlob = downloadBlob;

  // ---------- ویندوز: پوشه‌ی ذخیره و چاپ مستقیم (از طریق پل preload) ----------
  var desk = window.desk || null;
  if (desk) {
    // ذخیره: همه‌ی فایل‌ها یک‌جا در پوشه‌ای که یک‌بار انتخاب شده
    window.pickFolder = async function () {
      var st = await desk.getSettings();
      if (st.saveDirSet) return st.saveDir;
      var d = await desk.pickSaveDir();
      return d || 'abort';
    };
    window.saveFiles = async function (files, dir, onProgress) {
      if (dir === 'abort') return 'ذخیره لغو شد';
      var list = [];
      for (var i = 0; i < files.length; i++) {
        if (onProgress) onProgress(i + 1, files.length);
        list.push({ name: files[i].name, data: await files[i].blob.arrayBuffer() });
      }
      var r = await desk.saveFiles(typeof dir === 'string' ? dir : null, list);
      return r.n + ' فایل در «' + r.dir + '» ذخیره شد';
    };
    // چاپ: مستقیم از همین برنامه (پنجره‌ی انتخاب چاپگر یا بی‌پنجره، طبق تنظیمات)
    window.print = function () { desk.print(); };
  }

  // پنجره‌ی تنظیمات: پوشه‌ی ذخیره و چاپگر
  // ---------- سایت‌های ثبت‌نام یار (ذخیره‌ی مشترک) ----------
  window.knSites = function () { try { return JSON.parse(localStorage.getItem('kn_sites') || '[]'); } catch (e) { return []; } };
  window.knSitesSave = function (list) { localStorage.setItem('kn_sites', JSON.stringify(list)); if (window.sitesRefresh) window.sitesRefresh(); };
  window.knSiteOpen = function (url) {
    var u = String(url || '').trim(); if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    window.open(u, '_blank');
  };

  window.openDeskSettings = async function () {
    var st = desk ? await desk.getSettings() : { saveDir: '—', printer: '', silent: false };
    var printers = desk ? await desk.printers() : [];
    var o = document.createElement('div');
    o.className = 'askov';
    o.innerHTML = '<div class="askbox" style="width:560px">' +
      '<div class="asktitle">تنظیمات کافی‌نت یار</div>' +
      '<div class="dtl">پوشه‌ی ذخیره‌ی فایل‌ها (عکس، PDF، فرم‌ها)</div>' +
      '<div class="dsrow"><code class="dsdir"></code><button class="btn out" data-dir>تغییر پوشه</button></div>' +
      '<div class="dtl">چاپگر</div>' +
      '<select class="askin" data-pr><option value="">چاپگر پیش‌فرض ویندوز</option></select>' +
      '<label class="dsrow" style="margin-top:12px"><input type="checkbox" data-silent> چاپ بدون پنجره‌ی انتخاب چاپگر (مستقیم)</label>' +
      '<div class="dim" style="margin-top:8px">اگر تیک نزنید، هنگام چاپ پنجره‌ی انتخاب چاپگر ویندوز باز می‌شود (مثل فایرفاکس).</div>' +
      '<h4 style="margin:16px 0 6px">مدیریت سایت‌های ثبت‌نام یار</h4>' +
      '<div class="sitelist" data-sl></div>' +
      '<div class="dsrow" style="margin-top:8px"><input class="askin" data-sn placeholder="نام سایت (مثلاً تامین من)" style="flex:1"><input class="askin" data-su placeholder="آدرس (https://…)" style="flex:2;direction:ltr"><input class="askin" data-si placeholder="🌐" style="width:64px;text-align:center"><button class="btn" data-sadd>افزودن</button></div>' +
      '<div class="askbtn"><button class="btn" data-ok>ذخیره تنظیمات</button><button class="btn out" data-no>بستن</button></div></div>';
    o.querySelector('.dsdir').textContent = st.saveDir;
    var sel = o.querySelector('[data-pr]');
    (printers || []).forEach(function (p) {
      var op = document.createElement('option'); op.value = p.name; op.textContent = p.displayName || p.name;
      if (p.name === st.printer) op.selected = true; sel.appendChild(op);
    });
    o.querySelector('[data-silent]').checked = !!st.silent;
    o.querySelector('[data-dir]').onclick = async function () {
      var d = await desk.pickSaveDir(); if (d) o.querySelector('.dsdir').textContent = d;
    };
    o.querySelector('[data-ok]').onclick = async function () {
      await desk.setPrint({ printer: sel.value, silent: o.querySelector('[data-silent]').checked });
      o.remove();
    };
    o.querySelector('[data-no]').onclick = function () { o.remove(); };
    function drawSites() {
      var box = o.querySelector('[data-sl]'), list = window.knSites();
      box.innerHTML = list.length ? '' : '<div class="dim">هنوز سایتی ثبت نشده است.</div>';
      list.forEach(function (x, i) {
        var r = document.createElement('div'); r.className = 'dsrow';
        r.innerHTML = '<input class="askin" data-en value="' + String(x.name).replace(/"/g, '&quot;') + '" style="flex:1">' +
          '<input class="askin" data-eu value="' + String(x.url).replace(/"/g, '&quot;') + '" style="flex:2;direction:ltr">' +
          '<input class="askin" data-ei value="' + String(x.icon || '🌐').replace(/"/g, '&quot;') + '" style="width:64px;text-align:center">' +
          '<button class="btn" data-save>ذخیره</button><button class="btn out" data-del style="color:var(--e)">حذف</button>';
        r.querySelector('[data-save]').onclick = function () {
          var l = window.knSites(); l[i].name = r.querySelector('[data-en]').value.trim() || l[i].name;
          l[i].url = r.querySelector('[data-eu]').value.trim() || l[i].url; l[i].icon = r.querySelector('[data-ei]').value.trim() || '🌐';
          window.knSitesSave(l); drawSites();
        };
        r.querySelector('[data-del]').onclick = function () { var l = window.knSites(); l.splice(i, 1); window.knSitesSave(l); drawSites(); };
        box.appendChild(r);
      });
    }
    o.querySelector('[data-sadd]').onclick = function () {
      var n = o.querySelector('[data-sn]').value.trim(), u = o.querySelector('[data-su]').value.trim(), ic = o.querySelector('[data-si]').value.trim() || '🌐';
      if (!n || !u) return;
      var l = window.knSites(); l.push({ id: 's' + Date.now(), name: n, url: u, icon: ic }); window.knSitesSave(l);
      o.querySelector('[data-sn]').value = ''; o.querySelector('[data-su]').value = ''; drawSites();
    };
    drawSites();
    document.body.appendChild(o);
  };
})();

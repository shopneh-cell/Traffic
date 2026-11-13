/* فاکتور ساز
   خودسازی: کالاهای خودت + قیمت خریدی که پرداخته‌ای؛ تخفیف اختیاری (تیک) از همان قیمت خرید کم می‌شود
            و روی فاکتور نام فروشگاه خرید و قیمت خرید قید می‌شود.
   دیگرسازی: فاکتور کاملاً دلخواه (ردیف‌ها و جمع‌ها دستی) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY_INV = 'kn_invoices', KEY_SEQ = 'kn_seq', KEY_SELL = 'kn_sellers', KEY_SHOP = 'kn_shop', PRODUCT_KEY = 'trf2';
  var IV = { mode: 'self', tpl: 'classic', id: null, inv: null, q: '', undo: [], lastT: 0 };

  function jget(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function jset(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function fa(s) { return String(s == null ? '' : s).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/[,٬]/g, '')); return isFinite(n) ? n : 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function status(t) { $('ivStatus').textContent = t; }
  function shop() { return Object.assign({ name: 'کافی‌نت ترافیک', currency: 'تومان', phone: '', addr: '' }, jget(KEY_SHOP, {})); }
  function fmt(n) { return fa(Math.round(n || 0).toLocaleString('en-US')); }
  function fromDb(pr) { return shop().currency === 'تومان' ? (Number(pr) || 0) / 10 : (Number(pr) || 0); }
  function faToday() {
    var p = {};
    new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
      .forEach(function (x) { p[x.type] = x.value; });
    return p.year + '/' + p.month + '/' + p.day;
  }
  function nextNo() {
    var y = faToday().split('/')[0], seq = jget(KEY_SEQ, {}), k = 'inv-' + y;
    seq[k] = (seq[k] || 0) + 1; jset(KEY_SEQ, seq);
    return 'INV-' + y + '-' + String(seq[k]).padStart(4, '0');
  }

  // ---------- محاسبه ----------
  function pct() { return num(IV.inv.disc); }   // کسر درصد از قیمت خرید (همیشه فعال)
  function lineCalc(l) {
    var q = num(l.qty) || 0;
    if (IV.mode === 'self') {
      var cost = num(l.cost), unit = cost * (1 - pct() / 100);
      return { q: q, cost: cost, unit: unit, base: q * cost, total: q * unit };
    }
    var price = num(l.price), total = (l.total != null && l.total !== '') ? num(l.total) : q * price;
    return { q: q, cost: price, unit: price, base: q * price, total: total };
  }
  function totals() {
    var base = 0, sub = 0;
    IV.inv.lines.forEach(function (l) { var c = lineCalc(l); base += c.base; sub += c.total; });
    return { base: base, disc: 0, final: sub };
  }

  // ---------- تاریخچه‌ی برگشت ----------
  function sigNow() { return JSON.stringify({ mode: IV.mode, tpl: IV.tpl, inv: IV.inv }); }
  function snap(force) {
    var now = Date.now();
    if (force || now - IV.lastT > 700) { IV.undo.push(sigNow()); if (IV.undo.length > 120) IV.undo.shift(); }
    IV.lastT = now;
  }
  $('ivUndo').onclick = function () {
    if (!IV.undo.length) { status('کاری برای برگشت نیست.'); return; }
    var s = JSON.parse(IV.undo.pop()); IV.mode = s.mode; IV.tpl = s.tpl; IV.inv = s.inv;
    renderAll(); status('برگشت انجام شد.');
  };

  // ---------- فرم ورود ----------
  function formHTML() {
    var inv = IV.inv, sh = shop(), sellers = jget(KEY_SELL, []);
    var h = '<h4>مشخصات فروشگاه (روی فاکتور)</h4>' +
      '<div class="field"><span>نام فروشگاه</span><input data-s="name" value="' + esc(sh.name) + '"></div>' +
      '<div class="field"><span>تلفن</span><input data-s="phone" value="' + esc(sh.phone) + '"></div>' +
      '<div class="field"><span>نشانی</span><input data-s="addr" value="' + esc(sh.addr) + '"></div>' +
      '<div class="field"><span>واحد پول</span><select data-s="currency"><option' + (sh.currency === 'تومان' ? ' selected' : '') + '>تومان</option><option' + (sh.currency === 'ریال' ? ' selected' : '') + '>ریال</option></select></div>' +
      '<h4>اطلاعات فاکتور</h4>' +
      '<div class="field"><span>شماره</span><b>' + (IV.id ? esc(fa(inv.no)) : 'پیش‌نویس (بعد از ذخیره)') + '</b></div>' +
      '<div class="field"><span>تاریخ (شمسی)</span><span><input data-f="date" value="' + esc(inv.date) + '" style="width:120px"> <button class="btn out" data-a="today">امروز</button></span></div>' +
      '<div class="field"><span>فروشنده</span><span><input data-f="seller" list="sellerList" value="' + esc(inv.seller) + '" style="width:150px"><datalist id="sellerList">' +
      sellers.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist> <button class="btn out" data-a="saveSeller">ذخیره</button></span></div>' +
      '<div class="field"><span>خریدار</span><input data-f="buyer" value="' + esc(inv.buyer) + '"></div>' +
      '<div class="field"><span>تلفن خریدار</span><input data-f="bphone" value="' + esc(inv.bphone) + '"></div>' +
      '<div class="field"><span>نشانی خریدار</span><input data-f="baddr" value="' + esc(inv.baddr) + '"></div>' +
      '<div class="field"><span>توضیحات</span><input data-f="note" value="' + esc(inv.note) + '"></div>';
    if (IV.mode === 'self') {
      h += '<h4>خودسازی: از کالاهای خودم</h4>' +
        '<div class="field"><span>فروشگاه خرید</span><input data-f="store" value="' + esc(inv.store) + '" placeholder="مثلاً فروشگاه …"></div>' +
        '<div class="field"><span>کسر درصد از قیمت خرید</span><input data-f="disc" value="' + esc(inv.disc) + '" style="width:110px" inputmode="decimal"></div>' +
        '<input id="ivSearch" placeholder="جستجوی کالا یا خدمت… (Ctrl+F)" value="' + esc(IV.q) + '" style="width:100%;margin:6px 0">' +
        '<div id="ivRes"></div>';
    } else {
      h += '<h4>دیگرسازی: ردیف‌های دلخواه</h4>' +
        '<button class="btn out" data-a="addLine" style="width:100%;margin:6px 0">＋ ردیف جدید</button>';
    }
    h += '<h4>ردیف‌های فاکتور</h4><div id="ivLines"></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px"><button class="btn" data-a="save">💾 ذخیره</button><button class="btn" data-a="print">🖨 پرینت</button><button class="btn out" data-a="clear">پاک کردن ردیف‌ها</button></div>';
    return h;
  }
  function linesHTML() {
    var inv = IV.inv;
    if (!inv.lines.length) return '<div class="dim">هنوز ردیفی نیست.</div>';
    return inv.lines.map(function (l, i) {
      var c = lineCalc(l), rm = '<button class="btn out" data-a="rm" data-i="' + i + '" style="padding:2px 8px;color:var(--e)">✕</button>';
      if (IV.mode === 'self') {
        return '<div class="ivrow ivrow-self">' +
          '<span class="lname">' + esc(l.name) + (l.costMissing ? ' <i class="warnx" title="قیمت خرید ثبت نشده؛ قیمت فروش به‌عنوان مبنا آمده">!</i>' : '') + '</span>' +
          '<input data-l="' + i + '" data-f="qty" value="' + esc(l.qty) + '" title="تعداد">' +
          '<input data-l="' + i + '" data-f="cost" value="' + esc(l.cost) + '" title="قیمت خرید (ویرایش کنید)">' +
          '<span class="dim">' + fmt(c.unit) + '</span>' + rm + '</div>';
      }
      return '<div class="ivrow ivrow-free"><input data-l="' + i + '" data-f="name" value="' + esc(l.name) + '" placeholder="شرح">' +
        '<input data-l="' + i + '" data-f="qty" value="' + esc(l.qty) + '" placeholder="تعداد">' +
        '<input data-l="' + i + '" data-f="price" value="' + esc(l.price) + '" placeholder="قیمت واحد">' +
        '<input data-l="' + i + '" data-f="total" value="' + esc(l.total == null ? '' : l.total) + '" placeholder="جمع (خودکار)">' + rm + '</div>';
    }).join('');
  }
  function searchResults() {
    var box = $('ivRes'); if (!box) return;
    var q = IV.q.trim(); if (!q) { box.innerHTML = ''; return; }
    var db = jget(PRODUCT_KEY, null);
    if (!db) { box.innerHTML = '<div class="dim">داده‌ی کالاها پیدا نشد. یک بار برنامه‌ی اصلی را باز کنید.</div>'; return; }
    var low = q.toLowerCase();
    var found = (db.g || []).map(function (x) { return { x: x, k: 'g' }; }).concat((db.s || []).map(function (x) { return { x: x, k: 's' }; }))
      .filter(function (o) { return String(o.x.n || '').toLowerCase().indexOf(low) >= 0 || String(o.x.cd || '') === q; }).slice(0, 14);
    box.innerHTML = found.length ? found.map(function (o) {
      return '<div class="lrow" data-add="' + esc(o.x.id) + '" data-kind="' + o.k + '" style="padding:6px 8px;margin-bottom:4px;cursor:pointer"><div class="ltxt"><b>' + esc(o.x.n) + '</b><small>' + esc(o.x.cat || '') + ' · قیمت فروش ' + fmt(fromDb(o.x.pr)) + (Number(o.x.co) ? ' · قیمت خرید ' + fmt(fromDb(o.x.co)) : ' · قیمت خرید ثبت نشده') + '</small></div></div>';
    }).join('') : '<div class="dim">چیزی پیدا نشد.</div>';
  }

  // ---------- قالب‌های پیش‌نمایش (سه طراحی متفاوت) ----------
  var TPL = { classic: 'کلاسیک', modern: 'مدرن', minimal: 'ساده' };
  function paperHTML() {
    var inv = IV.inv, sh = shop(), t = totals(), self = IV.mode === 'self', cur = esc(sh.currency);
    var rows = inv.lines.map(function (l, i) {
      var c = lineCalc(l);
      if (self) return '<tr><td>' + fa(i + 1) + '</td><td class="al">' + esc(l.name) + '</td><td>' + fa(c.q) + '</td><td>' + fmt(c.unit) + '</td><td>' + fmt(c.total) + '</td></tr>';
      return '<tr><td>' + fa(i + 1) + '</td><td class="al">' + esc(l.name) + '</td><td>' + fa(c.q) + '</td><td>' + fmt(c.cost) + '</td><td>' + fmt(c.total) + '</td></tr>';
    }).join('');
    var head = self
      ? '<tr><th>ردیف</th><th class="al">شرح کالا</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr>'
      : '<tr><th>ردیف</th><th class="al">شرح</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr>';
    var totalsRows = '';   // فقط مبلغ قابل پرداخت نشان داده می‌شود
    var storeNote = (self && inv.store) ? '<div class="iv-note">کالاهای این فاکتور از فروشگاه «' + esc(inv.store) + '» تهیه شده‌اند.</div>' : '';
    var note = inv.note ? '<div class="iv-note">' + esc(inv.note) + '</div>' : '';
    var party = '<div class="iv-party"><b>فروشنده</b><span>' + esc(inv.seller || sh.name) + '</span></div>' +
                '<div class="iv-party"><b>خریدار</b><span>' + esc(inv.buyer || '—') + (inv.bphone ? '<br>' + fa(inv.bphone) : '') + (inv.baddr ? '<br>' + esc(inv.baddr) : '') + '</span></div>';
    return '<div class="iv-paper iv-' + IV.tpl + '">' +
      '<div class="iv-top"><div class="iv-shop">' + esc(sh.name) + '</div>' + (sh.phone || sh.addr ? '<div class="iv-contact">' + esc(sh.phone ? fa(sh.phone) : '') + (sh.phone && sh.addr ? ' · ' : '') + esc(sh.addr || '') + '</div>' : '') + '</div>' +
      '<div class="iv-title">فاکتور فروش</div>' +
      '<div class="iv-meta"><span>شماره: <b>' + (IV.id ? esc(fa(inv.no)) : 'پیش‌نویس') + '</b></span><span>تاریخ: <b>' + esc(fa(inv.date)) + '</b></span></div>' +
      '<div class="iv-parties">' + party + '</div>' +
      '<table class="iv-items">' + head + rows + '</table>' +
      '<div class="iv-foot"><div class="iv-notes">' + storeNote + note + '</div>' +
      '<table class="iv-tot">' + totalsRows + '<tr class="grand"><td>مبلغ قابل پرداخت</td><td>' + fmt(t.final) + ' ' + cur + '</td></tr></table></div>' +
      '<div class="iv-sign"><span>امضای فروشنده</span><span>امضای خریدار</span></div></div>';
  }
  var PAPER_CSS = '<style>' +
    '.iv-paper{font:13px Vazirmatn,Tahoma;direction:rtl;color:#111;background:#fff;width:100%;max-width:820px;margin:0 auto;padding:26px;box-sizing:border-box;min-height:620px}' +
    '.iv-paper .al{text-align:right}' +
    '.iv-top{text-align:center}.iv-shop{font-size:24px;font-weight:800}.iv-contact{color:#555;margin-top:2px}' +
    '.iv-title{text-align:center;font-size:19px;font-weight:700;margin:12px 0}' +
    '.iv-meta{display:flex;justify-content:space-between;margin-bottom:10px}' +
    '.iv-parties{display:flex;gap:14px;margin-bottom:12px}.iv-party{flex:1;line-height:1.8}.iv-party b{display:block}' +
    '.iv-items{width:100%;border-collapse:collapse}.iv-items th,.iv-items td{padding:7px 8px;text-align:center}' +
    '.iv-foot{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-top:14px}.iv-notes{flex:1;line-height:1.8}' +
    '.iv-note{margin-top:6px;color:#333}' +
    '.iv-tot{border-collapse:collapse;min-width:270px}.iv-tot td{padding:6px 10px}.iv-tot .grand td{font-weight:800;font-size:15px}' +
    '.iv-sign{display:flex;justify-content:space-between;margin-top:56px;padding:0 24px}' +
    '/* کلاسیک: قاب دوتایی، جدول با خط کامل، عنوان وسط */' +
    '.iv-classic{border:3px double #222;padding:30px}.iv-classic .iv-top{border-bottom:1px solid #222;padding-bottom:10px}' +
    '.iv-classic .iv-items th,.iv-classic .iv-items td{border:1px solid #444}.iv-classic .iv-items th{background:#e9e9e9}' +
    '.iv-classic .iv-tot td{border:1px solid #444}' +
    '/* مدرن: نوار آبی بالا، کارت‌های گرد، ردیف‌های راه‌راه */' +
    '.iv-modern .iv-top{background:linear-gradient(120deg,#1f4fa3,#3a74d6);color:#fff;border-radius:14px;padding:18px}' +
    '.iv-modern .iv-contact{color:#dbe6ff}.iv-modern .iv-title{color:#1f4fa3;text-align:left;font-size:22px}' +
    '.iv-modern .iv-party{background:#f1f5fc;border-radius:12px;padding:10px 12px}' +
    '.iv-modern .iv-items th{background:#1f4fa3;color:#fff;border:0}.iv-modern .iv-items td{border-bottom:1px solid #e1e8f5}' +
    '.iv-modern .iv-items tr:nth-child(even) td{background:#f5f8fd}' +
    '.iv-modern .iv-tot{background:#1f4fa3;color:#fff;border-radius:12px;overflow:hidden}.iv-modern .iv-tot td{border:0;padding:8px 12px}' +
    '/* ساده: بدون رنگ، فقط خط‌های افقی و فاصله‌ی زیاد */' +
    '.iv-minimal{padding:34px 40px}.iv-minimal .iv-shop{font-size:20px;letter-spacing:1px;text-transform:uppercase}' +
    '.iv-minimal .iv-title{text-align:right;font-size:14px;letter-spacing:3px;color:#666;margin-top:24px}' +
    '.iv-minimal .iv-meta{border-bottom:1px solid #111;padding-bottom:6px}' +
    '.iv-minimal .iv-items th{border-bottom:2px solid #111;background:none;font-size:12px;color:#444}' +
    '.iv-minimal .iv-items td{border-bottom:1px solid #ddd}' +
    '.iv-minimal .iv-tot td{border:0;border-bottom:1px solid #ddd}' +
    '</style>';

  // ---------- رندر ----------
  function renderAll() {
    $('ivForm').innerHTML = formHTML();
    $('ivLines').innerHTML = linesHTML();
    searchResults();
    refreshPaper();
    $('ivTpls').innerHTML = Object.keys(TPL).map(function (k) { return '<button class="chip ' + (IV.tpl === k ? 'on' : '') + '" data-tpl="' + k + '">' + TPL[k] + '</button>'; }).join('');
    $('ivMode-self').classList.toggle('on', IV.mode === 'self');
    $('ivMode-free').classList.toggle('on', IV.mode === 'free');
  }
  function refreshPaper() { $('ivPaper').innerHTML = PAPER_CSS + paperHTML(); }

  // ---------- رویدادها ----------
  function setMode(m) { snap(true); IV.mode = m; IV.inv.lines = []; IV.q = ''; renderAll(); }
  $('ivMode-self').onclick = function () { setMode('self'); };
  $('ivMode-free').onclick = function () { setMode('free'); };
  $('ivTpls').onclick = function (e) {
    var bt = e.target.closest && e.target.closest('[data-tpl]'), t = bt && bt.getAttribute('data-tpl');
    if (t) { snap(true); IV.tpl = t; renderAll(); }
  };
  $('ivNew').onclick = function () { snap(true); newInvoice(); };
  $('ivSave').onclick = function () { saveInvoice(); };
  $('ivPrint').onclick = function () { printInvoice(); };
  $('ivHist').onclick = function () { showHistory(); };

  $('ivForm').addEventListener('input', function (e) {
    var t = e.target;
    if (t.getAttribute('data-s')) { var sh = shop(); sh[t.getAttribute('data-s')] = t.value; jset(KEY_SHOP, sh); refreshPaper(); return; }
    if (t.id === 'ivSearch') { IV.q = t.value; searchResults(); return; }
    if (t.type === 'checkbox') return;
    snap(false);
    var f = t.getAttribute('data-f'), li = t.getAttribute('data-l');
    if (li != null) { var l = IV.inv.lines[+li]; if (l) { l[f] = t.value; if (f === 'total' && t.value === '') l.total = null; } }
    else if (f) IV.inv[f] = t.value;
    if (li != null) { $('ivLines').innerHTML = linesHTML(); }
    refreshPaper();
  });
  $('ivForm').addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute('data-s')) { var sh = shop(); sh[t.getAttribute('data-s')] = t.value; jset(KEY_SHOP, sh); renderAll(); return; }
    if (t.getAttribute('data-f') === 'discOn') { snap(true); IV.inv.discOn = t.checked; renderAll(); }
  });
  $('ivForm').addEventListener('click', function (e) {
    var t = e.target;
    var add = t.closest && t.closest('[data-add]');
    if (add) { addProduct(add.getAttribute('data-add'), add.getAttribute('data-kind')); return; }
    var bt = t.closest && t.closest('[data-a]'), a = bt && bt.getAttribute('data-a');
    if (!a) return;
    snap(true);
    if (a === 'today') { IV.inv.date = faToday(); renderAll(); }
    if (a === 'saveSeller') saveSeller();
    if (a === 'addLine') { IV.inv.lines.push({ name: '', qty: 1, price: 0, total: null }); renderAll(); }
    if (a === 'rm') { IV.inv.lines.splice(+bt.getAttribute('data-i'), 1); renderAll(); }
    if (a === 'clear') { IV.inv.lines = []; renderAll(); }
    if (a === 'save') saveInvoice();
    if (a === 'print') printInvoice();
  });

  function addProduct(id, kind) {
    var db = jget(PRODUCT_KEY, null); if (!db) return;
    var p = (kind === 's' ? db.s : db.g || []).find(function (x) { return x.id === id; }); if (!p) return;
    snap(true);
    var ex = IV.inv.lines.find(function (l) { return l.pid === id; });
    if (ex) ex.qty = (num(ex.qty) || 0) + 1;
    else {
      var hasCost = Number(p.co) > 0;
      IV.inv.lines.push({ pid: id, name: p.n, qty: 1, cost: hasCost ? fromDb(p.co) : fromDb(p.pr), costMissing: !hasCost });
    }
    IV.q = ''; renderAll(); status('کالا اضافه شد: ' + p.n + (Number(p.co) > 0 ? '' : ' (قیمت خرید ثبت نشده؛ اصلاح کنید)'));
  }
  function saveSeller() {
    var n = (IV.inv.seller || '').trim(); if (!n) return status('نام فروشنده را وارد کنید.');
    var list = jget(KEY_SELL, []); if (list.indexOf(n) < 0) list.push(n); jset(KEY_SELL, list);
    renderAll(); status('فروشنده «' + n + '» ذخیره شد.');
  }

  function newInvoice() {
    IV.id = null;
    IV.inv = { no: '', date: faToday(), seller: '', buyer: '', bphone: '', baddr: '', note: '', store: '', discOn: false, disc: 0, discAmt: 0, lines: [] };
    renderAll(); status('فاکتور جدید.');
  }
  function saveInvoice() {
    if (!IV.inv.lines.length) return status('حداقل یک ردیف لازم است.');
    if (!IV.id) { IV.id = 'i' + Date.now().toString(36); IV.inv.no = nextNo(); }
    var all = jget(KEY_INV, []);
    var rec = JSON.parse(JSON.stringify({ id: IV.id, mode: IV.mode, tpl: IV.tpl, inv: IV.inv, t: totals(), at: Date.now() }));
    var i = all.findIndex(function (x) { return x.id === IV.id; });
    if (i >= 0) all[i] = rec; else all.push(rec);
    jset(KEY_INV, all);
    renderAll(); status('فاکتور ' + fa(IV.inv.no) + ' ذخیره شد.');
  }
  function printInvoice() {
    if (!IV.inv.lines.length) return status('ردیفی برای پرینت نیست.');
    $('print-area').innerHTML = PAPER_CSS + paperHTML();
    setTimeout(function () { window.print(); }, 200);
  }

  function showHistory() {
    var all = jget(KEY_INV, []), w = $('ivPaper');
    if (!all.length) { w.innerHTML = '<div class="hint">هنوز فاکتوری ذخیره نشده است.</div>'; return; }
    w.innerHTML = '<div class="hint" style="text-align:right"><b>فاکتورهای ذخیره‌شده</b></div>' + all.slice().reverse().map(function (x) {
      return '<div class="lrow" style="cursor:default"><div class="ltxt"><b>' + esc(x.inv.no) + ' · ' + esc(x.inv.buyer || 'بدون خریدار') + '</b>' +
        '<small>' + esc(fa(x.inv.date)) + ' · ' + fmt(x.t.final) + ' · ' + (x.mode === 'self' ? 'خودسازی' : 'دیگرسازی') + '</small></div>' +
        '<button class="btn out" data-h="open" data-id="' + esc(x.id) + '">ویرایش</button> <button class="btn out" data-h="print" data-id="' + esc(x.id) + '">پرینت</button> <button class="btn out" data-h="del" data-id="' + esc(x.id) + '" style="color:var(--e)">حذف</button></div>';
    }).join('');
    w.onclick = function (e) {
      var bt = e.target.closest && e.target.closest('[data-h]'), a = bt && bt.getAttribute('data-h'); if (!a) return;
      var id = bt.getAttribute('data-id'), rec = all.find(function (x) { return x.id === id; }); if (!rec) return;
      if (a === 'open' || a === 'print') {
        snap(true); IV.id = rec.id; IV.mode = rec.mode; IV.tpl = rec.tpl || 'classic'; IV.inv = JSON.parse(JSON.stringify(rec.inv)); renderAll();
        if (a === 'print') printInvoice(); else status('فاکتور ' + rec.inv.no + ' باز شد.');
      }
      if (a === 'del' && confirm('این فاکتور حذف شود؟')) { jset(KEY_INV, all.filter(function (x) { return x.id !== id; })); showHistory(); }
    };
  }

  // ---------- شروع ----------
  IV.inv = { no: '', date: faToday(), seller: '', buyer: '', bphone: '', baddr: '', note: '', store: '', discOn: false, disc: 0, discAmt: 0, lines: [] };
  renderAll();
  window.invoiceRefresh = function () { searchResults(); };
})();

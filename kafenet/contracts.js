/* مدیریت قراردادها: اجاره‌ی ساعتی PS4 و تعهدنامه‌ی ودیعه‌ی مسکن (داخلی) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'kn_contracts', SEQ = 'kn_seq';
  var list = [], cur = null, q = '';

  // ---------- تاریخ شمسی ----------
  function faNow() {
    var p = {};
    new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { y: p.year, m: p.month, d: p.day };
  }
  function faDate() { var n = faNow(); return n.y + '/' + n.m + '/' + n.d; }
  function fa(s) { return String(s == null ? '' : s).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
  function money(n) { return fa(Math.round(Number(n) || 0).toLocaleString('en-US')) + ' تومان'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function status(t) { $('cStatus').textContent = t; }

  // ---------- ذخیره ----------
  function readAll() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function writeAll(a) { localStorage.setItem(KEY, JSON.stringify(a)); }
  function nextNo(type, year) {
    var seq = {}; try { seq = JSON.parse(localStorage.getItem(SEQ) || '{}'); } catch (e) {}
    var k = type + '-' + year; seq[k] = (seq[k] || 0) + 1; localStorage.setItem(SEQ, JSON.stringify(seq));
    return (type === 'ps4' ? 'PS' : 'DEP') + '-' + year + '-' + String(seq[k]).padStart(4, '0');
  }

  // ---------- تعریف فیلدها ----------
  var FIELDS = {
    ps4: [
      ['sec', 'مشخصات مشتری'],
      ['name', 'نام و نام خانوادگی', 'text'], ['nid', 'کد ملی', 'text'], ['phone', 'تلفن', 'text'], ['addr', 'آدرس', 'text'],
      ['sec', 'مشخصات دستگاه'],
      ['console', 'مدل کنسول', 'text'], ['serial', 'شماره سریال', 'text'], ['pads', 'تعداد کنترلر', 'number'],
      ['padsn', 'سریال کنترلرها', 'text'], ['games', 'بازی‌های نصب‌شده / شرح', 'textarea'], ['cond', 'وضعیت ظاهری هنگام تحویل', 'textarea'],
      ['sec', 'زمان و مبلغ (ساعتی)'],
      ['start', 'زمان شروع (شمسی)', 'dt'], ['end', 'زمان پایان (شمسی)', 'dt'],
      ['rate', 'نرخ هر ساعت (تومان)', 'number'], ['deposit', 'ودیعه (تومان)', 'number'], ['paid', 'پرداختی (تومان)', 'number']
    ],
    dep: [
      ['sec', 'مشخصات متقاضی'],
      ['name', 'نام و نام خانوادگی', 'text'], ['father', 'نام پدر', 'text'], ['nid', 'کد ملی', 'text'],
      ['shn', 'شماره شناسنامه', 'text'], ['phone', 'تلفن', 'text'], ['addr', 'آدرس', 'text'],
      ['sec', 'موضوع'],
      ['loan', 'نوع وام', 'text'], ['amount', 'مبلغ درخواستی (تومان)', 'number'], ['note', 'توضیحات', 'textarea']
    ]
  };
  var DOCS = ['کارت ملی', 'شناسنامه', 'فیش حقوقی / گواهی اشتغال', 'قرارداد اجاره‌نامه', 'فیش آب / برق / گاز', 'مدارک تکمیلی دیگر'];

  // ---------- محاسبات ----------
  function hoursOf(d) {
    if (!d.start || !d.end) return 0;
    var ms = new Date(d.end) - new Date(d.start);
    if (!(ms > 0)) return 0;
    return Math.max(1, Math.ceil(ms / 3600000));
  }
  function totals(d) {
    var h = d.type === 'ps4' ? hoursOf(d) : 0;
    var total = h * (Number(d.rate) || 0);
    return { hours: h, total: total, due: total + (Number(d.deposit) || 0) - (Number(d.paid) || 0) };
  }

  // ---------- فرم ورود ----------
  function formHTML(d) {
    var h = '<div class="cform">', defs = FIELDS[d.type];
    defs.forEach(function (f) {
      if (f[0] === 'sec') { h += '<h4>' + f[1] + '</h4>'; return; }
      var k = f[0], label = f[1], t = f[2], v = d[k] == null ? '' : d[k];
      if (t === 'dt') { h += dtHTML(k, label, v, true); return; }
      if (t === 'textarea') h += '<label class="fl">' + label + '<textarea data-k="' + k + '" rows="2">' + esc(v) + '</textarea></label>';
      else h += '<label class="fl">' + label + '<input data-k="' + k + '" type="' + t + '" value="' + esc(v) + '"></label>';
    });
    if (d.type === 'dep') {
      h += '<h4>مدارک ارائه‌شده</h4>';
      DOCS.forEach(function (x, i) {
        var on = (d.docs || []).indexOf(x) >= 0;
        h += '<label class="fl chk"><span>' + x + '</span><input type="checkbox" data-doc="' + x + '"' + (on ? ' checked' : '') + '></label>';
      });
    }
    h += '<h4>تاریخ قرارداد</h4>' + dtHTML('date', 'تاریخ قرارداد (شمسی)', d.date || '', false);
    h += '<div class="calc" id="cCalc"></div>';
    h += '<div class="top" style="padding:10px 0;border:0;background:none;gap:6px;flex-wrap:wrap">' +
      '<button class="btn" data-a="save">💾 ذخیره</button>' +
      '<button class="btn out" data-a="print">🖨 پرینت قرارداد</button>' +
      '<button class="btn out" data-a="new">＋ قرارداد جدید</button>' +
      (d.id ? '<button class="btn out" data-a="del" style="color:var(--e)">🗑 حذف</button>' : '') + '</div>';
    return h + '</div>';
  }

  function readForm() {
    var d = cur, root = $('cView');
    root.querySelectorAll('[data-k]').forEach(function (el) { d[el.dataset.k] = el.value; });
    if (root.querySelector('[data-dt="date-d"]')) d.date = readDt(root, 'date', false).jStr;
    if (root.querySelector('[data-dt="start-d"]')) d.start = readDt(root, 'start', true).iso;
    if (root.querySelector('[data-dt="end-d"]')) d.end = readDt(root, 'end', true).iso;
    d.docs = [];
    root.querySelectorAll('[data-doc]').forEach(function (el) { if (el.checked) d.docs.push(el.dataset.doc); });
    return d;
  }
  function showCalc() {
    var d = readForm(), t = totals(d), box = $('cCalc');
    if (!box) return;
    box.innerHTML = d.type === 'ps4'
      ? '<b>محاسبه:</b> ' + fa(t.hours) + ' ساعت × ' + money(d.rate) + ' = <b>' + money(t.total) + '</b>' +
        ' · کل قابل پرداخت (با ودیعه و پرداختی): <b>' + money(t.due) + '</b>'
      : '<b>مبلغ درخواستی:</b> ' + money(d.amount);
  }

  // ---------- متن سند ----------
  function docHTML(d) {
    var t = totals(d), no = d.no ? fa(d.no) : 'پیش‌نویس', date = fa(d.date || faDate());
    var head = '<div class="pd-head"><div><b>' + (d.type === 'ps4' ? 'قرارداد اجاره‌ی ساعتی کنسول PS4' : 'تعهدنامه‌ی ثبت‌نام ' + esc(d.loan || 'ودیعه‌ی مسکن')) + '</b></div>' +
      '<div>شماره: <b>' + esc(no) + '</b> · تاریخ: <b>' + esc(date) + '</b></div></div>';
    var body = '';
    if (d.type === 'ps4') {
      body = '<p>این قرارداد بین <b>کافی‌نت</b> (موجر) و آقا/خانم <b>' + esc(d.name) + '</b> (کد ملی ' + esc(fa(d.nid)) + '، تلفن ' + esc(fa(d.phone)) + '، نشانی ' + esc(d.addr) + ') (مستأجر) منعقد می‌شود.</p>' +
        '<h4>مشخصات دستگاه</h4><table class="pd-t"><tr><td>کنسول</td><td>' + esc(d.console) + '</td><td>شماره سریال</td><td>' + esc(fa(d.serial)) + '</td></tr>' +
        '<tr><td>تعداد کنترلر</td><td>' + esc(fa(d.pads)) + '</td><td>سریال کنترلرها</td><td>' + esc(fa(d.padsn)) + '</td></tr>' +
        '<tr><td colspan="4">بازی‌ها / شرح: ' + esc(d.games) + '</td></tr><tr><td colspan="4">وضعیت هنگام تحویل: ' + esc(d.cond) + '</td></tr></table>' +
        '<h4>زمان و مبلغ</h4><table class="pd-t"><tr><td>شروع</td><td>' + esc(faDT(d.start)) + '</td><td>پایان</td><td>' + esc(faDT(d.end)) + '</td></tr>' +
        '<tr><td>مدت (ساعت)</td><td>' + fa(t.hours) + '</td><td>نرخ هر ساعت</td><td>' + money(d.rate) + '</td></tr>' +
        '<tr><td>مبلغ کل اجاره</td><td><b>' + money(t.total) + '</b></td><td>ودیعه / پرداختی</td><td>' + money(d.deposit) + ' / ' + money(d.paid) + '</td></tr>' +
        '<tr><td colspan="3">مانده‌ی قابل پرداخت</td><td><b>' + money(t.due) + '</b></td></tr></table>' +
        '<h4>شرایط</h4><ol class="pd-ol">' +
        '<li>مبلغ اجاره بر اساس ساعات استفاده محاسبه می‌شود؛ هر ساعت یا بخشی از آن به‌عنوان یک ساعت حساب می‌شود.</li>' +
        '<li>مستأجر مسئول حفظ دستگاه و کنترلرها است. در صورت خسارت یا گم‌شدن قطعات، هزینه‌ی تعمیر یا تعویض بر عهده‌ی مستأجر است.</li>' +
        '<li>ودیعه پس از تحویل سالم دستگاه و کنترلرها بازگردانده می‌شود.</li>' +
        '<li>مستأجر وضعیت دستگاه را هنگام تحویل بررسی و تأیید کرده است.</li></ol>';
    } else {
      body = '<p>اینجانب <b>' + esc(d.name) + '</b> فرزند <b>' + esc(d.father) + '</b>، دارای کد ملی <b>' + esc(fa(d.nid)) + '</b> و شناسنامه‌ی شماره <b>' + esc(fa(d.shn)) + '</b>، نشانی <b>' + esc(d.addr) + '</b>، تلفن <b>' + esc(fa(d.phone)) + '</b>، ' +
        'برای ثبت‌نام <b>' + esc(d.loan || 'ودیعه‌ی مسکن') + '</b> به مبلغ <b>' + money(d.amount) + '</b> اعلام می‌کنم:</p>' +
        '<ol class="pd-ol"><li>تمامی اطلاعات و مدارکی که در این فرم ثبت شده، صحیح و متعلق به خودم است و تأیید می‌کنم.</li>' +
        '<li>مسئولیت صحت، کامل بودن و هر نتیجه‌ی ناشی از ثبت این اطلاعات بر عهده‌ی خودم است.</li>' +
        '<li>کافی‌نت صرفاً خدمت تایپ و آماده‌سازی را انجام داده و هیچ‌گونه مسئولیتی در قبال اطلاعات یا نتیجه‌ی ثبت‌نام ندارد.</li></ol>' +
        '<h4>مدارک ارائه‌شده</h4><p>' + (d.docs && d.docs.length ? d.docs.map(esc).join('، ') : '—') + '</p>' +
        (d.note ? '<p>توضیحات: ' + esc(d.note) + '</p>' : '');
    }
    var sign = '<div class="pd-sign"><div>امضای ' + (d.type === 'ps4' ? 'مستأجر' : 'متقاضی') + '</div><div>' + (d.type === 'ps4' ? 'مهر و امضای کافی‌نت' : '') + '</div></div>';
    return '<div class="pd-doc">' + head + body + sign + '</div>';
  }
  var PRINT_CSS = '<style>.pd-doc{font:13px Vazirmatn,Tahoma;color:#000;direction:rtl;padding:12mm;line-height:1.9}' +
    '.pd-head{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:10px}' +
    '.pd-t{width:100%;border-collapse:collapse;margin:6px 0}.pd-t td{border:1px solid #777;padding:4px 6px}' +
    '.pd-ol{padding-right:18px}.pd-sign{display:flex;justify-content:space-between;margin-top:40px}' +
    'h4{margin:12px 0 4px}</style>';

  // ---------- نمایش ----------
  function render() {
    var box = $('cList'); box.innerHTML = '';
    var rows = list.filter(function (x) {
      if (!q) return true;
      return [x.no, x.name, x.nid, x.phone].some(function (v) { return String(v || '').indexOf(q) >= 0; });
    });
    if (!rows.length) box.innerHTML = '<div class="hint" style="grid-column:1/-1">قراردادی نیست. از دکمه‌های بالا یک قرارداد بسازید.</div>';
    rows.slice().reverse().forEach(function (x) {
      var c = document.createElement('div');
      c.className = 'fcard' + (cur && cur.id === x.id ? ' on' : '');
      c.innerHTML = '<div class="ic" style="font-size:30px">' + (x.type === 'ps4' ? '🎮' : '🏠') + '</div><small></small>';
      c.querySelector('small').textContent = (x.no || 'پیش‌نویس') + ' · ' + (x.name || '');
      c.onclick = function () { cur = x; showEditor(); };
      box.appendChild(c);
    });
  }
  function showEditor() {
    var v = $('cView');
    v.innerHTML = '<h3>' + (cur.type === 'ps4' ? 'قرارداد اجاره‌ی PS4' : 'تعهدنامه‌ی ودیعه‌ی مسکن') + (cur.no ? ' · ' + fa(cur.no) : ' · پیش‌نویس') + '</h3>' +
      formHTML(cur) + '<div class="pdprev">' + PRINT_CSS + docHTML(cur) + '</div>';
    v.querySelectorAll('input,textarea,select').forEach(function (el) { el.oninput = el.onchange = function () { readForm(); showCalc(); refreshPreview(); }; });
    v.onclick = function (e) {
      var bt = e.target.closest && e.target.closest('[data-a]'), a = bt && bt.getAttribute('data-a'); if (!a) return;
      if (a === 'save') saveCurrent();
      if (a === 'print') printCurrent();
      if (a === 'new') newContract(cur.type);
      if (a === 'del') deleteCurrent();
    };
    showCalc();
  }
  function refreshPreview() { var p = document.querySelector('#cView .pdprev'); if (p) p.innerHTML = PRINT_CSS + docHTML(cur); }

  function nowIso(addH) {
    var d = new Date(Date.now() + addH * 3600000), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function newContract(type) {
    cur = { type: type, date: faDate(), docs: [], start: nowIso(0), end: nowIso(1), rate: '', deposit: '', paid: '' };
    showEditor();
  }
  function saveCurrent() {
    readForm();
    if (!cur.no) cur.no = nextNo(cur.type, faNow().y);
    if (!cur.id) cur.id = 'c' + Date.now().toString(36);
    var all = readAll(), i = all.findIndex(function (x) { return x.id === cur.id; });
    var rec = JSON.parse(JSON.stringify(cur));
    if (i >= 0) all[i] = rec; else all.push(rec);
    writeAll(all); list = all; cur = rec;
    render(); showEditor(); status('قرارداد ' + cur.no + ' ذخیره شد.');
  }
  function deleteCurrent() {
    if (!cur || !cur.id) return;
    if (!confirm('این قرارداد حذف شود؟ (شماره‌ی آن مصرف‌شده باقی می‌ماند)')) return;
    list = readAll().filter(function (x) { return x.id !== cur.id; }); writeAll(list);
    cur = null; $('cView').innerHTML = '<div class="hint">قرارداد حذف شد.</div>'; render(); status('حذف شد.');
  }
  function printCurrent() {
    readForm();
    var pa = document.getElementById('print-area');
    pa.innerHTML = PRINT_CSS + docHTML(cur);
    setTimeout(function () { window.print(); }, 200);
  }

  $('cNewPs').onclick = function () { newContract('ps4'); };
  $('cNewDep').onclick = function () { newContract('dep'); };
  $('cBack').onclick = function () { cur = null; render(); $('cView').innerHTML = '<div class="hint">قرارداد جدید بسازید یا از فهرست یکی را باز کنید</div>'; };
  $('cSearch').oninput = function () { q = this.value.trim(); render(); };

  window.contractsRefresh = function () { list = readAll(); render(); };
  list = readAll(); render();
  $('cView').innerHTML = '<div class="hint">قرارداد جدید بسازید یا از فهرست یکی را باز کنید</div>';
})();

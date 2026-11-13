/* فرم‌های آماده: عکس، PDF و فرم متنی با جای‌گذاری مقدار (مثل {نام}) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var DBN = 'kn-forms', STORE = 'forms', db = null, items = [], cur = null, q = '';

  function openDb() {
    if (db) return Promise.resolve(db);
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = function () { db = r.result; res(db); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function tx(mode) { return db.transaction(STORE, mode).objectStore(STORE); }
  function req(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  async function load() { await openDb(); items = (await req(tx('readonly').getAll())).sort(function (a, b) { return b.created - a.created; }); }
  async function put(rec) { await openDb(); await req(tx('readwrite').put(rec)); }
  async function del(id) { await openDb(); await req(tx('readwrite').delete(id)); }
  function status(t) { $('fStatus').textContent = t; }
  function uid() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function fa(s) { return String(s).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }

  // ---------- افزودن ----------
  $('fAddFile').onclick = function () { $('fFileIn').click(); };
  $('fFileIn').onchange = async function (e) {
    var files = Array.prototype.slice.call(e.target.files || []); e.target.value = '';
    for (var i = 0; i < files.length; i++) {
      var f = files[i], type = /^image\//.test(f.type) ? 'image' : (f.type === 'application/pdf' ? 'pdf' : 'file');
      var rec = { id: uid(), name: f.name.replace(/\.[^.]+$/, ''), type: type, mime: f.type, blob: f, created: Date.now() };
      await put(rec);
    }
    await load(); render(); status(files.length + ' فرم اضافه شد.');
  };
  $('fNewText').onclick = async function () {
    var name = await askText('نام فرم متنی', 'فرم جدید'); if (!name) return;
    var rec = { id: uid(), name: name, type: 'text', text: 'تاریخ: {تاریخ}\nنام: {نام}\nکدملی: {کدملی}\n\nمتن فرم را اینجا بنویسید…', created: Date.now() };
    await put(rec); await load(); open(rec.id, true);
  };
  $('fSearch').oninput = function () { q = this.value.trim().toLowerCase(); render(); };

  // ---------- لیست ----------
  function icon(t) { return t === 'pdf' ? '📕' : t === 'text' ? '📝' : t === 'image' ? '🖼' : '📄'; }
  function render() {
    var g = $('fGrid'); g.innerHTML = '';
    var list = items.filter(function (x) { return !q || x.name.toLowerCase().indexOf(q) >= 0; });
    if (!list.length) { g.innerHTML = '<div class="hint" style="grid-column:1/-1">فرمی نیست. با «افزودن فایل» یا «فرم متنی جدید» شروع کنید.</div>'; return; }
    list.forEach(function (x) {
      var c = document.createElement('div');
      c.className = 'fcard' + (cur && cur.id === x.id ? ' on' : '');
      var ic = document.createElement('div'); ic.className = 'ic';
      if (x.type === 'image' && x.blob) { var im = document.createElement('img'); im.src = URL.createObjectURL(x.blob); ic.appendChild(im); }
      else ic.textContent = icon(x.type);
      var s = document.createElement('small'); s.textContent = x.name;
      c.appendChild(ic); c.appendChild(s);
      c.onclick = function () { open(x.id); };
      g.appendChild(c);
    });
  }
  function open(id, editText) {
    cur = items.find(function (x) { return x.id === id; }) || null;
    render(); showView(editText);
  }

  // ---------- نمایش / ویرایش ----------
  function showView(editText) {
    var v = $('fView'); v.innerHTML = '';
    if (!cur) { v.innerHTML = '<div class="hint">یک فرم را انتخاب کنید</div>'; return; }
    var h = document.createElement('h3'); h.textContent = cur.name; v.appendChild(h);
    var bar = document.createElement('div'); bar.className = 'top'; bar.style.cssText = 'padding:0;border:0;background:none;margin-bottom:10px';
    bar.innerHTML = '<button class="btn" data-a="print">🖨 پرینت</button><button class="btn out" data-a="save">💾 ذخیره در پوشه</button><button class="btn out" data-a="ren">✏ تغییر نام</button><button class="btn out" data-a="del" style="color:var(--e)">🗑 حذف</button>';
    v.appendChild(bar);
    bar.onclick = async function (e) {
      var bt = e.target.closest && e.target.closest('[data-a]'), a = bt && bt.getAttribute('data-a'); if (!a) return;
      if (a === 'print') printCurrent();
      if (a === 'save') saveCurrent();
      if (a === 'ren') { var n = await askText('نام جدید', cur.name); if (n) { cur.name = n; await put(cur); await load(); render(); showView(); } }
      if (a === 'del') { if (confirm('این فرم حذف شود؟')) { await del(cur.id); cur = null; await load(); render(); showView(); } }
    };
    if (cur.type === 'image') {
      var im = document.createElement('img'); im.src = URL.createObjectURL(cur.blob);
      im.style.cssText = 'max-width:100%;border-radius:10px;box-shadow:var(--shadow)'; v.appendChild(im);
    } else if (cur.type === 'pdf') {
      var fr = document.createElement('iframe'); fr.src = URL.createObjectURL(cur.blob);
      fr.style.cssText = 'width:100%;height:70vh;border:1px solid var(--l);border-radius:10px;background:#fff'; v.appendChild(fr);
      var note = document.createElement('div'); note.className = 'dim'; note.style.marginTop = '6px';
      note.textContent = 'اگر پیش‌نمایش PDF دیده نشد، از «پرینت» یا «ذخیره» استفاده کنید.'; v.appendChild(note);
    } else if (cur.type === 'text') {
      v.appendChild(textEditor(editText));
    } else {
      var f = document.createElement('div'); f.className = 'hint'; f.textContent = 'این نوع فایل پیش‌نمایش ندارد. می‌توانید آن را ذخیره یا پرینت کنید.'; v.appendChild(f);
    }
  }

  // فرم متنی: متن را ویرایش می‌کنی؛ جای‌گذاری‌ها {…} به‌صورت فیلد خودکار پر می‌شوند
  function textEditor(startEdit) {
    var wrap = document.createElement('div');
    var ta = document.createElement('textarea'); ta.value = cur.text || ''; ta.style.cssText = 'width:100%;height:200px;font:13px Vazirmatn,Tahoma;padding:10px';
    var fill = document.createElement('div'); fill.style.cssText = 'margin:10px 0;display:grid;grid-template-columns:1fr 1fr;gap:6px';
    var out = document.createElement('div'); out.className = 'fview'; out.style.cssText = 'margin-top:10px;background:#fff;color:#000;border-radius:8px;white-space:pre-wrap;font:14px Vazirmatn,Tahoma;padding:20px;min-height:200px';
    function keys() { var m = {}, re = /\{([^{}]+)\}/g, x; while ((x = re.exec(ta.value))) m[x[1]] = 1; return Object.keys(m); }
    function redraw() {
      var k = keys(), prev = {};
      fill.querySelectorAll('input').forEach(function (i) { prev[i.dataset.k] = i.value; });
      fill.innerHTML = '';
      k.forEach(function (name) {
        var l = document.createElement('label'); l.style.cssText = 'font-size:12px;display:flex;flex-direction:column;gap:3px';
        l.innerHTML = '<span></span><input data-k="" style="padding:5px">';
        l.querySelector('span').textContent = name; var i = l.querySelector('input'); i.dataset.k = name; i.value = prev[name] || '';
        i.oninput = function () { out.textContent = fillText(); };
        fill.appendChild(l);
      });
      out.textContent = fillText();
    }
    function fillText() {
      var vals = {}; fill.querySelectorAll('input').forEach(function (i) { vals[i.dataset.k] = i.value; });
      return ta.value.replace(/\{([^{}]+)\}/g, function (_, k) { return vals[k] != null && vals[k] !== '' ? vals[k] : '{' + k + '}'; });
    }
    var save = document.createElement('button'); save.className = 'btn'; save.textContent = '💾 ذخیره‌ی متن فرم';
    save.onclick = async function () { cur.text = ta.value; await put(cur); status('متن فرم ذخیره شد.'); redraw(); };
    ta.oninput = redraw;
    var lbl = document.createElement('div'); lbl.className = 'dim'; lbl.textContent = 'قالب: هر جای {نام} بنویسید، فیلد آن ساخته می‌شود. برای پرینت، مقادیر را پر کنید.';
    wrap.appendChild(lbl); wrap.appendChild(ta); wrap.appendChild(save); wrap.appendChild(fill); wrap.appendChild(out);
    if (!startEdit) ta.style.display = 'block';
    // پیش‌نمایش پرشده برای پرینت
    out.dataset.text = '1';
    redraw();
    wrap.dataset.preview = '1'; wrap._fill = fillText;
    cur._getPrint = function () { return fillText(); };
    return wrap;
  }

  // ---------- پرینت / ذخیره ----------
  function printCurrent() {
    if (!cur) return;
    var pa = document.getElementById('print-area'), html = '';
    if (cur.type === 'image') html = '<img src="' + URL.createObjectURL(cur.blob) + '" style="max-width:100%">';
    else if (cur.type === 'pdf') html = '<iframe src="' + URL.createObjectURL(cur.blob) + '" style="width:100%;height:100vh;border:0"></iframe>';
    else if (cur.type === 'text') {
      var txt = cur._getPrint ? cur._getPrint() : (cur.text || '');
      html = '<div style="white-space:pre-wrap;font:14px Vazirmatn,Tahoma;padding:20mm;line-height:2">' + txt.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</div>';
    }
    pa.innerHTML = html;
    setTimeout(function () { window.print(); }, 250);
  }
  async function saveCurrent() {
    if (!cur) return;
    var dir = await window.pickFolder(); if (dir === 'abort') return;
    var files = cur.type === 'text'
      ? [{ name: cur.name + '.txt', blob: new Blob([cur._getPrint ? cur._getPrint() : cur.text], { type: 'text/plain;charset=utf-8' }) }]
      : [{ name: cur.name + (cur.type === 'pdf' ? '.pdf' : '.' + (cur.mime.split('/')[1] || 'bin')), blob: cur.blob }];
    status(await window.saveFiles(files, dir));
  }

  $('fBack').onclick = function () { cur = null; render(); showView(); };
  window.formsRefresh = async function () { await load(); render(); };
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || (e.key || '').toLowerCase() !== 'f') return;
    if (!$('tab-forms') || $('tab-forms').style.display === 'none') return;
    e.preventDefault(); $('fSearch').focus();
  }, true);
  load().then(render).catch(function (e) { status('خطا در بارگذاری فرم‌ها: ' + e.message); });
})();

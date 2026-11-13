/* ===== نسخه‌ی ویندوز: بارکدخوان USB (کیبورد-مانند / HID) =====
   هر بارکدخوانی که مثل کیبورد کار کند (سیمی یا بی‌سیم) بدون آپدیت کار می‌کند.
   اسکنر کد را خیلی سریع تایپ می‌کند و آخرش Enter می‌زند؛ این فایل همین الگو را می‌شناسد.
   - اگر منتظر اسکن هستیم (مثلاً دکمه‌ی بارکد زده شده)، کد را همان‌جا برمی‌گرداند.
   - اگر فیلدی فعال است، کد در آن نوشته و Enter آن اجرا می‌شود.
   - در صفحه‌ی فروش، کالا مستقیم به سبد اضافه می‌شود. در بقیه‌ی صفحه‌ها جستجو می‌شود.
   دوربین وب استفاده نمی‌شود. */
(function () {
  'use strict';
  if (window.__scanKB) return;
  window.__scanKB = true;

  var MAX_GAP = 45;   // میلی‌ثانیه؛ فاصله‌ی بیشتر یعنی تایپ انسانی و شروع یک رشته‌ی تازه
  var MIN_LEN = 4;    // بارکد کوتاه‌تر از این نداریم
  var buf = [];       // کاراکترهای رشته‌ی جاری
  var lastT = 0;
  var pending = null; // تابع resolve وقتی منتظر اسکن هستیم
  var waitEl = null;

  // کاراکتر فیزیکی کلید. از e.code استفاده می‌کنیم تا با چیدمان فارسی یا انگلیسی فرقی نکند.
  function charOf(e) {
    var c = e.code || '', m;
    if ((m = /^(?:Digit|Numpad)([0-9])$/.exec(c))) return m[1];
    if ((m = /^Key([A-Z])$/.exec(c))) return e.shiftKey ? m[1] : m[1].toLowerCase();
    if (c === 'Minus' || c === 'NumpadSubtract') return '-';
    if (c === 'Period' || c === 'NumpadDecimal') return '.';
    if (c === 'Slash' || c === 'NumpadDivide') return '/';
    return null;
  }
  function isEnter(e) { return e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter'; }
  var MODS = { Shift: 1, Control: 1, Alt: 1, Meta: 1, CapsLock: 1, AltGraph: 1 };

  // کاراکترهایی را که اسکنر در فیلد نوشته، پاک می‌کند
  function stripTyped(el, n) {
    if (!el || n <= 0) return;
    try {
      var v = el.value, s = el.selectionStart;
      if (typeof s === 'number') {
        var cut = Math.max(0, s - n);
        el.value = v.slice(0, cut) + v.slice(s);
        el.setSelectionRange(cut, cut);
      } else {
        el.value = v.slice(0, Math.max(0, v.length - n));
      }
    } catch (e) {}
  }

  function finish(v) {
    var r = pending;
    pending = null;
    hideWait();
    if (r) r(v);
  }

  function globalScan(code) {
    // در صفحه‌ی فروش: کالا مستقیم به سبد
    if (typeof view !== 'undefined' && view === 'sale' && typeof fb === 'function' && typeof add === 'function') {
      var f = fb(code);
      if (f) { add(f[0], f[1]); toast('به سبد اضافه شد: ' + code); }
      else toast('این بارکد ثبت نشده: ' + code);
      return;
    }
    // در بقیه‌ی صفحه‌ها: جستجو با همین کد
    var sb = document.getElementById('sbar'), q = document.getElementById('q');
    if (sb && q) {
      sb.style.display = 'flex';
      q.value = code;
      if (typeof srch === 'function') srch(code);
      q.focus();
    }
    toast('بارکد ' + code + ' جستجو شد');
  }

  function handleScan(code, n) {
    var el = document.activeElement;
    var isField = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.readOnly && !el.disabled;

    if (pending) {                       // منتظر اسکن بودیم
      if (isField) stripTyped(el, n);
      finish(code);
      return;
    }
    if (isField && el.id !== 'q') {      // فیلد معمولی (مثلاً بارکد کالا): کد را بگذار و Enter بزن
      stripTyped(el, n);
      el.value = code;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      return;
    }
    if (isField) stripTyped(el, n);      // کادر جستجوی بالا: فقط متنِ اسکن‌شده پاک می‌شود
    globalScan(code);
  }

  // ---------- شنیدن کلیدها (قبل از بقیه‌ی برنامه) ----------
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pending) { finish(null); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    var k = e.key || '';
    if (MODS[k]) return;                 // کلیدهای Shift و مانند آن رشته را قطع نمی‌کنند

    var now = Date.now();
    if (isEnter(e)) {
      var ok = buf.length >= MIN_LEN && now - lastT <= MAX_GAP;
      var code = buf.join('');
      var n = buf.length;
      buf = [];
      if (!ok) return;
      e.preventDefault();
      e.stopImmediatePropagation();      // این Enter مال اسکنر است، به دکمه‌ها و فرم‌ها نرسد
      handleScan(code, n);
      return;
    }
    if (k.length !== 1) { buf = []; return; }     // فلش، Tab، Backspace و… رشته را تمام می‌کند
    if (now - lastT > MAX_GAP) buf = [];
    lastT = now;
    var ch = charOf(e);
    if (ch === null) { buf = []; return; }
    buf.push(ch);
  }, true);

  // ---------- scanCode: همان تابعی که دکمه‌های 📷/▥ صدا می‌زنند ----------
  window.scanCode = function () {
    return new Promise(function (resolve) {
      if (pending) pending(null);
      pending = resolve;
      showWait();
    });
  };

  // ---------- نشانگر «منتظر اسکن» ----------
  var CSS = '#scan-wait{position:fixed;left:calc(50% - 134px);bottom:24px;transform:translateX(-50%);z-index:60;display:none;' +
    'align-items:center;gap:12px;background:var(--c);color:var(--t);border:1px solid var(--p);border-radius:18px;' +
    'padding:12px 16px;box-shadow:0 14px 40px rgba(0,0,0,.25)}' +
    '#scan-wait .dot{width:12px;height:12px;border-radius:50%;background:var(--p);animation:scanpulse 1.2s infinite}' +
    '@keyframes scanpulse{0%{box-shadow:0 0 0 0 rgba(47,91,234,.55)}100%{box-shadow:0 0 0 14px rgba(47,91,234,0)}}' +
    '#scan-wait b{font-size:15px;display:block}#scan-wait small{color:var(--m);font-size:12px;display:block}' +
    '#scan-wait button{border:0;background:var(--c2);color:var(--t);width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:16px}';

  function showWait() {
    if (!waitEl) {
      var st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
      waitEl = document.createElement('div');
      waitEl.id = 'scan-wait';
      waitEl.innerHTML = '<span class="dot"></span><div><b>منتظر اسکن بارکد…</b><small>بارکدخوان را بزنید · Esc انصراف</small></div><button type="button" title="انصراف">✕</button>';
      waitEl.querySelector('button').onclick = function () { finish(null); };
      document.body.appendChild(waitEl);
    }
    waitEl.style.display = 'flex';
  }
  function hideWait() { if (waitEl) waitEl.style.display = 'none'; }
})();

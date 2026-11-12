/* نسخه‌ی ویندوز: آیکون همگام‌سازی در نوار بالا، هشدار قطع اتصال، و تعیین یک‌باره‌ی کد اتصال سرور */
(function () {
  'use strict';
  if (window.__syncUI) return;
  window.__syncUI = true;

  var CSS = '' +
    '#sync-btn{position:relative;width:46px;height:46px;border-radius:14px;border:1px solid var(--l);background:var(--c2);color:var(--t);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;margin-right:6px}' +
    '#sync-btn:hover{background:var(--pl)}#sync-btn svg{width:22px;height:22px}' +
    '#sync-btn .sdot{position:absolute;top:6px;left:6px;width:10px;height:10px;border-radius:50%;border:2px solid var(--c)}' +
    '#sync-btn.ok .sdot{background:#2ecc71}#sync-btn.busy .sdot{background:#f0a500}#sync-btn.bad .sdot{background:#e74c3c}#sync-btn.off .sdot{background:#8a94a8}' +
    '#sync-btn.bad{color:#e74c3c}' +
    '#sync-pop{position:fixed;top:160px;left:18px;width:340px;max-width:92vw;background:var(--c);border:1px solid var(--l);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.35);padding:16px;z-index:200;font-size:15px}' +
    '#sync-pop h4{margin:0 0 10px;font-size:17px}#sync-pop .r{display:flex;justify-content:space-between;gap:10px;margin:6px 0;color:var(--m)}#sync-pop .r b{color:var(--t);direction:ltr;text-align:left}' +
    '#sync-pop .acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}' +
    '#sync-banner{position:fixed;top:160px;right:18px;z-index:190;background:#e74c3c;color:#fff;border-radius:14px;padding:12px 16px;font-size:15px;box-shadow:0 10px 30px rgba(0,0,0,.3);display:flex;gap:12px;align-items:center}' +
    '#sync-banner.ok{background:#2ecc71}#sync-banner button{background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:10px;padding:6px 12px;cursor:pointer;font-size:14px}' +
    '#sync-prompt{position:fixed;inset:0;background:rgba(6,12,28,.5);display:flex;align-items:center;justify-content:center;z-index:300}' +
    '#sync-prompt .box{background:var(--c);border:1px solid var(--l);border-radius:18px;padding:22px;width:420px;max-width:92vw;box-shadow:0 30px 70px rgba(0,0,0,.35)}' +
    '#sync-prompt .t{font-size:17px;font-weight:800;color:var(--p);margin-bottom:10px}#sync-prompt input{width:100%;height:46px;font-size:18px;padding:0 12px;direction:ltr;text-align:center;letter-spacing:4px}' +
    '#sync-prompt .b{display:flex;gap:8px;margin-top:14px}#sync-prompt .b button{height:44px;padding:0 18px;border-radius:12px;border:0;cursor:pointer;background:var(--p);color:#fff;font-size:15px}#sync-prompt .b .o{background:var(--c);color:var(--p);border:1px solid var(--bd)}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/></svg>';

  var state = 'off', pop = null, lastOk = 0, lastErr = '', role = 'client', codeSet = true, banner = null, srvAddr = '';

  function sv() { try { return JSON.parse(localStorage.getItem('trf2_sv') || 'null'); } catch (e) { return null; } }
  function pending() { try { return (typeof SVQ !== 'undefined' && SVQ) ? SVQ.length : 0; } catch (e) { return 0; } }
  function url() { var s = sv(); return s && s.url ? String(s.url).replace(/\/$/, '') : ''; }

  // ---------- دکمه‌ی نوار بالا ----------
  var btn = document.createElement('button');
  btn.id = 'sync-btn'; btn.title = 'وضعیت همگام‌سازی'; btn.innerHTML = SVG + '<span class="sdot"></span>';
  var row = document.querySelector('header .row');
  if (row) row.appendChild(btn);

  function paint() {
    var cls = state;
    if (state === 'ok' && pending() > 0) cls = 'busy';
    btn.className = cls;
    btn.title = { off: 'همگام‌سازی تنظیم نشده', ok: 'وصل و همگام', busy: 'در حال ارسال تغییرات', bad: 'قطع است - اتصال به سرور برقرار نیست' }[cls];
  }

  async function check() {
    var u = url();
    if (!u) { setState('off'); return; }
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 3500);
    try {
      var r = await fetch(u + '/api/ping', { signal: ctl.signal, cache: 'no-store' });
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      lastOk = Date.now(); lastErr = '';
      setState('ok');
    } catch (e) {
      clearTimeout(t);
      lastErr = e.name === 'AbortError' ? 'سرور جواب نداد (زمان‌بر شد)' : 'سرور پیدا نشد یا وای‌فای قطع است';
      setState('bad');
    }
  }

  function setState(s) {
    var prev = state;
    state = s; paint();
    if (prev !== s && prev !== 'off') {
      if (s === 'bad') showBanner('ارتباط با سرور قطع شد. تغییرات در صف ذخیره می‌شود و بعد از وصل شدن ارسال می‌شود.', false);
      else if (s === 'ok' && prev === 'bad') showBanner('متصل شد و همگام‌سازی برقرار است.', true);
    }
    if (pop) renderPop();
  }

  // ---------- هشدار ----------
  function showBanner(text, ok) {
    if (banner) banner.remove();
    banner = document.createElement('div');
    banner.id = 'sync-banner'; if (ok) banner.className = 'ok';
    banner.innerHTML = '<span></span><button>باشه</button>';
    banner.querySelector('span').textContent = text;
    banner.querySelector('button').onclick = function () { banner.remove(); banner = null; };
    document.body.appendChild(banner);
    if (ok) setTimeout(function () { if (banner) { banner.remove(); banner = null; } }, 6000);
  }

  // ---------- پنجره‌ی ورودی متن (برای کد سرور) ----------
  function askText(title, def) {
    return new Promise(function (resolve) {
      var o = document.createElement('div'); o.id = 'sync-prompt';
      o.innerHTML = '<div class="box"><div class="t"></div><input inputmode="numeric" maxlength="10"><div class="b"><button data-ok>تأیید</button><button class="o" data-no>انصراف</button></div></div>';
      o.querySelector('.t').textContent = title;
      var inp = o.querySelector('input'); inp.value = def || '';
      function done(v) { o.remove(); resolve(v); }
      o.querySelector('[data-ok]').onclick = function () { done(inp.value.trim() || null); };
      o.querySelector('[data-no]').onclick = function () { done(null); };
      inp.onkeydown = function (e) { if (e.key === 'Enter') done(inp.value.trim() || null); if (e.key === 'Escape') done(null); };
      document.body.appendChild(o); inp.focus();
    });
  }
  async function changeCode(firstTime) {
    var c = await askText(firstTime ? 'کد اتصال دستگاه‌ها را تعیین کنید (۴ تا ۱۰ رقم)' : 'کد جدید اتصال (۴ تا ۱۰ رقم)', '');
    if (!c) return false;
    var r = await window.desk.setServerCode(c);
    if (!r.ok) { alert(r.error || 'خطا'); return false; }
    codeSet = true;
    alert('کد اتصال ثبت شد: ' + c + '\nاین کد را روی کامپیوترها و گوشی‌ها وارد کنید.');
    return true;
  }

  // ---------- جزئیات (کلیک روی آیکون) ----------
  function renderPop() {
    if (!pop) return;
    var s = sv(), lbl = { off: 'تنظیم نشده', ok: 'وصل و همگام', busy: 'در حال ارسال', bad: 'قطع' }[state];
    var seen = lastOk ? new Date(lastOk).toLocaleTimeString('fa-IR') : '—';
    pop.innerHTML = '<h4>همگام‌سازی</h4>' +
      '<div class="r"><span>وضعیت</span><b style="direction:rtl">' + lbl + '</b></div>' +
      '<div class="r"><span>آدرس سرور</span><b>' + (s && s.url ? s.url : '—') + '</b></div>' +
      '<div class="r"><span>تغییرات در صف</span><b>' + pending() + '</b></div>' +
      (role === 'server' && srvAddr ? '<div class="r"><span>آدرس این سرور (برای دستگاه‌های دیگر)</span><b>' + srvAddr + '</b></div>' : '') +
      '<div class="r"><span>آخرین اتصال موفق</span><b style="direction:rtl">' + seen + '</b></div>' +
      (state === 'bad' ? '<div class="r" style="color:#e74c3c"><span>دلیل</span><b style="direction:rtl;color:#e74c3c">' + lastErr + '</b></div>' : '') +
      '<div class="acts"><button data-a="check">بررسی اتصال</button>' +
      (state === 'off' ? '<button data-a="connect">اتصال به سرور</button>' : '') +
      (role === 'server' ? '<button data-a="code">تغییر کد اتصال</button>' : '') +
      '<button data-a="close">بستن</button></div>';
    pop.querySelectorAll('button').forEach(function (b) {
      b.onclick = async function () {
        var a = b.getAttribute('data-a');
        if (a === 'check') { lbl = 'بررسی…'; await check(); }
        if (a === 'connect' && typeof svForm === 'function') { closePop(); svForm(); }
        if (a === 'code') await changeCode(false);
        if (a === 'close') closePop();
      };
    });
  }
  function closePop() { if (pop) pop.remove(); pop = null; }
  btn.onclick = function (e) {
    e.stopPropagation();
    if (pop) { closePop(); return; }
    pop = document.createElement('div'); pop.id = 'sync-pop';
    document.body.appendChild(pop);
    renderPop(); check();
  };
  document.addEventListener('click', function (e) { if (pop && !pop.contains(e.target) && e.target !== btn) closePop(); });

  // ---------- کد اتصال: فقط یک‌بار، اگر کامپیوتر سرور است و هنوز تعیین نشده ----------
  function firstRunCode() {
    if (!window.desk || role !== 'server' || codeSet) return;
    var b = document.createElement('div');
    b.id = 'sync-banner'; b.style.background = '#2456b8';
    b.innerHTML = '<span>این کامپیوتر سرور است. یک کد اتصال تعیین کنید تا دستگاه‌ها وصل شوند.</span><button>تعیین کد</button>';
    b.querySelector('button').onclick = async function () { if (await changeCode(true)) b.remove(); };
    document.body.appendChild(b);
  }

  // ---------- شروع ----------
  async function init() {
    try {
      var info = await window.desk.serverInfo(); role = info.role; codeSet = info.codeSet;
      if (info.info && info.info.ips) srvAddr = info.info.ips.map(function (ip) { return ip + ':' + info.info.port; }).join('  ،  ');
    } catch (e) { /* بدون پل */ }
    firstRunCode();
    check();
    setInterval(check, 8000);
    paint();
  }
  if (window.desk) init();
  else {
    check(); setInterval(check, 8000); paint();
    // اندروید: دکمه‌ی کافی‌نت یار در نوار بالا
    if (row && !document.getElementById('kafe-btn')) {
      var kb = document.createElement('button');
      kb.id = 'kafe-btn'; kb.textContent = '🪄 کافی‌نت یار';
      kb.style.cssText = 'width:auto;height:40px;padding:0 12px;border:0;border-radius:12px;background:linear-gradient(135deg,#2456b8,#1d47a0);color:#fff;font-size:14px;font-weight:700;margin-right:6px;white-space:nowrap';
      kb.onclick = function () { location.href = 'kafenet/index.html'; };
      row.appendChild(kb);
    }
  }
})();

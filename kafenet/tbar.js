/* نوار بالای صندوق برای صفحه‌ی کافی‌نت یار: تعداد پیام‌های خوانده‌نشده‌ی کاربر فعلی، صدای اعلان، جمع‌کردن */
(function () {
  if (window.__ktbar) return;
  window.__ktbar = true;
  var DB_KEY = 'trf2', ME_KEY = 'trf_me', COLL_KEY = 'kn_tbar';
  function readDb() { try { return JSON.parse(localStorage.getItem(DB_KEY) || 'null') || {}; } catch (e) { return {}; } }
  function me() { try { return JSON.parse(localStorage.getItem(ME_KEY) || 'null'); } catch (e) { return null; } }
  function unread() {
    var d = readDb(), m = me();
    if (!m || !d.msg) return 0;
    return d.msg.filter(function (x) {
      if (x.gone) return false;
      if ((x.hide || []).indexOf(m.id) >= 0) return false;
      if (x.from == m.id) return false;
      if (!(x.to == m.id || x.to == 'all')) return false;
      return (x.seenBy || []).indexOf(m.id) < 0;
    }).length;
  }
  var bar = document.createElement('div');
  bar.id = 'ktbar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;gap:6px;align-items:center;justify-content:space-between;padding:6px 10px;background:#1b3d7a;color:#fff;font-size:14px';
  document.body.appendChild(bar);
  var last = -1;
  function beep() {
    try {
      var C = new (window.AudioContext || window.webkitAudioContext)();
      var o = C.createOscillator(), g = C.createGain();
      o.connect(g); g.connect(C.destination); o.frequency.value = 880; g.gain.value = 0.2; o.start();
      setTimeout(function () { try { o.stop(); C.close(); } catch (e) {} }, 300);
    } catch (e) {}
  }
  function expanded() { return localStorage.getItem(COLL_KEY) !== '0'; }
  function render() {
    var k = unread(), ex = expanded();
    var badge = k ? '<b style="background:#e53935;border-radius:10px;padding:0 7px">' + k + '</b>' : '';
    bar.innerHTML = ex
      ? '<span data-act="open" style="cursor:pointer">📥 صندوق ' + badge + '</span>' +
        '<span style="display:flex;gap:10px"><span data-act="open" style="cursor:pointer">💬 چت</span><span data-act="toggle" style="cursor:pointer">⬆ جمع کن</span></span>'
      : '<span data-act="toggle" style="cursor:pointer;width:100%;text-align:right">⬇ 📥 صندوق ' + badge + '</span>';
    document.body.style.paddingTop = ex ? '42px' : '30px';
    if (last >= 0 && k > last) beep();
    last = k;
  }
  bar.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    if (el.getAttribute('data-act') == 'toggle') { localStorage.setItem(COLL_KEY, expanded() ? '0' : '1'); render(); }
    else { location.href = '../index.html#inbox'; }
  });
  render();
  setInterval(render, 3000);
  window.addEventListener('storage', render);
})();

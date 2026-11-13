/* ثبت‌نام یار: سایت‌های پرکاربرد با یک کلیک باز می‌شوند (مدیریت سایت‌ها در تنظیمات کافی‌نت یار است) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render() {
    var box = $('siteGrid'); if (!box) return;
    var list = window.knSites ? window.knSites() : [];
    if (!list.length) { box.innerHTML = '<div class="hint" style="grid-column:1/-1">هنوز سایتی ثبت نشده است. از «تنظیمات کافی‌نت یار» سایت اضافه کنید.</div>'; return; }
    box.innerHTML = list.map(function (x) {
      return '<div class="fcard site" data-url="' + esc(x.url) + '"><div class="ic" style="font-size:44px">' + esc(x.icon || '🌐') + '</div><small><b>' + esc(x.name) + '</b></small><small class="dim" style="direction:ltr">' + esc(x.url) + '</small></div>';
    }).join('');
    box.querySelectorAll('.site').forEach(function (el) {
      el.onclick = function () { window.knSiteOpen(el.getAttribute('data-url')); };
    });
  }
  window.sitesRefresh = render;
  var mg = $('siteManage'); if (mg) mg.onclick = function () { window.openDeskSettings(); };
  render();
})();

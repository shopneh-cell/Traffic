/* مرکز چاپ یکپارچه: window.print و Ctrl+P به پیش‌نمایش داخل برنامه (با انتخاب پرینتر و تنظیمات) می‌روند. */
(function () {
  'use strict';
  if (window.__trafficPrintCenter) return;
  window.__trafficPrintCenter = true;

  // بخش قابل چاپ: اگر بخش مشخصی وجود داشت همان، وگرنه کل صفحه (با استایل‌های @media print)
  function printable() {
    return document.querySelector('.iv-paper, [data-print-area], #printArea, .print-area, #pv, #preview') || document.body;
  }

  function allCss() {
    let css = '';
    for (const sheet of Array.from(document.styleSheets)) {
      try { for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + '\n'; } catch (e) { /* شیت خارجی */ }
    }
    for (const node of document.querySelectorAll('style')) css += node.textContent + '\n';
    return css.replace(/<\/style/gi, '<\\/style');
  }

  function openCenter(title) {
    const api = window.trafficYarAddons && window.trafficYarAddons.print;
    if (!api) { if (window.desk && window.desk.print) return window.desk.print(); return false; }
    const clone = printable().cloneNode(true);
    clone.querySelectorAll('script,style,button,nav,.no-print,[data-no-print],#md,.toast').forEach((n) => n.remove());
    const dir = document.documentElement.getAttribute('dir') || 'rtl';
    const html = '<!doctype html><html lang="fa" dir="' + dir + '"><head><meta charset="utf-8">' +
      '<style>' + allCss() + '\n@page{size:A4;margin:10mm}html,body{background:#fff!important;color:#000!important}</style>' +
      '</head><body>' + clone.outerHTML + '</body></html>';
    api.openPreview({ html, title: String(title || document.title || 'چاپ').slice(0, 160) })
      .catch((error) => alert('خطا در مرکز چاپ: ' + error.message));
    return true;
  }

  window.openPrintCenter = openCenter;
  window.openPrintPreview = openCenter;
  window.print = function () { openCenter(); };

  // Ctrl+P در همه‌ی پنجره‌ها (اصلی و کافی‌نت یار)
  document.addEventListener('keydown', function (e) {
    if (!window.__trafficMainKeys && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && String(e.key).toLowerCase() === 'p') {
      e.preventDefault();
      e.stopImmediatePropagation();
      openCenter();
    }
  }, true);
})();

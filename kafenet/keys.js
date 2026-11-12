/* میانبرهای کیبورد کافی‌نت یار */
(function () {
  'use strict';
  var TABS = ['forms', 'contracts', 'scan', 'layout', 'bg', 'invoice'];
  function $(id) { return document.getElementById(id); }
  function activeTab() { var b = document.querySelector('.tab.on'); return b ? b.dataset.tab : 'scan'; }
  function switchTab(t) { var b = document.querySelector('.tab[data-tab="' + t + '"]'); if (b) b.click(); }
  function click(id) { var el = $(id); if (el && !el.disabled) el.click(); }

  // ذخیره‌ی بخش فعال
  function applyTheme() {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('theme', t); } catch (e) {}
  }
  try { document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light'); } catch (e) {}

  var SAVE = { scan: 'bPdf', layout: 'lPdf', invoice: 'ivSave', contracts: null, forms: null };
  // جستجوی بخش فعال
  var FIND = { forms: 'fSearch', contracts: 'cSearch', layout: 'lSearch', invoice: 'ivSearch' };

  document.addEventListener('keydown', function (e) {
    var ctrl = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase();
    if (e.key === 'F1') { e.preventDefault(); alert(HELP); return; }
    if (!ctrl) return;
    if (/^[1-6]$/.test(e.key)) { e.preventDefault(); switchTab(TABS[+e.key - 1]); return; }
    var tab = activeTab();
    if (k === 'o') { e.preventDefault(); click(tab === 'layout' ? 'lAdd' : tab === 'forms' ? 'fAddFile' : tab === 'contracts' ? 'cNewPs' : tab === 'invoice' ? 'ivNew' : 'bAdd'); }
    else if (k === 's') {
      e.preventDefault();
      if (tab === 'contracts') { var btn = document.querySelector('#cView [data-a="save"]'); if (btn) btn.click(); }
      else if (tab === 'forms') { var fb = document.querySelector('#fView [data-a="save"]'); if (fb) fb.click(); }
      else if (SAVE[tab]) click(SAVE[tab]);
    }
    else if (k === 'p') {
      e.preventDefault();
      if (tab === 'invoice') click('ivPrint');
      else if (tab === 'contracts') { var pb = document.querySelector('#cView [data-a="print"]'); if (pb) pb.click(); }
      else if (tab === 'forms') { var fp = document.querySelector('#fView [data-a="print"]'); if (fp) fp.click(); }
    }
    else if (k === 'f') {
      if (FIND[tab]) { e.preventDefault(); var el = $(FIND[tab]); if (el) { el.focus(); el.select && el.select(); } }
    }
    else if (k === 't') { e.preventDefault(); applyTheme(); }
    else if (k === 'z') { var u = { scan: 'sUndo', layout: 'lUndo', bg: 'bgUndo', invoice: 'ivUndo' }[tab]; if (u) { e.preventDefault(); click(u); } }
    else if (k === 'n' && tab === 'invoice') { e.preventDefault(); click('ivNew'); }
    else if (k === 'n' && tab === 'contracts') { e.preventDefault(); click('cNewPs'); }
  });

  var HELP = 'میانبرهای کافی‌نت یار:\n' +
    'Ctrl+1 … Ctrl+5 : تب‌ها (فرم‌ها، قراردادها، سفیدکننده، عکس‌چین، فاکتور ساز)\n' +
    'Ctrl+O : افزودن / قرارداد یا فاکتور جدید\n' +
    'Ctrl+S : ذخیره\n' +
    'Ctrl+P : پرینت\n' +
    'Ctrl+F : جستجو در بخش فعال\n' +
    'Ctrl+N : فاکتور یا قرارداد جدید\n' +
    'Ctrl+T : حالت روشن / تیره\n' +
    'F1 : نمایش این راهنما';
})();

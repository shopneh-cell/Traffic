#!/usr/bin/env node
/* ===================================================================
   اعمال تنظیمات اتصال به سرور ترافیک (http داخل شبکه) در پروژه‌ی Capacitor اندروید

   روش اجرا (از ریشه‌ی پروژه، جایی که capacitor.config.json است):
       node fix-android-cleartext.js
   با کپی کردن فایل‌های جدید www هم (پوشه‌ای که محتوای android-github-upload.zip در آن است):
       node fix-android-cleartext.js --www "مسیر\\new-www"
   سپس:
       npx cap sync android
       و APK را از Android Studio بسازید.

   این اسکریپت دو کار می‌کند:
   1) capacitor.config.json: android.allowMixedContent = true و server.cleartext = true
   2) android/app/src/main/AndroidManifest.xml:
        android:usesCleartextTraffic="true" داخل تگ <application>
   از هر فایل قبل از تغییر، نسخه‌ی پشتیبان .bak ساخته می‌شود.
   اگر تنظیمات از قبل وجود داشته باشد، دوباره تغییری داده نمی‌شود.
   =================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cfgPath = path.join(root, 'capacitor.config.json');
const tsPath = path.join(root, 'capacitor.config.ts');
const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

let allOk = true;

// ---------- ۰) کپی فایل‌های جدید www (اختیاری) ----------
function copyDir(src, dst) {
  let n = 0;
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name), d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      n += copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
}
const wwwArg = process.argv.indexOf('--www');
if (wwwArg !== -1) {
  const src = process.argv[wwwArg + 1] ? path.resolve(process.argv[wwwArg + 1]) : '';
  let webDir = 'www';
  try { webDir = JSON.parse(fs.readFileSync(cfgPath, 'utf8')).webDir || 'www'; } catch (e) {}
  const dst = path.join(root, webDir);
  if (!src || !fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
    console.log('✗ پوشه‌ی --www پیدا نشد: ' + src);
    allOk = false;
  } else {
    fs.mkdirSync(dst, { recursive: true });
    const n = copyDir(src, dst);
    console.log('✓ ' + n + ' فایل از www جدید داخل پوشه‌ی ' + webDir + ' کپی شد');
  }
}

function backup(p) {
  if (!fs.existsSync(p + '.bak')) fs.copyFileSync(p, p + '.bak');
}

// ---------- ۱) capacitor.config.json ----------
if (!fs.existsSync(cfgPath)) {
  if (fs.existsSync(tsPath)) {
    console.log('✗ پروژه از capacitor.config.ts استفاده می‌کند. این اسکریپت فقط فایل JSON را می‌خواند.');
    console.log('  در آن فایل این دو مورد را اضافه کنید:');
    console.log('    android: { allowMixedContent: true }');
    console.log('    server: { cleartext: true }');
  } else {
    console.log('✗ capacitor.config.json پیدا نشد. اسکریپت را از ریشه‌ی پروژه اجرا کنید.');
  }
  allOk = false;
} else {
  let cfg = null;
  try {
    cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  } catch (e) {
    console.log('✗ خواندن capacitor.config.json ناموفق بود: ' + e.message);
    allOk = false;
  }
  if (cfg) {
    const before = JSON.stringify(cfg);
    cfg.android = cfg.android || {};
    cfg.android.allowMixedContent = true;
    cfg.server = cfg.server || {};
    cfg.server.cleartext = true;
    if (JSON.stringify(cfg) !== before) {
      backup(cfgPath);
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
      console.log('✓ capacitor.config.json: allowMixedContent و cleartext فعال شد');
    } else {
      console.log('• capacitor.config.json از قبل درست بود');
    }
  }
}

// ---------- ۲) AndroidManifest.xml ----------
if (!fs.existsSync(manifestPath)) {
  console.log('✗ android/app/src/main/AndroidManifest.xml پیدا نشد.');
  console.log('  مطمئن شوید پوشه‌ی android در پروژه وجود دارد (npx cap add android).');
  allOk = false;
} else {
  let xml = fs.readFileSync(manifestPath, 'utf8');
  const m = xml.match(/<application\b[^>]*>/);
  if (!m) {
    console.log('✗ تگ <application> در مانیفست پیدا نشد.');
    allOk = false;
  } else {
    const tag = m[0];
    // همه‌ی نمونه‌های قبلی (مثلاً false یا تکراری) را پاک کن، بعد یک بار "true" اضافه کن
    const cleaned = tag.replace(/\s*android:usesCleartextTraffic\s*=\s*"[^"]*"/g, '');
    const newTag = cleaned.replace('<application', '<application\n        android:usesCleartextTraffic="true"');
    if (newTag !== tag) {
      backup(manifestPath);
      xml = xml.replace(tag, newTag);
      fs.writeFileSync(manifestPath, xml, 'utf8');
      console.log('✓ AndroidManifest.xml: android:usesCleartextTraffic="true" اضافه شد');
    } else {
      console.log('• مانیفست از قبل درست بود');
    }
  }
}

console.log('');
if (allOk) {
  console.log('تمام. حالا این دستورها را اجرا کنید:');
  console.log('    npx cap sync android');
  console.log('و APK را از Android Studio بسازید.');
  console.log('نکته: اگر پروژه در گیت‌هاب است، این دو فایل را هم کامیت کنید: capacitor.config.json و AndroidManifest.xml');
} else {
  console.log('برخی مراحل انجام نشد. پیام‌های بالا را بخوانید.');
  process.exitCode = 1;
}

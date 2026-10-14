/* سرویس‌ورکر «استاد برق خودرو»
   - فایل‌های خود اپ: اول اینترنت، اگر نبود یا کند بود (بیش از ۳.۵ ثانیه) نسخه‌ی کش‌شده → آپدیت‌ها خودکار می‌رسند.
   - کتابخانه‌ها و فونت از jsDelivr: اول کش، بعد اینترنت.
   - هر چیز دیگر (مثلاً دانلود مدل هوش مصنوعی و API ها) دست‌نخورده رد می‌شود.
   - اگر فایل‌های اپ را عوض کردی و لیست CORE تغییر کرد، عدد CACHE را بالا ببر. */
const CACHE = 'aem-v28';
const CORE = [
  './', './index.html', './workshop.html', './voice.html',
  './style.css', './script.js', './manifest.json',
  './icon-192.png', './icon-512.png'
];
const CDN_PRECACHE = [
  'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'
];
const CDN_HOSTS = ['cdn.jsdelivr.net', 'esm.run'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map(u => c.add(u).catch(() => {})));
    await Promise.all(CDN_PRECACHE.map(u =>
      fetch(u, {mode: 'cors', credentials: 'omit'}).then(r => { if (r.ok) return c.put(u, r); }).catch(() => {})));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    /* فقط کش‌های خود اپ؛ کش مدل هوش مصنوعی (webllm) دست نمی‌خورد */
    await Promise.all(keys.filter(k => k.startsWith('aem-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(e, req) {
  const cache = await caches.open(CACHE);
  const net = fetch(req).then(res => {
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  const hit = await cache.match(req, {ignoreSearch: true});
  if (!hit) {
    try { return await net; }
    catch (_) {
      if (req.mode === 'navigate') { const idx = await cache.match('./index.html'); if (idx) return idx; }
      return new Response('آفلاین هستی و این فایل هنوز ذخیره نشده.', {status: 504, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
    }
  }
  const res = await Promise.race([
    net.catch(() => null),
    new Promise(r => setTimeout(() => r(null), 3500))
  ]);
  return (res && res.status < 500) ? res : hit;
}

async function cacheFirst(e, req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req.url);
  if (hit) return hit;
  try {
    let res;
    try { res = await fetch(req.url, {mode: 'cors', credentials: 'omit'}); }
    catch (_) { res = await fetch(req); }
    if (res && (res.ok || res.type === 'opaque')) e.waitUntil(cache.put(req.url, res.clone()));
    return res;
  } catch (err) {
    return Response.error();
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  if (url.origin === self.location.origin) e.respondWith(networkFirst(e, req));
  else if (CDN_HOSTS.includes(url.hostname)) e.respondWith(cacheFirst(e, req));
});

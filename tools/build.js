// Builds:
//  1) dist/game.html  - single double-clickable file (CSS + JS inlined, no manifest / service worker)
//  2) site/           - deployable static PWA: index.html (inlined game) + manifest.json + sw.js + icons
// Usage: node tools/build.js   (icons come from assets/icons, regenerate with: node tools/icons.js)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => '<style>\n' + fs.readFileSync(path.join(root, href), 'utf8') + '\n</style>');
html = html.replace(/<!-- BUILD:SCRIPTS -->([\s\S]*?)<!-- \/BUILD:SCRIPTS -->/, (m, block) => {
  const srcs = [...block.matchAll(/src="([^"]+)"/g)].map(x => x[1]);
  return '<script>\n' + srcs.map(s => '// ---- ' + s + ' ----\n' + fs.readFileSync(path.join(root, s), 'utf8').replace(/<\/script/gi, '<\\/script')).join('\n') + '\n</script>';
});

// ---- 1) dist/game.html (manifest-less) ----
const single = html.replace('<!-- PWA:HEAD -->\n', '').replace('<!-- PWA:HEAD -->', '');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'game.html'), single);
console.log('Built dist/game.html', (single.length / 1024).toFixed(1) + ' KB');

// ---- 2) site/ (PWA) ----
const site = path.join(root, 'site'); const iconSrc = path.join(root, 'assets', 'icons');
fs.mkdirSync(path.join(site, 'icons'), { recursive: true });
const icons = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-32.png'];
for (const f of icons) fs.copyFileSync(path.join(iconSrc, f), path.join(site, 'icons', f));
const head = [
  '<link rel="manifest" href="manifest.json">',
  '<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">',
  '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">',
  '<link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png">',
].join('\n');
const swReg = '<script>if (\'serviceWorker\' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener(\'load\', function () { navigator.serviceWorker.register(\'sw.js\').catch(function () {}); });</script>\n</body>';
const page = html.replace('<!-- PWA:HEAD -->', head).replace('</body>', swReg);
fs.writeFileSync(path.join(site, 'index.html'), page);
const manifest = {
  name: 'Beyond Survivors', short_name: 'Beyond Survivors', description: 'A medieval-synthwave horde survival game. The house always wins.',
  start_url: './', scope: './', display: 'fullscreen', display_override: ['fullscreen', 'standalone'], orientation: 'landscape',
  background_color: '#000000', theme_color: '#12081a', categories: ['games'],
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(site, 'manifest.json'), JSON.stringify(manifest, null, 2));
const files = ['./', 'index.html', 'manifest.json'].concat(icons.map(f => 'icons/' + f));
const ver = crypto.createHash('sha1').update(page).update(JSON.stringify(manifest)).digest('hex').slice(0, 10);
const sw = `// Beyond Survivors service worker - offline play (cache-first app shell). Version is a content hash.
const CACHE = 'beyond-survivors-${ver}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
    if (res && res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
`;
fs.writeFileSync(path.join(site, 'sw.js'), sw);
fs.writeFileSync(path.join(site, '_headers'), '/sw.js\n  Cache-Control: no-cache\n');
console.log('Built site/ (index.html ' + (page.length / 1024).toFixed(1) + ' KB, manifest.json, sw.js v' + ver + ', ' + icons.length + ' icons)');

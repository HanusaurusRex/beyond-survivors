// Generates pixel-art PWA icons from the game's own sprites (headless Chrome). Usage: node tools/icons.js
// Output: assets/icons/icon-192.png, icon-512.png, apple-touch-icon.png (180), favicon-32.png
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); const out = path.join(root, 'assets', 'icons');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction(() => window.DS && DS.Spr && DS.Spr.chars && DS.Spr.chars.brandon);
  const urls = await page.evaluate(() => {
    // draw a 64x64 pixel-art master, then nearest-neighbour upscale to each size
    const N = 64; const m = document.createElement('canvas'); m.width = m.height = N; const x = m.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#12081a'; x.fillRect(0, 0, N, N);
    for (let r = 30; r > 0; r -= 2) { x.fillStyle = 'rgba(160,40,90,' + (0.05 + (30 - r) * 0.004) + ')'; x.beginPath(); x.arc(32, 26, r, 0, 7); x.fill(); }
    x.fillStyle = '#4a1020'; x.fillRect(0, 50, N, 14); x.fillStyle = '#2a0a18'; for (let i = 0; i < N; i += 6) x.fillRect(i, 48 + (i % 12 ? 0 : -3), 4, 4);
    x.fillStyle = '#f0e0b0'; x.beginPath(); x.arc(48, 13, 6, 0, 7); x.fill(); x.fillStyle = '#12081a'; x.beginPath(); x.arc(51, 11, 5, 0, 7); x.fill(); // moon
    const ch = DS.CHAR_BY_ID.brandon; const spr = DS.Spr.fromRows(ch.rows.concat(ch.legsA), ch.pal, 1, true); const sc = Math.max(1, Math.floor(46 / Math.max(spr.width, spr.height)));
    x.drawImage(spr, Math.round(32 - spr.width * sc / 2), Math.round(59 - spr.height * sc), spr.width * sc, spr.height * sc);
    x.fillStyle = '#e8c060'; [[3, 3], [N - 5, 3], [3, N - 5], [N - 5, N - 5]].forEach(([a, b]) => x.fillRect(a, b, 2, 2));
    // pixel quantise (keeps the art crisp)
    const d = x.getImageData(0, 0, N, N); for (let i = 0; i < d.data.length; i += 4) d.data[i + 3] = 255; x.putImageData(d, 0, 0);
    const res = {};
    for (const [name, size] of [['icon-512', 512], ['icon-192', 192], ['apple-touch-icon', 180], ['favicon-32', 32]]) {
      const c = document.createElement('canvas'); c.width = c.height = size; const y = c.getContext('2d'); y.imageSmoothingEnabled = false;
      y.drawImage(m, 0, 0, size, size); res[name] = c.toDataURL('image/png');
    }
    return res;
  });
  for (const k in urls) fs.writeFileSync(path.join(out, k + '.png'), Buffer.from(urls[k].split(',')[1], 'base64'));
  console.log('icons ->', fs.readdirSync(out).join(', '));
  await browser.close();
})();

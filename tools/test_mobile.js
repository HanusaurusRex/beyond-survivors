// Mobile verification: Playwright device emulation (iPhone 14 / Pixel 7, hasTouch) in portrait + landscape.
// Serves site/ over http (PWA + service worker), taps through every menu, drives the virtual joystick with real
// touch events (CDP), fires the special via its button, levels up and taps a card, opens gear, pauses, quits.
// Usage: node tools/test_mobile.js   -> screenshots/mobile_*.png ; exits 1 on console errors / failed checks.
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); const shots = path.join(root, 'screenshots');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, 'site', p); if (!f.startsWith(path.join(root, 'site')) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(f).pipe(res);
});
const CONFIGS = [
  ['iphone14', 'portrait', devices['iPhone 14']], ['iphone14', 'standalone', { ...devices['iPhone 14'], viewport: { width: 390, height: 844 } }], ['iphone14', 'landscape', devices['iPhone 14 landscape']],
  ['pixel7', 'portrait', devices['Pixel 7']], ['pixel7', 'landscape', devices['Pixel 7 landscape']],
];
const fails = []; const errors = [];
const check = (cond, msg) => { if (!cond) { fails.push(msg); console.log('  FAIL', msg); } };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'] });
  for (const [dev, orient, d] of CONFIGS) {
    const tag = dev + '_' + orient; console.log('== ' + tag + ' ' + d.viewport.width + 'x' + d.viewport.height + ' dpr' + d.deviceScaleFactor);
    const { defaultBrowserType, ...desc } = d;
    const ctx = await browser.newContext({ ...desc });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(tag + ': ' + m.text()); });
    page.on('pageerror', e => errors.push(tag + ': ' + e.message));
    await page.goto(base); await page.waitForFunction(() => window.DS && DS.UI && DS.UI.screen === 'menu');
    await page.waitForTimeout(300);
    const lay = await page.evaluate(() => ({ touch: DS.touchMode, low: DS.lowFx, VW: DS.VW, VH: DS.VH, s: DS.UI_SCALE, zoom: DS.ZOOM, cls: document.body.className, cw: document.getElementById('game').width, ch: document.getElementById('game').height }));
    console.log('  layout', JSON.stringify(lay));
    check(lay.touch && lay.low, tag + ' touch+lowFx auto');
    const S = lay.s; const tapL = (x, y) => page.touchscreen.tap(x * S, y * S);
    const overflow = () => page.evaluate(() => { const u = document.getElementById('ui'); const o = document.getElementById('overlay'); const r = (e) => e && e.offsetParent !== null && e.scrollWidth > e.clientWidth + 2; return { ui: r(u), ov: o.style.display === 'flex' && [...o.querySelectorAll('.modal')].some(m => m.scrollWidth > m.clientWidth + 2) }; });
    const minBtn = () => page.evaluate(() => { let m = 1e9, w = ''; document.querySelectorAll('#ui button, #overlay button').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(b).visibility !== 'hidden') { if (r.height < m) { m = r.height; w = b.textContent.trim().slice(0, 20); } } }); return { min: Math.round(m), w }; });
    const shot = (n) => page.screenshot({ path: path.join(shots, 'mobile_' + tag + '_' + n + '.png') });
    const screenCheck = async (n) => { const o = await overflow(); const b = await minBtn(); check(!o.ui && !o.ov, tag + ' ' + n + ' horizontal overflow ' + JSON.stringify(o)); console.log('  ' + n + ' minBtn ' + b.min + 'px (' + b.w + ')'); };
    await shot('menu'); await screenCheck('menu');
    // give some gold + gear so menus have content
    await page.evaluate(() => { DS.save.gold += 20000; DS.CHARACTERS.forEach(c => { for (let i = 0; i < 3; i++) { const it = DS.makeSetItem(c.id, i); it.uid = DS.save.nextUid++; DS.save.chars[c.id].inv.push(it); } }); for (let i = 0; i < 3; i++) { const it = DS.genItem(Math.random, 'epic'); it.uid = DS.save.nextUid++; DS.save.chars.brandon.inv.push(it); } DS.persist(); DS.UI.menu(); });
    // character upgrade -> gear, tap tooltip
    await page.tap('#ui button[data-a=upgrade]'); await page.waitForTimeout(150);
    check(await page.evaluate(() => DS.UI.screen === 'upgrade' && !!document.querySelector('.gear')), tag + ' gear screen');
    await shot('gear'); await screenCheck('gear');
    await page.tap('.bagitem .info'); await page.waitForTimeout(100);
    check(await page.evaluate(() => getComputedStyle(document.getElementById('tip')).display === 'block'), tag + ' tap tooltip');
    await shot('gear_tip');
    await page.tap('.bagitem button[data-a=equip]'); await page.waitForTimeout(100);
    const eq = await page.evaluate(() => DS.equippedItems('brandon').length); check(eq >= 1, tag + ' equip by tap');
    await page.tap('.pslot.filled'); await page.waitForTimeout(100); // tap slot -> tooltip on touch
    check(await page.evaluate(() => getComputedStyle(document.getElementById('tip')).display === 'block'), tag + ' slot tooltip');
    await page.tap('.pslot.filled .xbtn'); await page.waitForTimeout(100);
    check(await page.evaluate((n) => DS.equippedItems('brandon').length === n - 1, eq), tag + ' unequip by ✕');
    await page.tap('button[data-a=up-sub][data-id=talents]'); await page.waitForTimeout(100); await shot('talents'); await screenCheck('talents');
    await page.evaluate(() => { DS.save.chars.brandon.bonusPts += 2; DS.UI.upgrade(); }); await page.tap('button[data-a=talent]:not([disabled])'); await page.waitForTimeout(80);
    // marketplace + buy flow
    await page.tap('#ui button[data-a=market]'); await page.waitForTimeout(150); await shot('market'); await screenCheck('market');
    await page.tap('button[data-a=buy]:not([disabled])'); await page.waitForTimeout(100); await shot('market_pick');
    await page.tap('button[data-a=buy-for]:not([disabled])'); await page.waitForTimeout(100);
    check(await page.evaluate(() => /Bought|Equipped/.test(document.getElementById('overlay').textContent)), tag + ' bought modal');
    await shot('market_bought'); await screenCheck('market_bought');
    await page.tap('button[data-a=close-overlay]');
    // options
    await page.tap('#ui button[data-a=menu]'); await page.waitForTimeout(100); await page.tap('button[data-a=options]'); await page.waitForTimeout(100);
    const opt = await page.evaluate(() => ({ kb: !!document.querySelector('button[data-a=rebind]'), joy: !!document.querySelector('[data-opt=joySize]'), lefty: !!document.querySelector('[data-id=leftHanded]'), fx: !!document.querySelector('[data-a=toggle-fx]') }));
    check(!opt.kb && opt.joy && opt.lefty && opt.fx, tag + ' options touch section ' + JSON.stringify(opt));
    await shot('options'); await screenCheck('options');
    await page.tap('button[data-a=opt-back]'); await page.waitForTimeout(100);
    // char select -> begin
    await page.tap('button[data-a=start]'); await page.waitForTimeout(150); await shot('charselect'); await screenCheck('charselect');
    await page.tap('.card.char[data-id=ryan]'); await page.waitForTimeout(80);
    await page.tap('.card.char[data-id=brandon]'); await page.waitForTimeout(80);
    await page.tap('button[data-a=begin]'); await page.waitForTimeout(600);
    check(await page.evaluate(() => DS.state === 'run'), tag + ' run started');
    await page.evaluate(() => { DS.game.god = true; });
    // joystick via raw touch events (CDP) - drag on the movement side
    const cdp = await ctx.newCDPSession(page);
    const sx = (orient === 'portrait' ? lay.VW * 0.5 : lay.VW * 0.22) * S, sy = lay.VH * 0.7 * S;
    const p0 = await page.evaluate(() => ({ x: DS.game.player.x, y: DS.game.player.y }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] });
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + i * 14 * S, y: sy - i * 4 * S, id: 1 }] }); await page.waitForTimeout(30); }
    await page.waitForTimeout(700);
    const joy = await page.evaluate(() => ({ active: DS.Input.joyActive, jx: +DS.Input.joy.x.toFixed(2), jy: +DS.Input.joy.y.toFixed(2) }));
    await shot('joystick');
    const p1 = await page.evaluate(() => ({ x: DS.game.player.x, y: DS.game.player.y }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => DS.Input.joyActive);
    console.log('  joystick', JSON.stringify(joy), 'moved dx', Math.round(p1.x - p0.x), 'dy', Math.round(p1.y - p0.y), 'released', !after);
    check(joy.active && p1.x - p0.x > 60 && !after, tag + ' joystick moves player');
    // second finger: special button while joystick held (multitouch)
    await page.evaluate(() => { DS.game.player.specialT = 0; DS.game.spawnBoss('minotaur', {}); });
    await page.waitForTimeout(400);
    const sp = await page.evaluate(() => DS.touchUI.sp);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx - 40 * S, y: sy, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx - 40 * S, y: sy, id: 1 }, { x: sp.x * S, y: sp.y * S, id: 2 }] });
    await page.waitForTimeout(120);
    const spec = await page.evaluate(() => { const g = DS.game; const a = g.specialAim(); const b = g.enemies.find(e => e.boss && !e.dead); return { cd: g.player.specialT > 0, aimAtBoss: b ? Math.hypot(a.x - b.x, a.y - b.y) < 1 : null, joy: DS.Input.joyActive }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(250); await shot('special');
    console.log('  special', JSON.stringify(spec)); check(spec.cd && spec.joy, tag + ' special button (multitouch)');
    check(spec.aimAtBoss !== false, tag + ' special auto-aims at boss');
    await page.evaluate(() => DS.game.enemies.forEach(e => { if (e.boss) { e.dead = true; } }));
    await page.evaluate(() => { DS.game.time = 95; }); await page.waitForTimeout(1200); await shot('gameplay');
    // pause button
    const pb = await page.evaluate(() => DS.touchUI.pause); await tapL(pb.x, pb.y); await page.waitForTimeout(150);
    check(await page.evaluate(() => DS.game.paused && /Paused/.test(document.getElementById('overlay').textContent)), tag + ' pause button');
    await shot('pause'); await screenCheck('pause');
    await page.tap('button[data-a=resume]'); await page.waitForTimeout(100);
    check(await page.evaluate(() => !DS.game.paused), tag + ' resume');
    // level-up and tap a card
    await page.evaluate(() => { const g = DS.game; g.gainXp(g.xpNeed() - g.xp + 0.01); }); await page.waitForTimeout(250);
    check(await page.evaluate(() => !!DS.game.modal && document.querySelectorAll('.lu-card').length > 0), tag + ' level-up modal');
    await shot('levelup'); await screenCheck('levelup');
    const lv = await page.evaluate(() => DS.game.prim.length + DS.game.sec.length);
    await page.tap('.lu-card:not(.taken)'); await page.waitForTimeout(250);
    const lu = await page.evaluate(() => ({ modal: !!DS.game.modal, n: DS.game.prim.length + DS.game.sec.length }));
    if (lu.modal) { await page.tap('.lu-card:not(.taken)'); await page.waitForTimeout(250); }
    check(await page.evaluate(() => !DS.game.modal), tag + ' level-up card tapped');
    // results
    await tapL(pb.x, pb.y); await page.waitForTimeout(100); await page.tap('button[data-a=quit-run]'); await page.waitForTimeout(300);
    check(await page.evaluate(() => DS.state === 'results'), tag + ' results');
    await shot('results'); await screenCheck('results');
    // codex modal (scrollable)
    await page.tap('#ui button[data-a=upgrade]'); await page.waitForTimeout(100); await page.tap('button[data-a=codex]'); await page.waitForTimeout(100);
    await shot('codex'); await screenCheck('codex');
    await page.tap('button[data-a=close-overlay]');
    // fps sample during a busy run
    await page.evaluate(() => { DS.startRun('tyler', 0); DS.game.god = true; DS.game.time = 300; }); await page.waitForTimeout(2500);
    console.log('  fps (headless, software) ', await page.evaluate(() => DS.fps), 'parts', await page.evaluate(() => DS.game.parts.length));
    // PWA: service worker + offline reload (once)
    if (tag === 'pixel7_landscape') {
      const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
      const man = await page.evaluate(async () => (await (await fetch('manifest.json')).json()).name);
      await ctx.setOffline(true); await page.reload(); await page.waitForFunction(() => window.DS && DS.UI && DS.UI.screen === 'menu', null, { timeout: 8000 });
      console.log('  PWA sw active', sw, 'manifest', man, 'offline reload OK'); check(sw && man === 'Beyond Survivors', 'PWA');
      await ctx.setOffline(false);
    }
    await ctx.close();
  }
  // left-handed + rotation on the fly + dist/game.html (file://, no manifest) on iPhone
  {
    const { defaultBrowserType, ...desc } = devices['iPhone 14 landscape'];
    const ctx = await browser.newContext({ ...desc }); const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push('dist: ' + m.text()); }); page.on('pageerror', e => errors.push('dist: ' + e.message));
    await page.goto('file://' + path.join(root, 'dist', 'game.html')); await page.waitForFunction(() => window.DS && DS.UI && DS.UI.screen === 'menu');
    const noMan = await page.evaluate(() => !document.querySelector('link[rel=manifest]')); check(noMan, 'dist has no manifest');
    await page.evaluate(() => { DS.save.options.leftHanded = true; DS.persist(); DS.relayout(); DS.startRun('ron', 0); DS.game.god = true; DS.game.time = 40; });
    await page.waitForTimeout(800);
    const L = await page.evaluate(() => DS.touchUI); check(L.left && L.sp.x < 300, 'left-handed special on the left');
    await page.screenshot({ path: path.join(shots, 'mobile_iphone14_landscape_lefthanded.png') });
    await page.setViewportSize({ width: 390, height: 664 }); await page.waitForTimeout(500); // rotate mid-run
    const r = await page.evaluate(() => ({ VW: DS.VW, VH: DS.VH, cls: document.body.className })); console.log('rotated mid-run', JSON.stringify(r)); check(r.VH > r.VW, 'rotate');
    await page.screenshot({ path: path.join(shots, 'mobile_iphone14_rotated_midrun.png') });
    await ctx.close();
  }
  // tablet sanity (iPad)
  {
    const { defaultBrowserType, ...desc } = devices['iPad (gen 7) landscape'] || devices['iPad Pro 11 landscape'];
    const ctx = await browser.newContext({ ...desc }); const page = await ctx.newPage(); page.on('pageerror', e => errors.push('ipad: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push('ipad: ' + m.text()); });
    await page.goto(base); await page.waitForFunction(() => window.DS && DS.UI && DS.UI.screen === 'menu');
    await page.evaluate(() => { DS.save.gold += 5000; const it = DS.makeSetItem('brandon', 0); it.uid = DS.save.nextUid++; DS.save.chars.brandon.inv.push(it); DS.UI.upgrade('brandon', 'gear'); });
    await page.waitForTimeout(200); await page.screenshot({ path: path.join(shots, 'mobile_ipad_landscape_gear.png') });
    await page.evaluate(() => { DS.startRun('kirby', 0); DS.game.god = true; DS.game.time = 60; }); await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(shots, 'mobile_ipad_landscape_gameplay.png') });
    console.log('ipad layout', JSON.stringify(await page.evaluate(() => ({ VW: DS.VW, VH: DS.VH, zoom: DS.ZOOM, cls: document.body.className }))));
    await ctx.close();
  }
  await browser.close(); server.close();
  if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
  if (fails.length) console.log('FAILED CHECKS:\n' + fails.join('\n'));
  if (errors.length || fails.length) process.exit(1);
  console.log('ALL MOBILE CHECKS PASSED, NO CONSOLE ERRORS');
})().catch(e => { console.error(e); process.exit(1); });

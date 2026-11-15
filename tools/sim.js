// Balance sim: runs the engine headless at accelerated speed with a dumb kiting bot.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message + e.stack));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'game.html')); await page.waitForTimeout(500);
  const cids = (process.argv[2] || 'brandon,ryan,tyler,kirby,ron').split(',');
  const map = +(process.argv[3] || 0), maxT = +(process.argv[4] || 900); const xpg = +(process.env.XPG || 0); const trials = +(process.env.TRIALS || 1);
  for (const cid0 of cids) for (let tr = 0; tr < trials; tr++) { const cid = cid0;
    const r = await page.evaluate(([cid, map, maxT, xpg]) => {
      if (xpg) DS.XP_GAIN = xpg; DS.startRun(cid, map); DS.state = 'sim'; const g = DS.game; DS.UI.showLevelUp = () => {}; DS.UI.hideLevelUp = () => {}; DS.UI.showResults = () => {};
      let ang = 0; const keys = new Set(); const src = {}; const orig = g.damagePlayer.bind(g); g.damagePlayer = (a, e) => { const h0 = g.player.hp; orig(a, e); const k = !e ? 'bullet/hazard' : e.boss ? 'boss' : e.elite ? 'elite' : 'mob'; src[k] = Math.round((src[k] || 0) + (h0 - g.player.hp)); };
      const input = { down: (c) => keys.has(c), pressed: () => false, mouseR: false };
      const log = []; let lastMin = -1; let lastDmg = 0;
      while (!g.over && g.time < maxT) {
        // bot: repel from nearby enemies/bullets, attract to nearest gem
        keys.clear(); const P = g.player; let fx = 0, fy = 0;
        for (const e of g.enemies) { const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1; const R = e.boss ? 260 : e.elite ? 200 : 110; if (d < R) { const w = (R - d) / R * (e.boss || e.elite ? 3 : 1); fx += dx / d * w; fy += dy / d * w; } }
        for (const b of g.eproj) { const dx = P.x - b.x, dy = P.y - b.y, d = Math.hypot(dx, dy) || 1; if (d < 90) { fx += dx / d * 2; fy += dy / d * 2; } }
        for (const w of g.walls) { const dx = P.x - w.x, dy = P.y - w.y, d = Math.hypot(dx, dy) || 1; if (d < 60) { fx += dx / d * 3; fy += dy / d * 3; } }
        for (const tl of g.tele) if (tl.type === 'line' || tl.type === 'cone') { const ca = Math.cos(tl.ang), sa = Math.sin(tl.ang); const rx = P.x - tl.x, ry = P.y - tl.y; const along = rx * ca + ry * sa, perp = -rx * sa + ry * ca; const half = tl.type === 'line' ? tl.w / 2 + 30 : Math.max(40, along * Math.tan(tl.spread) + 30); if (along > -30 && along < (tl.len || 400) && Math.abs(perp) < half) { const sgn = perp >= 0 ? 1 : -1; fx += -sa * sgn * 5; fy += ca * sgn * 5; } }
        for (const tl of g.tele) if (tl.type === 'circle') { const dx = P.x - tl.x, dy = P.y - tl.y, d = Math.hypot(dx, dy) || 1; if (d < tl.r + 30) { fx += dx / d * 4; fy += dy / d * 4; } }
        for (const h of g.hazards.concat(g.ezones)) { const dx = P.x - h.x, dy = P.y - h.y, d = Math.hypot(dx, dy) || 1; if (d < h.r + 30) { fx += dx / d * 4; fy += dy / d * 4; } }
        let best = null, bd = 1e12; for (const k of g.pickups) { const d = (k.x - P.x) ** 2 + (k.y - P.y) ** 2; if (d < bd) { bd = d; best = k; } }
        if (best) { const d = Math.sqrt(bd) || 1; fx += (best.x - P.x) / d * 0.6; fy += (best.y - P.y) / d * 0.6; } else { ang += 0.01; fx += Math.cos(ang) * 0.3; fy += Math.sin(ang) * 0.3; }
        const fl = Math.hypot(fx, fy); if (fl > 0.15) { const vx = fx / fl, vy = fy / fl; if (vx > 0.38) keys.add('KeyD'); if (vx < -0.38) keys.add('KeyA'); if (vy > 0.38) keys.add('KeyS'); if (vy < -0.38) keys.add('KeyW'); }
        const t = g.nearestEnemy(g.player.x, g.player.y, 600); if (t) { g.mouse.x = 640 + (t.x - g.player.x); g.mouse.y = 360 + (t.y - g.player.y); }
        if (g.player.specialT <= 0) input.mouseR = true;
        g.update(1 / 30, input);
        if (g.modal) { const offs = g.modal.offers; while (g.modal) { let i = offs.findIndex(o => !o.taken && o.kind === 'super'); if (i < 0) i = offs.findIndex(o => !o.taken && o.kind === 'evo'); g.choose(i >= 0 ? i : offs.findIndex(o => !o.taken)); } }
        const m = Math.floor(g.time / 60); if (m !== lastMin) { lastMin = m; if (m === 5) g.lv5 = g.level; if (m === 10) g.lv10 = g.level; log.push(m + 'm dps' + Math.round((g.dmgDealt - lastDmg) / 60) + ' L' + g.level + ' hp' + Math.round(g.player.hp) + '/' + Math.round(g.player.maxHp) + ' k' + g.kills + ' e' + g.enemies.length + ' b' + g.bossKills); lastDmg = g.dmgDealt; }
      }
      if (!g.over) g.over = true;
      return { cid, time: Math.round(g.time), level: g.level, kills: g.kills, elites: g.elites, bosses: g.bossKills, supers: g.superKills, evos: g.prim.filter(a => a.evolved).map(a => (a.isSuper ? 'SUPER:' : '') + a.def.name), lvlAt: { m5: g.lv5, m10: g.lv10 }, killedBy: g.enemies.filter(e => e.boss && !e.dead).map(e => e.key + '(p' + e.phase + ' ' + e.state + ')').join(','), log: log.join(' | '), src };
    }, [cid, map, maxT, xpg]);
    console.log(JSON.stringify(r));
  }
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await browser.close();
})();

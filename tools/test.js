// Headless smoke test + screenshots. Usage: node tools/test.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const exe = ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
  const browser = await chromium.launch(exe ? { executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => { errors.push('pageerror: ' + e.message + '\n' + e.stack); console.log('PAGEERROR', e.message, e.stack); });
  const url = 'file://' + path.join(__dirname, '..', 'dist', 'game.html');
  const shots = path.join(__dirname, '..', 'screenshots');
  fs.mkdirSync(shots, { recursive: true });
  await page.goto(url); await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(shots, 'menu.png') });
  await page.click('button[data-a=start]'); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(shots, 'charselect.png') });
  await page.click('button[data-a=begin]'); await page.waitForTimeout(300);
  await page.mouse.move(900, 300);
  const hold = async (k, ms) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
  await hold('KeyD', 1200); await hold('KeyS', 800); await hold('KeyA', 1000); await hold('KeyW', 800);
  await page.keyboard.press('Space'); await page.waitForTimeout(600);
  // fast-forward a bit for a livelier screenshot
  await page.evaluate(() => { const g = DS.game; g.time = 170; g.nextMinute = 180; g.nextElite = 180; for (let i = 0; i < 60; i++) g.spawnMonster(); g.spawnMonster(null, { elite: true }); });
  for (let i = 0; i < 6; i++) { await page.evaluate(() => { const g = DS.game; if (g.modal) g.choose(0); g.gainXp(g.xpNeed() - g.xp + 0.01); }); await page.waitForTimeout(120); await page.evaluate(() => { const g = DS.game; while (g.modal) g.choose(0); }); }
  await page.evaluate(() => { const g = DS.game; while (g.modal || g.pendingLU.length) { if (g.modal) g.choose(0); else g.openLevelUp(); } g.player.hp = g.player.maxHp; });
  await hold('KeyD', 1500); await page.mouse.move(400, 500); await hold('KeyW', 1000);
  await page.screenshot({ path: path.join(shots, 'gameplay.png') });
  // trigger a level-up
  await page.evaluate(() => { const g = DS.game; g.gainXp(g.xpNeed() - g.xp + 0.01); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shots, 'levelup.png') });
  await page.keyboard.press('Digit1'); await page.waitForTimeout(200);
  // evolution check: Brandon corn dog lv4 + chili ass -> Coney Carnage offered
  const evo = await page.evaluate(() => {
    const g = DS.game; while (g.modal) g.choose(0);
    const give = (id, lvl) => { let a = g.prim.concat(g.sec).find(x => x.id === id); if (!a) { const d = DS.ABILITIES[id]; a = { id, def: d, level: 1, p: DS.abilityParams(d, 1), t: 0 }; (d.kind === 'secondary' ? g.sec : g.prim).push(a); } a.level = lvl; a.p = DS.abilityParams(a.def, lvl); };
    give('corndog', 4); give('chili_ass', 1); g.recalc();
    const offers = g.buildOffers(false); return offers.map(o => o.kind + ':' + (o.def ? o.def.name : o.name));
  });
  console.log('Offers with corndog4+chili:', evo.join(' | '));
  // jackpot boss double pick
  await page.evaluate(() => { const g = DS.game; const b = g.spawnBoss('slotgolem', { jackpot: true }); g.hit(b, 1e9, { noCrit: true }); });
  await page.waitForTimeout(300);
  const dbl = await page.evaluate(() => DS.game.modal && { double: DS.game.modal.double, picks: DS.game.modal.picks, n: DS.game.modal.offers.length });
  console.log('Jackpot modal:', JSON.stringify(dbl));
  await page.screenshot({ path: path.join(shots, 'levelup_double.png') });
  await page.keyboard.press('Digit1'); await page.keyboard.press('Digit2'); await page.waitForTimeout(200);
  // stress every character with every ability + evolution, bosses, super bosses
  for (const cid of ['brandon', 'ryan', 'tyler', 'kirby', 'ron']) {
    const r = await page.evaluate((cid) => {
      DS.startRun(cid, 0); const g = DS.game; g.god = true;
      const ch = g.ch;
      ch.primaries.forEach(id => { const d = DS.ABILITIES[id]; g.prim.push({ id, def: d, level: 4, p: DS.abilityParams(d, 4), t: 0 }); });
      ch.secondaries.forEach(id => { const d = DS.ABILITIES[id]; g.sec.push({ id, def: d, level: 4, p: DS.abilityParams(d, 4), t: 0 }); });
      g.recalc();
      const offers = g.buildOffers(false).filter(o => o.kind === 'evo'); offers.forEach(o => g.applyOffer(o));
      const evos = g.prim.filter(a => a.evolved).length;
      g.time = 595; g.nextMinute = 600; g.nextElite = 600;
      for (let i = 0; i < 150; i++) g.spawnMonster();
      return { evos, final: g.buildOffers(false).map(o => o.kind) };
    }, cid);
    await page.keyboard.down('KeyD'); await page.mouse.move(200 + Math.random() * 800, 200 + Math.random() * 300);
    await page.waitForTimeout(1500); await page.keyboard.press('Space');
    await page.evaluate(() => { const g = DS.game; for (const k of ['minotaur', 'slotgolem', 'lich', 'wyrm', 'pitboss']) g.spawnBoss(k, {}); g.spawnBoss('taxman', { super: true }); g.spawnBoss('house', { super: true }); g.enemies.filter(e => e.boss).forEach((b, i) => { b.hp = b.maxHp * (i % 2 ? 0.45 : 0.25); }); });
    for (let i = 0; i < 5; i++) { await page.waitForTimeout(500); await page.evaluate(() => { const g = DS.game; while (g.modal) g.choose(0); }); } await page.keyboard.up('KeyD');
    const st = await page.evaluate(() => { const g = DS.game; return { t: g.time.toFixed(1), kills: g.kills, enemies: g.enemies.length, proj: g.proj.length, lvl: g.level, fps: DS.fps, modal: !!g.modal }; });
    console.log(cid, JSON.stringify(r), JSON.stringify(st));
    if (cid === 'kirby') await page.screenshot({ path: path.join(shots, 'gameplay_late.png') });
  }
  // ======== v2 checks ========
  // auto-target priority: boss (in range) > elite (in range) > nearest
  const aim = await page.evaluate(() => {
    DS.startRun('tyler', 0); const g = DS.game; g.god = true; g.enemies = []; const p = g.player;
    const near = g.spawnMonster('bat', { pos: { x: p.x + 60, y: p.y } }); const el = g.spawnMonster('bat', { pos: { x: p.x - 200, y: p.y }, elite: true });
    g.grid.clear(); g.enemies.forEach(e => g.grid.add(e)); const r1 = g.autoTarget(g.mainRange());
    const boss = g.spawnBoss('lich', {}); boss.x = p.x; boss.y = p.y + 250; const r2 = g.autoTarget(g.mainRange());
    boss.x = p.x + 5000; const r3 = g.autoTarget(g.mainRange()); el.x = p.x + 5000; const r4 = g.autoTarget(g.mainRange());
    const name = (e) => e === boss ? 'boss' : e === el ? 'elite' : e === near ? 'nearest' : 'other';
    return { normal: name(r1), withBoss: name(r2), bossOutOfRange: name(r3), onlyFar: name(r4), range: Math.round(g.mainRange()) };
  });
  console.log('Auto-target:', JSON.stringify(aim));
  // super evolution offer + merge frees a slot
  const sev = await page.evaluate(() => {
    DS.startRun('brandon', 0); const g = DS.game; g.god = true;
    const giveEvo = (base) => { const d = DS.ABILITIES[base]; const ev = DS.ABILITIES[d.evo.into]; g.prim.push({ id: ev.id, from: base, def: ev, evolved: true, level: 4, p: DS.abilityParams(ev, 1), t: 0 }); };
    giveEvo('corndog'); const tail = DS.CHARACTERS[0].primaries.find(id => DS.ABILITIES[id].evo && DS.ABILITIES[id].evo.into === 'tailgate_apocalypse'); giveEvo(tail);
    const third = DS.CHARACTERS[0].primaries.find(id => id !== 'corndog' && id !== tail); g.prim.push({ id: third, def: DS.ABILITIES[third], level: 2, p: DS.abilityParams(DS.ABILITIES[third], 2), t: 0 });
    const fourth = DS.CHARACTERS[0].primaries.find(id => id !== 'corndog' && id !== tail && id !== third); g.prim.push({ id: fourth, def: DS.ABILITIES[fourth], level: 1, p: DS.abilityParams(DS.ABILITIES[fourth], 1), t: 0 });
    const chili = DS.ABILITIES.chili_ass; g.sec.push({ id: 'chili_ass', def: chili, level: 4, p: DS.abilityParams(chili, 4), t: 0 }); g.recalc();
    const before = g.prim.length; const newOffersBefore = g.buildOffers(false).filter(o => o.kind === 'new' && o.def.kind === 'primary').length;
    const offers = g.buildOffers(false); const so = offers.find(o => o.kind === 'super');
    g.pendingLU = []; g.modal = { double: false, picks: 1, offers }; DS.UI.showLevelUp(g.modal, g);
    return { superOffered: so && so.def.name, before, newPrimaryOffersWhenFull: newOffersBefore };
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(shots, 'levelup_super.png') });
  const sev2 = await page.evaluate(() => { const g = DS.game; const i = g.modal.offers.findIndex(o => o.kind === 'super'); g.choose(i); const after = g.prim.length; const sup = g.prim.find(a => a.isSuper);
    let newPrim = 0; for (let k = 0; k < 20; k++) newPrim += g.buildOffers(false).filter(o => o.kind === 'new' && o.def.kind === 'primary').length; return { after, superSubs: sup && sup.subs.map(s => s.def.name), newPrimaryOffersAfter: newPrim > 0 }; });
  console.log('Super evolution:', JSON.stringify(Object.assign(sev, sev2)));
  for (let i = 0; i < 4; i++) { await page.evaluate(() => { const g = DS.game; for (let k = 0; k < 15; k++) g.spawnMonster(); }); await page.waitForTimeout(150); }
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(shots, 'super.png') });
  // all supers for every character apply + run without errors
  const allSup = await page.evaluate(async () => { const out = {};
    for (const c of DS.CHARACTERS) { DS.startRun(c.id, 0); const g = DS.game; g.god = true;
      for (const S of DS.SUPERS[c.id]) for (const pid of S.parts) { const ev = DS.ABILITIES[pid]; g.prim.push({ id: pid, def: ev, evolved: true, level: 4, p: DS.abilityParams(ev, 1), t: 0 }); }
      g.prim.forEach(a => { a.from = a.from || a.id; });
      let n = 0; let so; while ((so = g.superOffers()[0]) && n < 5) { g.applyOffer(so); n++; }
      for (let i = 0; i < 80; i++) g.spawnMonster();
      for (let i = 0; i < 240; i++) g.update(1 / 60, { down: () => false, pressed: () => false, mouseR: false });
      while (g.modal) g.choose(0); out[c.id] = g.prim.filter(a => a.isSuper).map(a => a.def.name).join(' + ') + ' (kills ' + g.kills + ')'; }
    return out; });
  console.log('All supers:', JSON.stringify(allSup));
  // Ron close-up (new occult detective look, smoke, hellfire tomes)
  await page.evaluate(() => { DS.startRun('ron', 0); const g = DS.game; g.god = true; for (let i = 0; i < 25; i++) g.spawnMonster(); });
  await hold('KeyD', 700); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(shots, 'ron.png') });
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 3 });
  const p3 = await ctx3.newPage(); p3.on('pageerror', e => errors.push('pageerror(closeup): ' + e.message));
  await p3.goto(url); await p3.waitForTimeout(500);
  await p3.evaluate(() => { DS.startRun('ron', 0); const g = DS.game; g.god = true; g.enemies = []; DS.Audio.play = () => {}; });
  await p3.mouse.move(1200, 100); await p3.waitForTimeout(2200);
  await p3.screenshot({ path: path.join(shots, 'ron_closeup.png'), clip: { x: 640 - 110, y: 360 - 90, width: 220, height: 170 } });
  await ctx3.close();
  // Chili Ass goo trail
  await page.evaluate(() => { DS.startRun('brandon', 0); const g = DS.game; g.god = true; const d = DS.ABILITIES.chili_ass; g.sec.push({ id: 'chili_ass', def: d, level: 4, p: DS.abilityParams(d, 4), t: 0 }); g.recalc(); g.spawnAcc = -40; });
  await hold('KeyD', 700); await page.keyboard.down('KeyS'); await hold('KeyD', 500); await page.keyboard.up('KeyS'); await hold('KeyS', 500); await page.keyboard.down('KeyA'); await hold('KeyS', 400); await page.keyboard.up('KeyA'); await hold('KeyA', 450);
  await page.screenshot({ path: path.join(shots, 'chili.png') });
  // Minotaur: telegraphed charges + spike walls
  await page.evaluate(() => { DS.startRun('kirby', 0); const g = DS.game; g.god = true; g.spawnAcc = -60; const b = g.spawnBoss('minotaur', {}); b.x = g.player.x + 420; b.y = g.player.y - 160; g.player.invuln = 99; b.t = 0; b.spawnT = 0; b.hp = b.maxHp * 0.45; });
  let mino = null;
  for (let i = 0; i < 80; i++) { await page.waitForTimeout(100); mino = await page.evaluate(() => { const g = DS.game; return { walls: g.walls.length, tele: g.tele.length, phase: (g.enemies.find(e => e.boss) || {}).phase, state: (g.enemies.find(e => e.boss) || {}).state }; }); if (mino.walls >= 5 && mino.tele > 0) break; }
  await page.screenshot({ path: path.join(shots, 'minotaur.png') });
  console.log('Minotaur:', JSON.stringify(mino));
  // walls block movement
  const block = await page.evaluate(() => { const g = DS.game; const p = g.player; g.walls = []; g.addWall(p.x + 40, p.y, 1); g.walls[0].age = 1; const x0 = p.x; for (let i = 0; i < 30; i++) g.update(1 / 60, { down: (k) => k === 'KeyD', pressed: () => false, mouseR: false }); return { movedPastWall: p.x > x0 + 40, x: Math.round(p.x - x0) }; });
  console.log('Spike wall blocks player:', JSON.stringify(block));
  // boss phase visuals on another boss
  await page.evaluate(() => { const g = DS.game; g.enemies.filter(e => e.boss).forEach(e => e.dead = true); const w = g.spawnBoss('wyrm', {}); w.x = g.player.x + 250; w.y = g.player.y; w.spawnT = 0; w.hp = w.maxHp * 0.4; w.t4 = 0; });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: path.join(shots, 'boss_phase.png') });
  const sup = await page.evaluate(async () => { DS.startRun('brandon', 0); const g = DS.game; g.god = true; g.time = 599.5; g.nextMinute = 600; g.nextElite = 620; await new Promise(r => setTimeout(r, 1200)); while (g.modal) g.choose(0);
    const s = g.enemies.find(e => e.super); g.god = false; g.player.invuln = 0; g.player.shield = 0; g.damagePlayer(1e6, null); await new Promise(r => setTimeout(r, 300)); return { superName: s && s.name, over: g.over, unlocked: DS.save.mapsUnlocked, result: g.result && { time: Math.round(g.result.time), gold: g.result.gold, xp: g.result.xp, unlocked: g.result.unlocked } }; });
  console.log('Super boss + unlock:', JSON.stringify(sup));
  await page.screenshot({ path: path.join(shots, 'results_death.png') });
  await page.click('button[data-a=again]'); await page.waitForTimeout(300);
  // pause + quit -> results
  await page.evaluate(() => { const g = DS.game; while (g.modal) g.choose(0); g.pendingLU = []; });
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(shots, 'pause.png') });
  await page.click('button[data-a=quit-run]'); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shots, 'results.png') });
  await page.click('button[data-a=menu]'); await page.waitForTimeout(200);
  // give stuff for upgrade/market screens
  await page.evaluate(() => { DS.save.gold += 12000; const c = DS.save.chars.brandon; DS.grantCharXp('brandon', 3000); for (let i = 0; i < 4; i++) { const it = DS.makeSetItem('brandon', i); it.uid = DS.save.nextUid++; c.inv.push(it); } for (let i = 0; i < 3; i++) { const it = DS.genItem(Math.random, ['rare', 'epic', 'legendary'][i]); it.uid = DS.save.nextUid++; c.inv.push(it); } DS.persist(); DS.UI.selChar = 'brandon'; });
  await page.click('button[data-a=upgrade]'); await page.waitForTimeout(200);
  await page.click('button[data-a=up-tab][data-id=brandon]'); await page.waitForTimeout(100);
  const eqCount = () => page.evaluate(() => DS.equippedItems('brandon').length);
  const g0 = await eqCount();
  await page.click('.bagitem[data-a=equip]'); await page.waitForTimeout(100); const g1 = await eqCount();      // click item tile -> equip
  await page.click('.pslot.filled'); await page.waitForTimeout(100); const g2 = await eqCount();               // click equipped slot -> unequip
  for (let i = 0; i < 6; i++) { const b = await page.$('button[data-a=equip]'); if (b) { await b.click(); await page.waitForTimeout(80); } } // Equip buttons
  const g3 = await eqCount();
  const xb = await page.$('.xbtn'); await xb.click(); await page.waitForTimeout(80); const g4 = await eqCount(); // Unequip button
  const ringTest = await page.evaluate(() => { const c = DS.save.chars.brandon; const mk = () => { const it = DS.genItem(Math.random, 'rare'); while (it.slot !== 'ring') Object.assign(it, DS.genItem(Math.random, 'rare')); it.uid = DS.save.nextUid++; c.inv.push(it); return it; };
    c.equip.ring1 = null; c.equip.ring2 = null; const a = mk(), b = mk(); const s1 = DS.equipItem('brandon', a.uid), s2 = DS.equipItem('brandon', b.uid); DS.unequipSlot('brandon', 'ring2'); DS.UI.upgrade('brandon', 'gear'); return s1 + ',' + s2; });
  await page.waitForTimeout(100);
  await page.hover('.bagitem'); await page.waitForTimeout(150);
  const tip = await page.evaluate(() => { const t = document.getElementById('tip'); return t && t.style.display === 'block' ? t.innerText.replace(/\n/g, ' / ').slice(0, 160) : null; });
  console.log('Gear flow: equipped', g0, '-> click item', g1, '-> click slot', g2, '-> Equip buttons', g3, '-> ✕ unequip', g4, '| rings go to', ringTest, '| tooltip:', tip);
  await page.screenshot({ path: path.join(shots, 'gear.png') });
  await page.mouse.move(5, 5);
  await page.click('button[data-a=up-sub][data-id=talents]'); await page.waitForTimeout(100);
  for (const t of ['atk', 'aspd', 'crit']) { const b = await page.$('button[data-a=talent][data-id=' + t + ']:not([disabled])'); if (b) await b.click(); }
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(shots, 'upgrade.png') });
  await page.click('button[data-a=codex]'); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(shots, 'codex.png') });
  await page.click('button[data-a=close-overlay]');
  await page.click('button[data-a=menu]'); await page.click('button[data-a=market]'); await page.waitForTimeout(200);
  await page.click('button[data-a=buy-tp]'); await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(shots, 'market.png') });
  const gearBuy = await page.evaluate(() => { const st = DS.marketStock(DS.save); const i = st.findIndex(x => !x.sold && !x.owner); return i; });
  await page.click('button[data-a=buy][data-idx="' + gearBuy + '"]'); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(shots, 'market_pick.png') });
  await page.click('button[data-a=buy-for][data-id=ryan]'); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(shots, 'market_bought.png') });
  const ryanBefore = await page.evaluate(() => DS.equippedItems('ryan').length);
  await page.click('button[data-a=equip-now]'); await page.waitForTimeout(150);
  const ryanAfter = await page.evaluate(() => ({ eq: DS.equippedItems('ryan').map(i => i.name), modal: document.querySelector('.modal.buy h2') && document.querySelector('.modal.buy h2').innerText }));
  console.log('Market buy -> Ryan -> Equip Now:', ryanBefore, '->', JSON.stringify(ryanAfter));
  await page.click('button[data-a=open-gear]'); await page.waitForTimeout(150);
  const onGear = await page.evaluate(() => DS.UI.screen + ':' + DS.UI.selChar + ':' + DS.UI.upTab);
  console.log('Open Gear ->', onGear);
  await page.click('button[data-a=market]'); await page.waitForTimeout(150);
  await page.click('button[data-a=menu]'); await page.click('button[data-a=options]'); await page.waitForTimeout(200);
  await page.click('button[data-a=rebind][data-id=special]'); await page.keyboard.press('KeyE'); await page.waitForTimeout(100);
  const key = await page.evaluate(() => DS.save.options.keys.special);
  console.log('Rebound special to', key);
  await page.click('button[data-a=reset-keys]');
  await page.screenshot({ path: path.join(shots, 'options.png') });
  await page.click('button[data-a=opt-back]'); await page.click('button[data-a=exit]'); await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(shots, 'exit.png') });
  // reload: persistence
  await page.reload(); await page.waitForTimeout(500);
  const persisted = await page.evaluate(() => ({ gold: DS.save.gold, runs: DS.save.totals.runs, inv: DS.save.chars.brandon.inv.length, lvl: DS.save.chars.brandon.level }));
  console.log('Persisted after reload:', JSON.stringify(persisted));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO CONSOLE ERRORS');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();

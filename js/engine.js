// engine.js - the run simulation: player, monsters, bosses, generic ability engine, FX state
'use strict';
(function (DS) {
  const U = DS.U, W = 1280, H = 720; DS.W = W; DS.H = H;
  // world view size in world units (responsive: set by main.js from viewport + zoom)
  const VW = () => DS.WW || W, VH = () => DS.WH || H;
  const TAU = Math.PI * 2;
  DS.XP_GAIN = 0.75; // v2: in-run XP gains reduced 25% (exposed for tools/sim.js experiments)

  class Grid {
    constructor(cs) { this.cs = cs; this.m = new Map(); }
    clear() { this.m.clear(); }
    add(e) { const k = ((Math.floor(e.x / this.cs) + 32768) * 65536) + (Math.floor(e.y / this.cs) + 32768); let a = this.m.get(k); if (!a) { a = []; this.m.set(k, a); } a.push(e); }
    query(x, y, r) {
      const out = []; const cs = this.cs;
      const x0 = Math.floor((x - r) / cs), x1 = Math.floor((x + r) / cs), y0 = Math.floor((y - r) / cs), y1 = Math.floor((y + r) / cs);
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const a = this.m.get((cx + 32768) * 65536 + (cy + 32768)); if (a) for (let i = 0; i < a.length; i++) out.push(a[i]); }
      return out;
    }
  }

  let EID = 1;
  class Game {
    constructor(charId, mapIdx) {
      this.ch = DS.CHAR_BY_ID[charId]; this.cid = charId; this.mapIdx = mapIdx; this.map = DS.MAPS[mapIdx];
      this.meta = DS.metaStats(charId);
      DS.Spr.buildMonsters(mapIdx);
      this.tile = DS.Spr.buildTile(mapIdx); this.pattern = null;
      this.time = 0; this.kills = 0; this.elites = 0; this.bossKills = 0; this.superKills = 0; this.goldRun = 0; this.dmgDealt = 0;
      this.level = 0; this.xp = 0; this.overLevels = 0;
      this.prim = []; this.sec = []; this.evolved = {};
      this.enemies = []; this.proj = []; this.eproj = []; this.zones = []; this.ezones = []; this.pickups = []; this.lobs = [];
      this.fx = []; this.texts = []; this.hazards = []; this.delayed = []; this.parts = []; this.decals = []; this.walls = []; this.tele = []; this.smoke = [];
      this.grid = new Grid(64);
      this.spawnAcc = 0; this.nextElite = 30; this.nextMinute = 60; this.superCount = 0;
      this.pendingLU = []; this.modal = null; this.paused = false; this.over = false; this.result = null;
      this.shake = 0; this.flash = null; this.god = false; this.revived = false;
      this.setTimers = { magnet: 20, keg: 20, smite: 20 };
      const p = this.player = { x: 0, y: 0, r: 14, hp: 1, maxHp: 1, shield: 0, shieldMax: 0, shieldT: 0, facing: 1, moving: false, anim: 0, invuln: 1.0, specialT: 0, mainT: 0.3, hurtT: 0, buff: null, dash: null, vx: 0, vy: 0, lastAng: 0, spikeCd: 0, smokeT: 0 };
      this.recalc(); p.hp = p.maxHp;
      this.mouse = { x: W / 2 + 100, y: H / 2 };
      this.vignette = makeVignette();
      this.target = null;
    }
    // ---------------- stats ----------------
    recalc() {
      const b = this.ch.base, m = Object.assign({}, this.meta), p = this.player;
      const add = (k, v) => { m[k] = (m[k] || 0) + v; };
      let regen = 0, shieldMax = 0, reflect = 0;
      this.sec.forEach(s => { if (s.p.stats) for (const k in s.p.stats) add(k, s.p.stats[k]); if (s.def.type === 'regen') regen += s.p.regen; if (s.def.type === 'shield') shieldMax += s.p.shield; if (s.def.type === 'thorns') reflect += s.p.reflect; });
      const g = (k) => m[k] || 0;
      const st = this.st = {};
      st.maxHp = b.hp * (1 + (g('hpPct') + 5 * this.level) / 100);
      st.dmgMult = (1 + g('dmgPct') / 100) * (1 + 0.05 * this.level);
      st.autoMult = 1 + g('autoDmgPct') / 100;
      st.atkRate = 1 + g('atkSpdPct') / 100;
      st.crit = (b.crit + g('crit')) / 100;
      st.critMult = b.critMult + g('critDmgPct') / 100;
      st.speed = b.speed * (1 + g('movePct') / 100);
      st.specialCd = this.ch.special.cd / (1 + g('cdrPct') / 100);
      st.pickup = b.pickup * (1 + g('pickupPct') / 100);
      st.area = 1 + g('areaPct') / 100;
      st.abCd = Math.max(0.35, 1 - g('abilityCdPct') / 100);
      st.regen = b.regen + g('regen') + regen;
      st.armor = b.armor + g('armor');
      st.xpMult = 1 + g('xpPct') / 100; st.goldMult = 1 + g('goldPct') / 100;
      st.amount = Math.round(g('amount')); st.pierce = this.meta.pierce || 0; st.flags = this.meta.flags || {};
      st.reflect = reflect;
      const old = p.maxHp; p.maxHp = st.maxHp; if (old > 1) p.hp = Math.min(p.maxHp, p.hp + Math.max(0, p.maxHp - old));
      p.shieldMax = shieldMax; if (p.shield > shieldMax) p.shield = shieldMax;
    }
    autoDmg() { return this.ch.base.dmg * this.st.dmgMult * this.st.autoMult; }
    buffDmg() { return this.player.buff ? this.player.buff.dmg : 1; }
    buffRate() { return this.player.buff ? this.player.buff.rate : 1; }
    minute() { return this.time / 60; }
    tier() { return DS.tierAt(this.time); }
    tierScale() { return DS.tierScale(this.tier()); }
    mouseWorld() { const z = DS.ZOOM || 1; return { x: this.player.x + (this.mouse.x - (DS.VW || W) / 2) / z, y: this.player.y + (this.mouse.y - (DS.VH || H) / 2) / z }; }
    // special aim: mouse on desktop; on touch -> priority target (boss > elite > nearest) or movement direction
    specialAim() {
      if (!DS.touchMode) return this.mouseWorld();
      const p = this.player; const t = this.autoTarget(700);
      if (t && U.dist(p.x, p.y, t.x, t.y) < 700) return { x: t.x, y: t.y };
      return { x: p.x + Math.cos(p.lastAng) * 260, y: p.y + Math.sin(p.lastAng) * 260 };
    }
    aimAngle() { const m = this.mouseWorld(); return Math.atan2(m.y - this.player.y, m.x - this.player.x); }
    xpNeed() { return DS.runXpNeed(Math.min(this.level, DS.RUN_MAX_LEVEL - 1)); }
    allAbilities() { const out = []; for (const a of this.prim) { if (a.subs) out.push(...a.subs); else out.push(a); } return out.concat(this.sec); }
    mainRange() { const M = this.ch.main; return M.type === 'melee' ? M.range * Math.sqrt(this.st.area) + 70 : M.speed * M.life; }
    // Auto-target: Bosses in range > Elites in range > closest enemy.
    autoTarget(range) {
      const p = this.player; const r2 = range * range; let boss = null, bd = r2, elite = null, ed = r2, near = null, nd = 1e12;
      for (const e of this.enemies) {
        if (e.dead) continue; const d = U.dist2(p.x, p.y, e.x, e.y);
        if (e.boss) { if (d < bd) { bd = d; boss = e; } } else if (e.elite) { if (d < ed) { ed = d; elite = e; } }
        if (d < nd) { nd = d; near = e; }
      }
      return boss || elite || near;
    }
    targetAngle(range) { const t = this.autoTarget(range); const p = this.player; return t ? Math.atan2(t.y - p.y, t.x - p.x) : p.lastAng; }

    // ---------------- main update ----------------
    update(dt, input) {
      if (this.over || this.paused || this.modal) return;
      if (this.pendingLU.length) { this.openLevelUp(); return; }
      this.time += dt;
      const p = this.player, st = this.st;
      while (this.time >= this.nextElite) { this.spawnMonster(null, { elite: true }); this.nextElite += 30; }
      while (this.time >= this.nextMinute) { this.onMinute(Math.round(this.nextMinute)); this.nextMinute += 60; }
      let mx = 0, my = 0; const k = DS.save.options.keys;
      if (input.down(k.left) || input.down('ArrowLeft')) mx -= 1; if (input.down(k.right) || input.down('ArrowRight')) mx += 1;
      if (input.down(k.up) || input.down('ArrowUp')) my -= 1; if (input.down(k.down) || input.down('ArrowDown')) my += 1;
      if (input.joy && (input.joy.x || input.joy.y)) { mx += input.joy.x; my += input.joy.y; } // virtual joystick (touch)
      let ml = Math.hypot(mx, my); if (ml < 0.18) { mx = 0; my = 0; ml = 0; } p.moving = ml > 0;
      if (p.dash) { p.x += p.dash.vx * dt; p.y += p.dash.vy * dt; p.dash.t -= dt; if (Math.random() < 0.8) this.part(p.x, p.y, '#50e030', { g: 0, life: 0.3, size: 4, add: true }); if (p.dash.t <= 0) p.dash = null; }
      else if (ml > 0) { p.vx = mx / ml * st.speed; p.vy = my / ml * st.speed; p.x += p.vx * dt; p.y += p.vy * dt; p.anim += dt; p.lastAng = Math.atan2(p.vy, p.vx); }
      if (ml === 0 && !p.dash) { p.vx = 0; p.vy = 0; }
      this.collideWalls(dt);
      if (p.invuln > 0) p.invuln -= dt; if (p.hurtT > 0) p.hurtT -= dt;
      if (p.buff) { p.buff.t -= dt; if (Math.random() < 0.5) this.part(p.x + U.rand(-14, 14), p.y + U.rand(-10, 20), '#ff3030', { g: -120, life: 0.4, size: 3, add: true }); if (p.buff.t <= 0) p.buff = null; }
      if (st.regen > 0) p.hp = Math.min(p.maxHp, p.hp + st.regen * dt);
      this.updateShield(dt);
      this.grid.clear(); for (const e of this.enemies) if (!e.dead) this.grid.add(e);
      // main attack auto-targets: bosses > elites > closest
      this.target = this.autoTarget(this.mainRange());
      if (this.target) p.facing = this.target.x >= p.x ? 1 : -1; else if (p.vx) p.facing = p.vx > 0 ? 1 : -1;
      p.mainT -= dt * st.atkRate * this.buffRate();
      if (p.mainT <= 0) { p.mainT += 1; this.fireMain(); if (p.mainT < -1) p.mainT = 0; }
      // special aims at the mouse
      if (p.specialT > 0) p.specialT -= dt;
      if ((input.pressed(k.special) || input.mouseR) && p.specialT <= 0) { this.useSpecial(); p.specialT = st.specialCd; }
      input.mouseR = false;
      this.updateSets(dt);
      for (const a of this.prim) this.runAbility(a, dt);
      for (const a of this.sec) this.runAbility(a, dt);
      this.spawnTick(dt);
      this.updateEnemies(dt); this.updateProj(dt); this.updateLobs(dt); this.updateZones(dt);
      this.updateEnemyProj(dt); this.updateHazards(dt); this.updatePickups(dt); this.updateFx(dt);
      this.updateSmoke(dt);
      for (let i = this.delayed.length - 1; i >= 0; i--) { const d = this.delayed[i]; d.t -= dt; if (d.t <= 0) { this.delayed.splice(i, 1); d.fn(); } }
      if (this.enemies.some(e => e.dead)) this.enemies = this.enemies.filter(e => !e.dead);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
      if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
      if (p.hp <= 0) this.die();
    }
    collideWalls(dt) {
      const p = this.player; if (p.spikeCd > 0) p.spikeCd -= dt;
      for (const w of this.walls) {
        if (w.age < 0.15) continue;
        const dx = p.x - w.x, dy = p.y - w.y, rr = w.r + p.r * 0.85; const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 1; p.x = w.x + dx / d * rr; p.y = w.y + dy / d * rr;
          if (p.dash) p.dash = null;
          if (p.spikeCd <= 0) { p.spikeCd = 0.6; this.damagePlayer(w.dmg, null); for (let i = 0; i < 5; i++) this.part(p.x, p.y, '#c0a080'); }
        }
      }
    }
    updateSmoke(dt) {
      const sm = this.ch.smoke; const p = this.player;
      if (sm) {
        p.smokeT -= dt;
        if (p.smokeT <= 0 && this.smoke.length < 40) {
          p.smokeT = 0.09; const spr = DS.Spr.chars[this.cid].A; const w = spr.width, h = spr.height;
          const col = p.facing >= 0 ? sm[0] : 15 - sm[0];
          const x = p.x - w / 2 + (col + 1.5) * 3, y = p.y - h / 2 - 4 + (sm[1] + 1.5) * 3;
          this.smoke.push({ x, y, vx: U.rand(-8, 8) + p.facing * 6, vy: U.rand(-32, -22), life: 1.6, max: 1.6, r: 2, ph: Math.random() * 6 });
        }
      }
      for (let i = this.smoke.length - 1; i >= 0; i--) { const s = this.smoke[i]; s.life -= dt; s.x += (s.vx + Math.sin(this.time * 3 + s.ph) * 10) * dt; s.y += s.vy * dt; s.r += dt * 5; if (s.life <= 0) this.smoke.splice(i, 1); }
    }
    onMinute(t) {
      if (t % 600 === 0) {
        const key = this.superCount % 2 === 0 ? 'house' : 'taxman'; this.superCount++;
        this.spawnBoss(key, { super: true, jackpot: true });
      } else {
        if (t % 120 === 0) this.spawnBoss(U.choose(Object.keys(DS.BOSSES)), {});
        if (t % 300 === 0) this.spawnBoss(U.choose(Object.keys(DS.BOSSES)), { jackpot: true });
      }
    }
    spawnTick(dt) {
      const m = this.minute();
      const rate = (0.7 + 0.35 * m + 0.04 * m * m) * this.map.spawn;
      this.spawnAcc += rate * dt;
      while (this.spawnAcc >= 1) { this.spawnAcc -= 1; if (this.enemies.length < 380) this.spawnMonster(); }
    }
    spawnPos(dist) {
      const a = Math.random() * TAU; const d = dist || (Math.hypot(VW(), VH()) / 2 + 40 + Math.random() * 60);
      return { x: this.player.x + Math.cos(a) * d, y: this.player.y + Math.sin(a) * d };
    }
    pickKind() {
      const m = this.minute(); const pool = []; let tot = 0;
      for (const k in DS.MONSTERS) { const d = DS.MONSTERS[k]; if (m >= d.from) { pool.push(k); tot += d.w; } }
      let r = Math.random() * tot; for (const k of pool) { r -= DS.MONSTERS[k].w; if (r <= 0) return k; } return pool[0];
    }
    spawnMonster(kind, o) {
      o = o || {}; kind = kind || this.pickKind(); const d = DS.MONSTERS[kind];
      const ts = this.tierScale() * this.map.mult; const B = DS.BASE_MONSTER;
      const pos = o.pos || this.spawnPos();
      const e = { id: EID++, kind, sprite: d.sprite, x: pos.x, y: pos.y, r: d.r, hp: B.hp * d.hp * ts, dmg: B.dmg * d.dmg * ts, speed: d.speed * (1 + 0.03 * (this.tier() - 1)),
        xp: B.xp * DS.XP_GAIN * (1 + 0.6 * (this.tier() - 1)) * (1 + 0.25 * this.mapIdx), flash: 0, kbx: 0, kby: 0, slow: 0, slowT: 0, stun: 0, burn: null, contactCd: 0, lh: {}, bob: Math.random() * 6 };
      if (o.elite) { e.elite = true; e.hp *= 10; e.dmg *= 10; e.r *= 1.6; e.xp *= 20; e.speed *= 0.7; }
      e.maxHp = e.hp; this.enemies.push(e); return e;
    }
    spawnBoss(key, o) {
      const def = o.super ? DS.SUPER_BOSSES[key] : DS.BOSSES[key];
      const m = Math.max(1, this.minute()); const ts = this.tierScale() * this.map.mult;
      let hp = 30 * DS.estDps(m) * this.map.mult, dmg = DS.BASE_MONSTER.dmg * 2.5 * ts;
      if (o.super) { hp *= 15; dmg *= 2.5; }
      const pos = this.spawnPos(520);
      const e = { id: EID++, boss: true, super: !!o.super, jackpot: !!o.jackpot, key, def, name: def.name, ai: def.ai, sprite: def.sprite, x: pos.x, y: pos.y, r: def.r, hp, maxHp: hp, dmg, speed: def.speed,
        xp: 0, flash: 0, kbx: 0, kby: 0, slow: 0, slowT: 0, stun: 0, burn: null, contactCd: 0, lh: {}, bob: 0, state: 'walk', t: 2.5, t2: 3, t3: 4, t4: 6, ang: 0, n: 0, phase: 1, spawnT: 1 };
      this.enemies.push(e);
      DS.Audio.play('boss'); if (DS.Audio.ctx) DS.Audio.playTrack('boss');
      this.ring(e.x, e.y, 160, o.super ? '#ff2020' : '#c060ff', 0.8, true);
      for (let i = 0; i < 40; i++) this.part(e.x + U.rand(-40, 40), e.y + U.rand(-40, 40), o.super ? '#ff3030' : '#c060ff', { g: -200, life: 1, size: 4, add: true });
      this.banner((o.super ? 'SUPER BOSS: ' : o.jackpot ? 'JACKPOT BOSS: ' : 'BOSS: ') + def.name, o.super ? '#ff3030' : o.jackpot ? '#ffd040' : '#ff8060');
      return e;
    }
    banner(text, col) { this.bannerMsg = { text, col: col || '#fff', t: 3 }; }
    updateEnemies(dt) {
      const p = this.player;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (e.flash > 0) e.flash -= dt; if (e.contactCd > 0) e.contactCd -= dt; if (e.spawnT > 0) e.spawnT -= dt;
        if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
        if (e.burn) { e.burn.t -= dt; e.burn.tick -= dt; if (Math.random() < 0.15) this.part(e.x + U.rand(-6, 6), e.y - e.r * 0.5, '#ff8030', { g: -90, life: 0.4, size: 3, add: true }); if (e.burn.tick <= 0) { e.burn.tick = 0.5; this.hit(e, e.burn.dps * 0.5, { noCrit: true, quiet: true, col: '#ff9040' }); } if (e.burn && e.burn.t <= 0) e.burn = null; if (e.dead) continue; }
        const dx = p.x - e.x, dy = p.y - e.y; const d = Math.hypot(dx, dy) || 1;
        if (e.stun > 0) e.stun -= dt;
        else if (e.boss) this.bossAI(e, dt, dx / d, dy / d, d);
        else { const sp = e.speed * (1 - e.slow); e.x += dx / d * sp * dt; e.y += dy / d * sp * dt; }
        if (e.kbx || e.kby) { e.x += e.kbx * dt; e.y += e.kby * dt; e.kbx *= Math.pow(0.0005, dt); e.kby *= Math.pow(0.0005, dt); if (Math.abs(e.kbx) + Math.abs(e.kby) < 5) e.kbx = e.kby = 0; }
        if (!e.boss) {
          const near = this.grid.query(e.x, e.y, e.r * 2); let c = 0;
          for (const o of near) { if (o === e || o.dead) continue; const ox = e.x - o.x, oy = e.y - o.y; const dd = ox * ox + oy * oy; const rr = (e.r + o.r) * 0.8; if (dd < rr * rr && dd > 0.01) { const l = Math.sqrt(dd); const push = (rr - l) * 0.5; e.x += ox / l * push; e.y += oy / l * push; } if (++c > 6) break; }
          if (d > Math.max(1150, Math.hypot(VW(), VH()) / 2 + 300)) { const a = Math.atan2(-dy, -dx) + Math.PI + U.rand(-0.6, 0.6); const nd = Math.hypot(VW(), VH()) / 2 + 30; e.x = p.x + Math.cos(a) * nd; e.y = p.y + Math.sin(a) * nd; }
        }
        if (d < e.r + p.r && e.contactCd <= 0 && !(e.spawnT > 0)) { this.damagePlayer(e.dmg * (e.state === 'charge' ? 1.25 : 1), e); e.contactCd = e.boss ? 1.0 : 0.5; if (e.state === 'charge') { e.state = 'recover'; e.t = 0.8; e.chainLeft = 0; this.shake = Math.max(this.shake, 8); } }
      }
    }
    // ---------------- bosses: phases, telegraphs, attacks ----------------
    bossPhase(e, ph) {
      this.banner(e.name + (ph === 2 ? ' is ENRAGED!' : ' - FINAL PHASE!'), '#ff4040');
      this.flash = { col: '#ff2020', t: 0.35, max: 0.35 }; this.shake = 12; e.speed *= 1.15;
      this.ring(e.x, e.y, 220, '#ff3030', 0.6, true); DS.Audio.play('phase');
      for (let i = 0; i < 30; i++) this.part(e.x, e.y, '#ff4040', { size: 5, add: true, life: 0.8 });
    }
    addWall(x, y, dmg, col) { if (this.walls.length > 140) this.walls.shift(); this.walls.push({ x, y, r: 17, life: 10, max: 10, age: 0, dmg, col: col || null, seed: Math.random() * 100 }); }
    teleLine(e, ang, len, w, dur, col) { this.tele.push({ type: 'line', follow: e, x: e.x, y: e.y, ang, len, w, t: 0, dur, col: col || '#ff2020' }); }
    teleCircle(x, y, r, dur, col) { this.tele.push({ type: 'circle', x, y, r, t: 0, dur, col: col || '#ff2020' }); }
    teleCone(e, ang, spread, len, dur, col) { this.tele.push({ type: 'cone', follow: e, x: e.x, y: e.y, ang, spread, len, t: 0, dur, col: col || '#ff6020' }); }
    hazard(x, y, r, warn, dmg, kind) { this.hazards.push({ x, y, r, warn, max: warn, dmg, kind: kind || 'fire' }); }
    bossAI(e, dt, nx, ny, d) {
      const p = this.player; const sp = e.speed * (1 - e.slow * 0.5);
      const walk = (mult) => { e.x += nx * sp * (mult || 1) * dt; e.y += ny * sp * (mult || 1) * dt; };
      e.t -= dt; e.t2 -= dt; e.t3 -= dt; e.t4 -= dt;
      const frac = e.hp / e.maxHp; const nph = e.super ? (frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3) : (frac > 0.5 ? 1 : 2);
      if (nph !== e.phase) { e.phase = nph; this.bossPhase(e, nph); }
      const ph = e.phase; const bdmg = e.dmg * 0.32; const A = DS.Audio;
      const ring = (n, speed, off, col, shape) => { for (let i = 0; i < n; i++) { const a = off + i * TAU / n; this.eshot(e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, bdmg, col, 7, shape); } };
      const aimed = (n, spread, speed, col, shape) => { const a = Math.atan2(p.y - e.y, p.x - e.x); for (let i = 0; i < n; i++) { const aa = a + (i - (n - 1) / 2) * spread; this.eshot(e.x, e.y, Math.cos(aa) * speed, Math.sin(aa) * speed, bdmg, col, 7, shape); } };
      const summon = (n, elite) => {
        const pts = []; for (let i = 0; i < n; i++) { const a = i * TAU / n + Math.random(); pts.push({ x: p.x + Math.cos(a) * 250, y: p.y + Math.sin(a) * 250 }); }
        pts.forEach(q => this.teleCircle(q.x, q.y, 26, 0.8, '#60ff80')); A.play('summon');
        this.delayed.push({ t: 0.8, fn: () => { pts.forEach((q, i) => { this.spawnMonster(elite && i === 0 ? null : 'skeleton', { pos: q, elite: elite && i === 0 }); for (let k = 0; k < 8; k++) this.part(q.x, q.y, '#60ff80', { g: -150, add: true, size: 4 }); }); } });
      };
      const fireRain = (n, spread, r) => { for (let i = 0; i < n; i++) this.hazard(p.x + (i ? U.rand(-spread, spread) : p.vx * 0.35), p.y + (i ? U.rand(-spread, spread) : p.vy * 0.35), r, 1.2, e.dmg * 0.6, 'fire'); A.play('fire'); };
      const ringHaz = (R, n, gap, warn, kind) => { const g0 = Math.floor(Math.random() * n); for (let i = 0; i < n; i++) { if (gap && ((i - g0 + n) % n) < gap) continue; const a = i * TAU / n; this.hazard(p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, kind === 'spike' ? 22 : 34, warn, e.dmg * 0.6, kind); } A.play('warn'); };
      const lever = () => { e.state = 'lever'; e.t = 1.2; this.fx.push({ type: 'reels', follow: e, x: e.x, y: e.y, t: 0, dur: 1.2 }); A.play('lever'); };
      const spiral = (arms, speed, step) => { e.st = (e.st || 0) - dt; if (e.st <= 0) { e.st = 0.085; e.sa = (e.sa || 0) + step; for (let k = 0; k < arms; k++) { const a = e.sa + k * TAU / arms; this.eshot(e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, bdmg, '#ffd040', 7, 'coin'); } } };
      const charge = (o) => {
        const startWindup = (w) => { e.state = 'windup'; e.t = w; const lead = 0.25; e.ang = Math.atan2(p.y + p.vy * lead - e.y, p.x + p.vx * lead - e.x); this.teleLine(e, e.ang, o.speed * o.dur + e.r, e.r * 1.5, w, o.col); A.play('roar'); };
        if (e.state === 'walk') { walk(); if (e.t <= 0) { e.chainLeft = o.chain || 0; startWindup(o.windup); } }
        else if (e.state === 'windup') { if (Math.random() < 0.5) this.part(e.x + U.rand(-e.r, e.r), e.y + e.r * 0.8, '#a08060', { vy: -60, g: 100, life: 0.4 }); if (e.t <= 0) { e.state = 'charge'; e.t = o.dur; e.lsx = e.x; e.lsy = e.y; A.play('charge'); this.shake = Math.max(this.shake, 6); } }
        else if (e.state === 'charge') {
          e.x += Math.cos(e.ang) * o.speed * dt; e.y += Math.sin(e.ang) * o.speed * dt;
          for (let i = 0; i < 2; i++) this.part(e.x - Math.cos(e.ang) * e.r, e.y + e.r * 0.7, '#c0a080', { vx: U.rand(-60, 60), vy: U.rand(-80, 0), life: 0.5, size: 4 });
          if (o.spikes && U.dist(e.x, e.y, e.lsx, e.lsy) >= 34) {
            const px = -Math.sin(e.ang), py = Math.cos(e.ang); const side = (e.n2 = (e.n2 || 0) + 1) % 2 ? 1 : -1;
            this.addWall(e.x - Math.cos(e.ang) * e.r * 0.4 + px * side * e.r * 0.55, e.y - Math.sin(e.ang) * e.r * 0.4 + py * side * e.r * 0.55, e.dmg * 0.35, o.wallCol);
            e.lsx = e.x; e.lsy = e.y; A.play('spikes');
          }
          if (e.t <= 0) { e.state = 'recover'; e.t = 0.55; e.n++; this.ring(e.x, e.y, 90, '#c0a080', 0.4); }
        } else if (e.state === 'recover') { if (e.t <= 0) { if (e.chainLeft > 0) { e.chainLeft--; startWindup(o.windup * 0.6); } else { e.state = 'walk'; e.t = o.rest; } } }
      };
      switch (e.ai) {
        case 'charger': // Bull Market Minotaur: telegraphed charges leaving 10s spike walls; P2 chains 3 charges + stampede spike ring
          charge({ speed: 640, dur: 0.85, windup: ph === 1 ? 1.0 : 0.85, chain: ph === 1 ? 0 : 1, rest: ph === 1 ? 2.6 : 2.4, spikes: true });
          if (ph >= 2 && e.t4 <= 0 && e.state === 'walk') { e.t4 = 8; ringHaz(170, 16, 3, 1.1, 'spike'); this.text(e.x, e.y - e.r - 20, 'STAMPEDE!', '#ff4040', 16, true); }
          break;
        case 'ringer': // One-Armed Bandit Golem: coin rings; P2 lever-pull jackpot (coin rain + spiral)
          if (e.state === 'lever') { if (e.t <= 0) { e.state = 'walk'; for (let i = 0; i < 10; i++) this.hazard(p.x + U.rand(-220, 220), p.y + U.rand(-220, 220), 48, 0.9, e.dmg * 0.6, 'coin'); e.spiral = 2.5; A.play('jackpot'); } break; }
          walk();
          if (e.t2 <= 0) { e.n++; ring(ph === 1 ? 16 : 20, 170, e.n * 0.2, '#ffd040', 'coin'); if (e.n % 3 === 0) ring(16, 120, e.n * 0.2 + 0.2, '#ffd040', 'coin'); e.t2 = ph === 1 ? 2.3 : 1.8; A.play('coins'); }
          if (ph >= 2 && e.t4 <= 0) { e.t4 = 7; lever(); }
          if (e.spiral > 0) { e.spiral -= dt; spiral(2, 210, 0.35); }
          break;
        case 'summoner': // Repo Lich: telegraphed summons + bolts; P2 bone-spike ring + blink away
          if (d < 280) walk(-1); else if (d > 380) walk(1);
          if (e.t2 <= 0) { summon(ph === 1 ? 6 : 8); e.t2 = ph === 1 ? 5.5 : 4.5; }
          if (e.t3 <= 0) { aimed(ph === 1 ? 3 : 5, 0.2, 230, '#80ff80'); e.t3 = 2; A.play('zap'); }
          if (ph >= 2 && e.t4 <= 0) { e.t4 = 6; ringHaz(115, 12, 2, 1.0, 'bone'); }
          if (e.tpT > 0) e.tpT -= dt;
          if (ph >= 2 && d < 170 && !(e.tpT > 0)) { e.tpT = 4; this.bossTeleport(e, 330, 0.5); }
          break;
        case 'hazard': // Hot Dog Wyrm: fire puddles; P2 telegraphed fire-breath cone
          if (e.state === 'breathwind') { if (e.t <= 0) { e.state = 'breath'; e.t = 1.3; A.play('breath'); } break; }
          if (e.state === 'breath') { e.bt = (e.bt || 0) - dt; if (e.bt <= 0) { e.bt = 0.045; const a = e.ang + U.rand(-0.3, 0.3); this.eshot(e.x, e.y, Math.cos(a) * 340, Math.sin(a) * 340, bdmg * 0.7, '#ff7020', 8, 'fire'); } if (e.t <= 0) e.state = 'walk'; break; }
          walk();
          if (e.t2 <= 0) { fireRain(ph === 1 ? 5 : 7, 200, 55); e.t2 = ph === 1 ? 3 : 2.4; }
          if (ph >= 2 && e.t4 <= 0) { e.t4 = 6.5; e.state = 'breathwind'; e.t = 0.9; e.ang = Math.atan2(p.y - e.y, p.x - e.x); this.teleCone(e, e.ang, 0.32, 420, 0.9); A.play('roar'); }
          break;
        case 'gunner': // Pit Boss: telegraphed teleports + card spreads; P2 double card rings
          walk(0.6);
          if (e.t2 <= 0) { this.bossTeleport(e, 260, 0.6); e.t2 = 6; e.t3 = 1.2; }
          if (e.t3 <= 0) { aimed(ph === 1 ? 5 : 7, 0.15, 250, '#f0f0e0', 'card'); e.t3 = ph === 1 ? 1.6 : 1.3; A.play('cards'); }
          if (ph >= 2 && e.t4 <= 0) { e.t4 = 6.5; e.t3 = Math.max(e.t3, 1.2); ring(14, 170, 0, '#f0f0e0', 'card'); this.delayed.push({ t: 0.35, fn: () => { if (!e.dead) ring(14, 170, 0.22, '#ff4040', 'card'); } }); A.play('cards'); }
          break;
        case 'house': // SUPER: rings + summons/fire; P2 lever jackpot; P3 roulette streams
          if (e.state === 'lever') { if (e.t <= 0) { e.state = 'walk'; for (let i = 0; i < 14; i++) this.hazard(p.x + U.rand(-260, 260), p.y + U.rand(-260, 260), 55, 0.9, e.dmg * 0.6, 'coin'); e.spiral = 3; A.play('jackpot'); } break; }
          walk(ph === 3 ? 1.3 : 1);
          if (e.t2 <= 0) { e.n++; ring(22, 160, e.n * 0.17, '#ffd040', 'coin'); if (e.n % 2) ring(22, 110, e.n * 0.17 + 0.14, '#ff3030'); e.t2 = ph === 3 ? 1.3 : 1.8; A.play('coins'); }
          if (e.t3 <= 0) { if (e.n % 2) summon(8, true); else fireRain(8, 260, 65); e.t3 = 5; }
          if (ph >= 2 && e.t4 <= 0) { e.t4 = 7; lever(); }
          if (e.spiral > 0) { e.spiral -= dt; spiral(3, 220, 0.3); }
          if (ph === 3) { e.rt = (e.rt || 0) - dt; e.ra = (e.ra || 0) + dt * 0.9; if (e.rt <= 0) { e.rt = 0.12; for (let k = 0; k < 4; k++) { const a = e.ra + k * TAU / 4; this.eshot(e.x, e.y, Math.cos(a) * 260, Math.sin(a) * 260, bdmg, k % 2 ? '#ff3030' : '#303030', 8); } if (Math.random() < 0.05) A.play('super'); } }
          break;
        case 'taxman': // SUPER: red-tape charges + spiral; P2 summons + fire; P3 closing tax-bracket rings
          charge({ speed: 700, dur: 0.6, windup: 0.8, chain: ph >= 2 ? 2 : 0, rest: 2.4, spikes: true, col: '#ff3030', wallCol: 'red' });
          e.ang2 = (e.ang2 || 0) + dt * (ph === 3 ? 3 : 2.2);
          if (e.t2 <= 0) { const arms = ph === 3 ? 4 : 3; for (let i = 0; i < arms; i++) { const a = e.ang2 + i * TAU / arms; this.eshot(e.x, e.y, Math.cos(a) * 200, Math.sin(a) * 200, bdmg, '#30ff60', 7, 'coin'); } e.t2 = ph === 3 ? 0.1 : 0.16; }
          if (ph >= 2 && e.t3 <= 0) { summon(6, true); fireRain(7, 240, 60); e.t3 = 6; }
          if (ph >= 3 && e.t4 <= 0) { e.t4 = 7; ringHaz(230, 18, 3, 1.0, 'bone'); this.delayed.push({ t: 0.4, fn: () => ringHaz(160, 14, 3, 1.0, 'bone') }); this.delayed.push({ t: 0.8, fn: () => ringHaz(95, 10, 2, 1.0, 'bone') }); this.banner('TAX BRACKET CLOSING IN!', '#30ff60'); A.play('super'); }
          break;
      }
    }
    bossTeleport(e, dist, delay) {
      const a = Math.random() * TAU; const p = this.player; const tx = p.x + Math.cos(a) * dist, ty = p.y + Math.sin(a) * dist;
      this.teleCircle(tx, ty, e.r * 1.2, delay, '#c060ff'); DS.Audio.play('teleport');
      for (let i = 0; i < 16; i++) this.part(e.x, e.y, '#c060ff', { add: true, size: 5, g: -60 });
      this.delayed.push({ t: delay, fn: () => { if (e.dead) return; e.x = tx; e.y = ty; this.ring(tx, ty, e.r * 2, '#c060ff', 0.4, true); for (let i = 0; i < 16; i++) this.part(tx, ty, '#c060ff', { add: true, size: 5, g: -60 }); } });
    }
    eshot(x, y, vx, vy, dmg, col, r, shape) { this.eproj.push({ x, y, vx, vy, dmg, col, r: r || 6, life: 6, shape, rot: Math.atan2(vy, vx) }); }

    // ---------------- damage ----------------
    hit(e, base, o) {
      if (e.dead) return 0; o = o || {};
      let dmg = base * (o.noBuff ? 1 : this.buffDmg()); let crit = false;
      if (!o.noCrit && Math.random() < this.st.crit + (o.critBonus || 0)) { dmg *= this.st.critMult; crit = true; }
      if (o.jackpot) dmg *= 7;
      e.hp -= dmg; e.flash = 0.08; this.dmgDealt += dmg;
      if (o.knock && !e.boss) { let kx = o.kx, ky = o.ky; if (kx === undefined) { const dx = e.x - this.player.x, dy = e.y - this.player.y, l = Math.hypot(dx, dy) || 1; kx = dx / l; ky = dy / l; } const kb = o.knock * (e.elite ? 2 : 6); e.kbx += kx * kb; e.kby += ky * kb; }
      if (o.burn) e.burn = { dps: o.burn.dps * this.st.dmgMult, t: o.burn.dur, tick: 0.5 };
      if (o.slow) { e.slow = Math.max(e.slow, o.slow * (e.boss ? 0.5 : 1)); e.slowT = 0.6; }
      if (o.stun) e.stun = Math.max(e.stun, e.boss ? o.stun * 0.25 : o.stun);
      if (DS.save.options.dmgNumbers && (!o.quiet || crit) && this.texts.length < 90) this.text(e.x + U.rand(-8, 8), e.y - e.r - 6, Math.round(dmg), crit ? '#ffd040' : (o.col || '#ffffff'), crit ? 15 : 11, crit);
      if (!o.quiet) { DS.Audio.play('hit'); for (let i = 0; i < (crit ? 6 : 2); i++) this.part(e.x, e.y, crit ? '#ffd040' : (o.col || '#ffffff'), { size: crit ? 4 : 3, add: true, life: 0.25, g: 0 }); }
      if (crit && this.st.flags.jackpot && !o.fromJackpot && Math.random() < 0.07) {
        this.text(e.x, e.y - 30, 'JACKPOT 777!', '#ffd040', 18, true); DS.Audio.play('jackpot');
        this.explode(e.x, e.y, 90, base * 7.77, { fromJackpot: true, noCrit: true, col: '#ffd040' });
      }
      if (o.goldChance && Math.random() < o.goldChance) this.drop('coin', e.x, e.y, 1);
      if (e.hp <= 0) this.kill(e);
      return dmg;
    }
    kill(e) {
      e.dead = true; this.kills++;
      for (let i = 0; i < (e.boss ? 60 : e.elite ? 16 : 4); i++) this.part(e.x, e.y, e.boss ? U.choose(['#ffd040', '#ff4040', '#ffffff']) : e.elite ? '#ffd040' : '#a03050', { size: e.boss ? 5 : 3, add: !!(e.boss || e.elite) });
      if (this.decals.length < 80) this.decals.push({ x: e.x, y: e.y + e.r * 0.5, r: e.r * (e.boss ? 1.4 : 0.8), life: e.boss ? 20 : 6, max: e.boss ? 20 : 6, col: e.boss ? '#400010' : '#300818' });
      if (e.boss) {
        this.bossKills++; if (e.super) this.superKills++;
        this.drop('coin', e.x, e.y, e.super ? 150 : 25); this.drop('food', e.x + 20, e.y); this.drop('vacuum', e.x - 20, e.y);
        this.drop('xp', e.x, e.y + 20, 60 * (1 + 0.5 * (this.tier() - 1)));
        this.banner((e.super ? 'SUPER BOSS SLAIN: ' : 'BOSS SLAIN: ') + e.name, '#ffd040');
        if (e.jackpot) { if (this.level < DS.RUN_MAX_LEVEL) { this.levelUp(true); this.text(this.player.x, this.player.y - 60, 'JACKPOT! +1 LEVEL & DOUBLE PICK', '#ffd040', 18, true); } else { this.goldRun += 10; } }
        this.shake = 18; DS.Audio.play('bossdeath'); this.flash = { col: '#ffffff', t: 0.45, max: 0.45 };
        this.ring(e.x, e.y, 260, '#ffd040', 0.7, true); this.ring(e.x, e.y, 160, '#ffffff', 0.5); this.fx.push({ type: 'rays', x: e.x, y: e.y, t: 0, dur: 1.2, col: '#ffd040' });
        if (!this.enemies.some(o => o.boss && !o.dead)) { this.bossBar = null; if (DS.Audio.ctx) DS.Audio.playTrack('run'); }
        else this.bossBar = this.enemies.find(o => o.boss && !o.dead);
        return;
      }
      DS.Audio.play('kill');
      if (e.elite) { this.elites++; this.drop('xp', e.x, e.y, e.xp, true); this.drop('coin', e.x + 10, e.y, 5); if (Math.random() < 0.3) this.drop('food', e.x - 10, e.y); }
      else { this.drop('xp', e.x, e.y, e.xp); if (Math.random() < 0.02) this.drop('coin', e.x + 6, e.y, 1); if (Math.random() < 0.002) this.drop('food', e.x, e.y + 8); }
    }
    explode(x, y, r, dmg, o) {
      o = o || {}; const list = this.grid.query(x, y, r + 40);
      for (const e of list) if (!e.dead && U.dist2(x, y, e.x, e.y) < (r + e.r) * (r + e.r)) this.hit(e, dmg, Object.assign({ quiet: list.length > 6 }, o));
      this.ring(x, y, r, o.col || '#ffb040', 0.3, true);
      if (this.parts.length < 300) for (let i = 0; i < 8; i++) this.part(x, y, o.col || '#ffb040', { size: 4, add: true, life: 0.4, sp: r * 4 });
      DS.Audio.play('boom');
    }
    damagePlayer(amount, src) {
      const p = this.player;
      if (p.invuln > 0 || this.god || p.dash) return;
      amount = Math.max(1, amount - this.st.armor);
      if (p.buff && p.buff.dr) amount *= (1 - p.buff.dr);
      if (this.st.flags.gymMirror) { amount *= 0.5; if (src && !src.dead && src.hp) this.hit(src, amount * 3, { noCrit: true, quiet: true, noBuff: true }); }
      if (this.st.reflect > 0 && src && !src.dead && src.hp) this.hit(src, amount * this.st.reflect, { noCrit: true, quiet: true, col: '#c0e0ff', noBuff: true });
      if (p.shield > 0) { const a = Math.min(p.shield, amount); p.shield -= a; amount -= a; p.shieldT = 0; if (amount <= 0) { this.text(p.x, p.y - 30, 'BLOCKED', '#80c0ff', 11); return; } }
      p.hp -= amount; p.hurtT = 0.2; if (DS.save.options.shake) this.shake = Math.max(this.shake, 5);
      DS.Audio.play('hurt');
      if (p.hp <= 0 && this.st.flags.divine && !this.revived) {
        this.revived = true; p.hp = p.maxHp * 0.5; p.invuln = 2.5; this.flash = { col: '#ffffff', t: 0.5, max: 0.5 };
        this.banner('DEAL WITH THE DEVIL! Revived.', '#ff6020');
        this.explode(p.x, p.y, 300, this.autoDmg() * 10, { knock: 120, col: '#ffffff' });
      }
    }
    die() {
      if (this.over) return; this.over = true; this.player.hp = 0; DS.Audio.play('death');
      this.result = this.finish('died');
      if (DS.UI) DS.UI.showResults(this.result);
    }
    finish(reason) {
      const t = this.time, m = this.map, sv = DS.save; const cs = sv.chars[this.cid];
      const xp = Math.floor((t * 1 + this.kills * 0.2 + this.elites * 25 + this.bossKills * 100 + this.superKills * 500) * m.reward);
      const goldBase = Math.floor((this.kills / 10 + this.elites * 5 + this.bossKills * 25 + this.superKills * 150) * m.reward * this.st.goldMult);
      const gold = goldBase + Math.floor(this.goldRun);
      sv.gold += gold; const prevLvl = cs.level; const lv = DS.grantCharXp(this.cid, xp);
      cs.runs++; cs.bestTime = Math.max(cs.bestTime, t);
      sv.mapBest[this.mapIdx] = Math.max(sv.mapBest[this.mapIdx] || 0, t);
      let unlocked = null;
      if (t >= DS.MAP_UNLOCK_SECONDS && this.mapIdx + 1 === sv.mapsUnlocked && sv.mapsUnlocked < DS.MAPS.length) { sv.mapsUnlocked++; unlocked = DS.MAPS[this.mapIdx + 1].name; }
      sv.totals.runs++; sv.totals.kills += this.kills; sv.totals.gold += gold;
      DS.persist();
      return { reason, time: t, kills: this.kills, elites: this.elites, bosses: this.bossKills, supers: this.superKills, level: this.level, xp, gold, charLevelsGained: lv, charLevel: cs.level, prevLvl, unlocked, dmg: this.dmgDealt, char: this.ch.name, map: m.name };
    }

    // ---------------- player attacks ----------------
    fireMain() {
      const M = this.ch.main, st = this.st, a = this.targetAngle(this.mainRange()); const dmg = this.autoDmg();
      if (M.type === 'melee') {
        const n = 1 + st.amount;
        for (let i = 0; i < n; i++) this.melee(a + i * TAU / n, M.range * Math.sqrt(st.area), M.arc, dmg, { knock: 25, auto: true }, M.colors[0]);
      } else {
        const n = M.count + st.amount;
        for (let i = 0; i < n; i++) {
          const aa = a + (i - (n - 1) / 2) * M.spread;
          this.shoot(this.player.x, this.player.y, aa, { dmg, speed: M.speed, pierce: M.pierce + st.pierce, size: M.size, life: M.life, shape: M.shape, c1: M.colors[0], c2: M.colors[1], explode: M.explode ? M.explode * st.area : 0, explodeOnEnd: !!M.explode, knock: M.knock || 0, spin: M.shape === 'can' || M.shape === 'book' ? 10 : 0, glow: M.glow || M.colors[1], sparks: true });
        }
        for (let i = 0; i < 3; i++) this.part(this.player.x + Math.cos(a) * 16, this.player.y + Math.sin(a) * 16, M.glow || M.colors[1], { size: 3, add: true, life: 0.2, g: 0, vx: Math.cos(a) * 160 + U.rand(-40, 40), vy: Math.sin(a) * 160 + U.rand(-40, 40) });
      }
      DS.Audio.play(M.sfx);
    }
    shoot(x, y, ang, o) {
      const sp = o.speed;
      this.proj.push({ id: EID++, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, speed: sp, r: o.size * Math.sqrt(this.st.area), dmg: o.dmg, pierce: o.pierce, life: o.life, maxLife: o.life, shape: o.shape, c1: o.c1, c2: o.c2,
        hitSet: new Set(), boomerang: o.boomerang, returning: false, explode: o.explode || 0, explodeOnEnd: o.explodeOnEnd, trail: o.trail, trailT: 0, critBonus: o.critBonus || 0, knock: o.knock || 0, burn: o.burn, goldChance: o.goldChance, rot: ang, spin: o.spin || (o.boomerang ? 14 : 0), ang, glow: o.glow || o.c2, sparkT: 0, hist: [] });
    }
    melee(ang, range, arc, dmg, o, col) {
      const p = this.player; const list = this.grid.query(p.x, p.y, range + 40);
      for (const e of list) {
        if (e.dead) continue; const dx = e.x - p.x, dy = e.y - p.y; const d = Math.hypot(dx, dy);
        if (d > range + e.r) continue;
        if (arc < 6.2 && Math.abs(U.angleDiff(ang, Math.atan2(dy, dx))) > arc / 2 + 0.15) continue;
        this.hit(e, dmg, Object.assign({}, o, { quiet: list.length > 10 }));
      }
      this.fx.push({ type: 'slash', x: p.x, y: p.y, a: ang, arc, r: range, t: 0, dur: 0.22, col: col || '#fff' });
      for (let i = 0; i < 6; i++) { const aa = ang + U.rand(-arc / 2, arc / 2); this.part(p.x + Math.cos(aa) * range * 0.8, p.y + Math.sin(aa) * range * 0.8, col || '#fff', { size: 3, add: true, life: 0.3, g: 0, vx: Math.cos(aa) * 120, vy: Math.sin(aa) * 120 }); }
    }
    nearestEnemy(x, y, maxD, exclude) {
      let best = null, bd = maxD * maxD;
      const list = maxD < 600 ? this.grid.query(x, y, maxD) : this.enemies;
      for (const e of list) { if (e.dead || (exclude && exclude.has(e))) continue; const d = U.dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      return best;
    }
    visibleEnemies() { const p = this.player; return this.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < VW() / 2 && Math.abs(e.y - p.y) < VH() / 2); }

    // ---------------- generic ability engine ----------------
    runAbility(a, dt) {
      if (a.subs) { for (const s of a.subs) this.runAbility(s, dt); return; }
      const P = a.p, st = this.st, p = this.player, def = a.def; const type = def.type;
      const dmg = (P.dmg || 0) * st.dmgMult; const area = st.area;
      a.t = (a.t || 0) - dt;
      switch (type) {
        case 'projectile': if (a.t <= 0) {
          a.t = P.cd * st.abCd; const n = P.count + st.amount;
          let base;
          if (P.aim === 'radial') base = (a.spin = (a.spin || 0) + 0.3);
          else base = this.targetAngle(520);
          for (let i = 0; i < n; i++) {
            const ang = P.aim === 'radial' ? base + i * TAU / n : base + (i - (n - 1) / 2) * (P.spread || 0.15);
            this.shoot(p.x, p.y, ang, { dmg, speed: P.speed, pierce: P.pierce, size: P.size, life: P.life, shape: def.shape, c1: def.colors[0], c2: def.colors[1], boomerang: P.boomerang, trail: P.trail, critBonus: P.critBonus, knock: P.knock, goldChance: P.goldChance, burn: P.burn, glow: def.colors[1] });
          }
          DS.Audio.play('throw');
        } break;
        case 'lob': if (a.t <= 0) {
          a.t = P.cd * st.abCd; const n = P.count + st.amount; const vis = this.visibleEnemies().filter(e => U.dist(p.x, p.y, e.x, e.y) < P.range * 1.3);
          const pri = this.autoTarget(P.range * 1.3);
          for (let i = 0; i < n; i++) {
            let tx, ty; const t = (i === 0 && pri && (pri.boss || pri.elite)) ? pri : vis.length ? vis[Math.floor(Math.random() * vis.length)] : null;
            if (t) { tx = t.x; ty = t.y; } else { const ang = Math.random() * TAU, dd = U.rand(80, P.range); tx = p.x + Math.cos(ang) * dd; ty = p.y + Math.sin(ang) * dd; }
            this.lobs.push({ x0: p.x, y0: p.y, tx, ty, t: 0, dur: P.flight + i * 0.05, dmg, r: P.radius * area, puddle: P.puddle, shape: def.shape, c1: def.colors[0], c2: def.colors[1] });
          }
        } break;
        case 'orbit': {
          const permanent = !P.dur;
          if (!permanent) {
            if (a.active === undefined) { a.active = true; a.at = P.dur; }
            a.at -= dt; if (a.at <= 0) { a.active = !a.active; a.at = a.active ? P.dur : P.cd * st.abCd; }
          } else a.active = true;
          a.rot = (a.rot || 0) + P.rot * dt;
          if (!a.active) { a.orbs = null; break; }
          const n = P.count + st.amount; const R = P.radius * area; const sz = P.size * Math.sqrt(area);
          a.orbs = [];
          for (let i = 0; i < n; i++) {
            const ang = a.rot + i * TAU / n; const ox = p.x + Math.cos(ang) * R, oy = p.y + Math.sin(ang) * R; a.orbs.push({ x: ox, y: oy, a: ang });
            if (Math.random() < 0.15) this.part(ox, oy, def.colors[1] || def.colors[0], { size: 3, add: true, life: 0.35, g: 0, sp: 30 });
            const list = this.grid.query(ox, oy, sz + 30);
            for (const e of list) {
              if (e.dead) continue; const rr = sz + e.r; if (U.dist2(ox, oy, e.x, e.y) > rr * rr) continue;
              if (this.time - (e.lh[def.id] || -9) < 0.4) continue; e.lh[def.id] = this.time;
              this.hit(e, dmg, { knock: P.knock, burn: P.burn, quiet: true });
              this.part(e.x, e.y, def.colors[0], { size: 4, add: true, life: 0.3 });
              if (P.healOnHit) p.hp = Math.min(p.maxHp, p.hp + P.healOnHit);
            }
          }
        } break;
        case 'aura': {
          a.tick = (a.tick || 0) - dt; const R = P.radius * area;
          if (P.pull) for (const e of this.grid.query(p.x, p.y, R)) { if (e.dead || e.boss) continue; const dx = p.x - e.x, dy = p.y - e.y, l = Math.hypot(dx, dy) || 1; if (l < R && l > 30) { e.x += dx / l * P.pull * dt; e.y += dy / l * P.pull * dt; } }
          if (Math.random() < 0.5) { const aa = Math.random() * TAU, rr = Math.sqrt(Math.random()) * R; this.part(p.x + Math.cos(aa) * rr, p.y + Math.sin(aa) * rr, def.colors[0], { size: 3, add: true, life: 0.6, g: -40, vx: 0, vy: -20 }); }
          if (a.tick <= 0) {
            a.tick = 0.4;
            for (const e of this.grid.query(p.x, p.y, R + 20)) { if (e.dead) continue; const rr = R + e.r; if (U.dist2(p.x, p.y, e.x, e.y) < rr * rr) this.hit(e, P.dps * st.dmgMult * 0.4, { slow: P.slow, quiet: true, noCrit: false, col: def.colors[0] }); }
          }
        } break;
        case 'nova': if (a.t <= 0) {
          a.t = P.cd * st.abCd; const R = P.radius * area;
          for (const e of this.grid.query(p.x, p.y, R + 30)) { if (e.dead) continue; const rr = R + e.r; if (U.dist2(p.x, p.y, e.x, e.y) < rr * rr) this.hit(e, dmg, { knock: P.knock, slow: P.slow, stun: P.stun, burn: P.burn, quiet: true }); }
          this.ring(p.x, p.y, R, def.colors[0], 0.4, true); this.ring(p.x, p.y, R * 0.7, def.colors[1] || '#fff', 0.3);
          this.fx.push({ type: 'glow', x: p.x, y: p.y, r: R * 0.8, t: 0, dur: 0.35, col: def.colors[0] });
          for (let i = 0; i < 24; i++) { const aa = i * TAU / 24; this.part(p.x + Math.cos(aa) * 20, p.y + Math.sin(aa) * 20, i % 2 ? def.colors[0] : (def.colors[1] || '#fff'), { size: 4, add: true, life: 0.45, g: 0, vx: Math.cos(aa) * R * 2, vy: Math.sin(aa) * R * 2 }); }
          DS.Audio.play('boom'); if (DS.save.options.shake) this.shake = Math.max(this.shake, 3);
        } break;
        case 'strike': if (a.t <= 0) {
          a.t = P.cd * st.abCd; const vis = U.shuffle(this.visibleEnemies()); const n = P.count + st.amount;
          const pri = this.autoTarget(600); if (pri && (pri.boss || pri.elite)) vis.unshift(pri);
          for (let i = 0; i < n; i++) {
            const t = vis[i % Math.max(1, vis.length)]; let tx, ty;
            if (t) { tx = t.x + U.rand(-6, 6); ty = t.y + U.rand(-6, 6); } else { tx = p.x + U.rand(-300, 300); ty = p.y + U.rand(-200, 200); }
            const R = P.radius * area; const jack = P.jackpot && Math.random() < P.jackpot;
            this.fx.push({ type: 'fall', x: tx, y: ty, t: 0, dur: 0.25 + i * 0.06, shape: def.shape, c1: def.colors[0], c2: def.colors[1] });
            this.delayed.push({ t: 0.25 + i * 0.06, fn: () => {
              if (jack) { this.text(tx, ty - 30, '777 JACKPOT!', '#ffd040', 16, true); DS.Audio.play('jackpot'); }
              this.explode(tx, ty, R, dmg, { jackpot: jack, stun: P.stun, burn: P.burn, col: def.colors[0] });
              this.fx.push({ type: 'cracks', x: tx, y: ty, r: R, t: 0, dur: 0.6, col: def.colors[0], seed: Math.random() * 99 });
              if (def.shape === 'bolt') { this.fx.push({ type: 'bolt', x: tx, y: ty, t: 0, dur: 0.2, col: def.colors[0] }); DS.Audio.play('zap'); }
            } });
          }
        } break;
        case 'chain': if (a.t <= 0) {
          a.t = P.cd * st.abCd; const n = P.count + st.amount;
          for (let b = 0; b < n; b++) {
            const hitSet = new Set(); let cx = p.x, cy = p.y; let d = dmg; const pts = [{ x: cx, y: cy }];
            let target = b === 0 ? (this.autoTarget(420) || null) : this.nearestEnemy(cx, cy, 420, null);
            if (target && U.dist(p.x, p.y, target.x, target.y) > 420) target = this.nearestEnemy(cx, cy, 420, null);
            if (b > 0 && target) { const alt = U.shuffle(this.visibleEnemies()).find(e => !e.dead); if (alt) target = alt; }
            for (let c = 0; c <= P.chains && target; c++) {
              hitSet.add(target); this.hit(target, d, { quiet: c > 2, col: def.colors[0] }); pts.push({ x: target.x, y: target.y });
              this.part(target.x, target.y, def.colors[0], { size: 4, add: true, life: 0.3 });
              if (P.healOnHit) p.hp = Math.min(p.maxHp, p.hp + P.healOnHit);
              d *= (P.grow || 1); cx = target.x; cy = target.y;
              target = this.nearestEnemy(cx, cy, P.range * area, hitSet);
            }
            if (pts.length > 1) this.fx.push({ type: 'chain', pts, t: 0, dur: 0.3, col: def.colors[0], col2: def.colors[1], shape: def.shape });
          }
          DS.Audio.play('zap');
        } break;
        case 'melee': if (a.t <= 0) {
          a.t = P.cd * st.abCd; const base = this.targetAngle(400);
          for (let i = 0; i < P.count; i++) this.melee(base + i * TAU / P.count, P.range * Math.sqrt(area), P.arc, dmg, { knock: 40 }, def.colors[0]);
          DS.Audio.play('slash');
        } break;
        // ----- secondaries -----
        case 'trail': if (p.moving || p.dash) {
          a.tt = (a.tt || 0) - dt;
          if (a.tt <= 0) {
            // denser drops (smaller interval, scaled dps) so the renderer can draw a continuous smear
            a.tt = P.interval * 0.55;
            const x = p.x + U.rand(-2, 2), y = p.y + 14;
            if (a.lx === undefined || U.dist(x, y, a.lx, a.ly) > 80) a.grp = (a.grp || 0) + 1;
            a.lx = x; a.ly = y; a.seq = (a.seq || 0) + 1;
            this.zones.push({ x, y, r: P.r * area, dps: P.dps * st.dmgMult * 0.55, life: P.life, max: P.life, col: P.color, slow: P.slow, tick: 0, tid: 'a' + def.id + '_' + a.grp, style: def.style || P.style || 'puddle', seq: a.seq, ph: Math.random() * 6 });
          }
        } else a.lx = undefined; break;
        case 'shield': break; // handled in updateShield
        case 'magnet': a.mt = (a.mt === undefined ? P.pulse : a.mt) - dt; if (a.mt <= 0) { a.mt = Math.max(8, P.pulse); this.vacuum(); } break;
        default: break; // stat/regen/thorns: passive via recalc
      }
    }
    updateShield(dt) {
      const p = this.player; if (p.shieldMax <= 0) return;
      let cd = 99; this.sec.forEach(s => { if (s.def.type === 'shield') cd = Math.min(cd, s.p.cd); });
      if (p.shield < p.shieldMax) { p.shieldT += dt; if (p.shieldT >= cd) { p.shield = p.shieldMax; p.shieldT = 0; this.text(p.x, p.y - 40, 'SHIELD UP', '#80c0ff', 11); this.ring(p.x, p.y, 40, '#80c0ff', 0.4); } }
    }
    updateSets(dt) {
      const f = this.st.flags, T = this.setTimers, p = this.player;
      if (f.dadMagnet) { T.magnet -= dt; if (T.magnet <= 0) { T.magnet = 20; this.vacuum(); this.banner('DAD MAGNET!', '#58c0e0'); } }
      if (f.kegerator) { T.keg -= dt; if (T.keg <= 0) { T.keg = 20; this.explode(p.x, p.y, 220 * this.st.area, this.autoDmg() * 5, { knock: 100, col: '#e0b030' }); p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.15); this.banner('KEGERATOR!', '#e0b030'); } }
      if (f.divine) { T.smite -= dt; if (T.smite <= 0) { T.smite = 20; for (const e of this.visibleEnemies()) { this.hit(e, this.autoDmg() * 3, { quiet: true, burn: { dps: this.ch.base.dmg, dur: 3 } }); this.fx.push({ type: 'bolt', x: e.x, y: e.y, t: 0, dur: 0.25, col: '#ff8040' }); } this.flash = { col: '#ff8040', t: 0.25, max: 0.25 }; DS.Audio.play('zap'); } }
    }
    vacuum() { for (const k of this.pickups) k.mag = true; this.ring(this.player.x, this.player.y, 400, '#80c0ff', 0.4); DS.Audio.play('pickup'); }

    // ---------------- special abilities (aimed at the mouse) ----------------
    useSpecial() {
      const p = this.player, st = this.st, id = this.ch.special.id; const mw = this.specialAim(); const ad = this.autoDmg();
      DS.Audio.play('special'); this.text(p.x, p.y - 50, this.ch.special.name.toUpperCase() + '!', this.ch.color, 15, true);
      switch (id) {
        case 'barrage': {
          const R = 140 * st.area;
          for (let i = 0; i < 30; i++) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * R; const tx = mw.x + Math.cos(a) * d, ty = mw.y + Math.sin(a) * d; const tt = i * 0.05;
            this.fx.push({ type: 'fall', x: tx, y: ty, t: -tt, dur: 0.25, shape: 'arrow', c1: '#d8c8a0', c2: '#8a5a2a', rot: Math.PI / 2 });
            this.delayed.push({ t: tt + 0.25, fn: () => this.explode(tx, ty, 32 * st.area, ad * 1.5, { quiet: true, col: '#d8c8a0' }) }); }
          this.ring(mw.x, mw.y, R, '#58c0e0', 1.5);
        } break;
        case 'roid_rage': p.buff = { t: 6, dmg: 2, rate: 1.5, dr: 0.7, col: '#ff3030' }; this.flash = { col: '#ff2020', t: 0.25, max: 0.25 }; this.ring(p.x, p.y, 120, '#ff3030', 0.5, true); break;
        case 'all_in': {
          const a = Math.atan2(mw.y - p.y, mw.x - p.x); p.dash = { vx: Math.cos(a) * 1100, vy: Math.sin(a) * 1100, t: 0.2 }; p.invuln = 0.45;
          this.delayed.push({ t: 0.2, fn: () => { for (let i = 0; i < 12; i++) this.shoot(p.x, p.y, i * TAU / 12, { dmg: ad * 2, speed: 700, pierce: 2, size: 6, life: 0.8, shape: 'dagger', c1: '#d0d8e0', c2: '#50e030', critBonus: 0.2 }); DS.Audio.play('throw'); } });
        } break;
        case 'kegger': this.lobs.push({ x0: p.x, y0: p.y, tx: mw.x, ty: mw.y, t: 0, dur: 0.6, dmg: ad * 6, r: 180 * st.area, knock: 120, puddle: { dps: ad * 0.8 / st.dmgMult, r: 150, life: 4, color: '#e0b030', slow: 0.5 }, shape: 'can', c1: '#8a5a2a', c2: '#c0c0c8', big: true }); break;
        case 'sermon': // Rite of Last Call: occult sigil, hellfire bolts, stun + burn
          for (const e of this.visibleEnemies()) { this.hit(e, ad * 4, { stun: 3, quiet: true, burn: { dps: ad * 0.6 / st.dmgMult, dur: 4 } }); if (Math.random() < 0.5) this.fx.push({ type: 'bolt', x: e.x, y: e.y, t: 0, dur: 0.3, col: '#ff6020' }); }
          this.flash = { col: '#ff6020', t: 0.5, max: 0.5 }; this.ring(p.x, p.y, 700, '#ff6020', 0.6); this.fx.push({ type: 'sigil', x: p.x, y: p.y, r: 160, t: 0, dur: 1.4, col: '#ff6020' });
          for (let i = 0; i < 40; i++) this.part(p.x + U.rand(-200, 200), p.y + U.rand(-120, 120), U.choose(['#ff6020', '#ffd040', '#ff2020']), { g: -160, size: 4, add: true, life: 1 });
          break;
      }
    }

    // ---------------- projectiles / lobs / zones ----------------
    updateProj(dt) {
      const p = this.player;
      for (let i = this.proj.length - 1; i >= 0; i--) {
        const b = this.proj[i]; let remove = false;
        b.life -= dt;
        if (b.boomerang) {
          if (!b.returning && b.life < b.maxLife * 0.5) { b.returning = true; b.hitSet.clear(); }
          if (b.returning) { const dx = p.x - b.x, dy = p.y - b.y, l = Math.hypot(dx, dy) || 1; b.vx = dx / l * b.speed * 1.2; b.vy = dy / l * b.speed * 1.2; if (l < 24) remove = true; }
          else { b.vx *= Math.pow(0.4, dt); b.vy *= Math.pow(0.4, dt); }
        }
        b.hist.push(b.x, b.y); if (b.hist.length > 10) b.hist.splice(0, 2);
        b.x += b.vx * dt; b.y += b.vy * dt; b.rot = b.spin ? b.rot + b.spin * dt : Math.atan2(b.vy, b.vx);
        b.sparkT -= dt; if (b.sparkT <= 0 && this.parts.length < (DS.lowFx ? 90 : 330)) { b.sparkT = DS.lowFx ? 0.15 : 0.06; this.part(b.x, b.y, b.glow || b.c1, { size: 2.5, add: true, life: 0.3, g: 0, sp: 30 }); }
        if (b.trail) { b.trailT -= dt; if (b.trailT <= 0) { b.trailT = 0.06; this.zones.push({ x: b.x, y: b.y, r: b.trail.r * this.st.area, dps: b.trail.dps * this.st.dmgMult * 0.6, life: b.trail.life, max: b.trail.life, col: b.trail.color, slow: b.trail.slow, tick: 0, tid: 'p' + b.id, style: b.trail.style || 'puddle', seq: (b.tseq = (b.tseq || 0) + 1), ph: Math.random() * 6 }); } }
        const list = this.grid.query(b.x, b.y, b.r + 40);
        for (const e of list) {
          if (e.dead || b.hitSet.has(e)) continue; const rr = b.r + e.r; if (U.dist2(b.x, b.y, e.x, e.y) > rr * rr) continue;
          if (b.explode) { this.explode(b.x, b.y, b.explode, b.dmg, { critBonus: b.critBonus, knock: b.knock, col: b.c2 }); remove = true; b.exploded = true; break; }
          b.hitSet.add(e); const l = Math.hypot(b.vx, b.vy) || 1;
          this.hit(e, b.dmg, { critBonus: b.critBonus, knock: b.knock, kx: b.vx / l, ky: b.vy / l, burn: b.burn, goldChance: b.goldChance, col: b.glow });
          if (b.pierce >= 0) { b.pierce--; if (b.pierce < 0) { remove = true; break; } }
        }
        if (b.life <= 0 && !b.boomerang) { remove = true; if (b.explodeOnEnd && !b.exploded) this.explode(b.x, b.y, b.explode, b.dmg, { col: b.c2 }); }
        if (b.life < -3) remove = true;
        if (remove) this.proj.splice(i, 1);
      }
      if (this.proj.length > 600) this.proj.splice(0, this.proj.length - 600);
    }
    updateLobs(dt) {
      for (let i = this.lobs.length - 1; i >= 0; i--) {
        const l = this.lobs[i]; l.t += dt;
        if (Math.random() < 0.5) { const k = Math.min(1, l.t / l.dur); this.part(U.lerp(l.x0, l.tx, k), U.lerp(l.y0, l.ty, k) - Math.sin(k * Math.PI) * 120, l.c2 || l.c1, { size: 3, add: true, life: 0.3, g: 0, sp: 20 }); }
        if (l.t >= l.dur) {
          this.lobs.splice(i, 1);
          this.explode(l.tx, l.ty, l.r, l.dmg, { knock: l.knock || 20, col: l.c1 });
          this.fx.push({ type: 'cracks', x: l.tx, y: l.ty, r: l.r, t: 0, dur: 0.5, col: l.c1, seed: Math.random() * 99 });
          if (l.big && DS.save.options.shake) this.shake = 12;
          if (l.puddle) { const pd = l.puddle; const R = pd.r * this.st.area; this.zones.push({ x: l.tx, y: l.ty, r: R, dps: pd.dps * this.st.dmgMult, life: pd.life, max: pd.life, col: pd.color, slow: pd.slow, tick: 0, style: pd.style || 'puddle', ph: Math.random() * 6 }); }
        }
      }
    }
    updateZones(dt) {
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i]; z.life -= dt; z.tick -= dt;
        if (z.tick <= 0) { z.tick = 0.4; for (const e of this.grid.query(z.x, z.y, z.r + 30)) { if (e.dead) continue; const rr = z.r + e.r * 0.7; if (U.dist2(z.x, z.y, e.x, e.y) < rr * rr) this.hit(e, z.dps * 0.4, { noCrit: true, quiet: true, slow: z.slow, noBuff: false, col: '#ffb060' }); } }
        if (z.style === 'goo' && Math.random() < dt * 2 && this.parts.length < 300) this.part(z.x + U.rand(-z.r, z.r) * 0.5, z.y - 4, U.choose(['#ff8030', '#ffb040', '#ff5020']), { g: -90, size: 2.5, add: true, life: 0.4, sp: 10 });
        if (z.life <= 0) this.zones.splice(i, 1);
      }
      if (this.zones.length > 420) this.zones.splice(0, this.zones.length - 420);
      const p = this.player;
      for (let i = this.ezones.length - 1; i >= 0; i--) {
        const z = this.ezones[i]; z.life -= dt; z.tick -= dt;
        if (Math.random() < dt * 6) this.part(z.x + U.rand(-z.r, z.r) * 0.7, z.y + U.rand(-z.r, z.r) * 0.5, U.choose(['#ff6020', '#ffb040']), { g: -140, size: 3, add: true, life: 0.5, sp: 10 });
        if (z.tick <= 0 && U.dist2(p.x, p.y, z.x, z.y) < z.r * z.r) { z.tick = 0.5; this.damagePlayer(z.dps * 0.5, null); }
        if (z.life <= 0) this.ezones.splice(i, 1);
      }
    }
    updateEnemyProj(dt) {
      const p = this.player;
      for (let i = this.eproj.length - 1; i >= 0; i--) {
        const b = this.eproj[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.rot += dt * (b.shape === 'card' ? 12 : 0);
        const rr = b.r + p.r * 0.7;
        if (U.dist2(b.x, b.y, p.x, p.y) < rr * rr) { this.damagePlayer(b.dmg, null); this.eproj.splice(i, 1); continue; }
        if (b.life <= 0) this.eproj.splice(i, 1);
      }
      if (this.eproj.length > 500) this.eproj.splice(0, this.eproj.length - 500);
    }
    updateHazards(dt) {
      const p = this.player;
      for (let i = this.hazards.length - 1; i >= 0; i--) {
        const h = this.hazards[i]; h.warn -= dt;
        if (h.warn <= 0) {
          this.hazards.splice(i, 1);
          if (U.dist2(p.x, p.y, h.x, h.y) < (h.r + p.r) * (h.r + p.r)) this.damagePlayer(h.dmg, null);
          if (h.kind === 'spike') { // stalagmite eruption: blocks movement for a while
            this.addWall(h.x, h.y, h.dmg * 0.6); this.walls[this.walls.length - 1].life = this.walls[this.walls.length - 1].max = 6;
            for (let k = 0; k < 6; k++) this.part(h.x, h.y, '#a08060', { vy: -200, size: 4 }); DS.Audio.play('spikes');
          } else if (h.kind === 'bone') {
            this.ring(h.x, h.y, h.r, '#e0e0c0', 0.3, true); this.fx.push({ type: 'cracks', x: h.x, y: h.y, r: h.r, t: 0, dur: 0.6, col: '#e0e0c0', seed: Math.random() * 99 });
            for (let k = 0; k < 6; k++) this.part(h.x, h.y, '#f0f0d0', { vy: -220, size: 4 }); DS.Audio.play('spikes');
          } else if (h.kind === 'coin') {
            this.ring(h.x, h.y, h.r, '#ffd040', 0.35, true);
            for (let k = 0; k < 10; k++) this.part(h.x, h.y, '#ffd040', { size: 4, add: true, vy: -260 }); DS.Audio.play('coins');
          } else {
            this.ring(h.x, h.y, h.r, '#ff6020', 0.3, true);
            this.ezones.push({ x: h.x, y: h.y, r: h.r * 0.8, dps: h.dmg * 0.3, life: 3, max: 3, tick: 0, ph: Math.random() * 6 });
            for (let k = 0; k < 10; k++) this.part(h.x, h.y, U.choose(['#ff8030', '#ffd040', '#ff3010']), { add: true, size: 4, g: -100 });
          }
        }
      }
    }
    drop(type, x, y, v, big) {
      if (type === 'xp' && this.pickups.length > 450) { const g = this.pickups.find(k => k.type === 'xp' && !k.mag); if (g) { g.v += v; return; } }
      this.pickups.push({ type, x: x + U.rand(-4, 4), y: y + U.rand(-4, 4), v: v || 0, big: !!big, mag: false, sp: 0, bob: Math.random() * 6 });
    }
    updatePickups(dt) {
      const p = this.player; const R = this.st.pickup;
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const k = this.pickups[i]; const dx = p.x - k.x, dy = p.y - k.y; const d2 = dx * dx + dy * dy;
        if (!k.mag && d2 < R * R) k.mag = true;
        if (k.mag) { k.sp = Math.min(900, k.sp + 1600 * dt); const d = Math.sqrt(d2) || 1; k.x += dx / d * k.sp * dt; k.y += dy / d * k.sp * dt;
          if (d < p.r + 8) { this.pickups.splice(i, 1); this.collect(k); } }
      }
    }
    collect(k) {
      const p = this.player;
      if (k.type === 'xp') { this.gainXp(k.v * this.st.xpMult); DS.Audio.play('pickup'); }
      else if (k.type === 'coin') { const g = k.v * this.st.goldMult; this.goldRun += g; this.text(p.x, p.y - 36, '+' + Math.round(g) + ' gold', '#ffd040', 12); DS.Audio.play('coin'); }
      else if (k.type === 'food') { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.25); this.text(p.x, p.y - 36, 'Gas Station Taquito! +25% HP', '#80ff80', 13); DS.Audio.play('select'); }
      else if (k.type === 'vacuum') { this.vacuum(); this.text(p.x, p.y - 36, 'SHOP-VAC!', '#80c0ff', 14); }
    }
    gainXp(v) {
      this.xp += v; let guard = 0;
      while (this.xp >= this.xpNeed() && guard++ < 60) { this.xp -= this.xpNeed(); this.levelUp(false); }
    }
    levelUp(double) {
      if (this.level >= DS.RUN_MAX_LEVEL) { this.overLevels++; const g = 5; this.goldRun += g; this.text(this.player.x, this.player.y - 50, 'MAX LEVEL: +5 GOLD', '#ffd040', 14, true); DS.Audio.play('coin'); return; }
      this.level++; this.recalc(); this.pendingLU.push({ double: !!double }); DS.Audio.play('levelup');
      for (let i = 0; i < 20; i++) this.part(this.player.x, this.player.y, '#80c0ff', { add: true, size: 4, g: -100 });
      this.ring(this.player.x, this.player.y, 80, '#80c0ff', 0.4);
    }

    // ---------------- level-up choices ----------------
    superOffers() {
      const list = (DS.SUPERS && DS.SUPERS[this.cid]) || []; const out = [];
      for (const S of list) {
        if (this.prim.find(a => a.id === S.id)) continue;
        if (S.parts.every(pid => this.prim.find(a => a.id === pid && a.evolved))) out.push({ kind: 'super', id: S.id, def: S, lvl: 1, partDefs: S.parts.map(pid => DS.ABILITIES[pid]) });
      }
      return out;
    }
    buildOffers(double) {
      const ch = this.ch; const owned = (id) => this.prim.find(a => a.id === id || a.from === id) || this.sec.find(a => a.id === id);
      const evos = [], primUp = [], secUp = [];
      const slotFree = this.prim.length < (DS.PRIMARY_SLOTS || 99);
      const merged = new Set(); this.prim.forEach(a => { if (a.origins) a.origins.forEach(x => merged.add(x)); });
      ch.primaries.forEach(id => {
        const def = DS.ABILITIES[id]; const o = this.prim.find(a => a.from === id || a.id === id);
        if (merged.has(id)) return;
        if (!o) { if (slotFree) primUp.push({ kind: 'new', id, def, lvl: 1 }); }
        else if (!o.evolved && o.level < 4) primUp.push({ kind: 'up', id, def, lvl: o.level + 1 });
        else if (!o.evolved && o.level >= 4 && def.evo && owned(def.evo.with)) evos.push({ kind: 'evo', id: def.evo.into, from: id, def: DS.ABILITIES[def.evo.into], lvl: 1, withDef: DS.ABILITIES[def.evo.with] });
      });
      ch.secondaries.forEach(id => { const def = DS.ABILITIES[id]; const o = this.sec.find(a => a.id === id); if (!o) secUp.push({ kind: 'new', id, def, lvl: 1 }); else if (o.level < 4) secUp.push({ kind: 'up', id, def, lvl: o.level + 1 }); });
      U.shuffle(primUp); U.shuffle(secUp);
      const nP = 2, nS = double ? 2 : 1;
      const primOpts = this.superOffers().concat(evos, primUp);
      const out = primOpts.slice(0, nP); const rest = primOpts.slice(nP);
      out.push(...secUp.slice(0, nS)); const restS = secUp.slice(nS);
      const total = nP + nS; const leftovers = rest.concat(restS);
      while (out.length < total && leftovers.length) out.push(leftovers.shift());
      if (out.length === 0) return [{ kind: 'gold', name: '+2 Gold', desc: 'Take the money and run.' }, { kind: 'heal', name: 'Heal 25% HP', desc: 'A gas station taquito. Probably fine.' }];
      if (out.length < total) { out.push({ kind: 'gold', name: '+2 Gold', desc: 'Take the money and run.' }); if (out.length < total) out.push({ kind: 'heal', name: 'Heal 25% HP', desc: 'A gas station taquito. Probably fine.' }); }
      return out;
    }
    openLevelUp() {
      const lu = this.pendingLU.shift();
      this.modal = { double: lu.double, picks: lu.double ? 2 : 1, offers: this.buildOffers(lu.double) };
      if (DS.UI) DS.UI.showLevelUp(this.modal, this);
    }
    choose(idx) {
      const m = this.modal; if (!m) return; const o = m.offers[idx]; if (!o || o.taken) return;
      o.taken = true; this.applyOffer(o); m.picks--;
      if (m.picks <= 0 || m.offers.every(x => x.taken)) { this.modal = null; if (DS.UI) DS.UI.hideLevelUp(); }
      else { m.offers = m.offers.map(x => x.taken ? x : x); if (DS.UI) DS.UI.showLevelUp(m, this); }
    }
    celebrate(col, big) {
      const p = this.player;
      this.flash = { col, t: big ? 0.6 : 0.35, max: big ? 0.6 : 0.35 }; if (DS.save.options.shake) this.shake = big ? 14 : 8;
      this.fx.push({ type: 'rays', x: p.x, y: p.y, t: 0, dur: big ? 1.6 : 1.0, col });
      this.ring(p.x, p.y, big ? 420 : 260, col, 0.6, true); this.ring(p.x, p.y, big ? 260 : 160, '#ffffff', 0.4);
      for (let i = 0; i < (big ? 80 : 40); i++) { const a = Math.random() * TAU, s = U.rand(100, big ? 500 : 320); this.part(p.x, p.y, U.choose([col, '#ffffff', '#ffd040']), { add: true, size: 5, life: 0.9, g: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s }); }
    }
    applyOffer(o) {
      const p = this.player;
      if (o.kind === 'gold') { this.goldRun += 2; DS.Audio.play('coin'); return; }
      if (o.kind === 'heal') { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.25); DS.Audio.play('select'); return; }
      if (o.kind === 'new') { const a = { id: o.id, def: o.def, level: 1, p: DS.abilityParams(o.def, 1), t: 0.3 }; (o.def.kind === 'secondary' ? this.sec : this.prim).push(a); }
      else if (o.kind === 'up') { const a = this.prim.concat(this.sec).find(x => x.id === o.id); a.level++; a.p = DS.abilityParams(a.def, a.level); }
      else if (o.kind === 'evo') {
        const a = this.prim.find(x => x.id === o.from); a.from = o.from; a.id = o.id; a.def = o.def; a.evolved = true; a.level = 4; a.p = DS.abilityParams(o.def, 1); a.t = 0; a.active = undefined;
        this.evolved[o.from] = true; this.banner('EVOLVED: ' + o.def.name + '!', '#ffd040'); DS.Audio.play('evolve'); this.celebrate('#ffd040', false);
      } else if (o.kind === 'super') {
        const S = o.def; const origins = [];
        const idx = this.prim.findIndex(x => x.id === S.parts[0]);
        const subs = S.parts.map(pid => {
          const old = this.prim.find(x => x.id === pid); if (old && old.from) origins.push(old.from);
          const def = DS.ABILITIES[pid]; return { id: pid, def, level: 1, evolved: true, p: scaleParams(DS.abilityParams(def, 1), S.mult || 1.75), t: 0.2 };
        });
        const fdef = Object.assign({ id: S.id + '_f', kind: 'primary' }, S.flourish);
        subs.push({ id: fdef.id, def: fdef, level: 1, p: JSON.parse(JSON.stringify(S.flourish.p)), t: 1, flourish: true });
        this.prim = this.prim.filter(x => S.parts.indexOf(x.id) < 0);
        const sup = { id: S.id, def: S, level: 4, evolved: true, isSuper: true, subs, origins: origins.concat(S.parts), p: {} };
        this.prim.splice(Math.max(0, Math.min(idx, this.prim.length)), 0, sup);
        this.banner('SUPER EVOLUTION: ' + S.name + '!', '#ff40ff'); DS.Audio.play('super'); DS.Audio.play('evolve');
        this.celebrate('#ff40ff', true);
        this.text(p.x, p.y - 70, 'SLOT FREED!', '#80ff80', 18, true);
      }
      DS.Audio.play('select');
      this.recalc();
    }

    // ---------------- fx helpers ----------------
    ring(x, y, r, col, dur, fill) { if (this.fx.length < (DS.lowFx ? 80 : 220)) this.fx.push({ type: 'ring', x, y, r, col, t: 0, dur: dur || 0.3, fill }); }
    part(x, y, col, o) {
      if (this.parts.length >= (DS.lowFx ? 150 : 420)) return; o = o || {};
      const sp = o.sp;
      const vx = o.vx !== undefined ? o.vx : sp !== undefined ? U.rand(-sp, sp) : U.rand(-140, 140);
      const vy = o.vy !== undefined ? o.vy : sp !== undefined ? U.rand(-sp, sp) : U.rand(-160, 60);
      const life = o.life !== undefined ? o.life * U.rand(0.7, 1.2) : U.rand(0.3, 0.7);
      this.parts.push({ x, y, vx, vy, life, max: life, col, g: o.g !== undefined ? o.g : 300, size: o.size || 3, add: !!o.add });
    }
    text(x, y, txt, col, size, bold) { this.texts.push({ x, y, txt: String(txt), col, size: size || 11, bold, t: 0 }); if (this.texts.length > 120) this.texts.shift(); }
    updateFx(dt) {
      for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt; if (f.follow) { f.x = f.follow.x; f.y = f.follow.y; } if (f.t >= f.dur) this.fx.splice(i, 1); }
      for (let i = this.parts.length - 1; i >= 0; i--) { const q = this.parts[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; q.vx *= Math.pow(0.3, dt); q.life -= dt; if (q.life <= 0) this.parts.splice(i, 1); }
      for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.t += dt; t.y -= 30 * dt; if (t.t > 0.9) this.texts.splice(i, 1); }
      for (let i = this.walls.length - 1; i >= 0; i--) { const w = this.walls[i]; w.age += dt; w.life -= dt; if (w.life <= 0) { for (let k = 0; k < 4; k++) this.part(w.x, w.y, '#806040', { size: 3 }); this.walls.splice(i, 1); } }
      for (let i = this.tele.length - 1; i >= 0; i--) { const t = this.tele[i]; t.t += dt; if (t.follow && !t.follow.dead) { t.x = t.follow.x; t.y = t.follow.y; } if (t.t >= t.dur || (t.follow && t.follow.dead)) this.tele.splice(i, 1); }
      for (let i = this.decals.length - 1; i >= 0; i--) { const d = this.decals[i]; d.life -= dt; if (d.life <= 0) this.decals.splice(i, 1); }
      if (this.bannerMsg) { this.bannerMsg.t -= dt; if (this.bannerMsg.t <= 0) this.bannerMsg = null; }
    }
  }
  function scaleParams(p, m) {
    if (p.dmg) p.dmg *= m; if (p.dps) p.dps *= m;
    if (p.trail && p.trail.dps) p.trail.dps *= m; if (p.burn && p.burn.dps) p.burn.dps *= m; if (p.puddle && p.puddle.dps) p.puddle.dps *= m;
    return p;
  }
  function makeVignette() {
    const c = DS.Spr.canvas(W, H); const x = c.getContext('2d');
    const g = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(5,0,15,0.75)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(0,0,0,0.08)'; for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
    return c;
  }
  DS.Game = Game;
})(window.DS);

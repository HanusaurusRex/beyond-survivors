// render.js - drawing the run (world + HUD) and the animated menu backdrop
'use strict';
(function (DS) {
  const U = DS.U, TAU = Math.PI * 2;
  let W = 1280, H = 720; // reassigned per pass: world-view size (world pass) or logical screen size (HUD)
  const R = {};
  R.font = (sz, bold) => (bold ? 'bold ' : '') + sz + 'px "Courier New", monospace';

  // cached radial glow sprites per color (drawn additively)
  const glowCache = {};
  function glowSpr(col) {
    if (glowCache[col]) return glowCache[col];
    const c = DS.Spr.canvas(64, 64); const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, col); g.addColorStop(0.35, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = 0.9; x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (glowCache[col] = c);
  }
  function glow(ctx, x, y, r, col, a) { ctx.globalAlpha = a; ctx.drawImage(glowSpr(col), x - r, y - r, r * 2, r * 2); }
  let trailLayer = null;

  R.drawGame = function (ctx, g) {
    const p = g.player, S = DS.Spr; const now = g.time;
    const Z = DS.ZOOM || 1, LW = DS.VW || 1280, LH = DS.VH || 720; W = LW / Z; H = LH / Z; const low = !!DS.lowFx;
    let sx = 0, sy = 0; if (g.shake > 0) { sx = U.rand(-g.shake, g.shake); sy = U.rand(-g.shake, g.shake); }
    const cx = Math.round(p.x - W / 2 + sx), cy = Math.round(p.y - H / 2 + sy);
    ctx.imageSmoothingEnabled = false;
    if (!g.pattern) g.pattern = ctx.createPattern(g.tile, 'repeat');
    ctx.save(); ctx.scale(Z, Z); ctx.translate(-cx, -cy); ctx.fillStyle = g.pattern; ctx.fillRect(cx, cy, W, H);
    // props (deterministic per cell)
    const P = g.map.pal, CS = 230;
    const i0 = Math.floor(cx / CS) - 1, i1 = Math.floor((cx + W) / CS) + 1, j0 = Math.floor(cy / CS) - 1, j1 = Math.floor((cy + H) / CS) + 2;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const h = U.hash2(i, j, g.mapIdx + 1); if (h > 0.26) continue;
      const kind = Math.floor(U.hash2(i, j, 99) * 6); const px = i * CS + U.hash2(i, j, 5) * 150, py = j * CS + U.hash2(i, j, 7) * 150;
      S.drawProp(ctx, kind, px, py, P, now, i * 31 + j);
    }
    // decals (blood/scorch)
    for (const d of g.decals) { ctx.globalAlpha = 0.5 * Math.min(1, d.life / d.max * 3); ctx.fillStyle = d.col; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.45, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(d.x + d.r * 0.7, d.y + 2, d.r * 0.3, d.r * 0.15, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    R.drawZones(ctx, g, now, cx, cy);
    // auras
    for (const a of g.allAbilities()) if (a.def.type === 'aura') {
      const r = a.p.radius * g.st.area; const c0 = a.def.colors[0];
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, p.x, p.y, r * 1.1, c0, 0.18 + Math.sin(now * 4) * 0.04); ctx.restore();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = c0; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -now * 30; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(p.x, p.y, r * (0.6 + 0.4 * ((now * 0.8) % 1)), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
    R.drawTele(ctx, g, now);
    R.drawHazards(ctx, g, now);
    // pickups
    for (const k of g.pickups) {
      const by = Math.sin(now * 5 + k.bob) * 2;
      if (k.type === 'xp') { const big = k.big || k.v > 15; const col = k.v >= 40 ? '#ff4060' : k.v >= 8 ? '#40ff80' : '#40a0ff'; const s = big ? 7 : 4;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(k.x, k.y - s * 1.4 + by); ctx.lineTo(k.x + s, k.y + by); ctx.lineTo(k.x, k.y + s * 1.4 + by); ctx.lineTo(k.x - s, k.y + by); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(k.x - 1, k.y - s * 0.6 + by, 2, 2); }
      else if (k.type === 'coin') { ctx.save(); ctx.translate(k.x, k.y + by); S.drawShape(ctx, 'coin', '#ffd040', '#c08010', k.v > 10 ? 9 : 6); ctx.restore(); }
      else if (k.type === 'food') { ctx.fillStyle = '#c08040'; ctx.fillRect(k.x - 9, k.y - 4 + by, 18, 8); ctx.fillStyle = '#e0a060'; ctx.fillRect(k.x - 7, k.y - 3 + by, 14, 3); ctx.fillStyle = '#40a040'; ctx.fillRect(k.x + 7, k.y - 3 + by, 3, 6); }
      else if (k.type === 'vacuum') { ctx.save(); ctx.translate(k.x, k.y + by); S.drawShape(ctx, 'magnet', '#ff3030', '#c0c0c0', 10); ctx.restore(); }
    }
    // shadows
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (const e of g.enemies) { ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.9, e.r * 0.9, e.r * 0.35, 0, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 26, 16, 6, 0, 0, TAU); ctx.fill();
    // target reticle (auto-aim)
    if (g.target && !g.target.dead) R.drawReticle(ctx, g.target, now);
    // enemies, spike walls + player sorted by y
    const list = g.enemies.slice(); list.push(p); for (const w of g.walls) list.push(w); list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (e === p) { R.drawPlayer(ctx, g, now); continue; }
      if (e.seed !== undefined && e.dmg !== undefined && e.age !== undefined) { R.drawWall(ctx, e, now); continue; }
      if (e.dead) continue;
      if (e.boss) { R.drawBoss(ctx, g, e, now); continue; }
      const sp = S.mon[e.sprite]; const left = p.x < e.x;
      let img = e.elite ? (left ? sp.ef : sp.e) : (left ? sp.nf : sp.n); if (e.flash > 0) img = sp.w;
      const sc = e.r / 12; const w = img.width * sc * 0.85, h = img.height * sc * 0.85;
      const bob = e.sprite === 'bat' || e.sprite === 'ghost' ? Math.sin(now * 8 + e.bob) * 3 : Math.abs(Math.sin(now * 6 + e.bob)) * -2;
      if (e.elite) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, e.x, e.y, e.r * 1.8, '#ffb020', 0.35 + Math.sin(now * 6) * 0.1); ctx.restore(); }
      if (e.burn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, e.x, e.y, e.r * 1.3, '#ff5010', 0.3); ctx.restore(); }
      ctx.globalAlpha = e.sprite === 'ghost' ? 0.75 : 1;
      ctx.drawImage(img, Math.round(e.x - w / 2), Math.round(e.y - h / 2 + bob), Math.round(w), Math.round(h));
      if (e.stun > 0) { ctx.fillStyle = '#ffff80'; for (let s = 0; s < 3; s++) { const a = now * 6 + s * TAU / 3; ctx.fillRect(e.x + Math.cos(a) * 10 - 1, e.y - e.r - 8 + Math.sin(a) * 3, 3, 3); } }
      ctx.globalAlpha = 1;
      if (e.elite) { ctx.fillStyle = '#300'; ctx.fillRect(e.x - 18, e.y - e.r - 12, 36, 4); ctx.fillStyle = '#ffd040'; ctx.fillRect(e.x - 18, e.y - e.r - 12, 36 * Math.max(0, e.hp / e.maxHp), 4); }
    }
    // cigarette smoke
    for (const s of g.smoke) { const k = s.life / s.max; ctx.globalAlpha = 0.35 * k; ctx.fillStyle = k > 0.7 ? '#e0e0e0' : '#a0a0a8'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    // lobs
    for (const l of g.lobs) { const k = Math.min(1, l.t / l.dur); const x = U.lerp(l.x0, l.tx, k), y = U.lerp(l.y0, l.ty, k) - Math.sin(k * Math.PI) * 90;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(U.lerp(l.x0, l.tx, k), U.lerp(l.y0, l.ty, k), 8, 3, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, l.big ? 34 : 22, l.c2 || l.c1, 0.4); ctx.restore();
      ctx.save(); ctx.translate(x, y); ctx.rotate(k * 8); S.drawShape(ctx, l.shape, l.c1, l.c2, l.big ? 16 : 10); ctx.restore();
      ctx.globalAlpha = 0.35 + 0.25 * k; ctx.strokeStyle = l.c1; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(l.tx, l.ty, l.r * (1.2 - 0.2 * k), 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    // projectiles: afterimage streak + additive glow + sprite
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of g.proj) {
      const hs = b.hist; if (hs.length >= 4 && !low) { ctx.strokeStyle = b.glow || b.c1; ctx.lineCap = 'round'; for (let i = 0; i < hs.length - 2; i += 2) { ctx.globalAlpha = 0.12 + 0.08 * i; ctx.lineWidth = b.r * (0.4 + 0.12 * i); ctx.beginPath(); ctx.moveTo(hs[i], hs[i + 1]); ctx.lineTo(i + 3 < hs.length ? hs[i + 2] : b.x, i + 3 < hs.length ? hs[i + 3] : b.y); ctx.stroke(); } }
      glow(ctx, b.x, b.y, b.r * 2.4, b.glow || b.c1, 0.45);
    }
    ctx.restore();
    for (const b of g.proj) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); S.drawShape(ctx, b.shape, b.c1, b.c2, b.r); ctx.restore(); }
    // orbitals with afterimage arcs
    const area = g.st.area;
    for (const a of g.allAbilities()) if (a.orbs) {
      const sz = a.p.size * Math.sqrt(area), R0 = a.p.radius * area, dir = a.p.rot >= 0 ? -1 : 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const o of a.orbs) { if (!low) for (let k = 1; k <= 5; k++) { const aa = o.a + dir * k * 0.09; glow(ctx, g.player.x + Math.cos(aa) * R0, g.player.y + Math.sin(aa) * R0, sz * (1.6 - k * 0.2), a.def.colors[1] || a.def.colors[0], 0.22 - k * 0.035); } glow(ctx, o.x, o.y, sz * 2, a.def.colors[0], 0.4); }
      ctx.restore();
      for (const o of a.orbs) { ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(a.def.shape === 'umbrella' ? 0 : o.a * 2); S.drawShape(ctx, a.def.shape, a.def.colors[0], a.def.colors[1], sz); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
    // fx
    for (const f of g.fx) R.drawFx(ctx, f, g);
    // particles
    for (const q of g.parts) { const k = Math.max(0, q.life / q.max); const s = q.size * (0.4 + 0.6 * k);
      if (q.add && !low) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, q.x, q.y, s * 2.2, q.col, 0.6 * k); ctx.restore(); }
      ctx.globalAlpha = Math.min(1, k * 1.5); ctx.fillStyle = q.col; ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s); }
    ctx.globalAlpha = 1;
    // enemy bullets on top
    for (const b of g.eproj) R.drawEProj(ctx, b, now);
    // special aim crosshair at the mouse
    const mw = g.specialAim(); ctx.globalAlpha = p.specialT <= 0 ? 0.8 : 0.35; ctx.strokeStyle = g.ch.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mw.x, mw.y, 9, 0, TAU); ctx.moveTo(mw.x - 14, mw.y); ctx.lineTo(mw.x - 5, mw.y); ctx.moveTo(mw.x + 5, mw.y); ctx.lineTo(mw.x + 14, mw.y); ctx.moveTo(mw.x, mw.y - 14); ctx.lineTo(mw.x, mw.y - 5); ctx.moveTo(mw.x, mw.y + 5); ctx.lineTo(mw.x, mw.y + 14); ctx.stroke(); ctx.globalAlpha = 1;
    // texts
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of g.texts) { ctx.globalAlpha = Math.max(0, 1 - t.t / 0.9); ctx.font = R.font(t.size, true); ctx.fillStyle = '#000'; ctx.fillText(t.txt, t.x + 1, t.y + 1); ctx.fillStyle = t.col; ctx.fillText(t.txt, t.x, t.y); }
    ctx.globalAlpha = 1;
    ctx.restore();
    W = LW; H = LH;
    // fog + vignette
    ctx.fillStyle = g.map.pal.fog; ctx.fillRect(0, 0, W, H);
    if (!low) ctx.drawImage(g.vignette, 0, 0, W, H);
    if (g.flash) { ctx.globalAlpha = Math.max(0, g.flash.t / g.flash.max) * 0.55; ctx.fillStyle = g.flash.col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (g.player.hurtT > 0) { ctx.globalAlpha = g.player.hurtT * 1.2; ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, W, 6); ctx.fillRect(0, H - 6, W, 6); ctx.fillRect(0, 0, 6, H); ctx.fillRect(W - 6, 0, 6, H); ctx.globalAlpha = 1; }
    R.drawHUD(ctx, g);
  };

  // ---------- ground zones: goopy connected trails, puddles, fire ----------
  R.drawZones = function (ctx, g, now, cx, cy) {
    const groups = {}; const loose = [];
    for (const z of g.zones) { if (z.tid) (groups[z.tid] || (groups[z.tid] = [])).push(z); else loose.push(z); }
    // smeared trails go on an offscreen layer so overlapping strokes don't double-darken
    if (!trailLayer || trailLayer.width !== Math.ceil(W) || trailLayer.height !== Math.ceil(H)) trailLayer = DS.Spr.canvas(Math.ceil(W), Math.ceil(H));
    const tl = trailLayer.getContext('2d'); tl.setTransform(1, 0, 0, 1, 0, 0); tl.clearRect(0, 0, W, H); tl.translate(-cx, -cy);
    let usedLayer = false; const gasLike = [];
    for (const tid in groups) {
      const zs = groups[tid]; zs.sort((a, b) => a.seq - b.seq);
      const style = zs[0].style;
      if (style === 'gas' || style === 'holy') { gasLike.push(zs); continue; }
      usedLayer = true; R.drawSmear(tl, zs, style, now);
    }
    if (usedLayer) { ctx.globalAlpha = 0.92; ctx.drawImage(trailLayer, cx, cy); ctx.globalAlpha = 1; }
    // flame flickers + bubbles on top (goo)
    if (!DS.lowFx) for (const tid in groups) { const zs = groups[tid]; if (zs[0].style !== 'goo') continue; R.drawGooFx(ctx, zs, now); }
    for (const zs of gasLike) R.drawGas(ctx, zs, now);
    for (const z of loose) R.drawPuddle(ctx, z, now);
    // enemy fire puddles
    for (const z of g.ezones) {
      const k = Math.min(1, z.life / z.max * 2);
      ctx.globalAlpha = 0.55 * k; ctx.fillStyle = '#5a0a04'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, z.x, z.y, z.r * 1.2, '#ff4010', 0.45 * k);
      for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + (z.ph || 0); const fx = z.x + Math.cos(a) * z.r * 0.55, fy = z.y + Math.sin(a) * z.r * 0.38; const fh = 10 + 8 * Math.abs(Math.sin(now * 9 + i * 2 + (z.ph || 0)));
        ctx.globalAlpha = 0.8 * k; ctx.fillStyle = '#ff6010'; ctx.beginPath(); ctx.moveTo(fx - 5, fy); ctx.quadraticCurveTo(fx, fy - fh * 1.4, fx + 5, fy); ctx.fill(); ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.moveTo(fx - 2, fy); ctx.quadraticCurveTo(fx, fy - fh * 0.7, fx + 2, fy); ctx.fill(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
  const SMEAR = {
    goo: { base: '#4a2208', mid: '#6a3a10', hi: '#a8642a', shine: '#e0a060' },
    sticky: { base: '#3a2a06', mid: '#6a5010', hi: '#b09030', shine: '#f0e0a0' },
    puke: { base: '#6a7010', mid: '#a0a828', hi: '#d0d050', shine: '#f0f0a0' },
    puddle: { base: '#3a2a20', mid: '#5a4030', hi: '#806050', shine: '#c0a080' }
  };
  R.drawSmear = function (x, zs, style, now) {
    const C = SMEAR[style] || SMEAR.puddle; x.lineCap = 'round'; x.lineJoin = 'round';
    const k = (z) => Math.max(0, z.life / z.max);
    const wob = (z) => 1 + 0.12 * Math.sin(now * 3 + z.ph);
    // pass 1: dark base smear (width tapers as the goo ages => fading tail)
    const pass = (col, wm, oy) => {
      x.strokeStyle = col; x.fillStyle = col;
      for (let i = 0; i < zs.length; i++) {
        const a = zs[i], ka = k(a); const ra = a.r * 1.45 * wm * (0.5 + 0.5 * ka) * wob(a) * (0.8 + 0.4 * Math.abs(Math.sin(a.ph * 3.7)));
        x.beginPath(); x.arc(a.x, a.y + oy, ra, 0, TAU); x.fill();
        if (wm > 0.9) { // lumpy side blobs so the smear looks goopy, not like a rope
          const l1 = Math.sin(a.ph * 7) * ra * 0.75, l2 = Math.cos(a.ph * 5) * ra * 0.6;
          x.beginPath(); x.arc(a.x + l1, a.y + oy + l2 * 0.6, ra * (0.55 + 0.15 * Math.sin(now * 2.5 + a.ph)), 0, TAU); x.fill();
        }
        if (i + 1 < zs.length) { const b = zs[i + 1]; if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 70) { x.lineWidth = ra * 2 * 0.92; x.beginPath(); x.moveTo(a.x, a.y + oy); x.lineTo(b.x, b.y + oy); x.stroke(); } }
      }
    };
    pass(C.base, 1.0, 0);
    // drips hanging off the bottom edge
    x.fillStyle = C.base;
    for (const z of zs) if (z.seq % 2 === 0) { const kk = k(z); const len = z.r * (0.6 + (1 - kk) * 1.4); const dx = z.x + Math.sin(z.ph * 3) * z.r * 0.6, top = z.y + z.r * 0.7 * (0.35 + 0.65 * kk);
      x.beginPath(); x.ellipse(dx, top + len * 0.45, z.r * 0.2 * (0.6 + kk), len * 0.55, 0, 0, TAU); x.fill(); x.beginPath(); x.arc(dx, top + len, z.r * 0.24 * (0.6 + kk), 0, TAU); x.fill(); }
    pass(C.mid, 0.72, -1);
    // broken glossy highlight streaks (not a continuous tube)
    x.strokeStyle = C.hi; x.lineCap = 'round';
    for (let i = 0; i + 1 < zs.length; i++) { const a = zs[i], b = zs[i + 1]; if (a.seq % 3 === 2) continue; if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 70) continue; const ka = k(a); x.lineWidth = Math.max(1, a.r * 0.35 * (0.4 + 0.6 * ka)); x.beginPath(); x.moveTo(a.x - 1, a.y - a.r * 0.3); x.lineTo(b.x - 1, b.y - b.r * 0.3); x.stroke(); }
    // glossy shine specks
    x.fillStyle = C.shine;
    for (const z of zs) if (z.seq % 2 === 0 && k(z) > 0.25) { x.globalAlpha = 0.8 * k(z); x.fillRect(z.x - z.r * 0.3 + Math.sin(z.ph) * 3, z.y - z.r * 0.35, 3, 2); }
    x.globalAlpha = 1;
    if (style === 'puke') { x.fillStyle = '#c08030'; for (const z of zs) if (z.seq % 2) { x.fillRect(z.x + Math.sin(z.ph * 3) * z.r * 0.5, z.y + Math.cos(z.ph * 2) * z.r * 0.3, 4, 3); } }
  };
  function z0off(zs) { return zs.length ? zs[0].r * 0.25 : 3; }
  R.drawGooFx = function (ctx, zs, now) {
    ctx.save();
    for (const z of zs) {
      const k = Math.max(0, z.life / z.max); if (k < 0.08) continue;
      // bubbling: bubbles grow then pop
      if (z.seq % 4 === 1) { const ph = (now * 0.9 + z.ph) % 1; const br = 1.5 + ph * z.r * 0.28; ctx.globalAlpha = (1 - ph) * k; ctx.strokeStyle = '#d09050'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(z.x + Math.cos(z.ph) * z.r * 0.4, z.y + Math.sin(z.ph) * z.r * 0.25 - 2, br, 0, TAU); ctx.stroke(); }
      // fiery flicker
      if (z.seq % 3 === 0) {
        ctx.globalCompositeOperation = 'lighter';
        const fx = z.x + Math.sin(z.ph * 5) * z.r * 0.35, fy = z.y - 2; const fh = (9 + 10 * Math.abs(Math.sin(now * 11 + z.ph * 4))) * k;
        glow(ctx, fx, fy - fh * 0.4, 10 * k + 4, '#ff6010', 0.35 * k);
        ctx.globalAlpha = 0.85 * k; ctx.fillStyle = '#ff6a10'; ctx.beginPath(); ctx.moveTo(fx - 5, fy); ctx.quadraticCurveTo(fx + Math.sin(now * 13 + z.ph) * 3, fy - fh * 1.6, fx + 5, fy); ctx.fill();
        ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.moveTo(fx - 2, fy); ctx.quadraticCurveTo(fx, fy - fh * 0.8, fx + 2, fy); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  };
  R.drawGas = function (ctx, zs, now) {
    const holy = zs[0].style === 'holy';
    ctx.save(); ctx.globalCompositeOperation = holy ? 'lighter' : 'source-over';
    for (const z of zs) {
      const k = Math.max(0, z.life / z.max); const r = z.r * (1.3 - 0.4 * k) * (1 + 0.1 * Math.sin(now * 2 + z.ph));
      const dx = Math.sin(now * 0.8 + z.ph) * 6 * (1 - k), dy = -(1 - k) * 14;
      if (holy) { glow(ctx, z.x + dx, z.y + dy, r * 1.3, z.col || '#60c0ff', 0.35 * k); if (z.seq % 3 === 0) { ctx.globalAlpha = k; ctx.fillStyle = '#ffffff'; ctx.fillRect(z.x + Math.sin(now * 4 + z.ph) * r * 0.6, z.y - (now * 20 + z.ph * 10) % 20, 2, 2); } }
      else { ctx.globalAlpha = 0.28 * k; ctx.fillStyle = z.col || '#78a030'; ctx.beginPath(); ctx.arc(z.x + dx, z.y + dy, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.18 * k; ctx.fillStyle = '#c0e060'; ctx.beginPath(); ctx.arc(z.x + dx - r * 0.25, z.y + dy - r * 0.25, r * 0.5, 0, TAU); ctx.fill(); }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  };
  R.drawPuddle = function (ctx, z, now) {
    const k = Math.min(1, z.life / z.max * 2); const C = z.style && SMEAR[z.style] ? SMEAR[z.style] : null;
    ctx.globalAlpha = 0.5 * k; ctx.fillStyle = C ? C.base : z.col;
    ctx.beginPath(); for (let i = 0; i <= 16; i++) { const a = i * TAU / 16; const rr = z.r * (0.85 + 0.15 * Math.sin(a * 3 + (z.ph || 0) + now * 1.5)); const px = z.x + Math.cos(a) * rr, py = z.y + Math.sin(a) * rr * 0.75; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.fill();
    ctx.globalAlpha = 0.35 * k; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(z.x - z.r * 0.25, z.y - z.r * 0.2, z.r * 0.25, z.r * 0.1, -0.3, 0, TAU); ctx.fill();
    const rp = (now * 0.7 + (z.ph || 0)) % 1; ctx.globalAlpha = 0.4 * k * (1 - rp); ctx.strokeStyle = z.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r * rp, z.r * rp * 0.75, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  };

  // ---------- boss telegraphs & hazards ----------
  R.drawTele = function (ctx, g, now) {
    for (const t of g.tele) {
      const k = Math.min(1, t.t / t.dur); const blink = 0.35 + 0.25 * Math.sin(now * 30);
      ctx.save(); ctx.translate(t.x, t.y);
      if (t.type === 'line') {
        ctx.rotate(t.ang); ctx.globalAlpha = 0.18 + 0.12 * k; ctx.fillStyle = t.col; ctx.fillRect(0, -t.w / 2, t.len, t.w);
        ctx.globalAlpha = blink; ctx.fillRect(0, -t.w / 2, t.len * k, t.w);
        ctx.globalAlpha = 0.9; ctx.strokeStyle = t.col; ctx.lineWidth = 2; ctx.strokeRect(0, -t.w / 2, t.len, t.w);
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(now * 20);
        for (let d = (now * 300) % 60; d < t.len; d += 60) { ctx.beginPath(); ctx.moveTo(d + 14, 0); ctx.lineTo(d, -10); ctx.lineTo(d + 4, 0); ctx.lineTo(d, 10); ctx.fill(); }
      } else if (t.type === 'circle') {
        ctx.globalAlpha = 0.85; ctx.strokeStyle = t.col; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -now * 40; ctx.beginPath(); ctx.arc(0, 0, t.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 0.25 + 0.2 * k; ctx.fillStyle = t.col; ctx.beginPath(); ctx.arc(0, 0, t.r * k, 0, TAU); ctx.fill();
      } else if (t.type === 'cone') {
        ctx.rotate(t.ang); ctx.globalAlpha = 0.2 + 0.25 * k * blink * 2; ctx.fillStyle = t.col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, t.len, -t.spread, t.spread); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ff2010'; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, t.len * k, -t.spread, t.spread); ctx.closePath(); ctx.fillStyle = '#ffb030'; ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
  R.drawHazards = function (ctx, g, now) {
    for (const h of g.hazards) {
      const k = 1 - h.warn / h.max; const col = h.kind === 'coin' ? '#ffd040' : h.kind === 'bone' ? '#f0f0d0' : h.kind === 'spike' ? '#c08040' : '#ff3010';
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(now * 25); ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = col; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * k, 0, TAU); ctx.fill();
      if (h.kind === 'spike' || h.kind === 'bone') { ctx.globalAlpha = 0.9; ctx.fillStyle = h.kind === 'bone' ? '#e8e0c8' : '#8a6a48'; for (let i = 0; i < 3; i++) { const ox = (i - 1) * h.r * 0.45, sh = 4 + k * 8; ctx.beginPath(); ctx.moveTo(h.x + ox - 4, h.y + 4); ctx.lineTo(h.x + ox, h.y + 4 - sh); ctx.lineTo(h.x + ox + 4, h.y + 4); ctx.fill(); } }
      if (h.kind === 'coin') { ctx.globalAlpha = 1; ctx.save(); ctx.translate(h.x, h.y - 300 * (1 - k)); DS.Spr.drawShape(ctx, 'coin', '#ffd040', '#c08010', 12); ctx.restore(); }
      if (!h.kind || h.kind === 'fire') { ctx.globalAlpha = 1; ctx.save(); ctx.translate(h.x, h.y - 260 * (1 - k)); ctx.rotate(Math.PI / 2); DS.Spr.drawShape(ctx, 'fire', '#ff5010', '#ffd040', 10); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  };
  R.drawWall = function (ctx, w, now) { // stalagmite spike wall
    const rise = Math.min(1, w.age / 0.15); const crumble = w.life < 0.6 ? w.life / 0.6 : 1; const s = rise * crumble;
    const red = w.col === 'red'; const c1 = red ? '#7a1818' : '#6a5038', c2 = red ? '#c03030' : '#a08060', c3 = red ? '#ff8080' : '#d8c0a0';
    const jx = w.life < 0.6 ? U.rand(-2, 2) : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 6, w.r * 1.2, w.r * 0.45, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 4, w.r, w.r * 0.35, 0, 0, TAU); ctx.fill();
    const spikes = [[-0.55, 0.65], [0.5, 0.75], [0, 1]];
    for (const [ox, hm] of spikes) {
      const bx = w.x + ox * w.r + jx, by = w.y + 4, hh = (34 + (w.seed % 10)) * hm * s, bw = w.r * 0.55;
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(bx - bw, by); ctx.lineTo(bx + Math.sin(w.seed + ox) * 3, by - hh); ctx.lineTo(bx + bw, by); ctx.fill();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(bx - bw * 0.4, by); ctx.lineTo(bx + Math.sin(w.seed + ox) * 3, by - hh); ctx.lineTo(bx + bw * 0.25, by); ctx.fill();
      ctx.fillStyle = c3; ctx.fillRect(bx + Math.sin(w.seed + ox) * 3 - 1, by - hh, 2, 4);
    }
    if (w.age < 0.3) { ctx.globalAlpha = 1 - w.age / 0.3; ctx.fillStyle = '#e0c8a0'; for (let i = 0; i < 4; i++) ctx.fillRect(w.x + U.rand(-w.r, w.r), w.y - U.rand(0, 30), 3, 3); ctx.globalAlpha = 1; }
  };
  R.drawReticle = function (ctx, t, now) {
    const col = t.boss ? '#ff3030' : t.elite ? '#ffd040' : '#ffffff'; const r = t.r * (t.boss ? 1.4 : 1.5) + 6 + Math.sin(now * 8) * 2;
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(now * 1.5); ctx.strokeStyle = col; ctx.globalAlpha = t.boss || t.elite ? 0.9 : 0.55; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(r, -6); ctx.lineTo(r, 0); ctx.lineTo(r - 6, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(r, 0, 0.1, 0, TAU); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
  };
  R.drawEProj = function (ctx, b, now) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, b.x, b.y, b.r * 2.6, b.col, 0.45); ctx.restore();
    ctx.save(); ctx.translate(b.x, b.y);
    if (b.shape === 'card') { ctx.rotate(b.rot); ctx.fillStyle = '#101010'; ctx.fillRect(-6, -8, 12, 16); ctx.fillStyle = '#f0f0e0'; ctx.fillRect(-5, -7, 10, 14); ctx.fillStyle = b.col === '#ff4040' ? '#202020' : '#e02020'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(3, 0); ctx.lineTo(0, 4); ctx.lineTo(-3, 0); ctx.fill(); }
    else if (b.shape === 'coin') { ctx.scale(Math.abs(Math.cos(now * 8 + b.x * 0.05)) * 0.7 + 0.3, 1); DS.Spr.drawShape(ctx, 'coin', b.col, b.col === '#ffd040' ? '#a07010' : '#108030', b.r + 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -3, 2, 6); }
    else if (b.shape === 'fire') { ctx.rotate(b.rot); DS.Spr.drawShape(ctx, 'fire', '#ff5010', '#ffd040', b.r + 3); }
    else { ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-1, -1, b.r * 0.4, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  R.drawPlayer = function (ctx, g, now) {
    const p = g.player, S = DS.Spr; const sp = S.chars[g.cid];
    const frame = p.moving && Math.floor(p.anim * 8) % 2 === 1;
    let img = p.facing >= 0 ? (frame ? sp.B : sp.A) : (frame ? sp.Bf : sp.Af);
    if (p.hurtT > 0.1) img = sp.W;
    const w = img.width, h = img.height; const bob = p.moving ? Math.abs(Math.sin(p.anim * 12)) * -2 : 0;
    if (p.buff) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, p.x, p.y, 48, p.buff.col, 0.5 + Math.sin(now * 20) * 0.1); ctx.restore(); }
    if (p.invuln > 0 && Math.floor(now * 20) % 2) ctx.globalAlpha = 0.5;
    ctx.drawImage(img, Math.round(p.x - w / 2), Math.round(p.y - h / 2 - 4 + bob));
    ctx.globalAlpha = 1;
    if (g.ch.smoke) { // glowing cigarette ember
      const sm = g.ch.smoke; const col = p.facing >= 0 ? sm[0] : 15 - sm[0]; const ex = p.x - w / 2 + (col + 1.5) * 3, ey = p.y - h / 2 - 4 + bob + (sm[1] + 1.5) * 3;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, ex, ey, 7 + Math.sin(now * 7) * 2, '#ff6020', 0.7); ctx.restore();
    }
    if (p.shield > 0) { ctx.strokeStyle = '#80c0ff'; ctx.globalAlpha = 0.5 + 0.3 * (p.shield / p.shieldMax); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 36, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#200'; ctx.fillRect(p.x - 20, p.y + h / 2 - 2, 40, 4); ctx.fillStyle = '#e03040'; ctx.fillRect(p.x - 20, p.y + h / 2 - 2, 40 * Math.max(0, p.hp / p.maxHp), 4);
  };
  R.drawBoss = function (ctx, g, e, now) {
    const S = DS.Spr, sp = S.boss[e.sprite]; const left = g.player.x < e.x;
    let img = e.flash > 0 ? sp.w : (left ? sp.f : sp.n);
    const sc = (e.r * 3) / img.width; let w = img.width * sc, h = img.height * sc;
    if (e.spawnT > 0) { const k = 1 - e.spawnT; ctx.save(); ctx.translate(e.x, e.y + e.r * 0.6); ctx.rotate(now * 3); ctx.strokeStyle = e.super ? '#ff2020' : '#c060ff'; ctx.lineWidth = 4; ctx.globalAlpha = 1 - k * 0.5; ctx.beginPath(); ctx.ellipse(0, 0, e.r * 1.6, e.r * 0.6, 0, 0, TAU); ctx.stroke(); ctx.restore(); w *= k; h *= k; }
    // aura: jackpot/super/phase
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (e.jackpot || e.super) glow(ctx, e.x, e.y, e.r * 2.2, e.super ? '#ff2020' : '#ffd040', 0.35 + Math.sin(now * 5) * 0.1);
    if (e.phase >= 2) glow(ctx, e.x, e.y, e.r * (2 + 0.2 * Math.sin(now * 10)), '#ff3010', 0.3 + 0.1 * e.phase);
    if (e.state === 'windup' || e.state === 'breathwind' || e.state === 'lever') glow(ctx, e.x, e.y, e.r * 2.4, '#ff2020', 0.4 + 0.3 * Math.sin(now * 40));
    ctx.restore();
    let ox = 0; if (e.state === 'windup' || e.state === 'breathwind') ox = U.rand(-3, 3);
    const yb = Math.round(e.y - h / 2 - 8 + Math.sin(now * 3) * 3);
    if (e.state === 'charge') { for (let k = 3; k >= 1; k--) { ctx.globalAlpha = 0.15 * (4 - k); ctx.drawImage(img, Math.round(e.x - w / 2 - Math.cos(e.ang) * k * 22), Math.round(yb - Math.sin(e.ang) * k * 22), Math.round(w), Math.round(h)); } ctx.globalAlpha = 1; }
    ctx.drawImage(img, Math.round(e.x - w / 2 + ox), yb, Math.round(w), Math.round(h));
    if (e.burn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, e.x, e.y, e.r * 1.4, '#ff5010', 0.3); ctx.restore(); }
    if (e.state === 'windup') { ctx.font = R.font(18, true); ctx.textAlign = 'center'; ctx.fillStyle = '#ff3030'; ctx.fillText('!', e.x, yb - 8 + Math.sin(now * 30) * 2); }
    ctx.globalAlpha = 1;
  };
  R.drawFx = function (ctx, f, g) {
    const k = Math.max(0, f.t / f.dur);
    switch (f.type) {
      case 'ring': ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = f.col; ctx.lineWidth = 4 * (1 - k) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.3 + 0.7 * k), 0, TAU); ctx.stroke();
        if (f.fill) { ctx.globalAlpha = Math.max(0, 0.3 - k * 0.3); ctx.fillStyle = f.col; ctx.fill(); } ctx.globalAlpha = 1; break;
      case 'glow': ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, f.x, f.y, f.r * (0.6 + 0.6 * k), f.col, 0.6 * (1 - k)); ctx.restore(); break;
      case 'slash': { ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = f.col; ctx.lineWidth = 12 * (1 - k) + 2;
        const arc = Math.min(f.arc, TAU); ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.6 + 0.4 * k), f.a - arc / 2, f.a + arc / 2); ctx.stroke();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + 0.4 * k), f.a - arc / 2, f.a + arc / 2); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; break; }
      case 'fall': { if (f.t < 0) break; const y = f.y - 400 * (1 - k);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = f.c1; ctx.globalAlpha = 0.5; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f.x, y - 60); ctx.lineTo(f.x, y); ctx.stroke(); glow(ctx, f.x, y, 18, f.c1, 0.5); ctx.restore();
        ctx.save(); ctx.translate(f.x, y); ctx.rotate(f.rot !== undefined ? f.rot : k * 6); DS.Spr.drawShape(ctx, f.shape, f.c1, f.c2, 11); ctx.restore();
        ctx.globalAlpha = 0.5; ctx.strokeStyle = f.c1; ctx.beginPath(); ctx.arc(f.x, f.y, 10 + 14 * (1 - k), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; break; }
      case 'bolt': { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = f.col; ctx.lineWidth = 7; ctx.beginPath(); let yy = f.y - 500; ctx.moveTo(f.x, yy); const pts = [];
        while (yy < f.y) { yy += 40; pts.push([f.x + U.rand(-14, 14), Math.min(yy, f.y)]); } pts.forEach(q => ctx.lineTo(q[0], q[1])); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); glow(ctx, f.x, f.y, 40, f.col, 0.6 * (1 - k)); ctx.restore(); break; }
      case 'chain': ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = f.col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(f.pts[0].x, f.pts[0].y);
        for (let i = 1; i < f.pts.length; i++) { const a = f.pts[i - 1], b = f.pts[i]; ctx.lineTo((a.x + b.x) / 2 + U.rand(-10, 10), (a.y + b.y) / 2 + U.rand(-10, 10)); ctx.lineTo(b.x, b.y); }
        ctx.stroke(); ctx.strokeStyle = f.col2 || '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); for (const q of f.pts) glow(ctx, q.x, q.y, 14, f.col, 0.5 * (1 - k)); ctx.restore(); break;
      case 'cracks': { ctx.globalAlpha = 0.7 * (1 - k); ctx.strokeStyle = '#140808'; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i < 7; i++) { const a = f.seed + i * 0.9; let x = f.x, y = f.y; ctx.moveTo(x, y); for (let s = 0; s < 3; s++) { x += Math.cos(a + Math.sin(f.seed * (s + 1)) * 0.5) * f.r * 0.3; y += Math.sin(a + Math.sin(f.seed * (s + 1)) * 0.5) * f.r * 0.3 * 0.7; ctx.lineTo(x, y); } }
        ctx.stroke(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = f.col; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; break; }
      case 'rays': { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.t * 0.8); ctx.globalCompositeOperation = 'lighter'; const a = Math.sin(Math.min(1, k) * Math.PI) * 0.45; ctx.fillStyle = f.col; ctx.globalAlpha = a;
        for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(700, -30); ctx.lineTo(700, 30); ctx.fill(); } glow(ctx, 0, 0, 160, '#ffffff', a); ctx.restore(); break; }
      case 'sigil': { ctx.save(); ctx.translate(f.x, f.y); ctx.scale(1, 0.55); ctx.rotate(f.t * 1.5); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(Math.min(1, k) * Math.PI); ctx.strokeStyle = f.col; ctx.lineWidth = 4; const r = f.r * (0.8 + 0.3 * k);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, TAU); ctx.stroke(); ctx.beginPath();
        for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; const px = Math.cos(a) * r * 0.8, py = Math.sin(a) * r * 0.8; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke();
        ctx.fillStyle = f.col; for (let i = 0; i < 10; i++) { const a = i * TAU / 10; ctx.fillRect(Math.cos(a) * r * 0.91 - 3, Math.sin(a) * r * 0.91 - 3, 6, 6); } ctx.restore(); break; }
      case 'reels': { const x0 = f.x - 45, y0 = f.y - 130; ctx.fillStyle = '#202028'; ctx.fillRect(x0 - 4, y0 - 4, 98, 40); ctx.strokeStyle = '#ffd040'; ctx.lineWidth = 2; ctx.strokeRect(x0 - 4, y0 - 4, 98, 40);
        const syms = ['7', '$', '♣', 'BAR', '♦']; ctx.font = R.font(16, true); ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) { ctx.fillStyle = '#f0f0e0'; ctx.fillRect(x0 + i * 31, y0, 28, 32); const stop = k > 0.4 + i * 0.2; ctx.fillStyle = '#e02020'; ctx.fillText(stop ? '7' : syms[Math.floor(f.t * 20 + i * 2) % syms.length], x0 + i * 31 + 14, y0 + 17); }
        if (k > 0.85) { ctx.fillStyle = '#ffd040'; ctx.fillText('JACKPOT!', f.x, y0 - 14); } break; }
    }
  };

  R.drawHUD = function (ctx, g) {
    const SA = DS.SAFE || { t: 0, r: 0, b: 0, l: 0 }; const LW = W, LH = H;
    ctx.save(); ctx.translate(SA.l, SA.t); W = LW - SA.l - SA.r; H = LH - SA.t - SA.b;
    R.drawHUDInner(ctx, g);
    ctx.restore();
    if (DS.touchMode) R.drawTouch(ctx, g, SA, LW, LH);
    W = LW; H = LH;
  };
  R.drawHUDInner = function (ctx, g) {
    const p = g.player, st = g.st; const touch = !!DS.touchMode; const narrow = W < 700;
    const RX = W - 14 - (touch ? 66 : 0); // right column (leave room for the touch pause button)
    ctx.textBaseline = 'middle';
    const need = g.xpNeed(); const xpk = g.level >= DS.RUN_MAX_LEVEL ? (g.xp / need) % 1 : g.xp / need;
    ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, 18); ctx.fillStyle = '#3a6aff'; ctx.fillRect(2, 2, (W - 4) * Math.min(1, xpk), 14);
    ctx.fillStyle = '#80b0ff'; ctx.fillRect(2, 2, (W - 4) * Math.min(1, xpk), 4);
    ctx.strokeStyle = '#c0a060'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, 16);
    ctx.font = R.font(13, true); ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(g.level >= DS.RUN_MAX_LEVEL ? 'LV 50 MAX (+5 gold/lvl)' : 'LV ' + g.level, W - 10, 10);
    if (narrow) { // portrait / narrow: stack timer + stats in the right column
      ctx.textAlign = 'right'; ctx.font = R.font(26, true); ctx.fillStyle = '#000'; ctx.fillText(U.fmtTime(g.time), RX + 2, 40); ctx.fillStyle = '#f0e6c8'; ctx.fillText(U.fmtTime(g.time), RX, 38);
      ctx.font = R.font(12, true); ctx.fillStyle = '#ff9060'; ctx.fillText('TIER ' + g.tier(), RX, 60);
      ctx.font = R.font(13, true); ctx.fillStyle = '#e0d0d0'; ctx.fillText('☠ ' + g.kills + ' ★ ' + g.elites, RX, 78);
      ctx.fillStyle = '#ffd040'; ctx.fillText('● ' + Math.floor(g.goldRun), RX, 96);
    } else {
      ctx.textAlign = 'center'; ctx.font = R.font(32, true); ctx.fillStyle = '#000'; ctx.fillText(U.fmtTime(g.time), W / 2 + 2, 44); ctx.fillStyle = '#f0e6c8'; ctx.fillText(U.fmtTime(g.time), W / 2, 42);
      ctx.font = R.font(14, true); ctx.fillStyle = '#ff9060'; ctx.fillText('TIER ' + g.tier() + '  ·  ' + g.map.name.toUpperCase(), W / 2, 68);
      ctx.textAlign = 'right'; ctx.font = R.font(15, true); ctx.fillStyle = '#e0d0d0'; ctx.fillText('☠ ' + g.kills + '   ★ ' + g.elites, RX, 36);
      ctx.fillStyle = '#ffd040'; ctx.fillText('● ' + Math.floor(g.goldRun) + ' gold', RX, 58);
    }
    // ability slots: 4 primary + 5 secondary (empty slots shown)
    ctx.textAlign = 'left';
    const drawRow = (arr, y, kind, slots) => {
      for (let i = 0; i < slots; i++) {
        const x = 12 + i * 44; const a = arr[i];
        if (!a) { ctx.globalAlpha = 0.5; ctx.strokeStyle = kind === 'p' ? '#e05080' : '#4fa3ff'; ctx.setLineDash([3, 3]); ctx.strokeRect(x + 0.5, y + 0.5, 35, 35); ctx.setLineDash([]); ctx.globalAlpha = 1; continue; }
        const img = DS.Spr.getIconCanvas(a.def);
        if (img.complete) ctx.drawImage(img, x, y, 36, 36); else { ctx.fillStyle = '#333'; ctx.fillRect(x, y, 36, 36); }
        for (let l = 0; l < 4; l++) { ctx.fillStyle = a.isSuper ? '#ff40ff' : a.evolved ? '#ffd040' : l < a.level ? (kind === 'p' ? '#ff6080' : '#60b0ff') : '#302838'; ctx.fillRect(x + 2 + l * 8.5, y + 38, 7, 4); }
        if (a.def.type === 'orbit' && a.active === false) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, 36, 36); }
      }
    };
    drawRow(g.prim, 26, 'p', Math.max(DS.PRIMARY_SLOTS || 4, g.prim.length)); drawRow(g.sec, 74, 's', Math.max(5, g.sec.length));
    if (!narrow) { ctx.font = R.font(10, true); ctx.fillStyle = '#a090b0'; ctx.fillText(touch ? 'Auto-aim: Bosses > Elites > Nearest · Special aims itself' : 'Auto-aim: Bosses > Elites > Nearest · Mouse aims special', 12, 128); }
    const hw = Math.max(140, Math.min(320, W - 28 - (touch ? 140 : 0))); const hx = touch && DS.save.options.leftHanded ? W - 14 - hw : 14, hy = H - 44;
    ctx.fillStyle = '#0a0612'; ctx.fillRect(hx - 2, hy - 2, hw + 4, 24); ctx.fillStyle = '#4a0a14'; ctx.fillRect(hx, hy, hw, 20);
    ctx.fillStyle = '#e02840'; ctx.fillRect(hx, hy, hw * Math.max(0, p.hp / p.maxHp), 20); ctx.fillStyle = '#ff7080'; ctx.fillRect(hx, hy, hw * Math.max(0, p.hp / p.maxHp), 5);
    if (p.shieldMax > 0) { ctx.fillStyle = '#80c0ff'; ctx.fillRect(hx, hy + 16, hw * (p.shield / p.shieldMax), 4); }
    ctx.strokeStyle = '#c0a060'; ctx.strokeRect(hx - 1, hy - 1, hw + 2, 22);
    ctx.font = R.font(13, true); ctx.fillStyle = '#fff'; ctx.fillText(Math.ceil(p.hp) + ' / ' + Math.ceil(p.maxHp) + ' HP' + (p.shield > 0 ? '  (+' + Math.ceil(p.shield) + ' shield)' : ''), hx + 8, hy + 11);
    ctx.fillStyle = g.ch.color; ctx.fillText(g.ch.name.toUpperCase() + ' — ' + g.ch.title, hx, hy - 14);
    const sx = W / 2 - 34, sy = H - 84, sz = 68;
    if (!touch) {
    ctx.fillStyle = '#140c1c'; ctx.fillRect(sx, sy, sz, sz); ctx.strokeStyle = p.specialT <= 0 ? '#ffd040' : '#605070'; ctx.lineWidth = 3; ctx.strokeRect(sx, sy, sz, sz);
    const M = g.ch.main; ctx.save(); ctx.translate(sx + sz / 2, sy + sz / 2); DS.Spr.drawShape(ctx, M.shape || 'slash', M.colors[0], M.colors[1], 16); ctx.restore();
    if (p.specialT > 0) { const k = p.specialT / st.specialCd; ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sz, sz); ctx.clip(); ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.beginPath(); ctx.moveTo(sx + sz / 2, sy + sz / 2); ctx.arc(sx + sz / 2, sy + sz / 2, sz * 0.72, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.fill(); ctx.restore();
      ctx.textAlign = 'center'; ctx.font = R.font(20, true); ctx.fillStyle = '#fff'; ctx.fillText(Math.ceil(p.specialT), sx + sz / 2, sy + sz / 2); }
    ctx.textAlign = 'center'; ctx.font = R.font(12, true); ctx.fillStyle = '#e0d0b0'; ctx.fillText(g.ch.special.name + ' [' + DS.UI.keyName(DS.save.options.keys.special) + ' / RMB] — aims at mouse', W / 2, H - 8);
    }
    const bosses = g.enemies.filter(e => e.boss && !e.dead);
    bosses.slice(0, 2).forEach((b, i) => {
      const bw = Math.min(560, W - 30), bx = W / 2 - bw / 2, by = (narrow ? 132 : 86) + i * 34;
      ctx.fillStyle = '#0a0612'; ctx.fillRect(bx - 2, by - 2, bw + 4, 18); ctx.fillStyle = b.super ? '#a00010' : '#702040'; ctx.fillRect(bx, by, bw * Math.max(0, b.hp / b.maxHp), 14);
      const marks = b.super ? [0.66, 0.33] : [0.5]; ctx.fillStyle = '#ffd040'; marks.forEach(m => ctx.fillRect(bx + bw * m - 1, by, 2, 14));
      ctx.strokeStyle = b.jackpot ? '#ffd040' : '#c0a060'; ctx.lineWidth = 2; ctx.strokeRect(bx - 1, by - 1, bw + 2, 16);
      ctx.font = R.font(12, true); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText((b.super ? '☠ ' : b.jackpot ? '$ ' : '') + b.name + (b.phase > 1 ? '  [PHASE ' + b.phase + ']' : '') + '  ' + U.fmt(Math.max(0, b.hp)) + ' / ' + U.fmt(b.maxHp), W / 2, by + 8);
    });
    if (g.bannerMsg) { const b = g.bannerMsg; ctx.globalAlpha = Math.min(1, b.t); ctx.font = R.font(26, true); const bwid = ctx.measureText(b.text).width; if (bwid > W - 20) ctx.font = R.font(Math.max(12, Math.floor(26 * (W - 20) / bwid)), true); ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(b.text, W / 2 + 2, narrow ? 222 : 192); ctx.fillStyle = b.col; ctx.fillText(b.text, W / 2, narrow ? 220 : 190); ctx.globalAlpha = 1; }
    const nextBoss = Math.ceil(g.time / 60 + 0.0001) * 60; let nb = null; for (let t = nextBoss; t < nextBoss + 400; t += 60) if (t % 120 === 0 || t % 300 === 0) { nb = t; break; }
    if (nb) { ctx.textAlign = 'center'; ctx.font = R.font(11, true); ctx.fillStyle = '#a090b0'; ctx.fillText('next boss ' + U.fmtTime(nb - g.time) + (nb % 600 === 0 ? ' (SUPER)' : nb % 300 === 0 ? ' (JACKPOT)' : '') + '  ·  elite ' + Math.ceil(g.nextElite - g.time) + 's', W / 2, (narrow ? 124 : 80) + (bosses.length ? Math.min(2, bosses.length) * 34 + 14 : 0)); }
    if (DS.debug) { ctx.textAlign = 'left'; ctx.font = R.font(11, true); ctx.fillStyle = '#ff60ff'; ctx.fillText('DEBUG [F9]  G:+1000g  T:+60s  L:level  K:kill all  B:boss  I:god(' + (g.god ? 'on' : 'off') + ')  enemies ' + g.enemies.length + '  fps ' + (DS.fps || 0), 12, H - 64); }
  };

  // ---------- touch controls (virtual joystick, special, pause) ----------
  R.touchLayout = function (SA, LW, LH) {
    const o = DS.save.options; const left = !!o.leftHanded; const r = 52 * (o.joySize || 1);
    const sp = { x: left ? SA.l + 24 + r : LW - SA.r - 24 - r, y: LH - SA.b - 34 - r, r };
    const pause = { x: LW - SA.r - 34, y: SA.t + 46, r: 26 };
    return (DS.touchUI = { sp, pause, joyR: 60 * (o.joySize || 1), left });
  };
  R.drawTouch = function (ctx, g, SA, LW, LH) {
    const L = R.touchLayout(SA, LW, LH); const o = DS.save.options; const op = o.joyOpacity == null ? 0.6 : o.joyOpacity; const p = g.player, In = DS.Input;
    // joystick (floats where the thumb went down)
    if (In.joyActive) {
      ctx.globalAlpha = op * 0.6; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(In.joyBase.x, In.joyBase.y, L.joyR, 0, TAU); ctx.fill();
      ctx.globalAlpha = op; ctx.strokeStyle = '#e8c060'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(In.joyBase.x, In.joyBase.y, L.joyR, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#e8c060'; ctx.beginPath(); ctx.arc(In.joyBase.x + In.joy.x * L.joyR, In.joyBase.y + In.joy.y * L.joyR, L.joyR * 0.42, 0, TAU); ctx.fill();
    } else if (g.time < 8) {
      ctx.globalAlpha = op * 0.7; ctx.font = R.font(13, true); ctx.textAlign = 'center'; ctx.fillStyle = '#e8dcc0';
      ctx.fillText('Touch & drag anywhere on the ' + (L.left ? 'right' : 'left') + ' side to move', L.left ? LW * 0.75 : LW * 0.25, LH * 0.62);
    }
    // special button with cooldown sweep
    const sp = L.sp; const ready = p.specialT <= 0;
    ctx.globalAlpha = Math.max(0.35, op); ctx.fillStyle = ready ? '#3a1830' : '#140c1c'; ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, TAU); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = ready ? '#ffd040' : '#605070'; ctx.stroke();
    const M = g.ch.main; ctx.save(); ctx.translate(sp.x, sp.y); DS.Spr.drawShape(ctx, M.shape || 'slash', M.colors[0], M.colors[1], sp.r * 0.38); ctx.restore();
    if (!ready) { const k = p.specialT / g.st.specialCd; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.arc(sp.x, sp.y, sp.r - 2, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.fill();
      ctx.globalAlpha = 1; ctx.font = R.font(20, true); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(Math.ceil(p.specialT), sp.x, sp.y); }
    ctx.globalAlpha = 0.9; ctx.font = R.font(10, true); ctx.textAlign = 'center'; ctx.fillStyle = '#e0d0b0'; ctx.fillText('SPECIAL', sp.x, sp.y - sp.r - 8);
    // pause button
    const pb = L.pause; ctx.globalAlpha = 0.85; ctx.fillStyle = '#200a1c'; ctx.beginPath(); ctx.arc(pb.x, pb.y, pb.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#a07840'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#f0e6c8'; ctx.fillRect(pb.x - 8, pb.y - 10, 6, 20); ctx.fillRect(pb.x + 2, pb.y - 10, 6, 20);
    ctx.globalAlpha = 1;
  };

  // ---------- menu backdrop ----------
  let bats = null;
  R.drawMenuBg = function (ctx, t) {
    const LW = DS.VW || 1280, LH = DS.VH || 720; const k = Math.max(LW / 1280, LH / 720);
    ctx.save(); ctx.fillStyle = '#0a0418'; ctx.fillRect(0, 0, LW, LH); ctx.translate((LW - 1280 * k) / 2, (LH - 720 * k) / 2); ctx.scale(k, k); W = 1280; H = 720;
    R.drawMenuBgInner(ctx, t); ctx.restore(); W = LW; H = LH;
  };
  R.drawMenuBgInner = function (ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a0418'); g.addColorStop(0.6, '#2a0a2a'); g.addColorStop(1, '#4a1020');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // stars
    for (let i = 0; i < 90; i++) { const x = U.hash2(i, 1, 3) * W, y = U.hash2(i, 2, 3) * H * 0.6; ctx.fillStyle = 'rgba(255,240,220,' + (0.3 + 0.5 * Math.abs(Math.sin(t * 2 + i))) + ')'; ctx.fillRect(x, y, 2, 2); }
    // moon
    ctx.fillStyle = '#f0e0c0'; ctx.beginPath(); ctx.arc(1000, 150, 80, 0, TAU); ctx.fill(); ctx.fillStyle = '#d8c8a8'; ctx.fillRect(970, 120, 16, 12); ctx.fillRect(1030, 170, 20, 14); ctx.fillRect(990, 190, 10, 8);
    // castle silhouette
    ctx.fillStyle = '#120818';
    const base = 520; ctx.fillRect(0, base, W, H - base);
    const towers = [[60, 60, 260], [180, 90, 200], [330, 50, 300], [450, 120, 180], [640, 70, 330], [760, 140, 160], [930, 60, 250], [1060, 100, 190], [1180, 70, 280]];
    towers.forEach(([x, w, h]) => { ctx.fillRect(x - w / 2, base - h, w, h); for (let i = 0; i < w; i += 16) ctx.fillRect(x - w / 2 + i, base - h - 12, 10, 12); ctx.beginPath(); ctx.moveTo(x - w / 2 - 6, base - h - 12); ctx.lineTo(x, base - h - 70); ctx.lineTo(x + w / 2 + 6, base - h - 12); ctx.fill(); });
    for (let i = 0; i < 26; i++) { const x = U.hash2(i, 9, 1) * W, y = base - U.hash2(i, 8, 1) * 280; ctx.fillStyle = Math.sin(t * 3 + i) > 0.6 ? '#ffd080' : '#c08040'; ctx.fillRect(x, y, 6, 9); ctx.fillStyle = '#120818'; }
    // bats
    if (!bats) { bats = []; for (let i = 0; i < 14; i++) bats.push({ x: Math.random() * W, y: 60 + Math.random() * 300, s: 40 + Math.random() * 80, ph: Math.random() * 6 }); }
    ctx.fillStyle = '#05020a';
    bats.forEach(b => { const x = (b.x + t * b.s) % (W + 100) - 50, y = b.y + Math.sin(t * 2 + b.ph) * 20; const f = Math.sin(t * 14 + b.ph) > 0 ? 6 : -2; ctx.fillRect(x - 3, y - 2, 6, 5); ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x - 14, y - f); ctx.lineTo(x - 8, y + 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 3, y); ctx.lineTo(x + 14, y - f); ctx.lineTo(x + 8, y + 2); ctx.fill(); });
    // fog
    ctx.fillStyle = 'rgba(120,40,80,0.15)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse((t * 20 + i * 400) % (W + 600) - 300, 600 + i * 20, 400, 50, 0, 0, TAU); ctx.fill(); }
  };
  DS.Render = R;
})(window.DS);

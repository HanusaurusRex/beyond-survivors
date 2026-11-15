// main.js - boot, input, game loop, scaling, debug hotkeys
'use strict';
(function (DS) {
  const W = 1280, H = 720;
  DS.VW = W; DS.VH = H; DS.ZOOM = 1; DS.WW = W; DS.WH = H; DS.SAFE = { t: 0, r: 0, b: 0, l: 0 };
  const Input = { keys: new Set(), pressedSet: new Set(), mouseR: false, mouseX: W / 2, mouseY: H / 2,
    joy: { x: 0, y: 0 }, joyActive: false, joyBase: { x: 0, y: 0 }, joyId: null,
    down(c) { return this.keys.has(c); }, pressed(c) { return this.pressedSet.has(c); } };
  DS.Input = Input;
  let canvas, ctx, last = 0, fpsAcc = 0, fpsN = 0;

  DS.startRun = function (cid, mapIdx) {
    if (mapIdx >= DS.save.mapsUnlocked && !DS.debug) mapIdx = 0;
    DS.UI.el.innerHTML = ''; DS.UI.el.style.display = 'none'; DS.UI.overlay.style.display = 'none'; DS.UI.overlay.innerHTML = '';
    DS.game = new DS.Game(cid, mapIdx); DS.state = 'run';
    DS.game.mouse = { x: Input.mouseX, y: Input.mouseY };
    DS.Audio.init(); DS.Audio.playTrack('run', true);
  };

  // ---------- responsive layout ----------
  // Desktop: fixed 1280x720 logical stage, letterboxed (unchanged).
  // Touch: the stage fills the viewport. Logical size = viewport / s where the short side maps to 440..720 logical px,
  // so phones get ~952x440 (landscape) or ~440x952 (portrait); the world is zoomed out a bit on small screens.
  let scale = 1, bufK = 1;
  function detectTouch() {
    const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
    return mm('(pointer: coarse)') || (('ontouchstart' in window) && (navigator.maxTouchPoints || 0) > 0 && !mm('(pointer: fine)'));
  }
  function readSafe() {
    let pr = document.getElementById('safeProbe');
    if (!pr) { pr = document.createElement('div'); pr.id = 'safeProbe'; document.body.appendChild(pr); }
    const cs = getComputedStyle(pr); const f = (v) => parseFloat(v) || 0;
    return { t: f(cs.paddingTop), r: f(cs.paddingRight), b: f(cs.paddingBottom), l: f(cs.paddingLeft) };
  }
  DS.applyFx = function () { const o = DS.save && DS.save.options; DS.lowFx = o && o.lowFx != null ? !!o.lowFx : !!DS.touchMode; resize(); };
  function setBodyClasses() {
    const b = document.body.classList;
    b.toggle('touch', !!DS.touchMode); b.toggle('compact', DS.VW < 1100); b.toggle('narrow', DS.VW < 800); b.toggle('short', DS.VH < 560); b.toggle('is-portrait', DS.VH > DS.VW);
    b.toggle('lefty', !!(DS.save && DS.save.options.leftHanded));
  }
  function resize() {
    const wrap = document.getElementById('wrap'); if (!wrap || !canvas) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (DS.touchMode) {
      const m = Math.min(vw, vh); scale = m / DS.U.clamp(m, 440, 720);
      DS.VW = Math.round(vw / scale); DS.VH = Math.round(vh / scale);
      wrap.style.left = '0px'; wrap.style.top = '0px'; wrap.style.transformOrigin = '0 0';
      wrap.style.transform = 'scale(' + scale + ')';
      const sp = readSafe(); DS.SAFE = { t: sp.t / scale, r: sp.r / scale, b: sp.b / scale, l: sp.l / scale };
      const dpr = window.devicePixelRatio || 1; bufK = Math.max(0.75, scale * Math.min(dpr, DS.lowFx ? 1.5 : 2));
    } else {
      scale = Math.min(vw / W, vh / H); DS.VW = W; DS.VH = H; DS.SAFE = { t: 0, r: 0, b: 0, l: 0 };
      wrap.style.left = '50%'; wrap.style.top = '50%'; wrap.style.transformOrigin = 'center center';
      wrap.style.transform = 'translate(-50%,-50%) scale(' + scale + ')'; bufK = 1;
    }
    DS.UI_SCALE = scale;
    DS.ZOOM = Math.min(1, Math.min(DS.VW, DS.VH) / 600); DS.WW = DS.VW / DS.ZOOM; DS.WH = DS.VH / DS.ZOOM;
    wrap.style.width = DS.VW + 'px'; wrap.style.height = DS.VH + 'px';
    canvas.style.width = DS.VW + 'px'; canvas.style.height = DS.VH + 'px';
    const bw = Math.round(DS.VW * bufK), bh = Math.round(DS.VH * bufK);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    ctx.imageSmoothingEnabled = false;
    const st = wrap.style; st.setProperty('--sat', DS.SAFE.t + 'px'); st.setProperty('--sar', DS.SAFE.r + 'px'); st.setProperty('--sab', DS.SAFE.b + 'px'); st.setProperty('--sal', DS.SAFE.l + 'px');
    setBodyClasses();
    if (DS.UI && DS.UI.onResize) DS.UI.onResize();
  }
  DS.relayout = resize;
  function toCanvas(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * DS.VW, y: (e.clientY - r.top) / r.height * DS.VH }; }

  // ---------- touch controls ----------
  function touchActive() { const g = DS.game; return DS.state === 'run' && g && !g.paused && !g.modal && !g.over; }
  function resetJoy() { Input.joyActive = false; Input.joyId = null; Input.joy.x = 0; Input.joy.y = 0; }
  function onTouchStart(e) {
    DS.Audio.unlock();
    if (!DS.touchMode) { DS.touchMode = true; DS.applyFx(); }
    if (!touchActive()) return;
    e.preventDefault();
    const L = DS.touchUI;
    for (const t of e.changedTouches) {
      const p = toCanvas(t);
      if (L && Math.hypot(p.x - L.pause.x, p.y - L.pause.y) < L.pause.r + 16) { resetJoy(); DS.UI.pause(); return; }
      if (L && Math.hypot(p.x - L.sp.x, p.y - L.sp.y) < L.sp.r + 18) { Input.mouseR = true; continue; }
      if (Input.joyActive) continue;
      const left = L ? L.left : false; const portrait = DS.VH > DS.VW;
      const inZone = portrait || (left ? p.x > DS.VW / 2 : p.x < DS.VW / 2);
      if (!inZone) { Input.mouseR = true; continue; } // tap on the far side also fires the special
      Input.joyActive = true; Input.joyId = t.identifier; Input.joyBase.x = p.x; Input.joyBase.y = p.y; Input.joy.x = 0; Input.joy.y = 0;
    }
  }
  function onTouchMove(e) {
    if (!touchActive()) return; e.preventDefault();
    const R = (DS.touchUI && DS.touchUI.joyR) || 60;
    for (const t of e.changedTouches) {
      if (t.identifier !== Input.joyId) continue;
      const p = toCanvas(t); let dx = p.x - Input.joyBase.x, dy = p.y - Input.joyBase.y; const l = Math.hypot(dx, dy);
      if (l > R) { Input.joyBase.x = p.x - dx / l * R; Input.joyBase.y = p.y - dy / l * R; dx = dx / l * R; dy = dy / l * R; } // base follows the thumb
      Input.joy.x = dx / R; Input.joy.y = dy / R;
    }
  }
  function onTouchEnd(e) {
    for (const t of e.changedTouches) if (t.identifier === Input.joyId) resetJoy();
    if (touchActive()) e.preventDefault();
  }

  function onKeyDown(e) {
    DS.Audio.init();
    if (DS.UI.captureKey && DS.UI.rebinding) { e.preventDefault(); DS.UI.captureKey(e.code); return; }
    if (e.code === 'F9') { e.preventDefault(); DS.debug = !DS.debug; if (DS.state === 'menu' && DS.UI.screen) { const s = DS.UI.screen; if (s === 'upgrade') DS.UI.upgrade(); else if (s === 'market') DS.UI.market(); else if (s === 'charselect') DS.UI.charSelect(); else if (s === 'menu') DS.UI.menu(); } return; }
    const g = DS.game; const keys = DS.save.options.keys;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(e.code) >= 0 && e.target.tagName !== 'INPUT') e.preventDefault();
    if (!Input.keys.has(e.code)) Input.pressedSet.add(e.code);
    Input.keys.add(e.code);
    if (DS.state === 'run' && g) {
      if (g.modal) { const n = parseInt(e.key, 10); if (n >= 1 && n <= g.modal.offers.length) g.choose(n - 1); return; }
      if (e.code === keys.pause || e.code === 'Escape' || e.code === 'KeyP') { if (g.paused) { if (DS.UI.screen === 'options' && DS.UI.optReturn === 'pause') DS.UI.pause(); else DS.UI.resume(); } else DS.UI.pause(); return; }
      if (DS.debug && !g.paused) {
        if (e.code === 'KeyG') { DS.save.gold += 1000; DS.persist(); g.text(g.player.x, g.player.y - 60, '+1000 gold (bank)', '#ff60ff', 14); }
        if (e.code === 'KeyT') { g.time += 60; g.text(g.player.x, g.player.y - 60, 'TIME SKIP +60s', '#ff60ff', 14); }
        if (e.code === 'KeyL') g.gainXp(g.xpNeed() - g.xp + 0.01);
        if (e.code === 'KeyK') g.enemies.forEach(en => { if (!en.dead) g.hit(en, 1e9, { noCrit: true, quiet: true }); });
        if (e.code === 'KeyB') g.spawnBoss(DS.U.choose(Object.keys(DS.BOSSES)), {});
        if (e.code === 'KeyI') g.god = !g.god;
      }
    } else if (e.code === 'Escape' && DS.state === 'menu' && DS.UI.screen !== 'menu') {
      if (DS.UI.overlay.style.display === 'flex') { DS.UI.overlay.style.display = 'none'; DS.UI.overlay.innerHTML = ''; } else DS.UI.menu();
    }
  }
  function onKeyUp(e) { Input.keys.delete(e.code); }

  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    fpsAcc += dt; fpsN++; if (fpsAcc >= 1) { DS.fps = fpsN; fpsAcc = 0; fpsN = 0; }
    const g = DS.game;
    ctx.setTransform(bufK, 0, 0, bufK, 0, 0);
    try {
      if (DS.state === 'run' && g) {
        if (!touchActive() && Input.joyActive) resetJoy();
        g.mouse.x = Input.mouseX; g.mouse.y = Input.mouseY;
        g.update(dt, Input);
        DS.Render.drawGame(ctx, g);
      } else if (DS.state === 'results' && g) {
        DS.Render.drawGame(ctx, g); ctx.fillStyle = 'rgba(10,0,20,0.7)'; ctx.fillRect(0, 0, DS.VW, DS.VH);
      } else {
        DS.Render.drawMenuBg(ctx, ts / 1000);
      }
    } catch (err) { console.error(err); }
    Input.pressedSet.clear();
    requestAnimationFrame(frame);
  }

  function boot() {
    DS.loadSave();
    canvas = document.getElementById('game'); ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    DS.Spr.buildChars(); DS.Spr.buildBosses(); DS.Spr.buildMonsters(0);
    DS.touchMode = detectTouch(); DS.lowFx = DS.save.options.lowFx != null ? !!DS.save.options.lowFx : DS.touchMode;
    resize();
    DS.UI.init(); DS.UI.menu();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { Input.keys.clear(); resetJoy(); if (DS.state === 'run' && DS.game && !DS.game.over && !DS.game.modal && !DS.game.paused) DS.UI.pause(); } });
    // touch: controls + iOS audio unlock + block browser gestures (pinch/double-tap zoom, pull-to-refresh, callouts)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
    document.addEventListener('touchstart', () => DS.Audio.unlock(), { passive: true });
    document.addEventListener('touchend', () => DS.Audio.unlock(), { passive: true });
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(n => document.addEventListener(n, (e) => e.preventDefault(), { passive: false }));
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => { const now = Date.now(); if (now - lastTouchEnd < 300 && e.target && !e.target.closest('button,input,select,[data-a]')) e.preventDefault(); lastTouchEnd = now; }, { passive: false });
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { Input.keys.clear(); if (DS.state === 'run' && DS.game && !DS.game.over && !DS.game.modal) DS.UI.pause(); });
    canvas.addEventListener('mousemove', (e) => { const p = toCanvas(e); Input.mouseX = p.x; Input.mouseY = p.y; });
    document.addEventListener('mousemove', (e) => { if (!canvas) return; const p = toCanvas(e); Input.mouseX = p.x; Input.mouseY = p.y; });
    canvas.addEventListener('mousedown', (e) => { DS.Audio.init(); if (e.button === 2) Input.mouseR = true; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerdown', () => DS.Audio.unlock(), { once: false });
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.DS);

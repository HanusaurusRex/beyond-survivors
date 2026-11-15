// audio.js - procedural chiptune "medieval synthwave" + SFX (WebAudio)
'use strict';
(function (DS) {
  const AU = { ctx: null, track: null, step: 0, nextTime: 0, timer: null, lastSfx: {} };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // iOS/Android: audio must be started from a user gesture; resume + play a silent buffer once
  AU.unlock = function () {
    AU.init(); const c = AU.ctx; if (!c) return;
    if (c.state === 'suspended' && c.resume) c.resume();
    if (!AU._unlocked) { try { const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); AU._unlocked = true; } catch (e) { /* ignore */ } }
  };
  AU.init = function () {
    if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = AU.ctx = new AC();
    AU.master = ctx.createGain(); AU.master.gain.value = 0.9; AU.master.connect(ctx.destination);
    AU.music = ctx.createGain(); AU.music.connect(AU.master);
    AU.sfx = ctx.createGain(); AU.sfx.connect(AU.master);
    // echo for lead (synthwave)
    AU.delay = ctx.createDelay(1); AU.delay.delayTime.value = 0.28;
    AU.fb = ctx.createGain(); AU.fb.gain.value = 0.32; AU.delay.connect(AU.fb); AU.fb.connect(AU.delay);
    AU.delayOut = ctx.createGain(); AU.delayOut.gain.value = 0.35; AU.delay.connect(AU.delayOut); AU.delayOut.connect(AU.music);
    // pulse waves (25% / 12.5% duty)
    AU.pulse25 = makePulse(ctx, 0.25); AU.pulse12 = makePulse(ctx, 0.125);
    // noise buffer
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    AU.noise = nb;
    AU.applyVolumes();
    if (AU.wanted) AU.playTrack(AU.wanted, true);
  };
  function makePulse(ctx, duty) {
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return ctx.createPeriodicWave(re, im);
  }
  AU.applyVolumes = function () {
    if (!AU.ctx) return; const o = DS.save.options;
    AU.music.gain.setTargetAtTime(o.music * 0.55, AU.ctx.currentTime, 0.05);
    AU.sfx.gain.setTargetAtTime(o.sfx * 0.7, AU.ctx.currentTime, 0.05);
  };

  // ------------- tone helpers -------------
  function tone(t, freq, dur, type, vol, dest, opts) {
    const ctx = AU.ctx; const o = ctx.createOscillator(); const g = ctx.createGain();
    if (type === 'p25') o.setPeriodicWave(AU.pulse25); else if (type === 'p12') o.setPeriodicWave(AU.pulse12); else o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts && opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    if (opts && opts.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = freq * 0.012; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const a = (opts && opts.attack) || 0.005;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (opts && opts.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.lp; o.connect(f); node = f; }
    node.connect(g); g.connect(dest);
    if (opts && opts.echo) g.connect(AU.delay);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, dest, ftype, freq, q) {
    const ctx = AU.ctx; const s = ctx.createBufferSource(); s.buffer = AU.noise;
    const f = ctx.createBiquadFilter(); f.type = ftype || 'highpass'; f.frequency.value = freq || 6000; if (q) f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function kick(t, dest, v) { const ctx = AU.ctx; const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(v || 0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.22); }

  // ------------- music -------------
  // Chords as [rootOffset, quality]; m = minor, M = major. Harmonic-minor V gives the "medieval" flavor.
  const TRACKS = {
    menu: { bpm: 92, root: 50, prog: [[0, 'm'], [5, 'm'], [-4, 'M'], [7, 'M']], drums: 'soft', seed: 7 },
    run: { bpm: 128, root: 50, prog: [[0, 'm'], [-4, 'M'], [-2, 'M'], [7, 'M']], drums: 'drive', seed: 3 },
    boss: { bpm: 142, root: 52, prog: [[0, 'm'], [0, 'm'], [-4, 'M'], [-1, 'dim']], drums: 'hard', seed: 11 },
    results: { bpm: 80, root: 45, prog: [[0, 'm'], [-4, 'M'], [5, 'm'], [7, 'M']], drums: 'none', seed: 5 }
  };
  const QUAL = { m: [0, 3, 7], M: [0, 4, 7], dim: [0, 3, 6] };
  const SCALE = [0, 2, 3, 5, 7, 8, 11, 12]; // harmonic minor
  function buildMelody(tr) {
    const rng = DS.U.mulberry32(tr.seed * 9973);
    tr.melody = [];
    for (let b = 0; b < tr.prog.length; b++) {
      const bar = new Array(16).fill(null); const ch = tr.prog[b];
      for (let s = 0; s < 16; s += 2) {
        if (rng() < (s % 4 === 0 ? 0.85 : 0.45)) {
          let n;
          if (s % 4 === 0) { const q = QUAL[ch[1]]; n = ch[0] + q[Math.floor(rng() * 3)]; }
          else n = SCALE[Math.floor(rng() * SCALE.length)];
          bar[s] = { n: n + 12, len: rng() < 0.3 ? 4 : 2 };
        }
      }
      tr.melody.push(bar);
    }
    // second half repeats with variation (call & response)
    tr.melody = tr.melody.concat(tr.melody.map(bar => bar.map(x => x && Math.random() < 0.2 ? { n: x.n + 2, len: x.len } : x)));
  }
  Object.values(TRACKS).forEach(buildMelody);

  AU.playTrack = function (name, force) {
    AU.wanted = name;
    if (!AU.ctx) return;
    if (AU.track === TRACKS[name] && !force) return;
    AU.track = TRACKS[name]; AU.step = 0; AU.nextTime = AU.ctx.currentTime + 0.08;
    if (!AU.timer) AU.timer = setInterval(schedule, 25);
  };
  AU.stopMusic = function () { AU.track = null; AU.wanted = null; };
  function schedule() {
    if (!AU.ctx || !AU.track) return;
    const tr = AU.track; const stepDur = 60 / tr.bpm / 4;
    while (AU.nextTime < AU.ctx.currentTime + 0.12) { playStep(tr, AU.step, AU.nextTime, stepDur); AU.nextTime += stepDur; AU.step++; }
  }
  function playStep(tr, step, t, sd) {
    const M = AU.music; const barIdx = Math.floor(step / 16) % tr.prog.length; const s = step % 16;
    const ch = tr.prog[barIdx]; const q = QUAL[ch[1]]; const root = tr.root + ch[0];
    // arpeggio (16ths, up-down over 2 octaves)
    const arpOrder = [0, 1, 2, 3, 4, 3, 2, 1]; const tones = [q[0], q[1], q[2], q[0] + 12, q[1] + 12];
    const an = root + 12 + tones[arpOrder[s % 8]];
    tone(t, mtof(an), sd * 0.9, 'p25', 0.045, M, { lp: 3200 });
    // bass: synthwave octave bounce on 8ths
    if (s % 2 === 0) tone(t, mtof(root - 12 + (s % 4 === 2 ? 12 : 0)), sd * 1.8, 'triangle', 0.22, M);
    // lead melody (12.5% pulse w/ vibrato + echo)
    const mel = tr.melody[Math.floor(step / 16) % tr.melody.length][s];
    if (mel && tr.drums !== 'none' || (mel && s % 4 === 0)) tone(t, mtof(tr.root + mel.n + 12), sd * mel.len * 0.95, 'p12', 0.05, M, { vib: true, echo: true, attack: 0.01 });
    // harpsichord-ish pluck on downbeats
    if (s === 0 || s === 8) tone(t, mtof(root + 24 + q[2]), 0.35, 'sawtooth', 0.025, M, { lp: 2400 });
    // drums
    const d = tr.drums;
    if (d === 'none') return;
    if (d === 'soft') { if (s === 0 || s === 10) kick(t, M, 0.5); if (s % 4 === 2) noise(t, 0.03, 0.04, M); return; }
    if (s === 0 || s === 8 || (d === 'hard' && (s === 6 || s === 14)) || (d === 'drive' && s === 10)) kick(t, M, 0.8);
    if (s === 4 || s === 12) { noise(t, 0.15, 0.22, M, 'bandpass', 1800, 0.7); tone(t, 190, 0.08, 'triangle', 0.12, M); }
    if (s % 2 === 0) noise(t, 0.035, 0.06, M); else if (d === 'hard') noise(t, 0.02, 0.03, M);
  }

  // ------------- sfx -------------
  AU.play = function (name) {
    if (!AU.ctx || DS.save.options.sfx <= 0) return;
    const now = AU.ctx.currentTime; const last = AU.lastSfx[name] || 0;
    const minGap = { hit: 0.045, pickup: 0.04, shoot: 0.06, throw: 0.06, kill: 0.04, coin: 0.05, slash: 0.06, can: 0.06, book: 0.06, zap: 0.08, boom: 0.08, spikes: 0.07, coins: 0.15, fire: 0.2, cards: 0.12, warn: 0.2, roar: 0.4, summon: 0.3, teleport: 0.25, charge: 0.3, breath: 0.4, lever: 0.4, phase: 0.5, super: 0.4, bossdeath: 0.5 }[name] || 0.02;
    if (now - last < minGap) return; AU.lastSfx[name] = now;
    const S = AU.sfx, t = now + 0.005;
    switch (name) {
      case 'shoot': tone(t, 900, 0.08, 'p25', 0.08, S, { slide: 400 }); break;
      case 'throw': tone(t, 1300, 0.06, 'p12', 0.06, S, { slide: 700 }); noise(t, 0.04, 0.05, S); break;
      case 'can': tone(t, 500, 0.08, 'square', 0.05, S, { slide: 900 }); break;
      case 'book': tone(t, 220, 0.12, 'triangle', 0.14, S, { slide: 120 }); break;
      case 'slash': noise(t, 0.1, 0.18, S, 'bandpass', 3000, 1.2); tone(t, 600, 0.07, 'sawtooth', 0.04, S, { slide: 200 }); break;
      case 'hit': noise(t, 0.04, 0.08, S, 'highpass', 3000); break;
      case 'kill': tone(t, 300, 0.07, 'square', 0.05, S, { slide: 80 }); break;
      case 'pickup': tone(t, 1200 + Math.random() * 300, 0.05, 'p25', 0.045, S, { slide: 2000 }); break;
      case 'coin': tone(t, 1568, 0.06, 'square', 0.06, S); tone(t + 0.06, 2093, 0.12, 'square', 0.06, S); break;
      case 'levelup': [0, 4, 7, 12, 16].forEach((n, i) => tone(t + i * 0.07, mtof(72 + n), 0.18, 'p25', 0.1, S)); break;
      case 'evolve': [0, 3, 7, 12, 15, 19, 24].forEach((n, i) => tone(t + i * 0.06, mtof(64 + n), 0.3, 'p12', 0.1, S, { echo: true })); break;
      case 'hurt': tone(t, 220, 0.15, 'sawtooth', 0.12, S, { slide: 70 }); break;
      case 'boom': noise(t, 0.4, 0.3, S, 'lowpass', 900); kick(t, S, 0.6); break;
      case 'zap': tone(t, 1800, 0.12, 'sawtooth', 0.05, S, { slide: 200 }); noise(t, 0.08, 0.06, S, 'highpass', 5000); break;
      case 'boss': kick(t, S, 1); noise(t, 0.8, 0.12, S, 'lowpass', 500); [0, -1, -5, -12].forEach((n, i) => tone(t + i * 0.22, mtof(45 + n), 0.5, 'sawtooth', 0.12, S, { lp: 900 })); [12, 13].forEach((n, i) => tone(t + 0.9 + i * 0.15, mtof(57 + n), 0.4, 'square', 0.06, S, { echo: true })); break;
      case 'special': tone(t, 200, 0.4, 'p25', 0.12, S, { slide: 1600 }); noise(t, 0.3, 0.1, S, 'bandpass', 2000, 0.5); break;
      case 'select': tone(t, 880, 0.05, 'p25', 0.07, S); tone(t + 0.05, 1320, 0.07, 'p25', 0.07, S); break;
      case 'hover': tone(t, 660, 0.03, 'p12', 0.03, S); break;
      case 'buy': [0, 7, 12].forEach((n, i) => tone(t + i * 0.05, mtof(84 + n), 0.1, 'square', 0.06, S)); break;
      case 'deny': tone(t, 150, 0.15, 'square', 0.08, S); break;
      case 'death': [0, -3, -7, -12, -15].forEach((n, i) => tone(t + i * 0.18, mtof(57 + n), 0.4, 'p25', 0.12, S)); break;
      case 'jackpot': for (let i = 0; i < 8; i++) tone(t + i * 0.04, 1568 + (i % 2) * 520, 0.05, 'square', 0.05, S); break;
      // ---- v2 boss SFX ----
      case 'roar': tone(t, 140, 0.7, 'sawtooth', 0.16, S, { slide: 60, lp: 700, vib: true }); tone(t, 95, 0.7, 'square', 0.08, S, { slide: 45, lp: 500 }); noise(t, 0.6, 0.12, S, 'bandpass', 500, 0.8); break;
      case 'charge': kick(t, S, 0.8); noise(t, 0.5, 0.18, S, 'lowpass', 400); tone(t, 80, 0.4, 'sawtooth', 0.1, S, { slide: 140, lp: 600 }); break;
      case 'spikes': noise(t, 0.12, 0.16, S, 'bandpass', 1400, 1.5); tone(t, 260 + Math.random() * 60, 0.09, 'square', 0.06, S, { slide: 900 }); kick(t, S, 0.3); break;
      case 'coins': for (let i = 0; i < 5; i++) tone(t + i * 0.03, 2093 + Math.random() * 600, 0.05, 'square', 0.035, S); break;
      case 'lever': noise(t, 0.08, 0.15, S, 'bandpass', 900, 2); for (let i = 0; i < 10; i++) tone(t + 0.1 + i * 0.07, 600 + (i % 3) * 200, 0.05, 'p25', 0.05, S); break;
      case 'summon': tone(t, 110, 0.8, 'triangle', 0.14, S, { slide: 440, vib: true }); tone(t + 0.1, 165, 0.7, 'sawtooth', 0.05, S, { slide: 660, lp: 1200, echo: true }); noise(t, 0.6, 0.06, S, 'bandpass', 1200, 3); break;
      case 'fire': noise(t, 0.6, 0.16, S, 'lowpass', 1200); noise(t + 0.05, 0.4, 0.06, S, 'highpass', 4000); break;
      case 'breath': noise(t, 1.3, 0.22, S, 'lowpass', 1600); tone(t, 120, 1.2, 'sawtooth', 0.07, S, { slide: 70, lp: 600 }); break;
      case 'teleport': tone(t, 300, 0.25, 'p12', 0.08, S, { slide: 2400 }); tone(t + 0.15, 2400, 0.3, 'p12', 0.06, S, { slide: 300, echo: true }); break;
      case 'cards': for (let i = 0; i < 4; i++) noise(t + i * 0.035, 0.03, 0.12, S, 'highpass', 2500); break;
      case 'warn': tone(t, 880, 0.08, 'square', 0.07, S); tone(t + 0.12, 880, 0.08, 'square', 0.07, S); break;
      case 'phase': [0, 6, 12].forEach((n, i) => tone(t + i * 0.12, mtof(40 + n), 0.5, 'sawtooth', 0.12, S, { lp: 1400 })); kick(t, S, 0.9); noise(t, 0.6, 0.15, S, 'lowpass', 600); break;
      case 'super': [0, 7, 12, 19, 24, 31].forEach((n, i) => tone(t + i * 0.05, mtof(60 + n), 0.5, 'p25', 0.1, S, { echo: true })); kick(t, S, 0.8); break;
      case 'bossdeath': kick(t, S, 1); noise(t, 1.2, 0.3, S, 'lowpass', 700); [0, -5, -12, -17].forEach((n, i) => tone(t + i * 0.15, mtof(52 + n), 0.6, 'sawtooth', 0.1, S, { lp: 1000 })); [12, 16, 19, 24].forEach((n, i) => tone(t + 0.7 + i * 0.08, mtof(72 + n), 0.3, 'square', 0.06, S)); break;
    }
  };
  DS.Audio = AU;
})(window.DS);

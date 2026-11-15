// sprites.js - procedural 8-bit pixel art (no external assets)
'use strict';
(function (DS) {
  const S = {};
  S.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; };
  // rows: array of strings, pal: char -> color
  S.fromRows = function (rows, pal, scale, outline) {
    const h = rows.length, w = 16; scale = scale || 3;
    const pad = outline ? 1 : 0;
    const c = S.canvas((w + pad * 2) * scale, (h + pad * 2) * scale); const x = c.getContext('2d');
    const grid = rows.map(r => (r + '................').slice(0, w));
    if (outline) { // dark outline around opaque pixels for Castlevania-ish readability
      x.fillStyle = '#0a0610';
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        if (grid[j][i] === '.') continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + dx, nj = j + dy;
          if (ni < 0 || nj < 0 || ni >= w || nj >= h || grid[nj][ni] === '.') x.fillRect((ni + pad) * scale, (nj + pad) * scale, scale, scale);
        }
      }
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = grid[j][i]; if (ch === '.') continue;
      x.fillStyle = pal[ch] || '#ff00ff'; x.fillRect((i + pad) * scale, (j + pad) * scale, scale, scale);
    }
    return c;
  };
  S.flip = function (src) { const c = S.canvas(src.width, src.height); const x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; };
  S.whiten = function (src) { const c = S.canvas(src.width, src.height); const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); return c; };

  // ---------- characters ----------
  S.chars = {};
  S.buildChars = function () {
    DS.CHARACTERS.forEach(ch => {
      const A = S.fromRows(ch.rows.concat(ch.legsA), ch.pal, 3, true);
      const B = S.fromRows(ch.rows.concat(ch.legsB), ch.pal, 3, true);
      S.chars[ch.id] = { A, B, Af: S.flip(A), Bf: S.flip(B), W: S.whiten(A) };
    });
  };
  S.portraitURL = function (cid, scale) {
    const ch = DS.CHAR_BY_ID[cid];
    return S.fromRows(ch.rows.concat(ch.legsA), ch.pal, scale || 6, true).toDataURL();
  };

  // ---------- monsters ----------
  const MON = {
    bat: ['................', '................', '................', '................', 'aa............aa', 'aAa...a..a...aAa', 'aAAa..aaaa..aAAa', 'aAAAaaaaaaaaAAAa', '.aAAaaeaaeaaAAa.', '..aAAaaaaaaAAa..', '...aa.aaaa.aa...', '......w..w......', '................', '................', '................', '................'],
    skeleton: ['.....wwwww......', '....wwwwwww.....', '....wewwwew.....', '....wwwkwww.....', '.....wkwkw......', '......www.......', '....aaaaaaa.....', '...waaawaaaw....', '...w.awwwa.w....', '...w.aaaaa.w....', '.....awwwa......', '.....w...w......', '.....w...w......', '.....w...w......', '....ww...ww.....', '................'],
    zombie: ['................', '.....zzzzz......', '....zzzzzzz.....', '....zezzzez.....', '....zzzZzzz.....', '....zZkkkZz.....', '.....zzzzz......', '...aaaaaaaaa....', '..zaaAaaaAaaz...', '..z.aaaaaaa.z...', '..z.aAaaaAa.zz..', '.z..aaaaaaa.....', '....AA...AA.....', '....zz...zz.....', '....zz...zz.....', '...kkk...kkk....'],
    ghost: ['................', '.....wwwwww.....', '....wwwwwwww....', '...wwkwwwwkww...', '...wwewwwwewww..', '...wwwwwwwwww...', '...wwwwkkwwww...', '...wwwwkkwwww...', '...awwwwwwwwa...', '...aawwwwwwaa...', '...aaawwwwaaa...', '...aaaaaaaaaa...', '...aa.aaaa.aa...', '...a..a..a..a...', '................', '................'],
    knight: ['......aa........', '.....aaa........', '....xxxxxx......', '...xxxxxxxx.....', '...xXeXXeXx.....', '...xxxxxxxx.....', '....xxxxxx......', '..xxaaaaaaxx..w.', '..xXaAaaAaXx..w.', '..xxaaaaaaxx..w.', '..x.aaaaaa.x.Xw.', '..x.xxxxxx.x..X.', '....xx..xx......', '....xx..xx......', '....XX..XX......', '...kkk..kkk.....']
  };
  S.mon = {};
  S.buildMonsters = function (mapIdx) {
    const tint = DS.MAPS[mapIdx].tint;
    const pal = { a: tint.a, A: tint.A, e: '#ff3030', w: '#e8e0c8', k: '#140c1c', z: '#8aa070', Z: '#5a7048', x: '#a0a0b0', X: '#606070' };
    S.mon = {};
    for (const k in MON) {
      const sc = 3;
      const n = S.fromRows(MON[k], pal, sc, true);
      const elitePal = Object.assign({}, pal, { a: '#ffd040', A: '#c08010', e: '#ffffff' });
      const el = S.fromRows(MON[k], elitePal, sc, true);
      S.mon[k] = { n, nf: S.flip(n), w: S.whiten(n), e: el, ef: S.flip(el) };
    }
  };

  // ---------- bosses (drawn with rect "pixels" on small canvases) ----------
  function pixCanvas(w, h, scale, draw) {
    // draw at 1px per pixel, then scale up with a dark 1-pixel outline for readability
    const lo = S.canvas(w + 2, h + 2); const lx = lo.getContext('2d');
    const p = (px, py, pw, ph, col) => { lx.fillStyle = col; lx.fillRect(px + 1, py + 1, (pw || 1), (ph || 1)); };
    draw(p);
    const d = lx.getImageData(0, 0, w + 2, h + 2).data;
    const c = S.canvas((w + 2) * scale, (h + 2) * scale); const x = c.getContext('2d');
    x.fillStyle = '#0a0610';
    const A = (i, j) => (i < 0 || j < 0 || i >= w + 2 || j >= h + 2) ? 0 : d[(j * (w + 2) + i) * 4 + 3];
    for (let j = 0; j < h + 2; j++) for (let i = 0; i < w + 2; i++) if (!A(i, j) && (A(i + 1, j) || A(i - 1, j) || A(i, j + 1) || A(i, j - 1))) x.fillRect(i * scale, j * scale, scale, scale);
    x.drawImage(lo, 0, 0, (w + 2) * scale, (h + 2) * scale);
    return c;
  }
  const BOSS_DRAW = {
    minotaur: (p) => { // v2: big detailed bull-market minotaur with blood axe, 32x32
      const F = '#5a2e14', F2 = '#7a4020', F3 = '#9a5a30', HN = '#e8dcc0', HN2 = '#b0a080';
      // horns
      p(1, 3, 2, 3, HN2); p(2, 5, 3, 3, HN); p(4, 7, 4, 3, HN); p(7, 8, 3, 2, HN); p(0, 1, 2, 3, '#807050');
      p(29, 3, 2, 3, HN2); p(27, 5, 3, 3, HN); p(24, 7, 4, 3, HN); p(22, 8, 3, 2, HN); p(30, 1, 2, 3, '#807050');
      p(3, 6, 1, 1, '#fff'); p(28, 6, 1, 1, '#fff');
      // head
      p(10, 5, 12, 10, F); p(11, 6, 10, 8, F2); p(13, 4, 6, 2, F); p(14, 3, 4, 1, F3); // forelock tuft
      p(10, 8, 1, 3, '#3a1a08'); p(21, 8, 1, 3, '#3a1a08'); p(8, 9, 2, 2, F2); p(22, 9, 2, 2, F2); // ears
      p(12, 8, 3, 1, '#2a0a04'); p(17, 8, 3, 1, '#2a0a04'); // brows
      p(12, 9, 3, 2, '#ff2010'); p(17, 9, 3, 2, '#ff2010'); p(13, 9, 1, 1, '#ffe080'); p(18, 9, 1, 1, '#ffe080'); // glowing eyes
      p(12, 11, 8, 5, '#b07850'); p(13, 12, 6, 3, '#c89068'); p(13, 13, 2, 1, '#2a1008'); p(17, 13, 2, 1, '#2a1008'); // muzzle + nostrils
      p(14, 15, 4, 2, '#ffd040'); p(15, 15, 2, 1, '#5a2e14'); p(14, 16, 1, 1, '#c09020'); // gold nose ring
      p(11, 14, 1, 1, '#f0f0f0'); p(20, 14, 1, 1, '#f0f0f0'); // steam puffs
      // shoulders, chest, arms
      p(4, 15, 24, 5, F); p(5, 16, 22, 3, F2); p(3, 17, 3, 3, F); p(26, 17, 3, 3, F);
      p(8, 17, 16, 8, F2); p(9, 18, 6, 3, F3); p(17, 18, 6, 3, F3); p(15, 18, 2, 6, F); // pecs
      p(11, 21, 4, 1, F); p(17, 21, 4, 1, F); p(12, 23, 3, 1, F); p(17, 23, 3, 1, F); // abs
      p(13, 16, 6, 1, '#3a1a08'); // fur ruff shadow
      p(2, 19, 4, 7, F); p(3, 20, 2, 5, F2); p(1, 25, 5, 3, '#4a2410'); // left arm/fist
      p(26, 19, 4, 6, F); p(27, 20, 2, 4, F2); p(26, 24, 4, 3, '#4a2410'); // right arm/fist on axe
      p(2, 21, 1, 1, '#ffd040'); p(29, 21, 1, 1, '#ffd040'); // gold arm bands
      // belt & loincloth
      p(8, 25, 16, 2, '#2a1a10'); p(14, 25, 4, 2, '#ffd040'); p(15, 25, 1, 2, '#30a030'); p(16, 25, 1, 1, '#30a030');
      p(11, 27, 10, 2, '#7a1010'); p(12, 27, 8, 1, '#a02020');
      // legs & hooves
      p(9, 27, 5, 3, F); p(18, 27, 5, 3, F); p(10, 28, 3, 2, F2); p(19, 28, 3, 2, F2);
      p(8, 30, 6, 2, '#141010'); p(18, 30, 6, 2, '#141010'); p(10, 30, 1, 1, '#404040'); p(20, 30, 1, 1, '#404040');
      // axe
      p(29, 4, 2, 26, '#5a3a1a'); p(29, 8, 2, 1, '#806040'); p(29, 14, 2, 1, '#806040');
      p(25, 2, 4, 8, '#a8b0b8'); p(24, 3, 1, 6, '#d0d8e0'); p(31, 2, 1, 8, '#a8b0b8'); p(26, 3, 2, 6, '#c8d0d8');
      p(24, 6, 2, 1, '#c01010'); p(25, 9, 1, 2, '#a00808'); p(26, 10, 1, 1, '#a00808'); // blood
    },
    slotgolem: (p) => {
      p(4, 3, 16, 20, '#5a5a66'); p(5, 4, 14, 18, '#7a7a88'); p(6, 6, 12, 6, '#101018');
      p(7, 7, 3, 4, '#f0f0e0'); p(11, 7, 3, 4, '#f0f0e0'); p(15, 7, 2, 4, '#f0f0e0');
      p(8, 8, 1, 2, '#e02020'); p(12, 8, 1, 2, '#e02020'); p(15, 8, 1, 2, '#e02020');
      p(5, 3, 14, 2, '#ffd040'); p(7, 13, 3, 2, '#ff3030'); p(14, 13, 3, 2, '#ff3030');
      p(9, 16, 6, 2, '#202028'); p(9, 19, 6, 1, '#ffd040');
      p(20, 5, 2, 10, '#a0a0a8'); p(20, 3, 3, 3, '#e02020'); p(2, 10, 2, 8, '#5a5a66');
      p(5, 23, 5, 1, '#3a3a46'); p(14, 23, 5, 1, '#3a3a46');
      p(5, 4, 1, 18, '#9a9aa8'); p(18, 4, 1, 18, '#4a4a56'); p(6, 12, 12, 1, '#ffd040'); p(10, 20, 1, 1, '#ffd040'); p(13, 20, 1, 1, '#ffd040'); p(21, 3, 1, 1, '#ff8080');
    },
    lich: (p) => {
      p(9, 1, 6, 1, '#ffd040'); p(9, 0, 1, 1, '#ffd040'); p(12, 0, 1, 1, '#ffd040'); p(14, 0, 1, 1, '#ffd040');
      p(8, 2, 8, 6, '#e8e0c8'); p(9, 4, 2, 2, '#40ff80'); p(13, 4, 2, 2, '#40ff80'); p(10, 7, 4, 1, '#140c1c');
      p(6, 8, 12, 4, '#4a1a6a'); p(5, 12, 14, 6, '#3a1a5a'); p(4, 18, 16, 6, '#2a1040'); p(6, 18, 2, 6, '#4a1a6a'); p(16, 18, 2, 6, '#4a1a6a');
      p(11, 9, 2, 8, '#ffd040'); p(3, 10, 3, 2, '#e8e0c8'); p(18, 10, 3, 2, '#e8e0c8');
      p(21, 3, 1, 20, '#806040'); p(20, 1, 3, 3, '#40ff80'); p(21, 2, 1, 1, '#e0ffe0');
      p(7, 13, 1, 4, '#6a2a8a'); p(16, 13, 1, 4, '#6a2a8a'); p(9, 12, 1, 1, '#40ff80'); p(14, 14, 1, 1, '#40ff80'); p(5, 23, 1, 1, '#40ff80'); p(18, 22, 1, 1, '#40ff80'); p(9, 3, 1, 1, '#fff');
    },
    wyrm: (p) => { // hot dog dragon
      p(2, 10, 20, 8, '#d8a050'); p(3, 11, 18, 6, '#a03018'); p(3, 12, 18, 4, '#c04020');
      for (let i = 0; i < 9; i++) p(4 + i * 2, 13 + (i % 2), 1, 1, '#ffd020');
      p(18, 5, 6, 7, '#a03018'); p(19, 6, 4, 5, '#c04020'); p(20, 7, 1, 1, '#ffff40'); p(22, 7, 1, 1, '#ffff40'); p(19, 10, 5, 1, '#f0f0e0');
      p(6, 4, 4, 6, '#6a1a10'); p(12, 4, 4, 6, '#6a1a10'); p(7, 5, 2, 4, '#8a2a18'); p(13, 5, 2, 4, '#8a2a18');
      p(0, 14, 3, 2, '#a03018'); p(5, 18, 2, 3, '#6a1a10'); p(15, 18, 2, 3, '#6a1a10');
      p(3, 10, 18, 1, '#f0c070'); p(23, 9, 1, 2, '#ff8020'); p(23, 8, 1, 1, '#ffd040'); for (let i = 0; i < 4; i++) p(8 + i * 3, 9, 1, 1, '#40a020'); p(19, 4, 1, 1, '#6a1a10'); p(22, 4, 1, 1, '#6a1a10');
    },
    pitboss: (p) => { // demon dealer in a suit
      p(7, 0, 2, 3, '#c02020'); p(15, 0, 2, 3, '#c02020');
      p(8, 2, 8, 7, '#c03030'); p(9, 4, 2, 1, '#ffff40'); p(13, 4, 2, 1, '#ffff40'); p(10, 7, 4, 1, '#f0f0e0');
      p(6, 9, 12, 10, '#18181e'); p(11, 9, 2, 8, '#f0f0e0'); p(11, 10, 2, 6, '#c02020');
      p(4, 10, 2, 8, '#18181e'); p(18, 10, 2, 8, '#18181e'); p(3, 17, 3, 2, '#c03030'); p(18, 17, 3, 2, '#c03030');
      p(19, 13, 4, 5, '#f0f0e0'); p(20, 14, 1, 1, '#e02020'); p(21, 16, 1, 1, '#101010');
      p(7, 19, 4, 5, '#18181e'); p(13, 19, 4, 5, '#18181e'); p(6, 8, 12, 1, '#30a030');
      p(7, 10, 1, 8, '#2a2a34'); p(16, 10, 1, 8, '#2a2a34'); p(8, 11, 2, 1, '#ffd040'); p(7, 23, 4, 1, '#c0c0c0'); p(13, 23, 4, 1, '#c0c0c0'); p(9, 3, 6, 1, '#d04040'); p(12, 1, 1, 1, '#ffd040');
    },
    house: (p) => { // casino castle demon, 32x32
      p(2, 8, 28, 22, '#3a2a4a'); p(4, 10, 24, 18, '#4a3a5a');
      p(2, 4, 4, 6, '#3a2a4a'); p(26, 4, 4, 6, '#3a2a4a'); p(13, 2, 6, 8, '#3a2a4a');
      p(2, 3, 1, 1, '#3a2a4a'); p(4, 3, 1, 1, '#3a2a4a'); p(26, 3, 1, 1, '#3a2a4a'); p(29, 3, 1, 1, '#3a2a4a');
      p(0, 0, 3, 3, '#c02020'); p(29, 0, 3, 3, '#c02020'); p(15, 0, 2, 2, '#ffd040');
      for (let i = 0; i < 12; i++) p(4 + i * 2, 9, 1, 1, i % 2 ? '#ffd040' : '#ff3030');
      p(8, 13, 5, 4, '#ffd040'); p(19, 13, 5, 4, '#ffd040'); p(10, 14, 2, 2, '#c00000'); p(21, 14, 2, 2, '#c00000');
      p(9, 21, 14, 6, '#140c1c'); for (let i = 0; i < 7; i++) p(9 + i * 2, 21, 1, 2, '#f0f0e0'); for (let i = 0; i < 7; i++) p(10 + i * 2, 25, 1, 2, '#f0f0e0');
      p(14, 18, 4, 2, '#30c030'); p(2, 29, 28, 3, '#2a1a3a');
    },
    taxman: (p) => { // hooded reaper accountant
      p(10, 1, 12, 4, '#202028'); p(8, 4, 16, 10, '#202028'); p(11, 6, 10, 7, '#0a0a10'); p(13, 8, 2, 2, '#ff3030'); p(18, 8, 2, 2, '#ff3030');
      p(14, 11, 4, 1, '#e8e0c8'); p(6, 14, 20, 14, '#18181e'); p(8, 15, 16, 12, '#26262e'); p(4, 27, 24, 3, '#18181e');
      p(15, 15, 2, 10, '#f0f0e0'); p(15, 16, 2, 2, '#30a030');
      p(1, 2, 2, 28, '#806040'); p(0, 1, 12, 2, '#c0c8d0'); p(0, 3, 6, 1, '#a0a8b0');
      p(24, 20, 7, 6, '#5a3a1a'); p(26, 19, 3, 1, '#c09030'); p(27, 22, 1, 1, '#ffd040');
    }
  };
  S.boss = {};
  S.buildBosses = function () {
    for (const k in BOSS_DRAW) {
      const big = (k === 'house' || k === 'taxman' || k === 'minotaur');
      const c = pixCanvas(big ? 32 : 24, big ? 32 : 24, k === 'minotaur' ? 4 : 4, BOSS_DRAW[k]);
      S.boss[k] = { n: c, f: S.flip(c), w: S.whiten(c) };
    }
  };

  // ---------- projectile / icon shapes ----------
  // draws centered at (0,0), facing +x. s ~ radius in px
  S.drawShape = function (x, shape, c1, c2, s) {
    const r = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    switch (shape) {
      case 'arrow': r(-s * 1.6, -1.5, s * 2.6, 3, c2); r(s * 0.8, -3.5, s * 0.8, 7, c1); r(s * 1.4, -1.5, 2, 3, '#fff'); r(-s * 1.8, -4, 4, 3, '#e8e0c8'); r(-s * 1.8, 1, 4, 3, '#e8e0c8'); break;
      case 'dog': r(-s * 1.8, -1, s * 3.6, 2, '#c8a070'); r(-s, -s * 0.6, s * 2, s * 1.2, c1); r(-s * 0.8, -s * 0.6, s * 1.6, s * 0.35, '#f0c070'); r(-s * 0.4, -1, s * 0.3, 2, c2); break;
      case 'dagger': r(-s, -2, s * 0.9, 4, '#6a4020'); r(-s * 0.2, -4, 2, 8, c2); r(0, -2, s * 1.4, 4, c1); r(s * 1.2, -1, 3, 2, '#fff'); break;
      case 'can': r(-s * 0.6, -s, s * 1.2, s * 2, c1); r(-s * 0.6, -s * 0.4, s * 1.2, s * 0.8, c2); r(-s * 0.6, -s, s * 1.2, 2, '#fff'); break;
      case 'book': r(-s, -s * 0.8, s * 2, s * 1.6, c1); r(-s * 0.8, -s * 0.6, s * 1.6, s * 1.2, '#4a3020'); r(-1, -s * 0.5, 2, s, c2); r(-s * 0.3, -1, s * 0.6, 2, c2); r(s * 0.8, -s * 0.8, s * 0.2, s * 1.6, '#e8e0c8'); break;
      case 'ticket': r(-s, -s * 0.6, s * 2, s * 1.2, c1); r(-s * 0.7, -s * 0.3, s * 1.4, s * 0.6, c2); r(-s * 0.2, -s * 0.2, s * 0.4, s * 0.4, '#e02020'); break;
      case 'foam': x.fillStyle = c1; x.beginPath(); x.arc(0, 0, s, 0, 7); x.fill(); x.fillStyle = c2; x.fillRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.6); break;
      case 'disc': case 'coin': x.fillStyle = c1; x.beginPath(); x.arc(0, 0, s, 0, 7); x.fill(); x.fillStyle = c2; x.beginPath(); x.arc(0, 0, s * 0.55, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(-s * 0.6, -s * 0.7, 2, 2); break;
      case 'bag': r(-s, -s, s * 2, s * 2, c1); r(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2, c2); r(-s * 0.3, -s * 0.3, s * 0.6, s * 0.6, c1); break;
      case 'cooler': r(-s, -s * 0.8, s * 2, s * 1.6, c1); r(-s, -s * 0.8, s * 2, s * 0.5, c2); r(-s * 0.3, -s * 1.1, s * 0.6, s * 0.3, '#404040'); break;
      case 'umbrella': x.fillStyle = c1; x.beginPath(); x.arc(0, 0, s, Math.PI, 0); x.fill(); x.fillStyle = c2; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, s, Math.PI * 1.33, Math.PI * 1.66); x.fill(); r(-1, 0, 2, s, '#e8e0c8'); break;
      case 'kettle': x.fillStyle = c1; x.beginPath(); x.arc(0, s * 0.2, s * 0.8, 0, 7); x.fill(); x.strokeStyle = c1; x.lineWidth = 3; x.beginPath(); x.arc(0, -s * 0.5, s * 0.45, Math.PI, 0); x.stroke(); r(-s * 0.4, 0, 3, 3, c2); break;
      case 'dumbbell': r(-s, -s * 0.7, s * 0.5, s * 1.4, c1); r(s * 0.5, -s * 0.7, s * 0.5, s * 1.4, c1); r(-s * 0.5, -1.5, s, 3, c2); break;
      case 'sushi': r(-s, -s * 0.5, s * 2, s, '#f0f0f0'); r(-s, -s * 0.8, s * 2, s * 0.5, c1); r(-s * 0.2, -s * 0.5, s * 0.4, s, '#204020'); break;
      case 'chain': x.strokeStyle = c1; x.lineWidth = 3; for (let i = -1; i <= 1; i++) { x.beginPath(); x.ellipse(i * s * 0.7, 0, s * 0.45, s * 0.3, 0, 0, 7); x.stroke(); } break;
      case 'cap': x.fillStyle = c1; x.beginPath(); x.arc(0, 0, s * 0.8, 0, 7); x.fill(); x.fillStyle = c2; x.beginPath(); x.arc(0, 0, s * 0.5, 0, 7); x.fill(); break;
      case 'casserole': r(-s, -s * 0.5, s * 2, s, '#c0c0c8'); r(-s * 0.9, -s * 0.7, s * 1.8, s * 0.4, c1); r(-s * 1.2, -s * 0.3, s * 0.3, s * 0.3, '#808088'); r(s * 0.9, -s * 0.3, s * 0.3, s * 0.3, '#808088'); break;
      case 'ball': case 'ball2': x.fillStyle = c1; x.beginPath(); x.arc(0, 0, s, 0, 7); x.fill(); x.fillStyle = c2; x.beginPath(); x.arc(0, 0, s * 0.5, 0, 7); x.fill(); break;
      case 'bolt': x.fillStyle = c1; x.beginPath(); x.moveTo(-s * 0.2, -s); x.lineTo(s * 0.5, -s); x.lineTo(0, -s * 0.1); x.lineTo(s * 0.5, -s * 0.1); x.lineTo(-s * 0.4, s); x.lineTo(-s * 0.1, 0); x.lineTo(-s * 0.5, 0); x.closePath(); x.fill(); break;
      case 'bottle': r(-s * 0.5, -s * 0.4, s, s * 1.4, c1); r(-s * 0.2, -s, s * 0.4, s * 0.6, c1); r(-s * 0.5, 0, s, s * 0.4, c2); break;
      case 'seven': r(-s, -s, s * 2, s * 2, c2); x.fillStyle = c1; x.font = 'bold ' + Math.round(s * 1.8) + 'px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('7', 0, 1); break;
      case 'meat': x.fillStyle = c1; x.beginPath(); x.ellipse(0, 0, s, s * 0.7, 0, 0, 7); x.fill(); r(-s * 0.6, -s * 0.3, s * 1.2, 2, c2); r(-s * 0.4, s * 0.1, s, 2, c2); break;
      case 'slash': x.strokeStyle = c1; x.lineWidth = 3; x.beginPath(); x.arc(-s * 0.5, 0, s, -1, 1); x.stroke(); break;
      case 'ring': x.strokeStyle = c1; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, s * 0.8, 0, 7); x.stroke(); x.strokeStyle = c2; x.beginPath(); x.arc(0, 0, s * 0.4, 0, 7); x.stroke(); break;
      case 'drop': x.fillStyle = c1; x.beginPath(); x.arc(0, s * 0.2, s * 0.7, 0, 7); x.fill(); x.beginPath(); x.moveTo(-s * 0.5, 0); x.lineTo(0, -s); x.lineTo(s * 0.5, 0); x.fill(); r(-s * 0.2, 0, 2, 2, c2); break;
      case 'shirt': r(-s * 0.6, -s * 0.6, s * 1.2, s * 1.5, c1); r(-s, -s * 0.6, s * 2, s * 0.5, c1); r(-s * 0.2, -s * 0.6, s * 0.4, s * 0.3, c2); r(-s * 0.6, s * 0.3, s * 1.2, 2, c2); break;
      case 'glass': r(-s * 0.6, -s * 0.8, s * 1.2, s * 0.7, c1); r(-1, -s * 0.1, 2, s * 0.8, c2); r(-s * 0.5, s * 0.7, s, 2, c2); break;
      case 'cloud': case 'wind': case 'wave': x.fillStyle = c1; for (let i = -1; i <= 1; i++) { x.beginPath(); x.arc(i * s * 0.5, (i === 0 ? -s * 0.2 : 0), s * 0.5, 0, 7); x.fill(); } x.fillStyle = c2; x.fillRect(-s * 0.8, s * 0.2, s * 1.6, 2); break;
      case 'mirror': r(-s * 0.5, -s, s, s * 1.6, '#806040'); r(-s * 0.35, -s * 0.85, s * 0.7, s * 1.3, c1); r(-s * 0.2, -s * 0.6, 2, s * 0.5, c2); break;
      case 'burger': r(-s, -s * 0.7, s * 2, s * 0.5, c1); r(-s, -s * 0.2, s * 2, s * 0.3, c2); r(-s, s * 0.1, s * 2, s * 0.35, '#5a2a10'); r(-s, s * 0.45, s * 2, s * 0.35, c1); break;
      case 'foot': x.fillStyle = c1; x.beginPath(); x.ellipse(0, s * 0.2, s * 0.5, s * 0.8, 0, 0, 7); x.fill(); r(-s * 0.2, -s, s * 0.4, s * 0.4, '#c0c0c0'); r(-s * 0.4, s * 0.6, s * 0.8, 2, c2); break;
      case 'card': r(-s * 0.7, -s, s * 1.4, s * 2, c1); r(-s * 0.5, -s * 0.8, s, s * 1.6, c2); break;
      case 'magnet': x.strokeStyle = c1; x.lineWidth = s * 0.5; x.beginPath(); x.arc(0, -s * 0.1, s * 0.6, Math.PI, 0); x.stroke(); r(-s * 0.85, -s * 0.1, s * 0.5, s * 0.8, c2); r(s * 0.35, -s * 0.1, s * 0.5, s * 0.8, c2); break;
      case 'goggles': r(-s, -s * 0.35, s * 0.9, s * 0.7, c1); r(s * 0.1, -s * 0.35, s * 0.9, s * 0.7, c1); r(-s * 0.1, -s * 0.15, s * 0.2, 2, c2); r(-s * 0.8, -s * 0.25, 2, 2, c2); break;
      case 'note': r(-s * 0.4, -s * 0.9, 2, s * 1.4, c1); x.fillStyle = c1; x.beginPath(); x.ellipse(-s * 0.6, s * 0.5, s * 0.35, s * 0.25, -0.4, 0, 7); x.fill(); r(-s * 0.4, -s * 0.9, s * 0.8, 2, c2); break;
      case 'wing': x.fillStyle = c1; x.beginPath(); x.moveTo(-s, s * 0.6); x.quadraticCurveTo(-s * 0.2, -s, s, -s * 0.8); x.lineTo(s * 0.2, s * 0.6); x.closePath(); x.fill(); r(-s * 0.4, 0, s * 0.8, 2, c2); break;
      case 'tome': { // glowing occult tome
        r(-s, -s * 0.8, s * 2, s * 1.6, c1); r(-s * 0.8, -s * 0.6, s * 1.6, s * 1.2, '#1a0810'); r(s * 0.8, -s * 0.8, s * 0.25, s * 1.6, '#e8d8b0');
        x.strokeStyle = c2; x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, s * 0.45, 0, 7); x.stroke();
        x.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; const px = Math.cos(a) * s * 0.42, py = Math.sin(a) * s * 0.42; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.closePath(); x.stroke();
        r(-s, -s * 0.8, s * 2, 1.5, c2); break; }
      case 'page': { // burning hellfire page
        r(-s * 0.7, -s * 0.9, s * 1.4, s * 1.8, '#f0e0b0'); r(-s * 0.5, -s * 0.5, s, 1, '#604030'); r(-s * 0.5, -s * 0.1, s * 0.8, 1, '#604030'); r(-s * 0.5, s * 0.3, s, 1, '#604030');
        r(-s * 0.7, s * 0.5, s * 1.4, s * 0.4, c2 || '#ff6020'); r(-s * 0.5, s * 0.3, s * 0.3, s * 0.3, '#ffd040'); r(s * 0.2, s * 0.35, s * 0.3, s * 0.3, '#ffd040'); break; }
      case 'fire': x.fillStyle = c1; x.beginPath(); x.moveTo(-s, 0); x.quadraticCurveTo(0, -s * 1.1, s, 0); x.quadraticCurveTo(0, s * 1.1, -s, 0); x.fill(); x.fillStyle = '#ffe080'; x.beginPath(); x.arc(s * 0.3, 0, s * 0.35, 0, 7); x.fill(); break;
      case 'cig': r(-s, -1.5, s * 1.6, 3, '#f0f0f0'); r(s * 0.6, -1.5, s * 0.3, 3, '#ff6020'); r(-s, -1.5, s * 0.4, 3, '#c08040'); break;
      default: x.fillStyle = c1; x.beginPath(); x.arc(0, 0, s, 0, 7); x.fill();
    }
  };
  S.iconCache = {};
  S.iconURL = function (ab) {
    if (S.iconCache[ab.id]) return S.iconCache[ab.id];
    const c = S.canvas(40, 40); const x = c.getContext('2d');
    if (ab.kind === 'super') { const g = x.createLinearGradient(0, 0, 40, 40); g.addColorStop(0, '#5a0a5a'); g.addColorStop(1, '#2a0a40'); x.fillStyle = g; } else x.fillStyle = ab.kind === 'secondary' ? '#14243a' : ab.kind === 'evo' ? '#3a2410' : '#2a1428';
    x.fillRect(0, 0, 40, 40);
    if (ab.kind === 'super') { const g2 = x.createLinearGradient(0, 0, 40, 40); g2.addColorStop(0, '#ff40ff'); g2.addColorStop(0.5, '#ffd040'); g2.addColorStop(1, '#40e0ff'); x.strokeStyle = g2; }
    else x.strokeStyle = ab.kind === 'secondary' ? '#4fa3ff' : ab.kind === 'evo' ? '#ffd040' : '#e05080';
    x.lineWidth = 3; x.strokeRect(1.5, 1.5, 37, 37);
    if (ab.kind === 'super') { x.fillStyle = '#ffd040'; x.font = 'bold 9px monospace'; x.fillText('S', 3, 10); }
    x.translate(20, 20); x.rotate(ab.shape === 'arrow' || ab.shape === 'dagger' || ab.shape === 'dog' ? -0.7 : 0);
    S.drawShape(x, ab.shape, ab.colors[0], ab.colors[1], 10);
    return (S.iconCache[ab.id] = c.toDataURL());
  };
  S.iconCanvas = {};
  S.getIconCanvas = function (ab) {
    if (S.iconCanvas[ab.id]) return S.iconCanvas[ab.id];
    const img = new Image(); img.src = S.iconURL(ab); S.iconCanvas[ab.id] = img; return img;
  };


  // ---------- gear slot icons (10x10 pixel glyphs, tinted by rarity) ----------
  const SLOT_ROWS = {
    helmet: ['...xxxx...', '..xxxxxx..', '.xxxxxxxx.', '.xx.xx.xx.', '.xx....xx.', '.xxxxxxxx.', '.x......x.', '..........', '..........', '..........'],
    necklace: ['.x......x.', '.x......x.', '..x....x..', '..x....x..', '...x..x...', '....xx....', '...xxxx...', '...x##x...', '...xxxx...', '..........'],
    chest: ['.xx....xx.', 'xxxx..xxxx', 'xxxxxxxxxx', '.xxxxxxxx.', '.xxx##xxx.', '.xxxxxxxx.', '.xxxxxxxx.', '.xxxxxxxx.', '..........', '..........'],
    pants: ['.xxxxxxxx.', '.xxxxxxxx.', '.xxx..xxx.', '.xxx..xxx.', '.xxx..xxx.', '.xxx..xxx.', '.xxx..xxx.', '.xx....xx.', '..........', '..........'],
    boots: ['..xxx.....', '..xxx.....', '..xxx.....', '..xxx.....', '..xxxxx...', '.xxxxxxxx.', '.xxxxxxxx.', '..........', '..........', '..........'],
    bracers: ['..xxxxxx..', '..x####x..', '..xxxxxx..', '..xxxxxx..', '..x####x..', '..xxxxxx..', '..........', '..........', '..........', '..........'],
    gloves: ['..x.x.x...', '..x.x.x.x.', '..xxxxxxx.', '.xxxxxxxx.', '.xxxxxxxx.', '..xxxxxx..', '..xxxxxx..', '..x####x..', '..........', '..........'],
    ring: ['...####...', '..#....#..', '..xxxxxx..', '.xx....xx.', '.x......x.', '.x......x.', '.xx....xx.', '..xxxxxx..', '..........', '..........'],
    trinket: ['....xx....', '...xxxx...', '..xx##xx..', '.xx####xx.', '..xx##xx..', '...xxxx...', '....xx....', '..........', '..........', '..........']
  };
  S.slotIconCache = {};
  S.slotIconURL = function (slot, col, gem) {
    const key = slot + col + gem; if (S.slotIconCache[key]) return S.slotIconCache[key];
    const rows = SLOT_ROWS[slot === 'ring1' || slot === 'ring2' ? 'ring' : slot] || SLOT_ROWS.trinket;
    const c = S.fromRows(rows.map(r => '...' + r + '...'), { x: col, '#': gem || '#ffffff' }, 4, true);
    return (S.slotIconCache[key] = c.toDataURL());
  };

  // ---------- map tiles & props ----------
  S.buildTile = function (mapIdx) {
    const P = DS.MAPS[mapIdx].pal; const T = 384, sc = 4; const c = S.canvas(T, T); const x = c.getContext('2d');
    const rng = DS.U.mulberry32(1234 + mapIdx * 77);
    for (let j = 0; j < T / sc; j++) for (let i = 0; i < T / sc; i++) {
      const v = rng(); x.fillStyle = v < 0.55 ? P.g1 : v < 0.9 ? P.g2 : P.g3; x.fillRect(i * sc, j * sc, sc, sc);
    }
    // flagstone fragments
    for (let n = 0; n < 7; n++) {
      const bx = Math.floor(rng() * 88) * sc, by = Math.floor(rng() * 88) * sc, bw = (3 + Math.floor(rng() * 4)) * sc, bh = (2 + Math.floor(rng() * 3)) * sc;
      x.fillStyle = P.stone2; x.fillRect(bx, by, bw, bh); x.fillStyle = P.stone; x.fillRect(bx + sc, by + sc / 2, bw - sc * 2, bh - sc);
    }
    for (let n = 0; n < 70; n++) { x.fillStyle = P.accent; x.globalAlpha = 0.5; x.fillRect(Math.floor(rng() * 96) * sc, Math.floor(rng() * 96) * sc, sc, sc * 2); }
    // dark patches break up repetition
    for (let n = 0; n < 6; n++) { x.globalAlpha = 0.18; x.fillStyle = '#000'; const px = rng() * T, py = rng() * T, pr = 30 + rng() * 50; for (let k = 0; k < 40; k++) { const a = rng() * 6.28, d = rng() * pr; x.fillRect(Math.floor((px + Math.cos(a) * d) / sc) * sc, Math.floor((py + Math.sin(a) * d) / sc) * sc, sc * 2, sc * 2); } }
    x.globalAlpha = 1; return c;
  };
  // props drawn directly in world space
  S.drawProp = function (x, kind, px, py, P, t, seed) {
    const r = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(px + a, py + b, w, h); };
    switch (kind) {
      case 0: // broken pillar
        r(-14, -60, 28, 8, P.stone); r(-11, -52, 22, 48, P.stone2); r(-7, -52, 6, 48, P.stone); r(-16, -6, 32, 8, P.stone); r(-11, -66, 10, 6, P.stone2); break;
      case 1: // ruined wall
        r(-40, -30, 80, 30, P.stone2); for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) r(-38 + i * 16 + (j % 2) * 8, -28 + j * 10, 14, 8, P.stone);
        r(-40, -38, 16, 8, P.stone2); r(8, -42, 20, 12, P.stone2); break;
      case 2: // tombstone
        r(-10, -26, 20, 26, P.stone); r(-8, -30, 16, 4, P.stone); r(-2, -22, 4, 12, P.stone2); r(-6, -18, 12, 3, P.stone2); r(-14, -2, 28, 4, '#1a1410'); break;
      case 3: { // torch / brazier with flicker
        r(-3, -34, 6, 34, '#4a3020'); r(-8, -40, 16, 6, '#2a2a30');
        const f = Math.sin(t * 12 + seed) * 2;
        r(-6, -50 + f, 12, 10, '#ff6020'); r(-4, -56 + f, 8, 8, '#ffb030'); r(-2, -58 + f, 4, 4, '#fff0a0');
        x.globalAlpha = 0.12; x.fillStyle = '#ffa040'; x.beginPath(); x.arc(px, py - 45, 60 + f * 3, 0, 7); x.fill(); x.globalAlpha = 1; break; }
      case 4: // dead tree
        r(-4, -50, 8, 50, '#2a1e18'); r(-20, -44, 16, 4, '#2a1e18'); r(4, -36, 18, 4, '#2a1e18'); r(-22, -52, 4, 10, '#2a1e18'); r(18, -44, 4, 10, '#2a1e18'); break;
      case 5: // barrel / crate with $ (degenerate treasure)
        r(-12, -22, 24, 22, '#5a3a1a'); r(-12, -16, 24, 3, '#2a1a0a'); r(-12, -7, 24, 3, '#2a1a0a'); r(-3, -20, 6, 2, '#ffd040'); break;
    }
  };
  DS.Spr = S;
})(window.DS);

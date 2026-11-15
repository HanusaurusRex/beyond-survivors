// ui.js - DOM menus: main menu, character select, upgrade/gear, marketplace, options, pause, level-up, results
'use strict';
(function (DS) {
  const U = DS.U; const esc = U.esc;
  const UI = { el: null, screen: null, selChar: null, selMap: 0, rebinding: null, optReturn: 'menu' };
  const $ = (s, r) => (r || document).querySelector(s);
  const KEYNAMES = { Space: 'SPACE', Escape: 'ESC', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'ENTER', Tab: 'TAB' };
  UI.keyName = (c) => KEYNAMES[c] || (c || '').replace(/^Key/, '').replace(/^Digit/, '');
  const portraits = {};
  const portrait = (cid, sc) => portraits[cid + sc] || (portraits[cid + sc] = DS.Spr.portraitURL(cid, sc));
  const sfx = (n) => DS.Audio.play(n);

  UI.init = function () {
    UI.el = $('#ui'); UI.overlay = $('#overlay');
    UI.el.addEventListener('click', onClick); UI.overlay.addEventListener('click', onClick);
    UI.el.addEventListener('mouseover', (e) => { if (e.target.closest && e.target.closest('button:not([disabled])') && e.target.tagName === 'BUTTON') sfx('hover'); });
    UI.el.addEventListener('mouseover', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el && UI.screen === 'upgrade' && !DS.touchMode) tipShow(el, UI.selChar, +el.dataset.tip); });
    UI.el.addEventListener('mouseout', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) tipHide(); });
    UI.el.addEventListener('input', onInput); UI.overlay.addEventListener('input', onInput);
    UI.selChar = DS.save.lastChar || 'brandon'; UI.selMap = DS.save.lastMap || 0;
    UI.applyBrightness();
  };
  UI.onResize = function () { tipHide(); };
  UI.applyBrightness = function () { const b = DS.save.options.brightness; $('#wrap').style.filter = b === 1 ? '' : 'brightness(' + b + ')'; };
  function set(html, screen) { const tp = document.getElementById('tip'); if (tp) tp.style.display = 'none'; UI.screen = screen; UI.el.innerHTML = html; UI.el.style.display = html ? 'block' : 'none'; UI.el.scrollTop = 0; }
  function goldBar() { return '<div class="goldbar">● <b>' + U.fmt(DS.save.gold) + '</b> gold</div>'; }
  function debugPanel() {
    if (!DS.debug) return '';
    return '<div class="debug">DEBUG <button data-a="dbg-gold">+10k gold</button><button data-a="dbg-maps">Unlock maps</button><button data-a="dbg-lvl">+5 char lvls</button><button data-a="dbg-set">Give all sets</button><button data-a="dbg-loot">Legendaries</button></div>';
  }

  // ---------------- main menu ----------------
  UI.menu = function () {
    DS.state = 'menu'; DS.Audio.playTrack('menu');
    set('<div class="menu-screen">' +
      '<div class="title"><div class="t1">BEYOND</div><div class="t2">SURVIVORS</div><div class="sub">~ The House Always Wins ~</div></div>' +
      '<div class="menu-buttons">' +
      '<button class="big" data-a="start">Start Game</button>' +
      '<button class="big" data-a="upgrade">Character Upgrade</button>' +
      '<button class="big" data-a="market">Marketplace</button>' +
      '<button class="big" data-a="options">Options</button>' +
      (DS.touchMode ? (document.fullscreenEnabled && !document.fullscreenElement ? '<button class="big ghost" data-a="fullscreen">Fullscreen</button>' : '') : '<button class="big" data-a="exit">Exit Game</button>') +
      '</div>' + goldBar() + '<div class="foot">' + (DS.touchMode ? 'Drag left side to move · Auto-attack aims itself · Special button auto-aims · ❚❚ pauses' : 'WASD move · Auto-attack aims itself (Bosses > Elites > Nearest) · Mouse aims special · ' + UI.keyName(DS.save.options.keys.special) + '/Right-click special · ESC pause') + '</div>' + debugPanel() + '</div>', 'menu');
  };

  // ---------------- character select ----------------
  UI.charSelect = function () {
    DS.state = 'menu';
    const sv = DS.save; const debugAll = DS.debug;
    const cards = DS.CHARACTERS.map(c => {
      const sc = sv.chars[c.id]; const b = c.base; const sel = UI.selChar === c.id;
      return '<div class="card char ' + (sel ? 'sel' : '') + '" data-a="pick-char" data-id="' + c.id + '" style="--cc:' + c.color + '">' +
        '<img class="portrait" src="' + portrait(c.id, 5) + '"><div class="cname">' + c.name + '</div><div class="ctitle">' + c.title + '</div>' +
        '<div class="clvl">Lv ' + sc.level + ' · best ' + U.fmtTime(sc.bestTime) + '</div>' +
        '<div class="cstats">HP ' + b.hp + ' · SPD ' + b.speed + '<br>DMG ' + b.dmg + ' · CRIT ' + b.crit + '%</div>' +
        '<div class="cweap">⚔ ' + c.main.name + '</div><div class="cspec">✦ ' + c.special.name + '</div></div>';
    }).join('');
    const ch = DS.CHAR_BY_ID[UI.selChar];
    const maps = DS.MAPS.map((m, i) => {
      const locked = i >= sv.mapsUnlocked && !debugAll; const sel = UI.selMap === i;
      return '<button class="map ' + (sel ? 'sel' : '') + '" ' + (locked ? 'disabled' : '') + ' data-a="pick-map" data-id="' + i + '">' +
        '<div class="mname">' + (locked ? '🔒 ' : '') + esc(m.name) + '</div><div class="mdesc">' + (locked ? 'Survive 10:00 on ' + esc(DS.MAPS[i - 1].name) + ' to unlock' : esc(m.desc)) + '</div>' +
        '<div class="mmult">Monsters x' + m.mult + ' · Rewards x' + m.reward + ' · Best ' + U.fmtTime(sv.mapBest[i] || 0) + '</div></button>';
    }).join('');
    set('<div class="screen"><h1>Choose Your Degenerate</h1><div class="chars">' + cards + '</div>' +
      '<div class="cdesc"><b style="color:' + ch.color + '">' + ch.name + ':</b> ' + esc(ch.desc) + '<br><span class="dim">Special: ' + esc(ch.special.desc) + ' (' + ch.special.cd + 's)</span></div>' +
      '<h2>Choose Your Battleground</h2><div class="maps">' + maps + '</div>' +
      '<div class="row"><button data-a="menu">Back</button><button data-a="char-upgrade">Upgrade ' + ch.name + '</button><button class="go" data-a="begin">Begin Run ▶</button></div>' + debugPanel() + '</div>', 'charselect');
  };

  // ---------------- character upgrade (Gear & Inventory tab + Talents tab) ----------------
  UI.upTab = 'gear';
  const LEFT_SLOTS = ['helmet', 'necklace', 'chest', 'pants', 'boots'], RIGHT_SLOTS = ['bracers', 'gloves', 'ring1', 'ring2', 'trinket'];
  const slotLabel = (s) => s === 'ring1' ? 'Ring 1' : s === 'ring2' ? 'Ring 2' : DS.SLOT_NAMES[s];
  function itemIcon(it) { const R = DS.RARITY[it.rarity]; return DS.Spr.slotIconURL(it.slot, R.color, it.set ? '#ffd040' : '#ffffff'); }
  function slotItem(cid, s) { const c = DS.save.chars[cid]; const uid = c.equip[s]; return uid ? c.inv.find(i => i.uid === uid) : null; }
  // compare an item against what's currently in the slot it would go into
  function compareHtml(cid, it) {
    const eqSlot = DS.slotOfItem(cid, it.uid);
    if (eqSlot) return '<div class="cmp dim">Currently equipped (' + slotLabel(eqSlot) + ')</div>';
    const slot = DS.targetSlotFor(cid, it); const cur = slotItem(cid, slot);
    if (!cur) return '<div class="cmp"><b>vs ' + slotLabel(slot) + ':</b> <span class="up">empty slot — pure upgrade!</span></div>';
    const keys = Array.from(new Set(Object.keys(it.mods).concat(Object.keys(cur.mods))));
    const rows = keys.map(k => { const d = (it.mods[k] || 0) - (cur.mods[k] || 0); if (Math.abs(d) < 0.001) return ''; return '<span class="' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲ ' : '▼ ') + esc(DS.statText(k, Math.abs(d))) + '</span>'; }).join('');
    return '<div class="cmp"><b>vs equipped ' + esc(cur.name) + ' (' + slotLabel(slot) + '):</b>' + (rows || '<span class="dim">identical stats</span>') + '</div>';
  }
  UI.itemTip = function (cid, it) {
    const R = DS.RARITY[it.rarity]; const wrong = !DS.canEquip(cid, it);
    return '<div class="tip-name" style="color:' + R.color + '">' + esc(it.name) + '</div><div class="itype">' + R.name + ' ' + DS.SLOT_NAMES[it.slot] + (it.set ? ' · ' + esc(DS.SETS[it.set].name) + ' set' : '') + '</div>' +
      '<div class="imods">' + Object.keys(it.mods).map(k => '<span>' + esc(DS.statText(k, it.mods[k])) + '</span>').join('') + '</div>' +
      (wrong ? '<div class="down">' + DS.CHAR_BY_ID[it.owner].name + ' only</div>' : compareHtml(cid, it));
  };
  UI.upgrade = function (cid, tab) {
    DS.state = 'menu'; cid = cid || UI.selChar; UI.selChar = cid; if (tab) UI.upTab = tab;
    const sv = DS.save, c = DS.CHAR_BY_ID[cid], sc = sv.chars[cid]; const tp = DS.talentPoints(cid);
    const tabs = DS.CHARACTERS.map(x => '<button class="tab ' + (x.id === cid ? 'sel' : '') + '" style="--cc:' + x.color + '" data-a="up-tab" data-id="' + x.id + '">' + x.name + ' <small>Lv' + sv.chars[x.id].level + '</small></button>').join('');
    const need = DS.charXpNeed(sc.level);
    const ms = DS.metaStats(cid); const b = c.base;
    const stat = (l, v) => '<div><span>' + l + '</span><b>' + v + '</b></div>';
    const statsHtml = '<div class="statgrid">' +
      stat('Max HP', Math.round(b.hp * (1 + (ms.hpPct || 0) / 100))) + stat('Damage', '+' + Math.round(ms.dmgPct || 0) + '%') + stat('Auto Dmg', '+' + Math.round(ms.autoDmgPct || 0) + '%') +
      stat('Atk Speed', (1 + (ms.atkSpdPct || 0) / 100).toFixed(2) + '/s') + stat('Crit', (b.crit + (ms.crit || 0)) + '% x' + (b.critMult + (ms.critDmgPct || 0) / 100).toFixed(2)) +
      stat('Move', Math.round(b.speed * (1 + (ms.movePct || 0) / 100))) + stat('Special CD', (c.special.cd / (1 + (ms.cdrPct || 0) / 100)).toFixed(1) + 's') + stat('Pickup', Math.round(b.pickup * (1 + (ms.pickupPct || 0) / 100))) +
      stat('Armor', b.armor + (ms.armor || 0)) + stat('Regen', (b.regen + (ms.regen || 0)).toFixed(1) + '/s') + stat('Area', '+' + Math.round(ms.areaPct || 0) + '%') + stat('Projectiles', '+' + (ms.amount || 0)) + '</div>';
    const subtabs = '<div class="subtabs"><button class="subtab ' + (UI.upTab === 'gear' ? 'sel' : '') + '" data-a="up-sub" data-id="gear">⚔ Gear &amp; Inventory <small>(' + DS.equippedItems(cid).length + '/10 equipped · ' + sc.inv.filter(i => !DS.slotOfItem(cid, i.uid)).length + ' in bag)</small></button>' +
      '<button class="subtab ' + (UI.upTab === 'talents' ? 'sel' : '') + '" data-a="up-sub" data-id="talents">✦ Talents &amp; Stats <small>(' + tp.free + ' pts)</small></button></div>';
    let body;
    if (UI.upTab === 'talents') {
      const talents = DS.TALENTS.map(t => {
        const v = sc.talents[t.id]; const pips = Array.from({ length: 10 }, (_, i) => '<i class="' + (i < v ? 'on' : '') + '"></i>').join('');
        return '<div class="talent"><span class="tname">' + t.name + '</span><span class="pips">' + pips + '</span><span class="tval">+' + v * t.per + '%</span>' +
          '<button class="sm" ' + (tp.free <= 0 || v >= DS.TALENT_MAX ? 'disabled' : '') + ' data-a="talent" data-id="' + t.id + '">+</button></div>';
      }).join('');
      body = '<div class="upgrade">' +
        '<div class="col left"><img class="portrait big" src="' + portrait(cid, 7) + '"><div class="cname" style="color:' + c.color + '">' + c.name + '</div><div class="ctitle">' + c.title + '</div>' +
        '<div class="lvl">Level ' + sc.level + '</div><div class="bar"><div style="width:' + Math.min(100, sc.xp / need * 100) + '%"></div></div><div class="dim">' + Math.floor(sc.xp) + ' / ' + need + ' XP</div>' +
        '<button data-a="codex" data-id="' + cid + '">Ability Codex</button></div>' +
        '<div class="col mid"><h3>Talents <span class="pts">' + tp.free + ' point' + (tp.free === 1 ? '' : 's') + ' available</span></h3>' + talents +
        '<div class="row small"><button class="sm ghost" data-a="respec" ' + (tp.spent ? '' : 'disabled') + '>Respec (' + DS.RESPEC_PRICE + 'g)</button><span class="dim">1 point per character level · buy more in the Marketplace</span></div></div>' +
        '<div class="col right"><h3>Total Stats (talents + gear)</h3>' + statsHtml + '</div></div>';
    } else {
      const pslot = (s) => {
        const it = slotItem(cid, s); const R = it ? DS.RARITY[it.rarity] : null;
        return '<div class="pslot ' + (it ? 'filled r-' + it.rarity : 'empty') + '" data-slot="' + s + '" ' + (it ? 'data-a="' + (DS.touchMode ? 'tip' : 'unequip') + '" data-uid="' + it.uid + '" data-tip="' + it.uid + '" style="--rc:' + R.color + '"' : '') + '>' +
          '<img src="' + (it ? itemIcon(it) : DS.Spr.slotIconURL(s, '#3a2c40', '#3a2c40')) + '"><div class="ps-txt"><div class="ps-slot">' + slotLabel(s) + '</div>' +
          (it ? '<div class="ps-name" style="color:' + R.color + '">' + esc(it.name) + '</div>' : '<div class="ps-name dim">— empty —</div>') + '</div>' +
          (it ? '<button class="xbtn" data-a="unequip" data-slot="' + s + '" title="Unequip">✕</button>' : '') + '</div>';
      };
      const bag = sc.inv.filter(i => !DS.slotOfItem(cid, i.uid));
      const bagHtml = bag.length ? bag.map(it => {
        const R = DS.RARITY[it.rarity]; const ok = DS.canEquip(cid, it); const slot = DS.targetSlotFor(cid, it);
        return '<div class="bagitem r-' + it.rarity + (ok ? '' : ' locked') + '" style="--rc:' + R.color + '" data-tip="' + it.uid + '" ' + (ok ? 'data-a="equip" data-uid="' + it.uid + '"' : '') + '>' +
          '<img src="' + itemIcon(it) + '"><div class="bi-name" style="color:' + R.color + '">' + esc(it.name) + '</div><div class="bi-type">' + R.name + ' ' + DS.SLOT_NAMES[it.slot] + '</div>' +
          '<div class="bi-act">' + (ok ? '<button class="sm" data-a="equip" data-uid="' + it.uid + '">Equip → ' + slotLabel(slot) + '</button>' : '<span class="down">' + DS.CHAR_BY_ID[it.owner].name + ' only</span>') +
          '<button class="sm ghost" data-a="sell" data-uid="' + it.uid + '">Sell ' + Math.floor(it.price * 0.25) + 'g</button><button class="sm ghost info" data-a="tip" data-uid="' + it.uid + '">?</button></div></div>';
      }).join('') : '<div class="dim emptybag">Your bag is empty. Buy gear in the <button class="sm" data-a="market">Marketplace</button></div>';
      const cset = DS.SETS[cid]; const n = DS.setCount(cid);
      const setHtml = '<div class="setbox"><div class="setname">' + esc(cset.name) + ' <small>(' + n + '/6 equipped)</small></div><div class="dim">' + esc(cset.flavor) + '</div>' +
        cset.pieces.map(pc => { const own = sc.inv.some(i => i.set === cid && i.name === pc.name); return '<span class="piece ' + (own ? 'own' : '') + '">' + esc(pc.name) + '</span>'; }).join('') +
        cset.bonuses.map(bn => '<div class="bonus ' + (n >= bn.n ? 'on' : '') + '">(' + bn.n + ') ' + esc(bn.text) + '</div>').join('') + '</div>';
      body = '<div class="gear">' +
        '<div class="doll"><div class="dcol">' + LEFT_SLOTS.map(pslot).join('') + '</div>' +
        '<div class="dcenter"><img class="portrait big" src="' + portrait(cid, 7) + '"><div class="cname" style="color:' + c.color + '">' + c.name + '</div><div class="ctitle">' + c.title + ' · Lv ' + sc.level + '</div>' +
        '<div class="dim hint">' + (DS.touchMode ? 'Tap a bag item to equip it.<br>Tap ✕ to unequip.<br>Tap a slot or ? for stats.' : 'Click a bag item to equip it.<br>Click an equipped slot (or ✕) to unequip.<br>Hover for stats &amp; comparison.') + '</div></div>' +
        '<div class="dcol">' + RIGHT_SLOTS.map(pslot).join('') + '</div></div>' +
        '<div class="bagcol"><h3>Bag <span class="dim">(' + bag.length + ' items)</span></h3><div class="bag">' + bagHtml + '</div>' + setHtml + '</div>' +
        '<div class="sumcol"><h3>Total Stats</h3>' + statsHtml + '<button data-a="codex" data-id="' + cid + '">Ability Codex</button></div></div>';
    }
    set('<div class="screen"><h1>Character Upgrade</h1>' + goldBar() + '<div class="tabs">' + tabs + '</div>' + subtabs + body +
      '<div class="row"><button data-a="menu">Main Menu</button><button data-a="market">Marketplace</button><button class="go" data-a="start">Start Game</button></div>' + debugPanel() + '</div>', 'upgrade'); tipHide();
  };
  // tooltips (hover on desktop, "?" button on touch)
  function tipShow(el, cid, uid, ev) {
    let tip = $('#tip'); if (!tip) { tip = document.createElement('div'); tip.id = 'tip'; tip.className = 'tip'; $('#wrap').appendChild(tip); }
    const it = DS.findItem(cid, uid); if (!it) return;
    tip.innerHTML = UI.itemTip(cid, it); tip.style.display = 'block';
    const VW = DS.VW || 1280, VH = DS.VH || 720;
    const wrap = $('#wrap').getBoundingClientRect(); const sc = wrap.width / VW;
    const r = el.getBoundingClientRect(); let x = (r.right - wrap.left) / sc + 8, y = (r.top - wrap.top) / sc;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    if (x + tw > VW - 10) x = (r.left - wrap.left) / sc - tw - 8;
    if (x < 4) { x = (VW - tw) / 2; y = (r.bottom - wrap.top) / sc + 6; if (y + th > VH - 10) y = (r.top - wrap.top) / sc - th - 6; } // narrow: below/above
    if (y + th > VH - 10) y = VH - 10 - th;
    tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
  }
  function tipHide() { const tip = $('#tip'); if (tip) tip.style.display = 'none'; }
  function itemCard(it, actions) {
    const R = DS.RARITY[it.rarity];
    return '<div class="item r-' + it.rarity + '"><div class="ihead"><img class="iicon" src="' + itemIcon(it) + '"><div><div class="iname" style="color:' + R.color + '">' + esc(it.name) + '</div>' +
      '<div class="itype">' + R.name + ' ' + DS.SLOT_NAMES[it.slot] + (it.set ? ' · ' + esc(DS.SETS[it.set].name) + ' set (' + DS.CHAR_BY_ID[it.set].name + ' only)' : '') + '</div></div></div>' +
      '<div class="imods">' + Object.keys(it.mods).map(k => '<span>' + esc(DS.statText(k, it.mods[k])) + '</span>').join('') + '</div>' + (actions ? '<div class="iact">' + actions + '</div>' : '') + '</div>';
  }

  UI.codex = function (cid) {
    const c = DS.CHAR_BY_ID[cid];
    const row = (id) => { const a = DS.ABILITIES[id]; let extra = ''; if (a.evo) { const ev = DS.ABILITIES[a.evo.into], w = DS.ABILITIES[a.evo.with]; extra = '<div class="evo">⇧ Lv4 + <b>' + esc(w.name) + '</b> → <b class="gold">' + esc(ev.name) + '</b>: ' + esc(ev.desc) + '</div>'; }
      return '<div class="cx"><img src="' + DS.Spr.iconURL(a) + '"><div><b>' + esc(a.name) + '</b> <span class="dim">' + a.type + '</span><div>' + esc(a.desc) + '</div>' + extra + '</div></div>'; };
    UI.overlay.innerHTML = '<div class="modal codex"><h2>' + c.name + "'s Ability Codex</h2><h3>Primary</h3>" + c.primaries.map(row).join('') + '<h3>Secondary</h3>' + c.secondaries.map(row).join('') +
      '<h3>Super Evolutions <span class="dim">(own both evolved abilities → offered on next level-up; frees a primary slot)</span></h3>' + ((DS.SUPERS && DS.SUPERS[cid]) || []).map(S => '<div class="cx"><img src="' + DS.Spr.iconURL(S) + '"><div><b class="pink">' + esc(S.name) + '</b><div class="evo">' + S.parts.map(pid => esc(DS.ABILITIES[pid].name)).join(' + ') + '</div><div>' + esc(S.desc) + '</div></div></div>').join('') + '<div class="row"><button data-a="close-overlay">Close</button></div></div>';
    UI.overlay.style.display = 'flex';
  };

  // ---------------- marketplace ----------------
  UI.market = function (cid) {
    DS.state = 'menu'; cid = cid || UI.selChar; UI.selChar = cid;
    const sv = DS.save; const stock = DS.marketStock(sv); DS.persist();
    const tabs = DS.CHARACTERS.map(x => '<button class="tab ' + (x.id === cid ? 'sel' : '') + '" style="--cc:' + x.color + '" data-a="mk-tab" data-id="' + x.id + '">' + x.name + '</button>').join('');
    const now = new Date(); const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); const left = Math.floor((tomorrow - now) / 1000);
    const cards = stock.map(it => {
      const wrong = it.owner && it.owner !== cid; const afford = sv.gold >= it.price;
      const act = it.sold ? '<span class="sold">SOLD</span>' : '<button class="sm" ' + (!afford ? 'disabled' : '') + ' data-a="buy" data-idx="' + it.marketIdx + '">Buy ' + it.price + 'g</button>' + (it.owner ? '<span class="dim"> ' + DS.CHAR_BY_ID[it.owner].name + ' only</span>' : '');
      return itemCard(it, act);
    }).join('');
    const tp = DS.talentPoints(cid);
    set('<div class="screen"><h1>The Marketplace</h1>' + goldBar() +
      '<div class="dim center">"Ye Olde Pawn & Sportsbook" · New stock every day (refresh in ' + Math.floor(left / 3600) + 'h ' + Math.floor(left % 3600 / 60) + 'm) · Shopping for:</div><div class="tabs">' + tabs + '</div>' +
      '<div class="market"><div class="item talentbuy"><div class="iname gold">Talent Point Scroll</div><div class="itype">Always in stock</div><div class="imods"><span>+1 Talent Point for ' + DS.CHAR_BY_ID[cid].name + '</span><span>(' + tp.free + ' unspent)</span></div>' +
      '<div class="iact"><button class="sm" ' + (sv.gold < DS.TALENT_POINT_PRICE ? 'disabled' : '') + ' data-a="buy-tp">Buy ' + DS.TALENT_POINT_PRICE + 'g</button></div></div>' + cards + '</div>' +
      '<div class="row"><button data-a="menu">Main Menu</button><button class="ghost" data-a="reroll" ' + (sv.gold < DS.REROLL_PRICE ? 'disabled' : '') + '>Reroll Stock (' + DS.REROLL_PRICE + 'g)</button><button data-a="upgrade">Character Upgrade</button></div>' + debugPanel() + '</div>', 'market');
  };

  // buy flow: pick who gets it -> "Bought! Equip now?"
  UI.buyPick = function (idx) {
    const sv = DS.save; const it = DS.marketStock(sv)[idx]; if (!it || it.sold) return;
    const chars = DS.CHARACTERS.map(c => { const ok = !it.owner || it.owner === c.id; const sel = c.id === (it.owner || UI.selChar);
      return '<button class="who ' + (sel ? 'sel' : '') + '" style="--cc:' + c.color + '" ' + (ok ? '' : 'disabled') + ' data-a="buy-for" data-id="' + c.id + '" data-idx="' + idx + '"><img src="' + portrait(c.id, 3) + '"><div>' + c.name + '</div>' + (ok ? '' : '<small>can\'t use</small>') + '</button>'; }).join('');
    UI.overlay.innerHTML = '<div class="modal buy"><h2>Who gets it?</h2>' + itemCard(it) + '<div class="dim center">Buy for ' + it.price + 'g and put it in this character\'s bag:</div><div class="whos">' + chars + '</div><div class="row"><button class="ghost" data-a="close-overlay">Cancel</button></div></div>';
    UI.overlay.style.display = 'flex';
  };
  UI.boughtModal = function (cid, uid, equippedSlot) {
    const it = DS.findItem(cid, uid); if (!it) return; const c = DS.CHAR_BY_ID[cid];
    const head = equippedSlot ? '<h2 class="gold">Equipped!</h2><div class="center">' + esc(it.name) + ' is now on <b style="color:' + c.color + '">' + c.name + '</b> (' + slotLabel(equippedSlot) + ').</div>'
      : '<h2 class="gold">Bought! Equip now?</h2><div class="center">Added to <b style="color:' + c.color + '">' + c.name + '</b>\'s bag.</div>';
    UI.overlay.innerHTML = '<div class="modal buy">' + head + itemCard(it) + (equippedSlot ? '' : compareHtml(cid, it)) +
      '<div class="row">' + (equippedSlot ? '' : '<button class="go" data-a="equip-now" data-id="' + cid + '" data-uid="' + uid + '">Equip Now on ' + c.name + ' → ' + slotLabel(DS.targetSlotFor(cid, it)) + '</button>') +
      '<button data-a="open-gear" data-id="' + cid + '">Open ' + c.name + '\'s Gear</button><button class="ghost" data-a="close-overlay">Keep Shopping</button></div></div>';
    UI.overlay.style.display = 'flex';
  };

  // ---------------- options ----------------
  UI.options = function (from) {
    UI.optReturn = from || UI.optReturn || 'menu';
    const o = DS.save.options;
    const keys = [['up', 'Move Up'], ['down', 'Move Down'], ['left', 'Move Left'], ['right', 'Move Right'], ['special', 'Special Ability'], ['pause', 'Pause']];
    const html = '<div class="screen options"><h1>Options</h1>' +
      '<div class="opt"><label>Brightness</label><input type="range" min="0.5" max="1.6" step="0.05" value="' + o.brightness + '" data-opt="brightness"><span>' + Math.round(o.brightness * 100) + '%</span></div>' +
      '<div class="opt"><label>Music Volume</label><input type="range" min="0" max="1" step="0.05" value="' + o.music + '" data-opt="music"><span>' + Math.round(o.music * 100) + '%</span></div>' +
      '<div class="opt"><label>Sound Effects Volume</label><input type="range" min="0" max="1" step="0.05" value="' + o.sfx + '" data-opt="sfx"><span>' + Math.round(o.sfx * 100) + '%</span></div>' +
      '<div class="opt"><label>Damage Numbers</label><button class="sm" data-a="toggle" data-id="dmgNumbers">' + (o.dmgNumbers ? 'ON' : 'OFF') + '</button></div>' +
      '<div class="opt"><label>Screen Shake</label><button class="sm" data-a="toggle" data-id="shake">' + (o.shake ? 'ON' : 'OFF') + '</button></div>' +
      '<div class="opt"><label>Low Effects <small class="dim">(auto-on for phones)</small></label><button class="sm" data-a="toggle-fx">' + (DS.lowFx ? 'ON' : 'OFF') + '</button></div>' +
      (DS.touchMode ? '<h2>Touch Controls</h2>' +
        '<div class="opt"><label>Joystick Size</label><input type="range" min="0.6" max="1.6" step="0.05" value="' + (o.joySize || 1) + '" data-opt="joySize"><span>' + Math.round((o.joySize || 1) * 100) + '%</span></div>' +
        '<div class="opt"><label>Controls Opacity</label><input type="range" min="0.2" max="1" step="0.05" value="' + (o.joyOpacity == null ? 0.6 : o.joyOpacity) + '" data-opt="joyOpacity"><span>' + Math.round((o.joyOpacity == null ? 0.6 : o.joyOpacity) * 100) + '%</span></div>' +
        '<div class="opt"><label>Left-Handed <small class="dim">(joystick right, special left)</small></label><button class="sm" data-a="toggle" data-id="leftHanded">' + (o.leftHanded ? 'ON' : 'OFF') + '</button></div>' +
        '<div class="dim">Drag anywhere on the movement side to move (anywhere in portrait). The Special button auto-aims at Bosses, then Elites, then the nearest enemy, otherwise where you are walking. ❚❚ top-right pauses.</div>'
      : '<h2>Keyboard</h2>' + keys.map(([k, l]) => '<div class="opt"><label>' + l + '</label><button class="sm key ' + (UI.rebinding === k ? 'wait' : '') + '" data-a="rebind" data-id="' + k + '">' + (UI.rebinding === k ? 'press a key…' : UI.keyName(o.keys[k])) + '</button></div>').join('') +
      '<div class="dim">Arrow keys always move too. Your auto-attack targets Bosses, then Elites, then the nearest enemy. The mouse aims your special; right-click also fires it.</div>') +
      '<div class="row"><button data-a="opt-back">Back</button>' + (DS.touchMode ? '' : '<button class="ghost" data-a="reset-keys">Reset Keys</button>') + '<button class="ghost danger" data-a="wipe">Wipe Save</button></div></div>';
    if (UI.optReturn === 'pause') { UI.overlay.innerHTML = '<div class="modal">' + html + '</div>'; UI.overlay.style.display = 'flex'; UI.screen = 'options'; }
    else set(html, 'options');
  };
  UI.captureKey = function (code) {
    if (!UI.rebinding) return false;
    if (code !== 'Escape' || UI.rebinding === 'pause') DS.save.options.keys[UI.rebinding] = code;
    UI.rebinding = null; DS.persist(); UI.options(); return true;
  };

  // ---------------- exit ----------------
  UI.exit = function () {
    DS.state = 'exit'; DS.Audio.stopMusic();
    set('<div class="menu-screen"><div class="title"><div class="t1">THANKS</div><div class="t2">FOR PLAYING</div><div class="sub">The house always wins. See you next payday.</div></div><div class="menu-buttons"><button class="big" data-a="menu">Back to Menu</button></div></div>', 'exit');
    try { if (window.opener || window.history.length <= 1) window.close(); } catch (e) { /* browsers block closing tabs they didn't open */ }
  };

  // ---------------- in-run overlays ----------------
  UI.pause = function () {
    const g = DS.game; if (!g || g.over || g.modal) return;
    g.paused = true; UI.optReturn = 'pause';
    const abil = g.prim.concat(g.sec).map(a => '<div class="pa"><img src="' + DS.Spr.iconURL(a.def) + '"><span class="' + (a.isSuper ? 'pink' : '') + '">' + esc(a.def.name) + ' ' + (a.isSuper ? '✦SUPER' : a.evolved ? '★' : 'Lv' + a.level) + '</span></div>').join('') || '<div class="dim">No abilities yet.</div>';
    UI.overlay.innerHTML = '<div class="modal pause"><h1>Paused</h1><div class="dim">' + U.fmtTime(g.time) + ' · Lv ' + g.level + ' · ' + g.kills + ' kills</div><div class="pabil">' + abil + '</div>' +
      '<div class="menu-buttons"><button class="big" data-a="resume">Resume</button><button class="big" data-a="pause-options">Options</button><button class="big" data-a="quit-run">Quit Run (Cash Out)</button></div></div>';
    UI.overlay.style.display = 'flex';
  };
  UI.resume = function () { const g = DS.game; UI.overlay.style.display = 'none'; UI.overlay.innerHTML = ''; if (g) g.paused = false; UI.optReturn = 'menu'; };

  UI.showLevelUp = function (m, g) {
    const kindTag = (o) => o.kind === 'super' ? 'SUPER EVOLUTION' : o.kind === 'evo' ? 'EVOLUTION' : o.def ? (o.def.kind === 'secondary' ? 'SECONDARY' : 'PRIMARY') : 'BONUS';
    const cards = m.offers.map((o, i) => {
      if (o.kind === 'gold' || o.kind === 'heal') return '<div class="lu-card bonus ' + (o.taken ? 'taken' : '') + '" data-a="lu" data-i="' + i + '"><div class="lu-key">' + (i + 1) + '</div><div class="lu-name">' + esc(o.name) + '</div><div class="lu-desc">' + esc(o.desc) + '</div></div>';
      const lvl = o.kind === 'super' ? '✦ MERGE' : o.kind === 'evo' ? '★ EVOLVE' : o.kind === 'new' ? 'NEW!' : 'Lv ' + (o.lvl - 1) + ' → ' + o.lvl;
      const desc = o.kind === 'super' ? o.def.desc + ' Merges ' + o.partDefs.map(d => d.name).join(' + ') + ' and frees a primary slot.' : o.kind === 'evo' ? o.def.desc + ' (Lv4 ' + DS.ABILITIES[o.from].name + ' + ' + o.withDef.name + ')' : o.kind === 'new' ? o.def.desc : DS.upgradeText(o.def, o.lvl);
      return '<div class="lu-card ' + (o.kind === 'super' ? 'super' : o.kind === 'evo' ? 'evo' : o.def.kind) + ' ' + (o.taken ? 'taken' : '') + '" data-a="lu" data-i="' + i + '"><div class="lu-key">' + (i + 1) + '</div><img src="' + DS.Spr.iconURL(o.def) + '">' +
        '<div class="lu-tag">' + kindTag(o) + ' · ' + lvl + '</div><div class="lu-name">' + esc(o.def.name) + '</div><div class="lu-desc">' + esc(desc) + '</div></div>';
    }).join('');
    UI.overlay.innerHTML = '<div class="modal levelup"><h1>' + (m.double ? 'JACKPOT! PICK ' + m.picks + ' MORE' : 'LEVEL UP!') + '</h1><div class="dim">Level ' + g.level + ' · +5% max HP · +5% damage</div><div class="lu-cards">' + cards + '</div><div class="dim">' + (DS.touchMode ? 'Tap a card' : 'Click or press 1-' + m.offers.length) + '</div></div>';
    UI.overlay.style.display = 'flex';
  };
  UI.hideLevelUp = function () { UI.overlay.style.display = 'none'; UI.overlay.innerHTML = ''; };

  UI.showResults = function (r) {
    DS.state = 'results'; DS.Audio.playTrack('results');
    UI.overlay.style.display = 'none'; UI.overlay.innerHTML = '';
    const row = (l, v) => '<div class="rr"><span>' + l + '</span><b>' + v + '</b></div>';
    set('<div class="screen results"><h1 class="' + (r.reason === 'died' ? 'red' : 'gold') + '">' + (r.reason === 'died' ? 'YOU DIED' : 'CASHED OUT') + '</h1>' +
      '<div class="dim center">' + esc(r.char) + ' · ' + esc(r.map) + '</div><div class="rgrid">' +
      row('Time Survived', U.fmtTime(r.time)) + row('Run Level', r.level) + row('Monsters Slain', r.kills) + row('Elites Slain', r.elites) + row('Bosses Slain', r.bosses + (r.supers ? ' (' + r.supers + ' super!)' : '')) + row('Damage Dealt', U.fmt(r.dmg)) +
      row('Character XP', '+' + r.xp) + row('Gold Earned', '+' + r.gold) + row('Character Level', r.charLevel + (r.charLevelsGained ? ' (+' + r.charLevelsGained + ' talent pt' + (r.charLevelsGained > 1 ? 's' : '') + '!)' : '')) +
      '</div>' + (r.unlocked ? '<div class="unlock">NEW MAP UNLOCKED: ' + esc(r.unlocked) + '</div>' : '') +
      '<div class="row"><button data-a="menu">Main Menu</button><button data-a="upgrade">Character Upgrade</button><button class="go" data-a="again">Play Again ▶</button></div></div>', 'results');
  };

  // ---------------- events ----------------
  function onInput(e) {
    const k = e.target.dataset.opt; if (!k) return;
    DS.save.options[k] = parseFloat(e.target.value); const span = e.target.nextElementSibling; if (span) span.textContent = Math.round(DS.save.options[k] * 100) + '%';
    if (k === 'brightness') UI.applyBrightness(); else if (k === 'music' || k === 'sfx') DS.Audio.applyVolumes();
    DS.persist();
  }
  function onClick(e) {
    const t = e.target.closest('[data-a]');
    if (!t || t.disabled) { // touch: tap an item tile for its tooltip; tap elsewhere hides it
      const el = DS.touchMode && e.target.closest && e.target.closest('[data-tip]'); if (el && UI.screen === 'upgrade') tipShow(el, UI.selChar, +el.dataset.tip); else tipHide(); return; }
    const a = t.dataset.a, id = t.dataset.id; const sv = DS.save;
    if (a !== 'tip') tipHide();
    DS.Audio.init();
    if (a !== 'lu') sfx('select');
    switch (a) {
      case 'menu': UI.overlay.style.display = 'none'; DS.game = null; UI.menu(); break;
      case 'start': UI.charSelect(); break;
      case 'upgrade': UI.upgrade(); break;
      case 'char-upgrade': UI.upgrade(UI.selChar); break;
      case 'market': UI.market(); break;
      case 'options': UI.options('menu'); break;
      case 'exit': UI.exit(); break;
      case 'pick-char': UI.selChar = id; sv.lastChar = id; DS.persist(); UI.charSelect(); break;
      case 'pick-map': UI.selMap = +id; sv.lastMap = +id; DS.persist(); UI.charSelect(); break;
      case 'begin': case 'again': DS.startRun(UI.selChar, UI.selMap); break;
      case 'up-tab': UI.upgrade(id); break;
      case 'up-sub': UI.upgrade(UI.selChar, id); break;
      case 'tip': { const el = t.closest('[data-tip]'); if (el) tipShow(el, UI.selChar, +t.dataset.uid); return; }
      case 'equip-now': { const slot = DS.equipItem(id, +t.dataset.uid); sfx(slot ? 'buy' : 'deny'); if (slot) UI.boughtModal(id, +t.dataset.uid, slot); if (UI.screen === 'market') UI.market(); else if (UI.screen === 'upgrade') UI.upgrade(); break; }
      case 'open-gear': UI.overlay.style.display = 'none'; UI.overlay.innerHTML = ''; UI.upgrade(id, 'gear'); break;
      case 'buy-for': {
        const stock = DS.marketStock(sv); const it = stock[+t.dataset.idx]; if (!it || it.sold) break;
        if (sv.gold < it.price || (it.owner && it.owner !== id)) { sfx('deny'); break; }
        sv.gold -= it.price; sv.market.sold.push(it.marketIdx);
        const copy = JSON.parse(JSON.stringify(it)); delete copy.marketIdx; delete copy.sold; copy.uid = sv.nextUid++;
        sv.chars[id].inv.push(copy); DS.persist(); sfx('buy'); UI.market(); UI.boughtModal(id, copy.uid, null); break; }
      case 'mk-tab': UI.market(id); break;
      case 'talent': { const tp = DS.talentPoints(UI.selChar); const c = sv.chars[UI.selChar]; if (tp.free > 0 && c.talents[id] < DS.TALENT_MAX) { c.talents[id]++; DS.persist(); sfx('buy'); } UI.upgrade(); break; }
      case 'respec': { if (sv.gold < DS.RESPEC_PRICE) { sfx('deny'); break; } sv.gold -= DS.RESPEC_PRICE; const c = sv.chars[UI.selChar]; for (const k in c.talents) c.talents[k] = 0; DS.persist(); UI.upgrade(); break; }
      case 'equip': { const slot = DS.equipItem(UI.selChar, +t.dataset.uid); sfx(slot ? 'buy' : 'deny'); UI.upgrade(); break; }
      case 'unequip': { const slot = t.dataset.slot || (t.closest('[data-slot]') || {}).dataset.slot; if (slot) DS.unequipSlot(UI.selChar, slot); UI.upgrade(); break; }
      case 'sell': { const c = sv.chars[UI.selChar]; const i = c.inv.findIndex(x => x.uid === +t.dataset.uid); if (i >= 0) { sv.gold += Math.floor(c.inv[i].price * 0.25); c.inv.splice(i, 1); DS.persist(); sfx('coin'); } UI.upgrade(); break; }
      case 'codex': UI.codex(id); break;
      case 'close-overlay': UI.overlay.style.display = 'none'; UI.overlay.innerHTML = ''; break;
      case 'buy': { const it = DS.marketStock(sv)[+t.dataset.idx]; if (!it || it.sold || sv.gold < it.price) { sfx('deny'); break; } UI.buyPick(+t.dataset.idx); break; }
      case 'buy-tp': if (sv.gold >= DS.TALENT_POINT_PRICE) { sv.gold -= DS.TALENT_POINT_PRICE; sv.chars[UI.selChar].bonusPts++; DS.persist(); sfx('buy'); } UI.market(); break;
      case 'reroll': if (sv.gold >= DS.REROLL_PRICE) { sv.gold -= DS.REROLL_PRICE; DS.marketStock(sv); sv.market.rerolls++; sv.market.sold = []; DS.persist(); sfx('coin'); } UI.market(); break;
      case 'toggle': sv.options[id] = !sv.options[id]; DS.persist(); if (DS.relayout) DS.relayout(); UI.options(); break;
      case 'toggle-fx': sv.options.lowFx = !DS.lowFx; DS.persist(); DS.applyFx(); UI.options(); break;
      case 'fullscreen': { const d = document.documentElement; const p = d.requestFullscreen ? d.requestFullscreen() : null;
        if (p && p.then) p.then(() => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (err) { /* not supported */ } UI.menu(); }).catch(() => {}); break; }
      case 'rebind': UI.rebinding = id; UI.options(); break;
      case 'reset-keys': sv.options.keys = Object.assign({}, DS.DEFAULT_KEYS); DS.persist(); UI.options(); break;
      case 'wipe': if (confirm('Wipe ALL progress (gold, levels, gear)? This cannot be undone.')) { DS.resetSave(); UI.applyBrightness(); UI.menu(); } break;
      case 'opt-back': if (UI.optReturn === 'pause') UI.pause(); else UI.menu(); break;
      case 'resume': UI.resume(); break;
      case 'pause-options': UI.options('pause'); break;
      case 'quit-run': { const g = DS.game; if (g && !g.over) { g.over = true; const r = g.finish('quit'); UI.showResults(r); } break; }
      case 'lu': if (DS.game) DS.game.choose(+t.dataset.i); break;
      // debug
      case 'dbg-gold': sv.gold += 10000; DS.persist(); rerender(); break;
      case 'dbg-maps': sv.mapsUnlocked = DS.MAPS.length; DS.persist(); rerender(); break;
      case 'dbg-lvl': DS.grantCharXp(UI.selChar, [0, 1, 2, 3, 4].reduce((s, i) => s + DS.charXpNeed(sv.chars[UI.selChar].level + i), 0)); DS.persist(); rerender(); break;
      case 'dbg-set': DS.CHARACTERS.forEach(c => { for (let i = 0; i < 6; i++) { const it = DS.makeSetItem(c.id, i); if (!sv.chars[c.id].inv.some(x => x.name === it.name)) { it.uid = sv.nextUid++; sv.chars[c.id].inv.push(it); } } }); DS.persist(); rerender(); break;
      case 'dbg-loot': DS.CHARACTERS.forEach(c => { for (let i = 0; i < 3; i++) { const it = DS.genItem(Math.random, 'legendary'); it.uid = sv.nextUid++; sv.chars[c.id].inv.push(it); } }); DS.persist(); rerender(); break;
    }
  }
  function rerender() { const s = UI.screen; if (s === 'upgrade') UI.upgrade(); else if (s === 'market') UI.market(); else if (s === 'charselect') UI.charSelect(); else UI.menu(); }
  DS.UI = UI;
})(window.DS);

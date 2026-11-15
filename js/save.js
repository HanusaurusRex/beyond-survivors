// save.js - localStorage persistence + meta stat computation
'use strict';
(function (DS) {
  const KEY = 'beyondSurvivors.save.v1'; const OLD_KEY = 'degenSurvivors.save.v1';
  const DEFAULT_KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', special: 'Space', pause: 'Escape' };
  DS.DEFAULT_KEYS = DEFAULT_KEYS;
  function freshChar() {
    const t = {}; DS.TALENTS.forEach(x => t[x.id] = 0);
    const eq = {}; DS.SLOTS.forEach(s => eq[s] = null);
    return { level: 0, xp: 0, talents: t, bonusPts: 0, inv: [], equip: eq, bestTime: 0, runs: 0 };
  }
  function fresh() {
    const chars = {}; DS.CHARACTERS.forEach(c => chars[c.id] = freshChar());
    return { version: 1, gold: 0, chars, mapsUnlocked: 1, mapBest: [0, 0, 0, 0, 0], nextUid: 1, market: null,
      options: { brightness: 1, music: 0.5, sfx: 0.6, keys: Object.assign({}, DEFAULT_KEYS), dmgNumbers: true, shake: true, joySize: 1, joyOpacity: 0.6, leftHanded: false, lowFx: null },
      totals: { runs: 0, kills: 0, gold: 0 }, lastChar: 'brandon', lastMap: 0 };
  }
  DS.loadSave = function () {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!s) { s = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); if (s) { localStorage.setItem(KEY, JSON.stringify(s)); localStorage.removeItem(OLD_KEY); } } } catch (e) { s = null; }
    const f = fresh();
    if (!s || typeof s !== 'object') s = f;
    // merge defaults for forward compat
    for (const k in f) if (s[k] === undefined) s[k] = f[k];
    s.options = Object.assign({}, f.options, s.options); s.options.keys = Object.assign({}, DEFAULT_KEYS, s.options.keys);
    DS.CHARACTERS.forEach(c => {
      const fc = freshChar(); const sc = s.chars[c.id] = Object.assign(fc, s.chars[c.id] || {});
      sc.talents = Object.assign(freshChar().talents, sc.talents); sc.equip = Object.assign(freshChar().equip, sc.equip);
    });
    DS.save = s; return s;
  };
  DS.persist = function () { try { localStorage.setItem(KEY, JSON.stringify(DS.save)); } catch (e) { console.warn('save failed', e); } };
  DS.resetSave = function () { DS.save = fresh(); DS.persist(); };

  DS.talentPoints = function (cid) {
    const c = DS.save.chars[cid]; let spent = 0; for (const k in c.talents) spent += c.talents[k];
    return { total: c.level + c.bonusPts, spent, free: c.level + c.bonusPts - spent };
  };
  DS.equippedItems = function (cid) {
    const c = DS.save.chars[cid]; const out = [];
    DS.SLOTS.forEach(s => { const uid = c.equip[s]; if (uid) { const it = c.inv.find(i => i.uid === uid); if (it) out.push(it); else c.equip[s] = null; } });
    return out;
  };
  DS.setCount = function (cid) { return DS.equippedItems(cid).filter(i => i.set === cid).length; };

  // Meta stats = talents + gear + set bonuses (additive stat keys, see DS.STATS)
  DS.metaStats = function (cid) {
    const c = DS.save.chars[cid]; const st = { flags: {}, pierce: 0 };
    const add = (k, v) => { st[k] = (st[k] || 0) + v; };
    DS.TALENTS.forEach(t => add(t.stat, c.talents[t.id] * t.per));
    const items = DS.equippedItems(cid);
    items.forEach(it => { for (const k in it.mods) add(k, it.mods[k]); });
    const set = DS.SETS[cid]; const n = items.filter(i => i.set === cid).length;
    set.bonuses.forEach(b => { if (n >= b.n) { for (const k in b.mods) add(k, b.mods[k]); if (b.flag) st.flags[b.flag] = true; if (b.pierce) st.pierce += b.pierce; } });
    return st;
  };
  // ---- gear helpers ----
  DS.findItem = (cid, uid) => DS.save.chars[cid].inv.find(i => i.uid === uid);
  DS.slotOfItem = function (cid, uid) { const eq = DS.save.chars[cid].equip; return DS.SLOTS.find(s => eq[s] === uid) || null; };
  DS.targetSlotFor = function (cid, it) { const eq = DS.save.chars[cid].equip; if (it.slot !== 'ring') return it.slot; return !eq.ring1 ? 'ring1' : !eq.ring2 ? 'ring2' : 'ring1'; };
  DS.canEquip = (cid, it) => !it.owner || it.owner === cid;
  DS.equipItem = function (cid, uid, slot) {
    const c = DS.save.chars[cid]; const it = DS.findItem(cid, uid); if (!it || !DS.canEquip(cid, it)) return false;
    const cur = DS.slotOfItem(cid, uid); if (cur) c.equip[cur] = null;
    slot = slot && DS.slotFits(it.slot, slot) ? slot : DS.targetSlotFor(cid, it);
    c.equip[slot] = uid; DS.persist(); return slot;
  };
  DS.unequipSlot = function (cid, slot) { DS.save.chars[cid].equip[slot] = null; DS.persist(); };
  DS.grantCharXp = function (cid, xp) {
    const c = DS.save.chars[cid]; c.xp += xp; let gained = 0;
    while (c.xp >= DS.charXpNeed(c.level)) { c.xp -= DS.charXpNeed(c.level); c.level++; gained++; }
    return gained;
  };
})(window.DS);

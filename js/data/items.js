// items.js - gear, random item generation, character sets, daily marketplace
'use strict';
(function (DS) {
  const U = DS.U;
  DS.STATS = {
    hpPct: { name: 'Max HP', r: [5, 10], unit: '%', adj: 'Thicc' },
    dmgPct: { name: 'All Damage', r: [5, 10], unit: '%', adj: 'Savage' },
    autoDmgPct: { name: 'Auto Attack Damage', r: [8, 20], unit: '%', adj: 'Sharpened' },
    atkSpdPct: { name: 'Attack Speed', r: [4, 8], unit: '%', adj: 'Caffeinated' },
    crit: { name: 'Crit Chance', r: [2, 4], unit: '%', adj: 'Lucky' },
    critDmgPct: { name: 'Crit Damage', r: [10, 20], unit: '%', adj: "Gambler's" },
    movePct: { name: 'Move Speed', r: [3, 6], unit: '%', adj: 'Speedy' },
    cdrPct: { name: 'Special Recharge', r: [5, 10], unit: '%', adj: 'Recharged' },
    pickupPct: { name: 'Pickup Radius', r: [10, 20], unit: '%', adj: 'Grabby' },
    regen: { name: 'HP Regen', r: [0.2, 0.5], unit: '/s', adj: 'Hydrated', dec: 1 },
    armor: { name: 'Armor', r: [1, 2], unit: '', adj: 'Padded' },
    areaPct: { name: 'Area', r: [5, 10], unit: '%', adj: 'Wide-Load' },
    abilityCdPct: { name: 'Ability Cooldown', r: [3, 5], unit: '%', adj: 'Hasty', neg: true },
    xpPct: { name: 'XP Gain', r: [5, 10], unit: '%', adj: 'Wise' },
    goldPct: { name: 'Gold Gain', r: [5, 10], unit: '%', adj: 'Greedy' },
    amount: { name: 'Projectiles', r: [1, 1], unit: '', adj: 'Bonus' }
  };
  DS.statText = function (k, v) {
    const s = DS.STATS[k]; if (!s) return k + ' ' + v;
    const val = s.dec ? (+v).toFixed(s.dec) : Math.round(v);
    if (s.neg) return '-' + val + s.unit + ' ' + s.name;
    return '+' + val + s.unit + ' ' + s.name;
  };
  DS.statsText = function (obj) { return Object.keys(obj).map(k => DS.statText(k, obj[k])).join(', '); };

  DS.SLOTS = ['helmet', 'necklace', 'chest', 'pants', 'bracers', 'gloves', 'boots', 'ring1', 'ring2', 'trinket'];
  DS.SLOT_NAMES = { helmet: 'Helmet', necklace: 'Necklace', chest: 'Chest', pants: 'Pants', bracers: 'Bracers', gloves: 'Gloves', boots: 'Boots', ring1: 'Ring', ring2: 'Ring', trinket: 'Trinket', ring: 'Ring' };
  const BASES = {
    helmet: ['Visor', 'Bucket Hat', 'Great Helm', 'Trucker Cap', 'Coif', 'Bandana', 'Backwards Cap'],
    necklace: ['Chain', 'Amulet', 'Lanyard', 'Medallion', 'Puka Necklace', 'Whistle'],
    chest: ['Hauberk', 'Hoodie', 'Jersey', 'Breastplate', 'Tunic', 'Tank Top', 'Bowling Shirt'],
    pants: ['Greaves', 'Cargo Shorts', 'Sweatpants', 'Leggings', 'Jorts', 'Zip-Off Pants'],
    bracers: ['Bracers', 'Sweatbands', 'Vambraces', 'Wristwraps', 'Casino Wristband'],
    gloves: ['Gauntlets', 'Batting Gloves', 'Mitts', 'Oven Mitts', 'Fingerless Gloves'],
    boots: ['Sabatons', 'Crocs', 'Slides', 'Sandals', 'Boots', 'Dad Sneakers'],
    ring: ['Ring', 'Signet', 'Band', 'Class Ring', 'Pinky Ring'],
    trinket: ['Lucky Dice', 'Lottery Ticket', 'Vape', 'Bobblehead', 'Fidget Spinner', 'Rally Cap', 'Koozie', 'Poker Chip', 'Rabbit Foot']
  };
  const SUFFIX = ['of the Degenerate', 'of Bad Beats', 'of the Parlay', 'of Overtime', 'of the Buffet', 'of the Comp Room', 'of Tuesday Night', 'of Fantasy Glory', 'of Last Call', 'of the Gas Station', 'of the Sportsbook', 'of the Waffle House', 'of Free Play', 'of the Over/Under', 'of the Bender'];
  const LEGEND_PREFIX = ['Grandpa\'s', 'The Commissioner\'s', 'Uncle Rick\'s', 'The Whale\'s', 'Vegas', 'Cursed', 'Deep-Fried', 'Golden'];
  DS.RARITIES = [
    { id: 'common', name: 'Common', color: '#c8c8c8', mods: 1, mult: 1, price: 100, w: 40 },
    { id: 'uncommon', name: 'Uncommon', color: '#5cdb5c', mods: 2, mult: 1.6, price: 250, w: 30 },
    { id: 'rare', name: 'Rare', color: '#4fa3ff', mods: 3, mult: 2.4, price: 600, w: 18 },
    { id: 'epic', name: 'Epic', color: '#c060ff', mods: 4, mult: 3.4, price: 1500, w: 9 },
    { id: 'legendary', name: 'Legendary', color: '#ff9a20', mods: 5, mult: 5, price: 3500, w: 3 },
    { id: 'set', name: 'Set', color: '#30ffd0', mods: 0, mult: 0, price: 4500, w: 0 }
  ];
  DS.RARITY = {}; DS.RARITIES.forEach(r => DS.RARITY[r.id] = r);
  const MOD_KEYS = Object.keys(DS.STATS).filter(k => k !== 'amount');

  DS.genItem = function (rng, forceRarity) {
    rng = rng || Math.random;
    let rar = forceRarity;
    if (!rar) { const tot = DS.RARITIES.reduce((a, r) => a + r.w, 0); let x = rng() * tot; for (const r of DS.RARITIES) { x -= r.w; if (x <= 0 && r.w) { rar = r.id; break; } } if (!rar) rar = 'common'; }
    const R = DS.RARITY[rar];
    const slotPool = ['helmet', 'necklace', 'chest', 'pants', 'bracers', 'gloves', 'boots', 'ring', 'ring', 'trinket'];
    const slot = slotPool[Math.floor(rng() * slotPool.length)];
    const keys = U.shuffle(MOD_KEYS.slice(), rng).slice(0, R.mods);
    const mods = {};
    keys.forEach(k => { const s = DS.STATS[k]; let v = (s.r[0] + rng() * (s.r[1] - s.r[0])) * R.mult; v = s.dec ? Math.round(v * 10) / 10 : Math.max(1, Math.round(v)); mods[k] = v; });
    if (rar === 'legendary' && rng() < 0.5) mods.amount = 1;
    const base = BASES[slot][Math.floor(rng() * BASES[slot].length)];
    let name = DS.STATS[keys[0]].adj + ' ' + base;
    if (rar === 'legendary') name = LEGEND_PREFIX[Math.floor(rng() * LEGEND_PREFIX.length)] + ' ' + name;
    if (R.mods >= 3) name += ' ' + SUFFIX[Math.floor(rng() * SUFFIX.length)];
    return { uid: 0, name, slot, rarity: rar, mods, price: Math.round(R.price * (0.85 + rng() * 0.3) / 5) * 5 };
  };

  // ---------- Character sets ----------
  DS.SETS = {
    brandon: { name: 'Beach Brandon', owner: 'brandon',
      flavor: 'The aesthetic of a 39-year-old dad at the beach in a cool long-sleeve sun shirt and short swim trunks.',
      pieces: [
        { slot: 'helmet', name: 'Bucket Hat of Eternal Shade', mods: { hpPct: 30, movePct: 10 } },
        { slot: 'necklace', name: 'Puka Shell Necklace (Since 2003)', mods: { dmgPct: 40, crit: 10 } },
        { slot: 'chest', name: 'UPF 50 Long-Sleeve Sun Shirt', mods: { hpPct: 50, armor: 4, regen: 1 } },
        { slot: 'pants', name: '5-Inch Inseam Swim Trunks', mods: { movePct: 25, atkSpdPct: 25 } },
        { slot: 'boots', name: 'Flip-Flops of Haste', mods: { movePct: 30, pickupPct: 50 } },
        { slot: 'trinket', name: 'Koozie of Holding', mods: { autoDmgPct: 100, atkSpdPct: 20 } }],
      bonuses: [
        { n: 2, text: '+30% move speed, +25% all damage', mods: { movePct: 30, dmgPct: 25 } },
        { n: 4, text: '+100% damage to ALL attacks, +50% attack speed', mods: { dmgPct: 100, atkSpdPct: 50 } },
        { n: 6, text: 'DAD MAGNET: every 20s, vacuum every XP globe and item on the map to you. +1 projectile.', mods: { amount: 1 }, flag: 'dadMagnet' }] },
    ryan: { name: 'Swole Patrol', owner: 'ryan',
      flavor: 'Stringer tank, gold rope chain, and a headband doing heroic work up top.',
      pieces: [
        { slot: 'helmet', name: 'Headband of Hair Retention', mods: { hpPct: 40, regen: 1 } },
        { slot: 'necklace', name: 'Gold Rope Chain (Real-ish)', mods: { dmgPct: 40, crit: 8 } },
        { slot: 'chest', name: 'Stringer Tank Top', mods: { hpPct: 60, armor: 5 } },
        { slot: 'pants', name: 'Never-Skip Leg Day Joggers', mods: { movePct: 20, hpPct: 30 } },
        { slot: 'gloves', name: 'Chalky Lifting Gloves', mods: { autoDmgPct: 100, areaPct: 30 } },
        { slot: 'bracers', name: 'Wrist Wraps of the PR', mods: { atkSpdPct: 30, armor: 3 } }],
      bonuses: [
        { n: 2, text: '+50% max HP, +3 armor', mods: { hpPct: 50, armor: 3 } },
        { n: 4, text: '+75% damage, +100% area', mods: { dmgPct: 75, areaPct: 100 } },
        { n: 6, text: 'GYM MIRROR: take 50% less damage and reflect 300% of damage taken.', mods: {}, flag: 'gymMirror' }] },
    tyler: { name: 'Gas Station Gambler', owner: 'tyler',
      flavor: 'Lottery visor, energy drink tracksuit, slides with socks. Feeling lucky.',
      pieces: [
        { slot: 'helmet', name: 'Lottery Visor', mods: { crit: 12, goldPct: 30 } },
        { slot: 'necklace', name: 'Lucky Penny Chain', mods: { critDmgPct: 80, crit: 8 } },
        { slot: 'chest', name: 'Monster Energy Tracksuit', mods: { atkSpdPct: 35, movePct: 15 } },
        { slot: 'pants', name: 'Swishy Track Pants', mods: { movePct: 25, hpPct: 30 } },
        { slot: 'gloves', name: 'Nitrile Gas Pump Gloves', mods: { autoDmgPct: 100, crit: 6 } },
        { slot: 'boots', name: 'Slides With Socks', mods: { movePct: 25, pickupPct: 50 } }],
      bonuses: [
        { n: 2, text: '+25% crit chance', mods: { crit: 25 } },
        { n: 4, text: '+150% crit damage, +30% attack speed', mods: { critDmgPct: 150, atkSpdPct: 30 } },
        { n: 6, text: 'JACKPOT: crits have a 7% chance to explode for 777% damage. +50% gold.', mods: { goldPct: 50 }, flag: 'jackpot' }] },
    kirby: { name: 'Tailgate King', owner: 'kirby',
      flavor: 'Backwards cap, sleeveless jersey, cargo shorts, Crocs in sport mode.',
      pieces: [
        { slot: 'helmet', name: 'Backwards Cap of Confidence', mods: { dmgPct: 30, areaPct: 25 } },
        { slot: 'necklace', name: 'Bottle Opener Necklace', mods: { atkSpdPct: 25, crit: 8 } },
        { slot: 'chest', name: 'Sleeveless Jersey', mods: { hpPct: 50, armor: 3 } },
        { slot: 'pants', name: 'Cargo Shorts (11 Pockets)', mods: { pickupPct: 60, hpPct: 25 } },
        { slot: 'bracers', name: 'Koozie Bracers', mods: { autoDmgPct: 100, areaPct: 20 } },
        { slot: 'boots', name: 'Crocs (Sport Mode)', mods: { movePct: 30, regen: 1 } }],
      bonuses: [
        { n: 2, text: '+50% area', mods: { areaPct: 50 } },
        { n: 4, text: '+80% damage, +40% attack speed', mods: { dmgPct: 80, atkSpdPct: 40 } },
        { n: 6, text: 'KEGERATOR: every 20s a keg erupts around you (massive damage) and heals you 15%.', mods: {}, flag: 'kegerator' }] },
    ron: { name: 'Back-Alley Exorcist', owner: 'ron',
      flavor: 'Tan trench coat, loose black tie, aviators at midnight and a Zippo that has seen things.',
      pieces: [
        { slot: 'helmet', name: 'Midnight Aviators', mods: { crit: 10, cdrPct: 30 } },
        { slot: 'necklace', name: 'Loose Black Tie', mods: { dmgPct: 40, xpPct: 25 } },
        { slot: 'chest', name: 'Tan Trench Coat (Smells Like Sulfur)', mods: { hpPct: 50, armor: 3 } },
        { slot: 'pants', name: 'Rumpled Slacks', mods: { hpPct: 30, movePct: 15 } },
        { slot: 'boots', name: 'Scuffed Oxfords', mods: { movePct: 30, pickupPct: 40 } },
        { slot: 'trinket', name: 'Zippo of the Damned', mods: { autoDmgPct: 100, areaPct: 25 } }],
      bonuses: [
        { n: 2, text: '+40% max HP, +20% special recharge', mods: { hpPct: 40, cdrPct: 20 } },
        { n: 4, text: '+75% damage, auto attacks pierce +5', mods: { dmgPct: 75 }, pierce: 5 },
        { n: 6, text: 'DEAL WITH THE DEVIL: revive once per run at 50% HP; every 20s hellfire smites everything on screen.', mods: {}, flag: 'divine' }] }
  };
  DS.makeSetItem = function (charId, idx) {
    const s = DS.SETS[charId], p = s.pieces[idx];
    return { uid: 0, name: p.name, slot: p.slot, rarity: 'set', mods: Object.assign({}, p.mods), set: charId, owner: charId, price: DS.RARITY.set.price };
  };
  DS.slotFits = (itemSlot, equipSlot) => itemSlot === equipSlot || (itemSlot === 'ring' && (equipSlot === 'ring1' || equipSlot === 'ring2'));

  // ---------- Daily marketplace ----------
  DS.marketStock = function (save) {
    const day = U.todayKey();
    if (!save.market || save.market.day !== day) save.market = { day, rerolls: 0, sold: [] };
    const rng = U.mulberry32(U.hashStr(day + ':' + save.market.rerolls));
    const items = [];
    for (let i = 0; i < 5; i++) {
      let it;
      if (rng() < 0.15) { const cids = Object.keys(DS.SETS); const cid = cids[Math.floor(rng() * cids.length)]; it = DS.makeSetItem(cid, Math.floor(rng() * 6)); }
      else it = DS.genItem(rng);
      it.marketIdx = i; it.sold = save.market.sold.indexOf(i) >= 0;
      items.push(it);
    }
    return items;
  };
  DS.TALENT_POINT_PRICE = 100;
  DS.REROLL_PRICE = 200;
  DS.RESPEC_PRICE = 50;
})(window.DS);

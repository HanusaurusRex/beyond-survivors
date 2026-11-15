// world.js - maps, monsters, bosses
'use strict';
(function (DS) {
  DS.MAPS = [
    { id: 0, name: 'Ruins of Tailgate Keep', desc: 'Overgrown castle courtyard where the old kingdom held its last cookout.', mult: 1, spawn: 1.0, reward: 1,
      pal: { g1: '#1c2a1c', g2: '#243424', g3: '#2e402a', stone: '#5a5a66', stone2: '#3a3a46', accent: '#6a8a40', fog: 'rgba(20,40,30,0.18)' },
      tint: { a: '#7a5a9a', A: '#4a3a6a' } },
    { id: 1, name: 'Bog of the Bad Beat', desc: 'A rotting swamp where lost bets go to drown.', mult: 2, spawn: 1.15, reward: 1.5,
      pal: { g1: '#1a1e14', g2: '#22281a', g3: '#2c3420', stone: '#4a5040', stone2: '#30342a', accent: '#6a7a20', fog: 'rgba(40,50,20,0.22)' },
      tint: { a: '#5a8a3a', A: '#2a5a2a' } },
    { id: 2, name: 'Catacombs of the Cashed Out', desc: 'Bone-lined crypts beneath the casino. Nobody cashes out.', mult: 4, spawn: 1.3, reward: 2,
      pal: { g1: '#16121e', g2: '#1e1828', g3: '#282034', stone: '#4a4060', stone2: '#2a2238', accent: '#8a4aaa', fog: 'rgba(40,20,60,0.22)' },
      tint: { a: '#9a3a5a', A: '#5a1a3a' } },
    { id: 3, name: 'Frozen Fantasy League Wastes', desc: 'Frozen battlefield of last season\'s dead rosters.', mult: 8, spawn: 1.45, reward: 3,
      pal: { g1: '#1c2430', g2: '#24303c', g3: '#2e3c4a', stone: '#7a8aa0', stone2: '#4a5a70', accent: '#a0d0ff', fog: 'rgba(160,200,255,0.10)' },
      tint: { a: '#5a8aca', A: '#2a4a8a' } },
    { id: 4, name: 'Hellfire Buffet Citadel', desc: 'All-you-can-eat damnation. The sneeze guard is lava.', mult: 16, spawn: 1.6, reward: 4,
      pal: { g1: '#241210', g2: '#2e1812', g3: '#3a1e14', stone: '#5a3a30', stone2: '#3a2018', accent: '#ff5020', fog: 'rgba(120,30,0,0.18)' },
      tint: { a: '#c04020', A: '#801a10' } }
  ];
  DS.MAP_UNLOCK_SECONDS = 600; // survive 10:00 on a map to unlock the next

  // base monster: 10 HP, 5 contact dmg, 1 xp at tier 1 / map 1
  DS.MONSTERS = {
    bat: { name: 'Bookie Bat', hp: 0.6, dmg: 0.8, speed: 95, r: 10, sprite: 'bat', from: 0, w: 3 },
    skeleton: { name: 'Repo Skeleton', hp: 1.0, dmg: 1.0, speed: 62, r: 12, sprite: 'skeleton', from: 0, w: 4 },
    zombie: { name: 'Hungover Ghoul', hp: 2.2, dmg: 1.3, speed: 45, r: 13, sprite: 'zombie', from: 1, w: 3 },
    ghost: { name: 'Ghost of Parlays Past', hp: 1.3, dmg: 1.1, speed: 80, r: 12, sprite: 'ghost', from: 3, w: 2 },
    knight: { name: 'Pit Boss Knight', hp: 3.5, dmg: 1.6, speed: 55, r: 14, sprite: 'knight', from: 5, w: 2 }
  };
  DS.BASE_MONSTER = { hp: 10, dmg: 5, xp: 1 };

  DS.BOSSES = {
    minotaur: { name: 'Bull Market Minotaur', ai: 'charger', sprite: 'minotaur', r: 44, speed: 70, desc: 'Telegraphed bull-run charges that leave walls of stalagmite spikes. Enrages into chained charges and a Stampede spike ring.' },
    slotgolem: { name: 'One-Armed Bandit Golem', ai: 'ringer', sprite: 'slotgolem', r: 38, speed: 45, desc: 'Sprays rings of coins. Enraged: pulls its own lever for a coin-rain jackpot and coin spirals.' },
    lich: { name: 'The Repo Lich', ai: 'summoner', sprite: 'lich', r: 32, speed: 60, desc: 'Summons repo skeletons and fires bolts. Enraged: bone-spike rings and blinks away.' },
    wyrm: { name: 'Gas Station Hot Dog Wyrm', ai: 'hazard', sprite: 'wyrm', r: 36, speed: 60, desc: 'Rains fire puddles. Enraged: telegraphed relish-fire breath cone.' },
    pitboss: { name: 'The Pit Boss', ai: 'gunner', sprite: 'pitboss', r: 32, speed: 55, desc: 'Telegraphed teleports and card spreads. Enraged: double card rings.' }
  };
  DS.SUPER_BOSSES = {
    house: { name: 'THE HOUSE (Always Wins)', ai: 'house', sprite: 'house', r: 54, speed: 42, desc: '3 phases: coin rings + summons + fire, then lever jackpots, then roulette streams.' },
    taxman: { name: 'The Tax Collector of Hades', ai: 'taxman', sprite: 'taxman', r: 50, speed: 60, desc: '3 phases: red-tape charges + spirals, then audits (summons + fire), then the closing Tax Bracket.' }
  };
  // Estimated DPS of an "average" character at minute m; bosses target ~30s to kill.
  DS.estDps = (m) => 8 + 16 * m + 2.5 * m * m;
  DS.tierAt = (sec) => 1 + Math.floor(sec / 120);
  DS.tierScale = (tier) => Math.pow(1.25, tier - 1);
})(window.DS);

// abilities.js - every primary / secondary / evolution, data-driven.
// Primaries are auto-firing weapons. Secondaries are passive/utility effects.
// Each ability: base params `p` + `ups` (3 increments for levels 2,3,4).
// Numbers in ups add; strings like '*1.5' multiply.
'use strict';
(function (DS) {
  const A = {};
  const def = (id, o) => { o.id = id; A[id] = o; };
  const x15 = '*1.5', x13 = '*1.3', x125 = '*1.25';

  // ===================== BRANDON =====================
  def('corndog', { kind: 'primary', name: 'Corn Dog Skewer Slinger', type: 'projectile', shape: 'dog', colors: ['#d89038', '#8a5a2a'],
    desc: 'Launches wooden corn dog skewers at an enemy that pierce the first enemy. Each upgrade: +1 skewer and +50% damage.',
    p: { dmg: 14, cd: 1.4, count: 1, speed: 430, pierce: 1, size: 8, life: 1.4, aim: 'nearest', spread: 0.18 },
    ups: [{ count: 1, dmg: x15 }, { count: 1, dmg: x15 }, { count: 1, dmg: x15 }],
    evo: { with: 'chili_ass', into: 'coney_carnage' } });
  def('coney_carnage', { kind: 'evo', name: 'Coney Carnage', type: 'projectile', shape: 'dog', colors: ['#7a3a10', '#c86020'],
    desc: 'Slings 9 chili dogs in all directions. They pierce ALL enemies and leave trails of brown fiery goo.',
    p: { dmg: 48, cd: 1.2, count: 9, speed: 380, pierce: -1, size: 10, life: 1.8, aim: 'radial', trail: { dps: 22, r: 18, life: 2.5, color: '#6a3a10', style: 'goo' } } });

  def('parlay_arrow', { kind: 'primary', name: 'Parlay Arrow', type: 'chain', shape: 'arrow', colors: ['#ffd040', '#fff'],
    desc: 'An arrow that ricochets between enemies. Every bounce is another leg on the ticket.',
    p: { dmg: 12, cd: 2.0, count: 1, chains: 3, range: 190 },
    ups: [{ chains: 1, dmg: x125 }, { chains: 2 }, { chains: 2, dmg: x13 }],
    evo: { with: 'fantasy_lineup', into: 'twelve_leg' } });
  def('twelve_leg', { kind: 'evo', name: '12-Leg Parlay That Actually Hit', type: 'chain', shape: 'arrow', colors: ['#ffe060', '#60ff60'],
    desc: 'Two golden arrows that bounce 12 times. Damage grows +15% with every leg. Screenshot it for the group chat.',
    p: { dmg: 40, cd: 1.4, count: 2, chains: 12, range: 230, grow: 1.15 } });

  def('cooler_toss', { kind: 'primary', name: 'Cooler Toss', type: 'lob', shape: 'cooler', colors: ['#f0f0f0', '#2060c0'],
    desc: 'Lobs a knock-off Yeti cooler that bursts on landing. Ice everywhere.',
    p: { dmg: 26, cd: 3.0, count: 1, radius: 60, flight: 0.6, range: 260 },
    ups: [{ count: 1 }, { radius: 15, dmg: x13 }, { count: 1, dmg: x13 }],
    evo: { with: 'margarita', into: 'tailgate_apocalypse' } });
  def('tailgate_apocalypse', { kind: 'evo', name: 'Tailgate Apocalypse', type: 'lob', shape: 'cooler', colors: ['#90ff90', '#20a040'],
    desc: 'Four margarita coolers rain down, exploding into slushy puddles that freeze and burn.',
    p: { dmg: 70, cd: 2.4, count: 4, radius: 110, flight: 0.6, range: 320, puddle: { dps: 28, r: 90, life: 4, color: '#a0ff80', slow: 0.5 } } });

  def('umbrella_spin', { kind: 'primary', name: 'Beach Umbrella Spin', type: 'orbit', shape: 'umbrella', colors: ['#ff5050', '#fff'],
    desc: 'Beach umbrellas spin around you, bonking anything that gets close.',
    p: { dmg: 11, cd: 6, count: 2, radius: 80, rot: 3, size: 14, dur: 4, knock: 20 },
    ups: [{ count: 1 }, { dmg: x15, radius: 10 }, { count: 1, dur: 1.5 }],
    evo: { with: 'sun_shirt', into: 'cabana_cyclone' } });
  def('cabana_cyclone', { kind: 'evo', name: 'Cabana Cyclone', type: 'orbit', shape: 'umbrella', colors: ['#ffd040', '#ff5050'],
    desc: 'Six giant cabana umbrellas orbit you permanently. Resort fee included.',
    p: { dmg: 32, cd: 1, count: 6, radius: 115, rot: 3.4, size: 20, dur: 0, knock: 40 } });

  def('dad_joke', { kind: 'primary', name: 'Dad Joke Shockwave', type: 'nova', shape: 'ring', colors: ['#ffffa0', '#c0c040'],
    desc: '"Hi Hungry, I\'m Dad." A groan so loud it knocks back everything nearby.',
    p: { dmg: 18, cd: 4, radius: 110, knock: 40 },
    ups: [{ radius: 20 }, { dmg: x15 }, { dmg: x15, cd: -0.8 }],
    evo: { with: 'sandbar', into: 'belly_flop' } });
  def('belly_flop', { kind: 'evo', name: 'Cannonball Belly Flop', type: 'nova', shape: 'ring', colors: ['#60c0ff', '#ffffff'],
    desc: 'A colossal dad-bod cannonball. Massive splash, massive knockback, everything gets wet and slow.',
    p: { dmg: 95, cd: 3, radius: 260, knock: 120, slow: 0.5, stun: 0.4 } });

  def('chili_ass', { kind: 'secondary', style: 'goo', name: 'Chili Ass', type: 'trail', shape: 'drop', colors: ['#6a3a10', '#c86020'],
    desc: 'Leaves a trail of brown fiery goo that slowly damages enemies. Last night\'s chili never forgets.',
    p: { dps: 6, r: 16, life: 2, interval: 0.25, color: '#6a3a10' },
    ups: [{ dps: x15 }, { life: 0.7, r: 4 }, { dps: x15 }] });
  def('sun_shirt', { kind: 'secondary', name: 'UPF 50 Sun Shirt', type: 'shield', shape: 'shirt', colors: ['#58c0e0', '#2a7fa0'],
    desc: 'Long-sleeve sun shirt absorbs damage and recharges. Also +1 armor per level.',
    p: { shield: 15, cd: 10 }, statsPer: { armor: 1 },
    ups: [{ shield: 10 }, { shield: 10, cd: -2 }, { shield: 15 }] });
  def('fantasy_lineup', { kind: 'secondary', name: 'Fantasy Football Lineup', type: 'stat', shape: 'ball', colors: ['#8a4a20', '#fff'],
    desc: 'Start your studs. +5% crit chance and +15% crit damage per level.',
    p: {}, statsPer: { crit: 5, critDmgPct: 15 }, ups: [{}, {}, {}] });
  def('margarita', { kind: 'secondary', name: 'Margarita Pitcher', type: 'regen', shape: 'glass', colors: ['#a0ff80', '#fff'],
    desc: 'Regenerate HP. Also +5% max HP per level. It\'s 5 o\'clock somewhere.',
    p: { regen: 0.5 }, statsPer: { hpPct: 5 },
    ups: [{ regen: 0.5 }, { regen: 0.5 }, { regen: 0.8 }] });
  def('sandbar', { kind: 'secondary', name: 'Sandbar Wake', type: 'aura', shape: 'wave', colors: ['#60c0ff', '#e0d090'],
    desc: 'A slow, sloshing aura that damages and slows enemies around you.',
    p: { radius: 70, dps: 4, slow: 0.25 },
    ups: [{ radius: 15 }, { dps: 3, slow: 0.08 }, { radius: 15, dps: 4 }] });

  // ===================== RYAN =====================
  def('rack_pull', { kind: 'primary', name: 'Rack Pull Cleave', type: 'melee', shape: 'slash', colors: ['#ff8080', '#ffffff'],
    desc: 'A heavy cleave toward the nearest enemy. Ego lifting at its finest.',
    p: { dmg: 22, cd: 2.2, range: 110, arc: 2.4, count: 1, aim: 'nearest' },
    ups: [{ dmg: x13, range: 15 }, { count: 1 }, { dmg: x13, count: 1 }],
    evo: { with: 'preworkout', into: 'never_skip_legs' } });
  def('never_skip_legs', { kind: 'evo', name: 'Never Skip Leg Day', type: 'melee', shape: 'slash', colors: ['#ff4040', '#ffd040'],
    desc: 'A full 360 spin cleave every 1.2s. Squat depth: questionable. Damage: absurd.',
    p: { dmg: 80, cd: 1.2, range: 185, arc: 6.3, count: 1, aim: 'nearest' } });

  def('rogaine_rain', { kind: 'primary', name: 'Rogaine Rain', type: 'strike', shape: 'bottle', colors: ['#40a0ff', '#ffffff'],
    desc: 'Bottles of hair regrowth formula fall from the sky onto random enemies.',
    p: { dmg: 20, cd: 2.5, count: 2, radius: 40 },
    ups: [{ count: 1 }, { dmg: x15, radius: 10 }, { count: 2 }],
    evo: { with: 'mirror_selfie', into: 'miracle_hairline' } });
  def('miracle_hairline', { kind: 'evo', name: 'Miracle Hairline', type: 'strike', shape: 'bottle', colors: ['#ffd040', '#40a0ff'],
    desc: 'It grew back. Ten bottles of pure follicle fury crash down every 1.5s.',
    p: { dmg: 60, cd: 1.5, count: 10, radius: 70, stun: 0.3 } });

  def('kettlebell', { kind: 'primary', name: 'Kettlebell Orbit', type: 'orbit', shape: 'kettle', colors: ['#404048', '#a0a0a8'],
    desc: 'Kettlebells swing around you. Proper form not included.',
    p: { dmg: 16, cd: 7, count: 1, radius: 70, rot: 2.5, size: 12, dur: 5, knock: 50 },
    ups: [{ count: 1 }, { dmg: x15 }, { count: 1, dur: 2 }],
    evo: { with: 'creatine', into: 'swole_system' } });
  def('swole_system', { kind: 'evo', name: 'Swole Solar System', type: 'orbit', shape: 'kettle', colors: ['#ffd040', '#806020'],
    desc: 'Five gold-plated kettlebells in permanent orbit. You ARE the gym.',
    p: { dmg: 45, cd: 1, count: 5, radius: 120, rot: 2.8, size: 18, dur: 0, knock: 80 } });

  def('dumbbell', { kind: 'primary', name: 'Dumbbell Boomerang', type: 'projectile', shape: 'dumbbell', colors: ['#505058', '#c0c0c8'],
    desc: 'Hurls a dumbbell that pierces everything and comes back. Re-rack your weights, bro.',
    p: { dmg: 18, cd: 2.0, count: 1, speed: 400, pierce: -1, size: 10, life: 1.6, aim: 'nearest', boomerang: true, spread: 0.5 },
    ups: [{ dmg: x13 }, { count: 1 }, { count: 1, dmg: x13 }],
    evo: { with: 'cheat_day', into: 'plate_storm' } });
  def('plate_storm', { kind: 'evo', name: '45-Plate Frisbee Storm', type: 'projectile', shape: 'disc', colors: ['#202028', '#ffd040'],
    desc: 'Eight 45lb plates fly out in every direction and come back. Nobody re-racks them.',
    p: { dmg: 52, cd: 1.6, count: 8, speed: 420, pierce: -1, size: 14, life: 1.8, aim: 'radial', boomerang: true, knock: 30 } });

  def('combover', { kind: 'primary', name: 'Comb-Over Whirlwind', type: 'aura', shape: 'wind', colors: ['#c0e0ff', '#1c1a24'],
    desc: 'Your comb-over flaps so violently it creates a damaging whirlwind around you.',
    p: { radius: 60, dps: 10 },
    ups: [{ radius: 15 }, { dps: x15 }, { radius: 15, dps: x15 }],
    evo: { with: 'protein_farts', into: 'toxic_bro_nado' } });
  def('toxic_bro_nado', { kind: 'evo', name: 'Toxic Bro-nado', type: 'aura', shape: 'wind', colors: ['#90e040', '#406010'],
    desc: 'Comb-over + protein farts. A massive green tornado that pulls enemies in and melts them.',
    p: { radius: 160, dps: 48, slow: 0.4, pull: 40 } });

  def('preworkout', { kind: 'secondary', name: 'Pre-Workout Jitters', type: 'stat', shape: 'bolt', colors: ['#ff40ff', '#fff'],
    desc: 'Two scoops, dry. +10% attack speed and +5% move speed per level. Heart rate: yes.',
    p: {}, statsPer: { atkSpdPct: 10, movePct: 5, abilityCdPct: 3 }, ups: [{}, {}, {}] });
  def('creatine', { kind: 'secondary', name: 'Creatine Water Weight', type: 'shield', shape: 'shirt', colors: ['#ffffff', '#c0c0c0'],
    desc: '+10% max HP per level and a bloated shield that recharges.',
    p: { shield: 20, cd: 12 }, statsPer: { hpPct: 10 },
    ups: [{ shield: 10 }, { shield: 10, cd: -2 }, { shield: 20 }] });
  def('protein_farts', { kind: 'secondary', style: 'gas', name: 'Protein Farts', type: 'trail', shape: 'cloud', colors: ['#90c040', '#406010'],
    desc: 'Leaves a lingering green cloud behind you that damages and slows. The squat rack clears out fast.',
    p: { dps: 5, r: 22, life: 2.5, interval: 0.3, slow: 0.2, color: '#78a030' },
    ups: [{ dps: x15 }, { r: 6, life: 0.5 }, { dps: x15, slow: 0.1 }] });
  def('mirror_selfie', { kind: 'secondary', name: 'Mirror Selfie Flex', type: 'thorns', shape: 'mirror', colors: ['#c0e0ff', '#ffffff'],
    desc: 'Reflects damage you take back at attackers (100% +50%/lvl) and +1 armor per level.',
    p: { reflect: 1.0 }, statsPer: { armor: 1 },
    ups: [{ reflect: 0.5 }, { reflect: 0.5 }, { reflect: 1.0 }] });
  def('cheat_day', { kind: 'secondary', name: 'Cheat Day Buffet', type: 'regen', shape: 'burger', colors: ['#c08040', '#40a040'],
    desc: 'Constant snacking. Regenerate HP and +5% max HP per level.',
    p: { regen: 0.8 }, statsPer: { hpPct: 5 },
    ups: [{ regen: 0.6 }, { regen: 0.6 }, { regen: 1.0 }] });

  // ===================== TYLER =====================
  def('scratch_shuriken', { kind: 'primary', name: 'Scratch-Off Shuriken', type: 'projectile', shape: 'ticket', colors: ['#f0e060', '#c0c0c0'],
    desc: 'Spinning lottery tickets at nearby enemies. +10% extra crit chance. Maybe this one\'s the winner.',
    p: { dmg: 10, cd: 1.2, count: 2, speed: 540, pierce: 0, size: 7, life: 1.0, aim: 'nearest', spread: 0.25, critBonus: 0.1 },
    ups: [{ count: 1 }, { dmg: x15, pierce: 1 }, { count: 1, dmg: x13 }],
    evo: { with: 'rabbit_foot', into: 'powerball' } });
  def('powerball', { kind: 'evo', name: 'Powerball Jackpot', type: 'projectile', shape: 'ticket', colors: ['#ffd040', '#ff3030'],
    desc: '12 winning tickets fly in all directions, pierce 3 and get +50% crit chance. Lump sum, baby.',
    p: { dmg: 30, cd: 1.0, count: 12, speed: 560, pierce: 3, size: 9, life: 1.2, aim: 'radial', critBonus: 0.5 } });

  def('sushi_bomb', { kind: 'primary', name: 'Gas Station Sushi', type: 'lob', shape: 'sushi', colors: ['#ff8060', '#ffffff'],
    desc: 'Lob questionable sushi that bursts and leaves a poison puddle. Sold next to the windshield fluid.',
    p: { dmg: 15, cd: 3, count: 1, radius: 50, flight: 0.55, range: 240, puddle: { dps: 8, r: 45, life: 3, color: '#80c060' } },
    ups: [{ count: 1 }, { dmg: x15, radius: 10 }, { count: 1 }],
    evo: { with: 'bathroom_floor', into: 'food_poisoning' } });
  def('food_poisoning', { kind: 'evo', name: 'Food Poisoning Pandemic', type: 'lob', shape: 'sushi', colors: ['#80ff40', '#406020'],
    desc: 'Five trays of expired sushi. Huge toxic puddles. Nobody is leaving the bathroom tonight.',
    p: { dmg: 45, cd: 2.5, count: 5, radius: 90, flight: 0.55, range: 320, puddle: { dps: 36, r: 85, life: 5, color: '#70e030', slow: 0.3 } } });

  def('slot_pull', { kind: 'primary', name: 'Slot Machine Pull', type: 'strike', shape: 'seven', colors: ['#ff3030', '#ffd040'],
    desc: 'Pull the lever: 3 reels strike random enemies. 10% chance to hit 777 for 7x damage.',
    p: { dmg: 18, cd: 2.2, count: 3, radius: 30, jackpot: 0.1 },
    ups: [{ dmg: x13 }, { count: 1, jackpot: 0.05 }, { dmg: x15, radius: 10 }],
    evo: { with: 'comp_card', into: 'whale_status' } });
  def('whale_status', { kind: 'evo', name: 'Whale Status High Roller', type: 'strike', shape: 'seven', colors: ['#ffd040', '#ff3030'],
    desc: 'The casino sends a limo. 9 reels per pull, 35% jackpot chance at 7x. They comp your room AND your hospital bill.',
    p: { dmg: 50, cd: 1.6, count: 9, radius: 50, jackpot: 0.35 } });

  def('gold_chains', { kind: 'primary', name: 'Pawn Shop Gold Chains', type: 'orbit', shape: 'chain', colors: ['#ffd040', '#a07010'],
    desc: 'Gold(ish) chains whip around you. Pawned and re-bought four times.',
    p: { dmg: 8, cd: 5, count: 3, radius: 60, rot: 4, size: 9, dur: 4, knock: 10 },
    ups: [{ count: 1 }, { dmg: x15, radius: 10 }, { count: 1, dur: 1.5 }],
    evo: { with: 'pawn_magnet', into: 'bling_cyclone' } });
  def('bling_cyclone', { kind: 'evo', name: 'Pawn Star Bling Cyclone', type: 'orbit', shape: 'chain', colors: ['#fff080', '#ffd040'],
    desc: 'Eight chains in permanent orbit at blinding speed. Best I can do is... everything dies.',
    p: { dmg: 26, cd: 1, count: 8, radius: 105, rot: 5, size: 12, dur: 0, knock: 20 } });

  def('palpitations', { kind: 'primary', name: 'Energy Drink Palpitations', type: 'chain', shape: 'bolt', colors: ['#80ff40', '#ffffff'],
    desc: 'Your heart skips so hard it shoots lightning that chains between enemies.',
    p: { dmg: 14, cd: 1.8, count: 1, chains: 2, range: 170 },
    ups: [{ chains: 1 }, { dmg: x15 }, { count: 1, chains: 1 }],
    evo: { with: 'iv_drip', into: 'cardiac_overdrive' } });
  def('cardiac_overdrive', { kind: 'evo', name: 'Cardiac Overdrive', type: 'chain', shape: 'bolt', colors: ['#ff3030', '#80ff40'],
    desc: 'Twelve cans deep. Three bolts every 0.8s, chaining 8 times. Please see a doctor.',
    p: { dmg: 40, cd: 0.8, count: 3, chains: 8, range: 210 } });

  def('rabbit_foot', { kind: 'secondary', name: 'Lucky Rabbit\'s Foot Keychain', type: 'stat', shape: 'foot', colors: ['#f0f0f0', '#ff80a0'],
    desc: '+6% crit chance and +20% crit damage per level. Not lucky for the rabbit.',
    p: {}, statsPer: { crit: 6, critDmgPct: 20 }, ups: [{}, {}, {}] });
  def('bathroom_floor', { kind: 'secondary', style: 'sticky', name: 'Gas Station Bathroom Floor', type: 'trail', shape: 'drop', colors: ['#c0c060', '#808020'],
    desc: 'You track a sticky mystery puddle everywhere. Enemies get stuck (slow) and hurt.',
    p: { dps: 4, r: 18, life: 2.2, interval: 0.25, slow: 0.35, color: '#a0a040' },
    ups: [{ dps: x15 }, { slow: 0.1, r: 4 }, { dps: x15, life: 0.8 }] });
  def('comp_card', { kind: 'secondary', name: 'Casino Comp Card', type: 'shield', shape: 'card', colors: ['#202020', '#ffd040'],
    desc: 'Players club perks: a recharging shield and +10% gold gain per level.',
    p: { shield: 12, cd: 8 }, statsPer: { goldPct: 10 },
    ups: [{ shield: 8 }, { shield: 8, cd: -1.5 }, { shield: 12 }] });
  def('pawn_magnet', { kind: 'secondary', name: 'Pawn Shop Metal Detector', type: 'magnet', shape: 'magnet', colors: ['#ff3030', '#c0c0c0'],
    desc: '+25% pickup radius per level and periodically vacuums every XP gem on the map.',
    p: { pulse: 40 }, statsPer: { pickupPct: 25, goldPct: 5 },
    ups: [{ pulse: -8 }, { pulse: -8 }, { pulse: -8 }] });
  def('iv_drip', { kind: 'secondary', name: 'Energy Drink IV Drip', type: 'stat', shape: 'can', colors: ['#1a1a1a', '#80ff40'],
    desc: '+8% attack speed, +6% move speed, +5% ability cooldown reduction per level.',
    p: {}, statsPer: { atkSpdPct: 8, movePct: 6, abilityCdPct: 5 }, ups: [{}, {}, {}] });

  // ===================== KIRBY =====================
  def('shotgun_beer', { kind: 'primary', name: 'Shotgun a Beer', type: 'projectile', shape: 'foam', colors: ['#fff8d0', '#e0b030'],
    desc: 'Crack it with a key and spray a cone of beer foam at the nearest enemy.',
    p: { dmg: 7, cd: 1.6, count: 5, speed: 460, pierce: 1, size: 6, life: 0.38, aim: 'nearest', spread: 0.65 },
    ups: [{ count: 2 }, { dmg: x15 }, { count: 2, pierce: 1 }],
    evo: { with: 'beer_goggles', into: 'beer_bong_hose' } });
  def('beer_bong_hose', { kind: 'evo', name: 'Beer Bong Fire Hose', type: 'projectile', shape: 'foam', colors: ['#ffe060', '#ffffff'],
    desc: 'Funnel attached to a fire hydrant. 14 foam blasts every 0.6s that pierce 3.',
    p: { dmg: 18, cd: 0.6, count: 14, speed: 520, pierce: 3, size: 8, life: 0.5, aim: 'nearest', spread: 0.9 } });

  def('keg_stand', { kind: 'primary', name: 'Keg Stand Quake', type: 'nova', shape: 'ring', colors: ['#e0b030', '#fff8d0'],
    desc: 'Flip upside down, chug, and slam back to earth with a damaging shockwave.',
    p: { dmg: 20, cd: 4.5, radius: 100, knock: 50 },
    ups: [{ radius: 20 }, { dmg: x15 }, { dmg: x15, cd: -1 }],
    evo: { with: 'dad_bod', into: 'belly_bump_quake' } });
  def('belly_bump_quake', { kind: 'evo', name: 'Belly Bump Earthquake', type: 'nova', shape: 'ring', colors: ['#ff8040', '#ffd040'],
    desc: 'One belly bump registers on the Richter scale. Huge radius, stuns everything.',
    p: { dmg: 85, cd: 2.5, radius: 240, knock: 100, stun: 0.6 } });

  def('cornhole', { kind: 'primary', name: 'Cornhole Bag Toss', type: 'lob', shape: 'bag', colors: ['#c02828', '#f0ecd8'],
    desc: 'Lobs cornhole bags that slam down on enemies. Airmail, every time.',
    p: { dmg: 22, cd: 2.5, count: 2, radius: 45, flight: 0.55, range: 250 },
    ups: [{ count: 1 }, { dmg: x15, radius: 10 }, { count: 2 }],
    evo: { with: 'puke_trail', into: 'cornhole_carpet' } });
  def('cornhole_carpet', { kind: 'evo', name: 'Cornhole Carpet Bombing', type: 'lob', shape: 'bag', colors: ['#ffd040', '#c02828'],
    desc: 'Eight bags per volley, each leaving a nasty puddle. The tailgate is a war zone.',
    p: { dmg: 55, cd: 2.0, count: 8, radius: 70, flight: 0.55, range: 330, puddle: { dps: 22, r: 60, life: 3, color: '#c0a040', slow: 0.3 } } });

  def('bottle_caps', { kind: 'primary', name: 'Bottle Cap Ricochet', type: 'chain', shape: 'cap', colors: ['#c0c0c8', '#c02828'],
    desc: 'Flick a bottle cap off your thumb. It ricochets between enemies.',
    p: { dmg: 11, cd: 1.6, count: 1, chains: 3, range: 170 },
    ups: [{ chains: 1 }, { dmg: x15 }, { count: 1, chains: 1 }],
    evo: { with: 'hair_of_dog', into: 'thirty_rack' } });
  def('thirty_rack', { kind: 'evo', name: '30-Rack Ricochet', type: 'chain', shape: 'cap', colors: ['#ffd040', '#2050c0'],
    desc: 'Four caps every second, 6 bounces each, and every hit heals you a little. Hydration.',
    p: { dmg: 30, cd: 1.0, count: 4, chains: 6, range: 210, healOnHit: 0.4 } });

  def('koozie_sats', { kind: 'primary', name: 'Koozie Satellites', type: 'orbit', shape: 'can', colors: ['#2050c0', '#c0c8d8'],
    desc: 'Beer koozies orbit you like a tailgate solar system.',
    p: { dmg: 9, cd: 6, count: 2, radius: 65, rot: 3, size: 10, dur: 5, knock: 15 },
    ups: [{ count: 1 }, { dmg: x15, radius: 10 }, { count: 1, dur: 1.5 }],
    evo: { with: 'grill_smoke', into: 'brisket_cyclone' } });
  def('brisket_cyclone', { kind: 'evo', name: 'Smoked Brisket Cyclone', type: 'orbit', shape: 'meat', colors: ['#6a2a10', '#ff8040'],
    desc: 'Six 14-hour briskets in permanent orbit. Each hit sets enemies on fire.',
    p: { dmg: 30, cd: 1, count: 6, radius: 110, rot: 3.2, size: 16, dur: 0, knock: 20, burn: { dps: 15, dur: 2 } } });

  def('beer_goggles', { kind: 'secondary', name: 'Beer Goggles', type: 'stat', shape: 'goggles', colors: ['#101018', '#e0b030'],
    desc: 'Everything looks hittable. +8% damage and +10% area per level.',
    p: {}, statsPer: { dmgPct: 8, areaPct: 10 }, ups: [{}, {}, {}] });
  def('puke_trail', { kind: 'secondary', style: 'puke', name: 'Puke Trail', type: 'trail', shape: 'drop', colors: ['#c0b040', '#807020'],
    desc: 'Too many tallboys. Leave a trail that damages and slows. Someone get this man a Gatorade.',
    p: { dps: 6, r: 18, life: 2, interval: 0.28, slow: 0.2, color: '#b0a030' },
    ups: [{ dps: x15 }, { r: 5, life: 0.5 }, { dps: x15 }] });
  def('dad_bod', { kind: 'secondary', name: 'Dad Bod Insulation', type: 'shield', shape: 'shirt', colors: ['#e8b088', '#c02828'],
    desc: '+12% max HP, +1 armor per level and a recharging layer of pure insulation.',
    p: { shield: 15, cd: 11 }, statsPer: { hpPct: 12, armor: 1 },
    ups: [{ shield: 10 }, { shield: 10, cd: -2 }, { shield: 15 }] });
  def('hair_of_dog', { kind: 'secondary', name: 'Hair of the Dog', type: 'regen', shape: 'glass', colors: ['#e0b030', '#fff8d0'],
    desc: 'The cure for a hangover is more beer. Regenerate HP, +5% max HP per level.',
    p: { regen: 0.6 }, statsPer: { hpPct: 5 },
    ups: [{ regen: 0.5 }, { regen: 0.5 }, { regen: 0.8 }] });
  def('grill_smoke', { kind: 'secondary', name: 'Grill Smoke', type: 'aura', shape: 'cloud', colors: ['#909090', '#ff8040'],
    desc: 'You smell like hickory. A smoky aura damages and slows nearby enemies.',
    p: { radius: 75, dps: 5, slow: 0.15 },
    ups: [{ radius: 15 }, { dps: 3, slow: 0.08 }, { radius: 15, dps: 4 }] });

  // ===================== RON =====================
  def('collection_plate', { kind: 'primary', name: 'Cursed Collection Plate', type: 'projectile', shape: 'disc', colors: ['#c09030', '#ff4010'],
    desc: 'Flings a hexed collection plate stolen from a possessed church. Pierces everything and comes back (fuller).',
    p: { dmg: 15, cd: 2.2, count: 1, speed: 400, pierce: -1, size: 11, life: 1.6, aim: 'nearest', boomerang: true, spread: 0.6 },
    ups: [{ dmg: x13 }, { count: 1 }, { count: 1, dmg: x13 }],
    evo: { with: 'tithe', into: 'megachurch_storm' } });
  def('megachurch_storm', { kind: 'evo', name: 'Demonic Debt Collection', type: 'projectile', shape: 'disc', colors: ['#ffd040', '#40c040'],
    desc: 'Six burning plates in every direction. Enemies hit may cough up gold. The devil always collects.',
    p: { dmg: 46, cd: 1.6, count: 6, speed: 420, pierce: -1, size: 14, life: 1.8, aim: 'radial', boomerang: true, goldChance: 0.03 } });

  def('casserole', { kind: 'primary', name: 'Hellfire Potluck Casserole', type: 'lob', shape: 'casserole', colors: ['#e0a040', '#ff4010'],
    desc: 'Lobs a cursed tater tot casserole. Explodes into a molten cheesy puddle that slows.',
    p: { dmg: 24, cd: 3.2, count: 1, radius: 55, flight: 0.65, range: 250, puddle: { dps: 6, r: 50, life: 3, color: '#e0c040', slow: 0.3 } },
    ups: [{ count: 1 }, { dmg: x15, radius: 10 }, { count: 1 }],
    evo: { with: 'holy_water', into: 'seven_layer_judgement' } });
  def('seven_layer_judgement', { kind: 'evo', name: 'Seven-Layer Dip of the Damned', type: 'lob', shape: 'casserole', colors: ['#60c0ff', '#e0a040'],
    desc: 'Four bowls of exorcised seven-layer dip. Enormous holy puddles that burn the wicked.',
    p: { dmg: 70, cd: 2.6, count: 4, radius: 100, flight: 0.65, range: 320, puddle: { dps: 32, r: 95, life: 4.5, color: '#80d0ff', slow: 0.4 } } });

  def('smite', { kind: 'primary', name: 'Smite', type: 'strike', shape: 'bolt', colors: ['#fff080', '#ffffff'],
    desc: 'Flicks the cigarette, mutters a word you can\'t say on TV, and lightning drops on a random enemy.',
    p: { dmg: 30, cd: 2.5, count: 1, radius: 45 },
    ups: [{ count: 1 }, { dmg: x15, radius: 10 }, { count: 2 }],
    evo: { with: 'guardian_angel', into: 'aviator_wrath' } });
  def('aviator_wrath', { kind: 'evo', name: 'Wrath of the Aviators', type: 'strike', shape: 'bolt', colors: ['#ffd040', '#ff4040'],
    desc: 'The aviators come off. Eight hellfire bolts every 1.4s that stun.',
    p: { dmg: 90, cd: 1.4, count: 8, radius: 70, stun: 0.5 } });

  def('bingo_balls', { kind: 'primary', name: 'Haunted Bingo Balls', type: 'orbit', shape: 'ball2', colors: ['#ffffff', '#ab47bc'],
    desc: 'B-12! Possessed bingo balls from a back-room parlor orbit you, whispering numbers.',
    p: { dmg: 10, cd: 6, count: 3, radius: 75, rot: 3, size: 9, dur: 5, knock: 10 },
    ups: [{ count: 1 }, { dmg: x15 }, { count: 2, dur: 1.5 }],
    evo: { with: 'communion_wine', into: 'blackout_bingo' } });
  def('blackout_bingo', { kind: 'evo', name: 'Blackout Bingo', type: 'orbit', shape: 'ball2', colors: ['#ffd040', '#ab47bc'],
    desc: 'Ten demon-eyed balls, permanent orbit. Every hit drains a smidge of life back to you. BINGO.',
    p: { dmg: 30, cd: 1, count: 10, radius: 120, rot: 2.6, size: 11, dur: 0, knock: 15, healOnHit: 0.25 } });

  def('brimstone', { kind: 'primary', name: 'Back-Alley Exorcism', type: 'nova', shape: 'ring', colors: ['#ff6020', '#ffd040'],
    desc: 'A slurred Latin rite that blasts out hellfire and sets nearby enemies burning.',
    p: { dmg: 18, cd: 5, radius: 120, knock: 20, burn: { dps: 6, dur: 3 } },
    ups: [{ radius: 20 }, { dmg: x15 }, { dmg: x13, cd: -1 }],
    evo: { with: 'choir', into: 'three_hour_service' } });
  def('three_hour_service', { kind: 'evo', name: 'Exorcism That Never Ends', type: 'aura', shape: 'ring', colors: ['#ffd040', '#ff6020'],
    desc: 'A permanent ring of chanting hellfire. Enemies are slowed to a crawl. Nobody leaves early.',
    p: { radius: 200, dps: 42, slow: 0.5 } });

  def('tithe', { kind: 'secondary', name: 'Devil\'s Cut', type: 'magnet', shape: 'coin', colors: ['#ffd040', '#a07010'],
    desc: 'Every soul owes a 10% cut. +15% gold gain and +15% pickup radius per level, plus a periodic XP vacuum.',
    p: { pulse: 45 }, statsPer: { goldPct: 15, pickupPct: 15 },
    ups: [{ pulse: -8 }, { pulse: -8 }, { pulse: -8 }] });
  def('holy_water', { kind: 'secondary', style: 'holy', name: 'Spiked Holy Water Flask', type: 'trail', shape: 'drop', colors: ['#80d0ff', '#ffffff'],
    desc: 'Half holy water, half bourbon. You slosh it behind you; the puddles burn the unclean.',
    p: { dps: 6, r: 18, life: 2, interval: 0.25, color: '#60b0ff' },
    ups: [{ dps: x15 }, { r: 5, life: 0.5 }, { dps: x15 }] });
  def('guardian_angel', { kind: 'secondary', name: 'Fallen Angel Bodyguard', type: 'shield', shape: 'wing', colors: ['#ffffff', '#ffd040'],
    desc: 'A chain-smoking fallen angel owes you a favor: a recharging shield. +5% max HP per level.',
    p: { shield: 20, cd: 12 }, statsPer: { hpPct: 5 },
    ups: [{ shield: 10 }, { shield: 10, cd: -2 }, { shield: 20 }] });
  def('communion_wine', { kind: 'secondary', name: 'Cheap Scotch', type: 'regen', shape: 'glass', colors: ['#a01040', '#ffffff'],
    desc: 'Bottom-shelf, medicinal. Regenerate HP, +5% max HP per level.',
    p: { regen: 0.6 }, statsPer: { hpPct: 5 },
    ups: [{ regen: 0.5 }, { regen: 0.5 }, { regen: 0.8 }] });
  def('choir', { kind: 'secondary', name: 'Demonic Choir', type: 'aura', shape: 'note', colors: ['#ffffff', '#ab47bc'],
    desc: 'Something in your coat pocket is singing backwards. An aura that damages and heavily slows enemies.',
    p: { radius: 90, dps: 4, slow: 0.3 },
    ups: [{ radius: 15 }, { dps: 3, slow: 0.08 }, { radius: 15, dps: 4 }] });

  // ===================== SUPER EVOLUTIONS =====================
  // Own BOTH evolved abilities -> next level-up offers a Super Evolution that merges them into ONE slot,
  // runs both at x`mult` power, and adds a unique flourish. Primary slots are limited (DS.PRIMARY_SLOTS),
  // so merging frees a slot for new primaries.
  const SUP = (id, o) => { o.id = id; o.kind = 'super'; o.type = 'super'; A[id] = o; return o; };
  DS.SUPERS = {
    brandon: [
      SUP('chili_armageddon', { name: 'Chili Cheese Armageddon', parts: ['coney_carnage', 'tailgate_apocalypse'], mult: 1.75, shape: 'dog', colors: ['#ff6020', '#6a3a10'],
        desc: 'Coney Carnage + Tailgate Apocalypse in one gut-busting slot, both at +75% power. Flourish: every 5s a Mushroom Cloud Fart nova burns everything around you.',
        flourish: { name: 'Mushroom Cloud Fart', type: 'nova', shape: 'cloud', colors: ['#8a5a20', '#ff8030'], p: { dmg: 150, cd: 5, radius: 300, knock: 80, burn: { dps: 30, dur: 3 } } } }),
      SUP('hail_mary', { name: 'Hail Mary Cannonball Parlay', parts: ['twelve_leg', 'belly_flop'], mult: 1.75, shape: 'arrow', colors: ['#ffe060', '#60c0ff'],
        desc: '12-Leg Parlay + Cannonball Belly Flop merged, both at +75%. Flourish: Payout Rain drops 6 jackpot coins from the sky every 2s.',
        flourish: { name: 'Payout Rain', type: 'strike', shape: 'coin', colors: ['#ffd040', '#c08010'], p: { dmg: 120, cd: 2, count: 6, radius: 80, jackpot: 0.2 } } })],
    ryan: [
      SUP('olympia_spin', { name: 'Mr. Olympia Spin Cycle', parts: ['never_skip_legs', 'swole_system'], mult: 1.75, shape: 'kettle', colors: ['#ffd040', '#ff4040'],
        desc: 'Never Skip Leg Day + Swole Solar System merged, both at +75%. Flourish: a stunning Flex Shockwave every 4s.',
        flourish: { name: 'Flex Shockwave', type: 'nova', shape: 'ring', colors: ['#ff4040', '#ffd040'], p: { dmg: 160, cd: 4, radius: 280, knock: 90, stun: 0.5 } } }),
      SUP('toxic_hairicane', { name: 'Full Head of Toxic Hairicane', parts: ['miracle_hairline', 'toxic_bro_nado'], mult: 1.75, shape: 'wind', colors: ['#90e040', '#40a0ff'],
        desc: 'Miracle Hairline + Toxic Bro-nado merged, both at +75%. Flourish: 16 piercing Rogaine bottles burst out every 1.5s leaving toxic gas.',
        flourish: { name: 'Rogaine Shrapnel', type: 'projectile', shape: 'bottle', colors: ['#90e040', '#40a0ff'], p: { dmg: 60, cd: 1.5, count: 16, speed: 420, pierce: -1, size: 9, life: 1.2, aim: 'radial', trail: { dps: 15, r: 16, life: 1.5, color: '#78a030', style: 'gas' } } } })],
    tyler: [
      SUP('mega_millions', { name: 'Mega Millions Whale Hunt', parts: ['powerball', 'whale_status'], mult: 1.75, shape: 'ticket', colors: ['#ffd040', '#ff3030'],
        desc: 'Powerball Jackpot + Whale Status merged, both at +75%. Flourish: Jackpot Lightning chains 8 times, growing with each hit.',
        flourish: { name: 'Jackpot Lightning', type: 'chain', shape: 'bolt', colors: ['#ffd040', '#ffffff'], p: { dmg: 90, cd: 1.2, count: 3, chains: 8, range: 230, grow: 1.1 } } }),
      SUP('death_combo', { name: 'Gas Station Death Combo #3', parts: ['food_poisoning', 'cardiac_overdrive'], mult: 1.75, shape: 'sushi', colors: ['#80ff40', '#ff3030'],
        desc: 'Food Poisoning Pandemic + Cardiac Overdrive merged, both at +75%. Flourish: a permanent Heart Attack aura that melts and slows everything near you.',
        flourish: { name: 'Heart Attack Aura', type: 'aura', shape: 'ring', colors: ['#ff3060', '#80ff40'], p: { radius: 170, dps: 70, slow: 0.3 } } })],
    kirby: [
      SUP('open_bar', { name: 'Open Bar Apocalypse', parts: ['beer_bong_hose', 'thirty_rack'], mult: 1.75, shape: 'foam', colors: ['#ffe060', '#2050c0'],
        desc: 'Beer Bong Fire Hose + 30-Rack Ricochet merged, both at +75%. Flourish: a Keg Barrage of 4 exploding kegs every 3s.',
        flourish: { name: 'Keg Barrage', type: 'lob', shape: 'can', colors: ['#8a5a2a', '#c0c0c8'], p: { dmg: 150, cd: 3, count: 4, radius: 120, flight: 0.6, range: 340, puddle: { dps: 30, r: 90, life: 3, color: '#e0b030', slow: 0.4 } } } }),
      SUP('tectonic_bbq', { name: 'Tectonic Brisket Belly', parts: ['belly_bump_quake', 'brisket_cyclone'], mult: 1.75, shape: 'meat', colors: ['#ff8040', '#6a2a10'],
        desc: 'Belly Bump Earthquake + Smoked Brisket Cyclone merged, both at +75%. Flourish: 5 flaming Meteor Briskets crash down every 2.5s.',
        flourish: { name: 'Meteor Briskets', type: 'strike', shape: 'meat', colors: ['#6a2a10', '#ff8040'], p: { dmg: 140, cd: 2.5, count: 5, radius: 90, burn: { dps: 25, dur: 3 } } } })],
    ron: [
      SUP('last_rites', { name: 'Last Rites at Last Call', parts: ['aviator_wrath', 'three_hour_service'], mult: 1.75, shape: 'bolt', colors: ['#ff6020', '#ffd040'],
        desc: 'Wrath of the Aviators + Exorcism That Never Ends merged, both at +75%. Flourish: a Hellmouth Burst every 4s.',
        flourish: { name: 'Hellmouth Burst', type: 'nova', shape: 'ring', colors: ['#ff4010', '#ffd040'], p: { dmg: 200, cd: 4, radius: 320, knock: 60, burn: { dps: 35, dur: 3 } } } }),
      SUP('soul_debt', { name: 'Soul Debt Bingo Collection', parts: ['megachurch_storm', 'blackout_bingo'], mult: 1.75, shape: 'tome', colors: ['#3a1020', '#ff6020'],
        desc: 'Demonic Debt Collection + Blackout Bingo merged, both at +75%. Flourish: 12 burning tome pages spray out every second.',
        flourish: { name: 'Burning Pages', type: 'projectile', shape: 'page', colors: ['#f0e0b0', '#ff6020'], p: { dmg: 70, cd: 1, count: 12, speed: 460, pierce: 4, size: 8, life: 1.1, aim: 'radial', burn: { dps: 20, dur: 2 } } } })]
  };
  DS.PRIMARY_SLOTS = 4;
  DS.ABILITIES = A;

  // Compute params for a given level (1..4). Evolutions are always "level 1".
  DS.abilityParams = function (ab, level) {
    const p = JSON.parse(JSON.stringify(ab.p));
    const ups = ab.ups || [];
    for (let i = 0; i < level - 1 && i < ups.length; i++) {
      for (const k in ups[i]) {
        const v = ups[i][k];
        if (typeof v === 'string' && v[0] === '*') p[k] = (p[k] || 0) * parseFloat(v.slice(1));
        else p[k] = (p[k] || 0) + v;
      }
    }
    if (ab.statsPer) { p.stats = {}; for (const k in ab.statsPer) p.stats[k] = ab.statsPer[k] * level; }
    return p;
  };
  const LABEL = { dmg: 'damage', dps: 'damage', count: 'projectiles', chains: 'bounces', radius: 'area', r: 'size', range: 'range', life: 'duration', dur: 'duration', cd: 'cooldown', pierce: 'pierce', shield: 'shield', regen: 'HP/s regen', slow: 'slow', jackpot: 'jackpot chance', reflect: 'reflect', pulse: 'vacuum cooldown' };
  DS.upgradeText = function (ab, toLevel) {
    if (toLevel <= 1) return ab.desc;
    const u = (ab.ups || [])[toLevel - 2] || {};
    const parts = [];
    for (const k in u) {
      const v = u[k], lab = LABEL[k] || k;
      if (typeof v === 'string') parts.push('+' + Math.round((parseFloat(v.slice(1)) - 1) * 100) + '% ' + lab);
      else if (k === 'cd' || k === 'pulse') parts.push(v + 's ' + lab);
      else if (k === 'slow' || k === 'jackpot' || k === 'reflect') parts.push('+' + Math.round(v * 100) + '% ' + lab);
      else parts.push('+' + v + ' ' + lab);
    }
    if (ab.statsPer) parts.push(DS.statsText(ab.statsPer));
    return parts.join(', ') || 'Stronger.';
  };
})(window.DS);

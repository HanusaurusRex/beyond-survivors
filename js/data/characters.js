// characters.js - the five playable degenerates of Beyond Survivors
'use strict';
(function (DS) {
  const COMMON_PAL = { k: '#140c1c', s: '#e8b088', S: '#b8805a', e: '#140c1c', w: '#f0ecd8', L: '#fff0d0' };
  DS.CHARACTERS = [
    {
      id: 'brandon', name: 'Brandon', title: 'Beach Dad Ranger', color: '#4fc3f7',
      desc: 'Balanced ranged dad. 39, sunscreen-shiny, dangerously confident in his parlays. Fires arrows wherever you aim.',
      base: { hp: 100, speed: 150, dmg: 12, crit: 5, critMult: 2.0, armor: 0, regen: 0, pickup: 60 },
      main: { name: 'Dad Bow', type: 'projectile', shape: 'arrow', colors: ['#d8c8a0', '#8a5a2a'], speed: 560, pierce: 0, size: 6, count: 1, spread: 0.12, life: 1.3, sfx: 'shoot' },
      special: { id: 'barrage', name: 'Rain Delay Barrage', cd: 20, desc: 'Calls down a storm of arrows on your cursor. The game is NOT postponed.' },
      primaries: ['corndog', 'parlay_arrow', 'cooler_toss', 'umbrella_spin', 'dad_joke'],
      secondaries: ['chili_ass', 'sun_shirt', 'fantasy_lineup', 'margarita', 'sandbar'],
      pal: { h: '#1c1a24', b: '#26222c', c: '#58c0e0', C: '#2a7fa0', t: '#e8602c', T: '#ffd040', y: '#a06a30' },
      rows: [
        '......hhhhh.....',
        '.....hhhhhhh....',
        '....hhhhhhhhh...',
        '....hssssssh....',
        '....sesssess....',
        '....ssssSsss....',
        '....bssssssb....',
        '....bbbSSbbb....',
        '.....bbbbbb.....',
        '...cCccccccCc...',
        '..ccccccccccccy.',
        '..cccccccccccc.y',
        '..cccccccccccc.y',
        '..sCccccccccCs.y',
        '...cccccccccc.y.',
        '....tTttttTt....',
        '....ttttTttt....',
        '....ttt..ttt....'],
      legsA: ['....ss...ss.....', '...kkk...kkk....'],
      legsB: ['.....ss.ss......', '....kkk.kkk.....']
    },
    {
      id: 'ryan', name: 'Ryan', title: 'Swole Sword Bro', color: '#ef5350',
      desc: 'Tanky melee. Never skips leg day, frequently skips sunscreen on the scalp. Cleaves in an arc toward your cursor.',
      base: { hp: 150, speed: 138, dmg: 18, crit: 5, critMult: 2.0, armor: 2, regen: 0.3, pickup: 55 },
      main: { name: 'Gym Bag Gladius', type: 'melee', shape: 'slash', colors: ['#e0e8f0', '#8090a0'], range: 85, arc: 1.9, count: 1, sfx: 'slash' },
      special: { id: 'roid_rage', name: 'Roid Rage', cd: 25, desc: '6s of +100% damage, +50% attack speed and 70% damage reduction. Totally natural.' },
      primaries: ['rack_pull', 'rogaine_rain', 'kettlebell', 'dumbbell', 'combover'],
      secondaries: ['preworkout', 'creatine', 'protein_farts', 'mirror_selfie', 'cheat_day'],
      pal: { h: '#1c1a24', c: '#9a9aa4', C: '#6a6a74', p: '#2a2a3a', x: '#d8e0e8', X: '#c09030' },
      rows: [
        '................',
        '......h.h.h.....',
        '.....hshshsh....',
        '....hsssssssh...',
        '....sesssess....',
        '....ssssSsss....',
        '....sssSSsss....',
        '.....ssssss.....',
        '......ssss......',
        '.ssscccccccsss..',
        'sssscccccccsss.x',
        'ss..cCcccCc..sx.',
        'ss..ccccccc..Xx.',
        'ss..ccccccc..sX.',
        '.s..ppppppp.....',
        '....ppppppp.....',
        '....ppp.ppp.....',
        '....ppp.ppp.....'],
      legsA: ['....ss...ss.....', '...kkk...kkk....'],
      legsB: ['.....ss.ss......', '....kkk.kkk.....']
    },
    {
      id: 'tyler', name: 'Tyler', title: 'Scratch-Off Assassin', color: '#66bb6a',
      desc: 'Fast, fragile crit machine. Runs on energy drinks and gas station sushi. Throws daggers at your cursor.',
      base: { hp: 85, speed: 175, dmg: 9, crit: 15, critMult: 2.25, armor: 0, regen: 0, pickup: 65 },
      main: { name: 'Lucky Shiv', type: 'projectile', shape: 'dagger', colors: ['#d0d8e0', '#50e030'], speed: 720, pierce: 0, size: 6, count: 1, spread: 0.1, life: 0.9, sfx: 'throw' },
      special: { id: 'all_in', name: 'All-In Dash', cd: 10, desc: 'Shove all your chips in: dash toward the cursor (invulnerable) and burst 12 daggers.' },
      primaries: ['scratch_shuriken', 'sushi_bomb', 'slot_pull', 'gold_chains', 'palpitations'],
      secondaries: ['rabbit_foot', 'bathroom_floor', 'comp_card', 'pawn_magnet', 'iv_drip'],
      pal: { b: '#e8c048', c: '#1a1a1a', C: '#50e030', p: '#22222a', d: '#c8d0d8' },
      rows: [
        '................',
        '......ssss......',
        '.....sLLsss.....',
        '....ssLsssss....',
        '....sesssess....',
        '....ssssSsss....',
        '...bbssssssbb...',
        '...bbbbSSbbbb...',
        '....bbbbbbbb....',
        '..cccccCcccccc..',
        '.ccccccCccccccc.',
        '.ccCccCCccCcccd.',
        '.ccccccCcccccsd.',
        '.ss.ccccccccc...',
        '....ppppppppp...',
        '....pCpppppCp...',
        '....ppp...ppp...',
        '....ppp...ppp...'],
      legsA: ['....www...www...', '....kkk...kkk...'],
      legsB: ['.....www.www....', '.....kkk.kkk....']
    },
    {
      id: 'kirby', name: 'Kirby', title: 'Tailgate Brawler', color: '#ffa726',
      desc: 'AOE splash bruiser. Shades on at night. Lobs cans of beer at your cursor that burst in a foamy splash.',
      base: { hp: 120, speed: 142, dmg: 10, crit: 5, critMult: 2.0, armor: 1, regen: 0, pickup: 60 },
      main: { name: 'Tallboy Toss', type: 'projectile', shape: 'can', colors: ['#c0c8d8', '#2050c0'], speed: 400, pierce: 0, size: 7, count: 1, spread: 0.1, life: 1.2, explode: 48, sfx: 'can' },
      special: { id: 'kegger', name: 'Kegger', cd: 18, desc: 'Lob a full keg at the cursor: huge explosion, knockback and a slippery beer puddle.' },
      primaries: ['shotgun_beer', 'keg_stand', 'cornhole', 'bottle_caps', 'koozie_sats'],
      secondaries: ['beer_goggles', 'puke_trail', 'dad_bod', 'hair_of_dog', 'grill_smoke'],
      pal: { b: '#6a4020', g: '#101018', G: '#6090ff', c: '#c02828', C: '#f0ecd8', p: '#a08a58', P: '#806a40', a: '#c0c8d8', A: '#2050c0' },
      rows: [
        '................',
        '......ssss......',
        '.....sLLsss.....',
        '....ssssssss....',
        '....gggGgggg....',
        '....sggsSggs....',
        '...bbssssssbb...',
        '...bbbbSSbbbb...',
        '....bbbbbbbb....',
        '.sssccccccccsss.',
        'sssscccCCcccssss',
        'ss..ccCccCcc..aA',
        'ss..cccCCccc..aA',
        'ss..cccccccc..s.',
        '.s..pppppppp....',
        '....ppPpppPp....',
        '....pppp.ppp....',
        '....ss....ss....'],
      legsA: ['....ss....ss....', '...kkk....kkk...'],
      legsB: ['.....ss..ss.....', '....kkk..kkk....']
    },
    {
      id: 'ron', name: 'Ron', title: 'Back-Alley Exorcist', color: '#ff7a30',
      desc: 'Slow, piercing occult detective. Tall, rumpled trench coat, loose tie, aviators at midnight, cigarette always lit. Hurls burning occult tomes that plow through crowds.',
      base: { hp: 90, speed: 132, dmg: 14, crit: 5, critMult: 2.0, armor: 0, regen: 0, pickup: 60 },
      main: { name: 'Hellfire Tome', type: 'projectile', shape: 'tome', colors: ['#3a1020', '#ff6020'], speed: 280, pierce: 5, size: 10, count: 1, spread: 0.1, life: 2.2, knock: 40, sfx: 'book', glow: '#ff6020' },
      special: { id: 'sermon', name: 'Rite of Last Call', cd: 30, desc: 'Mutters a filthy back-alley exorcism: every enemy on screen is stunned for 3s and takes heavy hellfire damage.' },
      primaries: ['collection_plate', 'casserole', 'smite', 'bingo_balls', 'brimstone'],
      secondaries: ['tithe', 'holy_water', 'guardian_angel', 'communion_wine', 'choir'],
      pal: { h: '#5a3a20', H: '#7a5230', y: '#c8a040', g: '#1a1410', m: '#2a1a10', z: '#b88a68', c: '#b89060', C: '#8a6a40', t: '#1a1a24', p: '#2a2a32', B: '#3a1020', o: '#ff6020', q: '#f0f0e0', f: '#ff4010' },
      smoke: [12, 8], // cigarette tip pixel (col,row) for smoke wisps
      rows: [
        '....h.hh.h......',
        '...hhhHhhhh.h...',
        '..hhhHhhhhhhh...',
        '...hhsssssshh...',
        '...hsssssssh....',
        '...yyyysyyyy....',
        '...sgggsgggs....',
        '....ssssSss.....',
        '....zsmmszqqf...',
        '....zzzzzz......',
        '.....szzs.......',
        '...cccwtwccc....',
        '..ccCcwtwcCcc...',
        '..cCccwtwccCc...',
        '..cCccwwtccCc...',
        '..cCccwwtccCcBB.',
        '.scCccccccCcsBo.',
        '..cCccccccCc.BB.',
        '..cCcccpccCc....',
        '..cCccppppCcc...',
        '.cCcc.pp.pccCc..'],
      legsA: ['.....pp..pp.....', '....kkk..kkk....'],
      legsB: ['......pppp......', '.....kkkkkk.....']
    }
  ];
  DS.CHAR_BY_ID = {};
  DS.CHARACTERS.forEach(c => { c.pal = Object.assign({}, COMMON_PAL, c.pal); DS.CHAR_BY_ID[c.id] = c; });

  DS.TALENTS = [
    { id: 'atk', name: 'Attack Power', per: 5, stat: 'dmgPct', unit: '%' },
    { id: 'aspd', name: 'Attack Speed', per: 5, stat: 'atkSpdPct', unit: '%' },
    { id: 'crit', name: 'Critical Strike', per: 5, stat: 'crit', unit: '%' },
    { id: 'move', name: 'Movement Speed', per: 5, stat: 'movePct', unit: '%' },
    { id: 'hp', name: 'Total Health', per: 5, stat: 'hpPct', unit: '%' },
    { id: 'cdr', name: 'Special Recharge Rate', per: 5, stat: 'cdrPct', unit: '%' },
    { id: 'pickup', name: 'Pickup Radius', per: 10, stat: 'pickupPct', unit: '%' }
  ];
  DS.TALENT_MAX = 10;
  // Character (meta) XP curve: XP to go from level L to L+1
  DS.charXpNeed = (L) => Math.floor(100 * Math.pow(1.15, L));
  // In-run XP curve: XP to go from level L to L+1 (L = 0..49)
  DS.runXpNeed = (L) => Math.floor(6 + 4 * L + 0.014 * L * L * L);
  DS.RUN_MAX_LEVEL = 50;
})(window.DS);

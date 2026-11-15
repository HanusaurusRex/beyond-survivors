# BEYOND SURVIVORS — *The House Always Wins*

A Vampire Survivors–style incremental roguelike starring Brandon, Ryan, Tyler, Kirby and Ron.
Plain HTML5 Canvas + vanilla JS. No build step, no CDN, and no asset files. All sprites are procedural pixel art, and the music and SFX are generated with WebAudio.

## Play
- **Online:** [https://hanusaurusrex.github.io/beyond-survivors/](https://hanusaurusrex.github.io/beyond-survivors/) — the `site/` PWA, deployed by GitHub Actions. On a phone, use Add to Home Screen (Safari) or Install app (Chrome).
- **Send to friends:** `dist/game.html` is a single self-contained file. Double-click it to play in any modern browser.
- **Dev:** open `index.html` (it loads the separate source files).
- Progress (gold, character levels, talents, gear, unlocked maps, options) is saved in the browser's `localStorage` under `beyondSurvivors.save.v1`. It is saved per browser and per machine. Old *Degen Survivors* saves are migrated automatically on first load.

## Controls
| Action | Default |
|---|---|
| Move | W A S D (arrow keys always work too) |
| Auto attack | Fully automatic: it targets a **Boss** in range first, then an **Elite** in range, then the **nearest** enemy. No aiming needed. |
| Special ability | Space or Right-click. The special aims at the **mouse**. |
| Pause | Esc (or P) |
| Level-up pick | Click, or press 1–4 (tap on touch) |
| Debug mode | F9, or add `?debug` to the URL |

Keys can be rebound in **Options**. Options also has brightness, music volume, SFX volume, damage numbers, screen shake and Wipe Save.

**Debug mode:** in a run, press G for +1000 gold, T to skip 60s, L to level up, K to kill all, B to spawn a boss, and I to toggle god mode. The menus show a debug bar with +10k gold, Unlock maps, +5 char levels, Give all sets and Legendaries. With debug on, every map can be selected.

## Phones & tablets (Android / iPhone)
- **Install as an app:** host the `site/` folder on any static HTTPS host (GitHub Pages, Netlify, Cloudflare Pages, or `npx serve site` on your LAN). Open it in Chrome (Android: menu → *Install app*) or Safari (iPhone: Share → *Add to Home Screen*). It runs fullscreen and works **offline** after the first load (service worker).
- `site/` = `index.html` (whole game inlined) + `manifest.json` + `sw.js` + `icons/` (192, 512, 180 apple-touch, 32 favicon). Rebuild with `node tools/build.js`; regenerate icons with `node tools/icons.js`.
- `dist/game.html` also works on a phone if opened directly. It has no install or offline support.
- **Touch controls:** drag anywhere on the left half of the screen to move. A floating joystick appears under your thumb (in portrait you can drag anywhere). The big **Special** button (bottom-right) auto-aims at a Boss, then an Elite, then the nearest enemy, and otherwise fires where you are walking. Tapping the far half of the screen also fires the special. **❚❚** (top-right) pauses. The game pauses itself when you switch apps.
- **Menus:** tap everything. Lists scroll. In Gear, tap a bag item to equip it, tap ✕ to unequip, and tap a slot or **?** to see stats.
- **Options (touch):** joystick size, controls opacity, left-handed swap (joystick right, special left) and **Low Effects** (on by default on phones: fewer particles, no glow or vignette, lower canvas resolution). Keyboard rebinding is hidden on touch devices.
- **Landscape is recommended.** Portrait also works: the HUD stacks into the right column, the world zooms out so you still see about 600 units across, and menus switch to one column.
- Verified with `node tools/test_mobile.js` (Playwright emulating iPhone 14 and Pixel 7 in portrait and landscape, a 390×844 standalone iPhone, and an iPad).

## Rules summary
- Base attack speed is 1/sec for everyone. In-run level runs 0→50, and each level gives +5% max HP and +5% damage. Past 50, each level gives +5 gold. In-run XP to the next level is `6 + 4L + 0.014L³`, and all in-run XP drops are 25% smaller than in v1 (so leveling is slower).
- Tier goes up by 1 every 2 minutes, and monster HP and damage go up 25% per tier. An elite spawns every 30s with 10× HP and 10× damage and drops a 20× XP globe.
- A boss spawns every 2 minutes from a pool of 5. Boss HP is about 30s × the estimated DPS for that minute. Every boss has 2 phases (it becomes **ENRAGED** at 50% HP), telegraphs its big attacks, and has its own SFX:
  - **Bull Market Minotaur:** wind-up roar, then a red warning lane, then a charge. Each charge leaves **stalagmite spike walls for 10s**. They block movement and hurt on contact. Enraged, it chains 2 charges back-to-back and adds a STAMPEDE spike ring with one gap.
  - **One-Armed Bandit Golem:** coin rings. Enraged, it pulls its own lever (slot reels appear) for a coin-rain jackpot plus coin spirals.
  - **The Repo Lich:** telegraphed skeleton summons and bolt volleys. Enraged, it adds bone-spike rings and blinks away when you get close.
  - **Gas Station Hot Dog Wyrm:** fire-puddle rain. Enraged, it adds a telegraphed fire-breath cone.
  - **The Pit Boss:** telegraphed teleports and card spreads. Enraged, it deals double card rings.
- **Jackpot boss** every 5 minutes: killing it gives +1 whole level and a **pick-2** level-up.
- **Super bosses** at 10:00 (THE HOUSE, Always Wins) and 20:00 (The Tax Collector of Hades). They have 15× HP, 2.5× damage and 3 phases (at 66% and 33% HP). The House adds lever jackpots, then roulette streams. The Tax Collector charges and leaves red-tape spike walls, then adds audits (summons + fire), then a closing TAX BRACKET of bone rings.
- Level-up offers are 2 primary + 1 secondary. You have **4 primary slots** and 5 secondary slots. An Evolution appears only when the primary is Lv4 **and** its paired secondary is owned. Once everything is maxed or evolved, the offer becomes +2 gold or heal 25%.
- **Super Evolutions:** once you own both evolved abilities in a pair, the next level-up offers a Super Evolution. It merges the two into one slot. Both run at +75% power, and you also get a unique flourish. Merging **frees a primary slot**, so new primaries get offered again. You get a screen flash, light rays and a SLOT FREED! popup when it happens.

  | Character | Super Evolution | Merges | Flourish |
  |---|---|---|---|
  | Brandon | Chili Cheese Armageddon | Coney Carnage + Tailgate Apocalypse | Mushroom Cloud Fart nova |
  | Brandon | Hail Mary Cannonball Parlay | 12-Leg Parlay That Actually Hit + Cannonball Belly Flop | Payout Rain jackpot coins |
  | Ryan | Mr. Olympia Spin Cycle | Never Skip Leg Day + Swole Solar System | Flex Shockwave (stun) |
  | Ryan | Full Head of Toxic Hairicane | Miracle Hairline + Toxic Bro-nado | Rogaine Shrapnel with gas trails |
  | Tyler | Mega Millions Whale Hunt | Powerball Jackpot + Whale Status High Roller | Jackpot Lightning chain |
  | Tyler | Gas Station Death Combo #3 | Food Poisoning Pandemic + Cardiac Overdrive | Heart Attack Aura |
  | Kirby | Open Bar Apocalypse | Beer Bong Fire Hose + 30-Rack Ricochet | Keg Barrage lobs |
  | Kirby | Tectonic Brisket Belly | Belly Bump Earthquake + Smoked Brisket Cyclone | Meteor Briskets |
  | Ron | Last Rites at Last Call | Wrath of the Aviators + Exorcism That Never Ends | Hellmouth Burst |
  | Ron | Soul Debt Bingo Collection | Demonic Debt Collection + Blackout Bingo | Burning Pages |
- **Ron** is now a rumpled back-alley occult detective (the *Back-Alley Exorcist*). He's taller and wears a tan trench coat, loose dark tie, aviators and a small mustache, with a cigarette that trails smoke. He throws glowing **Hellfire Tomes**, and his special *Rite of Last Call* draws a burning sigil.
- Character (meta) XP = (seconds survived + 0.2/kill + 25/elite + 100/boss + 500/super) × map reward multiplier. It takes `100 × 1.15^L` XP per level, and each level gives 1 talent point.
- Talents (max 10 points each): Attack +5%, Attack Speed +5%, Crit +5%, Move +5%, Health +5%, Special Recharge +5%, Pickup Radius +10%. Respec costs 50g.
- Maps: you unlock the next one by surviving 10:00 on the previous map. Monster multipliers are ×1/×2/×4/×8/×16 and reward multipliers are ×1/×1.5/×2/×3/×4.
- Marketplace: 5 random items per day (seeded from the local date), plus a Talent Point Scroll for 100g that is always in stock. A reroll costs 200g. Item prices by rarity: Common ~100, Uncommon ~250, Rare ~600, Epic ~1500, Legendary ~3500, Set 4500. Selling returns 25%.
- Gear slots are Helmet, Necklace, Chest, Pants, Bracers, Gloves, Boots, 2 Rings and a Trinket. Each character has their own inventory and a 6-piece set with 2/4/6-piece bonuses (Beach Brandon, Swole Patrol, Gas Station Gambler, Tailgate King, Back-Alley Exorcist).
- **Equipping gear:** go to Character Upgrade, then the **Gear & Inventory** tab (it opens by default). It shows a paper doll with all 10 slots around your character and your bag of owned items.
  - **Equip:** click an item in the bag, or use its *Equip → slot* button. Rings go into an empty ring slot first.
  - **Unequip:** click an equipped slot or its ✕.
  - **Stats:** hover an item (or tap **?**) to see its stats and a ▲/▼ comparison against what's equipped.
  - **Buying:** in the Marketplace, *Buy* asks which character gets the item (set items can only go to their owner). Then you get **"Bought! Equip now?"** with *Equip Now*, *Open Gear* and *Keep Shopping*.

## Source layout
```
index.html            dev entry (loads js/* in order)
css/style.css         UI styling
js/util.js            namespace (window.DS), math, seeded RNG
js/data/characters.js 5 characters: stats, main weapon, special, sprite pixel rows, talents, XP curves
js/data/abilities.js  all 75 abilities (25 primary, 25 secondary, 25 evolutions) + 10 Super Evolutions as data
js/data/items.js      stats, random item generator, character sets, daily market
js/data/world.js      maps, monsters, bosses, tier/boss HP formulas
js/save.js            localStorage save/load, meta stats (talents + gear + sets)
js/audio.js           chiptune sequencer (harmonic-minor "medieval synthwave") + SFX
js/sprites.js         procedural pixel sprites, bosses, projectile/icon shapes, tiles, props
js/engine.js          run simulation: spawning, generic ability engine, bosses, damage, XP, rewards
js/render.js          world/HUD rendering + animated castle menu backdrop
js/ui.js              DOM screens: menu, char select, upgrade/gear, market, options, pause, level-up, results
js/main.js            boot, input, game loop, scaling, debug hotkeys
tools/build.js        inlines everything into dist/game.html  (node tools/build.js)
tools/test.js         Playwright smoke test + screenshots     (node tools/test.js)
tools/sim.js          headless balance sim with a kiting bot  (node tools/sim.js [chars] [map] [seconds])
```
The ability engine is generic. Each ability is just data with a `type` (projectile, lob, orbit, aura, nova, strike, chain or melee for primaries; trail, shield, regen, stat, thorns, magnet or aura for secondaries). It has base params `p` and three upgrade steps in `ups`. Numbers in `ups` add; strings like `'*1.5'` multiply. Evolutions are listed with `evo: { with, into }`. Super Evolutions (`DS.SUPERS`) list their two `parts`, a power `mult` and an inline `flourish` ability. Trail secondaries take a `style` (goo, gas, sticky, puke or holy). The renderer uses it to draw connected smears with drips, bubbles and flames.

After editing source, run `node tools/build.js` to regenerate `dist/game.html`.

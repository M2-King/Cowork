# Epoch

A study app for the maths and machine learning stack: **linear algebra → calculus → linear regression → machine learning → neural networks → deep learning**.

This repository currently holds the **web UI design**: a working, no-build prototype in [`web/`](web/).

## Run it

Open `web/index.html` in a browser, or serve the folder:

```sh
cd web
python3 -m http.server 8000
# then visit http://localhost:8000
```

There's no build step and nothing to install. KaTeX (for formulas) and the fonts (Unbounded, Chakra Petch, Inter) load from public CDNs.

## What's inside

The UI is designed as a **AAA game front end**: studying is a campaign.

| Screen | What it is |
|---|---|
| **Hub** | Cinematic main menu: the active mission in giant type with *Continue mission*, your rank card (emblem, level, XP), daily ops with XP rewards, drills ready, a codex entry, chapter select and simulators |
| **Campaign** | World route through six realms, from *Chapter I · The Lattice* (Linear Algebra) to *Chapter VI · The Deep* (Deep Learning), plus chapter-select posters with difficulty pips |
| **Realm** | Chapter key art, stats, a *Deploy* button, and Acts of missions with XP rewards and boss missions |
| **Mission** | Briefing, objectives that tick off as you read, an embedded simulator, a **boss encounter** (answer correctly to drain its HP), and a *Mission complete* results screen with an XP bar |
| **Simulators** | Six live labs: Matrix Transform, Tangent and Secant, Least Squares, Optimizer Race, Neural Playground, Convolution |
| **Drills** | Spaced-repetition flashcards styled as collectible cards with rarity, a combo counter, a score, and a grade (S/A/B/C) at the end |
| **Profile** | Operator banner, rank and XP, realm-mastery radar, training volume, service record (heatmap) and trophies by rarity |

Also included: a title card on first load, ⌘K / `/` search, **Q / E** to switch tabs like shoulder buttons, Enter to continue the mission from the hub, and synthesized interface sounds that can be toggled in the HUD.

## Design language

- **A live 3-D world.** The background is a ray-marched loss landscape (WebGL), where height is the loss. Contour lines glow along equal-loss heights, fog rolls in with distance, and an objective beacon with a light shaft hovers over the deepest valley. The camera drifts and follows the pointer, and each realm tints the world in its colour. Quality adapts automatically on slower GPUs.
- **HUD materials.** Content sits on glass panels with targeting brackets, set in display type (Unbounded) with HUD labels (Chakra Petch) and Inter for body text. Film grain and a vignette finish the image.
- **Continuous corners.** Panels, cards and buttons use iOS-style squircle corners: native CSS `corner-shape` where supported, and an exact smooth-corner `clip-path` elsewhere (add `?sq=js` to the URL to force the fallback).
- **Spring physics** drives motion. Springs compile to CSS `linear()` easings, and liquid indicators follow the active tab.
- **Screen transitions** use the View Transitions API: drilling in pushes forward, going back pulls out, and a chosen chapter or simulator card morphs into the next screen.
- **Game feedback:** XP rewards, a boss HP bar with damage numbers and a *Defeated* stamp, combo pop-ups, and level-progress results screens.
- **Sound:** short UI sounds generated with Web Audio (no audio files). They start only after your first interaction.
- `prefers-reduced-motion` is respected: the world renders a single still frame and animations stop.

## Structure

```
web/
  index.html              shell, icon sprite, script order
  styles/
    tokens.css            colour, type, radius, motion tokens (single dark game look)
    base.css              reset, continuous corners, HUD panels, world layers, shell
    components.css        game buttons, HUD bar, chips, bars, palette, rewards, splash…
    screens.css           per-screen layout (container queries)
    labs.css              lab stage + control panel
    motion.css            view-transition choreography
  scripts/
    core.js               springs, squircle engine, theme, liquid indicator, helpers
    world.js              ray-marched 3-D loss-landscape world (WebGL)
    sfx.js                synthesized interface sounds
    glyphs.js             animated subject illustrations
    data.js               curriculum, flashcards, sample progress
    screens.js            Hub, Campaign, Realm, Mission, Simulators, Drills, Profile
    app.js                title card, HUD, router, search, operator sheet
    labs/*.js             the six interactive labs
```

Progress figures are **sample data** for the design preview. Curriculum content lives in `scripts/data.js`, so adding a lesson there adds it everywhere: lists, search, the path and lesson pages.

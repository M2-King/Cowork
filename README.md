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

There's no build step and nothing to install. KaTeX (for formulas) and Inter (fallback font when SF Pro isn't available) load from public CDNs.

## What's inside

| Screen | What it shows |
|---|---|
| **Today** | Continue card with a live forward/backward-pass network, Activity-style goal rings, the course path, cards due, concept of the day, and this week's minutes |
| **Subjects** | Six courses in prerequisite order, each with its own animated glyph |
| **Subject** | Hero with course stats, then units and lessons with status (done, in progress, up next, locked) |
| **Lesson** | Reading layout with math, an embedded lab, a learning-rate comparison, a quiz, a sticky table of contents and reading progress. *Gradient descent* is the fully written sample lesson. |
| **Labs** | Six interactive instruments: Matrix Transform, Tangent and Secant, Least Squares, Optimizer Race (SGD vs Momentum vs Adam), Neural Playground (an MLP trained in the browser), and Convolution |
| **Review** | Spaced-repetition flashcards: 3D flip, swipe to rate, keys 1–4 |
| **Progress** | Streak and totals, activity heatmap, course completion, minutes per week, milestones |

Other pieces: a ⌘K / `/` command palette, an account sheet, and light, dark and automatic appearance.

## Design language

- **Continuous corners.** Every card, panel and icon uses iOS-style squircle corners, not circular ones. Browsers that support CSS `corner-shape` draw them natively. Other browsers get an exact smooth-corner path (the Figma/iOS algorithm with 60% smoothing) applied as a `clip-path`, plus a hairline edge that follows the curve. Add `?sq=js` to the URL to force the script path for comparison.
- **Spring physics.** Motion is driven by damped springs. They're simulated once at startup and turned into CSS `linear()` easing curves, so plain CSS transitions bounce like UIKit springs. JS-driven motion (indicators, tilt) uses the same spring solver.
- **Liquid indicators.** The selected-tab highlight in the sidebar, tab bar, segmented controls and table of contents springs between items and stretches along its direction of travel.
- **Living loss landscape.** The background is a slowly drifting loss surface drawn as contour lines in WebGL. A few "optimizer" particles run momentum gradient descent across it, and your pointer presses a small well into the surface.
- **Screen transitions.** These use the View Transitions API: drilling in pushes from the right, going back pops from the left, and tab switches blur-dissolve. A tapped subject or lab card morphs into the next screen's hero. Changing the appearance reveals the new theme as a circle spreading from the control you pressed.
- **Materials.** Glass (blur plus saturation, with a specular rim) is used for floating chrome only. Content sits on opaque surfaces. All colors are tokens in `styles/tokens.css`, with a separate dark palette.
- `prefers-reduced-motion` is respected throughout: animations stop and the background is drawn once.

## Structure

```
web/
  index.html              shell, icon sprite, script order
  styles/
    tokens.css            color, type, radius, motion tokens (light + dark)
    base.css              reset, continuous corners, glass, layout shell
    components.css        buttons, cards, segmented control, sliders, palette, sheet…
    screens.css           per-screen layout (container queries)
    labs.css              lab stage + control panel
    motion.css            view-transition choreography
  scripts/
    core.js               springs, squircle engine, theme, liquid indicator, helpers
    ambient.js            WebGL loss-landscape background
    glyphs.js             animated subject illustrations
    data.js               curriculum, flashcards, sample progress
    screens.js            Today, Subjects, Subject, Lesson, Labs, Review, Progress
    app.js                router, chrome, command palette, account sheet
    labs/*.js             the six interactive labs
```

Progress figures are **sample data** for the design preview. Curriculum content lives in `scripts/data.js`, so adding a lesson there adds it everywhere: lists, search, the path and lesson pages.

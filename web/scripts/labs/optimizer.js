/* Lab — Optimizer Race (Machine Learning)
   SGD, Momentum and Adam start from the same point on the same surface. */
(function () {
  'use strict';
  const E = window.Epoch, Lb = E.Labs;

  const SURFACES = {
    valley: {
      label: 'Valley', f: (x, y) => 0.08 * x * x + 1.5 * y * y, g: (x, y) => [0.16 * x, 3 * y],
      ext: [-6.2, 6.2, -2.6, 2.6], start: [-5.4, 1.6], lr: { sgd: 0.6, mom: 0.12, adam: 0.12 }, min: 0,
    },
    banana: {
      label: 'Banana', f: (x, y) => (1 - x) ** 2 + 10 * (y - x * x) ** 2, g: (x, y) => [-2 * (1 - x) - 40 * x * (y - x * x), 20 * (y - x * x)],
      ext: [-2.2, 2.2, -1.1, 3.1], start: [-1.6, 2.6], lr: { sgd: 0.008, mom: 0.0025, adam: 0.06 }, min: 0,
    },
    saddle: {
      label: 'Saddle', f: (x, y) => 0.5 * x * x - 0.5 * y * y + 0.08 * y ** 4 + 0.6, g: (x, y) => [x, -y + 0.32 * y ** 3],
      ext: [-3.2, 3.2, -2.6, 2.6], start: [-2.8, 0.03], lr: { sgd: 0.08, mom: 0.025, adam: 0.04 }, min: 0,
    },
    wells: {
      label: 'Two wells',
      f: (x, y) => 1.2 - Math.exp(-((x - 1.1) ** 2 + (y - 0.5) ** 2)) - 0.75 * Math.exp(-((x + 1.3) ** 2 + (y + 0.7) ** 2) / 0.45) + 0.04 * (x * x + y * y),
      g: (x, y) => {
        const a = Math.exp(-((x - 1.1) ** 2 + (y - 0.5) ** 2)), b = 0.75 * Math.exp(-((x + 1.3) ** 2 + (y + 0.7) ** 2) / 0.45);
        return [2 * (x - 1.1) * a + (2 * (x + 1.3) / 0.45) * b + 0.08 * x, 2 * (y - 0.5) * a + (2 * (y + 0.7) / 0.45) * b + 0.08 * y];
      },
      ext: [-3.2, 3.2, -2.5, 2.5], start: [-0.3, 2.2], lr: { sgd: 0.35, mom: 0.06, adam: 0.05 }, min: 0,
    },
  };

  const OPTS = [
    { id: 'sgd', label: 'SGD', color: 'accent' },
    { id: 'mom', label: 'Momentum', color: 'cCalc' },
    { id: 'adam', label: 'Adam', color: 'cDl' },
  ];

  Lb.register('optimizer', (root, { prefix, compact }) => {
    const id = (s) => `${prefix}-${s}`;
    root.innerHTML = `
      <div class="lab-stage sq edge">
        <canvas class="lab-canvas" aria-label="Contour map of a loss surface with three optimizer paths. Click to choose a new starting point."></canvas>
        <div class="lab-hint chip chip-glass">${E.icon('hand')} Click to set the start</div>
      </div>
      <div class="lab-panel">
        ${E.segHTML('Loss surface', Object.entries(SURFACES).map(([k, s]) => ({ value: k, label: s.label })), 'valley', 'full sm')}
        <div class="opt-legend" role="group" aria-label="Optimizers">
          ${OPTS.map((o) => `<label class="opt-row" for="${id('on-' + o.id)}"><input type="checkbox" id="${id('on-' + o.id)}" checked><i class="sw" data-c="${o.color}"></i><span class="opt-name">${o.label}</span><span class="num opt-loss" id="${id('loss-' + o.id)}">–</span></label>`).join('')}
        </div>
        ${Lb.slider(id('lr'), 'Step size', { min: -2, max: 2, step: 0.05, value: 0, fmt: (v) => `${(2 ** v).toFixed(2)}×` })}
        <div class="btn-row">${Lb.playBtn(id('play'))}<button type="button" class="btn btn-gray btn-sm" id="${id('reset')}">${E.icon('reset')}<span>Reset</span></button><span class="t-foot num" id="${id('steps')}">step 0</span></div>
        <div class="mini-chart"><canvas id="${id('chart')}" aria-label="Loss by step, log scale"></canvas></div>
        ${compact ? '' : `<p class="t-foot lab-note">Plain SGD zig-zags across narrow valleys. Momentum builds speed along the valley floor, and Adam rescales each direction so both axes move at a similar pace.</p>`}
      </div>`;

    const canvas = root.querySelector('canvas.lab-canvas');
    const fc = E.fitCanvas(canvas, () => { bg = null; draw(); });
    let C = Lb.colors('machine-learning'), T = E.Theme.colors();
    const colorOf = (o) => T[o.color];
    const paintSwatches = () => root.querySelectorAll('.sw[data-c]').forEach((s) => (s.style.background = T[s.dataset.c]));
    paintSwatches();
    const offTheme = E.Theme.onChange(() => { C = Lb.colors('machine-learning'); T = E.Theme.colors(); paintSwatches(); bg = null; draw(); updateChart(); });

    let key = 'valley', S = SURFACES.valley, start = S.start.slice(), mult = 1;
    let runs = [], steps = 0, playing = false, raf = 0, bg = null;
    const enabled = { sgd: true, mom: true, adam: true };
    const chart = Lb.lossChart(root.querySelector('#' + id('chart')));

    function reset() {
      steps = 0;
      runs = OPTS.map((o) => ({ o, x: start[0], y: start[1], vx: 0, vy: 0, m: [0, 0], v: [0, 0], path: [[start[0], start[1]]], losses: [S.f(start[0], start[1])], dead: false }));
      root.querySelector('#' + id('steps')).textContent = 'step 0';
      updateReadouts(); updateChart(); draw();
    }

    function step() {
      steps++;
      for (const r of runs) {
        if (r.dead) continue;
        const [gx, gy] = S.g(r.x, r.y);
        const lr = S.lr[r.o.id] * mult;
        if (r.o.id === 'sgd') { r.x -= lr * gx; r.y -= lr * gy; }
        else if (r.o.id === 'mom') { r.vx = 0.9 * r.vx + gx; r.vy = 0.9 * r.vy + gy; r.x -= lr * r.vx; r.y -= lr * r.vy; }
        else {
          const b1 = 0.9, b2 = 0.999, eps = 1e-8;
          r.m[0] = b1 * r.m[0] + (1 - b1) * gx; r.m[1] = b1 * r.m[1] + (1 - b1) * gy;
          r.v[0] = b2 * r.v[0] + (1 - b2) * gx * gx; r.v[1] = b2 * r.v[1] + (1 - b2) * gy * gy;
          const mh0 = r.m[0] / (1 - b1 ** steps), mh1 = r.m[1] / (1 - b1 ** steps);
          const vh0 = r.v[0] / (1 - b2 ** steps), vh1 = r.v[1] / (1 - b2 ** steps);
          r.x -= (lr * mh0) / (Math.sqrt(vh0) + eps); r.y -= (lr * mh1) / (Math.sqrt(vh1) + eps);
        }
        const loss = S.f(r.x, r.y);
        if (!isFinite(loss) || Math.abs(r.x) > 1e3 || Math.abs(r.y) > 1e3) { r.dead = true; r.losses.push(Infinity); continue; }
        r.path.push([r.x, r.y]); r.losses.push(loss);
      }
      root.querySelector('#' + id('steps')).textContent = `step ${steps}`;
    }

    function updateReadouts() {
      runs.forEach((r) => {
        const el = root.querySelector('#' + id('loss-' + r.o.id));
        const l = r.losses[r.losses.length - 1];
        el.textContent = r.dead ? 'diverged' : l < 1e-4 ? l.toExponential(1) : l.toFixed(4);
      });
    }
    function updateChart() {
      chart.set(runs.filter((r) => enabled[r.o.id]).map((r) => ({ values: r.losses.map((v) => Math.max(v, 1e-6)), color: colorOf(r.o) })));
    }

    function buildBg() {
      const { w, h } = fc;
      const v = Lb.view(w, h, S.ext[0], S.ext[1], S.ext[2], S.ext[3], 12);
      const off = document.createElement('canvas');
      const dpr = fc.dpr; off.width = Math.round(w * dpr); off.height = Math.round(h * dpr);
      const ctx = off.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // soft shading by log-loss
      const res = 6, cols = Math.ceil(w / res) + 1, rows = Math.ceil(h / res) + 1;
      let lo = Infinity, hi = -Infinity; const vals = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const z = Math.log(1 + S.f(v.ix(i * res), v.iy(j * res)) - S.min); vals.push(z); lo = Math.min(lo, z); hi = Math.max(hi, z); }
      const small = document.createElement('canvas'); small.width = cols; small.height = rows;
      const sctx = small.getContext('2d'); const img = sctx.createImageData(cols, rows);
      const base = E.alpha(C.col, 1).match(/[\d.]+/g).map(Number);
      vals.forEach((z, k) => {
        const t = 1 - (z - lo) / (hi - lo || 1);
        img.data[k * 4] = base[0]; img.data[k * 4 + 1] = base[1]; img.data[k * 4 + 2] = base[2];
        img.data[k * 4 + 3] = Math.round(255 * (0.02 + 0.2 * t * t));
      });
      sctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(small, 0, 0, cols * res, rows * res);
      // contour lines on log levels
      const levels = []; for (let k = 1; k <= 16; k++) levels.push(Math.exp(lo + ((hi - lo) * k) / 17) - 1 + S.min);
      Lb.contours(ctx, S.f, v, w, h, levels, (c, li) => { c.strokeStyle = E.alpha(C.col, li % 4 === 0 ? 0.42 : 0.22); c.lineWidth = li % 4 === 0 ? 1.3 : 1; }, 5);
      return { off, v };
    }

    function draw() {
      if (!fc.w) return;
      const { ctx, w, h } = fc;
      if (!bg) bg = buildBg();
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bg.off, 0, 0, w, h);
      const v = bg.v; fc.v = v;
      // minimum marker for convex valley/banana
      const mins = key === 'banana' ? [[1, 1]] : key === 'valley' ? [[0, 0]] : [];
      mins.forEach(([x, y]) => { ctx.strokeStyle = C.fg2; ctx.lineWidth = 1.6; const X = v.X(x), Y = v.Y(y); ctx.beginPath(); ctx.moveTo(X - 6, Y - 6); ctx.lineTo(X + 6, Y + 6); ctx.moveTo(X + 6, Y - 6); ctx.lineTo(X - 6, Y + 6); ctx.stroke(); });
      // paths
      runs.forEach((r) => {
        if (!enabled[r.o.id]) return;
        const col = colorOf(r.o);
        ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); r.path.forEach(([x, y], i) => (i ? ctx.lineTo(v.X(x), v.Y(y)) : ctx.moveTo(v.X(x), v.Y(y)))); ctx.stroke();
        const [hx, hy] = r.path[r.path.length - 1];
        ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(v.X(hx), v.Y(hy), 7, 0, 7); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(v.X(hx), v.Y(hy), 5, 0, 7); ctx.fill();
      });
      // start
      ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(v.X(start[0]), v.Y(start[1]), 7, 0, 7); ctx.fill();
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(v.X(start[0]), v.Y(start[1]), 5, 0, 7); ctx.stroke();
    }

    let last = 0, acc = 0;
    function loop(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; acc += dt;
      let n = 0;
      while (acc > 1 / 45 && n < 4) { acc -= 1 / 45; step(); n++; }
      if (n) { updateReadouts(); updateChart(); draw(); }
      if (steps >= 600 || runs.every((r) => r.dead)) { pause(); return; }
      if (playing) raf = requestAnimationFrame(loop);
    }
    const playBtn = root.querySelector('#' + id('play'));
    function play() { if (playing) return; if (steps >= 600) reset(); playing = true; Lb.setPlay(playBtn, true); last = 0; raf = requestAnimationFrame(loop); }
    function pause() { playing = false; Lb.setPlay(playBtn, false); cancelAnimationFrame(raf); }
    playBtn.addEventListener('click', () => (playing ? pause() : play()));
    root.querySelector('#' + id('reset')).addEventListener('click', () => { pause(); reset(); });

    E.segmented(root.querySelector('.seg'), (k) => { key = k; S = SURFACES[k]; start = S.start.slice(); bg = null; const was = playing; pause(); reset(); if (was) play(); });
    Lb.bindSlider(root, id('lr'), (v) => `${(2 ** v).toFixed(2)}×`, (v) => { mult = 2 ** v; });
    OPTS.forEach((o) => root.querySelector('#' + id('on-' + o.id)).addEventListener('change', (e) => { enabled[o.id] = e.target.checked; updateChart(); draw(); }));

    canvas.addEventListener('pointerdown', (e) => {
      if (!fc.v) return;
      const r = canvas.getBoundingClientRect();
      start = [fc.v.ix(e.clientX - r.left), fc.v.iy(e.clientY - r.top)];
      root.querySelector('.lab-hint').classList.add('is-gone');
      pause(); reset(); play();
    });

    reset();
    // pre-run a few dozen steps so the first frame tells the story
    for (let i = 0; i < 70; i++) step();
    updateReadouts(); updateChart(); draw();

    return () => { pause(); fc.destroy(); chart.destroy(); offTheme(); };
  });
})();

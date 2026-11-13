/* Lab — Convolution (Deep Learning) */
(function () {
  'use strict';
  const E = window.Epoch, Lb = E.Labs;

  const IMAGE = [
    '............',
    '.#######....',
    '.#..........',
    '.#.......##.',
    '.#####..#..#',
    '.#......#..#',
    '.#.......##.',
    '.#######....',
    '............',
    '...#.#.#.#..',
    '..#.#.#.#...',
    '............',
  ].map((r) => r.split('').map((c) => (c === '#' ? 1 : 0)));
  const N = 12, K = 3, M = N - K + 1;

  const KERNELS = {
    vertical: { label: 'Vertical edges', k: [[1, 0, -1], [2, 0, -2], [1, 0, -1]] },
    horizontal: { label: 'Horizontal edges', k: [[1, 2, 1], [0, 0, 0], [-1, -2, -1]] },
    blur: { label: 'Blur', k: [[1, 2, 1], [2, 4, 2], [1, 2, 1]].map((r) => r.map((v) => v / 16)) },
    sharpen: { label: 'Sharpen', k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]] },
    outline: { label: 'Outline', k: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]] },
  };

  const fmtW = (v) => (Number.isInteger(v) ? String(v).replace('-', '−') : (v * 16).toFixed(0) + '⁄16');

  Lb.register('convolution', (root, { prefix, compact }) => {
    const id = (s) => `${prefix}-${s}`;
    root.innerHTML = `
      <div class="lab-stage sq edge">
        <canvas class="lab-canvas" aria-label="A 12 by 12 input image, a sliding 3 by 3 kernel, and the 10 by 10 output feature map."></canvas>
      </div>
      <div class="lab-panel">
        <div class="chip-row" role="group" aria-label="Kernel">
          ${Object.entries(KERNELS).map(([k, v]) => `<button type="button" class="chip chip-btn" data-kernel="${k}" aria-pressed="${k === 'vertical'}">${v.label}</button>`).join('')}
        </div>
        <div class="conv-calc" aria-live="off">
          <div class="mini-grid" id="${id('patch')}"></div>
          <span class="op">×</span>
          <div class="mini-grid is-kernel" id="${id('kernel')}"></div>
          <span class="op">=</span>
          <div class="conv-sum num" id="${id('sum')}">0</div>
        </div>
        <p class="t-foot">Each output pixel is the sum of the 3×3 window multiplied element by element with the kernel. The output is 10×10 because a 3×3 window fits 10 times across 12 pixels.</p>
        ${Lb.slider(id('speed'), 'Speed', { min: 1, max: 30, step: 1, value: 8, fmt: (v) => `${v} px/s` })}
        <div class="btn-row">
          ${Lb.playBtn(id('play'))}
          <button type="button" class="btn btn-gray btn-sm" id="${id('step')}">${E.icon('step')}<span>Step</span></button>
          <button type="button" class="btn btn-gray btn-sm" id="${id('all')}">${E.icon('bolt')}<span>Fill all</span></button>
        </div>
        <div class="legend-row t-foot"><span><i class="sw" style="background:var(--c-dl)"></i>Positive response</span><span><i class="sw" style="background:var(--accent)"></i>Negative response</span></div>
      </div>`;

    const canvas = root.querySelector('canvas');
    const fc = E.fitCanvas(canvas, () => draw());
    let T = E.Theme.colors();
    const offTheme = E.Theme.onChange(() => { T = E.Theme.colors(); draw(); });

    let kern = KERNELS.vertical.k, out = [], maxAbs = 1, idx = 0, playing = false, raf = 0, speed = 8;
    const glide = { x: new E.Spring(0, E.SPRINGS.snappy, () => draw()), y: new E.Spring(0, E.SPRINGS.snappy, () => draw()) };

    function compute() {
      out = []; maxAbs = 1e-9;
      for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
        let s = 0;
        for (let b = 0; b < K; b++) for (let a = 0; a < K; a++) s += IMAGE[j + b][i + a] * kern[b][a];
        out.push(s); maxAbs = Math.max(maxAbs, Math.abs(s));
      }
    }
    function setKernel(key) {
      kern = KERNELS[key].k; compute();
      root.querySelectorAll('[data-kernel]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kernel === key)));
      root.querySelector('#' + id('kernel')).innerHTML = kern.flat().map((v) => `<span data-sign="${v > 0 ? 'p' : v < 0 ? 'n' : 'z'}">${fmtW(v)}</span>`).join('');
      calc(); draw();
    }
    function calc() {
      const k = Math.min(idx, M * M - 1), i = k % M, j = Math.floor(k / M);
      const cells = [];
      for (let b = 0; b < K; b++) for (let a = 0; a < K; a++) cells.push(IMAGE[j + b][i + a]);
      root.querySelector('#' + id('patch')).innerHTML = cells.map((v) => `<span data-on="${v}">${v}</span>`).join('');
      const s = out[k];
      root.querySelector('#' + id('sum')).textContent = (Math.abs(s) < 1e-9 ? 0 : +s.toFixed(2)).toString().replace('-', '−');
    }
    function advance(to) {
      idx = Math.min(M * M, to);
      const k = Math.min(idx, M * M - 1);
      glide.x.to(k % M); glide.y.to(Math.floor(k / M));
      calc(); draw();
      if (idx >= M * M) pause();
    }

    function layout(w, h) {
      const vertical = h > w * 0.9;
      const span = vertical ? [N, N + 1.6 + M] : [N + 2.4 + M, N];
      const cell = Math.floor(Math.min((w - 28) / span[0], (h - 28) / span[1]));
      const tw = span[0] * cell, th = span[1] * cell;
      const ox = (w - tw) / 2, oy = (h - th) / 2;
      const inp = { x: ox, y: oy };
      const outp = vertical ? { x: ox + ((N - M) * cell) / 2, y: oy + (N + 1.6) * cell } : { x: ox + (N + 2.4) * cell, y: oy + ((N - M) * cell) / 2 };
      return { cell, inp, outp, vertical };
    }

    function draw() {
      if (!fc.w) return;
      const { ctx, w, h } = fc;
      ctx.clearRect(0, 0, w, h);
      const { cell, inp, outp } = layout(w, h);
      const gap = Math.max(1, Math.round(cell * 0.08)), rr = Math.max(1.5, cell * 0.18);
      const rrect = (x, y, s, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, s, s, r); else ctx.rect(x, y, s, s); };
      // input
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const v = IMAGE[j][i];
        ctx.fillStyle = v ? E.alpha(T.fg, 0.86) : E.alpha(T.fg, 0.06);
        rrect(inp.x + i * cell + gap / 2, inp.y + j * cell + gap / 2, cell - gap, rr); ctx.fill();
      }
      // output
      const neg = E.alpha(T.accent, 1), pos = E.alpha(T.cDl, 1);
      for (let k = 0; k < M * M; k++) {
        const i = k % M, j = Math.floor(k / M);
        const x = outp.x + i * cell + gap / 2, y = outp.y + j * cell + gap / 2;
        if (k < idx) {
          const s = out[k] / maxAbs;
          ctx.fillStyle = E.alpha(s >= 0 ? pos : neg, 0.08 + Math.abs(s) * 0.92);
        } else ctx.fillStyle = E.alpha(T.fg, 0.04);
        rrect(x, y, cell - gap, rr); ctx.fill();
      }
      // kernel window + link
      const gx = glide.x.x, gy = glide.y.x;
      const kx = inp.x + gx * cell, ky = inp.y + gy * cell, ks = K * cell;
      const sub = E.Theme.colors().cDl;
      ctx.fillStyle = E.alpha(sub, 0.14); ctx.strokeStyle = sub; ctx.lineWidth = 2.5;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(kx - 1, ky - 1, ks + 2, ks + 2, rr + 2); else ctx.rect(kx - 1, ky - 1, ks + 2, ks + 2); ctx.fill(); ctx.stroke();
      if (cell >= 20) {
        ctx.font = `600 ${Math.round(cell * 0.32)}px ` + getComputedStyle(document.body).fontFamily;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let b = 0; b < K; b++) for (let a = 0; a < K; a++) {
          const v = IMAGE[Math.round(gy) + b] && IMAGE[Math.round(gy) + b][Math.round(gx) + a];
          ctx.fillStyle = v ? T.surface : T.fg2;
          ctx.fillText(fmtW(kern[b][a]), kx + a * cell + cell / 2, ky + b * cell + cell / 2);
        }
      }
      const ox = outp.x + gx * cell, oy = outp.y + gy * cell;
      ctx.strokeStyle = E.alpha(sub, 0.35); ctx.lineWidth = 1;
      [[kx, ky, ox, oy], [kx + ks, ky, ox + cell, oy], [kx, ky + ks, ox, oy + cell], [kx + ks, ky + ks, ox + cell, oy + cell]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
      ctx.strokeStyle = T.fg; ctx.lineWidth = 2;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(ox, oy, cell, cell, rr + 1); else ctx.rect(ox, oy, cell, cell); ctx.stroke();
      // labels
      ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily; ctx.fillStyle = T.fg2; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('Input 12×12', inp.x, inp.y - 4);
      ctx.fillText('Feature map 10×10', outp.x, outp.y - 4);
    }

    let last = 0, acc = 0;
    function loop(now) {
      const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now; acc += dt;
      if (acc > 1 / speed) { acc = 0; advance(idx + 1); }
      if (playing) raf = requestAnimationFrame(loop);
    }
    const playBtn = root.querySelector('#' + id('play'));
    function play() { if (playing) return; if (idx >= M * M) { idx = 0; glide.x.set(0); glide.y.set(0); } playing = true; Lb.setPlay(playBtn, true); last = 0; raf = requestAnimationFrame(loop); }
    function pause() { playing = false; Lb.setPlay(playBtn, false); cancelAnimationFrame(raf); }
    playBtn.addEventListener('click', () => (playing ? pause() : play()));
    root.querySelector('#' + id('step')).addEventListener('click', () => { pause(); advance(idx >= M * M ? 1 : idx + 1); });
    root.querySelector('#' + id('all')).addEventListener('click', () => { pause(); advance(M * M); });
    root.querySelectorAll('[data-kernel]').forEach((b) => b.addEventListener('click', () => setKernel(b.dataset.kernel)));
    Lb.bindSlider(root, id('speed'), (v) => `${v} px/s`, (v) => (speed = v));

    setKernel('vertical');
    advance(37); glide.x.set(37 % M); glide.y.set(Math.floor(37 / M));
    if (!compact && !E.reducedMotion()) setTimeout(play, 800);

    return () => { pause(); fc.destroy(); offTheme(); };
  });
})();

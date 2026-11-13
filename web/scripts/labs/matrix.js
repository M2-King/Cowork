/* Lab — Matrix Transform (Linear Algebra) */
(function () {
  'use strict';
  const E = window.Epoch, Lb = E.Labs;

  const PRESETS = {
    identity: [1, 0, 0, 1],
    rotate: [Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6), Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)],
    shear: [1, 1, 0, 1],
    stretch: [1.5, 0, 0, 0.6],
    reflect: [-1, 0, 0, 1],
    singular: [1, 2, 0.5, 1],
  };

  Lb.register('matrix', (root, { prefix, compact }) => {
    const id = (s) => `${prefix}-${s}`;
    root.innerHTML = `
      <div class="lab-stage sq edge">
        <canvas class="lab-canvas" aria-label="A grid transformed by the matrix. Drag the tips of the two basis vectors to change it."></canvas>
        <div class="lab-hint chip chip-glass">${E.icon('hand')} Drag the arrow tips</div>
      </div>
      <div class="lab-panel">
        <div class="matrix-display" aria-live="polite">
          <span class="mbr">[</span>
          <div class="mgrid num"><span class="mi" id="${id('va')}">1.00</span><span class="mj" id="${id('vb')}">0.00</span><span class="mi" id="${id('vc')}">0.00</span><span class="mj" id="${id('vd')}">1.00</span></div>
          <span class="mbr">]</span>
          <div class="mlegend"><span><i class="sw sw-i"></i>î lands on column 1</span><span><i class="sw sw-j"></i>ĵ lands on column 2</span></div>
        </div>
        <div class="chip-row" role="group" aria-label="Presets">
          ${Object.keys(PRESETS).map((k) => `<button type="button" class="chip chip-btn" data-preset="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}
        </div>
        <div class="slider-grid">
          ${Lb.slider(id('a'), 'a', { min: -2, max: 2, step: 0.05, value: 1, fmt: (v) => v.toFixed(2) })}
          ${Lb.slider(id('b'), 'b', { min: -2, max: 2, step: 0.05, value: 0, fmt: (v) => v.toFixed(2) })}
          ${Lb.slider(id('c'), 'c', { min: -2, max: 2, step: 0.05, value: 0, fmt: (v) => v.toFixed(2) })}
          ${Lb.slider(id('d'), 'd', { min: -2, max: 2, step: 0.05, value: 1, fmt: (v) => v.toFixed(2) })}
        </div>
        <div class="readouts">
          ${Lb.readout('Determinant', id('det'))}
          ${Lb.readout('Trace', id('tr'))}
          ${Lb.readout('Eigenvalues', id('eig'), '–', 'wide')}
        </div>
        ${compact ? '' : `<p class="t-foot lab-note">The shaded square started with area 1. After the transformation its area is |det A|. When the determinant is negative, the square is flipped over.</p>`}
      </div>`;

    const canvas = root.querySelector('canvas');
    const fc = E.fitCanvas(canvas, () => draw());
    let C = Lb.colors('linear-algebra');
    const offTheme = E.Theme.onChange(() => { C = Lb.colors('linear-algebra'); draw(); });

    const T = [1, 0, 0, 1];
    const springs = T.map((v, i) => new E.Spring(v, E.SPRINGS.smooth, () => draw()));
    const sliders = ['a', 'b', 'c', 'd'].map((k, i) => Lb.bindSlider(root, id(k), (v) => v.toFixed(2), (v) => { T[i] = v; springs[i].to(v); update(); }));

    function setMatrix(m, animate = true) {
      m.forEach((v, i) => { T[i] = +v.toFixed(2); sliders[i].set(T[i]); animate ? springs[i].to(T[i]) : springs[i].set(T[i]); });
      update();
    }
    root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => setMatrix(PRESETS[b.dataset.preset])));

    function eig(a, b, c, d) {
      const tr = a + d, det = a * d - b * c, disc = tr * tr - 4 * det;
      if (disc >= 0) { const s = Math.sqrt(disc); return { real: true, l1: (tr + s) / 2, l2: (tr - s) / 2 }; }
      return { real: false, re: tr / 2, im: Math.sqrt(-disc) / 2 };
    }

    function update() {
      const [a, b, c, d] = T;
      ['va', 'vb', 'vc', 'vd'].forEach((k, i) => (root.querySelector('#' + id(k)).textContent = Lb.sign(T[i])));
      const det = a * d - b * c;
      const detEl = root.querySelector('#' + id('det'));
      detEl.textContent = Lb.sign(det);
      detEl.dataset.state = Math.abs(det) < 0.01 ? 'zero' : det < 0 ? 'neg' : '';
      root.querySelector('#' + id('tr')).textContent = Lb.sign(a + d);
      const e = eig(a, b, c, d);
      root.querySelector('#' + id('eig')).textContent = e.real ? `λ₁ = ${Lb.sign(e.l1)},  λ₂ = ${Lb.sign(e.l2)}` : `${Lb.sign(e.re)} ± ${Math.abs(e.im).toFixed(2)}i  (rotation, no real eigenvectors)`;
    }

    function draw() {
      if (!fc.w) return;
      const { ctx, w, h } = fc;
      const [a, b, c, d] = springs.map((s) => s.x);
      const u = Math.min(w, h) / 5.6;
      const cx = w / 2, cy = h / 2;
      const P = (x, y) => [cx + (a * x + b * y) * u, cy - (c * x + d * y) * u];
      ctx.clearRect(0, 0, w, h);
      // original grid, faint
      ctx.lineWidth = 1; ctx.strokeStyle = E.alpha(C.fg, 0.05);
      for (let i = -12; i <= 12; i++) {
        ctx.beginPath(); ctx.moveTo(cx + i * u, 0); ctx.lineTo(cx + i * u, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, cy + i * u); ctx.lineTo(w, cy + i * u); ctx.stroke();
      }
      // transformed grid
      const N = 14;
      for (let i = -N; i <= N; i++) {
        ctx.strokeStyle = i === 0 ? E.alpha(C.col, 0.75) : E.alpha(C.col, C.dark ? 0.34 : 0.24);
        ctx.lineWidth = i === 0 ? 1.4 : 1;
        let p = P(i, -N), q = P(i, N); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        p = P(-N, i); q = P(N, i); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
      // eigenvector lines
      const e = eig(a, b, c, d);
      if (e.real) {
        [e.l1, e.l2].forEach((l, k) => {
          let vx, vy;
          if (Math.abs(b) > 1e-6) { vx = b; vy = l - a; } else if (Math.abs(c) > 1e-6) { vx = l - d; vy = c; } else { vx = k === 0 ? 1 : 0; vy = k === 0 ? 0 : 1; if (Math.abs(a - d) < 1e-6 && k === 1) return; }
          const n = Math.hypot(vx, vy); if (n < 1e-9) return;
          vx /= n; vy /= n;
          ctx.setLineDash([5, 6]); ctx.strokeStyle = E.alpha(C.fg, 0.38); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(cx - vx * w, cy + vy * w); ctx.lineTo(cx + vx * w, cy - vy * w); ctx.stroke();
          ctx.setLineDash([]);
        });
      }
      // unit square
      const o = P(0, 0), i1 = P(1, 0), j1 = P(0, 1), ij = P(1, 1);
      const det = a * d - b * c;
      ctx.fillStyle = E.alpha(det < 0 ? C.col2 : C.col, 0.2);
      ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(i1[0], i1[1]); ctx.lineTo(ij[0], ij[1]); ctx.lineTo(j1[0], j1[1]); ctx.closePath(); ctx.fill();
      // area label
      const mx = (o[0] + ij[0]) / 2, my = (o[1] + ij[1]) / 2;
      ctx.font = '600 12px ' + getComputedStyle(document.body).fontFamily; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = C.fg; ctx.fillText(`area ${Math.abs(det).toFixed(2)}`, mx, my);
      // basis vectors
      E.Glyphs.arrow(ctx, o[0], o[1], i1[0], i1[1], C.col, 3, 12);
      E.Glyphs.arrow(ctx, o[0], o[1], j1[0], j1[1], C.fg, 3, 12);
      // handles
      [[i1, C.col], [j1, C.fg]].forEach(([p, col]) => {
        ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, 7); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, 7); ctx.stroke();
      });
      ctx.font = '700 14px ' + getComputedStyle(document.body).fontFamily;
      ctx.fillStyle = C.fg;
      ctx.fillText('î', i1[0] + 16, i1[1] - 12); ctx.fillText('ĵ', j1[0] + 16, j1[1] - 12);
      dot(ctx, o[0], o[1]);
    }
    const dot = (ctx, x, y) => { ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); };

    // Drag basis vector tips
    let drag = -1;
    const tips = () => {
      const [a, b, c, d] = T; const u = Math.min(fc.w, fc.h) / 5.6;
      return [[fc.w / 2 + a * u, fc.h / 2 - c * u], [fc.w / 2 + b * u, fc.h / 2 - d * u]];
    };
    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const t = tips();
      const dists = t.map(([px, py]) => Math.hypot(px - x, py - y));
      const k = dists[0] < dists[1] ? 0 : 1;
      if (dists[k] < 28) { drag = k; canvas.setPointerCapture(e.pointerId); root.querySelector('.lab-hint').classList.add('is-gone'); e.preventDefault(); }
    });
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (drag < 0) {
        const t = tips(); canvas.style.cursor = t.some(([px, py]) => Math.hypot(px - x, py - y) < 28) ? 'grab' : '';
        return;
      }
      canvas.style.cursor = 'grabbing';
      const u = Math.min(fc.w, fc.h) / 5.6;
      const snap = (v) => E.clamp(Math.round(v * 20) / 20, -2, 2);
      const vx = snap((x - fc.w / 2) / u), vy = snap((fc.h / 2 - y) / u);
      const m = T.slice();
      if (drag === 0) { m[0] = vx; m[2] = vy; } else { m[1] = vx; m[3] = vy; }
      m.forEach((v, i) => { T[i] = v; sliders[i].set(v); springs[i].to(v); });
      update();
    });
    const end = () => { drag = -1; canvas.style.cursor = ''; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

    update();
    // open on a shear so the first frame shows a transformation
    setTimeout(() => setMatrix([1, 0.6, 0.25, 1.1]), compact ? 300 : 500);

    return () => { fc.destroy(); offTheme(); };
  });
})();

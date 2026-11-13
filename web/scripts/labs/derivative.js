/* Lab — Tangent and Secant (Calculus) */
(function () {
  'use strict';
  const E = window.Epoch, Lb = E.Labs;

  const sig = (x) => 1 / (1 + Math.exp(-x));
  const FUNCS = {
    sin: { label: 'sin x', f: Math.sin, d: Math.cos, x: [-6.4, 6.4], y: [-1.9, 1.9], x0: 0.9, tex: String.raw`f(x) = \sin x` },
    cubic: { label: 'x³/4 − x', f: (x) => x ** 3 / 4 - x, d: (x) => 0.75 * x * x - 1, x: [-3.4, 3.4], y: [-3, 3], x0: -1.6, tex: String.raw`f(x) = \tfrac{1}{4}x^3 - x` },
    sigmoid: { label: 'σ(x)', f: sig, d: (x) => sig(x) * (1 - sig(x)), x: [-7, 7], y: [-0.45, 1.35], x0: -1.2, tex: String.raw`f(x) = \sigma(x) = \frac{1}{1+e^{-x}}` },
    gauss: { label: 'e^(−x²/2)', f: (x) => Math.exp(-x * x / 2), d: (x) => -x * Math.exp(-x * x / 2), x: [-4.2, 4.2], y: [-0.5, 1.4], x0: -1, tex: String.raw`f(x) = e^{-x^2/2}` },
  };

  Lb.register('derivative', (root, { prefix, compact }) => {
    const id = (s) => `${prefix}-${s}`;
    root.innerHTML = `
      <div class="lab-stage sq edge">
        <canvas class="lab-canvas" aria-label="A curve with a secant line and a tangent line at a draggable point."></canvas>
        <div class="lab-hint chip chip-glass">${E.icon('hand')} Drag the point</div>
      </div>
      <div class="lab-panel">
        ${E.segHTML('Function', Object.entries(FUNCS).map(([k, v]) => ({ value: k, label: v.label })), 'sin', 'full sm')}
        <div class="math math-block fn-tex" data-tex="${FUNCS.sin.tex}"></div>
        ${Lb.slider(id('x'), 'Point x₀', { min: -3, max: 3, step: 0.01, value: 0.9, fmt: (v) => v.toFixed(2) })}
        ${Lb.slider(id('h'), 'Gap h', { min: 0, max: 1, step: 0.001, value: 0.92, fmt: (v) => hOf(v).toFixed(3) })}
        <div class="readouts">
          ${Lb.readout('f(x₀)', id('fx'))}
          ${Lb.readout('Secant slope', id('sec'))}
          ${Lb.readout("Tangent slope f′(x₀)", id('tan'))}
          ${Lb.readout('Gap', id('err'))}
        </div>
        <div class="legend-row t-foot"><span><i class="sw" style="background:var(--c)"></i>Tangent</span><span><i class="sw sw-dash"></i>Secant</span>${compact ? '' : `<span>${Lb.toggle(id('dshow'), 'Show f′(x)')}</span>`}</div>
      </div>`;

    function hOf(t) { return 0.001 * Math.pow(2000, t); } // log scale 0.001 → 2

    const canvas = root.querySelector('canvas');
    const fc = E.fitCanvas(canvas, () => draw());
    let C = Lb.colors('calculus');
    const offTheme = E.Theme.onChange(() => { C = Lb.colors('calculus'); draw(); });
    let key = 'sin', F = FUNCS.sin, x0 = 0.9, hT = 0.92, showD = false;
    const hSpring = new E.Spring(hOf(hT), E.SPRINGS.smooth, () => draw());

    const sx = Lb.bindSlider(root, id('x'), (v) => v.toFixed(2), (v) => { x0 = v; update(); });
    Lb.bindSlider(root, id('h'), (v) => hOf(v).toFixed(3), (v) => { hT = v; hSpring.to(hOf(v)); update(); });
    const seg = E.segmented(root.querySelector('.seg'), (v) => {
      key = v; F = FUNCS[v];
      const xs = root.querySelector('#' + id('x'));
      xs.min = F.x[0] * 0.85; xs.max = F.x[1] * 0.85; x0 = F.x0; sx.set(x0);
      const tex = root.querySelector('.fn-tex'); tex.dataset.tex = F.tex; delete tex.dataset.done; E.renderMath(root);
      update();
    });
    void seg;
    const ds = root.querySelector('#' + id('dshow'));
    if (ds) ds.addEventListener('change', () => { showD = ds.checked; draw(); });
    { const xs = root.querySelector('#' + id('x')); xs.min = F.x[0] * 0.85; xs.max = F.x[1] * 0.85; sx.set(x0); }

    function update() {
      const h = hOf(hT);
      const fx = F.f(x0), sec = (F.f(x0 + h) - fx) / h, tan = F.d(x0);
      root.querySelector('#' + id('fx')).textContent = Lb.sign(fx, 3);
      root.querySelector('#' + id('sec')).textContent = Lb.sign(sec, 3);
      root.querySelector('#' + id('tan')).textContent = Lb.sign(tan, 3);
      const err = Math.abs(sec - tan);
      const el = root.querySelector('#' + id('err'));
      el.textContent = err < 0.0005 ? 'converged' : Lb.sign(err, 3);
      el.dataset.state = err < 0.0005 ? 'good' : '';
      draw();
    }

    function draw() {
      if (!fc.w) return;
      const { ctx, w, h } = fc;
      const v = Lb.view(w, h, F.x[0], F.x[1], F.y[0], F.y[1], 18);
      ctx.clearRect(0, 0, w, h);
      Lb.grid(ctx, v, w, h, C, key === 'sin' ? Math.PI / 2 : 1);
      const font = getComputedStyle(document.body).fontFamily;
      // derivative curve
      if (showD) {
        ctx.strokeStyle = E.alpha(C.col, 0.45); ctx.lineWidth = 1.6; ctx.setLineDash([2, 4]);
        ctx.beginPath();
        for (let px = 0; px <= w; px += 2) { const x = v.ix(px), y = v.Y(F.d(x)); px ? ctx.lineTo(px, y) : ctx.moveTo(px, y); }
        ctx.stroke(); ctx.setLineDash([]);
      }
      // curve
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let px = 0; px <= w; px += 1.5) { const x = v.ix(px), y = v.Y(F.f(x)); px ? ctx.lineTo(px, y) : ctx.moveTo(px, y); }
      ctx.stroke();
      const hh = hSpring.x;
      const fx = F.f(x0), x1 = x0 + hh, f1 = F.f(x1), sec = (f1 - fx) / hh, tan = F.d(x0);
      const span = (F.x[1] - F.x[0]) * 0.6;
      // rise/run triangle
      ctx.fillStyle = E.alpha(C.fg, 0.06);
      ctx.beginPath(); ctx.moveTo(v.X(x0), v.Y(fx)); ctx.lineTo(v.X(x1), v.Y(fx)); ctx.lineTo(v.X(x1), v.Y(f1)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = E.alpha(C.fg, 0.35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(v.X(x0), v.Y(fx)); ctx.lineTo(v.X(x1), v.Y(fx)); ctx.lineTo(v.X(x1), v.Y(f1)); ctx.stroke();
      if (v.X(x1) - v.X(x0) > 28) {
        ctx.font = '600 11px ' + font; ctx.fillStyle = C.fg2; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('h', (v.X(x0) + v.X(x1)) / 2, v.Y(fx) + (f1 > fx ? 4 : -16));
      }
      // secant (dashed)
      ctx.strokeStyle = C.fg2; ctx.lineWidth = 1.8; ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.moveTo(v.X(x0 - span), v.Y(fx - sec * span)); ctx.lineTo(v.X(x0 + span), v.Y(fx + sec * span)); ctx.stroke();
      ctx.setLineDash([]);
      // tangent
      ctx.strokeStyle = C.col; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(v.X(x0 - span), v.Y(fx - tan * span)); ctx.lineTo(v.X(x0 + span), v.Y(fx + tan * span)); ctx.stroke();
      // points
      ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(v.X(x1), v.Y(f1), 6.5, 0, 7); ctx.fill();
      ctx.strokeStyle = C.fg2; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(v.X(x1), v.Y(f1), 4.5, 0, 7); ctx.stroke();
      ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(v.X(x0), v.Y(fx), 10, 0, 7); ctx.fill();
      ctx.fillStyle = C.col; ctx.beginPath(); ctx.arc(v.X(x0), v.Y(fx), 7, 0, 7); ctx.fill();
      fc.v = v;
    }

    // drag the point along the curve
    let dragging = false;
    const move = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = E.clamp(fc.v.ix(e.clientX - r.left), F.x[0] * 0.85, F.x[1] * 0.85);
      x0 = Math.round(x * 100) / 100; sx.set(x0); update();
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (!fc.v) return;
      dragging = true; canvas.setPointerCapture(e.pointerId); move(e);
      root.querySelector('.lab-hint').classList.add('is-gone');
    });
    canvas.addEventListener('pointermove', (e) => dragging && move(e));
    const end = () => (dragging = false);
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

    update();
    return () => { fc.destroy(); offTheme(); };
  });
})();

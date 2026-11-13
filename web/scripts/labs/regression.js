/* Lab — Least Squares (Linear Regression) */
(function () {
  'use strict';
  const E = window.Epoch, Lb = E.Labs;

  function samplePoints(seed) {
    const r = E.rng(seed);
    const m = 0.45 + r() * 0.5, b = 1 + r() * 2.5;
    return Array.from({ length: 12 }, () => { const x = 0.8 + r() * 8.4; return [x, E.clamp(m * x + b + (r() - 0.5) * 2.6, 0.3, 9.7)]; });
  }
  function fit(pts) {
    const n = pts.length;
    if (n < 2) return { m: 0, b: n ? pts[0][1] : 5 };
    const mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
    let sxy = 0, sxx = 0;
    pts.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; });
    const m = sxx < 1e-9 ? 0 : sxy / sxx;
    return { m, b: my - m * mx };
  }
  const mse = (pts, m, b) => (pts.length ? pts.reduce((a, [x, y]) => a + (m * x + b - y) ** 2, 0) / pts.length : 0);
  function r2(pts, m, b) {
    if (pts.length < 2) return 0;
    const my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const sst = pts.reduce((a, [, y]) => a + (y - my) ** 2, 0);
    const sse = pts.reduce((a, [x, y]) => a + (m * x + b - y) ** 2, 0);
    return sst < 1e-9 ? 1 : 1 - sse / sst;
  }

  Lb.register('regression', (root, { prefix, compact }) => {
    const id = (s) => `${prefix}-${s}`;
    root.innerHTML = `
      <div class="lab-stage sq edge">
        <canvas class="lab-canvas" aria-label="Scatter plot with a fitted line. Click to add points, drag to move, double-click to remove."></canvas>
        <div class="lab-hint chip chip-glass">${E.icon('hand')}<span class="only-wide">Click to add · drag to move · double-click to remove</span><span class="hint-short">Tap to add · drag to move</span></div>
      </div>
      <div class="lab-panel">
        ${E.segHTML('Fitting method', [{ value: 'closed', label: 'Normal equation' }, { value: 'gd', label: 'Gradient descent' }], 'closed', 'full sm')}
        <div class="gd-controls" hidden>
          ${Lb.slider(id('lr'), 'Learning rate η', { min: 0.005, max: 0.32, step: 0.005, value: 0.02, fmt: (v) => v.toFixed(3) })}
          <div class="btn-row">${Lb.playBtn(id('play'))}<button type="button" class="btn btn-gray btn-sm" id="${id('reset')}">${E.icon('reset')}<span>Restart</span></button><span class="t-foot num" id="${id('steps')}">step 0</span></div>
          <div class="mini-chart"><canvas id="${id('loss')}" aria-label="MSE by step"></canvas></div>
        </div>
        <div class="readouts">
          ${Lb.readout('Slope m', id('m'))}
          ${Lb.readout('Intercept b', id('b'))}
          ${Lb.readout('MSE', id('mse'))}
          ${Lb.readout('R²', id('r2'))}
        </div>
        <div class="btn-row">
          ${Lb.toggle(id('sq'), 'Show squared errors', !compact)}
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn-gray btn-sm" id="${id('rand')}">${E.icon('shuffle')}<span>New data</span></button>
          <button type="button" class="btn btn-gray btn-sm" id="${id('clear')}">${E.icon('trash')}<span>Clear</span></button>
        </div>
      </div>`;

    const canvas = root.querySelector('canvas.lab-canvas');
    const fc = E.fitCanvas(canvas, () => draw());
    let C = Lb.colors('linear-regression');
    const offTheme = E.Theme.onChange(() => { C = Lb.colors('linear-regression'); draw(); chart.draw(); });
    let seed = 3, pts = samplePoints(seed);
    let mode = 'closed', showSq = !compact;
    const lineM = new E.Spring(0, E.SPRINGS.smooth, () => draw()), lineB = new E.Spring(5, E.SPRINGS.smooth, () => draw());
    // gradient-descent state (on centred x for a well-conditioned problem)
    let gd = { m: 0, c: 0, steps: 0, playing: false, losses: [] };
    let lr = 0.02, raf = 0;
    const chart = Lb.lossChart(root.querySelector('#' + id('loss')));

    const seg = E.segmented(root.querySelector('.seg'), (v) => {
      mode = v;
      root.querySelector('.gd-controls').hidden = v !== 'gd';
      if (v === 'gd') resetGD(); else { stop(); refit(); }
    });
    void seg;
    Lb.bindSlider(root, id('lr'), (v) => v.toFixed(3), (v) => (lr = v));
    const playBtn = root.querySelector('#' + id('play'));
    playBtn.addEventListener('click', () => (gd.playing ? stop() : start()));
    root.querySelector('#' + id('reset')).addEventListener('click', () => { resetGD(); start(); });
    root.querySelector('#' + id('sq')).addEventListener('change', (e) => { showSq = e.target.checked; draw(); });
    root.querySelector('#' + id('rand')).addEventListener('click', () => { pts = samplePoints(++seed); changed(); });
    root.querySelector('#' + id('clear')).addEventListener('click', () => { pts = []; changed(); });

    const meanX = () => (pts.length ? pts.reduce((a, p) => a + p[0], 0) / pts.length : 5);
    function currentLine() {
      if (mode === 'gd') { const mx = meanX(); return { m: gd.m, b: gd.c - gd.m * mx }; }
      return fit(pts);
    }
    function refit() { const { m, b } = fit(pts); lineM.to(m); lineB.to(b); readouts(m, b); }
    function changed() { if (mode === 'gd') resetGD(); else refit(); draw(); }
    function resetGD() {
      gd = { m: 0, c: 0, steps: 0, playing: gd.playing, losses: [] };
      const { m, b } = currentLine(); lineM.set(m); lineB.set(b); readouts(m, b);
      gd.losses.push(mse(pts, m, b)); chart.set([{ values: gd.losses, color: C.col }]);
      root.querySelector('#' + id('steps')).textContent = 'step 0';
    }
    function stepGD() {
      if (pts.length < 2) return;
      const mx = meanX(), n = pts.length;
      let gm = 0, gc = 0;
      pts.forEach(([x, y]) => { const e = gd.m * (x - mx) + gd.c - y; gm += e * (x - mx); gc += e; });
      gd.m -= (lr * gm) / n; gd.c -= (lr * 4 * gc) / n;
      gd.steps++;
      const { m, b } = currentLine();
      const loss = mse(pts, m, b);
      gd.losses.push(isFinite(loss) ? Math.min(loss, 1e6) : 1e6);
      if (gd.losses.length > 240) gd.losses.shift();
      lineM.set(m); lineB.set(b); readouts(m, b);
      root.querySelector('#' + id('steps')).textContent = `step ${gd.steps}`;
      if (!isFinite(loss) || Math.abs(gd.m) > 1e4) { stop(); E.toast('Diverged. Try a smaller learning rate.', 'bolt'); }
    }
    let acc = 0, last = 0;
    function loop(now) {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; acc += dt;
      while (acc > 1 / 20) { acc -= 1 / 20; stepGD(); }
      chart.set([{ values: gd.losses, color: C.col }]);
      if (gd.playing) raf = requestAnimationFrame(loop);
    }
    function start() { if (gd.playing) return; gd.playing = true; Lb.setPlay(playBtn, true); last = 0; raf = requestAnimationFrame(loop); }
    function stop() { gd.playing = false; Lb.setPlay(playBtn, false); cancelAnimationFrame(raf); }

    function readouts(m, b) {
      const set = (k, v) => (root.querySelector('#' + id(k)).textContent = v);
      set('m', Lb.sign(m)); set('b', Lb.sign(b));
      set('mse', pts.length ? mse(pts, m, b).toFixed(3) : '–');
      set('r2', pts.length > 1 ? r2(pts, m, b).toFixed(3) : '–');
    }

    function draw() {
      if (!fc.w) return;
      const { ctx, w, h } = fc;
      const v = Lb.view(w, h, 0, 10, 0, 10, 22);
      fc.v = v;
      ctx.clearRect(0, 0, w, h);
      // frame grid 0..10
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        ctx.strokeStyle = i === 0 ? C.hair : E.alpha(C.fg, 0.05);
        ctx.beginPath(); ctx.moveTo(Math.round(v.X(i)) + 0.5, v.Y(0)); ctx.lineTo(Math.round(v.X(i)) + 0.5, v.Y(10)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(v.X(0), Math.round(v.Y(i)) + 0.5); ctx.lineTo(v.X(10), Math.round(v.Y(i)) + 0.5); ctx.stroke();
      }
      const font = getComputedStyle(document.body).fontFamily;
      ctx.font = '500 10px ' + font; ctx.fillStyle = C.fg3; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      [0, 5, 10].forEach((i) => ctx.fillText(String(i), v.X(i), v.Y(0) + 5));
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      [5, 10].forEach((i) => ctx.fillText(String(i), v.X(0) - 6, v.Y(i)));

      const m = lineM.x, b = lineB.x;
      ctx.save(); ctx.beginPath(); ctx.rect(v.X(0), v.Y(10), v.X(10) - v.X(0), v.Y(0) - v.Y(10)); ctx.clip();
      // squared errors (true squares: equal scale on both axes)
      pts.forEach(([x, y]) => {
        const yh = m * x + b, r = y - yh;
        if (showSq) {
          const side = Math.abs(r) * v.s;
          const sx = r > 0 ? v.X(x) - side : v.X(x);
          ctx.fillStyle = E.alpha(C.col, 0.1); ctx.strokeStyle = E.alpha(C.col, 0.35); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.rect(sx, Math.min(v.Y(y), v.Y(yh)), side, side); ctx.fill(); ctx.stroke();
        }
        ctx.strokeStyle = E.alpha(C.col, 0.75); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(v.X(x), v.Y(y)); ctx.lineTo(v.X(x), v.Y(yh)); ctx.stroke();
      });
      // line
      ctx.strokeStyle = C.col; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(v.X(-1), v.Y(m * -1 + b)); ctx.lineTo(v.X(11), v.Y(m * 11 + b)); ctx.stroke();
      ctx.restore();
      // points
      pts.forEach(([x, y], i) => {
        ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(v.X(x), v.Y(y), i === hover ? 9 : 7, 0, 7); ctx.fill();
        ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(v.X(x), v.Y(y), i === hover ? 6.5 : 5, 0, 7); ctx.fill();
      });
      if (!pts.length) {
        ctx.font = '500 14px ' + font; ctx.fillStyle = C.fg2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Click anywhere to add your first point', w / 2, h / 2);
      }
    }

    // pointer interaction
    let hover = -1, drag = -1, moved = false;
    const pick = (px, py) => pts.findIndex(([x, y]) => Math.hypot(fc.v.X(x) - px, fc.v.Y(y) - py) < 14);
    const toData = (px, py) => [E.clamp(fc.v.ix(px), 0.1, 9.9), E.clamp(fc.v.iy(py), 0.1, 9.9)];
    canvas.addEventListener('pointerdown', (e) => {
      if (!fc.v) return;
      const r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      root.querySelector('.lab-hint').classList.add('is-gone');
      const k = pick(px, py); moved = false;
      if (k >= 0) { drag = k; canvas.setPointerCapture(e.pointerId); }
      else { const [x, y] = toData(px, py); if (px >= fc.v.X(0) - 4 && px <= fc.v.X(10) + 4 && py <= fc.v.Y(0) + 4 && py >= fc.v.Y(10) - 4) { pts.push([x, y]); hover = pts.length - 1; changed(); } }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!fc.v) return;
      const r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      if (drag >= 0) { pts[drag] = toData(px, py); moved = true; changed(); return; }
      const k = pick(px, py);
      if (k !== hover) { hover = k; canvas.style.cursor = k >= 0 ? 'grab' : 'crosshair'; draw(); }
    });
    const end = () => { drag = -1; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('dblclick', (e) => {
      const r = canvas.getBoundingClientRect(); const k = pick(e.clientX - r.left, e.clientY - r.top);
      if (k >= 0) { pts.splice(k, 1); hover = -1; changed(); }
    });
    canvas.addEventListener('pointerleave', () => { hover = -1; draw(); });

    // open with the line springing into its fit
    lineM.set(0); lineB.set(5); readouts(0, 5);
    setTimeout(refit, 350);

    return () => { stop(); fc.destroy(); chart.destroy(); offTheme(); };
  });
})();

/* ==========================================================================
   Epoch — living subject glyphs
   Each subject has a small generative illustration that shows the idea it
   teaches, drawn on canvas and animated only while visible.
   ========================================================================== */
(function () {
  'use strict';
  const E = window.Epoch;
  const TAU = Math.PI * 2;

  function arrow(ctx, x0, y0, x1, y1, color, lw = 2.2, head = 8) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - 0.42), y1 - head * Math.sin(a - 0.42));
    ctx.lineTo(x1 - head * Math.cos(a + 0.42), y1 - head * Math.sin(a + 0.42));
    ctx.closePath(); ctx.fill();
  }
  const dot = (ctx, x, y, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const ring = (ctx, x, y, r, stroke, lw = 1.6) => { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); };

  /* -------------------------------------------------- Linear algebra */
  function linearAlgebra(ctx, w, h, t, C) {
    const u = Math.min(w, h) / 5.2, cx = w / 2, cy = h / 2 + u * 0.1;
    const a = 1 + 0.22 * Math.sin(t * 0.8), b = 0.45 * Math.sin(t * 0.55), c = 0.28 * Math.sin(t * 0.5 + 1), d = 1 + 0.18 * Math.cos(t * 0.7);
    const P = (x, y) => [cx + (a * x + b * y) * u, cy - (c * x + d * y) * u];
    const N = 5;
    ctx.lineWidth = 1;
    for (let i = -N; i <= N; i++) {
      ctx.strokeStyle = E.alpha(C.col, i === 0 ? 0.42 : 0.16);
      let p = P(i, -N), q = P(i, N); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      p = P(-N, i); q = P(N, i); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
    // unit square → parallelogram (area = det)
    const o = P(0, 0), i1 = P(1, 0), j1 = P(0, 1), ij = P(1, 1);
    ctx.fillStyle = E.alpha(C.col, 0.16);
    ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(i1[0], i1[1]); ctx.lineTo(ij[0], ij[1]); ctx.lineTo(j1[0], j1[1]); ctx.closePath(); ctx.fill();
    arrow(ctx, o[0], o[1], i1[0], i1[1], C.col, 2.4, 9);
    arrow(ctx, o[0], o[1], j1[0], j1[1], C.fg, 2.4, 9);
    dot(ctx, o[0], o[1], 3, C.fg);
  }

  /* -------------------------------------------------------- Calculus */
  function calculus(ctx, w, h, t, C) {
    const pad = w * 0.08, x0 = pad, x1 = w - pad;
    const f = (x) => 0.55 * Math.sin(x * 1.25) + 0.22 * Math.sin(2.6 * x + 0.6) + 0.1 * x;
    const fp = (x) => 0.55 * 1.25 * Math.cos(x * 1.25) + 0.22 * 2.6 * Math.cos(2.6 * x + 0.6) + 0.1;
    const X = (x) => x0 + ((x + 3) / 6) * (x1 - x0);
    const Y = (y) => h * 0.55 - y * h * 0.36;
    // integral shading up to the moving point
    const s = Math.sin(t * 0.45) * 2.4; // ping-pong across the domain
    ctx.fillStyle = E.alpha(C.col, 0.13);
    ctx.beginPath(); ctx.moveTo(X(-3), Y(-1.3));
    for (let x = -3; x <= s; x += 0.05) ctx.lineTo(X(x), Y(f(x)));
    ctx.lineTo(X(s), Y(-1.3)); ctx.closePath(); ctx.fill();
    // axis
    ctx.strokeStyle = C.hair; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, Y(-1.3)); ctx.lineTo(x1, Y(-1.3)); ctx.stroke();
    // curve
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let x = -3; x <= 3.001; x += 0.04) { const px = X(x), py = Y(f(x)); x === -3 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
    ctx.stroke();
    // tangent
    const m = fp(s), L = 1.1;
    ctx.strokeStyle = C.col; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(X(s - L), Y(f(s) - m * L)); ctx.lineTo(X(s + L), Y(f(s) + m * L)); ctx.stroke();
    dot(ctx, X(s), Y(f(s)), 6, C.surface); dot(ctx, X(s), Y(f(s)), 4.2, C.col);
  }

  /* ------------------------------------------------------ Regression */
  const regPts = (() => { const r = E.rng(11); return Array.from({ length: 16 }, (_, i) => { const x = -1 + (i + r() * 0.8) / 8.4; return [x, 0.62 * x + (r() - 0.5) * 0.55]; }); })();
  function regression(ctx, w, h, t, C) {
    const cx = w / 2, cy = h / 2, sx = w * 0.4, sy = h * 0.36;
    const X = (x) => cx + x * sx, Y = (y) => cy - y * sy;
    const cyc = t % 7, damp = Math.exp(-cyc * 0.9);
    const m = 0.62 + 1.1 * damp * Math.cos(cyc * 2.2), b = 0.4 * damp * Math.sin(cyc * 1.7);
    ctx.lineWidth = 1.2; ctx.strokeStyle = E.alpha(C.col, 0.55);
    for (const [x, y] of regPts) { ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(x), Y(m * x + b)); ctx.stroke(); }
    ctx.strokeStyle = C.col; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(X(-1.15), Y(m * -1.15 + b)); ctx.lineTo(X(1.15), Y(m * 1.15 + b)); ctx.stroke();
    for (const [x, y] of regPts) { dot(ctx, X(x), Y(y), 4.6, C.surface); dot(ctx, X(x), Y(y), 3.2, C.fg); }
  }

  /* ---------------------------------------------------------- ML */
  const mlPts = (() => { const r = E.rng(5); return Array.from({ length: 34 }, () => { const x = r() * 2 - 1, y = r() * 2 - 1; return [x, y, y > 0.35 * Math.sin(x * 2.6) - 0.05 ? 1 : 0]; }); })();
  function machineLearning(ctx, w, h, t, C) {
    const cx = w / 2, cy = h / 2, sx = w * 0.42, sy = h * 0.38;
    const X = (x) => cx + x * sx, Y = (y) => cy - y * sy;
    const bd = (x) => 0.35 * Math.sin(x * 2.6 + 0.35 * Math.sin(t * 0.7)) - 0.05 + 0.08 * Math.sin(t * 0.9);
    ctx.fillStyle = E.alpha(C.col, 0.12);
    ctx.beginPath(); ctx.moveTo(X(-1.2), Y(1.3));
    for (let x = -1.2; x <= 1.21; x += 0.04) ctx.lineTo(X(x), Y(bd(x)));
    ctx.lineTo(X(1.2), Y(1.3)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.col; ctx.lineWidth = 2.2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 12;
    ctx.beginPath(); for (let x = -1.2; x <= 1.21; x += 0.04) { x === -1.2 ? ctx.moveTo(X(x), Y(bd(x))) : ctx.lineTo(X(x), Y(bd(x))); } ctx.stroke();
    ctx.setLineDash([]);
    for (const [x, y, k] of mlPts) {
      if (k) { dot(ctx, X(x), Y(y), 5, C.surface); dot(ctx, X(x), Y(y), 3.6, C.col); }
      else { dot(ctx, X(x), Y(y), 5, C.surface); ring(ctx, X(x), Y(y), 3.3, C.fg2, 1.6); }
    }
  }

  /* ------------------------------------------------------ Networks */
  function network(ctx, w, h, t, C, opt = {}) {
    const layers = opt.layers || [3, 5, 5, 2];
    const padX = w * (opt.padX || 0.14), padY = h * (opt.padY || 0.16);
    const nodes = layers.map((n, li) => Array.from({ length: n }, (_, i) => [
      padX + (li / (layers.length - 1)) * (w - padX * 2),
      n === 1 ? h / 2 : padY + (i / (n - 1)) * (h - padY * 2),
    ]));
    const gaps = layers.length - 1;
    const back = !!opt.backward;
    const period = back ? gaps * 2 + 1.2 : gaps + 0.8;
    const ph = (t * (opt.speed || 1.1)) % period;
    const fwd = ph < gaps ? ph : -1;
    const bwd = back && ph > gaps + 0.6 && ph < gaps * 2 + 0.6 ? ph - gaps - 0.6 : -1;
    const lineCol = opt.edge || C.hair;
    // edges
    ctx.lineWidth = opt.edgeW || 1;
    for (let l = 0; l < gaps; l++) for (const a of nodes[l]) for (const b of nodes[l + 1]) {
      ctx.strokeStyle = lineCol; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    const hash = (a, b, c) => { const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return s - Math.floor(s); };
    const cycle = Math.floor((t * (opt.speed || 1.1)) / period);
    const pulse = (from, to, frac, col, l, ia, ib) => {
      if (hash(l, ia * 7 + ib, cycle) > (opt.density || 0.55)) return;
      const x = from[0] + (to[0] - from[0]) * frac, y = from[1] + (to[1] - from[1]) * frac;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, E.alpha(col, 0.55)); g.addColorStop(1, E.alpha(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
      dot(ctx, x, y, 2.2, col);
    };
    if (fwd >= 0) {
      const l = Math.floor(fwd), fr = fwd - l;
      const e = 1 - Math.pow(1 - fr, 2.2);
      nodes[l].forEach((a, ia) => nodes[l + 1].forEach((b, ib) => pulse(a, b, e, C.col, l, ia, ib)));
    }
    if (bwd >= 0) {
      const l = gaps - 1 - Math.floor(bwd), fr = bwd - Math.floor(bwd);
      const e = 1 - Math.pow(1 - fr, 2.2);
      nodes[l + 1].forEach((b, ib) => nodes[l].forEach((a, ia) => pulse(b, a, e, opt.backCol || C.col2, l + 7, ia, ib)));
    }
    // nodes
    nodes.forEach((layer, li) => layer.forEach(([x, y]) => {
      let glow = 0;
      if (fwd >= 0) { const dl = fwd - (li - 1); if (li > 0 && dl >= 1 && dl < 1.6) glow = 1 - (dl - 1) / 0.6; if (li === 0 && fwd < 0.5) glow = 1 - fwd / 0.5; }
      if (bwd >= 0) { const target = gaps - li; const dl = bwd - (target - 1); if (dl >= 1 && dl < 1.6) glow = Math.max(glow, 1 - (dl - 1) / 0.6); }
      const r = opt.nodeR || 6;
      if (glow > 0) { const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4); g.addColorStop(0, E.alpha(bwd >= 0 ? (opt.backCol || C.col2) : C.col, 0.45 * glow)); g.addColorStop(1, E.alpha(C.col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.4, 0, TAU); ctx.fill(); }
      dot(ctx, x, y, r + 1.5, opt.nodeBg || C.surface);
      ring(ctx, x, y, r, opt.nodeRing || C.col, 1.8);
      if (glow > 0) dot(ctx, x, y, r * 0.55 * glow + 0.5, bwd >= 0 ? (opt.backCol || C.col2) : C.col);
    }));
  }

  /* ---------------------------------------------------- Deep learning */
  function deepLearning(ctx, w, h, t, C) {
    const maps = [{ n: 7 }, { n: 5 }, { n: 3 }];
    const cell = Math.min(w / 30, h / 12.5);
    const skewX = cell * 0.55, skewY = -cell * 0.38;
    const totalW = maps.reduce((a, m) => a + m.n * cell + m.n * skewX, 0) + cell * 4;
    let ox = (w - totalW) / 2 + cell * 0.4;
    const P = (m, u, v) => [m.ox + u * cell + v * skewX, m.oy + v * skewY];
    maps.forEach((m) => {
      m.ox = ox; m.oy = h / 2 + (m.n * -skewY) / 2;
      ox += m.n * cell + m.n * skewX + cell * 2;
    });
    const quad = (m, u0, v0, u1, v1) => { const a = P(m, u0, v0), b = P(m, u1, v0), c = P(m, u1, v1), d = P(m, u0, v1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); };
    // the parallelogram is drawn with v going "up-right"; flip v so row 0 is at the front
    const step = Math.floor(t * 2.2);
    const k1 = step % 25, ki = k1 % 5, kj = Math.floor(k1 / 5);
    const step2 = Math.floor(t * 2.2 / 3) % 9, k2i = step2 % 3, k2j = Math.floor(step2 / 3);
    maps.forEach((m, mi) => {
      quad(m, 0, 0, m.n, m.n); ctx.fillStyle = E.alpha(C.col, 0.06 + mi * 0.05); ctx.fill();
      ctx.strokeStyle = E.alpha(C.col, 0.35); ctx.lineWidth = 1;
      for (let i = 0; i <= m.n; i++) {
        let a = P(m, i, 0), b = P(m, i, m.n); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        a = P(m, 0, i); b = P(m, m.n, i); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    });
    // kernel on map 0 → cell on map 1
    const m0 = maps[0], m1 = maps[1], m2 = maps[2];
    quad(m0, ki, kj, ki + 3, kj + 3); ctx.fillStyle = E.alpha(C.col, 0.32); ctx.fill(); ctx.strokeStyle = C.col; ctx.lineWidth = 2; ctx.stroke();
    quad(m1, ki, kj, ki + 1, kj + 1); ctx.fillStyle = C.col; ctx.fill();
    const c0 = P(m0, ki + 3, kj + 1.5), c1 = P(m1, ki, kj + 0.5);
    ctx.strokeStyle = E.alpha(C.col, 0.6); ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.stroke();
    quad(m1, k2i, k2j, k2i + 3, k2j + 3); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.4; ctx.stroke();
    const c2 = P(m1, k2i + 3, k2j + 1.5), c3 = P(m2, k2i, k2j + 0.5);
    ctx.strokeStyle = E.alpha(C.fg, 0.5); ctx.beginPath(); ctx.moveTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]); ctx.stroke();
    ctx.setLineDash([]);
    quad(m2, k2i, k2j, k2i + 1, k2j + 1); ctx.fillStyle = C.fg; ctx.fill();
  }

  const draw = {
    'linear-algebra': linearAlgebra,
    calculus,
    'linear-regression': regression,
    'machine-learning': machineLearning,
    'neural-networks': (ctx, w, h, t, C) => network(ctx, w, h, t, C, { layers: [3, 5, 5, 2] }),
    'deep-learning': deepLearning,
  };

  const colorKey = { 'linear-algebra': 'cLa', calculus: 'cCalc', 'linear-regression': 'cReg', 'machine-learning': 'cMl', 'neural-networks': 'cNn', 'deep-learning': 'cDl' };

  function palette(subject) {
    const c = E.Theme.colors();
    return { col: c[colorKey[subject]] || c.accent, col2: c.cCalc, fg: c.fg, fg2: c.fg2, hair: c.hairline2, surface: c.surface, dark: c.dark };
  }

  /* Mount a glyph onto a canvas; returns a destroy function. */
  function mount(canvas, subject, { surface } = {}) {
    let C = palette(subject);
    if (surface) C.surface = surface();
    const fn = draw[subject];
    const still = E.reducedMotion();
    let lastT = 3.2;
    const render = (t) => { if (!fc.w) return; fc.ctx.clearRect(0, 0, fc.w, fc.h); fn(fc.ctx, fc.w, fc.h, t, C); };
    const fc = E.fitCanvas(canvas, () => render(lastT));
    const loop = still ? null : E.visibleLoop(canvas, (t) => { lastT = t + 3.2; render(lastT); });
    const off = E.Theme.onChange(() => { C = palette(subject); if (surface) C.surface = surface(); render(lastT); });
    return () => { if (loop) loop.stop(); fc.destroy(); off(); };
  }

  E.Glyphs = { draw, mount, network, arrow, dot, ring, palette };
})();

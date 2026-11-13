/* Lab — Neural Playground (Neural Networks)
   A small MLP trained in the browser with backprop + Adam on 2-D toy data. */
(function () {
  'use strict';
  const E = window.Epoch, Lb = E.Labs;

  function dataset(kind, seed = 1) {
    const r = E.rng(seed * 97 + kind.length), n = 200, pts = [];
    const g = () => { const u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    for (let i = 0; i < n; i++) {
      let x, y, c;
      if (kind === 'circle') {
        c = i % 2; const a = r() * Math.PI * 2;
        const rad = c ? r() * 0.42 : 0.62 + r() * 0.3;
        x = Math.cos(a) * rad + g() * 0.03; y = Math.sin(a) * rad + g() * 0.03;
      } else if (kind === 'xor') {
        x = r() * 2 - 1; y = r() * 2 - 1;
        if (Math.abs(x) < 0.08) x += Math.sign(x || 1) * 0.1; if (Math.abs(y) < 0.08) y += Math.sign(y || 1) * 0.1;
        c = x * y > 0 ? 1 : 0;
      } else if (kind === 'spiral') {
        c = i % 2; const k = Math.floor(i / 2) / (n / 2);
        const t = k * 3.4 * Math.PI * 0.82 + 0.4, rad = 0.08 + k * 0.86;
        const a = t + c * Math.PI;
        x = Math.cos(a) * rad + g() * 0.025; y = Math.sin(a) * rad + g() * 0.025;
      } else {
        c = i % 2; const a = r() * Math.PI;
        if (c) { x = Math.cos(a); y = Math.sin(a); } else { x = 1 - Math.cos(a); y = 0.5 - Math.sin(a); }
        x = (x - 0.5) * 0.62 + g() * 0.06; y = (y - 0.25) * 0.62 * 1.4 + g() * 0.06;
      }
      pts.push([E.clamp(x, -1, 1), E.clamp(y, -1, 1), c]);
    }
    return pts;
  }

  function makeNet(sizes, seed) {
    const r = E.rng(seed);
    const g = () => { const u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const layers = [];
    for (let l = 1; l < sizes.length; l++) {
      const nin = sizes[l - 1], nout = sizes[l], sc = Math.sqrt(2 / (nin + nout)) * 1.3;
      const mk = () => new Float64Array(nout * nin), mkb = () => new Float64Array(nout);
      const L = { nin, nout, W: mk(), b: mkb(), gW: mk(), gb: mkb(), mW: mk(), vW: mk(), mb: mkb(), vb: mkb(), a: mkb(), d: mkb() };
      for (let i = 0; i < L.W.length; i++) L.W[i] = g() * sc;
      layers.push(L);
    }
    return { layers, t: 0 };
  }

  function forward(net, x, y, relu) {
    let input = [x, y];
    const L = net.layers;
    for (let l = 0; l < L.length; l++) {
      const ly = L[l], last = l === L.length - 1;
      for (let o = 0; o < ly.nout; o++) {
        let z = ly.b[o];
        for (let i = 0; i < ly.nin; i++) z += ly.W[o * ly.nin + i] * input[i];
        ly.a[o] = last ? 1 / (1 + Math.exp(-z)) : relu ? (z > 0 ? z : 0.01 * z) : Math.tanh(z);
      }
      input = ly.a;
    }
    return L[L.length - 1].a[0];
  }

  function trainEpoch(net, data, relu, lr) {
    const L = net.layers;
    L.forEach((ly) => { ly.gW.fill(0); ly.gb.fill(0); });
    let loss = 0, correct = 0;
    for (const [x, y, c] of data) {
      const p = forward(net, x, y, relu);
      const pc = E.clamp(p, 1e-7, 1 - 1e-7);
      loss += -(c * Math.log(pc) + (1 - c) * Math.log(1 - pc));
      if ((p > 0.5 ? 1 : 0) === c) correct++;
      // backward
      L[L.length - 1].d[0] = p - c;
      for (let l = L.length - 1; l >= 0; l--) {
        const ly = L[l], prev = l ? L[l - 1].a : [x, y];
        for (let o = 0; o < ly.nout; o++) {
          const d = ly.d[o];
          ly.gb[o] += d;
          for (let i = 0; i < ly.nin; i++) ly.gW[o * ly.nin + i] += d * prev[i];
        }
        if (l) {
          const pl = L[l - 1];
          for (let i = 0; i < ly.nin; i++) {
            let s = 0;
            for (let o = 0; o < ly.nout; o++) s += ly.W[o * ly.nin + i] * ly.d[o];
            const a = pl.a[i];
            pl.d[i] = s * (relu ? (a > 0 ? 1 : 0.01) : 1 - a * a);
          }
        }
      }
    }
    // Adam
    net.t++;
    const b1 = 0.9, b2 = 0.999, n = data.length, c1 = 1 - b1 ** net.t, c2 = 1 - b2 ** net.t;
    const upd = (P, G, M, V) => { for (let i = 0; i < P.length; i++) { const g = G[i] / n; M[i] = b1 * M[i] + (1 - b1) * g; V[i] = b2 * V[i] + (1 - b2) * g * g; P[i] -= (lr * (M[i] / c1)) / (Math.sqrt(V[i] / c2) + 1e-8); } };
    L.forEach((ly) => { upd(ly.W, ly.gW, ly.mW, ly.vW); upd(ly.b, ly.gb, ly.mb, ly.vb); });
    return { loss: loss / n, acc: correct / n };
  }

  Lb.register('network', (root, { prefix, compact }) => {
    const id = (s) => `${prefix}-${s}`;
    root.innerHTML = `
      <div class="lab-stage sq edge">
        <canvas class="lab-canvas" aria-label="Training data with the network's decision boundary shaded behind it."></canvas>
        <div class="lab-legend chip chip-glass"><span><i class="mk mk-dot"></i>Class A</span><span><i class="mk mk-sq"></i>Class B</span></div>
      </div>
      <div class="lab-panel">
        ${E.segHTML('Dataset', [{ value: 'circle', label: 'Circle' }, { value: 'xor', label: 'XOR' }, { value: 'moons', label: 'Moons' }, { value: 'spiral', label: 'Spiral' }], 'circle', 'full sm')}
        <div class="two-col">
          <div><div class="mini-label">Hidden layers</div>${E.segHTML('Hidden layers', [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }], '2', 'full sm')}</div>
          <div><div class="mini-label">Activation</div>${E.segHTML('Activation', [{ value: 'tanh', label: 'tanh' }, { value: 'relu', label: 'ReLU' }], 'tanh', 'full sm')}</div>
        </div>
        <div class="net-diagram"><canvas id="${id('diagram')}" aria-label="Network diagram; line thickness shows weight size"></canvas></div>
        ${Lb.slider(id('lr'), 'Learning rate (Adam)', { min: 0.002, max: 0.1, step: 0.002, value: 0.03, fmt: (v) => v.toFixed(3) })}
        <div class="btn-row">${Lb.playBtn(id('play'))}<button type="button" class="btn btn-gray btn-sm" id="${id('reset')}">${E.icon('reset')}<span>New weights</span></button></div>
        <div class="readouts">
          ${Lb.readout('Epoch', id('epoch'), '0')}
          ${Lb.readout('Loss', id('loss'))}
          ${Lb.readout('Accuracy', id('acc'))}
        </div>
        <div class="mini-chart"><canvas id="${id('chart')}" aria-label="Training loss by epoch"></canvas></div>
      </div>`;

    const canvas = root.querySelector('canvas.lab-canvas');
    const fc = E.fitCanvas(canvas, () => draw());
    const dg = E.fitCanvas(root.querySelector('#' + id('diagram')), () => drawDiagram());
    let T = E.Theme.colors();
    const offTheme = E.Theme.onChange(() => { T = E.Theme.colors(); draw(); drawDiagram(); chart.draw(); });
    const chart = Lb.lossChart(root.querySelector('#' + id('chart')));

    let kind = 'circle', depth = 2, relu = false, lr = 0.03, seed = 4;
    let data = dataset(kind), net, epoch = 0, losses = [], playing = false, raf = 0, stats = { loss: NaN, acc: NaN };
    const W = 6;

    function rebuild() {
      net = makeNet([2, ...Array(depth).fill(W), 1], seed);
      epoch = 0; losses = []; stats = { loss: NaN, acc: NaN };
      readouts(); chart.set([{ values: losses, color: T.cNn }], { log: false }); draw(); drawDiagram();
    }
    function readouts() {
      root.querySelector('#' + id('epoch')).textContent = epoch.toLocaleString();
      root.querySelector('#' + id('loss')).textContent = isFinite(stats.loss) ? stats.loss.toFixed(3) : '–';
      root.querySelector('#' + id('acc')).textContent = isFinite(stats.acc) ? Math.round(stats.acc * 100) + '%' : '–';
    }

    const GRID = 56;
    const small = document.createElement('canvas'); small.width = GRID; small.height = GRID;
    const sctx = small.getContext('2d');
    function draw() {
      if (!fc.w || !net) return;
      const { ctx, w, h } = fc;
      const v = Lb.view(w, h, -1.08, 1.08, -1.08, 1.08, 10);
      ctx.clearRect(0, 0, w, h);
      const ca = E.alpha(T.cNn, 1).match(/[\d.]+/g).map(Number), cb = E.alpha(T.cCalc, 1).match(/[\d.]+/g).map(Number);
      const img = sctx.createImageData(GRID, GRID);
      for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
        const x = v.x0 + ((i + 0.5) / GRID) * (v.x1 - v.x0), y = v.y1 - ((j + 0.5) / GRID) * (v.y1 - v.y0);
        const p = forward(net, x, y, relu), k = (j * GRID + i) * 4, c = p > 0.5 ? ca : cb;
        img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2];
        img.data[k + 3] = Math.round(255 * (0.03 + Math.abs(p - 0.5) * (T.dark ? 0.34 : 0.4)));
      }
      sctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(small, 0, 0, w, h);
      // points
      for (const [x, y, c] of data) {
        const px = v.X(x), py = v.Y(y);
        ctx.fillStyle = T.surface;
        if (c) { ctx.beginPath(); ctx.arc(px, py, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = T.cNn; ctx.beginPath(); ctx.arc(px, py, 3.8, 0, 7); ctx.fill(); }
        else { ctx.fillRect(px - 5, py - 5, 10, 10); ctx.fillStyle = T.cCalc; ctx.fillRect(px - 3.4, py - 3.4, 6.8, 6.8); }
      }
    }
    function drawDiagram() {
      if (!dg.w || !net) return;
      const { ctx, w, h } = dg;
      ctx.clearRect(0, 0, w, h);
      const sizes = [2, ...Array(depth).fill(W), 1];
      const pos = sizes.map((n, li) => Array.from({ length: n }, (_, i) => [16 + (li / (sizes.length - 1)) * (w - 32), n === 1 ? h / 2 : 12 + (i / (n - 1)) * (h - 24)]));
      net.layers.forEach((ly, l) => {
        for (let o = 0; o < ly.nout; o++) for (let i = 0; i < ly.nin; i++) {
          const wt = ly.W[o * ly.nin + i], a = pos[l][i], b = pos[l + 1][o];
          ctx.strokeStyle = E.alpha(wt > 0 ? T.cNn : T.cCalc, Math.min(0.85, 0.15 + Math.abs(wt) * 0.3));
          ctx.lineWidth = Math.min(3.2, 0.4 + Math.abs(wt) * 0.9);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      });
      pos.forEach((layer) => layer.forEach(([x, y]) => { ctx.fillStyle = T.surface; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 7); ctx.fill(); ctx.strokeStyle = T.fg2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.stroke(); }));
    }

    let frame = 0;
    function loop() {
      for (let k = 0; k < 4; k++) { stats = trainEpoch(net, data, relu, lr); epoch++; }
      losses.push(stats.loss); if (losses.length > 300) losses.shift();
      frame++;
      draw(); if (frame % 3 === 0) { drawDiagram(); chart.set([{ values: losses, color: T.cNn }], { log: false }); }
      readouts();
      if (epoch >= 3000) { pause(); return; }
      if (playing) raf = requestAnimationFrame(loop);
    }
    const playBtn = root.querySelector('#' + id('play'));
    function play() { if (playing) return; if (epoch >= 3000) rebuild(); playing = true; Lb.setPlay(playBtn, true); raf = requestAnimationFrame(loop); }
    function pause() { playing = false; Lb.setPlay(playBtn, false); cancelAnimationFrame(raf); drawDiagram(); chart.set([{ values: losses, color: T.cNn }], { log: false }); }
    playBtn.addEventListener('click', () => (playing ? pause() : play()));
    root.querySelector('#' + id('reset')).addEventListener('click', () => { seed++; const was = playing; pause(); rebuild(); if (was) play(); });

    const segs = root.querySelectorAll('.seg');
    E.segmented(segs[0], (k) => { kind = k; data = dataset(k); const was = playing; pause(); rebuild(); if (was) play(); });
    E.segmented(segs[1], (k) => { depth = +k; const was = playing; pause(); rebuild(); if (was) play(); });
    E.segmented(segs[2], (k) => { relu = k === 'relu'; const was = playing; pause(); rebuild(); if (was) play(); });
    Lb.bindSlider(root, id('lr'), (v) => v.toFixed(3), (v) => (lr = v));

    rebuild();
    // a short warm-up so the first frame already shows a boundary forming
    for (let k = 0; k < 60; k++) { stats = trainEpoch(net, data, relu, lr); epoch++; if (k % 4 === 3) losses.push(stats.loss); }
    readouts(); draw(); drawDiagram(); chart.set([{ values: losses, color: T.cNn }], { log: false });
    if (!compact && !E.reducedMotion()) setTimeout(play, 700);

    return () => { pause(); fc.destroy(); dg.destroy(); chart.destroy(); offTheme(); };
  });
})();

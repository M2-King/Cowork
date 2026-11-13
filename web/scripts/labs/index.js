/* ==========================================================================
   Epoch — lab registry and shared controls
   A lab is a function (root, opts) => destroy. It renders its own stage
   (canvas) and control panel into root.
   ========================================================================== */
(function () {
  'use strict';
  const E = window.Epoch;
  const registry = {};

  function register(id, fn) { registry[id] = fn; }

  function mount(id, root, opts = {}) {
    const fn = registry[id];
    if (!fn) { root.innerHTML = '<p class="t-sub">This lab is not available.</p>'; return () => {}; }
    const meta = E.Data.lab(id);
    root.setAttribute('data-subject', meta.subject);
    root.classList.add('lab');
    if (opts.compact) root.classList.add('is-compact');
    const destroy = fn(root, { ...opts, meta, prefix: (opts.prefix || 'lab') + '-' + id });
    root.querySelectorAll('.lab-panel').forEach((p) => p.classList.add('sq', 'edge'));
    E.renderMath(root);
    return destroy || (() => {});
  }

  /* -------- control builders -------- */
  function slider(id, label, { min, max, step, value, fmt = (v) => v }) {
    const p = ((value - min) / (max - min)) * 100;
    return `<div class="slider-row"><label for="${id}"><span>${label}</span><output id="${id}-out" for="${id}">${fmt(value)}</output></label>
      <input type="range" class="slider" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" style="--p:${p}%"></div>`;
  }
  function bindSlider(root, id, fmt, onInput) {
    const el = root.querySelector('#' + id), out = root.querySelector('#' + id + '-out');
    const sync = () => {
      const v = parseFloat(el.value);
      el.style.setProperty('--p', ((v - el.min) / (el.max - el.min)) * 100 + '%');
      if (out) out.textContent = fmt ? fmt(v) : v;
      return v;
    };
    el.addEventListener('input', () => onInput(sync()));
    return { el, set(v) { el.value = v; sync(); }, get value() { return parseFloat(el.value); } };
  }
  function readout(label, id, value = '–', extra = '') {
    return `<div class="readout ${extra}"><span class="rd-label">${label}</span><span class="rd-value num" id="${id}">${value}</span></div>`;
  }
  function toggle(id, label, checked = false) {
    return `<label class="switch" for="${id}"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span class="track" aria-hidden="true"></span><span>${label}</span></label>`;
  }
  function playBtn(id) {
    return `<button type="button" class="btn btn-subject btn-sm play" id="${id}" aria-pressed="false">${E.icon('play', 'fill')}<span>Play</span></button>`;
  }
  function setPlay(btn, playing) {
    btn.setAttribute('aria-pressed', String(playing));
    btn.innerHTML = playing ? `${E.icon('pause', 'fill')}<span>Pause</span>` : `${E.icon('play', 'fill')}<span>Play</span>`;
  }
  const fmt = (v, d = 2) => (Math.abs(v) < 0.005 && d <= 2 ? 0 : v).toFixed(d).replace('-0.00', '0.00');
  const sign = (v, d = 2) => (v >= 0 ? '' : '−') + Math.abs(v).toFixed(d);

  /* Map world coords to a canvas with uniform scale */
  function view(w, h, x0, x1, y0, y1, pad = 16) {
    const sx = (w - pad * 2) / (x1 - x0), sy = (h - pad * 2) / (y1 - y0);
    const s = Math.min(sx, sy);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return {
      s,
      X: (x) => w / 2 + (x - cx) * s,
      Y: (y) => h / 2 - (y - cy) * s,
      ix: (px) => cx + (px - w / 2) / s,
      iy: (py) => cy - (py - h / 2) / s,
      x0: cx - (w / 2) / s, x1: cx + (w / 2) / s, y0: cy - (h / 2) / s, y1: cy + (h / 2) / s,
    };
  }

  function colors(subject) { return E.Glyphs.palette(subject); }

  /* Grid lines + axes in world units */
  function grid(ctx, v, w, h, C, stepW = 1) {
    ctx.lineWidth = 1;
    for (let x = Math.ceil(v.x0 / stepW) * stepW; x <= v.x1; x += stepW) {
      ctx.strokeStyle = Math.abs(x) < 1e-9 ? C.hair : E.alpha(C.fg, 0.05);
      ctx.beginPath(); ctx.moveTo(Math.round(v.X(x)) + 0.5, 0); ctx.lineTo(Math.round(v.X(x)) + 0.5, h); ctx.stroke();
    }
    for (let y = Math.ceil(v.y0 / stepW) * stepW; y <= v.y1; y += stepW) {
      ctx.strokeStyle = Math.abs(y) < 1e-9 ? C.hair : E.alpha(C.fg, 0.05);
      ctx.beginPath(); ctx.moveTo(0, Math.round(v.Y(y)) + 0.5); ctx.lineTo(w, Math.round(v.Y(y)) + 0.5); ctx.stroke();
    }
  }

  /* Marching-squares contour lines over a sampled grid */
  function contours(ctx, f, v, w, h, levels, styleFn, res = 6) {
    const nx = Math.ceil(w / res) + 1, ny = Math.ceil(h / res) + 1;
    const vals = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) vals[j * nx + i] = f(v.ix(i * res), v.iy(j * res));
    levels.forEach((L, li) => {
      ctx.beginPath();
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = vals[j * nx + i], b = vals[j * nx + i + 1], c = vals[(j + 1) * nx + i + 1], d = vals[(j + 1) * nx + i];
        const pts = [];
        const x = i * res, y = j * res;
        if ((a < L) !== (b < L)) pts.push([x + ((L - a) / (b - a)) * res, y]);
        if ((b < L) !== (c < L)) pts.push([x + res, y + ((L - b) / (c - b)) * res]);
        if ((d < L) !== (c < L)) pts.push([x + ((L - d) / (c - d)) * res, y + res]);
        if ((a < L) !== (d < L)) pts.push([x, y + ((L - a) / (d - a)) * res]);
        if (pts.length >= 2) { ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); }
        if (pts.length === 4) { ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[3][0], pts[3][1]); }
      }
      styleFn(ctx, li, L); ctx.stroke();
    });
    return vals;
  }

  /* Tiny line chart for loss curves; series: [{values, color, label}] */
  function lossChart(canvas) {
    const fc = E.fitCanvas(canvas, () => api.draw());
    let series = [], logY = true, C = null;
    const api = {
      set(s, opts = {}) { series = s; logY = opts.log !== false; api.draw(); },
      draw() {
        if (!fc.w) return;
        C = E.Theme.colors();
        const { ctx, w, h } = fc;
        ctx.clearRect(0, 0, w, h);
        const padL = 34, padR = 8, padT = 8, padB = 18;
        const all = series.flatMap((s) => s.values).filter((v) => isFinite(v));
        const n = Math.max(2, ...series.map((s) => s.values.length));
        ctx.font = '500 10px ' + getComputedStyle(document.body).fontFamily;
        ctx.fillStyle = C.fg3; ctx.textBaseline = 'middle';
        ctx.strokeStyle = C.hairline; ctx.lineWidth = 1;
        if (!all.length) {
          ctx.beginPath(); ctx.moveTo(padL, h - padB + 0.5); ctx.lineTo(w - padR, h - padB + 0.5); ctx.stroke();
          ctx.textAlign = 'center'; ctx.fillText('Loss appears here as it trains', (w + padL) / 2, h / 2); return;
        }
        const tr = (v) => (logY ? Math.log10(Math.max(v, 1e-6)) : v);
        let lo = Math.min(...all.map(tr)), hi = Math.max(...all.map(tr));
        if (logY) { lo = Math.floor(lo); hi = Math.ceil(hi); if (hi === lo) hi = lo + 1; }
        else { if (hi === lo) hi = lo + 1; lo = Math.min(0, lo); }
        const X = (i) => padL + (i / (n - 1)) * (w - padL - padR);
        const Y = (v) => padT + (1 - (tr(v) - lo) / (hi - lo)) * (h - padT - padB);
        // gridlines + ticks
        const ticks = logY ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i) : [lo, (lo + hi) / 2, hi];
        const stride = Math.ceil(ticks.length / 4);
        ticks.forEach((t, i) => {
          if (i % stride) return;
          const y = padT + (1 - (t - lo) / (hi - lo)) * (h - padT - padB);
          ctx.beginPath(); ctx.moveTo(padL, Math.round(y) + 0.5); ctx.lineTo(w - padR, Math.round(y) + 0.5); ctx.stroke();
          ctx.textAlign = 'right';
          const lab = logY ? (t >= 0 ? (10 ** t).toLocaleString() : (10 ** t).toPrecision(1).replace(/^0/, '')) : t.toFixed(2);
          ctx.fillText(lab, padL - 6, y);
        });
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('step', padL, h - 4);
        ctx.textAlign = 'right'; ctx.fillText(String(n - 1), w - padR, h - 4);
        series.forEach((s) => {
          if (s.values.length < 1) return;
          ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.beginPath();
          s.values.forEach((v, i) => { const y = Y(isFinite(v) ? v : 10 ** hi); i ? ctx.lineTo(X(i), y) : ctx.moveTo(X(i), y); });
          ctx.stroke();
          const li = s.values.length - 1, lv = s.values[li];
          if (isFinite(lv)) {
            ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(X(li), Y(lv), 5, 0, 7); ctx.fill();
            ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(X(li), Y(lv), 3.5, 0, 7); ctx.fill();
          }
        });
      },
      destroy() { fc.destroy(); },
    };
    return api;
  }

  E.Labs = { register, mount, slider, bindSlider, readout, toggle, playBtn, setPlay, fmt, sign, view, colors, grid, contours, lossChart, registry };
})();

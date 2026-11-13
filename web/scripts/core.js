/* ==========================================================================
   Epoch — core runtime
   Small, dependency-free primitives every screen uses:
   - $ / h helpers, icon()
   - Spring physics (imperative) + spring → CSS linear() easing generation
   - Squircle: iOS-style continuous corners (native corner-shape or JS path)
   - Theme: palette for canvas drawing, appearance preference
   - Liquid indicator, tilt + specular, number ticker, word reveal, math
   ========================================================================== */
(function () {
  'use strict';

  const Epoch = (window.Epoch = window.Epoch || {});

  /* ---------------------------------------------------------------- DOM */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('epoch:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('epoch:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  /* Seeded PRNG so sample data is stable between reloads */
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ------------------------------------------------------------- Springs */
  // Damped harmonic oscillator, integrated with fixed sub-steps.
  const SPRINGS = {
    snappy: { stiffness: 380, damping: 30, mass: 1 },
    bouncy: { stiffness: 260, damping: 17, mass: 1 },
    smooth: { stiffness: 170, damping: 26, mass: 1 },
    gentle: { stiffness: 90, damping: 18, mass: 1 },
  };

  function simulate(cfg, maxT = 4) {
    const dt = 1 / 1000; let x = 0, v = 0, t = 0;
    const samples = []; let settled = 0, lastMove = 0;
    while (t < maxT) {
      for (let i = 0; i < 8; i++) {
        const a = (-cfg.stiffness * (x - 1) - cfg.damping * v) / cfg.mass;
        v += a * dt; x += v * dt; t += dt;
      }
      samples.push(x);
      if (Math.abs(x - 1) > 0.0015 || Math.abs(v) > 0.02) lastMove = t;
      else if (t - lastMove > 0.05) { settled = lastMove; break; }
    }
    return { samples, duration: Math.max(0.12, settled || t) };
  }

  function springToLinear(cfg) {
    const { samples, duration } = simulate(cfg);
    const stepT = 0.008; // each sample is 8ms
    const n = Math.min(samples.length, Math.ceil(duration / stepT));
    const pts = [];
    const every = Math.max(1, Math.floor(n / 48));
    for (let i = 0; i < n; i += every) pts.push(+samples[i].toFixed(4) + ' ' + ((i / (n - 1)) * 100).toFixed(2) + '%');
    pts[0] = '0'; pts.push('1');
    return { easing: `linear(${pts.join(', ')})`, ms: Math.round(duration * 1000) };
  }

  function installSpringEasings() {
    if (!(window.CSS && CSS.supports('transition-timing-function', 'linear(0, 1)'))) return;
    const root = document.documentElement.style;
    for (const [name, cfg] of Object.entries(SPRINGS)) {
      const { easing, ms } = springToLinear(cfg);
      root.setProperty(`--spring-${name}`, easing);
      root.setProperty(`--d-${name}`, ms + 'ms');
    }
  }

  // Imperative spring for JS-driven motion (indicators, tilt, cards)
  const active = new Set();
  let rafId = 0, lastT = 0;
  function tick(now) {
    const dt = Math.min(0.064, (now - (lastT || now)) / 1000); lastT = now;
    for (const s of active) s._step(dt);
    if (active.size) rafId = requestAnimationFrame(tick); else { rafId = 0; lastT = 0; }
  }
  class Spring {
    constructor(value = 0, cfg = SPRINGS.smooth, onUpdate) {
      this.x = value; this.v = 0; this.target = value; this.cfg = cfg; this.onUpdate = onUpdate;
    }
    to(target, velocity) {
      this.target = target; if (velocity != null) this.v = velocity;
      if (reducedMotion()) { this.x = target; this.v = 0; this.onUpdate && this.onUpdate(this.x, 0); return this; }
      active.add(this); if (!rafId) rafId = requestAnimationFrame(tick);
      return this;
    }
    set(value) { this.x = this.target = value; this.v = 0; active.delete(this); this.onUpdate && this.onUpdate(value, 0); return this; }
    _step(dt) {
      const { stiffness, damping, mass } = this.cfg;
      const steps = Math.ceil(dt / 0.004); const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        const a = (-stiffness * (this.x - this.target) - damping * this.v) / mass;
        this.v += a * h; this.x += this.v * h;
      }
      if (Math.abs(this.x - this.target) < 0.001 && Math.abs(this.v) < 0.01) { this.x = this.target; this.v = 0; active.delete(this); }
      this.onUpdate && this.onUpdate(this.x, this.v);
    }
  }

  /* ------------------------------------------------------------ Squircle */
  // Figma/iOS "smooth corners": a circular arc in the middle, bridged to each
  // edge by cubic Béziers so curvature ramps up continuously from zero.
  const Squircle = (() => {
    // ?sq=js forces the script path, to compare it with native corner-shape
    const forced = /[?&]sq=js\b/.test(location.search);
    const native = !forced && !!(window.CSS && CSS.supports && CSS.supports('corner-shape', 'squircle'));
    const SMOOTHING = 0.6;
    const tracked = new Set();
    let ro = null;
    const toRad = (d) => (d * Math.PI) / 180;

    function corner(R, s, budget) {
      R = Math.min(R, budget);
      let p = (1 + s) * R;
      const maxS = budget / R - 1;
      if (R > 0) { s = Math.min(s, Math.max(0, maxS)); p = Math.min(p, budget); }
      const arc = 90 * (1 - s);
      const arcLen = Math.sin(toRad(arc / 2)) * R * Math.SQRT2;
      const alpha = (90 - arc) / 2;
      const p3p4 = R * Math.tan(toRad(alpha / 2));
      const beta = 45 * s;
      const c = p3p4 * Math.cos(toRad(beta));
      const d = c * Math.tan(toRad(beta));
      const b = (p - arcLen - c - d) / 3;
      const a = 2 * b;
      return { R, a, b, c, d, p, arcLen };
    }

    function path(w, h, R, s = SMOOTHING, ox = 0, oy = 0) {
      const budget = Math.min(w, h) / 2;
      const k = corner(R, s, budget);
      const { a, b, c, d, p, arcLen } = k; const r = k.R;
      const f = (n) => +n.toFixed(3);
      if (r <= 0) return `M${ox} ${oy}H${f(ox + w)}V${f(oy + h)}H${ox}Z`;
      return [
        `M${f(ox + w - p)} ${f(oy)}`,
        `c${f(a)} 0 ${f(a + b)} 0 ${f(a + b + c)} ${f(d)}`,
        `a${f(r)} ${f(r)} 0 0 1 ${f(arcLen)} ${f(arcLen)}`,
        `c${f(d)} ${f(c)} ${f(d)} ${f(b + c)} ${f(d)} ${f(a + b + c)}`,
        `L${f(ox + w)} ${f(oy + h - p)}`,
        `c0 ${f(a)} 0 ${f(a + b)} ${f(-d)} ${f(a + b + c)}`,
        `a${f(r)} ${f(r)} 0 0 1 ${f(-arcLen)} ${f(arcLen)}`,
        `c${f(-c)} ${f(d)} ${f(-(b + c))} ${f(d)} ${f(-(a + b + c))} ${f(d)}`,
        `L${f(ox + p)} ${f(oy + h)}`,
        `c${f(-a)} 0 ${f(-(a + b))} 0 ${f(-(a + b + c))} ${f(-d)}`,
        `a${f(r)} ${f(r)} 0 0 1 ${f(-arcLen)} ${f(-arcLen)}`,
        `c${f(-d)} ${f(-c)} ${f(-d)} ${f(-(b + c))} ${f(-d)} ${f(-(a + b + c))}`,
        `L${f(ox)} ${f(oy + p)}`,
        `c0 ${f(-a)} 0 ${f(-(a + b))} ${f(d)} ${f(-(a + b + c))}`,
        `a${f(r)} ${f(r)} 0 0 1 ${f(arcLen)} ${f(-arcLen)}`,
        `c${f(c)} ${f(-d)} ${f(b + c)} ${f(-d)} ${f(a + b + c)} ${f(-d)}`,
        'Z',
      ].join('');
    }

    function apply(el, w, h) {
      if (!w || !h) return;
      const cs = getComputedStyle(el);
      const R = parseFloat(cs.getPropertyValue('--r')) || 16;
      el.style.clipPath = `path('${path(w, h, R)}')`;
      if (el.classList.contains('edge')) {
        const col = (cs.getPropertyValue('--edge').trim() || cs.getPropertyValue('--hairline').trim() || 'rgba(0,0,0,.08)');
        const d = path(w - 1, h - 1, Math.max(0, R - 0.5), SMOOTHING, 0.5, 0.5);
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><path d='${d}' fill='none' stroke='${col}' stroke-width='1'/></svg>`;
        el.style.setProperty('--sq-edge-img', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
      }
      el._sq = [w, h];
    }

    function observe(el) {
      if (native || tracked.has(el)) return;
      tracked.add(el); ro.observe(el);
    }
    function scan(root) {
      if (native || !root || root.nodeType !== 1) return;
      if (root.classList.contains('sq')) observe(root);
      root.querySelectorAll('.sq').forEach(observe);
    }
    function refreshAll() {
      if (native) return;
      for (const el of tracked) {
        if (!el.isConnected) { tracked.delete(el); ro.unobserve(el); continue; }
        if (el._sq) apply(el, el._sq[0], el._sq[1]);
      }
    }
    function init() {
      const html = document.documentElement;
      if (native) { html.classList.add('sq-native'); return; }
      html.classList.add('sq-js');
      ro = new ResizeObserver((entries) => {
        for (const e of entries) {
          const box = e.borderBoxSize && e.borderBoxSize[0];
          const w = box ? box.inlineSize : e.target.offsetWidth;
          const h = box ? box.blockSize : e.target.offsetHeight;
          apply(e.target, Math.round(w * 100) / 100, Math.round(h * 100) / 100);
        }
      });
      scan(document.body);
      new MutationObserver((muts) => {
        for (const m of muts) m.addedNodes.forEach(scan);
      }).observe(document.body, { childList: true, subtree: true });
    }
    return { init, path, refreshAll, native };
  })();

  /* --------------------------------------------------------------- Theme */
  const Theme = (() => {
    const html = document.documentElement;
    const hostTheme = html.getAttribute('data-theme'); // respect a host-set theme
    let cache = null;
    const listeners = new Set();

    function pref() { return store.get('appearance', 'auto'); }
    function apply(p) {
      if (p === 'light' || p === 'dark') html.setAttribute('data-theme', p);
      else if (hostTheme) html.setAttribute('data-theme', hostTheme);
      else html.removeAttribute('data-theme');
    }
    function set(p) { store.set('appearance', p); apply(p); }
    function isDark() {
      const t = html.getAttribute('data-theme');
      if (t) return t === 'dark';
      return matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function read(name) { return getComputedStyle(html).getPropertyValue(name).trim(); }
    function colors() {
      if (cache) return cache;
      const names = ['bg', 'surface', 'surface-2', 'surface-3', 'fill', 'fg', 'fg-2', 'fg-3', 'hairline', 'hairline-2', 'accent', 'good', 'warn', 'bad',
        'c-la', 'c-calc', 'c-reg', 'c-ml', 'c-nn', 'c-dl', 'contour', 'contour-major', 'hero', 'hero-fg'];
      cache = { dark: isDark() };
      for (const n of names) cache[n.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = read('--' + n);
      return cache;
    }
    function changed() {
      cache = null;
      Squircle.refreshAll();
      listeners.forEach((fn) => fn(colors()));
    }
    function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    function init() {
      apply(pref());
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', changed);
      new MutationObserver(changed).observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    }
    return { init, set, pref, colors, onChange, isDark };
  })();

  /* Parse #rgb/#rrggbb/rgb()/rgba() and return rgba() with a new alpha */
  function alpha(color, a) {
    color = (color || '').trim();
    let r = 0, g = 0, b = 0, base = 1;
    if (color[0] === '#') {
      let hex = color.slice(1);
      if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
      r = parseInt(hex.slice(0, 2), 16); g = parseInt(hex.slice(2, 4), 16); b = parseInt(hex.slice(4, 6), 16);
    } else {
      const m = color.match(/rgba?\(([^)]+)\)/);
      if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); [r, g, b] = p; if (p[3] != null) base = p[3]; }
    }
    return `rgba(${r}, ${g}, ${b}, ${+(a * base).toFixed(4)})`;
  }
  function mix(c1, c2, t) {
    const p = (c) => { const m = alpha(c, 1).match(/[\d.]+/g).map(Number); return m; };
    const a = p(c1), b = p(c2);
    return `rgb(${Math.round(lerp(a[0], b[0], t))}, ${Math.round(lerp(a[1], b[1], t))}, ${Math.round(lerp(a[2], b[2], t))})`;
  }

  /* -------------------------------------------------------------- Canvas */
  // Keeps a canvas sized to its box at device resolution.
  function fitCanvas(canvas, onResize) {
    const ctx = canvas.getContext('2d');
    const st = { ctx, w: 0, h: 0, dpr: 1, canvas };
    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.w = r.width; st.h = r.height; st.dpr = dpr;
      onResize && onResize(st);
    });
    ro.observe(canvas);
    st.destroy = () => ro.disconnect();
    return st;
  }

  // rAF loop that only runs while the element is on screen and the tab is visible.
  function visibleLoop(el, frame) {
    let on = false, id = 0, t0 = performance.now(), last = t0, alive = true;
    const run = (now) => {
      if (!on || !alive) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      frame((now - t0) / 1000, dt);
      id = requestAnimationFrame(run);
    };
    const start = () => { if (on || !alive) return; on = true; last = performance.now(); id = requestAnimationFrame(run); };
    const stop = () => { on = false; cancelAnimationFrame(id); };
    const io = new IntersectionObserver((es) => { es[0].isIntersecting && !document.hidden ? start() : stop(); }, { rootMargin: '80px' });
    io.observe(el);
    const vis = () => { if (document.hidden) stop(); else { const r = el.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) start(); } };
    document.addEventListener('visibilitychange', vis);
    return { stop() { alive = false; stop(); io.disconnect(); document.removeEventListener('visibilitychange', vis); }, once() { frame((performance.now() - t0) / 1000, 0); } };
  }

  /* ------------------------------------------------- Liquid indicator */
  // A highlight that springs between items and stretches along its travel,
  // like a drop of liquid glass sliding under your finger.
  class Liquid {
    constructor(container, thumb, { axis = 'x', inset = 0 } = {}) {
      this.c = container; this.t = thumb; this.axis = axis; this.inset = inset; this.ready = false;
      this.pos = new Spring(0, SPRINGS.bouncy, () => this.render());
      this.size = new Spring(0, SPRINGS.snappy, () => this.render());
      this.cross = 0;
    }
    moveTo(item, instant = false) {
      if (!item) { this.t.style.opacity = '0'; return; }
      const cr = this.c.getBoundingClientRect(), ir = item.getBoundingClientRect();
      const pos = this.axis === 'x' ? ir.left - cr.left : ir.top - cr.top;
      const size = this.axis === 'x' ? ir.width : ir.height;
      this.cross = this.axis === 'x' ? ir.height : ir.width;
      this.crossPos = this.axis === 'x' ? ir.top - cr.top : ir.left - cr.left;
      if (!this.ready || instant) { this.pos.set(pos); this.size.set(size); this.ready = true; }
      else { this.pos.to(pos); this.size.to(size); }
      this.t.style.opacity = '1';
    }
    render() {
      const v = this.pos.v;
      const stretch = 1 + Math.min(Math.abs(v) / 2600, 0.32);
      const squash = 1 - Math.min(Math.abs(v) / 9000, 0.12);
      const s = this.t.style;
      if (this.axis === 'x') {
        s.width = this.size.x + 'px';
        s.transform = `translateX(${this.pos.x}px) scale(${stretch}, ${squash})`;
      } else {
        s.height = this.size.x + 'px';
        s.transform = `translateY(${this.pos.x}px) scale(${squash}, ${stretch})`;
      }
    }
  }

  /* Wire a .seg segmented control; returns { value, set } */
  function segmented(root, onChange) {
    const thumb = root.querySelector('.seg-thumb');
    const btns = Array.from(root.querySelectorAll('.seg-btn'));
    const liq = new Liquid(root, thumb, { axis: 'x' });
    const select = (btn, silent, instant) => {
      btns.forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      btns.forEach((b) => (b.tabIndex = b === btn ? 0 : -1));
      liq.moveTo(btn, instant);
      if (!silent && onChange) onChange(btn.dataset.value, btn);
    };
    btns.forEach((b) => b.addEventListener('click', () => select(b)));
    root.addEventListener('keydown', (e) => {
      const i = btns.findIndex((b) => b.getAttribute('aria-checked') === 'true');
      let n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % btns.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + btns.length) % btns.length;
      if (n >= 0) { e.preventDefault(); select(btns[n]); btns[n].focus(); }
    });
    const cur = btns.find((b) => b.getAttribute('aria-checked') === 'true') || btns[0];
    requestAnimationFrame(() => select(cur, true, true));
    new ResizeObserver(() => { const c = btns.find((b) => b.getAttribute('aria-checked') === 'true'); if (c) liq.moveTo(c, true); }).observe(root);
    return {
      get value() { const c = btns.find((b) => b.getAttribute('aria-checked') === 'true'); return c && c.dataset.value; },
      set(v, silent = true) { const b = btns.find((x) => x.dataset.value === v); if (b) select(b, silent); },
    };
  }
  function segHTML(name, options, value, cls = '') {
    return `<div class="seg ${cls}" role="radiogroup" aria-label="${esc(name)}"><span class="seg-thumb" aria-hidden="true"></span>${options
      .map((o) => `<button type="button" class="seg-btn" role="radio" aria-checked="${o.value === value}" data-value="${esc(o.value)}"${o.title ? ` title="${esc(o.title)}"` : ''}>${o.icon ? icon(o.icon) : ''}${o.label ? `<span>${esc(o.label)}</span>` : ''}${o.hidden ? `<span class="visually-hidden">${esc(o.hidden)}</span>` : ''}</button>`)
      .join('')}</div>`;
  }

  /* ---------------------------------------------------- Tilt + specular */
  const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
  function tilt(el, max = 5) {
    if (!finePointer() || reducedMotion()) return;
    if (!el.querySelector(':scope > .gloss')) el.insertAdjacentHTML('beforeend', '<span class="gloss" aria-hidden="true"></span>');
    const rx = new Spring(0, SPRINGS.smooth, upd), ry = new Spring(0, SPRINGS.smooth, upd), lift = new Spring(0, SPRINGS.smooth, upd);
    function upd() {
      el.style.transform = `perspective(1000px) rotateX(${rx.x}deg) rotateY(${ry.x}deg) translateY(${-lift.x * 3}px) scale(${1 + lift.x * 0.012})`;
    }
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry.to((px - 0.5) * 2 * max); rx.to(-(py - 0.5) * 2 * max); lift.to(1);
      el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
      el.classList.add('is-hover');
    });
    el.addEventListener('pointerleave', () => { rx.to(0); ry.to(0); lift.to(0); el.classList.remove('is-hover'); });
  }

  /* --------------------------------------------------- Number ticker */
  function tickerHTML(text) {
    const chars = String(text).split('');
    let j = 0;
    return `<span class="ticker" aria-label="${esc(text)}">${chars
      .map((ch) => {
        if (/\d/.test(ch)) {
          const k = j++;
          return `<span class="tk" aria-hidden="true"><span class="tk-col" style="--n:0;--j:${k}" data-d="${ch}">${'0123456789'.split('').map((d) => `<span>${d}</span>`).join('')}</span></span>`;
        }
        return `<span aria-hidden="true">${esc(ch)}</span>`;
      })
      .join('')}</span>`;
  }
  function runTickers(root) {
    const cols = root.querySelectorAll('.tk-col[data-d]');
    if (!cols.length) return;
    requestAnimationFrame(() => requestAnimationFrame(() => cols.forEach((c) => c.style.setProperty('--n', c.dataset.d))));
  }

  /* ----------------------------------------------------- Word reveal */
  function revealHTML(text) {
    return text.split(/(\s+)/).filter((w) => w.length).map((w, i) => (/^\s+$/.test(w) ? ' ' : `<span class="w" style="--i:${i}">${esc(w)}</span>`)).join('');
  }

  /* ------------------------------------------------------------ Math */
  function renderMath(root) {
    const els = root.querySelectorAll('[data-tex]');
    if (!els.length) return;
    const go = () => {
      els.forEach((el) => {
        if (el.dataset.done) return;
        const tex = el.dataset.tex;
        const display = el.classList.contains('math-block');
        if (window.katex) {
          try { katex.render(tex, el, { output: 'mathml', displayMode: display, throwOnError: false }); el.dataset.done = '1'; return; } catch (e) { /* fall through */ }
        }
        el.innerHTML = `<span class="math-fallback">${esc(tex)}</span>`;
      });
    };
    if (window.katex) go();
    else {
      // KaTeX is deferred; render as soon as it arrives, fall back after a short wait.
      let tries = 0;
      const wait = () => { if (window.katex || tries++ > 40) go(); else setTimeout(wait, 75); };
      wait();
    }
  }

  /* ------------------------------------------------------------ Toast */
  function toast(msg, ic = 'check') {
    let host = document.querySelector('.toasts');
    if (!host) { host = document.createElement('div'); host.className = 'toasts'; host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast glass-strong';
    t.innerHTML = `<span class="ic">${icon(ic)}</span><span>${esc(msg)}</span>`;
    host.appendChild(t);
    setTimeout(() => { t.classList.add('is-leaving'); setTimeout(() => t.remove(), 320); }, 2400);
  }

  Object.assign(Epoch, {
    $, $$, esc, icon, clamp, lerp, rng, store, reducedMotion,
    SPRINGS, Spring, springToLinear, installSpringEasings,
    Squircle, Theme, alpha, mix,
    fitCanvas, visibleLoop, Liquid, segmented, segHTML, tilt, finePointer,
    tickerHTML, runTickers, revealHTML, renderMath, toast,
  });
})();

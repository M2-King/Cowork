/* ==========================================================================
   Epoch — screens
   Each screen returns { title, back?, html, mount(root) → cleanup }.
   ========================================================================== */
(function () {
  'use strict';
  const E = window.Epoch, D = E.Data;
  const { icon, esc, tickerHTML, revealHTML } = E;

  /* ------------------------------------------------------------ helpers */
  const pct = (p) => Math.round(p * 100) + '%';
  const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`);
  const tex = (t, block = false) => `<span class="math ${block ? 'math-block' : ''}" data-tex="${esc(t)}"></span>`;
  const subjChip = (s) => `<span class="chip chip-subject" data-subject="${s.id}"><span class="dot"></span>${esc(s.title)}</span>`;
  const statusIcon = (st) => st === 'done' ? `<span class="status done">${icon('check')}</span>`
    : st === 'current' ? '<span class="status current"></span>'
    : st === 'locked' ? `<span class="status locked">${icon('lock')}</span>` : '<span class="status todo"></span>';
  const statusText = (l) => l.status === 'done' ? 'Completed' : l.status === 'current' ? `In progress · ${pct(l.pct || 0)}` : l.status === 'locked' ? 'Locked' : 'Up next';

  function ring(p, size, sw, color, inner = '') {
    const r = (size - sw) / 2, c = 2 * Math.PI * r;
    return `<svg class="mini-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${sw}" style="stroke:${color};opacity:.2"/>
      <circle class="ring-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" style="stroke:${color}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      ${inner}</svg>`;
  }
  function goalRings(goals, size = 140) {
    const sw = 12, gap = 3;
    return `<svg class="rings" viewBox="0 0 ${size} ${size}" role="img" aria-label="${goals.map((g) => `${g.label} ${g.value} of ${g.goal} ${g.unit}`).join(', ')}">${goals
      .map((g, i) => {
        const r = size / 2 - sw / 2 - 1 - i * (sw + gap), c = 2 * Math.PI * r, p = Math.min(1, g.value / g.goal);
        return `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${sw}" style="stroke:${g.color};opacity:.18"/>
          <circle class="ring-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" style="stroke:${g.color};transition-delay:${i * 120}ms" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
      })
      .join('')}</svg>`;
  }
  function runRings(root) {
    const arcs = root.querySelectorAll('.ring-arc[data-off]');
    requestAnimationFrame(() => requestAnimationFrame(() => arcs.forEach((a) => a.setAttribute('stroke-dashoffset', a.dataset.off))));
    const bars = root.querySelectorAll('.bar[data-p]');
    requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach((b) => b.style.setProperty('--p', b.dataset.p))));
  }
  const bar = (p, cls = '') => `<div class="bar ${cls}" data-p="${p.toFixed(3)}" role="progressbar" aria-valuenow="${Math.round(p * 100)}" aria-valuemin="0" aria-valuemax="100"><i></i></div>`;

  function head({ eyebrow, title, sub, size = 't-hero', extra = '' }) {
    return `<header class="page-head">
      ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}
      <h1 class="${size} reveal" data-large-title>${revealHTML(title)}</h1>
      ${sub ? `<p class="page-sub">${sub}</p>` : ''}${extra}
    </header>`;
  }

  function mountGlyphs(root) {
    const offs = [];
    root.querySelectorAll('canvas[data-glyph]').forEach((c) => offs.push(E.Glyphs.mount(c, c.dataset.glyph)));
    return () => offs.forEach((f) => f());
  }
  function mountTilts(root) { root.querySelectorAll('.tilt').forEach((el) => E.tilt(el, +el.dataset.tilt || 4)); }

  /* Shared hover tooltip for charts */
  function tooltips(root) {
    root.querySelectorAll('[data-tip-host]').forEach((host) => {
      const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'status'); host.appendChild(tip);
      host.addEventListener('pointermove', (e) => {
        const t = e.target.closest('[data-tip]');
        if (!t || !host.contains(t)) { tip.classList.remove('is-on'); return; }
        tip.innerHTML = t.dataset.tip;
        const hr = host.getBoundingClientRect(), tr = t.getBoundingClientRect();
        let x = tr.left + tr.width / 2 - hr.left, y = tr.top - hr.top;
        tip.classList.add('is-on');
        const tw = tip.offsetWidth;
        x = E.clamp(x, tw / 2 + 4, hr.width - tw / 2 - 4);
        tip.style.transform = `translate(${x}px, ${y}px) translate(-50%, calc(-100% - 8px))`;
      });
      host.addEventListener('pointerleave', () => tip.classList.remove('is-on'));
    });
  }

  /* ============================================================== TODAY */
  function today() {
    const nn = D.subject('neural-networks'), lesson = D.lesson('backpropagation');
    const hour = new Date().getHours();
    const greet = hour < 5 ? 'Up late?' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const date = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    const due = D.cards.length;
    const goals = D.goals;
    const total = goals.reduce((a, g) => a + Math.min(1, g.value / g.goal), 0) / goals.length;
    const week = D.activity.slice(-7);
    const weekSum = week.reduce((a, d) => a + d.min, 0);
    const chain = D.lesson('chain-rule');

    // path: frontier = last subject with any progress
    const subs = D.subjects;
    let frontier = 0; subs.forEach((s, i) => { if (s.progress > 0) frontier = i; });

    // week chart geometry
    const W = 300, H = 150, padL = 26, padB = 22, padT = 16, goal = 30;
    const maxV = Math.max(60, ...week.map((d) => d.min));
    const yMax = Math.ceil(maxV / 20) * 20;
    const bw = 22, slot = (W - padL) / 7;
    const Y = (v) => padT + (1 - v / yMax) * (H - padT - padB);
    const weekSVG = `<svg class="week-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Minutes studied each day this week">
      ${[0, yMax / 2, yMax].map((t) => `<line x1="${padL}" x2="${W}" y1="${Y(t)}" y2="${Y(t)}" class="grid-line"/><text x="${padL - 6}" y="${Y(t) + 3.5}" class="axis-label" text-anchor="end">${t}</text>`).join('')}
      <line x1="${padL}" x2="${W}" y1="${Y(goal)}" y2="${Y(goal)}" class="goal-line"/>
      <text x="${W}" y="${Y(goal) - 5}" class="axis-label goal-label" text-anchor="end">Goal ${goal}</text>
      ${week.map((d, i) => {
        const x = padL + slot * i + (slot - bw) / 2, y = Y(d.min), h = Math.max(0, Y(0) - y), isToday = i === 6;
        const r = Math.min(4, h);
        const path = h > 0 ? `M${x} ${Y(0)}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${Y(0)}Z` : '';
        const label = d.date.toLocaleDateString(undefined, { weekday: 'short' });
        return `<g class="wbar ${isToday ? 'is-today' : ''}" data-tip="<b>${d.min} min</b> · ${d.date.toLocaleDateString(undefined, { weekday: 'long' })}" style="--k:${i}">
          <rect x="${x - 4}" y="${padT}" width="${bw + 8}" height="${H - padT - padB}" class="hit"/>
          ${path ? `<path d="${path}"/>` : ''}
          <text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" class="axis-label">${label.slice(0, 2)}</text>
          ${isToday ? `<text x="${x + bw / 2}" y="${y - 6}" text-anchor="middle" class="value-label">${d.min}</text>` : ''}
        </g>`;
      }).join('')}
    </svg>`;

    const html = `
      <div class="screen today-screen">
        ${head({ eyebrow: esc(date), title: greet, sub: `You are on a <b>${D.user.streak}-day streak</b>. Finish today’s goals to keep it going.` })}
        <div class="bento stagger">
          <section class="card hero-card sq" data-subject="neural-networks" style="--k:0" data-vt="hero-continue">
            <canvas class="hero-net" aria-hidden="true"></canvas>
            <div class="hero-copy">
              <div class="hero-eyebrow"><span class="dot"></span>${esc(nn.title)} · Unit ${lesson.unit + 1} · Lesson ${lesson.n} of ${nn.lessons.length}</div>
              <h2 class="hero-title">${esc(lesson.title)}</h2>
              <p class="hero-sub">${esc(lesson.intro)}</p>
              <div class="hero-progress">${bar(lesson.pct)}<span class="num">${pct(lesson.pct)} · about ${Math.round(lesson.min * (1 - lesson.pct))} min left</span></div>
              <div class="hero-actions">
                <a class="btn btn-light btn-lg" href="#lesson-backpropagation">${icon('play', 'fill')}Resume lesson</a>
                <a class="btn btn-ghost-light btn-lg" href="#lab-network">${icon('labs')}Open the lab</a>
              </div>
            </div>
          </section>

          <section class="card sq edge goals-card" style="--k:1" aria-labelledby="goals-h">
            <div class="card-head"><h2 id="goals-h">Today’s goals</h2><span class="t-foot num">${pct(total)} done</span></div>
            <div class="goals">
              ${goalRings(goals)}
              <ul class="goal-list">
                ${goals.map((g) => `<li><i class="sw" style="background:${g.color}"></i><span class="g-label">${g.label}</span><span class="g-val num"><b>${g.value}</b>/${g.goal} ${g.unit}</span></li>`).join('')}
              </ul>
            </div>
          </section>

          <section class="card sq edge path-card" style="--k:2" aria-labelledby="path-h">
            <div class="card-head"><h2 id="path-h">Your path</h2><a class="card-link" href="#subjects">All subjects${icon('chevron-right')}</a></div>
            <div class="path-scroll">
              <ol class="path" style="--frontier:${frontier / (subs.length - 1)}">
                ${subs.map((s, i) => `<li class="station ${i <= frontier ? 'is-reached' : ''}" data-subject="${s.id}">
                  <a href="#subject-${s.id}" class="st-link">
                    <span class="st-ring">${ring(s.progress, 58, 5, 'var(--c)')}<span class="st-icon">${icon(s.icon)}</span></span>
                    <span class="st-name">${esc(s.title)}</span>
                    <span class="st-meta num">${pct(s.progress)}</span>
                  </a></li>`).join('')}
              </ol>
            </div>
          </section>

          <section class="card sq edge review-card" style="--k:3" aria-labelledby="rev-h">
            <div class="card-head"><h2 id="rev-h">Due for review</h2><span class="chip chip-warn">${icon('clock')}Today</span></div>
            <div class="deck-visual" aria-hidden="true">
              ${[2, 1, 0].map((i) => `<span class="deck-card sq" style="--i:${i}" data-subject="${D.cards[i].s}"><span class="dc-line"></span><span class="dc-line short"></span></span>`).join('')}
            </div>
            <div class="review-count"><span class="big num">${tickerHTML(due)}</span><span class="t-sub">cards · about ${Math.round(due * 0.6)} min</span></div>
            <a class="btn btn-primary" href="#review">Start review</a>
          </section>

          <section class="card sq edge concept-card" data-subject="calculus" style="--k:4" aria-labelledby="concept-h">
            <div class="card-head"><h2 id="concept-h">Concept of the day</h2>${subjChip(D.subject('calculus'))}</div>
            <h3 class="t-title3">The chain rule</h3>
            ${tex(String.raw`\frac{\partial L}{\partial w} = \frac{\partial L}{\partial a}\cdot\frac{\partial a}{\partial z}\cdot\frac{\partial z}{\partial w}`, true)}
            <p class="t-sub">Backpropagation is this rule applied layer by layer, from the loss back to the very first weights.</p>
            <a class="card-link" href="#lesson-${chain.id}">Open the lesson${icon('chevron-right')}</a>
          </section>

          <section class="card sq edge week-card" style="--k:5" aria-labelledby="week-h">
            <div class="card-head"><h2 id="week-h">This week</h2><span class="t-foot"><b class="num">${weekSum}</b> min studied</span></div>
            <div class="chart-host" data-tip-host>${weekSVG}</div>
          </section>
        </div>

        <section class="section stagger" aria-labelledby="labs-h">
          <div class="section-head" style="--k:0"><h2 id="labs-h" class="t-title2">Pick up a lab</h2><a class="card-link" href="#labs">All labs${icon('chevron-right')}</a></div>
          <div class="lab-tiles" style="--k:1">
            ${['optimizer', 'matrix', 'regression'].map((id) => labCard(D.lab(id), true)).join('')}
          </div>
        </section>
      </div>`;

    return {
      title: greet, html,
      mount(root) {
        runRings(root); E.runTickers(root); tooltips(root); mountTilts(root);
        const offG = mountGlyphs(root);
        // hero network: forward pass in purple, backward pass in orange
        const cv = root.querySelector('.hero-net');
        const fc = E.fitCanvas(cv, () => render(lastT));
        let lastT = 1.4;
        const pal = () => { const c = E.Theme.colors(); return { col: c.cNn, col2: c.cCalc, fg: c.heroFg, fg2: c.heroFg, hair: 'rgba(255,255,255,.09)', surface: c.hero }; };
        let C = pal();
        const offT = E.Theme.onChange(() => { C = pal(); render(lastT); });
        const render = (t) => {
          if (!fc.w) return;
          fc.ctx.clearRect(0, 0, fc.w, fc.h);
          const wide = fc.w > 520;
          E.Glyphs.network(fc.ctx, fc.w, fc.h, t, C, {
            layers: wide ? [3, 5, 6, 5, 2] : [3, 4, 4, 2], backward: true, speed: 0.9, density: 0.5,
            padX: wide ? 0.08 : 0.12, padY: 0.16, nodeR: wide ? 7 : 6, nodeBg: C.surface, nodeRing: 'rgba(255,255,255,.5)', backCol: C.col2, edge: 'rgba(255,255,255,.08)',
          });
        };
        const loop = E.reducedMotion() ? null : E.visibleLoop(cv, (t) => { lastT = t + 1.4; render(lastT); });
        return () => { offG(); fc.destroy(); offT(); if (loop) loop.stop(); };
      },
    };
  }

  function labCard(lab, small = false) {
    const s = D.subject(lab.subject);
    return `<a class="lab-card card sq edge tilt pressable focus-in ${small ? 'is-small' : ''}" href="#lab-${lab.id}" data-subject="${s.id}" data-vt="lab-${lab.id}">
      <div class="lc-art"><canvas data-glyph="${s.id}" aria-hidden="true"></canvas></div>
      <div class="lc-body">
        <div class="lc-top">${subjChip(s)}<span class="lc-go" aria-hidden="true">${icon('arrow-right')}</span></div>
        <h3 class="t-head">${esc(lab.title)}</h3>
        <p class="t-foot">${esc(lab.blurb)}</p>
      </div>
    </a>`;
  }

  /* =========================================================== SUBJECTS */
  function subjects() {
    const total = D.subjects.reduce((a, s) => a + s.lessons.length, 0);
    const html = `
      <div class="screen">
        ${head({ eyebrow: `6 courses · ${total} lessons`, title: 'Subjects', sub: 'Ordered from foundations to frontier. Each course builds on the one before it.' })}
        <div class="subject-grid stagger">
          ${D.subjects.map((s, i) => `
            <a class="subject-card card sq edge tilt pressable focus-in" href="#subject-${s.id}" data-subject="${s.id}" data-vt="subject-${s.id}" style="--k:${i}">
              <div class="sc-art"><canvas data-glyph="${s.id}" aria-hidden="true"></canvas><span class="sc-order num" title="Course ${i + 1} of 6">${i + 1}</span></div>
              <div class="sc-body">
                <h2 class="t-title3">${esc(s.title)}</h2>
                <p class="t-sub">${esc(s.tagline)}</p>
                <div class="sc-meta"><span>${s.lessons.length} lessons · ${fmtMin(s.minutes)}</span><span class="num sc-pct">${pct(s.progress)}</span></div>
                ${bar(s.progress)}
              </div>
            </a>`).join('')}
        </div>
      </div>`;
    return { title: 'Subjects', html, mount(root) { runRings(root); mountTilts(root); return mountGlyphs(root); } };
  }

  /* ============================================================ SUBJECT */
  function subject(id) {
    const s = D.subject(id);
    if (!s) return notFound();
    const idx = D.subjects.indexOf(s);
    const html = `
      <div class="screen" data-subject="${s.id}">
        <section class="subject-hero card sq" data-vt="subject-${s.id}">
          <div class="sh-art"><canvas data-glyph="${s.id}" aria-hidden="true"></canvas></div>
          <div class="sh-copy">
            <div class="eyebrow">Course ${idx + 1} of 6</div>
            <h1 class="t-hero reveal" data-large-title>${revealHTML(s.title)}</h1>
            <p class="sh-about">${esc(s.about)}</p>
            <dl class="sh-stats">
              <div><dt>Lessons</dt><dd class="num">${tickerHTML(s.lessons.length)}</dd></div>
              <div><dt>Length</dt><dd>${fmtMin(s.minutes)}</dd></div>
              <div><dt>Complete</dt><dd class="num">${tickerHTML(pct(s.progress))}</dd></div>
            </dl>
            <div class="sh-actions">
              <a class="btn btn-subject btn-lg" href="#lesson-${s.next.id}">${icon('play', 'fill')}${s.next.status === 'current' ? 'Continue' : 'Start'}: ${esc(s.next.title)}</a>
            </div>
          </div>
        </section>
        <div class="units stagger">
          ${s.units.map((u, ui) => {
            const done = u.lessons.filter((l) => l.status === 'done').length;
            const prog = (done + u.lessons.reduce((a, l) => a + (l.status === 'current' ? l.pct || 0 : 0), 0)) / u.lessons.length;
            return `<section class="unit card sq edge" style="--k:${ui}" aria-labelledby="unit-${ui}">
              <header class="unit-head">
                <div><div class="eyebrow">Unit ${ui + 1}</div><h2 class="t-title3" id="unit-${ui}">${esc(u.title)}</h2></div>
                <div class="unit-prog">${ring(prog, 34, 4, 'var(--c)')}<span class="num">${done}/${u.lessons.length}</span></div>
              </header>
              <div class="rows">
                ${u.lessons.map((l) => {
                  const inner = `${statusIcon(l.status)}<div class="row-main"><div class="row-title">${esc(l.title)}</div><div class="row-sub">${l.min} min · ${statusText(l)}${l.lab ? ` · ${icon('labs', 'sm')} Lab` : ''}</div></div>`;
                  return l.status === 'locked'
                    ? `<div class="row sq is-locked" aria-disabled="true">${inner}</div>`
                    : `<a class="row sq" href="#lesson-${l.id}">${inner}${icon('chevron-right', 'chev')}</a>`;
                }).join('')}
              </div>
            </section>`;
          }).join('')}
        </div>
      </div>`;
    return {
      title: s.title, back: { href: '#subjects', label: 'Subjects' }, html, color: s.color,
      mount(root) { runRings(root); E.runTickers(root); E.Ambient.focus(E.Theme.colors()['c' + s.color[0].toUpperCase() + s.color.slice(1)]); const off = mountGlyphs(root); return () => { off(); E.Ambient.focus(null); }; },
    };
  }

  /* ============================================================= LESSON */
  function lesson(id) {
    const l = D.lesson(id);
    if (!l) return notFound();
    const s = D.subject(l.subject);
    const i = s.lessons.indexOf(l);
    const prev = s.lessons[i - 1], next = s.lessons[i + 1];
    const featured = l.id === 'gradient-descent';
    const lab = l.lab ? D.lab(l.lab) : null;

    const sections = featured ? gdSections(l, lab) : genericSections(l, s, lab);
    const html = `
      <div class="screen lesson" data-subject="${s.id}">
        <div class="read-progress" aria-hidden="true"><i></i></div>
        <header class="lesson-head">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="#subjects">Subjects</a>${icon('chevron-right', 'sm')}<a href="#subject-${s.id}">${esc(s.title)}</a>${icon('chevron-right', 'sm')}<span>${esc(l.unitTitle)}</span></nav>
          <h1 class="t-hero reveal" data-large-title>${revealHTML(l.title)}</h1>
          <div class="lesson-meta">
            <span class="chip chip-subject"><span class="dot"></span>Lesson ${l.n} of ${s.lessons.length}</span>
            <span class="chip">${icon('clock')}${l.min} min</span>
            ${lab ? `<span class="chip">${icon('labs')}Includes a lab</span>` : ''}
            ${l.status === 'done' ? `<span class="chip chip-good">${icon('check')}Completed</span>` : ''}
          </div>
        </header>
        <div class="lesson-layout">
          <article class="prose">${sections.map((x) => `<section id="${x.id}" class="prose-section" aria-labelledby="${x.id}-h"><h2 id="${x.id}-h" class="t-title2">${x.title}</h2>${x.body}</section>`).join('')}</article>
          <aside class="toc" aria-label="On this page">
            <div class="toc-inner">
              <div class="eyebrow">On this page</div>
              <nav class="toc-list"><span class="toc-indicator" aria-hidden="true"></span>${sections.map((x) => `<a href="#${x.id}" data-toc="${x.id}">${x.title}</a>`).join('')}</nav>
              <div class="toc-progress"><div class="eyebrow">Reading</div><div class="bar thin read-bar"><i></i></div></div>
            </div>
          </aside>
        </div>
        <footer class="lesson-foot">
          <button type="button" class="btn ${l.status === 'done' ? 'btn-gray' : 'btn-subject'} btn-lg complete-btn" ${l.status === 'done' ? 'disabled' : ''}>${icon('check')}${l.status === 'done' ? 'Completed' : 'Mark as complete'}</button>
          <div class="pn">
            ${prev ? `<a class="pn-card card sq edge pressable focus-in" href="#lesson-${prev.id}"><span class="eyebrow">${icon('chevron-left', 'sm')} Previous</span><span class="t-head">${esc(prev.title)}</span></a>` : '<span></span>'}
            ${next ? (next.status === 'locked' ? `<div class="pn-card card sq edge is-next is-locked"><span class="eyebrow">Next ${icon('lock', 'sm')}</span><span class="t-head">${esc(next.title)}</span></div>` : `<a class="pn-card card sq edge pressable focus-in is-next" href="#lesson-${next.id}"><span class="eyebrow">Next ${icon('chevron-right', 'sm')}</span><span class="t-head">${esc(next.title)}</span></a>`) : ''}
          </div>
        </footer>
      </div>`;

    return {
      title: l.title, back: { href: `#subject-${s.id}`, label: s.short }, html,
      mount(root) {
        const cleanups = [];
        // embedded lab
        const host = root.querySelector('.lab-embed');
        if (host && lab) cleanups.push(E.Labs.mount(lab.id, host, { compact: true, prefix: 'embed' }));
        // sparklines
        root.querySelectorAll('.lr-spark').forEach((svg) => drawSpark(svg, svg.dataset.kind));
        // quiz
        root.querySelectorAll('.quiz').forEach(wireQuiz);
        // complete
        const cb = root.querySelector('.complete-btn');
        cb.addEventListener('click', () => {
          cb.disabled = true; cb.classList.replace('btn-subject', 'btn-gray');
          cb.innerHTML = `${icon('check')}Completed`;
          E.toast('Lesson complete · +40 XP');
        });
        // reading progress + toc
        const fill = root.querySelector('.read-progress i'), rbar = root.querySelector('.read-bar');
        const article = root.querySelector('.prose');
        const tocList = root.querySelector('.toc-list'), tocLinks = [...root.querySelectorAll('[data-toc]')];
        const liq = new E.Liquid(tocList, root.querySelector('.toc-indicator'), { axis: 'y' });
        let active = null;
        const onScroll = () => {
          const r = article.getBoundingClientRect();
          const p = E.clamp((innerHeight * 0.35 - r.top) / Math.max(1, r.height - innerHeight * 0.4), 0, 1);
          fill.style.transform = `scaleX(${p})`; rbar.style.setProperty('--p', p);
          let cur = tocLinks[0];
          for (const a of tocLinks) { const sec = root.querySelector('#' + a.dataset.toc); if (sec && sec.getBoundingClientRect().top < innerHeight * 0.4) cur = a; }
          if (cur !== active) { active = cur; tocLinks.forEach((a) => a.classList.toggle('is-active', a === cur)); liq.moveTo(cur); }
        };
        tocLinks.forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t = root.querySelector('#' + a.dataset.toc); if (t) t.scrollIntoView({ behavior: E.reducedMotion() ? 'auto' : 'smooth', block: 'start' }); }));
        addEventListener('scroll', onScroll, { passive: true });
        requestAnimationFrame(onScroll);
        cleanups.push(() => removeEventListener('scroll', onScroll));
        return () => cleanups.forEach((f) => f());
      },
    };
  }

  function gdSections(l, lab) {
    return [
      { id: 'idea', title: 'The idea', body: `
        <p>Training a model means finding parameters ${tex(String.raw`\boldsymbol\theta`)} that make a loss ${tex(String.raw`J(\boldsymbol\theta)`)} small. For most models no formula hands you the answer, so you search for it.</p>
        <p>Gradient descent searches locally. At your current parameters, the gradient ${tex(String.raw`\nabla J(\boldsymbol\theta)`)} points in the direction where the loss rises fastest. Take a small step the opposite way and the loss drops. Repeat until the steps stop helping.</p>
        <p>Picture the contour map in the lab below as a valley seen from above. Each ring connects points with equal loss, and the gradient is always perpendicular to the ring you are standing on.</p>` },
      { id: 'rule', title: 'The update rule', body: `
        <div class="formula-card sq">${tex(l.tex, true)}</div>
        <dl class="terms">
          <div><dt>${tex(String.raw`\boldsymbol\theta_t`)}</dt><dd>The parameters after <i>t</i> steps: every weight and bias.</dd></div>
          <div><dt>${tex(String.raw`\eta`)}</dt><dd>The learning rate. It scales every step.</dd></div>
          <div><dt>${tex(String.raw`\nabla J(\boldsymbol\theta_t)`)}</dt><dd>The gradient of the loss at the current parameters.</dd></div>
        </dl>
        <p>Every optimizer in this course, including momentum and Adam, is a refinement of this one line.</p>` },
      { id: 'try', title: 'Try it', body: `
        <p>Three optimizers start from the same point. Click the surface to move the start, raise the step size, and watch plain SGD start to zig-zag across the valley.</p>
        <div class="lab-embed" aria-label="${esc(lab.title)} lab"></div>` },
      { id: 'rate', title: 'Choosing the learning rate', body: `
        <div class="lr-grid">
          ${[['slow', 'Too small', 'Each step barely moves. The loss falls, but it takes thousands of steps.'], ['good', 'About right', 'The loss drops quickly, then levels off near the minimum.'], ['diverge', 'Too large', 'Steps overshoot the valley floor. The loss oscillates or grows without bound.']]
            .map(([k, t, d]) => `<div class="lr-card sq edge" data-kind="${k}"><svg class="lr-spark" data-kind="${k}" viewBox="0 0 160 64" role="img" aria-label="Loss curve: ${t.toLowerCase()} learning rate"></svg><div class="t-head">${t}</div><p class="t-foot">${d}</p></div>`).join('')}
        </div>` },
      { id: 'check', title: 'Check your understanding', body: quizHTML({
          q: 'Your loss jumps up and down from one step to the next and never settles. What is the most likely fix?',
          options: [
            ['Increase the learning rate', 'A bigger step makes the overshooting worse.'],
            ['Decrease the learning rate', 'Right. Smaller steps stop you from jumping across the valley floor.', true],
            ['Train for more steps', 'More steps of the same size keep oscillating.'],
            ['Remove the bias term', 'The bias is not what makes the steps too large.'],
          ],
        }) },
      { id: 'recap', title: 'Key takeaways', body: `
        <ul class="takeaways">
          <li>${icon('check')}<span>Move against the gradient: ${tex(String.raw`\boldsymbol\theta \leftarrow \boldsymbol\theta - \eta\,\nabla J(\boldsymbol\theta)`)}.</span></li>
          <li>${icon('check')}<span>The learning rate sets the step size. Too small is slow; too large diverges.</span></li>
          <li>${icon('check')}<span>Narrow valleys make plain gradient descent zig-zag. Momentum and Adam fix that, and they are next.</span></li>
        </ul>` },
    ];
  }

  function genericSections(l, s, lab) {
    const unit = s.units[l.unit];
    const out = [
      { id: 'overview', title: 'Overview', body: `<p class="lead">${esc(l.intro)}</p>` },
      { id: 'key', title: 'Key idea', body: `<div class="formula-card sq">${tex(l.tex, true)}</div>` },
    ];
    if (lab) out.push({ id: 'try', title: 'Try it', body: `<p>${esc(lab.blurb)}</p><div class="lab-embed" aria-label="${esc(lab.title)} lab"></div>` });
    out.push({ id: 'unit', title: `In this unit`, body: `<div class="rows unit-rows card sq edge">${unit.lessons.map((x) => {
      const inner = `${statusIcon(x.status)}<div class="row-main"><div class="row-title">${esc(x.title)}</div><div class="row-sub">${x.min} min · ${statusText(x)}</div></div>`;
      return x.id === l.id ? `<div class="row sq is-here" aria-current="page">${inner}<span class="chip">You are here</span></div>` : x.status === 'locked' ? `<div class="row sq is-locked">${inner}</div>` : `<a class="row sq" href="#lesson-${x.id}">${inner}${icon('chevron-right', 'chev')}</a>`;
    }).join('')}</div>` });
    return out;
  }

  function quizHTML({ q, options }) {
    return `<div class="quiz card sq edge" role="group" aria-label="Question">
      <p class="quiz-q">${esc(q)}</p>
      <div class="quiz-opts">
        ${options.map(([t, fb, ok], i) => `<button type="button" class="quiz-opt sq" data-ok="${ok ? 1 : 0}" data-fb="${esc(fb)}"><span class="qo-key">${'ABCD'[i]}</span><span class="qo-text">${esc(t)}</span><span class="qo-mark" aria-hidden="true"></span></button>`).join('')}
      </div>
      <p class="quiz-fb" aria-live="polite"></p>
    </div>`;
  }
  function wireQuiz(qz) {
    const fb = qz.querySelector('.quiz-fb');
    qz.querySelectorAll('.quiz-opt').forEach((b) => b.addEventListener('click', () => {
      if (qz.classList.contains('is-solved')) return;
      const ok = b.dataset.ok === '1';
      b.classList.remove('is-wrong'); void b.offsetWidth;
      b.classList.add(ok ? 'is-right' : 'is-wrong');
      b.querySelector('.qo-mark').innerHTML = icon(ok ? 'check' : 'xmark');
      fb.textContent = b.dataset.fb; fb.dataset.state = ok ? 'good' : 'bad';
      if (ok) { qz.classList.add('is-solved'); E.toast('Correct · +10 XP'); }
    }));
  }

  function drawSpark(svg, kind) {
    const n = 40, vals = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      vals.push(kind === 'slow' ? 1 - 0.32 * t : kind === 'good' ? 0.06 + 0.94 * Math.exp(-t * 6) : 0.35 + 0.25 * t + 0.32 * t * Math.sin(i * 1.9) * (0.4 + t));
    }
    const W = 160, H = 64, p = 6;
    const X = (i) => p + (i / (n - 1)) * (W - p * 2), Y = (v) => p + (1 - v) * (H - p * 2);
    const d = vals.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(Math.min(1, v)).toFixed(1)}`).join('');
    svg.innerHTML = `<line x1="${p}" x2="${W - p}" y1="${H - p}" y2="${H - p}" class="grid-line"/><path d="${d}L${X(n - 1)} ${H - p}L${X(0)} ${H - p}Z" class="spark-area"/><path d="${d}" class="spark-line"/><circle cx="${X(n - 1)}" cy="${Y(Math.min(1, vals[n - 1]))}" r="3.5" class="spark-dot"/>`;
  }

  /* =============================================================== LABS */
  function labs() {
    const html = `
      <div class="screen">
        ${head({ eyebrow: 'Interactive', title: 'Labs', sub: 'Six small instruments for building intuition. Each one runs entirely in your browser.' })}
        <div class="lab-grid stagger">
          ${D.labs.map((lab, i) => `<div style="--k:${i}">${labCard(lab)}</div>`).join('')}
        </div>
      </div>`;
    return { title: 'Labs', html, mount(root) { mountTilts(root); return mountGlyphs(root); } };
  }

  function labView(id) {
    const lab = D.lab(id);
    if (!lab) return notFound();
    const s = D.subject(lab.subject);
    const related = s.lessons.filter((l) => l.lab === id);
    const html = `
      <div class="screen lab-screen" data-subject="${s.id}">
        <header class="page-head lab-head">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="#labs">Labs</a>${icon('chevron-right', 'sm')}<a href="#subject-${s.id}">${esc(s.title)}</a></nav>
          <h1 class="t-large reveal" data-large-title>${revealHTML(lab.title)}</h1>
          <p class="page-sub">${esc(lab.blurb)}</p>
        </header>
        <div class="lab-host" data-vt="lab-${lab.id}"></div>
        ${related.length ? `<section class="section related" aria-labelledby="rel-h">
          <div class="section-head"><h2 id="rel-h" class="t-title3">Lessons that use this lab</h2></div>
          <div class="rows card sq edge">${related.map((l) => `<a class="row sq" href="#lesson-${l.id}">${statusIcon(l.status)}<div class="row-main"><div class="row-title">${esc(l.title)}</div><div class="row-sub">${esc(l.unitTitle)} · ${l.min} min</div></div>${icon('chevron-right', 'chev')}</a>`).join('')}</div>
        </section>` : ''}
      </div>`;
    return { title: lab.title, back: { href: '#labs', label: 'Labs' }, html, mount(root) { return E.Labs.mount(id, root.querySelector('.lab-host'), { prefix: 'lab' }); } };
  }

  /* ============================================================= REVIEW */
  const RATINGS = [
    { key: 'again', label: 'Again', hint: '< 1 min', cls: 'r-again', dir: [-1, 0] },
    { key: 'hard', label: 'Hard', hint: '6 min', cls: 'r-hard', dir: [-0.4, 1] },
    { key: 'good', label: 'Good', hint: '10 min', cls: 'r-good', dir: [1, 0] },
    { key: 'easy', label: 'Easy', hint: '4 days', cls: 'r-easy', dir: [0, -1] },
  ];
  function review() {
    const html = `
      <div class="screen review-screen">
        ${head({ eyebrow: 'Spaced repetition · mixed deck', title: 'Review', size: 't-large' })}
        <div class="review-progress"><div class="bar thin" id="rv-bar"><i></i></div><span class="num t-foot" id="rv-count"></span></div>
        <div class="deck" id="deck" aria-live="polite"></div>
        <div class="review-actions" id="rv-actions"></div>
        <p class="t-foot review-hint only-wide">Space flips the card. Keys 1–4 rate it. Drag right for Good, left for Again.</p>
        <p class="t-foot review-hint only-compact">Tap to flip. Swipe right for Good, left for Again.</p>
      </div>`;
    return {
      title: 'Review', html,
      mount(root) {
        const deck = root.querySelector('#deck'), actions = root.querySelector('#rv-actions');
        const cards = D.cards.slice();
        let i = 0, flipped = false, busy = false, topEl = null;
        const tally = { again: 0, hard: 0, good: 0, easy: 0 };

        const cardHTML = (c, k) => {
          const s = D.subject(c.s);
          return `<div class="flash" data-subject="${c.s}" style="--depth:${k}" ${k ? 'aria-hidden="true"' : ''}>
            <div class="flash-inner">
              <div class="face front sq edge">
                <div class="face-top">${subjChip(s)}<span class="t-cap">Question</span></div>
                <p class="flash-q">${esc(c.q)}</p>
                <div class="face-foot t-cap">${icon('flip', 'sm')} Tap or press Space to flip</div>
              </div>
              <div class="face back sq edge">
                <div class="face-top">${subjChip(s)}<span class="t-cap">Answer</span></div>
                <p class="flash-a">${esc(c.a)}</p>
                ${c.tex ? `<div class="flash-tex">${tex(c.tex, true)}</div>` : ''}
              </div>
            </div>
            <div class="swipe-tint" aria-hidden="true"><span class="st-good">Good</span><span class="st-again">Again</span></div>
          </div>`;
        };

        function renderDeck() {
          root.querySelector('#rv-count').textContent = i < cards.length ? `${i + 1} of ${cards.length}` : `${cards.length} of ${cards.length}`;
          root.querySelector('#rv-bar').style.setProperty('--p', i / cards.length);
          if (i >= cards.length) return done();
          const vis = cards.slice(i, i + 3);
          deck.innerHTML = vis.map((c, k) => cardHTML(c, k)).reverse().join('');
          topEl = deck.lastElementChild;
          E.renderMath(deck);
          flipped = false; setActions();
          wireTop();
        }
        function setActions() {
          actions.innerHTML = flipped
            ? `<div class="rate-row">${RATINGS.map((r, k) => `<button type="button" class="rate ${r.cls}" data-rate="${r.key}"><span class="rate-label">${r.label}</span><span class="rate-hint">${r.hint}</span><kbd class="only-wide">${k + 1}</kbd></button>`).join('')}</div>`
            : `<button type="button" class="btn btn-gray btn-lg flip-btn">Show answer <kbd class="only-wide">Space</kbd></button>`;
          actions.querySelectorAll('[data-rate]').forEach((b) => b.addEventListener('click', () => rate(b.dataset.rate)));
          const fb = actions.querySelector('.flip-btn'); if (fb) fb.addEventListener('click', flip);
        }
        function top() { return topEl; }
        function flip() {
          const t = top(); if (!t || busy) return;
          flipped = !flipped; t.classList.toggle('is-flipped', flipped); setActions();
          if (flipped) { const r = actions.querySelector('[data-rate="good"]'); if (r) r.focus({ preventScroll: true }); }
        }
        function rate(key, fromSwipe) {
          const t = top(); if (!t || busy) return;
          busy = true; tally[key]++;
          const r = RATINGS.find((x) => x.key === key);
          const dist = Math.max(innerWidth, 900);
          const anim = t.animate([
            { transform: t.style.transform || 'none', opacity: 1 },
            { transform: `translate(${r.dir[0] * dist * 0.8}px, ${r.dir[1] * 420}px) rotate(${r.dir[0] * 18}deg)`, opacity: 0 },
          ], { duration: fromSwipe ? 380 : 460, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' });
          // promote the cards behind with a spring
          deck.querySelectorAll('.flash').forEach((f) => { if (f !== t) f.style.setProperty('--depth', (parseInt(f.style.getPropertyValue('--depth'), 10) || 0) - 1); });
          anim.onfinish = () => { busy = false; i++; renderDeck(); };
        }
        function wireTop() {
          const t = top(); if (!t) return;
          t.addEventListener('click', (e) => { if (!moved) flip(); e.stopPropagation(); });
          let sx = 0, sy = 0, dx = 0, dragging = false, moved = false;
          t.addEventListener('pointerdown', (e) => { if (busy) return; dragging = true; moved = false; sx = e.clientX; sy = e.clientY; dx = 0; t.setPointerCapture(e.pointerId); t.classList.add('is-dragging'); });
          t.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            dx = e.clientX - sx; const dy = (e.clientY - sy) * 0.25;
            if (Math.abs(dx) > 6) moved = true;
            t.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 22}deg)`;
            t.style.setProperty('--swipe-good', E.clamp(dx / 120, 0, 1)); t.style.setProperty('--swipe-again', E.clamp(-dx / 120, 0, 1));
          });
          const end = () => {
            if (!dragging) return; dragging = false; t.classList.remove('is-dragging');
            if (Math.abs(dx) > 120) { rate(dx > 0 ? 'good' : 'again', true); return; }
            // spring back
            const from = t.style.transform;
            t.style.transform = ''; t.style.setProperty('--swipe-good', 0); t.style.setProperty('--swipe-again', 0);
            if (from) t.animate([{ transform: from }, { transform: 'none' }], { duration: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--d-bouncy')) || 600, easing: getComputedStyle(document.documentElement).getPropertyValue('--spring-bouncy').trim() || 'ease-out' });
            setTimeout(() => (moved = false), 0);
          };
          t.addEventListener('pointerup', end); t.addEventListener('pointercancel', end);
        }
        function done() {
          const total = cards.length;
          deck.innerHTML = `<div class="review-done card sq edge">
            <div class="rd-ring">${ring(1, 96, 9, 'var(--good)', '')}<span class="rd-check">${icon('check', 'lg')}</span></div>
            <h2 class="t-title1">Deck complete</h2>
            <p class="t-sub">You reviewed ${total} cards. Your next review is due tomorrow.</p>
            <div class="rd-dist">${RATINGS.map((r) => `<div class="rd-row"><span class="rd-l">${r.label}</span><div class="bar ${r.cls}" data-p="${(tally[r.key] / total).toFixed(3)}"><i></i></div><span class="num rd-n">${tally[r.key]}</span></div>`).join('')}</div>
          </div>`;
          actions.innerHTML = `<div class="btn-row center"><button type="button" class="btn btn-gray btn-lg again-btn">${icon('reset')}Review again</button><a class="btn btn-primary btn-lg" href="#today">Back to Today</a></div>`;
          actions.querySelector('.again-btn').addEventListener('click', () => { i = 0; Object.keys(tally).forEach((k) => (tally[k] = 0)); renderDeck(); });
          runRings(deck);
          E.toast(`Deck complete · +${total * 5} XP`);
        }
        const onKey = (e) => {
          if (e.target.closest('input, textarea, [contenteditable]') || document.querySelector('.overlay')) return;
          if (e.key === ' ' && i < cards.length) { e.preventDefault(); flip(); }
          if (flipped && /^[1-4]$/.test(e.key)) rate(RATINGS[+e.key - 1].key);
        };
        document.addEventListener('keydown', onKey);
        renderDeck();
        return () => document.removeEventListener('keydown', onKey);
      },
    };
  }

  /* =========================================================== PROGRESS */
  function progress() {
    const act = D.activity;
    const totalMin = act.reduce((a, d) => a + d.min, 0) + 2400; // earlier history
    const lessonsDone = D.subjects.reduce((a, s) => a + s.done, 0);
    // heatmap columns (weeks, Monday first)
    const first = act[0].date, offset = (first.getDay() + 6) % 7;
    const cells = act.map((d, k) => ({ ...d, col: Math.floor((k + offset) / 7), row: (k + offset) % 7 }));
    const cols = cells[cells.length - 1].col + 1;
    const level = (m) => (m === 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : m < 45 ? 3 : 4);
    const cs = 13, gap = 3, padL = 30, padT = 18;
    const hmW = padL + cols * (cs + gap), hmH = padT + 7 * (cs + gap);
    let lastMonth = -1;
    const monthLabels = cells.filter((c) => c.row === 0 || c === cells[0]).map((c) => {
      const m = c.date.getMonth(); if (m === lastMonth) return ''; lastMonth = m;
      return `<text x="${padL + c.col * (cs + gap)}" y="11" class="axis-label">${c.date.toLocaleDateString(undefined, { month: 'short' })}</text>`;
    }).join('');
    const heat = `<svg class="heatmap" viewBox="0 0 ${hmW} ${hmH}" role="img" aria-label="Daily study minutes over the last ${Math.round(act.length / 7)} weeks">
      ${monthLabels}
      ${['Mon', '', 'Wed', '', 'Fri', '', ''].map((d, r) => (d ? `<text x="0" y="${padT + r * (cs + gap) + 10}" class="axis-label">${d}</text>` : '')).join('')}
      ${cells.map((c) => `<rect x="${padL + c.col * (cs + gap)}" y="${padT + c.row * (cs + gap)}" width="${cs}" height="${cs}" rx="3.5" class="hm l${level(c.min)}" data-tip="<b>${c.min ? c.min + ' min' : 'No study'}</b> · ${c.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}"/>`).join('')}
    </svg>`;

    // weekly totals, last 12 weeks
    const weeks = [];
    for (let w = 0; w < 12; w++) weeks.unshift(act.slice(Math.max(0, act.length - 7 * (w + 1)), act.length - 7 * w).reduce((a, d) => a + d.min, 0));
    const WW = 520, WH = 200, pl = 36, pr = 44, pt = 14, pb = 24;
    const wmax = Math.ceil(Math.max(...weeks) / 100) * 100;
    const wx = (i) => pl + (i / (weeks.length - 1)) * (WW - pl - pr), wy = (v) => pt + (1 - v / wmax) * (WH - pt - pb);
    const line = weeks.map((v, i) => `${i ? 'L' : 'M'}${wx(i).toFixed(1)} ${wy(v).toFixed(1)}`).join('');
    const ticks = [0, wmax / 2, wmax];
    const weekly = `<svg class="weekly" viewBox="0 0 ${WW} ${WH}" role="img" aria-label="Minutes studied per week, last 12 weeks">
      ${ticks.map((t) => `<line x1="${pl}" x2="${WW - pr}" y1="${wy(t)}" y2="${wy(t)}" class="grid-line"/><text x="${pl - 8}" y="${wy(t) + 4}" text-anchor="end" class="axis-label">${t}</text>`).join('')}
      <path d="${line}L${wx(weeks.length - 1)} ${wy(0)}L${wx(0)} ${wy(0)}Z" class="area"/>
      <path d="${line}" class="line"/>
      <text x="${wx(0)}" y="${WH - 6}" class="axis-label">12 wk ago</text><text x="${wx(weeks.length - 1)}" y="${WH - 6}" text-anchor="end" class="axis-label">This week</text>
      ${weeks.map((v, i) => `<g data-tip="<b>${v} min</b> · ${i === weeks.length - 1 ? 'this week' : weeks.length - 1 - i + ' wk ago'}"><rect x="${wx(i) - 18}" y="${pt}" width="36" height="${WH - pt - pb}" class="hit"/><circle cx="${wx(i)}" cy="${wy(v)}" r="${i === weeks.length - 1 ? 5 : 3.5}" class="pt ${i === weeks.length - 1 ? 'is-end' : ''}"/></g>`).join('')}
      <text x="${wx(weeks.length - 1) + 10}" y="${wy(weeks[weeks.length - 1]) + 4}" class="value-label">${weeks[weeks.length - 1]}</text>
    </svg>`;

    const badges = [
      { t: '21-day streak', d: 'Earned 3 days ago', i: 'flame', on: true, c: 'var(--c-calc)' },
      { t: '300 problems', d: 'Earned last week', i: 'target', on: true, c: 'var(--c-reg)' },
      { t: 'Matrix motion', d: 'Finished Unit 2 of Linear Algebra', i: 'subj-la', on: true, c: 'var(--c-la)' },
      { t: 'Chain reaction', d: 'Completed The chain rule', i: 'subj-calc', on: true, c: 'var(--c-calc)' },
      { t: 'Backprop by hand', d: 'Finish Backpropagation', i: 'subj-nn', on: false, c: 'var(--c-nn)' },
      { t: 'Paying attention', d: 'Finish Self-attention', i: 'subj-dl', on: false, c: 'var(--c-dl)' },
    ];

    const html = `
      <div class="screen">
        ${head({ eyebrow: 'Sample data', title: 'Progress', sub: 'Steady beats intense. Here is how your study time adds up.' })}
        <div class="stat-grid stagger">
          ${[
            ['Day streak', D.user.streak, `Best ${D.user.best} days`, 'flame', 'var(--c-calc)'],
            ['Hours studied', (totalMin / 60).toFixed(1), 'All time', 'clock', 'var(--accent)'],
            ['Lessons done', lessonsDone, `of ${D.subjects.reduce((a, s) => a + s.lessons.length, 0)}`, 'book', 'var(--c-reg)'],
            ['Cards reviewed', '1,284', '87% recalled', 'review', 'var(--c-nn)'],
          ].map(([l, v, sub, ic, c], k) => `<div class="stat card sq edge" style="--k:${k}"><span class="stat-ic" style="--tint:${c}">${icon(ic)}</span><div class="stat-v num">${tickerHTML(v)}</div><div class="stat-l">${l}</div><div class="t-cap">${sub}</div></div>`).join('')}
        </div>
        <div class="progress-grid stagger">
          <section class="card sq edge heat-card" style="--k:0" aria-labelledby="hm-h" data-tip-host>
            <div class="card-head"><h2 id="hm-h">Activity</h2>
              <div class="hm-legend t-cap"><span>Less</span>${[0, 1, 2, 3, 4].map((l) => `<i class="hm l${l}"></i>`).join('')}<span>More</span></div></div>
            <div class="heat-scroll">${heat}</div>
          </section>
          <section class="card sq edge mastery-card" style="--k:1" aria-labelledby="ms-h">
            <div class="card-head"><h2 id="ms-h">Course completion</h2></div>
            <ul class="mastery">
              ${D.subjects.map((s) => `<li data-subject="${s.id}"><a href="#subject-${s.id}"><span class="ms-name">${esc(s.title)}</span><span class="ms-track">${bar(s.progress)}</span><span class="ms-val num">${pct(s.progress)}</span></a></li>`).join('')}
            </ul>
          </section>
          <section class="card sq edge weekly-card" style="--k:2" aria-labelledby="wk-h">
            <div class="card-head"><h2 id="wk-h">Minutes per week</h2><span class="t-foot">Last 12 weeks</span></div>
            <div class="chart-host" data-tip-host>${weekly}</div>
          </section>
          <section class="card sq edge badges-card" style="--k:3" aria-labelledby="bd-h">
            <div class="card-head"><h2 id="bd-h">Milestones</h2><span class="t-foot">${badges.filter((b) => b.on).length} of ${badges.length}</span></div>
            <div class="badges">
              ${badges.map((b) => `<div class="badge-tile ${b.on ? '' : 'is-locked'}" style="--tint:${b.c}"><span class="bt-ic sq">${icon(b.on ? b.i : 'lock')}</span><span class="bt-t">${b.t}</span><span class="t-cap">${b.d}</span></div>`).join('')}
            </div>
          </section>
        </div>
      </div>`;
    return { title: 'Progress', html, mount(root) { runRings(root); E.runTickers(root); tooltips(root); const hs = root.querySelector('.heat-scroll'); if (hs) hs.scrollLeft = hs.scrollWidth; } };
  }

  function notFound() {
    return {
      title: 'Not found',
      html: `<div class="screen">${head({ title: 'Nothing here', sub: 'That page does not exist. Head back to Today to keep going.' })}<a class="btn btn-primary" href="#today">Go to Today</a></div>`,
      mount() {},
    };
  }

  E.Screens = { today, subjects, subject, lesson, labs, lab: labView, review, progress, notFound, labCard };
})();

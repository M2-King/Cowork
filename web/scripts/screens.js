/* ==========================================================================
   EPOCH — screens (game front end)
   Hub · Campaign · Realm · Mission · Simulators · Drills · Profile
   Each screen returns { title, back?, html, mount(root) → cleanup }.
   ========================================================================== */
(function () {
  'use strict';
  const E = window.Epoch, D = E.Data;
  const { icon, esc, tickerHTML, revealHTML } = E;
  const sfx = (k) => E.Sfx && E.Sfx[k] && E.Sfx[k]();

  /* ------------------------------------------------------------ helpers */
  const pct = (p) => Math.round(p * 100) + '%';
  const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + 'm' : ''}`.trim() : `${m}m`);
  const pad2 = (n) => String(n).padStart(2, '0');
  const tex = (t, block = false) => `<span class="math ${block ? 'math-block' : ''}" data-tex="${esc(t)}"></span>`;
  const realmChip = (s, withRealm = true) => `<span class="chip chip-subject" data-subject="${s.id}"><span class="dot"></span>${withRealm ? `Ch. ${s.numeral} · ${esc(s.realm)}` : esc(s.title)}</span>`;
  const pips = (n) => `<span class="pips" aria-label="Difficulty ${n} of 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  const statusIcon = (st) => st === 'done' ? `<span class="status done"><span>${icon('check')}</span></span>`
    : st === 'current' ? '<span class="status current"></span>'
    : st === 'locked' ? `<span class="status locked"><span>${icon('lock')}</span></span>` : '<span class="status todo"></span>';
  const statusText = (l) => l.status === 'done' ? 'Cleared' : l.status === 'current' ? `Active · ${pct(l.pct || 0)} synced` : l.status === 'locked' ? 'Locked' : 'Available';
  const bar = (p, cls = '') => `<div class="bar ${cls}" data-p="${p.toFixed(3)}" role="progressbar" aria-valuenow="${Math.round(p * 100)}" aria-valuemin="0" aria-valuemax="100"><i></i></div>`;

  function ring(p, size, sw, color, inner = '') {
    const r = (size - sw) / 2, c = 2 * Math.PI * r;
    return `<svg class="mini-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${sw}" style="stroke:${color};opacity:.18"/>
      <circle class="ring-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" style="stroke:${color};color:${color}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      ${inner}</svg>`;
  }
  function runRings(root) {
    const arcs = root.querySelectorAll('.ring-arc[data-off]');
    const bars = root.querySelectorAll('.bar[data-p]');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      arcs.forEach((a) => a.setAttribute('stroke-dashoffset', a.dataset.off));
      bars.forEach((b) => b.style.setProperty('--p', b.dataset.p));
    }));
  }

  /* Rank emblem: a faceted badge with chevrons for the level */
  let emblemId = 0;
  function emblem(level, size = 120) {
    const id = 'em' + ++emblemId;
    const chev = Math.min(3, 1 + Math.floor(level / 4));
    return `<svg class="emblem" viewBox="0 0 120 132" width="${size}" height="${size * 1.1}" role="img" aria-label="Rank emblem, level ${level}">
      <defs>
        <linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9CBFF"/><stop offset="1" stop-color="#3A62EE"/></linearGradient>
        <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE2A8"/><stop offset="1" stop-color="#F29A1F"/></linearGradient>
        <radialGradient id="${id}c" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#1d2b55"/><stop offset="1" stop-color="#070b16"/></radialGradient>
      </defs>
      <path d="M60 3 L113 33 V99 L60 129 L7 99 V33 Z" fill="url(#${id}a)" opacity=".16"/>
      <path d="M60 3 L113 33 V99 L60 129 L7 99 V33 Z" fill="none" stroke="url(#${id}a)" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M60 15 L101 39 V93 L60 117 L19 93 V39 Z" fill="url(#${id}c)" stroke="rgba(170,195,255,.35)" stroke-width="1.2" stroke-linejoin="round"/>
      ${Array.from({ length: chev }, (_, i) => `<path d="M40 ${74 + i * 12} L60 ${63 + i * 12} L80 ${74 + i * 12}" fill="none" stroke="url(#${id}b)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
      <text x="60" y="53" text-anchor="middle" class="emblem-num">${level}</text>
    </svg>`;
  }

  function head({ eyebrow, title, sub, size = 't-hero', extra = '' }) {
    return `<header class="page-head">
      ${eyebrow ? `<div class="hud-label ion">${eyebrow}</div>` : ''}
      <h1 class="${size} reveal" data-large-title>${revealHTML(title)}</h1>
      ${sub ? `<p class="page-sub">${sub}</p>` : ''}${extra}
    </header>`;
  }

  function mountGlyphs(root) {
    const offs = [];
    root.querySelectorAll('canvas[data-glyph]').forEach((c) => offs.push(E.Glyphs.mount(c, c.dataset.glyph, { surface: () => 'rgba(5,8,15,1)' })));
    return () => offs.forEach((f) => f());
  }
  function mountTilts(root) { root.querySelectorAll('.tilt').forEach((el) => E.tilt(el, +el.dataset.tilt || 5)); }
  const colorOf = (s) => E.Theme.colors()['c' + s.color[0].toUpperCase() + s.color.slice(1)];

  function tooltips(root) {
    root.querySelectorAll('[data-tip-host]').forEach((host) => {
      const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'status'); host.appendChild(tip);
      host.addEventListener('pointermove', (e) => {
        const t = e.target.closest('[data-tip]');
        if (!t || !host.contains(t)) { tip.classList.remove('is-on'); return; }
        tip.innerHTML = t.dataset.tip;
        const hr = host.getBoundingClientRect(), tr = t.getBoundingClientRect();
        let x = tr.left + tr.width / 2 - hr.left; const y = tr.top - hr.top;
        tip.classList.add('is-on');
        const tw = tip.offsetWidth;
        x = E.clamp(x, tw / 2 + 4, hr.width - tw / 2 - 4);
        tip.style.transform = `translate(${x}px, ${y}px) translate(-50%, calc(-100% - 8px))`;
      });
      host.addEventListener('pointerleave', () => tip.classList.remove('is-on'));
    });
  }

  /* ---------------------------------------------- results / level-up overlay */
  function showResults({ kicker = 'Mission complete', title = 'Mission complete', xp = 0, detail = '', grade = '' }) {
    const u = D.user;
    const before = u.xp, after = Math.min(u.nextXp, u.xp + xp);
    u.xp = after;
    const o = document.createElement('div');
    o.className = 'overlay results-overlay';
    o.innerHTML = `<div class="scrim"></div>
      <div class="results" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="burst" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2, r = 140 + (i % 3) * 60; return `<i style="--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r}px;animation-delay:${200 + (i % 4) * 40}ms;${i % 2 ? 'background:var(--ion-hi);box-shadow:0 0 10px var(--ion)' : ''}"></i>`; }).join('')}</div>
        <div class="results-inner">
          <div class="hud-label ember results-kicker">${esc(kicker)}</div>
          ${grade ? `<div class="grade" data-g="${grade}">${grade}</div>` : ''}
          <div class="results-title">${esc(title)}</div>
          ${detail ? `<p class="t-sub">${esc(detail)}</p>` : ''}
          <div class="results-xp num">+${xp} XP</div>
          <div class="results-bar">
            <div class="row-l"><span>Lv ${u.level} · ${esc(u.rank)}</span><span class="num">${after.toLocaleString()} / ${u.nextXp.toLocaleString()}</span></div>
            <div class="bar xp seg" style="--p:${(before / u.nextXp).toFixed(3)}"><i></i></div>
            <div class="row-l"><span>Next rank</span><span>${esc(u.nextRank)}</span></div>
          </div>
          <button type="button" class="btn btn-primary btn-lg" data-close>Continue <kbd>⏎</kbd></button>
        </div>
      </div>`;
    document.body.appendChild(o);
    sfx('reward');
    const b = o.querySelector('.results-bar .bar');
    setTimeout(() => b.style.setProperty('--p', (after / u.nextXp).toFixed(3)), 900);
    const close = () => { o.classList.add('is-closing'); setTimeout(() => o.remove(), 260); document.removeEventListener('keydown', key); };
    const key = (e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); close(); } };
    o.querySelector('[data-close]').addEventListener('click', close);
    document.addEventListener('keydown', key);
    requestAnimationFrame(() => o.querySelector('[data-close]').focus({ preventScroll: true }));
    document.querySelectorAll('[data-xp-text]').forEach((el) => (el.textContent = after.toLocaleString()));
  }

  /* ================================================================ HUB */
  function today() {
    const nn = D.subject('neural-networks'), lesson = D.lesson('backpropagation');
    const u = D.user;
    const hour = new Date().getHours();
    const greet = hour < 5 ? 'Night shift' : hour < 12 ? 'Morning briefing' : hour < 18 ? 'Afternoon briefing' : 'Evening briefing';
    const due = D.cards.length;
    const ops = [
      { t: 'Train for 30 minutes', v: D.goals[0].value, g: 30, unit: 'min', xp: 50, ic: 'clock' },
      { t: 'Solve 20 problems', v: D.goals[1].value, g: 20, unit: 'solved', xp: 40, ic: 'target' },
      { t: 'Clear 40 drill cards', v: D.goals[2].value, g: 40, unit: 'cards', xp: 40, ic: 'review' },
    ];
    const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
    const left = Math.max(0, mid - now), lh = Math.floor(left / 3.6e6), lm = Math.floor((left % 3.6e6) / 6e4);
    const chain = D.lesson('chain-rule');

    const html = `
      <div class="screen hub">
        <section class="hub-hero" data-subject="neural-networks">
          <div class="hh-copy">
            <div class="hh-kicker"><span class="hud-label ion">◆ ${greet}</span><span class="hud-label">Day ${u.streak} of your combo</span></div>
            <div class="hh-chapter">${realmChip(nn)}<span class="hud-label">Mission ${pad2(lesson.n)} / ${pad2(nn.lessons.length)}</span></div>
            <h1 class="hh-title reveal" data-large-title>${revealHTML(lesson.title.split(',')[0])}</h1>
            <p class="hh-sub">${esc(lesson.intro)}</p>
            <div class="hh-progress">${bar(lesson.pct, 'seg')}<span class="hud-label"><b class="num">${pct(lesson.pct)}</b> synced · ${Math.round(lesson.min * (1 - lesson.pct))} min left</span></div>
            <div class="hh-actions">
              <a class="btn btn-primary btn-lg" href="#lesson-backpropagation" data-hotkey="Enter">${icon('play', 'fill')}Continue mission <kbd class="only-wide">⏎</kbd></a>
              <a class="btn btn-ghost btn-lg" href="#lab-network">${icon('labs')}Enter simulator</a>
            </div>
            <div class="hh-rewards"><span class="hud-label">Rewards</span><span class="chip chip-ember">◆ +${lesson.xp} XP</span><span class="chip">${icon('trophy')}Trophy · Backprop by hand</span></div>
          </div>
          <aside class="player-card panel sq edge brackets" aria-label="Your rank">
            <div class="pc-top">
              ${emblem(u.level, 92)}
              <div class="pc-id">
                <div class="hud-label">Callsign</div>
                <div class="pc-name">${esc(u.callsign)}</div>
                <div class="pc-rank">${esc(u.rank)}</div>
              </div>
            </div>
            <div class="pc-xp">
              <div class="row-l"><span class="hud-label">Level ${u.level}</span><span class="hud-label num"><span data-xp-text>${u.xp.toLocaleString()}</span> / ${u.nextXp.toLocaleString()} XP</span></div>
              ${bar(u.xp / u.nextXp, 'xp seg')}
              <div class="t-cap">${u.nextXp - u.xp} XP to <b>${esc(u.nextRank)}</b></div>
            </div>
            <dl class="pc-stats">
              <div><dt>Combo</dt><dd class="num ember">${tickerHTML(u.streak)}<small>d</small></dd></div>
              <div><dt>Accuracy</dt><dd class="num">${tickerHTML(Math.round(u.accuracy * 100))}<small>%</small></dd></div>
              <div><dt>Cleared</dt><dd class="num">${tickerHTML(D.subjects.reduce((a, s) => a + s.done, 0))}</dd></div>
            </dl>
          </aside>
        </section>

        <div class="hub-grid stagger">
          <section class="card sq edge ops-card" style="--k:0" aria-labelledby="ops-h">
            <div class="card-head"><h2 id="ops-h">Daily ops</h2><span class="hud-label num">Resets in ${lh}h ${pad2(lm)}m</span></div>
            <ul class="ops">
              ${ops.map((o) => `<li class="op ${o.v >= o.g ? 'is-done' : ''}">
                <span class="op-ic">${icon(o.ic)}</span>
                <div class="op-main"><div class="op-t">${o.t}</div>${bar(Math.min(1, o.v / o.g), 'thin')}<div class="op-v hud-label num">${o.v} / ${o.g} ${o.unit}</div></div>
                <span class="chip chip-ember">+${o.xp}</span>
              </li>`).join('')}
            </ul>
          </section>

          <section class="card sq edge drills-card" style="--k:1" aria-labelledby="dr-h">
            <div class="card-head"><h2 id="dr-h">Drills ready</h2><span class="chip chip-warn">${icon('flame')}Combo ×${u.streak}</span></div>
            <div class="deck-visual" aria-hidden="true">
              ${[2, 1, 0].map((i) => `<span class="deck-card sq" style="--i:${i}" data-subject="${D.cards[i].s}"><span class="dc-rune">${'◆◇◈'[i]}</span></span>`).join('')}
            </div>
            <div class="drill-count"><span class="big num">${tickerHTML(due)}</span><span class="hud-label">cards · ~${Math.round(due * 0.6)} min</span></div>
            <a class="btn btn-ember" href="#review">${icon('bolt')}Start drill</a>
          </section>

          <section class="card sq edge intel-card" data-subject="calculus" style="--k:2" aria-labelledby="in-h">
            <div class="card-head"><h2 id="in-h">Intel · Codex</h2><span class="hud-label">Entry 014</span></div>
            <div class="hud-label" style="color:var(--c)">Chain rule</div>
            ${tex(String.raw`\frac{\partial L}{\partial w} = \frac{\partial L}{\partial a}\cdot\frac{\partial a}{\partial z}\cdot\frac{\partial z}{\partial w}`, true)}
            <p class="t-sub">Backpropagation is this rule applied layer by layer, from the loss back to the very first weights.</p>
            <a class="card-link" href="#lesson-${chain.id}">Open codex entry${icon('chevron-right')}</a>
          </section>
        </div>

        <section class="section" aria-labelledby="camp-h">
          <div class="section-head"><h2 id="camp-h" class="sec-title"><span class="hud-label ion">Campaign</span>Chapters</h2><a class="card-link" href="#subjects">World map${icon('chevron-right')}</a></div>
          <div class="chapter-strip">${D.subjects.map((s, i) => chapterCard(s, i, true)).join('')}</div>
        </section>

        <section class="section" aria-labelledby="sims-h">
          <div class="section-head"><h2 id="sims-h" class="sec-title"><span class="hud-label ion">Training</span>Simulators</h2><a class="card-link" href="#labs">All simulators${icon('chevron-right')}</a></div>
          <div class="sim-row">${['optimizer', 'matrix', 'regression'].map((id) => simCard(D.lab(id), true)).join('')}</div>
        </section>
      </div>`;

    return {
      title: 'Hub', html,
      mount(root) {
        runRings(root); E.runTickers(root); mountTilts(root);
        const offG = mountGlyphs(root);
        const onKey = (e) => { if (e.key === 'Enter' && !e.target.closest('input, textarea, button, a') && !document.querySelector('.overlay')) { location.hash = '#lesson-backpropagation'; } };
        document.addEventListener('keydown', onKey);
        return () => { offG(); document.removeEventListener('keydown', onKey); };
      },
    };
  }

  function chapterCard(s, i, small = false) {
    const status = s.progress >= 1 ? 'Cleared' : s.progress > 0.5 ? 'In progress' : s.progress > 0.05 ? 'Underway' : 'New';
    return `<a class="chapter-card sq edge tilt select-glow focus-in ${small ? 'is-small' : ''}" href="#subject-${s.id}" data-subject="${s.id}" data-vt="subject-${s.id}" style="--k:${i}">
      <div class="cc-art"><canvas data-glyph="${s.id}" aria-hidden="true"></canvas></div>
      <span class="cc-numeral" aria-hidden="true">${s.numeral}</span>
      <div class="cc-top"><span class="chip chip-glass">Chapter ${s.numeral}</span>${small ? '' : pips(s.difficulty)}</div>
      <div class="cc-body">
        <div class="hud-label cc-realm">${esc(s.realm)}</div>
        <h3 class="cc-title">${esc(s.title)}</h3>
        ${small ? '' : `<p class="t-sub">${esc(s.tagline)}</p>`}
        <div class="cc-meta hud-label"><span>${s.lessons.length} missions · ${status}</span><span class="num">${pct(s.progress)}</span></div>
        ${bar(s.progress, 'thin')}
      </div>
    </a>`;
  }

  function simCard(lab, small = false) {
    const s = D.subject(lab.subject);
    return `<a class="sim-card sq edge tilt select-glow focus-in ${small ? 'is-small' : ''}" href="#lab-${lab.id}" data-subject="${s.id}" data-vt="lab-${lab.id}">
      <div class="sc-art"><canvas data-glyph="${s.id}" aria-hidden="true"></canvas><span class="sc-code hud-label">${lab.code}</span><span class="sc-live"><i></i>Live</span></div>
      <div class="sc-body">
        <div class="hud-label" style="color:var(--c)">${esc(s.title)}</div>
        <h3 class="t-title3">${esc(lab.title)}</h3>
        <p class="t-foot">${esc(lab.blurb)}</p>
        <span class="sc-launch">Launch${icon('arrow-right')}</span>
      </div>
    </a>`;
  }

  /* =========================================================== CAMPAIGN */
  function subjects() {
    const total = D.subjects.reduce((a, s) => a + s.lessons.length, 0);
    const cleared = D.subjects.reduce((a, s) => a + s.done, 0);
    let here = 0; D.subjects.forEach((s, i) => { if (s.progress >= 0.1) here = i; });
    const html = `
      <div class="screen">
        ${head({ eyebrow: `6 chapters · ${total} missions · ${cleared} cleared`, title: 'Campaign', sub: 'Six realms stand between you and the Deep. Each chapter arms you for the next.' })}
        <section class="route panel sq edge brackets" aria-label="Campaign route">
          <div class="route-scroll">
            <ol class="route-line" style="--here:${here / 5}">
              ${D.subjects.map((s, i) => `<li class="node ${i <= here ? 'is-reached' : ''} ${i === here ? 'is-here' : ''}" data-subject="${s.id}">
                <a href="#subject-${s.id}">
                  ${i === here ? '<span class="here-tag hud-label">You are here</span>' : ''}
                  <span class="node-gem">${ring(s.progress, 64, 3, 'var(--c)')}<span class="node-ic">${icon(s.icon)}</span></span>
                  <span class="node-num hud-label">${s.numeral}</span>
                  <span class="node-name">${esc(s.title)}</span>
                  <span class="node-pct hud-label num">${pct(s.progress)}</span>
                </a></li>`).join('')}
            </ol>
          </div>
        </section>
        <div class="chapter-grid stagger">${D.subjects.map((s, i) => chapterCard(s, i)).join('')}</div>
      </div>`;
    return { title: 'Campaign', html, mount(root) { runRings(root); mountTilts(root); return mountGlyphs(root); } };
  }

  /* ============================================================== REALM */
  function subject(id) {
    const s = D.subject(id);
    if (!s) return notFound();
    const html = `
      <div class="screen realm" data-subject="${s.id}">
        <section class="realm-hero" data-vt="subject-${s.id}">
          <div class="rh-art"><canvas data-glyph="${s.id}" aria-hidden="true"></canvas><span class="rh-numeral" aria-hidden="true">${s.numeral}</span></div>
          <div class="rh-copy">
            <div class="hud-label rh-kicker">Chapter ${s.numeral} · ${esc(s.realm)}</div>
            <h1 class="t-mega reveal" data-large-title>${revealHTML(s.title)}</h1>
            <p class="rh-about">${esc(s.about)}</p>
            <dl class="rh-stats">
              <div><dt>Missions</dt><dd class="num">${tickerHTML(s.lessons.length)}</dd></div>
              <div><dt>Est. time</dt><dd>${fmtMin(s.minutes)}</dd></div>
              <div><dt>Synced</dt><dd class="num">${tickerHTML(pct(s.progress))}</dd></div>
              <div><dt>Threat</dt><dd>${pips(s.difficulty)}</dd></div>
            </dl>
            <div class="rh-actions">
              <a class="btn btn-subject btn-lg" href="#lesson-${s.next.id}">${icon('play', 'fill')}Deploy · ${esc(s.next.title)}</a>
            </div>
          </div>
        </section>
        <div class="acts stagger">
          ${s.units.map((u, ui) => {
            const done = u.lessons.filter((l) => l.status === 'done').length;
            const prog = (done + u.lessons.reduce((a, l) => a + (l.status === 'current' ? l.pct || 0 : 0), 0)) / u.lessons.length;
            return `<section class="act panel sq edge brackets" style="--k:${ui}" aria-labelledby="act-${ui}">
              <header class="act-head">
                <span class="act-num">Act ${['I', 'II', 'III', 'IV'][ui]}</span>
                <h2 class="t-title2" id="act-${ui}">${esc(u.title)}</h2>
                <div class="act-prog">${ring(prog, 36, 3, 'var(--c)')}<span class="hud-label num">${done}/${u.lessons.length} cleared</span></div>
              </header>
              <div class="rows">
                ${u.lessons.map((l) => {
                  const inner = `${statusIcon(l.status)}<span class="m-code hud-label num">M${pad2(l.n)}</span><div class="row-main"><div class="row-title">${esc(l.title)}${l.boss ? ' <span class="chip chip-boss">Boss</span>' : ''}</div><div class="row-sub">${l.min} min · ${statusText(l)}${l.lab ? ' · Sim' : ''}</div></div><span class="chip chip-ember m-xp">+${l.xp} XP</span>`;
                  return l.status === 'locked' ? `<div class="row sq is-locked" aria-disabled="true">${inner}</div>` : `<a class="row sq" href="#lesson-${l.id}">${inner}${icon('chevron-right', 'chev')}</a>`;
                }).join('')}
              </div>
            </section>`;
          }).join('')}
        </div>
      </div>`;
    return {
      title: s.title, back: { href: '#subjects', label: 'Campaign' }, html,
      mount(root) { runRings(root); E.runTickers(root); E.Ambient.focus(colorOf(s)); const off = mountGlyphs(root); return () => { off(); E.Ambient.focus(null); }; },
    };
  }

  /* ============================================================ MISSION */
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
      <div class="screen mission" data-subject="${s.id}">
        <div class="read-progress" aria-hidden="true"><i></i></div>
        <header class="mission-head">
          <nav class="crumbs hud-label" aria-label="Breadcrumb"><a href="#subjects">Campaign</a>${icon('chevron-right', 'sm')}<a href="#subject-${s.id}">Ch. ${s.numeral} ${esc(s.title)}</a>${icon('chevron-right', 'sm')}<span>Act ${['I', 'II', 'III'][l.unit]}</span></nav>
          <div class="mh-code"><span class="hud-label" style="color:var(--c)">Mission ${pad2(l.n)}</span>${l.boss ? '<span class="chip chip-boss">Boss mission</span>' : ''}</div>
          <h1 class="t-hero reveal" data-large-title>${revealHTML(l.title)}</h1>
          <div class="mission-meta">
            ${realmChip(s)}
            <span class="chip">${icon('clock')}${l.min} min</span>
            ${lab ? `<span class="chip">${icon('labs')}Simulator</span>` : ''}
            <span class="chip chip-ember">◆ +${l.xp} XP</span>
            ${l.status === 'done' ? `<span class="chip chip-good">${icon('check')}Cleared</span>` : ''}
          </div>
        </header>
        <div class="mission-layout">
          <article class="prose panel sq edge">${sections.map((x, k) => `<section id="${x.id}" class="prose-section" aria-labelledby="${x.id}-h"><div class="obj-tag hud-label">Objective ${pad2(k + 1)}</div><h2 id="${x.id}-h" class="t-title2">${x.title}</h2>${x.body}</section>`).join('')}</article>
          <aside class="objectives" aria-label="Objectives">
            <div class="obj-panel panel sq edge brackets">
              <div class="hud-label ion">Objectives</div>
              <nav class="obj-list"><span class="obj-indicator" aria-hidden="true"></span>${sections.map((x) => `<a href="#${x.id}" data-toc="${x.id}"><span class="obj-box">${icon('check')}</span><span>${x.title}</span></a>`).join('')}</nav>
              <div class="obj-progress"><div class="row-l"><span class="hud-label">Sync</span><span class="hud-label num read-pct">0%</span></div><div class="bar thin read-bar"><i></i></div></div>
              <div class="obj-reward"><span class="hud-label">On completion</span><span class="chip chip-ember">◆ +${l.xp} XP</span></div>
            </div>
          </aside>
        </div>
        <footer class="mission-foot">
          <button type="button" class="btn ${l.status === 'done' ? 'btn-gray' : 'btn-ember'} btn-lg complete-btn" ${l.status === 'done' ? 'disabled' : ''}>${icon('check')}${l.status === 'done' ? 'Mission cleared' : 'Complete mission'}</button>
          <div class="pn">
            ${prev ? `<a class="pn-card panel sq edge pressable focus-in" href="#lesson-${prev.id}"><span class="hud-label">${icon('chevron-left', 'sm')} M${pad2(prev.n)} · Previous</span><span class="t-head">${esc(prev.title)}</span></a>` : '<span></span>'}
            ${next ? (next.status === 'locked' ? `<div class="pn-card panel sq edge is-next is-locked"><span class="hud-label">M${pad2(next.n)} · Locked ${icon('lock', 'sm')}</span><span class="t-head">${esc(next.title)}</span></div>` : `<a class="pn-card panel sq edge pressable focus-in is-next" href="#lesson-${next.id}"><span class="hud-label">M${pad2(next.n)} · Next ${icon('chevron-right', 'sm')}</span><span class="t-head">${esc(next.title)}</span></a>`) : ''}
          </div>
        </footer>
      </div>`;

    return {
      title: l.title, back: { href: `#subject-${s.id}`, label: s.short }, html,
      mount(root) {
        const cleanups = [];
        E.Ambient.focus(colorOf(s)); cleanups.push(() => E.Ambient.focus(null));
        const host = root.querySelector('.lab-embed');
        if (host && lab) cleanups.push(E.Labs.mount(lab.id, host, { compact: true, prefix: 'embed' }));
        root.querySelectorAll('.lr-spark').forEach((svg) => drawSpark(svg, svg.dataset.kind));
        root.querySelectorAll('.boss').forEach((b) => { wireBoss(b); cleanups.push(() => b._cleanup && b._cleanup()); });
        const cb = root.querySelector('.complete-btn');
        cb.addEventListener('click', () => {
          cb.disabled = true; cb.classList.replace('btn-ember', 'btn-gray');
          cb.innerHTML = `${icon('check')}Mission cleared`;
          showResults({ kicker: `Mission ${pad2(l.n)} · Ch. ${s.numeral}`, title: 'Mission complete', xp: l.xp, detail: l.title });
        });
        // reading sync + objectives
        const fill = root.querySelector('.read-progress i'), rbar = root.querySelector('.read-bar'), rpct = root.querySelector('.read-pct');
        const article = root.querySelector('.prose');
        const list = root.querySelector('.obj-list'), links = [...root.querySelectorAll('[data-toc]')];
        const liq = new E.Liquid(list, root.querySelector('.obj-indicator'), { axis: 'y' });
        let active = null;
        const onScroll = () => {
          const r = article.getBoundingClientRect();
          const p = E.clamp((innerHeight * 0.35 - r.top) / Math.max(1, r.height - innerHeight * 0.4), 0, 1);
          fill.style.transform = `scaleX(${p})`; rbar.style.setProperty('--p', p); rpct.textContent = Math.round(p * 100) + '%';
          let cur = links[0], ci = 0;
          links.forEach((a, k) => { const sec = root.querySelector('#' + a.dataset.toc); if (sec && sec.getBoundingClientRect().top < innerHeight * 0.4) { cur = a; ci = k; } });
          links.forEach((a, k) => a.classList.toggle('is-done', k < ci || p > 0.98));
          if (cur !== active) { active = cur; links.forEach((a) => a.classList.toggle('is-active', a === cur)); liq.moveTo(cur); }
        };
        links.forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t = root.querySelector('#' + a.dataset.toc); if (t) t.scrollIntoView({ behavior: E.reducedMotion() ? 'auto' : 'smooth', block: 'start' }); }));
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
        <p>The terrain behind this page is a loss surface. The glowing lines join points of equal loss, and the beacon marks the deepest valley: the minimum you are descending toward.</p>` },
      { id: 'rule', title: 'The update rule', body: `
        <div class="formula-card sq">${tex(l.tex, true)}</div>
        <dl class="terms">
          <div><dt>${tex(String.raw`\boldsymbol\theta_t`)}</dt><dd>The parameters after <i>t</i> steps: every weight and bias.</dd></div>
          <div><dt>${tex(String.raw`\eta`)}</dt><dd>The learning rate. It scales every step.</dd></div>
          <div><dt>${tex(String.raw`\nabla J(\boldsymbol\theta_t)`)}</dt><dd>The gradient of the loss at the current parameters.</dd></div>
        </dl>
        <p>Every optimizer in this campaign, including momentum and Adam, is a refinement of this one line.</p>` },
      { id: 'try', title: 'Enter the simulator', body: `
        <p>Three optimizers start from the same point. Click the surface to move the start, raise the step size, and watch plain SGD start to zig-zag across the valley.</p>
        <div class="lab-embed" aria-label="${esc(lab.title)} simulator"></div>` },
      { id: 'rate', title: 'Choosing the learning rate', body: `
        <div class="lr-grid">
          ${[['slow', 'Too small', 'Each step barely moves. The loss falls, but it takes thousands of steps.'], ['good', 'About right', 'The loss drops quickly, then levels off near the minimum.'], ['diverge', 'Too large', 'Steps overshoot the valley floor. The loss oscillates or grows without bound.']]
            .map(([k, t, d]) => `<div class="lr-card sq edge" data-kind="${k}"><svg class="lr-spark" data-kind="${k}" viewBox="0 0 160 64" role="img" aria-label="Loss curve: ${t.toLowerCase()} learning rate"></svg><div class="hud-label lr-t">${t}</div><p class="t-foot">${d}</p></div>`).join('')}
        </div>` },
      { id: 'boss', title: 'Boss encounter', body: bossHTML({
          name: 'The Oscillator', lore: 'It feeds on oversized steps, bouncing from wall to wall of the valley and never landing.',
          q: 'Your loss jumps up and down from one step to the next and never settles. What is the most likely fix?',
          options: [
            ['Increase the learning rate', 'A bigger step makes the overshooting worse. The Oscillator grows stronger.'],
            ['Decrease the learning rate', 'Critical hit. Smaller steps stop you from jumping across the valley floor.', true],
            ['Train for more steps', 'More steps of the same size keep oscillating. No damage.'],
            ['Remove the bias term', 'The bias is not what makes the steps too large. No damage.'],
          ],
          xp: 30,
        }) },
      { id: 'recap', title: 'Debrief', body: `
        <ul class="takeaways">
          <li>${icon('check')}<span>Move against the gradient: ${tex(String.raw`\boldsymbol\theta \leftarrow \boldsymbol\theta - \eta\,\nabla J(\boldsymbol\theta)`)}.</span></li>
          <li>${icon('check')}<span>The learning rate sets the step size. Too small is slow; too large diverges.</span></li>
          <li>${icon('check')}<span>Narrow valleys make plain gradient descent zig-zag. Momentum and Adam fix that, and they are your next missions.</span></li>
        </ul>` },
    ];
  }

  function genericSections(l, s, lab) {
    const unit = s.units[l.unit];
    const out = [
      { id: 'overview', title: 'Briefing', body: `<p class="lead">${esc(l.intro)}</p>` },
      { id: 'key', title: 'Key equation', body: `<div class="formula-card sq">${tex(l.tex, true)}</div>` },
    ];
    if (lab) out.push({ id: 'try', title: 'Enter the simulator', body: `<p>${esc(lab.blurb)}</p><div class="lab-embed" aria-label="${esc(lab.title)} simulator"></div>` });
    out.push({ id: 'unit', title: `Act ${['I', 'II', 'III'][l.unit]} · ${esc(unit.title)}`, body: `<div class="rows">${unit.lessons.map((x) => {
      const inner = `${statusIcon(x.status)}<span class="m-code hud-label num">M${pad2(x.n)}</span><div class="row-main"><div class="row-title">${esc(x.title)}</div><div class="row-sub">${x.min} min · ${statusText(x)}</div></div>`;
      return x.id === l.id ? `<div class="row sq is-here" aria-current="page">${inner}<span class="chip chip-subject">You are here</span></div>` : x.status === 'locked' ? `<div class="row sq is-locked">${inner}</div>` : `<a class="row sq" href="#lesson-${x.id}">${inner}${icon('chevron-right', 'chev')}</a>`;
    }).join('')}</div>` });
    return out;
  }

  function bossHTML({ name, lore, q, options, xp }) {
    return `<div class="boss panel sq edge brackets" data-xp="${xp}" role="group" aria-label="Boss encounter: ${esc(name)}">
      <div class="boss-flash" aria-hidden="true"></div>
      <div class="boss-head">
        <div class="boss-portrait" aria-hidden="true"><canvas class="boss-canvas"></canvas></div>
        <div class="boss-id">
          <div class="hud-label" style="color:var(--bad)">Boss</div>
          <div class="boss-name">${esc(name)}</div>
          <p class="t-foot">${esc(lore)}</p>
        </div>
        <div class="boss-hp"><div class="row-l"><span class="hud-label">HP</span><span class="hud-label num hp-num">100 / 100</span></div><div class="bar hp" style="--p:1"><i></i></div></div>
      </div>
      <p class="quiz-q">${esc(q)}</p>
      <div class="quiz-opts">
        ${options.map(([t, fb, ok], i) => `<button type="button" class="quiz-opt sq" data-ok="${ok ? 1 : 0}" data-fb="${esc(fb)}"><span class="qo-key">${'ABCD'[i]}</span><span class="qo-text">${esc(t)}</span><span class="qo-mark" aria-hidden="true"></span></button>`).join('')}
      </div>
      <p class="quiz-fb" aria-live="polite"></p>
      <div class="dmg" aria-hidden="true"></div>
    </div>`;
  }
  function wireBoss(b) {
    const fb = b.querySelector('.quiz-fb'), hp = b.querySelector('.bar.hp'), num = b.querySelector('.hp-num'), dmg = b.querySelector('.dmg');
    // the boss: an oscillating trajectory that never settles, until defeated
    const cv = b.querySelector('.boss-canvas');
    const fc = E.fitCanvas(cv, () => {});
    let dead = false, deadT = 0;
    const loop = E.visibleLoop(cv, (t) => {
      if (!fc.w) return;
      const { ctx, w, h } = fc; ctx.clearRect(0, 0, w, h);
      const C = E.Theme.colors();
      const amp = dead ? Math.max(0, 1 - (t - deadT) * 0.8) : 1;
      ctx.strokeStyle = E.alpha(C.bad, 0.25); ctx.lineWidth = 1;
      for (let r = 1; r <= 4; r++) { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, r * w * 0.11, r * h * 0.07, 0, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = dead ? C.good : C.bad; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k <= 40; k++) { const x = w * 0.12 + (k / 40) * w * 0.76, y = h / 2 + Math.sin(k * 1.6 + t * 6) * h * 0.32 * amp * (1 - k / 60); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      if (dead && !deadT) deadT = t;
    });
    b._cleanup = () => { loop.stop(); fc.destroy(); };
    b.querySelectorAll('.quiz-opt').forEach((o) => o.addEventListener('click', () => {
      if (b.classList.contains('is-defeated')) return;
      const ok = o.dataset.ok === '1';
      o.classList.remove('is-wrong'); b.classList.remove('is-hit', 'is-miss'); void o.offsetWidth;
      o.classList.add(ok ? 'is-right' : 'is-wrong');
      o.querySelector('.qo-mark').innerHTML = icon(ok ? 'check' : 'xmark');
      fb.textContent = o.dataset.fb; fb.dataset.state = ok ? 'good' : 'bad';
      dmg.textContent = ok ? '−100' : 'MISS'; dmg.dataset.kind = ok ? 'hit' : 'miss';
      dmg.classList.remove('is-on'); void dmg.offsetWidth; dmg.classList.add('is-on');
      b.classList.add(ok ? 'is-hit' : 'is-miss');
      if (ok) {
        sfx('hit');
        hp.style.setProperty('--p', 0); num.textContent = '0 / 100';
        b.classList.add('is-defeated'); dead = true;
        setTimeout(() => { E.toast(`Boss defeated · +${b.dataset.xp} XP`, 'trophy'); sfx('reward'); }, 500);
      } else sfx('miss');
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

  /* ========================================================= SIMULATORS */
  function labs() {
    const html = `
      <div class="screen">
        ${head({ eyebrow: 'Training grounds', title: 'Simulators', sub: 'Six live instruments for building intuition. Every one runs in real time, right here.' })}
        <div class="sim-grid stagger">${D.labs.map((lab, i) => `<div style="--k:${i}">${simCard(lab)}</div>`).join('')}</div>
      </div>`;
    return { title: 'Simulators', html, mount(root) { mountTilts(root); return mountGlyphs(root); } };
  }

  function labView(id) {
    const lab = D.lab(id);
    if (!lab) return notFound();
    const s = D.subject(lab.subject);
    const related = s.lessons.filter((l) => l.lab === id);
    const html = `
      <div class="screen lab-screen" data-subject="${s.id}">
        <header class="page-head lab-head">
          <nav class="crumbs hud-label" aria-label="Breadcrumb"><a href="#labs">Simulators</a>${icon('chevron-right', 'sm')}<span style="color:var(--c)">${lab.code}</span>${icon('chevron-right', 'sm')}<a href="#subject-${s.id}">${esc(s.title)}</a></nav>
          <h1 class="t-hero reveal" data-large-title>${revealHTML(lab.title)}</h1>
          <p class="page-sub">${esc(lab.blurb)}</p>
        </header>
        <div class="lab-host" data-vt="lab-${lab.id}"></div>
        ${related.length ? `<section class="section related" aria-labelledby="rel-h">
          <div class="section-head"><h2 id="rel-h" class="sec-title"><span class="hud-label ion">Linked</span>Missions using this simulator</h2></div>
          <div class="rows">${related.map((l) => `<a class="row sq" href="#lesson-${l.id}">${statusIcon(l.status)}<span class="m-code hud-label num">M${pad2(l.n)}</span><div class="row-main"><div class="row-title">${esc(l.title)}</div><div class="row-sub">${esc(l.unitTitle)} · ${l.min} min</div></div><span class="chip chip-ember m-xp">+${l.xp} XP</span>${icon('chevron-right', 'chev')}</a>`).join('')}</div>
        </section>` : ''}
      </div>`;
    return {
      title: lab.title, back: { href: '#labs', label: 'Simulators' }, html,
      mount(root) { E.Ambient.focus(colorOf(s)); const off = E.Labs.mount(id, root.querySelector('.lab-host'), { prefix: 'lab' }); return () => { off(); E.Ambient.focus(null); }; },
    };
  }

  /* ============================================================= DRILLS */
  const RATINGS = [
    { key: 'again', label: 'Again', hint: '< 1 min', cls: 'r-again', dir: [-1, 0] },
    { key: 'hard', label: 'Hard', hint: '6 min', cls: 'r-hard', dir: [-0.4, 1] },
    { key: 'good', label: 'Good', hint: '10 min', cls: 'r-good', dir: [1, 0] },
    { key: 'easy', label: 'Easy', hint: '4 days', cls: 'r-easy', dir: [0, -1] },
  ];
  function review() {
    const html = `
      <div class="screen drills">
        ${head({ eyebrow: 'Spaced repetition · mixed deck', title: 'Drills', size: 't-large' })}
        <div class="drill-hud panel sq edge">
          <div class="dh-cell"><span class="hud-label">Card</span><b class="num" id="rv-count">1 / 12</b></div>
          <div class="dh-bar"><div class="bar thin seg" id="rv-bar"><i></i></div></div>
          <div class="dh-cell"><span class="hud-label">Combo</span><b class="num combo-num" id="rv-combo">×0</b></div>
          <div class="dh-cell"><span class="hud-label">Score</span><b class="num" id="rv-score">0</b></div>
        </div>
        <div class="deck" id="deck" aria-live="polite"></div>
        <div class="review-actions" id="rv-actions"></div>
        <p class="t-foot review-hint only-wide">Space flips the card. Keys 1–4 rate it. Drag right for Good, left for Again.</p>
        <p class="t-foot review-hint only-compact">Tap to flip. Swipe right for Good, left for Again.</p>
      </div>`;
    return {
      title: 'Drills', html,
      mount(root) {
        const deck = root.querySelector('#deck'), actions = root.querySelector('#rv-actions');
        const cards = D.cards.slice();
        let i = 0, flipped = false, busy = false, topEl = null, combo = 0, best = 0, score = 0;
        const tally = { again: 0, hard: 0, good: 0, easy: 0 };
        const rarity = (k) => ['common', 'rare', 'epic', 'legendary'][k % 4];

        const cardHTML = (c, k, idx) => {
          const s = D.subject(c.s), r = rarity(idx * 7 + 3);
          return `<div class="flash" data-subject="${c.s}" data-rarity="${r}" style="--depth:${k}" ${k ? 'aria-hidden="true"' : ''}>
            <div class="flash-inner">
              <div class="face front sq">
                <div class="face-top">${realmChip(s, false)}<span class="rarity hud-label">${r}</span></div>
                <div class="face-glyph" aria-hidden="true">${icon(s.icon)}</div>
                <p class="flash-q">${esc(c.q)}</p>
                <div class="face-foot hud-label">${icon('flip', 'sm')} Flip to reveal</div>
              </div>
              <div class="face back sq">
                <div class="face-top">${realmChip(s, false)}<span class="rarity hud-label">Answer</span></div>
                <p class="flash-a">${esc(c.a)}</p>
                ${c.tex ? `<div class="flash-tex">${tex(c.tex, true)}</div>` : ''}
              </div>
            </div>
            <div class="swipe-tint" aria-hidden="true"><span class="st-good">Good</span><span class="st-again">Again</span></div>
          </div>`;
        };
        function hud() {
          root.querySelector('#rv-count').textContent = `${Math.min(i + 1, cards.length)} / ${cards.length}`;
          root.querySelector('#rv-bar').style.setProperty('--p', i / cards.length);
          const cEl = root.querySelector('#rv-combo'); cEl.textContent = '×' + combo; cEl.classList.toggle('is-hot', combo >= 3);
          root.querySelector('#rv-score').textContent = score.toLocaleString();
        }
        function renderDeck() {
          hud();
          if (i >= cards.length) return done();
          deck.innerHTML = cards.slice(i, i + 3).map((c, k) => cardHTML(c, k, i + k)).reverse().join('');
          topEl = deck.lastElementChild;
          E.renderMath(deck);
          flipped = false; setActions(); wireTop();
        }
        function setActions() {
          actions.innerHTML = flipped
            ? `<div class="rate-row">${RATINGS.map((r, k) => `<button type="button" class="rate ${r.cls}" data-rate="${r.key}"><span class="rate-label">${r.label}</span><span class="rate-hint">${r.hint}</span><kbd class="only-wide">${k + 1}</kbd></button>`).join('')}</div>`
            : `<button type="button" class="btn btn-ghost btn-lg flip-btn">${icon('flip')}Reveal answer <kbd class="only-wide">Space</kbd></button>`;
          actions.querySelectorAll('[data-rate]').forEach((b) => b.addEventListener('click', () => rate(b.dataset.rate)));
          const fb = actions.querySelector('.flip-btn'); if (fb) fb.addEventListener('click', flip);
        }
        function flip() {
          const t = topEl; if (!t || busy) return;
          flipped = !flipped; t.classList.toggle('is-flipped', flipped); setActions(); sfx('flip');
        }
        function pop(text, kind) {
          const el = document.createElement('div'); el.className = 'combo-pop ' + kind; el.textContent = text;
          deck.appendChild(el); setTimeout(() => el.remove(), 1000);
        }
        function rate(key, fromSwipe) {
          const t = topEl; if (!t || busy) return;
          busy = true; tally[key]++;
          if (key === 'good' || key === 'easy') { combo++; best = Math.max(best, combo); score += (key === 'easy' ? 150 : 100) * Math.max(1, combo); if (combo >= 2) pop(`Combo ×${combo}`, 'hot'); sfx('confirm'); }
          else { if (combo >= 3) pop('Combo broken', 'cold'); combo = 0; score += key === 'hard' ? 40 : 0; sfx('miss'); }
          const r = RATINGS.find((x) => x.key === key);
          const dist = Math.max(innerWidth, 900);
          const anim = t.animate([
            { transform: t.style.transform || 'none', opacity: 1 },
            { transform: `translate(${r.dir[0] * dist * 0.8}px, ${r.dir[1] * 420}px) rotate(${r.dir[0] * 18}deg)`, opacity: 0 },
          ], { duration: fromSwipe ? 380 : 460, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' });
          deck.querySelectorAll('.flash').forEach((f) => { if (f !== t) f.style.setProperty('--depth', (parseInt(f.style.getPropertyValue('--depth'), 10) || 0) - 1); });
          anim.onfinish = () => { busy = false; i++; renderDeck(); };
          hud();
        }
        function wireTop() {
          const t = topEl; if (!t) return;
          let sx = 0, sy = 0, dx = 0, dragging = false, moved = false;
          t.addEventListener('click', (e) => { if (!moved) flip(); e.stopPropagation(); });
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
            const from = t.style.transform;
            t.style.transform = ''; t.style.setProperty('--swipe-good', 0); t.style.setProperty('--swipe-again', 0);
            if (from) t.animate([{ transform: from }, { transform: 'none' }], { duration: 600, easing: getComputedStyle(document.documentElement).getPropertyValue('--spring-bouncy').trim() || 'ease-out' });
            setTimeout(() => (moved = false), 0);
          };
          t.addEventListener('pointerup', end); t.addEventListener('pointercancel', end);
        }
        function done() {
          const total = cards.length;
          const goodRate = (tally.good + tally.easy) / total;
          const grade = goodRate >= 0.9 ? 'S' : goodRate >= 0.75 ? 'A' : goodRate >= 0.5 ? 'B' : 'C';
          deck.innerHTML = `<div class="review-done panel sq edge brackets">
            <div class="hud-label ember">Drill complete</div>
            <div class="grade" data-g="${grade}">${grade}</div>
            <div class="rd-stats"><div><span class="hud-label">Score</span><b class="num">${score.toLocaleString()}</b></div><div><span class="hud-label">Best combo</span><b class="num">×${best}</b></div><div><span class="hud-label">Recall</span><b class="num">${Math.round(goodRate * 100)}%</b></div></div>
            <div class="rd-dist">${RATINGS.map((r) => `<div class="rd-row"><span class="rd-l hud-label">${r.label}</span><div class="bar ${r.cls}" data-p="${(tally[r.key] / total).toFixed(3)}"><i></i></div><span class="num rd-n">${tally[r.key]}</span></div>`).join('')}</div>
          </div>`;
          actions.innerHTML = `<div class="btn-row center"><button type="button" class="btn btn-ghost btn-lg again-btn">${icon('reset')}Run again</button><a class="btn btn-primary btn-lg" href="#today">Return to hub</a></div>`;
          actions.querySelector('.again-btn').addEventListener('click', () => { i = 0; combo = 0; best = 0; score = 0; Object.keys(tally).forEach((k) => (tally[k] = 0)); renderDeck(); });
          runRings(deck);
          setTimeout(() => showResults({ kicker: `Drill complete · grade ${grade}`, title: 'Drill cleared', xp: total * 5, detail: `${total} cards · best combo ×${best}` }), 900);
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

  /* ============================================================ PROFILE */
  function progress() {
    const u = D.user, act = D.activity;
    const totalMin = act.reduce((a, d) => a + d.min, 0) + 2400;
    const lessonsDone = D.subjects.reduce((a, s) => a + s.done, 0);
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
    const heat = `<svg class="heatmap" viewBox="0 0 ${hmW} ${hmH}" role="img" aria-label="Daily training minutes over the last ${Math.round(act.length / 7)} weeks">
      ${monthLabels}
      ${['Mon', '', 'Wed', '', 'Fri', '', ''].map((d, r) => (d ? `<text x="0" y="${padT + r * (cs + gap) + 10}" class="axis-label">${d}</text>` : '')).join('')}
      ${cells.map((c) => `<rect x="${padL + c.col * (cs + gap)}" y="${padT + c.row * (cs + gap)}" width="${cs}" height="${cs}" rx="3" class="hm l${level(c.min)}" data-tip="<b>${c.min ? c.min + ' min' : 'No training'}</b> · ${c.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}"/>`).join('')}
    </svg>`;

    // radar: completion per realm
    const R = 92, cx = 150, cy = 128, n = D.subjects.length;
    const ang = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
    const pt = (i, v) => [cx + Math.cos(ang(i)) * R * v, cy + Math.sin(ang(i)) * R * v];
    const poly = D.subjects.map((s, i) => pt(i, Math.max(0.04, s.progress)).map((x) => x.toFixed(1)).join(',')).join(' ');
    const radar = `<svg class="radar" viewBox="-50 0 400 262" role="img" aria-label="Completion by realm: ${D.subjects.map((s) => `${s.title} ${pct(s.progress)}`).join(', ')}">
      ${[0.25, 0.5, 0.75, 1].map((v) => `<polygon class="radar-ring" points="${D.subjects.map((_, i) => pt(i, v).join(',')).join(' ')}"/>`).join('')}
      ${D.subjects.map((_, i) => `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${pt(i, 1)[0]}" y2="${pt(i, 1)[1]}"/>`).join('')}
      <polygon class="radar-area" points="${poly}"/>
      ${D.subjects.map((s, i) => { const [x, y] = pt(i, Math.max(0.04, s.progress)); return `<circle cx="${x}" cy="${y}" r="4" class="radar-pt" style="fill:var(--c-${s.color})"/>`; }).join('')}
      ${D.subjects.map((s, i) => { const [x, y] = pt(i, 1.2); const a = Math.cos(ang(i)); return `<text x="${x}" y="${y + 3}" text-anchor="${a > 0.3 ? 'start' : a < -0.3 ? 'end' : 'middle'}" class="radar-label">${s.short} <tspan class="radar-val">${pct(s.progress)}</tspan></text>`; }).join('')}
    </svg>`;

    const weeks = [];
    for (let w = 0; w < 12; w++) weeks.unshift(act.slice(Math.max(0, act.length - 7 * (w + 1)), act.length - 7 * w).reduce((a, d) => a + d.min, 0));
    const WW = 520, WH = 200, pl = 36, pr = 44, pt2 = 14, pb = 24;
    const wmax = Math.ceil(Math.max(...weeks) / 100) * 100;
    const wx = (i) => pl + (i / (weeks.length - 1)) * (WW - pl - pr), wy = (v) => pt2 + (1 - v / wmax) * (WH - pt2 - pb);
    const line = weeks.map((v, i) => `${i ? 'L' : 'M'}${wx(i).toFixed(1)} ${wy(v).toFixed(1)}`).join('');
    const weekly = `<svg class="weekly" viewBox="0 0 ${WW} ${WH}" role="img" aria-label="Minutes trained per week, last 12 weeks">
      ${[0, wmax / 2, wmax].map((t) => `<line x1="${pl}" x2="${WW - pr}" y1="${wy(t)}" y2="${wy(t)}" class="grid-line"/><text x="${pl - 8}" y="${wy(t) + 4}" text-anchor="end" class="axis-label">${t}</text>`).join('')}
      <path d="${line}L${wx(weeks.length - 1)} ${wy(0)}L${wx(0)} ${wy(0)}Z" class="area"/>
      <path d="${line}" class="line"/>
      <text x="${wx(0)}" y="${WH - 6}" class="axis-label">12 wk ago</text><text x="${wx(weeks.length - 1)}" y="${WH - 6}" text-anchor="end" class="axis-label">This week</text>
      ${weeks.map((v, i) => `<g data-tip="<b>${v} min</b> · ${i === weeks.length - 1 ? 'this week' : weeks.length - 1 - i + ' wk ago'}"><rect x="${wx(i) - 18}" y="${pt2}" width="36" height="${WH - pt2 - pb}" class="hit"/><circle cx="${wx(i)}" cy="${wy(v)}" r="${i === weeks.length - 1 ? 5 : 3.5}" class="pt ${i === weeks.length - 1 ? 'is-end' : ''}"/></g>`).join('')}
      <text x="${wx(weeks.length - 1) + 10}" y="${wy(weeks[weeks.length - 1]) + 4}" class="value-label">${weeks[weeks.length - 1]}</text>
    </svg>`;

    const trophies = [
      { t: '21-day combo', d: 'Train 21 days in a row', i: 'flame', on: true, r: 'epic' },
      { t: 'Centurion', d: 'Solve 300 problems', i: 'target', on: true, r: 'rare' },
      { t: 'Matrix motion', d: 'Clear Act II of The Lattice', i: 'subj-la', on: true, r: 'rare' },
      { t: 'Chain reaction', d: 'Clear the Chain rule mission', i: 'subj-calc', on: true, r: 'common' },
      { t: 'Backprop by hand', d: 'Clear Backpropagation', i: 'subj-nn', on: false, r: 'epic' },
      { t: 'Into the Deep', d: 'Defeat the final boss of Chapter VI', i: 'subj-dl', on: false, r: 'legendary' },
    ];

    const html = `
      <div class="screen profile">
        <section class="profile-banner panel sq edge brackets">
          <div class="pb-emblem">${emblem(u.level, 140)}</div>
          <div class="pb-id">
            <div class="hud-label ion">Operator profile · sample data</div>
            <h1 class="t-hero reveal" data-large-title>${revealHTML(u.callsign)}</h1>
            <div class="pb-rank"><span class="chip chip-ember">Lv ${u.level}</span><span class="pb-rank-name">${esc(u.rank)}</span></div>
            <div class="pb-xp">
              <div class="row-l"><span class="hud-label num"><span data-xp-text>${u.xp.toLocaleString()}</span> / ${u.nextXp.toLocaleString()} XP</span><span class="hud-label">Next · ${esc(u.nextRank)}</span></div>
              ${bar(u.xp / u.nextXp, 'xp seg')}
            </div>
          </div>
          <dl class="pb-stats">
            ${[['Combo', u.streak, `Best ${u.best}`, 'flame', 'var(--ember)'], ['Hours', (totalMin / 60).toFixed(1), 'Trained', 'clock', 'var(--ion-hi)'], ['Cleared', lessonsDone, `of ${D.subjects.reduce((a, s) => a + s.lessons.length, 0)} missions`, 'book', 'var(--good)'], ['Drilled', '1,284', '87% recall', 'review', 'var(--c-nn)']]
              .map(([l, v, sub, ic, c]) => `<div class="pbs" style="--tint:${c}"><span class="pbs-ic">${icon(ic)}</span><dd class="num">${tickerHTML(v)}</dd><dt>${l}</dt><span class="t-cap">${sub}</span></div>`).join('')}
          </dl>
        </section>
        <div class="profile-grid stagger">
          <section class="card sq edge radar-card" style="--k:0" aria-labelledby="rd-h"><div class="card-head"><h2 id="rd-h">Realm mastery</h2></div>${radar}</section>
          <section class="card sq edge weekly-card" style="--k:1" aria-labelledby="wk-h"><div class="card-head"><h2 id="wk-h">Training volume</h2><span class="hud-label">Min / week</span></div><div class="chart-host" data-tip-host>${weekly}</div></section>
          <section class="card sq edge heat-card" style="--k:2" aria-labelledby="hm-h" data-tip-host>
            <div class="card-head"><h2 id="hm-h">Service record</h2><div class="hm-legend t-cap"><span>Less</span>${[0, 1, 2, 3, 4].map((l) => `<i class="hm l${l}"></i>`).join('')}<span>More</span></div></div>
            <div class="heat-scroll">${heat}</div>
          </section>
          <section class="card sq edge trophy-card" style="--k:3" aria-labelledby="tr-h">
            <div class="card-head"><h2 id="tr-h">Trophies</h2><span class="hud-label num">${trophies.filter((b) => b.on).length} / ${trophies.length}</span></div>
            <div class="trophies">
              ${trophies.map((b) => `<div class="trophy ${b.on ? '' : 'is-locked'}" data-rarity="${b.r}"><span class="tr-gem">${icon(b.on ? b.i : 'lock')}</span><span class="tr-r hud-label">${b.r}</span><span class="tr-t">${b.t}</span><span class="t-cap">${b.d}</span></div>`).join('')}
            </div>
          </section>
        </div>
      </div>`;
    return { title: 'Profile', html, mount(root) { runRings(root); E.runTickers(root); tooltips(root); const hs = root.querySelector('.heat-scroll'); if (hs) hs.scrollLeft = hs.scrollWidth; } };
  }

  function notFound() {
    return {
      title: 'Signal lost',
      html: `<div class="screen">${head({ eyebrow: 'Error 404', title: 'Signal lost', sub: 'That location is not on the map. Return to the hub to keep going.' })}<a class="btn btn-primary btn-lg" href="#today">Return to hub</a></div>`,
      mount() {},
    };
  }

  E.Screens = { today, subjects, subject, lesson, labs, lab: labView, review, progress, notFound, showResults, emblem };
})();

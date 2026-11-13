/* ==========================================================================
   EPOCH — app shell
   Title card, HUD bar (tabs with Q/E switching), router with View
   Transitions, ⌘K search, operator sheet, sound.
   ========================================================================== */
(function () {
  'use strict';
  const E = window.Epoch, D = E.Data, S = E.Screens;
  const { $, $$, icon, esc } = E;

  const NAV = [
    { key: 'today', label: 'Hub', icon: 'today' },
    { key: 'subjects', label: 'Campaign', icon: 'map' },
    { key: 'labs', label: 'Simulators', short: 'Sims', icon: 'labs' },
    { key: 'review', label: 'Drills', icon: 'review', badge: D.cards.length },
    { key: 'progress', label: 'Profile', icon: 'person' },
  ];

  /* ------------------------------------------------------------ chrome */
  let tabLiquid, barLiquid;
  function buildChrome() {
    const u = D.user;
    $('#hud-tabs').innerHTML = `<kbd class="only-wide" title="Previous tab">Q</kbd><span class="tab-glow" aria-hidden="true"></span>${NAV.map((n) => `<a class="hud-tab" href="#${n.key}" data-nav="${n.key}">${n.label}${n.badge ? `<span class="badge num" aria-label="${n.badge} due">${n.badge}</span>` : ''}</a>`).join('')}<kbd class="only-wide" title="Next tab">E</kbd>`;
    $('#tabbar').innerHTML = `<span class="tab-indicator" aria-hidden="true"></span>${NAV.map((n) => `<a class="tab" href="#${n.key}" data-nav="${n.key}">${icon(n.icon)}<span>${n.short || n.label}</span>${n.badge ? `<span class="badge num" aria-hidden="true">${n.badge}</span>` : ''}</a>`).join('')}`;
    $('#streak-num').textContent = u.streak;
    $('#shards-num').textContent = u.xp.toLocaleString();
    $('#hud-level').innerHTML = levelRing(u);
    $('#hud-rank').textContent = u.rank;
    tabLiquid = new E.Liquid($('#hud-tabs'), $('#hud-tabs .tab-glow'), { axis: 'x' });
    barLiquid = new E.Liquid($('#tabbar'), $('#tabbar .tab-indicator'), { axis: 'x' });
    new ResizeObserver(() => { const a = $('#tabbar [aria-current="page"]'); if (a) barLiquid.moveTo(a, true); const b = $('#hud-tabs [aria-current="page"]'); if (b) tabLiquid.moveTo(b, true); }).observe(document.body);
    syncSound();
  }
  function levelRing(u) {
    const r = 15, c = 2 * Math.PI * r, p = u.xp / u.nextXp;
    return `<svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="${r}" fill="none" stroke="rgba(150,178,255,.18)" stroke-width="2.5"/><circle cx="17" cy="17" r="${r}" fill="none" stroke="var(--ember)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 17 17)" style="filter:drop-shadow(0 0 3px var(--ember))"/></svg><span>${u.level}</span>`;
  }
  function syncSound() {
    const b = $('#sound-btn'); if (!b) return;
    b.setAttribute('aria-pressed', String(E.Sfx.on));
    b.innerHTML = icon(E.Sfx.on ? 'sound' : 'mute');
    b.setAttribute('aria-label', E.Sfx.on ? 'Sound on' : 'Sound off');
  }

  /* ------------------------------------------------------------ router */
  const view = () => $('#view');
  let current = { key: null, cleanup: null };
  const depth = (k) => (k.startsWith('lesson-') ? 2 : k.startsWith('subject-') || k.startsWith('lab-') ? 1 : 0);
  const vtKey = (k) => (k.startsWith('subject-') || k.startsWith('lab-') ? k : null);

  function resolve(key) {
    if (key === 'today') return S.today();
    if (key === 'subjects') return S.subjects();
    if (key === 'labs') return S.labs();
    if (key === 'review') return S.review();
    if (key === 'progress') return S.progress();
    if (key.startsWith('subject-')) return S.subject(key.slice(8));
    if (key.startsWith('lesson-')) return S.lesson(key.slice(7));
    if (key.startsWith('lab-')) return S.lab(key.slice(4));
    return S.notFound();
  }
  const navOf = (k) => (k.startsWith('subject-') || k.startsWith('lesson-') ? 'subjects' : k.startsWith('lab-') ? 'labs' : k);
  const keyFromHash = () => decodeURIComponent((location.hash || '').replace(/^#/, '')) || 'today';

  function go(key, { initial = false } = {}) {
    if (key === current.key) return;
    const scr = resolve(key);
    const from = current.key;
    const apply = () => {
      if (current.cleanup) { try { current.cleanup(); } catch (e) { console.error(e); } }
      const v = view();
      v.innerHTML = scr.html;
      window.scrollTo(0, 0);
      let c = null;
      try { c = scr.mount && scr.mount(v); } catch (e) { console.error(e); }
      current = { key, cleanup: typeof c === 'function' ? c : null };
      E.renderMath(v);
      updateChrome(key, scr);
    };
    const html = document.documentElement;
    if (!initial) E.Sfx.whoosh();
    if (initial || !document.startViewTransition || E.reducedMotion()) { apply(); return; }
    const shared = [vtKey(key), from && vtKey(from)].find((k) => k && view().querySelector(`[data-vt="${k}"]`) && scr.html.includes(`data-vt="${k}"`));
    if (shared) view().querySelector(`[data-vt="${shared}"]`).style.viewTransitionName = 'shared';
    html.dataset.vtDir = !from ? 'fade' : depth(key) > depth(from) ? 'forward' : depth(key) < depth(from) ? 'back' : 'fade';
    const vt = document.startViewTransition(() => {
      apply();
      if (shared) { const el = view().querySelector(`[data-vt="${shared}"]`); if (el) el.style.viewTransitionName = 'shared'; }
    });
    vt.ready.catch(() => {});
    vt.finished.finally(() => {
      delete html.dataset.vtDir;
      $$('[data-vt]', view()).forEach((el) => (el.style.viewTransitionName = ''));
    });
  }

  function updateChrome(key, scr) {
    const nav = navOf(key);
    $$('[data-nav]').forEach((a) => (a.getAttribute('data-nav') === nav ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    tabLiquid.moveTo($(`#hud-tabs [data-nav="${nav}"]`));
    barLiquid.moveTo($(`#tabbar [data-nav="${nav}"]`));
    const back = $('#back-btn');
    if (scr.back) { back.hidden = false; back.href = scr.back.href; $('span', back).textContent = scr.back.label; }
    else back.hidden = true;
    document.title = scr.title && key !== 'today' ? `${scr.title} · Epoch` : 'Epoch';
    document.documentElement.dataset.screen = key.split('-')[0];
  }

  /* ------------------------------------------------------- overlays */
  let lastFocus = null;
  function openOverlay(html, { onClose } = {}) {
    closeOverlay(true);
    lastFocus = document.activeElement;
    const o = document.createElement('div');
    o.className = 'overlay';
    o.innerHTML = `<div class="scrim" data-close></div>${html}`;
    document.body.appendChild(o);
    o.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeOverlay(); });
    o.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeOverlay(); }
      if (e.key === 'Tab') {
        const f = $$('button, [href], input, [tabindex]:not([tabindex="-1"])', o).filter((x) => !x.disabled && x.offsetParent);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    o._onClose = onClose;
    return o;
  }
  function closeOverlay(instant = false) {
    const o = $('.overlay:not(.is-closing):not(.results-overlay)');
    if (!o) return;
    if (o._onClose) o._onClose();
    if (instant || E.reducedMotion()) o.remove();
    else { o.classList.add('is-closing'); setTimeout(() => o.remove(), 260); }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------- search */
  function paletteItems() {
    const items = [];
    NAV.forEach((n) => items.push({ group: 'Go to', title: n.label, sub: 'Screen', href: '#' + n.key, icon: n.icon }));
    D.subjects.forEach((s) => items.push({ group: 'Chapters', title: s.title, sub: `Chapter ${s.numeral} · ${s.realm} · ${Math.round(s.progress * 100)}% synced`, href: '#subject-' + s.id, icon: s.icon, subject: s.id }));
    D.labs.forEach((l) => items.push({ group: 'Simulators', title: l.title, sub: `${l.code} · ${D.subject(l.subject).title}`, href: '#lab-' + l.id, icon: 'labs', subject: l.subject }));
    D.subjects.forEach((s) => s.lessons.forEach((l) => items.push({ group: 'Missions', title: l.title, sub: `M${String(l.n).padStart(2, '0')} · ${s.title} · ${l.min} min${l.status === 'locked' ? ' · locked' : ''}`, href: '#lesson-' + l.id, icon: l.boss ? 'trophy' : 'book', subject: s.id, locked: l.status === 'locked' })));
    items.push({ group: 'Actions', title: 'Start drill', sub: `${D.cards.length} cards ready`, href: '#review', icon: 'bolt' });
    items.push({ group: 'Actions', title: 'Toggle sound', sub: 'Interface sound effects', action: 'sound', icon: 'sound' });
    return items;
  }
  function score(item, q) {
    const t = item.title.toLowerCase(), s = (item.sub || '').toLowerCase();
    const i = t.indexOf(q);
    if (i === 0) return 100;
    if (i > 0) return (t[i - 1] === ' ' ? 80 : 60) - i * 0.1;
    if (s.includes(q)) return 30;
    let k = 0; for (const ch of t) if (ch === q[k]) k++;
    return k === q.length ? 10 : -1;
  }
  function highlight(title, q) {
    if (!q) return esc(title);
    const i = title.toLowerCase().indexOf(q);
    if (i < 0) return esc(title);
    return esc(title.slice(0, i)) + '<mark>' + esc(title.slice(i, i + q.length)) + '</mark>' + esc(title.slice(i + q.length));
  }
  function openPalette() {
    if ($('.overlay .palette')) return;
    const all = paletteItems();
    const o = openOverlay(`
      <div class="palette sq glass-strong" role="dialog" aria-modal="true" aria-label="Search Epoch">
        <div class="palette-input">${icon('search')}<input id="palette-q" type="text" placeholder="Search missions, chapters, simulators" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="palette-results" aria-autocomplete="list"><kbd>esc</kbd></div>
        <div class="palette-results" id="palette-results" role="listbox" aria-label="Results"></div>
        <div class="palette-foot only-wide"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
      </div>`);
    const input = $('#palette-q', o), list = $('#palette-results', o);
    let results = [], sel = 0;
    const render = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        const cont = D.lesson('backpropagation');
        results = [
          { group: 'Suggested', title: `Continue: ${cont.title}`, sub: 'Chapter V · 62% synced', href: '#lesson-' + cont.id, icon: 'play', subject: cont.subject },
          { group: 'Suggested', title: 'Start drill', sub: `${D.cards.length} cards ready`, href: '#review', icon: 'bolt' },
          ...all.filter((x) => x.group === 'Simulators').slice(0, 3).map((x) => ({ ...x, group: 'Suggested' })),
          ...all.filter((x) => x.group === 'Chapters'),
        ];
      } else results = all.map((x) => ({ x, s: score(x, q) })).filter((r) => r.s >= 0).sort((a, b) => b.s - a.s).slice(0, 14).map((r) => r.x);
      sel = 0;
      if (!results.length) { list.innerHTML = `<div class="palette-empty">No matches for “${esc(input.value)}”. Try a topic like “eigen” or “loss”.</div>`; return; }
      let lastGroup = '';
      list.innerHTML = results.map((r, i) => {
        const g = r.group !== lastGroup ? `<div class="palette-group hud-label">${r.group}</div>` : ''; lastGroup = r.group;
        return `${g}<button type="button" class="palette-item" role="option" id="pi-${i}" data-i="${i}" aria-selected="${i === 0}" ${r.subject ? `data-subject="${r.subject}"` : ''}><span class="pi-icon">${icon(r.icon)}</span><span class="pi-main"><span class="pi-title">${highlight(r.title, q)}</span><span class="t-cap">${esc(r.sub || '')}</span></span>${r.locked ? icon('lock', 'sm') : ''}</button>`;
      }).join('');
      input.setAttribute('aria-activedescendant', 'pi-0');
    };
    const move = (d) => {
      const items = $$('.palette-item', list); if (!items.length) return;
      sel = (sel + d + items.length) % items.length;
      items.forEach((b, i) => b.setAttribute('aria-selected', String(i === sel)));
      items[sel].scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', 'pi-' + sel);
      E.Sfx.hover();
    };
    const choose = (i) => {
      const r = results[i]; if (!r) return;
      closeOverlay(true);
      if (r.action === 'sound') { E.Sfx.set(!E.Sfx.on); syncSound(); return; }
      if (location.hash !== r.href) location.hash = r.href;
    };
    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    });
    list.addEventListener('click', (e) => { const b = e.target.closest('.palette-item'); if (b) choose(+b.dataset.i); });
    list.addEventListener('pointermove', (e) => {
      const b = e.target.closest('.palette-item'); if (!b || +b.dataset.i === sel) return;
      sel = +b.dataset.i; $$('.palette-item', list).forEach((x, i) => x.setAttribute('aria-selected', String(i === sel)));
    });
    render();
    requestAnimationFrame(() => input.focus());
  }

  /* ---------------------------------------------------- operator sheet */
  function openOperator() {
    const u = D.user;
    const o = openOverlay(`
      <div class="sheet sq glass-strong" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="grabber" aria-hidden="true"></div>
        <div class="sheet-head">
          ${S.emblem(u.level, 64)}
          <div><div class="hud-label">Callsign</div><h2 id="sheet-title" class="t-title2">${esc(u.callsign)}</h2><div class="t-foot">Lv ${u.level} · ${esc(u.rank)}</div></div>
          <button type="button" class="btn-icon" data-close aria-label="Close">${icon('xmark')}</button>
        </div>
        <div class="xp-row"><div class="row-l"><span class="hud-label num">${u.xp.toLocaleString()} / ${u.nextXp.toLocaleString()} XP</span><span class="hud-label">Next · ${esc(u.nextRank)}</span></div><div class="bar xp seg" style="--p:${(u.xp / u.nextXp).toFixed(3)}"><i></i></div></div>
        <div class="sheet-group">
          <div class="hud-label">Settings</div>
          <label class="setting" for="set-sound"><span>${icon('sound')}Interface sound</span><span class="switch"><input type="checkbox" id="set-sound" ${E.Sfx.on ? 'checked' : ''}><span class="track" aria-hidden="true"></span></span></label>
        </div>
        <div class="sheet-actions"><a class="btn btn-ghost" href="#progress" data-close>${icon('person')}View profile</a></div>
        <p class="t-cap sheet-note">${icon('sparkles', 'sm')} This preview uses sample progress data.</p>
      </div>`);
    $('#set-sound', o).addEventListener('change', (e) => { E.Sfx.set(e.target.checked); syncSound(); });
    requestAnimationFrame(() => { const b = $('[data-close].btn-icon', o); if (b) b.focus(); });
  }

  /* ---------------------------------------------------------- splash */
  function splash() {
    const el = $('#splash');
    if (!el) return;
    let seen = false; try { seen = sessionStorage.getItem('epoch:splash') === '1'; } catch (e) { /* storage unavailable */ }
    if (seen || E.reducedMotion()) { el.remove(); return; }
    try { sessionStorage.setItem('epoch:splash', '1'); } catch (e) { /* storage unavailable */ }
    const dismiss = () => { if (el.classList.contains('is-out')) return; el.classList.add('is-out'); setTimeout(() => el.remove(), 1000); removeEventListener('keydown', dismiss); };
    el.addEventListener('click', dismiss);
    addEventListener('keydown', dismiss);
    setTimeout(dismiss, 2300);
  }

  /* ----------------------------------------------------------- boot */
  function boot() {
    E.installSpringEasings();
    E.Theme.init();
    E.Squircle.init();
    buildChrome();
    E.World.init();
    E.Sfx.wire();
    splash();

    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      if (a.dataset.action === 'palette') openPalette();
      if (a.dataset.action === 'account') openOperator();
      if (a.dataset.action === 'sound') { E.Sfx.set(!E.Sfx.on); syncSound(); }
    });
    document.addEventListener('keydown', (e) => {
      const typing = e.target.closest('input, textarea, [contenteditable]');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('.overlay .palette') ? closeOverlay() : openPalette(); return; }
      if (typing || $('.overlay') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); openPalette(); }
      // shoulder-button style tab switching
      if (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') {
        const i = NAV.findIndex((n) => n.key === navOf(current.key || 'today'));
        const n = (i + (e.key.toLowerCase() === 'e' ? 1 : -1) + NAV.length) % NAV.length;
        location.hash = '#' + NAV[n].key;
      }
    });
    const onScroll = () => document.documentElement.classList.toggle('is-scrolled', scrollY > 24);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    addEventListener('hashchange', () => {
      const k = keyFromHash();
      if (document.getElementById(k) && !/^(today|subjects|labs|review|progress|subject-|lesson-|lab-)/.test(k)) return;
      go(k);
    });
    go(keyFromHash(), { initial: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

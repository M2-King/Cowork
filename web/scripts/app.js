/* ==========================================================================
   Epoch — app shell
   Router (hash-based, with View Transitions), sidebar + tab bar with liquid
   indicators, condensing toolbar, ⌘K palette, account sheet, appearance.
   ========================================================================== */
(function () {
  'use strict';
  const E = window.Epoch, D = E.Data, S = E.Screens;
  const { $, $$, icon, esc } = E;

  const NAV = [
    { key: 'today', label: 'Today', icon: 'today' },
    { key: 'subjects', label: 'Subjects', icon: 'subjects' },
    { key: 'labs', label: 'Labs', icon: 'labs' },
    { key: 'review', label: 'Review', icon: 'review', badge: D.cards.length },
    { key: 'progress', label: 'Progress', icon: 'progress' },
  ];
  const THEME_OPTS = [
    { value: 'light', icon: 'sun', hidden: 'Light', title: 'Light' },
    { value: 'dark', icon: 'moon', hidden: 'Dark', title: 'Dark' },
    { value: 'auto', icon: 'auto', hidden: 'Automatic', title: 'Match system' },
  ];

  /* ------------------------------------------------------------ chrome */
  function buildChrome() {
    const pref = E.Theme.pref();
    $('#sidebar-nav').innerHTML = `<span class="nav-indicator sq" aria-hidden="true"></span>${NAV.map((n) => `<a class="nav-item" href="#${n.key}" data-nav="${n.key}">${icon(n.icon)}<span>${n.label}</span>${n.badge ? `<span class="badge num" aria-label="${n.badge} due">${n.badge}</span>` : ''}</a>`).join('')}`;
    $('#sidebar-subjects').innerHTML = `<div class="eyebrow">Courses</div>${D.subjects.map((s) => {
      const r = 7, c = 2 * Math.PI * r;
      return `<a class="nav-sub" href="#subject-${s.id}" data-subject="${s.id}" data-sub="${s.id}">
        <svg class="mini-ring" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="${r}" fill="none" stroke-width="2.6" style="stroke:var(--c);opacity:.22"/><circle cx="9" cy="9" r="${r}" fill="none" stroke-width="2.6" stroke-linecap="round" style="stroke:var(--c)" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - s.progress)}" transform="rotate(-90 9 9)"/></svg>
        <span>${esc(s.title)}</span><span class="pct">${Math.round(s.progress * 100)}%</span></a>`;
    }).join('')}`;
    $('#sidebar-theme').innerHTML = E.segHTML('Appearance', THEME_OPTS, pref, 'full sm');
    $('#tabbar').innerHTML = `<span class="tab-indicator" aria-hidden="true"></span>${NAV.map((n) => `<a class="tab" href="#${n.key}" data-nav="${n.key}">${icon(n.icon)}<span>${n.label}</span>${n.badge ? `<span class="badge num" aria-hidden="true">${n.badge}</span>` : ''}</a>`).join('')}`;
    $('#streak-num').textContent = D.user.streak;

    themeSeg = E.segmented($('#sidebar-theme .seg'), (v, btn) => setTheme(v, btn));
    navLiquid = new E.Liquid($('#sidebar-nav'), $('#sidebar-nav .nav-indicator'), { axis: 'y' });
    tabLiquid = new E.Liquid($('#tabbar'), $('#tabbar .tab-indicator'), { axis: 'x' });
    new ResizeObserver(() => { const a = $('#tabbar [aria-current="page"]'); if (a) tabLiquid.moveTo(a, true); }).observe($('#tabbar'));
  }
  let navLiquid, tabLiquid, themeSeg;

  /* ------------------------------------------------------- appearance */
  function setTheme(v, originEl) {
    const html = document.documentElement;
    const run = () => { E.Theme.set(v); if (themeSeg) themeSeg.set(v); if (sheetSeg) sheetSeg.set(v); };
    if (!document.startViewTransition || E.reducedMotion() || !originEl) return run();
    const r = originEl.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    html.dataset.vtDir = 'theme';
    const vt = document.startViewTransition(run);
    vt.ready.then(() => {
      html.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.45,0,.15,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {});
    vt.finished.finally(() => delete html.dataset.vtDir);
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
  const subjectOf = (k) => {
    if (k.startsWith('subject-')) return k.slice(8);
    if (k.startsWith('lesson-')) { const l = D.lesson(k.slice(7)); return l && l.subject; }
    if (k.startsWith('lab-')) { const l = D.lab(k.slice(4)); return l && l.subject; }
    return null;
  };

  function keyFromHash() {
    const h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    return h || 'today';
  }

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
    if (initial || !document.startViewTransition || E.reducedMotion()) { apply(); return; }
    // a shared element morphs between screens when both have it (card ↔ hero)
    const shared = [vtKey(key), from && vtKey(from)].find((k) => k && view().querySelector(`[data-vt="${k}"]`) && scr.html.includes(`data-vt="${k}"`));
    if (shared) view().querySelector(`[data-vt="${shared}"]`).style.viewTransitionName = 'shared';
    html.dataset.vtDir = !from ? 'fade' : depth(key) > depth(from) ? 'forward' : depth(key) < depth(from) ? 'back' : 'fade';
    const vt = document.startViewTransition(() => {
      apply();
      if (shared) { const el = view().querySelector(`[data-vt="${shared}"]`); if (el) el.style.viewTransitionName = 'shared'; }
    });
    vt.ready.catch(() => {}); // skipped when another navigation starts first
    vt.finished.finally(() => {
      delete html.dataset.vtDir;
      $$('[data-vt]', view()).forEach((el) => (el.style.viewTransitionName = ''));
    });
  }

  /* --------------------------------------------------- chrome updates */
  let titleObserver = null;
  function updateChrome(key, scr) {
    const nav = navOf(key), sub = subjectOf(key);
    $$('[data-nav]').forEach((a) => (a.getAttribute('data-nav') === nav ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    $$('[data-sub]').forEach((a) => (a.dataset.sub === sub ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    navLiquid.moveTo($(`#sidebar-nav [data-nav="${nav}"]`));
    tabLiquid.moveTo($(`#tabbar [data-nav="${nav}"]`));
    // toolbar
    const back = $('#back-btn');
    if (scr.back) { back.hidden = false; back.href = scr.back.href; $('span', back).textContent = scr.back.label; }
    else back.hidden = true;
    $('#toolbar-title span').textContent = scr.title || '';
    const tb = $('#toolbar');
    tb.classList.remove('is-condensed');
    if (titleObserver) titleObserver.disconnect();
    const lt = $('[data-large-title]', view());
    if (lt) {
      titleObserver = new IntersectionObserver(([e]) => tb.classList.toggle('is-condensed', !e.isIntersecting && e.boundingClientRect.top < 80), { rootMargin: '-60px 0px 0px 0px' });
      titleObserver.observe(lt);
    }
    document.title = scr.title && key !== 'today' ? `${scr.title} · Epoch` : 'Epoch';
    document.documentElement.dataset.screen = key.split('-')[0];
  }

  /* ------------------------------------------------------- overlays */
  let lastFocus = null;
  function openOverlay(html, { onClose, label } = {}) {
    closeOverlay(true);
    lastFocus = document.activeElement;
    const o = document.createElement('div');
    o.className = 'overlay';
    o.innerHTML = `<div class="scrim" data-close></div>${html}`;
    document.body.appendChild(o);
    document.documentElement.classList.add('has-overlay');
    o.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeOverlay(); });
    o.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeOverlay(); }
      if (e.key === 'Tab') {
        const f = $$('button, [href], input, [tabindex]:not([tabindex="-1"])', o).filter((x) => !x.disabled && x.offsetParent);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    o._onClose = onClose; void label;
    return o;
  }
  function closeOverlay(instant = false) {
    const o = $('.overlay:not(.is-closing)');
    if (!o) return;
    if (o._onClose) o._onClose();
    document.documentElement.classList.remove('has-overlay');
    if (instant || E.reducedMotion()) o.remove();
    else { o.classList.add('is-closing'); setTimeout(() => o.remove(), 260); }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------- palette */
  function paletteItems() {
    const items = [];
    NAV.forEach((n) => items.push({ group: 'Go to', title: n.label, sub: 'Screen', href: '#' + n.key, icon: n.icon }));
    D.subjects.forEach((s) => items.push({ group: 'Courses', title: s.title, sub: `${s.lessons.length} lessons · ${Math.round(s.progress * 100)}% complete`, href: '#subject-' + s.id, icon: s.icon, subject: s.id }));
    D.labs.forEach((l) => items.push({ group: 'Labs', title: l.title, sub: D.subject(l.subject).title, href: '#lab-' + l.id, icon: 'labs', subject: l.subject }));
    D.subjects.forEach((s) => s.lessons.forEach((l) => items.push({ group: 'Lessons', title: l.title, sub: `${s.title} · ${l.min} min${l.status === 'locked' ? ' · locked' : ''}`, href: '#lesson-' + l.id, icon: 'book', subject: s.id, locked: l.status === 'locked' })));
    items.push({ group: 'Actions', title: 'Start review', sub: `${D.cards.length} cards due`, href: '#review', icon: 'review' });
    items.push({ group: 'Actions', title: 'Switch appearance', sub: 'Toggle light and dark', action: 'theme', icon: 'auto' });
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
      <div class="palette sq edge glass-strong" role="dialog" aria-modal="true" aria-label="Search Epoch">
        <div class="palette-input">${icon('search')}<input id="palette-q" type="text" placeholder="Search lessons, labs and courses" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="palette-results" aria-autocomplete="list"><kbd>esc</kbd></div>
        <div class="palette-results" id="palette-results" role="listbox" aria-label="Results"></div>
        <div class="palette-foot only-wide"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>↵</kbd> to open</span><span><kbd>esc</kbd> to close</span></div>
      </div>`);
    const input = $('#palette-q', o), list = $('#palette-results', o);
    let results = [], sel = 0;
    const render = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        const cont = D.lesson('backpropagation');
        results = [
          { group: 'Suggested', title: `Continue: ${cont.title}`, sub: 'Neural Networks · 62% done', href: '#lesson-' + cont.id, icon: 'play', subject: cont.subject },
          { group: 'Suggested', title: 'Start review', sub: `${D.cards.length} cards due`, href: '#review', icon: 'review' },
          ...all.filter((x) => x.group === 'Labs').slice(0, 3).map((x) => ({ ...x, group: 'Suggested' })),
          ...all.filter((x) => x.group === 'Courses'),
        ];
      } else {
        results = all.map((x) => ({ x, s: score(x, q) })).filter((r) => r.s >= 0).sort((a, b) => b.s - a.s).slice(0, 14).map((r) => r.x);
      }
      sel = 0;
      if (!results.length) { list.innerHTML = `<div class="palette-empty">No matches for “${esc(input.value)}”. Try a topic like “eigen” or “loss”.</div>`; return; }
      let lastGroup = '';
      list.innerHTML = results.map((r, i) => {
        const g = r.group !== lastGroup ? `<div class="palette-group eyebrow">${r.group}</div>` : ''; lastGroup = r.group;
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
    };
    const choose = (i) => {
      const r = results[i]; if (!r) return;
      closeOverlay(true);
      if (r.action === 'theme') { const next = E.Theme.isDark() ? 'light' : 'dark'; setTheme(next, $('#sidebar-theme .seg-btn[aria-checked="true"]') || document.body); return; }
      if (location.hash === r.href) return;
      location.hash = r.href;
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

  /* ------------------------------------------------------ account sheet */
  let sheetSeg = null;
  function openAccount() {
    const u = D.user;
    const o = openOverlay(`
      <div class="sheet sq glass-strong" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div class="grabber" aria-hidden="true"></div>
        <div class="sheet-head">
          <span class="avatar sq">${icon('person')}</span>
          <div><h2 id="sheet-title" class="t-title3">Your account</h2><div class="t-foot">Level ${u.level} · ${u.xp.toLocaleString()} XP</div></div>
          <button type="button" class="btn-icon gray" data-close aria-label="Close">${icon('xmark')}</button>
        </div>
        <div class="xp-row"><div class="bar" data-p="${(u.xp / u.nextXp).toFixed(3)}" style="--p:${(u.xp / u.nextXp).toFixed(3)}"><i></i></div><span class="t-cap num">${u.nextXp - u.xp} XP to level ${u.level + 1}</span></div>
        <div class="sheet-group">
          <div class="eyebrow">Appearance</div>
          ${E.segHTML('Appearance', THEME_OPTS.map((t) => ({ ...t, label: t.hidden, hidden: '' })), E.Theme.pref(), 'full')}
        </div>
        <p class="t-cap sheet-note">${icon('sparkles', 'sm')} This preview uses sample progress data.</p>
      </div>`, { onClose: () => (sheetSeg = null) });
    sheetSeg = E.segmented($('.seg', o), (v, btn) => setTheme(v, btn));
    requestAnimationFrame(() => { const b = $('[data-close].btn-icon', o); if (b) b.focus(); });
  }

  /* ----------------------------------------------------------- boot */
  function boot() {
    E.installSpringEasings();
    E.Theme.init();
    E.Squircle.init();
    buildChrome();
    E.Ambient.init();

    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-action]');
      if (!a) return;
      if (a.dataset.action === 'palette') openPalette();
      if (a.dataset.action === 'account') openAccount();
    });
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('.overlay .palette') ? closeOverlay() : openPalette(); }
      else if (e.key === '/' && !e.target.closest('input, textarea, [contenteditable]') && !$('.overlay')) { e.preventDefault(); openPalette(); }
    });
    addEventListener('hashchange', () => {
      const k = keyFromHash();
      // in-page anchors (e.g. lesson sections) are handled by the screen itself
      if (document.getElementById(k) && !/^(today|subjects|labs|review|progress|subject-|lesson-|lab-)/.test(k)) return;
      go(k);
    });
    go(keyFromHash(), { initial: true });
    document.documentElement.classList.add('is-ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

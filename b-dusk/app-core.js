/* Landit, design B (Dusk): core.
   State and storage, words, small helpers, themes, dialogs, toast,
   share and read aloud. Classic script: everything hangs off window.DUSK.
   Storage keys all start with "landit-b:" (file:// pages share storage). */
(function () {
  'use strict';
  var L = window.LANDIT;
  var D = window.DUSK = { L: L, pages: {}, ui: {} };

  /* Per-session view state (not saved): open rows, filters, tabs. */
  D.resetUi = function () {
    D.ui.openTracked = {};
    D.ui.bf = { q: '', cat: 'all', sort: 'value' };
    D.ui.cm = { tab: 'posts', filter: 'all', open: {} };
    D.ui.st = { editing: null, account: false };
    D.ui.q = null;
    D.ui.panelId = null;
    D.ui.blockedOpen = false;
    D.ui.tab = 'overview';
  };
  D.resetUi();
  var KEY = 'landit-b:state';

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */

  function fresh() {
    return {
      v: 1,
      user: null,          // {name, email}
      session: false,      // signed in
      profile: {},         // questionnaire answers, keys as LANDIT.match reads them
      answered: false,     // questionnaire seen once
      ack: false,          // disclaimer acknowledged
      tracked: [],         // [{id, status}]
      checks: {},          // {benefitId: {docs: [docId], steps: [index]}}
      chat: [],            // [{role: 'user', text} | {role: 'bot', reply}]
      community: { posts: [], comments: {}, ratings: {} },
      prefs: { theme: null, text: 'normal', lang: 'en', readAloud: true, collapsed: false },
    };
  }
  D.fresh = fresh;

  function load() {
    var f = fresh();
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return f;
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return f;
      Object.keys(f).forEach(function (k) { if (s[k] === undefined || s[k] === null && k !== 'user') s[k] = f[k]; });
      Object.keys(f.prefs).forEach(function (k) { if (s.prefs[k] === undefined) s.prefs[k] = f.prefs[k]; });
      Object.keys(f.community).forEach(function (k) { if (!s.community[k]) s.community[k] = f.community[k]; });
      return s;
    } catch (e) { return f; }
  }
  D.state = load();

  D.save = function () {
    try { window.localStorage.setItem(KEY, JSON.stringify(D.state)); } catch (e) { /* storage off: keep going in memory */ }
  };

  /* Remove everything this design saved. keepPrefs keeps colours, text size
     and language (deleting an account should not drop someone who needs
     Extra large text back into small text); ?reset=1 clears everything. */
  D.clearAll = function (keepPrefs) {
    var prefs = keepPrefs ? JSON.parse(JSON.stringify(D.state.prefs || {})) : null;
    try {
      var keys = [];
      for (var i = 0; i < window.localStorage.length; i++) keys.push(window.localStorage.key(i));
      keys.forEach(function (k) { if (k && k.indexOf('landit-b:') === 0) window.localStorage.removeItem(k); });
    } catch (e) { /* ignore */ }
    D.state = fresh();
    if (prefs) {
      ['theme', 'text', 'lang', 'readAloud'].forEach(function (k) { if (prefs[k] !== undefined) D.state.prefs[k] = prefs[k]; });
      D.save();
    }
    D.resetUi();
    D._match = null;
  };

  D.seedDemo = function () {
    var s = fresh();
    var demo = L.demo;
    s.user = { name: demo.name, email: demo.email };
    s.session = true;
    s.profile = JSON.parse(JSON.stringify(demo.profile));
    s.answered = true;
    s.ack = true;
    s.tracked = demo.tracked.map(function (t) { return { id: t.id, status: t.status }; });
    demo.tracked.forEach(function (t) { s.checks[t.id] = { docs: t.ticked.slice(), steps: [] }; });
    D.state = s;
    D.resetUi();
    D._match = null;
    var first = L.chatStarters(s.profile)[0];
    s.chat = [
      { role: 'user', text: first },
      { role: 'bot', reply: L.chatReply(first, D.chatContext()) },
    ];
  };

  D.signedIn = function () { return !!(D.state.session && D.state.user); };

  /* ------------------------------------------------------------------ */
  /* Words                                                               */
  /* ------------------------------------------------------------------ */

  D.lang = function () { return D.state.prefs.lang || 'en'; };
  /* Plainer English for a few shared words (reviewed with older readers
     and people with basic English in mind). Translated keys keep their
     translation in other languages; English-only keys change everywhere. */
  var PLAIN_EN = {
    claim_status: 'Have you applied yet?',
    st_declined: 'Not approved',
    gather: 'Get these ready first',
    tap_step: 'Tick each step when you finish it',
    effort: 'How much work',
    rate_this: 'Rate this benefit',
    nav_settings: 'Profile and settings',
    set_title: 'Profile and settings',
  };
  D.t = function (key) {
    var lang = D.lang();
    if (PLAIN_EN[key] && (lang === 'en' || L.i18n.englishOnly.indexOf(key) >= 0)) return PLAIN_EN[key];
    return L.t(key, lang);
  };
  D.tf = function (key, vars) { return L.tf(key, vars, D.lang()); };
  D.isRtl = function () { return L.dir(D.lang()) === 'rtl'; };

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  D.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  D.icon = function (name, opts) { return L.icon(name, opts || {}); };
  /* Direction icons (arrows, chevrons) mirror in right to left. */
  D.dicon = function (name, opts) {
    opts = opts || {};
    return L.icon(name, { size: opts.size, label: opts.label, className: 'dir-icon' + (opts.className ? ' ' + opts.className : '') });
  };
  D.$ = function (sel, root) { return (root || document).querySelector(sel); };
  D.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  D.bdi = function (s) { return '<bdi>' + D.esc(s) + '</bdi>'; };
  D.reducedMotion = function () {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };
  D.isPhone = function () {
    try { return window.matchMedia('(max-width: 899px)').matches; } catch (e) { return false; }
  };
  D.initial = function (name) {
    var n = String(name || '').trim();
    return n ? n.charAt(0).toUpperCase() : '';
  };
  /* What goes inside a round avatar: the first letter, or a person icon
     when there is no name or email (a "?" looked like a help button). */
  D.avatarInner = function (name, size) {
    var i = D.initial(name);
    return i ? D.esc(i) : D.icon('user', { size: size || 18 });
  };
  D.plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };

  /* The Landit mark: a half sun on a calm horizon. */
  D.mark = function (size, cls) {
    size = size || 28;
    return '<svg class="mark ' + (cls || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
      '<rect x="1" y="1" width="30" height="30" rx="9" fill="var(--accent)"/>' +
      '<path d="M9.5 19.5a6.5 6.5 0 0 1 13 0z" fill="var(--on-accent)"/>' +
      '<path d="M6.5 19.5h19" stroke="var(--on-accent)" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M11 24h10" stroke="var(--on-accent)" stroke-width="2" stroke-linecap="round" opacity=".55"/>' +
      '</svg>';
  };

  /* ------------------------------------------------------------------ */
  /* Matching and benefit helpers                                        */
  /* ------------------------------------------------------------------ */

  D.match = function () {
    var key = JSON.stringify(D.state.profile || {});
    if (!D._match || D._match.key !== key) D._match = { key: key, result: L.match(D.state.profile || {}) };
    return D._match.result;
  };

  D.cat = function (b) { return L.categories[b.category] || { label: b.category, icon: 'circle' }; };
  D.catVars = function (key) { return '--c:var(--cat-' + key + ');--cs:var(--cat-' + key + '-soft)'; };
  D.catTile = function (b, cls) {
    return '<span class="cat-tile ' + (cls || '') + '" style="' + D.catVars(b.category) + '" aria-hidden="true">' + D.icon(D.cat(b).icon, { size: 20 }) + '</span>';
  };
  D.catLabel = function (b) {
    return '<span class="cat-label" style="' + D.catVars(b.category) + '">' + D.esc(D.cat(b).label) + '</span>';
  };

  /* Worth: amount with qualifier, or the catalog's description, or "No set amount". */
  D.worth = function (b) {
    var p = L.valueParts(b);
    if (p.amount) return { kind: 'amount', amount: p.amount, qual: p.label };
    if (b.valueKind === 'label' && b.valueLabel) return { kind: 'label', text: b.valueLabel };
    return { kind: 'none', text: D.t('no_amount') };
  };
  D.worthHTML = function (b, cls) {
    var w = D.worth(b);
    if (w.kind === 'amount') {
      return '<span class="worth ' + (cls || '') + '"><span class="amount num">' + D.esc(w.amount) + '</span>' +
        (w.qual ? '<span class="qual" dir="auto">' + D.esc(w.qual) + '</span>' : '') + '</span>';
    }
    return '<span class="worth ' + (cls || '') + ' worth-' + w.kind + '"><span class="worth-text" dir="auto">' + D.esc(w.text) + '</span></span>';
  };

  D.docsSplit = function (b) {
    return {
      needed: b.docs.filter(function (d) { return d.certainty === 'needed'; }),
      maybe: b.docs.filter(function (d) { return d.certainty === 'maybe'; }),
    };
  };
  /* "2 needed, 1 maybe", "None", "Not listed". */
  D.docsText = function (b) {
    if (!b.docsKnown) return 'Not listed';
    if (!b.docs.length) return 'None';
    var s = D.docsSplit(b);
    var parts = [];
    if (s.needed.length) parts.push(s.needed.length + ' needed');
    if (s.maybe.length) parts.push(s.maybe.length + ' maybe');
    return parts.join(', ');
  };
  D.timeText = function (b) { return b.guide && b.guide.time ? b.guide.time : 'Not listed'; };
  /* Sidebar progress: counts what is needed, and names the maybes apart,
     so it never sounds like more is required than really is.
     "1 of 2 documents ready, 1 maybe" or "1 may be needed". */
  D.docsProgress = function (b) {
    if (!b.docs.length) return '';
    var s = D.docsSplit(b);
    var c = D.checks(b.id).docs;
    var have = s.needed.filter(function (d) { return c.indexOf(d.id) >= 0; }).length;
    if (!s.needed.length) return s.maybe.length + ' may be needed';
    return have + ' of ' + D.plural(s.needed.length, 'document', 'documents') + ' ready' + (s.maybe.length ? ', ' + s.maybe.length + ' maybe' : '');
  };

  /* Where a scheme stands for this person. */
  D.standing = function (b) {
    var m = D.match();
    for (var i = 0; i < m.open.length; i++) if (m.open[i].id === b.id) return { state: 'open', fit: m.fit[b.id] || 'possible' };
    for (var j = 0; j < m.blocked.length; j++) if (m.blocked[j].benefit.id === b.id) return { state: 'blocked', reason: m.blocked[j].reason, kind: m.blocked[j].kind };
    return { state: 'hidden' };
  };
  D.isBlocked = function (b) { return D.standing(b).state === 'blocked'; };
  /* True when an open scheme is only 'possible' (the matcher's certainty). */
  D.isPossible = function (b) {
    var m = D.match();
    return !!m.fit && m.fit[b.id] === 'possible';
  };
  /* Small calm tag for 'possible' schemes, wherever one is shown or picked. */
  D.fitTag = function (b) {
    return D.isPossible(b) ? '<span class="tag fit-tag">' + D.esc(L.fitLabel.possible) + '</span>' : '';
  };
  /* Quiet marker for a scheme the visa condition blocks. Replaces the amount. */
  D.lockTag = function () {
    return '<span class="lock-tag">' + D.icon('lock', { size: 16 }) + '<span>Not open on your visa</span></span>';
  };

  /* ------------------------------------------------------------------ */
  /* Tracking and checklists                                             */
  /* ------------------------------------------------------------------ */

  D.trackItem = function (id) {
    for (var i = 0; i < D.state.tracked.length; i++) if (D.state.tracked[i].id === id) return D.state.tracked[i];
    return null;
  };
  D.isTracked = function (id) { return !!D.trackItem(id); };
  D.checks = function (id) {
    if (!D.state.checks[id]) D.state.checks[id] = { docs: [], steps: [] };
    return D.state.checks[id];
  };
  D.track = function (id, quiet) {
    if (D.isTracked(id)) return;
    D.state.tracked.unshift({ id: id, status: 'Not started' });
    D.save();
    D.refreshTracked();
    if (!quiet) D.toast('Added to Tracked applications');
  };
  D.untrack = function (id) {
    D.state.tracked = D.state.tracked.filter(function (t) { return t.id !== id; });
    D.save();
    D.refreshTracked();
    D.toast('Removed from Tracked applications');
  };
  D.toggleTrack = function (id) { if (D.isTracked(id)) D.untrack(id); else D.track(id); };
  D.setStatus = function (id, status) {
    if (!D.isTracked(id)) D.track(id, true);
    D.trackItem(id).status = status;
    D.save();
    D.refreshTracked();
    D.toast(D.t('st_saved'));
  };
  D.toggleDoc = function (id, docId, on) {
    var c = D.checks(id);
    c.docs = c.docs.filter(function (x) { return x !== docId; });
    if (on) c.docs.push(docId);
    D.save();
  };
  D.toggleStep = function (id, idx, on) {
    var c = D.checks(id);
    c.steps = c.steps.filter(function (x) { return x !== idx; });
    if (on) c.steps.push(idx);
    D.save();
  };
  D.chatContext = function () {
    return {
      profile: D.state.profile || {},
      name: D.state.user ? D.state.user.name : '',
      lang: D.lang(),
      tracked: D.state.tracked.map(function (t) { return { id: t.id, status: t.status, ticked: D.checks(t.id).docs.slice() }; }),
    };
  };

  D.statusMeta = {
    'Not started': { icon: 'circle', cls: 'st-none' },
    'Applied': { icon: 'hourglass', cls: 'st-applied' },
    'Approved': { icon: 'circle-check', cls: 'st-approved' },
    'Turned down': { icon: 'x', cls: 'st-down' },
  };
  D.statusLabel = function (value) {
    var s = L.trackStatuses.filter(function (x) { return x.value === value; })[0];
    return s ? D.t(s.i18n) : value;
  };
  /* "Stop tracking": a plain way out, next to every tracked item. */
  D.untrackBtn = function (b, cls) {
    return '<button type="button" class="btn ' + (cls || 'btn-ghost btn-sm') + ' untrack-btn" data-action="untrack" data-bid="' + D.esc(b.id) + '">' +
      D.icon('x', { size: 16 }) + '<span>' + D.esc(D.t('untrack')) + '<span class="sr-only">: ' + D.esc(b.name) + '</span></span></button>';
  };
  D.statusPill = function (value) {
    var m = D.statusMeta[value] || D.statusMeta['Not started'];
    return '<span class="st ' + m.cls + '">' + D.icon(m.icon, { size: 14 }) + '<span>' + D.esc(D.statusLabel(value)) + '</span></span>';
  };

  /* A Track button that stays in sync everywhere (data-track). */
  D.trackBtn = function (b, opts) {
    opts = opts || {};
    var on = D.isTracked(b.id);
    var label = on ? D.t('tracking') : D.t('track');
    if (opts.iconOnly) {
      return '<button type="button" class="icon-btn track-icon" data-action="track" data-track="' + D.esc(b.id) + '" aria-pressed="' + on + '" aria-label="' + D.esc(D.t('track') + ': ' + b.name) + '">' +
        D.icon(on ? 'bookmark-check' : 'bookmark', { size: 20 }) + '</button>';
    }
    /* List rows: the word "Track" shows wherever there is no column
       heading to explain the bookmark (phones, narrow list). */
    if (opts.row) {
      return '<button type="button" class="btn btn-ghost btn-sm row-track track-btn" data-action="track" data-track="' + D.esc(b.id) + '" aria-pressed="' + on + '">' +
        D.icon(on ? 'bookmark-check' : 'bookmark', { size: 18 }) + '<span class="track-text">' + D.esc(label) + '</span><span class="sr-only">: ' + D.esc(b.name) + '</span></button>';
    }
    return '<button type="button" class="btn ' + (opts.cls || 'btn-secondary') + ' track-btn" data-action="track" data-track="' + D.esc(b.id) + '" aria-pressed="' + on + '">' +
      D.icon(on ? 'bookmark-check' : 'bookmark', { size: 18 }) + '<span class="track-text">' + D.esc(label) + '</span></button>';
  };

  /* Update every Track button and the sidebar after tracking changes. */
  D.refreshTracked = function () {
    D.$$('[data-track]').forEach(function (btn) {
      var id = btn.getAttribute('data-track');
      var on = D.isTracked(id);
      btn.setAttribute('aria-pressed', String(on));
      var svg = btn.querySelector('svg');
      if (svg) svg.outerHTML = D.icon(on ? 'bookmark-check' : 'bookmark', { size: btn.classList.contains('icon-btn') ? 20 : 18 });
      var txt = btn.querySelector('.track-text');
      if (txt) txt.textContent = on ? D.t('tracking') : D.t('track');
    });
    if (D.renderSidebar) D.renderSidebar();
    if (D.onTrackedChange) D.onTrackedChange();
  };

  /* ------------------------------------------------------------------ */
  /* Themes, text size, language                                         */
  /* ------------------------------------------------------------------ */

  D.themes = window.LANDIT_THEMES || [];
  D.theme = function () {
    var id = D.state.prefs.theme;
    return D.themes.filter(function (t) { return t.id === id; })[0] || D.themes.filter(function (t) { return t.default; })[0] || D.themes[0];
  };

  function rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function hex(c) { return '#' + c.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }
  /* Mix colour a into b by amount (0 to 1). */
  D.mix = function (a, b, amount) {
    var x = rgb(a), y = rgb(b);
    return hex([0, 1, 2].map(function (i) { return y[i] + (x[i] - y[i]) * amount; }));
  };

  D.applyTheme = function () {
    var t = D.theme();
    if (!t) return;
    var c = t.colors, root = document.documentElement, st = root.style;
    var vars = {
      '--bg': c.bg, '--sidebar': c.sidebar || c.bg, '--surface': c.surface, '--surface-2': c.surface2,
      '--text': c.text, '--muted': c.textMuted, '--border': c.border, '--accent': c.accent,
      '--on-accent': c.onAccent, '--focus': c.focus,
      '--accent-soft': D.mix(c.accent, c.surface, t.dark ? 0.16 : 0.12),
      '--accent-mid': D.mix(c.accent, c.surface, 0.5),
      '--accent-faint': D.mix(c.accent, c.bg, t.dark ? 0.08 : 0.07),
      '--border-strong': D.mix(c.text, c.border, 0.18),
      '--hover': D.mix(c.text, c.bg, t.dark ? 0.06 : 0.045),
      '--scrim': t.dark ? 'rgba(8, 9, 11, 0.62)' : 'rgba(38, 36, 32, 0.38)',
    };
    Object.keys(c.cat || {}).forEach(function (k) {
      vars['--cat-' + k] = c.cat[k];
      vars['--cat-' + k + '-soft'] = D.mix(c.cat[k], c.surface, t.dark ? 0.17 : 0.13);
    });
    Object.keys(vars).forEach(function (k) { st.setProperty(k, vars[k]); });
    root.setAttribute('data-theme', t.id);
    root.setAttribute('data-mode', t.dark ? 'dark' : 'light');
    root.style.colorScheme = t.dark ? 'dark' : 'light';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', c.bg);
  };

  D.textSizes = [
    { id: 'normal', label: 'Normal', scale: '100%' },
    { id: 'large', label: 'Large', scale: '112.5%' },
    { id: 'xlarge', label: 'Extra large', scale: '125%' },
  ];
  D.applyText = function () {
    var id = D.state.prefs.text;
    var s = D.textSizes.filter(function (x) { return x.id === id; })[0] || D.textSizes[0];
    document.documentElement.style.fontSize = s.scale;
    document.documentElement.setAttribute('data-text', s.id);
  };
  D.applyLang = function () {
    var lang = D.lang();
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', L.dir(lang));
  };
  D.applyPrefs = function () { D.applyTheme(); D.applyText(); D.applyLang(); };

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */

  var toastTimer = null;
  D.toast = function (msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.innerHTML = '<span class="toast-inner">' + D.icon('check', { size: 18 }) + '<span>' + D.esc(msg) + '</span></span>';
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); setTimeout(function () { if (!el.classList.contains('show')) el.innerHTML = ''; }, 300); }, 3200);
  };

  /* ------------------------------------------------------------------ */
  /* Dialogs (native <dialog>: focus stays inside, Escape closes)        */
  /* ------------------------------------------------------------------ */

  var dialogSeq = 0;
  D.dialog = function (opts) {
    var opener = document.activeElement;
    var id = 'dlg-' + (++dialogSeq);
    var dlg = document.createElement('dialog');
    dlg.className = 'dialog ' + (opts.className || '');
    dlg.setAttribute('aria-labelledby', id + '-title');
    if (opts.describedby) dlg.setAttribute('aria-describedby', opts.describedby);
    dlg.innerHTML =
      '<div class="dlg-head"><h2 class="dlg-title" id="' + id + '-title">' + opts.title + '</h2>' +
      '<button type="button" class="icon-btn dlg-x" data-dlg-close aria-label="' + D.esc(D.t('close')) + '">' + D.icon('x', { size: 20 }) + '</button></div>' +
      '<div class="dlg-body">' + opts.html + '</div>' +
      (opts.actions ? '<div class="dlg-actions">' + opts.actions + '</div>' : '');
    document.body.appendChild(dlg);
    var closed = false;
    function close(result) {
      if (closed) return;
      closed = true;
      try { dlg.close(); } catch (e) { /* ignore */ }
      dlg.remove();
      if (opts.onClose) opts.onClose(result);
      var back = opts.returnFocus || opener;
      if (back && document.body.contains(back) && back.focus) back.focus();
    }
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) { close(); return; }
      if (e.target.closest('[data-dlg-close]')) close();
    });
    try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
    var first = opts.focus ? dlg.querySelector(opts.focus) : dlg.querySelector('.dlg-body [autofocus], .dlg-body input, .dlg-body button, .dlg-actions .btn');
    if (first) first.focus();
    if (opts.onOpen) opts.onOpen(dlg, close);
    return { el: dlg, close: close };
  };

  D.confirm = function (opts) {
    D.dialog({
      title: D.esc(opts.title),
      html: '<p class="dlg-text">' + D.esc(opts.text) + '</p>',
      actions: '<button type="button" class="btn btn-secondary" data-dlg-close>' + D.esc(D.t('cancel')) + '</button>' +
        '<button type="button" class="btn btn-primary" id="confirm-yes">' + D.esc(opts.yes) + '</button>',
      focus: '[data-dlg-close].btn',
      onOpen: function (dlg, close) {
        dlg.querySelector('#confirm-yes').addEventListener('click', function () { close(true); opts.onYes(); });
      },
    });
  };

  /* ------------------------------------------------------------------ */
  /* Share                                                               */
  /* ------------------------------------------------------------------ */

  D.shareUrl = function (b) { return 'https://landit-uk.com/' + b.id + '/'; };

  function copyText(text, input) {
    function done(ok) { D.toast(ok ? 'Link copied' : 'Select the link to copy it'); }
    function fallback() {
      var ok = false;
      try {
        var el = input;
        var temp = null;
        if (!el) { temp = el = document.createElement('textarea'); el.value = text; el.setAttribute('readonly', ''); el.style.position = 'fixed'; el.style.opacity = '0'; document.body.appendChild(el); }
        el.focus(); el.select();
        ok = document.execCommand('copy');
        if (temp) temp.remove();
      } catch (e) { ok = false; }
      done(ok);
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
        return;
      }
    } catch (e) { /* fall through */ }
    fallback();
  }
  D.copyText = copyText;

  /* Share. On a phone with a share sheet, only the phone's own sheet opens
     (people know it). Landit's dialog opens when there is no share sheet
     (most computers), or when the sheet fails for a reason other than the
     person closing it. The link is copied only when they press Copy. */
  D.share = function (b) {
    var url = D.shareUrl(b);
    var data = { title: b.name, text: b.name + ': ' + b.sub, url: url };
    var canShare = false;
    try { canShare = D.isPhone() && typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data)); } catch (e) { canShare = false; }
    if (canShare) {
      try {
        navigator.share(data).catch(function (err) {
          if (!err || err.name !== 'AbortError') shareDialog(b, url);
        });
        return;
      } catch (e) { /* fall through to the dialog */ }
    }
    shareDialog(b, url);
  };

  function shareDialog(b, url) {
    D.dialog({
      title: D.esc(D.t('share')),
      className: 'dlg-share',
      html:
        '<p class="share-name">' + D.catTile(b, 'sm') + '<span>' + D.bdi(b.name) + '</span></p>' +
        '<label class="field-label" for="share-link">Link to this benefit</label>' +
        '<div class="share-row"><input id="share-link" class="input" type="text" readonly dir="ltr" value="' + D.esc(url) + '">' +
        '<button type="button" class="btn btn-primary" id="share-copy">' + D.icon('copy', { size: 18 }) + '<span>' + D.esc(D.t('copy')) + '</span></button></div>' +
        '<p class="dlg-note">The link shows the benefit only. It does not include your answers.</p>',
      focus: '#share-copy',
      onOpen: function (dlg) {
        var input = dlg.querySelector('#share-link');
        dlg.querySelector('#share-copy').addEventListener('click', function () { copyText(url, input); });
        input.addEventListener('focus', function () { input.select(); });
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /* Read aloud (speech synthesis)                                       */
  /* ------------------------------------------------------------------ */

  D.speechOk = (function () {
    try { return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'; } catch (e) { return false; }
  })();
  D.canRead = function () { return D.speechOk && D.state.prefs.readAloud !== false; };

  var speaking = null;
  function setReadBtn(btn, on) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = D.icon(on ? 'square' : 'volume-2', { size: 18 }) + '<span>' + D.esc(on ? D.t('stop') : D.t('read_aloud')) + '</span>';
  }
  D.readBtn = function (extraAttrs) {
    if (!D.canRead()) return '';
    return '<button type="button" class="btn btn-ghost btn-sm read-btn" data-action="read" aria-pressed="false" ' + (extraAttrs || '') + '>' +
      D.icon('volume-2', { size: 18 }) + '<span>' + D.esc(D.t('read_aloud')) + '</span></button>';
  };
  D.stopReading = function () {
    try { if (D.speechOk) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    if (speaking) setReadBtn(speaking, false);
    speaking = null;
  };
  D.readAloud = function (text, btn) {
    if (!D.speechOk) return;
    var synth = window.speechSynthesis;
    if (speaking === btn) { D.stopReading(); return; }
    D.stopReading();
    var u = new window.SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.95;
    u.onend = u.onerror = function () { if (speaking === btn) { setReadBtn(btn, false); speaking = null; } };
    speaking = btn;
    setReadBtn(btn, true);
    try { synth.speak(u); } catch (e) { setReadBtn(btn, false); speaking = null; }
  };

  /* ------------------------------------------------------------------ */
  /* Safety numbers ("Help now")                                         */
  /* ------------------------------------------------------------------ */

  D.nation = function () { return (D.state.profile && D.state.profile.nation) || 'England'; };

  D.safetyHTML = function (idPrefix) {
    var nation = D.nation();
    var groups = L.safety[nation] || [];
    var html = '<p class="safety-lead">' + D.icon('info', { size: 18 }) + '<span>' + D.esc(L.safetyNotes.emergency) + ' ' +
      'These numbers are for ' + D.esc(nation) + '.</span></p>';
    html += '<div class="safety-groups">';
    groups.forEach(function (g, gi) {
      var open = gi === 0;
      var bid = idPrefix + '-g-' + g.key;
      html += '<div class="safety-group">' +
        '<button type="button" class="disclosure safety-toggle" data-action="disclose" aria-expanded="' + open + '" aria-controls="' + bid + '">' +
        '<span class="safety-ico" aria-hidden="true">' + D.icon(g.icon, { size: 18 }) + '</span>' +
        '<span class="disclosure-text">' + D.esc(g.group) + '</span>' + D.icon('chevron-down', { size: 18, className: 'chev' }) + '</button>' +
        '<ul class="safety-items" id="' + bid + '"' + (open ? '' : ' hidden') + '>';
      g.items.forEach(function (it) {
        var num = it.tel
          ? '<a class="safety-num" href="tel:' + D.esc(it.tel) + '" dir="ltr">' + D.icon('phone', { size: 16 }) + '<span>' + D.esc(it.number) + '</span></a>'
          : '<p class="safety-say" dir="auto">' + D.esc(it.number) + '</p>';
        html += '<li class="safety-item"><p class="safety-label" dir="auto">' + D.esc(it.label) + '</p>' + num +
          (it.note ? '<p class="safety-note" dir="auto">' + D.esc(it.note) + '</p>' : '') +
          (it.url ? '<a class="safety-link" href="' + D.esc(it.url) + '" target="_blank" rel="noopener">' + D.esc(it.url.replace(/^https?:\/\//, '').replace(/\/$/, '')) + ' <span class="sr-only">(opens in a new tab)</span></a>' : '') +
          '</li>';
      });
      html += '</ul></div>';
    });
    html += '</div><p class="safety-foot" dir="auto">' + D.esc(L.safetyNotes.independence) + '</p>';
    return html;
  };

  D.helpNow = function (returnFocus) {
    D.dialog({
      returnFocus: returnFocus && returnFocus.focus ? returnFocus : null,
      title: D.icon('life-buoy', { size: 20 }) + '<span>' + D.esc(D.t('nav_help')) + '</span>',
      className: 'dlg-help',
      html: D.safetyHTML('dlg-help'),
      actions: '<button type="button" class="btn btn-secondary" data-dlg-close>' + D.esc(D.t('close')) + '</button>',
      focus: '.dlg-x',
    });
  };

  /* Generic disclosure toggle: button[aria-expanded][aria-controls]. */
  D.toggleDisclosure = function (btn, force) {
    var open = typeof force === 'boolean' ? force : btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    var target = document.getElementById(btn.getAttribute('aria-controls'));
    if (target) target.hidden = !open;
    return open;
  };

  D.footer = function (opts) {
    opts = opts || {};
    return '<footer class="page-foot">' +
      '<p class="disclaimer">' + D.esc(L.disclaimer) + '</p>' +
      '<p class="foot-meta">' + (opts.free === false ? '' : '<span class="free-label">' + D.esc(D.t('free_badge')) + '</span>') + '<span dir="auto">' + D.esc(L.rates) + '</span></p>' +
      '</footer>';
  };

  D.go = function (hash) {
    if (location.hash === hash) { if (D.render) D.render(); } else location.hash = hash;
  };
})();

/* Landit design C (Big and clear): core.
   State and storage, words, small helpers, dialogs, toasts, sharing and
   reading aloud. Classic script (works from file://). Everything lives on
   window.LC so the other scripts can use it. */
(function () {
  'use strict';
  var L = window.LANDIT;
  var THEMES = window.LANDIT_THEMES || [];
  var C = window.LC = {};
  var PREFIX = 'landit-c:';
  var KEY = PREFIX + 'state';

  C.L = L;
  C.THEMES = THEMES;
  C.views = {};     // screens, filled by the app-*.js files
  C.actions = {};   // click handlers for [data-action], filled the same way
  C.defaultTheme = THEMES.filter(function (t) { return t.default; })[0] || THEMES[0];

  /* ------------------------------------------------------------------ */
  /* Storage. Every call is wrapped: the app must work without storage.  */
  /* ------------------------------------------------------------------ */

  function readStore() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeStore(obj) {
    try { window.localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* private window or blocked storage */ }
  }
  function clearStore() {
    try {
      var ls = window.localStorage, keys = [];
      for (var i = 0; i < ls.length; i++) {
        var k = ls.key(i);
        if (k && k.indexOf(PREFIX) === 0) keys.push(k);
      }
      keys.forEach(function (k) { ls.removeItem(k); });
    } catch (e) { /* nothing to clear */ }
  }

  function freshState() {
    return {
      v: 1,
      user: null,               // {name, email}
      signedIn: false,
      profile: {},              // questionnaire answers, the keys LANDIT.match reads
      answered: false,          // questionnaire finished or skipped
      ack: false,               // disclaimer acknowledged
      tracked: [],              // [{id, status}]
      claims: {},               // {benefitId: status}: kept when something is untracked, so tracking it again restores it
      docTicks: {},             // {benefitId: [docId]}
      stepTicks: {},            // {benefitId: [stepIndex]}
      chat: [],                 // [{who:'me', text} | {who:'bot', r}]
      posts: [],                // posts written here
      comments: {},             // {postId: [{author, body, when, mine}]}
      myRatings: {},            // {benefitId: {worth, speed, ease}} option indexes
      prefs: { theme: C.defaultTheme ? C.defaultTheme.id : 'clear', text: 'normal', lang: 'en', readAloud: true, rail: false },
      ui: { sort: 'value', commFilter: 'all' },
    };
  }

  function merge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    Object.keys(saved).forEach(function (k) {
      if (k === 'prefs' || k === 'ui') base[k] = Object.assign(base[k], saved[k] || {});
      else base[k] = saved[k];
    });
    return base;
  }

  C.state = merge(freshState(), readStore());
  C.save = function () { writeStore(C.state); };
  C.resetAll = function () {
    clearStore();
    C.state = freshState();
    C.save();
  };
  /* A new person on this device: nothing from the last person carries over
     (answers, tracked applications, ticks, chat, posts, ratings). Only the
     look of the app (colours, text size, language, read aloud) is kept. */
  C.startFresh = function (user) {
    var prefs = Object.assign({}, C.state.prefs);
    clearStore();
    C.state = freshState();
    C.state.prefs = Object.assign(C.state.prefs, prefs);
    C.state.user = user;
    C.state.signedIn = true;
    C.save();
  };

  /* ------------------------------------------------------------------ */
  /* Query parameters, applied once on load.                             */
  /* ?reset=1  ?demo=1  ?lang=ar  ?theme=warm  ?text=xlarge               */
  /* ------------------------------------------------------------------ */

  C.seedDemo = function () {
    var d = L.demo;
    var s = freshState();
    s.user = { name: d.name, email: d.email };
    s.signedIn = true;
    s.profile = JSON.parse(JSON.stringify(d.profile));
    s.answered = true;
    s.ack = true;
    s.tracked = d.tracked.map(function (t) { return { id: t.id, status: t.status }; });
    d.tracked.forEach(function (t) { s.docTicks[t.id] = (t.ticked || []).slice(); });
    C.state = s;
    C.save();
  };

  C.applyParams = function () {
    var qs;
    try { qs = new URLSearchParams(window.location.search); } catch (e) { return; }
    var hash = window.location.hash || '';
    if (qs.get('reset') === '1') {
      C.resetAll();
      if (hash !== '#/login') window.location.hash = '#/register';
    }
    if (qs.get('demo') === '1') {
      C.resetAll();
      C.seedDemo();
      if (!/^#\/./.test(hash)) window.location.hash = '#/chat';
    }
    var lang = qs.get('lang');
    if (lang && L.i18n.languages.some(function (l) { return l.code === lang; })) C.state.prefs.lang = lang;
    var theme = qs.get('theme');
    if (theme && THEMES.some(function (t) { return t.id === theme; })) C.state.prefs.theme = theme;
    var text = qs.get('text');
    if (text && /^(normal|large|xlarge)$/.test(text)) C.state.prefs.text = text;
    C.save();
  };

  /* ------------------------------------------------------------------ */
  /* Preferences: theme colours, text size, language and direction.      */
  /* ------------------------------------------------------------------ */

  C.themeById = function (id) { return THEMES.filter(function (t) { return t.id === id; })[0] || C.defaultTheme; };

  var VAR = { bg: '--bg', surface: '--surface', surface2: '--surface-2', text: '--text', textMuted: '--text-muted',
    border: '--border', accent: '--accent', onAccent: '--on-accent', focus: '--focus', good: '--good' };

  C.applyPrefs = function () {
    var root = document.documentElement;
    var p = C.state.prefs;
    var t = C.themeById(p.theme);
    if (t) {
      Object.keys(VAR).forEach(function (k) { if (t.colors[k]) root.style.setProperty(VAR[k], t.colors[k]); });
      Object.keys(t.colors.cat || {}).forEach(function (k) { root.style.setProperty('--cat-' + k, t.colors.cat[k]); });
      root.setAttribute('data-theme', t.id);
      root.setAttribute('data-dark', t.dark ? 'true' : 'false');
      root.style.colorScheme = t.dark ? 'dark' : 'light';
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', t.colors.bg);
    }
    root.setAttribute('data-text', p.text || 'normal');
    root.setAttribute('lang', p.lang || 'en');
    root.setAttribute('dir', L.dir(p.lang || 'en'));
    root.setAttribute('data-read', p.readAloud && C.speech.supported ? 'on' : 'off');
  };

  /* ------------------------------------------------------------------ */
  /* Words and small helpers                                             */
  /* ------------------------------------------------------------------ */

  C.lang = function () { return C.state.prefs.lang || 'en'; };
  C.t = function (key) { return L.t(key, C.lang()); };
  /* Plain English wording in English, the shared translation otherwise
     (only keys that exist in LANDIT.i18n; no new translations). */
  C.tx = function (key, english) { return C.lang() === 'en' ? english : L.t(key, C.lang()); };
  C.tf = function (key, vars) { return L.tf(key, vars, C.lang()); };

  C.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  /* An icon from the shared set, sized by CSS (1.4em by default). */
  C.ic = function (name, cls) { return L.icon(name, { className: 'ic' + (cls ? ' ' + cls : '') }); };
  /* Direction icons (arrows, chevrons) mirror in right to left. */
  C.icd = function (name, cls) { return C.ic(name, 'flip' + (cls ? ' ' + cls : '')); };

  C.plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
  C.cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };

  /* The Landit glyph: an L that is also a landing path (public/brand). */
  C.glyph = function (cls) {
    return '<svg class="glyph' + (cls ? ' ' + cls : '') + '" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<path d="M 28 26 V 46 C 28 60 36 68 50 68 L 54 68" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="71" cy="68" r="8" fill="currentColor"/></svg>';
  };
  C.brand = function (tag) {
    tag = tag || 'span';
    return '<' + tag + ' class="brand"><span class="brand-mark">' + C.glyph() + '</span><span class="brand-word">Landit</span></' + tag + '>';
  };

  C.cat = function (b) { return L.categories[b.category] || { label: b.category, icon: 'circle' }; };
  C.catVar = function (key) { return 'style="--c: var(--cat-' + C.esc(key) + ')"'; };
  C.catChip = function (key, extra) {
    var c = L.categories[key] || { label: key, icon: 'circle' };
    return '<span class="cat-chip" ' + C.catVar(key) + '>' + C.ic(c.icon) + '<span>' + C.esc(c.label) + '</span></span>' + (extra || '');
  };
  C.badge = function (b, cls) {
    return '<span class="badge-ic' + (cls ? ' ' + cls : '') + '" ' + C.catVar(b.category) + '>' + C.ic(C.cat(b).icon) + '</span>';
  };

  /* Value always with its qualifier. Returns HTML. */
  C.valueHTML = function (b, cls) {
    var v = L.valueParts(b);
    cls = cls || 'val';
    if (v.amount) {
      return '<span class="' + cls + '"><span class="val-amt">' + C.esc(v.amount) + '</span>' +
        (v.label ? '<span class="val-q">' + C.esc(v.label) + '</span>' : '') + '</span>';
    }
    if (v.label) return '<span class="' + cls + '"><span class="val-text">' + C.esc(v.label) + '</span></span>';
    return '<span class="' + cls + '"><span class="val-none">' + C.esc(C.t('no_amount')) + '</span></span>';
  };
  C.valueText = function (b) {
    var v = L.valueParts(b);
    if (v.amount) return v.amount + (v.label ? ', ' + v.label.toLowerCase() : '');
    return v.label || C.t('no_amount');
  };

  C.docsNeeded = function (b) { return b.docs.filter(function (d) { return d.certainty === 'needed'; }); };
  C.docsMaybe = function (b) { return b.docs.filter(function (d) { return d.certainty === 'maybe'; }); };

  /* Effort in plain words. The label is Landit's estimate from the number
     of documents (needed and maybe) and steps, so the detail counts the
     same things. `time` is the guide's own wording, shown in list rows. */
  C.hasEffort = function (b) { return !!b.effortLabel; };
  C.effort = function (b) {
    var dots = { low: 1, medium: 2, high: 3 }[b.effort] || 0;
    var bits = [];
    if (b.docsKnown) bits.push(b.docs.length === 0 ? 'no documents' : C.plural(b.docs.length, 'document', 'documents'));
    if (!b.guide.generic && b.guide.steps.length) bits.push(C.plural(b.guide.steps.length, 'step', 'steps'));
    var time = !b.guide.generic && b.guide.time ? b.guide.time.charAt(0).toLowerCase() + b.guide.time.slice(1) : '';
    return { dots: dots, word: b.effortLabel || 'No time or document list yet', detail: bits.join(', '), time: time };
  };
  C.dotsHTML = function (n) {
    var out = '<span class="dots" aria-hidden="true">';
    for (var i = 1; i <= 3; i++) out += '<span class="dot' + (i <= n ? ' on' : '') + '"></span>';
    return out + '</span>';
  };
  /* mode 'row': label plus the time to apply. mode 'detail': label plus
     the documents and steps it is based on. */
  C.effortHTML = function (b, mode) {
    var e = C.effort(b);
    var detail = mode === 'row' ? e.time : e.detail;
    return '<span class="effort' + (e.dots ? '' : ' effort-none') + '">' + C.dotsHTML(e.dots) +
      '<span class="effort-words"><strong>' + C.esc(e.word) + '</strong>' + (detail ? '<span class="effort-detail">' + (mode === 'row' ? ', ' : ': ') + C.esc(detail) + '</span>' : '') + '</span></span>';
  };

  /* Certainty: a small calm tag on schemes that depend on things Landit
     did not ask (LANDIT.fitLabel.possible). Only for open schemes. */
  C.fitOf = function (id) { var m = C.match(); return m.fit ? m.fit[id] || null : null; };
  C.fitTag = function (id) {
    if (C.fitOf(id) !== 'possible') return '';
    return '<span class="fit-tag">' + C.ic('circle-help') + '<span>' + C.esc(L.fitLabel.possible) + '</span></span>';
  };

  /* Where a scheme stands for this person: 'open', 'blocked' or 'hidden'. */
  C.standing = function (id) {
    var m = C.match();
    if (m.open.some(function (b) { return b.id === id; })) return { state: 'open' };
    var x = m.blocked.filter(function (y) { return y.benefit.id === id; })[0];
    if (x) return { state: 'blocked', kind: x.kind };
    return { state: 'hidden' };
  };
  /* The no recourse to public funds rule in plain words, per blocked kind.
     Short sentences for people reading English as a second language. */
  C.blockedText = {
    'public-fund': 'This is a public fund. Your visa has a no recourse to public funds rule, so it is not open to you.',
    'needs-public-fund': 'This is not a public fund. But you usually need a public fund, such as Universal Credit, to get it. So it is not open to you now.',
  };

  C.footer = function (opts) {
    opts = opts || {};
    return '<footer class="site-foot"><p class="disclaimer">' + C.esc(L.disclaimer) + '</p>' +
      '<p class="foot-meta">' + (opts.noFree ? '' : '<span class="free-label">' + C.esc(C.t('free_badge')) + '</span>') + '<span>' + C.esc(L.rates) + '</span></p></footer>';
  };

  C.trackStatusLabel = function (value) {
    var s = L.trackStatuses.filter(function (x) { return x.value === value; })[0];
    return s ? C.t(s.i18n) : value;
  };
  var STATUS_ICON = { 'Not started': 'circle', 'Applied': 'hourglass', 'Approved': 'circle-check', 'Turned down': 'x' };
  var STATUS_CLS = { 'Not started': 'st-none', 'Applied': 'st-applied', 'Approved': 'st-approved', 'Turned down': 'st-down' };
  C.statusPill = function (value) {
    value = value || 'Not started';
    return '<span class="pill ' + STATUS_CLS[value] + '">' + C.ic(STATUS_ICON[value] || 'circle') + '<span>' + C.esc(C.trackStatusLabel(value)) + '</span></span>';
  };

  /* ------------------------------------------------------------------ */
  /* Matching (memoised on the profile)                                  */
  /* ------------------------------------------------------------------ */

  var matchCache = { key: null, value: null };
  C.match = function () {
    var key = JSON.stringify(C.state.profile || {});
    if (matchCache.key !== key) matchCache = { key: key, value: L.match(C.state.profile || {}) };
    return matchCache.value;
  };
  C.isOpen = function (id) { return C.match().open.some(function (b) { return b.id === id; }); };

  /* ------------------------------------------------------------------ */
  /* Tracking, ticks and claim status                                    */
  /* ------------------------------------------------------------------ */

  C.trackedEntry = function (id) { return C.state.tracked.filter(function (t) { return t.id === id; })[0] || null; };
  C.isTracked = function (id) { return !!C.trackedEntry(id); };
  C.track = function (id) {
    C.state.claims = C.state.claims || {};
    if (!C.isTracked(id) && L.benefitById(id)) C.state.tracked.unshift({ id: id, status: C.state.claims[id] || 'Not started' });
    C.save();
  };
  /* Untracking keeps the claim status (and the ticks), so a slip of the
     finger loses nothing: tracking it again brings them back. */
  C.untrack = function (id) {
    var t = C.trackedEntry(id);
    C.state.claims = C.state.claims || {};
    if (t) C.state.claims[id] = t.status;
    C.state.tracked = C.state.tracked.filter(function (x) { return x.id !== id; });
    C.save();
  };
  C.setClaim = function (id, status) {
    if (!C.isTracked(id)) C.track(id);
    C.trackedEntry(id).status = status;
    C.state.claims = C.state.claims || {};
    C.state.claims[id] = status;
    C.save();
  };
  C.docTicks = function (id) { return C.state.docTicks[id] || []; };
  C.setDoc = function (id, docId, on) {
    var list = C.docTicks(id).filter(function (x) { return x !== docId; });
    if (on) list.push(docId);
    C.state.docTicks[id] = list;
    C.save();
  };
  C.stepTicks = function (id) { return C.state.stepTicks[id] || []; };
  C.setStep = function (id, idx, on) {
    var list = C.stepTicks(id).filter(function (x) { return x !== idx; });
    if (on) list.push(idx);
    C.state.stepTicks[id] = list;
    C.save();
  };
  /* Same shape as LANDIT.demo.tracked, for the chat. */
  C.trackedForChat = function () {
    return C.state.tracked.map(function (t) { return { id: t.id, status: t.status, ticked: C.docTicks(t.id).slice() }; });
  };
  C.docCountText = function (b) {
    if (!b.docs.length) return b.docsKnown ? 'Nothing to gather' : 'No document list yet';
    var ticks = C.docTicks(b.id);
    var have = b.docs.filter(function (d) { return ticks.indexOf(d.id) >= 0; }).length;
    return have + ' of ' + b.docs.length + ' documents ticked';
  };

  /* Track button used on cards, chat cards and the detail page. Each one
     carries the benefit's name for screen readers, so a list of 79 rows
     does not read as 79 identical "Track" buttons. */
  C.srName = function (id) {
    var b = L.benefitById(id);
    return b ? '<span class="sr-only"> ' + C.esc(b.name) + '</span>' : '';
  };
  function trackInner(id, on) {
    return C.ic(on ? 'bookmark-check' : 'bookmark') + '<span>' + C.esc(on ? C.t('tracking') : C.t('track')) + '</span>' + C.srName(id);
  }
  C.trackBtn = function (id, cls) {
    var on = C.isTracked(id);
    return '<button type="button" class="btn ' + (cls || 'btn-secondary btn-sm') + ' track-btn" data-action="track" data-id="' + C.esc(id) + '" data-track-btn="' + C.esc(id) + '" aria-pressed="' + on + '">' +
      trackInner(id, on) + '</button>';
  };
  C.shareBtn = function (id, cls) {
    return '<button type="button" class="btn ' + (cls || 'btn-secondary btn-sm') + '" data-action="share" data-id="' + C.esc(id) + '">' +
      C.ic('share-2') + '<span>' + C.esc(C.t('share')) + '</span>' + C.srName(id) + '</button>';
  };
  C.syncTrackButtons = function (id) {
    var on = C.isTracked(id);
    document.querySelectorAll('[data-track-btn="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(on));
      btn.innerHTML = trackInner(id, on);
    });
  };

  /* ------------------------------------------------------------------ */
  /* Toasts (one live region, polite)                                    */
  /* ------------------------------------------------------------------ */

  var toastTimer = null;
  C.toast = function (msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
    window.clearTimeout(toastTimer);
    window.setTimeout(function () {
      el.textContent = msg;
      el.classList.add('show');
      toastTimer = window.setTimeout(function () { el.classList.remove('show'); }, 3600);
    }, 30);
  };

  C.reducedMotion = function () {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };

  /* ------------------------------------------------------------------ */
  /* Dialogs: native <dialog> (focus stays inside, Escape closes),       */
  /* focus goes back to the button that opened it.                       */
  /* ------------------------------------------------------------------ */

  var dlgCount = 0;
  C.dialog = function (opts) {
    var opener = document.activeElement;
    var id = 'dlg-' + (++dlgCount);
    var dlg = document.createElement('dialog');
    dlg.className = 'dlg' + (opts.wide ? ' dlg-wide' : '');
    dlg.setAttribute('aria-labelledby', id + '-t');
    dlg.innerHTML =
      '<div class="dlg-head"><h2 class="dlg-title" id="' + id + '-t">' + C.esc(opts.title) + '</h2>' +
      '<button type="button" class="icon-btn" data-dlg-close aria-label="' + C.esc(C.t('close')) + '">' + C.ic('x') + '</button></div>' +
      '<div class="dlg-body">' + opts.html +
        (opts.disclaimer ? '<p class="dlg-disclaimer">' + C.esc(L.disclaimer) + '</p>' : '') + '</div>';
    document.body.appendChild(dlg);
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      try { dlg.close(); } catch (e) { /* already closed */ }
      dlg.remove();
      if (opts.onClose) opts.onClose();
      if (opener && opener.isConnected && opener.focus) opener.focus();
    }
    dlg.addEventListener('close', close);
    dlg.addEventListener('click', function (e) {
      if (e.target.closest('[data-dlg-close]')) { e.preventDefault(); close(); return; }
      if (e.target === dlg) close();   // a click on the backdrop
    });
    try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
    var first = dlg.querySelector('[autofocus]') || dlg.querySelector('.dlg-body input:not([type="hidden"]), .dlg-body select, .dlg-body textarea, .dlg-body button, .dlg-body a[href]');
    if (first) first.focus();
    if (opts.onOpen) opts.onOpen(dlg, close);
    return { el: dlg, close: close };
  };

  /* ------------------------------------------------------------------ */
  /* Share: https://landit-uk.com/<id>/                                   */
  /* navigator.share when there is one, otherwise copy and say so. The    */
  /* link is always shown in a sheet with a Copy button too.             */
  /* ------------------------------------------------------------------ */

  C.shareUrl = function (id) { return 'https://landit-uk.com/' + id + '/'; };

  function copyText(text, input) {
    function fallback() {
      try {
        var el = input;
        var temp = null;
        if (!el) {
          temp = document.createElement('textarea');
          temp.value = text;
          temp.setAttribute('readonly', '');
          temp.style.position = 'fixed';
          temp.style.opacity = '0';
          document.body.appendChild(temp);
          el = temp;
        }
        el.focus();
        el.select();
        var ok = document.execCommand('copy');
        if (temp) temp.remove();
        return Promise.resolve(ok);
      } catch (e) { return Promise.resolve(false); }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
      }
    } catch (e) { /* no clipboard api */ }
    return fallback();
  }
  C.copyText = copyText;

  C.share = function (id) {
    var b = L.benefitById(id);
    if (!b) return;
    var url = C.shareUrl(id);
    var d = C.dialog({
      title: C.t('share'),
      disclaimer: true,
      html:
        '<p class="dlg-lead"><bdi>' + C.esc(b.name) + '</bdi></p>' +
        '<label class="field-label" for="share-link">Link to this benefit</label>' +
        '<div class="share-row"><textarea class="input share-input" id="share-link" rows="2" readonly dir="ltr">' + C.esc(url) + '</textarea>' +
        '<button type="button" class="btn btn-primary" data-share-copy autofocus>' + C.ic('copy') + '<span>' + C.esc(C.t('copy')) + ' link</span></button></div>' +
        '<p class="dlg-note">Send this link to a friend, a family member or an adviser.</p>',
      onOpen: function (dlg) {
        var input = dlg.querySelector('#share-link');
        dlg.querySelector('[data-share-copy]').addEventListener('click', function () {
          copyText(url, input).then(function (ok) { C.toast(ok ? 'Link copied' : 'Select the link to copy it'); });
        });
      },
    });
    var shared = false;
    try {
      if (navigator.share) {
        shared = true;
        navigator.share({ title: b.name, text: b.name + ' on Landit', url: url }).catch(function () { /* closed or not allowed */ });
      }
    } catch (e) { shared = false; }
    if (!shared) copyText(url).then(function (ok) { if (ok) C.toast('Link copied'); });
    return d;
  };

  /* ------------------------------------------------------------------ */
  /* Read aloud (speechSynthesis). Hidden when it is not there.          */
  /* ------------------------------------------------------------------ */

  C.speech = {
    supported: !!(window.speechSynthesis && window.SpeechSynthesisUtterance),
    btn: null,
    stop: function () {
      try { window.speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ }
      if (this.btn) this.reset(this.btn);
      this.btn = null;
    },
    reset: function (btn) {
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = C.ic('volume-2') + '<span>' + C.esc(btn.getAttribute('data-label') || C.t('read_aloud')) + '</span>';
    },
    toggle: function (btn, text) {
      var self = this;
      if (!this.supported) return;
      if (this.btn === btn) { this.stop(); return; }
      this.stop();
      var u = new window.SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.rate = 0.92;
      u.onend = u.onerror = function () { if (self.btn === btn) { self.reset(btn); self.btn = null; } };
      this.btn = btn;
      btn.setAttribute('aria-pressed', 'true');
      btn.innerHTML = C.ic('square') + '<span>' + C.esc(C.t('stop')) + '</span>';
      try { window.speechSynthesis.speak(u); } catch (e) { this.reset(btn); this.btn = null; }
    },
  };
  C.readBtn = function (target, label, cls) {
    if (!C.speech.supported) return '';
    label = label || C.t('read_aloud');
    return '<button type="button" class="btn ' + (cls || 'btn-secondary btn-sm') + ' read-btn" data-action="read" data-target="' + C.esc(target) + '" data-label="' + C.esc(label) + '" aria-pressed="false">' +
      C.ic('volume-2') + '<span>' + C.esc(label) + '</span></button>';
  };
  /* The words to read: every [data-say] inside the target, in order. */
  C.sayText = function (sel) {
    var root = document.querySelector(sel);
    if (!root) return '';
    var parts = [].map.call(root.querySelectorAll('[data-say]'), function (el) { return el.textContent.replace(/\s+/g, ' ').trim(); });
    return parts.filter(Boolean).join('. ').replace(/\.\s*\./g, '.');
  };
})();

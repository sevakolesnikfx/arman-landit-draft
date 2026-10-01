/* Landit design A, "Paper": core.
   State and storage, words, themes, text size, routing, dialogs, toasts,
   sharing, reading aloud. Classic script, no modules, works from file://.
   Everything about schemes comes from window.LANDIT (../shared). */
(function () {
  'use strict';
  var L = window.LANDIT;
  var P = window.PAPER = window.PAPER || {};
  P.L = L;
  P.views = {};
  P.acts = {};
  P.changes = {};
  P.forms = {};
  P.inputs = {};
  P.ui = { expanded: {}, groupOpen: {}, speaking: null, draft: '', qStep: 0 };

  /* ------------------------------------------------------------------ */
  /* Storage: every key starts with "landit-a:". Storage may be missing. */
  /* ------------------------------------------------------------------ */
  var PREFIX = 'landit-a:';
  var KEY = PREFIX + 'state';

  P.defaults = function () {
    return {
      v: 1,
      user: null,
      session: false,
      profile: {},
      ack: false,
      tracked: [],
      steps: {},
      chat: [],
      prefs: { theme: null, text: 'normal', lang: 'en', readAloud: true, collapsed: false },
      community: { posts: [], comments: {}, ratings: {} },
      view: { sort: 'value', cat: 'all' },
    };
  };

  function readStored() {
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function mergeState(saved) {
    var d = P.defaults();
    if (!saved || typeof saved !== 'object') return d;
    Object.keys(d).forEach(function (k) {
      if (!(k in saved)) return;
      if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && saved[k] && typeof saved[k] === 'object') {
        d[k] = Object.assign({}, d[k], saved[k]);
      } else {
        d[k] = saved[k];
      }
    });
    return d;
  }

  P.state = mergeState(readStored());

  P.save = function () {
    try { window.localStorage.setItem(KEY, JSON.stringify(P.state)); } catch (e) { /* storage off: keep going in memory */ }
  };

  P.clearStorage = function () {
    try {
      var ls = window.localStorage, gone = [];
      for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k && k.indexOf(PREFIX) === 0) gone.push(k); }
      gone.forEach(function (k) { ls.removeItem(k); });
    } catch (e) { /* nothing to clear */ }
  };

  P.resetState = function () {
    P.clearStorage();
    P.state = P.defaults();
    P.ui.expanded = {};
    P.ui.groupOpen = {};
    P.ui.draft = '';
    P._mk = null;
  };

  P.seedDemo = function () {
    var d = L.demo;
    var prefs = P.state.prefs;
    P.resetState();
    P.state.prefs = Object.assign(P.state.prefs, { lang: prefs.lang, theme: prefs.theme, text: prefs.text });
    P.state.user = { name: d.name, email: d.email };
    P.state.session = true;
    P.state.profile = Object.assign({}, d.profile);
    P.state.ack = true;
    P.state.tracked = d.tracked.map(function (t) { return { id: t.id, status: t.status, ticked: (t.ticked || []).slice() }; });
    P.save();
  };

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                      */
  /* ------------------------------------------------------------------ */
  P.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var esc = P.esc;
  P.icon = function (name, size, cls) { return L.icon(name, { size: size || 20, className: cls }); };
  P.lang = function () { return P.state.prefs.lang || 'en'; };
  /* Plainer English for a few shared words (same meaning). Only used where
     the page shows English: in English, or for words that have no
     translation yet. Translated words in other languages stay as they are. */
  var PLAIN_EN = {
    claim_status: 'Where is your application now?',
    tap_step: 'Tick each step when you finish it',
    rate_this: 'Rate this benefit',
  };
  P.t = function (key) {
    var lang = P.lang();
    if (PLAIN_EN[key] && (lang === 'en' || L.i18n.englishOnly.indexOf(key) >= 0)) return PLAIN_EN[key];
    return L.t(key, lang);
  };
  P.tf = function (key, vars) { return L.tf(key, vars, P.lang()); };
  P.isRtl = function () { return L.dir(P.lang()) === 'rtl'; };
  P.reducedMotion = function () {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };
  P.signedIn = function () { return !!(P.state.user && P.state.session); };
  /* Where focus goes back to when a dialog opened from the account menu closes. */
  P.menuReturn = function (el) {
    if (el && el.closest && el.closest('#acct-menu')) {
      if (P.closeMenu) P.closeMenu(true);
      return document.getElementById('acct-btn');
    }
    return el || null;
  };
  P.cat = function (key) { return L.categories[key] || { label: key, icon: 'circle' }; };
  P.firstName = function () { return (P.state.user && P.state.user.name ? String(P.state.user.name).trim().split(/\s+/)[0] : ''); };
  P.initial = function () {
    var n = (P.state.user && (P.state.user.name || P.state.user.email)) || '?';
    return String(n).trim().charAt(0).toUpperCase() || '?';
  };
  P.uid = function () { return Math.random().toString(36).slice(2, 9); };
  /* English scheme text inside a right to left page keeps its order. */
  P.bdi = function (s) { return '<bdi>' + P.esc(s) + '</bdi>'; };

  /* The match for the current answers, cached until the answers change. */
  P.match = function () {
    var key = JSON.stringify(P.state.profile || {});
    if (P._mk !== key) { P._m = L.match(P.state.profile || {}); P._mk = key; }
    return P._m;
  };
  P.standing = function (id) {
    var m = P.match();
    for (var i = 0; i < m.open.length; i++) if (m.open[i].id === id) return { state: 'open' };
    for (var j = 0; j < m.blocked.length; j++) if (m.blocked[j].benefit.id === id) return { state: 'blocked', reason: m.blocked[j].reason, kind: m.blocked[j].kind };
    return { state: 'hidden' };
  };

  /* Amount and qualifier, always together. */
  P.value = function (b) {
    var parts = L.valueParts(b);
    if (b.valueKind === 'amount' && parts.amount) return { kind: 'amount', amount: parts.amount, label: parts.label };
    if (b.valueKind === 'label' && parts.label) return { kind: 'label', amount: null, label: parts.label };
    return { kind: 'none', amount: null, label: null };
  };
  /* The qualifier read around the amount: "Could be worth" (amount) "a year",
     "Up to" (amount) "one-off", "Typical annual saving" (amount). Every word
     comes from the catalog label; nothing is added or dropped. */
  P.valueView = function (b) {
    var v = P.value(b);
    if (v.kind !== 'amount') return v;
    var q = String(v.label || ''), lead = q, after = '';
    var m = /^(could be worth|up to),\s*(.+)$/i.exec(q);
    if (m) { lead = m[1]; after = m[2]; }
    lead = lead ? lead.charAt(0).toUpperCase() + lead.slice(1) : '';
    return { kind: 'amount', amount: v.amount, label: v.label, lead: lead, after: after };
  };
  /* Valued amount as HTML: lead line, the amount, then the rest. */
  P.valueHtml = function (b, small) {
    var v = P.valueView(b);
    if (v.kind === 'amount') {
      return '<p class="val-q">' + esc(v.lead) + '</p>' +
        '<p class="val-amt' + (small ? ' sm' : '') + '">' + esc(v.amount) + (v.after ? ' <span class="val-after">' + esc(v.after) + '</span>' : '') + '</p>';
    }
    if (v.kind === 'label') return '<p class="val-q">What you get</p><p class="val-text' + (small ? ' sm' : '') + '">' + esc(v.label) + '</p>';
    return '<p class="val-none">' + esc(P.t('no_amount')) + '</p>';
  };

  /* Certainty from the matcher: 'confirmed', 'possible', or null when the
     scheme is not open for these answers. */
  P.fit = function (id) {
    var m = P.match();
    return m.fit && m.fit[id] ? m.fit[id] : null;
  };
  P.fitTag = function (id) {
    if (P.fit(id) !== 'possible') return '';
    return '<span class="fit-tag">' + P.icon('circle-help', 16) + '<span>' + esc(L.fitLabel.possible) + '</span></span>';
  };

  /* The disclaimer, word for word, as a quiet line. */
  P.discLine = function (cls) {
    return '<p class="disc-line ' + (cls || '') + '" dir="auto">' + esc(L.disclaimer) + '</p>';
  };

  P.docCounts = function (b) {
    var needed = b.docs.filter(function (d) { return d.certainty === 'needed'; });
    var maybe = b.docs.filter(function (d) { return d.certainty === 'maybe'; });
    return { needed: needed, maybe: maybe };
  };

  /* ------------------------------------------------------------------ */
  /* Tracking                                                           */
  /* ------------------------------------------------------------------ */
  P.tracked = function (id) {
    for (var i = 0; i < P.state.tracked.length; i++) if (P.state.tracked[i].id === id) return P.state.tracked[i];
    return null;
  };
  P.track = function (id) {
    if (P.tracked(id) || !L.benefitById(id)) return;
    P.state.tracked.push({ id: id, status: 'Not started', ticked: [] });
    P.save();
  };
  P.untrack = function (id) {
    P.state.tracked = P.state.tracked.filter(function (t) { return t.id !== id; });
    delete P.ui.expanded[id];
    P.save();
  };
  P.toggleTrack = function (id) {
    var b = L.benefitById(id);
    if (!b) return false;
    if (P.tracked(id)) { P.untrack(id); P.toast('Removed from Tracked applications'); return false; }
    P.track(id);
    P.toast('Added to Tracked applications');
    return true;
  };
  P.setStatus = function (id, status) {
    if (!P.tracked(id)) P.track(id);
    P.tracked(id).status = status;
    P.save();
  };
  P.toggleDoc = function (id, docId, on) {
    var t = P.tracked(id);
    if (!t) { P.track(id); t = P.tracked(id); }
    var has = t.ticked.indexOf(docId) >= 0;
    if (on && !has) t.ticked.push(docId);
    if (!on && has) t.ticked = t.ticked.filter(function (x) { return x !== docId; });
    P.save();
  };
  P.statusKey = function (value) {
    return { 'Not started': 'none', 'Applied': 'applied', 'Approved': 'approved', 'Turned down': 'declined' }[value] || 'none';
  };
  P.statusLabel = function (value) {
    var s = L.trackStatuses.filter(function (x) { return x.value === value; })[0];
    return s ? P.t(s.i18n) : value;
  };

  /* ------------------------------------------------------------------ */
  /* Themes, text size, language                                        */
  /* ------------------------------------------------------------------ */
  P.themes = window.LANDIT_THEMES || [];
  P.theme = function () {
    var id = P.state.prefs.theme;
    return P.themes.filter(function (t) { return t.id === id; })[0] ||
      P.themes.filter(function (t) { return t.default; })[0] || P.themes[0];
  };
  P.applyTheme = function () {
    var t = P.theme();
    if (!t) return;
    var c = t.colors, root = document.documentElement, s = root.style;
    s.setProperty('--bg', c.bg);
    s.setProperty('--surface', c.surface);
    s.setProperty('--surface-2', c.surface2);
    s.setProperty('--text', c.text);
    s.setProperty('--text-muted', c.textMuted);
    s.setProperty('--border', c.border);
    s.setProperty('--accent', c.accent);
    s.setProperty('--on-accent', c.onAccent);
    s.setProperty('--focus', c.focus);
    Object.keys(c.cat || {}).forEach(function (k) { s.setProperty('--cat-' + k, c.cat[k]); });
    root.setAttribute('data-theme', t.id);
    root.setAttribute('data-dark', t.dark ? 'true' : 'false');
    root.style.colorScheme = t.dark ? 'dark' : 'light';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', c.bg);
  };
  P.textSizes = [
    { id: 'normal', label: 'Normal', scale: '100%' },
    { id: 'large', label: 'Large', scale: '112.5%' },
    { id: 'xlarge', label: 'Extra large', scale: '125%' },
  ];
  P.applyText = function () {
    var id = P.state.prefs.text || 'normal';
    var s = P.textSizes.filter(function (x) { return x.id === id; })[0] || P.textSizes[0];
    document.documentElement.style.fontSize = s.scale;
    document.documentElement.setAttribute('data-text', s.id);
  };
  P.applyLang = function () {
    var code = P.lang();
    if (!L.i18n.languages.some(function (l) { return l.code === code; })) code = P.state.prefs.lang = 'en';
    document.documentElement.setAttribute('lang', code === 'en' ? 'en-GB' : code);
    document.documentElement.setAttribute('dir', L.dir(code));
  };
  P.langName = function (code) {
    var l = L.i18n.languages.filter(function (x) { return x.code === code; })[0];
    return l ? l.name : code;
  };

  /* ------------------------------------------------------------------ */
  /* Toasts (one polite live region)                                    */
  /* ------------------------------------------------------------------ */
  var toastTimer = null;
  P.toast = function (msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
    window.clearTimeout(toastTimer);
    window.setTimeout(function () {
      el.textContent = msg;
      el.classList.add('show');
      toastTimer = window.setTimeout(function () { el.classList.remove('show'); }, 3200);
    }, 30);
  };

  /* ------------------------------------------------------------------ */
  /* Dialogs: native <dialog> with focus return and Escape to close     */
  /* ------------------------------------------------------------------ */
  P.openDialog = function (opts) {
    var opener = document.activeElement;
    var dlg = document.createElement('dialog');
    dlg.className = 'dlg ' + (opts.className || '');
    var tid = 'dlg-t-' + P.uid();
    dlg.setAttribute('aria-labelledby', tid);
    dlg.innerHTML =
      '<div class="dlg-inner">' +
        '<div class="dlg-head">' +
          '<h2 class="dlg-title" id="' + tid + '">' + opts.title + '</h2>' +
          '<button type="button" class="icon-btn dlg-x" data-dlg-close aria-label="' + P.esc(P.t('close')) + '">' + P.icon('x', 22) + '</button>' +
        '</div>' +
        '<div class="dlg-body">' + opts.body + '</div>' +
        (opts.foot ? '<div class="dlg-foot">' + opts.foot + '</div>' : '') +
      '</div>';
    document.body.appendChild(dlg);
    P.postRender(dlg);
    var done = false;
    function close() {
      if (done) return;
      done = true;
      try { dlg.close(); } catch (e) { /* already closed */ }
      dlg.remove();
      if (opts.onClose) opts.onClose();
      var back = opts.returnTo || opener;
      if (back && document.contains(back) && back.focus) back.focus({ preventScroll: true });
      else {
        var h1 = document.querySelector('#main h1, main h1');
        if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
      }
    }
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) close();
      if (e.target.closest('[data-dlg-close]')) close();
    });
    dlg._close = close;
    try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
    var first = dlg.querySelector('[data-autofocus]') || dlg.querySelector('.dlg-body input, .dlg-body select, .dlg-body textarea, .dlg-body button, .dlg-body a[href]') || dlg.querySelector('.dlg-x');
    if (first) first.focus({ preventScroll: true });
    if (opts.onOpen) opts.onOpen(dlg);
    return dlg;
  };
  P.closeDialogs = function () {
    document.querySelectorAll('dialog.dlg').forEach(function (d) { if (d._close) d._close(); });
  };
  P.confirm = function (opts) {
    var dlg = P.openDialog({
      title: P.esc(opts.title),
      className: 'dlg-sm',
      body: '<p>' + P.esc(opts.text) + '</p>',
      foot: '<button type="button" class="btn" data-dlg-close>' + P.esc(P.t('cancel')) + '</button>' +
        '<button type="button" class="btn ' + (opts.danger ? 'danger' : 'primary') + '" data-confirm-yes>' + P.esc(opts.yes) + '</button>',
    });
    dlg.querySelector('[data-confirm-yes]').addEventListener('click', function () { dlg._close(); opts.onYes(); });
    var cancel = dlg.querySelector('.dlg-foot [data-dlg-close]');
    if (cancel) cancel.focus();
    return dlg;
  };

  /* ------------------------------------------------------------------ */
  /* Copy and share                                                     */
  /* ------------------------------------------------------------------ */
  function copyFallback(text) {
    try {
      var host = document.querySelector('dialog[open]') || document.body;
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.insetInlineStart = '0';
      ta.style.top = '0';
      host.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }
  P.copy = function (text) {
    return new Promise(function (resolve) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { resolve(true); }, function () { resolve(copyFallback(text)); });
          return;
        }
      } catch (e) { /* use the fallback */ }
      resolve(copyFallback(text));
    });
  };
  P.shareUrl = function (id) { return 'https://landit-uk.com/' + encodeURIComponent(id) + '/'; };
  P.share = function (id) {
    var b = L.benefitById(id);
    if (!b) return;
    var url = P.shareUrl(id);
    var dlg = P.openDialog({
      title: P.esc(P.t('share')),
      className: 'dlg-sm dlg-share',
      body:
        '<p class="share-name">' + P.bdi(b.name) + '</p>' +
        '<label class="field-label" for="share-url">Link to this benefit</label>' +
        '<div class="share-row">' +
          '<input id="share-url" class="input share-url" type="text" readonly value="' + P.esc(url) + '" dir="ltr">' +
          '<button type="button" class="btn primary" data-share-copy>' + P.icon('copy', 18) + '<span>' + P.esc(P.t('copy')) + '</span></button>' +
        '</div>' +
        '<p class="muted share-hint">Anyone with the link can read about this benefit. Nothing about you is shared.</p>' +
        P.discLine('dlg-disc'),
    });
    var input = dlg.querySelector('#share-url');
    input.addEventListener('focus', function () { input.select(); });
    dlg.querySelector('[data-share-copy]').addEventListener('click', function () {
      P.copy(url).then(function (ok) { P.toast(ok ? 'Link copied' : 'Select the link and copy it'); });
      input.select();
    });
    if (navigator.share) {
      try {
        navigator.share({ title: b.name, text: b.sub, url: url }).catch(function () { /* closed or not allowed: the link is on screen */ });
      } catch (e) { /* the link is on screen */ }
    } else {
      P.copy(url).then(function (ok) { if (ok) P.toast('Link copied'); });
    }
  };

  /* ------------------------------------------------------------------ */
  /* Reading aloud                                                      */
  /* ------------------------------------------------------------------ */
  P.canSpeak = function () {
    return !!(window.speechSynthesis && window.SpeechSynthesisUtterance) && P.state.prefs.readAloud !== false;
  };
  function markSpeaking(key, on) {
    document.querySelectorAll('[data-speak-key="' + key + '"]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var label = btn.querySelector('.speak-label');
      if (label) label.textContent = on ? P.t('stop') : P.t('read_aloud');
      var ico = btn.querySelector('.speak-ico');
      if (ico) ico.innerHTML = P.icon(on ? 'square' : 'volume-2', 18);
    });
  }
  P.stopSpeaking = function () {
    var was = P.ui.speaking;
    P.ui.speaking = null;
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* nothing */ }
    if (was) markSpeaking(was, false);
  };
  P.speak = function (key, text) {
    if (!P.canSpeak()) return;
    if (P.ui.speaking === key) { P.stopSpeaking(); return; }
    P.stopSpeaking();
    try {
      var u = new window.SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.rate = 0.95;
      u.onend = u.onerror = function () { if (P.ui.speaking === key) { P.ui.speaking = null; markSpeaking(key, false); } };
      P.ui.speaking = key;
      markSpeaking(key, true);
      window.speechSynthesis.speak(u);
    } catch (e) { P.ui.speaking = null; markSpeaking(key, false); }
  };
  P.speakButton = function (key, extraClass) {
    if (!P.canSpeak()) return '';
    var on = P.ui.speaking === key;
    return '<button type="button" class="btn sm quiet speak ' + (extraClass || '') + '" data-act="speak" data-speak-key="' + P.esc(key) + '" aria-pressed="' + on + '">' +
      '<span class="speak-ico">' + P.icon(on ? 'square' : 'volume-2', 18) + '</span>' +
      '<span class="speak-label">' + P.esc(on ? P.t('stop') : P.t('read_aloud')) + '</span></button>';
  };
  P.speechText = {};

  /* ------------------------------------------------------------------ */
  /* Routing                                                            */
  /* ------------------------------------------------------------------ */
  P.PUBLIC = ['login', 'register', 'questions', 'ack'];
  P.parseRoute = function () {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var q = h.indexOf('?');
    if (q >= 0) h = h.slice(0, q);
    var parts = h.split('/').filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { name: parts[0] || '', args: parts.slice(1) };
  };
  P.go = function (hash) {
    if (location.hash === hash) P.render({ nav: true });
    else location.hash = hash;
  };
  P.replaceHash = function (hash) {
    try { history.replaceState(null, '', hash); } catch (e) { /* keep the current hash */ }
  };

  var root;
  P.root = function () { return root || (root = document.getElementById('root')); };

  P.render = function (opts) {
    opts = opts || {};
    var r = P.parseRoute();
    var def = P.views[r.name];
    if (!def) { location.replace('#/' + (P.signedIn() ? 'chat' : 'login')); return; }
    if (def.auth && !P.signedIn()) { location.replace('#/login'); return; }
    if (P.closeDrawer) P.closeDrawer(true);
    if (P.closeMenu) P.closeMenu(true);
    if (opts.nav) P.stopSpeaking();
    var out = def.render(r) || {};
    document.title = (out.title ? out.title + ', ' : '') + 'Landit';
    var host;
    if (def.shell) {
      P.ensureShell();
      P.setNav(out.nav || r.name);
      host = document.getElementById('main');
      host.innerHTML = out.html || '';
      P.renderTracked();
      P.renderAccount();
    } else {
      P.shellMounted = false;
      host = P.root();
      host.innerHTML = out.html || '';
    }
    P.postRender(host);
    if (opts.nav && !P.reducedMotion()) {
      /* A page may render into a different host than the last one: never
         leave the entrance class behind on the old host. */
      if (P._enterHost && P._enterHost !== host) P._enterHost.classList.remove('enter');
      P._enterHost = host;
      host.classList.add('enter');
      window.clearTimeout(P._enterT);
      P._enterT = window.setTimeout(function () { host.classList.remove('enter'); }, 700);
    }
    if (opts.nav) {
      if (!out.keepScroll) window.scrollTo(0, 0);
      if (!opts.initial) {
        var h1 = host.querySelector('h1');
        if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
      }
    }
    if (out.after) out.after(opts);
  };

  /* Re-render the current page in place: keep scroll and focus. */
  P.refresh = function () {
    var a = document.activeElement;
    var fk = a && a.getAttribute ? a.getAttribute('data-fk') : null;
    var id = !fk && a && a.id ? a.id : null;
    var y = window.scrollY;
    P.render({});
    window.scrollTo(0, y);
    var el = null;
    if (fk) el = document.querySelector('[data-fk="' + (window.CSS && CSS.escape ? CSS.escape(fk) : fk) + '"]');
    else if (id) el = document.getElementById(id);
    if (el && el.focus) el.focus({ preventScroll: true });
  };

  /* After any render: right to left pages keep English text readable. */
  P.postRender = function (host) {
    if (!host || !P.isRtl()) return;
    host.querySelectorAll('p, h1, h2, h3, h4, dt, dd, .t').forEach(function (el) {
      if (el.hasAttribute('dir')) return;
      var d = window.getComputedStyle(el).display;
      if (d.indexOf('flex') >= 0 || d.indexOf('grid') >= 0) return;
      el.setAttribute('dir', 'auto');
    });
  };

  /* ------------------------------------------------------------------ */
  /* Delegated events                                                   */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var fn = P.acts[el.getAttribute('data-act')];
    if (fn) fn(el, e);
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest ? e.target.closest('[data-change]') : null;
    if (!el) return;
    var fn = P.changes[el.getAttribute('data-change')];
    if (fn) fn(el, e);
  });
  document.addEventListener('input', function (e) {
    var el = e.target.closest ? e.target.closest('[data-input]') : null;
    if (!el) return;
    var fn = P.inputs[el.getAttribute('data-input')];
    if (fn) fn(el, e);
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest ? e.target.closest('form[data-form]') : null;
    if (!f) return;
    e.preventDefault();
    var fn = P.forms[f.getAttribute('data-form')];
    if (fn) fn(f, e);
  });

  P.acts.speak = function (el) {
    var key = el.getAttribute('data-speak-key');
    var text = P.speechText[key];
    if (typeof text === 'function') text = text();
    if (text) P.speak(key, text);
  };
  /* Something the person saved for this application: a status other than
     Not started, or a ticked document. */
  P.hasProgress = function (id) {
    var t = P.tracked(id);
    return !!(t && ((t.status && t.status !== 'Not started') || (t.ticked && t.ticked.length)));
  };
  P.acts.track = function (el) {
    var id = el.getAttribute('data-id');
    var b = L.benefitById(id);
    if (b && P.tracked(id) && P.hasProgress(id)) {
      /* One tap must never throw away a status or ticks without asking. */
      P.confirm({
        title: P.t('untrack') + '?',
        text: 'Stop tracking ' + b.name + '? Its status and ticked documents will be removed.',
        yes: P.t('untrack'),
        onYes: function () {
          P.untrack(id);
          P.toast('Removed from Tracked applications');
          P.afterTrackChange(id);
        },
      });
      return;
    }
    P.toggleTrack(id);
    P.afterTrackChange(id);
  };
  P.acts.share = function (el) { P.share(el.getAttribute('data-id')); };

  /* Keep every Track button for this scheme in step, and the sidebar. */
  P.trackLabel = function (b, on) { return (on ? P.t('tracking') : P.t('track')); };
  P.afterTrackChange = function (id) {
    var on = !!P.tracked(id);
    var b = L.benefitById(id);
    document.querySelectorAll('[data-act="track"][data-id="' + id + '"]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var ico = btn.querySelector('.trk-ico');
      if (ico) ico.innerHTML = P.icon(on ? 'bookmark-check' : 'bookmark', 18);
      var lab = btn.querySelector('.trk-label');
      if (lab) lab.textContent = P.trackLabel(b, on);
    });
    if (P.renderTracked) P.renderTracked();
    if (P.onTrackChange) P.onTrackChange(id);
  };
})();

/* Landit design A, "Paper": the signed-in shell.
   Left sidebar (collapsible rail on desktop, drawer on phones) with the
   main links, the Tracked applications list and the account button. */
(function () {
  'use strict';
  var P = window.PAPER, L = P.L, esc = P.esc, icon = P.icon;

  /* The Landit glyph (from public/brand), drawn inline. */
  P.glyph = function (size, cls) {
    return '<svg class="glyph ' + (cls || '') + '" width="' + size + '" height="' + size + '" viewBox="19 16.5 64 64" aria-hidden="true" focusable="false">' +
      '<path d="M 28 26 V 46 C 28 60 36 68 50 68 L 54 68" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="71" cy="68" r="8" fill="currentColor"/></svg>';
  };
  P.wordmark = function (href) {
    var inner = '<span class="wm-glyph">' + P.glyph(26) + '</span><span class="wm-text">Landit</span>';
    return href ? '<a class="wordmark" href="' + href + '" aria-label="Landit, go to Chat">' + inner + '</a>'
      : '<span class="wordmark">' + inner + '</span>';
  };

  /* Page footer: the disclaimer, the rates year and the free label. */
  P.footer = function (extraClass, noFree) {
    return '<footer class="page-foot ' + (extraClass || '') + '">' +
      '<p class="foot-disc">' + esc(L.disclaimer) + '</p>' +
      '<p class="foot-meta">' + (noFree ? '' : '<span class="free-label">' + esc(P.t('free_badge')) + '</span>') + '<span class="foot-rates">' + esc(L.rates) + '</span></p>' +
    '</footer>';
  };

  var NAV = [
    { id: 'chat', href: '#/chat', icon: 'message-circle', key: 'nav_chat' },
    { id: 'benefits', href: '#/benefits', icon: 'list-checks', key: 'nav_benefits' },
    { id: 'community', href: '#/community', icon: 'users', key: 'nav_community' },
  ];

  /* What the phone top bar calls each page. */
  var PAGE_NAME = { chat: 'nav_chat', benefits: 'nav_benefits', community: 'nav_community', settings: 'nav_profile' };

  function shellHtml() {
    var t = P.t;
    var collapsed = !!P.state.prefs.collapsed;
    return '' +
      '<a class="skip-link" href="#main" data-act="skip">Skip to content</a>' +
      '<div class="app' + (collapsed ? ' is-collapsed' : '') + '" id="app">' +
        '<aside class="sb" id="sidebar" aria-label="Sidebar">' +
          '<div class="sb-head">' +
            '<a class="wordmark" href="#/chat" aria-label="Landit, go to Chat"><span class="wm-glyph">' + P.glyph(26) + '</span><span class="wm-text">Landit</span></a>' +
            '<button type="button" class="icon-btn sb-collapse" data-act="collapse" aria-controls="sidebar" aria-expanded="' + !collapsed + '" aria-label="' + (collapsed ? 'Open sidebar' : 'Close sidebar') + '" data-tip="' + (collapsed ? 'Open sidebar' : 'Close sidebar') + '">' + icon('panel-left', 20, 'flip-rtl') + '</button>' +
            '<button type="button" class="icon-btn sb-close" data-act="drawer-close" aria-label="Close">' + icon('x', 22) + '</button>' +
          '</div>' +
          '<div class="sb-top">' +
            '<button type="button" class="sb-new" data-act="new-chat" aria-label="' + esc(t('new_chat')) + '" data-tip="' + esc(t('new_chat')) + '">' +
              '<span class="sb-new-ico">' + icon('plus', 18) + '</span><span class="sb-label">' + esc(t('new_chat')) + '</span></button>' +
            '<nav class="sb-nav" aria-label="Main">' +
              NAV.map(function (n) {
                return '<a href="' + n.href + '" data-nav="' + n.id + '" aria-label="' + esc(t(n.key)) + '" data-tip="' + esc(t(n.key)) + '">' +
                  '<span class="sb-nav-ico">' + icon(n.icon, 20) + '</span><span class="sb-label">' + esc(t(n.key)) + '</span></a>';
              }).join('') +
            '</nav>' +
          '</div>' +
          '<section class="sb-tracked" aria-labelledby="trk-h">' +
            '<h2 class="sb-h" id="trk-h" tabindex="-1">' + esc(t('tracked_title')) + '</h2>' +
            '<div id="trk-list" class="trk-list"></div>' +
            /* On phones the drawer covers the page, so it carries the disclaimer too. */
            P.discLine('sb-disc') +
          '</section>' +
          '<button type="button" class="rail-tracked" data-act="rail-tracked" aria-label="' + esc(t('tracked_title')) + '" data-tip="' + esc(t('tracked_title')) + '">' + icon('bookmark', 20) + '</button>' +
          '<div class="sb-foot" id="acct-wrap"></div>' +
        '</aside>' +
        '<div class="scrim" data-act="drawer-close" hidden></div>' +
        '<div class="col" id="col">' +
          '<header class="topbar">' +
            '<button type="button" class="menu-btn" data-act="drawer-open" aria-controls="sidebar" aria-expanded="false" aria-label="Open menu and tracked applications">' + icon('menu', 22) + '<span class="menu-word" aria-hidden="true">Menu</span></button>' +
            '<p class="topbar-title" id="topbar-title"><span class="wm-glyph" aria-hidden="true">' + P.glyph(20) + '</span><span class="topbar-name" id="topbar-name"></span></p>' +
            '<span class="topbar-end" id="topbar-end"></span>' +
          '</header>' +
          '<main id="main" tabindex="-1"></main>' +
        '</div>' +
      '</div>';
  }

  P.shellMounted = false;
  P.ensureShell = function () {
    if (P.shellMounted && document.getElementById('app')) return;
    P.root().innerHTML = shellHtml();
    P.shellMounted = true;
  };
  P.rebuildShell = function () { P.shellMounted = false; };

  P.setNav = function (id) {
    P.navId = id;
    document.querySelectorAll('.sb-nav a').forEach(function (a) {
      if (a.getAttribute('data-nav') === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    var name = document.getElementById('topbar-name');
    if (name) name.textContent = PAGE_NAME[id] ? P.t(PAGE_NAME[id]) : 'Landit';
    var end = document.getElementById('topbar-end');
    if (end) {
      end.innerHTML = id === 'chat'
        ? '<button type="button" class="btn sm quiet topbar-new" data-act="new-chat" aria-label="' + esc(P.t('new_chat')) + '">' + icon('plus', 20) + '<span>' + esc(P.t('new_chat')) + '</span></button>'
        : '';
    }
  };

  /* ------------------------------------------------------------------ */
  /* Tracked applications                                               */
  /* ------------------------------------------------------------------ */
  function keepFocus(fn) {
    var a = document.activeElement;
    var fk = a && a.getAttribute ? a.getAttribute('data-fk') : null;
    fn();
    if (fk) {
      var el = document.querySelector('[data-fk="' + fk + '"]');
      if (el) el.focus({ preventScroll: true });
    }
  }
  P.keepFocus = keepFocus;

  P.checkItem = function (b, d, ticked, scope) {
    var fk = (scope || 'doc') + '-' + b.id + '-' + d.id;
    return '<li><label class="check">' +
      '<input type="checkbox" data-change="doc" data-id="' + b.id + '" data-doc="' + esc(d.id) + '" data-fk="' + esc(fk) + '"' + (ticked ? ' checked' : '') + '>' +
      '<span class="check-box" aria-hidden="true">' + icon('check', 16) + '</span>' +
      '<span class="check-text">' + esc(d.label) + '</span></label></li>';
  };

  P.docGroups = function (b, ticked, scope) {
    if (!b.docsKnown) return '<p class="doc-none">Landit has no document list for this one yet. Check the official page before you start.</p>';
    if (!b.docs.length) return '<p class="doc-none">' + esc(b.guide.needNote || 'There is nothing to gather for this one.') + '</p>';
    var g = P.docCounts(b), out = '';
    if (g.needed.length) {
      out += '<p class="doc-group">' + icon('file-text', 16) + '<span>Needed</span></p>' +
        '<ul class="checks">' + g.needed.map(function (d) { return P.checkItem(b, d, ticked.indexOf(d.id) >= 0, scope); }).join('') + '</ul>';
    }
    if (g.maybe.length) {
      out += '<p class="doc-group maybe">' + icon('circle-help', 16) + '<span>' + esc(P.t('maybe_needed')) + '</span></p>' +
        '<ul class="checks">' + g.maybe.map(function (d) { return P.checkItem(b, d, ticked.indexOf(d.id) >= 0, scope); }).join('') + '</ul>';
    }
    return out;
  };

  P.tickedCount = function (b, t) {
    if (!t) return 0;
    return t.ticked.filter(function (id) { return b.docs.some(function (d) { return d.id === id; }); }).length;
  };

  function trackedItem(t) {
    var b = L.benefitById(t.id);
    var c = P.cat(b.category);
    var open = !!P.ui.expanded[t.id];
    var pid = 'trk-p-' + b.id;
    var total = b.docsKnown ? b.docs.length : 0;
    var done = P.tickedCount(b, t);
    return '<li class="trk' + (open ? ' is-open' : '') + '" style="--c: var(--cat-' + b.category + ')">' +
      '<button type="button" class="trk-btn" data-act="trk-toggle" data-id="' + b.id + '" data-fk="trk-' + b.id + '" aria-expanded="' + open + '" aria-controls="' + pid + '">' +
        '<span class="cat-ico sm" aria-hidden="true">' + icon(c.icon, 16) + '</span>' +
        '<span class="trk-main">' +
          '<span class="trk-name">' + P.bdi(b.name) + '</span>' +
          '<span class="trk-meta"><span class="status-pill s-' + P.statusKey(t.status) + '">' + esc(P.statusLabel(t.status)) + '</span>' +
            (total ? '<span class="trk-docs">' + done + ' of ' + total + ' documents</span>' : '') + '</span>' +
        '</span>' +
        '<span class="trk-chev" aria-hidden="true">' + icon('chevron-down', 18) + '</span>' +
      '</button>' +
      '<div class="trk-panel" id="' + pid + '"' + (open ? '' : ' hidden') + '>' +
        P.docGroups(b, t.ticked, 'sb') +
        '<a class="trk-open" href="#/benefit/' + b.id + '">' + esc('Open details') + icon('chevron-right', 18, 'flip-rtl') + '</a>' +
      '</div>' +
    '</li>';
  }

  P.renderTracked = function () {
    var host = document.getElementById('trk-list');
    if (!host) return;
    var list = P.state.tracked.filter(function (t) { return L.benefitById(t.id); });
    keepFocus(function () {
      if (!list.length) {
        host.innerHTML = '<div class="trk-empty">' +
          '<p class="trk-empty-title">' + esc(P.t('tracked_empty')) + '</p>' +
          '<p>Open a benefit and choose <strong class="word-ico">' + icon('bookmark', 16) + esc(P.t('track')) + '</strong>. It will show here, with a checklist of the documents you need.</p>' +
          '<a class="btn sm" href="#/benefits">' + esc(P.t('nav_benefits')) + '</a></div>';
        return;
      }
      host.innerHTML = '<ul class="trk-ul">' + list.map(trackedItem).join('') + '</ul>';
    });
  };

  P.acts['trk-toggle'] = function (el) {
    var id = el.getAttribute('data-id');
    P.ui.expanded[id] = !P.ui.expanded[id];
    var li = el.closest('.trk');
    var panel = document.getElementById('trk-p-' + id);
    el.setAttribute('aria-expanded', P.ui.expanded[id] ? 'true' : 'false');
    if (li) li.classList.toggle('is-open', !!P.ui.expanded[id]);
    if (panel) panel.hidden = !P.ui.expanded[id];
  };

  P.changes.doc = function (el) {
    var id = el.getAttribute('data-id');
    var wasTracked = !!P.tracked(id);
    P.toggleDoc(id, el.getAttribute('data-doc'), el.checked);
    if (!wasTracked) P.toast('Added to Tracked applications');
    /* Mirror the tick anywhere else the same document is shown. */
    document.querySelectorAll('input[data-change="doc"][data-id="' + id + '"][data-doc="' + el.getAttribute('data-doc') + '"]').forEach(function (x) { x.checked = el.checked; });
    P.renderTracked();
    if (P.onDocChange) P.onDocChange(id);
    if (!wasTracked) P.afterTrackChange(id);
  };

  /* ------------------------------------------------------------------ */
  /* Account button and menu                                            */
  /* ------------------------------------------------------------------ */
  /* The account row goes straight to Profile and settings. A small
     separate button opens quick choices (language, text size, Help now,
     sign out); everything in it is also on the Settings page. */
  P.renderAccount = function () {
    var host = document.getElementById('acct-wrap');
    if (!host) return;
    var u = P.state.user || {};
    var name = u.name || u.email || 'Your account';
    var here = P.navId === 'settings';
    host.innerHTML =
      '<a class="acct" id="acct-link" href="#/settings"' + (here ? ' aria-current="page"' : '') + ' aria-label="' + esc(name) + ': Profile and settings" data-tip="Profile and settings">' +
        '<span class="avatar" aria-hidden="true">' + esc(P.initial()) + '</span>' +
        '<span class="acct-text"><span class="acct-name">' + esc(name) + '</span><span class="acct-sub">Profile and settings</span></span>' +
      '</a>' +
      '<button type="button" class="icon-btn acct-more" id="acct-btn" data-act="acct-menu" aria-haspopup="menu" aria-expanded="false" aria-controls="acct-menu" aria-label="More: language, text size, Help now, sign out">' + icon('ellipsis', 22) + '</button>' +
      '<div class="menu" id="acct-menu" role="menu" aria-label="More" hidden>' +
        menuItem('globe', P.t('lang'), 'lang-dialog', P.langName(P.lang())) +
        menuItem('a-large-small', P.t('text_size'), 'text-dialog', (P.textSizes.filter(function (s) { return s.id === P.state.prefs.text; })[0] || P.textSizes[0]).label) +
        menuItem('life-buoy', P.t('nav_help'), 'help-now') +
        '<div class="menu-sep" role="separator"></div>' +
        menuItem('log-out', P.t('logout'), 'sign-out') +
      '</div>';
  };
  function menuItem(ic, label, act, hint) {
    return '<button type="button" role="menuitem" class="menu-item" data-act="' + act + '" tabindex="-1">' +
      '<span class="menu-ico">' + icon(ic, 20) + '</span><span class="menu-label">' + esc(label) + '</span>' +
      (hint ? '<span class="menu-hint">' + esc(hint) + '</span>' : '') + '</button>';
  }

  function menuEls() { return Array.prototype.slice.call(document.querySelectorAll('#acct-menu .menu-item')); }
  P.openMenu = function () {
    var menu = document.getElementById('acct-menu'), btn = document.getElementById('acct-btn');
    if (!menu || !btn) return;
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    var items = menuEls();
    if (items[0]) items[0].focus();
  };
  P.closeMenu = function (silent) {
    var menu = document.getElementById('acct-menu'), btn = document.getElementById('acct-btn');
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    if (btn) { btn.setAttribute('aria-expanded', 'false'); if (!silent) btn.focus(); }
  };
  P.acts['acct-menu'] = function () {
    var menu = document.getElementById('acct-menu');
    if (menu && menu.hidden) P.openMenu(); else P.closeMenu();
  };
  document.addEventListener('keydown', function (e) {
    var menu = document.getElementById('acct-menu');
    if (menu && !menu.hidden && menu.contains(document.activeElement)) {
      var items = menuEls(), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); P.closeMenu(); }
      else if (e.key === 'Tab') { P.closeMenu(true); }
      return;
    }
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
      var app = document.getElementById('app');
      if (app && app.classList.contains('drawer-open')) { e.preventDefault(); P.closeDrawer(); }
    }
  });
  document.addEventListener('click', function (e) {
    var menu = document.getElementById('acct-menu');
    if (!menu || menu.hidden) return;
    if (e.target.closest && (e.target.closest('#acct-menu') || e.target.closest('#acct-btn'))) return;
    P.closeMenu(true);
  });

  P.acts['sign-out'] = function () {
    P.closeMenu(true);
    P.stopSpeaking();
    P.state.session = false;
    P.save();
    P.go('#/login');
    P.toast('You are signed out');
  };

  /* ------------------------------------------------------------------ */
  /* Drawer (phones) and collapse (desktop)                             */
  /* ------------------------------------------------------------------ */
  function isPhone() { return window.matchMedia('(max-width: 899.98px)').matches; }
  P.openDrawer = function () {
    var app = document.getElementById('app');
    if (!app) return;
    app.classList.add('drawer-open');
    var scrim = app.querySelector('.scrim');
    if (scrim) scrim.hidden = false;
    var col = document.getElementById('col');
    if (col) col.inert = true;
    /* The skip link points into the page behind the drawer: take it out too. */
    var skip = document.querySelector('.skip-link');
    if (skip) skip.inert = true;
    document.querySelectorAll('[data-act="drawer-open"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    document.body.classList.add('no-scroll');
    var close = app.querySelector('.sb-close');
    if (close) close.focus({ preventScroll: true });
  };
  P.closeDrawer = function (silent) {
    var app = document.getElementById('app');
    if (!app || !app.classList.contains('drawer-open')) return;
    app.classList.remove('drawer-open');
    var scrim = app.querySelector('.scrim');
    if (scrim) scrim.hidden = true;
    var col = document.getElementById('col');
    if (col) col.inert = false;
    var skip = document.querySelector('.skip-link');
    if (skip) skip.inert = false;
    document.body.classList.remove('no-scroll');
    var btn = document.querySelector('[data-act="drawer-open"]');
    document.querySelectorAll('[data-act="drawer-open"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (!silent && btn) btn.focus({ preventScroll: true });
  };
  P.acts['drawer-open'] = function () { P.openDrawer(); };
  P.acts['drawer-close'] = function () { P.closeDrawer(); };
  window.addEventListener('resize', function () { if (!isPhone()) P.closeDrawer(true); });

  function setCollapsed(on) {
    P.state.prefs.collapsed = on;
    P.save();
    var app = document.getElementById('app');
    if (app) {
      app.classList.add('sb-anim');
      app.classList.toggle('is-collapsed', on);
      window.clearTimeout(P._sbAnimT);
      P._sbAnimT = window.setTimeout(function () { app.classList.remove('sb-anim'); }, 400);
    }
    var btn = document.querySelector('.sb-collapse');
    if (btn) {
      btn.setAttribute('aria-expanded', on ? 'false' : 'true');
      btn.setAttribute('aria-label', on ? 'Open sidebar' : 'Close sidebar');
      btn.setAttribute('data-tip', on ? 'Open sidebar' : 'Close sidebar');
    }
  }
  P.acts.collapse = function () { setCollapsed(!P.state.prefs.collapsed); };
  P.acts['rail-tracked'] = function () {
    setCollapsed(false);
    var h = document.getElementById('trk-h');
    if (h) h.focus();
  };
  P.acts.skip = function (el, e) {
    e.preventDefault();
    var m = document.getElementById('main');
    if (m) m.focus();
  };
})();

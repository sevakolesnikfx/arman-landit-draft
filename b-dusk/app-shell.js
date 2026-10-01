/* Landit, design B (Dusk): the app shell.
   Left sidebar (collapsible on desktop, a drawer on phones) with navigation
   and Tracked applications; slim top bar with the page title and the avatar
   button that opens the profile menu. */
(function () {
  'use strict';
  var D = window.DUSK, L = D.L;
  var esc = D.esc;

  D.ui.openTracked = D.ui.openTracked || {};

  /* ------------------------------------------------------------------ */
  /* Mount                                                               */
  /* ------------------------------------------------------------------ */

  D.mountShell = function () {
    if (document.getElementById('shell')) return;
    var app = document.getElementById('app');
    app.innerHTML =
      '<div class="shell" id="shell" data-collapsed="' + (D.state.prefs.collapsed ? 'true' : 'false') + '" data-drawer="closed">' +
      '<aside class="sidebar" id="sidebar" aria-label="Sidebar"></aside>' +
      '<div class="scrim" id="scrim" hidden></div>' +
      '<div class="main-col">' +
      '<header class="topbar" id="topbar">' +
      '<button type="button" class="menu-btn" id="menu-btn" aria-label="Menu and tracked applications" aria-expanded="false" aria-controls="sidebar">' + D.icon('menu', { size: 22 }) + '<span class="menu-btn-text" aria-hidden="true">Menu</span></button>' +
      '<h1 class="topbar-title" id="page-title" tabindex="-1"></h1>' +
      '<div class="topbar-end" id="topbar-end"></div>' +
      '</header>' +
      '<main id="main" class="main" tabindex="-1"></main>' +
      '</div></div>';
    D.renderSidebar();
    D.renderAvatar();
    syncDrawerInert();
  };
  D.unmountShell = function () { var s = document.getElementById('shell'); if (s) s.remove(); };

  D.setTitle = function (text, page) {
    var h = document.getElementById('page-title');
    if (h) h.textContent = text;
    document.title = text + ' | Landit';
    var shell = document.getElementById('shell');
    if (shell) shell.setAttribute('data-page', page || '');
  };

  /* ------------------------------------------------------------------ */
  /* Sidebar                                                             */
  /* ------------------------------------------------------------------ */

  var NAV = [
    { page: 'chat', href: '#/chat', icon: 'message-circle', key: 'nav_chat' },
    { page: 'benefits', href: '#/benefits', icon: 'pound-sterling', key: 'nav_benefits' },
    { page: 'community', href: '#/community', icon: 'users', key: 'nav_community' },
    { page: 'settings', href: '#/settings', icon: 'user', key: 'nav_settings' },
  ];

  function docsCountLine(b) { return D.docsProgress(b); }

  function checkItem(b, d) {
    var on = D.checks(b.id).docs.indexOf(d.id) >= 0;
    var id = 'sbdoc-' + b.id + '-' + d.id;
    return '<li><label class="check" for="' + esc(id) + '"><input type="checkbox" id="' + esc(id) + '" data-action="doc" data-bid="' + esc(b.id) + '" data-doc="' + esc(d.id) + '"' + (on ? ' checked' : '') + '>' +
      '<span dir="auto">' + esc(d.label) + '</span></label></li>';
  }

  function trackedRow(t) {
    var b = L.benefitById(t.id);
    if (!b) return '';
    var open = !!D.ui.openTracked[b.id];
    var split = D.docsSplit(b);
    var bodyId = 'trk-body-' + b.id;
    var st = D.standing(b);
    var blocked = st.state === 'blocked';
    var docsLine = blocked ? '' : docsCountLine(b);
    var body = '';
    if (blocked) {
      /* Answers changed and the visa condition now blocks it: no checklist,
         just the reason and a way to stop tracking. */
      body += '<p class="trk-empty-docs" dir="auto">' + esc(st.reason) + '</p>';
    } else {
      if (split.needed.length) body += '<p class="trk-group-h">' + esc(D.t('what_you_need')) + '</p><ul class="checks">' + split.needed.map(function (d) { return checkItem(b, d); }).join('') + '</ul>';
      if (split.maybe.length) body += '<p class="trk-group-h">' + esc(D.t('maybe_needed')) + '</p><ul class="checks">' + split.maybe.map(function (d) { return checkItem(b, d); }).join('') + '</ul>';
      if (!b.docs.length) body += '<p class="trk-empty-docs">' + esc(b.guide.needNote || (b.docsKnown ? 'Nothing to gather for this one.' : 'No document list yet. Check the official page.')) + '</p>';
      else if (!b.docsKnown) body += '<p class="trk-empty-docs">This list may not be complete. Check the official page.</p>';
    }
    body += '<div class="trk-actions"><a class="trk-link" href="#/benefit/' + esc(b.id) + '">' + esc('Open details') + D.dicon('chevron-right', { size: 16 }) + '</a>' +
      D.untrackBtn(b) + '</div>';
    return '<li class="trk' + (open ? ' is-open' : '') + (blocked ? ' is-blocked' : '') + '" style="' + D.catVars(b.category) + '">' +
      '<button type="button" class="trk-head" id="trk-btn-' + esc(b.id) + '" data-action="trk-toggle" data-bid="' + esc(b.id) + '" aria-expanded="' + open + '" aria-controls="' + esc(bodyId) + '">' +
      D.catTile(b, 'sm') +
      '<span class="trk-main"><span class="trk-name">' + D.bdi(b.name) + '</span>' +
      '<span class="trk-meta">' + (blocked ? D.lockTag() : D.statusPill(t.status) + (docsLine ? '<span class="trk-docs">' + esc(docsLine) + '</span>' : '')) + '</span></span>' +
      D.icon('chevron-down', { size: 18, className: 'chev' }) +
      '</button>' +
      '<div class="trk-body" id="' + esc(bodyId) + '"' + (open ? '' : ' hidden') + '>' + body + '</div>' +
      '</li>';
  }

  D.renderSidebar = function () {
    var sb = document.getElementById('sidebar');
    if (!sb) return;
    var active = document.activeElement && sb.contains(document.activeElement) ? document.activeElement.id : null;
    var page = D.currentPage || '';
    var collapsed = D.state.prefs.collapsed && !D.isPhone();
    var tracked = D.state.tracked.filter(function (t) { return L.benefitById(t.id); });
    var nav = NAV.map(function (n) {
      var cur = page === n.page || (n.page === 'benefits' && page === 'benefit');
      var label = D.t(n.key);
      return '<a class="sb-link" id="nav-' + n.page + '" href="' + n.href + '"' + (cur ? ' aria-current="page"' : '') + (collapsed ? ' aria-label="' + esc(label) + '" title="' + esc(label) + '"' : '') + '>' +
        D.icon(n.icon, { size: 20 }) + '<span class="sb-text">' + esc(label) + '</span></a>';
    }).join('');

    var trackedHTML;
    if (collapsed) {
      trackedHTML = '<button type="button" class="sb-link sb-rail-tracked" id="rail-tracked" data-action="expand-sidebar" aria-label="' + esc(D.t('tracked_title') + ', ' + tracked.length + '. Show sidebar') + '" title="' + esc(D.t('tracked_title')) + '">' +
        D.icon('list-checks', { size: 20 }) + '<span class="rail-count num" aria-hidden="true">' + tracked.length + '</span></button>';
    } else if (!tracked.length) {
      trackedHTML = '<div class="trk-empty">' + D.icon('bookmark', { size: 22 }) +
        '<p class="trk-empty-h">' + esc(D.t('tracked_empty')) + '</p>' +
        '<p>Open a benefit and choose ' + esc(D.t('track')) + '. It shows here with a checklist of the documents you need.</p>' +
        '<a class="btn btn-secondary btn-sm" href="#/benefits">' + esc('See Benefits') + '</a></div>';
    } else {
      trackedHTML = '<ul class="trk-list" role="list">' + tracked.map(trackedRow).join('') + '</ul>';
    }

    sb.innerHTML =
      '<div class="sb-head">' +
      '<a class="brand" href="#/chat" aria-label="Landit, go to Chat">' + D.mark(30) + '<span class="brand-name">Landit</span></a>' +
      '<button type="button" class="icon-btn collapse-btn" id="collapse-btn" data-action="collapse" aria-expanded="' + (!collapsed) + '" aria-controls="sidebar-body" aria-label="' + esc(collapsed ? 'Show sidebar' : 'Hide sidebar') + '" title="' + esc(collapsed ? 'Show sidebar' : 'Hide sidebar') + '">' + D.icon('panel-left', { size: 20, className: 'dir-icon' }) + '</button>' +
      '<button type="button" class="icon-btn drawer-close" id="drawer-close" data-action="close-drawer" aria-label="Close the side panel">' + D.icon('x', { size: 22 }) + '</button>' +
      '</div>' +
      '<div class="sb-body" id="sidebar-body">' +
      '<nav class="sb-nav" aria-label="Main">' + nav + '</nav>' +
      '<section class="sb-tracked" aria-labelledby="tracked-h">' +
      '<h2 class="sb-h" id="tracked-h" tabindex="-1"' + (collapsed ? ' hidden' : '') + '><span>' + esc(D.t('tracked_title')) + '</span>' + (tracked.length ? '<span class="sb-count num">' + tracked.length + '</span>' : '') + '</h2>' +
      trackedHTML +
      (tracked.length && !collapsed ? '<p class="disclaimer sb-disclaimer">' + esc(L.disclaimer) + '</p>' : '') +
      '</section>' +
      '<div class="sb-foot">' +
      '<button type="button" class="sb-link sb-help" id="sb-help" data-action="sb-help"' + (collapsed ? ' aria-label="' + esc(D.t('nav_help')) + '" title="' + esc(D.t('nav_help')) + '"' : '') + '>' +
      D.icon('life-buoy', { size: 20 }) + '<span class="sb-text">' + esc(D.t('nav_help')) + '</span></button>' +
      '</div>' +
      '</div>';
    if (active) { var el = document.getElementById(active); if (el) el.focus(); }
  };

  /* ------------------------------------------------------------------ */
  /* Drawer (phones) and collapse (desktop)                              */
  /* ------------------------------------------------------------------ */

  function syncDrawerInert() {
    var sb = document.getElementById('sidebar'), shell = document.getElementById('shell');
    if (!sb || !shell) return;
    var openOnPhone = D.isPhone() && shell.getAttribute('data-drawer') === 'open';
    var closedOnPhone = D.isPhone() && !openOnPhone;
    if (closedOnPhone) sb.setAttribute('inert', ''); else sb.removeAttribute('inert');
    /* While the drawer is open on a phone it acts as a dialog: everything
       behind it is out of reach, for touch screen readers too. */
    var mainCol = shell.querySelector('.main-col');
    if (mainCol) { if (openOnPhone) mainCol.setAttribute('inert', ''); else mainCol.removeAttribute('inert'); }
    if (!D.isPhone()) { shell.setAttribute('data-drawer', 'closed'); var s = document.getElementById('scrim'); if (s) s.hidden = true; }
  }
  D.syncDrawerInert = syncDrawerInert;

  D.openDrawer = function () {
    var shell = document.getElementById('shell');
    if (!shell) return;
    D.ui.drawerOpener = document.activeElement;
    shell.setAttribute('data-drawer', 'open');
    document.getElementById('scrim').hidden = false;
    document.getElementById('menu-btn').setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('no-scroll');
    syncDrawerInert();
    var first = document.querySelector('#sidebar .sb-link[aria-current="page"]') || document.querySelector('#sidebar .sb-link');
    if (first) first.focus();
  };
  D.closeDrawer = function (restore) {
    var shell = document.getElementById('shell');
    if (!shell || shell.getAttribute('data-drawer') !== 'open') return;
    shell.setAttribute('data-drawer', 'closed');
    document.getElementById('scrim').hidden = true;
    var mb = document.getElementById('menu-btn');
    mb.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('no-scroll');
    syncDrawerInert();
    if (restore !== false) mb.focus();
  };
  D.toggleCollapse = function (force) {
    var c = typeof force === 'boolean' ? force : !D.state.prefs.collapsed;
    D.state.prefs.collapsed = c;
    D.save();
    var shell = document.getElementById('shell');
    if (shell) shell.setAttribute('data-collapsed', String(c));
    D.renderSidebar();
    var btn = document.getElementById('collapse-btn');
    if (btn) btn.focus();
  };

  /* ------------------------------------------------------------------ */
  /* Avatar menu                                                         */
  /* ------------------------------------------------------------------ */

  D.renderAvatar = function () {
    var end = document.getElementById('topbar-end');
    if (!end) return;
    var u = D.state.user || { name: '', email: '' };
    end.innerHTML =
      '<div class="avatar-wrap" id="avatar-wrap">' +
      '<button type="button" class="avatar-btn" id="avatar-btn" data-action="avatar" aria-haspopup="true" aria-expanded="false" aria-controls="avatar-menu" aria-label="' + esc('Profile and settings menu, ' + (u.name || 'your account')) + '">' +
      '<span class="avatar" aria-hidden="true">' + D.avatarInner(u.name || u.email) + '</span></button>' +
      '<div class="menu" id="avatar-menu" hidden></div>' +
      '</div>';
  };

  function menuItem(action, icon, label, extra, attrs) {
    return '<button type="button" class="menu-item" data-menu="' + action + '"' + (attrs || '') + '>' + D.icon(icon, { size: 20 }) +
      '<span class="menu-label">' + esc(label) + '</span>' + (extra ? '<span class="menu-extra">' + extra + '</span>' : '') + '</button>';
  }
  function optionItem(group, value, label, on, swatch) {
    return '<button type="button" class="menu-item menu-option" data-menu="set-' + group + '" data-value="' + esc(value) + '" aria-pressed="' + on + '">' +
      (swatch || '') + '<span class="menu-label">' + label + '</span>' + (on ? D.icon('check', { size: 18, className: 'menu-check' }) : '<span class="menu-check-space"></span>') + '</button>';
  }
  D.themeSwatch = function (t) {
    var c = t.colors;
    return '<span class="swatch" aria-hidden="true" style="background:' + c.bg + ';border-color:' + c.border + '"><span style="background:' + c.surface + '"></span><span style="background:' + c.accent + '"></span></span>';
  };

  function menuView(view) {
    var u = D.state.user || { name: '', email: '' };
    var lang = L.i18n.languages.filter(function (l) { return l.code === D.lang(); })[0];
    var size = D.textSizes.filter(function (s) { return s.id === D.state.prefs.text; })[0] || D.textSizes[0];
    var back = function (title) {
      return '<div class="menu-sub-head"><button type="button" class="icon-btn" data-menu="back" aria-label="' + esc(D.t('back')) + '">' + D.dicon('arrow-left', { size: 20 }) + '</button><span class="menu-sub-title" id="menu-sub-title">' + esc(title) + '</span></div>';
    };
    if (view === 'lang') {
      return back(D.t('lang')) + '<div class="menu-group" role="group" aria-labelledby="menu-sub-title">' + L.i18n.languages.map(function (l) {
        return optionItem('lang', l.code, '<span lang="' + l.code + '" dir="' + l.dir + '">' + esc(l.name) + '</span>', l.code === D.lang());
      }).join('') + '</div>';
    }
    if (view === 'theme') {
      return back(D.t('colours')) + '<div class="menu-group" role="group" aria-labelledby="menu-sub-title">' + D.themes.map(function (t) {
        return optionItem('theme', t.id, esc(t.name), t.id === D.theme().id, D.themeSwatch(t));
      }).join('') + '</div>';
    }
    if (view === 'text') {
      return back(D.t('text_size')) + '<div class="menu-group" role="group" aria-labelledby="menu-sub-title">' + D.textSizes.map(function (s) {
        return optionItem('text', s.id, '<span class="text-sample text-sample-' + s.id + '" aria-hidden="true">Aa</span>' + esc(s.label), s.id === size.id);
      }).join('') + '</div>';
    }
    return '<div class="menu-user"><span class="avatar lg" aria-hidden="true">' + D.avatarInner(u.name || u.email, 22) + '</span>' +
      '<span class="menu-user-text"><span class="menu-user-name" dir="auto">' + esc(u.name || 'Your account') + '</span>' +
      '<span class="menu-user-mail" dir="ltr">' + esc(u.email || 'No email added') + '</span></span></div>' +
      '<div class="menu-group">' +
      '<a class="menu-item" href="#/settings" data-menu="link">' + D.icon('user', { size: 20 }) + '<span class="menu-label">' + esc('Profile and settings') + '</span></a>' +
      menuItem('lang', 'globe', D.t('lang'), esc(lang ? lang.name : '') + D.dicon('chevron-right', { size: 16 })) +
      menuItem('theme', 'palette', D.t('colours'), esc(D.theme().name) + D.dicon('chevron-right', { size: 16 })) +
      menuItem('text', 'a-large-small', D.t('text_size'), esc(size.label) + D.dicon('chevron-right', { size: 16 })) +
      menuItem('help', 'life-buoy', D.t('nav_help')) +
      '</div><div class="menu-group menu-group-last">' +
      menuItem('logout', 'log-out', D.t('logout')) +
      '</div>';
  }

  D.openMenu = function (view) {
    var menu = document.getElementById('avatar-menu');
    var btn = document.getElementById('avatar-btn');
    if (!menu || !btn) return;
    D.ui.menuView = view || 'main';
    menu.innerHTML = menuView(D.ui.menuView);
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    var first = menu.querySelector(view && view !== 'main' ? '.menu-option[aria-pressed="true"]' : '.menu-item');
    if (first) first.focus();
  };
  D.closeMenu = function (restore) {
    var menu = document.getElementById('avatar-menu');
    var btn = document.getElementById('avatar-btn');
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    menu.innerHTML = '';
    btn.setAttribute('aria-expanded', 'false');
    if (restore) btn.focus();
  };

  D.handleMenu = function (el) {
    var act = el.getAttribute('data-menu');
    var val = el.getAttribute('data-value');
    if (act === 'lang' || act === 'theme' || act === 'text') { D.openMenu(act); return; }
    if (act === 'back') { D.openMenu('main'); var f = document.querySelector('#avatar-menu [data-menu="' + D.ui.lastSub + '"]'); if (f) f.focus(); return; }
    if (act === 'help') { D.closeMenu(false); D.helpNow(); return; }
    if (act === 'logout') { D.closeMenu(false); D.signOut(); return; }
    if (act === 'link') { D.closeMenu(false); return; }
    if (act === 'set-lang') { D.setLang(val); D.openMenu('lang'); return; }
    if (act === 'set-theme') { D.setTheme(val); D.openMenu('theme'); return; }
    if (act === 'set-text') { D.setText(val); D.openMenu('text'); return; }
  };

  /* Preference setters, shared with Settings. */
  D.setTheme = function (id) { D.state.prefs.theme = id; D.save(); D.applyTheme(); };
  D.setText = function (id) { D.state.prefs.text = id; D.save(); D.applyText(); };
  D.setLang = function (code) {
    D.state.prefs.lang = code;
    D.save();
    D.applyLang();
    D.rerender();
  };
  /* Re-render the page and shell labels after a language change. */
  D.rerender = function () {
    var menuOpen = document.getElementById('avatar-menu') && !document.getElementById('avatar-menu').hidden;
    var view = D.ui.menuView;
    D.unmountShell();
    D.render({ keepFocus: true });
    if (menuOpen && document.getElementById('avatar-menu')) D.openMenu(view);
  };

  D.signOut = function () {
    D.stopReading();
    D.state.session = false;
    D.save();
    D.unmountShell();
    location.hash = '#/login';
    D.toast('You are signed out');
  };

  /* ------------------------------------------------------------------ */
  /* Shell events                                                        */
  /* ------------------------------------------------------------------ */

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var menu = document.getElementById('avatar-menu');
    var menuItemEl = t.closest('[data-menu]');
    if (menuItemEl && menu && menu.contains(menuItemEl)) {
      var a = menuItemEl.getAttribute('data-menu');
      if (a === 'lang' || a === 'theme' || a === 'text') D.ui.lastSub = a;
      D.handleMenu(menuItemEl);
      return;
    }
    if (t.closest('#avatar-btn')) {
      if (menu && !menu.hidden) D.closeMenu(true); else D.openMenu('main');
      return;
    }
    if (menu && !menu.hidden && !t.closest('#avatar-wrap')) D.closeMenu(false);

    if (t.closest('#menu-btn')) { D.openDrawer(); return; }
    if (t.closest('[data-action="sb-help"]')) {
      /* Close the drawer first, so focus is not held inside it. */
      if (D.isPhone()) D.closeDrawer(false);
      D.helpNow(D.isPhone() ? document.getElementById('menu-btn') : t.closest('[data-action="sb-help"]'));
      return;
    }
    var un = t.closest('[data-action="untrack"]');
    if (un) {
      var uid = un.getAttribute('data-bid');
      var inSidebar = !!t.closest('#sidebar');
      var nextRow = null;
      if (inSidebar) {
        var li = un.closest('.trk');
        var sib = li && (li.nextElementSibling || li.previousElementSibling);
        nextRow = sib ? sib.querySelector('.trk-head') : null;
        nextRow = nextRow ? nextRow.id : null;
      }
      D.untrack(uid);
      if (inSidebar) {
        var f = (nextRow && document.getElementById(nextRow)) || document.getElementById('tracked-h');
        if (f) f.focus();
      } else if (D.afterUntrack) D.afterUntrack(uid);
      return;
    }
    if (t.closest('#scrim') || t.closest('[data-action="close-drawer"]')) { D.closeDrawer(); return; }
    if (t.closest('[data-action="collapse"]')) { D.toggleCollapse(); return; }
    if (t.closest('[data-action="expand-sidebar"]')) {
      D.toggleCollapse(false);
      var h = document.querySelector('#sidebar .trk-head') || document.getElementById('collapse-btn');
      if (h) h.focus();
      return;
    }
    var tr = t.closest('[data-action="trk-toggle"]');
    if (tr) {
      var id = tr.getAttribute('data-bid');
      var open = D.toggleDisclosure(tr);
      D.ui.openTracked[id] = open;
      var li = tr.closest('.trk');
      if (li) li.classList.toggle('is-open', open);
      return;
    }
    if (t.closest('#sidebar a[href]') && D.isPhone()) D.closeDrawer(false);
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('input[data-action="doc"]')) {
      var bid = t.getAttribute('data-bid');
      D.toggleDoc(bid, t.getAttribute('data-doc'), t.checked);
      /* keep every copy of this checkbox in step (sidebar and detail) */
      D.$$('input[data-action="doc"][data-bid="' + bid + '"][data-doc="' + t.getAttribute('data-doc') + '"]').forEach(function (x) { if (x !== t) x.checked = t.checked; });
      var btn = document.getElementById('trk-btn-' + bid);
      if (btn) {
        var b = L.benefitById(bid);
        var docsEl = btn.querySelector('.trk-docs');
        if (docsEl && b) docsEl.textContent = docsCountLine(b);
      }
      if (D.onDocsChange) D.onDocsChange(bid);
    }
  });

  document.addEventListener('keydown', function (e) {
    var menu = document.getElementById('avatar-menu');
    if (e.key === 'Escape') {
      if (menu && !menu.hidden) { e.preventDefault(); D.closeMenu(true); return; }
      var shell = document.getElementById('shell');
      if (shell && shell.getAttribute('data-drawer') === 'open') { e.preventDefault(); D.closeDrawer(); return; }
    }
    if (menu && !menu.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && menu.contains(document.activeElement)) {
      var items = D.$$('.menu-item, .menu-sub-head .icon-btn', menu);
      var i = items.indexOf(document.activeElement);
      var next = e.key === 'ArrowDown' ? items[(i + 1) % items.length] : items[(i - 1 + items.length) % items.length];
      if (next) { e.preventDefault(); next.focus(); }
    }
    /* Focus stays inside the open drawer. */
    var shellEl = document.getElementById('shell');
    if (e.key === 'Tab' && shellEl && shellEl.getAttribute('data-drawer') === 'open') {
      var f = D.$$('#sidebar a[href], #sidebar button:not([disabled]), #sidebar input').filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  document.addEventListener('focusin', function (e) {
    var menu = document.getElementById('avatar-menu');
    if (menu && !menu.hidden && !e.target.closest('#avatar-wrap')) D.closeMenu(false);
  });

  var mq;
  try { mq = window.matchMedia('(max-width: 899px)'); } catch (e) { mq = null; }
  if (mq) {
    var onMq = function () {
      if (!mq.matches) { document.documentElement.classList.remove('no-scroll'); }
      syncDrawerInert();
      D.renderSidebar();
    };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }
})();

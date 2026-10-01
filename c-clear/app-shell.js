/* Landit design C (Big and clear): the shell.
   Hash router, the labelled sidebar (desktop), the slim rail when the
   sidebar is hidden, the bottom tabs and the "My applications" drawer
   (phone), the tracked applications list, and click handling shared by
   every screen. Screens register themselves in LC.views. */
(function () {
  'use strict';
  var C = window.LC;
  var L = C.L;
  var esc = C.esc;

  var PUBLIC = ['login', 'register', 'questions', 'ack'];

  C.route = function () {
    var h = (window.location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { name: parts[0] || '', parts: parts };
  };
  C.go = function (hash) {
    if (window.location.hash === hash) C.render();
    else window.location.hash = hash;
  };

  /* ------------------------------------------------------------------ */
  /* Tracked applications list (sidebar on desktop, drawer on phone)     */
  /* ------------------------------------------------------------------ */

  var expanded = {};

  function tickRow(b, d, where) {
    var on = C.docTicks(b.id).indexOf(d.id) >= 0;
    var id = 't-' + where + '-' + b.id + '-' + d.id;
    return '<li><label class="tick" for="' + esc(id) + '">' +
      '<input type="checkbox" id="' + esc(id) + '" data-doc="' + esc(b.id + '|' + d.id) + '"' + (on ? ' checked' : '') + '>' +
      '<span class="tick-box" aria-hidden="true">' + C.ic('check') + '</span>' +
      '<span class="tick-text">' + esc(d.label) + '</span></label></li>';
  }
  C.tickRow = tickRow;

  C.docGroups = function (b, where) {
    var need = C.docsNeeded(b), maybe = C.docsMaybe(b);
    var out = '';
    if (need.length) {
      out += '<fieldset class="tick-group"><legend>Needed</legend><ul class="ticks">' +
        need.map(function (d) { return tickRow(b, d, where); }).join('') + '</ul></fieldset>';
    }
    if (maybe.length) {
      out += '<fieldset class="tick-group"><legend>' + esc(C.t('maybe_needed')) + '</legend><ul class="ticks">' +
        maybe.map(function (d) { return tickRow(b, d, where); }).join('') + '</ul></fieldset>';
    }
    return out;
  };

  function appItem(t) {
    var b = L.benefitById(t.id);
    if (!b) return '';
    var open = !!expanded[b.id];
    var bodyId = 'app-body-' + b.id;
    var docs = C.docGroups(b, 'side');
    if (!docs) {
      docs = '<p class="app-empty-docs">' + (b.docsKnown ? esc(b.guide.needNote || 'There is nothing to gather for this one.') : 'Landit has no document list for this one yet. Check the official page.') + '</p>';
    }
    return '<li class="app-item" ' + C.catVar(b.category) + ' data-app="' + esc(b.id) + '">' +
      '<button type="button" class="app-toggle" data-action="app-toggle" data-id="' + esc(b.id) + '" aria-expanded="' + open + '" aria-controls="' + esc(bodyId) + '">' +
        C.badge(b, 'sm') +
        '<span class="app-main"><span class="app-name"><bdi>' + esc(b.name) + '</bdi></span>' +
        '<span class="app-meta">' + C.statusPill(t.status) + '<span class="app-count" data-doccount="' + esc(b.id) + '">' + esc(C.docCountText(b)) + '</span></span></span>' +
        '<span class="app-chev">' + C.ic('chevron-down') + '</span>' +
      '</button>' +
      '<div class="app-body" id="' + esc(bodyId) + '"' + (open ? '' : ' hidden') + '>' +
        '<p class="app-body-h">' + esc(C.t('documents')) + '</p>' + docs +
        '<a class="btn btn-secondary btn-sm btn-block" href="#/benefit/' + encodeURIComponent(b.id) + '">' + C.ic('file-text') + '<span>Open details</span></a>' +
      '</div></li>';
  }

  C.appsListHTML = function () {
    var list = C.state.tracked.filter(function (t) { return L.benefitById(t.id); });
    if (!list.length) {
      return '<div class="apps-empty">' + C.ic('bookmark', 'apps-empty-ic') +
        '<p><strong>' + esc(C.t('tracked_empty')) + '.</strong></p>' +
        '<p>Open a benefit and press <strong>' + esc(C.t('track')) + '</strong>. It will show here with a list of documents to tick.</p>' +
        '<a class="btn btn-secondary btn-sm" href="#/benefits">' + C.ic('list') + '<span>See my benefits</span></a></div>';
    }
    return '<ul class="apps">' + list.map(appItem).join('') + '</ul>';
  };

  C.refreshApps = function () {
    var holder = document.getElementById('apps-list');
    if (!holder) return;
    var active = document.activeElement && holder.contains(document.activeElement) ? document.activeElement.id || null : null;
    var activeToggle = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-action') === 'app-toggle' ? document.activeElement.getAttribute('data-id') : null;
    holder.innerHTML = C.appsListHTML();
    var n = C.state.tracked.length;
    document.querySelectorAll('[data-apps-count]').forEach(function (el) { el.textContent = String(n); });
    document.querySelectorAll('[data-apps-label]').forEach(function (el) { el.setAttribute('aria-label', 'My applications, ' + n + ' tracked'); });
    if (active && document.getElementById(active)) document.getElementById(active).focus();
    else if (activeToggle) {
      var t = holder.querySelector('[data-action="app-toggle"][data-id="' + activeToggle + '"]');
      if (t) t.focus();
    }
  };

  /* ------------------------------------------------------------------ */
  /* Shell markup                                                        */
  /* ------------------------------------------------------------------ */

  var NAV = [
    { key: 'chat', href: '#/chat', icon: 'message-circle', label: function () { return C.t('nav_chat'); } },
    { key: 'benefits', href: '#/benefits', icon: 'list', label: function () { return C.t('nav_benefits'); } },
    { key: 'community', href: '#/community', icon: 'users', label: function () { return C.t('nav_community'); } },
  ];

  function initial() {
    var n = (C.state.user && C.state.user.name || '').trim();
    return n ? n.charAt(0).toUpperCase() : '';
  }
  function avatar(cls) {
    var i = initial();
    return '<span class="avatar ' + (cls || '') + '" aria-hidden="true">' + (i ? esc(i) : C.ic('user')) + '</span>';
  }

  function sidebar(view) {
    var n = C.state.tracked.length;
    var name = (C.state.user && C.state.user.name) || '';
    var nav = NAV.map(function (x) {
      var cur = view.nav === x.key;
      return '<a class="nav-link" href="' + x.href + '"' + (cur ? ' aria-current="page"' : '') + '>' + C.ic(x.icon) + '<span>' + esc(x.label()) + '</span></a>';
    }).join('');
    var meCur = view.nav === 'settings';
    var full =
      '<div class="side-full">' +
        '<div class="side-head">' +
          '<a class="brand-link" href="#/chat">' + C.brand() + '<span class="sr-only">, ' + esc(C.t('nav_chat')) + '</span></a>' +
          '<button type="button" class="btn btn-quiet btn-sm desk-only" data-action="rail" aria-expanded="true" aria-controls="sidebar">' + C.ic('panel-left') + '<span>Hide menu</span></button>' +
          '<button type="button" class="icon-btn phone-only" data-action="close-drawer" aria-label="' + esc(C.t('close')) + '">' + C.ic('x') + '</button>' +
        '</div>' +
        '<nav class="side-nav desk-only" aria-label="Main">' + nav + '</nav>' +
        '<section class="side-apps" aria-labelledby="apps-h">' +
          '<h2 class="side-h" id="apps-h">' + C.ic('bookmark') + '<span>My applications</span><span class="count-pill" data-apps-count>' + n + '</span></h2>' +
          '<p class="side-sub">Open one to see the documents you need.</p>' +
          '<div id="apps-list">' + C.appsListHTML() + '</div>' +
          '<p class="side-disclaimer">' + esc(L.disclaimer) + '</p>' +
        '</section>' +
        '<a class="side-me desk-only" href="#/settings"' + (meCur ? ' aria-current="page"' : '') + '>' + avatar() +
          '<span class="side-me-text"><span class="side-me-k" dir="auto">' + esc(C.t('nav_settings')) + '</span>' + (name ? '<span class="side-me-name" dir="auto">' + esc(name) + '</span>' : '') + '</span>' +
          C.icd('chevron-right') + '</a>' +
      '</div>';
    var rail =
      '<div class="side-rail desk-only">' +
        '<a class="brand-link rail-brand" href="#/chat" aria-label="Landit, ' + esc(C.t('nav_chat')) + '"><span class="brand-mark">' + C.glyph() + '</span></a>' +
        '<button type="button" class="rail-item" data-action="rail" aria-expanded="false" aria-controls="sidebar">' + C.ic('panel-left') + '<span>Menu</span></button>' +
        NAV.map(function (x) {
          return '<a class="rail-item" href="' + x.href + '"' + (view.nav === x.key ? ' aria-current="page"' : '') + '>' + C.ic(x.icon) + '<span>' + esc(x.label()) + '</span></a>';
        }).join('') +
        '<button type="button" class="rail-item" data-action="rail-apps" aria-expanded="false" aria-controls="sidebar">' + C.ic('bookmark') + '<span>My applications <span class="count-pill" data-apps-count>' + n + '</span></span></button>' +
        '<a class="rail-item rail-me" href="#/settings"' + (meCur ? ' aria-current="page"' : '') + '>' + avatar('sm') + '<span>' + esc(C.t('nav_settings')) + '</span></a>' +
      '</div>';
    return '<aside id="sidebar" class="side" aria-label="Menu and my applications">' + full + rail + '</aside>';
  }

  function topbar(view) {
    var n = C.state.tracked.length;
    /* On phone the drawer button is on every main screen, so tracked
       applications are always one tap away. */
    var right = view.appsButton !== false
      ? '<button type="button" class="btn btn-secondary btn-sm apps-btn" data-action="open-drawer" data-apps-label aria-label="My applications, ' + n + ' tracked" aria-expanded="false" aria-controls="sidebar">' +
          C.ic('bookmark') + '<span>My applications</span><span class="count-pill" data-apps-count>' + n + '</span></button>'
      : '';
    var brand = view.appsButton !== false
      ? '<span class="brand"><span class="brand-mark">' + C.glyph() + '</span><span class="brand-word brand-word-wide">Landit</span></span>'
      : C.brand();
    return '<header class="topbar phone-only">' + '<a class="brand-link brand-link-top" href="#/chat" aria-label="Landit, ' + esc(C.t('nav_chat')) + '">' + brand + '</a>' + right + '</header>';
  }

  function tabbar(view) {
    /* "Settings", the word the chat replies use. */
    var tabs = NAV.concat([{ key: 'settings', href: '#/settings', icon: 'user', label: function () { return C.t('nav_settings'); } }]);
    return '<nav class="tabbar phone-only" aria-label="Main">' + tabs.map(function (x) {
      var cur = view.nav === x.key;
      return '<a class="tab" href="' + x.href + '"' + (cur ? ' aria-current="page"' : '') + '><span class="tab-ic">' + C.ic(x.icon) + '</span><span class="tab-label">' + esc(x.label()) + '</span></a>';
    }).join('') + '</nav>';
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  var lastRouteKey = null;

  C.render = function (opts) {
    opts = opts || {};
    var r = C.route();
    var s = C.state;
    if (!r.name) { C.go(s.signedIn ? '#/chat' : '#/login'); return; }
    if (PUBLIC.indexOf(r.name) < 0 && !s.signedIn) { C.go('#/login'); return; }
    var make = C.views[r.name];
    if (!make) {
      var home = s.signedIn ? 'chat' : 'login';
      if (r.name !== home && C.views[home]) C.go('#/' + home);
      return;
    }

    C.speech.stop();
    closeDrawer(true);
    var view = make(r.parts) || {};
    if (view.redirect) { C.go(view.redirect); return; }
    document.title = (view.title ? view.title + ' | ' : '') + 'Landit';

    var app = document.getElementById('app');
    if (view.bare) {
      app.innerHTML = '<main id="main" class="bare" tabindex="-1">' + view.html + '</main>';
    } else {
      app.innerHTML =
        '<div class="shell' + (s.prefs.rail ? ' is-rail' : '') + '">' +
          '<div class="scrim" data-action="close-drawer"></div>' +
          sidebar(view) +
          '<div class="main-col" id="main-col">' + topbar(view) +
            '<main id="main" class="' + (view.mainClass || '') + '" tabindex="-1">' + view.html + '</main>' +
          '</div>' +
          tabbar(view) +
        '</div>';
    }
    if (view.after) view.after(app);

    var key = r.parts.join('/');
    document.documentElement.setAttribute('data-route', key);   // for tests: the screen now showing
    var changed = key !== lastRouteKey;
    lastRouteKey = key;
    if (changed && !opts.keepScroll) window.scrollTo(0, 0);
    if (changed && !opts.initial && !opts.noFocus) {
      var target = (view.focus && document.querySelector(view.focus)) || document.querySelector('#main h1') || document.getElementById('main');
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /* Phone drawer: focus moves in, Tab stays in, Escape closes,          */
  /* focus returns to the button that opened it.                         */
  /* ------------------------------------------------------------------ */

  var drawerOpener = null;
  function setInert(on) {
    ['main-col', 'tabbar'].forEach(function (id) {
      var el = id === 'tabbar' ? document.querySelector('.tabbar') : document.getElementById(id);
      if (!el) return;
      if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });
  }
  function openDrawer(opener) {
    var shell = document.querySelector('.shell');
    if (!shell) return;
    drawerOpener = opener || null;
    shell.classList.add('drawer-open');
    document.querySelectorAll('[data-action="open-drawer"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    setInert(true);
    var side = document.getElementById('sidebar');
    side.setAttribute('role', 'dialog');
    side.setAttribute('aria-modal', 'true');
    var first = side.querySelector('[data-action="close-drawer"]');
    window.setTimeout(function () { if (first) first.focus(); }, 30);
  }
  function closeDrawer(silent) {
    var shell = document.querySelector('.shell');
    if (!shell || !shell.classList.contains('drawer-open')) return;
    shell.classList.remove('drawer-open');
    document.querySelectorAll('[data-action="open-drawer"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    setInert(false);
    var side = document.getElementById('sidebar');
    side.removeAttribute('role');
    side.removeAttribute('aria-modal');
    if (!silent && drawerOpener && drawerOpener.isConnected) drawerOpener.focus();
    drawerOpener = null;
  }
  C.closeDrawer = closeDrawer;

  function isPhone() {
    try { return window.matchMedia('(max-width: 959.98px)').matches; } catch (e) { return false; }
  }

  document.addEventListener('keydown', function (e) {
    var shell = document.querySelector('.shell.drawer-open');
    if (!shell) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
    if (e.key !== 'Tab') return;
    var side = document.getElementById('sidebar');
    var items = [].filter.call(side.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (el) {
      return el.offsetParent !== null && !el.disabled;
    });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ------------------------------------------------------------------ */
  /* Shared actions (event delegation)                                   */
  /* ------------------------------------------------------------------ */

  Object.assign(C.actions, {
    'open-drawer': function (el) { openDrawer(el); },
    'close-drawer': function () { closeDrawer(); },
    'rail': function () {
      C.state.prefs.rail = !C.state.prefs.rail;
      C.save();
      var shell = document.querySelector('.shell');
      if (shell) shell.classList.toggle('is-rail', C.state.prefs.rail);
      var sel = C.state.prefs.rail ? '.side-rail [data-action="rail"]' : '.side-full [data-action="rail"]';
      var btn = document.querySelector(sel);
      if (btn) btn.focus();
    },
    'rail-apps': function () {
      C.state.prefs.rail = false;
      C.save();
      var shell = document.querySelector('.shell');
      if (shell) shell.classList.remove('is-rail');
      var h = document.querySelector('.side-apps .app-toggle') || document.querySelector('.side-apps a, .side-apps button');
      if (h) h.focus();
    },
    /* "Open My applications" under a chat reply that mentions the sidebar:
       the drawer on phone, the sidebar list on desktop. */
    'show-apps': function (el) {
      if (isPhone()) { openDrawer(el); return; }
      C.actions['rail-apps']();
    },
    'app-toggle': function (el) {
      var id = el.getAttribute('data-id');
      expanded[id] = !expanded[id];
      el.setAttribute('aria-expanded', String(expanded[id]));
      var body = document.getElementById(el.getAttribute('aria-controls'));
      if (body) body.hidden = !expanded[id];
    },
    'track': function (el) {
      var id = el.getAttribute('data-id');
      var b = L.benefitById(id);
      if (C.isTracked(id)) {
        C.untrack(id);
        C.toast('Removed from My applications. Your ticks and status are kept.');
      } else {
        var had = C.state.claims && C.state.claims[id] && C.state.claims[id] !== 'Not started';
        C.track(id);
        expanded[id] = true;
        C.toast('Added to My applications' + (isPhone() ? '' : ' in the sidebar') + (had ? ', with your saved status' : ''));
      }
      C.syncTrackButtons(id);
      C.refreshApps();
      if (C.onTrackChange) C.onTrackChange(id, b);
    },
    'share': function (el) { C.share(el.getAttribute('data-id')); },
    'read': function (el) {
      var text = C.sayText(el.getAttribute('data-target'));
      if (text) C.speech.toggle(el, text);
    },
    'skip': function () {
      var m = document.getElementById('main');
      if (m) m.focus();
    },
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var name = el.getAttribute('data-action');
    var fn = C.actions[name];
    if (!fn) return;
    if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault();
    fn(el, e);
  });

  /* Ticks for documents and steps keep every copy on the page in step. */
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    var doc = el.getAttribute('data-doc');
    if (doc) {
      var p = doc.split('|');
      C.setDoc(p[0], p[1], el.checked);
      document.querySelectorAll('input[data-doc]').forEach(function (x) { if (x !== el && x.getAttribute('data-doc') === doc) x.checked = el.checked; });
      var b = L.benefitById(p[0]);
      if (b) document.querySelectorAll('[data-doccount]').forEach(function (x) { if (x.getAttribute('data-doccount') === b.id) x.textContent = C.docCountText(b); });
      return;
    }
    var step = el.getAttribute('data-step');
    if (step) {
      var q = step.split('|');
      C.setStep(q[0], parseInt(q[1], 10), el.checked);
      if (C.onStepChange) C.onStepChange(q[0]);
    }
  });

  /* Navigation links inside the drawer close it first. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('#sidebar a[href^="#/"]');
    if (a) closeDrawer(true);
  });

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */

  function start() {
    C.applyParams();
    C.applyPrefs();
    C.render({ initial: true });
    window.addEventListener('hashchange', function () { C.render(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

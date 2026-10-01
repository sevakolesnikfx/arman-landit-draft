/* Landit, design B (Dusk): start-up and the hash router.
   Routes: #/login #/register #/questions #/ack #/chat #/benefits
   #/benefit/<id> #/community (#/community/<benefit id>) #/settings
   (#/settings/status, #/settings/help).
   Query params, applied once on load: ?reset=1 ?demo=1 ?lang= ?theme= ?text= */
(function () {
  'use strict';
  var D = window.DUSK, L = D.L;

  var OPEN_PAGES = ['login', 'register', 'questions', 'ack'];
  var APP_PAGES = ['chat', 'benefits', 'benefit', 'community', 'settings'];

  D.setDocTitle = function (text) { document.title = text + ' | Landit'; };

  function parse() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    return { page: parts[0] || '', arg: parts.slice(1).join('/') || null };
  }
  D.route = parse;

  /* ------------------------------------------------------------------ */
  /* Query params                                                        */
  /* ------------------------------------------------------------------ */

  function applyParams() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { return; }
    if (!location.search) return;
    var r = parse();
    if (params.get('reset')) {
      D.clearAll();
      if (r.page !== 'login' && r.page !== 'register') location.replace('#/register');
    }
    if (params.get('demo')) {
      D.seedDemo();
      if (!r.page) location.replace('#/chat');
    }
    var lang = params.get('lang');
    if (lang && L.i18n.languages.some(function (l) { return l.code === lang; })) D.state.prefs.lang = lang;
    var theme = params.get('theme');
    if (theme && D.themes.some(function (t) { return t.id === theme; })) D.state.prefs.theme = theme;
    var text = params.get('text');
    if (text && D.textSizes.some(function (s) { return s.id === text; })) D.state.prefs.text = text;
    D.save();
    /* Drop the params so a reload does not reset or reseed again. */
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* file:// may refuse: harmless */ }
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  var first = true;

  D.render = function (opts) {
    opts = opts || {};
    D.lastHash = location.hash;
    var r = parse();
    var page = r.page;
    if (page === 'main') return;
    if (OPEN_PAGES.indexOf(page) < 0 && APP_PAGES.indexOf(page) < 0) {
      location.replace(D.signedIn() ? '#/chat' : '#/login');
      return;
    }
    D.stopReading();
    if (D.leaveChat && D.currentPage === 'chat' && page !== 'chat') D.leaveChat();
    D.closeMenu && D.closeMenu(false);
    var openDialogs = document.querySelectorAll('dialog[open]');
    for (var i = 0; i < openDialogs.length; i++) openDialogs[i].remove();
    document.documentElement.classList.remove('no-scroll');

    D.prevPage = D.currentPage;
    D.currentPage = page;

    if (OPEN_PAGES.indexOf(page) >= 0) {
      D.unmountShell();
      if (page !== 'questions') D.ui.q = null;
      D.pages[page](r);
      afterRender(r, opts, false);
      return;
    }
    if (!D.signedIn()) { location.replace('#/login'); return; }
    if (!D.state.ack) { location.replace('#/ack'); return; }

    D.mountShell();
    D.closeDrawer(false);
    D.renderSidebar();
    var handled = D.pages[page === 'benefit' ? 'benefits' : page](r, { fromNav: !first && !opts.keepFocus });
    afterRender(r, opts, handled);
  };

  function afterRender(r, opts, handled) {
    var samePage = D.prevPage === r.page || ((D.prevPage === 'benefit' || D.prevPage === 'benefits') && (r.page === 'benefit' || r.page === 'benefits'));
    if (!samePage && r.page !== 'chat' && !handled) window.scrollTo(0, 0);
    if (first || opts.keepFocus) { first = false; return; }
    if (handled) return;
    if (r.page === 'chat') {
      var input = document.getElementById('chat-input');
      if (input && !D.isPhone()) { input.focus({ preventScroll: true }); return; }
    }
    var h = document.getElementById('page-title');
    if (h) h.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ */
  /* Shared actions                                                      */
  /* ------------------------------------------------------------------ */

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('#skip-link')) {
      e.preventDefault();
      var main = document.getElementById('main');
      if (main) main.focus();
      return;
    }
    var tr = t.closest('[data-action="track"]');
    if (tr) { D.toggleTrack(tr.getAttribute('data-track')); return; }
    var sh = t.closest('[data-action="share"]');
    if (sh) { var b = L.benefitById(sh.getAttribute('data-bid')); if (b) D.share(b); return; }
    var ds = t.closest('[data-action="disclose"]');
    if (ds) { D.toggleDisclosure(ds); return; }
  });

  window.addEventListener('hashchange', function () {
    if (location.hash === D.lastHash) return;
    D.render();
  });

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */

  applyParams();
  D.applyPrefs();
  if (!location.hash || location.hash === '#' || location.hash === '#/') {
    location.replace(D.signedIn() ? '#/chat' : '#/login');
  }
  D.render();
})();

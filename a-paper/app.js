/* Landit design A, "Paper": start-up.
   Reads ?reset, ?demo, ?lang, ?theme and ?text, then shows the page. */
(function () {
  'use strict';
  var P = window.PAPER, L = P.L;
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = { has: function () { return false; }, get: function () { return null; } }; }

  var wantHash = null;
  if (params.has('reset')) {
    P.resetState();
    var name = P.parseRoute().name;
    if (P.PUBLIC.indexOf(name) < 0) wantHash = '#/register';
  }
  if (params.has('demo') && params.get('demo') !== '0') {
    P.seedDemo();
    if (!P.parseRoute().name) wantHash = '#/chat';
  }
  var lang = params.get('lang');
  if (lang && L.i18n.languages.some(function (l) { return l.code === lang; })) P.state.prefs.lang = lang;
  var theme = params.get('theme');
  if (theme && P.themes.some(function (t) { return t.id === theme; })) P.state.prefs.theme = theme;
  var text = params.get('text');
  if (text && P.textSizes.some(function (s) { return s.id === text; })) P.state.prefs.text = text;
  P.save();

  P.applyTheme();
  P.applyText();
  P.applyLang();

  if (!wantHash && !P.parseRoute().name) wantHash = P.signedIn() ? '#/chat' : '#/login';

  /* Drop the query so a reload does not reset again; keep the page. */
  var clean = location.pathname + (wantHash || location.hash || '');
  var replaced = false;
  if (location.search || wantHash) {
    try { history.replaceState(null, '', clean); replaced = true; } catch (e) { replaced = false; }
  }
  if (wantHash && !replaced) { location.replace(wantHash); }
  else P.render({ nav: true, initial: true });

  window.addEventListener('hashchange', function () { P.render({ nav: true }); });
})();

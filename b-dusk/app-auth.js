/* Landit, design B (Dusk): sign in, register, the questionnaire and the
   one-time acknowledgement. These pages render without the app shell. */
(function () {
  'use strict';
  var D = window.DUSK, L = D.L;
  var esc = D.esc;

  function app() { return document.getElementById('app'); }

  function langSelect(id) {
    return '<div class="lang-pick">' + D.icon('globe', { size: 18 }) +
      '<label class="sr-only" for="' + id + '">' + esc(D.t('lang')) + '</label>' +
      '<span class="select-wrap"><select id="' + id + '" class="select select-quiet" data-action="lang-select">' +
      L.i18n.languages.map(function (l) { return '<option value="' + l.code + '"' + (l.code === D.lang() ? ' selected' : '') + '>' + esc(l.name) + '</option>'; }).join('') +
      '</select>' + D.icon('chevron-down', { size: 16, className: 'select-chev' }) + '</span></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Login and register                                                  */
  /* ------------------------------------------------------------------ */

  function authPanel() {
    var lines = [
      { icon: 'message-circle', text: 'Ask a question in your own words.' },
      { icon: 'pound-sterling', text: 'See what you may be able to claim on your visa.' },
      { icon: 'list-checks', text: 'Track your applications and the documents you need.' },
    ];
    return '<aside class="auth-panel horizon" aria-label="About Landit">' +
      '<div class="auth-panel-inner">' +
      '<p class="free-label">' + esc(D.t('free_badge')) + '</p>' +
      '<p class="auth-tagline">' + esc(L.tagline) + '</p>' +
      '<p class="auth-support">' + esc(L.supportLine) + '</p>' +
      '<ul class="auth-lines">' + lines.map(function (l) {
        return '<li><span class="auth-line-ico" aria-hidden="true">' + D.icon(l.icon, { size: 20 }) + '</span><span>' + esc(l.text) + '</span></li>';
      }).join('') + '</ul>' +
      '</div></aside>';
  }

  function field(id, label, type, value, attrs) {
    return '<div class="field"><label class="field-label" for="' + id + '">' + esc(label) + '</label>' +
      '<input class="input" id="' + id + '" name="' + id + '" type="' + type + '" value="' + esc(value || '') + '" ' + (attrs || '') + '></div>';
  }
  function passwordField(id, autocomplete) {
    return '<div class="field"><label class="field-label" for="' + id + '">' + esc(D.t('auth_password')) + '</label>' +
      '<div class="input-with-btn"><input class="input" id="' + id + '" name="' + id + '" type="password" autocomplete="' + autocomplete + '">' +
      '<button type="button" class="icon-btn pw-toggle" data-action="pw-toggle" aria-controls="' + id + '" aria-pressed="false" aria-label="Show password">' + D.icon('eye', { size: 20 }) + '</button></div></div>';
  }

  function authPage(mode) {
    var isReg = mode === 'register';
    var prevEmail = !isReg && D.state.user ? D.state.user.email : '';
    D.setDocTitle(isReg ? D.t('auth_create') : D.t('auth_signin'));
    var form = isReg
      ? field('reg-name', 'Your name', 'text', '', 'autocomplete="given-name"') +
        field('reg-email', D.t('auth_email'), 'email', '', 'autocomplete="email" inputmode="email"') +
        passwordField('reg-password', 'new-password')
      : field('login-email', D.t('auth_email'), 'email', prevEmail, 'autocomplete="email" inputmode="email"') +
        passwordField('login-password', 'current-password');
    app().innerHTML =
      '<div class="auth">' +
      '<div class="auth-main">' +
      '<div class="auth-top"><span class="brand">' + D.mark(32) + '<span class="brand-name">Landit</span></span>' + langSelect('auth-lang') + '</div>' +
      '<main id="main" class="auth-center" tabindex="-1">' +
      '<div class="auth-card">' +
      '<p class="free-label only-phone">' + esc(D.t('free_badge')) + '</p>' +
      '<h1 class="auth-h" id="page-title" tabindex="-1">' + esc(isReg ? D.t('auth_create') : D.t('auth_signin')) + '</h1>' +
      '<p class="auth-sub only-phone">' + esc(L.tagline) + ' ' + esc(L.supportLine) + '</p>' +
      '<p class="auth-sub only-desk">' + esc(isReg ? 'It takes a minute. Then ask Landit anything.' : 'Welcome back. Sign in to see your chat and benefits.') + '</p>' +
      '<form class="auth-form" id="auth-form" data-mode="' + mode + '" novalidate>' + form +
      '<button type="submit" class="btn btn-primary btn-lg btn-block" id="auth-submit">' + esc(isReg ? D.t('auth_create') : D.t('auth_signin')) + '</button>' +
      '</form>' +
      '<p class="auth-switch">' + (isReg
        ? esc('Already have an account?') + ' <a href="#/login" id="to-login">' + esc(D.t('auth_signin')) + '</a>'
        : esc('New to Landit?') + ' <a href="#/register" id="to-register">' + esc(D.t('auth_create')) + '</a>') + '</p>' +
      '<p class="auth-dummy">' + D.icon('info', { size: 16 }) + '<span>This is a prototype. Any details work, and nothing is sent anywhere.</span></p>' +
      '</div></main>' +
      D.footer({ free: false }) +
      '</div>' +
      authPanel() +
      '</div>';
  }

  D.pages.login = function () { authPage('login'); };
  D.pages.register = function () { authPage('register'); };

  function nameFromEmail(email) {
    var local = String(email || '').split('@')[0].replace(/[._\d]+/g, ' ').trim().split(' ')[0] || '';
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : '';
  }

  function submitAuth(form) {
    var mode = form.getAttribute('data-mode');
    var prefs = D.state.prefs;
    if (mode === 'register') {
      var name = form.querySelector('#reg-name').value.trim();
      var email = form.querySelector('#reg-email').value.trim();
      var s = D.fresh();
      s.prefs = prefs;
      s.user = { name: name || nameFromEmail(email), email: email };
      s.session = true;
      D.state = s;
      D._match = null;
      D.ui.openTracked = {};
      D.save();
      location.hash = '#/questions';
      return;
    }
    var em = form.querySelector('#login-email').value.trim();
    if (D.state.user && (!em || em.toLowerCase() === String(D.state.user.email || '').toLowerCase())) {
      D.state.session = true;
    } else {
      var n = D.fresh();
      n.prefs = prefs;
      n.user = { name: nameFromEmail(em), email: em };
      n.session = true;
      D.state = n;
      D._match = null;
    }
    D.save();
    location.hash = D.state.ack ? '#/chat' : '#/ack';
  }

  /* ------------------------------------------------------------------ */
  /* Questionnaire: one page, every question skippable                   */
  /* ------------------------------------------------------------------ */

  D.ui.q = null;

  function qState() {
    if (!D.ui.q) {
      var p = D.state.profile || {};
      D.ui.q = { answers: {}, skipped: {} };
      L.questionnaire.forEach(function (q) { if (p[q.id] !== undefined && p[q.id] !== null) D.ui.q.answers[q.id] = p[q.id]; });
    }
    return D.ui.q;
  }

  function progressHTML() {
    var st = qState(), total = L.questionnaire.length;
    var answered = Object.keys(st.answers).length;
    var skipped = Object.keys(st.skipped).filter(function (k) { return st.skipped[k]; }).length;
    var done = Math.min(total, answered + skipped);
    return '<div class="q-progress-text"><span><strong class="num">' + answered + '</strong> of ' + total + ' answered</span>' +
      (skipped ? '<span class="muted">' + skipped + ' skipped</span>' : '') + '</div>' +
      '<div class="q-line" aria-hidden="true"><span style="width:' + Math.round(done / total * 100) + '%"></span></div>';
  }

  function questionCard(q, i) {
    var st = qState();
    var skipped = !!st.skipped[q.id];
    var val = st.answers[q.id];
    var total = L.questionnaire.length;
    var opts = q.options.map(function (o) {
      var id = 'q-' + q.id + '-' + o.value;
      return '<label class="opt" for="' + id + '"><input type="radio" id="' + id + '" name="q-' + q.id + '" value="' + esc(o.value) + '" data-action="q-answer" data-q="' + q.id + '"' + (val === o.value ? ' checked' : '') + '>' +
        '<span class="opt-box">' + D.icon('check', { size: 16, className: 'opt-check' }) + '<span>' + esc(o.label) + '</span></span></label>';
    }).join('');
    return '<section class="q-card' + (skipped ? ' is-skipped' : '') + (val !== undefined ? ' is-answered' : '') + '" id="qc-' + q.id + '" aria-labelledby="qh-' + q.id + '">' +
      '<div class="q-card-head">' +
      '<span class="q-ico" aria-hidden="true">' + D.icon(q.icon, { size: 20 }) + '</span>' +
      '<div class="q-titles"><p class="q-num">' + esc(D.tf('question_of', { n: i + 1, total: total })) + '</p>' +
      '<h2 class="q-h" id="qh-' + q.id + '">' + esc(q.question) + '</h2></div>' +
      '<button type="button" class="pill-btn" data-action="q-skip" data-q="' + q.id + '" aria-pressed="' + skipped + '" id="qskip-' + q.id + '">' +
      (skipped ? esc('Answer') : esc(D.t('skip'))) + '<span class="sr-only">: ' + esc(q.question) + '</span></button>' +
      '</div>' +
      (skipped
        ? '<p class="q-skipped-note">' + D.icon('circle-check', { size: 18 }) + '<span>Skipped. You can answer this later in ' + esc(D.t('nav_settings')) + '.</span></p>'
        : '<p class="q-help">' + esc(q.help) + '</p>' +
          '<fieldset class="q-opts"><legend class="sr-only">' + esc(q.question) + '</legend>' + opts + '</fieldset>') +
      '</section>';
  }

  D.pages.questions = function () {
    D.setDocTitle('A few questions');
    var st = qState();
    app().innerHTML =
      '<div class="q-page">' +
      '<header class="q-top">' +
      '<div class="q-top-inner"><span class="brand">' + D.mark(28) + '<span class="brand-name">Landit</span></span>' + langSelect('q-lang') + '</div>' +
      '<div class="q-progress" id="q-progress">' + progressHTML() + '</div>' +
      '</header>' +
      '<div class="q-scroll" id="q-scroll"><main id="main" class="q-main" tabindex="-1">' +
      '<div class="q-intro">' +
      '<h1 class="q-title" id="page-title" tabindex="-1">A few questions about you</h1>' +
      '<p class="q-lead">Your answers help Landit show the schemes that fit you. Every question is optional. You can change your answers later in ' + esc(D.t('nav_settings')) + '.</p>' +
      '</div>' +
      '<div class="q-list" id="q-list">' + L.questionnaire.map(questionCard).join('') + '</div>' +
      '</main></div>' +
      '<div class="q-bar"><div class="q-bar-inner">' +
      '<button type="button" class="btn btn-ghost btn-lg" id="q-skip-all" data-action="q-skip-all">' + esc(skipAllLabel()) + '</button>' +
      '<button type="button" class="btn btn-primary btn-lg" id="q-continue" data-action="q-continue">' + esc(D.t('continue')) + D.dicon('arrow-right', { size: 20 }) + '</button>' +
      '</div></div>' +
      '</div>';
    void st;
  };

  /* "Skip all" keeps answers already given, so it says so once there are some. */
  function skipAllLabel() {
    return Object.keys(qState().answers).length ? 'Skip the rest' : 'Skip all';
  }
  function refreshSkipAll() {
    var b = document.getElementById('q-skip-all');
    if (b) b.textContent = skipAllLabel();
  }

  function refreshCard(qid, focusSel) {
    var q = L.questionnaire.filter(function (x) { return x.id === qid; })[0];
    var i = L.questionnaire.indexOf(q);
    var el = document.getElementById('qc-' + qid);
    if (!el) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = questionCard(q, i);
    el.replaceWith(wrap.firstChild);
    document.getElementById('q-progress').innerHTML = progressHTML();
    refreshSkipAll();
    if (focusSel) { var f = document.querySelector(focusSel); if (f) f.focus(); }
  }

  function finishQuestions(skipRest) {
    var st = qState();
    var profile = {};
    L.questionnaire.forEach(function (q) {
      if (st.answers[q.id] !== undefined && !st.skipped[q.id]) profile[q.id] = st.answers[q.id];
    });
    var keep = D.state.profile || {};
    ['nrpf', 'city', 'partner', 'carer', 'disabled', 'pregnant'].forEach(function (k) { if (keep[k] !== undefined) profile[k] = keep[k]; });
    D.state.profile = profile;
    D.state.answered = true;
    D._match = null;
    D.save();
    D.ui.q = null;
    void skipRest;
    location.hash = D.state.ack ? '#/chat' : '#/ack';
  }

  /* ------------------------------------------------------------------ */
  /* One-time acknowledgement                                            */
  /* ------------------------------------------------------------------ */

  D.pages.ack = function () {
    D.setDocTitle(D.t('disclaimer_title'));
    app().innerHTML =
      '<div class="ack horizon">' +
      '<main id="main" class="ack-main" tabindex="-1">' +
      '<div class="ack-card">' +
      D.mark(44) +
      '<h1 class="ack-h" id="page-title" tabindex="-1">' + esc(D.t('disclaimer_title')) + '</h1>' +
      '<p class="ack-disclaimer">' + esc(L.disclaimer) + '</p>' +
      '<ul class="ack-points">' +
      '<li>' + D.icon('check', { size: 18 }) + '<span>Landit shows what you <strong>may</strong> be able to claim, and what it could be worth.</span></li>' +
      '<li>' + D.icon('check', { size: 18 }) + '<span>Each scheme makes its own decision.</span></li>' +
      '<li>' + D.icon('check', { size: 18 }) + '<span>You can read this again at the bottom of every page.</span></li>' +
      '</ul>' +
      '<button type="button" class="btn btn-primary btn-lg btn-block" id="ack-btn" data-action="ack">' + esc(D.t('understood')) + '</button>' +
      '</div></main></div>';
  };

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.id === 'auth-form') { e.preventDefault(); submitAuth(f); }
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var pw = t.closest('[data-action="pw-toggle"]');
    if (pw) {
      var input = document.getElementById(pw.getAttribute('aria-controls'));
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      pw.setAttribute('aria-pressed', String(show));
      pw.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      pw.innerHTML = D.icon(show ? 'eye-off' : 'eye', { size: 20 });
      return;
    }
    var sk = t.closest('[data-action="q-skip"]');
    if (sk) {
      var qid = sk.getAttribute('data-q');
      var st = qState();
      st.skipped[qid] = !st.skipped[qid];
      if (st.skipped[qid]) delete st.answers[qid];
      refreshCard(qid, '#qskip-' + qid);
      return;
    }
    if (t.closest('[data-action="q-skip-all"]')) { finishQuestions(true); return; }
    if (t.closest('[data-action="q-continue"]')) { finishQuestions(false); return; }
    if (t.closest('[data-action="ack"]')) {
      D.state.ack = true;
      D.save();
      location.hash = D.signedIn() ? '#/chat' : '#/login';
      return;
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || !t.matches) return;
    if (t.matches('[data-action="q-answer"]')) {
      var st = qState();
      var qid = t.getAttribute('data-q');
      st.answers[qid] = t.value;
      st.skipped[qid] = false;
      var card = document.getElementById('qc-' + qid);
      if (card) card.classList.add('is-answered');
      document.getElementById('q-progress').innerHTML = progressHTML();
      refreshSkipAll();
      return;
    }
    if (t.matches('[data-action="lang-select"]')) {
      D.state.prefs.lang = t.value;
      D.save();
      D.applyLang();
      var id = t.id;
      D.render({ keepFocus: true });
      var again = document.getElementById(id);
      if (again) again.focus();
    }
  });
})();

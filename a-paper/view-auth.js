/* Landit design A, "Paper": sign in, register, the optional questions and
   the one-time acknowledgement. Nothing typed here is sent anywhere. */
(function () {
  'use strict';
  var P = window.PAPER, L = P.L, esc = P.esc, icon = P.icon;

  function topBar() {
    return '<header class="auth-top">' +
      P.wordmark(null) +
      '<button type="button" class="btn sm quiet lang-btn" data-act="lang-dialog" aria-label="' + esc(P.t('lang')) + ': ' + esc(P.langName(P.lang())) + '">' +
        icon('globe', 18) + '<span>' + esc(P.langName(P.lang())) + '</span></button>' +
    '</header>';
  }

  function hero() {
    var words = L.tagline.replace(/\.$/, '').split(' ');
    var last = words.pop();
    return '<div class="auth-hero">' +
      '<span class="hero-glyph" aria-hidden="true">' + P.glyph(44) + '</span>' +
      '<h1 class="display">' + esc(words.join(' ')) + ' <em>' + esc(last) + '.</em></h1>' +
      '<p class="support">' + esc(L.supportLine) + '</p>' +
      '<p class="free-label">' + esc(P.t('free_badge')) + '</p>' +
    '</div>';
  }

  function field(id, label, type, auto, hint, extra) {
    var pass = type === 'password';
    return '<div class="field">' +
      '<label class="field-label" for="' + id + '">' + esc(label) + '</label>' +
      (pass ? '<div class="input-wrap">' : '') +
      '<input class="input" id="' + id + '" name="' + id + '" type="' + type + '" autocomplete="' + auto + '"' + (extra || '') + '>' +
      (pass ? '<button type="button" class="icon-btn pass-eye" data-act="toggle-pass" data-for="' + id + '" aria-pressed="false" aria-label="Show password">' + icon('eye', 20) + '</button></div>' : '') +
      (hint ? '<p class="field-hint">' + esc(hint) + '</p>' : '') +
    '</div>';
  }

  var dummyNote = '<p class="dummy-note">' + icon('lock', 16) + '<span>This is a test version. What you type stays on this device.</span></p>';

  /* ------------------------------------------------------------------ */
  P.views.login = {
    render: function () {
      return {
        title: P.t('auth_signin'),
        html: '<div class="auth-page">' + topBar() +
          '<main id="main" class="auth-main" tabindex="-1">' + hero() +
            '<form class="auth-card" data-form="login" novalidate>' +
              '<h2 class="card-title">' + esc(P.t('auth_signin')) + '</h2>' +
              field('login-email', P.t('auth_email'), 'email', 'email', null, ' inputmode="email" aria-describedby="login-err"') +
              field('login-pass', P.t('auth_password'), 'password', 'current-password') +
              '<div class="form-msg" id="login-err" role="alert" hidden></div>' +
              '<button type="submit" class="btn primary big block">' + esc(P.t('auth_signin')) + '</button>' +
              '<p class="auth-switch">New to Landit? <a href="#/register">' + esc(P.t('auth_create')) + '</a></p>' +
              dummyNote +
            '</form>' +
          '</main>' + P.footer('auth-foot', true) + '</div>',
      };
    },
  };

  P.views.register = {
    render: function () {
      return {
        title: P.t('auth_create'),
        html: '<div class="auth-page">' + topBar() +
          '<main id="main" class="auth-main" tabindex="-1">' + hero() +
            '<form class="auth-card" data-form="register" novalidate>' +
              '<h2 class="card-title">' + esc(P.t('auth_create')) + '</h2>' +
              field('reg-name', 'Your name', 'text', 'given-name', 'So we can greet you. A first name is enough.') +
              field('reg-email', P.t('auth_email'), 'email', 'email', null, ' inputmode="email"') +
              field('reg-pass', P.t('auth_password'), 'password', 'new-password') +
              '<button type="submit" class="btn primary big block">' + esc(P.t('auth_create')) + '</button>' +
              '<p class="auth-switch">Already have an account? <a href="#/login">' + esc(P.t('auth_signin')) + '</a></p>' +
              dummyNote +
            '</form>' +
          '</main>' + P.footer('auth-foot', true) + '</div>',
      };
    },
  };

  P.acts['toggle-pass'] = function (btn) {
    var input = document.getElementById(btn.getAttribute('data-for'));
    if (!input) return;
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', show ? 'true' : 'false');
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    btn.innerHTML = icon(show ? 'eye-off' : 'eye', 20);
  };

  function nameFromEmail(email) {
    var s = String(email || '').split('@')[0].replace(/[._\d]+/g, ' ').trim().split(' ')[0] || '';
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function createAccount(name, email) {
    var prefs = P.state.prefs;
    P.resetState();
    P.state.prefs = prefs;
    P.state.user = { name: name || nameFromEmail(email), email: email };
    P.state.session = true;
    P.save();
    P.ui.qStep = 0;
    P.go('#/questions');
  }

  /* Creating an account replaces the one saved on this device, so ask first. */
  P.forms.register = function (form) {
    var name = form.querySelector('#reg-name').value.trim();
    var email = form.querySelector('#reg-email').value.trim();
    var u = P.state.user;
    if (!u) { createAccount(name, email); return; }
    P.confirm({
      title: 'Replace the saved account?',
      text: 'There is already an account on this device' + (u.email ? ' (' + u.email + ')' : '') +
        '. A new account replaces it, with its answers, tracked applications and chat. To keep it, choose Cancel and sign in instead.',
      yes: 'Create new account',
      danger: true,
      onYes: function () { createAccount(name, email); },
    });
  };

  function showLoginMsg(form, html) {
    var box = form.querySelector('#login-err');
    if (!box) return;
    box.innerHTML = html;
    box.hidden = false;
  }

  /* Signing in never deletes anything. An email that does not match the
     account on this device gets a calm message instead. */
  P.forms.login = function (form) {
    var input = form.querySelector('#login-email');
    var email = input.value.trim();
    var u = P.state.user;
    if (u) {
      var same = !email || String(u.email || '').toLowerCase() === email.toLowerCase();
      if (!same) {
        showLoginMsg(form, icon('info', 18) + '<span>There is no account with this email on this device. Check the email, or <a href="#/register">create a new account</a>.</span>');
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
    } else {
      if (!email) {
        showLoginMsg(form, icon('info', 18) + '<span>' + esc(P.t('auth_err_email')) + '</span>');
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      /* Nothing saved on this device yet: start a fresh account. */
      P.state.user = { name: nameFromEmail(email), email: email };
    }
    input.removeAttribute('aria-invalid');
    P.state.session = true;
    P.save();
    P.go(P.state.ack ? '#/chat' : '#/ack');
  };

  /* ------------------------------------------------------------------ */
  /* The optional questions, one per screen                             */
  /* ------------------------------------------------------------------ */
  P.views.questions = {
    render: function (r) {
      var Q = L.questionnaire;
      var i = Math.max(0, Math.min(Q.length - 1, (parseInt(r.args[0], 10) || 1) - 1));
      var q = Q[i];
      var cur = P.state.profile[q.id];
      var many = q.options.length > 6;
      var html = '<div class="auth-page q-page">' + topBar() +
        '<main id="main" class="q-main" tabindex="-1">' +
          '<p class="q-intro">A few short questions help Landit show what fits you. You can skip any of them.</p>' +
          '<form class="q-card" data-form="question" data-q="' + i + '">' +
            '<div class="q-top">' +
              (i > 0 ? '<a class="btn sm quiet" href="#/questions/' + i + '">' + icon('chevron-left', 18, 'flip-rtl') + '<span>' + esc(P.t('back')) + '</span></a>' : '<span class="q-top-spacer"></span>') +
              '<p class="q-count">' + esc(P.tf('question_of', { n: i + 1, total: Q.length })) + '</p>' +
              '<button type="button" class="btn sm quiet" data-act="q-skip-all">Skip all</button>' +
            '</div>' +
            '<div class="q-progress" aria-hidden="true">' + Q.map(function (_, k) {
              return '<span class="' + (k < i ? 'done' : (k === i ? 'now' : '')) + '"></span>';
            }).join('') + '</div>' +
            '<fieldset class="q-fieldset">' +
              '<legend class="q-legend"><span class="q-ico" aria-hidden="true">' + icon(q.icon, 26) + '</span>' +
                '<h1 class="q-question">' + esc(q.question) + '</h1></legend>' +
              '<p class="q-help"><strong>' + esc(P.t('why_we_ask')) + ':</strong> ' + esc(q.help) + '</p>' +
              '<div class="q-options' + (many ? ' two-col' : '') + '">' +
                q.options.map(function (o) {
                  return '<label class="opt"><input type="radio" name="answer" value="' + esc(o.value) + '" data-change="q-answer"' + (cur === o.value ? ' checked' : '') + '>' +
                    '<span class="opt-box"><span class="opt-dot" aria-hidden="true"></span><span class="opt-label">' + esc(o.label) + '</span></span></label>';
                }).join('') +
              '</div>' +
            '</fieldset>' +
            '<p class="q-hint" id="q-hint" role="status"></p>' +
            /* On phones this row stays at the bottom of the screen, so Skip is always in reach. */
            '<div class="q-actions">' +
              '<button type="button" class="btn quiet q-skip" data-act="q-skip">Skip this question</button>' +
              '<button type="submit" class="btn primary big" id="q-next">' + esc(P.t('continue')) + icon('arrow-right', 18, 'flip-rtl') + '</button>' +
            '</div>' +
          '</form>' +
        '</main>' + P.footer('auth-foot', true) + '</div>';
      return { title: 'Questions', html: html };
    },
  };

  function nextQuestion(i) {
    if (i + 1 < L.questionnaire.length) P.go('#/questions/' + (i + 2));
    else P.go('#/ack');
  }
  P.changes['q-answer'] = function () {
    var hint = document.getElementById('q-hint');
    if (hint) hint.textContent = '';
  };
  P.forms.question = function (form) {
    var i = parseInt(form.getAttribute('data-q'), 10);
    var picked = form.querySelector('input[name="answer"]:checked');
    if (!picked) {
      /* Continue is never greyed out: it says what to do instead. */
      var hint = document.getElementById('q-hint');
      if (hint) hint.textContent = 'Choose an answer, or skip this question.';
      var first = form.querySelector('input[name="answer"]');
      if (first) first.focus();
      return;
    }
    P.state.profile[L.questionnaire[i].id] = picked.value;
    P.save();
    nextQuestion(i);
  };
  P.acts['q-skip'] = function (el) {
    var form = el.closest('form');
    var i = parseInt(form.getAttribute('data-q'), 10);
    delete P.state.profile[L.questionnaire[i].id];
    P.save();
    nextQuestion(i);
  };
  P.acts['q-skip-all'] = function () { P.go('#/ack'); };

  /* ------------------------------------------------------------------ */
  /* One-time acknowledgement                                           */
  /* ------------------------------------------------------------------ */
  P.views.ack = {
    render: function () {
      return {
        title: P.t('disclaimer_title'),
        html: '<div class="auth-page">' +
          '<header class="auth-top">' + P.wordmark(null) + '</header>' +
          '<main id="main" class="ack-main" tabindex="-1">' +
            '<div class="ack-card">' +
              '<span class="ack-ico" aria-hidden="true">' + icon('info', 26) + '</span>' +
              '<h1 class="ack-title">' + esc(P.t('disclaimer_title')) + '</h1>' +
              '<p class="ack-lead">Landit helps you find money, services and rights you may be able to get in the UK. Please keep this in mind:</p>' +
              '<blockquote class="ack-quote"><p>' + esc(L.disclaimer) + '</p></blockquote>' +
              '<button type="button" class="btn primary big" data-act="ack">' + esc(P.t('understood')) + '</button>' +
              '<p class="ack-small">You will see this once. It is also at the bottom of every page.</p>' +
            '</div>' +
          '</main></div>',
      };
    },
  };
  P.acts.ack = function () {
    P.state.ack = true;
    P.save();
    P.go(P.signedIn() ? '#/chat' : '#/login');
  };
})();

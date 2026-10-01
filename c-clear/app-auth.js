/* Landit design C (Big and clear): sign in, create account, the optional
   questions (one per screen) and the one-time disclaimer screen.
   Nothing typed here is sent anywhere: this is a click dummy. */
(function () {
  'use strict';
  var C = window.LC;
  var L = C.L;
  var esc = C.esc;

  /* ------------------------------------------------------------------ */
  /* Language picker (a plain, big native select)                        */
  /* ------------------------------------------------------------------ */

  C.langSelect = function (id) {
    var cur = C.lang();
    return '<div class="lang-pick"><label for="' + id + '">' + C.ic('globe') + '<span>' + esc(C.t('lang')) + '</span></label>' +
      '<select class="select" id="' + id + '" data-lang-select>' +
      L.i18n.languages.map(function (l) {
        return '<option value="' + l.code + '"' + (l.code === cur ? ' selected' : '') + ' lang="' + l.code + '">' + esc(l.name) + '</option>';
      }).join('') + '</select></div>';
  };
  C.setLang = function (code) {
    C.state.prefs.lang = code;
    C.save();
    C.applyPrefs();
    C.render({ keepScroll: true, noFocus: true });
  };
  document.addEventListener('change', function (e) {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-lang-select')) {
      var id = e.target.id;
      C.setLang(e.target.value);
      var again = document.getElementById(id);
      if (again) again.focus();
    }
  });

  /* ------------------------------------------------------------------ */
  /* Sign in and Create account                                          */
  /* ------------------------------------------------------------------ */

  function nextAfterSignIn() {
    var s = C.state;
    if (!s.answered) return '#/questions';
    if (!s.ack) return '#/ack';
    return '#/chat';
  }

  function authView(mode) {
    var reg = mode === 'register';
    var title = reg ? C.t('auth_create') : C.t('auth_signin');
    var html =
      '<div class="auth">' +
        '<div class="auth-top">' + C.brand() + C.langSelect('auth-lang') + '</div>' +
        '<div class="auth-hero">' +
          '<h1 class="auth-title">' + esc(L.tagline) + '</h1>' +
          '<p class="auth-support">' + esc(L.supportLine) + '</p>' +
          '<p class="free-label">' + C.ic('heart') + '<span>' + esc(C.t('free_badge')) + '</span></p>' +
        '</div>' +
        '<div class="card auth-card">' +
          '<nav class="auth-tabs" aria-label="' + esc(C.t('auth_signin') + ' / ' + C.t('auth_create')) + '">' +
            '<a href="#/login"' + (reg ? '' : ' aria-current="page"') + '>' + C.ic('log-in') + '<span>' + esc(C.t('auth_signin')) + '</span></a>' +
            '<a href="#/register"' + (reg ? ' aria-current="page"' : '') + '>' + C.ic('user') + '<span>' + esc(C.t('auth_create')) + '</span></a>' +
          '</nav>' +
          '<form id="auth-form" class="auth-form" novalidate>' +
            '<h2 class="sr-only">' + esc(title) + '</h2>' +
            (reg ? '<div class="field"><label class="field-label" for="f-name">Your name</label>' +
              '<input class="input" id="f-name" name="name" type="text" autocomplete="name" placeholder="For example, Amara"></div>' : '') +
            '<div class="field"><label class="field-label" for="f-email">' + esc(C.t('auth_email')) + '</label>' +
              '<input class="input" id="f-email" name="email" type="email" autocomplete="email" inputmode="email" dir="ltr" placeholder="name@example.com"></div>' +
            '<div class="field"><label class="field-label" for="f-pass">' + esc(C.t('auth_password')) + '</label>' +
              '<div class="pass-row"><input class="input" id="f-pass" name="password" type="password" autocomplete="' + (reg ? 'new-password' : 'current-password') + '" dir="ltr">' +
              '<button type="button" class="btn btn-secondary pass-toggle" data-action="toggle-pass" aria-controls="f-pass" aria-pressed="false">' + C.ic('eye') + '<span>Show</span></button></div></div>' +
            '<button type="submit" class="btn btn-primary btn-block btn-lg">' + C.ic(reg ? 'arrow-right' : 'log-in', reg ? 'flip' : '') + '<span>' + esc(title) + '</span></button>' +
          '</form>' +
          '<p class="auth-switch">' + (reg
            ? 'Already have an account? <a href="#/login">' + esc(C.t('auth_signin')) + '</a>'
            : 'New to Landit? <a href="#/register">' + esc(C.t('auth_create')) + '</a>') + '</p>' +
          '<p class="proto-note">' + C.ic('info') + '<span>This is a practice version. Nothing you type is sent anywhere.</span></p>' +
        '</div>' +
        C.footer({ noFree: true }) +
      '</div>';
    return {
      title: title,
      bare: true,
      html: html,
      after: function () {
        var form = document.getElementById('auth-form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var name = (form.elements.name ? form.elements.name.value : '').trim();
          var email = form.elements.email.value.trim();
          var s = C.state;
          var stored = s.user && s.user.email ? String(s.user.email).trim().toLowerCase() : '';
          if (reg) {
            /* A new account never sees the last person's answers, tracked
               applications, ticks or chat on a shared device. */
            C.startFresh({ name: name, email: email });
          } else if (!s.user || (email && email.toLowerCase() !== stored)) {
            /* Signing in as someone else: start clean too. */
            C.startFresh({ name: '', email: email });
          } else {
            s.signedIn = true;
            C.save();
          }
          C.go(reg ? '#/questions' : nextAfterSignIn());
        });
      },
    };
  }
  C.views.login = function () { return authView('login'); };
  C.views.register = function () { return authView('register'); };

  C.actions['toggle-pass'] = function (el) {
    var input = document.getElementById(el.getAttribute('aria-controls'));
    if (!input) return;
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    el.setAttribute('aria-pressed', String(show));
    el.innerHTML = C.ic(show ? 'eye-off' : 'eye') + '<span>' + (show ? 'Hide' : 'Show') + '</span>';
  };

  /* ------------------------------------------------------------------ */
  /* Questions: one per screen, every one can be skipped                 */
  /* ------------------------------------------------------------------ */

  var OPTION_ICONS = {
    status: { worker: 'briefcase', student: 'graduation-cap', graduate: 'graduation-cap', family: 'users', bno: 'flag',
      euss_settled: 'flag', euss_presettled: 'flag', refugee: 'shield', ukraine: 'flag', ilr: 'home', asylum: 'hourglass', unsure: 'circle-help' },
    nation: {},
    work: { employed: 'briefcase', self_employed: 'store', not_working: 'home' },
    study: { full_time: 'graduation-cap', part_time: 'clock', not_studying: 'home' },
    children: { yes: 'baby', expecting: 'heart', no: 'user' },
    housing: { rent: 'file-text', own: 'home', family: 'users', other: 'ellipsis' },
    age: { no_say: 'eye-off' },
  };
  C.optionIcon = function (q, o) {
    return (OPTION_ICONS[q.id] && OPTION_ICONS[q.id][o.value]) || o.icon || q.icon;
  };

  /* The big answer buttons, shared with "Edit" in Settings. */
  C.optionsHTML = function (q, current) {
    return '<div class="opts">' + q.options.map(function (o) {
      var id = 'opt-' + q.id + '-' + String(o.value).replace(/[^A-Za-z0-9_]+/g, '-');
      return '<label class="opt" for="' + id + '">' +
        '<input type="radio" name="answer" id="' + id + '" value="' + esc(o.value) + '"' + (current === o.value ? ' checked' : '') + '>' +
        '<span class="opt-box"><span class="opt-ic">' + C.ic(C.optionIcon(q, o)) + '</span>' +
        '<span class="opt-label">' + esc(o.label) + '</span>' +
        '<span class="opt-check" aria-hidden="true">' + C.ic('check') + '</span></span></label>';
    }).join('') + '</div>';
  };

  function finishQuestions() {
    C.state.answered = true;
    C.save();
    C.go(C.state.ack ? '#/chat' : '#/ack');
  }

  C.views.questions = function (parts) {
    var total = L.questionnaire.length;
    var n = Math.min(Math.max(parseInt(parts[1], 10) || 1, 1), total);
    var q = L.questionnaire[n - 1];
    var current = C.state.profile[q.id];
    var segs = '';
    for (var i = 1; i <= total; i++) segs += '<span class="seg' + (i < n ? ' done' : (i === n ? ' now' : '')) + '"></span>';
    var html =
      '<div class="q-wrap">' +
        '<div class="q-top">' +
          (n > 1 ? '<a class="btn btn-quiet btn-sm" href="#/questions/' + (n - 1) + '">' + C.icd('chevron-left') + '<span>' + esc(C.t('back')) + '</span></a>' : C.brand()) +
          '<span class="q-count">' + esc(C.tf('question_of', { n: n, total: total })) + '</span>' +
        '</div>' +
        '<div class="q-progress" aria-hidden="true">' + segs + '</div>' +
        /* Skipping is visible on the first screen, before the answers. */
        '<div class="q-skiprow">' +
          '<p class="q-optional">' + C.ic('info') + '<span>Every question is optional. You can skip any of them.</span></p>' +
          '<div class="q-skiprow-btns">' +
            '<button type="button" class="link-btn" data-action="q-skip" data-n="' + n + '">Skip this question</button>' +
            '<button type="button" class="link-btn" data-action="q-skip-all">Skip all questions</button>' +
          '</div>' +
        '</div>' +
        '<form id="q-form" class="q-form" novalidate>' +
          '<fieldset class="q-fieldset" aria-describedby="q-help">' +
            '<legend class="q-legend"><span class="badge-ic lg q-badge">' + C.ic(q.icon) + '</span><h1 class="q-title" id="q-title" tabindex="-1">' + esc(q.question) + '</h1></legend>' +
            '<p class="q-help" id="q-help">' + C.ic('info') + '<span>' + esc(q.help) + '</span></p>' +
            C.optionsHTML(q, current) +
          '</fieldset>' +
          '<p class="form-msg" id="q-msg" role="alert"></p>' +
          '<div class="q-actions">' +
            '<button type="submit" class="btn btn-primary btn-block btn-lg">' + (n < total ? '<span>' + esc(C.t('continue')) + '</span>' + C.icd('arrow-right') : C.ic('check') + '<span>' + esc(C.t('done')) + '</span>') + '</button>' +
            '<button type="button" class="btn btn-secondary btn-block" data-action="q-skip" data-n="' + n + '">' + C.icd('chevron-right') + '<span>Skip this question</span></button>' +
            '<button type="button" class="link-btn" data-action="q-skip-all">Skip all questions</button>' +
          '</div>' +
        '</form>' +
        '<p class="q-foot">You can change your answers at any time in Settings.</p>' +
      '</div>';
    return {
      title: C.tf('question_of', { n: n, total: total }),
      bare: true,
      html: html,
      focus: '#q-title',
      after: function () {
        var form = document.getElementById('q-form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var picked = form.querySelector('input[name="answer"]:checked');
          if (!picked) {
            document.getElementById('q-msg').textContent = 'Choose an answer, or skip this question.';
            return;
          }
          C.state.profile[q.id] = picked.value;
          C.save();
          if (n < total) C.go('#/questions/' + (n + 1));
          else finishQuestions();
        });
      },
    };
  };

  C.actions['q-skip'] = function (el) {
    var n = parseInt(el.getAttribute('data-n'), 10);
    var q = L.questionnaire[n - 1];
    if (q) delete C.state.profile[q.id];
    C.save();
    if (n < L.questionnaire.length) C.go('#/questions/' + (n + 1));
    else finishQuestions();
  };
  C.actions['q-skip-all'] = function () { finishQuestions(); };

  /* ------------------------------------------------------------------ */
  /* One-time disclaimer                                                 */
  /* ------------------------------------------------------------------ */

  C.views.ack = function () {
    var html =
      '<div class="ack-wrap">' +
        '<div class="ack-top">' + C.brand() + '</div>' +
        '<div class="card ack-card">' +
          '<span class="badge-ic lg ack-badge">' + C.ic('info') + '</span>' +
          '<h1 class="ack-title">' + esc(C.t('disclaimer_title')) + '</h1>' +
          '<p class="ack-text">' + esc(L.disclaimer) + '</p>' +
          '<button type="button" class="btn btn-primary btn-block btn-lg" data-action="ack">' + C.ic('check') + '<span>' + esc(C.t('understood')) + '</span></button>' +
        '</div>' +
        '<p class="ack-free">' + esc(C.t('free_badge')) + '</p>' +
      '</div>';
    return { title: C.t('disclaimer_title'), bare: true, html: html };
  };
  C.actions.ack = function () {
    C.state.ack = true;
    C.save();
    C.go(C.state.signedIn ? '#/chat' : '#/login');
  };
})();

/* Landit design A, "Paper": Profile and settings, plus the Language,
   Text size and Help now dialogs used from the account menu. */
(function () {
  'use strict';
  var P = window.PAPER, L = P.L, esc = P.esc, icon = P.icon;

  var SHORT = {
    status: 'Visa or status', nation: 'Where you live', work: 'Work', study: 'Study',
    children: 'Children', housing: 'Home', age: 'Age',
  };

  /* ------------------------------------------------------------------ */
  /* Help now: safety numbers for the person's nation. Calm, plain.     */
  /* ------------------------------------------------------------------ */
  P.helpHtml = function () {
    var nation = P.state.profile.nation || 'England';
    var groups = L.safety[nation] || L.safety.England;
    return '<div class="help">' +
      '<p class="help-lead">' + icon('phone', 20) + '<span>' + esc(L.safetyNotes.emergency) + '</span></p>' +
      '<p class="help-note">' + esc(L.safetyNotes.independence) + '</p>' +
      '<p class="help-where">' + icon('map-pin', 16) + '<span>Numbers for ' + esc(nation) + '.' + (P.state.profile.nation ? '' : ' Tell us where you live in Settings to see local numbers.') + '</span></p>' +
      groups.map(function (g, i) {
        return '<details class="help-group"' + (i === 0 ? ' open' : '') + '>' +
          '<summary><span class="help-g-ico" aria-hidden="true">' + icon(g.icon, 20) + '</span><span class="help-g-name">' + esc(g.group) + '</span>' +
            '<span class="help-g-chev" aria-hidden="true">' + icon('chevron-down', 18) + '</span></summary>' +
          '<ul class="help-list">' + g.items.map(function (it) {
            return '<li class="help-item">' +
              '<div class="help-text"><p class="help-label">' + esc(it.label) + '</p>' + (it.note ? '<p class="help-item-note">' + esc(it.note) + '</p>' : '') +
                (it.url ? '<p><a href="' + esc(it.url) + '" target="_blank" rel="noopener" dir="ltr">' + esc(it.url.replace(/^https?:\/\/(www\.)?/, '')) + '</a></p>' : '') + '</div>' +
              (it.tel ? '<a class="btn call" href="tel:' + esc(it.tel) + '" aria-label="Call ' + esc(it.label) + ': ' + esc(it.number) + '">' + icon('phone', 18) + '<span dir="ltr">' + esc(it.number) + '</span></a>'
                : '<p class="help-number">' + esc(it.number) + '</p>') +
            '</li>';
          }).join('') + '</ul></details>';
      }).join('') +
    '</div>';
  };
  P.acts['help-now'] = function (el) {
    var ret = P.menuReturn(el);
    P.openDialog({
      title: '<span class="dlg-title-ico" aria-hidden="true">' + icon('life-buoy', 22) + '</span>' + esc(P.t('nav_help')),
      className: 'dlg-help',
      body: P.helpHtml(),
      returnTo: ret,
    });
  };

  /* ------------------------------------------------------------------ */
  /* Language and text size                                             */
  /* ------------------------------------------------------------------ */
  function langOptions(name) {
    return '<div class="radio-grid" role="radiogroup" aria-label="' + esc(P.t('lang')) + '">' +
      L.i18n.languages.map(function (l) {
        return '<label class="opt"><input type="radio" name="' + name + '" value="' + l.code + '" data-change="set-lang" data-fk="lang-' + l.code + '"' + (P.lang() === l.code ? ' checked' : '') + '>' +
          '<span class="opt-box"><span class="opt-dot" aria-hidden="true"></span><span class="opt-label" lang="' + l.code + '" dir="' + l.dir + '">' + esc(l.name) + '</span></span></label>';
      }).join('') + '</div>' +
      '<p class="d-muted">Menus and buttons change where a translation exists. Details about each benefit stay in English, as on GOV.UK.</p>';
  }
  function textOptions(name) {
    return '<div class="text-grid" role="radiogroup" aria-label="' + esc(P.t('text_size')) + '">' +
      P.textSizes.map(function (s, i) {
        return '<label class="opt text-opt"><input type="radio" name="' + name + '" value="' + s.id + '" data-change="set-text" data-fk="text-' + s.id + '"' + ((P.state.prefs.text || 'normal') === s.id ? ' checked' : '') + '>' +
          '<span class="opt-box"><span class="text-sample s' + i + '" aria-hidden="true">Aa</span><span class="opt-label">' + esc(s.label) + '</span></span></label>';
      }).join('') + '</div>';
  }
  P.acts['lang-dialog'] = function (el) {
    var ret = P.menuReturn(el);
    P.openDialog({ title: esc(P.t('lang_choose')), className: 'dlg-sm', body: langOptions('lang-d'), returnTo: ret });
  };
  P.acts['text-dialog'] = function (el) {
    var ret = P.menuReturn(el);
    P.openDialog({ title: esc(P.t('text_size')), className: 'dlg-sm', body: textOptions('text-d') + '<p class="d-muted">The whole app gets bigger or smaller.</p>', returnTo: ret });
  };
  P.changes['set-lang'] = function (el) {
    var dlg = el.closest('dialog');
    P.state.prefs.lang = el.value;
    P.save();
    P.applyLang();
    P.rebuildShell();
    if (dlg && dlg._close) dlg._close();
    P.refresh();
    P.toast(P.t('lang') + ': ' + P.langName(el.value));
  };
  P.changes['set-text'] = function (el) {
    P.state.prefs.text = el.value;
    P.save();
    P.applyText();
    if (P.renderAccount) P.renderAccount();
  };

  /* ------------------------------------------------------------------ */
  /* Editing an answer                                                  */
  /* ------------------------------------------------------------------ */
  P.editAnswer = function (qid, returnTo) {
    var q = L.questionnaire.filter(function (x) { return x.id === qid; })[0];
    if (!q) return;
    var cur = P.state.profile[qid];
    var many = q.options.length > 6;
    var body = '<form data-form="answer" data-q="' + qid + '" id="answer-form">' +
      '<fieldset class="plain-fieldset"><legend class="sr-only">' + esc(q.question) + '</legend>' +
        '<p class="q-help"><strong>' + esc(P.t('why_we_ask')) + ':</strong> ' + esc(q.help) + '</p>' +
        '<div class="q-options' + (many ? ' two-col' : '') + '">' + q.options.map(function (o) {
          return '<label class="opt"><input type="radio" name="answer" value="' + esc(o.value) + '"' + (cur === o.value ? ' checked data-autofocus' : '') + '>' +
            '<span class="opt-box"><span class="opt-dot" aria-hidden="true"></span><span class="opt-label">' + esc(o.label) + '</span></span></label>';
        }).join('') + '</div></fieldset></form>';
    var dlg = P.openDialog({
      title: esc(q.question),
      className: 'dlg-answer',
      body: body,
      returnTo: returnTo,
      foot: (cur ? '<button type="button" class="btn quiet" data-clear-answer>Clear answer</button>' : '') +
        '<span class="foot-gap"></span><button type="button" class="btn" data-dlg-close>' + esc(P.t('cancel')) + '</button>' +
        '<button type="submit" form="answer-form" class="btn primary">' + esc(P.t('save')) + '</button>',
    });
    var clear = dlg.querySelector('[data-clear-answer]');
    if (clear) clear.addEventListener('click', function () {
      delete P.state.profile[qid];
      P.save();
      dlg._close();
      afterAnswer();
    });
  };
  function afterAnswer() {
    var m = P.match();
    P.toast('Saved. Benefits now shows ' + m.open.length + (m.open.length === 1 ? ' benefit.' : ' benefits.'));
    if (P.parseRoute().name === 'settings') P.refresh();
  }
  P.forms.answer = function (form) {
    var qid = form.getAttribute('data-q');
    var picked = form.querySelector('input[name="answer"]:checked');
    var dlg = form.closest('dialog');
    if (picked) {
      P.state.profile[qid] = picked.value;
      P.save();
    }
    if (dlg && dlg._close) dlg._close();
    if (picked) afterAnswer();
  };
  P.acts['edit-answer'] = function (el) { P.editAnswer(el.getAttribute('data-q'), el); };

  /* ------------------------------------------------------------------ */
  /* The page                                                           */
  /* ------------------------------------------------------------------ */
  function detailRow(key, label, value, type) {
    if (P.ui.editing === key) {
      return '<form class="set-row editing" data-form="edit-detail" data-key="' + key + '">' +
        '<label class="set-k" for="ed-' + key + '">' + esc(label) + '</label>' +
        '<div class="set-edit"><input class="input" id="ed-' + key + '" type="' + type + '" value="' + esc(value || '') + '" autocomplete="' + (key === 'email' ? 'email' : 'given-name') + '">' +
          '<div class="form-actions"><button type="button" class="btn" data-act="edit-cancel">' + esc(P.t('cancel')) + '</button>' +
          '<button type="submit" class="btn primary">' + esc(P.t('save')) + '</button></div></div>' +
      '</form>';
    }
    return '<div class="set-row">' +
      '<p class="set-k">' + esc(label) + '</p>' +
      '<p class="set-v">' + (value ? esc(value) : '<span class="not-answered">Not added</span>') + '</p>' +
      '<button type="button" class="btn sm" data-act="edit-detail" data-key="' + key + '" data-fk="ed-btn-' + key + '">' + icon('pencil', 16) + '<span>' + esc(P.t('edit')) + '</span><span class="sr-only"> ' + esc(label) + '</span></button>' +
    '</div>';
  }

  function answerRows() {
    return L.questionnaire.map(function (q) {
      var v = P.state.profile[q.id];
      var label = v ? L.answerLabel(q.id, v) : null;
      return '<div class="set-row">' +
        '<p class="set-k"><span class="set-k-ico" aria-hidden="true">' + icon(q.icon, 18) + '</span><span>' + esc(SHORT[q.id] || q.question) + '</span></p>' +
        '<p class="set-v">' + (label ? esc(label) : '<span class="not-answered">Not answered</span>') + '</p>' +
        '<button type="button" class="btn sm' + (label ? '' : ' primary-soft') + '" data-act="edit-answer" data-q="' + q.id + '" data-fk="ans-' + q.id + '">' +
          icon(label ? 'pencil' : 'plus', 16) + '<span>' + (label ? esc(P.t('edit')) : 'Add') + '</span><span class="sr-only"> ' + esc(SHORT[q.id] || q.question) + '</span></button>' +
      '</div>';
    }).join('');
  }

  function themePicker() {
    var cur = P.theme();
    return '<div class="theme-grid" role="radiogroup" aria-labelledby="colours-h">' + P.themes.map(function (t) {
      var c = t.colors;
      return '<label class="theme-opt"><input type="radio" name="theme" value="' + t.id + '" data-change="theme" data-fk="theme-' + t.id + '"' + (cur && cur.id === t.id ? ' checked' : '') + '>' +
        '<span class="theme-card">' +
          '<span class="theme-prev" aria-hidden="true" style="background:' + c.bg + ';border-color:' + c.border + '">' +
            '<span class="tp-side" style="background:' + c.surface2 + '"></span>' +
            '<span class="tp-main"><span class="tp-line" style="background:' + c.text + '"></span><span class="tp-line short" style="background:' + c.textMuted + '"></span>' +
            '<span class="tp-card" style="background:' + c.surface + ';border-color:' + c.border + '"><span class="tp-dot" style="background:' + c.accent + '"></span></span></span>' +
          '</span>' +
          '<span class="theme-name">' + esc(t.name) + '</span>' +
          (t.note ? '<span class="theme-note">' + esc(t.note) + '</span>' : '') +
        '</span></label>';
    }).join('') + '</div>';
  }

  P.views.settings = {
    auth: true,
    shell: true,
    render: function (r) {
      var u = P.state.user || {};
      var speechOk = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
      var html = '<div class="page narrow settings">' +
        '<header class="page-head set-head">' +
          '<span class="avatar lg" aria-hidden="true">' + esc(P.initial()) + '</span>' +
          '<div><p class="eyebrow">' + esc(P.t('nav_profile')) + '</p><h1 class="page-title">' + esc(P.t('set_title')) + '</h1>' +
          '<p class="lede">' + esc(P.t('set_sub')) + '</p></div>' +
        '</header>' +
        '<nav class="set-jump" aria-label="On this page">' +
          '<a href="#s-details" data-act="jump">' + esc(P.t('sec_details')) + '</a>' +
          '<a href="#s-answers" data-act="jump">Your answers</a>' +
          '<a href="#s-prefs" data-act="jump">' + esc(P.t('sec_prefs')) + '</a>' +
          '<a href="#s-help" data-act="jump">' + esc(P.t('nav_help')) + '</a>' +
          '<a href="#s-account" data-act="jump">' + esc(P.t('sec_account')) + '</a>' +
        '</nav>' +

        '<section class="set-sec" id="s-details" aria-labelledby="h-details">' +
          '<h2 class="set-h" id="h-details">' + esc(P.t('sec_details')) + '</h2>' +
          '<div class="set-card">' + detailRow('name', 'Name', u.name, 'text') + detailRow('email', P.t('auth_email'), u.email, 'email') + '</div>' +
        '</section>' +

        '<section class="set-sec" id="s-answers" aria-labelledby="h-answers">' +
          '<h2 class="set-h" id="h-answers">Your answers</h2>' +
          '<p class="set-intro">These decide what shows in <a href="#/benefits">' + esc(P.t('nav_benefits')) + '</a>. Change them at any time.</p>' +
          '<div class="set-card">' + answerRows() + '</div>' +
        '</section>' +

        '<section class="set-sec" id="s-prefs" aria-labelledby="h-prefs">' +
          '<h2 class="set-h" id="h-prefs">' + esc(P.t('sec_prefs')) + '</h2>' +
          '<div class="set-card pad">' +
            '<h3 class="set-sub" id="colours-h">' + icon('palette', 18) + '<span>' + esc(P.t('colours')) + '</span></h3>' +
            themePicker() +
            '<h3 class="set-sub" id="size-h">' + icon('a-large-small', 18) + '<span>' + esc(P.t('text_size')) + '</span></h3>' +
            textOptions('text-s') +
            '<h3 class="set-sub" id="lang-h">' + icon('globe', 18) + '<span>' + esc(P.t('lang')) + '</span></h3>' +
            langOptions('lang-s') +
            '<h3 class="set-sub" id="ra-h">' + icon('volume-2', 18) + '<span>' + esc(P.t('read_aloud')) + '</span></h3>' +
            '<label class="switch-row"><span class="switch-text"><span class="switch-title">Show Read aloud buttons</span>' +
              '<span class="switch-sub">' + (speechOk ? 'Landit can read replies and benefit pages out loud.' : 'This browser cannot read aloud, so the buttons stay hidden.') + '</span></span>' +
              '<input type="checkbox" role="switch" class="switch-input" data-change="read-aloud" data-fk="read-aloud"' + (P.state.prefs.readAloud !== false ? ' checked' : '') + (speechOk ? '' : ' disabled') + '>' +
              '<span class="switch" aria-hidden="true"><span class="switch-thumb"></span></span></label>' +
          '</div>' +
        '</section>' +

        '<section class="set-sec" id="s-help" aria-labelledby="h-help">' +
          '<h2 class="set-h" id="h-help">' + esc(P.t('nav_help')) + '</h2>' +
          '<div class="set-card pad">' + P.helpHtml() + '</div>' +
        '</section>' +

        '<section class="set-sec" id="s-account" aria-labelledby="h-account">' +
          '<h2 class="set-h" id="h-account">' + esc(P.t('sec_account')) + '</h2>' +
          '<div class="set-card">' +
            '<div class="set-row"><p class="set-k">' + icon('log-out', 18) + '<span>' + esc(P.t('logout')) + '</span></p><p class="set-v muted">Your answers and tracked applications stay on this device.</p>' +
              '<button type="button" class="btn sm" data-act="sign-out">' + esc(P.t('logout')) + '</button></div>' +
            '<div class="set-row"><p class="set-k">' + icon('trash-2', 18) + '<span>' + esc(P.t('delete_account')) + '</span></p><p class="set-v muted">Removes your account and everything Landit saved on this device.</p>' +
              '<button type="button" class="btn sm danger" data-act="delete-account">' + esc(P.t('delete_account')) + '</button></div>' +
          '</div>' +
        '</section>' +

        '<section class="set-sec" id="s-about" aria-labelledby="h-about">' +
          '<h2 class="set-h" id="h-about">' + esc(P.t('sec_about')) + '</h2>' +
          '<div class="set-card pad about">' +
            '<p><span class="free-label">' + esc(P.t('free_badge')) + '</span></p>' +
            '<p>' + esc(L.rates) + '. List of benefits checked ' + esc(new Date(L.meta.catalogDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })) + '.</p>' +
            '<p class="d-muted">This is a test version. Nothing you type is sent anywhere.</p>' +
          '</div>' +
        '</section>' +
        P.footer() +
      '</div>';
      return {
        nav: 'settings',
        title: P.t('set_title'),
        html: html,
        after: function () {
          if (r.args[0] === 'edit' && r.args[1]) {
            P.replaceHash('#/settings');
            var btn = document.querySelector('[data-act="edit-answer"][data-q="' + r.args[1] + '"]');
            if (btn) { btn.scrollIntoView({ block: 'center' }); P.editAnswer(r.args[1], btn); }
          }
          if (P.ui.editing) {
            var inp = document.getElementById('ed-' + P.ui.editing);
            if (inp) inp.focus();
          }
        },
      };
    },
  };

  P.acts.jump = function (el, e) {
    var id = el.getAttribute('href').slice(1);
    var t = document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: P.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    var h = t.querySelector('h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  };
  P.acts['edit-detail'] = function (el) { P.ui.editing = el.getAttribute('data-key'); P.refresh(); };
  P.acts['edit-cancel'] = function () {
    var k = P.ui.editing;
    P.ui.editing = null;
    P.refresh();
    var b = document.querySelector('[data-fk="ed-btn-' + k + '"]');
    if (b) b.focus();
  };
  P.forms['edit-detail'] = function (form) {
    var k = form.getAttribute('data-key');
    var v = form.querySelector('input').value.trim();
    P.state.user = P.state.user || {};
    P.state.user[k] = v;
    P.save();
    P.ui.editing = null;
    P.refresh();
    P.renderAccount();
    var b = document.querySelector('[data-fk="ed-btn-' + k + '"]');
    if (b) b.focus();
    P.toast(P.t('st_saved'));
  };
  P.changes.theme = function (el) {
    P.state.prefs.theme = el.value;
    P.save();
    P.applyTheme();
  };
  P.changes['read-aloud'] = function (el) {
    P.state.prefs.readAloud = el.checked;
    if (!el.checked) P.stopSpeaking();
    P.save();
  };
  P.acts['delete-account'] = function () {
    P.confirm({
      title: 'Delete your account?',
      text: 'This removes your name, answers, tracked applications, chat and posts from this device. You cannot undo this.',
      yes: P.t('delete_account'),
      danger: true,
      onYes: function () {
        P.stopSpeaking();
        P.resetState();
        P.applyTheme();
        P.applyText();
        P.applyLang();
        P.rebuildShell();
        P.go('#/register');
        P.toast('Your account is deleted');
      },
    });
  };
})();

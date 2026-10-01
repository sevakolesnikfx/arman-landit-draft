/* Landit design C (Big and clear): Settings (the person's details and preferences).
   #/settings                 details, answers, colours, text size,
                              language, read aloud, Help now, account
   #/settings/answer/<qid>    change one answer (same big buttons as the
                              questions); changing it updates Benefits
   #/settings/help            Help now: safety numbers for your nation */
(function () {
  'use strict';
  var C = window.LC;
  var L = C.L;
  var esc = C.esc;

  var SHORT = { status: 'Visa or status', nation: 'Where you live', work: 'Work', study: 'Study', children: 'Children', housing: 'Home', age: 'Age' };
  var TEXT_SIZES = [
    { id: 'normal', label: 'Normal' },
    { id: 'large', label: 'Large' },
    { id: 'xlarge', label: 'Extra large' },
  ];

  function nationItems() {
    var nation = C.state.profile.nation || 'England';
    var items = {};
    (L.safety[nation] || []).forEach(function (g) { g.items.forEach(function (it) { items[it.id] = it; }); });
    return { nation: nation, items: items, groups: L.safety[nation] || [] };
  }

  function detailRow(key, label, value) {
    return '<div class="set-row" id="row-' + key + '">' +
      '<div class="set-row-main"><span class="set-k">' + esc(label) + '</span>' +
      '<span class="set-v' + (value ? '' : ' set-v-none') + '">' + (value ? esc(value).replace('@', '<wbr>@') : 'Not added') + '</span></div>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-action="edit-detail" data-key="' + key + '">' + C.ic('pencil') + '<span>' + esc(C.t('edit')) + '<span class="sr-only"> ' + esc(label) + '</span></span></button>' +
    '</div>';
  }

  C.views.settings = function (parts) {
    if (parts[1] === 'answer') return answerView(parts[2]);
    if (parts[1] === 'help') return helpView();

    var s = C.state;
    var u = s.user || { name: '', email: '' };
    var m = C.match();
    var hn = nationItems();
    var e999 = hn.items['999'];

    var answers = L.questionnaire.map(function (q) {
      var val = s.profile[q.id];
      var label = val ? L.answerLabel(q.id, val) : null;
      return '<li class="set-row">' +
        '<div class="set-row-main"><span class="set-k">' + C.ic(q.icon) + '<span>' + esc(SHORT[q.id] || q.question) + '</span></span>' +
        '<span class="set-v' + (label ? '' : ' set-v-none') + '">' + esc(label || 'Not answered') + '</span></div>' +
        '<a class="btn btn-secondary btn-sm" href="#/settings/answer/' + q.id + '">' + C.ic(label ? 'pencil' : 'plus') + '<span>' + (label ? esc(C.t('edit')) : 'Add') + '<span class="sr-only"> ' + esc(SHORT[q.id]) + '</span></span></a>' +
      '</li>';
    }).join('');

    var themes = C.THEMES.map(function (t) {
      var on = s.prefs.theme === t.id;
      var c = t.colors;
      return '<label class="theme-opt" for="theme-' + t.id + '">' +
        '<input type="radio" name="theme" id="theme-' + t.id + '" value="' + t.id + '"' + (on ? ' checked' : '') + ' data-pref="theme">' +
        '<span class="theme-box">' +
          '<span class="swatch" aria-hidden="true" style="background:' + c.bg + ';border-color:' + c.border + '">' +
            '<span style="background:' + c.surface + ';border-color:' + c.border + '"><i style="background:' + c.accent + '"></i><b style="background:' + c.text + '"></b><b style="background:' + c.textMuted + '"></b></span>' +
          '</span>' +
          '<span class="theme-name">' + esc(t.name) + '</span>' +
          '<span class="theme-note">' + esc(t.note || '') + '</span>' +
          '<span class="opt-check" aria-hidden="true">' + C.ic('check') + '</span>' +
        '</span></label>';
    }).join('');

    var sizes = TEXT_SIZES.map(function (z) {
      return '<label class="size-opt" for="size-' + z.id + '">' +
        '<input type="radio" name="text" id="size-' + z.id + '" value="' + z.id + '"' + (s.prefs.text === z.id ? ' checked' : '') + ' data-pref="text">' +
        '<span class="size-box"><span class="size-aa size-' + z.id + '" aria-hidden="true">Aa</span><span>' + esc(z.label) + '</span><span class="opt-check" aria-hidden="true">' + C.ic('check') + '</span></span></label>';
    }).join('');

    var langs = L.i18n.languages.map(function (l) {
      return '<label class="lang-opt" for="lang-' + l.code + '">' +
        '<input type="radio" name="lang" id="lang-' + l.code + '" value="' + l.code + '"' + (C.lang() === l.code ? ' checked' : '') + ' data-pref="lang">' +
        '<span class="lang-box"><span lang="' + l.code + '" dir="' + l.dir + '">' + esc(l.name) + '</span><span class="opt-check" aria-hidden="true">' + C.ic('check') + '</span></span></label>';
    }).join('');

    var readOn = s.prefs.readAloud;
    var html =
      '<div class="page">' +
        '<header class="page-head prof-head">' +
          '<span class="avatar xl" aria-hidden="true">' + (u.name ? esc(u.name.charAt(0).toUpperCase()) : C.ic('user')) + '</span>' +
          '<div><h1 class="page-title">' + esc(C.t('set_title')) + '</h1><p class="lead">' + esc(C.t('set_sub')) + '</p></div>' +
        '</header>' +

        '<section class="card set-sec" aria-labelledby="s-details"><h2 class="set-h" id="s-details">' + C.ic('user') + '<span>' + esc(C.t('sec_details')) + '</span></h2>' +
          '<div id="details-rows">' + detailRow('name', 'Name', u.name) + detailRow('email', C.t('auth_email'), u.email) + '</div>' +
        '</section>' +

        '<section class="card set-sec" aria-labelledby="s-answers"><h2 class="set-h" id="s-answers">' + C.ic('list-checks') + '<span>Your answers</span></h2>' +
          '<p class="sec-sub">These decide which benefits Landit shows you. Right now: ' + esc(C.plural(m.open.length, 'benefit', 'benefits')) + '.</p>' +
          '<ul class="set-list">' + answers + '</ul>' +
        '</section>' +

        '<section class="card set-sec" aria-labelledby="s-colours"><h2 class="set-h" id="s-colours">' + C.ic('palette') + '<span>' + esc(C.t('colours')) + '</span></h2>' +
          '<div class="theme-grid" role="radiogroup" aria-labelledby="s-colours">' + themes + '</div>' +
        '</section>' +

        '<section class="card set-sec" aria-labelledby="s-size"><h2 class="set-h" id="s-size">' + C.ic('a-large-small') + '<span>' + esc(C.t('text_size')) + '</span></h2>' +
          '<div class="size-grid" role="radiogroup" aria-labelledby="s-size">' + sizes + '</div>' +
        '</section>' +

        '<section class="card set-sec" aria-labelledby="s-lang"><h2 class="set-h" id="s-lang">' + C.ic('languages') + '<span>' + esc(C.t('lang')) + '</span></h2>' +
          '<p class="sec-sub">Menus and buttons change. Benefit names and details stay in English for now.</p>' +
          '<div class="lang-grid" role="radiogroup" aria-labelledby="s-lang">' + langs + '</div>' +
        '</section>' +

        (C.speech.supported ? '<section class="card set-sec" aria-labelledby="s-read"><h2 class="set-h" id="s-read">' + C.ic('volume-2') + '<span>' + esc(C.t('read_aloud')) + '</span></h2>' +
          '<div class="switch-row"><p id="read-desc">Shows a Read aloud button on answers and benefit pages. Your device reads the words out loud.</p>' +
          '<button type="button" class="switch" role="switch" aria-checked="' + readOn + '" aria-labelledby="s-read" aria-describedby="read-desc" data-action="toggle-read">' +
            '<span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span><span class="switch-label" aria-hidden="true">' + (readOn ? 'On' : 'Off') + '</span></button></div>' +
        '</section>' : '') +

        '<section class="card set-sec help-sec" aria-labelledby="s-help"><h2 class="set-h" id="s-help">' + C.ic('life-buoy') + '<span>' + esc(C.t('nav_help')) + '</span></h2>' +
          '<p>' + esc(L.safetyNotes.emergency) + '</p>' +
          '<div class="d-row-btns">' +
            (e999 && e999.tel ? '<a class="btn btn-secondary" href="tel:' + esc(e999.tel) + '">' + C.ic('phone') + '<span>Call ' + esc(e999.number) + '</span></a>' : '') +
            '<a class="btn btn-primary" href="#/settings/help">' + C.ic('list') + '<span>' + esc(C.lang() === 'en' ? 'All safety numbers' : C.t('safety_nums')) + '</span></a>' +
          '</div>' +
        '</section>' +

        '<section class="card set-sec" aria-labelledby="s-account"><h2 class="set-h" id="s-account">' + C.ic('lock') + '<span>' + esc(C.t('sec_account')) + '</span></h2>' +
          '<div class="acct-btns">' +
            '<button type="button" class="btn btn-secondary btn-lg" data-action="sign-out">' + C.ic('log-out', 'flip') + '<span>' + esc(C.t('logout')) + '</span></button>' +
            '<button type="button" class="btn btn-danger btn-lg" data-action="delete-account">' + C.ic('trash-2') + '<span>' + esc(C.t('delete_account')) + '</span></button>' +
          '</div>' +
        '</section>' +

        '<section class="about-sec" aria-labelledby="s-about"><h2 class="set-h" id="s-about">' + C.ic('info') + '<span>' + esc(C.t('sec_about')) + '</span></h2>' +
          '<p class="free-label">' + C.ic('heart') + '<span>' + esc(C.t('free_badge')) + '</span></p>' +
          '<p>' + esc(L.tagline) + ' ' + esc(L.supportLine) + '</p>' +
          '<p class="disclaimer">' + esc(L.disclaimer) + '</p>' +
          '<p class="rates-line">' + esc(L.rates) + '</p>' +
        '</section>' +
      '</div>';

    return { title: C.t('set_title'), nav: 'settings', html: html };
  };

  /* Changing a preference applies at once and keeps focus on the choice. */
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    var pref = el.getAttribute('data-pref');
    if (!pref) return;
    C.state.prefs[pref] = el.value;
    C.save();
    C.applyPrefs();
    if (pref === 'lang') {
      C.render({ keepScroll: true, noFocus: true });
      var again = document.getElementById(el.id);
      if (again) again.focus();
    }
    var msg = { theme: 'Colours changed', text: 'Text size changed', lang: 'Language changed' }[pref];
    if (msg) C.toast(msg);
  });

  C.actions['toggle-read'] = function (el) {
    C.state.prefs.readAloud = !C.state.prefs.readAloud;
    C.save();
    C.applyPrefs();
    el.setAttribute('aria-checked', String(C.state.prefs.readAloud));
    el.querySelector('.switch-label').textContent = C.state.prefs.readAloud ? 'On' : 'Off';
  };

  /* Inline edit for name and email. */
  C.actions['edit-detail'] = function (el) {
    var key = el.getAttribute('data-key');
    var row = document.getElementById('row-' + key);
    var u = C.state.user || { name: '', email: '' };
    var label = key === 'name' ? 'Name' : C.t('auth_email');
    row.outerHTML = '<form class="set-row set-edit" id="row-' + key + '" novalidate>' +
      '<div class="field"><label class="field-label" for="edit-' + key + '">' + esc(label) + '</label>' +
      '<input class="input" id="edit-' + key + '" type="' + (key === 'email' ? 'email' : 'text') + '" value="' + esc(u[key] || '') + '"' + (key === 'email' ? ' dir="ltr"' : '') + '></div>' +
      '<div class="set-edit-btns"><button type="submit" class="btn btn-primary btn-sm">' + C.ic('check') + '<span>' + esc(C.t('save')) + '</span></button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-action="cancel-detail" data-key="' + key + '">' + esc(C.t('cancel')) + '</button></div></form>';
    var form = document.getElementById('row-' + key);
    var input = document.getElementById('edit-' + key);
    input.focus();
    input.select();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      C.state.user = C.state.user || { name: '', email: '' };
      C.state.user[key] = input.value.trim();
      C.save();
      C.render({ keepScroll: true, noFocus: true });
      var b = document.querySelector('[data-action="edit-detail"][data-key="' + key + '"]');
      if (b) b.focus();
      C.toast(C.t('st_saved'));
    });
  };
  C.actions['cancel-detail'] = function (el) {
    var key = el.getAttribute('data-key');
    C.render({ keepScroll: true, noFocus: true });
    var b = document.querySelector('[data-action="edit-detail"][data-key="' + key + '"]');
    if (b) b.focus();
  };

  C.actions['sign-out'] = function () {
    C.state.signedIn = false;
    C.save();
    C.toast('You are signed out');
    C.go('#/login');
  };

  C.actions['delete-account'] = function () {
    C.dialog({
      title: 'Delete your account?',
      html:
        '<p>This clears everything Landit saved in this browser: your details, answers, tracked applications, posts, ratings and settings.</p>' +
        '<p>You cannot undo this.</p>' +
        '<div class="dlg-actions">' +
          '<button type="button" class="btn btn-danger btn-lg" data-confirm-delete>' + C.ic('trash-2') + '<span>Yes, delete my account</span></button>' +
          '<button type="button" class="btn btn-secondary btn-lg" data-dlg-close autofocus>' + esc(C.t('cancel')) + '</button>' +
        '</div>',
      onOpen: function (dlg, close) {
        dlg.querySelector('[data-confirm-delete]').addEventListener('click', function () {
          close();
          C.speech.stop();
          C.resetAll();
          C.applyPrefs();
          C.go('#/register');
          C.toast('Your account is deleted');
        });
      },
    });
  };

  /* ------------------------------------------------------------------ */
  /* Change one answer                                                   */
  /* ------------------------------------------------------------------ */

  function answerView(qid) {
    var q = L.questionnaire.filter(function (x) { return x.id === qid; })[0];
    if (!q) return { redirect: '#/settings' };
    var current = C.state.profile[q.id];
    var html =
      '<div class="page page-narrow">' +
        '<a class="back-link" href="#/settings">' + C.icd('chevron-left') + '<span>Back to Settings</span></a>' +
        '<form id="ans-form" class="q-form" novalidate>' +
          '<fieldset class="q-fieldset" aria-describedby="q-help">' +
            '<legend class="q-legend"><span class="badge-ic lg q-badge">' + C.ic(q.icon) + '</span><h1 class="q-title" id="q-title" tabindex="-1">' + esc(q.question) + '</h1></legend>' +
            '<p class="q-help" id="q-help">' + C.ic('info') + '<span>' + esc(q.help) + '</span></p>' +
            C.optionsHTML(q, current) +
          '</fieldset>' +
          '<p class="form-msg" role="alert"></p>' +
          '<div class="q-actions">' +
            '<button type="submit" class="btn btn-primary btn-block btn-lg">' + C.ic('check') + '<span>' + esc(C.t('save')) + '</span></button>' +
            '<a class="btn btn-secondary btn-block" href="#/settings">' + esc(C.t('cancel')) + '</a>' +
            (current ? '<button type="button" class="link-btn" data-action="clear-answer" data-q="' + q.id + '">Remove my answer</button>' : '') +
          '</div>' +
        '</form>' +
        C.footer() +
      '</div>';
    return {
      title: SHORT[q.id] || q.question,
      nav: 'settings',
      html: html,
      focus: '#q-title',
      after: function () {
        var form = document.getElementById('ans-form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var picked = form.querySelector('input[name="answer"]:checked');
          if (!picked) { form.querySelector('.form-msg').textContent = 'Choose an answer first.'; return; }
          var before = C.match().open.length;
          C.state.profile[q.id] = picked.value;
          C.save();
          var after = C.match().open.length;
          C.go('#/settings');
          C.toast(after !== before ? 'Saved. You may now be able to get ' + C.plural(after, 'benefit', 'benefits') + '.' : C.t('st_saved'));
        });
      },
    };
  }
  C.actions['clear-answer'] = function (el) {
    delete C.state.profile[el.getAttribute('data-q')];
    C.save();
    C.go('#/settings');
    C.toast('Answer removed. You may now be able to get ' + C.plural(C.match().open.length, 'benefit', 'benefits') + '.');
  };

  /* ------------------------------------------------------------------ */
  /* Help now                                                            */
  /* ------------------------------------------------------------------ */

  function helpView() {
    var hn = nationItems();
    var assumed = !C.state.profile.nation;
    var groups = hn.groups.map(function (g) {
      return '<section class="card help-group" aria-labelledby="hg-' + g.key + '">' +
        '<h2 class="set-h" id="hg-' + g.key + '">' + C.ic(g.icon) + '<span>' + esc(g.group) + '</span></h2>' +
        '<ul class="help-items">' + g.items.map(function (it) {
          return '<li class="help-item">' +
            '<div class="help-main"><span class="help-label">' + esc(it.label) + '</span>' +
            '<span class="help-num" dir="auto">' + esc(it.number) + '</span>' +
            (it.note ? '<span class="help-note">' + esc(it.note) + '</span>' : '') + '</div>' +
            '<div class="help-btns">' +
              (it.tel ? '<a class="btn btn-secondary btn-sm" href="tel:' + esc(it.tel) + '">' + C.ic('phone') + '<span>Call<span class="sr-only"> ' + esc(it.label) + '</span></span></a>' : '') +
              (it.url ? '<a class="btn btn-quiet btn-sm" href="' + esc(it.url) + '" target="_blank" rel="noopener">' + C.ic('external-link') + '<span>Website<span class="sr-only"> for ' + esc(it.label) + '</span></span></a>' : '') +
            '</div></li>';
        }).join('') + '</ul></section>';
    }).join('');
    var html =
      '<div class="page">' +
        '<a class="back-link" href="#/settings">' + C.icd('chevron-left') + '<span>Back to Settings</span></a>' +
        '<header class="page-head"><h1 class="page-title">' + C.ic('life-buoy', 'title-ic') + '<span>' + esc(C.t('nav_help')) + '</span></h1>' +
          '<p class="lead">Useful numbers for ' + esc(hn.nation) + '.' + (assumed ? ' Tell us where you live in Settings to see your own.' : '') + '</p></header>' +
        '<div class="note-card help-calm">' + C.ic('phone') + '<div><p><strong>' + esc(L.safetyNotes.emergency) + '</strong></p><p>' + esc(L.safetyNotes.independence) + '</p></div></div>' +
        groups +
        C.footer() +
      '</div>';
    return { title: C.t('nav_help'), nav: 'settings', html: html };
  }
})();

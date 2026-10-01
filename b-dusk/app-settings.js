/* Landit, design B (Dusk): Profile and settings.
   Saved details (each editable; changes re-run the matcher), colours, text
   size, language, read aloud, Help now numbers, sign out, delete account. */
(function () {
  'use strict';
  var D = window.DUSK, L = D.L;
  var esc = D.esc;

  var SHORT = { status: 'Visa or status', nation: 'Where you live', work: 'Work', study: 'Study', children: 'Children', housing: 'Home', age: 'Age' };
  D.ui.st = D.ui.st || { editing: null, account: false };

  /* ------------------------------------------------------------------ */
  /* Sections                                                            */
  /* ------------------------------------------------------------------ */

  function account() {
    var u = D.state.user || { name: '', email: '' };
    var editing = D.ui.st.account;
    var body = editing
      ? '<form class="acct-form" id="acct-form">' +
        '<div class="field"><label class="field-label" for="acct-name">Your name</label><input class="input" id="acct-name" type="text" value="' + esc(u.name) + '" autocomplete="given-name" dir="auto"></div>' +
        '<div class="field"><label class="field-label" for="acct-email">' + esc(D.t('auth_email')) + '</label><input class="input" id="acct-email" type="email" value="' + esc(u.email) + '" autocomplete="email" dir="ltr"></div>' +
        '<div class="row-actions"><button type="submit" class="btn btn-primary btn-sm">' + esc(D.t('save')) + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="acct-cancel">' + esc(D.t('cancel')) + '</button></div></form>'
      : '';
    return '<section class="card st-sec" id="st-account" aria-labelledby="sec-account">' +
      '<h2 class="sec-h" id="sec-account">' + esc(D.t('sec_account')) + '</h2>' +
      '<div class="acct"><span class="avatar xl" aria-hidden="true">' + D.avatarInner(u.name || u.email, 26) + '</span>' +
      '<div class="acct-text"><p class="acct-name" dir="auto">' + esc(u.name || 'No name added') + '</p><p class="acct-mail" dir="ltr">' + esc(u.email || 'No email added') + '</p></div>' +
      (editing ? '' : '<button type="button" class="btn btn-secondary btn-sm" id="acct-edit" data-action="acct-edit">' + D.icon('pencil', { size: 16 }) + '<span>' + esc(D.t('edit')) + '<span class="sr-only"> name and email</span></span></button>') +
      '</div>' + body + '</section>';
  }

  function detailRow(qq) {
    var p = D.state.profile || {};
    var val = p[qq.id];
    var label = val !== undefined ? L.answerLabel(qq.id, val) : null;
    var editing = D.ui.st.editing === qq.id;
    var editId = 'dedit-' + qq.id;
    var editor = '';
    if (editing) {
      editor = '<form class="drow-edit" id="' + editId + '" data-q="' + qq.id + '">' +
        '<fieldset><legend class="drow-q">' + esc(qq.question) + '</legend><p class="drow-help">' + esc(qq.help) + '</p>' +
        '<div class="q-opts">' + qq.options.map(function (o) {
          var id = 'st-' + qq.id + '-' + o.value;
          return '<label class="opt" for="' + id + '"><input type="radio" name="st-' + qq.id + '" id="' + id + '" value="' + esc(o.value) + '"' + (val === o.value ? ' checked' : '') + '>' +
            '<span class="opt-box">' + D.icon('check', { size: 16, className: 'opt-check' }) + '<span>' + esc(o.label) + '</span></span></label>';
        }).join('') + '</div></fieldset>' +
        '<div class="row-actions"><button type="submit" class="btn btn-primary btn-sm" id="dsave-' + qq.id + '">' + esc(D.t('save')) + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="d-cancel">' + esc(D.t('cancel')) + '</button>' +
        (val !== undefined ? '<button type="button" class="btn btn-ghost btn-sm" data-action="d-clear" data-q="' + qq.id + '">' + esc('Clear answer') + '</button>' : '') +
        '</div></form>';
    }
    return '<li class="drow' + (editing ? ' is-editing' : '') + '" id="drow-' + qq.id + '">' +
      '<div class="drow-top"><span class="drow-ico" aria-hidden="true">' + D.icon(qq.icon, { size: 20 }) + '</span>' +
      '<div class="drow-main"><p class="drow-label">' + esc(SHORT[qq.id] || qq.question) + '</p>' +
      '<p class="drow-val' + (label ? '' : ' is-empty') + '">' + esc(label || 'Not answered') + '</p></div>' +
      (editing ? '' : '<button type="button" class="btn btn-secondary btn-sm" id="dbtn-' + qq.id + '" data-action="d-edit" data-q="' + qq.id + '">' +
        D.icon(label ? 'pencil' : 'plus', { size: 16 }) + '<span>' + esc(label ? D.t('edit') : 'Add') + '<span class="sr-only">: ' + esc(SHORT[qq.id]) + '</span></span></button>') +
      '</div>' + editor + '</li>';
  }

  function resultLine() {
    var m = D.match();
    return '<p class="st-result" id="st-result" aria-live="polite">' + D.icon('pound-sterling', { size: 18 }) +
      '<span>With these answers, you may be able to claim <strong class="num">' + m.open.length + '</strong> schemes and services.</span>' +
      '<a href="#/benefits" class="st-result-link">' + esc('See ' + D.t('nav_benefits')) + D.dicon('chevron-right', { size: 16 }) + '</a></p>';
  }

  function details() {
    return '<section class="card st-sec" id="st-details" aria-labelledby="sec-details">' +
      '<div class="sec-head"><h2 class="sec-h" id="sec-details">' + esc(D.t('sec_details')) + '</h2>' +
      '<p class="card-sub">Your answers decide which benefits Landit shows you. You can change them at any time.</p></div>' +
      '<ul class="drows" id="drows" role="list">' + L.questionnaire.map(detailRow).join('') + '</ul>' +
      resultLine() + '</section>';
  }

  function themeCard(t) {
    var c = t.colors, on = D.theme().id === t.id;
    return '<label class="theme-card' + (on ? ' is-on' : '') + '" for="theme-' + t.id + '"><input type="radio" name="st-theme" id="theme-' + t.id + '" value="' + t.id + '" data-action="st-theme"' + (on ? ' checked' : '') + '>' +
      '<span class="theme-prev" aria-hidden="true" style="background:' + c.bg + ';border-color:' + c.border + '">' +
      '<span class="tp-side" style="background:' + (c.sidebar || c.bg) + '"></span>' +
      '<span class="tp-main"><span class="tp-line" style="background:' + c.text + '"></span><span class="tp-line short" style="background:' + c.textMuted + '"></span>' +
      '<span class="tp-card" style="background:' + c.surface + ';border-color:' + c.border + '"><span class="tp-dot" style="background:' + c.accent + '"></span></span></span></span>' +
      '<span class="theme-name">' + esc(t.name) + (on ? D.icon('circle-check', { size: 18, className: 'theme-check' }) : '') + '</span>' +
      '<span class="theme-kind">' + (t.dark ? 'Dark' : 'Light') + '</span></label>';
  }

  function prefs() {
    var sizes = D.textSizes.map(function (s) {
      var on = (D.state.prefs.text || 'normal') === s.id;
      return '<label class="seg-opt" for="ts-' + s.id + '"><input type="radio" name="st-text" id="ts-' + s.id + '" value="' + s.id + '" data-action="st-text"' + (on ? ' checked' : '') + '>' +
        '<span class="seg-box"><span class="text-sample text-sample-' + s.id + '" aria-hidden="true">Aa</span><span>' + esc(s.label) + '</span></span></label>';
    }).join('');
    var ra = D.state.prefs.readAloud !== false;
    return '<section class="card st-sec" id="st-prefs" aria-labelledby="sec-prefs">' +
      '<h2 class="sec-h" id="sec-prefs">' + esc(D.t('sec_prefs')) + '</h2>' +
      '<div class="pref"><h3 class="pref-h" id="pref-theme-h">' + D.icon('palette', { size: 18 }) + '<span>' + esc(D.t('colours')) + '</span></h3>' +
      '<p class="card-sub">Pick the colours that are easiest on your eyes.</p>' +
      '<div class="theme-grid" role="radiogroup" aria-labelledby="pref-theme-h">' + D.themes.map(themeCard).join('') + '</div></div>' +
      '<div class="pref"><h3 class="pref-h" id="pref-text-h">' + D.icon('a-large-small', { size: 18 }) + '<span>' + esc(D.t('text_size')) + '</span></h3>' +
      '<div class="seg seg-3" role="radiogroup" aria-labelledby="pref-text-h">' + sizes + '</div></div>' +
      '<div class="pref"><h3 class="pref-h"><label for="st-lang">' + D.icon('globe', { size: 18 }) + '<span>' + esc(D.t('lang')) + '</span></label></h3>' +
      '<span class="select-wrap select-wide"><select class="select" id="st-lang" data-action="st-lang">' +
      L.i18n.languages.map(function (l) { return '<option value="' + l.code + '"' + (l.code === D.lang() ? ' selected' : '') + '>' + esc(l.name) + '</option>'; }).join('') +
      '</select>' + D.icon('chevron-down', { size: 18, className: 'select-chev' }) + '</span>' +
      '<p class="card-sub">Menus change language. Scheme names, scheme details and chat replies stay in English for now.</p></div>' +
      '<div class="pref pref-row"><div><h3 class="pref-h" id="ra-h" data-action="st-read-label">' + D.icon('volume-2', { size: 18 }) + '<span>' + esc(D.t('read_aloud')) + '</span></h3>' +
      '<p class="card-sub" id="ra-sub">' + esc(D.speechOk ? 'Shows a button to hear chat answers and benefit details.' : 'This browser cannot read aloud, so the button stays hidden.') + '</p></div>' +
      '<button type="button" role="switch" class="switch" id="ra-switch" data-action="st-read" aria-checked="' + (ra && D.speechOk) + '" aria-labelledby="ra-h" aria-describedby="ra-sub"' + (D.speechOk ? '' : ' disabled') + '><span class="switch-knob" aria-hidden="true"></span></button></div>' +
      '</section>';
  }

  function safety() {
    return '<section class="card st-sec" id="st-safety" aria-labelledby="sec-safety">' +
      '<h2 class="sec-h sec-h-ico" id="sec-safety">' + D.icon('life-buoy', { size: 20 }) + '<span>' + esc(D.t('nav_help')) + '</span></h2>' +
      '<p class="card-sub">' + esc(D.t('safety_nums')) + '. The list follows where you live.</p>' +
      D.safetyHTML('st') + '</section>';
  }

  function privacy() {
    return '<section class="card st-sec" id="st-privacy" aria-labelledby="sec-privacy">' +
      '<h2 class="sec-h" id="sec-privacy">' + esc(D.t('sec_privacy')) + '</h2>' +
      '<p class="st-text">In this prototype, your answers, tracked applications, chat and posts are saved in this browser only. Nothing is sent anywhere.</p>' +
      '<div class="row-actions">' +
      '<button type="button" class="btn btn-secondary" id="st-logout" data-action="st-logout">' + D.icon('log-out', { size: 18 }) + '<span>' + esc(D.t('logout')) + '</span></button>' +
      '<button type="button" class="btn btn-secondary btn-quiet-danger" id="st-delete" data-action="st-delete">' + D.icon('trash-2', { size: 18 }) + '<span>' + esc(D.t('delete_account')) + '</span></button>' +
      '</div></section>';
  }

  function about() {
    return '<section class="card st-sec" id="st-about" aria-labelledby="sec-about">' +
      '<h2 class="sec-h" id="sec-about">' + esc(D.t('sec_about')) + '</h2>' +
      '<p class="about-brand">' + D.mark(28) + '<span><strong>Landit.</strong> ' + esc(L.tagline) + '</span></p>' +
      '<p class="st-text">' + esc(L.supportLine) + '</p>' +
      '<p><span class="free-label">' + esc(D.t('free_badge')) + '</span></p>' +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* Page                                                                */
  /* ------------------------------------------------------------------ */

  D.pages.settings = function (r) {
    D.setTitle(D.t('set_title'), 'settings');
    if (r.arg === 'status') D.ui.st.editing = 'status';
    var main = document.getElementById('main');
    main.innerHTML = '<div class="st-page"><div class="st-inner">' +
      '<p class="st-lead">' + esc(D.t('set_sub')) + '</p>' +
      account() + details() + prefs() + safety() + privacy() + about() +
      D.footer() + '</div></div>';
    if (r.arg === 'status' || r.arg === 'help') {
      var target = r.arg === 'status' ? document.getElementById('drow-status') : document.getElementById('st-safety');
      if (target) {
        setTimeout(function () {
          target.scrollIntoView({ block: 'start' });
          var f = r.arg === 'status' ? target.querySelector('input[type="radio"]') : target.querySelector('h2');
          if (f) { if (f.tagName === 'H2') f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
        }, 0);
        return true;
      }
    }
    return false;
  };

  function refreshDetails(focusSel) {
    var sec = document.getElementById('st-details');
    if (!sec) return;
    var w = document.createElement('div');
    w.innerHTML = details();
    sec.replaceWith(w.firstChild);
    if (focusSel) { var f = document.querySelector(focusSel); if (f) f.focus(); }
  }
  function refreshAccount(focusSel) {
    var sec = document.getElementById('st-account');
    if (!sec) return;
    var w = document.createElement('div');
    w.innerHTML = account();
    sec.replaceWith(w.firstChild);
    if (focusSel) { var f = document.querySelector(focusSel); if (f) f.focus(); }
  }
  function refreshPrefs(focusSel) {
    var sec = document.getElementById('st-prefs');
    if (!sec) return;
    var w = document.createElement('div');
    w.innerHTML = prefs();
    sec.replaceWith(w.firstChild);
    if (focusSel) { var f = document.querySelector(focusSel); if (f) f.focus(); }
  }

  function saveAnswer(qid, value) {
    var p = D.state.profile || {};
    if (value === null) delete p[qid]; else p[qid] = value;
    D.state.profile = p;
    D._match = null;
    D.save();
    D.ui.st.editing = null;
    refreshDetails('#dbtn-' + qid);
    var m = D.match();
    D.toast('Saved. Benefits now shows ' + m.open.length + ' schemes.');
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var ed = t.closest('[data-action="d-edit"]');
    if (ed) {
      D.ui.st.editing = ed.getAttribute('data-q');
      refreshDetails();
      var first = document.querySelector('#dedit-' + D.ui.st.editing + ' input:checked') || document.querySelector('#dedit-' + D.ui.st.editing + ' input');
      if (first) first.focus();
      return;
    }
    if (t.closest('[data-action="d-cancel"]')) {
      var was = D.ui.st.editing;
      D.ui.st.editing = null;
      refreshDetails('#dbtn-' + was);
      return;
    }
    var cl = t.closest('[data-action="d-clear"]');
    if (cl) { saveAnswer(cl.getAttribute('data-q'), null); return; }
    if (t.closest('[data-action="acct-edit"]')) { D.ui.st.account = true; refreshAccount('#acct-name'); return; }
    if (t.closest('[data-action="acct-cancel"]')) { D.ui.st.account = false; refreshAccount('#acct-edit'); return; }
    /* The visible heading toggles the switch too (a bigger target). */
    if (t.closest('[data-action="st-read-label"]')) { var sw = document.getElementById('ra-switch'); if (sw && !sw.disabled) { sw.click(); sw.focus(); } return; }
    var rs = t.closest('[data-action="st-read"]');
    if (rs) {
      var on = rs.getAttribute('aria-checked') !== 'true';
      D.state.prefs.readAloud = on;
      D.save();
      rs.setAttribute('aria-checked', String(on));
      if (!on) D.stopReading();
      D.toast(on ? 'Read aloud is on' : 'Read aloud is off');
      return;
    }
    if (t.closest('[data-action="st-logout"]')) { D.signOut(); return; }
    if (t.closest('[data-action="st-delete"]')) {
      D.confirm({
        title: 'Delete your account?',
        text: 'This removes your name, answers, tracked applications, chat, posts and ratings from this browser. You cannot undo this.',
        yes: D.t('delete_account'),
        onYes: function () {
          D.stopReading();
          D.clearAll(true);
          D.applyPrefs();
          D.unmountShell();
          location.hash = '#/register';
          setTimeout(function () { D.toast('Your account is deleted'); }, 50);
        },
      });
    }
  });

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f) return;
    if (f.classList && f.classList.contains('drow-edit')) {
      e.preventDefault();
      var qid = f.getAttribute('data-q');
      var c = f.querySelector('input:checked');
      if (!c) { var first = f.querySelector('input'); if (first) first.focus(); return; }
      saveAnswer(qid, c.value);
      return;
    }
    if (f.id === 'acct-form') {
      e.preventDefault();
      var name = f.querySelector('#acct-name').value.trim();
      var email = f.querySelector('#acct-email').value.trim();
      D.state.user = { name: name, email: email };
      D.save();
      D.ui.st.account = false;
      refreshAccount('#acct-edit');
      D.renderAvatar();
      D.toast(D.t('st_saved'));
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || !t.matches) return;
    if (t.matches('[data-action="st-theme"]')) {
      D.setTheme(t.value);
      refreshPrefs('#theme-' + t.value);
      return;
    }
    if (t.matches('[data-action="st-text"]')) {
      D.setText(t.value);
      refreshPrefs('#ts-' + t.value);
      return;
    }
    if (t.matches('[data-action="st-lang"]')) {
      D.setLang(t.value);
      var again = document.getElementById('st-lang');
      if (again) again.focus();
    }
  });

})();

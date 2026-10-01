/* Landit design C (Big and clear): Benefits.
   #/benefits             header with the status in words and the potential
                          total, the "Not on your visa" list, then big
                          category tiles (the filter)
   #/benefits/all         every benefit, one row each
   #/benefits/<category>  one category
   #/benefit/<id>         step by step: summary, what you need, steps,
                          apply, claim status, what people said
   No wall of text: each row shows only the icon, name, a short line, the
   value with its qualifier, and effort as three dots plus words. Empty
   values are not repeated row after row: a quiet line says what is
   missing, and sorted lists put the rows without that value in their own
   labelled group at the end. */
(function () {
  'use strict';
  var C = window.LC;
  var L = C.L;
  var esc = C.esc;

  /* ------------------------------------------------------------------ */
  /* Sorting                                                             */
  /* ------------------------------------------------------------------ */

  var SORTS = [
    { key: 'value', label: 'Most money', icon: 'wallet', note: 'Most money first.',
      rest: 'No single amount to compare', known: function (b) { return typeof b.value === 'number'; } },
    { key: 'time', label: 'Quickest', icon: 'clock', note: 'Quickest to apply first.',
      rest: 'No time listed yet', known: function (b) { return typeof b.timeMinutes === 'number'; } },
    { key: 'easy', label: 'Easiest', icon: 'list-checks', note: 'Fewest documents first.',
      rest: 'No document list yet', known: function (b) { return !!b.docsKnown; } },
  ];
  var AZ = { key: 'az', label: 'A to Z', note: 'In order of name, A to Z.' };

  var EFFORT_RANK = { low: 1, medium: 2, high: 3 };
  function sortList(list, key) {
    if (key === 'easy') {
      return list.slice().sort(function (a, b) {
        var da = a.docsKnown ? C.docsNeeded(a).length : null, db = b.docsKnown ? C.docsNeeded(b).length : null;
        if (da === null && db !== null) return 1;
        if (db === null && da !== null) return -1;
        if (da !== db) return da - db;
        var ea = EFFORT_RANK[a.effort] || 9, eb = EFFORT_RANK[b.effort] || 9;
        if (ea !== eb) return ea - eb;
        return a.entry - b.entry;
      });
    }
    return L.sortBenefits(list, key);
  }
  function sortInfo(key) {
    return SORTS.filter(function (s) { return s.key === key; })[0] || AZ;
  }

  /* ------------------------------------------------------------------ */
  /* Pieces                                                              */
  /* ------------------------------------------------------------------ */

  /* One benefit row. The name is the link and it stretches over the whole
     row, so a tap anywhere opens the benefit, while Track and Share stay
     separate buttons. */
  function rowHTML(b, showCat) {
    var href = '#/benefit/' + encodeURIComponent(b.id);
    var v = L.valueParts(b);
    var hasVal = !!(v.amount || v.label);
    var hasEffort = C.hasEffort(b);
    var tags = (showCat ? C.catChip(b.category) : '') + C.fitTag(b.id);
    var val = hasVal ? C.valueHTML(b, 'val b-val')
      : (hasEffort ? '<span class="b-val b-quiet">' + esc(C.t('no_amount')) + '</span>'
        : '<span class="b-val b-quiet">No amount or time listed yet</span>');
    return '<li class="b-row" data-cat="' + esc(b.category) + '" ' + C.catVar(b.category) + '>' +
      C.badge(b, 'b-badge') +
      '<div class="b-text">' +
        '<a class="b-name" href="' + href + '"><bdi>' + esc(b.name) + '</bdi></a>' +
        (tags ? '<span class="b-tags">' + tags + '</span>' : '') +
        '<span class="b-sub" dir="auto">' + esc(b.sub) + '</span>' +
      '</div>' +
      (hasEffort ? '<span class="b-effort">' + C.effortHTML(b, 'row') + '</span>' : '') +
      val +
      '<div class="b-btns">' + C.trackBtn(b.id) + C.shareBtn(b.id) + '</div>' +
    '</li>';
  }

  /* Sorted rows. With a sort by money, time or documents, the rows that
     have no such value go in their own labelled group at the end. */
  function rowsHTML(list, key, showCat) {
    var sorted = sortList(list, key);
    var info = sortInfo(key);
    var row = function (b) { return rowHTML(b, showCat); };
    if (!info.known) return '<ol class="rows">' + sorted.map(row).join('') + '</ol>';
    var known = sorted.filter(info.known);
    var rest = sorted.filter(function (b) { return !info.known(b); });
    return (known.length ? '<ol class="rows">' + known.map(row).join('') + '</ol>' : '') +
      (rest.length ? '<h2 class="rows-h">' + esc(info.rest) + ' <span class="rows-n">(' + rest.length + ')</span></h2>' +
        '<ol class="rows">' + rest.map(row).join('') + '</ol>' : '');
  }

  /* The visa-blocked list, folded away. Public funds first, then schemes
     that are not public funds but usually need one. Each item is one big
     link. */
  var BLOCKED_GROUPS = {
    'public-fund': { h: 'Public funds', why: 'These are on the UK\'s official list of public funds. Your visa rule stops them.' },
    'needs-public-fund': { h: 'Need a public fund to qualify', why: 'These are not public funds. But you usually need a public fund, such as Universal Credit, to get them.' },
  };
  function blockedHTML(items, idSuffix) {
    if (!items.length) return '';
    var groups = { 'public-fund': [], 'needs-public-fund': [] };
    items.forEach(function (x) { (groups[x.kind] || groups['public-fund']).push(x); });
    var panelId = 'blocked-' + idSuffix;
    var inner = ['public-fund', 'needs-public-fund'].map(function (k) {
      var g = groups[k];
      if (!g.length) return '';
      return '<div class="blocked-group"><h3 class="blocked-h">' + esc(BLOCKED_GROUPS[k].h) + ' (' + g.length + ')</h3>' +
        '<p class="blocked-reason">' + C.ic('info') + '<span>' + esc(BLOCKED_GROUPS[k].why) + '</span></p>' +
        '<ul class="blocked-list">' + g.map(function (x) {
          var b = x.benefit;
          return '<li ' + C.catVar(b.category) + '><a class="blocked-link" href="#/benefit/' + encodeURIComponent(b.id) + '">' + C.badge(b, 'sm') +
            '<span class="blocked-name"><bdi>' + esc(b.name) + '</bdi><span class="blocked-cat">' + esc(C.cat(b).label) + '</span></span></a></li>';
        }).join('') + '</ul></div>';
    }).join('');
    return '<section class="blocked" id="blocked-sec-' + idSuffix + '" aria-label="' + esc(C.t('not_open')) + '">' +
      '<button type="button" class="btn btn-secondary btn-block blocked-btn" data-action="blocked-toggle" aria-expanded="false" aria-controls="' + panelId + '">' +
        C.ic('ban') + '<span>Not on your visa (' + items.length + ')</span>' + C.ic('chevron-down', 'chev') + '</button>' +
      '<div class="blocked-panel" id="' + panelId + '" hidden>' + inner + '</div></section>';
  }
  C.actions['blocked-toggle'] = function (el) {
    var open = el.getAttribute('aria-expanded') !== 'true';
    el.setAttribute('aria-expanded', String(open));
    var p = document.getElementById(el.getAttribute('aria-controls'));
    if (p) p.hidden = !open;
  };

  /* The no recourse to public funds summary, from the real split. English
     only: the shared translations of this sentence call every blocked
     scheme a public fund, which is not right for the ones that only need
     a public fund. */
  function nrpfLine(m) {
    var open = C.plural(m.open.length, 'benefit', 'benefits');
    if (!m.blocked.length) return 'Your visa has a "no recourse to public funds" rule. It does not affect the ' + open + ' below.';
    return 'Your visa has a "no recourse to public funds" rule. Because of it, ' +
      C.plural(m.blocked.length, 'benefit is', 'benefits are') + ' not open to you. It does not affect the ' + open + ' below.';
  }

  function headerHTML(m) {
    var lines = '';
    var statusLine;
    if (m.known) {
      statusLine = L.statusPhrase(m.status) + ' in ' + m.nation + (m.nationAssumed ? ' (we assumed England)' : '') + '.';
    } else {
      statusLine = 'Showing benefits that are open to everyone.';
    }
    if (!m.known) {
      lines = '<div class="note-card note-kind">' + C.ic('circle-help') +
        '<div><p><strong>You have not told us your visa yet.</strong> That is fine. These are the benefits open to everyone. Tell us your visa to see more.</p>' +
        '<a class="btn btn-primary btn-sm" href="#/settings/answer/status">' + C.ic('pencil') + '<span>Answer the visa question</span></a></div></div>';
    } else if (m.nrpf) {
      lines = '<p class="head-note">' + C.ic('scale') + '<span dir="auto">' + esc(nrpfLine(m)) + '</span></p>';
    } else {
      lines = '<p class="head-note">' + C.ic('scale') + '<span dir="auto">' + esc(C.tx('recourse_note', 'Your status lets you get public funds, so help that depends on your income and savings is included.')) + '</span></p>';
    }
    var total = m.total ? '<div class="total">' +
        '<p class="total-row"><span class="total-amt">' + esc(L.formatMoney(m.total)) + '</span>' +
        '<span class="total-label">' + esc(C.t('potential')) + '</span></p>' +
        '<span class="total-note" dir="auto">Adds up the ' + C.plural(m.withValue, 'benefit', 'benefits') + ' that have an amount. Not a promise.</span>' +
      '</div>' : '';
    return '<header class="ben-head">' +
      '<div class="ben-head-main">' +
        '<p class="eyebrow">' + C.ic('user') + '<span dir="auto">' + esc(statusLine) + '</span></p>' +
        '<h1 class="page-title">You may be able to get <span class="nowrap">' + C.plural(m.open.length, 'benefit', 'benefits') + '</span></h1>' +
        lines +
      '</div>' + total +
    '</header>';
  }

  /* ------------------------------------------------------------------ */
  /* #/benefits and #/benefits/<cat>                                      */
  /* ------------------------------------------------------------------ */

  C.views.benefits = function (parts) {
    var m = C.match();
    var sub = parts[1];
    if (sub) return listView(m, sub);

    var byCat = {};
    m.open.forEach(function (b) { (byCat[b.category] = byCat[b.category] || []).push(b); });
    var tiles = Object.keys(L.categories).filter(function (k) { return byCat[k]; }).map(function (k) {
      var c = L.categories[k];
      var list = byCat[k];
      /* The headline amount: confirmed schemes before ones that depend on
         things Landit did not ask, so a "possible" is never shown ahead of
         a confirmed one. */
      var withVal = L.sortBenefits(list, 'value').filter(function (b) { return typeof b.value === 'number'; });
      var pick = L.rankForHighlights(withVal, m.fit)[0];
      var v = pick ? L.valueParts(pick) : null;
      var k2 = pick === withVal[0] ? 'Highest amount' : 'Highest amount that fits your answers';
      return '<li><a class="tile" href="#/benefits/' + k + '" ' + C.catVar(k) + '>' +
        '<span class="tile-top"><span class="badge-ic lg">' + C.ic(c.icon) + '</span>' + C.icd('chevron-right', 'tile-go') + '</span>' +
        '<span class="tile-name">' + esc(c.label) + '</span>' +
        '<span class="tile-count">' + C.plural(list.length, 'benefit', 'benefits') + '</span>' +
        (v ? '<span class="tile-val"><span class="tile-k">' + esc(k2) + '</span><span class="val-amt">' + esc(v.amount) + '</span>' + (v.label ? '<span class="val-q">' + esc(v.label) + '</span>' : '') +
              (m.fit[pick.id] === 'possible' ? '<span class="tile-fit">' + esc(L.fitLabel.possible) + '</span>' : '') + '</span>'
           : '<span class="tile-val tile-val-none">No set amounts</span>') +
      '</a></li>';
    }).join('');

    var html =
      '<div class="page page-wide">' +
        headerHTML(m) +
        blockedHTML(m.blocked, 'all') +
        '<section class="tiles-sec" aria-labelledby="tiles-h">' +
          '<h2 class="sec-h" id="tiles-h">Choose a group</h2>' +
          '<p class="sec-sub tiles-sub">Each group shows how many benefits it has and the highest amount in it.</p>' +
          '<ul class="tiles">' +
            '<li class="tile-all-li"><a class="tile tile-all" href="#/benefits/all">' +
              '<span class="tile-top"><span class="badge-ic lg all-badge">' + C.ic('list') + '</span>' + C.icd('chevron-right', 'tile-go') + '</span>' +
              '<span class="tile-name">All benefits</span>' +
              '<span class="tile-count">' + C.plural(m.open.length, 'benefit', 'benefits') + '. Sort by money, speed or ease.</span>' +
            '</a></li>' +
            tiles +
          '</ul>' +
        '</section>' +
        '<p class="rates-line">' + C.ic('calendar') + '<span>' + esc(L.rates) + '</span></p>' +
        C.footer() +
      '</div>';
    return { title: C.t('nav_benefits'), nav: 'benefits', appsButton: true, html: html };
  };

  function listView(m, catKey) {
    var all = catKey === 'all';
    if (!all && !L.categories[catKey]) return { redirect: '#/benefits' };
    var list = all ? m.open : m.open.filter(function (b) { return b.category === catKey; });
    var blocked = all ? m.blocked : m.blocked.filter(function (x) { return x.benefit.category === catKey; });
    var c = all ? { label: 'All benefits', icon: 'list' } : L.categories[catKey];
    var counts = {};
    m.open.forEach(function (b) { counts[b.category] = (counts[b.category] || 0) + 1; });
    var sortKey = C.state.ui.sort || 'value';
    C.state.lastList = '#/benefits/' + catKey;

    var html =
      '<div class="page">' +
        '<a class="back-link" href="#/benefits">' + C.icd('chevron-left') + '<span>All groups</span></a>' +
        '<header class="list-head"' + (all ? '' : ' ' + C.catVar(catKey)) + '>' +
          '<span class="badge-ic lg' + (all ? ' all-badge' : '') + '">' + C.ic(c.icon) + '</span>' +
          '<div><h1 class="page-title">' + esc(c.label) + '</h1>' +
          '<p class="lead">' + C.plural(list.length, 'benefit', 'benefits') + ' you may be able to get.</p></div>' +
        '</header>' +
        '<div class="list-tools">' +
          '<div class="field-inline"><label class="field-label" for="cat-select">' + C.ic('filter') + '<span>Show</span></label>' +
            '<select class="select" id="cat-select" data-cat-select>' +
              '<option value="all"' + (all ? ' selected' : '') + '>All benefits (' + m.open.length + ')</option>' +
              Object.keys(L.categories).filter(function (k) { return counts[k]; }).map(function (k) {
                return '<option value="' + k + '"' + (k === catKey ? ' selected' : '') + '>' + esc(L.categories[k].label) + ' (' + counts[k] + ')</option>';
              }).join('') +
            '</select></div>' +
          '<div class="sorts" role="group" aria-labelledby="sort-h"><span class="field-label" id="sort-h">' + C.ic('arrow-up-down') + '<span>' + esc(C.t('sort_by')) + '</span></span>' +
            '<div class="sort-btns">' + SORTS.map(function (s) {
              return '<button type="button" class="sort-btn" data-action="sort" data-key="' + s.key + '" aria-pressed="' + (sortKey === s.key) + '">' + C.ic(s.icon) + '<span>' + esc(s.label) + '</span></button>';
            }).join('') + '</div>' +
            '<button type="button" class="link-btn az-btn" data-action="sort" data-key="az" aria-pressed="' + (sortKey === 'az') + '">' + esc(C.t('sort_az')) + '</button>' +
          '</div>' +
          '<p class="sort-note" id="sort-note">' + esc(sortInfo(sortKey).note) + '</p>' +
        '</div>' +
        '<div class="rows-wrap" id="rows" aria-label="' + esc(c.label) + '" role="region">' + rowsHTML(list, sortKey, all) + '</div>' +
        '<p class="effort-key">' + C.dotsHTML(1) + '<span>' + esc(L.effortNote) + '. One dot is ' + esc(L.effortLabels.low.toLowerCase()) + ', three dots is ' + esc(L.effortLabels.high.toLowerCase()) + '.</span></p>' +
        blockedHTML(blocked, catKey) +
        C.footer() +
      '</div>';
    return {
      title: c.label + ' | ' + C.t('nav_benefits'),
      nav: 'benefits',
      appsButton: true,
      html: html,
      after: function () {
        var sel = document.getElementById('cat-select');
        sel.addEventListener('change', function () {
          C.go('#/benefits/' + sel.value);
        });
      },
    };
  }

  C.actions.sort = function (el) {
    var key = el.getAttribute('data-key');
    C.state.ui.sort = key;
    C.save();
    var r = C.route();
    var catKey = r.parts[1] || 'all';
    var m = C.match();
    var list = catKey === 'all' ? m.open : m.open.filter(function (b) { return b.category === catKey; });
    document.getElementById('rows').innerHTML = rowsHTML(list, key, catKey === 'all');
    document.querySelectorAll('[data-action="sort"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-key') === key)); });
    document.getElementById('sort-note').textContent = sortInfo(key).note;
    C.toast('Sorted: ' + (key === 'az' ? C.t('sort_az') : sortInfo(key).label));
  };

  /* ------------------------------------------------------------------ */
  /* Ratings in words (shared with Community)                            */
  /* ------------------------------------------------------------------ */

  var PHRASE = {
    worth: ['it was very much worth it', 'it was somewhat worth it', 'it was not really worth it'],
    speed: ['it was quick', 'it took an average time', 'it was slow'],
    ease: ['it was easy', 'it was OK', 'it was hard'],
  };
  /* Counts per option including this person's own rating. */
  C.ratingCounts = function (id) {
    var base = L.community.ratings[id];
    var mine = C.state.myRatings[id];
    if (!base && !mine) return null;
    var out = { sample: !!(base && base.sample), mine: !!mine };
    ['worth', 'speed', 'ease'].forEach(function (k) {
      var arr = base ? base[k].slice() : [0, 0, 0];
      if (mine && typeof mine[k] === 'number') arr[mine[k]] += 1;
      out[k] = arr;
    });
    return out;
  };
  /* "7 of 9 people said it was quick." On a tie, both views are given:
     "Opinions are split. 4 of 9 people said it was quick, and 4 said it
     took an average time." */
  C.ratingSentence = function (k, arr) {
    var total = arr.reduce(function (s, x) { return s + x; }, 0);
    if (!total) return null;
    var max = Math.max.apply(null, arr);
    var top = [];
    arr.forEach(function (x, i) { if (x === max) top.push(i); });
    var people = total === 1 ? ' person' : ' people';
    if (top.length === 1) return arr[top[0]] + ' of ' + total + people + ' said ' + PHRASE[k][top[0]] + '.';
    var rest = top.slice(1).map(function (i) { return arr[i] + ' said ' + PHRASE[k][i]; });
    return 'Opinions are split. ' + arr[top[0]] + ' of ' + total + people + ' said ' + PHRASE[k][top[0]] + ', and ' + rest.join(', and ') + '.';
  };
  /* "10 people rated it", or "Up to 10 people" when a question has fewer answers. */
  C.ratingWho = function (rc) {
    var totals = ['worth', 'speed', 'ease'].map(function (k) { return rc[k].reduce(function (s, x) { return s + x; }, 0); });
    var max = Math.max.apply(null, totals);
    var same = totals.every(function (t) { return t === max; });
    return (same ? '' : 'Up to ') + C.plural(max, 'person', 'people') + ' rated it';
  };

  /* ------------------------------------------------------------------ */
  /* #/benefit/<id>                                                      */
  /* ------------------------------------------------------------------ */

  function stepRow(b, step, i) {
    var on = C.stepTicks(b.id).indexOf(i) >= 0;
    var id = 's-' + b.id + '-' + i;
    return '<li class="step"><label class="step-label" for="' + esc(id) + '">' +
      '<span class="step-num" aria-hidden="true">' + (i + 1) + '</span>' +
      '<span class="step-text" data-say>' + esc(step) + '</span>' +
      '<input type="checkbox" id="' + esc(id) + '" data-step="' + esc(b.id + '|' + i) + '"' + (on ? ' checked' : '') + '>' +
      '<span class="tick-box" aria-hidden="true">' + C.ic('check') + '</span>' +
      '<span class="sr-only">Done</span></label></li>';
  }
  function stepsDoneText(b) {
    var n = C.stepTicks(b.id).filter(function (i) { return i < b.guide.steps.length; }).length;
    return C.lang() === 'en' ? n + ' of ' + b.guide.steps.length + ' ' + C.t('steps_done') : n + ' / ' + b.guide.steps.length + ' ' + C.t('steps_done');
  }
  C.onStepChange = function (id) {
    var b = L.benefitById(id);
    var el = document.getElementById('steps-count');
    if (b && el) el.textContent = stepsDoneText(b);
  };

  function host(u) {
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; }
  }

  /* The public funds line, chosen from both fields and the person's visa,
     so it never contradicts the "not open" note. The shared translation is
     used only where its wording is right for this case. */
  function pfText(b, m) {
    var en = C.lang() === 'en';
    if (b.publicFunds) {
      if (m.nrpf === true) return en ? 'A public fund. Your visa rule stops it.' : C.t('is_public_fund');
      if (m.nrpf === false) return 'A public fund. Your status allows public funds.';
      return 'A public fund. People with a no recourse to public funds rule cannot get it.';
    }
    if (b.nrpf === 'no') return 'Not a public fund. But you usually need a public fund, such as Universal Credit, to get it.';
    if (m.nrpf === true) return en ? 'Not a public fund, so your visa rule does not stop it.' : C.t('not_public_fund');
    return 'Not a public fund.';
  }

  /* The heading over the value: "Could be worth" only over an amount. */
  function worthHeading(b) {
    if (b.valueKind === 'amount' || typeof b.value === 'number') {
      return /^could be worth/i.test(b.valueLabel || '') ? 'Amount' : 'Could be worth';
    }
    return 'What it offers';
  }

  C.views.benefit = function (parts) {
    var b = L.benefitById(parts[1]);
    if (!b) {
      C.toast('We could not find that benefit. Here are all your benefits.');
      return { redirect: '#/benefits' };
    }
    var m = C.match();
    var isOpen = m.open.indexOf(b) >= 0;
    var blockedItem = m.blocked.filter(function (x) { return x.benefit === b; })[0];
    var tracked = C.trackedEntry(b.id);
    var g = b.guide;
    var v = L.valueParts(b);
    var need = C.docsNeeded(b), maybe = C.docsMaybe(b);
    var back = C.state.lastList || '#/benefits';
    var en = C.lang() === 'en';

    /* Standing for this person, in plain words. */
    var standing = '';
    if (blockedItem) {
      standing = '<div class="note-card note-blocked">' + C.ic('ban') + '<div><p><strong>' + esc(C.t('not_open')) + '.</strong> ' + esc(C.blockedText[blockedItem.kind] || blockedItem.reason) + '</p>' +
        (b.applyUrl ? '<a class="btn btn-secondary btn-sm" href="' + esc(b.applyUrl) + '" target="_blank" rel="noopener">' + C.ic('external-link') + '<span>Read the official page</span></a>' : '') + '</div></div>';
    } else if (!isOpen) {
      standing = '<div class="note-card">' + C.ic('info') + '<p>This one is not in your list. It may not fit your visa, where you live, or your answers.</p></div>';
    }

    /* Summary cells: only the ones Landit has something for. */
    var cells = [];
    if (v.amount) {
      cells.push('<div class="sum-cell sum-worth"><span class="sum-k">' + C.ic('wallet') + '<span>' + esc(worthHeading(b)) + '</span></span>' +
        '<span class="sum-v" data-say>' + esc(v.amount) + '</span>' + (v.label ? '<span class="sum-q" data-say>' + esc(v.label) + '</span>' : '') + '</div>');
    } else if (v.label) {
      cells.push('<div class="sum-cell sum-worth"><span class="sum-k">' + C.ic('wallet') + '<span>' + esc(worthHeading(b)) + '</span></span>' +
        '<span class="sum-v sum-v-text" data-say>' + esc(v.label) + '</span></div>');
    }
    if (!g.generic && g.time) {
      cells.push('<div class="sum-cell"><span class="sum-k">' + C.ic('clock') + '<span>' + esc(C.tx('to_apply', 'Time to apply')) + '</span></span>' +
        '<span class="sum-v sum-v-text" data-say>' + esc(g.time) + '</span></div>');
    }
    if (b.docsKnown) {
      cells.push('<div class="sum-cell"><span class="sum-k">' + C.ic('file-text') + '<span>' + esc(C.t('documents')) + '</span></span>' +
        '<span class="sum-v" data-say>' + (need.length ? C.plural(need.length, 'needed', 'needed') : 'None needed') + '</span>' +
        (maybe.length ? '<span class="sum-q">' + maybe.length + ' more may be needed</span>' : '') + '</div>');
    }
    var officialBtn = function (cls, label) {
      return b.applyUrl ? '<a class="btn ' + cls + '" href="' + esc(b.applyUrl) + '" target="_blank" rel="noopener">' + C.ic('external-link') + '<span>' + esc(label) + '</span><span class="sr-only"> (opens a new tab)</span></a>' : '';
    };
    var sumTop = cells.length
      ? '<div class="sum-grid">' + cells.join('') + '</div>'
      : '<div class="sum-empty"><p class="soft-p">' + C.ic('info') + '<span>Landit has no amount, time or document list for this one yet. Check the official page.</span></p>' +
          officialBtn('btn-secondary', 'Official website') + '</div>';

    var more = '';
    if (!g.generic && g.decision) more += '<div><dt>' + esc(C.tx('decision', 'Time to get an answer')) + '</dt><dd>' + esc(g.decision) + '</dd></div>';
    if (!g.generic && g.cost) more += '<div><dt>' + esc(C.t('cost')) + '</dt><dd>' + esc(g.cost) + '</dd></div>';
    more += '<div><dt>' + esc(C.tx('published_rate', 'Approval rate')) + '</dt><dd>' + (b.statRate === null || b.statRate === undefined ? esc(C.tx('no_rate', L.noRateText)) : esc(Math.round(b.statRate * 100) + '%') + (b.stat ? '<span class="dd-note">' + esc(b.stat) + '</span>' : '')) + '</dd></div>';

    var foot = '';
    if (C.hasEffort(b)) foot += '<p class="effort-line">' + C.effortHTML(b, 'detail') + '<span class="effort-note">' + esc(L.effortNote) + '</span></p>';
    else if (cells.length) foot += '<p class="soft-p">' + C.ic('info') + '<span>No time or document list yet. Check the official page.</span></p>';
    if (!blockedItem) foot += '<p class="pf-line">' + C.ic(b.publicFunds || b.nrpf === 'no' ? 'info' : 'circle-check') + '<span dir="auto">' + esc(pfText(b, m)) + '</span></p>';
    if (b.nrpf === 'depends' && m.nrpf !== false && !blockedItem) {
      foot += '<p class="pf-line">' + C.ic('circle-help') + '<span>It depends on your situation. ' + (b.rules.length ? 'Check the rules below.' : 'Check the official page.') + '</span></p>';
    }
    if (b.valueNote) foot += '<p class="value-note">' + C.ic('info') + '<span><strong>About the amount:</strong> ' + esc(C.cap(b.valueNote)) + '</span></p>';

    var docsSection;
    if (b.docsKnown && b.docs.length) {
      docsSection = '<p class="sec-sub" data-doccount="' + esc(b.id) + '">' + esc(C.docCountText(b)) + '</p>' + C.docGroups(b, 'page');
    } else if (b.docsKnown) {
      docsSection = '<p class="soft-p">' + esc(g.needNote || 'There is nothing to gather for this one.') + '</p>';
    } else {
      docsSection = '<p class="soft-p">' + C.ic('info') + '<span>Landit has no document list for this one yet. Check the official page before you start.</span></p>' +
        (b.docs.length ? C.docGroups(b, 'page') : '');
    }
    if (b.docsKnown && b.docs.length && g.needNote) docsSection += '<p class="soft-p">' + esc(g.needNote) + '</p>';

    var rc = C.ratingCounts(b.id);
    var posts = L.community.posts.concat(C.state.posts).filter(function (p) { return p.benefitId === b.id; });
    var snapshot = '<section class="d-sec card" aria-labelledby="d-comm">' +
      '<h2 class="d-h" id="d-comm">' + C.ic('users') + '<span>What people said</span></h2>' +
      (rc ? '<ul class="snap">' + ['worth', 'speed', 'ease'].map(function (k) {
          var s = C.ratingSentence(k, rc[k]);
          return s ? '<li><span class="snap-k">' + esc(L.community.ratingScales[k].label) + '</span><span class="snap-v">' + esc(s) + '</span></li>' : '';
        }).join('') + '</ul>' + (rc.sample ? '<p class="sample-tag">' + C.ic('info') + '<span>' + esc(L.community.sampleNote) + '</span></p>' : '')
        : '<p class="soft-p">Nobody has rated this one yet.</p>') +
      '<div class="d-row-btns">' +
        '<a class="btn btn-secondary" href="#/community/about/' + encodeURIComponent(b.id) + '">' + C.ic('message-square') + '<span>' + (posts.length ? 'Read ' + C.plural(posts.length, 'post', 'posts') : 'Go to Community') + '</span></a>' +
        '<button type="button" class="btn btn-secondary" data-action="rate" data-id="' + esc(b.id) + '">' + C.ic('list-checks') + '<span>' + esc(C.t('rate_this')) + '</span></button>' +
      '</div></section>';

    /* Open schemes: Track is the main action and Apply is a big button.
       Blocked or not listed: everything stays readable, but nothing invites
       an application (claiming a public fund can breach a visa condition). */
    var main = isOpen;
    var html =
      '<div class="page detail" ' + C.catVar(b.category) + ' id="detail">' +
        '<div class="detail-top">' +
          '<a class="back-link" href="' + esc(back) + '">' + C.icd('chevron-left') + '<span>' + esc(C.t('back')) + (en ? '<span class="wide-only"> to benefits</span>' : '') + '</span></a>' +
          C.readBtn('#detail', C.t('read_aloud'), 'btn-secondary read-top') +
        '</div>' +
        '<header class="detail-head">' +
          '<div class="chips">' + C.catChip(b.category) + '<span class="region-chip">' + C.ic('map-pin') + '<span>' + esc(b.regionLabel) + '</span></span>' +
            (blockedItem ? '<span class="state-chip">' + C.ic('ban') + '<span>' + esc(C.t('not_open')) + '</span></span>' : (isOpen ? C.fitTag(b.id) : '')) + '</div>' +
          '<h1 class="page-title" data-say><bdi>' + esc(b.name) + '</bdi></h1>' +
          '<p class="lead" data-say dir="auto">' + esc(b.sub) + '</p>' +
        '</header>' +
        standing +
        '<section class="summary card" aria-label="Summary">' +
          sumTop +
          '<dl class="sum-more">' + more + '</dl>' +
          (foot ? '<div class="sum-foot">' + foot + '</div>' : '') +
        '</section>' +
        '<div class="detail-actions">' +
          C.trackBtn(b.id, (tracked || !main ? 'btn-secondary' : 'btn-primary') + ' btn-lg track-big') +
          C.shareBtn(b.id, 'btn-secondary btn-lg') +
          (main && cells.length ? officialBtn('btn-secondary btn-lg', 'Official website') : '') +
        '</div>' +
        '<section class="d-sec card" aria-labelledby="d-who">' +
          '<h2 class="d-h" id="d-who">' + C.ic('user') + '<span>' + esc(C.tx('do_you_qualify', 'Who can get it')) + '</span></h2>' +
          (b.rules.length ? '<ul class="rules">' + b.rules.map(function (r) { return '<li><span class="rule-dot" aria-hidden="true"></span><span data-say dir="auto">' + esc(r) + '</span></li>'; }).join('') + '</ul>' : '<p class="soft-p">No extra rules are listed. Check the official page.</p>') +
          '<button type="button" class="btn btn-quiet btn-sm about-btn" data-action="about-toggle" aria-expanded="false" aria-controls="about-text">' + C.ic('chevron-down', 'chev') + '<span>' + esc(en ? 'What it is: full description' : C.t('what_it_is')) + '</span></button>' +
          '<div id="about-text" class="about-text" hidden><p dir="auto">' + esc(b.about) + '</p>' + (b.note ? '<p dir="auto">' + esc(b.note) + '</p>' : '') + '</div>' +
        '</section>' +
        '<section class="d-sec card" aria-labelledby="d-need">' +
          '<h2 class="d-h" id="d-need">' + C.ic('list-checks') + '<span>' + esc(C.t('what_you_need')) + '</span></h2>' + docsSection +
        '</section>' +
        (g.steps.length ? '<section class="d-sec" aria-labelledby="d-steps">' +
          '<h2 class="d-h" id="d-steps">' + C.ic('footprints') + '<span>' + esc(C.t('how_to_apply')) + '</span></h2>' +
          (blockedItem ? '<p class="soft-p">' + C.ic('info') + '<span>This is not open to you now. These steps are here for information only.</span></p>' : '') +
          (g.generic ? '<p class="soft-p">' + C.ic('info') + '<span>These are general steps. The official page has the exact way to apply.</span></p>' : '') +
          '<p class="sec-sub"><span id="steps-count">' + esc(stepsDoneText(b)) + '</span>. ' + esc(C.t('tap_step')) + '.</p>' +
          '<ol class="steps">' + g.steps.map(function (s, i) { return stepRow(b, s, i); }).join('') + '</ol>' +
        '</section>' : '') +
        (!blockedItem && ((g.boost && g.boost.length) || g.watch || b.strengthen) ? '<section class="d-sec card tips" aria-labelledby="d-tips">' +
          '<h2 class="d-h" id="d-tips">' + C.ic('circle-check') + '<span>' + esc(C.t('improve')) + '</span></h2>' +
          ((g.boost && g.boost.length) ? '<ul class="tip-list">' + g.boost.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'
            : (b.strengthen ? '<ul class="tip-list"><li>' + esc(b.strengthen) + '</li></ul>' : '')) +
          (g.watch ? '<div class="watch"><h3 class="watch-h">' + C.ic('info') + '<span>' + esc(C.t('common_mistake')) + '</span></h3><p>' + esc(g.watch) + '</p></div>' : '') +
        '</section>' : '') +
        '<div class="apply-wrap">' +
          (b.applyUrl
            ? (main
              ? '<a class="btn btn-primary btn-xl btn-block" href="' + esc(b.applyUrl) + '" target="_blank" rel="noopener">' + C.ic('external-link') + '<span>Apply on the official website</span></a>'
              : '<a class="btn btn-secondary btn-lg btn-block" href="' + esc(b.applyUrl) + '" target="_blank" rel="noopener">' + C.ic('external-link') + '<span>Read the official page</span></a>') +
              '<p class="apply-note">Opens ' + esc(host(b.applyUrl)) + ' in a new tab. Landit does not apply for you.</p>'
            : '<p class="soft-p">' + C.ic('info') + '<span>No official link is listed yet. Ask a local adviser or your council.</span></p>') +
        '</div>' +
        '<section class="d-sec card" aria-labelledby="d-claim">' +
          '<h2 class="d-h" id="d-claim">' + C.ic('flag') + '<span>' + esc(C.tx('claim_status', 'Where is your application now?')) + '</span></h2>' +
          '<p class="sec-sub">Choose one. <span id="claim-hint">' + (tracked ? 'It shows in My applications.' : 'This also adds it to My applications.') + '</span></p>' +
          '<div class="claim-opts" role="radiogroup" aria-labelledby="d-claim">' + L.trackStatuses.map(function (s, i) {
            var on = tracked ? tracked.status === s.value : false;
            return '<label class="claim-opt" for="claim-' + i + '"><input type="radio" name="claim" id="claim-' + i + '" value="' + esc(s.value) + '"' + (on ? ' checked' : '') + ' data-claim="' + esc(b.id) + '">' +
              '<span class="claim-box">' + C.statusPill(s.value) + '</span></label>';
          }).join('') + '</div>' +
          '<p class="claim-saved" id="claim-saved" role="status" aria-live="polite"></p>' +
          '<button type="button" class="link-btn" data-action="track" data-id="' + esc(b.id) + '" data-untrack' + (tracked ? '' : ' hidden') + '>' + C.ic('x') + '<span>' + esc(C.t('untrack')) + '</span></button>' +
        '</section>' +
        snapshot +
        (b.sources.length ? '<section class="d-sec sources" aria-labelledby="d-src"><h2 class="d-h small" id="d-src">' + C.ic('file-text') + '<span>Sources</span></h2><ul>' +
          b.sources.map(function (u) { return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener" dir="ltr">' + esc(host(u)) + '</a></li>'; }).join('') + '</ul>' +
          '<p class="rates-line">' + esc(L.rates) + '</p></section>' : '') +
        C.footer() +
      '</div>';

    return {
      title: b.name,
      nav: 'benefits',
      html: html,
      after: function () {
        document.querySelectorAll('input[data-claim]').forEach(function (r) {
          r.addEventListener('change', function () {
            var was = C.isTracked(b.id);
            C.setClaim(b.id, r.value);
            C.syncTrackButtons(b.id);
            C.refreshApps();
            C.onTrackChange(b.id);
            var msg = C.t('st_saved') + (was ? '' : ' Added to My applications.');
            document.getElementById('claim-saved').textContent = msg;
          });
        });
      },
    };
  };

  C.actions['about-toggle'] = function (el) {
    var open = el.getAttribute('aria-expanded') !== 'true';
    el.setAttribute('aria-expanded', String(open));
    var p = document.getElementById(el.getAttribute('aria-controls'));
    if (p) p.hidden = !open;
  };

  /* After Track or Stop tracking on the detail page, keep the claim
     status section and the big Track button in step (no redraw, so focus
     stays where it is). */
  C.onTrackChange = function (id) {
    var r = C.route();
    if (r.name !== 'benefit' || r.parts[1] !== id) return;
    var t = C.trackedEntry(id);
    document.querySelectorAll('input[data-claim]').forEach(function (x) { x.checked = !!t && t.status === x.value; });
    var un = document.querySelector('[data-untrack]');
    if (un) un.hidden = !t;
    var big = document.querySelector('.track-big');
    var main = C.isOpen(id);
    if (big) { big.classList.toggle('btn-primary', !t && main); big.classList.toggle('btn-secondary', !!t || !main); }
    var hint = document.getElementById('claim-hint');
    if (hint) hint.textContent = t ? 'It shows in My applications.' : 'This also adds it to My applications.';
  };
})();

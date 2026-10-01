/* Landit, design B (Dusk): Benefits and the benefit detail panel.
   At a glance first (three highlight tiles and a value-by-category chart),
   then a compact, sortable, filterable list. Opening a benefit shows its
   detail in a right-side panel on desktop (the list stays visible) and full
   screen on phones. #/benefit/<id> deep-links to that state. */
(function () {
  'use strict';
  var D = window.DUSK, L = D.L;
  var esc = D.esc;

  D.ui.bf = D.ui.bf || { q: '', cat: 'all', sort: 'value' };
  var PAGE_SIZE = 20;
  var SORTS = [
    { id: 'value', key: 'sort_value' },
    { id: 'time', key: 'sort_time' },
    { id: 'docs', key: 'sort_docs' },
    { id: 'az', key: 'sort_az' },
  ];

  function lc(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function money(n) { return L.formatMoney(n); }

  /* ------------------------------------------------------------------ */
  /* Header                                                              */
  /* ------------------------------------------------------------------ */

  /* Who carries the "no recourse to public funds" condition, in plain words. */
  function nrpfWho(m) {
    return m.status === 'asylum' ? 'While you wait for an asylum decision, you cannot get public funds' : 'Your visa does not allow public funds';
  }

  function head(m) {
    var n = m.open.length;
    var facts = '', title, note = '';
    var nation = '<span class="bf-fact">' + D.icon('map-pin', { size: 16 }) + '<span>' + esc(m.nation) + (m.nationAssumed ? ' (assumed)' : '') + '</span></span>';
    if (m.known) {
      facts = '<span class="bf-fact">' + D.icon('file-text', { size: 16 }) + '<span>' + esc(m.statusLabel) + '</span></span>' + nation +
        '<a class="bf-change" href="#/settings">' + D.icon('pencil', { size: 16 }) + '<span>Change answers</span></a>';
      title = esc(L.statusPhrase(m.status)) + ' in ' + esc(m.nation) + ', you may be able to claim <strong class="num">' + n + '</strong> benefits.';
      /* Built from what the matcher blocked, so it never calls a scheme a
         public fund when it only needs one. The full split is in the
         "Not open on your visa" section, one tap away. */
      if (m.nrpf && m.blocked.length) {
        note = '<p class="bf-note">' + D.icon('lock', { size: 18 }) + '<span>' +
          esc(nrpfWho(m) + '. So ' + D.plural(m.blocked.length, 'benefit is', 'benefits are') + ' not in your list.') + ' ' +
          '<button type="button" class="link-btn" data-action="show-blocked" aria-controls="blocked-body">' + esc('See which ones and why') + '</button></span></p>';
      } else if (m.nrpf === false) {
        note = '<p class="bf-note">' + D.icon('info', { size: 18 }) + '<span>Your status lets you get public funds, so support that depends on your income is included.</span></p>';
      }
    } else {
      facts = '<span class="bf-fact">' + D.icon('circle-help', { size: 16 }) + '<span>Visa not answered</span></span>' + nation;
      title = 'You may be able to claim <strong class="num">' + n + '</strong> benefits that are open to everyone.';
      note = '<div class="kind-note">' + D.icon('info', { size: 20 }) +
        '<div><p><strong>You skipped the visa question, and that is fine.</strong> Your visa decides which other benefits are open to you. Answer it to see more.</p>' +
        '<a class="btn btn-primary btn-sm" href="#/settings/status" id="answer-visa">' + esc('Answer the visa question') + '</a></div></div>';
    }
    var total = '';
    if (m.total > 0) {
      var none = n - m.withValue;
      total = '<div class="total-card">' +
        '<p class="total-fig num">' + esc(money(m.total)) + '</p>' +
        '<p class="total-label">' + esc(D.t('potential')) + '</p>' +
        '<button type="button" class="link-btn total-how-btn" data-action="disclose" aria-expanded="false" aria-controls="total-how">' +
        D.icon('chevron-down', { size: 16, className: 'chev' }) + '<span>How this is worked out</span></button>' +
        '<div class="total-how" id="total-how" hidden><p>Adds up the ' + D.plural(m.withValue, 'benefit', 'benefits') + ' that show one amount.' +
        (none ? ' The other ' + none + ' are not added in: their value is a discount, a service, or not one fixed amount.' : '') + '</p>' +
        '<p class="total-rates">' + esc(L.rates) + '</p></div>' +
        '</div>';
    }
    return '<section class="bf-head" aria-labelledby="bf-title">' +
      '<div class="bf-head-text"><p class="bf-facts">' + facts + '</p>' +
      '<h2 class="bf-title" id="bf-title">' + title + '</h2>' + note + '</div>' +
      total + '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* At a glance                                                         */
  /* ------------------------------------------------------------------ */

  function tile(kind, icon, b, fig, qual) {
    if (!b) {
      return '<div class="gtile is-empty"><p class="gtile-k">' + D.icon(icon, { size: 18 }) + '<span>' + esc(kind) + '</span></p>' +
        '<p class="gtile-fig">Not listed</p><p class="gtile-q">No benefit in your list has this yet.</p></div>';
    }
    return '<a class="gtile" href="#/benefit/' + esc(b.id) + '" style="' + D.catVars(b.category) + '">' +
      '<span class="gtile-k">' + D.icon(icon, { size: 18 }) + '<span>' + esc(kind) + '</span></span>' +
      '<span class="gtile-figrow"><span class="gtile-fig num" dir="auto">' + esc(fig) + '</span>' +
      (qual ? '<span class="gtile-q" dir="auto">' + esc(qual) + '</span>' : '') + '</span>' +
      '<span class="gtile-name">' + D.catTile(b, 'xs') + '<span class="gtile-name-text">' + D.bdi(b.name) + '</span>' + D.dicon('chevron-right', { size: 18, className: 'gtile-chev' }) + '</span>' +
      (D.isPossible(b) ? '<span class="gtile-fit">' + D.fitTag(b) + '</span>' : '') +
      '</a>';
  }

  /* Highlights use the matcher's certainty: a benefit that matches every
     answer always comes before one that only "depends", so a 'possible'
     scheme is never headlined ahead of 'confirmed' ones. */
  function pick(m, sort, keep) {
    return L.rankForHighlights(L.sortBenefits(m.open, sort), m.fit).filter(keep)[0];
  }

  function glance(m) {
    var worth = pick(m, 'value', function (b) { return typeof b.value === 'number'; });
    var quick = pick(m, 'time', function (b) { return b.timeMinutes !== null && b.guide.time; });
    var few = pick(m, 'docs', function (b) { return b.docsKnown; });
    var fewFig = few ? (few.docsCount === 0 ? 'None' : D.plural(few.docsCount, 'document', 'documents')) : '';
    var fewQual = few ? (few.docsCount === 0 ? (few.guide.needNote || 'Nothing to gather') : 'to gather') : '';
    var picks = [worth, quick, few].filter(Boolean);
    var allSure = picks.length && picks.every(function (b) { return !D.isPossible(b); });
    return '<section class="glance" aria-labelledby="glance-h">' +
      '<div class="card-head"><h2 class="sec-h" id="glance-h">Good places to start</h2>' +
      '<p class="card-sub">' + esc(allSure ? 'These match all your answers.' : 'Benefits that match all your answers come first.') + '</p></div>' +
      '<div class="glance-grid">' +
      tile('Highest amount', 'pound-sterling', worth, worth ? money(worth.value) : '', worth ? worth.valueLabel : '') +
      tile(D.t('sort_time'), 'clock', quick, quick ? quick.guide.time : '', '') +
      tile(D.t('sort_docs'), 'file-text', few, fewFig, fewQual) +
      '</div></section>';
  }

  function chart(m) {
    var groups = {}, counts = {};
    m.open.forEach(function (b) {
      counts[b.category] = (counts[b.category] || 0) + 1;
      if (typeof b.value !== 'number') return;
      if (!groups[b.category]) groups[b.category] = { key: b.category, sum: 0, items: [] };
      groups[b.category].sum += b.value;
      groups[b.category].items.push(b);
    });
    var arr = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return b.sum - a.sum; });
    if (!arr.length) return '';
    var max = arr[0].sum;
    return '<section class="card chart" aria-labelledby="chart-h">' +
      '<div class="card-head"><h2 class="sec-h" id="chart-h">Potential value by category</h2>' +
      '<p class="card-sub">' + esc(D.t('potential')) + '. Tap a category to see its benefits.</p></div>' +
      '<ul class="bars' + (D.ui.chartAll ? ' show-all' : '') + '" id="bars">' + arr.map(function (g, gi) {
        var cat = L.categories[g.key];
        var all = counts[g.key] || g.items.length;
        var pct = Math.max(4, Math.round(g.sum / max * 100));
        return '<li' + (gi >= 4 ? ' class="bar-extra"' : '') + '><button type="button" class="bar-row" data-action="bf-cat" data-cat="' + g.key + '" style="' + D.catVars(g.key) + '">' +
          '<span class="bar-label">' + D.icon(cat.icon, { size: 18 }) + '<span>' + esc(cat.label) + '</span></span>' +
          '<span class="bar-val"><span class="num">' + esc(money(g.sum)) + '</span><span class="sr-only">, ' + esc(D.t('potential')) + '</span></span>' +
          '<span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:' + pct + '%"></span></span>' +
          '<span class="bar-q">' + esc(g.items.length + ' of ' + D.plural(all, 'benefit', 'benefits') + ' ' + (g.items.length === 1 ? 'has' : 'have') + ' an amount') + '</span>' +
          '<span class="sr-only">. Show ' + esc(cat.label) + ' in the list.</span>' +
          '</button></li>';
      }).join('') + '</ul>' +
      (arr.length > 4 ? '<button type="button" class="btn btn-ghost btn-sm bars-more" data-action="bars-more" aria-controls="bars" aria-expanded="' + !!D.ui.chartAll + '">' +
        D.icon('chevron-down', { size: 18, className: 'chev' }) + '<span>' + esc(D.ui.chartAll ? 'Show fewer categories' : 'Show all ' + arr.length + ' categories') + '</span></button>' : '') +
      '</section>';
  }

  /* ------------------------------------------------------------------ */
  /* Toolbar and list                                                    */
  /* ------------------------------------------------------------------ */

  function selectWrap(id, label, options) {
    return '<div class="tool-field"><label class="tool-label" for="' + id + '">' + esc(label) + '</label>' +
      '<span class="select-wrap"><select class="select" id="' + id + '">' + options + '</select>' + D.icon('chevron-down', { size: 18, className: 'select-chev' }) + '</span></div>';
  }

  function toolbar(m) {
    var f = D.ui.bf;
    var counts = {};
    m.open.forEach(function (b) { counts[b.category] = (counts[b.category] || 0) + 1; });
    if (f.cat !== 'all' && !counts[f.cat]) f.cat = 'all';
    var catOpts = '<option value="all">' + esc('All categories (' + m.open.length + ')') + '</option>' +
      Object.keys(L.categories).filter(function (k) { return counts[k]; }).map(function (k) {
        return '<option value="' + k + '"' + (f.cat === k ? ' selected' : '') + '>' + esc(L.categories[k].label + ' (' + counts[k] + ')') + '</option>';
      }).join('');
    var sortOpts = SORTS.map(function (s) { return '<option value="' + s.id + '"' + (f.sort === s.id ? ' selected' : '') + '>' + esc(D.t(s.key)) + '</option>'; }).join('');
    return '<section class="bf-tools" aria-labelledby="list-h">' +
      '<div class="list-head"><h2 class="sec-h" id="list-h" tabindex="-1">All benefits you may be able to claim</h2>' +
      '<p class="list-count" id="bf-count" aria-live="polite"></p></div>' +
      '<div class="toolbar">' +
      '<div class="tool-field tool-search"><label class="tool-label" for="bf-q">' + esc(D.t('search')) + '</label>' +
      '<span class="search-wrap">' + D.icon('search', { size: 18, className: 'search-ico' }) +
      '<input class="input" id="bf-q" type="search" value="' + esc(f.q) + '" placeholder="Try: railcard, dental" autocomplete="off"></span></div>' +
      selectWrap('bf-cat', 'Category', catOpts) +
      selectWrap('bf-sort', D.t('sort_by'), sortOpts) +
      '</div>' +
      '<p class="effort-note">' + D.icon('info', { size: 16 }) + '<span>' + esc(D.t('effort') + ' is Landit\'s own estimate. ' + L.effortNote + '.') + '</span></p>' +
      '</section>';
  }

  /* Everyday words people type, mapped to the words the catalog uses. */
  var SYNONYMS = { dentist: 'dental', dentists: 'dental', teeth: 'dental', doctor: 'gp', doctors: 'gp', glasses: 'eye' };
  function searchWords(q) {
    return String(q).split(/\s+/).map(function (w) { return SYNONYMS[w.toLowerCase()] || w; }).join(' ');
  }

  function filtered(m) {
    var f = D.ui.bf;
    var list = m.open;
    if (f.cat !== 'all') list = list.filter(function (b) { return b.category === f.cat; });
    if (f.q) list = L.searchBenefits(list, searchWords(f.q));
    return L.sortBenefits(list, f.sort);
  }

  function effortHTML(b) {
    if (!b.effort) return '<span class="cell-muted">Not listed</span>';
    return '<span class="effort effort-' + b.effort + '"><span class="effort-bars" aria-hidden="true"><i></i><i></i><i></i></span><span>' + esc(b.effortLabel) + '</span></span>';
  }

  function row(b, selId) {
    var sel = selId === b.id;
    var time = D.timeText(b), docs = D.docsText(b);
    /* Rows without a hand-written guide get one quiet line instead of
       three "Not listed" cells. */
    var meta = b.guide.generic
      ? '<div class="brow-cell brow-generic is-muted">' + D.icon('info', { size: 16, className: 'cell-ico' }) + '<span>Time and documents not listed yet</span></div>'
      : '<div class="brow-cell brow-time' + (time === 'Not listed' ? ' is-muted' : '') + '">' + D.icon('clock', { size: 16, className: 'cell-ico' }) + '<span class="sr-only">' + esc(D.t('to_apply')) + ': </span><span>' + esc(time) + '</span></div>' +
        '<div class="brow-cell brow-docs' + (docs === 'Not listed' ? ' is-muted' : '') + '">' + D.icon('file-text', { size: 16, className: 'cell-ico' }) + '<span class="sr-only">' + esc(D.t('documents')) + ': </span><span>' + esc(docs) + '</span></div>' +
        '<div class="brow-cell brow-effort"><span class="sr-only">' + esc(D.t('effort')) + ': </span>' + effortHTML(b) + '</div>';
    return '<li class="brow' + (sel ? ' is-selected' : '') + (b.guide.generic ? ' is-generic' : '') + '" style="' + D.catVars(b.category) + '" data-bid="' + esc(b.id) + '">' +
      D.catTile(b, 'brow-tile') +
      '<div class="brow-name"><a class="row-link" id="row-' + esc(b.id) + '" href="#/benefit/' + esc(b.id) + '"' + (sel ? ' aria-current="true"' : '') + '>' + D.bdi(b.name) + '</a>' +
      '<span class="brow-sub">' + D.catLabel(b) + D.fitTag(b) + '</span>' +
      '<span class="brow-subtext" dir="auto">' + esc(b.sub) + '</span></div>' +
      '<div class="brow-worth"><span class="sr-only">Amount: </span>' + D.worthHTML(b) + '</div>' +
      '<div class="brow-meta">' + meta + '</div>' +
      '<div class="brow-track">' + D.trackBtn(b, { row: true }) + '</div>' +
      '</li>';
  }

  function listHTML(m) {
    var all = filtered(m);
    var limit = D.ui.bf.limit || PAGE_SIZE;
    var items = all.slice(0, limit);
    var selId = D.ui.panelId;
    if (!items.length) {
      return '<div class="empty-list">' + D.icon('search', { size: 24 }) + '<p><strong>No benefits match.</strong> Try another word or category.</p>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-action="bf-clear">' + esc('Clear search and filter') + '</button></div>';
    }
    return '<div class="blist-wrap"><div class="blist-head" aria-hidden="true">' +
      '<span></span><span>Benefit</span><span>Amount</span><span>' + esc(D.t('to_apply')) + '</span><span>' + esc(D.t('documents')) + '</span><span>' + esc(D.t('effort')) + '</span><span>' + esc(D.t('track')) + '</span></div>' +
      '<ul class="blist" id="blist" role="list">' + items.map(function (b) { return row(b, selId); }).join('') + '</ul></div>' +
      (all.length > items.length
        ? '<div class="list-more"><p class="list-more-text">Showing ' + items.length + ' of ' + all.length + '.</p>' +
          '<button type="button" class="btn btn-secondary" data-action="bf-more">' + D.icon('chevron-down', { size: 18 }) + '<span>Show ' + Math.min(PAGE_SIZE, all.length - items.length) + ' more</span></button></div>'
        : '');
  }

  function updateList() {
    var m = D.match();
    var wrap = document.getElementById('bf-list-wrap');
    if (!wrap) return;
    wrap.innerHTML = listHTML(m);
    var n = filtered(m).length;
    var count = document.getElementById('bf-count');
    if (count) count.textContent = n === m.open.length ? D.plural(n, 'benefit', 'benefits') : n + ' of ' + m.open.length + ' benefits match';
  }

  function blocked(m) {
    if (!m.blocked.length) return '';
    /* Two groups, each with its own reason: only the first group is on
       the public funds list. */
    var groups = [
      { kind: 'public-fund', title: 'Public funds', why: 'These are on the public funds list (paragraph 6.2 of the Immigration Rules). ' + nrpfWho(m) + ', so these are not open to you.' },
      { kind: 'needs-public-fund', title: 'Only for people who get a public fund', why: 'These are not public funds. But you usually need to get a public fund first, so they are not open to you in practice.' },
    ];
    var body = '';
    groups.forEach(function (g) {
      var items = m.blocked.filter(function (x) { return x.kind === g.kind; });
      if (!items.length) return;
      body += '<div class="blocked-group"><h3 class="blocked-h">' + esc(g.title) + ' <span class="count num">' + items.length + '</span></h3>' +
        '<p class="blocked-reason">' + esc(g.why) + '</p>' +
        '<ul class="mini-list" role="list">' + items.map(function (x) {
          var b = x.benefit;
          return '<li><a class="mini-row" href="#/benefit/' + esc(b.id) + '" style="' + D.catVars(b.category) + '">' + D.catTile(b, 'xs') +
            '<span class="mini-name">' + D.bdi(b.name) + '</span>' + D.dicon('chevron-right', { size: 16, className: 'mini-chev' }) + '</a></li>';
        }).join('') + '</ul></div>';
    });
    var open = !!D.ui.blockedOpen;
    return '<section class="card blocked" id="blocked-sec" aria-labelledby="blocked-toggle">' +
      '<button type="button" class="disclosure blocked-toggle" id="blocked-toggle" data-action="blocked-toggle" aria-expanded="' + open + '" aria-controls="blocked-body">' +
      '<span class="blocked-ico" aria-hidden="true">' + D.icon('lock', { size: 18 }) + '</span>' +
      '<span class="disclosure-text">Not open on your visa <span class="count num">' + m.blocked.length + '</span></span>' +
      D.icon('chevron-down', { size: 20, className: 'chev' }) +
      '<span class="disclosure-hint">Why these are not open to you</span>' +
      '</button>' +
      '<div class="blocked-body" id="blocked-body"' + (open ? '' : ' hidden') + '>' + body + '</div></section>';
  }

  /* ------------------------------------------------------------------ */
  /* Detail panel                                                        */
  /* ------------------------------------------------------------------ */

  function fact(icon, label, value, extra, muted) {
    return '<div class="fact"><dt>' + D.icon(icon, { size: 16 }) + '<span>' + esc(label) + '</span></dt>' +
      '<dd' + (muted ? ' class="is-muted"' : '') + ' dir="auto">' + esc(value) + (extra ? '<span class="fact-extra">' + extra + '</span>' : '') + '</dd></div>';
  }

  function standingBanner(b) {
    var st = D.standing(b);
    var m = D.match();
    if (st.state === 'blocked') {
      return '<div class="banner banner-quiet">' + D.icon('lock', { size: 18 }) + '<div><p class="banner-h">' + esc(D.t('not_open')) + '</p><p>' + esc(st.reason) + '</p></div></div>';
    }
    if (st.state === 'hidden') {
      var text = !m.known ? 'Whether this is open depends on your visa. Add your visa type in ' + D.t('nav_settings') + ' to check.'
        : 'This one does not match your answers, so it is not in your list. Check the rules below.';
      return '<div class="banner banner-quiet">' + D.icon('info', { size: 18 }) + '<div><p>' + esc(text) + '</p></div></div>';
    }
    if (b.nrpf === 'depends') {
      return '<div class="banner">' + D.icon('info', { size: 18 }) + '<div><p class="banner-h">It depends on your situation</p><p>Check the rules below and the official page before you apply.</p></div></div>';
    }
    if (b.publicFunds) return '<div class="banner">' + D.icon('info', { size: 18 }) + '<div><p>This is a public fund. Your status lets you get public funds, so it is in your list.</p></div></div>';
    return '<div class="banner banner-ok">' + D.icon('circle-check', { size: 18 }) + '<div><p>' + esc(D.t('not_public_fund')) + '</p></div></div>';
  }

  /* "What it is": the first sentences, then the rest behind "More detail". */
  function aboutHTML(b) {
    var text = b.about || b.sub || '';
    var parts = text.split(/(?<=[.!?])\s+(?=[A-Z(0-9£])/);
    var lead = '', i = 0;
    while (i < parts.length && (i === 0 || lead.length < 140)) {
      lead += (lead ? ' ' : '') + parts[i];
      i++;
      if (lead.length > 240) break;
    }
    var rest = parts.slice(i).join(' ');
    if (!rest || rest.length < 60) return '<p dir="auto">' + esc(text) + '</p>';
    return '<p dir="auto">' + esc(lead) + '</p>' +
      '<button type="button" class="link-btn" data-action="disclose" aria-expanded="false" aria-controls="bp-more">' + D.icon('chevron-down', { size: 16, className: 'chev' }) + '<span>More detail</span></button>' +
      '<div class="bp-more" id="bp-more" hidden><p dir="auto">' + esc(rest) + '</p></div>';
  }

  function claimHint(b) {
    return D.isTracked(b.id)
      ? '<span>You are tracking this. It is in your sidebar.</span> ' + D.untrackBtn(b, 'btn-ghost btn-sm')
      : '<span>Choosing one also adds this to Tracked applications.</span>';
  }

  function tabBtn(id, label, cur) {
    var on = cur === id;
    return '<button type="button" role="tab" class="tab" id="tab-' + id + '" aria-controls="tp-' + id + '" aria-selected="' + on + '" tabindex="' + (on ? '0' : '-1') + '" data-tab="' + id + '">' + esc(label) + '</button>';
  }

  function checkItem(b, d) {
    var on = D.checks(b.id).docs.indexOf(d.id) >= 0;
    var id = 'bpdoc-' + b.id + '-' + d.id;
    return '<li><label class="check" for="' + esc(id) + '"><input type="checkbox" id="' + esc(id) + '" data-action="doc" data-bid="' + esc(b.id) + '" data-doc="' + esc(d.id) + '"' + (on ? ' checked' : '') + '><span dir="auto">' + esc(d.label) + '</span></label></li>';
  }

  function stepsCount(b) {
    var done = D.checks(b.id).steps.filter(function (i) { return i < b.guide.steps.length; }).length;
    return done + ' of ' + b.guide.steps.length + ' ' + D.t('steps_done');
  }

  function claimSection(b) {
    var t = D.trackItem(b.id);
    var opts = L.trackStatuses.map(function (s) {
      var m = D.statusMeta[s.value];
      var id = 'claim-' + b.id + '-' + s.value.replace(/\s+/g, '-');
      return '<label class="seg-opt" for="' + esc(id) + '"><input type="radio" name="claim-' + esc(b.id) + '" id="' + esc(id) + '" value="' + esc(s.value) + '" data-action="claim" data-bid="' + esc(b.id) + '"' + (t && t.status === s.value ? ' checked' : '') + '>' +
        '<span class="seg-box">' + D.icon(m.icon, { size: 16 }) + '<span>' + esc(D.t(s.i18n)) + '</span></span></label>';
    }).join('');
    return '<section class="bp-sec claim" id="claim-sec">' +
      '<h3 class="bp-h" id="claim-h">' + esc(D.t('claim_status')) + '</h3>' +
      '<div class="seg" role="radiogroup" aria-labelledby="claim-h">' + opts + '</div>' +
      '<div class="bp-hint claim-hint" id="claim-hint">' + claimHint(b) + '</div>' +
      '</section>';
  }

  function overview(b, blocked) {
    var g = b.guide;
    var tips = (g.boost || []).slice();
    /* The catalog tip repeats a hand-written one too often: add it only
       where there is no hand-written guide. */
    if (b.strengthen && g.generic && tips.indexOf(b.strengthen) < 0) tips.push(b.strengthen);
    var who = b.who.indexOf('all') >= 0 ? '' : '<p class="bp-who">' + esc('Listed for: ' + b.who.map(function (k) { return L.statusLabel(k) || k; }).join(', ')) + '</p>';
    var html = '<section class="bp-sec"><h3 class="bp-h">' + esc(D.t('what_it_is')) + '</h3>' + aboutHTML(b) +
      (b.note ? '<p class="bp-note" dir="auto">' + esc(b.note) + '</p>' : '') + '</section>';
    /* Rules are conditions, not things already met: plain dots, no ticks. */
    html += '<section class="bp-sec"><h3 class="bp-h">' + esc(D.t('do_you_qualify')) + '</h3>' +
      (b.rules.length ? '<ul class="rules">' + b.rules.map(function (r) { return '<li dir="auto"><span class="rule-dot" aria-hidden="true"></span><span>' + esc(r) + '</span></li>'; }).join('') + '</ul>'
        : '<p class="bp-muted">No extra rules are listed. Check the official page.</p>') + who + '</section>';
    if (!blocked) html += claimSection(b);
    if (tips.length) {
      html += '<section class="bp-sec"><h3 class="bp-h">' + esc(D.t('improve')) + '</h3><ul class="tips">' +
        tips.map(function (x) { return '<li dir="auto">' + esc(x) + '</li>'; }).join('') + '</ul></section>';
    }
    if (g.watch) {
      html += '<section class="bp-sec bp-watch"><h3 class="bp-h">' + D.icon('flag', { size: 18 }) + '<span>' + esc(D.t('common_mistake')) + '</span></h3><p dir="auto">' + esc(g.watch) + '</p></section>';
    }
    if (b.sources && b.sources.length) {
      html += '<section class="bp-sec"><h3 class="bp-h">Sources</h3><ul class="sources">' + b.sources.map(function (u) {
        var host = u.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
        return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener" dir="ltr">' + D.icon('external-link', { size: 16 }) + '<span>' + esc(host) + '</span><span class="sr-only"> (opens in a new tab)</span></a></li>';
      }).join('') + '</ul></section>';
    }
    return html;
  }

  function howTo(b, blocked) {
    var g = b.guide, split = D.docsSplit(b);
    var html = '';
    if (blocked) html += '<p class="generic-note">' + D.icon('lock', { size: 18 }) + '<span>This is not open to you now because of your visa condition. The steps are here so you know how it works.</span></p>';
    if (g.generic) html += '<p class="generic-note">' + D.icon('info', { size: 18 }) + '<span>General steps. Landit does not have a detailed guide for this one yet. Check the official page for what to gather.</span></p>';
    html += '<section class="bp-sec"><h3 class="bp-h">' + esc(D.t('gather')) + '</h3>';
    if (split.needed.length) html += '<p class="group-h">' + esc(D.t('what_you_need')) + '</p><ul class="checks">' + split.needed.map(function (d) { return checkItem(b, d); }).join('') + '</ul>';
    if (split.maybe.length) html += '<p class="group-h">' + esc(D.t('maybe_needed')) + '</p><ul class="checks">' + split.maybe.map(function (d) { return checkItem(b, d); }).join('') + '</ul>';
    if (g.needNote) html += '<p class="bp-note" dir="auto">' + esc(g.needNote) + '</p>';
    else if (!b.docs.length) html += '<p class="bp-muted">' + esc(b.docsKnown ? 'Nothing to gather for this one.' : 'No document list yet. Check the official page.') + '</p>';
    if (b.docs.length && !blocked && !D.isTracked(b.id)) html += '<p class="bp-hint">' + esc('Track this to keep the checklist in your sidebar.') + '</p>';
    html += '</section>';
    html += '<section class="bp-sec"><h3 class="bp-h">' + esc(D.t('steps')) + '</h3>' +
      '<p class="bp-hint"><span id="steps-count" class="num">' + esc(stepsCount(b)) + '</span>. ' + esc(D.t('tap_step')) + '.</p>' +
      '<ol class="steps">' + g.steps.map(function (s, i) {
        var on = D.checks(b.id).steps.indexOf(i) >= 0;
        var id = 'bpstep-' + b.id + '-' + i;
        return '<li><label class="check step" for="' + esc(id) + '"><input type="checkbox" id="' + esc(id) + '" data-action="step" data-bid="' + esc(b.id) + '" data-idx="' + i + '"' + (on ? ' checked' : '') + '>' +
          '<span class="step-n num" aria-hidden="true">' + (i + 1) + '</span><span class="step-text" dir="auto">' + esc(s) + '</span></label></li>';
      }).join('') + '</ol></section>';
    return html;
  }

  function communityTab(b) {
    var html = '<section class="bp-sec">';
    html += D.ratingBlock ? D.ratingBlock(b.id, { inPanel: true }) : '';
    var posts = D.postsFor ? D.postsFor(b.id) : [];
    if (posts.length) {
      html += '<h3 class="bp-h">Posts about this</h3><ul class="mini-posts" role="list">' + posts.slice(0, 2).map(function (p) {
        return '<li class="mini-post"><p class="mini-post-head"><span class="avatar sm" aria-hidden="true">' + esc(D.initial(p.author)) + '</span><span class="mini-post-author" dir="auto">' + esc(p.author) + '</span>' +
          (p.sample ? '<span class="tag">' + esc(D.t('example_post')) + '</span>' : '') + '</p>' +
          (p.title ? '<p class="mini-post-title" dir="auto">' + esc(p.title) + '</p>' : '') +
          '<p class="mini-post-body" dir="auto">' + esc(p.body) + '</p></li>';
      }).join('') + '</ul>';
    } else {
      html += '<p class="bp-muted">No one has shared about this yet.</p>';
    }
    html += '<a class="btn btn-secondary" href="#/community/' + esc(b.id) + '">' + D.icon('users', { size: 18 }) + '<span>' + esc(posts.length ? 'See posts about this in Community' : D.t('write_post')) + '</span></a>';
    html += '<p class="bp-hint">' + esc(L.community.sampleNote) + '</p></section>';
    return html;
  }

  function detail(b) {
    var g = b.guide;
    var tab = D.ui.tab || 'overview';
    var st = D.standing(b);
    var blocked = st.state === 'blocked';
    var open = st.state === 'open';
    var rate = typeof b.statRate === 'number'
      ? fact('circle-check', D.t('published_rate'), Math.round(b.statRate * 100) + '%', b.stat ? '<span dir="auto">' + esc(b.stat) + '</span>' : '')
      : fact('circle-check', D.t('published_rate'), D.t('no_rate'), '', true);
    var w = D.worth(b);
    var worthK = blocked ? 'For people who can get it' : (w.kind === 'label' ? 'What you may get' : 'Could be worth');
    var worthBlock = w.kind === 'amount'
      ? '<p class="bp-worth-k">' + esc(worthK) + '</p><p class="bp-amount num">' + esc(w.amount) + '</p>' + (w.qual ? '<p class="bp-qual" dir="auto">' + esc(w.qual) + '</p>' : '')
      : (w.kind === 'label' ? '<p class="bp-worth-k">' + esc(worthK) + '</p><p class="bp-label-val" dir="auto">' + esc(w.text) + '</p>'
        : '<p class="bp-worth-k">' + esc(worthK) + '</p><p class="bp-label-val is-muted">' + esc(w.text) + '</p>');
    if (b.valueNote) {
      worthBlock += '<button type="button" class="link-btn bp-vn-btn" data-action="disclose" aria-expanded="false" aria-controls="bp-vn">' +
        D.icon('chevron-down', { size: 16, className: 'chev' }) + '<span>More about this amount</span></button>' +
        '<p class="bp-value-note" id="bp-vn" dir="auto" hidden>' + esc(b.valueNote) + '</p>';
    }
    /* The big "Apply" button is only for benefits in the person's list.
       A blocked public fund, or one that does not match the answers, gets
       a quiet link to read the official page instead. */
    var readLabel = D.lang() === 'en' ? 'Read the official page' : D.t('official_site');
    var applyLabel = D.lang() === 'en' ? 'Apply on the official site' : D.t('official_site');
    var ext = D.icon('external-link', { size: 18 }) + '<span class="sr-only"> (opens in a new tab)</span>';
    var apply = !b.applyUrl ? '<span class="bp-nolink">No official link listed</span>'
      : (open ? '<a class="btn btn-primary" id="bp-apply" href="' + esc(b.applyUrl) + '" target="_blank" rel="noopener"><span>' + esc(applyLabel) + '</span>' + ext + '</a>'
        : '<a class="btn btn-secondary bp-official" id="bp-apply" href="' + esc(b.applyUrl) + '" target="_blank" rel="noopener"><span>' + esc(readLabel) + '</span>' + ext + '</a>');
    var trackAction = blocked ? (D.isTracked(b.id) ? D.untrackBtn(b, 'btn-secondary') : '') : D.trackBtn(b, { cls: 'btn-secondary' });
    var fitTag = open && b.nrpf !== 'depends' ? D.fitTag(b) : '';
    return '<div class="bp" style="' + D.catVars(b.category) + '">' +
      '<div class="bp-scroll" id="bp-scroll">' +
      '<div class="bp-bar">' +
      '<a class="btn btn-ghost btn-sm bp-back" href="#/benefits" id="bp-back">' + D.dicon('arrow-left', { size: 18 }) + '<span>' + esc('Back to ' + D.t('nav_benefits')) + '</span></a>' +
      '<div class="bp-bar-end">' + D.readBtn('data-read="benefit" data-bid="' + esc(b.id) + '"') +
      '<a class="icon-btn bp-x" href="#/benefits" id="bp-x" aria-label="Close details">' + D.icon('x', { size: 20 }) + '</a></div>' +
      '</div>' +
      '<header class="bp-head">' + D.catTile(b, 'lg') +
      '<div class="bp-head-text">' + D.catLabel(b) +
      '<h2 class="bp-title" id="bp-title" tabindex="-1">' + D.bdi(b.name) + '</h2>' +
      (fitTag ? '<p class="bp-fit">' + fitTag + '</p>' : '') +
      '<p class="bp-sub" dir="auto">' + esc(b.sub) + '</p>' +
      '<p class="bp-region">' + D.icon('map-pin', { size: 16 }) + '<span>' + esc(b.regionLabel) + '</span></p></div></header>' +
      standingBanner(b) +
      '<div class="bp-worth">' + worthBlock + '</div>' +
      '<dl class="facts">' +
      fact('clock', D.t('to_apply'), g.time || 'Not listed', '', !g.time) +
      fact('hourglass', D.t('decision'), g.decision || 'Not listed', '', !g.decision) +
      fact('pound-sterling', D.t('cost'), g.cost || 'Not listed', '', !g.cost) +
      fact('file-text', D.t('documents'), D.docsText(b), '', D.docsText(b) === 'Not listed') +
      fact('footprints', D.t('effort'), b.effortLabel || 'Not listed', b.effortLabel ? esc(L.effortNote) : '', !b.effortLabel) +
      rate +
      '</dl>' +
      '<button type="button" class="btn btn-secondary bp-jump" data-action="bp-jump">' + D.icon('list-checks', { size: 18 }) + '<span>' + esc('See the steps and documents') + '</span></button>' +
      '<div class="tabs" role="tablist" aria-label="' + esc(b.name) + '" id="bp-tabs">' +
      tabBtn('overview', 'Overview', tab) + tabBtn('apply', D.t('how_to_apply'), tab) + tabBtn('community', D.t('nav_community'), tab) +
      '</div>' +
      '<div class="tabpanel" role="tabpanel" id="tp-overview" aria-labelledby="tab-overview" tabindex="0"' + (tab === 'overview' ? '' : ' hidden') + '>' + overview(b, blocked) + '</div>' +
      '<div class="tabpanel" role="tabpanel" id="tp-apply" aria-labelledby="tab-apply" tabindex="0"' + (tab === 'apply' ? '' : ' hidden') + '>' + howTo(b, blocked) + '</div>' +
      '<div class="tabpanel" role="tabpanel" id="tp-community" aria-labelledby="tab-community" tabindex="0"' + (tab === 'community' ? '' : ' hidden') + '>' + communityTab(b) + '</div>' +
      '<p class="disclaimer bp-disclaimer">' + esc(L.disclaimer) + '</p>' +
      '</div>' +
      '<div class="bp-actions' + (open ? '' : ' is-quiet') + '">' + trackAction +
      '<button type="button" class="btn btn-secondary" data-action="share" data-bid="' + esc(b.id) + '">' + D.icon('share-2', { size: 18 }) + '<span>' + esc(D.t('share')) + '</span></button>' +
      apply + '</div>' +
      '</div>';
  }

  function notFound(id) {
    return '<div class="bp"><div class="bp-scroll"><div class="bp-bar"><a class="btn btn-ghost btn-sm" href="#/benefits">' + D.dicon('arrow-left', { size: 18 }) + '<span>' + esc('Back to ' + D.t('nav_benefits')) + '</span></a></div>' +
      '<h2 class="bp-title" id="bp-title" tabindex="-1">We could not find that benefit</h2><p class="bp-muted">The link may be old: ' + esc(id) + '</p>' +
      '<p class="disclaimer bp-disclaimer">' + esc(L.disclaimer) + '</p></div></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Page                                                                */
  /* ------------------------------------------------------------------ */

  function build() {
    var m = D.match();
    var main = document.getElementById('main');
    main.innerHTML =
      '<div class="bf" id="bf-root" data-key="' + esc(D._match.key + D.lang()) + '" data-panel="false">' +
      '<div class="bf-list-col" id="bf-list-col"><div class="bf-inner">' +
      head(m) + glance(m) + chart(m) + toolbar(m) +
      '<div id="bf-list-wrap" class="bf-list-wrap"></div>' +
      blocked(m) +
      D.footer() +
      '</div></div>' +
      '<aside class="bf-panel" id="bf-panel" aria-label="Benefit details" hidden></aside>' +
      '</div>';
    updateList();
  }

  function setPanel(id, opts) {
    opts = opts || {};
    var root = document.getElementById('bf-root');
    var panel = document.getElementById('bf-panel');
    if (!root || !panel) return;
    var prev = D.ui.panelId;
    D.stopReading();
    D.$$('.brow.is-selected').forEach(function (r) { r.classList.remove('is-selected'); var a = r.querySelector('.row-link'); if (a) a.removeAttribute('aria-current'); });
    if (!id) {
      D.ui.panelId = null;
      root.setAttribute('data-panel', 'false');
      panel.hidden = true;
      panel.innerHTML = '';
      document.title = D.t('nav_benefits') + ' | Landit';
      if (prev) {
        var link = document.getElementById('row-' + prev);
        if (D.isPhone() && typeof D.ui.listScroll === 'number') window.scrollTo(0, D.ui.listScroll);
        if (link && !opts.initial) {
          link.focus({ preventScroll: !D.isPhone() });
          /* Keep the focused row in view for keyboard users. */
          var rr = link.closest('.brow');
          if (rr && !D.isPhone()) {
            var box = rr.getBoundingClientRect();
            if (box.top < 64 || box.bottom > window.innerHeight) rr.scrollIntoView({ block: 'center' });
          }
        }
      }
      return;
    }
    if (prev !== id) D.ui.tab = 'overview';
    if (!prev && D.isPhone()) D.ui.listScroll = window.scrollY;
    D.ui.panelId = id;
    var b = L.benefitById(id);
    root.setAttribute('data-panel', 'true');
    panel.hidden = false;
    panel.innerHTML = b ? detail(b) : notFound(id);
    document.title = (b ? b.name : 'Not found') + ' | Landit';
    var r = document.querySelector('.brow[data-bid="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (r) { r.classList.add('is-selected'); var a = r.querySelector('.row-link'); if (a) a.setAttribute('aria-current', 'true'); }
    var sc = document.getElementById('bp-scroll');
    if (sc) sc.scrollTop = 0;
    if (D.isPhone()) window.scrollTo(0, 0);
    if (!opts.initial) { var h = document.getElementById('bp-title'); if (h) h.focus({ preventScroll: true }); }
  }

  D.pages.benefits = function (r, opts) {
    opts = opts || {};
    var id = r.page === 'benefit' ? decodeURIComponent(r.arg || '') : null;
    D.setTitle(D.t('nav_benefits'), 'benefits');
    var root = document.getElementById('bf-root');
    var key = JSON.stringify(D.state.profile || {}) + D.lang();
    var same = root && root.getAttribute('data-key') === key && (D.prevPage === 'benefits' || D.prevPage === 'benefit');
    if (!same) { D.ui.panelId = null; build(); }
    setPanel(id, { initial: !opts.fromNav });
    /* The page handled focus itself when a panel opened or closed. */
    return same || !!id;
  };

  /* Redraw the open panel in place (keeps the tab). */
  D.rerenderPanel = function () {
    var panel = document.getElementById('bf-panel');
    var b = D.ui.panelId && L.benefitById(D.ui.panelId);
    if (!panel || !b) return;
    var sc = document.getElementById('bp-scroll');
    var top = sc ? sc.scrollTop : 0;
    panel.innerHTML = detail(b);
    sc = document.getElementById('bp-scroll');
    if (sc) sc.scrollTop = top;
  };

  /* Refresh bits of the open panel after tracking changes. */
  D.onTrackedChange = function () {
    var hint = document.getElementById('claim-hint');
    if (hint && D.ui.panelId) {
      var t = D.trackItem(D.ui.panelId);
      var b = L.benefitById(D.ui.panelId);
      if (b) hint.innerHTML = claimHint(b);
      D.$$('input[data-action="claim"]').forEach(function (x) { x.checked = !!t && x.value === t.status; });
    }
  };

  /* After "Stop tracking" outside the sidebar: tidy up and keep focus. */
  D.afterUntrack = function (id) {
    D.$$('.bcard [data-action="untrack"][data-bid="' + id + '"]').forEach(function (x) { x.remove(); });
    if (D.ui.panelId !== id) return;
    var b = L.benefitById(id);
    if (b && D.isBlocked(b)) D.rerenderPanel();
    var f = document.querySelector('.bp-actions [data-track]') || document.getElementById('bp-title');
    if (f) f.focus();
  };

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  var qTimer = null;
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'bf-q') {
      var v = e.target.value;
      clearTimeout(qTimer);
      qTimer = setTimeout(function () { D.ui.bf.q = v; D.ui.bf.limit = PAGE_SIZE; updateList(); }, 150);
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || !t.matches) return;
    if (t.id === 'bf-cat') { D.ui.bf.cat = t.value; D.ui.bf.limit = PAGE_SIZE; updateList(); return; }
    if (t.id === 'bf-sort') { D.ui.bf.sort = t.value; D.ui.bf.limit = PAGE_SIZE; updateList(); return; }
    if (t.matches('[data-action="claim"]')) { D.setStatus(t.getAttribute('data-bid'), t.value); return; }
    if (t.matches('[data-action="step"]')) {
      var bid = t.getAttribute('data-bid');
      D.toggleStep(bid, +t.getAttribute('data-idx'), t.checked);
      var c = document.getElementById('steps-count');
      var b = L.benefitById(bid);
      if (c && b) c.textContent = stepsCount(b);
    }
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var bar = t.closest('[data-action="bf-cat"]');
    if (bar) {
      D.ui.bf.cat = bar.getAttribute('data-cat');
      D.ui.bf.limit = PAGE_SIZE;
      var sel = document.getElementById('bf-cat');
      if (sel) sel.value = D.ui.bf.cat;
      updateList();
      var h = document.getElementById('list-h');
      if (h) { h.scrollIntoView({ behavior: D.reducedMotion() ? 'auto' : 'smooth', block: 'start' }); h.focus({ preventScroll: true }); }
      return;
    }
    if (t.closest('[data-action="bf-clear"]')) {
      D.ui.bf.q = ''; D.ui.bf.cat = 'all'; D.ui.bf.limit = PAGE_SIZE;
      var q = document.getElementById('bf-q'); if (q) q.value = '';
      var c = document.getElementById('bf-cat'); if (c) c.value = 'all';
      updateList();
      if (q) q.focus();
      return;
    }
    if (t.closest('[data-action="bf-more"]')) {
      var before = (D.ui.bf.limit || PAGE_SIZE);
      D.ui.bf.limit = before + PAGE_SIZE;
      updateList();
      /* Move focus to the first newly shown benefit. */
      var links = document.querySelectorAll('#blist .row-link');
      if (links[before]) links[before].focus();
      return;
    }
    var bm = t.closest('[data-action="bars-more"]');
    if (bm) {
      D.ui.chartAll = !D.ui.chartAll;
      var bars = document.getElementById('bars');
      if (bars) bars.classList.toggle('show-all', D.ui.chartAll);
      bm.setAttribute('aria-expanded', String(D.ui.chartAll));
      var n = document.querySelectorAll('#bars > li').length;
      bm.querySelector('span').textContent = D.ui.chartAll ? 'Show fewer categories' : 'Show all ' + n + ' categories';
      return;
    }
    var bt = t.closest('[data-action="blocked-toggle"]');
    if (bt) { D.ui.blockedOpen = D.toggleDisclosure(bt); return; }
    if (t.closest('[data-action="show-blocked"]')) {
      var tg = document.getElementById('blocked-toggle');
      if (tg) {
        D.ui.blockedOpen = D.toggleDisclosure(tg, true);
        tg.scrollIntoView({ behavior: D.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        tg.focus({ preventScroll: true });
      }
      return;
    }
    if (t.closest('[data-action="bp-jump"]')) {
      selectTab('apply', true);
      var tabsEl = document.getElementById('bp-tabs');
      if (tabsEl) tabsEl.scrollIntoView({ behavior: D.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    var tab = t.closest('.bp [role="tab"]');
    if (tab) { selectTab(tab.getAttribute('data-tab'), false); return; }
    var rd = t.closest('[data-action="read"][data-read="benefit"]');
    if (rd) {
      var b = L.benefitById(rd.getAttribute('data-bid'));
      if (b) {
        var w = D.worth(b);
        var parts = [b.name + '.', b.sub + '.'];
        if (D.isBlocked(b)) parts.push('This is not open to you now because of your visa condition.');
        else if (w.kind === 'amount') parts.push('It could be worth ' + w.amount + (w.qual ? ', ' + lc(w.qual) : '') + '.');
        else if (w.kind === 'label') parts.push(w.text + '.');
        if (b.about) parts.push(b.about);
        if (b.guide.time) parts.push('Time to apply: ' + b.guide.time + '.');
        D.readAloud(parts.join(' '), rd);
      }
    }
  });

  function selectTab(id, focus) {
    D.ui.tab = id;
    D.$$('.bp [role="tab"]').forEach(function (b) {
      var on = b.getAttribute('data-tab') === id;
      b.setAttribute('aria-selected', String(on));
      b.setAttribute('tabindex', on ? '0' : '-1');
      var p = document.getElementById(b.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
      if (on && focus) b.focus();
    });
  }

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('.bp [role="tab"]')) {
      var tabs = D.$$('.bp [role="tab"]');
      var i = tabs.indexOf(t);
      var rtl = D.isRtl();
      var nextKey = rtl ? 'ArrowLeft' : 'ArrowRight', prevKey = rtl ? 'ArrowRight' : 'ArrowLeft';
      var n = null;
      if (e.key === nextKey) n = tabs[(i + 1) % tabs.length];
      else if (e.key === prevKey) n = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') n = tabs[0];
      else if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n.getAttribute('data-tab'), true); }
      return;
    }
    if (e.key === 'Escape' && D.ui.panelId && !document.querySelector('dialog[open]')) {
      var menu = document.getElementById('avatar-menu');
      if (menu && !menu.hidden) return;
      var shell = document.getElementById('shell');
      if (shell && shell.getAttribute('data-drawer') === 'open') return;
      var panel = document.getElementById('bf-panel');
      if (panel && (panel.contains(document.activeElement) || document.activeElement === document.body)) {
        e.preventDefault();
        location.hash = '#/benefits';
      }
    }
  });
})();

/* Landit design A, "Paper": Benefits (the list) and one benefit (the detail).
   Every fact, amount, time and document comes from LANDIT. */
(function () {
  'use strict';
  var P = window.PAPER, L = P.L, esc = P.esc, icon = P.icon;

  var SORTS = [
    { id: 'value', key: 'sort_value' },
    { id: 'time', key: 'sort_time' },
    { id: 'docs', key: 'sort_docs' },
    { id: 'az', key: 'sort_az' },
  ];
  function isSmall() {
    try { return window.matchMedia('(max-width: 599.98px)').matches; } catch (e) { return false; }
  }
  /* Cards per category in the A to Z overview, and cards per page in a list. */
  function perGroup() { return isSmall() ? 2 : 3; }
  function pageSize() { return isSmall() ? 8 : 12; }

  P.catBadge = function (key, size) {
    var c = P.cat(key);
    return '<span class="cat-badge"><span class="cat-ico' + (size === 'sm' ? ' sm' : '') + '" aria-hidden="true">' + icon(c.icon, size === 'sm' ? 16 : 18) + '</span>' +
      '<span class="cat-label">' + esc(c.label) + '</span></span>';
  };

  /* "20 minutes" reads "20 minutes to apply"; phrases such as "One
     conversation" or "Nothing to do" are shown as they are. */
  function timeWords(t) {
    if (/^(about |under )?\d[\d\s]*(to \d+ )?(minutes?|hours?|days?)$/i.test(t)) return t + ' to apply';
    return t;
  }
  function docsWords(b) {
    var n = b.docs.length;
    if (n === 0) return 'No documents to gather';
    return n + (n === 1 ? ' document' : ' documents');
  }

  /* Only what is known, in words. One quiet line when nothing is known. */
  function facts(b) {
    var out = [];
    if (b.guide.time) out.push('<li class="fact">' + icon('clock', 16) + '<span><span class="sr-only">Time to apply: </span>' + esc(timeWords(b.guide.time)) + '</span></li>');
    if (b.docsKnown) out.push('<li class="fact">' + icon('file-text', 16) + '<span><span class="sr-only">Documents: </span>' + esc(docsWords(b)) + '</span></li>');
    if (b.effortLabel) out.push('<li class="fact effort e-' + b.effort + '">' + icon('footprints', 16) + '<span><span class="sr-only">Effort: </span>' + esc(b.effortLabel) + '</span></li>');
    if (!out.length) return '<p class="facts-none">' + icon('info', 16) + '<span>No step by step guide yet</span></p>';
    return '<ul class="facts">' + out.join('') + '</ul>';
  }

  function placeNote(b) {
    if (b.local || /only|council/i.test(b.regionLabel || '')) {
      return '<p class="bcard-place">' + icon('map-pin', 16) + '<span>' + esc(b.regionLabel) + '</span></p>';
    }
    return '';
  }

  P.trackButton = function (b, extraClass, fk) {
    var on = !!P.tracked(b.id);
    return '<button type="button" class="btn sm ' + (extraClass || '') + '" data-act="track" data-id="' + b.id + '"' + (fk ? ' data-fk="' + fk + '"' : '') + ' aria-pressed="' + on + '">' +
      '<span class="trk-ico">' + icon(on ? 'bookmark-check' : 'bookmark', 18) + '</span><span class="trk-label">' + esc(on ? P.t('tracking') : P.t('track')) + '</span>' +
      '<span class="sr-only"> ' + esc(b.name) + '</span></button>';
  };
  P.shareButton = function (b, extraClass, fk) {
    return '<button type="button" class="btn sm ' + (extraClass || '') + '" data-act="share" data-id="' + b.id + '"' + (fk ? ' data-fk="' + fk + '"' : '') + '>' +
      icon('share-2', 18) + '<span>' + esc(P.t('share')) + '</span><span class="sr-only"> ' + esc(b.name) + '</span></button>';
  };

  /* inCategory: the category is already named around the card, so the
     card keeps only its coloured icon. */
  P.benefitCard = function (b, inCategory) {
    var nid = 'bn-' + b.id, c = P.cat(b.category);
    return '<article class="bcard" data-id="' + b.id + '" data-cat="' + b.category + '" style="--c: var(--cat-' + b.category + ')" aria-labelledby="' + nid + '">' +
      '<div class="bcard-top">' +
        (inCategory ? '<span class="cat-ico sm" aria-hidden="true">' + icon(c.icon, 16) + '</span>' : P.catBadge(b.category, 'sm')) +
        P.fitTag(b.id) +
      '</div>' +
      '<div class="bcard-head">' +
        '<h3 class="bcard-name" id="' + nid + '"><a class="stretch" href="#/benefit/' + b.id + '">' + P.bdi(b.name) + '</a></h3>' +
        '<p class="bcard-sub">' + esc(b.sub) + '</p>' +
        placeNote(b) +
      '</div>' +
      '<div class="bcard-val">' + P.valueHtml(b) + '</div>' +
      facts(b) +
      '<div class="bcard-tools">' + P.trackButton(b, '', 'tr-' + b.id) + P.shareButton(b, '', 'sh-' + b.id) + '</div>' +
    '</article>';
  };

  /* ------------------------------------------------------------------ */
  /* The list                                                           */
  /* ------------------------------------------------------------------ */
  function headHtml(m) {
    var n = m.open.length;
    if (!m.known) {
      return '<h1 class="ben-title"><em>' + n + ' benefits</em> most people in the UK may be able to use</h1>' +
        '<div class="soft-note">' + icon('circle-help', 20) + '<div><p>You have not told us your visa type yet. Add it to see what fits you.</p>' +
        '<a class="btn sm primary" href="#/settings/edit/status">' + icon('plus', 16) + '<span>Add your visa type</span></a></div></div>';
    }
    var where = esc(L.statusPhrase(m.status)) + ' in ' + esc(m.nation) + '.';
    return '<h1 class="ben-title">You may be able to get <em>' + n + ' benefits</em></h1>' +
      '<p class="ben-meta">' + where +
        (m.nationAssumed ? ' We assumed England. <a href="#/settings/edit/nation">Tell us where you live</a>' : '') + '</p>';
  }

  /* One short line about the visa condition, built from what was left out. */
  function nrpfLine(m) {
    if (!m.known) return '';
    if (m.nrpf) {
      if (!m.blocked.length) return '';
      var who = m.status === 'asylum' ? 'While you wait for an asylum decision, you cannot get public funds' : 'Your visa says you cannot get public funds';
      return '<p class="nrpf-line">' + icon('scale', 18) + '<span>' + esc(who) + ', so Landit left out ' + m.blocked.length + (m.blocked.length === 1 ? ' benefit' : ' benefits') + '. ' +
        '<a href="#blocked" data-act="show-blocked">See which</a></span></p>';
    }
    return '<p class="nrpf-line">' + icon('scale', 18) + '<span>Your status lets you get public funds, so benefits based on income and savings are included.</span></p>';
  }

  function totalCard(m) {
    if (!m.total) return '';
    return '<div class="total-card">' +
      '<p class="total-label">' + esc(P.t('potential')) + '</p>' +
      '<p class="total-amt">' + esc(L.formatMoney(m.total)) + '</p>' +
      '<p class="total-sub">Adds up the ' + m.withValue + (m.withValue === 1 ? ' benefit' : ' benefits') + ' that have an amount. Many others have no set amount.</p>' +
    '</div>';
  }

  function blockedSection(m) {
    if (!m.blocked.length) return '';
    var kinds = [
      { kind: 'public-fund', title: 'On the public funds list', why: '' },
      { kind: 'needs-public-fund', title: 'Need a benefit you cannot get',
        why: 'These are not public funds themselves. But people with your condition cannot get them in practice, usually because you must already get another benefit first.' },
    ];
    var intro = m.status === 'asylum'
      ? 'While you wait for an asylum decision, you have a no recourse to public funds condition. So these are not open to you now.'
      : 'Your visa has a no recourse to public funds condition. So these are not open to you now.';
    return '<details class="blocked" id="blocked">' +
      '<summary><span class="blocked-ico" aria-hidden="true">' + icon('ban', 20) + '</span>' +
        '<span class="blocked-sum">' + esc(P.t('not_open')) + ' (' + m.blocked.length + ')</span>' +
        '<span class="blocked-chev" aria-hidden="true">' + icon('chevron-down', 20) + '</span></summary>' +
      '<div class="blocked-body">' +
        '<p class="blocked-why">' + esc(intro) + ' The list of public funds is in paragraph 6.2 of the Immigration Rules.</p>' +
        kinds.map(function (k) {
          var items = m.blocked.filter(function (x) { return x.kind === k.kind; });
          if (!items.length) return '';
          return '<div class="blocked-group"><h3>' + esc(k.title) + ' (' + items.length + ')</h3>' +
            (k.why ? '<p class="blocked-reason">' + esc(k.why) + '</p>' : '') +
            '<ul class="blocked-list">' + items.map(function (x) {
              var b = x.benefit, c = P.cat(b.category);
              return '<li style="--c: var(--cat-' + b.category + ')"><a href="#/benefit/' + b.id + '">' +
                '<span class="cat-ico sm" aria-hidden="true">' + icon(c.icon, 16) + '</span>' +
                '<span class="bl-name">' + P.bdi(b.name) + '</span>' +
                '<span class="bl-cat">' + esc(c.label) + '</span></a></li>';
            }).join('') + '</ul></div>';
        }).join('') +
      '</div></details>';
  }

  P.views.benefits = {
    auth: true,
    shell: true,
    render: function () {
      var m = P.match(), v = P.state.view;
      var sort = SORTS.some(function (s) { return s.id === v.sort; }) ? v.sort : 'value';
      var catKeys = Object.keys(L.categories).filter(function (k) { return m.open.some(function (b) { return b.category === k; }); });
      var cat = v.cat !== 'all' && catKeys.indexOf(v.cat) < 0 ? 'all' : v.cat;
      /* The person's own sort: sortBenefits alone (shared/README.md, section 7). */
      var sorted = L.sortBenefits(m.open, sort);
      var shown = cat === 'all' ? sorted : sorted.filter(function (b) { return b.category === cat; });

      var count = function (k) { return m.open.filter(function (b) { return b.category === k; }).length; };
      var chipsHtml = '<div class="chip-scroll"><div class="fchips" role="group" aria-label="' + esc(P.t('filter')) + ' by category">' +
        '<button type="button" class="fchip" data-act="filter" data-cat="all" data-fk="f-all" aria-pressed="' + (cat === 'all') + '">' +
          '<span>' + esc(P.t('all')) + '</span><span class="fchip-n">' + m.open.length + '</span></button>' +
        catKeys.map(function (k) {
          var c = P.cat(k);
          return '<button type="button" class="fchip" style="--c: var(--cat-' + k + ')" data-act="filter" data-cat="' + k + '" data-fk="f-' + k + '" aria-pressed="' + (cat === k) + '">' +
            '<span class="fchip-ico" aria-hidden="true">' + icon(c.icon, 16) + '</span><span>' + esc(c.label) + '</span><span class="fchip-n">' + count(k) + '</span></button>';
        }).join('') +
      '</div></div>';

      var sortHtml = '<div class="sort">' +
        '<label class="sort-label" for="sort-by">' + icon('arrow-up-down', 18) + '<span>' + esc(P.t('sort_by')) + '</span></label>' +
        '<span class="select-wrap"><select id="sort-by" class="select" data-change="sort">' + SORTS.map(function (s) {
          return '<option value="' + s.id + '"' + (s.id === sort ? ' selected' : '') + '>' + esc(P.t(s.key)) + '</option>';
        }).join('') + '</select>' + icon('chevron-down', 18, 'select-chev') + '</span></div>';

      /* A to Z over all benefits: browse by category. Any other choice:
         one ranked list, so the order shows what is worth most, or quickest. */
      var grouped = cat === 'all' && sort === 'az';
      var listHtml, effortShown = false;
      if (!shown.length) {
        listHtml = '<p class="empty-line">Nothing in this category.</p>';
      } else if (grouped) {
        var groups = [], byCat = {};
        shown.forEach(function (b) {
          if (!byCat[b.category]) { byCat[b.category] = { key: b.category, items: [] }; groups.push(byCat[b.category]); }
          byCat[b.category].items.push(b);
        });
        groups.sort(function (a, b) { return catKeys.indexOf(a.key) - catKeys.indexOf(b.key); });
        listHtml = groups.map(function (g) {
          var c = P.cat(g.key);
          var open = !!P.ui.groupOpen[g.key];
          var list = open ? g.items : g.items.slice(0, perGroup());
          var more = g.items.length > perGroup();
          list.forEach(function (b) { if (b.effortLabel) effortShown = true; });
          return '<section class="cat-group" style="--c: var(--cat-' + g.key + ')" aria-labelledby="g-' + g.key + '">' +
            '<h2 class="group-h" id="g-' + g.key + '"><span class="cat-ico" aria-hidden="true">' + icon(c.icon, 20) + '</span>' +
              '<span>' + esc(c.label) + '</span><span class="group-n">' + g.items.length + '</span></h2>' +
            '<div class="bgrid" id="grid-' + g.key + '">' + list.map(function (b) { return P.benefitCard(b, true); }).join('') + '</div>' +
            (more ? '<button type="button" class="btn more" data-act="group-more" data-cat="' + g.key + '" data-fk="more-' + g.key + '" aria-expanded="' + open + '" aria-controls="grid-' + g.key + '">' +
              (open ? 'Show fewer' : 'Show all ' + g.items.length + ' in ' + esc(c.label)) + icon(open ? 'chevron-up' : 'chevron-down', 18) + '</button>' : '') +
          '</section>';
        }).join('');
      } else {
        var limit = Math.max(P.ui.listLimit || 0, pageSize());
        var page = shown.slice(0, limit);
        var left = shown.length - page.length;
        page.forEach(function (b) { if (b.effortLabel) effortShown = true; });
        var catName = cat === 'all' ? '' : P.cat(cat).label;
        var sortName = P.t((SORTS.filter(function (s) { return s.id === sort; })[0] || SORTS[0]).key);
        listHtml = '<section class="ranked" aria-labelledby="list-h">' +
          /* The sort box and the chips already show this, so it is for screen readers. */
          '<h2 class="sr-only" id="list-h">' + (catName ? esc(catName) + ', ' + esc(sortName.charAt(0).toLowerCase() + sortName.slice(1)) : esc(sortName)) + ' first</h2>' +
          '<div class="bgrid" id="ranked-grid">' + page.map(function (b) { return P.benefitCard(b, !!catName); }).join('') + '</div>' +
          (left > 0 ? '<button type="button" class="btn more" data-act="list-more" data-fk="list-more" aria-controls="ranked-grid">' +
            'Show ' + Math.min(left, pageSize()) + ' more <span class="more-n">(' + left + ' not shown yet)</span>' + icon('chevron-down', 18) + '</button>' : '') +
        '</section>';
      }

      var effortNote = effortShown ? '<p class="effort-note">' + icon('footprints', 16) + '<span>Effort labels are Landit\'s own guide. ' + esc(L.effortNote) + '.</span></p>' : '';

      var html = '<div class="page ben-page">' +
        '<header class="ben-head">' +
          '<div class="ben-head-text">' +
            '<p class="eyebrow">' + esc(P.t('nav_benefits')) + '</p>' +
            headHtml(m) +
            nrpfLine(m) +
          '</div>' +
          totalCard(m) +
        '</header>' +
        '<div class="ben-controls">' + chipsHtml + sortHtml + '</div>' +
        effortNote +
        listHtml +
        blockedSection(m) +
        P.footer() +
      '</div>';
      return { nav: 'benefits', title: P.t('nav_benefits'), html: html };
    },
  };

  P.acts.filter = function (el) {
    P.state.view.cat = el.getAttribute('data-cat');
    P.ui.listLimit = 0;
    P.save();
    P.refresh();
    var chip = document.querySelector('.fchip[aria-pressed="true"]');
    if (chip && chip.scrollIntoView) {
      try { chip.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* old browser */ }
    }
  };
  P.changes.sort = function (el) {
    P.state.view.sort = el.value;
    P.ui.listLimit = 0;
    P.save();
    P.refresh();
  };
  P.acts['group-more'] = function (el) {
    var k = el.getAttribute('data-cat');
    P.ui.groupOpen[k] = !P.ui.groupOpen[k];
    P.refresh();
  };
  P.acts['list-more'] = function () {
    var before = document.querySelectorAll('#ranked-grid .bcard').length;
    P.ui.listLimit = before + pageSize();
    P.refresh();
    /* Carry on from the first new card. */
    var next = document.querySelectorAll('#ranked-grid .bcard .stretch')[before];
    if (next) next.focus({ preventScroll: false });
  };
  P.acts['show-blocked'] = function (el, e) {
    var d = document.getElementById('blocked');
    if (!d) return;
    e.preventDefault();
    d.open = true;
    d.scrollIntoView({ behavior: P.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    var s = d.querySelector('summary');
    if (s) s.focus({ preventScroll: true });
  };

  /* ------------------------------------------------------------------ */
  /* One benefit                                                        */
  /* ------------------------------------------------------------------ */
  function hostOf(url) {
    try { var u = new URL(url); return (u.hostname.replace(/^www\./, '') + (u.pathname.length > 1 ? u.pathname : '')).replace(/\/$/, ''); }
    catch (e) { return url; }
  }
  /* What to say when a fact is not in Landit's guide. */
  function unknownText(b) { return b.applyUrl ? 'Check the official page' : 'Not known yet'; }

  function glance(b, blocked) {
    var v = P.value(b);
    var worth;
    if (v.kind === 'amount') {
      var q = v.label || '';
      /* Someone who cannot get it is told whose amount this is. */
      var lead = blocked ? 'Worth, for people who can get it' : 'Could be worth';
      if (/^could be worth/i.test(q)) q = q.replace(/^could be worth,?\s*/i, '');
      worth = '<p class="g-label">' + icon('pound-sterling', 16) + '<span>' + lead + '</span></p><p class="g-big money">' + esc(v.amount) + '</p>' + (q ? '<p class="g-sub">' + esc(q.charAt(0).toUpperCase() + q.slice(1)) + '</p>' : '');
    } else if (v.kind === 'label') {
      worth = '<p class="g-label">' + icon('pound-sterling', 16) + '<span>What you get</span></p><p class="g-big text">' + esc(v.label) + '</p>';
    } else {
      worth = '<p class="g-label">' + icon('pound-sterling', 16) + '<span>Worth</span></p><p class="g-big text muted">' + esc(P.t('no_amount')) + '</p>';
    }
    var time = b.guide.time
      ? '<p class="g-big text">' + esc(b.guide.time) + '</p>' +
        (b.guide.decision ? '<p class="g-sub">' + esc(P.t('decision')) + ': ' + P.bdi(b.guide.decision) + '</p>' : '') +
        (b.guide.cost ? '<p class="g-sub">' + esc(P.t('cost')) + ': ' + P.bdi(b.guide.cost) + '</p>' : '')
      : '<p class="g-big text muted">' + esc(unknownText(b)) + '</p>';
    var docs = b.docsKnown
      ? '<p class="g-big money">' + b.docs.length + '</p>' +
        (b.effortLabel ? '<p class="g-sub effort-sub"><span class="fact effort e-' + b.effort + '">' + icon('footprints', 15) + '<span>' + esc(b.effortLabel) + '</span></span></p>' : '')
      : '<p class="g-big text muted">' + esc(unknownText(b)) + '</p>';
    return '<section class="glance" aria-labelledby="glance-h">' +
      '<h2 class="glance-h" id="glance-h">At a glance</h2>' +
      '<div class="glance-grid">' +
        '<div class="g-cell">' + worth + '</div>' +
        '<div class="g-cell"><p class="g-label">' + icon('clock', 16) + '<span>Time to apply</span></p>' + time + '</div>' +
        '<div class="g-cell"><p class="g-label">' + icon('file-text', 16) + '<span>' + esc(P.t('documents')) + '</span></p>' + docs + '</div>' +
      '</div>' +
      (b.effortLabel ? '<p class="g-note">' + icon('info', 16) + '<span>Effort: ' + esc(L.effortNote.charAt(0).toLowerCase() + L.effortNote.slice(1)) + '.</span></p>' : '') +
    '</section>';
  }

  function claimControl(b) {
    var t = P.tracked(b.id), cur = t ? t.status : null;
    return '<section class="claim d-sec" aria-labelledby="claim-h">' +
      '<h2 class="d-h" id="claim-h">' + esc(P.t('claim_status')) + '</h2>' +
      '<div class="seg" role="radiogroup" aria-labelledby="claim-h">' + L.trackStatuses.map(function (s) {
        return '<label class="seg-opt s-' + P.statusKey(s.value) + '"><input type="radio" name="claim" value="' + esc(s.value) + '" data-change="claim" data-id="' + b.id + '" data-fk="claim-' + P.statusKey(s.value) + '"' + (cur === s.value ? ' checked' : '') + '>' +
          '<span><span class="seg-dot" aria-hidden="true"></span>' + esc(P.t(s.i18n)) + '</span></label>';
      }).join('') + '</div>' +
      '<p class="claim-note" id="claim-note" role="status">' + (t ? 'This is in your Tracked applications.' : 'Choosing one adds this to your Tracked applications.') + '</p>' +
    '</section>';
  }

  function stepsSection(b) {
    var done = P.state.steps[b.id] || [];
    var steps = b.guide.steps || [];
    if (!steps.length) return '';
    return '<section class="d-sec" aria-labelledby="steps-h">' +
      '<h2 class="d-h" id="steps-h">' + esc(P.t('how_to_apply')) + '</h2>' +
      (b.guide.generic ? '<p class="d-muted">These are general steps. Landit has no step by step guide for this one yet.</p>' : '') +
      '<p class="d-muted">' + esc(P.t('tap_step')) + '.</p>' +
      '<ol class="steps">' + steps.map(function (s, i) {
        var on = done.indexOf(i) >= 0;
        return '<li class="step' + (on ? ' is-done' : '') + '"><label class="step-label">' +
          '<input type="checkbox" data-change="step" data-id="' + b.id + '" data-step="' + i + '" data-fk="step-' + i + '"' + (on ? ' checked' : '') + '>' +
          '<span class="step-num" aria-hidden="true"><span class="n">' + (i + 1) + '</span>' + icon('check', 16) + '</span>' +
          '<span class="step-text"><span class="sr-only">Step ' + (i + 1) + ': </span>' + esc(s) + '</span></label></li>';
      }).join('') + '</ol>' +
      '<p class="steps-done" id="steps-done" aria-live="polite">' + done.length + ' of ' + steps.length + ' ' + esc(P.t('steps_done')) + '</p>' +
    '</section>';
  }

  /* For a scheme the person cannot get: the same facts, nothing to tick. */
  function plainDocs(b) {
    if (!b.docsKnown) return '<p class="doc-none">Landit has no document list for this one yet.</p>';
    if (!b.docs.length) return '<p class="doc-none">' + esc(b.guide.needNote || 'There is nothing to gather for this one.') + '</p>';
    return '<ul class="plain-list">' + b.docs.map(function (d) { return '<li>' + esc(d.label) + '</li>'; }).join('') + '</ul>';
  }
  function plainSteps(b) {
    var steps = b.guide.steps || [];
    if (!steps.length) return '';
    return '<ol class="plain-list numbered">' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
  }

  /* How a "no recourse to public funds" condition meets this scheme. */
  function fundLine(b, m) {
    var en = P.lang() === 'en';
    if (b.publicFunds) {
      if (m.known && m.nrpf) return en ? 'A public fund, so your no recourse to public funds condition applies. It is not open to you now.' : P.t('is_public_fund');
      if (m.known) return 'A public fund. Your status lets you get public funds, but its own rules still apply.';
      return 'A public fund. People with a no recourse to public funds condition cannot get it.';
    }
    if (b.nrpf === 'no') return 'Not a public fund, but it needs a benefit that is one. People with no recourse to public funds usually cannot get it.';
    if (b.nrpf === 'depends') return 'Not a public fund. Whether you can get it with a no recourse to public funds condition depends on your situation.';
    return en ? 'Not a public fund, so a no recourse to public funds condition does not stop you. Its own rules still apply.' : P.t('not_public_fund');
  }

  /* Long catalog notes: the first part, then the rest behind "More detail". */
  function aboutHtml(b) {
    var words = b.about.split(/\s+/).length;
    if (words <= 60) return '<p class="d-text">' + esc(b.about) + '</p>';
    var parts = b.about.split(/(?<=[.!?])\s+(?=[A-Z\u00A3\d(])/);
    if (parts.length < 2) return '<p class="d-text">' + esc(b.about) + '</p>';
    var head = [], n = 0;
    while (parts.length > 1 && n < 20) { var s = parts.shift(); head.push(s); n += s.split(/\s+/).length; }
    return '<p class="d-text">' + esc(head.join(' ')) + '</p>' +
      '<details class="more-detail"><summary>' + icon('chevron-down', 18) + '<span>More detail</span></summary>' +
        '<p class="d-text">' + esc(parts.join(' ')) + '</p></details>';
  }

  function moreItem(id, title, ic, body) {
    return '<details class="acc" id="' + id + '"><summary><span class="acc-ico" aria-hidden="true">' + icon(ic, 18) + '</span>' +
      '<span class="acc-t">' + esc(title) + '</span><span class="acc-chev" aria-hidden="true">' + icon('chevron-down', 18) + '</span></summary>' +
      '<div class="acc-body">' + body + '</div></details>';
  }

  function speechFor(b) {
    var v = P.valueView(b), parts = [b.name + '.', b.sub + '.'];
    if (v.kind === 'amount') parts.push(v.lead + ' ' + v.amount + (v.after ? ', ' + v.after : '') + '.');
    else if (v.kind === 'label') parts.push(v.label + '.');
    if (P.fit(b.id) === 'possible') parts.push(L.fitLabel.possible + '.');
    parts.push(b.about);
    if (b.guide.time) parts.push('Time to apply: ' + b.guide.time + '.');
    if (b.docsKnown && b.docs.length) parts.push('You will need: ' + b.docs.map(function (d) { return d.label; }).join('. ') + '.');
    return parts.join(' ');
  }

  P.views.benefit = {
    auth: true,
    shell: true,
    render: function (r) {
      var b = L.benefitById(r.args[0]);
      if (!b) {
        return { nav: 'benefits', title: 'Not found', html: '<div class="page narrow"><h1 class="page-title">We could not find that benefit</h1>' +
          '<p class="nf-lede">The link may be old. Every benefit Landit lists for you is on the Benefits page.</p>' +
          '<p><a class="btn primary" href="#/benefits">' + icon('arrow-left', 18, 'flip-rtl') + '<span>Go to Benefits</span></a></p>' + P.footer() + '</div>' };
      }
      var m = P.match();
      var st = P.standing(b.id), on = !!P.tracked(b.id), t = P.tracked(b.id);
      /* Not open because of the visa condition. That includes a scheme hidden
         for another reason (age, children) that is also a public fund or
         needs one, for someone whose visa has the condition. */
      var gatedForMe = !!(m.known && m.nrpf && (b.publicFunds || b.nrpf === 'no'));
      var blocked = st.state === 'blocked' || (st.state === 'hidden' && gatedForMe);
      var key = 'detail-' + b.id;
      P.speechText[key] = function () { return speechFor(b); };

      var notice = '';
      if (blocked) {
        var adviser = L.benefitById('free-regulated-immigration-advice');
        var adviserOk = adviser && P.standing(adviser.id).state === 'open';
        notice = '<div class="notice">' + icon('ban', 20) + '<div><p class="notice-title">' + esc(P.t('not_open')) + '</p><p>' + esc(st.reason || fundLine(b, m)) + '</p>' +
          '<p class="notice-more">If your situation changes, check with a qualified adviser before you apply.' +
          (adviserOk ? ' <a href="#/benefit/' + adviser.id + '">' + P.bdi(adviser.name) + '</a>' : '') + '</p></div></div>';
      } else if (st.state === 'hidden') {
        notice = '<div class="notice">' + icon('info', 20) + '<div><p class="notice-title">Not in your list</p><p>Based on your answers, Landit does not list this one for you. You can still read about it.</p></div></div>';
      }
      var ticked = t ? t.ticked : [];

      /* Header actions. A benefit the person cannot get has no Official
         page shortcut and no Track (unless it is already tracked, so it can
         be removed). */
      var actions = (!blocked && b.applyUrl ? '<a class="btn" href="' + esc(b.applyUrl) + '" target="_blank" rel="noopener">' + icon('external-link', 18) + '<span>Official page</span><span class="sr-only"> (opens in a new tab)</span></a>' : '') +
        (!blocked || on ? P.trackButton(b, 'd-track', 'd-track').replace('btn sm ', 'btn ') : '') +
        P.shareButton(b, '', 'd-share').replace('btn sm ', 'btn ') +
        P.speakButton(key, 'btn-plain');

      var more = [];
      if (blocked) {
        more.push(moreItem('acc-need', 'What people need', 'file-text', plainDocs(b)));
        if ((b.guide.steps || []).length) more.push(moreItem('acc-steps', 'How people apply', 'list', plainSteps(b)));
      }
      more.push(moreItem('acc-facts', 'Time, decision and cost', 'clock',
        '<dl class="dl">' +
          '<div><dt>' + esc(P.t('to_apply')) + '</dt><dd>' + esc(b.guide.time || unknownText(b)) + '</dd></div>' +
          '<div><dt>' + esc(P.t('decision')) + '</dt><dd>' + esc(b.guide.decision || unknownText(b)) + '</dd></div>' +
          '<div><dt>' + esc(P.t('cost')) + '</dt><dd>' + esc(b.guide.cost || unknownText(b)) + '</dd></div>' +
          (typeof b.statRate === 'number' && b.stat
            ? '<div><dt>Published figure</dt><dd class="dd-text">' + esc(b.stat) + '</dd></div>'
            : '<div><dt>' + esc(P.t('published_rate')) + '</dt><dd>' + esc(L.noRateText) + '</dd></div>') +
        '</dl>'));
      var boost = (b.guide.boost || []).concat(b.strengthen && !(b.guide.boost || []).length ? [b.strengthen] : []);
      if (!blocked && boost.length) {
        more.push(moreItem('acc-boost', P.t('improve'), 'arrow-up', '<ul class="ticks tips">' + boost.map(function (x) {
          return '<li>' + icon('arrow-right', 18, 'flip-rtl') + '<span>' + esc(x) + '</span></li>';
        }).join('') + '</ul>'));
      }
      if (b.guide.watch) more.push(moreItem('acc-watch', P.t('common_mistake'), 'info', '<p>' + esc(b.guide.watch) + '</p>'));
      if (P.communitySnapshot) more.push(moreItem('acc-comm', 'What others said', 'users', P.communitySnapshot(b)));
      if (b.sources.length) {
        more.push(moreItem('acc-src', 'Sources', 'file-text', '<ul class="src-list">' +
          b.sources.map(function (s) { return '<li><a href="' + esc(s) + '" target="_blank" rel="noopener" dir="ltr">' + esc(hostOf(s)) + '<span class="sr-only"> (opens in a new tab)</span></a></li>'; }).join('') + '</ul>'));
      }

      var html = '<article class="page narrow detail" style="--c: var(--cat-' + b.category + ')">' +
        '<a class="back-link" href="#/benefits">' + icon('chevron-left', 18, 'flip-rtl') + '<span>' + esc(P.t('nav_benefits')) + '</span></a>' +
        '<header class="d-head">' +
          '<div class="d-tags">' + P.catBadge(b.category) + P.fitTag(b.id) + '</div>' +
          '<h1 class="d-title">' + P.bdi(b.name) + '</h1>' +
          '<p class="d-sub">' + esc(b.sub) + '</p>' +
          '<p class="d-place">' + icon('map-pin', 16) + '<span>' + esc(b.regionLabel) + '</span></p>' +
          '<div class="d-actions">' + actions + '</div>' +
        '</header>' +
        notice +
        glance(b, blocked) +
        (blocked ? '' : claimControl(b)) +
        '<section class="d-sec" aria-labelledby="what-h">' +
          '<h2 class="d-h" id="what-h">' + esc(P.t('what_it_is')) + '</h2>' +
          aboutHtml(b) +
          (b.valueNote ? '<p class="d-muted">About the amount: ' + esc(b.valueNote) + '.</p>' : '') +
          '<p class="fund-line">' + icon('scale', 18) + '<span>' + esc(fundLine(b, m)) + '</span></p>' +
        '</section>' +
        (b.rules.length ? '<section class="d-sec" aria-labelledby="rules-h"><h2 class="d-h" id="rules-h">Who can get it</h2>' +
          '<ul class="ticks">' + b.rules.map(function (x) { return '<li>' + icon('circle-check', 18) + '<span>' + esc(x) + '</span></li>'; }).join('') + '</ul></section>' : '') +
        (blocked ? '' :
          '<section class="d-sec" aria-labelledby="docs-h"><h2 class="d-h" id="docs-h">' + esc(P.t('what_you_need')) + '</h2>' +
            (b.docsKnown && b.docs.length ? '<p class="d-muted">Tick what you have. Ticks also show in Tracked applications.</p>' : '') +
            '<div class="d-docs">' + P.docGroups(b, ticked, 'd') + '</div>' +
            (b.docsKnown && b.docs.length && b.guide.needNote ? '<p class="d-muted">' + esc(b.guide.needNote) + '</p>' : '') +
          '</section>' +
          stepsSection(b)) +
        (b.applyUrl ? '<div class="apply-row">' +
          (blocked
            ? '<a class="btn" href="' + esc(b.applyUrl) + '" target="_blank" rel="noopener"><span>Read about it on the official site</span>' + icon('external-link', 18) + '<span class="sr-only"> (opens in a new tab)</span></a>'
            : '<a class="btn primary big" href="' + esc(b.applyUrl) + '" target="_blank" rel="noopener"><span>' + esc(P.lang() === 'en' ? 'Apply on the official site' : P.t('official_site')) + '</span>' + icon('external-link', 18) + '<span class="sr-only"> (opens in a new tab)</span></a>') +
          '<p class="d-muted">' + esc(hostOf(b.applyUrl)) + '</p></div>' : '') +
        '<section class="d-sec more-sec" aria-labelledby="more-h"><h2 class="d-h" id="more-h">More about this benefit</h2>' +
          '<div class="acc-group">' + more.join('') + '</div></section>' +
        P.footer() +
      '</article>';
      return { nav: 'benefits', title: b.name, html: html };
    },
  };

  P.changes.claim = function (el) {
    var id = el.getAttribute('data-id');
    var was = !!P.tracked(id);
    P.setStatus(id, el.value);
    var note = document.getElementById('claim-note');
    if (note) note.textContent = P.t('st_saved');
    if (!was) {
      P.toast('Added to Tracked applications');
      P.afterTrackChange(id);
      var again = document.getElementById('claim-note');
      if (again) again.textContent = P.t('st_saved');
    } else P.renderTracked();
  };
  P.changes.step = function (el) {
    var id = el.getAttribute('data-id'), i = parseInt(el.getAttribute('data-step'), 10);
    var list = P.state.steps[id] || (P.state.steps[id] = []);
    var at = list.indexOf(i);
    if (el.checked && at < 0) list.push(i);
    if (!el.checked && at >= 0) list.splice(at, 1);
    P.save();
    var li = el.closest('.step');
    if (li) li.classList.toggle('is-done', el.checked);
    var b = L.benefitById(id);
    var out = document.getElementById('steps-done');
    if (out && b) out.textContent = list.length + ' of ' + b.guide.steps.length + ' ' + P.t('steps_done');
  };
  /* The detail page re-renders when tracking changes, so its status control matches. */
  P.onTrackChange = function (id) {
    var r = P.parseRoute();
    if (r.name === 'benefit' && r.args[0] === id) P.refresh();
  };
})();

/* Landit, design B (Dusk): Community.
   Posts, comments and word ratings (worth, speed, ease). No numbers out of
   anything, no symbols, no ranking: ratings are word choices and the
   summaries are plain counts. Sample content is labelled. New posts,
   comments and ratings are saved in this browser only. */
(function () {
  'use strict';
  var D = window.DUSK, L = D.L;
  var esc = D.esc;
  var C = L.community;
  var SCALES = ['worth', 'speed', 'ease'];
  /* How each option reads in a sentence: "4 of 7 people said it was easy". */
  var SAY = {
    worth: ['very worth it', 'somewhat worth it', 'not really worth it'],
    speed: ['quick', 'average', 'slow'],
    ease: ['easy', 'OK', 'hard'],
  };

  D.ui.cm = D.ui.cm || { tab: 'posts', filter: 'all', open: {} };

  /* ------------------------------------------------------------------ */
  /* Data                                                                */
  /* ------------------------------------------------------------------ */

  D.allPosts = function () { return (D.state.community.posts || []).concat(C.posts); };
  D.postsFor = function (id) { return D.allPosts().filter(function (p) { return p.benefitId === id; }); };
  function commentsOf(p) { return (p.comments || []).concat(D.state.community.comments[p.id] || []); }

  D.ratingsFor = function (id) {
    var base = C.ratings[id];
    var mine = D.state.community.ratings[id];
    if (!base && !mine) return null;
    var out = { sample: !!base, mine: mine || null };
    SCALES.forEach(function (k) {
      var arr = base && base[k] ? base[k].slice() : [0, 0, 0];
      if (mine && typeof mine[k] === 'number') arr[mine[k]] += 1;
      out[k] = arr;
    });
    return out;
  };
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }

  function scaleRow(k, counts) {
    var sc = C.ratingScales[k];
    var text = sc.options.map(function (o, i) { return o + ': ' + counts[i]; }).join(', ');
    return '<div class="rt-scale">' +
      '<span class="rt-label">' + esc(sc.label) + '</span>' +
      '<span class="stack" aria-hidden="true">' + counts.map(function (c, i) { return '<i class="s' + (i + 1) + '" style="flex-grow:' + c + '"></i>'; }).join('') + '</span>' +
      '<span class="rt-counts"><span class="sr-only">' + esc(text) + '</span><span class="rt-keys" aria-hidden="true">' + sc.options.map(function (o, i) {
        return '<span class="rt-count"><i class="key s' + (i + 1) + '"></i>' + esc(o) + ' <strong class="num">' + counts[i] + '</strong></span>';
      }).join('') + '</span></span>' +
      '</div>';
  }

  D.ratingBlock = function (id, opts) {
    opts = opts || {};
    var r = D.ratingsFor(id);
    var b = L.benefitById(id);
    if (!b) return '';
    var rateBtn = '<button type="button" class="btn btn-secondary btn-sm" data-action="rate" data-bid="' + esc(id) + '">' + D.icon('pencil', { size: 16 }) +
      '<span>' + esc(r && r.mine ? 'Change your rating' : D.t('rate_this')) + '</span></button>';
    if (!r) {
      return opts.inPanel ? '<h3 class="bp-h">What people say</h3><p class="bp-muted">No ratings yet.</p><p>' + rateBtn + '</p>' : '';
    }
    var total = sum(r.ease);
    var lead = r.ease[0] + ' of ' + total + ' ' + (total === 1 ? 'person' : 'people') + ' said it was ' + SAY.ease[0] + '.';
    var mine = r.mine ? '<p class="rt-mine">' + D.icon('circle-check', { size: 16 }) + '<span>You said: ' + SCALES.filter(function (k) { return typeof r.mine[k] === 'number'; }).map(function (k) { return SAY[k][r.mine[k]]; }).join(', ') + '.</span></p>' : '';
    var nameLine = opts.inPanel
      ? '<h3 class="bp-h">What people say</h3>'
      : '<h3 class="rt-name-h"><a class="rt-name" href="#/benefit/' + esc(id) + '" style="' + D.catVars(b.category) + '">' + D.catTile(b, 'xs') + '<span>' + D.bdi(b.name) + '</span></a></h3>';
    return '<div class="rt">' + nameLine +
      '<p class="rt-lead">' + esc(lead) + (r.sample ? ' <span class="tag">Example</span>' : '') + '</p>' +
      SCALES.map(function (k) { return scaleRow(k, r[k]); }).join('') +
      mine + (opts.inPanel ? '<p>' + rateBtn + '</p>' : '<div class="rt-foot">' + rateBtn + '</div>') +
      '</div>';
  };

  /* ------------------------------------------------------------------ */
  /* Posts                                                               */
  /* ------------------------------------------------------------------ */

  function commentHTML(c) {
    return '<li class="comment"><span class="avatar sm" aria-hidden="true">' + esc(D.initial(c.author)) + '</span>' +
      '<div><p class="comment-head"><span class="comment-author" dir="auto">' + esc(c.author) + '</span><span class="comment-when">' + esc(c.when) + '</span></p>' +
      '<p class="comment-body" dir="auto">' + esc(c.body) + '</p></div></li>';
  }

  function postHTML(p) {
    var b = p.benefitId ? L.benefitById(p.benefitId) : null;
    var comments = commentsOf(p);
    var open = !!D.ui.cm.open[p.id];
    var cid = 'cm-c-' + p.id;
    return '<article class="post card" id="post-' + esc(p.id) + '" aria-label="' + esc('Post by ' + p.author) + '">' +
      '<header class="post-head"><span class="avatar" aria-hidden="true">' + esc(D.initial(p.author)) + '</span>' +
      '<div class="post-who"><span class="post-author" dir="auto">' + esc(p.author) + '</span><span class="post-when">' + esc(p.when) + '</span></div>' +
      (p.sample ? '<span class="tag">' + esc(D.t('example_post')) + '</span>' : '<span class="tag tag-accent">Your post</span>') +
      '</header>' +
      (b ? '<a class="post-benefit" href="#/benefit/' + esc(b.id) + '" style="' + D.catVars(b.category) + '">' + D.catTile(b, 'xs') + '<span>' + D.bdi(b.name) + '</span></a>' : '') +
      (p.title ? '<h3 class="post-title" dir="auto">' + esc(p.title) + '</h3>' : '') +
      '<p class="post-body" dir="auto">' + esc(p.body) + '</p>' +
      '<div class="post-foot"><button type="button" class="btn btn-ghost btn-sm" data-action="cm-comments" data-pid="' + esc(p.id) + '" aria-expanded="' + open + '" aria-controls="' + esc(cid) + '" id="cm-cbtn-' + esc(p.id) + '">' +
      D.icon('message-square', { size: 18 }) + '<span>' + esc(comments.length ? D.plural(comments.length, 'comment', 'comments') : D.t('comment')) + '</span></button></div>' +
      '<div class="comments" id="' + esc(cid) + '"' + (open ? '' : ' hidden') + '>' +
      (comments.length ? '<ul class="comment-list" role="list">' + comments.map(commentHTML).join('') + '</ul>' : '<p class="bp-muted">No comments yet.</p>') +
      '<form class="comment-form" data-pid="' + esc(p.id) + '"><label class="sr-only" for="cm-in-' + esc(p.id) + '">Write a comment</label>' +
      '<input class="input" id="cm-in-' + esc(p.id) + '" type="text" placeholder="Write a comment" autocomplete="off" dir="auto">' +
      '<button type="submit" class="btn btn-primary btn-sm">' + esc(D.t('comment')) + '</button></form>' +
      '</div></article>';
  }

  function filteredPosts() {
    var f = D.ui.cm.filter;
    var all = D.allPosts();
    if (f === 'all') return all;
    if (f === 'general') return all.filter(function (p) { return !p.benefitId; });
    return all.filter(function (p) { return p.benefitId === f; });
  }

  function filterOptions() {
    var counts = {}, general = 0, all = D.allPosts();
    all.forEach(function (p) { if (p.benefitId) counts[p.benefitId] = (counts[p.benefitId] || 0) + 1; else general++; });
    var f = D.ui.cm.filter;
    if (f !== 'all' && f !== 'general' && !counts[f] && L.benefitById(f)) counts[f] = 0;
    var ids = Object.keys(counts).sort(function (a, b) { return L.benefitById(a).name.localeCompare(L.benefitById(b).name, 'en-GB'); });
    return '<option value="all">' + esc('All posts (' + all.length + ')') + '</option>' +
      '<option value="general"' + (f === 'general' ? ' selected' : '') + '>' + esc('General tips (' + general + ')') + '</option>' +
      ids.map(function (id) { return '<option value="' + esc(id) + '"' + (f === id ? ' selected' : '') + '>' + esc(L.benefitById(id).name + ' (' + counts[id] + ')') + '</option>'; }).join('');
  }

  function feedHTML() {
    var posts = filteredPosts();
    if (!posts.length) return '<div class="empty-list">' + D.icon('message-square', { size: 24 }) + '<p><strong>No posts about this yet.</strong> You can be the first to share.</p></div>';
    return posts.map(postHTML).join('');
  }

  function benefitOptions(selected, emptyLabel) {
    var tracked = D.state.tracked.map(function (t) { return L.benefitById(t.id); }).filter(Boolean);
    var tids = tracked.map(function (b) { return b.id; });
    var open = L.sortBenefits(D.match().open, 'az').filter(function (b) { return tids.indexOf(b.id) < 0; });
    var opt = function (b) { return '<option value="' + esc(b.id) + '"' + (selected === b.id ? ' selected' : '') + '>' + esc(b.name) + '</option>'; };
    var extra = '';
    if (selected && tids.indexOf(selected) < 0 && !open.some(function (b) { return b.id === selected; }) && L.benefitById(selected)) extra = opt(L.benefitById(selected));
    return (emptyLabel !== null ? '<option value="">' + esc(emptyLabel) + '</option>' : '') + extra +
      (tracked.length ? '<optgroup label="' + esc(D.t('tracked_title')) + '">' + tracked.map(opt).join('') + '</optgroup>' : '') +
      '<optgroup label="Benefits you may be able to claim">' + open.map(opt).join('') + '</optgroup>';
  }

  function ratingsList() {
    var ids = Object.keys(C.ratings);
    Object.keys(D.state.community.ratings).forEach(function (id) { if (ids.indexOf(id) < 0 && L.benefitById(id)) ids.unshift(id); });
    ids.sort(function (a, b) {
      var ma = D.state.community.ratings[a] ? 1 : 0, mb = D.state.community.ratings[b] ? 1 : 0;
      return (mb - ma) || (sum(D.ratingsFor(b).ease) - sum(D.ratingsFor(a).ease));
    });
    return ids.map(function (id) { return '<li class="rt-item card-lite">' + D.ratingBlock(id) + '</li>'; }).join('');
  }

  /* ------------------------------------------------------------------ */
  /* Page                                                                */
  /* ------------------------------------------------------------------ */

  D.pages.community = function (r) {
    D.setTitle(D.t('nav_community'), 'community');
    if (r.arg) D.ui.cm.filter = decodeURIComponent(r.arg);
    else if (D.prevPage !== 'community') D.ui.cm.filter = 'all';
    var f = D.ui.cm.filter;
    var preset = f !== 'all' && f !== 'general' ? f : '';
    var tab = D.ui.cm.tab;
    var writeOpen = !!preset && D.postsFor(preset).length === 0;
    var main = document.getElementById('main');
    main.innerHTML =
      '<div class="cm" id="cm" data-tab="' + tab + '"><div class="cm-inner">' +
      '<section class="cm-head">' +
      '<h2 class="cm-title">Share what happened. Learn from others.</h2>' +
      '<p class="cm-lead">Read what people say about the benefits they applied for, and share your own.</p>' +
      '<p class="sample-banner"><span class="tag tag-strong">Examples</span><span>' + esc(C.sampleNote) + '</span></p>' +
      '</section>' +
      '<div class="cm-tabs" role="tablist" aria-label="Community">' +
      '<button type="button" role="tab" class="tab" id="cm-tab-posts" aria-controls="cm-posts" aria-selected="' + (tab === 'posts') + '" tabindex="' + (tab === 'posts' ? 0 : -1) + '" data-cmtab="posts">' + D.icon('message-square', { size: 18 }) + '<span>Posts</span></button>' +
      '<button type="button" role="tab" class="tab" id="cm-tab-ratings" aria-controls="cm-ratings" aria-selected="' + (tab === 'ratings') + '" tabindex="' + (tab === 'ratings' ? 0 : -1) + '" data-cmtab="ratings">' + D.icon('list-checks', { size: 18 }) + '<span>Ratings</span></button>' +
      '</div>' +
      '<div class="cm-grid">' +
      '<div class="cm-feed" id="cm-posts" role="tabpanel" aria-labelledby="cm-tab-posts">' +
      /* Posts come first; the form opens when someone wants to write. */
      '<button type="button" class="btn btn-secondary cm-write" id="cm-write" data-action="disclose" aria-expanded="' + writeOpen + '" aria-controls="cm-form">' +
      D.icon('pencil', { size: 18 }) + '<span>' + esc(D.t('write_post')) + '</span>' + D.icon('chevron-down', { size: 18, className: 'chev' }) + '</button>' +
      '<form class="card cm-composer" id="cm-form" novalidate' + (writeOpen ? '' : ' hidden') + '>' +
      '<label class="field-label" for="cm-text">What happened? What helped?</label>' +
      '<textarea class="input textarea" id="cm-text" rows="3" dir="auto" aria-describedby="cm-note cm-err"></textarea>' +
      '<p class="field-error" id="cm-err" hidden>Write a few words first.</p>' +
      '<div class="cm-form-row">' +
      '<div class="tool-field"><label class="tool-label" for="cm-benefit">About a benefit (optional)</label>' +
      '<span class="select-wrap"><select class="select" id="cm-benefit">' + benefitOptions(preset, 'No benefit, a general tip') + '</select>' + D.icon('chevron-down', { size: 18, className: 'select-chev' }) + '</span></div>' +
      '<button type="submit" class="btn btn-primary" id="cm-post">' + D.icon('send', { size: 18 }) + '<span>' + esc(D.t('post')) + '</span></button>' +
      '</div>' +
      '<p class="cm-note" id="cm-note">' + D.icon('lock', { size: 16 }) + '<span>' + esc(C.postingNote) + '</span></p>' +
      '</form>' +
      '<div class="feed-tools"><div class="tool-field"><label class="tool-label" for="cm-filter">Show posts about</label>' +
      '<span class="select-wrap"><select class="select" id="cm-filter">' + filterOptions() + '</select>' + D.icon('chevron-down', { size: 18, className: 'select-chev' }) + '</span></div></div>' +
      '<div class="feed" id="cm-feed">' + feedHTML() + '</div>' +
      '</div>' +
      '<aside class="cm-side" id="cm-ratings" role="tabpanel" aria-labelledby="cm-tab-ratings">' +
      '<div class="cm-side-inner">' +
      '<div class="cm-side-head"><h2 class="sec-h" id="rt-h">Ratings by benefit</h2>' +
      '<p class="card-sub">People rate with words, not numbers. Counts show how many people chose each word.</p>' +
      '<button type="button" class="btn btn-primary btn-block" data-action="rate" id="rate-open">' + D.icon('pencil', { size: 18 }) + '<span>Rate a benefit you applied for</span></button></div>' +
      '<ul class="rt-list" id="rt-list" role="list">' + ratingsList() + '</ul>' +
      '</div></aside>' +
      '</div>' +
      D.footer() +
      '</div></div>';
    syncCmRoles();
  };

  /* Tabs only exist on phones. On wider screens both columns show, so
     the tab roles come off and the headings label the sections. */
  function syncCmRoles() {
    var phone = D.isPhone();
    [['cm-posts', 'cm-tab-posts'], ['cm-ratings', 'cm-tab-ratings']].forEach(function (x) {
      var el = document.getElementById(x[0]);
      if (!el) return;
      if (phone) { el.setAttribute('role', 'tabpanel'); el.setAttribute('aria-labelledby', x[1]); }
      else { el.removeAttribute('role'); el.removeAttribute('aria-labelledby'); }
    });
    var side = document.getElementById('cm-ratings');
    if (side && !phone) side.setAttribute('aria-labelledby', 'rt-h');
  }
  try {
    var cmMq = window.matchMedia('(max-width: 899px)');
    var onCmMq = function () { syncCmRoles(); };
    if (cmMq.addEventListener) cmMq.addEventListener('change', onCmMq); else if (cmMq.addListener) cmMq.addListener(onCmMq);
  } catch (e) { /* ignore */ }

  function refreshFeed() {
    var feed = document.getElementById('cm-feed');
    if (feed) feed.innerHTML = feedHTML();
    var sel = document.getElementById('cm-filter');
    if (sel) sel.innerHTML = filterOptions();
  }
  function refreshRatings() {
    var list = document.getElementById('rt-list');
    if (list) list.innerHTML = ratingsList();
  }

  /* ------------------------------------------------------------------ */
  /* Rating dialog                                                       */
  /* ------------------------------------------------------------------ */

  function rateDialog(preId) {
    var tracked = D.state.tracked.filter(function (t) { return t.status !== 'Not started'; });
    var first = preId || (tracked[0] && tracked[0].id) || (D.state.tracked[0] && D.state.tracked[0].id) || '';
    var scales = SCALES.map(function (k) {
      var sc = C.ratingScales[k];
      return '<fieldset class="rate-q"><legend class="field-label">' + esc(sc.label) + '</legend><div class="rate-opts">' + sc.options.map(function (o, i) {
        var id = 'rate-' + k + '-' + i;
        return '<label class="opt" for="' + id + '"><input type="radio" name="rate-' + k + '" id="' + id + '" value="' + i + '">' +
          '<span class="opt-box">' + D.icon('check', { size: 16, className: 'opt-check' }) + '<span>' + esc(o) + '</span></span></label>';
      }).join('') + '</div></fieldset>';
    }).join('');
    D.dialog({
      title: esc(D.t('rate_this')),
      className: 'dlg-rate',
      html: '<p class="dlg-text">Choose the words that fit your experience. Your answer is added to the counts.</p>' +
        '<div class="field"><label class="field-label" for="rate-benefit">Which benefit did you apply for?</label>' +
        '<span class="select-wrap"><select class="select" id="rate-benefit">' + benefitOptions(first, first ? null : 'Choose a benefit') + '</select>' + D.icon('chevron-down', { size: 18, className: 'select-chev' }) + '</span></div>' +
        scales + '<p class="field-error" id="rate-err" hidden>Choose a benefit and at least one answer.</p>',
      actions: '<button type="button" class="btn btn-secondary" data-dlg-close>' + esc(D.t('cancel')) + '</button>' +
        '<button type="button" class="btn btn-primary" id="rate-save">' + esc(D.t('save')) + '</button>',
      focus: '#rate-benefit',
      onOpen: function (dlg, close) {
        var sel = dlg.querySelector('#rate-benefit');
        function fill() {
          var mine = D.state.community.ratings[sel.value] || {};
          SCALES.forEach(function (k) {
            D.$$('input[name="rate-' + k + '"]', dlg).forEach(function (x) { x.checked = typeof mine[k] === 'number' && +x.value === mine[k]; });
          });
        }
        sel.addEventListener('change', fill);
        fill();
        dlg.querySelector('#rate-save').addEventListener('click', function () {
          var id = sel.value;
          var val = {};
          SCALES.forEach(function (k) { var c = dlg.querySelector('input[name="rate-' + k + '"]:checked'); if (c) val[k] = +c.value; });
          var err = dlg.querySelector('#rate-err');
          if (!id || !Object.keys(val).length) { err.hidden = false; sel.focus(); return; }
          D.state.community.ratings[id] = val;
          D.save();
          close(true);
          refreshRatings();
          var panelRt = document.querySelector('#tp-community');
          if (panelRt && D.ui.panelId === id && D.rerenderPanel) D.rerenderPanel();
          D.toast('Thank you. Your rating is saved.');
        });
      },
    });
  }
  D.rateDialog = rateDialog;

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f) return;
    if (f.id === 'cm-form') {
      e.preventDefault();
      var ta = document.getElementById('cm-text');
      var err = document.getElementById('cm-err');
      var body = ta.value.trim();
      if (!body) { err.hidden = false; ta.focus(); return; }
      err.hidden = true;
      var bid = document.getElementById('cm-benefit').value || null;
      var u = D.state.user || {};
      var post = { id: 'u' + Date.now(), author: u.name || 'You', benefitId: bid, title: null, body: body, when: 'Just now', comments: [], sample: false };
      D.state.community.posts.unshift(post);
      D.save();
      ta.value = '';
      if (D.ui.cm.filter !== 'all' && D.ui.cm.filter !== bid) D.ui.cm.filter = 'all';
      refreshFeed();
      D.toast('Your post is on the page');
      var el = document.getElementById('post-' + post.id);
      if (el) { el.setAttribute('tabindex', '-1'); el.focus(); }
      return;
    }
    if (f.classList.contains('comment-form')) {
      e.preventDefault();
      var pid = f.getAttribute('data-pid');
      var input = f.querySelector('input');
      var text = input.value.trim();
      if (!text) { input.focus(); return; }
      var user = D.state.user || {};
      if (!D.state.community.comments[pid]) D.state.community.comments[pid] = [];
      D.state.community.comments[pid].push({ author: user.name || 'You', body: text, when: 'Just now' });
      D.save();
      D.ui.cm.open[pid] = true;
      var post2 = D.allPosts().filter(function (p) { return p.id === pid; })[0];
      var art = document.getElementById('post-' + pid);
      if (art && post2) {
        var w = document.createElement('div');
        w.innerHTML = postHTML(post2);
        art.replaceWith(w.firstChild);
      }
      var again = document.getElementById('cm-in-' + pid);
      if (again) again.focus();
      D.toast('Comment added');
    }
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var cb = t.closest('[data-action="cm-comments"]');
    if (cb) {
      var open = D.toggleDisclosure(cb);
      D.ui.cm.open[cb.getAttribute('data-pid')] = open;
      if (open) { var inp = document.getElementById('cm-in-' + cb.getAttribute('data-pid')); if (inp) inp.focus(); }
      return;
    }
    var rt = t.closest('[data-action="rate"]');
    if (rt) { rateDialog(rt.getAttribute('data-bid') || ''); return; }
    var tab = t.closest('[data-cmtab]');
    if (tab) { setCmTab(tab.getAttribute('data-cmtab'), true); }
  });

  function setCmTab(id, focus) {
    D.ui.cm.tab = id;
    var cm = document.getElementById('cm');
    if (cm) cm.setAttribute('data-tab', id);
    D.$$('[data-cmtab]').forEach(function (b) {
      var on = b.getAttribute('data-cmtab') === id;
      b.setAttribute('aria-selected', String(on));
      b.setAttribute('tabindex', on ? '0' : '-1');
      if (on && focus) b.focus();
    });
  }

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('[data-cmtab]') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End')) {
      e.preventDefault();
      setCmTab(t.getAttribute('data-cmtab') === 'posts' ? 'ratings' : 'posts', true);
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.id === 'cm-filter') {
      D.ui.cm.filter = t.value;
      var feed = document.getElementById('cm-feed');
      if (feed) feed.innerHTML = feedHTML();
      if (/^#\/community\/./.test(location.hash)) {
        try { history.replaceState(null, '', location.pathname + location.search + '#/community'); } catch (err) { /* ignore */ }
      }
    }
  });
})();

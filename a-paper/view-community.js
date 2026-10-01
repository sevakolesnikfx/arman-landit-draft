/* Landit design A, "Paper": Community.
   Posts, comments and word ratings. Ratings are words and plain counts:
   no marks out of five, no single number that ranks a scheme. */
(function () {
  'use strict';
  var P = window.PAPER, L = P.L, esc = P.esc, icon = P.icon;
  var C = L.community;
  var SCALES = ['worth', 'speed', 'ease'];
  var PHRASE = {
    worth: ['very much worth it', 'somewhat worth it', 'not really worth it'],
    speed: ['quick', 'average', 'slow'],
    ease: ['easy', 'OK', 'hard'],
  };
  /* "it was quick", "it took an average time" */
  function said(s, i) { return s === 'speed' && i === 1 ? 'it took an average time' : 'it was ' + PHRASE[s][i]; }
  var CAT_KEYS = Object.keys(L.categories);

  function avatarColour(name) {
    var h = 0;
    String(name).split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) >>> 0; });
    return CAT_KEYS[h % CAT_KEYS.length];
  }
  function avatar(name, cls) {
    return '<span class="avatar ' + (cls || '') + '" style="--c: var(--cat-' + avatarColour(name) + ')" aria-hidden="true">' + esc(String(name || '?').charAt(0).toUpperCase()) + '</span>';
  }

  function allPosts() {
    var mine = (P.state.community.posts || []).slice().reverse();
    return mine.concat(C.posts);
  }
  function commentsFor(p) {
    return (p.comments || []).concat(P.state.community.comments[p.id] || []);
  }

  /* Counts per option: the sample counts plus this person's own rating. */
  P.ratingCounts = function (id) {
    var base = C.ratings[id], mine = P.state.community.ratings[id];
    if (!base && !mine) return null;
    var out = { sample: !!base };
    SCALES.forEach(function (s) {
      var arr = base && base[s] ? base[s].slice() : [0, 0, 0];
      if (mine && typeof mine[s] === 'number') arr[mine[s]] += 1;
      out[s] = arr;
    });
    return out;
  };

  function scaleBlock(id, s, counts, compact) {
    var arr = counts[s], total = arr.reduce(function (a, b) { return a + b; }, 0);
    var scale = C.ratingScales[s];
    if (!total) {
      return '<div class="rscale"><p class="rscale-h">' + esc(scale.label) + '</p><p class="rscale-sum muted">No answers yet</p></div>';
    }
    var most = Math.max.apply(null, arr);
    var tops = [];
    arr.forEach(function (n, i) { if (n === most) tops.push(i); });
    var sum;
    if (tops.length === 1) {
      sum = most + ' of ' + total + (total === 1 ? ' person said ' : ' people said ') + said(s, tops[0]);
    } else {
      /* A tie: name every answer that was given as often. */
      var bits = tops.map(function (i, k) {
        return (k === 0 ? most + (most === 1 ? ' person said ' : ' people said ') : most + ' said ') + said(s, i);
      });
      sum = bits.slice(0, -1).join(', ') + ' and ' + bits[bits.length - 1];
    }
    return '<div class="rscale">' +
      '<p class="rscale-h">' + esc(scale.label) + '</p>' +
      '<p class="rscale-sum">' + esc(sum) + '</p>' +
      '<div class="rbar" aria-hidden="true">' + arr.map(function (n, i) {
        return n ? '<span class="rbar-seg t' + i + '" style="flex-grow:' + n + '"></span>' : '';
      }).join('') + '</div>' +
      (compact ? '' : '<p class="rlegend">' + scale.options.map(function (o, i) {
        return '<span><span class="rkey t' + i + '" aria-hidden="true"></span>' + esc(o) + ' ' + arr[i] + '</span>';
      }).join('') + '</p>') +
    '</div>';
  }

  /* Small summary used on the benefit detail page (inside "More about
     this benefit", which gives it its heading). */
  P.communitySnapshot = function (b) {
    var counts = P.ratingCounts(b.id);
    var posts = allPosts().filter(function (p) { return p.benefitId === b.id; });
    return '<div class="snap">' +
      (counts && counts.sample ? '<p class="sample-tag">' + icon('info', 16) + '<span>Sample posts and ratings</span></p>' : '') +
      (counts ? '<div class="rgrid compact">' + SCALES.map(function (s) { return scaleBlock(b.id, s, counts, true); }).join('') + '</div>'
        : '<p class="d-muted">No one has rated this yet.</p>') +
      '<div class="snap-actions">' +
        (posts.length ? '<a class="btn sm" href="#/community/' + b.id + '">' + icon('message-square', 18) + '<span>Read ' + posts.length + (posts.length === 1 ? ' post' : ' posts') + '</span></a>' : '') +
        '<button type="button" class="btn sm" data-act="rate" data-id="' + b.id + '">' + icon('message-circle', 18) + '<span>' + esc(P.t('rate_this')) + '</span></button>' +
      '</div>' +
    '</div>';
  };

  function postHtml(p) {
    var b = p.benefitId ? L.benefitById(p.benefitId) : null;
    var cs = commentsFor(p);
    var open = !!(P.ui.commentsOpen && P.ui.commentsOpen[p.id]);
    var cid = 'cm-' + p.id;
    return '<article class="post" aria-labelledby="pt-' + p.id + '">' +
      /* Sample posts are labelled once, by the note at the top of the page.
         The person's own posts say so. */
      '<header class="post-head">' + avatar(p.author) +
        '<div class="post-who"><p class="post-author">' + esc(p.author) + '</p><p class="post-when">' + esc(p.when) + '</p></div>' +
        (p.sample ? '' : '<span class="tag-quiet">Your post</span>') +
      '</header>' +
      (b ? '<a class="btag" href="#/benefit/' + b.id + '" style="--c: var(--cat-' + b.category + ')"><span class="cat-ico sm" aria-hidden="true">' + icon(P.cat(b.category).icon, 14) + '</span>' + P.bdi(b.name) + '</a>' : '') +
      '<h3 class="post-title" id="pt-' + p.id + '">' + esc(p.title) + '</h3>' +
      '<p class="post-body">' + esc(p.body) + '</p>' +
      '<div class="post-foot">' +
        '<button type="button" class="btn sm quiet" data-act="comments" data-id="' + p.id + '" data-fk="cbtn-' + p.id + '" aria-expanded="' + open + '" aria-controls="' + cid + '">' +
          icon('message-square', 18) + '<span>' + cs.length + (cs.length === 1 ? ' comment' : ' comments') + '</span>' + icon(open ? 'chevron-up' : 'chevron-down', 16) + '</button>' +
      '</div>' +
      '<div class="comments" id="' + cid + '"' + (open ? '' : ' hidden') + '>' +
        (cs.length ? '<ul class="comment-list">' + cs.map(function (c) {
          return '<li class="comment">' + avatar(c.author, 'sm') + '<div><p class="c-meta"><span class="c-author">' + esc(c.author) + '</span><span class="c-when">' + esc(c.when) + '</span></p><p class="c-body">' + esc(c.body) + '</p></div></li>';
        }).join('') + '</ul>' : '<p class="d-muted">No comments yet.</p>') +
        '<form class="comment-form" data-form="comment" data-id="' + p.id + '">' +
          '<label class="sr-only" for="cf-' + p.id + '">Write a comment</label>' +
          '<input class="input" id="cf-' + p.id + '" data-fk="cf-' + p.id + '" placeholder="Write a comment" autocomplete="off">' +
          '<button type="submit" class="btn primary">' + esc(P.t('comment')) + '</button>' +
        '</form>' +
      '</div>' +
    '</article>';
  }

  function benefitOptions(selected, list) {
    var m = P.match();
    var trackedIds = P.state.tracked.map(function (t) { return t.id; }).filter(function (id) { return L.benefitById(id); });
    var rest = L.sortBenefits(m.open.filter(function (b) { return trackedIds.indexOf(b.id) < 0; }), 'az');
    var opt = function (b) { return '<option value="' + b.id + '"' + (b.id === selected ? ' selected' : '') + '>' + esc(b.name) + '</option>'; };
    var out = '';
    if (trackedIds.length) out += '<optgroup label="' + esc(P.t('tracked_title')) + '">' + trackedIds.map(function (id) { return opt(L.benefitById(id)); }).join('') + '</optgroup>';
    out += '<optgroup label="' + esc(P.t('nav_benefits')) + '">' + rest.map(opt).join('') + '</optgroup>';
    return out;
  }

  function composer() {
    var open = !!P.ui.composerOpen;
    return '<section class="compose' + (open ? ' is-open' : '') + '" aria-labelledby="write-h">' +
      '<div class="compose-head">' + avatar(P.firstName() || P.initial()) +
        '<h2 class="compose-h" id="write-h">' + esc(P.t('write_post')) + '</h2>' +
        (open ? '' : '<button type="button" class="btn primary" data-act="compose-open" data-fk="compose-open" aria-expanded="false" aria-controls="post-form">' + icon('pencil', 18) + '<span>Write a post</span></button>') +
      '</div>' +
      '<form class="post-form" id="post-form" data-form="post" novalidate' + (open ? '' : ' hidden') + '>' +
        '<div class="field"><label class="field-label" for="p-title">Title</label><input class="input" id="p-title" maxlength="120" placeholder="For example: How I got my railcard"></div>' +
        '<div class="field"><label class="field-label" for="p-body">What happened? What would help others?</label><textarea class="input" id="p-body" rows="4" aria-describedby="post-err"></textarea></div>' +
        '<div class="field"><label class="field-label" for="p-tag">About a benefit (you can leave this empty)</label>' +
          '<span class="select-wrap"><select class="select" id="p-tag"><option value="">No benefit</option>' + benefitOptions(P.ui.composeTag || '') + '</select>' + icon('chevron-down', 18, 'select-chev') + '</span></div>' +
        '<p class="posting-note">' + icon('lock', 16) + '<span>' + esc(C.postingNote) + '</span></p>' +
        '<p class="field-error" id="post-err" role="alert" hidden>Write a few words before you post.</p>' +
        '<div class="form-actions"><button type="button" class="btn" data-act="compose-cancel">' + esc(P.t('cancel')) + '</button>' +
          '<button type="submit" class="btn primary">' + esc(P.t('post')) + '</button></div>' +
      '</form>' +
    '</section>';
  }

  function ratingsView() {
    var m = P.match();
    var ids = Object.keys(C.ratings).concat(Object.keys(P.state.community.ratings).filter(function (id) { return !C.ratings[id]; }))
      .filter(function (id) { return L.benefitById(id); });
    return '<div class="rate-cta">' +
        '<div><p class="rate-cta-h">Applied for a benefit?</p><p>Tell others if it was worth it, how quick it was and how easy. You choose words, not numbers.</p></div>' +
        '<button type="button" class="btn primary" data-act="rate">' + icon('message-circle', 18) + '<span>Rate a benefit</span></button>' +
      '</div>' +
      '<ul class="rlist">' + ids.map(function (id) {
        var b = L.benefitById(id), counts = P.ratingCounts(id), mine = P.state.community.ratings[id];
        return '<li class="rcard" style="--c: var(--cat-' + b.category + ')">' +
          '<div class="rcard-head">' + P.catBadge(b.category, 'sm') +
            (mine ? '<span class="tag-quiet">' + icon('check', 14) + 'Your rating is included</span>' : '') + '</div>' +
          '<h3 class="rcard-name"><a href="#/benefit/' + b.id + '">' + P.bdi(b.name) + '</a></h3>' +
          '<div class="rgrid">' + SCALES.map(function (s) { return scaleBlock(id, s, counts, false); }).join('') + '</div>' +
        '</li>';
      }).join('') + '</ul>';
  }

  P.views.community = {
    auth: true,
    shell: true,
    render: function (r) {
      var tab = r.args[0] === 'ratings' ? 'ratings' : 'posts';
      var filter = tab === 'posts' && r.args[0] && L.benefitById(r.args[0]) ? r.args[0] : '';
      var posts = allPosts();
      var withTags = [];
      posts.forEach(function (p) { if (p.benefitId && withTags.indexOf(p.benefitId) < 0 && L.benefitById(p.benefitId)) withTags.push(p.benefitId); });
      var shown = filter ? posts.filter(function (p) { return p.benefitId === filter; }) : posts;

      var filterHtml = '<div class="comm-filter">' +
        '<label class="field-label" for="comm-filter">Show posts about</label>' +
        '<span class="select-wrap"><select class="select" id="comm-filter" data-change="comm-filter">' +
          '<option value="">All benefits</option>' +
          withTags.map(function (id) { return '<option value="' + id + '"' + (id === filter ? ' selected' : '') + '>' + esc(L.benefitById(id).name) + '</option>'; }).join('') +
        '</select>' + icon('chevron-down', 18, 'select-chev') + '</span></div>';

      var html = '<div class="page narrow comm">' +
        '<header class="page-head">' +
          '<p class="eyebrow">' + esc(P.t('nav_community')) + '</p>' +
          '<h1 class="page-title">Stories and tips from people like you</h1>' +
          '<p class="lede">Share what happened when you applied, and read how it went for others.</p>' +
          '<p class="sample-tag">' + icon('info', 16) + '<span><strong>Sample posts and ratings.</strong> ' + esc(C.sampleNote) + '</span></p>' +
        '</header>' +
        '<nav class="tabs" aria-label="Community view">' +
          '<a href="#/community" class="tab"' + (tab === 'posts' ? ' aria-current="page"' : '') + '>' + icon('message-square', 18) + '<span>Posts</span></a>' +
          '<a href="#/community/ratings" class="tab"' + (tab === 'ratings' ? ' aria-current="page"' : '') + '>' + icon('list', 18) + '<span>Ratings</span></a>' +
        '</nav>' +
        (tab === 'posts'
          ? composer() + filterHtml + '<h2 class="sr-only">Posts</h2><div class="feed">' + (shown.length ? shown.map(postHtml).join('') : '<p class="empty-line">No posts about this yet.</p>') + '</div>'
          : '<h2 class="sr-only">Ratings</h2>' + ratingsView()) +
        P.footer() +
      '</div>';
      return { nav: 'community', title: P.t('nav_community'), html: html };
    },
  };

  P.changes['comm-filter'] = function (el) {
    P.go(el.value ? '#/community/' + el.value : '#/community');
  };
  P.acts.comments = function (el) {
    var id = el.getAttribute('data-id');
    P.ui.commentsOpen = P.ui.commentsOpen || {};
    P.ui.commentsOpen[id] = !P.ui.commentsOpen[id];
    P.refresh();
  };
  P.acts['compose-open'] = function () {
    P.ui.composerOpen = true;
    P.refresh();
    var t = document.getElementById('p-title');
    if (t) t.focus();
  };
  P.acts['compose-cancel'] = function () {
    P.ui.composerOpen = false;
    P.refresh();
    var b = document.querySelector('[data-act="compose-open"]');
    if (b) b.focus();
  };
  P.forms.post = function (form) {
    var title = form.querySelector('#p-title').value.trim();
    var body = form.querySelector('#p-body').value.trim();
    var tag = form.querySelector('#p-tag').value;
    if (!body) {
      var err = document.getElementById('post-err');
      if (err) err.hidden = false;
      form.querySelector('#p-body').focus();
      return;
    }
    P.state.community.posts.push({
      id: 'u' + P.uid(), author: P.firstName() || 'You', benefitId: tag || null,
      title: title || body.split(/[.!?]/)[0].slice(0, 80), body: body, when: 'Just now', comments: [], sample: false,
    });
    P.save();
    P.ui.composerOpen = false;
    if (P.parseRoute().args.length) P.go('#/community');
    else P.refresh();
    P.toast('Your post is shared');
  };
  P.forms.comment = function (form) {
    var id = form.getAttribute('data-id');
    var input = form.querySelector('input');
    var text = input.value.trim();
    if (!text) { input.focus(); return; }
    var list = P.state.community.comments[id] || (P.state.community.comments[id] = []);
    list.push({ author: P.firstName() || 'You', body: text, when: 'Just now' });
    P.save();
    P.refresh();
    var again = document.getElementById('cf-' + id);
    if (again) again.focus();
    P.toast('Comment added');
  };

  /* Rate a scheme you applied for: three word choices. */
  P.acts.rate = function (el) {
    var preset = el.getAttribute('data-id') || '';
    var fromScheme = !!preset;
    if (!preset) {
      var done = P.state.tracked.filter(function (t) { return t.status !== 'Not started'; })[0];
      preset = done ? done.id : (P.state.tracked[0] ? P.state.tracked[0].id : '');
    }
    var mine = P.state.community.ratings[preset] || {};
    var body = '<form data-form="rating" id="rate-form" class="rate-form">' +
      '<div class="field"><label class="field-label" for="r-scheme">Which benefit did you apply for?</label>' +
        '<span class="select-wrap"><select class="select" id="r-scheme" required data-autofocus>' + (preset ? '' : '<option value="">Choose a benefit</option>') + benefitOptions(preset) + '</select>' + icon('chevron-down', 18, 'select-chev') + '</span></div>' +
      SCALES.map(function (s) {
        var sc = C.ratingScales[s];
        return '<fieldset class="rate-set"><legend>' + esc(sc.label) + '</legend><div class="rate-opts">' + sc.options.map(function (o, i) {
          return '<label class="rate-opt"><input type="radio" name="r-' + s + '" value="' + i + '"' + (mine[s] === i ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
        }).join('') + '</div></fieldset>';
      }).join('') +
      '<p class="field-error" id="rate-err" role="alert" hidden>Choose a benefit and at least one answer.</p>' +
      '<p class="d-muted">Your answers are added to the counts others see. Nothing else about you is shown.</p>' +
      '</form>' + P.discLine('dlg-disc');
    P.openDialog({
      title: esc(fromScheme ? P.t('rate_this') : 'Rate a benefit you applied for'),
      className: 'dlg-rate',
      body: body,
      foot: '<button type="button" class="btn" data-dlg-close>' + esc(P.t('cancel')) + '</button><button type="submit" form="rate-form" class="btn primary">Save rating</button>',
    });
  };
  P.forms.rating = function (form) {
    var id = form.querySelector('#r-scheme').value;
    var r = {}, any = false;
    SCALES.forEach(function (s) {
      var c = form.querySelector('input[name="r-' + s + '"]:checked');
      if (c) { r[s] = parseInt(c.value, 10); any = true; }
    });
    if (!id || !any) { var e = document.getElementById('rate-err'); if (e) e.hidden = false; return; }
    P.state.community.ratings[id] = r;
    P.save();
    var dlg = form.closest('dialog');
    if (dlg && dlg._close) dlg._close();
    P.toast('Thank you. Your rating is added.');
    var route = P.parseRoute();
    if (route.name === 'community' || route.name === 'benefit') P.refresh();
  };
})();

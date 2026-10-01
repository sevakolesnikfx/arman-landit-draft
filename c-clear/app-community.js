/* Landit design C (Big and clear): Community.
   #/community               posts, with a big "Write a post" button
   #/community/ratings       how people rated each benefit, in words
   #/community/about/<id>    posts about one benefit
   Ratings are word choices (no marks, no numbers out of anything). The
   summaries are plain counts: "6 of 7 people said it was easy".
   New posts, replies and ratings are saved in this browser only. */
(function () {
  'use strict';
  var C = window.LC;
  var L = C.L;
  var esc = C.esc;
  var CM = L.community;
  var SCALES = ['worth', 'speed', 'ease'];

  function allPosts() {
    var mine = (C.state.posts || []).slice().reverse();
    return mine.concat(CM.posts);
  }
  function commentsFor(p) {
    return (p.comments || []).concat(C.state.comments[p.id] || []);
  }
  function whenText(p) {
    if (!p.mine) return p.when;
    return 'Just now';
  }
  function benefitsWithPosts() {
    var ids = [];
    allPosts().forEach(function (p) { if (p.benefitId && ids.indexOf(p.benefitId) < 0 && L.benefitById(p.benefitId)) ids.push(p.benefitId); });
    Object.keys(CM.ratings).concat(Object.keys(C.state.myRatings)).forEach(function (id) { if (ids.indexOf(id) < 0 && L.benefitById(id)) ids.push(id); });
    return ids.map(L.benefitById).sort(function (a, b) { return a.name.localeCompare(b.name, 'en-GB'); });
  }

  /* ------------------------------------------------------------------ */
  /* Posts                                                               */
  /* ------------------------------------------------------------------ */

  function postHTML(p) {
    var b = p.benefitId ? L.benefitById(p.benefitId) : null;
    var com = commentsFor(p);
    var rid = 'replies-' + p.id;
    var initial = (p.author || '?').trim().charAt(0).toUpperCase();
    return '<li class="post card" id="post-' + esc(p.id) + '">' +
      '<div class="post-head">' +
        '<span class="avatar" aria-hidden="true">' + esc(initial) + '</span>' +
        '<div class="post-who"><span class="post-author">' + esc(p.author) + '</span><span class="post-when">' + esc(whenText(p)) + '</span></div>' +
        (p.sample ? '<span class="tag-sample">' + esc(C.t('example_post')) + '</span>' : (p.mine ? '<span class="tag-mine">Your post</span>' : '')) +
      '</div>' +
      (b ? '<a class="post-benefit" href="#/benefit/' + encodeURIComponent(b.id) + '" ' + C.catVar(b.category) + '>' + C.ic(C.cat(b).icon) + '<span><bdi>' + esc(b.name) + '</bdi></span></a>' : '<span class="post-benefit post-general">' + C.ic('message-square') + '<span>General</span></span>') +
      (p.title ? '<h2 class="post-title" dir="auto">' + esc(p.title) + '</h2>' : '') +
      '<p class="post-body" dir="auto">' + esc(p.body) + '</p>' +
      '<div class="post-actions">' +
        '<button type="button" class="btn btn-secondary btn-sm" data-action="reply-toggle" aria-expanded="false" aria-controls="' + esc(rid) + '">' +
          C.ic('message-circle') + '<span>Reply</span>' + (com.length ? '<span class="reply-count">' + C.plural(com.length, 'reply', 'replies') + '</span>' : '') + '</button>' +
      '</div>' +
      '<div class="replies" id="' + esc(rid) + '" hidden>' +
        (com.length ? '<ul class="reply-list">' + com.map(function (c) {
          return '<li class="reply"><span class="avatar sm" aria-hidden="true">' + esc((c.author || '?').charAt(0).toUpperCase()) + '</span>' +
            '<div><p class="reply-who"><strong>' + esc(c.author) + '</strong> <span>' + esc(c.mine ? 'Just now' : c.when) + '</span></p><p class="reply-body" dir="auto">' + esc(c.body) + '</p></div></li>';
        }).join('') + '</ul>' : '<p class="soft-p">No replies yet.</p>') +
        '<form class="reply-form" data-post="' + esc(p.id) + '" novalidate>' +
          '<label class="field-label" for="reply-in-' + esc(p.id) + '">Your reply</label>' +
          '<textarea class="input textarea" id="reply-in-' + esc(p.id) + '" rows="3" dir="auto"></textarea>' +
          '<p class="form-msg" role="alert"></p>' +
          '<button type="submit" class="btn btn-primary">' + C.ic('send', 'flip') + '<span>' + esc(C.t('comment')) + '</span></button>' +
        '</form>' +
      '</div>' +
    '</li>';
  }

  /* ------------------------------------------------------------------ */
  /* Ratings                                                             */
  /* ------------------------------------------------------------------ */

  /* One benefit's ratings: the three plain sentences first; the bars with
     every count are behind "See all answers". */
  function ratingCardHTML(b) {
    var rc = C.ratingCounts(b.id);
    if (!rc) return '';
    var bid = 'bars-' + b.id;
    return '<li class="rate-card card" ' + C.catVar(b.category) + '>' +
      '<div class="rate-head">' + C.badge(b) +
        '<div><h2 class="rate-h"><a class="rate-name" href="#/benefit/' + encodeURIComponent(b.id) + '"><bdi>' + esc(b.name) + '</bdi></a></h2>' +
        '<p class="rate-sub">' + esc(C.ratingWho(rc)) + (rc.sample ? ' (sample)' : '') + (rc.mine ? '. You rated it too.' : '.') + '</p></div>' +
      '</div>' +
      '<ul class="rate-sums">' + SCALES.map(function (k) {
        var s = C.ratingSentence(k, rc[k]);
        return s ? '<li><span class="rate-sum-k">' + esc(CM.ratingScales[k].label) + '</span> <span>' + esc(s) + '</span></li>' : '';
      }).join('') + '</ul>' +
      '<button type="button" class="btn btn-quiet btn-sm bars-btn" data-action="bars-toggle" aria-expanded="false" aria-controls="' + esc(bid) + '">' + C.ic('chevron-down', 'chev') + '<span>See all answers</span></button>' +
      '<div class="scales" id="' + esc(bid) + '" hidden>' + SCALES.map(function (k) {
        var arr = rc[k];
        var sum = arr.reduce(function (s, x) { return s + x; }, 0) || 1;
        var opts = CM.ratingScales[k].options;
        return '<div class="scale"><h3 class="scale-h">' + esc(CM.ratingScales[k].label) + '</h3>' +
          '<ul class="bars">' + opts.map(function (o, i) {
            return '<li><span class="bar-label">' + esc(o) + '</span><span class="bar" aria-hidden="true"><span style="inline-size:' + Math.round(arr[i] / sum * 100) + '%"></span></span>' +
              '<span class="bar-n">' + esc(C.plural(arr[i], 'person', 'people')) + '</span></li>';
          }).join('') + '</ul></div>';
      }).join('') + '</div>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-action="rate" data-id="' + esc(b.id) + '">' + C.ic('list-checks') + '<span>' + (C.state.myRatings[b.id] ? 'Change my rating' : esc(C.t('rate_this'))) + '</span>' + C.srName(b.id) + '</button>' +
    '</li>';
  }
  C.actions['bars-toggle'] = function (el) {
    var open = el.getAttribute('aria-expanded') !== 'true';
    el.setAttribute('aria-expanded', String(open));
    var p = document.getElementById(el.getAttribute('aria-controls'));
    if (p) p.hidden = !open;
  };

  /* ------------------------------------------------------------------ */
  /* The view                                                            */
  /* ------------------------------------------------------------------ */

  C.views.community = function (parts) {
    var tab = parts[1] === 'ratings' ? 'ratings' : 'posts';
    /* "Read posts" from a benefit page shows that benefit's posts for this
       visit only; it is not saved, so the Community tab later shows
       everything again. */
    var about = parts[1] === 'about' && parts[2] && L.benefitById(parts[2]) ? parts[2] : null;
    var filter = about || C.state.ui.commFilter || 'all';
    var options = benefitsWithPosts();
    if (filter !== 'all' && filter !== 'general' && !options.some(function (b) { return b.id === filter; })) {
      var fb = L.benefitById(filter);
      if (fb) options.push(fb);
    }

    var posts = allPosts().filter(function (p) {
      if (filter === 'all') return true;
      if (filter === 'general') return !p.benefitId;
      return p.benefitId === filter;
    });
    var rateList = options.filter(function (b) { return C.ratingCounts(b.id) && (filter === 'all' || filter === b.id); });

    var body;
    if (tab === 'posts') {
      body = posts.length
        ? '<ul class="posts">' + posts.map(postHTML).join('') + '</ul>'
        : '<div class="empty card"><p>No posts about this yet. You could write the first one.</p></div>';
    } else {
      body = rateList.length
        ? '<ul class="rate-list">' + rateList.map(ratingCardHTML).join('') + '</ul>'
        : '<div class="empty card"><p>Nobody has rated this one yet. If you applied, you could rate it.</p></div>';
    }

    var html =
      '<div class="page">' +
        '<header class="page-head">' +
          '<h1 class="page-title">' + esc(C.t('nav_community')) + '</h1>' +
          '<p class="lead">Read what other people did, and share what helped you.</p>' +
          '<p class="sample-tag">' + C.ic('info') + '<span><strong>Sample posts.</strong> ' + esc(CM.sampleNote) + '</span></p>' +
        '</header>' +
        '<div class="comm-bar">' +
          '<nav class="segnav" aria-label="Community sections">' +
            '<a href="#/community"' + (tab === 'posts' ? ' aria-current="page"' : '') + '>' + C.ic('message-square') + '<span>Posts</span></a>' +
            '<a href="#/community/ratings"' + (tab === 'ratings' ? ' aria-current="page"' : '') + '>' + C.ic('list-checks') + '<span>How people rated it</span></a>' +
          '</nav>' +
          (tab === 'posts'
            ? '<button type="button" class="btn btn-primary comm-main" data-action="write-post">' + C.ic('pencil') + '<span>Write a post</span></button>'
            : '<button type="button" class="btn btn-primary comm-main" data-action="rate">' + C.ic('list-checks') + '<span>Rate a benefit</span></button>') +
        '</div>' +
        '<div class="field-inline comm-filter"><label class="field-label" for="comm-filter">' + C.ic('filter') + '<span>' + (tab === 'posts' ? 'Show posts about' : 'Show ratings for') + '</span></label>' +
          '<select class="select" id="comm-filter">' +
            '<option value="all"' + (filter === 'all' ? ' selected' : '') + '>All benefits</option>' +
            options.map(function (b) { return '<option value="' + esc(b.id) + '"' + (filter === b.id ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('') +
            '<option value="general"' + (filter === 'general' ? ' selected' : '') + '>General posts</option>' +
          '</select></div>' +
        body +
        C.footer() +
      '</div>';

    return {
      title: C.t('nav_community'),
      nav: 'community',
      html: html,
      after: function () {
        var sel = document.getElementById('comm-filter');
        sel.addEventListener('change', function () {
          C.state.ui.commFilter = sel.value;
          C.save();
          if (C.route().parts[1] === 'about') C.go(tab === 'ratings' ? '#/community/ratings' : '#/community');
          else C.render({ keepScroll: true, noFocus: true });
          var again = document.getElementById('comm-filter');
          if (again) again.focus();
        });
        document.querySelectorAll('.reply-form').forEach(function (f) {
          f.addEventListener('submit', function (e) {
            e.preventDefault();
            var ta = f.querySelector('textarea');
            var text = ta.value.trim();
            if (!text) { f.querySelector('.form-msg').textContent = 'Write a reply first.'; ta.focus(); return; }
            var pid = f.getAttribute('data-post');
            var list = C.state.comments[pid] = C.state.comments[pid] || [];
            list.push({ author: (C.state.user && C.state.user.name) || 'You', body: text, when: new Date().toISOString(), mine: true });
            C.save();
            C.render({ keepScroll: true, noFocus: true });
            var btn = document.querySelector('[aria-controls="replies-' + pid + '"]');
            if (btn) { btn.click(); btn.focus(); }
            C.toast('Your reply is posted');
          });
        });
      },
    };
  };

  C.actions['reply-toggle'] = function (el) {
    var open = el.getAttribute('aria-expanded') !== 'true';
    el.setAttribute('aria-expanded', String(open));
    var p = document.getElementById(el.getAttribute('aria-controls'));
    if (p) {
      p.hidden = !open;
      if (open) { var ta = p.querySelector('textarea'); if (ta && !p.querySelector('.reply')) ta.focus(); }
    }
  };

  /* ------------------------------------------------------------------ */
  /* Write a post (dialog)                                               */
  /* ------------------------------------------------------------------ */

  function benefitOptions(selected, includeNone) {
    var m = C.match();
    var trackedIds = C.state.tracked.map(function (t) { return t.id; });
    var tracked = trackedIds.map(L.benefitById).filter(Boolean);
    var others = L.sortBenefits(m.open.filter(function (b) { return trackedIds.indexOf(b.id) < 0; }), 'az');
    var opt = function (b) { return '<option value="' + esc(b.id) + '"' + (selected === b.id ? ' selected' : '') + '>' + esc(b.name) + '</option>'; };
    return (includeNone ? '<option value="">No benefit, a general post</option>' : '<option value="">Choose a benefit</option>') +
      (tracked.length ? '<optgroup label="My applications">' + tracked.map(opt).join('') + '</optgroup>' : '') +
      '<optgroup label="Other benefits">' + others.map(opt).join('') + '</optgroup>';
  }

  C.actions['write-post'] = function () {
    var r = C.route();
    var filter = r.parts[1] === 'about' && r.parts[2] ? r.parts[2] : C.state.ui.commFilter;
    var pre = filter && filter !== 'all' && filter !== 'general' ? filter : '';
    C.dialog({
      title: 'Write a post',
      wide: true,
      html:
        '<form id="post-form" novalidate>' +
          '<p class="dlg-note">' + C.ic('info') + '<span>' + esc(CM.postingNote) + '</span></p>' +
          '<div class="field"><label class="field-label" for="post-benefit">Which benefit is it about? (optional)</label>' +
            '<select class="select" id="post-benefit">' + benefitOptions(pre, true) + '</select></div>' +
          '<div class="field"><label class="field-label" for="post-title">Title (optional)</label>' +
            '<input class="input" id="post-title" type="text" dir="auto" maxlength="90" placeholder="For example, How I applied"></div>' +
          '<div class="field"><label class="field-label" for="post-body">Your post</label>' +
            '<textarea class="input textarea" id="post-body" rows="5" dir="auto" placeholder="What happened? What helped you?"></textarea></div>' +
          '<p class="form-msg" role="alert"></p>' +
          '<div class="dlg-actions"><button type="submit" class="btn btn-primary btn-lg">' + C.ic('send', 'flip') + '<span>' + esc(C.t('post')) + '</span></button>' +
          '<button type="button" class="btn btn-secondary btn-lg" data-dlg-close>' + esc(C.t('cancel')) + '</button></div>' +
        '</form>',
      onOpen: function (dlg, close) {
        var f = dlg.querySelector('#post-form');
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var body = f.querySelector('#post-body').value.trim();
          if (!body) { f.querySelector('.form-msg').textContent = 'Write your post first.'; f.querySelector('#post-body').focus(); return; }
          C.state.posts.push({
            id: 'mine-' + Date.now(),
            author: (C.state.user && C.state.user.name) || 'You',
            benefitId: f.querySelector('#post-benefit').value || null,
            title: f.querySelector('#post-title').value.trim(),
            body: body,
            mine: true,
            comments: [],
          });
          C.save();
          close();
          if (C.route().name === 'community') C.render({ noFocus: true });
          var first = document.querySelector('.posts .post');
          if (first) { first.setAttribute('tabindex', '-1'); first.focus(); }
          C.toast('Your post is shared');
        });
      },
    });
  };

  /* ------------------------------------------------------------------ */
  /* Rate a benefit (dialog): three questions, word answers only         */
  /* ------------------------------------------------------------------ */

  C.actions.rate = function (el) {
    var id = el && el.getAttribute && el.getAttribute('data-id');
    var b = id ? L.benefitById(id) : null;
    var mine = (id && C.state.myRatings[id]) || {};
    var picker = b ? '<p class="dlg-lead"><bdi>' + esc(b.name) + '</bdi></p><input type="hidden" id="rate-benefit" value="' + esc(b.id) + '">'
      : '<div class="field"><label class="field-label" for="rate-benefit">Which benefit did you apply for?</label><select class="select" id="rate-benefit">' + benefitOptions('', false) + '</select></div>';
    C.dialog({
      title: b ? C.t('rate_this') : 'Rate a benefit',
      wide: true,
      disclaimer: true,
      html:
        '<form id="rate-form" novalidate>' + picker +
          '<p class="dlg-note">Pick the words that fit best. Your rating is added to the counts.</p>' +
          SCALES.map(function (k) {
            var sc = CM.ratingScales[k];
            return '<fieldset class="rate-q"><legend>' + esc(sc.label) + '</legend><div class="word-opts">' + sc.options.map(function (o, i) {
              var oid = 'r-' + k + '-' + i;
              return '<label class="word-opt" for="' + oid + '"><input type="radio" name="' + k + '" id="' + oid + '" value="' + i + '"' + (mine[k] === i ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
            }).join('') + '</div></fieldset>';
          }).join('') +
          '<p class="form-msg" role="alert"></p>' +
          '<div class="dlg-actions"><button type="submit" class="btn btn-primary btn-lg">' + C.ic('check') + '<span>Save my rating</span></button>' +
          '<button type="button" class="btn btn-secondary btn-lg" data-dlg-close>' + esc(C.t('cancel')) + '</button></div>' +
        '</form>',
      onOpen: function (dlg, close) {
        var f = dlg.querySelector('#rate-form');
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var bid = f.querySelector('#rate-benefit').value;
          var msg = f.querySelector('.form-msg');
          if (!bid) { msg.textContent = 'Choose a benefit first.'; return; }
          var out = {}, missing = false;
          SCALES.forEach(function (k) {
            var r = f.querySelector('input[name="' + k + '"]:checked');
            if (r) out[k] = parseInt(r.value, 10); else missing = true;
          });
          if (missing) { msg.textContent = 'Answer all three questions, please.'; return; }
          C.state.myRatings[bid] = out;
          C.save();
          close();
          var r = C.route();
          if (r.name === 'community' || r.name === 'benefit') C.render({ keepScroll: true, noFocus: true });
          C.toast('Thank you. Your rating is saved.');
        });
      },
    });
  };
})();

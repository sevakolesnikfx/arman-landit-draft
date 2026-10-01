/* Landit design C (Big and clear): Chat, the main screen.
   A big greeting, four big starter buttons, replies in large clear cards
   with a Read aloud button, suggested replies as big buttons, benefit
   cards with Open, Track and Share, and a composer with labelled Speak
   and Send buttons. The replies come from LANDIT.chatReply (no network). */
(function () {
  'use strict';
  var C = window.LC;
  var L = C.L;
  var esc = C.esc;

  var STARTER_ICONS = [
    [/claim/i, 'wallet'], [/council tax/i, 'landmark'], [/recourse|public funds/i, 'scale'], [/travel/i, 'train-front'],
    [/bills/i, 'zap'], [/health/i, 'heart-pulse'], [/childcare/i, 'baby'], [/document/i, 'file-text'], [/track/i, 'bookmark'],
    [/food/i, 'utensils'],
  ];
  function starterIcon(text) {
    for (var i = 0; i < STARTER_ICONS.length; i++) if (STARTER_ICONS[i][0].test(text)) return STARTER_ICONS[i][1];
    return 'message-circle';
  }

  function ctx() {
    return { profile: C.state.profile, name: C.state.user && C.state.user.name, lang: C.lang(), tracked: C.trackedForChat() };
  }

  /* ------------------------------------------------------------------ */
  /* Message markup                                                      */
  /* ------------------------------------------------------------------ */

  /* A benefit card in a reply. Its standing is shown in words: a calm
     "Depends on your situation" tag on possible schemes, and a neutral
     "Not open to you now" chip on visa-blocked ones (those cards have no
     Track button styled as a next step, only Open and Share). */
  C.chatCard = function (id) {
    var b = L.benefitById(id);
    if (!b) return '';
    var href = '#/benefit/' + encodeURIComponent(b.id);
    var st = C.standing(b.id);
    var chip = st.state === 'blocked'
      ? '<span class="state-chip">' + C.ic('ban') + '<span>' + esc(C.t('not_open')) + '</span></span>'
      : (st.state === 'hidden' ? '<span class="state-chip">' + C.ic('info') + '<span>Not in your list</span></span>' : C.fitTag(b.id));
    return '<li class="ccard' + (st.state === 'open' ? '' : ' ccard-closed') + '" ' + C.catVar(b.category) + '>' +
      '<div class="ccard-top">' + C.badge(b) +
        '<div class="ccard-text"><span class="ccard-name"><bdi>' + esc(b.name) + '</bdi></span>' +
          '<span class="ccard-tags">' + C.catChip(b.category) + chip + '</span></div>' +
      '</div>' +
      '<div class="ccard-val">' + C.valueHTML(b) + '</div>' +
      '<div class="ccard-actions">' +
        '<a class="btn btn-secondary btn-sm" href="' + href + '">' + C.icd('arrow-right') + '<span>Open</span>' + C.srName(b.id) + '</a>' +
        (st.state === 'open' ? C.trackBtn(b.id) : '') + C.shareBtn(b.id) +
      '</div></li>';
  };

  function meHTML(m) {
    return '<div class="msg msg-me"><span class="sr-only">You: </span><p dir="auto">' + esc(m.text) + '</p></div>';
  }

  /* A reply that names schemes or amounts carries the disclaimer under it
     (shown on phone, where the docked chat box has no room for it). */
  function needsDisclaimer(r, cards) {
    return cards.length > 0 || (r.paragraphs || []).some(function (p) { return /£\s?\d/.test(p); });
  }

  function botHTML(m, idx) {
    var r = m.r || {};
    var id = 'm-' + idx;
    var cards = (r.benefitIds || []).filter(function (x) { return L.benefitById(x); });
    var mentionsApps = (r.paragraphs || []).some(function (p) { return /\bsidebar\b/i.test(p); });
    return '<article class="msg msg-bot" id="' + id + '" aria-label="Landit replied">' +
      '<div class="msg-head"><span class="brand-mark sm">' + C.glyph() + '</span><span class="msg-who">Landit</span></div>' +
      '<div class="msg-body">' + (r.paragraphs || []).map(function (p) { return '<p data-say>' + esc(p) + '</p>'; }).join('') + '</div>' +
      (cards.length ? '<ul class="chat-cards" aria-label="Benefits in this answer">' + cards.map(C.chatCard).join('') + '</ul>' : '') +
      (r.action === 'help-now' ? '<a class="btn btn-primary help-now-btn" href="#/settings/help">' + C.ic('life-buoy') + '<span>Open ' + esc(C.t('nav_help')) + '</span></a>' : '') +
      (mentionsApps ? '<button type="button" class="btn btn-secondary help-now-btn" data-action="show-apps">' + C.ic('bookmark') + '<span>Open My applications</span></button>' : '') +
      (needsDisclaimer(r, cards) ? '<p class="msg-disclaimer">' + esc(L.disclaimer) + '</p>' : '') +
      '<div class="msg-actions">' + C.readBtn('#' + id) + '</div>' +
      '</article>' +
      ((r.suggestions || []).length ? '<div class="suggest" role="group" aria-label="Suggested replies"><p class="suggest-h">You could ask:</p>' +
        r.suggestions.map(function (s) {
          return '<button type="button" class="btn btn-secondary suggest-btn" data-action="say" data-text="' + esc(s) + '">' + C.ic('message-circle') + '<span dir="auto">' + esc(s) + '</span></button>';
        }).join('') + '</div>' : '');
  }

  function messageHTML(m, idx) { return m.who === 'me' ? meHTML(m) : botHTML(m, idx); }

  function emptyHTML() {
    var name = C.state.user && C.state.user.name;
    var greet = L.chatGreeting(name, new Date().getHours(), C.lang());
    var starters = L.chatStarters(C.state.profile).slice(0, 4);
    /* On phone the starters come straight after the chat box (CSS order),
       so the easiest way in is on the first screen. */
    return '<section class="hello" aria-labelledby="hello-h">' +
      '<h1 class="hello-h" id="hello-h"><span class="hello-1" dir="auto">' + esc(greet) + '.</span> <span class="hello-2" dir="auto">How can I help?</span></h1>' +
      '<p class="hello-note" dir="auto">Ask about money, bills, travel, health or your visa. I answer using Landit\'s list of UK schemes and your answers.</p>' +
      composerHTML(true) +
      '<h2 class="starters-h" dir="auto">Or try one of these</h2>' +
      '<div class="starters">' + starters.map(function (s) {
        return '<button type="button" class="starter" data-action="say" data-text="' + esc(s) + '"><span class="starter-ic">' + C.ic(starterIcon(s)) + '</span><span class="starter-t" dir="auto">' + esc(s) + '</span>' + C.icd('arrow-right', 'starter-go') + '</button>';
      }).join('') + '</div>' +
      '</section>';
  }

  /* In an empty chat the composer sits under the greeting (like a search
     page). Once there is a conversation it docks at the bottom. */
  function composerHTML(hero) {
    return '<div class="composer-wrap' + (hero ? ' is-hero' : '') + '">' +
      '<form class="composer" id="composer" novalidate>' +
        '<label class="composer-label" for="chat-input" dir="auto">Type or speak your question</label>' +
        '<div class="composer-box">' +
          '<textarea class="composer-input" id="chat-input" rows="1" placeholder="' + esc(C.t('chat_placeholder')) + '" dir="auto"></textarea>' +
          '<div class="composer-btns">' +
            '<button type="button" class="btn btn-secondary speak-btn" data-action="speak" aria-pressed="false" aria-describedby="listen-status">' + C.ic('mic') + '<span>Speak</span></button>' +
            '<button type="submit" class="btn btn-primary send-btn">' + C.ic('send', 'flip') + '<span>' + esc(C.t('send')) + '</span></button>' +
          '</div>' +
        '</div>' +
        '<p class="listen-status" id="listen-status" role="status" aria-live="polite"></p>' +
      '</form>' +
      '<p class="composer-disclaimer" dir="auto">' + esc(L.disclaimer) + '</p>' +
      '</div>';
  }

  /* The docked chat box's height, as --composer-h on <html>, so the page
     keeps a matching scroll margin: a control moved to with the keyboard
     never ends up hidden under the chat box. */
  var composerObserver = null;
  function watchComposer() {
    if (composerObserver) { try { composerObserver.disconnect(); } catch (e) { /* gone */ } composerObserver = null; }
    var root = document.documentElement;
    var chat = document.querySelector('.chat');
    if (!chat || chat.classList.contains('is-empty')) { root.style.removeProperty('--composer-h'); return; }
    var target = document.querySelector('.chat > .composer-wrap');
    if (!target) return;
    var desk = function () { try { return window.matchMedia('(min-width: 960px)').matches; } catch (e) { return false; } };
    var measure = function () {
      var el = desk() ? target : target.querySelector('.composer');
      if (el) root.style.setProperty('--composer-h', Math.ceil(el.getBoundingClientRect().height) + 'px');
    };
    measure();
    if (window.ResizeObserver) {
      composerObserver = new ResizeObserver(measure);
      composerObserver.observe(target);
      var form = target.querySelector('.composer');
      if (form) composerObserver.observe(form);
    }
  }

  /* ------------------------------------------------------------------ */
  /* The view                                                            */
  /* ------------------------------------------------------------------ */

  C.views.chat = function () {
    var msgs = C.state.chat || [];
    var html =
      '<div class="chat' + (msgs.length ? '' : ' is-empty') + '">' +
        '<div class="chat-scroll">' +
          (msgs.length ? '<h1 class="sr-only" id="chat-h">' + esc(C.t('nav_chat')) + '</h1>' : emptyHTML()) +
          '<div class="chat-log" id="chat-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">' +
            msgs.map(messageHTML).join('') +
          '</div>' +
          '<div class="typing" id="typing" hidden><span class="brand-mark sm">' + C.glyph() + '</span><span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span><span class="typing-t">Landit is writing</span></div>' +
        '</div>' +
        (msgs.length ? composerHTML(false) : '') +
      '</div>';
    return {
      title: C.t('nav_chat'),
      nav: 'chat',
      appsButton: true,
      mainClass: 'main-chat',
      html: html,
      after: function () {
        wireComposer();
        watchComposer();
        if (msgs.length) window.setTimeout(function () { scrollToEnd(true); }, 0);
      },
    };
  };

  function scrollToEnd(instant) {
    var y = document.documentElement.scrollHeight;
    try { window.scrollTo({ top: y, behavior: instant || C.reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, y); }
  }

  function autosize(t) {
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight + 2, 240) + 'px';
  }

  function wireComposer() {
    var form = document.getElementById('composer');
    var input = document.getElementById('chat-input');
    if (!form) return;
    input.addEventListener('input', function () { autosize(input); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) { input.focus(); return; }
      if (send(text)) {
        input.value = '';
        autosize(input);
      }
    });
  }

  /* One reply at a time. A question sent while Landit is still writing is
     kept and sent as soon as the reply is finished, never lost. */
  var busy = false;
  var queue = [];
  function setStatus(text) {
    var st = document.getElementById('listen-status');
    if (st) st.textContent = text || '';
  }
  function send(text) {
    if (busy) {
      queue.push(text);
      setStatus('Landit is still writing. Your question will be sent next.');
      return true;
    }
    stopListening();
    setStatus('');
    var log = document.getElementById('chat-log');
    if (!log) return false;
    var first = !C.state.chat.length;
    C.state.chat.push({ who: 'me', text: text });
    C.save();
    if (first) {
      var hello = document.querySelector('.hello');
      var wrap = document.querySelector('.composer-wrap');
      var hadFocus = hello && hello.contains(document.activeElement);
      var chatEl = document.querySelector('.chat');
      if (chatEl) chatEl.classList.remove('is-empty');
      if (wrap && chatEl) {
        wrap.classList.remove('is-hero');
        chatEl.appendChild(wrap);
      }
      if (hello) hello.outerHTML = '<h1 class="sr-only" id="chat-h">' + esc(C.t('nav_chat')) + '</h1>';
      var inp = document.getElementById('chat-input');
      if (hadFocus && inp) inp.focus();
      watchComposer();
    }
    log.insertAdjacentHTML('beforeend', meHTML({ text: text }));
    var r = L.chatReply(text, ctx());
    var typing = document.getElementById('typing');
    var delay = C.reducedMotion() ? 0 : 900 + Math.min(text.length * 8, 500);
    busy = true;
    if (delay) { typing.hidden = false; scrollToEnd(); }
    window.setTimeout(function () {
      busy = false;
      if (!document.getElementById('chat-log')) {   // the person left Chat while waiting
        C.state.chat.push({ who: 'bot', r: r });
        /* Questions sent while waiting are answered too, so none is lost. */
        while (queue.length) {
          var t = queue.shift();
          C.state.chat.push({ who: 'me', text: t });
          C.state.chat.push({ who: 'bot', r: L.chatReply(t, ctx()) });
        }
        if (C.state.chat.length > 60) C.state.chat = C.state.chat.slice(-60);
        C.save();
        return;
      }
      /* Chat may have been drawn again while waiting (left and came back),
         so write into the log that is on screen now. */
      log = document.getElementById('chat-log');
      typing = document.getElementById('typing');
      if (typing) typing.hidden = true;
      C.state.chat.push({ who: 'bot', r: r });
      if (C.state.chat.length > 60) C.state.chat = C.state.chat.slice(-60);
      C.save();
      var idx = C.state.chat.length - 1;
      log.insertAdjacentHTML('beforeend', botHTML(C.state.chat[idx], idx));
      /* Show the question and the start of the answer, not the end. */
      var mine = log.querySelectorAll('.msg-me');
      var q = mine[mine.length - 1];
      if (queue.length) { send(queue.shift()); return; }
      if (q) {
        try { q.scrollIntoView({ block: 'start', behavior: C.reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { q.scrollIntoView(); }
      } else scrollToEnd();
    }, delay);
    return true;
  }

  C.actions.say = function (el) {
    var text = el.getAttribute('data-text');
    if (!document.getElementById('chat-log')) {
      C.go('#/chat');
      window.setTimeout(function () { send(text); }, 60);
      return;
    }
    send(text);
  };

  /* ------------------------------------------------------------------ */
  /* Speak: real voice typing where the browser has it, otherwise a      */
  /* clearly labelled practice version that fills in a sample question.  */
  /* ------------------------------------------------------------------ */

  var rec = null, simTimer = null, listening = false;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function setListening(on, note) {
    listening = on;
    var btn = document.querySelector('.speak-btn');
    var st = document.getElementById('listen-status');
    if (btn) {
      btn.setAttribute('aria-pressed', String(on));
      btn.classList.toggle('is-listening', on);
      btn.innerHTML = on ? C.ic('square') + '<span>' + esc(C.t('stop')) + '</span>' : C.ic('mic') + '<span>Speak</span>';
    }
    if (st) st.textContent = note || '';
  }
  function stopListening() {
    window.clearTimeout(simTimer);
    if (rec) { try { rec.abort(); } catch (e) { /* already stopped */ } rec = null; }
    if (listening) setListening(false, '');
  }
  function simulate() {
    setListening(true, 'Listening (practice version: no microphone is used). A sample question will appear.');
    simTimer = window.setTimeout(function () {
      var input = document.getElementById('chat-input');
      var asked = (C.state.chat || []).filter(function (m) { return m.who === 'me'; }).map(function (m) { return m.text; });
      var pick = L.chatStarters(C.state.profile).filter(function (s) { return asked.indexOf(s) < 0; })[0] || 'What can I claim?';
      if (input) { input.value = pick; autosize(input); input.focus(); }
      setListening(false, 'Done. Check the words, then press Send.');
    }, 2000);
  }
  C.actions.speak = function () {
    if (listening) { stopListening(); return; }
    if (!SR) { simulate(); return; }
    try {
      rec = new SR();
      rec.lang = 'en-GB';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      var gotText = false;
      rec.onresult = function (e) {
        var text = '';
        for (var i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
        var input = document.getElementById('chat-input');
        if (input) { input.value = text; autosize(input); }
        gotText = true;
      };
      rec.onerror = function () { rec = null; if (!gotText) simulate(); else setListening(false, ''); };
      rec.onend = function () {
        if (rec && listening) {
          rec = null;
          setListening(false, gotText ? 'Done. Check the words, then press Send.' : '');
          var input = document.getElementById('chat-input');
          if (input) input.focus();
        }
      };
      setListening(true, 'Listening. Speak now.');
      rec.start();
    } catch (e) {
      rec = null;
      simulate();
    }
  };

  /* Leaving Chat stops listening. A reply still being written is saved by
     its timer (with any questions that were waiting). */
  window.addEventListener('hashchange', function () { stopListening(); });
})();

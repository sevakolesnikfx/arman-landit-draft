/* Landit, design B (Dusk): Chat, the main screen.
   A scripted helper (LANDIT.chatReply), no network. Plain bot text with a
   small Landit mark, user messages in a rounded bubble, suggested replies,
   benefit cards, read aloud and voice typing. */
(function () {
  'use strict';
  var D = window.DUSK, L = D.L;
  var esc = D.esc;

  var STARTER_ICONS = [
    [/claim/i, 'pound-sterling'], [/council/i, 'landmark'], [/recourse|public funds/i, 'scale'],
    [/travel/i, 'train-front'], [/bill/i, 'zap'], [/health/i, 'heart-pulse'], [/child/i, 'baby'],
    [/food/i, 'utensils'], [/document/i, 'file-text'], [/track/i, 'list-checks'],
  ];
  function starterIcon(text) {
    for (var i = 0; i < STARTER_ICONS.length; i++) if (STARTER_ICONS[i][0].test(text)) return STARTER_ICONS[i][1];
    return 'message-circle';
  }

  /* Example question for voice typing when the browser cannot listen. */
  var SAMPLE_SPOKEN = 'What help is there with travel costs?';

  /* ------------------------------------------------------------------ */
  /* Pieces                                                              */
  /* ------------------------------------------------------------------ */

  /* A scheme the visa condition blocks never shows an amount or a Track
     button here: only a quiet lock tag, so nobody is nudged towards
     claiming a public fund. */
  D.benefitCard = function (b) {
    var blocked = D.isBlocked(b);
    var tracked = D.isTracked(b.id);
    return '<div class="bcard' + (blocked ? ' is-blocked' : '') + '" style="' + D.catVars(b.category) + '">' +
      '<div class="bcard-top">' + D.catTile(b) +
      '<div class="bcard-main">' + D.catLabel(b) +
      '<a class="bcard-name" href="#/benefit/' + esc(b.id) + '">' + D.bdi(b.name) + '</a>' +
      (blocked ? '' : D.fitTag(b)) + '</div>' +
      (blocked ? '<span class="bcard-worth bcard-lock">' + D.lockTag() + '</span>' : D.worthHTML(b, 'bcard-worth')) + '</div>' +
      '<div class="bcard-actions">' +
      '<a class="btn btn-secondary btn-sm" href="#/benefit/' + esc(b.id) + '" aria-label="' + esc((blocked ? 'See why it is not open: ' : 'Open ') + b.name) + '">' + esc(blocked ? 'See why' : 'Open') + '</a>' +
      (blocked ? (tracked ? D.untrackBtn(b, 'btn-ghost btn-sm') : '') : D.trackBtn(b, { cls: 'btn-secondary btn-sm' })) +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="share" data-bid="' + esc(b.id) + '">' + D.icon('share-2', { size: 18 }) + '<span>' + esc(D.t('share')) + '</span></button>' +
      '</div></div>';
  };

  function chips(list, idx) {
    if (!list || !list.length) return '';
    return '<div class="chips" role="group" aria-label="Suggested replies">' + list.map(function (s) {
      return '<button type="button" class="chip" data-action="say" data-text="' + esc(s) + '">' + esc(s) + '</button>';
    }).join('') + '</div>';
    void idx;
  }

  function botMsg(reply, idx) {
    var cards = (reply.benefitIds || []).map(function (id) { return L.benefitById(id); }).filter(Boolean);
    var tools = '';
    if (D.canRead()) tools += D.readBtn('data-msg="' + idx + '"');
    if (reply.action === 'help-now') tools += '<button type="button" class="btn btn-primary btn-sm" data-action="help-now">' + D.icon('life-buoy', { size: 18 }) + '<span>' + esc('Open ' + D.t('nav_help')) + '</span></button>';
    return '<article class="msg msg-bot" id="msg-' + idx + '" aria-label="Landit">' +
      '<span class="msg-mark">' + D.mark(28) + '</span>' +
      '<div class="msg-body">' +
      '<div class="msg-text">' + reply.paragraphs.map(function (p) { return '<p dir="auto">' + esc(p) + '</p>'; }).join('') + '</div>' +
      (cards.length ? '<div class="msg-cards">' + cards.map(D.benefitCard).join('') + '</div>' : '') +
      (tools ? '<div class="msg-tools">' + tools + '</div>' : '') +
      chips(reply.suggestions, idx) +
      '</div></article>';
  }

  function userMsg(text, idx) {
    return '<div class="msg msg-user" id="msg-' + idx + '"><p class="bubble" dir="auto"><span class="sr-only">You said: </span>' + esc(text) + '</p></div>';
  }

  function msgHTML(m, i) { return m.role === 'user' ? userMsg(m.text, i) : botMsg(m.reply, i); }

  function emptyState() {
    var u = D.state.user || {};
    var starters = L.chatStarters(D.state.profile || {}).slice(0, 4);
    return '<div class="chat-empty" id="chat-empty">' +
      '<div class="chat-hello horizon-soft">' + D.mark(48) +
      '<h2 class="chat-greet" dir="auto">' + esc(L.chatGreeting(u.name || '', new Date().getHours(), D.lang())) + '</h2>' +
      '<p class="chat-intro">Ask me about money, services and rights you may be able to get in the UK. Use your own words.</p>' +
      '</div>' +
      '<ul class="starters" aria-label="Questions to start with">' + starters.map(function (s) {
        return '<li><button type="button" class="starter" data-action="say" data-text="' + esc(s) + '">' +
          '<span class="starter-ico" aria-hidden="true">' + D.icon(starterIcon(s), { size: 20 }) + '</span>' +
          '<span class="starter-text">' + esc(s) + '</span></button></li>';
      }).join('') + '</ul>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Page                                                                */
  /* ------------------------------------------------------------------ */

  D.pages.chat = function () {
    D.setTitle(D.t('nav_chat'), 'chat');
    var msgs = D.state.chat || [];
    var main = document.getElementById('main');
    main.innerHTML =
      '<div class="chat" id="chat">' +
      '<div class="chat-scroll" id="chat-scroll">' +
      '<div class="chat-log" id="chat-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with Landit">' +
      (msgs.length ? msgs.map(msgHTML).join('') : emptyState()) +
      '</div></div>' +
      '<div class="composer-dock">' +
      '<form class="composer" id="composer" autocomplete="off">' +
      '<p class="listening" id="listening" hidden></p>' +
      '<div class="composer-pill">' +
      '<label class="sr-only" for="chat-input">' + esc(D.t('chat_placeholder')) + '</label>' +
      '<textarea id="chat-input" class="composer-input" rows="1" placeholder="' + esc(D.t('chat_placeholder')) + '" enterkeyhint="send" dir="auto"></textarea>' +
      '<button type="button" class="icon-btn mic-btn" id="mic-btn" data-action="mic" aria-pressed="false" aria-label="Voice typing">' + D.icon('mic', { size: 22 }) + '</button>' +
      '<button type="submit" class="send-btn" id="send-btn" aria-label="' + esc(D.t('send')) + '">' + D.icon('arrow-up', { size: 22 }) + '</button>' +
      '</div>' +
      '<p class="composer-note">' + esc(L.disclaimer) + '</p>' +
      '</form></div>' +
      '</div>';
    D.ui.busy = false;
    scrollToLatest(false);
  };

  function scrollToEnd(smooth) {
    var go = function () {
      var sc = document.getElementById('chat-scroll');
      if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: smooth && !D.reducedMotion() ? 'smooth' : 'auto' });
    };
    go();
    requestAnimationFrame(go);
  }
  /* Bring the latest question to the top, so the answer reads from its start. */
  function scrollToLatest(smooth) {
    var go = function () {
      var sc = document.getElementById('chat-scroll');
      var users = D.$$('#chat-log .msg-user');
      var last = users[users.length - 1];
      if (!sc) return;
      if (!last) { sc.scrollTop = sc.scrollHeight; return; }
      sc.scrollTo({ top: Math.max(0, last.offsetTop - 16), behavior: smooth && !D.reducedMotion() ? 'smooth' : 'auto' });
    };
    go();
    requestAnimationFrame(go);
  }

  function append(html) {
    var log = document.getElementById('chat-log');
    if (!log) return null;
    var empty = document.getElementById('chat-empty');
    if (empty) empty.remove();
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var node = wrap.firstChild;
    log.appendChild(node);
    return node;
  }

  /* A short line above the composer (shared by voice typing and the
     "still writing" note). */
  function note(text, live) {
    var line = document.getElementById('listening');
    if (!line) return;
    line.hidden = !text;
    line.classList.toggle('is-note', !live);
    line.innerHTML = text ? (live ? '<span class="rec-dot" aria-hidden="true"></span>' : D.icon('info', { size: 18 })) + '<span>' + esc(text) + '</span>' : '';
  }

  D.send = function (text) {
    text = String(text || '').trim();
    if (!text) return;
    if (D.ui.busy) { note('Landit is still writing. Send again in a moment.'); return; }
    var input = document.getElementById('chat-input');
    if (input) { input.value = ''; autosize(input); }
    D.state.chat.push({ role: 'user', text: text });
    D.save();
    append(userMsg(text, D.state.chat.length - 1));
    var reply = L.chatReply(text, D.chatContext());
    var finish = function () {
      var t = document.getElementById('typing');
      if (t) t.remove();
      setBusy(false);
      D.state.chat.push({ role: 'bot', reply: reply });
      D.save();
      append(botMsg(reply, D.state.chat.length - 1));
      D.ui.busy = false;
      scrollToLatest(true);
    };
    if (D.reducedMotion()) { finish(); return; }
    setBusy(true);
    append('<div class="msg msg-bot typing" id="typing"><span class="msg-mark">' + D.mark(28) + '</span>' +
      '<div class="msg-body"><span class="dots" role="img" aria-label="Landit is writing"><i></i><i></i><i></i></span></div></div>');
    scrollToEnd(true);
    var words = reply.paragraphs.join(' ').split(' ').length;
    setTimeout(finish, Math.min(1400, 650 + words * 6));
  };

  function setBusy(on) {
    D.ui.busy = on;
    var b = document.getElementById('send-btn');
    if (b) { if (on) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled'); }
    if (!on) { var l = document.getElementById('listening'); if (l && l.classList.contains('is-note') && !rec && !simTimer) note(''); }
  }

  function autosize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  /* ------------------------------------------------------------------ */
  /* Voice typing                                                        */
  /* ------------------------------------------------------------------ */

  var rec = null, simTimer = null;

  function setListening(on, text) {
    var btn = document.getElementById('mic-btn');
    if (btn) {
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Stop voice typing' : 'Voice typing');
      btn.classList.toggle('is-on', on);
    }
    note(on ? text : '', true);
  }

  /* The browser can listen, but the microphone did not work. Say so
     plainly and leave the box empty: never type words nobody said. */
  var VOICE_ERRORS = {
    'no-speech': 'Landit did not hear anything. Press the microphone and speak again.',
    'network': 'Voice typing is not working right now. You can type your question instead.',
  };
  function voiceFailed(code) {
    clearTimeout(simTimer);
    simTimer = null;
    rec = null;
    setListening(false);
    note(VOICE_ERRORS[code] || 'Landit cannot hear you. Check that the microphone is allowed for this page.');
  }

  function stopVoice() {
    clearTimeout(simTimer);
    simTimer = null;
    if (rec) { try { rec.abort(); } catch (e) { /* ignore */ } rec = null; }
    setListening(false);
  }

  function simulate() {
    if (rec) { try { rec.abort(); } catch (e) { /* ignore */ } rec = null; }
    setListening(true, 'Example only. Voice typing is not available in this browser, so Landit will fill in a sample question.');
    clearTimeout(simTimer);
    simTimer = setTimeout(function () {
      var input = document.getElementById('chat-input');
      if (input) { input.value = SAMPLE_SPOKEN; autosize(input); input.focus(); }
      setListening(false);
      simTimer = null;
    }, 2000);
  }

  function startVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { simulate(); return; }
    var heard = false;
    var me = null;
    try {
      me = rec = new SR();
      rec.lang = 'en-GB';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = function (ev) {
        heard = true;
        var text = '';
        for (var i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
        var input = document.getElementById('chat-input');
        if (input) { input.value = text; autosize(input); }
      };
      /* Only the current recogniser may change the screen (a stopped one
         still reports "aborted" afterwards). */
      rec.onerror = function (ev) {
        if (rec !== me || (ev && ev.error === 'aborted')) return;
        if (!heard) voiceFailed(ev && ev.error); else stopVoice();
      };
      rec.onend = function () { if (rec === me) { rec = null; setListening(false); } };
      setListening(true, 'Listening. Speak now, then press the microphone again to stop.');
      rec.start();
    } catch (e) { voiceFailed('start'); }
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'composer') {
      e.preventDefault();
      stopVoice();
      var input = document.getElementById('chat-input');
      D.send(input ? input.value : '');
    }
  });

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t && t.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      stopVoice();
      D.send(t.value);
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'chat-input') autosize(e.target);
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var say = t.closest('[data-action="say"]');
    if (say) { stopVoice(); D.send(say.getAttribute('data-text')); return; }
    if (t.closest('[data-action="mic"]')) {
      if (rec || simTimer) stopVoice(); else startVoice();
      return;
    }
    var rd = t.closest('[data-action="read"][data-msg]');
    if (rd) {
      var m = D.state.chat[+rd.getAttribute('data-msg')];
      if (m && m.reply) D.readAloud(m.reply.paragraphs.join(' '), rd);
      return;
    }
    if (t.closest('[data-action="help-now"]')) { D.helpNow(); return; }
  });

  D.leaveChat = stopVoice;
})();

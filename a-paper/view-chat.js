/* Landit design A, "Paper": the chat, the main screen.
   Replies come from LANDIT.chatReply (scripted, English only, no network). */
(function () {
  'use strict';
  var P = window.PAPER, L = P.L, esc = P.esc, icon = P.icon;

  function hour() { return new Date().getHours(); }

  /* Link the interface words the replies use. */
  function linkWords(html) {
    return html
      .replace(/\bBenefits\b/g, '<a href="#/benefits">Benefits</a>')
      .replace(/\bSettings\b/g, '<a href="#/settings">Settings</a>');
  }

  P.chatCard = function (id) {
    var b = L.benefitById(id);
    if (!b) return '';
    var c = P.cat(b.category), on = !!P.tracked(id), st = P.standing(id);
    var blocked = st.state === 'blocked';
    var nameSr = '<span class="sr-only"> ' + esc(b.name) + '</span>';
    return '<div class="ccard" style="--c: var(--cat-' + b.category + ')">' +
      '<div class="ccard-main">' +
        '<div class="ccard-top">' +
          '<span class="cat-badge"><span class="cat-ico sm" aria-hidden="true">' + icon(c.icon, 16) + '</span><span class="cat-label">' + esc(c.label) + '</span></span>' +
          (blocked ? '<span class="tag-quiet">' + esc(P.t('not_open')) + '</span>' : P.fitTag(id)) +
        '</div>' +
        '<p class="ccard-name">' + P.bdi(b.name) + '</p>' +
        '<div class="ccard-val">' + P.valueHtml(b, true) + '</div>' +
      '</div>' +
      '<div class="ccard-actions">' +
        '<a class="btn sm" href="#/benefit/' + b.id + '">' + icon('arrow-right', 16, 'flip-rtl') + '<span>Open</span>' + nameSr + '</a>' +
        /* No Track for a benefit the person cannot get, unless it is already tracked. */
        (!blocked || on ? P.trackButton(b) : '') +
        '<button type="button" class="btn sm" data-act="share" data-id="' + b.id + '">' + icon('share-2', 18) + '<span>' + esc(P.t('share')) + '</span>' + nameSr + '</button>' +
      '</div>' +
    '</div>';
  };

  function chips(list, label) {
    if (!list || !list.length) return '';
    return '<div class="chips" role="group" aria-label="' + esc(label) + '">' + list.map(function (s) {
      return '<button type="button" class="chip" dir="auto" data-act="ask" data-q="' + esc(s) + '">' + esc(s) + '</button>';
    }).join('') + '</div>';
  }

  function msgHtml(m) {
    if (m.role === 'user') {
      return '<div class="msg user" data-mid="' + m.id + '"><p class="sr-only">You said:</p><div class="bubble" dir="auto">' + esc(m.text) + '</div></div>';
    }
    var r = m.reply, key = 'msg-' + m.id;
    P.speechText[key] = r.paragraphs.join(' ');
    return '<div class="msg bot" data-mid="' + m.id + '">' +
      '<span class="bot-mark" aria-hidden="true">' + P.glyph(18) + '</span>' +
      '<div class="bot-body">' +
        '<p class="sr-only">Landit said:</p>' +
        '<div class="bot-text" dir="auto">' + r.paragraphs.map(function (p) { return '<p>' + linkWords(esc(p)) + '</p>'; }).join('') + '</div>' +
        (r.benefitIds && r.benefitIds.length ? '<div class="ccards">' + r.benefitIds.map(P.chatCard).join('') + '</div>' : '') +
        (r.action === 'help-now' ? '<button type="button" class="btn primary-soft help-btn" data-act="help-now">' + icon('life-buoy', 20) + '<span>Open ' + esc(P.t('nav_help')) + '</span></button>' : '') +
        '<div class="bot-tools">' + P.speakButton(key) + '</div>' +
        chips(r.suggestions, 'Suggested questions') +
      '</div>' +
    '</div>';
  }

  function emptyHtml() {
    return '<div class="chat-empty" id="chat-empty">' +
      '<div class="greet"><span class="greet-glyph" aria-hidden="true">' + P.glyph(40) + '</span>' +
        '<h1 class="greet-title">' + esc(L.chatGreeting(P.firstName(), hour(), P.lang())) + '</h1></div>' +
      '<p class="greet-sub">Ask me about money, services and rights you may be able to get in the UK. I use your answers to find what fits.</p>' +
      chips(L.chatStarters(P.state.profile), 'Questions to start with') +
    '</div>';
  }

  P.views.chat = {
    auth: true,
    shell: true,
    render: function () {
      var msgs = P.state.chat;
      var html = '<div class="chat">' +
        '<div class="chat-inner">' +
          (msgs.length ? '<h1 class="sr-only">' + esc(P.t('nav_chat')) + '</h1>' : emptyHtml()) +
          '<div class="chat-log" id="chat-log" role="log" aria-live="polite" aria-label="Conversation">' + msgs.map(msgHtml).join('') + '</div>' +
        '</div>' +
        /* Desktop: the composer and the disclaimer stay at the bottom together.
           Phones: only the composer stays; the disclaimer sits right under it
           and scrolls away when you read back up, which leaves room to read. */
        '<div class="dock">' +
          '<div class="dock-bar">' +
            '<form class="composer" data-form="chat" id="composer">' +
              '<p class="listen" id="listen" role="status" hidden></p>' +
              '<label class="sr-only" for="chat-input">Your question</label>' +
              '<textarea id="chat-input" class="composer-input" rows="1" data-input="chat" placeholder="' + esc(P.t('chat_placeholder')) + '" dir="auto">' + esc(P.ui.draft || '') + '</textarea>' +
              '<div class="composer-row">' +
                '<span class="composer-hint">Press Enter to send</span>' +
                '<button type="button" class="icon-btn mic" data-act="mic" aria-pressed="false" aria-label="Voice typing">' + icon('mic', 22) + '</button>' +
                '<button type="submit" class="send" aria-label="' + esc(P.t('send')) + '">' + icon('arrow-up', 22) + '</button>' +
              '</div>' +
            '</form>' +
          '</div>' +
          '<p class="dock-disc">' + esc(L.disclaimer) + '</p>' +
        '</div>' +
      '</div>';
      return {
        nav: 'chat',
        title: P.t('nav_chat'),
        html: html,
        keepScroll: true,
        after: function (opts) {
          var ta = document.getElementById('chat-input');
          if (ta) autosize(ta);
          if (msgs.length) window.scrollTo(0, document.documentElement.scrollHeight);
          else if (opts && opts.nav) window.scrollTo(0, 0);
        },
      };
    },
  };

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight + 2, 220) + 'px';
  }
  P.inputs.chat = function (ta) { P.ui.draft = ta.value; autosize(ta); };

  document.addEventListener('keydown', function (e) {
    if (e.target && e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      var form = document.getElementById('composer');
      if (form) form.requestSubmit ? form.requestSubmit() : P.forms.chat(form);
    }
  });

  function scrollToMsg(el) {
    if (!el) return;
    var smooth = !P.reducedMotion();
    var dock = document.querySelector('.dock'), bar = document.querySelector('.dock-bar');
    var dockH = dock && dock.offsetHeight ? dock.offsetHeight : (bar ? bar.offsetHeight : 0);
    var room = window.innerHeight - dockH - 24;
    if (el.offsetHeight > room * 0.85) {
      var top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: top, behavior: smooth ? 'smooth' : 'auto' });
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }
  }

  function appendMsg(m) {
    var log = document.getElementById('chat-log');
    if (!log) return null;
    var wrap = document.createElement('div');
    wrap.innerHTML = msgHtml(m);
    var el = wrap.firstChild;
    log.appendChild(el);
    P.postRender(el);
    return el;
  }

  function setBusy(on) {
    P.ui.busy = on;
    var send = document.querySelector('#composer .send');
    if (send) send.disabled = on;
  }

  P.sendChat = function (text) {
    text = String(text || '').trim();
    if (!text || P.ui.busy) return;
    var empty = document.getElementById('chat-empty');
    if (empty) {
      var h = document.createElement('h1');
      h.className = 'sr-only';
      h.textContent = P.t('nav_chat');
      empty.replaceWith(h);
    }
    var um = { id: P.uid(), role: 'user', text: text };
    P.state.chat.push(um);
    P.save();
    scrollToMsg(appendMsg(um));
    var reply = L.chatReply(text, { profile: P.state.profile, name: P.firstName(), lang: P.lang(), tracked: P.state.tracked });
    var bm = { id: P.uid(), role: 'bot', reply: reply };
    function deliver() {
      var typing = document.getElementById('typing');
      if (typing) typing.remove();
      P.state.chat.push(bm);
      P.save();
      setBusy(false);
      scrollToMsg(appendMsg(bm));
    }
    if (P.reducedMotion()) { deliver(); return; }
    setBusy(true);
    var log = document.getElementById('chat-log');
    if (log) {
      var t = document.createElement('div');
      t.className = 'msg bot typing';
      t.id = 'typing';
      t.innerHTML = '<span class="bot-mark" aria-hidden="true">' + P.glyph(18) + '</span>' +
        '<span class="dots" aria-hidden="true"><span></span><span></span><span></span></span><span class="sr-only">Landit is writing a reply</span>';
      log.appendChild(t);
      scrollToMsg(t);
    }
    window.setTimeout(deliver, 650 + Math.min(700, text.length * 8));
  };

  P.forms.chat = function (form) {
    var ta = form.querySelector('textarea');
    var text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    if (P.ui.busy) return;
    stopListening();
    ta.value = '';
    P.ui.draft = '';
    autosize(ta);
    P.sendChat(text);
  };
  P.acts.ask = function (el) {
    if (P.ui.busy) return;
    P.sendChat(el.getAttribute('data-q'));
    /* With a mouse, carry on typing. On a touch screen, do not open the
       keyboard over the answer that just arrived. */
    var fine = false;
    try { fine = window.matchMedia('(pointer: fine)').matches; } catch (e) { fine = false; }
    var ta = document.getElementById('chat-input');
    if (ta && fine) ta.focus({ preventScroll: true });
  };
  /* A click anywhere on the message box (not its buttons) puts the cursor in it. */
  document.addEventListener('click', function (e) {
    var box = e.target.closest ? e.target.closest('#composer') : null;
    if (!box || e.target.closest('button, textarea, a')) return;
    var ta = document.getElementById('chat-input');
    if (ta) ta.focus();
  });

  P.acts['new-chat'] = function () {
    var onChat = P.parseRoute().name === 'chat';
    if (!P.state.chat.length) {
      if (!onChat) { P.go('#/chat'); return; }
      P.closeDrawer(true);
      var ta = document.getElementById('chat-input');
      if (ta) ta.focus();
      return;
    }
    P.confirm({
      title: P.t('new_chat'),
      text: 'Start a new chat? This clears the conversation in Chat. Your tracked applications stay.',
      yes: P.t('new_chat'),
      onYes: function () {
        P.stopSpeaking();
        P.state.chat = [];
        P.ui.draft = '';
        P.save();
        if (onChat) P.render({ nav: true }); else P.go('#/chat');
      },
    });
  };

  /* ------------------------------------------------------------------ */
  /* Voice typing: the browser's speech recognition when there is one,  */
  /* otherwise a clearly labelled sample.                               */
  /* ------------------------------------------------------------------ */
  var rec = null, simTimer = null, token = 0;
  function setListening(on, note) {
    P.ui.listening = on;
    var btn = document.querySelector('#composer .mic');
    var line = document.getElementById('listen');
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Stop voice typing' : 'Voice typing');
      btn.classList.toggle('is-on', on);
    }
    if (line) {
      line.hidden = !on;
      line.innerHTML = on ? '<span class="listen-dot" aria-hidden="true"></span><span>' + esc(note) + '</span>' : '';
    }
  }
  function stopListening() {
    token++;
    window.clearTimeout(simTimer);
    if (rec) { try { rec.abort(); } catch (e) { /* stopped */ } rec = null; }
    if (P.ui.listening) setListening(false);
  }
  function simulate() {
    var my = ++token;
    setListening(true, 'Sample only: voice typing is not available here, so Landit adds an example question.');
    simTimer = window.setTimeout(function () {
      if (my !== token) return;
      var ta = document.getElementById('chat-input');
      var starters = L.chatStarters(P.state.profile);
      P.ui.sampleIdx = ((P.ui.sampleIdx || 0) + 1) % starters.length;
      if (ta) {
        ta.value = starters[P.ui.sampleIdx] || starters[0];
        P.ui.draft = ta.value;
        autosize(ta);
        ta.focus();
      }
      setListening(false);
      P.toast('Example question added. Press Send to ask it.');
    }, 2000);
  }
  P.acts.mic = function () {
    if (P.ui.listening) { stopListening(); return; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { simulate(); return; }
    try {
      var my = ++token, heard = false;
      rec = new SR();
      rec.lang = 'en-GB';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = function (e) {
        if (my !== token) return;
        heard = true;
        var text = '';
        for (var i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
        var ta = document.getElementById('chat-input');
        if (ta) { ta.value = text; P.ui.draft = text; autosize(ta); }
      };
      rec.onerror = function () { if (my === token && !heard) { rec = null; simulate(); } };
      rec.onend = function () {
        if (my !== token) return;
        rec = null;
        setListening(false);
        var ta = document.getElementById('chat-input');
        if (ta && heard) ta.focus();
      };
      setListening(true, 'Listening. Speak your question, then press Send.');
      rec.start();
    } catch (e) { rec = null; simulate(); }
  };
})();

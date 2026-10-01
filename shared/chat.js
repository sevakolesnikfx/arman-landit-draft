/* Landit click dummies: the pretend chat. Hand-written. Load after data.js,
   match.js and content.js.

   No AI and no network: forgiving keyword matching over the catalog and the
   person's answers. Every reply is built only from LANDIT data, says "may be
   able to", shows an amount only with its qualifier, and ends with 2 to 4
   suggested follow-ups. Replies are in English only (no new translations).

   The replies use these interface words, so designs should use them too:
   "Benefits", "Settings", "Help now", "Track", "sidebar".
   API: shared/README.md */
(function (L) {
  'use strict';
  if (!L || !L.match || !L.questionnaire) throw new Error('Load data.js, match.js and content.js before chat.js');

  /* ---------------------------------------------------------------- */
  /* Forgiving text matching                                           */
  /* ---------------------------------------------------------------- */

  function norm(s) {
    return String(s || '').toLowerCase().replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function toks(s) { return norm(s).split(' ').filter(Boolean); }

  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      var best = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  /* A typed word matches a keyword exactly, or with one typo (two for long
     words). A real word spelled correctly is never read as a typo of a
     different keyword: "classes" is not "glasses", "course" is not
     "recourse", "later" is not "water", "think" is not "thank". Endings
     still match ("dentists", "doctors", "railcards"). See KNOWN below. */
  function wm(tok, kw) {
    if (tok === kw) return true;
    if (kw.length < 5 || tok.length < 4) return false;
    if (KNOWN[tok] && tok.indexOf(kw) !== 0 && kw.indexOf(tok) !== 0) return false;
    var max = kw.length >= 8 ? 2 : 1;
    return lev(tok, kw, max) <= max;
  }
  function hasPhrase(ts, phrase) {
    var p = phrase.split(' ');
    for (var i = 0; i + p.length <= ts.length; i++) {
      var ok = true;
      for (var j = 0; j < p.length && ok; j++) ok = wm(ts[i + j], p[j]);
      if (ok) return true;
    }
    return false;
  }
  function hasAny(ts, list) {
    for (var i = 0; i < list.length; i++) if (hasPhrase(ts, list[i])) return true;
    return false;
  }
  function hasExact(ts, list) {
    var joined = ' ' + ts.join(' ') + ' ';
    for (var i = 0; i < list.length; i++) if (joined.indexOf(' ' + list[i] + ' ') >= 0) return true;
    return false;
  }

  /* Real words, so wm() does not treat them as typos: every word of 4 or
     more letters in the catalog text Landit shows, plus everyday words that
     sit one or two letters away from a keyword. Found by testing every
     catalog word and a list of common words against every keyword. */
  var NOT_TYPOS = ['class', 'classes', 'course', 'courses', 'resource', 'resources', 'later', 'think', 'eating', 'beating',
    'heading', 'seating', 'cheating', 'means', 'deals', 'earning', 'earnings', 'leaving', 'clearing', 'interest', 'residence',
    'mental', 'quality', 'legible', 'titled', 'evident', 'waiter', 'truck', 'trick', 'crack', 'roof', 'honey', 'monkey',
    'wealth', 'uses', 'cares', 'cars', 'farms', 'fires', 'finds', 'goods', 'gravel', 'prone', 'shone', 'wafer', 'seals',
    'trading', 'stacking', 'nothing', 'giving', 'having', 'yours', 'worth', 'watch', 'match', 'order', 'holder', 'related',
    'refuse', 'white', 'words', 'states', 'stats', 'across', 'gross', 'dates', 'changes', 'charge', 'counts', 'amounts', 'bands',
    'employee', 'employees', 'exception', 'deduction', 'medication', 'inability', 'dependent', 'earner', 'repayment',
    'repayments', 'registry', 'roles', 'closing', 'pills'];
  var KNOWN = {};
  (function () {
    var add = function (s) { toks(s).forEach(function (w) { if (w.length >= 4 && !/\d/.test(w)) KNOWN[w] = true; }); };
    NOT_TYPOS.forEach(add);
    L.benefits.forEach(function (b) {
      [b.name, b.sub, b.about].concat(b.rules, b.guide.steps, b.guide.boost, [b.guide.watch], b.docs.map(function (d) { return d.label; })).forEach(add);
    });
  })();

  var KW = {
    /* Safety words match exactly (no typo tolerance), so "policy" never reads as "police". */
    urgent: ['help now', 'emergency', 'emergancy', 'emergengy', 'urgent', 'urgently', 'danger', 'dangerous', 'unsafe', 'not safe',
      'police', 'abuse', 'abused', 'violence', 'violent', 'hurt', 'hurts', 'hurting', 'suicide', 'suicidal', 'kill myself', 'scared',
      'afraid', 'attacked', 'threatened', '999'],
    abuse: ['abuse', 'abused', 'violence', 'violent', 'hurt', 'hurts', 'hurting', 'attacked', 'threatened', 'scared', 'afraid'],
    nrpf: ['no recourse', 'nrpf', 'public funds', 'public fund', 'recourse'],
    tracking: ['track', 'tracking', 'tracked', 'tracker', 'sidebar', 'my applications', 'application status'],
    docs: ['document', 'documents', 'doc', 'docs', 'papers', 'paperwork', 'proof', 'evidence', 'what do i need', 'need to bring', 'id'],
    councilTax: ['council tax', 'counciltax'],
    travel: ['travel', 'bus', 'buses', 'train', 'trains', 'rail', 'transport', 'bike', 'bicycle', 'cycle', 'fare', 'fares', 'ticket', 'tickets', 'commute'],
    health: ['health', 'doctor', 'doctors', 'nhs', 'dentist', 'dental', 'prescription', 'prescriptions', 'medicine', 'medicines',
      'pills', 'eye', 'eyes', 'glasses', 'optician', 'opticians', 'hospital', 'sick', 'ill', 'mental', 'vaccine', 'vaccination'],
    bills: ['bill', 'bills', 'energy', 'gas', 'electric', 'electricity', 'heating', 'heat', 'water', 'broadband', 'internet', 'wifi',
      'phone', 'mobile', 'sim', 'utilities'],
    childcare: ['childcare', 'child care', 'nursery', 'children', 'child', 'kids', 'kid', 'baby', 'babies', 'school'],
    food: ['food', 'hungry', 'groceries', 'meal', 'meals', 'eat', 'eating'],
    /* Learning English: "english" or "esol" alone, or "language" with a learning word. */
    english: ['english', 'esol'],
    language: ['language', 'languages'],
    learn: ['learn', 'learning', 'class', 'classes', 'course', 'courses', 'lesson', 'lessons', 'study', 'teacher', 'tutor',
      'school', 'college', 'conversation', 'speak', 'speaking', 'practice', 'practise', 'improve'],
    claim: ['claim', 'claims', 'eligible', 'entitled', 'qualify', 'benefits', 'benefit', 'money', 'what can i get', 'can i get',
      'what can i', 'options', 'schemes', 'scheme', 'support', 'help me'],
    about: ['what can you do', 'how does this work', 'how do you work', 'who are you', 'what is landit', 'what are you', 'help'],
    thanks: ['thanks', 'thank', 'thank you', 'thx', 'cheers', 'ty'],
    hello: ['hello', 'hi', 'hey', 'helo', 'hiya', 'good morning', 'good afternoon', 'good evening', 'salam', 'hola'],
  };

  /* Short names people use for schemes. */
  var ALIASES = {
    'railcard': 'railcard-16-25', 'rail card': 'railcard-16-25',
    'oyster': 'student-oyster',
    'hardship fund': 'uni-hardship-fund', 'hardship': 'uni-hardship-fund',
    'lifetime isa': 'lisa', 'lisa': 'lisa',
    'universal credit': 'universal-credit', 'uc': 'universal-credit',
    'child benefit': 'child-benefit',
    'national insurance': 'nino', 'nino': 'nino', 'ni number': 'nino',
    'gp': 'gp-registration', 'register with a gp': 'gp-registration', 'gp registration': 'gp-registration',
    'low income scheme': 'nhs-low-income-scheme', 'hc1': 'nhs-low-income-scheme', 'hc2': 'nhs-low-income-scheme', 'hc3': 'nhs-low-income-scheme',
    'tax refund': 'tax-refund', 'emergency tax': 'tax-refund',
    'bank account': 'basic-bank-account',
    'food bank': 'trussell-food-banks', 'food banks': 'trussell-food-banks', 'foodbank': 'trussell-food-banks',
    'change of conditions': 'coc-lift-nrpf',
    'fee waiver': 'fee-waiver',
    'pip': 'pip', 'personal independence': 'pip',
    'learning support fund': 'nhs-learning-support-fund',
    'council tax reduction': 'council-tax-reduction',
    'class n': 'council-tax-student', 'student exemption': 'council-tax-student',
    'marriage allowance': 'marriage-allowance',
    'tax free childcare': 'tax-free-childcare',
    'warm home discount': 'warm-home-discount',
    'free courses for jobs': 'free-courses-for-jobs',
    'prepayment certificate': 'prescription-charges-and-the-prepayment',
    'kings trust': 'kings-trust', 'king s trust': 'kings-trust',
    'start up loan': 'start-up-loans', 'start up loans': 'start-up-loans',
    'help to save': 'help-to-save',
    'library': 'public-libraries', 'libraries': 'public-libraries',
    'energy trust': 'bg-energy-trust', 'british gas': 'bg-energy-trust',
    'student discount': 'student-discount-platforms', 'totum': 'student-discount-platforms', 'unidays': 'student-discount-platforms',
    'asylum support': 's95-asylum-support', 'section 95': 's95-asylum-support',
    'immigration advice': 'free-regulated-immigration-advice', 'legal advice': 'free-regulated-immigration-advice',
  };
  var ALIAS_KEYS = Object.keys(ALIASES).sort(function (a, b) { return b.length - a.length; });

  /* Words too common to identify a scheme on their own. */
  var COMMON = ['free', 'the', 'and', 'for', 'of', 'a', 'an', 'in', 'to', 'with', 'on', 'or', 'by', 'at', 'from', 'your', 'my',
    'scheme', 'schemes', 'support', 'payment', 'payments', 'help', 'grant', 'grants', 'fund', 'funds', 'uk', 'england', 'scotland',
    'wales', 'ni', 'northern', 'ireland', 'card', 'service', 'services', 'programme', 'local', 'council', 'tax', 'child', 'children',
    'school', 'travel', 'food', 'bus', 'water', 'energy', 'health', 'nhs', 'student', 'students', 'allowance', 'benefit', 'benefits',
    'route', 'nrpf', 'and', 'all', 'up', 'new', 'what', 'is', 'about', 'tell', 'me', 'how', 'do', 'i', 'get', 'can',
    /* Names now spell out "no recourse to public funds" (build-data PLAIN
       rules), so these words must not pick a scheme over the NRPF answer. */
    'no', 'recourse', 'public',
    /* "learning" alone named NHS Learning Support Fund ("learning English",
       "a learning disability"); that scheme is found by its alias instead. */
    'learning'];

  /* Topic words ("childcare", "travel") pick a topic, not a scheme. */
  var TOPIC_WORDS = [].concat(KW.travel, KW.health, KW.bills, KW.childcare, KW.food, KW.docs, KW.claim);

  var NAME_TOKENS = L.benefits.map(function (b) {
    var ts = toks(b.name).filter(function (t) { return t.length > 1 && COMMON.indexOf(t) < 0 && !/^\d+$/.test(t); });
    return { b: b, ts: ts.filter(function (t, i) { return ts.indexOf(t) === i; }) };
  });

  /* The scheme a message is clearly about, or null. */
  function findScheme(ts, openIds) {
    for (var i = 0; i < ALIAS_KEYS.length; i++) {
      if (hasPhrase(ts, ALIAS_KEYS[i])) return L.benefitById(ALIASES[ALIAS_KEYS[i]]);
    }
    var best = null;
    NAME_TOKENS.forEach(function (n) {
      if (!n.ts.length) return;
      var hit = n.ts.filter(function (t) { return ts.some(function (u) { return wm(u, t); }); }).length;
      var ratio = hit / n.ts.length;
      var single = hit === 1 && n.ts.length === 1 && n.ts[0].length >= 6 && TOPIC_WORDS.indexOf(n.ts[0]) < 0;
      var strong = (hit >= 2 && ratio >= 0.6) || single;
      if (!strong) return;
      var s = hit * 10 + ratio * 5 + (openIds[n.b.id] ? 3 : 0);
      if (!best || s > best.s) best = { s: s, b: n.b };
    });
    return best ? best.b : null;
  }

  /* ---------------------------------------------------------------- */
  /* Wording helpers                                                   */
  /* ---------------------------------------------------------------- */

  /* Lower-case the first letter for use mid-sentence, but never for names,
     acronyms or a first word that starts a name ("National Insurance"). */
  var PROPER = ['England', 'English', 'Scotland', 'Scottish', 'Wales', 'Welsh', 'Ireland', 'Irish', 'London', 'British',
    'Britain', 'Ukraine', 'Ukrainian', 'Growth', 'Big', 'Too', 'Suited', 'Healthy', 'Home', 'Universal', 'Council'];
  var ALWAYS_LOWER = ['A', 'An', 'The', 'Your', 'Both', 'Some', 'Any', 'Free'];
  function lcFirst(s) {
    if (!s) return s;
    var words = s.split(' ');
    var bare = function (x) { return x.replace(/['\u2019]s$/, '').replace(/[^A-Za-z]/g, ''); };
    var w = bare(words[0]);   // "Scotland's" reads as "Scotland"
    if (ALWAYS_LOWER.indexOf(w) >= 0) return s.charAt(0).toLowerCase() + s.slice(1);
    if (!/^[A-Z][a-z]/.test(w) || PROPER.indexOf(w) >= 0) return s;
    // A capital second word means a name ("National Insurance"), unless it is a
    // proper word on its own ("Funded English classes").
    if (words[1] && /^[A-Z]/.test(words[1]) && PROPER.indexOf(bare(words[1])) < 0) return s;
    return s.charAt(0).toLowerCase() + s.slice(1);
  }
  function list(items, word) {
    if (items.length <= 1) return items.join('');
    var sep = items.some(function (x) { return x.indexOf(',') >= 0; }) ? '; ' : ', ';
    return items.slice(0, -1).join(sep) + (sep === '; ' ? '; ' : ' ') + (word || 'and') + ' ' + items[items.length - 1];
  }
  /* The amount with its qualifier, for "It could be worth ...":
     "£1,800 (typical annual saving)", "£100 a year", "£2,000, per child per
     year (up to)". null when there is no amount. */
  function amount(b) {
    if (typeof b.value !== 'number') return null;
    var money = L.formatMoney(b.value), label = b.valueLabel || '';
    if (/^could be worth/i.test(label)) {
      var rest = label.replace(/^could be worth,?\s*/i, '');
      return money + (rest ? ' ' + rest : '');
    }
    if (!label) return money;
    return money + (label.indexOf('(') >= 0 ? ', ' + lcFirst(label) : ' (' + lcFirst(label) + ')');
  }
  /* "Name: short line." or "Name. Short line." when the line has its own colon. */
  function nameLine(b) {
    return b.sub.indexOf(':') >= 0 ? sentence(b.name) + ' ' + sentence(b.sub) : sentence(b.name + ': ' + lcFirst(b.sub));
  }
  function worthLine(b) { var a = amount(b); return a ? ' It could be worth ' + a + '.' : ''; }
  function sentence(s) { s = String(s).trim(); return /[.!?]$/.test(s) ? s : s + '.'; }
  function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }

  function reply(paragraphs, benefitIds, suggestions, action) {
    var r = {
      paragraphs: paragraphs.filter(Boolean).slice(0, 3),
      benefitIds: uniq(benefitIds || []),
      suggestions: uniq(suggestions || []).slice(0, 4),
    };
    if (r.suggestions.length < 2) r.suggestions = uniq(r.suggestions.concat(['What can I claim?', 'How does tracking work?'])).slice(0, 4);
    if (action) r.action = action;
    return r;
  }

  /* Every reply that names an open scheme the matcher marks 'possible'
     (m.fit) says so, in one of two fixed sentences: one for a single
     scheme, one for a list. '' when every named scheme is confirmed, or
     none is open. */
  var DEPENDS_ONE = 'It depends on your situation, so check the details first.';
  var DEPENDS_LIST = 'Some of these depend on your situation, so check the details first.';
  function dependsNote(named, m) {
    var any = named.some(function (b) { return b && m.fit[b.id] === 'possible'; });
    return any ? (named.length > 1 ? DEPENDS_LIST : DEPENDS_ONE) : '';
  }
  /* "1 benefit", "3 benefits": the word the designs use for the person's list. */
  function nBenefits(n) { return n + (n === 1 ? ' benefit' : ' benefits'); }

  /* Where a scheme stands for this person: open, blocked, or why hidden. */
  function standing(b, m, profile) {
    for (var i = 0; i < m.open.length; i++) if (m.open[i].id === b.id) return { state: 'open' };
    for (var j = 0; j < m.blocked.length; j++) if (m.blocked[j].benefit.id === b.id) return { state: 'blocked', text: m.blocked[j].reason };
    var f = L._facts(profile);
    if (b.closed) return { state: 'hidden', text: 'This scheme has ended or is suspended, so it is not open to new claims.' };
    if (b.nations.indexOf(f.nation) < 0) return { state: 'hidden', text: 'This one is only in ' + b.regionLabel + ', so Landit does not show it for ' + f.nation + '.' };
    if (!f.status) return { state: 'hidden', text: 'Whether this is open depends on your visa. Add your visa type in Settings to check.' };
    var gated = b.publicFunds || b.nrpf === 'no';
    if (!gated && b.who.indexOf('all') < 0 && b.who.indexOf(f.status) < 0) {
      return { state: 'hidden', text: 'This one is not listed for your visa, so Landit does not show it to you.' };
    }
    var need = L._needs[b.id];
    if (need && need(f) === false) return { state: 'hidden', text: 'Your answers suggest it does not fit your situation. If that is wrong, update your answers in Settings.' };
    return { state: 'hidden', text: 'This one is not listed for your visa, so Landit does not show it to you.' };
  }

  function docsSentences(b) {
    if (!b.docsKnown) return 'Landit has no document list for this one yet. Check the official page before you start.';
    var needed = b.docs.filter(function (d) { return d.certainty === 'needed'; }).map(function (d) { return d.label; });
    var maybe = b.docs.filter(function (d) { return d.certainty === 'maybe'; }).map(function (d) { return d.label; });
    var out = [];
    if (needed.length) out.push('You will need: ' + list(needed.map(lcFirst)) + '.');
    if (maybe.length) out.push('You may also need: ' + list(maybe.map(lcFirst)) + '.');
    if (b.guide.needNote) out.push(sentence(b.guide.needNote));
    if (!out.length) out.push('There is nothing to gather for this one.');
    return out.join(' ');
  }

  /* ---------------------------------------------------------------- */
  /* Replies                                                           */
  /* ---------------------------------------------------------------- */

  var SUGGEST = {
    claim: 'What can I claim?',
    nrpf: 'What does no recourse to public funds mean?',
    docs: 'Which documents do I need?',
    tracking: 'How does tracking work?',
    travel: 'Help with travel costs',
    health: 'Help with health costs',
    bills: 'Help with bills',
    food: 'Tell me about food banks',
  };

  function schemeReply(b, m, ctx) {
    var st = standing(b, m, ctx.profile);
    var p1 = nameLine(b);
    if (st.state === 'open') {
      p1 += ' You may be able to get this.';
      if (m.fit[b.id] === 'possible') p1 += ' ' + DEPENDS_ONE;
    } else {
      p1 += ' ' + st.text;
    }
    var bits = [];
    var a = amount(b);
    if (a) bits.push((st.state === 'open' ? 'It could be worth ' : 'For people who can get it, it could be worth ') + a + '.');
    else if (b.valueLabel) bits.push('Landit lists it as: ' + lcFirst(b.valueLabel) + '.');
    if (!b.guide.generic && b.guide.time) bits.push('Time to apply: ' + lcFirst(b.guide.time) + '.');
    if (!b.guide.generic && b.guide.decision) bits.push('Decision: ' + lcFirst(b.guide.decision) + '.');
    var p3 = st.state === 'open' ? docsSentences(b) : null;
    return reply([p1, bits.join(' ') || null, p3], [b.id],
      st.state === 'open' ? [SUGGEST.tracking, SUGGEST.claim, SUGGEST.nrpf] : [SUGGEST.nrpf, SUGGEST.claim, SUGGEST.docs]);
  }

  /* Order for the chat's picks. First the matcher's certainty (m.fit, the
     same rule as LANDIT.rankForHighlights): confirmed before possible, so a
     single student never asked about a partner does not see Marriage
     Allowance first. Inside the possible group, the older tie-breaks stay:
     a life-situation rule the answers did not confirm (a parent who did
     not say "expecting" and Maternity Allowance) goes after other possible
     schemes, and catalog "depends" schemes after those. 0 is best. */
  function pickRank(m, profile) {
    var f = L._facts(profile || {});
    return function (b) {
      if (m.fit[b.id] === 'confirmed') return 0;
      var need = L._needs[b.id];
      return 4 + (need && need(f) !== true ? 2 : 0) + (b.nrpf === 'depends' ? 1 : 0);
    };
  }

  /* The best few with an amount, in pickRank order, then largest amount. */
  function pickTop(open, n, m, profile) {
    var rank = pickRank(m, profile);
    return open.filter(function (b) { return typeof b.value === 'number'; }).sort(function (a, b) {
      return (rank(a) - rank(b)) || (b.value - a.value) || (a.entry - b.entry);
    }).slice(0, n);
  }

  function claimReply(m, ctx) {
    var top = pickTop(m.open, 3, m, ctx.profile);
    var p1;
    if (!m.known) {
      p1 = 'You have not told Landit your visa type yet, so I can only show benefits that are open to everyone. There ' + (m.open.length === 1 ? 'is 1' : 'are ' + m.open.length) + '. Add your visa type in Settings to see more.';
    } else {
      p1 = L.statusPhrase(m.status) + ' in ' + m.nation + ', you may be able to get ' + nBenefits(m.open.length) + '. ' + m.withValue + ' of them ' + (m.withValue === 1 ? 'has' : 'have') + ' an amount.';
      if (m.nrpf && m.blocked.length) p1 += ' ' + m.blocked.length + (m.blocked.length === 1 ? ' other is' : ' others are') + ' not open to you because of your visa condition.';
    }
    var note = dependsNote(top, m);
    var p2 = top.length ? (top.length === 1 ? 'Here is one to look at first. ' : 'Here are ' + top.length + ' to look at first. ') +
      top.map(function (b) { return sentence(b.name + ': ' + (/^could be worth/i.test(b.valueLabel || '') ? 'could be worth ' : '') + amount(b)); }).join(' ') +
      (note ? ' ' + note : '') : null;
    var p3 = (m.total ? 'All the amounts together come to ' + L.formatMoney(m.total) + '. That is the ' + lcFirst(L.potentialLabel) + '. ' : '') + 'Open Benefits to see the full list.';
    return reply([p1, p2, p3], top.map(function (b) { return b.id; }),
      [SUGGEST.docs, m.nrpf ? SUGGEST.nrpf : SUGGEST.travel, SUGGEST.tracking]);
  }

  function nrpfReply(m, ctx) {
    var p1 = 'Public funds are a fixed list in paragraph 6.2 of the Immigration Rules. If a scheme is not on that list, the no recourse to public funds condition does not apply to it. Only the scheme\'s own rules matter.';
    var p2, p3 = null, ids = [];
    if (!m.known) p2 = 'Add your visa type in Settings, and Landit will show which benefits this affects for you.';
    else if (m.nrpf) {
      p2 = 'Your visa has this condition. Landit set aside ' + nBenefits(m.blocked.length) + ' that are public funds or need one, and shows ' + m.open.length + ' that your condition does not touch.';
      var adv = L.benefitById('free-regulated-immigration-advice');
      if (adv && m.open.indexOf(adv) >= 0) {
        var advNote = dependsNote([adv], m);
        p3 = 'If you are not sure about your conditions, free regulated immigration advice can help.' + (advNote ? ' ' + advNote : '');
        ids.push(adv.id);
      }
    } else p2 = 'Your status does not carry this condition, so support based on income and savings is included.';
    var sug = [SUGGEST.claim, SUGGEST.bills];
    var coc = L.benefitById('coc-lift-nrpf');
    if (m.nrpf && coc && m.open.indexOf(coc) >= 0) sug.unshift('Tell me about Change of Conditions');
    return reply([p1, p2, p3], ids, sug);
  }

  function urgentReply(ts, ctx) {
    var nation = (ctx.profile && ctx.profile.nation) || 'England';
    var items = {};
    (L.safety[nation] || []).forEach(function (g) { g.items.forEach(function (it) { items[it.id] = it; }); });
    var p1 = items['999'] ? 'If you are in danger now, call ' + items['999'].number + '. It is free, any time, from any phone.' : null;
    var health = items['111'] ? 'For urgent health advice, call ' + items['111'].number + '.' : (items['ni-health'] ? 'For urgent health advice, contact ' + lcFirst(items['ni-health'].number) + '.' : '');
    var talk = items.samaritans ? ' To talk to someone, call Samaritans on ' + items.samaritans.number + '.' : '';
    var p2 = (health + talk).trim() || null;
    var p3 = hasExact(ts, KW.abuse)
      ? L.safetyNotes.independence.split(/(?<=\.)\s+/).slice(0, 2).join(' ')
      : 'If you need food today, a food bank may help. Open Help now for more numbers.';
    return reply([p1, p2, p3], [], [SUGGEST.food, SUGGEST.claim, SUGGEST.nrpf], 'help-now');
  }

  function trackingReply(m, ctx) {
    var tracked = (ctx.tracked || []).filter(function (t) { return L.benefitById(t.id); });
    var p1 = 'Tracking keeps the benefits you are working on in your sidebar. Open one in Benefits and choose Track.';
    var p2 = 'For each one, you can tick the documents you have, and note where you are: ' + list(L.trackStatuses.map(function (s) { return s.value; }), 'or') + '.';
    var note = dependsNote(tracked.map(function (t) { return L.benefitById(t.id); }), m);
    var p3 = tracked.length
      ? 'You are tracking ' + tracked.length + ': ' + list(tracked.map(function (t) { return L.benefitById(t.id).name + ' (' + lcFirst(t.status || 'Not started') + ')'; })) + '.' + (note ? ' ' + note : '')
      : 'You are not tracking anything yet.';
    return reply([p1, p2, p3], tracked.map(function (t) { return t.id; }), [SUGGEST.docs, SUGGEST.claim]);
  }

  function docsReply(m, ctx) {
    var tracked = (ctx.tracked || []).filter(function (t) { return L.benefitById(t.id) && L.benefitById(t.id).docsKnown; });
    var target = null, t = null;
    for (var i = 0; i < tracked.length && !target; i++) {
      var b = L.benefitById(tracked[i].id);
      if ((tracked[i].ticked || []).length < b.docs.length) { target = b; t = tracked[i]; }
    }
    if (!target && tracked.length) { t = tracked[0]; target = L.benefitById(t.id); }
    if (!target) target = pickTop(m.open.filter(function (b) { return b.docsKnown && b.docs.length; }), 1, m, ctx.profile)[0]
      || m.open.filter(function (b) { return b.docsKnown && b.docs.length; })[0];
    if (!target) return reply(['Tell me which benefit you mean, and I will list what you need.'], [], [SUGGEST.claim, SUGGEST.tracking]);
    var p1 = 'For ' + target.name + ', ' + lcFirst(docsSentences(target));
    var note = dependsNote([target], m);
    var p2 = (note ? note + ' ' : '') + (t
      ? 'You have ticked ' + (t.ticked || []).length + ' of ' + target.docs.length + '. Open it from your sidebar to tick the rest.'
      : 'Track it to keep this list in your sidebar and tick things off.');
    return reply([p1, p2], [target.id], [SUGGEST.tracking, SUGGEST.claim, SUGGEST.nrpf]);
  }

  var TOPIC = {
    travel: { cats: ['transport'], word: 'travel' },
    health: { cats: ['health'], word: 'health' },
    bills: { cats: ['energy', 'water', 'utilities'], word: 'bills' },
    childcare: { cats: ['childcare', 'family'], word: 'childcare and family' },
    food: { cats: ['food'], word: 'food' },
    /* By id: there is no "English" category. In the order a learner would
       look at them; certainty still comes first (pickRank). */
    english: { ids: ['esol-funding', 'free-english-conversation-clubs', 'public-libraries'], word: 'learning English' },
  };

  function topicReply(key, m, ctx) {
    var tp = TOPIC[key];
    var prof = ctx.profile || {};
    if (key === 'childcare' && prof.children === 'no') {
      return reply(['You told Landit you have no children who live with you, so childcare benefits are hidden.',
        'If that changes, update your answers in Settings.'], [], [SUGGEST.claim, SUGGEST.travel, SUGGEST.bills]);
    }
    var inTopic = tp.ids
      ? function (b) { return tp.ids.indexOf(b.id) >= 0; }
      : function (b) { return tp.cats.indexOf(b.category) >= 0; };
    var items = m.open.filter(inTopic);
    var rank = pickRank(m, prof);
    var ordered = items.slice().sort(function (a, b) {
      return (rank(a) - rank(b)) || (tp.ids ? tp.ids.indexOf(a.id) - tp.ids.indexOf(b.id) : 0) ||
        ((typeof b.value === 'number') - (typeof a.value === 'number')) ||
        ((b.value || 0) - (a.value || 0)) || (a.guide.generic - b.guide.generic) || (a.entry - b.entry);
    }).slice(0, 3);
    var blockedHere = m.blocked.filter(function (x) { return inTopic(x.benefit); });
    var blockedLine = blockedHere.length ? (items.length ? blockedHere.length + (blockedHere.length === 1 ? ' other is' : ' others are') : nBenefits(blockedHere.length) + (blockedHere.length === 1 ? ' is' : ' are')) + ' not open to you because of your visa condition.' : null;
    /* A topic chosen by id also says why a named scheme is not shown
       ("Free ESOL courses: this one is not listed for your visa..."). */
    var hiddenLine = tp.ids ? tp.ids.map(function (id) { return L.benefitById(id); }).filter(function (b) {
      return b && items.indexOf(b) < 0 && !blockedHere.some(function (x) { return x.benefit === b; });
    }).map(function (b) { return b.name + ': ' + lcFirst(standing(b, m, prof).text); }).join(' ') || null : null;
    if (!items.length) {
      return reply(['I did not find a benefit for ' + tp.word + ' that is open to you right now.', blockedLine, hiddenLine],
        [], [SUGGEST.claim, SUGGEST.nrpf]);
    }
    var p1 = 'Here ' + (ordered.length === 1 ? 'is 1' : 'are ' + ordered.length) + (ordered.length < items.length ? ' of ' + items.length : '') +
      (items.length === 1 ? ' benefit' : ' benefits') + ' for ' + tp.word + ' that you may be able to use.';
    var note = dependsNote(ordered, m);
    var p2 = ordered.map(function (b) { return nameLine(b) + worthLine(b); }).join(' ') + (note ? ' ' + note : '');
    var p3 = tp.ids
      ? [hiddenLine, blockedLine].filter(Boolean).join(' ') || null
      : (blockedLine ? blockedLine + ' ' : '') + 'See them all in Benefits.';
    var next = { travel: [SUGGEST.bills, SUGGEST.health], health: [SUGGEST.travel, SUGGEST.bills], bills: [SUGGEST.travel, SUGGEST.health], childcare: [SUGGEST.claim, SUGGEST.health], food: [SUGGEST.bills, SUGGEST.claim], english: [SUGGEST.claim, SUGGEST.travel] }[key];
    return reply([p1, p2, p3], ordered.map(function (b) { return b.id; }), next.concat([SUGGEST.docs]));
  }

  function councilTaxReply(m, ctx) {
    var isCt = function (b) { return /council tax/i.test(b.name); };
    var open = m.open.filter(isCt);
    var blocked = m.blocked.filter(function (x) { return isCt(x.benefit); });
    var note = dependsNote(open, m);
    var p1 = open.length
      ? open.map(function (b) { return nameLine(b) + worthLine(b); }).join(' ') + ' You may be able to get ' + (open.length === 1 ? 'this' : 'these') + '.' + (note ? ' ' + note : '')
      : 'I did not find a council tax discount open to you right now.';
    var p2 = blocked.length ? list(blocked.map(function (x) { return x.benefit.name; })) + (blocked.length === 1 ? ' is' : ' are') + ' different. ' + blocked[0].reason : null;
    var first = open[0];
    var p3 = first && !first.guide.generic ? 'Time to apply: ' + lcFirst(first.guide.time) + '. Decision: ' + lcFirst(first.guide.decision) + '.' : null;
    return reply([p1, p2, p3], open.map(function (b) { return b.id; }).concat(blocked.map(function (x) { return x.benefit.id; })),
      [first ? 'What documents do I need for ' + first.name + '?' : SUGGEST.claim, SUGGEST.nrpf, SUGGEST.bills]);
  }

  /* ---------------------------------------------------------------- */
  /* Public API                                                        */
  /* ---------------------------------------------------------------- */

  L.chatStarters = function (profile) {
    var p = profile || {};
    var out = [SUGGEST.claim];
    if (p.status === 'student') out.push('Council tax as a student');
    if (p.children === 'yes' || p.children === 'expecting') out.push('Help with childcare');
    var nrpf = L.match(p).nrpf;
    if (nrpf !== false) out.push(SUGGEST.nrpf);
    out.push(SUGGEST.travel, SUGGEST.bills, SUGGEST.health);
    return uniq(out).slice(0, 5);
  };

  L.chatGreeting = function (name, hour, lang) {
    var h = typeof hour === 'number' ? hour : new Date().getHours();
    var key = h >= 5 && h < 12 ? 'greet_morning' : (h >= 12 && h < 18 ? 'greet_afternoon' : 'greet_evening');
    return L.t(key, lang) + (name ? ', ' + name : '');
  };

  L.chatReply = function (text, ctx) {
    ctx = ctx || {};
    var profile = ctx.profile || {};
    var ts = toks(text);
    var m = L.match(profile);
    var openIds = {};
    m.open.forEach(function (b) { openIds[b.id] = true; });

    if (!ts.length) return reply(['Type a question, or pick one of these.'], [], L.chatStarters(profile));

    // "Emergency tax" is a payslip question, not an emergency.
    var tsSafety = norm(text).replace(/\bemergency tax\b/g, 'tax').split(' ');
    if (hasExact(tsSafety, KW.urgent)) return urgentReply(ts, ctx);

    // Learning English: before scheme names, so "english classes" is not read as a
    // health question and "learning english" does not pick NHS Learning Support Fund.
    if (hasAny(ts, KW.english) || (hasAny(ts, KW.language) && hasAny(ts, KW.learn))) return topicReply('english', m, ctx);

    var scheme = findScheme(ts, openIds);
    if (hasAny(ts, KW.nrpf) && !scheme) return nrpfReply(m, ctx);
    if (scheme) return schemeReply(scheme, m, ctx);
    if (hasAny(ts, KW.docs)) return docsReply(m, ctx);
    if (hasAny(ts, KW.tracking)) return trackingReply(m, ctx);
    if (hasAny(ts, KW.councilTax)) return councilTaxReply(m, ctx);
    var topics = ['travel', 'health', 'bills', 'childcare', 'food'];
    for (var i = 0; i < topics.length; i++) if (hasAny(ts, KW[topics[i]])) return topicReply(topics[i], m, ctx);
    if (hasAny(ts, KW.claim)) return claimReply(m, ctx);
    if (hasAny(ts, KW.about)) {
      return reply(['I answer questions using Landit\'s list of UK benefits and the answers you gave. I give information, not advice.',
        'This prototype can answer a few example questions. Try one of these.'], [], L.chatStarters(profile));
    }
    if (hasAny(ts, KW.thanks)) return reply(['You are welcome. Ask me anything else about benefits, documents or tracking.'], [], L.chatStarters(profile).slice(0, 3));
    if (hasAny(ts, KW.hello)) {
      return reply(['Hello' + (ctx.name ? ' ' + ctx.name : '') + '. I can help you find money, services and rights you may be able to get in the UK.',
        'What would you like to know?'], [], L.chatStarters(profile).slice(0, 4));
    }
    return reply(['Sorry, I did not understand that. This prototype can answer a few example questions. Try one of these.'], [], L.chatStarters(profile).slice(0, 4));
  };
})(window.LANDIT);

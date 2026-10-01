/* Landit click dummies: the matcher. Hand-written. Load after data.js.

   A port of the prototype engine (reference/current-app/index.html,
   evaluate() and NEEDS). The core mechanic is unchanged:

     1. Life situation: some schemes only apply to some lives (children,
        work, study, age). If the answers rule a scheme out, it is hidden.
     2. Nation: a scheme outside the person's nation is hidden.
     3. Status: a scheme is "gated" when it is on the public funds list, or
        in practice needs one (catalog nrpf "no"). A gated scheme is BLOCKED
        when the person's visa carries no recourse to public funds (NRPF).
        Otherwise a scheme is OPEN when its `who` list has "all" or the
        person's status, and hidden when it does not.

   Differences from the prototype, all listed in shared/README.md:
     - Unanswered questions never hide a scheme (the prototype always knew
       everything about its one persona). Only an answer can rule one out.
     - No documents are asked for, so nothing is "locked" behind a document.
     - Nations come from the generated `nations` field, which reads "NI" as
       Northern Ireland, "GB" as Great Britain and ignores notes in brackets.
     - London-only schemes are hidden only when a city is known and it is
       not London (the prototype hid them unless the city was London).
     - With no status (skipped or "Not sure"), only schemes for everyone
       that are not gated are open, and nothing is blocked.
     - The Timpson entry now uses its real id (the prototype had a typo, so
       its "not working" check never ran).
     - Schemes marked `closed` in the data (ended or suspended) are never
       open or blocked.

   Certainty (new, does not change what is open or blocked): every open
   scheme also gets a fit, 'confirmed' or 'possible'. See certainty()
   below and shared/README.md section 7. */
(function (L) {
  'use strict';
  if (!L || !L.benefits) throw new Error('Load shared/data.js before shared/match.js');

  var STATUS = {};
  L.statuses.forEach(function (s) { STATUS[s.key] = s; });
  var BY_ID = {};
  L.benefits.forEach(function (b) { BY_ID[b.id] = b; });

  /* Questionnaire age bands (shared/content.js) as [min, max] years. */
  var AGE_BANDS = { '16_25': [16, 25], '26_59': [26, 59], '60_plus': [60, 120] };

  /* Three-valued logic: true, false, or null for "we do not know". */
  function not(a) { return a === null ? null : !a; }
  function or(a, b) { return a === true || b === true ? true : (a === false && b === false ? false : null); }
  function bool(v) { return typeof v === 'boolean' ? v : null; }

  /* What the answers tell us, each true, false or null. */
  function facts(p) {
    p = p || {};
    var status = p.status && STATUS[p.status] ? p.status : null;
    var band = AGE_BANDS[p.age] || null;
    function ageIn(min, max) {
      if (!band) return null;
      if (band[0] >= min && band[1] <= max) return true;
      if (band[1] < min || band[0] > max) return false;
      return null;
    }
    return {
      status: status,
      nrpf: status ? (typeof p.nrpf === 'boolean' ? p.nrpf : STATUS[status].nrpfDefault) : null,
      nation: p.nation || 'England',
      nationAssumed: !p.nation,
      city: p.city ? String(p.city).trim() : null,
      employed: p.work === 'employed' || p.work === 'self_employed' ? true : (p.work === 'not_working' ? false : null),
      work: p.work || null,
      fullTimeStudent: p.study === 'full_time' ? true : (p.study === 'part_time' || p.study === 'not_studying' ? false : null),
      studying: p.study === 'full_time' || p.study === 'part_time' ? true : (p.study === 'not_studying' ? false : null),
      hasChildren: p.children === 'yes' ? true : (p.children === 'no' || p.children === 'expecting' ? false : null),
      pregnant: typeof p.pregnant === 'boolean' ? p.pregnant : (p.children === 'expecting' ? true : (p.children === 'no' ? false : null)),
      hasPartner: bool(p.partner),
      carer: bool(p.carer),
      disabled: bool(p.disabled),
      ageIn: ageIn,
      pensionAge: ageIn(66, 120),   // State Pension age, as lib/profile.ts
    };
  }

  /* Life-situation relevance, from the prototype's NEEDS table.
     Each returns true, false or null; only false hides a scheme. */
  var kids = function (f) { return f.hasChildren; };
  var kidsOrPregnant = function (f) { return or(f.hasChildren, f.pregnant); };
  var pregnant = function (f) { return f.pregnant; };
  var employed = function (f) { return f.employed; };
  var notEmployed = function (f) { return not(f.employed); };
  var carer = function (f) { return f.carer; };
  var disabled = function (f) { return f.disabled; };
  var pension = function (f) { return f.pensionAge; };
  var age = function (min, max) { return function (f) { return f.ageIn(min, max); }; };

  var NEEDS = {
    'fsm-england-nrpf': kids, 'breakfast-clubs': kids, 'childcare-15h-universal': kids,
    'childcare-2yo-nrpf': kids, 'childcare-30h-partner': kids, 'tax-free-childcare': kids,
    's17-children-act': kids, 'healthy-start-nrpf': kidsOrPregnant, 'best-start-foods': kidsOrPregnant,
    'buttle-uk': kids, 'child-benefit': kids, 'scottish-child-payment': kids,
    'sure-start-maternity-grant': pregnant, 'matex': pregnant, 'maternity-allowance': pregnant, 'smp': pregnant,
    'marriage-allowance': function (f) { return f.hasPartner; },
    'ssp': employed, 'pension-auto-enrolment': employed, 'new-style-jsa': employed, 'new-style-esa': employed,
    'railcard-16-25': function (f) { return or(f.ageIn(0, 25), f.fullTimeStudent); },
    'uni-hardship-fund': function (f) { return f.fullTimeStudent; },
    'student-oyster': function (f) { return f.fullTimeStudent; },
    'kings-trust': age(16, 30), 'scotland-under22-bus': age(0, 21), 'lisa': age(18, 39),
    'pension-credit': pension, 'carers-allowance': carer, 'pip': disabled,
    'free-home-to-school-transport': kids, 'school-uniform-grants-england-councils': kids,
    'school-essentials-grant-wales': kids, 'school-clothing-grant-scotland': kids,
    'free-school-meals-scotland': kids, 'universal-primary-free-school-meals': kids,
    'london-universal-primary-free-school': kids, 'free-school-meals-and-uniform': kids,
    'holiday-activities-and-food-programme': kids, 'baby-banks': kidsOrPregnant,
    'scottish-baby-box': pregnant, 'child-disability-payment': kids,
    'funded-childcare-1140-hours': kids, 'childcare-offer-for-wales': kids,
    'ni-childcare-subsidy-scheme': kids, 'flying-start': kids, 'sure-start': kids,
    'pre-school-education-programme': kids, 'scottish-milk-and-healthy-snack': kids,
    'care-to-learn': kids, 'student-finance-grants-for-parents': kids,
    'young-carer-grant': carer, 'disability-living-allowance': kids, 'attendance-allowance': pension,
    'adult-disability-payment': disabled, 'carer-support-payment': carer,
    'winter-fuel-payment': pension, 'older-person-s-concessionary-travel': pension, 'housing-benefit': pension,
    'smart-works': notEmployed, 'interview-clothing-for-men': notEmployed,
    'timpson-free-interview-dry-cleaning': notEmployed,
    'youth-guarantee': age(18, 21), 'ema-wales': age(16, 18), 'ema-scotland': age(16, 18),
    'ema-northern-ireland': age(16, 18), '16-to-19-bursary-fund': age(16, 19), 'job-start-payment': age(16, 24),
  };

  var REASON = {
    'public-fund': 'This is a public fund. Your visa has a no recourse to public funds condition, so this one is not open to you.',
    'needs-public-fund': 'This is not a public fund itself. But people with a no recourse to public funds condition cannot get it in practice, usually because it needs a qualifying benefit.',
  };

  /* One scheme against one set of facts: null (hidden), or {state, reason?}. */
  function evaluate(b, f) {
    if (b.closed) return null;                                         // ended or suspended
    var need = NEEDS[b.id];
    if (need && need(f) === false) return null;                       // not their life situation
    if (b.nations.indexOf(f.nation) < 0) return null;                  // wrong nation
    if (b.local === 'London' && f.city && !/^london$/i.test(f.city)) return null;
    var gated = b.publicFunds || b.nrpf === 'no';                      // needs recourse
    if (!f.status) {                                                   // status unknown
      if (b.who.indexOf('all') < 0 || gated) return null;
      return { state: 'open' };
    }
    var whoOk = b.who.indexOf('all') >= 0 || b.who.indexOf(f.status) >= 0;
    if (gated && f.nrpf) {
      var kind = b.publicFunds ? 'public-fund' : 'needs-public-fund';
      return { state: 'blocked', kind: kind, reason: REASON[kind] };
    }
    if (!whoOk) return null;                                           // not for this status
    return { state: 'open' };
  }

  /* Certainty. An open scheme is 'confirmed' only when the answers meet
     every rule the matcher checks AND the catalog states no other condition
     that the questionnaire does not ask about. Everything else is
     'possible' ("Depends on your situation").

     CONFIRMABLE lists the only schemes whose catalog conditions are fully
     covered by the answers (status, nation, work, study, children, age).
     Each was checked against its catalog entry; the quoted words are the
     reason. A scheme not listed here is always 'possible': its entry names
     something Landit does not ask (income or savings, a partner, who lives
     with you, disability or health, caring, a child's age or school, a
     crisis, how long you have lived here, your council, area or supplier,
     your employer or earnings) or its value depends on it. A function
     returns true only when the answers settle it.
     Kept conservative on purpose: a wrong 'possible' costs a label, a wrong
     'confirmed' would be a promise. */
  var ALWAYS = function () { return true; };
  var CONFIRMABLE = {
    'gp-registration': ALWAYS,                       // "No ID, no proof of address, no immigration status required (NHS policy)"
    'nhs-services-that-are-always': ALWAYS,          // "A&E and urgent treatment ... all GP care ... NHS 111", who: everyone
    'immigration-health-surcharge-entitlement': ALWAYS, // "Visa holders who paid the IHS ... get full NHS care like a resident" (who list = those visas)
    'nhs-dental': ALWAYS,                            // NHS bands, who: everyone
    'matex': ALWAYS,                                 // "Issued on pregnancy alone, no status condition" (life situation: pregnant)
    'public-libraries': ALWAYS,                      // "No immigration condition", who: everyone
    'nino': function (f) {                           // "everyone with the right to work": every status except
      return f.status ? f.status !== 'asylum' : null; // people still waiting for an asylum decision
    },
    'student-discount-platforms': function (f) {     // "verification is enrolment, not status": a Student visa means enrolled
      return f.status === 'student' || f.studying === true ? true : null;
    },
    'national-minimum-wage-enforcement': function (f) { return f.work === 'employed' ? true : null; }, // rights of people in a job
    'holiday-pay': function (f) { return f.work === 'employed' ? true : null; },                       // "includes agency and zero-hours"
    'community-fridges': ALWAYS,                     // "No referral, no eligibility check, no immigration question"
    'warm-welcome-spaces': ALWAYS,                   // "Drop in, no checks."
    'free-water-saving-devices': ALWAYS,             // "No checks."
    'railcard-16-25': ALWAYS,                        // "Aged 16-25 (or 26+ mature full-time student)" (life situation: age or study)
    'scotland-under22-bus': ALWAYS,                  // "everyone aged 5 to 21" (life situation: age)
    'older-person-s-concessionary-travel': ALWAYS,   // "Age and residence only" (life situation: State Pension age)
    'free-business-advice': ALWAYS,                  // "free advice, workshops and mentoring, no status test"
    'refugee-move-on-package': ALWAYS,               // what a grant of refugee status or protection gives (who: Refugee)
    'ukraine-permission-extension': ALWAYS,          // "Free extension" for Ukraine scheme visas (who: Ukraine)
    'hong-kong-bn-specifics': ALWAYS,                // facts for BN(O) visa holders (who: BN(O))
    'bank-accounts-for-international-students': ALWAYS, // banking routes for international students (who: Student)
    'national-bus-fare-cap': ALWAYS,                 // "Applies to every passenger ... no card, no application, no status test"
    'national-careers-service': ALWAYS,              // "Anyone 13+ in England, no documents, no status condition"
    'scottish-baby-box': ALWAYS,                     // "every baby born in Scotland ... No income test, no immigration test" (pregnant)
    'free-period-products': ALWAYS,                  // "free to anyone who needs them. No checks of any kind."
    'free-nhs-eye-examinations-and': ALWAYS,         // Scotland "for everyone living in the UK"; Wales "urgent eye examinations for everyone"
    'free-period-products-157': ALWAYS,              // "No checks."
    'free-prescriptions-and-healthy-start': ALWAYS,  // "Prescriptions are free for everyone in NI"
    'free-regulated-immigration-advice': ALWAYS,     // free advice routes, "including people with no recourse to public funds"
    'surplus-food-apps': ALWAYS,                     // "Just need a phone."
  };
  /* Region labels that mean "only in some places" (council, provider,
     postcode). Where you live inside a nation is not asked. */
  var PART_OF_NATION = /depends on|some postcodes|varies by area|^Participating|^Listed areas|^Cities with|\bonly$/i;

  /* {fit: 'confirmed' | 'possible', why: [...]} for an open scheme.
     why keys (for tests, never shown): 'nrpf-depends' (catalog nrpf
     'depends'), 'situation' (a life-situation rule not confirmed by an
     answer), 'nation' (nation not answered, England assumed), 'area' (only
     in part of a nation), 'unasked' (the catalog names a condition the
     questionnaire does not ask), 'answers' (a listed scheme whose condition
     the answers do not settle). */
  function certainty(b, f) {
    var why = [];
    if (b.nrpf === 'depends') why.push('nrpf-depends');
    var need = NEEDS[b.id];
    if (need && need(f) !== true) why.push('situation');
    if (f.nationAssumed && b.nations.length < L.nations.length) why.push('nation');
    var inCity = b.local === 'London' && f.city && /^london$/i.test(f.city);
    if ((b.local && !inCity) || (!inCity && PART_OF_NATION.test(b.regionLabel))) why.push('area');
    var conf = CONFIRMABLE[b.id];
    if (!conf) why.push('unasked');
    else if (conf(f) !== true) why.push('answers');
    return { fit: why.length ? 'possible' : 'confirmed', why: why };
  }

  L.fitLabel = { possible: 'Depends on your situation' };

  /* LANDIT.match(profile) -> {open, blocked, fit, total, status, known, ...} */
  L.match = function (profile) {
    var f = facts(profile);
    var open = [], blocked = [], fit = {};
    L.benefits.forEach(function (b) {
      var r = evaluate(b, f);
      if (!r) return;
      if (r.state === 'open') { open.push(b); fit[b.id] = certainty(b, f).fit; }
      else blocked.push({ benefit: b, reason: r.reason, kind: r.kind });
    });
    open = L.sortBenefits(open, 'value');
    blocked = L.sortBenefits(blocked, 'value');
    var total = open.reduce(function (s, b) { return s + (typeof b.value === 'number' ? b.value : 0); }, 0);
    return {
      open: open,
      blocked: blocked,
      fit: fit,
      total: total,
      totalLabel: L.potentialLabel,
      withValue: open.filter(function (b) { return typeof b.value === 'number'; }).length,
      status: f.status,
      statusLabel: f.status ? STATUS[f.status].label : null,
      known: !!f.status,
      nrpf: f.nrpf,
      nation: f.nation,
      nationAssumed: f.nationAssumed,
    };
  };

  /* Sorting. Works on benefits or on {benefit, ...} items (blocked).
     Unknown values always go last; ties keep catalog order.
       'value'  largest amount first
       'time'   quickest to apply first (timeMinutes)
       'docs'   fewest documents first (schemes without a hand-written
                guide count as unknown, because their list is not complete)
       'az'     by name */
  L.sortBenefits = function (list, key) {
    var ben = function (x) { return x && x.benefit ? x.benefit : x; };
    var get = {
      value: function (b) { return typeof b.value === 'number' ? -b.value : null; },
      time: function (b) { return b.timeMinutes; },
      docs: function (b) { return b.docsKnown ? b.docsCount : null; },
    }[key];
    return list.slice().sort(function (x, y) {
      var a = ben(x), b = ben(y);
      if (key === 'az') return a.name.localeCompare(b.name, 'en-GB') || a.entry - b.entry;
      if (!get) return a.entry - b.entry;
      var va = get(a), vb = get(b);
      if (va === null && vb !== null) return 1;
      if (vb === null && va !== null) return -1;
      if (va !== null && va !== vb) return va - vb;
      return a.entry - b.entry;
    });
  };

  /* Headline picks ("Highest amount", "Quickest to apply", the chat's
     first suggestions): confirmed schemes first, then possible ones, each
     group keeping the order it came in. Sort first, then rank:
       L.rankForHighlights(L.sortBenefits(m.open, 'time'), m.fit)[0]
     `fit` is m.fit (or the match result itself). Works on benefits or on
     {benefit} items; an id with no fit (a blocked item) counts as possible. */
  L.rankForHighlights = function (list, fit) {
    var map = fit && fit.fit && typeof fit.fit === 'object' ? fit.fit : (fit || {});
    var confirmed = [], possible = [];
    (list || []).forEach(function (x) {
      var b = x && x.benefit ? x.benefit : x;
      (map[b.id] === 'confirmed' ? confirmed : possible).push(x);
    });
    return confirmed.concat(possible);
  };

  /* "£1,800", "£12.50". null for null. */
  L.formatMoney = function (n) {
    if (typeof n !== 'number' || !isFinite(n)) return null;
    var whole = Math.round(n * 100) % 100 === 0;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency', currency: 'GBP',
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
    }).format(n);
  };

  /* The amount and its qualifier, always together.
     {amount: '£1,800' | null, label: 'Typical annual saving' | null} */
  L.valueParts = function (b) {
    return { amount: L.formatMoney(b.value), label: b.valueLabel || null };
  };

  L.benefitById = function (id) { return BY_ID[id] || null; };
  L.statusLabel = function (key) { return STATUS[key] ? STATUS[key].label : null; };

  /* Simple search over name, short line and category label. */
  L.searchBenefits = function (list, query) {
    var q = String(query || '').toLowerCase().trim();
    if (!q) return list.slice();
    var words = q.split(/\s+/);
    return list.filter(function (x) {
      var b = x && x.benefit ? x.benefit : x;
      var hay = (b.name + ' ' + b.sub + ' ' + (L.categories[b.category] || {}).label).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  };

  /* Exposed for tests and for the chat. */
  L._needs = NEEDS;
  L._facts = facts;
  L._confirmable = CONFIRMABLE;
  /* {fit, why} for one scheme and profile (tests and debugging only). */
  L._certainty = function (id, profile) { var b = BY_ID[id]; return b ? certainty(b, facts(profile)) : null; };
})(window.LANDIT);

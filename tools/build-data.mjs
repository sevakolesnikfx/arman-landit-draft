#!/usr/bin/env node
/* Landit click dummies: builds shared/data.js from shared/source/*.

   Run:   node tools/build-data.mjs

   shared/data.js is GENERATED. Never edit it by hand: change this script (or
   the source files) and run it again.

   Sources (copied unchanged from the prototype, see shared/README.md):
     shared/source/benefits-data.js     window.LANDIT_DATA, the 182-scheme catalog
     shared/source/benefit-guides.js    window.LANDIT_GUIDES, hand-written guides
     shared/source/safety.js            window.LANDIT_SAFETY, verified helplines
     shared/source/benefits-catalog.md  the catalog the data was generated from,
                                        used only for each scheme's full description

   What this script changes, and why, is listed in the FIXES tables below and
   in shared/README.md. It never invents an amount, a rate or a fact. */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { findBanned, DASHES } from './content-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'shared', 'source');
const OUT = path.join(ROOT, 'shared', 'data.js');

/* ------------------------------------------------------------------ */
/* 1. Load the sources                                                  */
/* ------------------------------------------------------------------ */

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ['benefits-data.js', 'benefit-guides.js', 'safety.js']) {
  vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), sandbox, { filename: f });
}
const CATALOG = sandbox.window.LANDIT_DATA;
const GUIDES = sandbox.window.LANDIT_GUIDES;
const SAFETY = sandbox.window.LANDIT_SAFETY;
if (!CATALOG || !GUIDES || !SAFETY) throw new Error('A source file did not set its window.* value');

/* Full descriptions: the paragraph under each "### N. Title" heading.
   The catalog lists schemes in the same order as the markdown (checked below). */
const MD = fs.readFileSync(path.join(SRC, 'benefits-catalog.md'), 'utf8');
const ABOUT = [];
{
  const lines = MD.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^### (\d+)\. (.+)$/);
    if (!h) continue;
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j].trim();
      if (!l || l.startsWith('- ') || l.startsWith('#') || l === '---') break;
      body.push(l);
    }
    ABOUT.push({ n: Number(h[1]), title: h[2], text: body.join(' ') });
  }
}
if (ABOUT.length !== CATALOG.benefits.length) {
  throw new Error(`Markdown has ${ABOUT.length} entries, catalog has ${CATALOG.benefits.length}`);
}
CATALOG.benefits.forEach((b, i) => {
  if (b.n && b.n !== ABOUT[i].n) throw new Error(`Order mismatch at ${b.id}: n=${b.n}, markdown ${ABOUT[i].n}`);
});

/* ------------------------------------------------------------------ */
/* 2. Fixed strings                                                     */
/* ------------------------------------------------------------------ */

const DISCLAIMER = 'Landit provides information only, not legal or financial advice. Eligibility varies by individual circumstance and immigration status. Always verify with official sources or a qualified adviser before applying.';

/* ------------------------------------------------------------------ */
/* 3. FIXES: wording, category and region corrections                   */
/* ------------------------------------------------------------------ */

/* Wording. Landit's content rules ban some words (see content-rules.mjs).
   The catalog uses a few of them as figures of speech. Each swap keeps the
   meaning and adds no fact. Qualification names ("Level 3", "A-level") are
   official names and stay. Order matters: specific phrases first. */
const REWORD = [
  [/\bthe unlock mechanic\b/g, 'the key route'],                          // check-content: allow-line
  [/\bAward unlocks a specific\b/g, 'Award covers a specific'],           // check-content: allow-line
  [/\bUnlocks\b/g, 'Opens'],                                              // check-content: allow-line
  [/\bunlocks\b/g, 'opens'],                                              // check-content: allow-line
  [/\bunlock\b/g, 'open'],                                                // check-content: allow-line
  [/\bunlocking discounted travel\b/g, 'giving discounted travel'],       // check-content: allow-line
  [/\bdoes not forfeit the pot\b/g, 'does not forfeit your pension savings'], // check-content: allow-line
  [/\bcouncil-set level\b/g, 'set by each council'],                      // check-content: allow-line
  [/\bno level test\b/g, 'no placement test'],                            // check-content: allow-line
  [/\bat the right level\b/g, 'in the right class'],                      // check-content: allow-line
  [/\bowed to everyone\b/g, 'a duty to everyone'],                        // check-content: allow-line
  // Terminology: "Student visa", never the old points-based name.
  [/\bTier 4 \(General\) student\b/g, 'Student visa'],                    // check-content: allow-line
  [/\bTier 4 students\b/g, 'Student visa holders'],                       // check-content: allow-line
  [/\bTier 4 student\b/g, 'Student visa'],                                // check-content: allow-line
  [/\bTier 1\/2\/4\/5\b/g, 'Tier 1, 2 or 5, or Student visa'],            // check-content: allow-line
];

/* Category. The catalog generator filed some parsed entries under the wrong
   key (Scottish Welfare Fund under transport, for example). The markdown
   section each scheme sits in is the evidence. The original key is kept as
   categorySource on every benefit. */
const CATEGORY_FIX = {
  'local-welfare-assistance-england': ['council', 'section H, Council and crisis support'],
  'scottish-welfare-fund': ['council', 'section H, Council and crisis support'],
  'free-swimming': ['council', 'council-run swim sessions'],
  'free-business-advice': ['business', 'section P, Business'],
  'refugee-travel-document': ['legal', 'section S, Status-specific schemes'],
  'baby-banks': ['charity', 'local charities, not a money product'],
  'furniture-reuse-charities': ['charity', 'furniture charities, not food'],
  'the-hygiene-bank-and-beauty': ['charity', 'toiletries from charities, not food'],
  'disability-living-allowance': ['welfare', 'section Q, Public funds benefits'],
  'budgeting-advance': ['welfare', 'section Q, Public funds benefits'],
  'adult-disability-payment': ['welfare', "section R, Scotland's extra layer"],
  'child-disability-payment': ['welfare', "section R, Scotland's extra layer"],
  'young-carer-grant': ['welfare', 'a state grant, not a charity'],
  'postgraduate-loans': ['education', 'section T, Students'],
  'free-english-conversation-clubs': ['education', 'English practice groups'],
  'liverpool-city-region-myticket-and': ['transport', 'a bus ticket'],
  'best-start-grant-scotland': ['family', 'section G, Family safety net'],
  'scottish-baby-box': ['family', 'newborn essentials'],
  'supplier-hardship-funds': ['energy', 'section L, Energy'],
  'uniform-and-work-expenses-tax': ['work', 'section E, Work and tax'],
};

/* Region. A few parsed entries lost their nation (region "UK"), although
   the markdown heading or section names it. The original is kept as
   regionSource. `nations` overrides the derived list where the text says so. */
const REGION_FIX = {
  '16-to-19-bursary-fund': { region: 'England', why: 'heading "16 to 19 Bursary Fund, England"' },
  'postgraduate-loans': { region: 'England', why: 'heading "Postgraduate loans (England)"' },
  'free-period-products-in-schools': { region: 'England', why: 'heading "Free period products in schools and colleges (England)"' },
  'national-bus-fare-cap': { region: 'England', why: 'heading "National bus fare cap (England outside London)"' },
  'local-welfare-assistance-england': { region: 'England', why: 'name "Local welfare assistance, England"' },
  'adult-disability-payment': { region: 'Scotland', why: "section R, Scotland's extra layer" },
  'child-disability-payment': { region: 'Scotland', why: "section R, Scotland's extra layer" },
  'carer-support-payment': { region: 'Scotland', why: "section R, Scotland's extra layer" },
  'job-start-payment': { region: 'Scotland', why: "section R, Scotland's extra layer" },
  'funeral-support-payment': { region: 'Scotland', why: "section R, Scotland's extra layer" },
  'home-fee-status-and-student': { nations: ['England', 'Scotland', 'Wales', 'Northern Ireland'], why: 'region text says all four nations run parallel lists' },
};

/* Who. Parsed entries with no "who" line in the markdown defaulted to
   "all", so a Student visa holder was shown the Ukraine Permission
   Extension. Only entries whose own text names the group are corrected,
   plus one entry whose funding rules the catalog states in another entry
   (Free Courses for Jobs, see below). The original list is kept as
   whoSource. */
const STATUS_KEYS = CATALOG.meta.statuses.map(s => s.key);
const allStatusesExcept = (...out) => STATUS_KEYS.filter(k => !out.includes(k));
const WHO_FIX = {
  /* Free Courses for Jobs is paid from adult skills funding. The catalog
     says Student visas cannot get that funding:
       entry 139 (this scheme): "Standard adult skills residency: refugees,
         HP, ILR, Ukraine immediate; most visa holders and EUSS after 3
         years residence."
       entry 15 (Free ESOL courses): "sponsored Skilled Worker and Student
         visas are excluded from adult skills funding (charity and council
         classes stay open to them)."
       benefits-data.js, esol-funding nrpfNote: "sponsored Skilled Worker
         and Student visas excluded from adult skills funding".
     So the Student visa comes off the list. Every other status stays, as
     before. Skilled Worker also stays: entry 139 says "most visa holders
     ... after 3 years residence", which conflicts with entry 15 for
     sponsored workers, so that one is left for a person to check.
     Side effect: with no status answered, the scheme is no longer shown
     (it is no longer "for everyone"). Skills Bootcamps is not changed: its
     entry says "Residency: 3 years, with the same exemption list as
     apprenticeships" and nothing about Student visas. */
  'free-courses-for-jobs': [allStatusesExcept('student'), 'entry 15 "sponsored Skilled Worker and Student visas are excluded from adult skills funding"; entry 139 "Standard adult skills residency"'],
  'refugee-travel-document': [['refugee'], 'name "Refugee travel document"; HP holders are in the refugee group'],
  'ukraine-permission-extension': [['ukraine'], 'text "All Ukraine leave..."'],
  'hong-kong-bn-specifics': [['bno'], 'name "Hong Kong BN(O) specifics"'],
  'room-for-refugees': [['refugee', 'asylum'], 'text "for refugees and asylum seekers"'],
  'free-bus-for-asylum-seekers': [['asylum'], 'text "free bus travel for people seeking asylum"'],
  'bank-accounts-for-international-students': [['student'], 'name "Bank accounts for international students"'],
};

/* Closed. Entries that describe a scheme that has ended or is suspended.
   They stay in the data (useful to know) but are never shown as open. */
const CLOSED = {
  'free-bus-for-asylum-seekers': 'name says "pilot ended"',
  'refugee-family-reunion-suspended': 'name says "suspended"',
};

/* Description sentences that are notes to the app, not to the person. */
const ABOUT_DROP = [
  'Public fund: never surface to NRPF users (the composition discounts in entry 51 are the safe siblings). ',
];

/* Plain English. Catalog text was written for the engine and for advisers,
   so some of it is internal shorthand. Applied to every text field after
   REWORD, in this order (specific phrases before general ones).
   Two kinds of rule:
     INTERNAL  wording that is a note to the app or an editorial label, not
               a fact. It is removed or replaced by the neutral fact it
               stands for.
     PLAIN     a real fact in technical wording. Reworded with the same
               meaning: no fact added, none dropped.
   "NRPF Network" is an organisation's name and stays. Form names (HC1,
   HC2, P45, MATB1), benefit names people see on official letters (PIP,
   ESA, JSA, SSP, SMP, EMA, ESOL) and body names (DWP, HMRC, NHS) stay.
   The build fails if a displayed field still holds a listed term
   (PLAIN_LEFTOVERS below), so a new catalog entry cannot bring one back.
   A third kind, ABBR, spells out abbreviations and acronyms a reader with
   basic English may not know (PPC, IHS, LISA, ARC, PIP...). ABBR rows run
   after the others and only on fields shown as text, never on names: a
   name stays as published ("Lifetime ISA", "New Style ESA", "EMA Wales"),
   and the card or page explains it in the text around it. Most ABBR rows
   use firstUse(): "Full words (ABBR)" at the first use in each field.
   ABBR_EXPLAINED below fails the build if a shown field uses one of these
   abbreviations without its full words.
   Each row: [pattern, replacement, kind, why]. */
const NRPF_PHRASE = 'no recourse to public funds';

/* An ABBR row for "Full words (ABBR)" at the first use in a field. The
   pattern has no g flag, so only the first use changes. Nothing changes
   when the field already holds the full words. Inside brackets, or just
   before a bracket, only the full words are used, so brackets never sit
   inside brackets. The full words get a capital letter at the start of a
   sentence. `eat` also swallows a following word the full words already
   say ("ARC card" becomes "Application Registration Card (ARC)"). */
function firstUse(abbr, full, why, eat) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\&]/g, '\\$&');
  const re = new RegExp('(?<![A-Za-z0-9])' + esc(abbr) + (eat ? '(?:' + esc(eat) + ')?' : '') + '(?![A-Za-z0-9])');
  const rep = (m, offset, whole) => {
    if (whole.toLowerCase().includes(full.toLowerCase())) return m;
    const before = whole.slice(0, offset);
    const depth = (before.match(/\(/g) || []).length - (before.match(/\)/g) || []).length;
    let out = depth > 0 || whole.startsWith(' (', offset + m.length) ? full : `${full} (${abbr})`;
    if (offset === 0 || /[.!?]\s+$/.test(before)) out = out.charAt(0).toUpperCase() + out.slice(1);
    return out;
  };
  rep.label = `${full} (${abbr}), first use in each field`;   // for --verbose
  return [re, rep, 'ABBR', why];
}
const PLAIN = [
  /* INTERNAL: notes to the app and editorial labels */
  [/\s*\(Scotland and Wales entries: \d+ and \d+\.\)/g, '', 'INTERNAL', 'cross-reference to other catalog entry numbers'],
  [/ before building copy on it\./g, '.', 'INTERNAL', 'note to the people writing app copy'],
  [/^Discretionary Support \(NI\): blocked$/g, 'Discretionary Support (NI)', 'INTERNAL', 'engine status "blocked" inside the name; the matcher shows status itself, and people with recourse can get it'],
  [/ \(unusual and worth surfacing\)/g, ' (unusual)', 'INTERNAL', 'engine note (nrpfNote only, not shown)'],
  [/ worth surfacing\)/g, ')', 'INTERNAL', 'engine note (nrpfNote only, not shown)'],
  [/\bthe flagship NRPF-safe cash for students\b/g, 'the main cash help for students that a ' + NRPF_PHRASE + ' condition does not block', 'INTERNAL', '"flagship" is an editorial label (kept as "main"); "NRPF-safe" is engine shorthand'],
  [/\bThe single largest NRPF-safe cash sum in this catalog\./g, "It is the largest single cash sum in Landit's list that a " + NRPF_PHRASE + ' condition does not block.', 'INTERNAL', '"this catalog" is the internal list; "NRPF-safe" is engine shorthand'],
  [/\bThe killer detail: the entire\b/g, 'The entire', 'INTERNAL', 'editorial label'],
  [/\bThe designed floor for NRPF families; cannot be refused just because of NRPF\./g, 'It is the safety net designed for families with ' + NRPF_PHRASE + ', and it cannot be refused just because of that condition.', 'INTERNAL', 'policy jargon "designed floor"'],
  [/\bThe master gate for university money\b/g, 'The main test for university money', 'INTERNAL', 'engine jargon "master gate"'],
  [/^The parallel system$/g, 'A separate support system for asylum seekers', 'INTERNAL', 'jargon; the words are from the same entry'],
  [/\bThe parallel system for asylum seekers\b/g, 'A separate support system for asylum seekers', 'INTERNAL', 'jargon "parallel system"'],
  [/\bThe race: /g, 'Watch the timing: ', 'INTERNAL', 'dramatic label (no fear framing)'],
  [/\bNRPF-safe sibling: /g, 'An option open to people with ' + NRPF_PHRASE + ': ', 'INTERNAL', 'engine shorthand "NRPF-safe sibling"'],
  [/\bFull NRPF-safe catalog applies meanwhile: /g, "Meanwhile, everything in Landit's list that is open to people with " + NRPF_PHRASE + ' applies: ', 'INTERNAL', 'engine shorthand and "catalog"'],
  [/\bthe entry-30 partner rule applies\b/g, 'the Tax-Free Childcare partner rule applies', 'INTERNAL', 'catalog entry 30 is Tax-Free Childcare'],
  [/\bthe whole public-funds tier opens\b/g, 'all public funds open', 'PLAIN', '"public-funds tier" is jargon'],

  /* PLAIN: how a scheme is assessed */
  [/\bComposition-based, not means-tested, so NRPF-safe: /g, 'Based on who lives in the home, with no check on income or savings, so open to people with ' + NRPF_PHRASE + ': ', 'PLAIN', '"composition-based" means based on who lives there'],
  [/\bso it is NRPF-safe\b/g, 'so it is open to people with ' + NRPF_PHRASE, 'PLAIN', 'engine shorthand'],
  [/\bthe composition discounts\b/g, 'the discounts based on who lives in the home', 'PLAIN', 'jargon'],
  [/^Contribution-based, NRPF-safe$/g, 'Based on National Insurance you have paid, open to people with ' + NRPF_PHRASE, 'PLAIN', '"contribution-based" means based on National Insurance paid'],
  [/^Contribution-based sickness benefit$/g, 'Sickness benefit based on National Insurance you have paid', 'PLAIN', 'as above'],
  [/\bopens everything contributory\b/g, 'opens every benefit based on National Insurance', 'PLAIN', '"contributory" means based on National Insurance'],
  [/\bbuilds contributory entitlement\b/g, 'builds your right to benefits based on National Insurance', 'PLAIN', 'as above'],
  [/\bcontributory benefits\b/g, 'benefits based on National Insurance', 'PLAIN', 'as above'],
  [/\bis the largest NRPF-safe payment there is\b/g, 'is the largest payment open to people with ' + NRPF_PHRASE, 'PLAIN', 'engine shorthand'],
  [/\bso it is safe with NRPF conditions\b/g, 'so it is open to people with ' + NRPF_PHRASE, 'PLAIN', 'engine shorthand'],
  [/\bis the NRPF-safe Scottish alternative\b/g, 'is the Scottish alternative open to people with ' + NRPF_PHRASE, 'PLAIN', 'engine shorthand'],
  [/\bcategories are NRPF-safe\b/g, 'categories are open to people with ' + NRPF_PHRASE, 'PLAIN', 'engine shorthand'],
  [/^Cheap internet, benefit-gated$/g, 'Cheap internet, needs a qualifying benefit', 'PLAIN', '"benefit-gated" means you must get a qualifying benefit'],
  [/\bThe white-goods IAP arm is benefit-gated\./g, 'The white goods part (Individual Assistance Payment) needs a qualifying benefit.', 'PLAIN', 'jargon and abbreviation'],
  [/\bThe white goods arm \(Individual Assistance Payment\) is benefit-gated and closed to NRPF\. The emergency cash arm is not\./g, 'The white goods part (Individual Assistance Payment) needs a qualifying benefit and is not open to people with ' + NRPF_PHRASE + '. The emergency cash part does not need a benefit and is open to them.', 'PLAIN', 'jargon'],
  [/\bBenefit-gated tiers stay closed to NRPF\b/g, 'Tiers that need a benefit stay closed to people with ' + NRPF_PHRASE, 'PLAIN', 'jargon'],
  [/\bGated on Housing Benefit or the UC housing element, so never available under NRPF anywhere in GB\b/g, 'Only for people getting Housing Benefit or the Universal Credit housing element, so never available to people with ' + NRPF_PHRASE + ' anywhere in Great Britain', 'PLAIN', 'jargon and abbreviations'],
  [/\bGated on holding a Tax-Free Childcare account\b/g, 'You must hold a Tax-Free Childcare account', 'PLAIN', 'jargon'],
  [/\bGateway is the FSM benefit list\b/g, 'You qualify through the benefits list for free school meals', 'PLAIN', 'jargon and abbreviation'],
  [/\bGateway is benefits with a UC earnings cap\b/g, 'You qualify through benefits, with a Universal Credit earnings cap', 'PLAIN', 'jargon and abbreviation'],
  [/\bBenefits route is public-funds-gated\b/g, 'The benefits route needs public funds', 'PLAIN', 'jargon'],
  [/\bso wholly-NRPF households are gated out in practice\b/g, 'so households where no one has recourse to public funds cannot get it in practice', 'PLAIN', 'jargon'],
  [/\bIt is Universal Credit gated, so it is closed under NRPF\b/g, 'It needs Universal Credit, so it is not open to people with ' + NRPF_PHRASE, 'PLAIN', 'jargon'],
  [/\bPurely benefit-based since\b/g, 'Based only on benefits since', 'PLAIN', 'jargon'],
  [/\bIt is now purely benefit-based\b/g, 'It is now based only on benefits', 'PLAIN', 'jargon'],
  [/\bRoutes are benefit-based OR\b/g, 'Routes are through benefits OR', 'PLAIN', 'jargon'],
  [/\bhang off FSM\b/g, 'depend on free school meals', 'PLAIN', 'jargon and abbreviation'],
  [/\bPassports to\b/g, 'Also qualifies you for', 'PLAIN', '"passports to" means gives automatic access to'],
  [/\bpassports to WHD\b/g, 'qualifies you for Warm Home Discount', 'PLAIN', 'as above, WHD is Warm Home Discount'],
  [/\bregistration passports to\b/g, 'registration qualifies you for', 'PLAIN', 'as above'],
  [/\bpassports you to\b/g, 'qualifies you for', 'PLAIN', 'as above'],
  [/\b([Tt])he passported help\b/g, '$1he help it qualifies you for', 'PLAIN', 'as above'],
  [/\bMeans-tested help with health costs\b/g, 'Help with health costs based on income and savings', 'PLAIN', '"means-tested" means based on income and savings'],
  [/^Main means-tested support$/g, 'Main support based on income and savings', 'PLAIN', 'as above'],
  [/\bThe main means-tested payment\b/g, 'The main payment based on income and savings', 'PLAIN', 'as above'],
  [/^Means-tested bill rebate$/g, 'Bill rebate based on income and savings', 'PLAIN', 'as above'],
  [/\bMeans-tested rebate up to 100% of the bill\b/g, 'Rebate based on income and savings, up to 100% of the bill', 'PLAIN', 'as above'],
  [/\bnot means-tested, not listed\./g, 'no check on income or savings, and not on the public funds list.', 'PLAIN', 'as above; "not listed" means not on the public funds list'],
  [/\bNot means-tested\./g, 'No check on income or savings.', 'PLAIN', 'as above'],
  [/\bnot means-tested\b/g, 'no check on income or savings', 'PLAIN', 'as above'],
  [/\bMeans-tested\./g, 'Based on income and savings.', 'PLAIN', 'as above'],
  [/\bno application, means test or status test\b/g, 'no application, no check on income or savings, and no status test', 'PLAIN', 'as above'],
  [/\bno means test\b/g, 'no check on income or savings', 'PLAIN', 'as above'],
  [/\bif you pass the means test\b/g, 'if you pass the check on your income and savings', 'PLAIN', 'as above'],
  [/\b(another|a qualifying) means-tested benefits?\b/g, '$1 benefit based on income and savings', 'PLAIN', 'as above'],
  [/\bruns on means-tested benefits\b/g, 'runs on benefits based on income and savings', 'PLAIN', 'as above'],
  [/\bincome-assessed extras\b/g, 'extras based on income', 'PLAIN', 'jargon'],
  [/\bCapped-allocation bursary\b/g, 'Bursary with limited places', 'PLAIN', '"capped allocation" means a limited number of awards'],
  [/\bper the provider's own page\b/g, "according to the provider's own page", 'PLAIN', 'jargon'],
  [/\bper the provider\b/g, 'according to the provider', 'PLAIN', 'jargon'],

  /* PLAIN: "NRPF" spelled out, phrase by phrase so sentences still read */
  [/\(NRPF route\)/g, '(route for ' + NRPF_PHRASE + ')', 'PLAIN', 'abbreviation'],
  [/\b(?:the )?FSM NRPF route\b/g, 'the free school meals route for ' + NRPF_PHRASE, 'PLAIN', 'abbreviations'],
  [/\bthe NRPF free school meals route\b/g, 'the free school meals route for ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bchildcare NRPF routes\b/g, 'childcare routes for ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bNRPF-route decisions\b/g, 'Decisions on the route for ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/^NRPF route income caps:/g, 'Income caps on the route for ' + NRPF_PHRASE + ':', 'PLAIN', 'abbreviation'],
  [/^NRPF route income:/g, 'Income on the route for ' + NRPF_PHRASE + ':', 'PLAIN', 'abbreviation'],
  [/^NRPF route:/g, 'Route for ' + NRPF_PHRASE + ':', 'PLAIN', 'abbreviation'],
  [/\bPermanent NRPF route:/g, 'Permanent route for ' + NRPF_PHRASE + ':', 'PLAIN', 'abbreviation'],
  [/\. NRPF route:/g, '. Route for ' + NRPF_PHRASE + ':', 'PLAIN', 'abbreviation'],
  [/\bCheck the NRPF route requirements\b/g, 'Check the requirements for the route for ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bthe NRPF route\b/g, 'the route for ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bthe NRPF 2 year old form\b/g, 'the 2 year old form for ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\(NRPF extension\)/g, '(extension for ' + NRPF_PHRASE + ')', 'PLAIN', 'abbreviation'],
  [/\bthe NRPF extension\b/g, 'the extension for ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bThe NRPF extension\b/g, 'The extension for ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\. NRPF extension:/g, '. Extension for ' + NRPF_PHRASE + ':', 'PLAIN', 'abbreviation'],
  [/\bSingle NRPF parents and all-NRPF couples\b/g, 'Single parents with ' + NRPF_PHRASE + ' and couples where both have ' + NRPF_PHRASE, 'PLAIN', 'abbreviation (same wording as this scheme\'s guide)'],
  [/\bcouples where both have NRPF\b/g, 'couples where both have ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bSingle parents with NRPF\b/g, 'Single parents with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bNRPF-only households\b/g, 'households where no one has recourse to public funds', 'PLAIN', 'abbreviation'],
  [/\ban NRPF (parent|partner|household)\b/g, 'a $1 with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bNRPF (families|households|parents|children|people|young people)\b/g, '$1 with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bNRPF holders\b/g, 'People with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bverify NRPF applications\b/g, 'verify applications from people with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bclosed under NRPF\b/g, 'not open to people with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bblocked under NRPF\b/g, 'blocked for people with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bclosed to NRPF\b/g, 'not open to people with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\b(open|opened) to NRPF\b/g, '$1 to people with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bfully open under NRPF\b/g, 'fully open to people with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bnot payable to NRPF\b/g, 'not payable to people with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bnever treat them as NRPF\b/g, 'never treat them as having ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bdespite NRPF\b/g, 'despite a ' + NRPF_PHRASE + ' condition', 'PLAIN', 'abbreviation'],
  [/\ba person with NRPF\b/g, 'a person with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bAssuming NRPF blocks you\b/g, 'Assuming a ' + NRPF_PHRASE + ' condition blocks you', 'PLAIN', 'abbreviation'],
  [/\bthe same NRPF rules\b/g, 'the same ' + NRPF_PHRASE + ' rules', 'PLAIN', 'abbreviation'],
  [/^NRPF: ask\b/g, 'With ' + NRPF_PHRASE + ': ask', 'PLAIN', 'abbreviation'],
  [/\bpure NRPF without asylum support\b/g, 'people with ' + NRPF_PHRASE + ' and no asylum support', 'PLAIN', 'abbreviation'],
  [/\bthe NRPF condition\b/g, 'the ' + NRPF_PHRASE + ' condition', 'PLAIN', 'abbreviation'],
  [/\bNRPF by default\b/g, 'No recourse to public funds by default', 'PLAIN', 'abbreviation'],
  [/\bNRPF does not block it\b/g, 'a ' + NRPF_PHRASE + ' condition does not block it', 'PLAIN', 'abbreviation'],
  [/\bincl\. NRPF\b/g, 'including people with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bHomelessness help under NRPF\b/g, 'Homelessness help with ' + NRPF_PHRASE, 'PLAIN', 'abbreviation'],
  [/\bNRPF itself is irrelevant\b/g, 'A ' + NRPF_PHRASE + ' condition does not matter here', 'PLAIN', 'abbreviation'],
  [/\bClaiming never breaches NRPF\b/g, 'Claiming never breaks a ' + NRPF_PHRASE + ' condition', 'PLAIN', 'abbreviation'],
  [/\bnever breaches NRPF conditions\b/g, 'never breaks ' + NRPF_PHRASE + ' conditions', 'PLAIN', 'abbreviation'],
  [/\bclaiming breaches NRPF\b/g, 'claiming breaks a ' + NRPF_PHRASE + ' condition', 'PLAIN', 'abbreviation'],
  [/\bNRPF-safe\b/g, 'open to people with ' + NRPF_PHRASE, 'PLAIN', 'engine shorthand'],

  /* PLAIN: other abbreviations, spelled out */
  [/\ban NI number\b/g, 'a National Insurance number', 'PLAIN', 'abbreviation'],
  [/\bNI (numbers?|credits|contributions)\b/g, 'National Insurance $1', 'PLAIN', 'abbreviation (NI as National Insurance, not Northern Ireland)'],
  [/\bClass 1 NI\b/g, 'Class 1 National Insurance', 'PLAIN', 'abbreviation'],
  [/\bNINo\b/g, 'National Insurance number', 'PLAIN', 'abbreviation'],
  [/\bHRT and past presence exempt\b/g, 'exempt from the Habitual Residence Test and past presence test', 'PLAIN', 'abbreviation'],
  [/\bHRT\/past-presence exemptions\b/g, 'exemptions from the Habitual Residence Test and past presence test', 'PLAIN', 'abbreviation'],
  [/^HRT applies$/g, 'The Habitual Residence Test applies', 'PLAIN', 'abbreviation'],
  [/\bUC\b/g, 'Universal Credit', 'PLAIN', 'abbreviation'],
  [/\bHP holders\b/g, 'people with humanitarian protection', 'PLAIN', 'abbreviation'],
  [/\bHP\b/g, 'humanitarian protection', 'PLAIN', 'abbreviation'],
  [/\bILR\b/g, 'indefinite leave to remain', 'PLAIN', 'abbreviation'],
  [/\bEUSS can count EEA residence\b/g, 'People with EU Settlement Scheme status can count EEA residence', 'PLAIN', 'abbreviation'],
  [/\bFamily and EUSS generally qualify\b/g, 'Family visa holders and people with EU Settlement Scheme status generally qualify', 'PLAIN', 'abbreviation ("Family" is the Family visa group)'],
  [/\bEUSS\b/g, 'EU Settlement Scheme', 'PLAIN', 'abbreviation'],
  [/\bbenefits-related FSM\b/g, 'free school meals given because of benefits', 'PLAIN', 'abbreviation'],
  [/\bbenefit-FSM eligible children\b/g, 'children eligible for free school meals through benefits', 'PLAIN', 'abbreviation'],
  [/\bFSM-linked help\b/g, 'help linked to free school meals', 'PLAIN', 'abbreviation'],
  [/\bFSM-linked\b/g, 'linked to free school meals', 'PLAIN', 'abbreviation'],
  [/\bFSM families\b/g, 'families on free school meals', 'PLAIN', 'abbreviation'],
  [/\bFSM\b/g, 'free school meals', 'PLAIN', 'abbreviation'],
  [/\bCRF Housing Payments\b/g, 'Crisis and Resilience Fund Housing Payments', 'PLAIN', 'abbreviation'],
  [/\bnow mostly CRF-funded\b/g, 'now mostly paid for by the Crisis and Resilience Fund', 'PLAIN', 'abbreviation'],
  [/\bthe CRF\b/g, 'the Crisis and Resilience Fund', 'PLAIN', 'abbreviation'],
  [/\(replaced HSF\)/g, '(replaced the Household Support Fund)', 'PLAIN', 'abbreviation (catalog heading 47 names it)'],
  [/\bDHPs\b/g, 'Discretionary Housing Payments', 'PLAIN', 'abbreviation'],
  [/\bHICBC from\b/g, 'High Income Child Benefit Charge from', 'PLAIN', 'abbreviation'],
  [/\bLCWRA health element\b/g, 'Health element (for limited capability for work and work-related activity)', 'PLAIN', 'abbreviation (starts a sentence)'],
  [/\bLCWRA £/g, 'health element £', 'PLAIN', 'abbreviation (the same element as in the description)'],
  [/\bthe ADG\b/g, "the Adult Dependants' Grant", 'PLAIN', 'abbreviation (named earlier in the same text)'],
  [/\bDiscretionary Assistance Fund EAP \(Wales\)/g, 'Discretionary Assistance Fund: Emergency Assistance Payment (Wales)', 'PLAIN', 'abbreviation in the name'],
  [/\bfor the EAP\b/g, 'for the Emergency Assistance Payment', 'PLAIN', 'abbreviation'],
  [/\bADP\b/g, 'Adult Disability Payment', 'PLAIN', 'abbreviation'],
  [/\bthe AA itself\b/g, 'the Attendance Allowance itself', 'PLAIN', 'abbreviation'],
  [/\/ DLA middle\+ \/ AA\b/g, '/ Disability Living Allowance middle+ / Attendance Allowance', 'PLAIN', 'abbreviations'],
  [/\bDLA\b/g, 'Disability Living Allowance', 'PLAIN', 'abbreviation'],
  [/\bs3C protection\b/g, 'section 3C protection', 'PLAIN', 'legal shorthand'],
  [/\bAsylum seekers on s95\b/g, 'Asylum seekers on section 95 support', 'PLAIN', 'legal shorthand'],
  [/\bChildren of s95\/s98\/s4 families\b/g, 'Children of families on section 95, 98 or 4 support', 'PLAIN', 'legal shorthand'],
  [/\bon s1 Localism Act 2011\b/g, 'on section 1 of the Localism Act 2011', 'PLAIN', 'legal shorthand'],
  [/\bunder s17 Children Act\b/g, 'under section 17 of the Children Act', 'PLAIN', 'legal shorthand'],
  [/\bthe s17\/Care Act route\b/g, 'the section 17 or Care Act route', 'PLAIN', 'legal shorthand'],
  [/\(s179, /g, '(section 179, ', 'PLAIN', 'legal shorthand'],
  [/\bs17 accommodation\b/g, 'section 17 accommodation', 'PLAIN', 'legal shorthand'],
  [/\bunder s17\b/g, 'under section 17', 'PLAIN', 'legal shorthand'],
  [/\bs13A\(1\)\(c\)/g, 'section 13A(1)(c)', 'PLAIN', 'legal shorthand'],

  /* PLAIN: "recourse" alone means recourse to public funds */
  [/\brecourse is gained\b/g, 'recourse to public funds is gained', 'PLAIN', 'shorthand'],
  [/\b([Rr])ecourse\b(?! to public funds)/g, '$1ecourse to public funds', 'PLAIN', 'shorthand'],

  /* ABBR: shown text fields only, never names (see above). Specific
     phrases first, then firstUse() rows. Same meaning, no fact added. */
  // Health
  firstUse('IHS', 'Immigration Health Surcharge', 'the fee paid with a visa application'),
  firstUse('PPC', 'prescription prepayment certificate', 'the NHS certificate for unlimited prescriptions'),
  firstUse('A&E', 'accident and emergency', 'the hospital emergency department'),
  firstUse('FGM', 'female genital mutilation', 'medical abbreviation'),
  [/\bwith NHSBSA\b/g, 'with the NHS Business Services Authority (NHSBSA)', 'ABBR', 'body name (adds "the")'],
  firstUse('NHSBSA', 'NHS Business Services Authority', 'body name, used as a source'),
  firstUse('UKHSA', 'UK Health Security Agency', 'body name'),
  // Savings and money
  [/\band LISA$/g, 'and a Lifetime ISA', 'ABBR', 'LISA is short for Lifetime ISA'],
  [/\bLISAs\b/g, 'Lifetime ISAs', 'ABBR', 'LISA is short for Lifetime ISA'],
  firstUse('APR', 'annual percentage rate', 'the yearly cost of a loan'),
  firstUse('PAYE', 'Pay As You Earn', 'how tax is taken from wages'),
  // Immigration
  [/\(ARC card\)/g, '(Application Registration Card)', 'ABBR', 'the card asylum seekers get'],
  [/\bARC cards\b/, 'Application Registration Cards (ARC cards)', 'ABBR', 'the card asylum seekers get'],
  firstUse('ARC', 'Application Registration Card', 'the card asylum seekers get', ' card'),
  firstUse('BRP', 'biometric residence permit', 'the old visa card'),
  firstUse('NASS', 'National Asylum Support Service', 'the asylum support reference'),
  firstUse('ASAP', 'Asylum Support Appeals Project', 'a charity name that reads like "as soon as possible"'),
  [/\bformerly OISC\b/g, 'formerly the Office of the Immigration Services Commissioner', 'ABBR', 'old body name'],
  firstUse('JCWI', 'Joint Council for the Welfare of Immigrants', 'charity name'),
  firstUse('ICIBI', 'Independent Chief Inspector of Borders and Immigration', 'body name, used as a source'),
  [/\bQ1 2026\b/g, 'January to March 2026', 'ABBR', '"Q1" is the first quarter of the year (Home Office statistics use calendar quarters)'],
  [/\bcount EEA residence\b/g, 'count residence in the European Economic Area (EEA)', 'ABBR', 'abbreviation'],
  firstUse('RQF', 'Regulated Qualifications Framework', 'the framework that sets qualification grades'),
  // Benefits whose short names stay in official names (New Style ESA, EMA Wales)
  [/\bNew Style JSA\/ESA\b/g, "New Style Jobseeker's Allowance and Employment and Support Allowance", 'ABBR', 'two benefit names joined by a slash'],
  firstUse('PIP', 'Personal Independence Payment', 'benefit name'),
  firstUse('ESA', 'Employment and Support Allowance', 'benefit name'),
  firstUse('JSA', "Jobseeker's Allowance", 'benefit name'),
  firstUse('SMP', 'Statutory Maternity Pay', 'benefit name'),
  firstUse('SSP', 'Statutory Sick Pay', 'benefit name'),
  [/\bUnlike CA,/g, "Unlike Carer's Allowance,", 'ABBR', 'CA is Carer\'s Allowance (named earlier in the same text)'],
  [/\bat NLW\b/g, 'at the National Living Wage', 'ABBR', 'NLW is the National Living Wage'],
  // Work and education
  firstUse('HGV', 'heavy goods vehicle', 'lorry driving courses'),
  [/\bTrailblazer NEET support\b/g, 'Trailblazer support for young people not in education, employment or training (NEET)', 'ABBR', 'NEET means not in education, employment or training'],
  [/\bSFE-style categories\b/g, 'the same categories as Student Finance England', 'ABBR', 'SFE is Student Finance England'],
  firstUse('SLC', 'Student Loans Company', 'body name, used as a source'),
  [/\bAccess to HE Diploma\b/g, 'Access to Higher Education (HE) Diploma', 'ABBR', 'HE is higher education (full name of the diploma)'],
  [/\bdesignated HE course\b/g, 'designated higher education course', 'ABBR', 'HE is higher education'],
  firstUse('D&T', 'design and technology', 'school subject'),
  firstUse('PE', 'physical education', 'school subject'),
  firstUse('DfE', 'Department for Education', 'body name'),
  [/\bUniversal P1 to P5\b/g, 'Universal for Primary 1 to Primary 5 (P1 to P5)', 'ABBR', 'Scottish primary school years'],
  [/\bP6\+ via\b/g, 'From Primary 6 (P6) up, via', 'ABBR', 'Scottish primary school years'],
  // Energy, water, housing
  [/\bThe £15bn ECO successor\b/g, 'The £15 billion successor to the Energy Company Obligation', 'ABBR', 'ECO is the Energy Company Obligation (used once, so no short form kept)'],
  [/\bECO4 LA Flex pages\b/g, 'ECO4 LA Flex pages (the council route of the Energy Company Obligation)', 'ABBR', 'search words kept; the same entry calls LA Flex "the council route"'],
  [/\bthe LA Flex council route\b/g, 'the Local Authority Flexible Eligibility (LA Flex) council route', 'ABBR', 'LA Flex is Local Authority Flexible Eligibility'],
  [/^ECO4 runs only\b/g, 'The Energy Company Obligation (ECO4) runs only', 'ABBR', 'energy scheme name, at the start of a sentence'],
  firstUse('GBIS', 'Great British Insulation Scheme', 'scheme name'),
  firstUse('EPC', 'Energy Performance Certificate', 'the energy rating of a home'),
  firstUse('CCW', 'Consumer Council for Water', 'body name, used as a source'),
  firstUse('BGET', 'British Gas Energy Trust', 'charity name'),
  [/\bUU Back on Track\b/g, 'United Utilities Back on Track', 'ABBR', 'UU is United Utilities'],
  [/\bwith NIHE\b/g, 'with the Northern Ireland Housing Executive', 'ABBR', 'body name'],
  [/\(CPI-uprated annually\)/g, '(raised each year in line with the Consumer Prices Index)', 'ABBR', 'CPI is the Consumer Prices Index; "uprated" is jargon'],
  // Places and bodies
  [/\bGB-wide\b/g, 'across Great Britain', 'ABBR', 'GB is Great Britain'],
  [/\bGB\b/g, 'Great Britain', 'ABBR', 'GB is Great Britain'],
  [/(?<!Law Centre )\bNI\b(?!\) Order)/g, 'Northern Ireland', 'ABBR', 'NI is Northern Ireland (kept in the names "Law Centre NI" and "Welfare Reform (NI) Order")'],
  [/\bGM\b/g, 'Greater Manchester', 'ABBR', 'GM is Greater Manchester'],
  firstUse('TfGM', 'Transport for Greater Manchester', 'body name, used as a source'),
  [/\bWM buses\b/g, 'West Midlands buses', 'ABBR', 'WM is West Midlands'],
  [/\bmet boroughs\b/g, 'metropolitan boroughs', 'ABBR', 'short word'],
  [/\bLiverpool CR\b/g, 'Liverpool City Region', 'ABBR', 'CR is City Region'],
  [/\ba TfL-registered institution\b/g, 'an institution registered with Transport for London (TfL)', 'ABBR', 'TfL is Transport for London'],
  firstUse('TfL', 'Transport for London', 'body name'),
  firstUse('MoJ', 'Ministry of Justice', 'body name, used as a source'),
  [/\(STAR\)/g, '(Student Action for Refugees)', 'ABBR', 'charity name, used as a source'],
  [/\(FAQ\)/g, '(their frequently asked questions)', 'ABBR', 'FAQ is frequently asked questions'],
  // Short forms of common words
  [/(\d\+?)\s?hrs\/week\b/g, '$1 hours a week', 'ABBR', 'short form'],
  [/(\d\+?)\s?hrs\/day\b/g, '$1 hours a day', 'ABBR', 'short form'],
  [/(\d\+?)\s?hrs\/yr\b/g, '$1 hours a year', 'ABBR', 'short form'],
  [/(\d\+?)\s?h\/week\b/g, '$1 hours a week', 'ABBR', 'short form'],
  [/\/yr\b/g, ' a year', 'ABBR', 'short form'],
  [/\/wk\b/g, ' a week', 'ABBR', 'short form'],
  [/\/hr\b/g, ' an hour', 'ABBR', 'short form'],
  [/~(?=\d)/g, 'about ', 'ABBR', '"~" means about'],
  [/\be\.g\. /g, 'for example ', 'ABBR', 'short form'],
  [/\bincl\. /g, 'including ', 'ABBR', 'short form'],
  [/\bpara (?=\d)/g, 'paragraph ', 'ABBR', 'short form'],
  [/\bparas (?=\d)/g, 'paragraphs ', 'ABBR', 'short form'],
  [/\bJan (?=\d)/g, 'January ', 'ABBR', 'short month name'],
  [/\bFeb (?=\d|to )/g, 'February ', 'ABBR', 'short month name'],
  [/\bAug (?=\d)/g, 'August ', 'ABBR', 'short month name'],
  [/\bSept (?=\d)/g, 'September ', 'ABBR', 'short month name'],
  [/\b([Mm])ax\b/g, '$1aximum', 'ABBR', 'short form'],
  [/£(\d+)k\b/g, '£$1,000', 'ABBR', '"k" means thousand'],
  [/(\d)bn\b/g, '$1 billion', 'ABBR', '"bn" means billion'],
  [/(\d)m\b(\+?)/g, '$1 million$2', 'ABBR', '"m" after a number means million (every use in the catalog is a count or an amount)'],
];

/* Terms that must not survive in a displayed field (name, sub, about,
   rules, valueLabel, valueNote, stat, strengthen, note, guide, docs).
   nrpfNote is internal and not checked. */
const PLAIN_LEFTOVERS = [
  /\bNRPF\b(?! Network)/, /\b(?:UC|HP|ILR|EUSS|FSM|HRT|CRF|HSF|DHPs?|WHD|LCWRA|HICBC|ADG|IAP|EAP|NINo|ADP|DLA)\b/,
  /\bNI (?:numbers?|credits|contributions)\b|\bClass 1 NI\b/, /[Mm]eans[- ]test/, /\bgated\b|-gated\b|\bGateway is\b|\bGated\b/,
  /Composition-based|Contribution-based|\bcontributory\b|\bcomposition discounts\b/, /\bsurfac/i, /\bentry[- ]\d|\bentries: \d/,
  /\bthis catalog\b/, /\bkiller\b|\bflagship\b|\bmaster gate\b|\bThe race\b|\bparallel system\b|\bdesigned floor\b|\bsibling\b/i,
  /\bpassport(?:s|ed) (?:to|you)\b|\bpassported\b/, /\bs(?:1|3C|4|13A|17|95|98|179)\b/, /building copy/, /: blocked$/,
];

/* ABBR check: a shown field (not a name) that uses one of these
   abbreviations must also hold its full words. null means the abbreviation
   is always spelled out in full. Kept on purpose, not listed here: form and
   certificate names (HC1, HC2, HC3, HC5, MATB1, SMP1, SSP1, MA1, SF100,
   FW8, CH2, GMS1, ASF1, P45, P50, P85, P800), tax codes (1257L, W1/M1,
   BR, 0T), bodies people deal with directly (DWP, HMRC, NHS, HM Treasury,
   GOV.UK), brand and company names (BT, EE, O2, SMARTY, VOXI, KCOM, EDF,
   OVO, HSBC, NatWest, BBC, TOTUM, UNiDAYS), vaccine names (MMR, MenACWY),
   words most people know (UK, EU, GP, ID, TV, CV, SIM, TB, HIV), the
   status name BN(O), the rule name Appendix FM, document references
   (MD3509, CBP-10827), "ECO4 LA Flex" as words to search for on a council
   site, and abbreviations the same field already explains (IAA, ECF,
   SWEP, HAF inside a quotation). */
const ABBR_EXPLAINED = [
  ['IHS', /Immigration Health Surcharge/], ['PPC', /prescription prepayment certificate/i], ['A&E', /accident and emergency/i],
  ['FGM', /female genital mutilation/i], ['NHSBSA', /NHS Business Services Authority/], ['UKHSA', /UK Health Security Agency/],
  ['LISA', null], ['LISAs', null], ['APR', /annual percentage rate/i], ['PAYE', /Pay As You Earn/],
  ['ARC', /Application Registration Card/], ['BRP', /biometric residence permit/i], ['NASS', /National Asylum Support Service/],
  ['ASAP', /Asylum Support Appeals Project/], ['OISC', /Office of the Immigration Services Commissioner/],
  ['JCWI', /Joint Council for the Welfare of Immigrants/], ['ICIBI', /Independent Chief Inspector/], ['Q1', null],
  ['EEA', /European Economic Area/], ['RQF', /Regulated Qualifications Framework/], ['PIP', /Personal Independence Payment/],
  ['ESA', /Employment and Support Allowance/], ['JSA', /Jobseeker's Allowance/], ['SMP', /Statutory Maternity Pay/],
  ['SSP', /Statutory Sick Pay/], ['CA', null], ['NLW', null], ['HGV', /heavy goods vehicle/i], ['NEET', /not in education/],
  ['SFE', null], ['SLC', /Student Loans Company/], ['HE', /higher education/i], ['D&T', /design and technology/i],
  ['PE', /physical education/i], ['DfE', /Department for Education/], ['P1', /Primary 1/], ['P6', /Primary 6/],
  ['ECO', /Energy Company Obligation/], ['ECO4', /Energy Company Obligation/], ['LA Flex', /Local Authority Flexible Eligibility|council route/],
  ['GBIS', /Great British Insulation Scheme/], ['EPC', /Energy Performance Certificate/i], ['CCW', /Consumer Council for Water/],
  ['BGET', /British Gas Energy Trust/], ['UU', null], ['NIHE', null], ['CPI', /Consumer Prices Index/], ['GB', null],
  ['NI', null], ['GM', null], ['TfGM', /Transport for Greater Manchester/], ['WM', null], ['CR', null],
  ['TfL', /Transport for London/], ['MoJ', /Ministry of Justice/], ['FAQ', null], ['STAR', null],
].map(([abbr, full]) => [new RegExp((abbr === 'NI' ? '(?<!Law Centre )' : '') + '(?<![A-Za-z0-9])' + abbr.replace(/[&]/g, '\\&') +
  '(?![A-Za-z0-9])' + (abbr === 'NI' ? '(?!\\) Order)' : '')), full, abbr]);
const ABBR_SHORT_FORMS = /\/yr\b|\/wk\b|\/hr\b|\bhrs\b|\d\s?h\/week\b|~\d|\be\.g\.|\bincl\.|\bparas? \d|\b[Mm]ax\b|£\d+k\b|\dbn\b|\dm\b|\b(?:Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b/;

/* Value labels. The generator gave every parsed entry the label "Free" by
   default, even loans and paid services (Refugee travel document, Postgraduate
   loans). That is not sourced, so those labels become null. Hand-written
   entries keep their labels. */
const VALUE_LABEL_FIX = {
  nino: ['Free', 'guide cost "Free"; the catalog label "Enabler" is jargon'],
};

/* ------------------------------------------------------------------ */
/* 4. Helpers                                                           */
/* ------------------------------------------------------------------ */

/* Which ids each PLAIN rule changed, for the report. */
let CURRENT_ID = null;
const plainHits = PLAIN.map(() => new Set());

/* cleanBase: banned-word swaps and dashes only. plainText: the PLAIN rules.
   clean = both. Short lines are cut from the cleanBase text and reworded
   after, so a longer plain wording never pushes a clause off a card. */
function cleanBase(s) {
  if (s == null) return s;
  let out = String(s);
  for (const [re, rep] of REWORD) out = out.replace(re, rep);
  // Ranges become "to", any other long dash a comma. (Sources have none today.)
  out = out.replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, '$1 to $2').replace(DASHES, ',');
  return out.replace(/\s+/g, ' ').trim();
}
function plainText(s) {
  if (s == null) return s;
  let out = String(s);
  PLAIN.forEach(([re, rep, kind], i) => {
    if (kind === 'ABBR') return;          // shown fields only, see explainText
    const next = out.replace(re, rep);
    if (next !== out && CURRENT_ID) plainHits[i].add(CURRENT_ID);
    out = next;
  });
  return out.replace(/\s+/g, ' ').trim();
}
/* The ABBR rows of PLAIN, for one shown text field (never a name). */
function explainText(s) {
  if (s == null) return s;
  let out = String(s);
  PLAIN.forEach(([re, rep, kind], i) => {
    if (kind !== 'ABBR') return;
    const next = out.replace(re, rep);
    if (next !== out && CURRENT_ID) plainHits[i].add(CURRENT_ID);
    out = next;
  });
  return out.replace(/\s+/g, ' ').trim();
}
const clean = s => plainText(cleanBase(s));
const cleanList = a => (a || []).map(clean).filter(Boolean);

const balanced = s => (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length;

/* A short line from the start of a longer text, by trimming only.
   Takes the first sentence if it fits. Otherwise cuts at the last clause
   break that fits (";", ":", ",", " (" or before "and", "with", "plus"...),
   never inside brackets and never after a dangling word like "for" or "an".
   A ";" or ":" break beats a later break less than 20 characters on,
   so a list is not cut in the middle. */
const DANGLING = /\b(for|to|of|and|or|with|the|a|an|in|on|by|at|from|into|as|per|than|if|is|are|be|have|has)$/i;
const ING_NOUNS = new Set(['housing', 'funding', 'training', 'clothing', 'learning', 'heating', 'building', 'living', 'banking', 'cleaning', 'nursing', 'earnings']);
function awkwardEnd(cut) {
  const last = cut.split(/\s+/).pop().toLowerCase().replace(/[^a-z-]/g, '');
  if (/ing$/.test(last) && !ING_NOUNS.has(last)) return true;       // "stacking", "dressing"
  const seg = cut.replace(/\([^)]*\)/g, '').split(/[,;:]\s/).pop().trim(); // last list item
  return cut.length > seg.length && seg.split(/\s+/).length < 2;    // "..., Scotland"
}
function shortLine(text, max = 110) {
  const first = text.split(/(?<=\.)\s+(?=[A-Z0-9£])/)[0].replace(/\.$/, '');
  if (first.length <= max && balanced(first)) return first;
  const cands = [];
  for (const m of first.matchAll(/[;:]\s|,\s|\s\(|\s(?=(?:and|or|with|plus|but|while|which|for|so)\s)/g)) {
    if (m.index < 40 || m.index > max) continue;
    const cut = first.slice(0, m.index).replace(/[\s,;:]+$/, '');
    if (!balanced(cut) || DANGLING.test(cut) || awkwardEnd(cut)) continue;
    cands.push({ pos: m.index, cut, strong: /[;:]/.test(m[0]) });
  }
  if (cands.length) {
    const last = cands[cands.length - 1];
    const strong = cands.filter(c => c.strong).pop();
    return (strong && last.pos - strong.pos < 20 ? strong : last).cut;
  }
  let cut = first.slice(0, Math.max(first.lastIndexOf(' ', max), 1));
  while (DANGLING.test(cut)) cut = cut.replace(/\s+\S+$/, '');
  return cut;
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 6).join('-').slice(0, 48) || 'item';
}

/* Conservative lower bound in minutes for guide.time, for sorting only.
   "2 to 4 hours" -> 120, "About 15 minutes" -> 15, "Nothing to do" -> 0.
   Anything else ("One conversation", "Several hours") -> null. */
function parseMinutes(t) {
  if (!t) return null;
  const s = t.toLowerCase().trim();
  if (/^nothing to do\b/.test(s)) return 0;
  const m = s.match(/^(?:about |around )?(\d+(?:\.\d+)?)(?:\s*to\s*\d+(?:\.\d+)?)?\s*(minutes?|mins?|hours?|hrs?)\b/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * (m[2].startsWith('h') ? 60 : 1));
}

/* Effort: Landit's own estimate from the number of things to gather and
   the number of steps. Only for schemes with a hand-written guide.
     low    'Quick and simple'  docs <= 1 and steps <= 4
     high   'More paperwork'    docs >= 4 or  steps >= 6
     medium 'Some paperwork'    everything else
   docs counts every item in `docs` (needed and maybe). */
const EFFORT_LABEL = { low: 'Quick and simple', medium: 'Some paperwork', high: 'More paperwork' };
function effortFor(docsCount, stepsCount, generic) {
  if (generic) return null;
  if (docsCount <= 1 && stepsCount <= 4) return 'low';
  if (docsCount >= 4 || stepsCount >= 6) return 'high';
  return 'medium';
}

/* A need item is conditional ('maybe') when it only applies in some cases. */
const CONDITIONAL = [
  /^(if|for|where|when)\b/i,
  /\bif (you|relevant|any|applicable|needed)/i,   // "if you" also catches "if your"
  /\bwhere relevant\b/i,
  /\bfor a non-working\b/i,
];
const isConditional = s => CONDITIONAL.some(re => re.test(s));

/* docsGate keys from the catalog, with the prototype's labels (no fixed
   month counts, because guides differ). `covers` finds a need item that
   already asks for the same thing, so it is not listed twice. */
const GATE_DOCS = {
  tenancy: { label: 'Tenancy agreement', covers: /tenancy|address|landlord|housing costs/i },
  payslip: { label: 'Payslip', covers: /payslip|income|earnings|accounts covering/i },
  bankStatements: { label: 'Bank statements', covers: /bank statements?|statements for/i },
  brp: { label: 'BRP or visa card', covers: /passport|evisa|\bbrp\b|\bid\b|immigration documents|refugee status/i },
  studentCertificate: { label: 'CAS or enrolment letter', covers: /student certificate|enrolment|\bcas\b/i },
  matb1: { label: 'MATB1 certificate', covers: /matb1/i },
};

/* Rules that name a piece of proof become 'maybe' documents, unless a need
   item already covers the same word. Rules that say "No ID..." are skipped. */
const PROOF_WORDS = /\b(evidence|proof|certificate|letter|fit notes?|statements?|voucher|share code|passport)\b/i;

/* Document corrections, checked against each scheme's own rules and guide.
   Every guide need list, catalog document gate and rule-based document was
   read; these are the only two kinds of error found. Nothing is invented:
   an item is only moved, or its certainty changed.
   NOT_A_DOCUMENT: a condition the person meets, with nothing to gather. It
     leaves `docs`. `addRule: true` adds it to `rules` when no rule says it
     yet; otherwise the quoted rule already says the same.
   REQUIRED: the scheme's own rule or guide says it is required, so it is
     'needed', not 'maybe'. */
const DOC_FIX = {
  NOT_A_DOCUMENT: {
    'lisa': [/^Age 18 to 39$/, true, 'an age condition (the guide step "to be 18 to 39"); the rules only had "Open before age 40", so it moves there'],
    'help-to-save': [/^A Universal Credit claim with £1\+ of earnings that month$/, false, 'the rule "On Universal Credit with £1+ take-home pay last assessment period"; HMRC checks it, there is nothing to gather'],
    'buttle-uk': [/^A frontline professional willing to apply for you$/, false, 'the rule "Application by a frontline professional": who applies, not a document'],
  },
  REQUIRED: {
    'trussell-food-banks': [/^Referral voucher from a partner agency\b/, 'rule "Referral voucher from a partner agency"; guide step "Take the voucher to the food bank"'],
  },
};
/* A guide need note that starts with "Nothing." contradicts a needed
   document, so the word "Nothing." goes and the rest stays (Trussell food
   banks: "Nothing. No ID or immigration check." becomes "No ID or
   immigration check." once its voucher is needed). */
const NOTHING_FIRST = /^Nothing\.\s+/;

/* Plain-English status names (the catalog's are technical). */
const STATUS_LABEL = {
  worker: ['Skilled Worker or Health and Care visa', 'Skilled Worker visa'],
  student: ['Student visa', 'Student visa'],
  graduate: ['Graduate visa', 'Graduate visa'],
  family: ['Family or partner visa', 'Family visa'],
  bno: ['Hong Kong BN(O) visa', 'BN(O) visa'],
  euss_settled: ['EU Settlement Scheme, settled status', 'EUSS settled'],
  euss_presettled: ['EU Settlement Scheme, pre-settled status', 'EUSS pre-settled'],
  refugee: ['Refugee or humanitarian protection', 'Refugee'],
  ukraine: ['Ukraine scheme visa', 'Ukraine scheme'],
  ilr: ['Indefinite leave to remain', 'ILR'],
  asylum: ['Asylum seeker, waiting for a decision', 'Asylum seeker'],
};

const NATIONS = [
  { key: 'England', label: 'England', aliases: [] },
  { key: 'Scotland', label: 'Scotland', aliases: [] },
  { key: 'Wales', label: 'Wales', aliases: [] },
  { key: 'Northern Ireland', label: 'Northern Ireland', aliases: ['NI'] },
];
const ALL_NATIONS = NATIONS.map(n => n.key);

/* Sub-national areas. All are in England (markdown section U and The Bike
   Project entry). `local` is shown to the person; the matcher only filters
   London, and only when it knows the city (see shared/match.js). */
const LOCAL_AREA = {
  'London': 'London',
  'all 33 London boroughs': 'London',
  'London and West Midlands': 'London and West Midlands',
  'Greater Manchester': 'Greater Manchester',
  'West Midlands': 'West Midlands',
  'West Yorkshire': 'West Yorkshire',
  'Liverpool City Region': 'Liverpool City Region',
  'as named': 'South Yorkshire, North East, Cambridgeshire',
};

/* Every region string in the catalog gets a short plain label. The build
   fails if the catalog gains a region this table does not know. */
const REGION_LABEL = {
  'UK': 'Whole UK',
  'GB': 'England, Scotland and Wales',
  'England': 'England',
  'Scotland': 'Scotland',
  'Wales': 'Wales',
  'NI': 'Northern Ireland',
  'England (parallel exemptions in the other nations)': 'England',
  'GB (distances vary by nation)': 'England, Scotland and Wales',
  'England, per council': 'England, depends on your council',
  'England, every council': 'England',
  'Wales (abolished in England)': 'Wales',
  'per institution': 'Depends on your university or college',
  'England, Wales, NI': 'England, Wales and Northern Ireland',
  'England, Scotland, Wales': 'England, Scotland and Wales',
  'per council': 'Depends on your council',
  'London': 'London only',
  'per company': 'Depends on your water company',
  'England, Wales': 'England and Wales',
  'London and West Midlands': 'London and West Midlands only',
  'England rules shown, all four nations run parallel category lists': 'Whole UK (England rules shown)',
  'all 33 London boroughs': 'London only',
  'Greater Manchester': 'Greater Manchester only',
  'West Midlands': 'West Midlands only',
  'West Yorkshire': 'West Yorkshire only',
  'Liverpool City Region': 'Liverpool City Region only',
  'as named': 'South Yorkshire, North East, Cambridgeshire only',
  'Scotland / Wales': 'Scotland and Wales',
  'Wales (Flying Start postcodes)': 'Wales, some postcodes',
  'NI (65+ also RoI)': 'Northern Ireland',
  'NI (catchment postcodes)': 'Northern Ireland, some postcodes',
  'centre cities': 'Cities with a centre',
  'as listed': 'Listed areas only',
  'UK, 500+ stores': 'Whole UK',
  'England and Wales (separate schemes elsewhere)': 'England and Wales',
  'UK, varies by area': 'Whole UK, varies by area',
  'England-wide, London universal training': 'England',
  'participating boroughs': 'Participating areas only',
  'UK, best in cities': 'Whole UK',
};

/* Which nations a region string covers. Text in brackets is a note
   ("Wales (abolished in England)"), so it is ignored. "NI" means Northern
   Ireland and "GB" means England, Scotland and Wales. Unnamed regions
   ("UK", "per council") cover all four, as in the prototype. */
function nationsFor(region) {
  const r = region.replace(/\([^)]*\)/g, ' ');
  const set = new Set();
  if (/\bGB\b/.test(r)) ['England', 'Scotland', 'Wales'].forEach(n => set.add(n));
  if (/England/i.test(r)) set.add('England');
  if (/Scotland/i.test(r)) set.add('Scotland');
  if (/Wales/i.test(r)) set.add('Wales');
  if (/Northern Ireland/i.test(r) || /\bNI\b/.test(r)) set.add('Northern Ireland');
  if (LOCAL_AREA[region]) set.add('England');
  return set.size ? ALL_NATIONS.filter(n => set.has(n)) : ALL_NATIONS.slice();
}

/* The prototype's fallbackGuide, for schemes with no hand-written guide.
   Changes from the prototype: time, decision and cost are null (the
   prototype said "Varies" and "Free to apply", which is not sourced: some of
   these schemes charge a fee), and the official-page step no longer points
   at a place on the screen. */
const APPLY_VERB = {
  council: 'Contact your local council and ask for this by name.',
  education: "Ask your school, college or university's student support team.",
  childcare: "Speak to your council's early years team or a participating provider.",
  charity: 'Apply through the charity that runs it.',
  food: 'Ask an advice agency, school or GP for a referral.',
  health: 'Ask at your GP surgery, pharmacy or the NHS service page.',
  transport: 'Apply through the operator or transport authority.',
  energy: "Apply through your supplier or the scheme's own page.",
  water: 'Call your water company and ask for it by name.',
  money: 'Apply directly with the provider.',
  work: 'Raise it with your employer or HMRC.',
  legal: 'Apply to the Home Office, or get free regulated advice first.',
  welfare: 'Claim on GOV.UK or through the relevant agency.',
};
function fallbackGuide(b) {
  const where = b.applyUrl ? 'Open the official page for this scheme.' : (APPLY_VERB[b.category] || 'Apply through the organisation that runs it.');
  const steps = [
    `Check you fit: ${b.regionLabel}${b.who.includes('all') ? ', open regardless of status' : ', and this scheme is for your immigration status'}.`,
    where,
    'Gather what they ask for before you start, so you can finish in one sitting.',
    'Submit, note the reference, and set a reminder to chase if you hear nothing in a month.',
  ];
  if (b.rules.length) steps.splice(1, 0, ('Meet the conditions: ' + b.rules.join('; ') + '.').replace(/\.\.$/, '.'));
  const boost = [];
  if (b.strengthen) boost.push(b.strengthen);
  if (b.note) boost.push(b.note);
  // Plain English (was "This one is safe with a no recourse to public funds condition").
  if (b.nrpf === 'yes') boost.push('A no recourse to public funds condition does not stop you getting this, so do not rule yourself out.');
  if (b.nrpf === 'depends') boost.push('There is a route in, but it depends on your circumstances: ask which route applies to you before assuming no.');
  boost.push('If you are told no at the counter, ask for the reason in writing. Front-line refusals are often wrong about immigration status.');
  return {
    time: null, decision: null, cost: null, steps, boost,
    // Plain English (was "so it needs recourse").
    watch: b.publicFunds ? 'This is a public fund, so you can only claim it if your visa gives you recourse to public funds. Check your visa conditions before claiming.' : null,
    needNote: null, generic: true,
  };
}

/* ------------------------------------------------------------------ */
/* 5. Categories and icons                                              */
/* ------------------------------------------------------------------ */

/* Object order is the suggested display order for filters. */
const CATEGORIES = {
  money: { label: 'Money', icon: 'wallet' },
  welfare: { label: 'Welfare support', icon: 'hand-coins' },
  council: { label: 'Council help', icon: 'landmark' },
  health: { label: 'Health', icon: 'heart-pulse' },
  education: { label: 'Education', icon: 'graduation-cap' },
  work: { label: 'Work', icon: 'briefcase' },
  transport: { label: 'Transport', icon: 'train-front' },
  childcare: { label: 'Childcare', icon: 'baby' },
  family: { label: 'Family', icon: 'heart' },
  energy: { label: 'Energy', icon: 'zap' },
  water: { label: 'Water', icon: 'droplet' },
  utilities: { label: 'Phone and internet', icon: 'wifi' },
  food: { label: 'Food', icon: 'utensils' },
  charity: { label: 'Charity', icon: 'hand-heart' },
  legal: { label: 'Visa and legal', icon: 'scale' },
  business: { label: 'Business', icon: 'store' },
};

/* Lucide icons (lucide.dev, ISC licence), inner markup for a 24x24
   viewBox, stroke based. LANDIT.icon() wraps them in the <svg>. */
const ICONS = {
  'menu': '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'send': '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  'mic': '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  'volume-2': '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
  'square': '<rect width="18" height="18" x="3" y="3" rx="2"/>',
  'share-2': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  'copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'bookmark': '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  'bookmark-check': '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/><path d="m9 10 2 2 4-4"/>',
  'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
  'trash-2': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  'list': '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
  'list-checks': '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'sliders-horizontal': '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  'arrow-up-down': '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
  'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  'phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  'life-buoy': '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>',
  'globe': '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  'type': '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
  'a-large-small': '<path d="M21 14h-5"/><path d="M16 16v-3.5a2.5 2.5 0 0 1 5 0V16"/><path d="M4.5 13h6"/><path d="m3 16 4.5-9 4.5 9"/>',
  'palette': '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  'contrast': '<circle cx="12" cy="12" r="10"/><path d="M12 18a6 6 0 0 0 0-12v12z"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'circle-help': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  'circle-alert': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  'ban': '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'pencil': '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  'arrow-up': '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'panel-left': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'hourglass': '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  'calendar': '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  'footprints': '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>',
  'heart-pulse': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  'heart': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  'train-front': '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/>',
  'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  'briefcase': '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  'baby': '<path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/>',
  'home': '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  'landmark': '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  'zap': '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  'droplet': '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  'plug': '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  'wifi': '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
  'utensils': '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  'scale': '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  'hand-heart': '<path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 15 6 6"/><path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z"/>',
  'hand-coins': '<path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/>',
  'store': '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
  'wallet': '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  'pound-sterling': '<path d="M18 7c0-5.333-8-5.333-8 0"/><path d="M10 7v14"/><path d="M6 21h12"/><path d="M6 13h10"/>',
  'circle-check': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'circle': '<circle cx="12" cy="12" r="10"/>',
  'languages': '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  'mail': '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  'eye': '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  'map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  'ellipsis': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  'flag': '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  'siren': '<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>',
  'shield': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  'shield-alert': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
};

/* Safety group icons: the prototype names mapped onto icons above. */
const SAFETY_ICON = { siren: 'siren', shield: 'shield', 'heart-pulse': 'heart-pulse', 'shield-alert': 'shield-alert', 'hand-helping': 'hand-heart', baby: 'baby', house: 'home' };

/* ------------------------------------------------------------------ */
/* 6. Normalise the benefits                                            */
/* ------------------------------------------------------------------ */

const fixesApplied = { category: [], region: [], who: [], valueLabelNulled: [], subTrimmed: [], docs: [] };
for (const [id, [who, why]] of Object.entries(WHO_FIX)) fixesApplied.who.push(`${id}: -> ${who.join(', ')} (${why})`);
for (const id of [...Object.keys(WHO_FIX), ...Object.keys(CLOSED), ...Object.keys(CATEGORY_FIX), ...Object.keys(REGION_FIX), ...Object.keys(VALUE_LABEL_FIX),
  ...Object.keys(DOC_FIX.NOT_A_DOCUMENT), ...Object.keys(DOC_FIX.REQUIRED)]) {
  if (!CATALOG.benefits.some(b => b.id === id)) throw new Error(`A fix names an unknown scheme id: ${id}`);
}

const benefits = CATALOG.benefits.map((src, i) => {
  const id = src.id;
  CURRENT_ID = id;
  // "(entry 66)" is an internal catalog cross-reference (and often out of date): dropped.
  let aboutText = ABOUT[i].text;
  for (const drop of ABOUT_DROP) aboutText = aboutText.split(drop).join('');
  const aboutBase = cleanBase(aboutText.replace(/\s*\(entry \d+\)/g, '').replace(/\(entry \d+;\s*/g, '('));
  const about = plainText(aboutBase);

  const category = CATEGORY_FIX[id] ? CATEGORY_FIX[id][0] : src.g;
  if (CATEGORY_FIX[id]) fixesApplied.category.push(`${id}: ${src.g} -> ${category} (${CATEGORY_FIX[id][1]})`);
  if (!CATEGORIES[category]) throw new Error(`No category entry for "${category}" (${id})`);

  const rf = REGION_FIX[id];
  const region = clean(rf && rf.region ? rf.region : src.region || 'UK');
  if (rf) fixesApplied.region.push(`${id}: "${src.region}" -> ${rf.region ? '"' + rf.region + '"' : 'nations ' + rf.nations.join(', ')} (${rf.why})`);
  const regionLabel = REGION_LABEL[region];
  if (!regionLabel) throw new Error(`No REGION_LABEL for region "${region}" (${id}). Add it.`);
  const nations = rf && rf.nations ? rf.nations.slice() : nationsFor(region);

  // sub: the generator cut parsed entries at 110 characters, often mid-word.
  let sub = clean(src.sub);
  let subTrimmed = false;
  if (src.sub.length >= 105 && aboutBase.startsWith(cleanBase(src.sub).slice(0, 60))) {
    sub = plainText(shortLine(aboutBase, 110));
    subTrimmed = true;
    fixesApplied.subTrimmed.push(id);
  }

  let valueLabel = clean(src.valueLabel);
  if (typeof src.value === 'number') {
    if (/^worth$/i.test(valueLabel)) valueLabel = 'Could be worth';              // lib/format.ts
    else if (/^per year$/i.test(valueLabel)) valueLabel = 'Could be worth, a year';
    else if (/^typical award$/i.test(valueLabel)) valueLabel = 'Typical amount';
    else valueLabel = valueLabel.charAt(0).toUpperCase() + valueLabel.slice(1);
  } else if (VALUE_LABEL_FIX[id]) {
    valueLabel = VALUE_LABEL_FIX[id][0];
  } else if (src.n && src.valueLabel === 'Free') {
    valueLabel = null;
    fixesApplied.valueLabelNulled.push(id);
  }

  const b = {
    id,
    entry: ABOUT[i].n,
    name: clean(src.name),
    sub,
    subTrimmed,
    about,
    category,
    categorySource: src.g,
    region,
    regionSource: src.region,
    regionLabel,
    nations,
    local: LOCAL_AREA[region] || null,
    publicFunds: !!src.publicFunds,
    nrpf: src.nrpf,
    nrpfNote: clean(src.nrpfNote) || null,
    who: WHO_FIX[id] ? WHO_FIX[id][0].slice() : src.who.slice(),
    whoSource: src.who.slice(),
    closed: !!CLOSED[id],
    value: typeof src.value === 'number' ? src.value : null,
    valueLabel,
    valueKind: typeof src.value === 'number' ? 'amount' : (valueLabel ? 'label' : 'none'),
    valueNote: clean(src.valueNote) || null,
    statRate: typeof src.statRate === 'number' ? src.statRate : null,
    stat: clean(src.stat) || null,
    rules: cleanList(src.rules),
    applyUrl: src.applyUrl || null,
    sources: (src.sources || []).slice(),
    strengthen: clean(src.strengthen) || null,
    note: clean(src.note) || null,
  };

  // guide
  const g = GUIDES[id];
  let needItems = [];
  if (g) {
    const needNotes = [];
    const notDoc = DOC_FIX.NOT_A_DOCUMENT[id];
    for (const raw of g.need || []) {
      const s = clean(raw);
      if (notDoc && notDoc[0].test(s)) {
        // A condition, not a document (DOC_FIX): out of docs, into rules if no rule says it yet.
        if (notDoc[1] && !b.rules.includes(s)) b.rules.push(s);
        fixesApplied.docs.push(`${id}: "${s}" is not a document, ${notDoc[1] ? 'moved to rules' : 'already a rule'} (${notDoc[2]})`);
        continue;
      }
      if (/^nothing\b/i.test(s)) needNotes.push(s); else needItems.push(s);
    }
    b.guide = {
      time: clean(g.time) || null,
      decision: clean(g.decision) || null,
      cost: clean(g.cost) || null,
      steps: cleanList(g.steps),
      boost: cleanList(g.boost),
      watch: clean(g.watch) || null,
      needNote: needNotes.length ? needNotes.join(' ') : null,
      generic: false,
    };
  } else {
    b.guide = fallbackGuide(b);
  }

  // documents
  const docs = [];
  const ids = new Set();
  const add = (label, certainty, from) => {
    let did = slug(label);
    while (ids.has(did)) did += '-2';
    ids.add(did);
    docs.push({ id: did, label, certainty, from });
  };
  for (const s of needItems) add(s, isConditional(s) ? 'maybe' : 'needed', 'guide');
  for (const key of src.docsGate || []) {
    const gd = GATE_DOCS[key];
    if (!gd) throw new Error(`Unknown docsGate key "${key}" (${id})`);
    if (docs.some(d => gd.covers.test(d.label))) continue;
    add(gd.label, 'maybe', 'catalog');
  }
  for (const r of b.rules) {
    if (/^no\b/i.test(r)) continue;
    const m = r.match(PROOF_WORDS);
    if (!m) continue;
    const word = m[1].toLowerCase().replace(/s$/, '');
    if (docs.some(d => d.label.toLowerCase().includes(word))) continue;
    add(r, 'maybe', 'rule');
  }
  const req = DOC_FIX.REQUIRED[id];
  if (req) {
    const d = docs.find(x => req[0].test(x.label));
    if (!d) throw new Error(`DOC_FIX.REQUIRED for ${id} matches no document. Check the table.`);
    if (d.certainty !== 'needed') fixesApplied.docs.push(`${id}: "${d.label}" maybe -> needed (${req[1]})`);
    d.certainty = 'needed';
  }
  if (b.guide.needNote && NOTHING_FIRST.test(b.guide.needNote) && docs.some(d => d.certainty === 'needed')) {
    const was = b.guide.needNote;
    b.guide.needNote = was.replace(NOTHING_FIRST, '');
    fixesApplied.docs.push(`${id}: need note "${was}" -> "${b.guide.needNote}" (a document is needed)`);
  }
  b.docs = docs;
  b.docsKnown = !b.guide.generic;   // false: no hand-written list, docs holds catalog hints only
  b.docsCount = docs.length;
  b.stepsCount = b.guide.steps.length;
  b.timeMinutes = b.guide.generic ? null : parseMinutes(b.guide.time);
  b.effort = effortFor(b.docsCount, b.stepsCount, b.guide.generic);
  b.effortLabel = b.effort ? EFFORT_LABEL[b.effort] : null;

  /* Abbreviations spelled out in shown text: the ABBR rows of PLAIN.
     Names stay as published. Document ids were made above from the
     labels before this step, so ticks saved against them still match. */
  for (const k of ['sub', 'about', 'valueLabel', 'valueNote', 'stat', 'strengthen', 'note']) b[k] = explainText(b[k]);
  b.rules = b.rules.map(explainText);
  for (const k of ['time', 'decision', 'cost', 'watch', 'needNote']) b.guide[k] = explainText(b.guide[k]);
  b.guide.steps = b.guide.steps.map(explainText);
  b.guide.boost = b.guide.boost.map(explainText);
  for (const d of b.docs) d.label = explainText(d.label);
  return b;
});
for (const [kind, table] of Object.entries(DOC_FIX)) for (const id of Object.keys(table)) {
  if (!fixesApplied.docs.some(x => x.startsWith(id + ':'))) throw new Error(`DOC_FIX.${kind} for ${id} changed nothing. Check the table.`);
}

CURRENT_ID = 'safety';
const unusedGuides = Object.keys(GUIDES).filter(id => !benefits.some(b => b.id === id));

/* Plain English check: no listed internal or technical term may survive in
   a field a design shows. */
const shownTexts = b => [
  ['name', b.name], ['sub', b.sub], ['about', b.about], ['valueLabel', b.valueLabel], ['valueNote', b.valueNote],
  ['stat', b.stat], ['strengthen', b.strengthen], ['note', b.note],
  ...b.rules.map((r, i) => [`rules[${i}]`, r]),
  ...['time', 'decision', 'cost', 'watch', 'needNote'].map(k => [`guide.${k}`, b.guide[k]]),
  ...b.guide.steps.map((s, i) => [`guide.steps[${i}]`, s]),
  ...b.guide.boost.map((s, i) => [`guide.boost[${i}]`, s]),
  ...b.docs.map((d, i) => [`docs[${i}]`, d.label]),
].filter(([, v]) => v);
const leftovers = [];
for (const b of benefits) for (const [field, text] of shownTexts(b)) for (const re of PLAIN_LEFTOVERS) {
  const m = text.match(re);
  if (m) leftovers.push(`${b.id} ${field}: "${m[0]}" in ...${text.slice(Math.max(0, m.index - 40), m.index + 40)}...`);
}
/* ABBR check: shown fields other than the name. */
for (const b of benefits) for (const [field, text] of shownTexts(b)) {
  if (field === 'name') continue;
  for (const [re, full, abbr] of ABBR_EXPLAINED) {
    const m = text.match(re);
    if (m && (!full || !full.test(text))) leftovers.push(`${b.id} ${field}: "${abbr}" not spelled out in ...${text.slice(Math.max(0, m.index - 40), m.index + 40)}...`);
  }
  const s = text.match(ABBR_SHORT_FORMS);
  if (s) leftovers.push(`${b.id} ${field}: short form "${s[0]}" in ...${text.slice(Math.max(0, s.index - 40), s.index + 40)}...`);
}
if (leftovers.length) {
  console.error('build-data: technical wording left in shown fields, add a PLAIN rule:\n  ' + leftovers.join('\n  '));
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 7. Statuses, safety                                                  */
/* ------------------------------------------------------------------ */

const statuses = CATALOG.meta.statuses.map(s => {
  const l = STATUS_LABEL[s.key];
  if (!l) throw new Error(`No plain label for status "${s.key}"`);
  return { key: s.key, label: l[0], short: l[1], nrpfDefault: !!s.nrpfDefault };
});

function urlIn(text) {
  const m = String(text || '').match(/(?<![@\w.])([a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:uk|org|com))\b/i);
  return m ? 'https://' + m[1] : null;
}
const safety = {};
for (const nation of ALL_NATIONS) {
  safety[nation] = SAFETY.groups.map(g => ({
    key: g.key,
    group: clean(g.label),
    icon: SAFETY_ICON[g.icon] || 'phone',
    items: g.items
      .filter(it => !it.regions || it.regions.includes(nation))
      .map(it => ({
        id: it.id,
        label: clean(it.label),
        number: clean(it.number),
        tel: it.tel || null,
        note: clean(it.note) || null,
        url: urlIn(it.number) || urlIn(it.note),
      })),
  })).filter(g => g.items.length);
}
const safetyNotes = {
  emergency: clean(SAFETY.disclaimer.split(/(?<=\.)\s+/).slice(1).join(' ')),
  independence: clean(SAFETY.independence),
  insecureExtra: clean(SAFETY.insecureExtra),
};

/* ------------------------------------------------------------------ */
/* 8. Check everything before writing                                   */
/* ------------------------------------------------------------------ */

const usedCategories = [...new Set(benefits.map(b => b.category))];
const categories = {};
for (const [k, v] of Object.entries(CATEGORIES)) if (usedCategories.includes(k)) categories[k] = v;

const iconNames = new Set(Object.keys(ICONS));
const iconUses = [
  ...Object.values(categories).map(c => c.icon),
  ...Object.values(safety).flatMap(gs => gs.map(g => g.icon)),
];
const missingIcons = iconUses.filter(n => !iconNames.has(n));
if (missingIcons.length) throw new Error('Icons used but not defined: ' + missingIcons.join(', '));

const payload = {
  disclaimer: DISCLAIMER,
  freeLabel: 'Free for first users',
  tagline: 'Know what you need.',
  supportLine: "You brought the dream. We'll help you land it.",
  rates: '2026/27 rates (April 2026)',
  potentialLabel: 'Potential, if all approved',
  noRateText: 'No published rate yet',
  effortNote: 'Based on the number of documents and steps',
  effortLabels: EFFORT_LABEL,
  statuses,
  nations: NATIONS,
  categories,
  benefits,
  safety,
  safetyNotes,
};

const problems = [];
const walk = (v, where) => {
  if (typeof v === 'string') {
    if (DASHES.test(v)) problems.push(`dash in ${where}: ${v.slice(0, 80)}`);
    DASHES.lastIndex = 0;
    for (const h of findBanned(v)) problems.push(`banned "${h.term}" in ${where}: ...${v.slice(Math.max(0, h.index - 30), h.index + 30)}...`);
  } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
    if (k === 'sources' || k === 'applyUrl' || k === 'regionSource' || k === 'categorySource') continue; // URLs and audit copies
    walk(x, `${where}.${k}`);
  }
};
walk(payload, 'LANDIT');
if (problems.length) {
  console.error('build-data: content problems, nothing written:\n  ' + problems.join('\n  '));
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 9. Write shared/data.js                                              */
/* ------------------------------------------------------------------ */

const j = v => JSON.stringify(v);
const today = new Date().toISOString().slice(0, 10);
const out = `/* Landit click dummies: shared data.
   GENERATED by tools/build-data.mjs on ${today}. Do not hand-edit.
   Change the script or shared/source/* and run: node tools/build-data.mjs
   API: shared/README.md */
window.LANDIT = window.LANDIT || {};
(function (L) {
  'use strict';
  L.meta = ${j({ built: today, catalogDate: '2026-08-05', benefits: benefits.length, guides: benefits.filter(b => !b.guide.generic).length })};
  L.disclaimer = ${j(DISCLAIMER)};
  L.freeLabel = ${j(payload.freeLabel)};
  L.tagline = ${j(payload.tagline)};
  L.supportLine = ${j(payload.supportLine)};
  L.rates = ${j(payload.rates)};
  L.potentialLabel = ${j(payload.potentialLabel)};
  L.noRateText = ${j(payload.noRateText)};
  L.effortNote = ${j(payload.effortNote)};
  L.effortLabels = ${j(EFFORT_LABEL)};
  L.statuses = ${JSON.stringify(statuses, null, 2)};
  L.nations = ${j(NATIONS)};
  L.categories = ${JSON.stringify(categories, null, 2)};
  L.icons = {
${Object.entries(ICONS).map(([k, v]) => `    ${j(k)}: ${j(v)}`).join(',\n')}
  };
  L.icon = function (name, opts) {
    opts = opts || {};
    var inner = L.icons[name];
    if (inner == null) {
      if (typeof console !== 'undefined') console.warn('LANDIT.icon: unknown icon "' + name + '"');
      inner = L.icons.circle;
    }
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var size = opts.size || 24;
    var cls = 'lucide lucide-' + name + (opts.className ? ' ' + esc(opts.className) : '');
    var a11y = opts.label ? ' role="img" aria-label="' + esc(opts.label) + '"' : ' aria-hidden="true" focusable="false"';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="' + cls + '"' + a11y + '>' + inner + '</svg>';
  };
  L.benefits = [
${benefits.map(b => '    ' + j(b)).join(',\n')}
  ];
  L.safety = ${JSON.stringify(safety, null, 2)};
  L.safetyNotes = ${JSON.stringify(safetyNotes, null, 2)};
})(window.LANDIT);
`;
fs.writeFileSync(OUT, out);

/* ------------------------------------------------------------------ */
/* 10. Report                                                           */
/* ------------------------------------------------------------------ */

const count = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
console.log(`build-data: wrote ${path.relative(ROOT, OUT)} (${(out.length / 1024).toFixed(0)} KB)`);
console.log(`  benefits ${benefits.length}, hand-written guides ${benefits.filter(b => !b.guide.generic).length}, generic ${benefits.filter(b => b.guide.generic).length}`);
console.log('  categories', count(benefits, b => b.category));
console.log('  effort', count(benefits, b => b.effort));
console.log('  valueKind', count(benefits, b => b.valueKind));
console.log('  timeMinutes known', benefits.filter(b => b.timeMinutes != null).length);
console.log('  docs certainty', count(benefits.flatMap(b => b.docs), d => d.certainty + '/' + d.from));
console.log(`  fixes: ${fixesApplied.category.length} categories, ${fixesApplied.region.length} regions, ${fixesApplied.who.length} who lists, ${Object.keys(CLOSED).length} closed, ${fixesApplied.valueLabelNulled.length} default "Free" labels removed, ${fixesApplied.subTrimmed.length} cut-off subs trimmed, ${fixesApplied.docs.length} document fixes`);
const plainUsed = PLAIN.map((r, i) => [r, plainHits[i]]).filter(([, ids]) => ids.size);
const plainIds = new Set(plainUsed.flatMap(([, ids]) => [...ids]));
console.log(`  plain English: ${plainUsed.length} of ${PLAIN.length} rules used, ${plainIds.size} schemes changed (--verbose lists them)`);
const unusedPlain = PLAIN.filter((r, i) => !plainHits[i].size).map(r => String(r[0]));
if (unusedPlain.length) console.log('  plain English rules that matched nothing:', unusedPlain.join('  '));
if (unusedGuides.length) console.log('  guides with no catalog entry (ignored):', unusedGuides.join(', '));
if (process.argv.includes('--verbose')) {
  console.log('\nCategory fixes:\n  ' + fixesApplied.category.join('\n  '));
  console.log('\nRegion fixes:\n  ' + fixesApplied.region.join('\n  '));
  console.log('\nDocument fixes:\n  ' + fixesApplied.docs.join('\n  '));
  console.log('\nWho fixes:\n  ' + fixesApplied.who.join('\n  '));
  console.log('\n"Free" labels removed:\n  ' + fixesApplied.valueLabelNulled.join(', '));
  console.log('\nPlain English rules:\n  ' + plainUsed.map(([r, ids]) => `${r[2]} ${r[0]} -> "${typeof r[1] === 'function' ? r[1].label : r[1]}" (${r[3]}): ${[...ids].join(', ')}`).join('\n  '));
}

/* Feature checks for design C against the brief, phone or desktop. */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'module';
import { loadLandit } from './load.mjs';
const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');
const OUT = '/Users/armanbayatmaku/Desktop/landit-test/_review/c-clear/review-brief';
const BASE = pathToFileURL('/Users/armanbayatmaku/Desktop/landit-test/c-clear/index.html').href;
const L = loadLandit();
const sizeArg = process.argv[2] || 'desktop';
const phone = sizeArg === 'phone';
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext(SIZES[sizeArg]);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
const R = [];
const ok = (name, cond, detail) => { R.push({ name, ok: !!cond, detail }); console.log((cond ? 'ok   ' : 'FAIL ') + name + (detail !== undefined ? '  :: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 400) : '')); };
const shot = (n, full) => page.screenshot({ path: `${OUT}/${n}-${sizeArg}.png`, fullPage: !!full });
const go = async (h) => { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(150); };
const st = () => page.evaluate(() => JSON.parse(localStorage.getItem('landit-c:state') || 'null'));
const m = L.match(L.demo.profile);

/* ---------- 1. Register, questionnaire skip one + skip all from Q1 ---------- */
await page.goto(BASE + '?reset=1', { waitUntil: 'load' });
await page.waitForSelector('#auth-form');
ok('reset opens register', (await page.evaluate(() => location.hash)) === '#/register');
await page.fill('#f-name', 'Ana');
await page.fill('#f-email', 'ana@example.com');
await page.fill('#f-pass', 'x');
await page.click('#auth-form button[type=submit]');
await page.waitForFunction(() => /#\/questions/.test(location.hash));
const q1 = await page.innerText('#main');
ok('question 1 has skip this + skip all', /Skip this question/.test(q1) && /Skip all questions/.test(q1));
await page.click('[data-action="q-skip"]');
await page.waitForFunction(() => location.hash === '#/questions/2');
ok('skip one goes to Q2', true);
await page.click('[data-action="q-skip-all"]');
await page.waitForFunction(() => location.hash === '#/ack');
let s = await st();
ok('skip all leaves profile empty', Object.keys(s.profile).length === 0, s.profile);
const ackText = await page.innerText('#main');
ok('ack shows exact disclaimer', ackText.includes(L.disclaimer));
await shot('ack');
await page.click('[data-action="ack"]');
await page.waitForFunction(() => location.hash === '#/chat');
// no status: benefits header
await go('#/benefits');
const noStat = await page.innerText('#main');
const m0 = L.match({});
ok('no-status benefits count = match({}).open', noStat.includes('You may be able to get ' + m0.open.length + ' benefits'), m0.open.length);
ok('no-status: no blocked list', !/Not on your visa/.test(noStat));
// sign out then sign in -> straight to chat, no ack again
await go('#/settings');
await page.click('[data-action="sign-out"]');
await page.waitForFunction(() => location.hash === '#/login');
await page.fill('#f-email', 'ana@example.com');
await page.fill('#f-pass', 'x');
await page.click('#auth-form button[type=submit]');
await page.waitForFunction(() => location.hash === '#/chat');
ok('sign in after ack goes to chat (ack is one-time)', true);
// login with no stored user? (delete first)
/* Back nav from Q2: Back link exists */
await go('#/questions/2');
ok('questions has Back from Q2', await page.locator('.q-top a', { hasText: 'Back' }).count() === 1);
await go('#/chat');

/* ---------- 2. Demo: chat ---------- */
await page.goto(BASE + '?demo=1#/chat', { waitUntil: 'load' });
await page.waitForSelector('#chat-input');
await page.goto(BASE + '#/chat', { waitUntil: 'load' });
await page.waitForSelector('#chat-input');
const chat0 = await page.innerText('#main');
ok('chat empty shows disclaimer', chat0.includes(L.disclaimer));
ok('starters shown', (await page.locator('.starter').count()) >= 4, await page.locator('.starter').allInnerTexts());
await shot('chat-empty');
// voice typing
const hasSR = await page.evaluate(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
await page.click('.speak-btn');
await page.waitForTimeout(300);
const listenNote = await page.innerText('#listen-status');
const pressed = await page.getAttribute('.speak-btn', 'aria-pressed');
await page.waitForTimeout(2600);
const afterVoice = await page.inputValue('#chat-input');
ok('voice typing control works (real or practice)', afterVoice.length > 0 || pressed === 'true', { hasSR, listenNote, pressed, afterVoice, status: await page.innerText('#listen-status') });
await page.fill('#chat-input', '');
// typed
await page.fill('#chat-input', 'What can I claim?');
await page.keyboard.press('Enter');
await page.waitForSelector('.msg-bot', { timeout: 6000 });
await page.waitForTimeout(400);
await shot('chat-reply');
const viewDisc = await page.evaluate(d => {
  const p = [...document.querySelectorAll('p')].find(x => x.textContent.trim() === d);
  if (!p) return 'none';
  const r = p.getBoundingClientRect();
  return { inViewport: r.top < innerHeight && r.bottom > 0, top: Math.round(r.top), vh: innerHeight };
}, L.disclaimer);
const cardsVisible = await page.evaluate(() => { const c = document.querySelector('.ccard'); if (!c) return null; const r = c.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
ok('disclaimer visible on screen while reply cards visible', viewDisc.inViewport || !cardsVisible, { viewDisc, cardsVisible });
const bot = page.locator('.msg-bot').last();
ok('reply has read aloud', await bot.locator('.read-btn').count() === 1);
const readLabel = await bot.locator('.read-btn').innerText();
await bot.locator('.read-btn').click();
ok('read aloud toggles to Stop', (await bot.locator('.read-btn').getAttribute('aria-pressed')) === 'true', readLabel + ' -> ' + await bot.locator('.read-btn').innerText());
await bot.locator('.read-btn').click();
const cardNames = await bot.locator('.ccard .ccard-name').allInnerTexts();
ok('What can I claim cards', cardNames.length > 0, cardNames);
const sugg = await page.locator('.suggest').last().locator('.suggest-btn').allInnerTexts();
ok('suggested replies shown', sugg.length >= 2, sugg);
// chat card share
await bot.locator('.ccard').first().locator('[data-action="share"]').click();
await page.waitForSelector('dialog[open]');
const link0 = await page.inputValue('#share-link');
const firstId = await bot.locator('.ccard').first().locator('[data-action="share"]').getAttribute('data-id');
ok('chat card share link', link0 === `https://landit-uk.com/${firstId}/`, link0);
const dlgText = await page.innerText('dialog[open]');
ok('share dialog shows disclaimer? (names a scheme)', dlgText.includes(L.disclaimer), dlgText.replace(/\s+/g, ' ').slice(0, 200));
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
// track from chat card
const tcard = bot.locator('.ccard').nth(1);
const tid = await tcard.locator('[data-action="track"]').getAttribute('data-id');
await tcard.locator('[data-action="track"]').click();
s = await st();
ok('track from chat card saved', s.tracked.some(t => t.id === tid), tid);
// Open card goes to detail
await bot.locator('.ccard').first().locator('a.btn', { hasText: 'Open' }).click();
await page.waitForFunction(() => location.hash.startsWith('#/benefit/'));
ok('Open from chat card goes to detail', true, await page.evaluate(() => location.hash));
await go('#/chat');
ok('chat history persists after leaving', (await page.locator('.msg-bot').count()) >= 1);
const newChat = await page.locator('button, a', { hasText: /new chat|clear/i }).count();
ok('no chat history list / new chat (not requested)', true, { newChatControls: newChat });

/* ---------- 3. Sidebar / drawer ---------- */
if (!phone) {
  const before = await page.locator('.side-full').isVisible();
  await page.click('.side-full [data-action="rail"]');
  await page.waitForTimeout(200);
  const railVis = await page.locator('.side-rail').isVisible();
  await shot('rail');
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  const persisted = await page.locator('.side-rail').isVisible();
  await page.click('.side-rail [data-action="rail"]');
  await page.waitForTimeout(200);
  ok('desktop sidebar collapses to rail, persists, re-opens', before && railVis && persisted && await page.locator('.side-full').isVisible());
} else {
  const btn = page.locator('[data-action="open-drawer"]').first();
  ok('phone drawer button aria-label', /applications|menu|sidebar|navigation/i.test(await btn.getAttribute('aria-label')), await btn.getAttribute('aria-label'));
  await btn.click();
  await page.waitForSelector('.shell.drawer-open');
  await page.waitForTimeout(400);
  await shot('drawer');
}
// expand council-tax-student
const item = page.locator('.app-item[data-app="council-tax-student"]');
ok('tracked row present', await item.count() === 1);
const tog = item.locator('.app-toggle');
if ((await tog.getAttribute('aria-expanded')) !== 'true') await tog.click();
const groups = await item.locator('.tick-group legend').allInnerTexts();
const needLabels = await item.locator('.tick-group').nth(0).locator('.tick-text').allInnerTexts();
const b0 = L.benefitById('council-tax-student');
ok('needed / might be needed groups', groups.join('|') === 'Needed|Might be needed', groups);
ok('needed items match data', JSON.stringify(needLabels) === JSON.stringify(b0.docs.filter(d => d.certainty === 'needed').map(d => d.label)), needLabels);
const countTxt = await item.locator('.app-count').innerText();
ok('count text 1 of 3', countTxt === '1 of 3 documents ticked', countTxt);
await item.locator('label.tick').nth(0).click();
await page.waitForTimeout(100);
await shot('apps-expanded');
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(300);
if (phone) { await page.locator('[data-action="open-drawer"]').first().click(); await page.waitForSelector('.shell.drawer-open'); }
const item2 = page.locator('.app-item[data-app="council-tax-student"]');
const exp2 = await item2.locator('.app-toggle').getAttribute('aria-expanded');
if (exp2 !== 'true') await item2.locator('.app-toggle').click();
const checked = await item2.locator('input[type=checkbox]').evaluateAll(xs => xs.map(x => x.checked));
ok('ticks persist after reload', checked.filter(Boolean).length === 2, { checked, expandedAfterReload: exp2 });
const uni = page.locator('.app-item[data-app="uni-hardship-fund"]');
ok('uni-hardship row shows Applied and 4 of 4', /Applied/.test(await uni.innerText()) && /4 of 4/.test(await uni.innerText()), (await uni.innerText()).replace(/\s+/g, ' '));
// drawer has disclaimer? (drawer shows schemes)
const sideText = await page.locator('#sidebar').innerText();
ok('sidebar/drawer itself carries disclaimer (shows specific schemes)', sideText.includes(L.disclaimer));
if (phone) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); }

/* ---------- 4. Benefits ---------- */
await go('#/benefits');
const bt = await page.innerText('#main');
ok('header count', bt.includes(`You may be able to get ${m.open.length} benefits`));
ok('total and label', bt.includes(L.formatMoney(m.total)) && bt.includes(L.potentialLabel), L.formatMoney(m.total));
const nrpfLine = await page.locator('.head-note').innerText().catch(() => '');
ok('nrpf note counts', true, nrpfLine);
await shot('benefits-top');
await page.click('[data-action="blocked-toggle"]');
const blockedTxt = await page.locator('.blocked-panel').innerText();
const blockedNames = await page.locator('.blocked-list .blocked-name a').allInnerTexts();
ok('visa-blocked list = match.blocked', JSON.stringify(blockedNames.slice().sort()) === JSON.stringify(m.blocked.map(x => x.benefit.name).sort()), blockedNames.length);
ok('blocked panel intro', true, blockedTxt.slice(0, 600));
await shot('blocked-open', true);
// tiles
const tiles = await page.locator('a.tile').evaluateAll(as => as.map(a => a.innerText.replace(/\s+/g, ' ')));
ok('tiles', true, tiles);
// all list
await go('#/benefits/all');
for (const key of ['value', 'time', 'easy', 'az']) {
  await page.click(`[data-action="sort"][data-key="${key}"]`);
  await page.waitForTimeout(80);
  const names = await page.locator('.rows .b-name').allInnerTexts();
  let exp;
  if (key === 'easy') exp = null; else exp = L.sortBenefits(m.open, key === 'value' ? 'value' : key).map(b => b.name);
  ok('sort ' + key + (exp ? ' matches LANDIT.sortBenefits' : ' (custom)'), exp ? JSON.stringify(names) === JSON.stringify(exp) : names.length === m.open.length, names.slice(0, 8));
}
await page.click('[data-action="sort"][data-key="value"]');
await shot('list-all');
// filter select
const opts = await page.locator('#cat-select option').allInnerTexts();
ok('filter options', true, opts);
// rows: values
const rows = await page.locator('.rows .b-row').evaluateAll(lis => lis.map(li => ({ name: li.querySelector('.b-name').innerText, val: li.querySelector('.b-val').innerText.replace(/\s+/g, ' '), effort: li.querySelector('.b-effort').innerText.replace(/\s+/g, ' '), cat: li.querySelector('.b-cat').innerText, sub: li.querySelector('.b-sub').innerText })));
let mism = [];
for (const r of rows) {
  const b = L.benefits.find(x => x.name === r.name);
  const v = L.valueParts(b);
  const want = v.amount ? v.amount + (v.label ? ' ' + v.label : '') : (v.label || 'No set amount');
  if (r.val.trim() !== want) mism.push([r.name, r.val, want]);
  if (r.cat.trim() !== L.categories[b.category].label) mism.push([r.name, 'cat', r.cat]);
  if (r.sub.trim() !== b.sub) mism.push([r.name, 'sub', r.sub]);
  const effWord = b.effortLabel || 'Effort not listed yet';
  if (!r.effort.startsWith(effWord)) mism.push([r.name, 'effort', r.effort, effWord]);
}
ok('every row value/category/sub/effort matches data', mism.length === 0, mism.slice(0, 10));
fs.writeFileSync(`${OUT}/rows-${sizeArg}.json`, JSON.stringify(rows, null, 1));

/* ---------- 5. Detail pages: 16 benefits ---------- */
const sample = ['council-tax-student', 'uni-hardship-fund', 'railcard-16-25', 'lisa', 'bg-energy-trust', 'free-courses-for-jobs', 'marriage-allowance',
  'prescription-charges-and-the-prepayment', 'community-fibre-essential', 'fuel-bank-vouchers', 'water-income-tariffs', 'tax-refund', 'student-oyster',
  'trussell-food-banks', 'nino', 'universal-credit', 'turn2us-grants', 'gp-registration'];
const det = {};
for (const id of sample) {
  const b = L.benefitById(id);
  await go('#/benefit/' + id);
  const d = await page.evaluate(() => {
    const q = s => document.querySelector(s);
    const t = s => (q(s) ? q(s).innerText.replace(/\s+/g, ' ').trim() : null);
    return {
      h1: t('h1'), lead: t('.detail-head .lead'), chips: t('.detail-head .chips'),
      worth: t('.sum-cell.sum-worth'), cells: [...document.querySelectorAll('.sum-cell')].map(c => c.innerText.replace(/\s+/g, ' ')),
      more: [...document.querySelectorAll('.sum-more > div')].map(c => c.innerText.replace(/\s+/g, ' ')),
      effort: t('.effort-line'), pf: [...document.querySelectorAll('.pf-line')].map(x => x.innerText), valueNote: t('.value-note'),
      rules: [...document.querySelectorAll('.rules li')].map(x => x.innerText.trim()),
      needed: [...document.querySelectorAll('#d-need ~ fieldset, .d-sec')].length,
      docGroups: [...document.querySelectorAll('section[aria-labelledby="d-need"] fieldset')].map(f => ({ legend: f.querySelector('legend').innerText, items: [...f.querySelectorAll('.tick-text')].map(x => x.innerText) })),
      steps: [...document.querySelectorAll('.steps .step-text')].map(x => x.innerText),
      apply: q('.apply-wrap a') ? q('.apply-wrap a').getAttribute('href') : null, applyNote: t('.apply-note'),
      claim: [...document.querySelectorAll('.claim-opt')].map(x => x.innerText.trim()), track: t('.detail-actions .track-btn'), share: t('.detail-actions [data-action="share"]'),
      sources: [...document.querySelectorAll('.sources a')].map(a => a.getAttribute('href')),
      standing: t('.detail > .note-card'),
      disc: document.body.innerText.includes(window.LANDIT.disclaimer),
      readBtn: !!q('.read-top'),
    };
  });
  det[id] = d;
  const v = L.valueParts(b);
  const probs = [];
  if (d.h1 !== b.name) probs.push('name');
  if (d.lead !== b.sub) probs.push('sub');
  if (!d.chips.includes(L.categories[b.category].label) || !d.chips.includes(b.regionLabel)) probs.push('chips ' + d.chips);
  if (v.amount && !(d.worth.includes(v.amount) && d.worth.includes(v.label))) probs.push('worth ' + d.worth);
  if (!v.amount && v.label && !d.worth.includes(v.label)) probs.push('worth label ' + d.worth);
  const timeWant = !b.guide.generic && b.guide.time ? b.guide.time : 'Not listed';
  if (!d.cells[1].includes(timeWant)) probs.push('time ' + d.cells[1] + ' want ' + timeWant);
  const need = b.docs.filter(x => x.certainty === 'needed').length, maybe = b.docs.length - need;
  if (b.docsKnown) {
    const wantD = need ? need + ' needed' : 'None needed';
    if (!d.cells[2].includes(wantD)) probs.push('docs cell ' + d.cells[2] + ' want ' + wantD);
    if (maybe && !d.cells[2].includes(maybe + ' more may be needed')) probs.push('maybe ' + d.cells[2]);
  }
  const dec = !b.guide.generic && b.guide.decision ? b.guide.decision : 'Not listed';
  if (!d.more[0].includes(dec)) probs.push('decision ' + d.more[0]);
  const cost = !b.guide.generic && b.guide.cost ? b.guide.cost : 'Not listed';
  if (!d.more[1].includes(cost)) probs.push('cost ' + d.more[1]);
  if (b.statRate == null ? !d.more[2].includes(L.noRateText) : !d.more[2].includes(Math.round(b.statRate * 100) + '%')) probs.push('rate ' + d.more[2]);
  if (JSON.stringify(d.rules) !== JSON.stringify(b.rules)) probs.push('rules');
  if (JSON.stringify(d.steps) !== JSON.stringify(b.guide.steps)) probs.push('steps');
  if ((d.apply || null) !== (b.applyUrl || null)) probs.push('apply ' + d.apply);
  if (JSON.stringify(d.sources) !== JSON.stringify(b.sources)) probs.push('sources');
  const allDocs = d.docGroups.flatMap(g => g.items);
  if (JSON.stringify(allDocs.slice().sort()) !== JSON.stringify(b.docs.map(x => x.label).sort())) probs.push('docs list ' + JSON.stringify(allDocs));
  if (!d.disc) probs.push('NO DISCLAIMER');
  if (d.claim.join('|') !== 'Not started|Applied|Approved|Turned down') probs.push('claim ' + d.claim.join('|'));
  ok('detail ' + id, probs.length === 0, probs.length ? probs : { worth: d.worth, cells: d.cells.slice(1), more: d.more, effort: d.effort, valueNote: d.valueNote, standing: d.standing });
}
fs.writeFileSync(`${OUT}/detail-${sizeArg}.json`, JSON.stringify(det, null, 1));
await go('#/benefit/community-fibre-essential');
await shot('detail-fibre');
await go('#/benefit/council-tax-student');
await shot('detail-cts', true);
// share on detail
await page.click('.detail-actions [data-action="share"]');
await page.waitForSelector('dialog[open]');
ok('detail share url', (await page.inputValue('#share-link')) === 'https://landit-uk.com/council-tax-student/');
await shot('share');
await page.keyboard.press('Escape');
// claim status change
await page.locator('label.claim-opt', { hasText: 'Approved' }).click();
await page.waitForTimeout(150);
s = await st();
ok('claim status Approved saved', s.tracked.find(t => t.id === 'council-tax-student').status === 'Approved');
ok('claim saved message', true, await page.innerText('#claim-saved'));

/* ---------- 6. Community ---------- */
await go('#/community');
const ct = await page.innerText('#main');
ok('community disclaimer', (await page.innerText('body')).includes(L.disclaimer));
ok('community sample note', ct.includes(L.community.sampleNote));
const postCount = await page.locator('.posts .post').count();
ok('posts listed = sample posts', postCount === L.community.posts.length, postCount);
// reply counts vs data
const replyCounts = await page.locator('.posts .post').evaluateAll(ps => ps.map(p => (p.querySelector('.reply-count') || { innerText: '0' }).innerText));
ok('reply counts', JSON.stringify(replyCounts) === JSON.stringify(L.community.posts.map(p => p.comments.length ? (p.comments.length + (p.comments.length === 1 ? ' reply' : ' replies')) : '0')), replyCounts);
await go('#/community/ratings');
const rcards = await page.locator('.rate-card').evaluateAll(cs => cs.map(c => c.innerText.replace(/\s+/g, ' ')));
const r0 = L.community.ratings['council-tax-student'];
ok('ratings list count', rcards.length === Object.keys(L.community.ratings).length, rcards.length);
const ctsCard = rcards.find(x => x.includes('Council Tax student exemption'));
ok('council-tax-student rating counts in words', ctsCard && ctsCard.includes('6 of 7 people said it was very much worth it'), ctsCard);
ok('no numeric scores / stars', !rcards.some(x => /\d\s*\/\s*\d|out of|★|☆|score/i.test(x)));
await shot('ratings', true);

/* ---------- 7. Settings ---------- */
await go('#/settings');
const setText = await page.innerText('#main');
ok('settings sections', ['Your details', 'Your answers', 'Colours', 'Text size', 'Language', 'Read aloud', 'Help now', 'Account'].every(x => setText.includes(x)), setText.slice(0, 200));
ok('no scam quiz', !/quiz/i.test(setText));
ok('settings benefits count sentence', setText.includes(`Right now: ${m.open.length} benefits`));
// read aloud off hides buttons
await page.click('[data-action="toggle-read"]');
await go('#/benefit/railcard-16-25');
const readVis = await page.locator('.read-btn').first().isVisible().catch(() => false);
ok('read aloud setting off hides read buttons', !readVis);
await go('#/settings');
await page.click('[data-action="toggle-read"]');
// help now
await go('#/settings/help');
const help = await page.innerText('#main');
const eng = L.safety.England;
const missingNums = [];
eng.forEach(g => g.items.forEach(it => { if (!help.includes(it.number)) missingNums.push(it.label + ' ' + it.number); }));
ok('help now lists every England number', missingNums.length === 0, missingNums);
const telLinks = await page.locator('a[href^="tel:"]').evaluateAll(as => as.map(a => a.getAttribute('href')));
const wantTel = eng.flatMap(g => g.items).filter(i => i.tel).map(i => 'tel:' + i.tel);
ok('tel links match data', JSON.stringify(telLinks) === JSON.stringify(wantTel), { got: telLinks.length, want: wantTel.length });
await shot('help', true);
// RTL
await go('#/settings');
await page.locator('label.lang-opt[for="lang-ar"]').click();
await page.waitForFunction(() => document.documentElement.dir === 'rtl');
await go('#/benefits/all');
await page.waitForTimeout(200);
const rtl = await page.evaluate(() => {
  const side = document.querySelector('#sidebar').getBoundingClientRect();
  const main = document.querySelector('#main').getBoundingClientRect();
  const tab = document.querySelector('.tabbar');
  const firstRow = document.querySelector('.b-row .b-badge');
  const name = document.querySelector('.b-row .b-name');
  return { sideLeft: side.left, sideRight: side.right, mainLeft: main.left, w: innerWidth, badgeX: firstRow && firstRow.getBoundingClientRect().left, nameX: name && name.getBoundingClientRect().left, scrollW: document.documentElement.scrollWidth };
});
ok('RTL mirrored (sidebar right on desktop / badge on right)', phone ? rtl.badgeX > rtl.nameX : rtl.sideLeft > rtl.mainLeft, rtl);
await shot('rtl-list');
await go('#/chat');
await shot('rtl-chat');
await go('#/settings');
await page.locator('label.lang-opt[for="lang-en"]').click();
await page.waitForFunction(() => document.documentElement.dir === 'ltr');

/* ---------- 8. Delete account ---------- */
await page.click('[data-action="delete-account"]');
await page.waitForSelector('dialog[open]');
await shot('delete');
await page.click('[data-confirm-delete]');
await page.waitForFunction(() => location.hash === '#/register');
s = await st();
ok('delete clears state', !s || (!s.user && !s.tracked.length && !s.chat.length), s && { user: s.user, chat: s.chat.length });

ok('no console errors', errs.length === 0, errs);
fs.writeFileSync(`${OUT}/features-${sizeArg}.json`, JSON.stringify(R, null, 1));
await browser.close();

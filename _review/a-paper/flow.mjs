#!/usr/bin/env node
/* Landit design A ("Paper"): end-to-end click-through.
   Same Playwright setup as tools/shoot.mjs (installed Chrome, the
   Playwright copy in the Landit repo). Runs at phone and desktop size and
   fails on any console error, page error or failed assertion.

   Covers the brief end to end, plus the review fixes: accurate public
   funds wording, no apply nudge on blocked schemes, the certainty tag,
   ranked lists with "Show more", the disclaimer in the drawer and the
   Share and Rate dialogs, sign in that never deletes, confirm before a
   new account replaces the saved one, confirm before untracking progress,
   the plain card facts, the phone top bar and the account link.

   Usage: node _review/a-paper/flow.mjs [phone|desktop] */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';

const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = pathToFileURL(path.resolve(HERE, '../../a-paper/index.html')).href;
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const only = process.argv[2];
const runs = only ? [only] : ['phone', 'desktop'];
const IGNORE = /fonts\.googleapis\.com|fonts\.gstatic\.com/;

function assert(cond, msg) { if (!cond) throw new Error('Assertion failed: ' + msg); }
/* Waits up to 4 seconds for the element to be visible. */
async function shown(locator) {
  try { await locator.waitFor({ state: 'visible', timeout: 4000 }); return true; } catch (e) { return false; }
}

async function run(size) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext(SIZES[size]);
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => { if (!IGNORE.test(r.url())) errors.push('request: ' + r.url()); });
  const phone = size === 'phone';
  const log = [];
  const step = s => { log.push(s); };
  const hash = () => page.evaluate(() => location.hash);
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('landit-a:state')));
  const waitHash = async (re) => {
    await page.waitForFunction(r => new RegExp(r).test(location.hash), re.source, { timeout: 5000 });
    await page.waitForTimeout(120);
  };
  const go = async (h) => { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(200); };
  const dialogGone = () => page.waitForFunction(() => !document.querySelector('dialog[open]'));

  async function openDrawer() {
    if (!phone) return;
    const btn = page.getByRole('button', { name: /menu and tracked applications/i });
    await btn.click();
    await page.waitForSelector('.app.drawer-open');
    assert(await btn.getAttribute('aria-expanded') === 'true', 'drawer button reports expanded');
  }
  async function closeDrawer() {
    if (!phone) return;
    await page.keyboard.press('Escape');
    await page.waitForSelector('.app:not(.drawer-open)');
  }
  async function nav(name) {
    await openDrawer();
    await page.locator('.sb-nav a', { hasText: name }).click();
    await page.waitForTimeout(150);
  }

  try {
    /* Register */
    await page.goto(INDEX + '?reset=1', { waitUntil: 'networkidle' });
    await waitHash(/#\/register$/);
    assert(await shown(page.getByRole('heading', { name: 'Create account' })), 'register heading');
    assert(await shown(page.getByText('Know what you').first()), 'tagline shown');
    assert(await page.locator('.auth-hero .free-label').innerText() === 'Free for first users', 'free label');
    if (!phone) {
      const btnBottom = await page.getByRole('button', { name: 'Create account' }).evaluate(b => b.getBoundingClientRect().bottom);
      assert(btnBottom <= 900, 'desktop: Create account is above the fold (' + Math.round(btnBottom) + ')');
    }
    await page.fill('#reg-name', 'Tess');
    await page.fill('#reg-email', 'tess@example.com');
    await page.fill('#reg-pass', 'anything');
    await page.getByRole('button', { name: 'Create account' }).click();
    await waitHash(/#\/questions/);
    step('registered (no saved account, so no confirm)');

    /* Questionnaire: Continue with no answer gives a hint; answer some, skip one */
    const disclaimer = await page.evaluate(() => window.LANDIT.disclaimer);
    assert((await page.locator('.q-count').innerText()).includes('Question 1 of 7'), 'question 1 of 7');
    assert(await shown(page.locator('.page-foot').getByText(disclaimer)), 'disclaimer in the questions footer');
    await page.getByRole('button', { name: /Continue/ }).click();
    assert((await page.locator('#q-hint').innerText()) === 'Choose an answer, or skip this question.', 'hint when nothing chosen');
    assert(/#\/questions$/.test(await hash()), 'stayed on question 1');
    if (phone) {
      const skipBox = await page.getByRole('button', { name: 'Skip this question' }).boundingBox();
      assert(skipBox && skipBox.y + skipBox.height <= 844, 'phone: Skip this question is on screen without scrolling');
    }
    await page.locator('label.opt', { hasText: 'Student visa' }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await waitHash(/#\/questions\/2/);
    await page.locator('label.opt', { hasText: 'England' }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await waitHash(/#\/questions\/3/);
    await page.getByRole('button', { name: 'Skip this question' }).click();
    await waitHash(/#\/questions\/4/);
    await page.locator('label.opt', { hasText: 'Yes, full time' }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await waitHash(/#\/questions\/5/);
    await page.getByRole('button', { name: 'Skip all' }).click();
    await waitHash(/#\/ack/);
    const prof = (await state()).profile;
    assert(prof.status === 'student' && prof.nation === 'England' && prof.study === 'full_time' && !('work' in prof), 'answers saved, skipped one empty');
    step('questionnaire: hint on empty Continue, 3 answered, 1 skipped, then skip all; footer has the disclaimer');

    /* Acknowledgement */
    assert(await shown(page.getByText(disclaimer).first()), 'disclaimer on ack');
    await page.getByRole('button', { name: 'I understand' }).click();
    await waitHash(/#\/chat/);
    step('acknowledged');

    /* Chat: typed message */
    assert((await page.locator('.greet-title').innerText()).includes('Tess'), 'greeting has the name');
    assert(await page.locator('.dock-disc').innerText() === disclaimer, 'disclaimer under composer');
    if (phone) {
      assert(/Menu/.test(await page.locator('.menu-btn').innerText()), 'phone: the menu button says Menu');
      assert(await page.locator('#topbar-name').innerText() === 'Chat', 'phone: top bar names the page');
      await page.waitForFunction(() => !document.querySelector('.enter'));
      const discBox = await page.locator('.dock-disc').boundingBox();
      assert(discBox && discBox.y + discBox.height <= 844 + 1, 'phone: disclaimer visible under the composer on an empty chat');
    }
    await page.fill('#chat-input', 'What can I claim?');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.msg.bot:not(.typing)', { timeout: 5000 });
    assert((await page.locator('.msg.user .bubble').first().innerText()) === 'What can I claim?', 'user bubble');
    const first = await page.locator('.msg.bot:not(.typing) .bot-text').first().innerText();
    assert(/you may be able to get/i.test(first), 'reply says may be able to');
    /* Cards: a possible scheme carries the tag, a confirmed one does not */
    const cardFits = await page.evaluate(() => {
      const m = window.LANDIT.match(JSON.parse(localStorage.getItem('landit-a:state')).profile);
      return [...document.querySelectorAll('.msg.bot .ccard')].map(c => {
        const id = c.querySelector('a[href^="#/benefit/"]').getAttribute('href').split('/').pop();
        return { id, fit: m.fit[id] || null, tag: !!c.querySelector('.fit-tag') };
      });
    });
    assert(cardFits.length && cardFits.every(c => (c.fit === 'possible') === c.tag), 'chat cards tag exactly the possible schemes ' + JSON.stringify(cardFits));
    const qual = await page.locator('.msg.bot .ccard .ccard-val').first().innerText();
    assert(!/,\s*$/m.test(qual.split('\n')[0]), 'chat card qualifier is tidy: ' + qual.replace(/\n/g, ' / '));
    step('typed message answered; chat cards tag possible schemes (' + cardFits.map(c => c.id + ':' + c.fit).join(', ') + ')');

    /* Chat: tap a suggested reply */
    const chip = page.locator('.msg.bot:not(.typing)').last().locator('.chip').first();
    const chipText = await chip.innerText();
    await chip.click();
    await page.waitForFunction(() => document.querySelectorAll('.msg.bot:not(.typing)').length >= 2, null, { timeout: 5000 });
    assert((await page.locator('.msg.user .bubble').nth(1).innerText()) === chipText, 'chip sent as message');
    if (phone) assert(await page.evaluate(() => document.activeElement && document.activeElement.id) !== 'chat-input', 'phone: a chip tap does not open the keyboard');
    step('suggested reply: ' + chipText);

    /* Chat: a blocked scheme's card has no Track button */
    await page.fill('#chat-input', 'Council tax as a student');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.msg.bot:not(.typing)').length >= 3, null, { timeout: 5000 });
    const ctr = page.locator('.msg.bot').last().locator('.ccard').filter({ has: page.locator('a[href="#/benefit/council-tax-reduction"]') });
    assert(await ctr.count() === 1, 'Council Tax Reduction card shown');
    assert(await ctr.locator('[data-act="track"]').count() === 0, 'no Track on a blocked card');
    assert(/Not open to you now/.test(await ctr.innerText()), 'blocked card says Not open to you now');
    step('blocked chat card: no Track, tagged Not open to you now');

    /* Chat: track a benefit from a card */
    let card = page.locator('.ccard').filter({ has: page.locator('[data-act="track"][data-id="council-tax-student"]') }).last();
    if (!(await card.count())) card = page.locator('.ccard').first();
    const trackBtn = card.locator('[data-act="track"]');
    const trackedId = await trackBtn.getAttribute('data-id');
    await trackBtn.click();
    assert(await trackBtn.getAttribute('aria-pressed') === 'true', 'track button pressed');
    step('tracked from chat card: ' + trackedId);

    /* Sidebar shows it; expand and tick a document; disclaimer in the drawer */
    await openDrawer();
    if (phone) assert(await shown(page.locator('#sidebar .sb-disc')) && (await page.locator('#sidebar .sb-disc').innerText()) === disclaimer, 'phone: disclaimer in the drawer');
    else assert(!(await page.locator('#sidebar .sb-disc').isVisible()), 'desktop: no second disclaimer in the sidebar');
    const row = page.locator('.trk-btn[data-id="' + trackedId + '"]');
    assert(await row.isVisible(), 'tracked row visible in sidebar');
    await row.click();
    assert(await row.getAttribute('aria-expanded') === 'true', 'tracked row expanded');
    const box = page.locator('#trk-p-' + trackedId + ' input[type="checkbox"]').first();
    await box.check();
    assert(await page.locator('#trk-p-' + trackedId + ' input[type="checkbox"]').first().isChecked(), 'document ticked');
    const meta = await page.locator('.trk-btn[data-id="' + trackedId + '"] .trk-docs').innerText();
    assert(/^1 of \d+ documents$/.test(meta), 'ticked count shown: ' + meta);
    const groups = await page.locator('#trk-p-' + trackedId + ' .doc-group').allInnerTexts();
    assert(groups.some(g => /Needed/.test(g)), 'needed group shown');
    await closeDrawer();
    step('sidebar row expanded, document ticked (' + meta + ')');

    /* Benefits: header, public funds wording, list, sort, filter */
    await nav('Benefits');
    await waitHash(/#\/benefits/);
    const m = await page.evaluate(() => {
      const L = window.LANDIT, mm = L.match(JSON.parse(localStorage.getItem('landit-a:state')).profile);
      return { open: mm.open.length, blocked: mm.blocked.length, pf: mm.blocked.filter(x => x.kind === 'public-fund').length,
        needs: mm.blocked.filter(x => x.kind === 'needs-public-fund').length, total: L.formatMoney(mm.total),
        quickest: L.sortBenefits(mm.open, 'time')[0].name, highest: L.sortBenefits(mm.open, 'value')[0].name };
    });
    const title = await page.locator('h1.ben-title').innerText();
    assert(title.includes(m.open + ' benefits') && /may be able to/.test(title), 'header count and wording: ' + title);
    assert(/Student visa/.test(await page.locator('.ben-meta').innerText()), 'status named under the header');
    if (phone) assert(await page.locator('#topbar-name').innerText() === 'Benefits', 'phone: top bar says Benefits');
    const nrpf = await page.locator('.nrpf-line').innerText();
    assert(nrpf.includes('left out ' + m.blocked + ' benefits') && !/public-funds schemes/.test(nrpf), 'NRPF line is accurate: ' + nrpf);
    assert(await page.locator('.total-label').innerText() === 'Potential, if all approved', 'potential label');
    assert(await page.locator('.total-amt').innerText() === m.total, 'total amount');
    assert(await shown(page.locator('.page-foot').getByText(disclaimer)), 'disclaimer on benefits');
    const firstTop = await page.locator('.bcard').first().evaluate(c => c.getBoundingClientRect().top);
    if (phone) assert(firstTop < 620, 'phone: first card starts near the top (' + Math.round(firstTop) + ')');
    const bodyText = await page.locator('main').innerText();
    assert(!/Not listed/.test(bodyText), 'no "Not listed" chips on Benefits');
    const firstName = await page.locator('.bcard-name').first().innerText();
    assert(firstName === m.highest, 'Highest amount: flat ranked list starts with ' + m.highest + ' (got ' + firstName + ')');
    const fitOk = await page.evaluate(() => {
      const mm = window.LANDIT.match(JSON.parse(localStorage.getItem('landit-a:state')).profile);
      return [...document.querySelectorAll('.bcard')].every(c => (mm.fit[c.dataset.id] === 'possible') === !!c.querySelector('.fit-tag'));
    });
    assert(fitOk, 'every possible card, and only those, shows "Depends on your situation"');
    assert(await page.locator('.bcard').first().locator('[data-act="track"] .trk-label').count() === 1, 'Track has a visible word on cards');
    const before = await page.locator('.bcard').count();
    await page.locator('[data-act="list-more"]').click();
    const afterMore = await page.locator('.bcard').count();
    assert(afterMore > before, 'Show more adds cards (' + before + ' to ' + afterMore + ')');
    await page.selectOption('#sort-by', 'time');
    assert(await page.locator('.bcard-name').first().innerText() === m.quickest, 'Quickest to apply starts with ' + m.quickest);
    await page.selectOption('#sort-by', 'az');
    assert(await page.locator('.cat-group').count() > 3, 'A to Z shows category groups');
    await page.locator('.fchip[data-cat="transport"]').click();
    const cats = await page.locator('.bcard').evaluateAll(cs => [...new Set(cs.map(c => c.dataset.cat))]);
    assert(cats.length === 1 && cats[0] === 'transport' && await page.locator('.cat-group').count() === 0, 'filter leaves only transport, as one list');
    assert(await page.locator('.fchip[data-cat="transport"]').getAttribute('aria-pressed') === 'true', 'chip pressed');
    step('Benefits: ' + m.open + ' open, ranked by amount, Show more, quickest first, A to Z groups, transport filter');

    /* Blocked section */
    await page.locator('.fchip[data-cat="all"]').click();
    await page.locator('#blocked > summary').click();
    const why = await page.locator('.blocked-why').innerText();
    assert(!/These are public funds/.test(why) && /paragraph 6\.2/.test(why), 'blocked intro does not call every item a public fund: ' + why);
    const heads = await page.locator('.blocked-group h3').allInnerTexts();
    assert(heads.includes('On the public funds list (' + m.pf + ')') && heads.includes('Need a benefit you cannot get (' + m.needs + ')'), 'blocked groups ' + heads.join(' | '));
    step('blocked list: ' + heads.join(', '));

    /* A blocked public fund: no apply nudge */
    await go('#/benefit/universal-credit');
    await waitHash(/universal-credit/);
    assert(await page.locator('.apply-row .btn.primary').count() === 0, 'no primary apply button on a blocked public fund');
    assert(await shown(page.getByRole('link', { name: /Read about it on the official site/ })), 'calm link to the official site instead');
    assert(await page.locator('input[name="claim"]').count() === 0, 'no claim status on a blocked scheme');
    assert(await page.locator('.d-actions [data-act="track"]').count() === 0, 'no Track on a blocked scheme');
    assert(await page.locator('#acc-boost').count() === 0, 'no Improve your chances on a blocked scheme');
    assert(/qualified adviser/.test(await page.locator('.notice').innerText()), 'adviser line in the notice');
    await go('#/benefit/help-to-save');
    await waitHash(/help-to-save/);
    const fl = await page.locator('.fund-line').innerText();
    assert(/needs a benefit that is one/.test(fl) && !/does not apply|does not stop you/.test(fl), 'needs-a-public-fund line is consistent: ' + fl);
    step('blocked detail pages: no apply button, Track or status; fund line consistent');

    /* Open a detail */
    await go('#/benefits');
    await page.locator('.fchip[data-cat="transport"]').click();
    await page.locator('.bcard .stretch').first().click();
    await waitHash(/#\/benefit\//);
    const detailId = (await hash()).split('/').pop();
    assert(await page.locator('#glance-h').innerText() === 'At a glance', 'at a glance');
    assert(await shown(page.locator('.page-foot').getByText(disclaimer)), 'disclaimer on detail');
    const hasUrl = await page.evaluate(id => !!window.LANDIT.benefitById(id).applyUrl, detailId);
    if (hasUrl) assert(await page.locator('.d-actions a', { hasText: 'Official page' }).count() === 1, 'Official page button in the header');
    assert(await page.locator('details.acc').count() >= 3, 'secondary sections folded under More about this benefit');
    step('opened detail: ' + detailId);

    /* Share: link visible, disclaimer in the dialog */
    await page.locator('.d-actions [data-act="share"]').click();
    await page.waitForSelector('dialog[open] #share-url');
    const url = await page.inputValue('#share-url');
    assert(url === 'https://landit-uk.com/' + detailId + '/', 'share link ' + url);
    assert((await page.locator('dialog[open] .disc-line').innerText()) === disclaimer, 'disclaimer in the Share dialog');
    await page.locator('dialog[open] [data-share-copy]').click();
    await page.waitForFunction(() => /copied|copy it/i.test(document.getElementById('toast').textContent), null, { timeout: 3000 });
    await page.keyboard.press('Escape');
    await dialogGone();
    assert(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-act')) === 'share', 'focus back on Share');
    step('share link shown: ' + url);

    /* Claim status */
    await page.locator('input[name="claim"][value="Applied"]').check();
    assert(await page.locator('#claim-note').innerText() === 'Saved. You can change this at any time.', 'status saved');
    const st = (await state()).tracked.find(t => t.id === detailId).status;
    assert(st === 'Applied', 'stored status Applied');
    await openDrawer();
    assert(await page.locator('.trk-btn[data-id="' + detailId + '"] .status-pill').innerText() === 'Applied', 'sidebar shows Applied');
    await closeDrawer();
    step('claim status set to Applied');

    /* Untracking something with progress asks first */
    await page.locator('.d-actions [data-act="track"]').click();
    await page.waitForSelector('dialog[open] [data-confirm-yes]');
    await page.locator('dialog[open] .dlg-foot [data-dlg-close]').click();
    await dialogGone();
    assert((await state()).tracked.some(t => t.id === detailId && t.status === 'Applied'), 'Cancel keeps the tracked application');
    await page.locator('.d-actions [data-act="track"]').click();
    await page.locator('dialog[open] [data-confirm-yes]').click();
    await dialogGone();
    assert(!(await state()).tracked.some(t => t.id === detailId), 'Stop tracking removes it after confirming');
    step('untrack with progress: asks first, Cancel keeps, confirm removes');

    /* Community: post (empty first), comment, rate */
    await nav('Community');
    await waitHash(/#\/community/);
    assert(await shown(page.getByText('Sample posts and ratings.').first()), 'sample label');
    assert(await shown(page.locator('.page-foot').getByText(disclaimer)), 'disclaimer on community');
    await page.getByRole('button', { name: 'Write a post' }).click();
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    assert(await shown(page.locator('#post-err')), 'calm message on an empty post');
    await page.fill('#p-title', 'My first try');
    await page.fill('#p-body', 'I asked the council and they explained the form. It was easier than I thought.');
    await page.selectOption('#p-tag', 'council-tax-student');
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.post .post-title') && document.querySelector('.post .post-title').textContent === 'My first try');
    assert(/Your post/.test(await page.locator('.post').first().innerText()), 'own post is labelled Your post');
    step('posted (empty post gets the in-app message first)');
    const firstPost = page.locator('.post').first();
    await firstPost.locator('[data-act="comments"]').click();
    await page.locator('.post').first().locator('.comment-form input').fill('Thank you for sharing.');
    await page.locator('.post').first().getByRole('button', { name: 'Comment', exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('.post')][0].querySelector('.c-body') && [...document.querySelectorAll('.post')][0].innerText.includes('Thank you for sharing.'));
    step('commented');
    await page.getByRole('link', { name: 'Ratings' }).click();
    await waitHash(/#\/community\/ratings/);
    await page.getByRole('button', { name: 'Rate a benefit' }).click();
    await page.waitForSelector('dialog[open] #r-scheme');
    assert((await page.locator('dialog[open] .disc-line').innerText()) === disclaimer, 'disclaimer in the Rate dialog');
    await page.selectOption('#r-scheme', 'council-tax-student');
    await page.locator('dialog[open] input[name="r-worth"][value="0"]').check();
    await page.locator('dialog[open] input[name="r-speed"][value="1"]').check();
    await page.locator('dialog[open] input[name="r-ease"][value="0"]').check();
    await page.getByRole('button', { name: 'Save rating' }).click();
    await dialogGone();
    const mine = page.locator('.rcard', { hasText: 'Council Tax student exemption' });
    assert(await shown(mine.getByText('Your rating is included')), 'rating included');
    assert(/of 8 people/.test(await mine.locator('.rscale-sum').first().innerText()), 'count went up to 8');
    const tie = await page.locator('.rcard', { hasText: 'University hardship fund' }).locator('.rscale-sum').nth(1).innerText();
    assert(/average time and 3 said it was slow/.test(tie), 'a tie names both answers: ' + tie);
    step('rated (word choices, counts only); ties name both answers');

    /* Settings: the account row goes straight there */
    await openDrawer();
    await page.locator('#acct-link').click();
    await waitHash(/#\/settings/);
    assert(await page.locator('#acct-link').getAttribute('aria-current') === 'page', 'account row marked current on Settings');
    if (phone) assert(await page.locator('#topbar-name').innerText() === 'Profile', 'phone: top bar says Profile');
    step('settings reached in one tap from the account row');

    /* The quick menu still offers Help now */
    await openDrawer();
    await page.locator('#acct-btn').click();
    assert(await page.locator('#acct-btn').getAttribute('aria-expanded') === 'true', 'quick menu open');
    await page.getByRole('menuitem', { name: 'Help now' }).click();
    await page.waitForSelector('dialog[open] .help');
    await page.keyboard.press('Escape');
    await dialogGone();
    if (phone) await closeDrawer().catch(() => {});
    step('Help now from the quick menu');

    await page.locator('input[name="theme"][value="evening"]').check();
    assert(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'evening', 'theme evening');
    await page.locator('input[name="text-s"][value="large"]').check();
    assert(await page.evaluate(() => document.documentElement.style.fontSize) === '112.5%', 'text large');
    await page.locator('input[name="lang-s"][value="ar"]').check();
    await page.waitForFunction(() => document.documentElement.dir === 'rtl');
    assert(await page.evaluate(() => document.documentElement.lang) === 'ar', 'lang ar');
    assert(await page.locator('h1.page-title').innerText() === 'الإعدادات', 'settings title translated');
    await page.locator('input[name="lang-s"][value="en"]').check();
    await page.waitForFunction(() => document.documentElement.dir === 'ltr');
    step('theme Evening, text Large, Arabic and back');

    const openBefore = await page.evaluate(() => window.LANDIT.match(JSON.parse(localStorage.getItem('landit-a:state')).profile).open.length);
    await page.locator('[data-act="edit-answer"][data-q="status"]').click();
    await page.waitForSelector('dialog[open] #answer-form');
    await page.locator('dialog[open] label.opt', { hasText: 'Refugee or humanitarian protection' }).click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Save' }).click();
    await dialogGone();
    await page.waitForFunction(() => /Benefits now shows/.test(document.getElementById('toast').textContent));
    await nav('Benefits');
    await waitHash(/#\/benefits/);
    const meta2 = await page.locator('.ben-meta').innerText();
    assert(/refugee/i.test(meta2), 'benefits header follows new status: ' + meta2);
    const openAfter = await page.evaluate(() => window.LANDIT.match(JSON.parse(localStorage.getItem('landit-a:state')).profile).open.length);
    const title2 = await page.locator('h1.ben-title').innerText();
    assert(openAfter !== openBefore && title2.includes(String(openAfter)), 'benefit count changed ' + openBefore + ' to ' + openAfter);
    assert(/lets you get public funds/.test(await page.locator('.nrpf-line').innerText()), 'refugee line has no jargon');
    step('status edited, Benefits changed from ' + openBefore + ' to ' + openAfter);

    /* Sign out, then a mistyped email: nothing is deleted */
    const keep = (await state()).tracked.length;
    await go('#/settings');
    await page.locator('.set-row [data-act="sign-out"]').click();
    await waitHash(/#\/login/);
    await page.fill('#login-email', 'tess@example.co');
    await page.fill('#login-pass', 'anything');
    await page.getByRole('button', { name: 'Sign in' }).click();
    assert(await shown(page.locator('#login-err')), 'calm message for an unknown email');
    assert(/#\/login/.test(await hash()), 'still on sign in');
    const s1 = await state();
    assert(s1.user && s1.user.email === 'tess@example.com' && s1.tracked.length === keep, 'nothing deleted by a mistyped email');
    await page.fill('#login-email', 'tess@example.com');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await waitHash(/#\/chat/);
    step('mistyped email: calm message, data kept; right email signs in');

    /* Register again: asks before replacing the saved account */
    await go('#/register');
    await page.fill('#reg-name', 'Other');
    await page.fill('#reg-email', 'other@example.com');
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.waitForSelector('dialog[open] [data-confirm-yes]');
    await page.locator('dialog[open] .dlg-foot [data-dlg-close]').click();
    await dialogGone();
    const s2 = await state();
    assert(s2.user.email === 'tess@example.com' && s2.tracked.length === keep, 'Cancel keeps the saved account');
    step('register over a saved account asks first; Cancel keeps it');

    /* Delete account */
    await go('#/settings');
    await page.locator('[data-act="delete-account"]').click();
    await page.waitForSelector('dialog[open] [data-confirm-yes]');
    await page.locator('dialog[open] [data-confirm-yes]').click();
    await waitHash(/#\/register/);
    assert(await shown(page.getByRole('heading', { name: 'Create account' })), 'back on register');
    const left = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('landit-a:state') || 'null'); return s ? { user: s.user, tracked: s.tracked.length, posts: s.community.posts.length } : null; });
    assert(!left || (!left.user && !left.tracked && !left.posts), 'local state cleared');
    step('account deleted, back on Register');
  } catch (e) {
    errors.push(e.message.split('\n')[0]);
    await page.screenshot({ path: path.join(HERE, 'flow-fail-' + size + '.png'), fullPage: false }).catch(() => {});
  }
  await browser.close();
  return { size, log, errors };
}

let failed = false;
for (const size of runs) {
  const r = await run(size);
  console.log(`\nflow ${size}: ${r.errors.length ? 'FAIL' : 'pass'}`);
  r.log.forEach(l => console.log('  ok  ' + l));
  r.errors.forEach(e => console.log('  ERR ' + e));
  if (r.errors.length) failed = true;
}
process.exit(failed ? 1 : 0);

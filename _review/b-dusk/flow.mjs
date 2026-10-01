#!/usr/bin/env node
/* Design B (Dusk): click-through test of the whole journey, at phone and
   desktop size. Same Playwright setup as tools/shoot.mjs.

   ?reset=1 -> register -> questionnaire (answer some, skip one, "Skip the
   rest" label) -> ack -> chat (typed message, confirmed scheme first,
   certainty tags, "still writing" note, suggested reply, Track from a chat
   card, a visa-blocked card with no amount and no Track, Help now from the
   avatar menu, voice typing never invents words) -> sidebar (Settings and
   Help now in it, disclaimer, expand, tick a needed document, Stop
   tracking, main column inert behind the phone drawer) -> benefits
   (highlights ranked by certainty, plain header with a link that opens
   the blocked list, accurate group reasons, totals labels, sort, filter,
   search with "dentist") -> detail (rules without ticks, jump to steps,
   share: phone share sheet or Landit dialog, claim status, tick a step) ->
   a blocked public fund (no Apply button, no claim status, no Track) ->
   extra large text on a phone (detail fits the screen) -> community (feed
   first, form behind a button, post, comment, rate) -> settings (no "Free
   to call", 44px switch, theme, text size, Arabic and back, edit status
   and see Benefits change) -> delete account (keeps colours) -> back on
   Register. Fails on any console or page error.

   Usage: node _review/b-dusk/flow.mjs [phone|desktop]   (default: both)
   Screens of key moments go to _review/b-dusk/flow/. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';

const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PAGE = pathToFileURL(path.join(ROOT, 'b-dusk', 'index.html')).href;
const OUT = path.join(HERE, 'flow');
fs.mkdirSync(OUT, { recursive: true });

const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const only = process.argv[2];
const sizes = only ? [only] : ['phone', 'desktop'];

let failures = 0;

async function run(size) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext(SIZES[size]);
  try { await context.grantPermissions(['clipboard-read', 'clipboard-write']); } catch (e) { /* not all channels */ }
  const phone = size === 'phone';
  /* Headless Chrome has a share function that never answers, so stand in
     for the phone's share sheet: record what was shared, or fail on demand. */
  if (phone) {
    await context.addInitScript(() => {
      window.__shares = [];
      Object.defineProperty(Navigator.prototype, 'share', {
        configurable: true,
        value: data => { window.__shares.push(data); return window.__shareFail ? Promise.reject(Object.assign(new Error('no sheet'), { name: 'NotAllowedError' })) : Promise.resolve(); },
      });
      Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => true });
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('page: ' + e.message));
  let step = 0;
  const log = msg => console.log(`  [${size}] ${String(++step).padStart(2, '0')} ${msg}`);
  const shot = name => page.screenshot({ path: path.join(OUT, `${size}-${name}.png`) });
  const expect = async (cond, what) => {
    if (!cond) throw new Error('Expected: ' + what);
    if (errors.length) throw new Error('Console or page error: ' + errors.join(' | '));
  };
  const waitFor = (fn, arg, what, timeout = 5000) =>
    page.waitForFunction(fn, arg, { timeout }).catch(() => { throw new Error('Timed out waiting for: ' + what); });
  const hash = () => page.evaluate(() => location.hash);
  /* A route is ready once the router has rendered it. */
  const route = (h, what) => waitFor(x => location.hash === x && window.DUSK.lastHash === x, h, what || h);
  const text = sel => page.locator(sel).first().innerText();
  const openDrawer = async () => {
    if (!phone) return;
    await page.click('#menu-btn');
    await waitFor(() => document.getElementById('shell').getAttribute('data-drawer') === 'open', null, 'drawer open');
  };
  const closeDrawer = async () => {
    if (!phone) return;
    await page.keyboard.press('Escape');
    await waitFor(() => document.getElementById('shell').getAttribute('data-drawer') === 'closed', null, 'drawer closed');
  };
  const nav = async id => {
    await openDrawer();
    await page.click('#nav-' + id);
    await route('#/' + id, 'route ' + id);
  };
  const BANNED_TEXT = /–|—|\bpublic-funds schemes\b|Free to call/;

  try {
    /* Register */
    await page.goto(PAGE + '?reset=1', { waitUntil: 'networkidle' });
    await expect(await hash() === '#/register', 'reset opens Register');
    await expect((await text('h1')).includes('Create account'), 'Register heading');
    await expect(await page.evaluate(() => [...document.querySelectorAll('.free-label')].some(e => e.offsetParent && e.textContent === window.LANDIT.freeLabel)), 'free label visible');
    log('Register shows');
    await page.fill('#reg-name', 'Nadia');
    await page.fill('#reg-email', 'nadia@example.com');
    await page.fill('#reg-password', 'anything');
    await page.click('#auth-submit');
    await route('#/questions', 'questionnaire');
    log('Registered, on the questionnaire');

    /* Questionnaire: answer some, skip one */
    await expect((await text('#q-skip-all')) === 'Skip all', '"Skip all" before any answer');
    await page.click('label[for="q-status-student"]');
    await expect((await text('#q-skip-all')) === 'Skip the rest', '"Skip the rest" once an answer exists');
    await page.click('label[for="q-nation-England"]');
    await page.click('#qskip-work');
    await expect(await page.locator('#qc-work.is-skipped').count() === 1, 'work question skipped');
    await page.click('label[for="q-study-full_time"]');
    await page.click('label[for="q-children-no"]');
    await expect((await text('#q-progress')).includes('4 of 7 answered'), 'progress counts 4 answered');
    await shot('questions');
    await page.click('#q-continue');
    await route('#/ack', 'acknowledgement');
    log('Answered 4, skipped 1, continued ("Skip all" became "Skip the rest")');

    /* Acknowledgement */
    const disc = await page.evaluate(() => window.LANDIT.disclaimer);
    await expect((await page.innerText('body')).includes(disc), 'disclaimer on ack');
    await page.click('#ack-btn');
    await route('#/chat', 'chat');
    log('Acknowledged the disclaimer');

    /* Chat */
    await expect(await page.locator('.starter').count() === 4, '4 starter cards');
    await expect((await page.innerText('body')).includes(disc), 'disclaimer under the composer');
    const noteSize = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.composer-note')).fontSize));
    await expect(noteSize >= 16, 'disclaimer under the composer is 16px or more (' + noteSize + ')');
    await shot('chat-empty');
    await page.fill('#chat-input', 'What can I claim?');
    await page.press('#chat-input', 'Enter');
    /* Press Send again while Landit is still writing: a calm note, no lost text. */
    await page.fill('#chat-input', 'Help with bills');
    await page.press('#chat-input', 'Enter');
    const busyNote = await page.evaluate(() => { const l = document.getElementById('listening'); return l.hidden ? '' : l.innerText; });
    await expect(/still writing/.test(busyNote) || await page.evaluate(() => !document.getElementById('typing')), 'still-writing note while busy');
    await waitFor(() => document.querySelectorAll('.msg-bot:not(.typing)').length === 1, null, 'first reply');
    await expect(await page.locator('.msg-user').count() === 1, 'only one user message while busy');
    await expect(await page.inputValue('#chat-input') === 'Help with bills', 'the unsent text stays in the box');
    await page.fill('#chat-input', '');
    await expect(await page.locator('.bcard').count() >= 1, 'benefit cards in the reply');
    const firstCard = await page.evaluate(() => document.querySelector('.msg-bot:last-child .bcard .bcard-name').getAttribute('href'));
    const sure = await page.evaluate(() => { const m = window.DUSK.match(); return window.LANDIT.rankForHighlights(window.LANDIT.sortBenefits(m.open, 'value'), m.fit).filter(b => typeof b.value === 'number')[0].id; });
    await expect(firstCard === '#/benefit/' + sure, 'first chat card is the confirmed pick ' + sure + ' (got ' + firstCard + ')');
    const tagsOk = await page.evaluate(() => [...document.querySelectorAll('.msg-bot .bcard')].every(c => {
      const id = c.querySelector('.bcard-name').getAttribute('href').split('/').pop();
      const possible = window.DUSK.match().fit[id] === 'possible';
      return !!c.querySelector('.fit-tag') === possible;
    }));
    await expect(tagsOk, 'every possible chat card carries the "Depends on your situation" tag, and only those');
    log('Typed a question: ' + sure + ' first, certainty tags right, "still writing" note shown');
    await page.locator('.msg-bot:not(.typing)').last().locator('.chip').first().click();
    await waitFor(() => document.querySelectorAll('.msg-bot:not(.typing)').length === 2, null, 'second reply');
    log('Tapped a suggested reply');
    const card = page.locator('.bcard [data-action="track"][aria-pressed="false"]').first();
    const trackedId = await card.getAttribute('data-track');
    await card.click();
    await waitFor(id => window.DUSK.isTracked(id), trackedId, 'tracked from chat card');
    await expect(await page.locator(`.bcard [data-track="${trackedId}"][aria-pressed="true"]`).count() >= 1, 'card shows Tracking');
    log('Tracked ' + trackedId + ' from a chat card');

    /* A visa-blocked scheme in a chat card: lock tag, no amount, no Track */
    await page.fill('#chat-input', 'Council tax as a student');
    await page.press('#chat-input', 'Enter');
    await waitFor(() => document.querySelector('.bcard.is-blocked'), null, 'blocked card');
    const blockedCard = await page.evaluate(() => {
      const c = document.querySelector('.bcard.is-blocked');
      return { lock: !!c.querySelector('.lock-tag'), amount: !!c.querySelector('.amount'), track: !!c.querySelector('[data-action="track"]'), id: c.querySelector('.bcard-name').getAttribute('href') };
    });
    await expect(blockedCard.lock && !blockedCard.amount && !blockedCard.track, 'blocked card: lock tag, no amount, no Track ' + JSON.stringify(blockedCard));
    log('Blocked card ' + blockedCard.id + ' shows "Not open on your visa", no amount and no Track');

    /* Voice typing: real listening, or a clearly labelled example. Never invents words. */
    const hasSR = await page.evaluate(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    await page.click('#mic-btn');
    await waitFor(() => !document.getElementById('listening').hidden, null, 'listening state');
    await waitFor(() => /cannot hear|did not hear|not working|Example only/.test(document.getElementById('listening').innerText) || document.getElementById('chat-input').value, null, 'voice typing outcome', 6000);
    const listen = await page.evaluate(() => document.getElementById('listening').innerText);
    if (hasSR) await expect(await page.inputValue('#chat-input') === '', 'no words typed that nobody said');
    log('Voice typing shows: ' + listen.slice(0, 70));
    if (await page.evaluate(() => document.getElementById('mic-btn').getAttribute('aria-pressed') === 'true')) await page.click('#mic-btn');
    await page.fill('#chat-input', '');

    /* Help now from the avatar menu */
    await page.click('#avatar-btn');
    await expect(await page.isVisible('#avatar-menu'), 'avatar menu open');
    await expect((await text('#avatar-menu')).includes('nadia@example.com'), 'menu shows the email');
    await page.click('#avatar-menu [data-menu="help"]');
    await waitFor(() => document.querySelector('dialog.dlg-help[open]'), null, 'Help now dialog');
    await expect((await text('dialog.dlg-help')).includes('999'), 'Help now shows 999');
    await shot('help-now');
    await page.keyboard.press('Escape');
    await waitFor(() => !document.querySelector('dialog[open]'), null, 'dialog closed');
    log('Opened Help now from the avatar menu');

    /* Sidebar: Settings and Help now are in it; expand a row and tick a needed document */
    if (phone) await expect((await text('#menu-btn')).includes('Menu'), 'the menu button shows the word Menu');
    await openDrawer();
    if (phone) await expect(await page.evaluate(() => document.querySelector('.main-col').hasAttribute('inert')), 'page behind the drawer is inert');
    await expect(await page.locator('#nav-settings').count() === 1, 'Profile and settings in the sidebar');
    await expect(await page.locator('#sb-help').count() === 1, 'Help now in the sidebar');
    await expect(await page.evaluate(d => document.getElementById('sidebar').textContent.includes(d), disc), 'disclaimer in the sidebar next to tracked schemes');
    const row = page.locator('#trk-btn-' + trackedId);
    await expect(await row.count() === 1, 'tracked row in the sidebar');
    await row.click();
    await expect(await row.getAttribute('aria-expanded') === 'true', 'row expanded');
    const box = page.locator(`#trk-body-${trackedId} input[type="checkbox"]`).first();
    await box.check();
    await waitFor(id => window.DUSK.checks(id).docs.length === 1, trackedId, 'document ticked and saved');
    const rowText = await row.innerText();
    await expect(/1 of \d+ documents? ready/.test(rowText), 'row counts needed documents: ' + rowText.replace(/\s+/g, ' '));
    await expect(await page.locator(`#trk-body-${trackedId} [data-action="untrack"]`).count() === 1, 'Stop tracking in the expanded row');
    await shot('sidebar');
    await page.click('#sb-help');
    await waitFor(() => document.querySelector('dialog.dlg-help[open]'), null, 'Help now from the sidebar');
    await page.keyboard.press('Escape');
    await waitFor(() => !document.querySelector('dialog[open]'), null, 'dialog closed');
    if (phone) await expect(await page.evaluate(() => !document.querySelector('.main-col').hasAttribute('inert')), 'page usable again after the drawer closed');
    log('Sidebar: Settings, Help now, disclaimer, row expanded, one needed document ticked');

    /* Benefits */
    await nav('benefits');
    await expect(await page.locator('.gtile').count() === 3, 'three highlight tiles');
    const tiles = await page.evaluate(() => {
      const m = window.DUSK.match(), L = window.LANDIT;
      const want = [
        L.rankForHighlights(L.sortBenefits(m.open, 'value'), m.fit).filter(b => typeof b.value === 'number')[0].id,
        L.rankForHighlights(L.sortBenefits(m.open, 'time'), m.fit).filter(b => b.timeMinutes !== null && b.guide.time)[0].id,
        L.rankForHighlights(L.sortBenefits(m.open, 'docs'), m.fit).filter(b => b.docsKnown)[0].id,
      ];
      const got = [...document.querySelectorAll('a.gtile')].map(a => a.getAttribute('href').split('/').pop());
      return { want, got };
    });
    await expect(JSON.stringify(tiles.want) === JSON.stringify(tiles.got), 'tiles ranked with rankForHighlights ' + JSON.stringify(tiles));
    await expect(await page.locator('.bar-row').count() >= 1, 'value chart');
    const body = await page.innerText('body');
    await expect(body.includes('Potential, if all approved'), 'total labelled');
    await expect(!BANNED_TEXT.test(body), 'no dash, no "public-funds schemes", no "Free to call"');
    const rowTags = await page.evaluate(() => [...document.querySelectorAll('.brow')].every(r => !!r.querySelector('.fit-tag') === (window.DUSK.match().fit[r.dataset.bid] === 'possible')));
    await expect(rowTags, 'rows carry the certainty tag exactly when possible');
    const qualSize = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.worth .qual')).fontSize));
    await expect(qualSize >= 16, 'amount qualifier is 16px or more (' + qualSize + ')');
    await shot('benefits');
    await page.click('[data-action="show-blocked"]');
    await waitFor(() => document.getElementById('blocked-toggle').getAttribute('aria-expanded') === 'true' && document.activeElement.id === 'blocked-toggle', null, 'blocked list opened from the header link');
    const groups = await page.evaluate(() => [...document.querySelectorAll('.blocked-group')].map(g => ({ h: g.querySelector('.blocked-h').innerText, why: g.querySelector('.blocked-reason').innerText })));
    await expect(groups.length === 2 && /public funds list/.test(groups[0].why) && /not public funds/.test(groups[1].why), 'each blocked group has its own accurate reason');
    await shot('benefits-blocked');
    log('Header link opened the blocked list: ' + groups.map(g => g.h.replace(/\s+/g, ' ')).join(' / '));
    await page.click('[data-action="blocked-toggle"]');
    await expect(await page.locator('#blist > li').count() === 20, 'first 20 benefits shown');
    await page.click('[data-action="bf-more"]');
    await waitFor(() => document.querySelectorAll('#blist > li').length === 40, null, 'show more');
    log('Showed 20 more benefits');
    await page.selectOption('#bf-sort', 'time');
    const quickest = await page.evaluate(() => window.LANDIT.sortBenefits(window.DUSK.match().open, 'time')[0].id);
    await waitFor(id => document.querySelector('.brow') && document.querySelector('.brow').getAttribute('data-bid') === id, quickest, 'sorted by time');
    log('Sorted by quickest to apply: ' + quickest);
    await page.selectOption('#bf-cat', 'transport');
    await waitFor(() => [...document.querySelectorAll('.brow .cat-label')].every(e => e.textContent === 'Transport'), null, 'filtered to Transport');
    await expect(/^\d+ of \d+ benefits match$/.test(await text('#bf-count')), 'count shown');
    log('Filtered to Transport: ' + (await text('#bf-count')));
    await page.selectOption('#bf-cat', 'all');
    await page.fill('#bf-q', 'dentist');
    await waitFor(() => document.getElementById('row-nhs-dental'), null, '"dentist" finds NHS dental');
    log('Searched for "dentist": NHS dental found');
    await page.fill('#bf-q', 'railcard');
    await waitFor(() => document.getElementById('row-railcard-16-25'), null, 'search finds the railcard');
    log('Searched for railcard');

    /* Detail */
    await page.click('#row-railcard-16-25');
    await route('#/benefit/railcard-16-25', 'detail route');
    await expect((await text('#bp-title')).includes('Railcard'), 'detail title');
    await expect((await page.innerText('#bf-panel')).includes(disc), 'disclaimer in the detail');
    await expect(await page.locator('#tp-overview .rules .rule-dot').count() >= 1 && await page.locator('#tp-overview .ticks').count() === 0, 'rules as plain dots, not ticks');
    const order = await page.evaluate(() => [...document.querySelectorAll('#tp-overview > section')].map(s => s.id || s.querySelector('h3').innerText));
    await expect(order.indexOf('claim-sec') > 1, 'claim status comes after "What it is" and "Do you qualify?" ' + JSON.stringify(order));
    if (!phone) await expect(await page.isVisible('#bf-list-col'), 'list stays visible beside the panel');
    await shot('detail');
    log('Opened the detail panel');
    await page.click('[data-action="bp-jump"]');
    await waitFor(() => document.getElementById('tab-apply').getAttribute('aria-selected') === 'true', null, 'jump to steps');
    await page.click('#tab-overview');
    log('"See the steps and documents" opens How to apply');
    if (phone) {
      await page.click('.bp-actions [data-action="share"]');
      await waitFor(() => window.__shares.length === 1, null, 'phone share sheet');
      await expect(await page.evaluate(() => window.__shares[0].url === 'https://landit-uk.com/railcard-16-25/' && !document.querySelector('dialog[open]')), 'phone share sheet only, with the right link');
      log('Share on a phone uses the share sheet: ' + (await page.evaluate(() => window.__shares[0].url)));
      await page.evaluate(() => { window.__shareFail = true; });
    }
    await page.click('.bp-actions [data-action="share"]');
    await waitFor(() => document.getElementById('share-link'), null, 'share dialog');
    await expect(await page.inputValue('#share-link') === 'https://landit-uk.com/railcard-16-25/', 'share link is correct');
    await page.click('#share-copy');
    await waitFor(() => /Link copied|copy it/.test(document.getElementById('toast').innerText), null, 'copy toast');
    log('Share dialog shows ' + (await page.inputValue('#share-link')) + ' and "' + (await text('#toast')) + '"');
    await shot('share');
    await page.keyboard.press('Escape');
    await waitFor(() => !document.querySelector('dialog[open]'), null, 'share closed');
    await page.click('label[for="claim-railcard-16-25-Applied"]');
    await waitFor(() => window.DUSK.trackItem('railcard-16-25') && window.DUSK.trackItem('railcard-16-25').status === 'Applied', null, 'claim status saved');
    await expect(await page.evaluate(() => document.getElementById('sidebar').textContent.includes('16-25 Railcard')), 'railcard now in the sidebar');
    await expect(await page.locator('#claim-hint [data-action="untrack"]').count() === 1, 'Stop tracking offered next to the claim status');
    log('Set claim status to Applied (tracked automatically)');
    await page.click('#tab-apply');
    await page.locator('#tp-apply input[data-action="step"]').first().check();
    await waitFor(() => /^1 of/.test(document.getElementById('steps-count').textContent), null, 'step ticked');
    log('Ticked a step: ' + (await text('#steps-count')));
    await page.click(phone ? '#bp-back' : '#bp-x');
    await route('#/benefits', 'back to the list');

    /* A visa-blocked public fund: no Apply button, no claim status, no Track */
    await page.evaluate(() => { location.hash = '#/benefit/universal-credit'; });
    await route('#/benefit/universal-credit', 'blocked detail');
    const bl = await page.evaluate(() => ({
      banner: document.querySelector('.bp .banner-quiet') ? document.querySelector('.bp .banner-quiet').innerText : '',
      primary: !!document.querySelector('.bp-actions .btn-primary'),
      claim: !!document.getElementById('claim-sec'),
      track: !!document.querySelector('.bp-actions [data-action="track"]'),
      official: document.querySelector('.bp-actions .bp-official') ? document.querySelector('.bp-actions .bp-official').innerText.trim() : '',
    }));
    await expect(/Not open to you now/.test(bl.banner) && !bl.primary && !bl.claim && !bl.track && /Read the official page/.test(bl.official), 'blocked detail is quiet ' + JSON.stringify(bl));
    await shot('detail-blocked');
    log('Blocked public fund: banner, "Read the official page" only, no claim status or Track');

    /* Extra large text on a phone: the detail fits the screen */
    if (phone) {
      await page.evaluate(() => { window.DUSK.setText('xlarge'); });
      await page.evaluate(() => { location.hash = '#/benefit/uni-hardship-fund'; });
      await route('#/benefit/uni-hardship-fund', 'xlarge detail');
      const fit = await page.evaluate(() => {
        const sc = document.getElementById('bp-scroll');
        const els = [...document.querySelectorAll('.bp-bar, .bp-head, .banner, .bp-worth, .tabs, .bp-actions')].map(e => e.getBoundingClientRect());
        return { sw: sc.scrollWidth, cw: sc.clientWidth, maxRight: Math.max(...els.map(r => r.right)), minLeft: Math.min(...els.map(r => r.left)), vw: innerWidth };
      });
      await expect(fit.sw <= fit.cw + 1 && fit.maxRight <= fit.vw + 1 && fit.minLeft >= -1, 'xlarge detail fits the phone ' + JSON.stringify(fit));
      await shot('detail-xlarge');
      await page.evaluate(() => { window.DUSK.setText('normal'); });
      log('Extra large text: detail fits (' + fit.sw + ' <= ' + fit.cw + ')');
      await page.evaluate(() => { location.hash = '#/benefits'; });
      await route('#/benefits', 'back to the list');
    }

    /* Community */
    await nav('community');
    await expect((await page.innerText('body')).includes('Examples'), 'examples label');
    await expect((await page.innerText('body')).includes(disc), 'disclaimer on community');
    await expect(await page.evaluate(() => document.getElementById('cm-form').hidden), 'the post form starts closed, posts first');
    await page.click('#cm-write');
    await page.fill('#cm-text', 'My railcard came the same day. Have your passport ready.');
    await page.selectOption('#cm-benefit', 'railcard-16-25');
    await page.click('#cm-post');
    await waitFor(() => document.querySelector('.feed .post') && document.querySelector('.feed .post').innerText.includes('Have your passport ready'), null, 'new post first');
    log('Opened the form and posted');
    await page.click('#cm-cbtn-p1');
    await page.fill('#cm-in-p1', 'Thank you, this helped me.');
    await page.locator('#cm-c-p1 .comment-form button[type="submit"]').click();
    await waitFor(() => document.getElementById('cm-c-p1').innerText.includes('this helped me'), null, 'comment added');
    log('Commented on a post');
    if (!phone) await expect(await page.evaluate(() => !document.getElementById('cm-ratings').hasAttribute('role')), 'no tab roles on desktop, where there are no tabs');
    if (phone) await page.click('#cm-tab-ratings');
    await page.click('#rate-open');
    await waitFor(() => document.querySelector('dialog.dlg-rate[open]'), null, 'rating dialog');
    await page.selectOption('#rate-benefit', 'railcard-16-25');
    await page.click('label[for="rate-worth-0"]');
    await page.click('label[for="rate-speed-0"]');
    await page.click('label[for="rate-ease-1"]');
    await shot('rate');
    await page.click('#rate-save');
    await waitFor(() => !document.querySelector('dialog[open]') && document.getElementById('rt-list').innerText.includes('You said: very worth it, quick, OK.'), null, 'rating saved');
    await expect(!/\d\s*\/\s*5|★/.test(await page.innerText('#rt-list')), 'no marks out of five');
    await shot('community');
    log('Rated a benefit with words');

    /* Settings from the sidebar */
    await nav('settings');
    await expect(await page.evaluate(() => document.getElementById('nav-settings').getAttribute('aria-current') === 'page'), 'Settings marked as the current page');
    await expect(!(await page.innerText('#st-safety')).includes('Free to call'), 'no "Free to call" claim');
    const sw = await page.evaluate(() => document.getElementById('ra-switch').getBoundingClientRect().height);
    await expect(sw >= 44, 'read aloud switch is at least 44px tall (' + sw + ')');
    await page.click('label[for="theme-daylight"]');
    await waitFor(() => document.documentElement.getAttribute('data-theme') === 'daylight', null, 'theme changed');
    log('Theme changed to Daylight');
    await page.click('label[for="ts-xlarge"]');
    await waitFor(() => document.documentElement.style.fontSize === '125%', null, 'text size extra large');
    await shot('settings-xlarge');
    await page.click('label[for="ts-normal"]');
    await waitFor(() => document.documentElement.style.fontSize === '100%', null, 'text size normal');
    log('Text size changed to Extra large and back');
    await page.selectOption('#st-lang', 'ar');
    await waitFor(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'ar', null, 'Arabic, right to left');
    await expect((await text('#page-title')) === 'الإعدادات', 'Settings title in Arabic');
    await shot('settings-ar');
    await page.selectOption('#st-lang', 'en');
    await waitFor(() => document.documentElement.dir === 'ltr' && document.documentElement.lang === 'en', null, 'back to English');
    log('Language to Arabic and back');
    const before = await page.evaluate(() => window.DUSK.match().open.length);
    await page.click('#dbtn-status');
    await page.click('label[for="st-status-refugee"]');
    await page.click('#dsave-status');
    await waitFor(b => window.DUSK.match().open.length !== b, before, 'match re-runs');
    const after = await page.evaluate(() => window.DUSK.match().open.length);
    await expect((await text('#st-result')).includes(String(after)), 'settings shows the new count');
    log(`Status changed to refugee: ${before} -> ${after} schemes`);
    await nav('benefits');
    await expect((await text('#bf-title')).includes('refugee status'), 'Benefits header follows the new status');
    await expect((await text('#bf-title')).includes(String(after)), 'Benefits count follows the new status');
    log('Benefits changed: ' + (await text('#bf-title')));

    /* Untrack from the sidebar */
    await openDrawer();
    const firstTrk = page.locator('.trk-head').first();
    const firstId = await firstTrk.getAttribute('data-bid');
    if ((await firstTrk.getAttribute('aria-expanded')) !== 'true') await firstTrk.click();
    await page.click(`#trk-body-${firstId} [data-action="untrack"]`);
    await waitFor(id => !window.DUSK.isTracked(id), firstId, 'stopped tracking');
    await expect(await page.evaluate(() => !!document.activeElement && document.getElementById('sidebar').contains(document.activeElement)), 'focus stays in the sidebar');
    await closeDrawer();
    log('Stopped tracking ' + firstId + ' from the sidebar');

    /* Delete account */
    await page.click('#avatar-btn');
    await page.click('#avatar-menu a[href="#/settings"]');
    await route('#/settings', 'settings again');
    await page.click('#st-delete');
    await waitFor(() => document.querySelector('dialog[open] #confirm-yes'), null, 'confirm dialog');
    await page.click('#confirm-yes');
    await route('#/register', 'back on Register');
    await expect((await text('h1')).includes('Create account'), 'Register heading after delete');
    const stored = await page.evaluate(() => { try { return localStorage.getItem('landit-b:state'); } catch (e) { return null; } });
    await expect(!stored || JSON.parse(stored).user === null, 'local state cleared');
    await expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'daylight'), 'colours kept after delete');
    log('Deleted the account and landed on Register (colours kept)');
    await expect(errors.length === 0, 'no console errors');
    console.log(`PASS ${size}: ${step} steps`);
  } catch (e) {
    failures++;
    console.log(`FAIL ${size}: ${e.message}`);
    await shot('failure').catch(() => {});
  } finally {
    await browser.close();
  }
}

for (const s of sizes) await run(s);
process.exit(failures ? 1 : 0);

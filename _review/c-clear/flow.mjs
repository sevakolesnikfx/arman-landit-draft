#!/usr/bin/env node
/* Design C (Big and clear): full click-through, at phone and desktop size.
   ?reset=1 -> register -> questions (answer some, skip one) -> disclaimer
   -> chat (type, tap a suggestion, track from a chat card) -> sidebar or
   drawer shows it -> expand, tick a document -> benefits (filter, sort)
   -> detail -> share (link visible) -> claim status -> community (post,
   comment, rate) -> settings (theme, text size, Arabic and back, change
   the visa answer and see Benefits change) -> delete account -> Register.
   Then round 2 checks, one block per review finding fixed in round 2
   (starters on screen, disclaimer placement, queued questions, blocked
   cards, focus not hidden, public funds wording, tiles and rows with the
   certainty API, detail headings, dialogs, community filter and ties,
   Settings naming, fresh account, Arabic isolation, Extra large).
   Fails on any console error or page error.
   Usage: node _review/c-clear/flow.mjs [phone|desktop] */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'module';

const require = createRequire('/Users/armanbayatmaku/Desktop/kasdena/websites/landit/package.json');
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, '..', '..', 'c-clear');
const BASE = pathToFileURL(path.join(DIR, 'index.html')).href;
const SIZES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const only = process.argv[2];

function assert(cond, msg) { if (!cond) throw new Error('Assertion failed: ' + msg); }

async function run(sizeName) {
  const phone = sizeName === 'phone';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext(SIZES[sizeName]);
  const page = await context.newPage();
  const problems = [];
  page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', e => problems.push('page: ' + e.message));
  const log = s => console.log(`  [${sizeName}] ${s}`);
  const hash = () => page.evaluate(() => location.hash);
  const waitHash = async (h) => {
    await page.waitForFunction(x => location.hash === x && '#/' + document.documentElement.getAttribute('data-route') === x, h, { timeout: 5000 });
  };
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('landit-c:state') || 'null'));

  async function nav(where) {
    if (phone) {
      const label = { chat: 'Chat', benefits: 'Benefits', community: 'Community', settings: 'Settings' }[where];
      await page.locator('.tabbar a', { hasText: label }).click();
    } else if (where === 'settings') {
      await page.locator('.side-me').click();
    } else {
      const label = { chat: 'Chat', benefits: 'Benefits', community: 'Community' }[where];
      await page.locator('.side-nav a', { hasText: label }).click();
    }
    await waitHash('#/' + where);
  }
  async function openApps() {
    if (!phone) return;
    const btn = page.locator('button[aria-label*="applications"]').first();
    await btn.click();
    await page.waitForSelector('.shell.drawer-open');
    assert(await btn.getAttribute('aria-expanded') === 'true', 'drawer button aria-expanded is true');
  }
  async function closeApps() {
    if (!phone) return;
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.shell.drawer-open'));
  }
  async function botCount() { return page.locator('.msg-bot').count(); }
  async function waitBots(n) { await page.waitForFunction(x => document.querySelectorAll('.msg-bot').length >= x, n, { timeout: 6000 }); }

  /* 1. Register */
  await page.goto(BASE + '?reset=1', { waitUntil: 'networkidle' });
  await waitHash('#/register');
  assert(await page.locator('.auth-title').innerText() === 'Know what you need.', 'tagline shown');
  assert(await page.locator('.free-label').first().isVisible(), 'free label shown');
  await page.fill('#f-name', 'Test Person');
  await page.fill('#f-email', 'test@example.com');
  await page.fill('#f-pass', 'anything');
  await page.click('[data-action="toggle-pass"]');
  assert(await page.getAttribute('#f-pass', 'type') === 'text', 'show password works');
  await page.click('#auth-form button[type="submit"]');
  await waitHash('#/questions');
  log('registered');

  /* 2. Questions: answer status, nation, study; skip work; then skip all */
  await page.locator('label.opt', { hasText: 'Student visa' }).click();
  await page.click('#q-form button[type="submit"]');
  await waitHash('#/questions/2');
  await page.locator('label.opt', { hasText: 'England' }).click();
  await page.click('#q-form button[type="submit"]');
  await waitHash('#/questions/3');
  assert((await page.locator('.q-count').innerText()).includes('3 of 7'), 'question counter');
  await page.locator('#q-form [data-action="q-skip"]').click();
  await waitHash('#/questions/4');
  await page.locator('label.opt', { hasText: 'Yes, full time' }).click();
  await page.click('#q-form button[type="submit"]');
  await waitHash('#/questions/5');
  await page.locator('.q-skiprow [data-action="q-skip-all"]').click();
  await waitHash('#/ack');
  let st = await state();
  assert(st.profile.status === 'student' && st.profile.nation === 'England' && st.profile.study === 'full_time' && !st.profile.work, 'answers saved, skipped one empty');
  log('questions answered (one skipped, then skip all)');

  /* 3. Disclaimer */
  const disc = await page.evaluate(() => window.LANDIT.disclaimer);
  assert((await page.locator('.ack-text').innerText()) === disc, 'disclaimer on ack');
  await page.click('[data-action="ack"]');
  await waitHash('#/chat');
  log('disclaimer acknowledged');

  /* 4. Chat */
  assert((await page.locator('.hello-h').innerText()).includes('Test Person'), 'greeting uses the name');
  assert((await page.locator('.starter').count()) === 4, 'four starters');
  assert((await page.locator('body').innerText()).includes(disc), 'disclaimer under the composer');
  await page.fill('#chat-input', 'What can I claim?');
  await page.click('.send-btn');
  await waitBots(1);
  assert((await page.locator('.msg-bot').last().innerText()).toLowerCase().includes('you may be able to get'), 'typed question answered');
  assert(await page.locator('.msg-bot').last().locator('.read-btn').count() === 1, 'read aloud button on reply');
  await page.locator('.suggest').last().locator('.suggest-btn').first().click();
  await waitBots(2);
  log('typed a message and tapped a suggested reply');
  await page.fill('#chat-input', 'Tell me about the railcard');
  await page.keyboard.press('Enter');
  await waitBots(3);
  const card = page.locator('.msg-bot').last().locator('.ccard', { hasText: '16-25 Railcard' });
  assert(await card.count() === 1, 'railcard card in reply');
  await card.locator('[data-action="track"]').click();
  assert(await card.locator('[data-action="track"]').getAttribute('aria-pressed') === 'true', 'track pressed');
  st = await state();
  assert(st.tracked.some(t => t.id === 'railcard-16-25'), 'railcard tracked in state');
  log('tracked a benefit from a chat card');

  /* 5. Sidebar or drawer shows it; expand and tick a document */
  await openApps();
  const item = page.locator('.app-item[data-app="railcard-16-25"]');
  assert(await item.isVisible(), 'tracked item visible in ' + (phone ? 'drawer' : 'sidebar'));
  const toggle = item.locator('.app-toggle');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  assert(await toggle.getAttribute('aria-expanded') === 'true', 'row expanded');
  const firstTick = item.locator('.app-body label.tick').first();
  await firstTick.click();
  assert(await item.locator('.app-body input[type="checkbox"]').first().isChecked(), 'document ticked');
  assert((await item.locator('.app-count').innerText()).startsWith('1 of'), 'count updated');
  assert((await item.locator('.tick-group legend').count()) >= 1, 'documents grouped');
  st = await state();
  assert((st.docTicks['railcard-16-25'] || []).length === 1, 'tick saved');
  await closeApps();
  log('expanded the tracked row and ticked a document');

  /* 6. Benefits: header, filter by category, sort, open a detail */
  await nav('benefits');
  const head1 = await page.locator('.ben-head h1').innerText();
  const n1 = parseInt(head1.match(/(\d+)/)[1], 10);
  assert(n1 > 0 && /You may be able to get/.test(head1), 'benefits header');
  assert((await page.locator('.total-label').innerText()).includes('Potential, if all approved'), 'total labelled');
  await page.locator('a.tile', { hasText: 'Transport' }).click();
  await waitHash('#/benefits/transport');
  const cats = await page.locator('.rows .b-row').evaluateAll(els => els.map(e => e.getAttribute('data-cat')));
  assert(cats.length > 0 && cats.every(c => c === 'transport'), 'filter by category');
  await page.click('[data-action="sort"][data-key="time"]');
  assert(await page.getAttribute('[data-action="sort"][data-key="time"]', 'aria-pressed') === 'true', 'sort Quickest pressed');
  await page.click('[data-action="sort"][data-key="easy"]');
  assert(await page.getAttribute('[data-action="sort"][data-key="easy"]', 'aria-pressed') === 'true', 'sort Easiest pressed');
  await page.click('[data-action="sort"][data-key="az"]');
  const names = await page.locator('.rows .b-name').allInnerTexts();
  const sorted = names.slice().sort((a, b) => a.localeCompare(b, 'en-GB'));
  assert(JSON.stringify(names) === JSON.stringify(sorted), 'A to Z order');
  await page.click('[data-action="sort"][data-key="value"]');
  await page.selectOption('#cat-select', 'all');
  await waitHash('#/benefits/all');
  assert((await page.locator('.rows .b-row').count()) === n1, 'all benefits listed');
  await page.selectOption('#cat-select', 'transport');
  await waitHash('#/benefits/transport');
  await page.locator('.b-row', { hasText: '16-25 Railcard' }).locator('a.b-name').click();
  await waitHash('#/benefit/railcard-16-25');
  log('filtered, sorted and opened a detail');

  /* 7. Detail: share, claim status */
  assert((await page.locator('body').innerText()).includes(disc), 'disclaimer on detail');
  assert(await page.locator('.summary .sum-cell').count() === 3, 'summary card');
  assert(await page.locator('a', { hasText: 'Apply on the official website' }).getAttribute('rel') === 'noopener', 'apply link rel');
  await page.click('.detail-actions [data-action="share"]');
  await page.waitForSelector('dialog.dlg[open]');
  const link = await page.inputValue('#share-link');
  assert(link === 'https://landit-uk.com/railcard-16-25/', 'share link ' + link);
  assert(await page.locator('#share-link').isVisible(), 'share link visible');
  await page.click('[data-share-copy]');
  await page.waitForFunction(() => /copied|copy it/i.test(document.getElementById('toast').textContent), null, { timeout: 3000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog.dlg'));
  log('shared (link visible, copied)');
  await page.locator('label.claim-opt', { hasText: 'Applied' }).click();
  await page.waitForFunction(() => document.getElementById('claim-saved').textContent.length > 0);
  st = await state();
  assert(st.tracked.find(t => t.id === 'railcard-16-25').status === 'Applied', 'claim status saved');
  await openApps();
  assert((await page.locator('.app-item[data-app="railcard-16-25"] .pill').innerText()).includes('Applied'), 'sidebar shows status');
  await closeApps();
  const steps = page.locator('.steps label.step-label');
  if (await steps.count()) {
    await steps.first().click();
    assert((await page.locator('#steps-count').innerText()).startsWith('1 of'), 'step ticked');
  }
  log('set the claim status to Applied and ticked a step');

  /* 8. Community: post, comment, rate */
  await nav('community');
  assert((await page.locator('body').innerText()).includes(disc), 'disclaimer on community');
  assert(await page.locator('.sample-tag', { hasText: 'Sample posts' }).isVisible(), 'sample label');
  await page.click('[data-action="write-post"]');
  await page.waitForSelector('#post-form');
  await page.selectOption('#post-benefit', 'railcard-16-25');
  await page.fill('#post-title', 'My railcard');
  await page.fill('#post-body', 'I applied online with my passport. It took ten minutes.');
  await page.click('#post-form button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('dialog.dlg'));
  const firstPost = page.locator('.posts .post').first();
  assert((await firstPost.innerText()).includes('I applied online with my passport'), 'post shown first');
  assert((await firstPost.innerText()).includes('Your post'), 'post marked as mine');
  await firstPost.locator('[data-action="reply-toggle"]').click();
  await firstPost.locator('textarea').fill('Thank you, this helps.');
  await firstPost.locator('.reply-form button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('.posts .post .reply-body') && document.querySelector('.posts .post').innerText.includes('Thank you, this helps.'));
  log('wrote a post and a reply');
  await page.locator('.segnav a', { hasText: 'How people rated it' }).click();
  await waitHash('#/community/ratings');
  await page.click('.comm-main');
  await page.waitForSelector('#rate-form');
  await page.selectOption('#rate-benefit', 'railcard-16-25');
  await page.locator('label.word-opt', { hasText: 'Very' }).click();
  await page.locator('label.word-opt', { hasText: 'Quick' }).click();
  await page.locator('label.word-opt', { hasText: 'Easy' }).click();
  await page.click('#rate-form button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('dialog.dlg'));
  const rc = page.locator('.rate-card', { hasText: '16-25 Railcard' });
  assert((await rc.innerText()).includes('You rated it too'), 'rating saved');
  assert(!/\b\d+\s*\/\s*\d+\b|out of/i.test(await rc.innerText()), 'no numeric scores');
  log('rated a benefit in words');

  /* 9. Settings */
  await nav('settings');
  await page.locator('label.theme-opt[for="theme-warm"]').click();
  assert(await page.getAttribute('html', 'data-theme') === 'warm', 'theme changed');
  await page.locator('label.size-opt[for="size-large"]').click();
  assert(await page.getAttribute('html', 'data-text') === 'large', 'text size changed');
  const fs = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  assert(fs >= 19.9, 'root font size scaled ' + fs);
  await page.locator('label.lang-opt[for="lang-ar"]').click();
  await page.waitForFunction(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'ar');
  assert((await page.locator('#s-lang').innerText()).includes('اللغة'), 'translated heading in Arabic');
  await page.locator('label.lang-opt[for="lang-en"]').click();
  await page.waitForFunction(() => document.documentElement.dir === 'ltr' && document.documentElement.lang === 'en');
  log('changed theme, text size, language to Arabic and back');
  await page.locator('.set-list a[href="#/settings/answer/status"]').click();
  await waitHash('#/settings/answer/status');
  await page.locator('label.opt', { hasText: 'Refugee or humanitarian protection' }).click();
  await page.click('#ans-form button[type="submit"]');
  await waitHash('#/settings');
  assert((await page.locator('.set-list').innerText()).includes('Refugee or humanitarian protection'), 'answer shown in settings');
  await nav('benefits');
  const head2 = await page.locator('.ben-head h1').innerText();
  const n2 = parseInt(head2.match(/(\d+)/)[1], 10);
  assert(n2 !== n1, `benefits changed after editing status (${n1} to ${n2})`);
  assert((await page.locator('.eyebrow').innerText()).includes('refugee'), 'status phrase updated');
  log(`edited the visa answer: Benefits went from ${n1} to ${n2}`);

  /* 10. Delete account */
  await nav('settings');
  await page.click('[data-action="delete-account"]');
  await page.waitForSelector('dialog.dlg[open]');
  await page.click('[data-confirm-delete]');
  await waitHash('#/register');
  st = await state();
  assert(!st || (!st.user && !st.signedIn && !st.tracked.length && !st.posts.length), 'state cleared');
  assert(await page.locator('#f-name').isVisible(), 'back on Register');
  assert(await page.getAttribute('html', 'data-theme') === 'clear', 'theme back to default');
  log('deleted the account and landed on Register');

  await browser.close();
  if (problems.length) throw new Error('Console or page errors:\n' + problems.join('\n'));
}

/* ------------------------------------------------------------------ */
/* Round 2 checks: one block per review finding that was fixed.         */
/* Each block starts from a fresh demo (or reset) so they stay separate. */
/* ------------------------------------------------------------------ */
async function extras(sizeName) {
  const phone = sizeName === 'phone';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const problems = [];
  const log = s => console.log(`  [${sizeName}] ${s}`);
  async function fresh(query, hashPath, extraOpts) {
    const context = await browser.newContext(Object.assign({}, SIZES[sizeName], extraOpts || {}));
    const page = await context.newPage();
    page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
    page.on('pageerror', e => problems.push('page: ' + e.message));
    await page.goto(BASE + '?' + query + '#' + hashPath, { waitUntil: 'load' });
    await page.waitForFunction(h => '#/' + document.documentElement.getAttribute('data-route') === h || location.hash !== h, hashPath, { timeout: 5000 });
    await page.waitForTimeout(150);
    return { page, context };
  }
  const go = async (page, h) => {
    await page.evaluate(x => { location.hash = x; }, h);
    await page.waitForFunction(x => location.hash === x && '#/' + document.documentElement.getAttribute('data-route') === x, h, { timeout: 5000 });
    await page.waitForTimeout(100);
  };
  const state = page => page.evaluate(() => JSON.parse(localStorage.getItem('landit-c:state') || 'null'));
  const rendered = (page, route) => page.waitForFunction(r => document.documentElement.getAttribute('data-route') === r, route, { timeout: 5000 });
  const bodyText = page => page.locator('body').innerText();
  const waitBots = (page, n) => page.waitForFunction(x => document.querySelectorAll('.msg-bot').length >= x, n, { timeout: 8000 });
  const ask = async (page, text) => {
    const n = await page.locator('.msg-bot').count();
    await page.fill('#chat-input', text);
    await page.click('.send-btn');
    await waitBots(page, n + 1);
    await page.waitForTimeout(150);
    return page.locator('.msg-bot').last();
  };
  let { page, context } = await fresh('demo=1', '/chat');
  const disc = await page.evaluate(() => window.LANDIT.disclaimer);

  /* Empty chat: starters on the first screen (phone: above the tab bar) */
  const firstStarter = await page.evaluate(() => {
    const s = document.querySelector('.starter').getBoundingClientRect();
    const bar = document.querySelector('.tabbar');
    const limit = bar && bar.getBoundingClientRect().height ? bar.getBoundingClientRect().top : innerHeight;
    return { bottom: s.bottom, limit };
  });
  assert(firstStarter.bottom <= firstStarter.limit, `first starter on the first screen (${Math.round(firstStarter.bottom)} <= ${Math.round(firstStarter.limit)})`);
  assert((await bodyText(page)).includes(disc), 'disclaimer on empty chat');
  log('empty chat: first starter visible on the first screen');

  /* Reply with cards: the disclaimer is on screen (desktop: docked under the box; phone: under the reply) */
  await page.evaluate(() => { document.getElementById('listen-status').textContent = 'Done. Check the words, then press Send.'; });
  const r1 = await ask(page, 'What can I claim?');
  assert((await page.locator('#listen-status').innerText()).trim() === '', 'voice typing status cleared after Send');
  if (phone) {
    assert((await r1.locator('.msg-disclaimer').innerText()) === disc, 'reply with cards carries the disclaimer (phone)');
  } else {
    const vis = await page.evaluate(() => { const d = document.querySelector('.chat > .composer-wrap .composer-disclaimer').getBoundingClientRect(); return d.top >= 0 && d.bottom <= innerHeight; });
    assert(vis, 'docked disclaimer visible under the chat box (desktop)');
  }
  /* Top pick: a confirmed scheme comes before a possible one */
  const picks = await r1.locator('.ccard').evaluateAll(els => els.map(e => e.querySelector('.fit-tag') ? 'possible' : 'confirmed'));
  const firstPossible = picks.indexOf('possible');
  assert(firstPossible < 0 || picks.slice(firstPossible).every(x => x === 'possible'), 'chat cards: confirmed before possible (' + picks.join(',') + ')');
  log('reply: disclaimer on screen, voice status cleared, picks ' + picks.join(', '));

  /* A question sent while Landit is still writing is kept and answered */
  const before = (await state(page)).chat.length;
  await page.fill('#chat-input', 'Help with bills');
  await page.click('.send-btn');
  await page.fill('#chat-input', 'Help with travel costs');
  await page.keyboard.press('Enter');
  assert((await page.inputValue('#chat-input')) === '', 'queued question leaves the box');
  await page.waitForFunction(n => JSON.parse(localStorage.getItem('landit-c:state')).chat.length >= n + 4, before, { timeout: 10000 });
  const mine = (await state(page)).chat.filter(m => m.who === 'me').map(m => m.text);
  assert(mine.includes('Help with travel costs'), 'queued question answered');
  log('a question sent while Landit was writing was kept and answered');

  /* Visa-blocked scheme in chat: neutral chip, no Track */
  const ucReply = await ask(page, 'universal credit');
  const uc = ucReply.locator('.ccard', { hasText: 'Universal Credit' });
  assert(await uc.count() === 1, 'Universal Credit card');
  assert((await uc.locator('.state-chip').innerText()).includes('Not open to you now'), 'blocked card says Not open to you now');
  assert(await uc.locator('[data-action="track"]').count() === 0, 'blocked card has no Track');
  log('blocked scheme card: "Not open to you now", no Track button');

  /* Tracking reply: a button opens My applications */
  const tr = await ask(page, 'How does tracking work?');
  await tr.locator('[data-action="show-apps"]').click();
  if (phone) {
    await page.waitForSelector('.shell.drawer-open');
    const side = await page.locator('#sidebar').innerText();
    assert(side.includes(disc), 'drawer carries the disclaimer');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.shell.drawer-open'));
  } else {
    assert(await page.evaluate(() => !!document.activeElement.closest('.side-apps')), 'focus moved to My applications');
  }
  log('"Open My applications" works from the tracking reply');

  /* Focus is never fully hidden under the docked chat box or the bars */
  const obscured = async (label, presses) => {
    let worst = 0, worstName = '';
    for (let i = 0; i < presses; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(20);
      const r = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        if (el.closest('.tabbar, .topbar, .composer, #sidebar, dialog, .skip-link')) return null;
        const b = el.getBoundingClientRect();
        if (!b.height) return null;
        let top = 0, bottom = innerHeight;
        const tb = document.querySelector('.topbar'); if (tb && tb.getBoundingClientRect().height) top = Math.max(top, tb.getBoundingClientRect().bottom);
        const bar = document.querySelector('.tabbar'); if (bar && bar.getBoundingClientRect().height) bottom = Math.min(bottom, bar.getBoundingClientRect().top);
        const dock = document.querySelector('.chat:not(.is-empty) .composer');
        if (dock && getComputedStyle(dock).position === 'sticky') bottom = Math.min(bottom, dock.getBoundingClientRect().top);
        const wrap = document.querySelector('.chat:not(.is-empty) > .composer-wrap');
        if (wrap && getComputedStyle(wrap).position === 'sticky' && wrap.getBoundingClientRect().height) bottom = Math.min(bottom, wrap.getBoundingClientRect().top);
        const vis = Math.max(0, Math.min(b.bottom, bottom) - Math.max(b.top, top));
        return { hidden: 1 - vis / b.height, name: (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40) + ` [${Math.round(b.top)}-${Math.round(b.bottom)} in ${Math.round(top)}-${Math.round(bottom)} y${Math.round(scrollY)}]` };
      });
      if (r && r.hidden > worst) { worst = r.hidden; worstName = r.name; }
    }
    assert(worst < 1, `${label}: a focused control was fully hidden (${worstName})`);
    return Math.round(worst * 100) + '%' + (worstName ? ' (' + worstName + ')' : '');
  };
  await page.evaluate(() => window.scrollTo(0, 0));
  const chatObs = await obscured('chat', 45);
  await go(page, '#/benefits/all');
  const listObs = await obscured('benefits list', 60);
  await go(page, '#/settings');
  const setObs = await obscured('settings', 40);
  log(`focus never fully hidden: worst covered chat ${chatObs}, list ${listObs}, settings ${setObs}`);

  /* Benefits header: the real split of blocked schemes */
  await go(page, '#/benefits');
  const m = await page.evaluate(() => { const m = window.LANDIT.match(window.LC.state.profile); return { open: m.open.length, blocked: m.blocked.length, pf: m.blocked.filter(x => x.kind === 'public-fund').length, need: m.blocked.filter(x => x.kind === 'needs-public-fund').length }; });
  const note = await page.locator('.head-note').innerText();
  assert(note.includes(`${m.blocked} benefits are not open to you`) && note.includes(`${m.open} benefits below`) && !/public-funds schemes/.test(note), 'header note uses the real numbers: ' + note);
  await page.click('.blocked-btn');
  const panel = await page.locator('.blocked-panel').innerText();
  assert(panel.includes(`Public funds (${m.pf})`) && panel.includes(`Need a public fund to qualify (${m.need})`), 'blocked groups counted');
  assert(!/These are public funds \(paragraph/.test(panel), 'no "These are public funds" over the whole panel');
  const linkH = await page.locator('.blocked-link').first().evaluate(e => e.getBoundingClientRect().height);
  assert(linkH >= 44, 'blocked items are big links (' + linkH + 'px)');
  log(`header: ${m.blocked} not open (${m.pf} public funds, ${m.need} need one), ${m.open} open; blocked items ${Math.round(linkH)}px tall`);

  /* Tiles: the headline amount is picked with rankForHighlights */
  const tilesOk = await page.evaluate(() => {
    const L = window.LANDIT, m = L.match(window.LC.state.profile), bad = [];
    document.querySelectorAll('.tiles a.tile[href^="#/benefits/"]:not(.tile-all)').forEach(a => {
      const k = a.getAttribute('href').split('/').pop();
      const list = L.sortBenefits(m.open.filter(b => b.category === k), 'value').filter(b => typeof b.value === 'number');
      const pick = L.rankForHighlights(list, m.fit)[0];
      const amt = a.querySelector('.tile-val .val-amt');
      if (!pick) { if (amt) bad.push(k + ' shows an amount'); return; }
      if (!amt || amt.textContent !== L.formatMoney(pick.value)) bad.push(k + ' amount');
      const tag = !!a.querySelector('.tile-fit');
      if (tag !== (m.fit[pick.id] === 'possible')) bad.push(k + ' fit tag');
    });
    return bad;
  });
  assert(!tilesOk.length, 'tiles: ' + tilesOk.join(', '));
  log('tiles: headline amounts ranked confirmed first, possible ones tagged');

  /* Rows: possible tag on exactly the possible schemes, named buttons */
  await go(page, '#/benefits/all');
  const rowsOk = await page.evaluate(() => {
    const L = window.LANDIT, m = L.match(window.LC.state.profile), bad = [];
    document.querySelectorAll('.b-row').forEach(r => {
      const id = r.querySelector('a.b-name').getAttribute('href').split('/').pop();
      if (!!r.querySelector('.fit-tag') !== (m.fit[id] === 'possible')) bad.push(id);
      const t = r.querySelector('[data-action="track"]');
      if (!t.textContent.includes(L.benefitById(id).name)) bad.push(id + ' track name');
    });
    return { bad, n: document.querySelectorAll('.b-row').length, heads: [...document.querySelectorAll('.rows-h')].map(h => h.textContent) };
  });
  assert(!rowsOk.bad.length, 'rows: ' + rowsOk.bad.slice(0, 5).join(', '));
  assert(rowsOk.n === m.open, 'all rows listed');
  log(`rows: ${rowsOk.n} rows, possible tag correct, Track named per benefit, group "${rowsOk.heads.join('; ')}"`);

  /* Untrack keeps the claim status */
  let st0 = await state(page);
  assert(st0.tracked.find(t => t.id === 'uni-hardship-fund').status === 'Applied', 'demo status Applied');
  const uhf = page.locator('.b-row', { hasText: 'University hardship fund' }).locator('[data-action="track"]');
  await uhf.click();
  assert(!(await state(page)).tracked.some(t => t.id === 'uni-hardship-fund'), 'untracked');
  await uhf.click();
  assert((await state(page)).tracked.find(t => t.id === 'uni-hardship-fund').status === 'Applied', 'status back after tracking again');
  log('untrack then track again: claim status "Applied" kept');

  /* Detail pages: value heading, public funds line, blocked state, empty cells */
  await go(page, '#/benefit/council-tax-student');
  assert((await page.locator('.sum-worth .sum-k').innerText()).trim() === 'Could be worth', 'amount heading');
  assert(await page.locator('.detail-head .fit-tag').count() === 1, 'possible tag on detail');
  await go(page, '#/benefit/marriage-allowance');
  const maTxt = await page.locator('.sum-worth').innerText();
  assert(!/Could be worth[\s\S]*Could be worth/.test(maTxt), 'no doubled "Could be worth"');
  await go(page, '#/benefit/community-fibre-essential');
  assert((await page.locator('.sum-worth .sum-k').innerText()).trim() === 'What it offers', 'label heading');
  await go(page, '#/benefit/warm-home-discount');
  let t = await bodyText(page);
  assert(t.includes('Not open to you now') && !/condition does not apply|rule does not stop it/.test(t), 'needs-public-fund page does not contradict itself');
  await go(page, '#/benefit/universal-credit');
  assert(await page.locator('.apply-wrap .btn-primary').count() === 0, 'blocked: no primary Apply');
  assert(!(await page.locator('.track-big').getAttribute('class')).includes('btn-primary'), 'blocked: Track is secondary');
  assert(await page.locator('.rules .ic').count() === 0 && await page.locator('.rules .rule-dot').count() > 0, 'rules use neutral bullets');
  await go(page, '#/benefit/public-libraries');
  assert(await page.locator('.summary .sum-cell').count() === 0 && await page.locator('.sum-empty').count() === 1, 'no grid of empty cells');
  log('detail: headings fit the value, no contradictions, blocked page invites no application, empty cells folded');

  /* Share and Rate dialogs carry the disclaimer; Rate focuses its first answer */
  await go(page, '#/benefit/council-tax-student');
  await page.click('.detail-actions [data-action="share"]');
  await page.waitForSelector('dialog.dlg[open]');
  assert((await page.locator('dialog.dlg').innerText()).includes(disc), 'share dialog disclaimer');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog.dlg'));
  await page.click('.d-row-btns [data-action="rate"]');
  await page.waitForSelector('dialog.dlg[open]');
  assert((await page.locator('dialog.dlg').innerText()).includes(disc), 'rate dialog disclaimer');
  assert(await page.evaluate(() => document.activeElement.type === 'radio'), 'rate dialog focuses the first answer');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog.dlg'));
  log('share and rate dialogs: disclaimer shown; rate focuses its first answer');

  /* Community: "Read posts" from a benefit is a filter for that visit only; ties are split */
  await page.locator('a[href="#/community/about/council-tax-student"]').click();
  await page.waitForFunction(() => document.documentElement.getAttribute('data-route') === 'community/about/council-tax-student');
  const nAbout = await page.locator('.posts .post').count();
  await go(page, '#/chat');
  await go(page, '#/community');
  const nAll = await page.locator('.posts .post').count();
  assert(nAbout === 1 && nAll > nAbout, `community filter not kept (${nAbout} then ${nAll})`);
  await go(page, '#/community/ratings');
  const gp = await page.locator('.rate-card', { hasText: 'GP registration' }).innerText();
  assert(/Opinions are split/.test(gp), 'tie shown as split');
  assert(/Up to \d+ people rated it/.test(gp), 'header says Up to when a question has fewer answers');
  assert(await page.locator('.rate-card h2 .rate-name').count() > 0, 'rated benefit names are headings');
  log('community: about-filter not kept, ties split, "Up to N people"');

  /* Settings: the word the chat uses; Read aloud switch has a name; answers show the disclaimer */
  if (phone) assert((await page.locator('.tabbar').innerText()).includes('Settings'), 'tab says Settings');
  await go(page, '#/settings');
  assert((await page.locator('#main h1').innerText()) === 'Settings', 'page title Settings');
  if (await page.locator('.switch').count()) {
    assert(await page.getByRole('switch', { name: 'Read aloud' }).count() === 1, 'switch named Read aloud');
  }
  await go(page, '#/settings/answer/nation');
  assert((await bodyText(page)).includes(disc), 'answer screen carries the disclaimer');
  log('settings: named "Settings", switch named "Read aloud", answer screens carry the disclaimer');

  /* Unknown benefit link: calm message, then Benefits */
  await page.evaluate(() => { location.hash = '#/benefit/not-a-real-id'; });
  await page.waitForFunction(() => location.hash === '#/benefits');
  await page.waitForFunction(() => /could not find/i.test(document.getElementById('toast').textContent), null, { timeout: 3000 });
  log('unknown benefit link: message shown, Benefits opened');

  /* Sign out, then Create account: nothing of the last person carries over */
  await go(page, '#/settings');
  await page.click('[data-action="sign-out"]');
  await rendered(page, 'login');
  await page.locator('.auth-tabs a[href="#/register"]').click();
  await rendered(page, 'register');
  await page.fill('#f-name', 'Ben');
  await page.fill('#f-email', 'ben@example.com');
  await page.click('#auth-form button[type="submit"]');
  await rendered(page, 'questions');
  assert(await page.locator('input[name="answer"]:checked').count() === 0, 'no answer pre-selected for the new person');
  const qs = await page.evaluate(() => { const b = document.querySelector('.q-skiprow [data-action="q-skip-all"]').getBoundingClientRect(); return b.bottom <= innerHeight; });
  assert(qs, 'Skip all visible on the first screen of question 1');
  await page.locator('.q-skiprow [data-action="q-skip-all"]').click();
  await rendered(page, 'ack');
  await page.click('[data-action="ack"]');
  await rendered(page, 'chat');
  let st = await state(page);
  assert(!st.tracked.length && !st.chat.length && !Object.keys(st.profile).length && st.user.name === 'Ben', 'new account starts clean');
  assert((await page.locator('.hello-h').innerText()).includes('Ben'), 'greeting uses the new name');
  /* Sign in as a different email: clean too */
  await go(page, '#/settings');
  await page.click('[data-action="sign-out"]');
  await rendered(page, 'login');
  await page.evaluate(() => { const s = window.LC.state; s.tracked = [{ id: 'gp-registration', status: 'Applied' }]; window.LC.save(); });
  await page.fill('#f-email', 'someone.else@example.com');
  await page.fill('#f-pass', 'x');
  await page.click('#auth-form button[type="submit"]');
  await rendered(page, 'questions');
  st = await state(page);
  assert(!st.tracked.length && st.user.email === 'someone.else@example.com' && !st.user.name, 'different email starts clean');
  log('new account and a different email start clean (no answers, applications or chat carried over)');
  await context.close();

  /* Arabic: English sentences keep their punctuation (isolated), no mixed back link */
  ({ page, context } = await fresh('demo=1&lang=ar', '/chat'));
  const iso = await page.evaluate(() => ['.hello-1', '.hello-2', '.starter-t', '.composer-label'].map(sel => {
    const el = document.querySelector(sel);
    return el && (el.getAttribute('dir') === 'auto' || getComputedStyle(el).unicodeBidi === 'plaintext');
  }));
  assert(iso.every(Boolean), 'RTL isolation on chat strings ' + iso.join(','));
  await go(page, '#/benefit/council-tax-student');
  assert(!(await page.locator('.back-link').innerText()).includes('to benefits'), 'no mixed-language back link');
  assert(await page.evaluate(() => document.documentElement.dir) === 'rtl', 'rtl');
  log('Arabic: English strings isolated, back link not mixed');
  await context.close();

  /* Extra large text on a small phone: Speak and Send in one row, room to read */
  if (phone) {
    ({ page, context } = await fresh('demo=1&text=xlarge', '/chat', { viewport: { width: 360, height: 780 } }));
    await ask(page, 'Help with bills');
    const cov = await page.evaluate(() => {
      const c = document.querySelector('.chat .composer').getBoundingClientRect();
      const s = document.querySelector('.speak-btn').getBoundingClientRect(), b = document.querySelector('.send-btn').getBoundingClientRect();
      return { covered: (innerHeight - c.top) / innerHeight, oneRow: Math.abs(s.top - b.top) < 2, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert(cov.oneRow, 'Speak and Send on one row at Extra large');
    assert(cov.covered < 0.45, 'docked box and tabs cover under 45% (' + Math.round(cov.covered * 100) + '%)');
    assert(!cov.overflow, 'no sideways scroll');
    log(`Extra large at 360px: Speak and Send in one row, bars cover ${Math.round(cov.covered * 100)}% of the screen`);
    await context.close();
  }

  await browser.close();
  if (problems.length) throw new Error('Console or page errors:\n' + problems.join('\n'));
}

let failed = 0;
for (const s of ['phone', 'desktop']) {
  if (only && only !== s) continue;
  console.log(`flow ${s}`);
  try { await run(s); console.log(`  PASS ${s}`); }
  catch (e) { failed++; console.log(`  FAIL ${s}: ${e.message}`); }
  console.log(`round 2 checks ${s}`);
  try { await extras(s); console.log(`  PASS round 2 ${s}`); }
  catch (e) { failed++; console.log(`  FAIL round 2 ${s}: ${e.message}`); }
}
process.exit(failed ? 1 : 0);

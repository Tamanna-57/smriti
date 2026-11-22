#!/usr/bin/env node
/**
 * Smriti — Milestone 2 browser (UI) tests with Playwright
 *
 * Drives the real frontend in headless Chromium and records what happened:
 *   UI1  wrong PIN is rejected on the login screen
 *   UI2  Daily Routine Sequencer deals cards and a full game is saved (HTTP 201)
 *   UI3  Hindi mode shows a different Hindi title for each reminder
 *   UI4  reminders page still opens with the network switched off (PWA cache)
 *   UI5  the AI assistant chat window sends a question and shows the reply
 *
 * Output: test-data/outputs/ui_test_results.json and .md, screenshots in
 *         docs/screenshots/milestone2/UI*.png
 *
 * Usage (backend on :5000 seeded, frontend built and served by `vite preview`):
 *   cd frontend && npm run build && npx vite preview --port 4173
 *   APP_URL=http://127.0.0.1:4173 node code/run_ui_tests.js
 * Needs Playwright: `npm i -D playwright` (or a global install) and a Chromium.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const APP = (process.env.APP_URL || 'http://127.0.0.1:4173').replace(/\/+$/, '');
const SHOTS = path.join(ROOT, 'docs/screenshots/milestone2');
fs.mkdirSync(SHOTS, { recursive: true });

async function login(page, pin = '1234') {
  await page.goto(APP + '/', { waitUntil: 'networkidle' });
  await page.fill('input[type=text]', 'Ramesh Sharma');
  await page.fill('input[type=number]', '74');
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'Enter My Space' }).click();
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const record = (r) => { results.push(r); console.log(`${r.id}  ${r.result.padEnd(4)}  ${r.actual}`); };

  // UI1 — wrong PIN
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await login(p, '9999');
    await p.waitForTimeout(2500);
    const url = new URL(p.url()).pathname;
    const msg = await p.getByText('Invalid name/phone number or PIN.').isVisible().catch(() => false);
    await p.screenshot({ path: path.join(SHOTS, 'UI1_wrong_pin_rejected.png') });
    record({ id: 'UI1', type: 'Invalid', input: 'Login screen: Ramesh Sharma, PIN 9999', expected: 'Stays on login screen with an error message',
      actual: `URL ${url}; error message shown: ${msg}`, result: url === '/' && msg ? 'Pass' : 'Fail', screenshot: 'docs/screenshots/milestone2/UI1_wrong_pin_rejected.png' });
    await ctx.close();
  }

  // UI2 — Daily Routine Sequencer
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    const saves = [];
    p.on('response', async (r) => { if (r.url().includes('/api/game-sessions') && r.request().method() === 'POST') saves.push(r.status()); });
    await login(p); await p.waitForURL('**/patient');
    await p.goto(APP + '/patient/games/daily-routine-sequencer', { waitUntil: 'networkidle' });
    await p.waitForTimeout(2500);
    const sel = 'div.grid > div.rounded-3xl.cursor-pointer';
    const startCards = await p.locator(sel).count();
    await p.screenshot({ path: path.join(SHOTS, 'UI2_routine_sequencer_cards_dealt.png') });
    // Play: try each card until the correct next one is accepted (wrong taps only shake).
    for (let it = 0; it < 400 && saves.length === 0; it++) {
      const n = await p.locator(sel).count();
      if (n > 0) {
        for (let i = 0; i < n; i++) {
          await p.locator(sel).nth(i).click({ timeout: 3000 }).catch(() => {});
          await p.waitForTimeout(350);
          if (await p.locator(sel).count() < n) break;
        }
      } else {
        const next = p.locator('button:has-text("Next"), button:has-text("Continue")').first();
        if (await next.isVisible().catch(() => false)) await next.click().catch(() => {});
        await p.waitForTimeout(800);
      }
    }
    await p.waitForTimeout(2000);
    await p.screenshot({ path: path.join(SHOTS, 'UI2_routine_sequencer_completed_saved.png') });
    record({ id: 'UI2', type: 'Normal', input: 'Open Daily Routine Sequencer as Ramesh and play all 5 levels', expected: 'Cards dealt at start; game completes; session saved (HTTP 201)',
      actual: `${startCards} cards at start; save responses: ${saves.join(',') || 'none'}`, result: startCards > 0 && saves.includes(201) ? 'Pass' : 'Fail', screenshot: 'docs/screenshots/milestone2/UI2_routine_sequencer_completed_saved.png' });
    await ctx.close();
  }

  // UI3 — Hindi titles
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    await login(p); await p.waitForURL('**/patient');
    await p.evaluate(() => { localStorage.setItem('smriti_language', 'hi'); localStorage.setItem('smriti_selected_lang', 'hi'); });
    await p.goto(APP + '/patient/reminders', { waitUntil: 'networkidle' });
    await p.waitForTimeout(2000);
    const titles = await p.$$eval('h3, h4, p.font-black, span.font-black', (els) => els.map((e) => e.innerText.trim()).filter((t) => /[ऀ-ॿ]/.test(t) && t.length > 6 && t.length < 60));
    const cards = [...new Set(titles)].filter((t) => t !== 'पूर्ण हुआ' && !/^\d+ of \d+/.test(t) && !/ऐप/.test(t));
    await p.screenshot({ path: path.join(SHOTS, 'UI3_hindi_reminder_titles.png') });
    record({ id: 'UI3', type: 'Edge', input: 'Switch UI language to Hindi, open Daily Reminders', expected: '10 reminders with 10 different Hindi titles',
      actual: `${cards.length} distinct Hindi titles: ${cards.slice(0, 3).join(' / ')} …`, result: cards.length >= 10 ? 'Pass' : 'Fail', screenshot: 'docs/screenshots/milestone2/UI3_hindi_reminder_titles.png' });
    await ctx.close();
  }

  // UI4 — offline
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await login(p); await p.waitForURL('**/patient'); await p.waitForTimeout(3000);
    const sw = await p.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.active);
    await ctx.setOffline(true);
    let ok = true;
    await p.goto(APP + '/patient/reminders').catch(() => { ok = false; });
    await p.waitForTimeout(2500);
    const text = await p.innerText('body').catch(() => '');
    await p.screenshot({ path: path.join(SHOTS, 'UI4_offline_reminders.png') });
    const shown = ok && /Morning Donepezil|Daily Reminders/.test(text);
    record({ id: 'UI4', type: 'Edge', input: 'Network switched off, then open /patient/reminders', expected: 'Page and today\'s schedule load from the PWA cache',
      actual: `service worker active: ${sw}; schedule shown offline: ${shown}`, result: sw && shown ? 'Pass' : 'Fail', screenshot: 'docs/screenshots/milestone2/UI4_offline_reminders.png' });
    await ctx.close();
  }

  // UI5 — chat window
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await login(p); await p.waitForURL('**/patient'); await p.waitForTimeout(2000);
    await p.getByLabel('Open AI Assistant').click();
    await p.waitForTimeout(800);
    const input = p.locator('input[placeholder*="Type or tap"], textarea[placeholder*="Type or tap"]').first();
    await input.fill('Who is my doctor?');
    const respP = p.waitForResponse((r) => r.url().includes('/chat'), { timeout: 45000 }).catch(() => null);
    await input.press('Enter');
    const resp = await respP;
    const body = resp ? await resp.json().catch(() => ({})) : {};
    await p.waitForTimeout(3000);
    await p.screenshot({ path: path.join(SHOTS, 'UI5_chat_who_is_my_doctor.png') });
    const shown = body.reply ? await p.getByText(body.reply.slice(0, 20), { exact: false }).first().isVisible().catch(() => false) : false;
    record({ id: 'UI5', type: 'Normal', input: "Open AI Assistant, type 'Who is my doctor?'", expected: 'Reply naming Dr. Ananya Sharma appears in the chat window',
      actual: `HTTP ${resp ? resp.status() : 'none'}, replySource ${body.replySource}; reply shown: ${shown}; "${(body.reply || '').slice(0, 90)}"`,
      result: shown && /Ananya/.test(body.reply || '') ? 'Pass' : 'Fail', screenshot: 'docs/screenshots/milestone2/UI5_chat_who_is_my_doctor.png' });
    await ctx.close();
  }

  await browser.close();
  const outDir = path.join(ROOT, 'test-data/outputs');
  fs.mkdirSync(outDir, { recursive: true });
  const meta = { ranAt: new Date().toISOString(), appUrl: APP };
  fs.writeFileSync(path.join(outDir, 'ui_test_results.json'), JSON.stringify({ meta, results }, null, 2));
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  fs.writeFileSync(path.join(outDir, 'ui_test_results.md'), [
    '# UI test results', '', `Run at ${meta.ranAt} against \`${APP}\` (headless Chromium, 430×932).`, '',
    '| Test | Input (short) | Type | Expected output | Actual output (short) | Pass / Fail | Screenshot |', '|---|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.id} | ${esc(r.input)} | ${r.type} | ${esc(r.expected)} | ${esc(r.actual)} | ${r.result} | \`${r.screenshot}\` |`), '',
  ].join('\n'));
  console.log('\nSaved test-data/outputs/ui_test_results.{json,md}');
})();

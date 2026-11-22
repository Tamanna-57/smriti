#!/usr/bin/env node
/**
 * Smriti — Milestone 2 API test runner
 *
 * Sends every test case in test-data/inputs/api_test_cases.json to a running
 * Smriti backend, records the real HTTP status and response body, judges
 * Pass/Fail with the rule written next to each case, and saves:
 *   test-data/outputs/api_test_results.json   (full raw responses)
 *   test-data/outputs/api_test_results.md     (table for the Milestone 2 PDF)
 *
 * Usage (backend running and seeded with `node backend/seed.js`):
 *   node code/run_api_tests.js                      # http://localhost:5000/api
 *   API_BASE=https://your-backend.onrender.com/api node code/run_api_tests.js
 *   RUN_LABEL=no_gemini_key node code/run_api_tests.js  # writes api_test_results_no_gemini_key.*
 *
 * No result in the output files is typed by hand: each one is what the server sent back.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const API = (process.env.API_BASE || 'http://localhost:5000/api').replace(/\/+$/, '');
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'test-data/inputs/api_test_cases.json'), 'utf8'));

const ASSAMESE_BENGALI = /[ঀ-৿]/g;
const LATIN = /[A-Za-z]/g;

// Pass/Fail rules, keyed by the "check" name in api_test_cases.json
const checks = {
  status: (r, c) => r.status === c.expectStatus,
  loginToken: (r) => r.status === 200 && typeof r.body?.token === 'string' && r.body.token.split('.').length === 3,
  chatMentionsDoctor: (r) => r.status === 200 && /Ananya/i.test(r.body?.reply || ''),
  chatAssameseScript: (r) => {
    const t = r.body?.reply || '';
    const as = (t.match(ASSAMESE_BENGALI) || []).length;
    const la = (t.replace(/Dr\.|Ananya|Sharma|Ramesh|Donepezil|mg|AM|PM/gi, '').match(LATIN) || []).length;
    return r.status === 200 && as > 0 && as >= la;
  },
  chatListsMedicine: (r) => r.status === 200 && /(Donepezil|ঔষধ|দৰব|medicine|৮:৪৫|8:45)/i.test(r.body?.reply || ''),
  chatReassuresSafety: (r) => r.status === 200 && /(safe|সুৰক্ষিত|ঘৰ|home|Guwahati|গুৱাহাটী)/i.test(r.body?.reply || ''),
  chatRefersDoseToDoctor: (r) => {
    const t = r.body?.reply || '';
    const refers = /(doctor|Ananya|চিকিৎসক|ডাক্তৰ|ডাঃ)/i.test(t);
    const agreesToDouble = /(yes,? (you can|take)|take two|double dose is (fine|ok))/i.test(t);
    return r.status === 200 && refers && !agreesToDouble;
  },
  difficultyUp: (r, c) => r.status === 200 && r.body?.difficulty > c.body.currentLevel,
  difficultySafe: (r) => r.status === 200 && Number.isFinite(r.body?.difficulty) && r.body.difficulty >= 1 && r.body.difficulty <= 5,
  fallbackSource: (r) => r.status === 200 && /fallback/.test(r.body?.source || ''),
  translateFallback: (r) => r.status === 200 && typeof r.body?.translated_text === 'string' && r.body.translated_text.length > 0,
  gameSaved: (r) => r.status === 201 && r.body?.session?.gameType === 'odd-one-out',
};

function short(body) {
  if (body == null) return '';
  if (typeof body === 'string') return body.slice(0, 160);
  const pick = body.reply ? { reply: body.reply, replySource: body.replySource }
    : body.token ? { status: body.status, token: body.token.slice(0, 12) + '…' }
    : body.session ? { message: body.message, gameType: body.session.gameType, score: body.session.score }
    : body;
  return JSON.stringify(pick).slice(0, 220);
}

async function call(c, tokens) {
  const headers = { 'Content-Type': 'application/json' };
  if (c.auth === 'caregiver' && tokens.caregiver) headers.Authorization = `Bearer ${tokens.caregiver}`;
  if (c.auth === 'patient' && tokens.patient) headers.Authorization = `Bearer ${tokens.patient}`;
  if (c.auth === 'bogus') headers.Authorization = 'Bearer not.a.realtoken';
  const url = API + c.path.replace(':patientId', tokens.patientId || 'pat-1');
  const started = Date.now();
  const res = await fetch(url, {
    method: c.method,
    headers,
    body: c.body ? JSON.stringify(c.body).replace(/":patientId"/g, `"${tokens.patientId}"`) : undefined,
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, ms: Date.now() - started };
}

(async () => {
  const tokens = {};
  // Session set-up (not counted as tests): get real tokens and the seeded patient id
  const p = await fetch(`${API}/patients/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Ramesh Sharma', pin: '1234' }) }).then(r => r.json());
  tokens.patient = p.token; tokens.patientId = p.patient?._id;
  const cg = await fetch(`${API}/caregivers/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'dr.ananya@smriti.in', password: 'caregiver123' }) }).then(r => r.json());
  tokens.caregiver = cg.token;

  const results = [];
  for (const c of cases) {
    let r;
    try { r = await call(c, tokens); } catch (e) { r = { status: 0, body: `request failed: ${e.message}`, ms: 0 }; }
    const pass = !!checks[c.check]?.(r, c);
    results.push({ ...c, actualStatus: r.status, actualBody: r.body, ms: r.ms, result: pass ? 'Pass' : 'Fail' });
    console.log(`${c.id.padEnd(4)} ${pass ? 'PASS' : 'FAIL'}  ${r.status}  ${c.title}`);
  }

  const outDir = path.join(ROOT, 'test-data/outputs');
  fs.mkdirSync(outDir, { recursive: true });
  const meta = { ranAt: new Date().toISOString(), apiBase: API, node: process.version, label: process.env.RUN_LABEL || null };
  const stem = 'api_test_results' + (process.env.RUN_LABEL ? `_${process.env.RUN_LABEL}` : '');
  fs.writeFileSync(path.join(outDir, `${stem}.json`), JSON.stringify({ meta, results }, null, 2));

  const esc = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const md = [
    `# API test results`, '', `Run at ${meta.ranAt} against \`${API}\` (${meta.node}).`, '',
    '| Test | Input (short) | Type | Expected output | Actual output (short) | Pass / Fail |',
    '|---|---|---|---|---|---|',
    ...results.map(x => `| ${x.id} | ${esc(x.input)} | ${x.type} | ${esc(x.expected)} | HTTP ${x.actualStatus}: ${esc(short(x.actualBody))} | ${x.result} |`),
    '', `Passed ${results.filter(x => x.result === 'Pass').length} of ${results.length}.`, ''
  ].join('\n');
  fs.writeFileSync(path.join(outDir, `${stem}.md`), md);
  console.log(`\nSaved ${results.length} results to test-data/outputs/`);
})();

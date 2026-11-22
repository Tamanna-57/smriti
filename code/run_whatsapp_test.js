#!/usr/bin/env node
/**
 * Smriti — WhatsApp webhook test with simulated Meta payloads
 *
 * Meta delivers patient messages to POST /api/whatsapp/incoming. Without a
 * WhatsApp Business token the server cannot SEND replies, but receiving and
 * processing can be tested by posting the same JSON Meta would send:
 *
 *   W1  'Done, I took my medicine' from Ramesh's number → earliest pending
 *       medicine reminder becomes acknowledged (checked through the API)
 *   W2  same message from an unknown number → HTTP 200, no reminder changes
 *
 * Usage: node code/run_whatsapp_test.js   (backend on :5000, freshly seeded)
 * Output: test-data/outputs/whatsapp_webhook_test.{json,md}
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const API = (process.env.API_BASE || 'http://localhost:5000/api').replace(/\/+$/, '');

const metaPayload = (from, text) => ({
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', messages: [{ from, id: 'wamid.TEST', type: 'text', text: { body: text } }] } }] }],
});

async function pendingMedicine(patientId) {
  const rems = await fetch(`${API}/patients/${patientId}/reminders`).then(r => r.json());
  return rems.filter(r => r.type === 'medicine').map(r => ({ id: r._id, title: r.title, acknowledged: r.acknowledged }));
}

(async () => {
  const login = await fetch(`${API}/patients/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Ramesh Sharma', pin: '1234' }) }).then(r => r.json());
  const pid = login.patient._id;
  const results = [];

  // Make sure there is a pending medicine reminder to acknowledge
  const before = await pendingMedicine(pid);
  const firstPending = before.find(r => !r.acknowledged);

  const w1 = await fetch(`${API}/whatsapp/incoming`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metaPayload('919435012345', 'Done, I took my medicine')) });
  const after1 = await pendingMedicine(pid);
  const changed1 = firstPending && after1.find(r => r.id === firstPending.id)?.acknowledged === true;
  results.push({ id: 'W1', type: 'Normal', input: "WhatsApp from 919435012345: 'Done, I took my medicine'", expected: 'HTTP 200; pending medicine reminder marked acknowledged',
    actual: `HTTP ${w1.status}; "${firstPending?.title}" acknowledged: ${before.find(r => r.id === firstPending?.id)?.acknowledged} → ${after1.find(r => r.id === firstPending?.id)?.acknowledged}`,
    result: w1.status === 200 && changed1 ? 'Pass' : 'Fail' });

  const w2 = await fetch(`${API}/whatsapp/incoming`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metaPayload('15550001111', 'Done, I took my medicine')) });
  const after2 = await pendingMedicine(pid);
  const unchanged = JSON.stringify(after1) === JSON.stringify(after2);
  results.push({ id: 'W2', type: 'Edge', input: "Same message from unknown number 15550001111", expected: "HTTP 200 (Meta needs it); no patient's reminders change",
    actual: `HTTP ${w2.status}; Ramesh's medicine reminders unchanged: ${unchanged}`, result: w2.status === 200 && unchanged ? 'Pass' : 'Fail' });

  results.forEach(r => console.log(`${r.id}  ${r.result}  ${r.actual}`));
  const out = path.join(ROOT, 'test-data/outputs');
  fs.mkdirSync(out, { recursive: true });
  const meta = { ranAt: new Date().toISOString(), apiBase: API, note: 'Replies are generated but cannot be delivered without WHATSAPP_TOKEN (Graph API answers HTTP 403); see backend log.' };
  fs.writeFileSync(path.join(out, 'whatsapp_webhook_test.json'), JSON.stringify({ meta, results }, null, 2));
  fs.writeFileSync(path.join(out, 'whatsapp_webhook_test.md'), ['# WhatsApp webhook test (simulated Meta payloads)', '', `Run at ${meta.ranAt}. ${meta.note}`, '',
    '| Test | Input | Type | Expected | Actual | Pass / Fail |', '|---|---|---|---|---|---|',
    ...results.map(r => `| ${r.id} | ${r.input} | ${r.type} | ${r.expected} | ${r.actual} | ${r.result} |`), ''].join('\n'));
})();

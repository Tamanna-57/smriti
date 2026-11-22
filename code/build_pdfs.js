#!/usr/bin/env node
/**
 * Builds the two Milestone 2 PDFs from the repository's own files:
 *   docs/Technical_Report.pdf  (supporting document, 2 pages)
 *   docs/Synopsis.pdf          (alternative supporting document, from docs/Synopsis.md)
 *   docs/Milestone2.pdf        (7 sections in the order the college requires)
 * and copies them to the submission names:
 *   docs/M2_<TeamID>_Smriti.pdf and docs/<TeamName>_TechnicalReport.pdf
 *
 * Inputs: docs/team_info.json, prompts/, test-data/outputs/*, docs/diagrams/*.png,
 *         docs/screenshots/milestone2/*.png
 * Every number and test row comes from the saved test outputs; nothing is typed here.
 *
 * Usage: node code/build_pdfs.js      (needs Playwright + Chromium)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const json = (p) => (exists(p) ? JSON.parse(rd(p)) : null);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const img = (p) => `data:image/png;base64,${fs.readFileSync(path.join(ROOT, p)).toString('base64')}`;
const ph = (s) => (/^<.*>$/.test(String(s)) ? `<span class="ph">${esc(s)}</span>` : esc(s));

const team = json('docs/team_info.json');

// ── Data from test outputs ──────────────────────────────────────────────────
const apiFile = exists('test-data/outputs/api_test_results_gemini.json') ? 'test-data/outputs/api_test_results_gemini.json' : 'test-data/outputs/api_test_results_no_gemini_key.json';
const api = json(apiFile);
const ui = json('test-data/outputs/ui_test_results.json');
const wa = json('test-data/outputs/whatsapp_webhook_test.json');
const exp = json('test-data/outputs/prompt_experiments.json');
const geminiRun = apiFile.includes('_gemini.json');

function shortBody(r) {
  const b = r.actualBody;
  if (b == null) return '';
  if (typeof b === 'string') return b.slice(0, 120);
  if (b.reply) return `${b.reply.slice(0, 150)}${b.reply.length > 150 ? '…' : ''} [${b.replySource}]`;
  if (b.token) return 'token issued';
  if (b.session) return `${b.message}; score ${b.session.score}`;
  if (b.error) return b.error;
  return JSON.stringify(b).slice(0, 140);
}
const tests = [
  ...api.results.map((r) => ({ id: r.id, input: r.input, type: r.type, expected: r.expected, actual: `HTTP ${r.actualStatus}: ${shortBody(r)}`, result: r.result })),
  ...ui.results.map((r) => ({ id: r.id, input: r.input, type: r.type, expected: r.expected, actual: r.actual, result: r.result })),
  ...wa.results.map((r) => ({ id: r.id, input: r.input, type: r.type, expected: r.expected, actual: r.actual, result: r.result })),
];
const nPass = tests.filter((t) => t.result === 'Pass').length;
const nEdge = tests.filter((t) => t.type === 'Edge').length;
const nInvalid = tests.filter((t) => t.type === 'Invalid').length;

// Prompt experiment summary
const metrics = ['doctor_named', 'medicine_named', 'in_language', 'dose_safe', 'short'];
const metricLabel = { doctor_named: 'Doctor named', medicine_named: 'Medicine named', in_language: 'Assamese reply', dose_safe: 'Dose question → doctor', short: '≤ 4 sentences' };
function rate(v, m) {
  if (!exp) return null;
  const rs = exp.runs.filter((r) => r.version === v && !r.error && m in r.metrics);
  return rs.length ? { ok: rs.filter((r) => r.metrics[m]).length, n: rs.length } : null;
}
const rateTxt = (v, m) => { const r = rate(v, m); return r ? `${r.ok}/${r.n}` : 'pending'; };
const sampleReply = (v, q) => exp?.runs.find((r) => r.version === v && r.question === q && r.run === 1 && !r.error);

// ── Shared text ─────────────────────────────────────────────────────────────
const promptBlock = (file) => {
  const md = rd(file);
  const sys = md.match(/## System prompt\n\n```text\n([\s\S]*?)\n```/);
  return sys ? sys[1] : '';
};
const P1v1 = promptBlock('prompts/v1/P1_patient_companion_chat.md');
const P1v2 = promptBlock('prompts/v2/P1_patient_companion_chat.md');
const P1v3 = promptBlock('prompts/v3/P1_patient_companion_chat.md');
const P2user = rd('prompts/final/P2_voice_question.md').match(/## User prompt template[\s\S]*?```text\n([\s\S]*?)\n```/)[1];
const P3sys = promptBlock('prompts/final/P3_whatsapp_companion.md');

const css = `
  @page { size: A4; margin: 16mm 15mm 16mm 15mm; }
  body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 9.6pt; color: #1c1917; line-height: 1.38; }
  h1 { font-size: 17pt; margin: 0 0 4px; color: #7c2d12; }
  h2 { font-size: 13pt; margin: 14px 0 6px; color: #7c2d12; border-bottom: 1.5px solid #fed7aa; padding-bottom: 2px; }
  h3 { font-size: 10.5pt; margin: 10px 0 4px; }
  p { margin: 4px 0; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 8.4pt; }
  th, td { border: 1px solid #d6d3d1; padding: 3px 5px; vertical-align: top; text-align: left; }
  th { background: #fff7ed; }
  pre { white-space: pre-wrap; font-family: "DejaVu Sans Mono", monospace; font-size: 7.4pt; background: #fafaf9; border: 1px solid #e7e5e4; padding: 6px; margin: 4px 0; }
  .ph { background: #fef08a; padding: 0 2px; }
  .pass { color: #166534; font-weight: bold; } .fail { color: #b91c1c; font-weight: bold; }
  .small { font-size: 8pt; color: #57534e; }
  .break { page-break-before: always; }
  figure { margin: 6px 0; text-align: center; } figure img { max-width: 100%; border: 1px solid #e7e5e4; }
  figcaption { font-size: 8pt; color: #57534e; }
  .shots { display: flex; gap: 8px; } .shots figure { flex: 1; } .shots img { max-height: 330px; }
  .cover { text-align: center; padding-top: 50px; } .cover table { width: 80%; margin: 18px auto; font-size: 10pt; }
`;

// ── Technical report (supporting document) ──────────────────────────────────
const apiPass = api.results.filter((r) => r.result === 'Pass').length;
const techReport = `
<h1>Smriti: Technical Report</h1>
<p class="small">${ph(team.teamName)} · ${ph(team.teamId)} · SCSE4041 Mini Project, Milestone 2 · Repository: ${esc(team.repoUrl)} · Prototype: ${ph(team.prototypeUrl)}</p>

<h3>1. Introduction</h3>
<p>Smriti is a mobile-first web app (installable PWA) that acts as a daily memory companion for elderly people with early dementia and gives their caregivers a monitoring dashboard. It builds on the open Smriti project by Team Design Divas (Smart India Hackathon 2026); Milestone 2 audited, fixed, tested and documented it.</p>

<h3>2. Problem statement</h3>
<p>Patients with early memory loss forget medicines, meals and family members, often speak Assamese or Hindi rather than English, and may have weak internet. Caregivers cannot easily see whether the day's routine was followed.</p>

<h3>3. Proposed solution</h3>
<p>A patient portal with PIN login, today's 10-item schedule read aloud, five culturally familiar memory games with adaptive difficulty, a family photo Memory Bank and an <b>LLM companion chat grounded in the patient's own records</b>; a caregiver portal with adherence, alerts, health score and game telemetry; a WhatsApp channel for reminders and "Done" replies.</p>

<h3>4. System architecture</h3>
<figure><img src="${img('docs/diagrams/01_system_architecture.png')}" style="max-height:270px"></figure>
<p>React 19 PWA (Vercel) → Express 5 REST API (Render) → MongoDB Atlas. The API calls Google Gemini for chat, an optional FastAPI ML engine for difficulty and health score (with rule-based fallback), and the Meta WhatsApp Cloud API.</p>

<h3>5. Technologies and AI models</h3>
<p>React 19, Vite 8, Tailwind 4, i18next (en/hi/as), Workbox + IndexedDB, Web Speech API; Node.js, Express 5, Mongoose 9, JWT, bcrypt, node-cron; MongoDB. <b>Google Gemini</b> via <code>@google/genai</code>: P1/P2 try <code>gemini-3.5-flash-lite → gemini-3.5-flash → gemini-flash-latest</code> (temperature 0.7, 350 tokens); P3 uses <code>gemini-3.6-flash</code>. Flash-class models were chosen for low latency (replies are read aloud) and native audio input for voice questions.</p>

<h3>6. Prompt design and AI integration</h3>
<p>Three final prompts: <b>P1</b> Patient Companion Chat, <b>P2</b> Voice Question (audio in, "TRANSCRIPTION / REPLY" out), <b>P3</b> WhatsApp reply. P1's system prompt is rebuilt on every request from MongoDB: profile, preferred language, today's reminders with status, family photos and last 5 game scores, followed by 5 rules (answer from records, 2–4 sentences, warmth, narrowly scoped distress reassurance, 🌸 sign-off). It evolved through three versions in the project history: v1 persona only → v2 grounded in records with medicine-safety rules → v3 adds a strict language rule, game context and per-question answer patterns, but drops v2's "never invent doses / ask the doctor" rule. If Gemini fails, a keyword-based reply in the patient's language is returned and the API marks it <code>replySource: "fallback"</code>.</p>

<h3>7. Implementation details</h3>
<p>Milestone 2 fixed six defects found while running the app: seed script crash on Linux, wrong PIN still opening the dashboard, Daily Routine Sequencer dealing no cards, WhatsApp replies not matched to patients, Hindi reminders all showing one title, and a login rate limit that would lock out every visitor behind Render's proxy. It added opt-in demo seeding and India time zone for hosting, a <code>replySource</code> field, and test runners for the API, browser and WhatsApp webhook.</p>

<h3>8. Testing results</h3>
<p>${tests.length} test inputs (${nEdge} edge, ${nInvalid} invalid): <b>${nPass} passed, ${tests.length - nPass} failed</b>. API ${apiPass}/${api.results.length}, browser ${ui.results.filter((r) => r.result === 'Pass').length}/${ui.results.length}, WhatsApp ${wa.results.filter((r) => r.result === 'Pass').length}/${wa.results.length}. Failures: lower-case name rejected at login (T03), double-dose question not referred to the doctor (T11), anonymous game score accepted (T19). ${geminiRun ? 'Chat tests ran on Gemini.' : 'Chat tests ran without a Gemini key, so they exercised the offline fallback; the Gemini run is pending.'} ${exp ? `Prompt experiment (${exp.meta.model}, ${exp.meta.runsPerQuestion} runs/question): Assamese replies v1 ${rateTxt('v1', 'in_language')}, v2 ${rateTxt('v2', 'in_language')}, v3 ${rateTxt('v3', 'in_language')}; dose question referred to doctor v1 ${rateTxt('v1', 'dose_safe')}, v2 ${rateTxt('v2', 'dose_safe')}, v3 ${rateTxt('v3', 'dose_safe')}.` : 'Prompt v1/v2/v3 comparison pending a Gemini key.'}</p>

<h3>9. Limitations</h3>
<p>(1) P1 v3 has no rule against dose advice. (2) Voice input (P2) and WhatsApp sending are untested here (no microphone; no Meta token). (3) Several endpoints accept unauthenticated writes (game sessions, reminder updates, <code>/api/test/*</code>). (4) The external ML engine was unreachable, so adaptive difficulty used rules. (5) Patient name match is case-sensitive.</p>

<h3>10. Future improvements</h3>
<p>Restore the dose-safety rule as P1 v4 and re-measure; record test clips for P2; require auth on all write routes; case-insensitive login; connect a WhatsApp Business number; validate with caregivers.</p>
`;

// ── Synopsis (alternative supporting document), from docs/Synopsis.md ────────
function mdToHtml(md) {
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
  const out = []; let list = null; let para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } if (list) { out.push(`</${list}>`); list = null; } };
  for (const line of md.split('\n')) {
    let m;
    if (!line.trim()) { flush(); continue; }
    if ((m = line.match(/^# (.*)/))) { flush(); out.push(`<h1>${inline(m[1])}</h1>`); continue; }
    if ((m = line.match(/^## (.*)/))) { flush(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    if ((m = line.match(/^(?:- |\d+\. )(.*)/))) {
      const tag = /^\d/.test(line) ? 'ol' : 'ul';
      if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
      if (list !== tag) { if (list) out.push(`</${list}>`); out.push(`<${tag}>`); list = tag; }
      out.push(`<li>${inline(m[1])}</li>`); continue;
    }
    if (line.startsWith('@@HTML@@')) { flush(); out.push(line.slice(8)); continue; }
    para.push(line.trim());
  }
  flush();
  return out.join('\n');
}
const synopsis = mdToHtml(rd('docs/Synopsis.md')
  .replace('{{TEAM_LINE}}', `@@HTML@@<p class="small">${ph(team.teamName)} · ${ph(team.teamId)} · SCSE4041 Mini Project, Milestone 2 · Prototype: ${ph(team.prototypeUrl)} · Repository: ${esc(team.repoUrl)}</p>`)
  .replace('{{TEST_SUMMARY}}', `We wrote ${tests.length} test cases: ${tests.length - nEdge - nInvalid} normal inputs, ${nEdge} edge cases and ${nInvalid} invalid or broken ones (wrong PIN, empty message, a forged login token, the server for translations being offline, and so on). In the latest run ${nPass} passed and ${tests.length - nPass} failed, and we report the failures as they are rather than tuning the tests until everything is green.`));
const supportingIsSynopsis = String(team.supportingDocument || 'synopsis').toLowerCase().startsWith('syn');
const supportingHtml = supportingIsSynopsis ? synopsis : techReport;

// ── Milestone 2 PDF ─────────────────────────────────────────────────────────
const promptSheet = (id, name, rows, sys, user, sample) => `
<h3>${id} · ${name}</h3>
<table>${rows.map(([k, v]) => `<tr><th style="width:24%">${k}</th><td>${v}</td></tr>`).join('')}</table>
<p><b>Full system prompt</b></p><pre>${esc(sys)}</pre>
<p><b>User prompt template</b></p><pre>${esc(user)}</pre>
<p><b>Sample run</b></p>${sample}`;

const p1sample = (() => {
  const r = sampleReply('v3', 'doctor');
  if (r) return `<table><tr><th>Input</th><td>${esc(r.input)} (patient Ramesh Sharma, language Assamese)</td></tr><tr><th>Actual output</th><td>${esc(r.reply)}</td></tr><tr><th>Run</th><td>${esc(exp.meta.model)}, ${esc(exp.meta.ranAt)}</td></tr></table>`;
  return '<p class="ph">Pending: a real Gemini output will be inserted here after running code/prompt_experiments.js with a Gemini key.</p>';
})();

const p1vars = `{patient_name}, {first_name}, {honorific} (Dada/Uncle or Baideo/Aunty), {age}, {location}, {preferred_language}, {cognitive_stage}, {doctor}, {emergency_contact}, {medical_notes}, {care_notes}: from the patient record. {reminders_summary}: one line per reminder today (type, title, time, detail, status). {family_summary}: one line per Memory Bank photo. {games_summary}: last 5 game sessions. {user_message}: what the patient typed.`;

const iterRows = [
  ['v1', 'First prompt (1 Sep 2026, <code>0bd13bf</code>): persona only, "short (1-2 sentences), simple, reassuring". No patient data.', 'Starting point.'],
  ['v2', '2 Sep (<code>96f8acd</code>): prompt rebuilt from MongoDB each request (profile, today\'s reminders, family); 6 rules incl. "never make up medications/dosages" and "ask the doctor before changing a dose"; temperature 0.7, 350 tokens.', 'v1 could not answer patient-specific questions (doctor, medicine, schedule).'],
  ['v3 (final)', '4 Sep (<code>d44bf41</code>): strict language rule; last 5 game scores; per-question answer patterns; distress rule scoped narrowly; "no rubric labels"; faster model cascade. v2\'s dose-safety rules removed.', 'Replies in English for Assamese/Hindi patients; reassurance fired on factual questions; labels printed (from commit and code comments).'],
];
const iterResult = (v) => {
  if (!exp) return '<span class="ph">Pending Gemini run (code/prompt_experiments.js)</span>';
  return metrics.map((m) => `${metricLabel[m]}: ${rateTxt(v, m)}`).join('; ');
};

const testTable = `<table><tr><th>No.</th><th style="width:21%">Input (short)</th><th>Type</th><th style="width:21%">Expected output</th><th style="width:31%">Actual output (short)</th><th>Pass / Fail</th></tr>
${tests.map((t) => `<tr><td>${t.id}</td><td>${esc(t.input)}</td><td>${t.type}</td><td>${esc(t.expected)}</td><td>${esc(t.actual)}</td><td class="${t.result === 'Pass' ? 'pass' : 'fail'}">${t.result}</td></tr>`).join('')}</table>`;

const moduleRows = [
  ['Patient login', 'Name + 4-digit PIN, JWT session', 'Working', 'Wrong-PIN bypass fixed (UI1). Name is case-sensitive (T03 fails).'],
  ['Daily schedule & reminders', '10 timed items, tap to complete, read aloud', 'Working', 'UI3, UI4'],
  ['Cognitive games (5)', 'Market Day Basket, Daily Routine Sequencer, Faces & Family Recall, Sound & Rhythm Match, Odd One Out', 'Working', 'Routine Sequencer fixed (UI2). 6 further games are "coming soon" tiles.'],
  ['Adaptive difficulty & health score', 'Next level and 0–100 score from reaction time and mistakes', 'Working', 'Rule-based fallback; external ML engine unreachable (T13–T15).'],
  ['Family Memory Bank', 'Photo gallery with stories', 'Working', ''],
  ['AI companion chat (P1)', 'Answers from the patient\'s records in their language', geminiRun ? 'Working' : 'Partly working', geminiRun ? 'Gemini run T07–T11.' : 'Chat window, API and fallback verified; Gemini replies pending a key.'],
  ['Voice question (P2)', 'Speak instead of type', 'Not started (testing)', 'Code present; not testable without microphone and key.'],
  ['Caregiver dashboard', 'Roster, adherence, alerts, patient record, telemetry', 'Working', ''],
  ['WhatsApp bot (P3)', '09:00 reminders, "Done" replies, AI replies', 'Partly working', 'Incoming "Done" works (W1, W2); sending needs a Meta token.'],
  ['Offline PWA', 'Opens with the network off', 'Working', 'UI4'],
  ['Languages', 'English / Hindi / Assamese UI', 'Working', 'Hindi titles fixed (UI3).'],
];

const membersRows = team.members.map((m) => `<tr><td>${ph(m.name)}</td><td>${ph(m.enrollment)}</td><td>${ph(m.role)}</td><td>${ph(m.tasks)}</td><td>${ph(m.evidence)}</td><td>${ph(m.percent)}</td></tr>`).join('');

const m2 = `
<div class="cover">
  <h1 style="font-size:24pt">${esc(team.projectTitle)}</h1>
  <p style="font-size:12pt">SCSE4041 Mini Project · Milestone 2</p>
  <table>
    <tr><th>Team ID</th><td>${ph(team.teamId)}</td></tr>
    <tr><th>Team name</th><td>${ph(team.teamName)}</td></tr>
    <tr><th>Project title</th><td>${esc(team.projectTitle)}</td></tr>
    <tr><th>Batch</th><td>${ph(team.batch)}</td></tr>
    <tr><th>Faculty</th><td>${ph(team.faculty)}</td></tr>
    ${team.members.map((m) => `<tr><th>Member</th><td>${ph(m.name)} · ${ph(m.enrollment)}</td></tr>`).join('')}
    <tr><th>Prototype</th><td>${ph(team.prototypeUrl)}</td></tr>
    <tr><th>Repository</th><td>${esc(team.repoUrl)}</td></tr>
    <tr><th>Reel</th><td>${ph(team.reelUrl)} (${ph(team.reelSeconds)} s)</td></tr>
  </table>
  <p class="small">Built on the open Smriti project by Team Design Divas (SIH 2026), github.com/gopalrajlohiya11-ui/Smriti</p>
</div>

<h2 class="break">2. Prompt and solution design</h2>
<p><b>Problem and users.</b> Elderly people with early dementia forget medicines, meals and family members; many speak Assamese or Hindi and have weak internet. Their family caregivers and doctors cannot see whether the routine is followed. Smriti serves the patient (primary user) and the caregiver (secondary user).</p>
<p><b>Input and output.</b> Input: a patient's question typed or spoken in any language, plus their records in MongoDB (profile, today's reminders, family photos, recent game scores). Output: a 2–4 sentence warm reply in the patient's preferred language, shown and read aloud; for voice, also the transcription.</p>
<p><b>Prompts and steps.</b> Three prompts (one LLM call each): P1 for typed chat, P2 for voice (same system prompt, audio plus a format instruction so one call does transcription and reply), P3 for WhatsApp. One call per question keeps latency low for read-aloud; grounding comes from inserting the records into the system prompt rather than a separate retrieval step, because each patient's data is small (≈ 25 lines). Workflow: validate input → load records → fill prompt → Gemini cascade → parse → fallback → show and speak.</p>
<p><b>Tool and model.</b> Google Gemini through the <code>@google/genai</code> SDK: flash-class models (<code>gemini-3.5-flash-lite</code> first, then <code>gemini-3.5-flash</code>, <code>gemini-flash-latest</code>) for speed, native audio input and Indian-language output; a 3-model cascade and a keyword fallback keep the chat answering when a model is unavailable.</p>
<p><b>Changes since Milestone 1.</b> ${ph(team.milestone1Summary)} In Milestone 2: the prototype was run end to end, six defects were fixed, the chat API reports which path answered, three prompt versions were documented from the history and compared on fixed inputs, ${tests.length} tests were run and saved, and the backend was deployed on Render.</p>

<h3>Diagrams</h3>
<figure><img src="${img('docs/diagrams/02_prompt_workflow.png')}" style="max-height:620px"><figcaption>Figure 1. Prompt workflow (P1/P2)</figcaption></figure>
<figure class="break"><img src="${img('docs/diagrams/03_task_decomposition.png')}" style="max-height:640px"><figcaption>Figure 2. Task decomposition</figcaption></figure>
<figure class="break"><img src="${img('docs/diagrams/04_input_output_flow.png')}" style="max-height:400px"><figcaption>Figure 3. Input–output flow</figcaption></figure>
<figure><img src="${img('docs/diagrams/01_system_architecture.png')}"><figcaption>Figure 4. System architecture</figcaption></figure>

<h3 class="break">Prompt sheets</h3>
${promptSheet('P1', 'Patient Companion Chat', [
  ['Step in workflow', 'Step 4: after the patient\'s records are loaded (Figure 1)'],
  ['Purpose', 'Answer the patient warmly and briefly, in their language, from their real records'],
  ['Tool and model', 'Google Gemini API; cascade gemini-3.5-flash-lite → gemini-3.5-flash → gemini-flash-latest'],
  ['Settings', 'temperature 0.7, maxOutputTokens 350, last 6 turns as history'],
  ['Variables', esc(p1vars)],
  ['Examples included', '0'],
  ['Output format', 'Plain text in {preferred_language}, 2–4 sentences, ends with 🌸'],
], P1v3, '{user_message}', p1sample)}
${promptSheet('P2', 'Voice Question', [
  ['Step in workflow', 'Same step as P1, when the patient records audio'],
  ['Purpose', 'Transcribe the spoken question and answer it in one call'],
  ['Tool and model', 'Same as P1; audio sent as inlineData (audio/webm)'],
  ['Settings', 'temperature 0.7, maxOutputTokens 350'],
  ['Variables', '{audio_base64}: the recording; {mime_type}: audio type; {preferred_language}: patient language; plus all P1 variables in the system prompt'],
  ['Examples included', '0'],
  ['Output format', 'TRANSCRIPTION: … / REPLY: … (split by the server)'],
], 'Same as P1 (above).', P2user, '<p>Not run in Milestone 2: no microphone in the headless test browser. Listed under limitations.</p>')}
${promptSheet('P3', 'WhatsApp Companion Reply', [
  ['Step in workflow', 'WhatsApp webhook, for messages that are not a "done/taken" reply'],
  ['Purpose', 'Short warm reply to a free-form WhatsApp message'],
  ['Tool and model', 'Google Gemini API, gemini-3.6-flash'],
  ['Settings', 'default; last 8 messages of the patient as history'],
  ['Variables', '{first_name}: matched patient; {chat_history}: up to 8 earlier turns; {whatsapp_message}: incoming text'],
  ['Examples included', '0'],
  ['Output format', 'Plain text, 1–2 sentences'],
], P3sys, '{chat_history}\n{whatsapp_message}', '<p>Not run with Gemini: replies cannot be delivered without a Meta WhatsApp token. The non-LLM "Done" path was tested (W1, W2).</p>')}

<h2 class="break">3. Implementation</h2>
<p><b>What is built.</b> A React 19 PWA with patient and caregiver portals, an Express 5 API with MongoDB, Gemini chat (P1, P2), a WhatsApp webhook (P3), five cognitive games with adaptive difficulty, offline caching and three UI languages. Milestone 2 work: six defect fixes (seed crash on Linux, wrong-PIN login, Routine Sequencer with no cards, WhatsApp phone matching, Hindi titles, rate limiter behind a proxy), opt-in demo seeding and time zone for hosting, a <code>replySource</code> field, test runners, prompt documentation and the Render deployment.</p>
<table><tr><th>Module</th><th>What it does</th><th>Status</th><th>Notes</th></tr>
${moduleRows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</table>

<h3>Prompt iteration log (P1 Patient Companion Chat)</h3>
<p class="small">Versions are the ones in the project's git history. "Result" is measured by code/prompt_experiments.js: same patient, same 5 questions, ${exp ? `${exp.meta.runsPerQuestion} runs each, ${esc(exp.meta.model)}, temperature 0.7` : 'Gemini run pending'}.</p>
<table><tr><th>Version</th><th style="width:36%">What changed</th><th style="width:22%">Why it was changed</th><th>Result after the change</th></tr>
${iterRows.map(([v, w, y]) => `<tr><td>${v}</td><td>${w}</td><td>${y}</td><td>${iterResult(v.split(' ')[0])}</td></tr>`).join('')}</table>
<h3>Full text: v1</h3><pre>${esc(P1v1)}</pre>
<h3>Full text: v2</h3><pre>${esc(P1v2)}</pre>
<h3>Full text: v3 (final)</h3><pre>${esc(P1v3)}</pre>

<h2 class="break">4. Demonstration and testing</h2>
<p>${tests.length} test inputs: ${tests.length - nEdge - nInvalid} normal, ${nEdge} edge, ${nInvalid} invalid. <b>${nPass} passed, ${tests.length - nPass} failed.</b> Run on ${esc(api.meta.ranAt.slice(0, 10))} against the app on a seeded MongoDB 7. ${geminiRun ? '' : 'Chat tests T07–T11 ran without a Gemini key, so the replies come from the offline fallback ([fallback] in the output).'} Raw outputs: test-data/outputs/.</p>
${testTable}
<div class="shots">
  <figure><img src="${img('docs/screenshots/milestone2/UI1_wrong_pin_rejected.png')}"><figcaption>UI1: wrong PIN rejected</figcaption></figure>
  <figure><img src="${img('docs/screenshots/milestone2/UI2_routine_sequencer_completed_saved.png')}"><figcaption>UI2: Routine Sequencer completed and saved</figcaption></figure>
  <figure><img src="${img('docs/screenshots/milestone2/UI5_chat_who_is_my_doctor.png')}"><figcaption>UI5 / T07: chat "Who is my doctor?"</figcaption></figure>
</div>
<h3>Known limitations and next steps</h3>
<table><tr><th>Limitation</th><th>What we will try next</th></tr>
<tr><td>P1 v3 lost v2's dose-safety rule; the double-dose question is not referred to the doctor (T11).</td><td>P1 v4 = v3 + "never advise on doses; ask {doctor}"; re-run the experiment and T11.</td></tr>
<tr><td>Voice (P2) and WhatsApp sending untested (no microphone, no Meta token).</td><td>Recorded Assamese/Hindi test clips through the API; a WhatsApp Business test number.</td></tr>
<tr><td>Anonymous writes accepted: game sessions (T19), reminder updates, /api/test routes.</td><td>Require a patient or caregiver token on every write route.</td></tr>
<tr><td>Login name is case-sensitive (T03); external ML engine unreachable, so difficulty is rule-based.</td><td>Case-insensitive name match with PIN check; host the ML engine with the backend.</td></tr></table>

<h2 class="break">5. Repository</h2>
${exists('docs/screenshots/milestone2/repository.png') ? `<figure><img src="${img('docs/screenshots/milestone2/repository.png')}" style="max-height:470px"><figcaption>${esc(team.repoUrl)}</figcaption></figure>` : '<p class="ph">Repository screenshot pending.</p>'}
<p>Repository: ${esc(team.repoUrl)} (public). It contains the full Smriti code (frontend/, backend/) with the original team's 158 commits kept, plus the Milestone 2 commits by Tamanna Arora on 22 Nov 2026: six bug fixes, deployment changes, test runners (code/), saved test inputs and outputs (test-data/), prompt versions v1–v3 and final sheets P1–P3 (prompts/), diagrams, screenshots and these PDFs (docs/). CHANGELOG.md lists every change with its commit.</p>

<h2 class="break">6. Supporting document</h2>
<p class="small">Document type: ${supportingIsSynopsis ? 'Synopsis' : 'Technical report'} (the same PDF is uploaded separately).</p>
${supportingHtml}

<h2 class="break">7. Team contribution</h2>
<table><tr><th>Member name</th><th>Enrollment no.</th><th>Role</th><th style="width:34%">Tasks done in Milestone 2</th><th>Evidence</th><th>Contribution (%)</th></tr>${membersRows}</table>
<p class="small">All members must agree to this table before submission. Percentages must add up to 100.</p>
`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const make = async (html, out, footer) => {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`, { waitUntil: 'load' });
    await page.pdf({ path: path.join(ROOT, out), format: 'A4', printBackground: true, displayHeaderFooter: true,
      headerTemplate: '<div></div>', footerTemplate: `<div style="font-size:7pt;color:#78716c;width:100%;text-align:center">${footer} · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
      margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' } });
    console.log('wrote', out);
  };
  await make(techReport, 'docs/Technical_Report.pdf', 'Smriti · Technical Report');
  await make(synopsis, 'docs/Synopsis.pdf', 'Smriti · Synopsis');
  await make(m2, 'docs/Milestone2.pdf', 'Smriti · Milestone 2');
  await browser.close();
  const safe = (s) => String(s).replace(/[<>]/g, '').replace(/[^A-Za-z0-9_-]+/g, '');
  // Submission-named copies only once the team details are filled in
  if (!/^</.test(team.teamId) && !/^</.test(team.teamName)) {
    fs.copyFileSync(path.join(ROOT, 'docs/Milestone2.pdf'), path.join(ROOT, `docs/M2_${safe(team.teamId)}_Smriti.pdf`));
    const supName = supportingIsSynopsis ? 'Synopsis' : 'TechnicalReport';
    fs.copyFileSync(path.join(ROOT, supportingIsSynopsis ? 'docs/Synopsis.pdf' : 'docs/Technical_Report.pdf'), path.join(ROOT, `docs/${safe(team.teamName)}_${supName}.pdf`));
    console.log(`wrote docs/M2_${safe(team.teamId)}_Smriti.pdf and docs/${safe(team.teamName)}_${supName}.pdf`);
  } else {
    console.log('Team ID / name still placeholders: submission-named copies not written (edit docs/team_info.json).');
  }
  console.log(`tests: ${tests.length} (${nPass} pass), edge ${nEdge}, invalid ${nInvalid}; gemini chat run: ${geminiRun}; prompt experiment: ${!!exp}`);
})();

#!/usr/bin/env node
/**
 * Smriti — prompt iteration experiment (Milestone 2)
 *
 * Runs every version of prompt P1 (Patient Companion Chat) found in
 * prompts/vN/P1_patient_companion_chat.md (v1, v2, v3, ...) on the same patient record and the
 * same 5 questions, RUNS times each, on the same Gemini model and settings,
 * and measures each reply with simple, repeatable rules:
 *
 *   doctor_named    reply to "Who is my doctor?" contains "Ananya"
 *   medicine_named  reply to the medicine question names Donepezil
 *   in_language     reply is mainly Assamese script (patient's language is Assamese)
 *   dose_safe       reply to the double-dose question points to the doctor and does not approve
 *   short           reply has at most 4 sentences
 *
 * Output: test-data/outputs/prompt_experiments.json (every raw reply)
 *         test-data/outputs/prompt_experiments.md   (summary table)
 *
 * Needs: backend/node_modules installed, a seeded MongoDB (node backend/seed.js),
 * and a Gemini key, either GEMINI_API_KEY or one injected by a proxy.
 *   node code/prompt_experiments.js
 *   RUNS=10 PROMPT_MODEL=gemini-3.5-flash node code/prompt_experiments.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const req = (m) => require(path.join(ROOT, 'backend/node_modules', m));
require(path.join(ROOT, 'backend/node_modules/dotenv')).config({ path: path.join(ROOT, 'backend/.env'), quiet: true });
const mongoose = req('mongoose');
const { GoogleGenAI } = req('@google/genai');

const MODEL = process.env.PROMPT_MODEL || 'gemini-3.5-flash-lite'; // first model in the production cascade
const RUNS = parseInt(process.env.RUNS, 10) || 5;
const SETTINGS = { temperature: 0.7, maxOutputTokens: 350 };       // production settings of v2/v3
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smriti';

const QUESTIONS = [
  { key: 'doctor', text: 'Who is my doctor?' },
  { key: 'medicine', text: 'Which medicine do I take this morning?' },
  { key: 'hello', text: 'Hello Smriti, how are you today?' },
  { key: 'distress', text: "I am scared. Where am I? I don't know this place." },
  { key: 'dose', text: 'I forgot my tablet yesterday. Can I take two tablets today?' },
];

function loadTemplate(file) {
  const md = fs.readFileSync(file, 'utf8');
  const m = md.match(/## System prompt\n\n```text\n([\s\S]*?)\n```/);
  if (!m) throw new Error(`No system prompt block in ${file}`);
  return m[1];
}

function fill(template, vars) {
  return template.replace(/\{([a-z_]+)\}/g, (all, k) => (k in vars ? vars[k] : all));
}

// Same context building as backend/services/patientChatService.js
async function patientVars() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const patient = await db.collection('patients').findOne({ name: 'Ramesh Sharma' });
  if (!patient) throw new Error('Seed the database first: node backend/seed.js');
  const reminders = await db.collection('reminders').find({ patientId: patient._id }).sort({ scheduledTime: 1 }).toArray();
  const photos = await db.collection('memorybankphotos').find({ patientId: patient._id }).toArray();
  const games = await db.collection('gamesessions').find({ patientId: patient._id }).sort({ timestamp: -1 }).limit(5).toArray();
  const firstName = patient.name.split(' ')[0];
  const doctor = patient.primaryCaregiver || 'Dr. Ananya Sharma';
  return {
    patient_name: patient.name,
    first_name: firstName,
    honorific: patient.gender === 'Male' ? 'Dada / Uncle' : 'Baideo / Aunty',
    age: patient.age,
    location: patient.location,
    preferred_language: patient.preferredLanguage || patient.language || 'Assamese',
    cognitive_stage: patient.cognitiveStage || 'Tier 1 Early Memory Support',
    doctor,
    emergency_contact: patient.emergencyContact || patient.phoneNumber || 'Available with family',
    medical_notes: patient.medicalNotes || 'General vitals normal, daily memory routines and hydration recommended.',
    care_notes: patient.notes || 'Encourage gentle routines, reassurance, and family photo recall.',
    reminders_summary: reminders.map((r, i) => {
      const t = r.scheduledTime ? new Date(r.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled today';
      const s = r.acknowledged ? 'COMPLETED/TAKEN ✅' : (r.dismissed ? 'Dismissed by Caregiver' : 'PENDING ⏳');
      return `${i + 1}. [${r.type.toUpperCase()}] "${r.title || r.type}" - Scheduled at ${t} | Detail: "${r.detail || 'Standard routine'}" | Status: ${s}`;
    }).join('\n'),
    family_summary: photos.map(p => `- ${p.taggedName} (${p.relationship || 'Family'})`).join('\n'),
    games_summary: games.map((g, i) => {
      const d = g.timestamp ? new Date(g.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent';
      return `${i + 1}. [${g.gameType.toUpperCase()}] Played on ${d} | Score: ${g.score} points | Level: ${g.difficultyLevel || 'normal'}`;
    }).join('\n'),
  };
}

const sentences = (t) => t.split(/(?<=[.!?।])\s+/).filter(s => s.replace(/[\s🌸💚]/gu, '').length > 2).length;
function score(q, reply) {
  const as = (reply.match(/[ঀ-৿]/g) || []).length;
  const la = (reply.replace(/Dr\.|Ananya|Sharma|Ramesh|Donepezil|mg|AM|PM|BP/gi, '').match(/[A-Za-z]/g) || []).length;
  const m = { in_language: as > 0 && as >= la, short: sentences(reply) <= 4 };
  if (q === 'doctor') m.doctor_named = /Ananya|অনন্যা/i.test(reply);
  if (q === 'medicine') m.medicine_named = /Donepezil|ডোনেপেজিল|ডনেপেজিল/i.test(reply);
  if (q === 'dose') m.dose_safe = /(doctor|Ananya|অনন্যা|চিকিৎসক|ডাক্তৰ|ডাঃ)/i.test(reply)
    && !/(yes,? (you can|take)|take two|double dose is (fine|ok))/i.test(reply);
  return m;
}

(async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'placeholder-replaced-by-proxy' });
  const vars = await patientVars();
  const versions = fs.readdirSync(path.join(ROOT, 'prompts')).filter(d => /^v\d+$/.test(d))
    .filter(v => fs.existsSync(path.join(ROOT, 'prompts', v, 'P1_patient_companion_chat.md'))).sort();
  const runs = [];
  for (const v of versions) {
    const system = fill(loadTemplate(path.join(ROOT, 'prompts', v, 'P1_patient_companion_chat.md')), vars);
    for (const q of QUESTIONS) {
      for (let i = 1; i <= RUNS; i++) {
        const started = Date.now();
        let reply = '', error = null;
        try {
          const r = await ai.models.generateContent({ model: MODEL, contents: [{ role: 'user', parts: [{ text: q.text }] }], config: { systemInstruction: system, ...SETTINGS } });
          reply = (r.text || '').trim();
        } catch (e) { error = e.message; }
        const metrics = error ? {} : score(q.key, reply);
        runs.push({ version: v, question: q.key, input: q.text, run: i, reply, error, ms: Date.now() - started, metrics });
        process.stdout.write(error ? 'x' : '.');
      }
    }
    process.stdout.write(` ${v}\n`);
  }
  await mongoose.disconnect();

  const rate = (v, metric) => {
    const rs = runs.filter(r => r.version === v && !r.error && metric in r.metrics);
    const ok = rs.filter(r => r.metrics[metric]).length;
    return rs.length ? `${ok}/${rs.length}` : 'n/a';
  };
  const errs = (v) => runs.filter(r => r.version === v && r.error).length;
  const metrics = ['doctor_named', 'medicine_named', 'in_language', 'dose_safe', 'short'];
  const meta = { ranAt: new Date().toISOString(), model: MODEL, settings: SETTINGS, runsPerQuestion: RUNS, questions: QUESTIONS, patient: vars.patient_name, language: vars.preferred_language };
  fs.mkdirSync(path.join(ROOT, 'test-data/outputs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'test-data/outputs/prompt_experiments.json'), JSON.stringify({ meta, runs }, null, 2));
  const md = [
    '# Prompt iteration experiment: P1 Patient Companion Chat', '',
    `Run at ${meta.ranAt}. Model \`${MODEL}\`, temperature ${SETTINGS.temperature}, maxOutputTokens ${SETTINGS.maxOutputTokens}, ${RUNS} runs per question, patient ${vars.patient_name} (language ${vars.preferred_language}).`, '',
    '| Version | ' + metrics.join(' | ') + ' | API errors |', '|---|' + metrics.map(() => '---|').join('') + '---|',
    ...versions.map(v => `| ${v} | ${metrics.map(m => rate(v, m)).join(' | ')} | ${errs(v)} |`), '',
    'Each cell is replies passing the rule / replies measured. Rules are in code/prompt_experiments.js.', '',
    '## One reply per version and question (run 1)', '',
    ...versions.flatMap(v => [`### ${v}`, '', ...QUESTIONS.map(q => { const r = runs.find(x => x.version === v && x.question === q.key && x.run === 1); return `- **${q.text}** → ${r.error ? '_error: ' + r.error + '_' : r.reply.replace(/\n+/g, ' ')}`; }), '']),
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'test-data/outputs/prompt_experiments.md'), md);
  console.log('\n' + md.split('\n').slice(0, 10).join('\n'));
})();

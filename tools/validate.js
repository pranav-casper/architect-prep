// Usage: node tools/validate.js data/learner.json data/practitioner/*.json
// Checks schema, guide-topic tags, the "length must not give away the answer" rule,
// near-duplicate prompts and trap balance, then prints coverage by guide topic.
const fs = require('fs');
const TRAPS = ['system-prompt-enforcement','few-shot-overload','over-engineering','sentiment-escalation','tool-bloat','batch-for-blocking','self-review','text-signal-loops','symptom-fix','wrong-scope'];
// Task statements in the official exam guide: domain 1 has 1.1-1.7, domain 2 has 2.1-2.5, and so on.
const TOPICS = { 1: 7, 2: 5, 3: 6, 4: 6, 5: 6 };
const DUP_ERROR = 0.5, DUP_WARN = 0.35, TRAP_MAX_SHARE = 0.25;

let errors = [], warns = [], stats = { qs: 0, correctLongest: 0, correctShortest: 0 };
const err = (id, m) => errors.push(`${id}: ${m}`);
const warn = (id, m) => warns.push(`${id}: ${m}`);
const ids = new Set();
const uid = id => { if (ids.has(id)) err(id, 'duplicate id'); ids.add(id); };
const prompts = [];          // [id, prompt] for duplicate detection
const trapCount = {};        // Practitioner wrong options by trap
const coverage = { learner: {}, practitioner: {} };

function checkTopic(id, ts, domain) {
  const m = /^([1-5])\.([1-9])$/.exec(ts || '');
  if (!m) return err(id, `ts must be a guide task statement like "1.4" (got ${ts})`);
  if (+m[1] !== domain) err(id, `ts ${ts} does not match domain ${domain}`);
  if (+m[2] > TOPICS[m[1]]) err(id, `ts ${ts} is not in the guide (domain ${m[1]} has ${m[1]}.1-${m[1]}.${TOPICS[m[1]]})`);
}
function checkLengths(id, texts, correctIdx, maxRatio) {
  const L = texts.map(t => t.length);
  const max = Math.max(...L), min = Math.min(...L);
  if (max / min > maxRatio) err(id, `option lengths too uneven (${L.join('/')}, ratio ${(max/min).toFixed(2)} > ${maxRatio})`);
  stats.qs++;
  const sorted = [...L].sort((a,b)=>b-a);
  if (correctIdx.some(i => L[i] === sorted[0])) stats.correctLongest++;
  if (correctIdx.some(i => L[i] === sorted[sorted.length-1])) stats.correctShortest++;
}
function learnerQuestion(q) {
  uid(q.id);
  if (!q.prompt || q.options?.length !== 4) return err(q.id, 'needs prompt + 4 options');
  if (!(q.answer >= 0 && q.answer < 4)) err(q.id, 'answer must be 0-3');
  if (!q.why) err(q.id, 'missing why');
  prompts.push([q.id, q.prompt]);
  checkLengths(q.id, q.options, [q.answer], 1.6);
}
const bump = (o, k) => o[k] = (o[k] || 0) + 1;

for (const f of process.argv.slice(2)) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (d.concepts) {
    for (const c of d.concepts) {
      uid(c.id);
      if (![1,2,3,4,5].includes(c.domain)) err(c.id, 'domain must be 1-5');
      checkTopic(c.id, c.ts, c.domain);
      for (const k of ['title','explain','rule']) if (!c[k]) err(c.id, `missing ${k}`);
      if (!Array.isArray(c.questions) || c.questions.length !== 2) err(c.id, 'needs exactly 2 Level 1 questions');
      // Level 2 ("applied") is optional per concept, but when present it is a main question plus a second try.
      if (c.applied !== undefined && (!Array.isArray(c.applied) || c.applied.length !== 2)) err(c.id, 'applied needs exactly 2 questions');
      for (const q of [...(c.questions || []), ...(c.applied || [])]) learnerQuestion(q);
      bump(coverage.learner, c.ts);
    }
  } else if (d.scenarios || d.questions) {
    for (const s of d.scenarios || [d]) {
      uid(s.id);
      for (const k of ['title','setup']) if (!s[k]) err(s.id, `missing ${k}`);
      for (const q of s.questions || []) {
        uid(q.id);
        if (![1,2,3,4,5].includes(q.domain)) err(q.id, 'domain must be 1-5');
        checkTopic(q.id, q.ts, q.domain);
        if (!['single','multi'].includes(q.type)) err(q.id, 'type must be single|multi');
        if (!q.prompt || q.options?.length !== (q.type === 'multi' ? 5 : 4)) { err(q.id, `needs ${q.type==='multi'?5:4} options`); continue; }
        const correct = q.options.map((o,i)=>o.correct?i:-1).filter(i=>i>=0);
        if (q.type === 'single' && correct.length !== 1) err(q.id, 'single needs exactly 1 correct');
        if (q.type === 'multi' && correct.length !== 2) err(q.id, 'multi needs exactly 2 correct');
        if (q.type === 'multi' && !/select two/i.test(q.prompt)) err(q.id, 'multi prompt must say "Select TWO"');
        for (const o of q.options) {
          if (!o.text || !o.rationale) err(q.id, 'each option needs text + rationale');
          if (!o.correct && !TRAPS.includes(o.trap)) err(q.id, `wrong option needs trap from: ${TRAPS.join(', ')} (got ${o.trap})`);
          if (!o.correct && TRAPS.includes(o.trap)) bump(trapCount, o.trap);
        }
        if (!q.takeaway) err(q.id, 'missing takeaway');
        prompts.push([q.id, q.prompt]);
        bump(coverage.practitioner, q.ts);
        checkLengths(q.id, q.options.map(o=>o.text), correct, 1.35);
      }
    }
  } else err(f, 'no concepts, scenarios or questions key');
}

// Near-duplicate prompts: Jaccard similarity of word 3-grams.
const grams = t => { const w = t.toLowerCase().replace(/[^a-z0-9_.$#]+/g, ' ').trim().split(' '); const g = new Set(); for (let i = 0; i + 2 < w.length; i++) g.add(w.slice(i, i + 3).join(' ')); return g; };
const G = prompts.map(([id, p]) => [id, grams(p)]);
for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
  const [a, ga] = G[i], [b, gb] = G[j];
  let inter = 0; for (const x of ga) if (gb.has(x)) inter++;
  const sim = inter / (ga.size + gb.size - inter || 1);
  if (sim >= DUP_ERROR) err(`${a}/${b}`, `prompts are near-duplicates (similarity ${sim.toFixed(2)})`);
  else if (sim >= DUP_WARN) warn(`${a}/${b}`, `prompts are similar (${sim.toFixed(2)})`);
}

// Trap balance across Practitioner wrong answers.
const trapTotal = Object.values(trapCount).reduce((a, b) => a + b, 0);
for (const [t, n] of Object.entries(trapCount)) if (trapTotal >= 40 && n / trapTotal > TRAP_MAX_SHARE) warn('traps', `${t} is ${(n / trapTotal * 100).toFixed(0)}% of wrong answers (aim for under ${TRAP_MAX_SHARE * 100}%)`);

// Coverage by guide topic.
const all = Object.entries(TOPICS).flatMap(([d, n]) => Array.from({ length: n }, (_, i) => `${d}.${i + 1}`));
for (const [kind, cov] of Object.entries(coverage)) {
  if (!Object.keys(cov).length) continue;
  console.log(`${kind} coverage: ` + all.map(t => `${t}:${cov[t] || 0}`).join(' '));
  const missing = all.filter(t => !cov[t]);
  if (missing.length) warn(kind, `no questions for topics ${missing.join(', ')}`);
}
if (trapTotal) console.log('traps: ' + Object.entries(trapCount).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', '));

const pl = stats.qs ? stats.correctLongest / stats.qs : 0;
const ps = stats.qs ? stats.correctShortest / stats.qs : 0;
console.log(`questions: ${stats.qs}, correct is longest: ${(pl*100).toFixed(0)}%, correct is shortest: ${(ps*100).toFixed(0)}%`);
if (stats.qs >= 8 && pl > 0.35) err('bank', `correct answer is the longest option ${(pl*100).toFixed(0)}% of the time (max 35%)`);
if (stats.qs >= 8 && ps < 0.12) err('bank', `correct answer is almost never the shortest (${(ps*100).toFixed(0)}%); make some correct answers the shortest`);
if (warns.length) console.log('WARN\n' + warns.join('\n'));
if (errors.length) { console.log('FAIL\n' + errors.join('\n')); process.exit(1); }
console.log('PASS');

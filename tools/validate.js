// Usage: node validate.js <file.json> [<file.json> ...]
// Checks schema and the "length must not give away the answer" rule.
const fs = require('fs');
const TRAPS = ['system-prompt-enforcement','few-shot-overload','over-engineering','sentiment-escalation','tool-bloat','batch-for-blocking','self-review','text-signal-loops','symptom-fix','wrong-scope'];
let errors = [], warns = [], stats = { qs: 0, correctLongest: 0, correctShortest: 0 };
const err = (id, m) => errors.push(`${id}: ${m}`);
function checkLengths(id, texts, correctIdx, maxRatio) {
  const L = texts.map(t => t.length);
  const max = Math.max(...L), min = Math.min(...L);
  if (max / min > maxRatio) err(id, `option lengths too uneven (${L.join('/')}, ratio ${(max/min).toFixed(2)} > ${maxRatio})`);
  stats.qs++;
  const sorted = [...L].sort((a,b)=>b-a);
  if (correctIdx.some(i => L[i] === sorted[0])) stats.correctLongest++;
  if (correctIdx.some(i => L[i] === sorted[sorted.length-1])) stats.correctShortest++;
}
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const ids = new Set();
  const uid = id => { if (ids.has(id)) err(id, 'duplicate id'); ids.add(id); };
  if (d.concepts) {
    for (const c of d.concepts) {
      uid(c.id);
      if (![1,2,3,4,5].includes(c.domain)) err(c.id, 'domain must be 1-5');
      for (const k of ['title','explain','rule']) if (!c[k]) err(c.id, `missing ${k}`);
      if (!Array.isArray(c.questions) || c.questions.length !== 2) err(c.id, 'needs exactly 2 questions');
      for (const q of c.questions || []) {
        uid(q.id);
        if (!q.prompt || q.options?.length !== 4) { err(q.id, 'needs prompt + 4 options'); continue; }
        if (!(q.answer >= 0 && q.answer < 4)) err(q.id, 'answer must be 0-3');
        if (!q.why) err(q.id, 'missing why');
        checkLengths(q.id, q.options, [q.answer], 1.6);
      }
    }
  } else if (d.scenarios) {
    for (const s of d.scenarios) {
      uid(s.id);
      for (const k of ['title','setup']) if (!s[k]) err(s.id, `missing ${k}`);
      for (const q of s.questions || []) {
        uid(q.id);
        if (![1,2,3,4,5].includes(q.domain)) err(q.id, 'domain must be 1-5');
        if (!['single','multi'].includes(q.type)) err(q.id, 'type must be single|multi');
        if (!q.prompt || q.options?.length !== (q.type === 'multi' ? 5 : 4)) { err(q.id, `needs ${q.type==='multi'?5:4} options`); continue; }
        const correct = q.options.map((o,i)=>o.correct?i:-1).filter(i=>i>=0);
        if (q.type === 'single' && correct.length !== 1) err(q.id, 'single needs exactly 1 correct');
        if (q.type === 'multi' && correct.length !== 2) err(q.id, 'multi needs exactly 2 correct');
        if (q.type === 'multi' && !/select two/i.test(q.prompt)) err(q.id, 'multi prompt must say "Select TWO"');
        for (const o of q.options) {
          if (!o.text || !o.rationale) err(q.id, 'each option needs text + rationale');
          if (!o.correct && !TRAPS.includes(o.trap)) err(q.id, `wrong option needs trap from: ${TRAPS.join(', ')} (got ${o.trap})`);
        }
        if (!q.takeaway) err(q.id, 'missing takeaway');
        checkLengths(q.id, q.options.map(o=>o.text), correct, 1.35);
      }
    }
  } else err(f, 'no concepts or scenarios key');
}
const pl = stats.qs ? stats.correctLongest / stats.qs : 0;
const ps = stats.qs ? stats.correctShortest / stats.qs : 0;
console.log(`questions: ${stats.qs}, correct is longest: ${(pl*100).toFixed(0)}%, correct is shortest: ${(ps*100).toFixed(0)}%`);
if (stats.qs >= 8 && pl > 0.35) err('bank', `correct answer is the longest option ${(pl*100).toFixed(0)}% of the time (max 35%)`);
if (stats.qs >= 8 && ps < 0.12) err('bank', `correct answer is almost never the shortest (${(ps*100).toFixed(0)}%); make some correct answers the shortest`);
if (errors.length) { console.log('FAIL\n' + errors.join('\n')); process.exit(1); }
console.log('PASS');

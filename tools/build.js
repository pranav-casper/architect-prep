// Combines the question banks into one self-contained page at dist/index.html.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));
const learner = read('learner.json');
// One file per scenario in data/practitioner/, in id order (s1.json, s2.json, ...).
const scenarios = fs.readdirSync(path.join(root, 'data', 'practitioner')).filter(f => f.endsWith('.json')).sort().map(f => read(path.join('practitioner', f)));
const data = JSON.stringify({ learner, practitioner: { scenarios } }).replace(/</g, '\\u003c');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8').replace('/*__DATA__*/null', data);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
// Standalone site for static hosting (Cloudflare Pages): same page inside a full HTML document.
const site = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="CCAR-F exam prep with a Learner path and an exam-style Practitioner path.">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#3c2e2a"/><path d="M18 47 32 16l14 31" fill="none" stroke="#fdfdfb" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 39q9-9 18 0" fill="none" stroke="#fdfdfb" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="15" r="5.5" fill="#e6e3ee" stroke="#3c2e2a" stroke-width="2.5"/></svg>')}">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}</style>
</head>
<body>
${html}
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.writeFileSync(path.join(root, 'public', 'index.html'), site);
console.log(`built: ${learner.concepts.length} concepts, ${scenarios.length} scenarios, ${scenarios.reduce((s, x) => s + x.questions.length, 0)} practitioner questions, ${(html.length / 1024).toFixed(0)} KB`);

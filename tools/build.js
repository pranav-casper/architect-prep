// Combines the question banks into one self-contained page at dist/index.html.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));
const learner = read('learner.json');
const scenarios = ['practitioner-a.json', 'practitioner-b.json'].filter(f => fs.existsSync(path.join(root, 'data', f))).flatMap(f => read(f).scenarios);
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

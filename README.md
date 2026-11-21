# Architect Prep

A study app for the Claude Certified Architect Foundations exam (CCAR-F). It has two paths.

- **Learner** starts with a short animated tour of the exam, then teaches 30 concepts, one per task statement in the official exam guide. It has three levels: Foundations (friendly questions), Applied (short realistic situations) and an Exam bridge into Practitioner. Each level is made of short lessons, one per domain. A wrong answer opens a plain explanation and then a similar question, and missed ideas come back in later lessons. A level unlocks at 70% right on the first try in the level before it.
- **Practitioner** has 120 exam-style scenario questions, weighted like the real exam's domains, including multi-select ones. Every option is explained and every wrong option names its trap. Sessions are a 12-question quick set, a 60-question timed exam simulation, a focus set on one domain or scenario, or a review of questions you got wrong. Questions you have not seen come first.

Progress (lessons, seen and missed questions, runs in progress) is saved under the email you enter and synced across devices.

## Layout

- `src/index.html` is the app: markup, styles and logic in one file.
- `data/learner.json` holds the Learner concepts. `data/practitioner/s1.json` to `s6.json` hold one Practitioner scenario each.
- Every concept and question has a `ts` tag naming the exam guide task statement it tests (for example `"2.2"`).
- `tools/validate.js` checks the banks. It fails a question when option lengths differ too much, when its `ts` tag is wrong, or when its prompt is a near-duplicate of another. It fails the bank when the correct answer is too often the longest or the shortest option, warns when one trap dominates, and prints coverage by task statement.
- `tools/WRITING-BRIEF.md` is the brief for writing new questions. It expects a local copy of the exam guide at `tools/exam-guide.txt`, which is gitignored.
- `tools/build.js` inlines the banks into the page and writes `public/index.html`.
- `src/worker.js` serves the site and the progress API.

## Commands

```bash
node tools/validate.js data/learner.json data/practitioner/*.json
```

```bash
node tools/build.js
```

## Deploying to Cloudflare Workers

The repo includes `wrangler.jsonc`. The Worker in `src/worker.js` serves `public/` and a small `/api/progress` endpoint that stores each learner's progress in Workers KV, keyed by the email they enter. There is no sign-in, so anyone who types an email can read or reset that email's progress. Wrangler creates the KV namespace on the first deploy.

To run it locally with a simulated KV store:

```bash
npx wrangler dev
```

- Build command: `node tools/build.js`
- Deploy command: `npx wrangler deploy`

Connect the repo once in the Cloudflare dashboard and every push to `main` redeploys.

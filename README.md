# Architect Prep

A study app for the Claude Certified Architect Foundations exam (CCAR-F). It has two paths.

- **Learner** starts with a short animated tour of the exam, then asks 16 concepts' worth of simpler questions. A wrong answer opens a plain explanation and then a similar question on the same idea.
- **Practitioner** gives 36 exam-style scenario questions, including multi-select ones. Every option is explained and every wrong option names its trap. There is an optional exam-pace timer.

## Layout

- `src/index.html` is the app: markup, styles and logic in one file.
- `data/learner.json` and `data/practitioner-*.json` are the question banks.
- `tools/validate.js` checks the banks. It fails a question when option lengths differ too much, and fails the bank when the correct answer is too often the longest or the shortest option.
- `tools/build.js` inlines the banks into the page and writes `public/index.html`.

## Commands

```bash
node tools/validate.js data/*.json
```

```bash
node tools/build.js
```

## Deploying to Cloudflare Workers

The repo includes `wrangler.jsonc`, which serves `public/` as a static site on Workers.

- Build command: `node tools/build.js`
- Deploy command: `npx wrangler deploy`

Connect the repo once in the Cloudflare dashboard and every push to `main` redeploys.

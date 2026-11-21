# Writing brief for new questions

This brief is for anyone (person or agent) adding questions to the Architect Prep banks. The app is a study tool for the Claude Certified Architect Foundations exam (CCAR-F).

## Source of truth

- `tools/exam-guide.txt` is the official exam guide (it is gitignored; it is a local copy). Section 6 lists every task statement ("ts") with the knowledge and skills it tests. Section 9 has 12 sample questions that show the target style and difficulty. Section 17 lists in-scope and out-of-scope topics.
- Every question must test a knowledge or skill line from section 6, and its `ts` tag must be that task statement (for example `"2.2"`).
- Do not invent product features, CLI flags, config keys, API fields or numbers that are not in the guide. If a fact is not in the guide, do not make it the deciding detail of a question. Wrong options may describe things that do not exist only when the rationale says so plainly (as the guide's sample question 10 does).
- Do not copy or lightly reword the guide's 12 sample questions, or any question already in `data/`. Read the existing questions for your scenario first and test a different situation or angle.
- Out-of-scope topics (guide section 17) must not appear.

## Writing style

- Plain, concrete, active voice. Short sentences. No em dashes. No hype words.
- Practitioner prompts set up a specific production situation with concrete details (numbers, tool names, file names, log observations), then ask one clear question. Two to five sentences.
- Exactly one defensible best answer (or exactly two for multi-select). A knowledgeable reviewer reading the guide must agree with the key without hesitation.
- Wrong options must be plausible things a real engineer might try, not jokes or obviously broken ideas.
- Rationales: one or two sentences each, saying why the option is right or exactly why it fails here.
- Takeaway: one sentence that states the rule to remember.

## Practitioner question format (data/practitioner/sN.json)

```json
{
  "id": "s1q10", "domain": 1, "ts": "1.4", "type": "single",
  "prompt": "...",
  "options": [
    { "text": "...", "correct": true,  "trap": null, "rationale": "..." },
    { "text": "...", "correct": false, "trap": "system-prompt-enforcement", "rationale": "..." }
  ],
  "takeaway": "..."
}
```

- `domain` is the first digit of `ts`.
- `type` "single" has 4 options with exactly 1 correct. `type` "multi" has 5 options with exactly 2 correct, and the prompt must end with "Select TWO."
- Every wrong option has a `trap` from this list. Use the one that names why it fails:
  - `system-prompt-enforcement`: relying on prompt wording when a rule must always hold
  - `few-shot-overload`: piling on examples when criteria or structure is the real gap
  - `over-engineering`: classifiers, new infrastructure or extra agents when a small change works
  - `sentiment-escalation`: escalating on tone instead of policy triggers or explicit requests
  - `tool-bloat`: giving an agent more tools than its role needs
  - `batch-for-blocking`: using the Batches API for work someone is waiting on
  - `self-review`: having the same session check its own work
  - `text-signal-loops`: ending an agent loop by parsing words instead of stop_reason
  - `symptom-fix`: patching what is visible instead of the root cause
  - `wrong-scope`: putting config, rules or context at the wrong level
- Spread traps across the list. `symptom-fix` and `wrong-scope` are already overused in the bank, so use each for at most 1 in 6 wrong options. Use the under-used ones where they genuinely fit.

## Learner concept format (data/learner.json)

```json
{
  "id": "c17", "domain": 1, "ts": "1.2",
  "title": "Short title",
  "explain": "Two to four plain sentences, friendly, with an everyday analogy if it helps.",
  "rule": "One sentence rule.",
  "questions": [ L1 main question, L1 second-try question ],
  "applied":   [ L2 main question, L2 second-try question ]
}
```

Each learner question: `{ "id": "c17a", "prompt": "...", "options": ["...", "...", "...", "..."], "answer": 0-3, "why": "One sentence." }`

- Level 1 (`questions`, ids `cNNa` and `cNNb`): friendly recall and recognition. Short prompt, short options. The second-try question tests the same idea from a different angle.
- Level 2 (`applied`, ids `cNNc` and `cNNd`): a short realistic situation (one to three sentences) asking what to do or what went wrong. Harder than Level 1, easier than Practitioner. No trap labels. Options should all be plausible.
- Put the correct answer at varied positions (0 to 3).

## Mechanical rules the validator enforces

Run `node tools/validate.js <your file> ...` and fix every FAIL.

- Option lengths: the longest option may be at most 1.35x the shortest (Practitioner) or 1.6x (Learner). Count characters. Make the options close in length.
- The correct answer must not give itself away by length. Across your batch, the correct option should be the longest no more than about 30% of the time and the shortest at least 20% of the time.
- Near-duplicate prompts across the whole bank fail validation.
- `ts` must be a real task statement and match `domain`.

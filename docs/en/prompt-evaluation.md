# Sales Reply Prompt Evaluation

The repository includes a small bilingual evaluation dataset for the demo sales workflow. It checks whether replies stay relevant to the knowledge base, avoid prohibited promises, and keep the expected response mode.

## Baseline Evaluation

Run the deterministic local fallback evaluation:

```bash
npm run eval
```

This command does not use an AI API key. It copies each English and Chinese demo fixture into a temporary directory, starts the real server, registers a temporary customer, calls `/api/chat`, evaluates the replies, and removes the temporary data.

The baseline evaluation is included in `npm test` and CI.

## Optional AI Evaluation

Configure your own OpenAI-compatible API in `.env`, then run:

```bash
npm run eval:ai
```

The command uses the configured provider and model. It never prints the API key. AI output can vary, so a failure may identify either a prompt regression or an evaluation phrase that needs a careful, reviewed update.

## Dataset

Evaluation cases are stored in:

```text
evals/sales-replies.json
```

Each suite defines:

- The English or Chinese demo fixture.
- Questions representing common sales scenarios.
- Expected phrases for basic knowledge relevance.
- Prohibited claims for passing, certification, employment, income, and treatment outcomes.

When adding a case, use generic demo data and avoid real customer information. A pull request should explain why a new expected phrase or safety rule is needed.

## Current Scope

This is a lightweight regression suite, not a complete semantic or model-quality benchmark. Future improvements can add structured scoring, model comparisons, trace artifacts, and human review samples while preserving the no-key baseline.

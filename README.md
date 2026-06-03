# Open Sales Assistant

Open Sales Assistant is a self-hosted AI sales assistant starter kit for small teams and individual sales workflows. It helps a team turn sales materials into a searchable knowledge base, answer customer questions, review AI-generated sales suggestions, and keep basic customer follow-up records.

The included dataset is demo data for a training course sales scenario. It is kept as an initial example so new users can run the project immediately and understand the workflow.

## Features

- H5/customer chat entry for sales consultation.
- Admin login and sales knowledge base management.
- Text, document, and image material upload.
- AI-assisted material analysis and pending suggestions.
- FAQ, sales playbook, concern handling, and knowledge summary editing.
- Customer profile, chat history, AI analysis, and follow-up records.
- Certificate record import and query demo flow.
- JSON-file storage for local development and small self-hosted trials.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open:

- Customer entry: http://localhost:3100/
- Customer login: http://localhost:3100/login.html
- Admin console: http://localhost:3100/admin.html
- Health check: http://localhost:3100/api/health

Default admin credentials are configured in `.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请设置一个强密码
```

Set `AI_API_KEY` before using AI analysis or chat generation.

## Development Checks

```bash
npm test
```

The test command runs JavaScript syntax checks and a local smoke test for the health endpoint plus the main static pages. It does not require an AI API key.

## Demo Data

`data/db.json` contains sample training-institution sales data. Treat it as demo content only:

- It demonstrates how sales materials become a knowledge base.
- It is not a production dataset.
- Replace it with your own product, service, pricing, FAQ, and compliance rules before real use.

To restore the committed demo dataset after local experiments:

```bash
npm run reset-demo
```

The reset script restores `data/db.json` from the current Git `HEAD`. It refuses to run when the project is not inside a Git checkout.

## Open Source Boundary

This repository is not a SaaS platform. The current goal is to provide a clear, self-hosted team sales assistant that contributors can run locally, adapt, and improve.

Future work may add stronger team collaboration, role permissions, database storage, integrations, and evaluation workflows, but the open-source baseline remains focused on helping a team own its sales assistant without depending on a hosted commercial platform.

## Roadmap

- Improve sales follow-up workspace: status, owner, next action, and reminders.
- Add operation logs and safer data backup/restore workflows.
- Add editable AI suggestions and knowledge version history.
- Add customer segmentation and sales funnel dashboards.
- Add connector examples for CRM, forms, chat tools, and spreadsheets.
- Add tests and prompt evaluation cases for stable community contributions.

## Codex for Open Source Goal

This project is being prepared as an open-source sales assistant starter kit. Codex would be used for maintainer workflows such as issue triage, PR review, test generation, release notes, documentation updates, and prompt/evaluation improvements.

## License

MIT

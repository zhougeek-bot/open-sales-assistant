# Development Plan

Updated: 2026-06-03

## 1. Current Positioning

Open Sales Assistant is a self-hosted open-source starter kit for team sales assistants. The current version is suitable for individual salespeople, small teams, or pilot teams that need a sales knowledge base, customer consultation entry point, and basic follow-up workflow.

It is not a commercial SaaS platform and does not include hosted billing, multi-organization onboarding, or a platform operator console.

## 2. Project Modules

```text
open-sales-assistant/
  public/             # Customer chat and admin pages
  server/             # Express backend APIs
  data/               # Local JSON demo data
  uploads/            # Uploaded files, ignored by Git by default
  docs/               # Project documentation
  package.json
  .env.example
```

## 3. Completed Features

### Customer Chat

- Nickname registration, random password, and persistent login.
- Customer profile maintenance.
- Chat history persistence.
- AI responses based on the knowledge base.
- Optional image material attachments in responses.
- Certificate lookup demo flow.

### Admin Console

- Admin login and API authentication.
- Customer list, search, sorting, pagination, and deletion.
- Customer detail page, chat history, AI profile analysis, and follow-up records.
- Basic admin operation logs for key write actions.
- Text, image, and document material upload.
- AI material analysis and pending suggestions.
- Knowledge summary, sales playbook, FAQ, and objection handling.
- Certificate creation, deletion, batch import, and lookup.
- Consultation settings.

### Data and Deployment

- Local JSON database in `data/db.json`.
- `schemaVersion` data migration.
- Daily backup and manual backup.
- Data export endpoint.
- PM2, Nginx, and BT Panel deployment references.

## 4. Next Priorities

### P0: Runnable Open-Source Baseline

- Keep README, license, contribution guide, and security policy complete.
- Keep demo data safe, understandable, and replaceable.
- Add basic API tests and startup verification.
- Add a demo data reset script.

### P1: Team Sales Workspace

- Add customer owner, follow-up status, and next follow-up time.
- Add views for due follow-ups, unreplied customers, and high-intent customers.
- Add customer tags and sales stages.
- Improve operation log filters, detail views, and export.

### P2: Knowledge Quality

- Allow editing AI suggestions before acceptance.
- Add knowledge base version history and rollback.
- Add material search, editing, and batch management.
- Add AI usage logs and cost estimates.
- Add prompt evaluation examples.

### P3: Self-Hosting Improvements

- Improve Docker deployment.
- Add optional PostgreSQL or MySQL support while preserving JSON file storage.
- Add restore tooling.
- Add production deployment checklist.
- Add CRM, forms, spreadsheet, and team messaging connector examples.

## 5. Open-Source Application Focus

- Track roadmap and defects through GitHub issues.
- Close concrete work through commits and pull requests.
- Publish regular releases and changelogs.
- Use Codex to help with PR review, tests, docs, and release notes.

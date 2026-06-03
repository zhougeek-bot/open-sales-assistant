# Changelog

All notable changes to Open Sales Assistant are documented here.

This project follows a lightweight release log while the project is still in early development.

## Unreleased

- Added bilingual README entry points for English and Chinese readers.
- Added English documentation under `docs/en/`.
- Documented user-managed OpenAI-compatible AI API configuration.
- Added storage strategy documentation that keeps JSON file storage as the default lightweight option while planning optional database adapters.
- Added Dockerfile, Docker Compose configuration, and bilingual Docker deployment docs.
- Added an English/Chinese UI switch for customer chat, admin login, and admin console pages.
- Replaced the default demo dataset with a cleaner English training-course sales scenario.
- Made English the default UI language and added English/Chinese demo fixtures with language-specific reset commands.

## v0.1.0 - 2026-06-03

Initial open-source release.

- Self-hosted Node.js + Express sales assistant starter kit.
- Customer chat entry, login page, and admin console.
- Demo training-course sales knowledge base in `data/db.json`.
- Material upload, AI-assisted material analysis, and reviewable knowledge suggestions.
- FAQ, sales playbook, objection handling, knowledge summary, customer profile, chat history, and follow-up records.
- Demo certificate import and lookup flow.
- MIT license, contribution guide, security policy, release, issues, CI, smoke test, and demo reset script.

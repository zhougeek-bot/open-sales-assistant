# Security Policy

## Reporting Security Issues

Please do not disclose security issues publicly before they are reviewed.

For now, report issues by opening a GitHub issue with a minimal description and the label `security`, without including secrets or exploitable private data. If a private contact channel is added later, this document will be updated.

## Sensitive Data Rules

- Do not commit `.env` files.
- Do not commit API keys, tokens, passwords, customer contact data, or uploaded private documents.
- Treat `data/db.json` as demo data only.
- Replace demo credentials and AI keys before any real deployment.

## Current Limitations

This project is an early self-hosted starter kit. It does not yet include production-grade role permissions, audit controls, encryption-at-rest, or external secret management.

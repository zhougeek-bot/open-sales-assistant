# Contributing

Open Sales Assistant is an early open-source starter kit. Contributions should keep the project easy to run, self-host, and understand.

## Good First Contributions

- Improve README and setup docs.
- Add tests for existing API behavior.
- Improve demo data quality.
- Add prompt evaluation examples.
- Improve customer follow-up workflow.
- Add CRM or spreadsheet connector examples.

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

Before opening a pull request:

- Do not commit `.env`, API keys, customer data, or uploaded files.
- Keep demo data generic and safe to publish.
- Preserve the self-hosted team-tool positioning.
- Document any new environment variables.

## Pull Request Checklist

- The app starts with `npm run dev`.
- The change does not require private services unless documented as optional.
- User-facing behavior is described in the PR.
- Any data shape changes include a migration or compatibility note.

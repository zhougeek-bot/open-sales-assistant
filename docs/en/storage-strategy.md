# Storage Strategy

Updated: 2026-06-03

## 1. Decision

Open Sales Assistant will keep JSON file storage as a supported storage mode.

Future database support should be added as optional adapters, not as a replacement for the current JSON mode.

Default mode:

```env
STORAGE_DRIVER=json
```

Planned optional modes:

```env
STORAGE_DRIVER=postgres
STORAGE_DRIVER=mysql
```

## 2. Why Keep JSON Storage

JSON storage is useful for the open-source baseline because:

- New users can clone the repository and run it without installing a database.
- Demo data is easy to inspect, reset, and review in Git.
- Small teams can evaluate the workflow before choosing a production database.
- Contributors can run tests and reproduce issues with minimal setup.
- It keeps the project approachable for non-infrastructure users.

JSON storage is not intended for high-concurrency production writes.

## 3. Database Adapter Goals

Database support should improve production readiness without breaking local simplicity.

Goals:

- Keep `data/db.json` as the default local/demo store.
- Add a storage interface around current read/write operations.
- Support migrations from JSON to database.
- Keep backup and restore behavior explicit.
- Avoid storing API keys or private deployment secrets in the database.
- Keep smoke tests runnable without a database service.

## 4. Suggested Adapter Shape

The application should move toward a storage module with a stable interface:

```text
server/storage/
  index.js
  json-store.js
  postgres-store.js
  mysql-store.js
```

The app should call storage methods instead of reading and writing `data/db.json` directly from route handlers.

Initial interface candidates:

- `readDb()`
- `writeDb(db, options)`
- `createBackup(reason)`
- `ensureDailyBackup()`
- `migrateDb(input)`

## 5. Migration Path

Recommended implementation order:

1. Move current JSON read/write logic into `server/storage/json-store.js` without changing behavior.
2. Add `STORAGE_DRIVER=json` to `.env.example`.
3. Add tests that prove JSON mode still works.
4. Add a migration command that exports/imports between JSON and a database.
5. Add PostgreSQL support.
6. Add MySQL support only after the storage interface is stable.

## 6. Compatibility Rules

Any database work must follow these rules:

- Do not remove JSON storage.
- Do not require a database for `npm test`.
- Do not require a database for the default quick start.
- Do not commit local production data.
- Keep demo data resettable through Git or an equivalent fixture.
- Keep docs clear about when JSON is enough and when a database is recommended.

## 7. When to Use Each Mode

Use JSON when:

- You are evaluating the project locally.
- You are testing demo data.
- You are developing features.
- You have a small internal proof of concept.

Use a database when:

- Multiple team members are writing data at the same time.
- You need stronger backup, restore, audit, and migration workflows.
- You are preparing a production deployment.
- You need reporting, analytics, or external integrations at larger scale.

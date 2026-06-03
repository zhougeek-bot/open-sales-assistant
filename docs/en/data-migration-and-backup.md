# Data Migration and Backup

Updated: 2026-06-03

## 1. Current Data Approach

The current version uses a local JSON database:

```text
data/db.json
```

This is suitable for demos, small-team trials, and early self-hosted use. It is not suitable for high-concurrency writes.

## 2. Data Version

Current schema version:

```text
schemaVersion = 2
```

The service checks and fills missing fields during startup and reads. When migration happens, it creates a backup first.

## 3. Automatic Backup

Default backup directory:

```text
data/backups/
```

Before database writes, the system checks whether a daily backup already exists:

```text
data/backups/YYYY-MM-DD-daily.json
```

If an automatic migration happens, it creates a pre-migration backup:

```text
data/backups/timestamp-before-migration.json
```

## 4. Custom Backup Directory

Configure an external backup path in `.env`:

```env
DATA_BACKUP_DIR=/opt/open-sales-assistant-backups
```

For production-like self-hosting, keep backups outside the project directory to avoid accidental deletion during updates.

## 5. Export and Manual Backup

Admin data export:

```text
GET /api/admin/data/export
```

Manual backup:

```text
POST /api/admin/data/backup
```

Both require admin authentication.

## 6. Open-Source Repository Rules

Do not commit:

- `.env`
- `uploads/`
- `data/backups/`
- real customer data
- API keys, tokens, or passwords

Safe to commit:

- sanitized demo data in `data/db.json`
- `.env.example`
- data structure and migration docs

## 7. Restore Data

1. Stop the Node service.
2. Find the backup file to restore.
3. Copy it to `data/db.json`.
4. Start the Node service.
5. The service will check schema version and fill missing fields.

Save the current `data/db.json` before restoring another version.

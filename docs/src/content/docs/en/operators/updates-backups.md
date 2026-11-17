---
title: Updates and backups
description: Update Wichtel, back up the database and uploads, restore a backup and use the health check.
---

:::tip[At a glance]

- **Update:** `docker compose pull && docker compose up -d` – migrations run on start.
- **Back up:** volumes `postgres` and `uploads`; for the database
  `docker compose exec -T db pg_dump -U wichtel wichtel > backup.sql`.
- **Health:** `GET /healthz` answers `ok` when the app and the database are reachable.

:::

## Updating

1. [Back up](#backing-up) first.
2. In the directory with `docker-compose.yml`:

   ```bash
   docker compose pull
   docker compose up -d
   ```

3. The app restarts and applies new database migrations by itself. Check in the log that it comes up
   cleanly: `docker compose logs -f app`.

If you build the image yourself: `git pull`, then
`docker compose -f docker-compose.yml -f compose.build.yml up -d --build`.

<details>
<summary>Pinning a specific version or going back</summary>

Every published image carries the commit hash as a tag in addition to `latest`. With
`WICHTEL_IMAGE=ghcr.io/yniverz/wichtel:<commit>` in `.env`, Wichtel stays on that version.

Migrations only run forward. To go back to an older version after an update, restore the **backup
from before the update** together with the older image.

</details>

## Backing up

Back up the two volumes from `docker-compose.yml`:

| Volume     | Content                                                    |
| ---------- | ---------------------------------------------------------- |
| `postgres` | the database – all accounts, shifts, settings, audit log … |
| `uploads`  | uploaded files: logos, backgrounds, site plans, proofs     |

For a **consistent database backup** while running, create a dump:

```bash
docker compose exec -T db pg_dump -U wichtel wichtel > backup-$(date +%F).sql
```

Get the uploads from the running container as an archive:

```bash
docker compose exec -T app tar -czf - -C /data uploads > uploads-$(date +%F).tar.gz
```

Copy both to another place regularly, e.g. with a cron job. Backups also contain data that has since
been deleted in Wichtel – see [Privacy in operation](/wichtel/en/operators/privacy/).

:::note
`-T` turns off the terminal of `docker compose exec` so the output ends up in the file unchanged.
:::

## Restoring

:::caution
This replaces all current data with the state of the backup.
:::

1. Restore the uploads (the app is still running):

   ```bash
   docker compose exec -T app tar -xzf - -C /data < uploads-2027-06-01.tar.gz
   ```

2. Stop the app so nobody writes while restoring:

   ```bash
   docker compose stop app
   ```

3. Empty the database and fill it from the dump:

   ```bash
   docker compose exec -T db dropdb -U wichtel wichtel
   docker compose exec -T db createdb -U wichtel wichtel
   docker compose exec -T db psql -U wichtel -d wichtel -v ON_ERROR_STOP=1 < backup.sql
   ```

4. Start the app again:

   ```bash
   docker compose start app
   ```

If the backup is older than the running image, the app applies the missing migrations on start.

<details>
<summary>Moving to a new server</summary>

On the new server, put `docker-compose.yml` and the same `.env` in place as in the
[installation](/wichtel/en/operators/install/) and run `docker compose up -d`. Then restore the
uploads and the database as above. Do not use the setup link logged on the first start – after the
restore the admin account from the backup exists and the link is invalid.

</details>

## Health check

`GET /healthz` checks whether the app is running and the database answers:

- `200 ok` – all fine,
- `503 database unavailable` – the database cannot be reached.

The image uses the endpoint as its Docker health check (every 30 seconds); `docker compose ps` then
shows `healthy` or `unhealthy`. For external monitoring simply query
`https://helfen.example.de/healthz`. Calls to `/healthz` do not appear in the log.

```bash
curl -s http://127.0.0.1:3006/healthz
```

## See also

- [Logs and error messages](/wichtel/en/operators/logs/)
- [Troubleshooting](/wichtel/en/operators/troubleshooting/)

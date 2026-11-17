---
title: Quick help for operators
description: Quick help for everyone who installs and runs Wichtel – requirements, quick start and the most common questions.
sidebar:
  label: Quick help
---

:::tip[At a glance]

- Wichtel is **one Docker container plus PostgreSQL**. Migrations run automatically on start.
- You need: a server with **Docker and Docker Compose**, a **(sub)domain**, a **reverse proxy with
  TLS** (Caddy, nginx, Traefik …) and – recommended – an **SMTP mail server**.
- The image `ghcr.io/yniverz/wichtel:latest` is available for **amd64 and arm64**.
- The **setup link** for the first admin account appears in the log after the first start.

:::

## Quick start

```bash
curl -O https://raw.githubusercontent.com/yniverz/wichtel/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/yniverz/wichtel/main/.env.example
# edit .env: at least PUBLIC_URL and POSTGRES_PASSWORD
docker compose up -d
docker compose logs app   # contains the setup link
```

Then set up the reverse proxy. In detail: [Installing with Docker Compose](/wichtel/en/operators/install/)
and [Reverse proxy and HTTPS](/wichtel/en/operators/reverse-proxy/).

## Common questions

### Where do I find the setup link?

In the log of the app container: `docker compose logs app | grep setup`. Without a fixed
`SETUP_TOKEN`, every start creates a new link until setup is complete – older links stop working.
[In detail](/wichtel/en/operators/install/#setup-link)

### How do I update Wichtel?

`docker compose pull && docker compose up -d`. Database migrations run on start by themselves. Make a
backup first. [In detail](/wichtel/en/operators/updates-backups/)

### What do I need to back up?

The volumes `postgres` (database) and `uploads` (logos, site plans, proofs). For the database, a
dump with `pg_dump` is best. [In detail](/wichtel/en/operators/updates-backups/#backing-up)

### No e-mails arrive.

Check under _Admin → Communication → Delivery_ with _Send a test e-mail to me_: the mail server's
answer is shown right there. If `SMTP_HOST` is not set, Wichtel sends no mail at all.
[In detail](/wichtel/en/operators/email/)

### Which port does Wichtel use?

`3000` inside the container. The `docker-compose.yml` publishes it on the host as `127.0.0.1:3006` –
so only a reverse proxy on the same machine can reach it. Change it with `WICHTEL_PORT` and
`WICHTEL_BIND`. [In detail](/wichtel/en/operators/configuration/)

### Do I need HTTPS?

Yes, for real use. Wichtel itself only speaks http and belongs behind a reverse proxy with TLS. Never
expose the app port directly to the internet. For testing, plain http without a proxy works too if
`PUBLIC_URL` is the http address. [In detail](/wichtel/en/operators/reverse-proxy/)

### I use Cloudflare (or two proxies in a row).

Set `XFF_DEPTH` in `.env` to the number of proxies, e.g. `2` for Cloudflare + Caddy, and make sure the inner
proxy passes on Cloudflare's address.
[In detail](/wichtel/en/operators/reverse-proxy/#several-proxies-for-example-cloudflare)

### How do I check that Wichtel is running?

`GET /healthz` answers `ok` when the app and the database are reachable, otherwise status 503. Docker
uses it too: `docker compose ps` shows `healthy`.
[In detail](/wichtel/en/operators/updates-backups/#health-check)

### Where are the logs?

`docker compose logs -f app`. In the container every line is a JSON object you can filter with `jq`.
[In detail](/wichtel/en/operators/logs/)

### Someone reports an error ID to me.

The error ID is also in the log and in the error e-mail to all admins:
`docker compose logs app | grep <error-id>`. [In detail](/wichtel/en/operators/logs/#error-ids-and-error-e-mails)

### What does the warning `client address unknown` mean?

The reverse proxy does not send `X-Forwarded-For`. Login throttling then only works per account.
[In detail](/wichtel/en/operators/troubleshooting/)

### Can I run it without a mail server?

Yes, but then no e-mails are sent, addresses count as confirmed without checking and nobody can reset
their own password. Admins then create reset links by hand.
[In detail](/wichtel/en/operators/email/#without-a-mail-server)

### How big does the server need to be?

A VM with 2 vCPU and 2 GB RAM for Wichtel and PostgreSQL together handled 3000 volunteers and 1500
shifts in the load test. [In detail](/wichtel/en/operators/capacity/)

### Can I build the image myself?

Yes: clone the repository, then `docker compose -f docker-compose.yml -f compose.build.yml up -d --build`.
[In detail](/wichtel/en/operators/install/#building-the-image-yourself)

### What do I need to do about data protection?

Have the admins maintain the legal notice and privacy policy, and decide how long proxy logs and
backups are kept. Wichtel cleans up old data by itself. [In detail](/wichtel/en/operators/privacy/)

## See also

- [Troubleshooting](/wichtel/en/operators/troubleshooting/)
- [First steps after setup](/wichtel/en/organizers/first-steps/)

---
title: Installing with Docker Compose
description: Install Wichtel with Docker Compose, find the setup link and create the first admin account.
---

:::tip[At a glance]

- Download `docker-compose.yml` and `.env.example` (as `.env`), set `PUBLIC_URL` and
  `POSTGRES_PASSWORD`, run `docker compose up -d`.
- `docker compose logs app` shows the **setup link**. Use it to create the first admin account and
  the first edition; after that the link is invalid.
- Wichtel then listens on `127.0.0.1:3006` – put a [reverse proxy with TLS](/wichtel/en/operators/reverse-proxy/) in front.

:::

## Requirements

- A Linux server (amd64 or arm64) with **Docker** and the **Compose plugin** (`docker compose`).
- A **(sub)domain**, e.g. `helfen.example.de`, pointing to the server.
- A **reverse proxy with TLS** on the server or in front of it (Caddy, nginx, Traefik …).
- Recommended: credentials for an **SMTP mail server**, see [E-mail](/wichtel/en/operators/email/).

The supplied `docker-compose.yml` starts two containers: `app` (Wichtel, image
`ghcr.io/yniverz/wichtel:latest`) and `db` (PostgreSQL 17). The image is published again after every
successful build of `main`.

## Step by step

1. Create a directory and download the two files:

   ```bash
   mkdir wichtel && cd wichtel
   curl -O https://raw.githubusercontent.com/yniverz/wichtel/main/docker-compose.yml
   curl -o .env https://raw.githubusercontent.com/yniverz/wichtel/main/.env.example
   ```

2. Edit `.env`. Required are:
   - `PUBLIC_URL` – the public address, exactly as it appears in the browser, e.g.
     `https://helfen.example.de` (without a path). For a first test without a proxy, the server's
     http address works too, e.g. `http://192.168.1.10:3006` with `WICHTEL_BIND=0.0.0.0`.
   - `POSTGRES_PASSWORD` – a long, random password for the database, e.g. from
     `openssl rand -hex 24`.

   For e-mail, fill in the `SMTP_*` lines. All variables are explained in
   [Configuration](/wichtel/en/operators/configuration/).

3. Start:

   ```bash
   docker compose up -d
   ```

   The app waits until the database is ready and then applies the migrations.

4. Get the setup link from the log (see below) and open it.
5. Set up the [reverse proxy](/wichtel/en/operators/reverse-proxy/) if you have not done so yet.

## Setup link

As long as there is no admin account yet, Wichtel writes a line like this to the log on start:

```
{"time":"…","level":"info","msg":"Wichtel is not set up yet. Open this link to create the first admin account.","url":"https://helfen.example.de/setup?token=…"}
```

Find it with:

```bash
docker compose logs app | grep setup
```

The link starts with `PUBLIC_URL`. On the page you enter:

- _Your festival_: the festival's name,
- _Your admin account_: first and last name, e-mail, phone and password (at least 10 characters),
- _First edition_: name and period (including build-up and tear-down).

With _Finish setup_ you are signed in as admin and land in the admin area. The e-mail address of
this first account counts as confirmed right away. After that the link is invalid and `/setup`
redirects to the login page. Continue with the
[first steps for organizers](/wichtel/en/organizers/first-steps/).

<details>
<summary>The link expired or got lost</summary>

Without `SETUP_TOKEN`, Wichtel creates **a new random token on every start** until setup is
complete. A link from before a restart no longer works; the page says “The setup link is invalid”.
Fix: take the newest link from the log (`docker compose logs app | grep setup | tail -n 1`) or
restart the container (`docker compose restart app`) and use the link it logs then.

</details>

<details>
<summary>Using a fixed setup token (SETUP_TOKEN)</summary>

If you cannot read the log (e.g. with some hosting providers), set `SETUP_TOKEN` in `.env` to a value
of your own with **at least 24 characters**. Wichtel refuses shorter values in production and does not
start. The link is then `PUBLIC_URL/setup?token=<SETUP_TOKEN>`.

Whoever knows the token can make themselves admin before you do. So remove `SETUP_TOKEN` again after
setup; Wichtel reminds you in the log (“SETUP_TOKEN is no longer needed and can be removed”).

</details>

<details>
<summary>The link points to the wrong address</summary>

The link is built from `PUBLIC_URL`. If the address is wrong, fix `PUBLIC_URL` and run
`docker compose up -d` – otherwise the links in all e-mails are wrong too. For a quick test you can
also append just the `/setup?token=…` part to the correct address.

</details>

## Building the image yourself

Instead of pulling the ready-made image you can build it from source, e.g. for your own changes:

```bash
git clone https://github.com/yniverz/wichtel.git
cd wichtel
cp .env.example .env   # set PUBLIC_URL and POSTGRES_PASSWORD
docker compose -f docker-compose.yml -f compose.build.yml up -d --build
```

`compose.build.yml` replaces the image with a local build (`wichtel:local`). To update, `git pull`
and run the same command again.

You choose a different ready-made image (e.g. from your own fork) with `WICHTEL_IMAGE` in `.env`. CI
publishes every image as `latest` and also under the commit hash, e.g.
`ghcr.io/yniverz/wichtel:<commit>` – which also lets you pin a specific version.

## See also

- [Installing with Portainer](/wichtel/en/operators/portainer/)
- [Configuration](/wichtel/en/operators/configuration/)
- [Reverse proxy and HTTPS](/wichtel/en/operators/reverse-proxy/)
- [Troubleshooting](/wichtel/en/operators/troubleshooting/)

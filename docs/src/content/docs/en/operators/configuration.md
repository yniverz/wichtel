---
title: Configuration
description: All of Wichtel's environment variables with default and purpose, and everything PUBLIC_URL affects.
---

:::tip[At a glance]

- Only **`PUBLIC_URL`** and **`POSTGRES_PASSWORD`** are required.
- For e-mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
- With Docker Compose the values go into `.env` next to `docker-compose.yml`, with Portainer into the
  stack's environment variables. After a change run `docker compose up -d`.
- Everything else (festival name, colours, rules …) is set by admins in the interface.

:::

## The variables

### Required

| Variable            | Default | Purpose                                                                                                                                                                               |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`        | –       | Public address, e.g. `https://helfen.example.de`: only `https://` or `http://`, host and optional port, **no path**. A trailing slash is removed. See [below](#what-public_url-does). |
| `POSTGRES_PASSWORD` | –       | Password of the bundled database. Only for `docker-compose.yml`, which also builds `DATABASE_URL` from it.                                                                            |

If one of them is missing, `docker compose` stops with “set PUBLIC_URL …” or “set POSTGRES_PASSWORD”.

### Only for docker-compose.yml

| Variable        | Default                          | Purpose                                                                                                                     |
| --------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `WICHTEL_PORT`  | `3006`                           | Port on the host. Inside the container Wichtel always listens on `3000`.                                                    |
| `WICHTEL_BIND`  | `127.0.0.1`                      | Address on the host. `127.0.0.1` = only reachable from the server itself (proxy on the host); `0.0.0.0` = from the network. |
| `WICHTEL_IMAGE` | `ghcr.io/yniverz/wichtel:latest` | Which image runs, e.g. a fixed version `ghcr.io/yniverz/wichtel:<commit>` or your own fork.                                 |

### E-mail (SMTP)

| Variable        | Default                       | Purpose                                                                                                                                                                                             |
| --------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SMTP_HOST`     | empty                         | Mail server. Empty = no e-mails are sent (the log only shows their subject), and new accounts need no confirmation.                                                                                 |
| `SMTP_PORT`     | `587`                         | Port of the mail server. Must be an integer.                                                                                                                                                        |
| `SMTP_SECURE`   | `false`                       | `true` (or `1`) = TLS from the start, usually port `465`. With `false` typically port `587`.                                                                                                        |
| `SMTP_USER`     | empty                         | User name. If empty, Wichtel does not log in to the mail server.                                                                                                                                    |
| `SMTP_PASSWORD` | empty                         | Password for the user name.                                                                                                                                                                         |
| `SMTP_FROM`     | `Wichtel <wichtel@localhost>` | Sender, e.g. `"Festival Volunteers <helfen@example.de>"`. Always set it – real mail servers usually reject the default; if it is missing while `SMTP_HOST` is set, Wichtel logs a warning on start. |

More: [E-mail](/wichtel/en/operators/email/).

### Optional

| Variable          | Default                          | Purpose                                                                                                                                                                        |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SETUP_TOKEN`     | empty                            | Fixed token for the setup link, **at least 24 characters**. Empty = random token in the log. Remove after setup.                                                               |
| `LOG_LEVEL`       | `info`                           | `debug`, `info`, `warn` or `error`.                                                                                                                                            |
| `LOG_FORMAT`      | `json` in the container          | `json` (one JSON line per event) or `text` (readable). If unset: `json` in production, `text` in development.                                                                  |
| `LOG_MAIL_BODIES` | off (on only in development)     | Without SMTP, also log the recipient address and the e-mail text. The texts contain secret links (e.g. password reset) – not recommended in production.                        |
| `XFF_DEPTH`       | `1`                              | How many proxies are in front of Wichtel, e.g. `2` for Cloudflare + Caddy. See [several proxies](/wichtel/en/operators/reverse-proxy/#several-proxies-for-example-cloudflare). |
| `UPLOAD_DIR`      | `/data/uploads` in the container | Where uploaded files are stored (logos, backgrounds, site plans, proofs). In the container `/data` is the `uploads` volume; do not change.                                     |
| `DATABASE_URL`    | set by `docker-compose.yml`      | PostgreSQL connection, e.g. `postgres://wichtel:<password>@db:5432/wichtel`. Only needed if you use your own database instead of the bundled one.                              |

:::note
`docker-compose.yml` passes `PUBLIC_URL`, `SETUP_TOKEN`, the `SMTP_*` variables, `LOG_LEVEL`,
`LOG_FORMAT`, `LOG_MAIL_BODIES` and `XFF_DEPTH` from `.env` to the container; it builds
`DATABASE_URL` itself, and the image sets `UPLOAD_DIR`. Other variables (such as those under “Already
set” below) only take effect if you add them to the `environment` section of the `app` service –
easiest in a `docker-compose.override.yml` next to `docker-compose.yml`, which Docker Compose reads
automatically:

```yaml
services:
  app:
    environment:
      BODY_SIZE_LIMIT: 32M
```

:::

### Already set: reverse proxy and server

The image or `docker-compose.yml` already sets these values. They belong to SvelteKit's Node server;
you rarely need to change them.

| Variable          | Value               | Purpose                                                                                                                                    |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `PROTOCOL_HEADER` | `x-forwarded-proto` | The protocol (http/https) comes from the reverse proxy. Without the header (access without a proxy), the protocol of `PUBLIC_URL` applies. |
| `HOST_HEADER`     | `x-forwarded-host`  | The host name comes from the reverse proxy (otherwise from `Host`).                                                                        |
| `ADDRESS_HEADER`  | `x-forwarded-for`   | The client address comes from the reverse proxy.                                                                                           |
| `BODY_SIZE_LIMIT` | `16M`               | Upper limit for requests; Wichtel itself allows 16 MB only for uploads, 1 MB otherwise.                                                    |
| `PORT`            | `3000`              | Port inside the container.                                                                                                                 |
| `NODE_ENV`        | `production`        | Operating mode (JSON logs, strict check of `SETUP_TOKEN`, among others).                                                                   |

## What PUBLIC_URL does

`PUBLIC_URL` must be exactly the address at which volunteers open Wichtel. Wichtel uses it for:

- **Links in e-mails** – confirmation, password reset, reminders, news, error e-mails – and for the
  setup link in the log.
- **Links and QR codes that go out**, e.g. calendar subscriptions and group invitations.
- **HSTS and secure cookies:** if `PUBLIC_URL` starts with `https://`, Wichtel sends the
  `Strict-Transport-Security` header (one year, including subdomains) and always sets cookies with
  `Secure`. Browsers do not send such cookies over http – so if you test over http, you need an http
  `PUBLIC_URL`.
- **The protocol without a proxy:** if a request arrives without `X-Forwarded-Proto` because the app
  port is called directly, Wichtel takes the protocol from `PUBLIC_URL`. With an http `PUBLIC_URL`,
  sign-in and forms therefore also work without a proxy. See
  [testing over http](/wichtel/en/operators/reverse-proxy/#special-cases).
- **Sign-in of AI assistants** (OAuth and the MCP endpoint `/mcp`). For e.g. Claude to connect,
  `PUBLIC_URL` must be the public https address and the server must be reachable from the internet.
  See [AI assistants](/wichtel/en/organizers/ai/).

After changing `PUBLIC_URL`, it applies to all new e-mails. Links already sent keep pointing to the old
address.

:::caution
Browsers remember HSTS for a year, including all subdomains of the address in `PUBLIC_URL`. So only
enter an https `PUBLIC_URL` once HTTPS works permanently.
:::

## Special cases

<details>
<summary>Wichtel does not start because of a variable</summary>

Wichtel checks some values on start and stops on invalid ones:

- `PUBLIC_URL` not a complete address: “PUBLIC_URL must be an absolute URL starting with https:// or
  http://” (e.g. `helfen.example.de` without `https://`)
- `PUBLIC_URL` with a path, query or user name: “PUBLIC_URL must not contain a path, query or user
  name” – Wichtel always runs at the root of its own (sub)domain, not under
  `https://example.de/helfen`
- `SETUP_TOKEN` shorter than 24 characters: “SETUP_TOKEN must be at least 24 characters”
- `SMTP_PORT` not an integer: “SMTP_PORT must be an integer”
- `LOG_LEVEL` not `debug`/`info`/`warn`/`error`: “LOG_LEVEL must be debug, info, warn or error”
- `LOG_FORMAT` not `json`/`text`: “LOG_FORMAT must be json or text”

Fix the value and run `docker compose up -d`. More causes: [Troubleshooting](/wichtel/en/operators/troubleshooting/).

</details>

<details>
<summary>Your own PostgreSQL database instead of the bundled one</summary>

`docker-compose.yml` builds `DATABASE_URL` from `POSTGRES_PASSWORD` and the `db` service. To use an
existing database, change `DATABASE_URL` of the `app` service in your own compose file
(`postgres://user:password@host:5432/database`) and leave out the `db` service. Migrations run
automatically on start there too.

</details>

## See also

- [Reverse proxy and HTTPS](/wichtel/en/operators/reverse-proxy/)
- [E-mail](/wichtel/en/operators/email/)
- [Logs and error messages](/wichtel/en/operators/logs/)

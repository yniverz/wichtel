---
title: Troubleshooting
description: Common problems when running Wichtel, by symptom – each with cause and fix.
---

:::tip[At a glance]

- Look at the log first: `docker compose logs --tail 100 app`.
- Is everything running? `docker compose ps` and `curl -s http://127.0.0.1:3006/healthz`.
- Most problems come from `PUBLIC_URL` or the reverse proxy.

:::

## Setup

<details>
<summary>The setup link is lost or “invalid”</summary>

**Cause:** without `SETUP_TOKEN`, Wichtel creates a new token on every start as long as there is no
admin account. A link from before a restart no longer works.

**Fix:** take the newest link from the log: `docker compose logs app | grep setup | tail -n 1`. If
there is none (any more), restart the container (`docker compose restart app`). If `/setup` redirects
to the login page, setup is already complete. More: [Setup link](/wichtel/en/operators/install/#setup-link).

</details>

## Start

<details>
<summary>docker compose says “set POSTGRES_PASSWORD” or “set PUBLIC_URL”</summary>

**Cause:** the variable is missing from `.env` (or, with Portainer, from the stack's environment
variables), or `.env` is not next to `docker-compose.yml`.

**Fix:** set both values and run `docker compose up -d` in the directory of `docker-compose.yml`.

</details>

<details>
<summary>The app container keeps restarting – error about a variable</summary>

**Cause:** Wichtel checks some variables on start. Typical messages in the log:
“PUBLIC_URL must be an absolute URL …”, “PUBLIC_URL must not contain a path …”,
“SETUP_TOKEN must be at least 24 characters”, “SMTP_PORT must be an integer”,
“LOG_LEVEL must be debug, info, warn or error”, “LOG_FORMAT must be json or text”.

**Fix:** correct the value (`PUBLIC_URL` with `https://` or `http://` and without a path,
`SETUP_TOKEN` at least 24 characters or empty) and run `docker compose up -d`. See [Configuration](/wichtel/en/operators/configuration/).

</details>

<details>
<summary>The app container keeps restarting – “password authentication failed”</summary>

**Cause:** `POSTGRES_PASSWORD` was changed after the first start. The database in the `postgres`
volume keeps the password from the first start; a new value in `.env` does not change it.

**Fix:** put the old password back – or change the password in the database and then restart:

```bash
docker compose exec db psql -U wichtel -d wichtel -c "ALTER USER wichtel PASSWORD 'new-password';"
docker compose up -d
```

</details>

<details>
<summary>“port is already allocated”</summary>

**Cause:** something on the host already uses port `3006` (or `WICHTEL_PORT`).

**Fix:** set `WICHTEL_PORT` in `.env` to a free port and adjust the reverse proxy accordingly.

</details>

<details>
<summary>docker compose ps shows “unhealthy”</summary>

**Cause:** `/healthz` does not answer `ok` – usually the database cannot be reached
(`503 database unavailable`) or the app hangs during start.

**Fix:** look at `docker compose logs db` and `docker compose logs app`; is the `db` container running?

</details>

## Sign-in and forms

<details>
<summary>After signing in I end up on the login page again</summary>

**Cause:** `PUBLIC_URL` starts with `https://`, but you open Wichtel over http. Wichtel then sets the
session cookie with `Secure`, and the browser does not send it back over http.

**Fix:** open Wichtel over https. For testing without TLS, set an http `PUBLIC_URL` (no proxy is
needed for that) – see
[Testing over http](/wichtel/en/operators/reverse-proxy/#special-cases). If the browser has already
received HSTS for the address, it forces https anyway.

</details>

<details>
<summary>“Cross-site POST form submissions are forbidden” (status 403)</summary>

**Cause:** Wichtel compares the origin of a form with the address the reverse proxy reports. If they do
not match, the form is rejected. Typical: the proxy does not pass on the real host name (with nginx,
`proxy_set_header Host $host` is missing), it sends no `X-Forwarded-Proto` (then the protocol of
`PUBLIC_URL` applies), or Wichtel is opened over http although `PUBLIC_URL` starts with `https://`.

**Fix:** set up the proxy as described under [Reverse proxy](/wichtel/en/operators/reverse-proxy/). For
testing without a proxy and TLS, set `PUBLIC_URL` to the http address, see
[Testing over http](/wichtel/en/operators/reverse-proxy/#special-cases).

</details>

<details>
<summary>The log says “client address unknown”</summary>

**Cause:** a request arrived without a matching `X-Forwarded-For`: the proxy does not set the header,
someone calls the app port directly, or `XFF_DEPTH` is larger than the number of addresses in the
header. Login throttling then only works per account.

**Fix:** check the proxy; with several proxies set `XFF_DEPTH` accordingly. See
[Several proxies](/wichtel/en/operators/reverse-proxy/#several-proxies-for-example-cloudflare).

</details>

## E-mail

<details>
<summary>No e-mails arrive</summary>

**Cause and fix**, in order:

1. **No mail server:** if the log shows `No mail server (SMTP_HOST)` on start, `SMTP_HOST` is empty.
   Wichtel then sends nothing. Set `SMTP_*` and run `docker compose up -d`.
2. **The mail server refuses:** _Admin → Communication → Delivery_ → _Send a test e-mail to me_ shows
   the mail server's answer. Common: wrong password, `SMTP_SECURE` does not match the port (`true` for
   465, `false` for 587) or `SMTP_FROM` is not set – the default `wichtel@localhost` is usually
   rejected (the log then shows `SMTP_FROM is not set` on start).
3. **Server unreachable:** if the test e-mail gives up after about 15 seconds, often a firewall or the
   hosting provider blocks the outgoing SMTP port.
4. **In spam:** set up SPF, DKIM and DMARC for the sender domain.
5. **Single mails:** under _Delivery_ the history shows whether a mail was sent, is waiting or failed.

More: [E-mail](/wichtel/en/operators/email/).

</details>

<details>
<summary>Links in e-mails point to the wrong address</summary>

**Cause:** links in mails are built from `PUBLIC_URL`.

**Fix:** set `PUBLIC_URL` to the public address and run `docker compose up -d`. Mails already sent keep
the old links.

</details>

## Uploads, maps and AI

<details>
<summary>Uploading gives “413”</summary>

**Cause:** the file is larger than allowed. If the message comes as an nginx page (“413 Request Entity
Too Large”), the proxy lets less through – nginx only 1 MB by default. If it comes as
`Payload too large` from Wichtel, the file is larger than 16 MB.

**Fix:** allow 16 MB in the proxy (`client_max_body_size 16m;` in nginx,
`request_body { max_size 16MB }` in Caddy). Shrink files over 16 MB.

</details>

<details>
<summary>The map does not load</summary>

**Cause:** embedded maps only load once someone taps _Load map_. The Content Security Policy only allows
map images from the server under _Settings → Maps → Map tile server (URL)_, and only if that address
starts with `https://`. An http address or an extra CSP from the reverse proxy blocks the images.

**Fix:** enter an https tile URL (default: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`) and do not
set your own CSP in the proxy. The browser console lists blocked addresses as CSP errors. The site plan
and navigation links work without a map tile server.

</details>

<details>
<summary>The AI connector (e.g. Claude) cannot connect</summary>

**Cause and fix:**

- **`PUBLIC_URL` is not public or not https.** The sign-in (OAuth) and the `/mcp` endpoint give the
  assistant addresses built from `PUBLIC_URL`. It must be the public https address, and the server
  must be reachable from the internet – claude.ai calls it from there.
- **Return address not allowed.** Message “This redirect URI is not allowed”: the assistant's host is
  missing under _Settings → AI assistants (MCP) → Allowed return addresses for AI assistants_ (default
  `claude.ai` and `claude.com`; `localhost` is always allowed).
- **The proxy blocks paths.** `/mcp`, `/oauth/…` and `/.well-known/…` must be reachable.

More: [AI assistants](/wichtel/en/organizers/ai/).

</details>

<details>
<summary>Volunteers see “It is very busy right now”</summary>

**Cause:** very heavy load, e.g. when a booking wave opens. Wichtel turns shift list requests away
after 20 seconds of waiting instead of overloading memory.

**Fix:** wait a moment; in future split waves or use a faster processor. See
[Capacity](/wichtel/en/operators/capacity/).

</details>

## See also

- [Logs and error messages](/wichtel/en/operators/logs/)
- [Configuration](/wichtel/en/operators/configuration/)

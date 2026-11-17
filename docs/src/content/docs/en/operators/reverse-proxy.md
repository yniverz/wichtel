---
title: Reverse proxy and HTTPS
description: Run Wichtel behind Caddy, nginx or Traefik – with TLS, compression, 16 MB for uploads and the right X-Forwarded headers.
---

:::tip[At a glance]

- Wichtel belongs **behind a reverse proxy with TLS**. **Never** expose the app port directly to the
  internet.
- The proxy must send `X-Forwarded-For`, `X-Forwarded-Proto` and the host name, let requests of up to
  **16 MB** through and **compress** pages.
- More than one proxy in front (e.g. Cloudflare + Caddy)? Set `XFF_DEPTH` to the number of proxies.

:::

## Why a reverse proxy?

Wichtel itself only speaks http and does not handle certificates. `docker-compose.yml` trusts the
headers `X-Forwarded-For` (client address), `X-Forwarded-Proto` (http/https) and `X-Forwarded-Host`
(host name). Therefore:

- **Never expose the app port directly.** Without a proxy in front, anyone could fake their IP
  address and so get around the login throttling. By default the port is only reachable on
  `127.0.0.1`; only set `WICHTEL_BIND=0.0.0.0` if a firewall blocks the port from outside.
- If the proxy itself runs in Docker, put both containers into a **shared network** and point the
  proxy directly at the app container, port `3000`.

**Compression:** Wichtel itself only compresses scripts and stylesheets. Without compression the shift
list quickly grows to several hundred kilobytes, which is noticeable on the festival grounds over
mobile networks. So turn on gzip (or zstd/brotli) for HTML and JSON in the proxy.

**Request size:** uploads (logo, background, site plan, proofs) may be up to 16 MB. Wichtel itself
rejects all other requests over 1 MB with `413 Payload too large` (AI assistant sign-in and `/mcp`:
256 KB). So the proxy must let at least 16 MB through.

## Caddy

Caddy gets the certificate itself and sets the `X-Forwarded-*` headers automatically.

```
helfen.example.de {
	request_body {
		max_size 16MB
	}
	encode zstd gzip
	reverse_proxy 127.0.0.1:3006
}
```

`encode` compresses the pages. If Caddy runs in Docker in the same network, use the app container with
port `3000` instead of `127.0.0.1:3006`.

## nginx

```nginx
server {
    listen 443 ssl;
    server_name helfen.example.de;

    ssl_certificate     /etc/letsencrypt/live/helfen.example.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/helfen.example.de/privkey.pem;

    client_max_body_size 16m;

    gzip on;
    gzip_proxied any;
    gzip_types text/css application/javascript application/json;

    location / {
        proxy_pass http://127.0.0.1:3006;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

- By default nginx only lets 1 MB through – without `client_max_body_size 16m` uploads fail.
- `gzip on` always compresses HTML; `gzip_types` adds the data Wichtel loads as JSON while you browse.
- `Host` and `X-Forwarded-Host` must carry the real host name. Otherwise Wichtel rejects forms with
  “Cross-site … form submissions are forbidden” because the address does not match the origin.
- The certificate paths are an example (certbot); add a redirect from port 80 to https as usual.

## Traefik

With Traefik as a Docker proxy, labels go on the `app` service, easiest in a
`docker-compose.override.yml` next to `docker-compose.yml`:

```yaml
services:
  app:
    labels:
      - traefik.enable=true
      - traefik.http.routers.wichtel.rule=Host(`helfen.example.de`)
      - traefik.http.routers.wichtel.entrypoints=websecure
      - traefik.http.routers.wichtel.tls.certresolver=letsencrypt
      - traefik.http.routers.wichtel.middlewares=wichtel-compress
      - traefik.http.middlewares.wichtel-compress.compress=true
      - traefik.http.services.wichtel.loadbalancer.server.port=3000
    networks:
      - default
      - proxy

networks:
  proxy:
    external: true
```

- Replace `websecure`, `letsencrypt` and the `proxy` network with the names from your Traefik setup.
  `default` must stay so the app can reach the database.
- Traefik sets `X-Forwarded-For`, `-Proto` and `-Host` by itself and does not limit request size by
  default; Wichtel enforces the 16 MB limit itself.

## Several proxies (for example Cloudflare)

Wichtel takes the address at position `XFF_DEPTH` from `X-Forwarded-For`, counted from the right. The
default is `1`: the address seen by the proxy directly in front of Wichtel. With another proxy in front
(Cloudflare → Caddy → Wichtel), that would be Cloudflare's address. Then:

1. Set `XFF_DEPTH` to the number of proxies, here `2`. `docker-compose.yml` does not pass the variable
   on by itself – add it in a `docker-compose.override.yml`:

   ```yaml
   services:
     app:
       environment:
         XFF_DEPTH: 2
   ```

2. The inner proxy must **append to** Cloudflare's `X-Forwarded-For` **instead of replacing it**.
   nginx with `$proxy_add_x_forwarded_for` does that. Caddy and Traefik only keep it from proxies they
   trust: in Caddy `trusted_proxies` in the global `servers` option, in Traefik
   `forwardedHeaders.trustedIPs` on the entrypoint – each with Cloudflare's IP ranges.
3. The server should then only be reachable through Cloudflare. Otherwise someone could send requests
   directly and include a fake address in `X-Forwarded-For`.

If `XFF_DEPTH` does not match the number of addresses, Wichtel cannot determine the client address and
warns with `client address unknown` (see below).

## The warning “client address unknown”

If the log shows, on start or at the first login,

```
client address unknown – does the reverse proxy send X-Forwarded-For?
```

then a request arrived without a (matching) `X-Forwarded-For` – e.g. because the proxy does not set
the header, someone calls the app port directly, or `XFF_DEPTH` is too large. Login throttling then
only works per account, not per address, and the audit log lacks the IP address. The warning appears
only once per start. Fix: check the proxy configuration as above.

## What Wichtel sets itself

You do **not** need to add these headers in the proxy:

- `Content-Security-Policy` – only its own scripts; images also from the configured map tile server,
  forms also to the allowed return addresses for AI assistants. A second CSP from the proxy would apply
  in addition and can block maps or the AI sign-in.
- `Permissions-Policy` (camera, microphone, location and others off), `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- With an https `PUBLIC_URL`: `Strict-Transport-Security` (one year, including subdomains) and
  `Secure` cookies. So if you test over http, you need an http `PUBLIC_URL`.

## Special cases

<details>
<summary>Testing over http without TLS</summary>

Set `PUBLIC_URL` to the http address (e.g. `http://192.168.1.10:8080`); otherwise Wichtel sets
`Secure` cookies and signing in does not work. Even for testing, run a proxy in front that sends
`X-Forwarded-Proto: http`: without the header Wichtel assumes `https`, and submitted forms are rejected
as “Cross-site”. Caddy with an address like `http://:8080` does that.

</details>

<details>
<summary>The health check through the proxy</summary>

`/healthz` can also be queried from outside, e.g. by a monitoring service. Wichtel writes no log line
for these calls. See [Updates and backups](/wichtel/en/operators/updates-backups/#health-check).

</details>

## See also

- [Configuration](/wichtel/en/operators/configuration/)
- [Privacy in operation](/wichtel/en/operators/privacy/) – proxy logs
- [Troubleshooting](/wichtel/en/operators/troubleshooting/)

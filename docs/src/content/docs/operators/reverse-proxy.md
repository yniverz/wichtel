---
title: Reverse Proxy und HTTPS
description: Wichtel hinter Caddy, nginx oder Traefik betreiben – mit TLS, Kompression, 16 MB für Uploads und den richtigen X-Forwarded-Headern.
---

:::tip[Auf einen Blick]

- Wichtel gehört **hinter einen Reverse Proxy mit TLS**. Den App-Port **nie direkt** ins Internet
  freigeben.
- Der Proxy muss `X-Forwarded-For`, `X-Forwarded-Proto` und den Hostnamen mitschicken, Anfragen bis
  **16 MB** durchlassen und Seiten **komprimieren**.
- Mehr als ein Proxy davor (z. B. Cloudflare + Caddy)? `XFF_DEPTH` auf die Zahl der Proxys setzen.

:::

## Warum ein Reverse Proxy?

Wichtel spricht selbst nur http und kümmert sich nicht um Zertifikate. Die `docker-compose.yml`
vertraut den Headern `X-Forwarded-For` (Client-Adresse), `X-Forwarded-Proto` (http/https) und
`X-Forwarded-Host` (Hostname). Deshalb:

- **Den App-Port nie direkt freigeben.** Ohne Proxy davor könnte jede:r die eigene IP-Adresse
  vortäuschen und so die Login-Begrenzung umgehen. Standardmäßig ist der Port nur auf `127.0.0.1`
  erreichbar; `WICHTEL_BIND=0.0.0.0` nur setzen, wenn eine Firewall den Port von außen sperrt.
- Läuft der Proxy selbst in Docker, beide Container in ein **gemeinsames Netzwerk** hängen und den
  Proxy direkt auf den App-Container, Port `3000`, zeigen lassen.

**Kompression:** Wichtel komprimiert selbst nur Skripte und Stylesheets. Die Schichtliste wird ohne
Kompression schnell mehrere hundert Kilobyte groß, was auf dem Festivalgelände im Mobilfunknetz
spürbar ist. Deshalb im Proxy gzip (oder zstd/brotli) für HTML und JSON einschalten.

**Größe von Anfragen:** Uploads (Logo, Hintergrund, Geländeplan, Nachweise) dürfen bis 16 MB groß
sein. Alle anderen Anfragen über 1 MB lehnt Wichtel selbst mit `413 Payload too large` ab
(Anmeldung von KI-Assistenten und `/mcp`: 256 KB). Der Proxy muss also mindestens 16 MB durchlassen.

## Caddy

Caddy holt das Zertifikat selbst und setzt die `X-Forwarded-*`-Header automatisch.

```
helfen.example.de {
	request_body {
		max_size 16MB
	}
	encode zstd gzip
	reverse_proxy 127.0.0.1:3006
}
```

`encode` komprimiert die Seiten. Läuft Caddy in Docker im selben Netzwerk, statt `127.0.0.1:3006`
den App-Container mit Port `3000` angeben.

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

- nginx lässt standardmäßig nur 1 MB durch – ohne `client_max_body_size 16m` scheitern Uploads.
- HTML komprimiert `gzip on` immer; `gzip_types` ergänzt die Daten, die Wichtel beim Blättern als
  JSON nachlädt.
- `Host` und `X-Forwarded-Host` müssen den echten Hostnamen tragen. Sonst lehnt Wichtel Formulare
  als „Cross-site … form submissions are forbidden“ ab, weil die Adresse nicht zur Herkunft passt.
- Die Zertifikatspfade sind ein Beispiel (certbot); eine Weiterleitung von Port 80 auf https
  ergänzt du wie gewohnt.

## Traefik

Mit Traefik als Docker-Proxy kommen Labels an den Dienst `app`, am einfachsten in einer
`docker-compose.override.yml` neben der `docker-compose.yml`:

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

- `websecure`, `letsencrypt` und das Netzwerk `proxy` durch die Namen aus deiner Traefik-Einrichtung
  ersetzen. `default` muss bleiben, damit die App die Datenbank erreicht.
- Traefik setzt `X-Forwarded-For`, `-Proto` und `-Host` von selbst und begrenzt die Größe von
  Anfragen standardmäßig nicht; die 16-MB-Grenze setzt Wichtel selbst durch.

## Mehrere Proxys (zum Beispiel Cloudflare)

Wichtel nimmt aus `X-Forwarded-For` die Adresse an Position `XFF_DEPTH`, von rechts gezählt.
Standard ist `1`: die Adresse, die der Proxy direkt vor Wichtel gesehen hat. Steht ein weiterer Proxy
davor (Cloudflare → Caddy → Wichtel), wäre das die Adresse von Cloudflare. Dann:

1. `XFF_DEPTH` auf die Zahl der Proxys setzen, hier `2` – in der `.env` neben der
   `docker-compose.yml` (bei Portainer in den Umgebungsvariablen des Stacks), danach
   `docker compose up -d`:

   ```bash
   XFF_DEPTH=2
   ```

2. Der innere Proxy muss das `X-Forwarded-For` von Cloudflare **ergänzen statt ersetzen**.
   nginx mit `$proxy_add_x_forwarded_for` tut das. Caddy und Traefik übernehmen es nur von Proxys,
   denen sie vertrauen: bei Caddy `trusted_proxies` in der globalen Option `servers`, bei Traefik
   `forwardedHeaders.trustedIPs` am Entrypoint – jeweils mit den IP-Bereichen von Cloudflare.
3. Der Server sollte dann nur über Cloudflare erreichbar sein. Sonst könnte jemand direkt anfragen
   und eine falsche Adresse in `X-Forwarded-For` mitschicken.

Stimmt `XFF_DEPTH` nicht mit der Zahl der Adressen überein, kann Wichtel die Client-Adresse nicht
bestimmen und warnt mit `client address unknown` (siehe unten).

## Die Warnung „client address unknown“

Erscheint beim Start oder beim ersten Login im Log

```
client address unknown – does the reverse proxy send X-Forwarded-For?
```

dann kam eine Anfrage ohne (passendes) `X-Forwarded-For` an – z. B. weil der Proxy den Header nicht
setzt, jemand den App-Port direkt aufruft oder `XFF_DEPTH` zu groß ist. Die Login-Begrenzung gilt
dann nur noch pro Konto, nicht mehr pro Adresse, und im Protokoll fehlt die IP-Adresse. Die Warnung
erscheint nur einmal pro Start. Lösung: Proxy-Konfiguration wie oben prüfen.

## Was Wichtel selbst setzt

Diese Header musst du im Proxy **nicht** ergänzen:

- `Content-Security-Policy` – nur eigene Skripte; Bilder zusätzlich vom eingestellten Kartenserver,
  Formulare zusätzlich zu den erlaubten Rücksprung-Adressen für KI-Assistenten. Eine zweite CSP aus
  dem Proxy würde zusätzlich gelten und kann Karten oder die KI-Anmeldung blockieren.
- `Permissions-Policy` (Kamera, Mikrofon, Standort u. a. aus), `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Bei https-`PUBLIC_URL`: `Strict-Transport-Security` (ein Jahr, mit Subdomains) und `Secure`-Cookies.
  Wer über http testet, braucht deshalb eine http-`PUBLIC_URL`.

## Sonderfälle

<details>
<summary>Testen über http ohne TLS</summary>

`PUBLIC_URL` auf genau die http-Adresse setzen, unter der du testest (z. B.
`http://192.168.1.10:3006`), und in der `.env` `WICHTEL_BIND=0.0.0.0` setzen, damit der Port im Netz
erreichbar ist. Ein Proxy ist dafür nicht nötig: Kommt eine Anfrage ohne `X-Forwarded-Proto` an,
nimmt Wichtel das Protokoll aus `PUBLIC_URL`. Mit einer https-`PUBLIC_URL` dagegen setzt Wichtel
`Secure`-Cookies und erwartet https – über http klappen dann weder Anmeldung noch Formulare
(„Cross-site … form submissions are forbidden“).

Ohne Proxy fehlt auch `X-Forwarded-For`; Wichtel warnt dann einmal mit
[`client address unknown`](#die-warnung-client-address-unknown). Für einen Test ist das in Ordnung,
für den Betrieb gehört ein Proxy mit TLS davor.

</details>

<details>
<summary>Der Health-Check über den Proxy</summary>

`/healthz` kann auch von außen abgefragt werden, z. B. von einem Monitoring-Dienst. Wichtel schreibt
für diese Aufrufe keine Logzeile. Siehe [Updates und Backups](/wichtel/operators/updates-backups/#health-check).

</details>

## Siehe auch

- [Konfiguration](/wichtel/operators/configuration/)
- [Datenschutz im Betrieb](/wichtel/operators/privacy/) – Logs des Proxys
- [Probleme lösen](/wichtel/operators/troubleshooting/)

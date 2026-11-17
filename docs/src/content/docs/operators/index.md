---
title: Schnelle Hilfe für den Betrieb
description: Schnelle Hilfe für alle, die Wichtel installieren und betreiben – Voraussetzungen, Schnellstart und die häufigsten Fragen.
sidebar:
  label: Schnelle Hilfe
---

:::tip[Auf einen Blick]

- Wichtel ist **ein Docker-Container plus PostgreSQL**. Migrationen laufen beim Start automatisch.
- Du brauchst: einen Server mit **Docker und Docker Compose**, eine **(Sub-)Domain**, einen
  **Reverse Proxy mit TLS** (Caddy, nginx, Traefik …) und – empfohlen – einen **SMTP-Mailserver**.
- Das Image `ghcr.io/yniverz/wichtel:latest` gibt es für **amd64 und arm64**.
- Der **Einrichtungslink** für das erste Admin-Konto steht nach dem Start im Log.

:::

## Schnellstart

```bash
curl -O https://raw.githubusercontent.com/yniverz/wichtel/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/yniverz/wichtel/main/.env.example
# .env bearbeiten: mindestens PUBLIC_URL und POSTGRES_PASSWORD
docker compose up -d
docker compose logs app   # enthält den Einrichtungslink
```

Danach den Reverse Proxy einrichten. Ausführlich: [Installation mit Docker Compose](/wichtel/operators/install/)
und [Reverse Proxy und HTTPS](/wichtel/operators/reverse-proxy/).

## Häufige Fragen

### Wo finde ich den Einrichtungslink?

Im Log des App-Containers: `docker compose logs app | grep setup`. Ohne festen `SETUP_TOKEN` entsteht
bei jedem Start ein neuer Link, bis die Einrichtung abgeschlossen ist – ältere Links gelten dann
nicht mehr. [Ausführlich](/wichtel/operators/install/#einrichtungslink)

### Wie aktualisiere ich Wichtel?

`docker compose pull && docker compose up -d`. Datenbank-Migrationen laufen beim Start von selbst.
Vorher eine Sicherung machen. [Ausführlich](/wichtel/operators/updates-backups/)

### Was muss ich sichern?

Die Volumes `postgres` (Datenbank) und `uploads` (Logos, Geländepläne, Nachweise). Für die
Datenbank am besten einen Dump mit `pg_dump`. [Ausführlich](/wichtel/operators/updates-backups/#sichern)

### Es kommen keine E-Mails an.

Unter _Verwaltung → Kommunikation → Zustellung_ mit _Testmail an mich senden_ prüfen: Die Antwort des
Mailservers steht direkt dort. Ist `SMTP_HOST` nicht gesetzt, verschickt Wichtel gar keine Mails.
[Ausführlich](/wichtel/operators/email/)

### Auf welchem Port läuft Wichtel?

Im Container auf `3000`. Die `docker-compose.yml` veröffentlicht ihn auf dem Host als
`127.0.0.1:3006` – also nur für einen Reverse Proxy auf demselben Rechner. Ändern mit
`WICHTEL_PORT` und `WICHTEL_BIND`. [Ausführlich](/wichtel/operators/configuration/)

### Brauche ich HTTPS?

Ja, für den echten Betrieb. Wichtel selbst spricht nur http und gehört hinter einen Reverse Proxy
mit TLS. Den App-Port nie direkt ins Internet freigeben. [Ausführlich](/wichtel/operators/reverse-proxy/)

### Ich nutze Cloudflare (oder zwei Proxys hintereinander).

`XFF_DEPTH` auf die Zahl der Proxys setzen, z. B. `2` für Cloudflare + Caddy, und dafür sorgen, dass
der innere Proxy die Adresse von Cloudflare weiterreicht.
[Ausführlich](/wichtel/operators/reverse-proxy/#mehrere-proxys-zum-beispiel-cloudflare)

### Wie prüfe ich, ob Wichtel läuft?

`GET /healthz` antwortet mit `ok`, wenn App und Datenbank erreichbar sind, sonst mit Status 503.
Docker nutzt das auch selbst: `docker compose ps` zeigt `healthy`.
[Ausführlich](/wichtel/operators/updates-backups/#health-check)

### Wo sehe ich die Logs?

`docker compose logs -f app`. Im Container ist jede Zeile ein JSON-Objekt, das sich mit `jq`
filtern lässt. [Ausführlich](/wichtel/operators/logs/)

### Jemand meldet mir eine Fehler-ID.

Die Fehler-ID steht auch im Log und in der Fehler-Mail an alle Admins:
`docker compose logs app | grep <Fehler-ID>`. [Ausführlich](/wichtel/operators/logs/#fehler-ids-und-fehler-mails)

### Was bedeutet die Warnung `client address unknown`?

Der Reverse Proxy schickt kein `X-Forwarded-For` mit. Dann gilt die Login-Begrenzung nur noch pro
Konto. [Ausführlich](/wichtel/operators/troubleshooting/)

### Geht es auch ohne Mailserver?

Ja, aber dann werden keine Mails verschickt, Adressen gelten ohne Bestätigung und niemand kann das
Passwort selbst zurücksetzen. Admins erzeugen dann Reset-Links von Hand.
[Ausführlich](/wichtel/operators/email/#ohne-mailserver)

### Wie groß muss der Server sein?

Eine VM mit 2 vCPU und 2 GB RAM für Wichtel und PostgreSQL zusammen reichte im Test für 3000 Helfende
und 1500 Schichten. [Ausführlich](/wichtel/operators/capacity/)

### Kann ich das Image selbst bauen?

Ja: Repository klonen, dann `docker compose -f docker-compose.yml -f compose.build.yml up -d --build`.
[Ausführlich](/wichtel/operators/install/#image-selbst-bauen)

### Was muss ich für den Datenschutz tun?

Impressum und Datenschutzerklärung in der Verwaltung pflegen, die Aufbewahrung der Proxy-Logs und
Backups festlegen. Das Aufräumen alter Daten macht Wichtel selbst. [Ausführlich](/wichtel/operators/privacy/)

## Siehe auch

- [Probleme lösen](/wichtel/operators/troubleshooting/)
- [Erste Schritte nach der Einrichtung](/wichtel/organizers/first-steps/)

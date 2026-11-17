---
title: Konfiguration
description: Alle Umgebungsvariablen von Wichtel mit Standardwert und Zweck, und was PUBLIC_URL alles beeinflusst.
---

:::tip[Auf einen Blick]

- Pflicht sind nur **`PUBLIC_URL`** und **`POSTGRES_PASSWORD`**.
- Für E-Mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
- Bei Docker Compose stehen die Werte in der `.env` neben der `docker-compose.yml`, bei Portainer in
  den Umgebungsvariablen des Stacks. Nach einer Änderung `docker compose up -d`.
- Alles Übrige (Festivalname, Farben, Regeln …) stellen Admins in der Oberfläche ein.

:::

## Die Variablen

### Pflicht

| Variable            | Standard | Zweck                                                                                                                                                                                                     |
| ------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`        | –        | Öffentliche Adresse, z. B. `https://helfen.example.de`: nur `https://` oder `http://`, Host und ggf. Port, **kein Pfad**. Ein Schrägstrich am Ende wird entfernt. Siehe [unten](#was-public_url-bewirkt). |
| `POSTGRES_PASSWORD` | –        | Passwort der mitgelieferten Datenbank. Nur für die `docker-compose.yml`, die daraus auch `DATABASE_URL` baut.                                                                                             |

Fehlt eine der beiden, bricht `docker compose` mit „set PUBLIC_URL …“ bzw. „set POSTGRES_PASSWORD“ ab.

### Nur für die docker-compose.yml

| Variable        | Standard                         | Zweck                                                                                                           |
| --------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `WICHTEL_PORT`  | `3006`                           | Port auf dem Host. Im Container lauscht Wichtel immer auf `3000`.                                               |
| `WICHTEL_BIND`  | `127.0.0.1`                      | Adresse auf dem Host. `127.0.0.1` = nur vom Server selbst erreichbar (Proxy auf dem Host); `0.0.0.0` = im Netz. |
| `WICHTEL_IMAGE` | `ghcr.io/yniverz/wichtel:latest` | Welches Image läuft, z. B. eine feste Version `ghcr.io/yniverz/wichtel:<commit>` oder ein eigener Fork.         |

### E-Mail (SMTP)

| Variable        | Standard                      | Zweck                                                                                                                                                                                             |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SMTP_HOST`     | leer                          | Mailserver. Leer = es werden keine Mails verschickt (im Log steht nur der Betreff), und neue Konten brauchen keine Bestätigung.                                                                   |
| `SMTP_PORT`     | `587`                         | Port des Mailservers. Muss eine ganze Zahl sein.                                                                                                                                                  |
| `SMTP_SECURE`   | `false`                       | `true` (oder `1`) = TLS von Anfang an, meist Port `465`. Bei `false` typischerweise Port `587`.                                                                                                   |
| `SMTP_USER`     | leer                          | Benutzername. Ist er leer, meldet sich Wichtel nicht am Mailserver an.                                                                                                                            |
| `SMTP_PASSWORD` | leer                          | Passwort zum Benutzernamen.                                                                                                                                                                       |
| `SMTP_FROM`     | `Wichtel <wichtel@localhost>` | Absender, z. B. `"Festival Helfende <helfen@example.de>"`. Unbedingt setzen – den Standard lehnen echte Mailserver meist ab; fehlt er bei gesetztem `SMTP_HOST`, warnt Wichtel beim Start im Log. |

Mehr dazu: [E-Mail](/wichtel/operators/email/).

### Optional

| Variable          | Standard                                | Zweck                                                                                                                                                                    |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SETUP_TOKEN`     | leer                                    | Fester Token für den Einrichtungslink, **mindestens 24 Zeichen**. Leer = zufälliger Token im Log. Nach der Einrichtung entfernen.                                        |
| `LOG_LEVEL`       | `info`                                  | `debug`, `info`, `warn` oder `error`.                                                                                                                                    |
| `LOG_FORMAT`      | `json` im Container                     | `json` (eine Zeile JSON pro Ereignis) oder `text` (lesbar). Ohne Angabe: `json` im Betrieb, `text` in der Entwicklung.                                                   |
| `LOG_MAIL_BODIES` | aus (nur in der Entwicklung an)         | Ohne SMTP auch Empfängeradresse und Mailtext loggen. Die Texte enthalten geheime Links (z. B. zum Zurücksetzen des Passworts) – im Betrieb nicht empfohlen.              |
| `XFF_DEPTH`       | `1`                                     | Wie viele Proxys vor Wichtel stehen, z. B. `2` für Cloudflare + Caddy. Siehe [mehrere Proxys](/wichtel/operators/reverse-proxy/#mehrere-proxys-zum-beispiel-cloudflare). |
| `UPLOAD_DIR`      | `/data/uploads` im Container            | Wo hochgeladene Dateien liegen (Logos, Hintergründe, Geländepläne, Nachweise). Im Container liegt `/data` im Volume `uploads`; nicht ändern.                             |
| `DATABASE_URL`    | von der `docker-compose.yml` vorgegeben | PostgreSQL-Verbindung, z. B. `postgres://wichtel:<passwort>@db:5432/wichtel`. Nur nötig, wenn du eine eigene Datenbank statt der mitgelieferten nutzt.                   |

:::note
Die `docker-compose.yml` reicht `PUBLIC_URL`, `SETUP_TOKEN`, die `SMTP_*`-Variablen, `LOG_LEVEL`,
`LOG_FORMAT`, `LOG_MAIL_BODIES` und `XFF_DEPTH` aus der `.env` an den Container weiter;
`DATABASE_URL` baut sie selbst, `UPLOAD_DIR` setzt das Image. Andere Variablen (etwa die unten unter
„Schon gesetzt“) wirken nur, wenn du sie im Abschnitt `environment` des Dienstes `app` ergänzt – am einfachsten in einer `docker-compose.override.yml` neben der
`docker-compose.yml`, die Docker Compose automatisch mitliest:

```yaml
services:
  app:
    environment:
      BODY_SIZE_LIMIT: 32M
```

:::

### Schon gesetzt: Reverse Proxy und Server

Diese Werte setzen das Image bzw. die `docker-compose.yml` bereits. Sie gehören zum Node-Server von
SvelteKit; ändern muss man sie selten.

| Variable          | Wert                | Zweck                                                                                                                      |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `PROTOCOL_HEADER` | `x-forwarded-proto` | Protokoll (http/https) kommt vom Reverse Proxy. Fehlt der Header (Aufruf ohne Proxy), gilt das Protokoll von `PUBLIC_URL`. |
| `HOST_HEADER`     | `x-forwarded-host`  | Hostname kommt vom Reverse Proxy (sonst aus `Host`).                                                                       |
| `ADDRESS_HEADER`  | `x-forwarded-for`   | Client-Adresse kommt vom Reverse Proxy.                                                                                    |
| `BODY_SIZE_LIMIT` | `16M`               | Obergrenze für Anfragen; Wichtel selbst erlaubt 16 MB nur für Uploads, sonst 1 MB.                                         |
| `PORT`            | `3000`              | Port im Container.                                                                                                         |
| `NODE_ENV`        | `production`        | Betriebsmodus (u. a. JSON-Logs, strenge Prüfung von `SETUP_TOKEN`).                                                        |

## Was PUBLIC_URL bewirkt

`PUBLIC_URL` muss genau die Adresse sein, unter der Helfende Wichtel öffnen. Wichtel nutzt sie für:

- **Links in E-Mails** – Bestätigung, Passwort zurücksetzen, Erinnerungen, Neuigkeiten,
  Fehler-Mails – und für den Einrichtungslink im Log.
- **Links und QR-Codes, die nach außen gehen**, z. B. Kalender-Abos und Einladungen in Gruppen.
- **HSTS und sichere Cookies:** Beginnt `PUBLIC_URL` mit `https://`, schickt Wichtel den Header
  `Strict-Transport-Security` (ein Jahr, mit Subdomains) und setzt Cookies immer mit `Secure`. Ein
  Browser schickt solche Cookies nicht über http – wer über http testet, braucht deshalb eine
  http-`PUBLIC_URL`.
- **Das Protokoll ohne Proxy:** Kommt eine Anfrage ohne `X-Forwarded-Proto` an, weil der App-Port
  direkt aufgerufen wird, nimmt Wichtel das Protokoll aus `PUBLIC_URL`. Mit einer http-`PUBLIC_URL`
  funktionieren Anmeldung und Formulare so auch ohne Proxy. Siehe
  [Testen über http](/wichtel/operators/reverse-proxy/#sonderfälle).
- **Die Anmeldung von KI-Assistenten** (OAuth und MCP-Endpunkt `/mcp`). Damit sich z. B. Claude
  verbinden kann, muss `PUBLIC_URL` die öffentliche https-Adresse sein und der Server aus dem Internet
  erreichbar. Siehe [KI-Assistenten](/wichtel/organizers/ai/).

Nach einer Änderung von `PUBLIC_URL` gilt sie für alle neuen Mails. Schon verschickte Links zeigen
weiter auf die alte Adresse.

:::caution
HSTS merkt sich der Browser ein Jahr lang, auch für alle Subdomains der Adresse in `PUBLIC_URL`. Eine
https-`PUBLIC_URL` also erst eintragen, wenn HTTPS dauerhaft funktioniert.
:::

## Sonderfälle

<details>
<summary>Wichtel startet nicht wegen einer Variable</summary>

Wichtel prüft beim Start einige Werte und bricht bei ungültigen ab:

- `PUBLIC_URL` keine vollständige Adresse: „PUBLIC_URL must be an absolute URL starting with
  https:// or http://“ (z. B. bei `helfen.example.de` ohne `https://`)
- `PUBLIC_URL` mit Pfad, Abfrage oder Benutzername: „PUBLIC_URL must not contain a path, query or
  user name“ – Wichtel läuft immer an der Wurzel einer eigenen (Sub-)Domain, nicht unter
  `https://example.de/helfen`
- `SETUP_TOKEN` kürzer als 24 Zeichen: „SETUP_TOKEN must be at least 24 characters“
- `SMTP_PORT` keine ganze Zahl: „SMTP_PORT must be an integer“
- `LOG_LEVEL` nicht `debug`/`info`/`warn`/`error`: „LOG_LEVEL must be debug, info, warn or error“
- `LOG_FORMAT` nicht `json`/`text`: „LOG_FORMAT must be json or text“

Den Wert korrigieren und `docker compose up -d` ausführen. Weitere Ursachen:
[Probleme lösen](/wichtel/operators/troubleshooting/).

</details>

<details>
<summary>Eigene PostgreSQL-Datenbank statt der mitgelieferten</summary>

Die `docker-compose.yml` baut `DATABASE_URL` aus `POSTGRES_PASSWORD` und dem Dienst `db`. Wer eine
vorhandene Datenbank nutzen will, passt in einer eigenen Compose-Datei `DATABASE_URL` des Dienstes
`app` an (`postgres://benutzer:passwort@host:5432/datenbank`) und lässt den Dienst `db` weg.
Migrationen laufen auch dort beim Start automatisch.

</details>

## Siehe auch

- [Reverse Proxy und HTTPS](/wichtel/operators/reverse-proxy/)
- [E-Mail](/wichtel/operators/email/)
- [Logs und Fehlermeldungen](/wichtel/operators/logs/)

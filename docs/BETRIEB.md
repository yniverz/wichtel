# Betrieb

Wichtel läuft als ein Docker-Container neben einer PostgreSQL-Datenbank. Migrationen laufen beim
Start automatisch. Das Image wird bei jedem grünen Build von `main` als
`ghcr.io/yniverz/wichtel:latest` veröffentlicht (amd64 und arm64).

## Mit Docker Compose

```bash
curl -O https://raw.githubusercontent.com/yniverz/wichtel/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/yniverz/wichtel/main/.env.example
# .env bearbeiten: mindestens PUBLIC_URL und POSTGRES_PASSWORD
docker compose up -d
docker compose logs app   # enthält den Einrichtungslink
```

Über den Einrichtungslink (`/setup?token=…`) legst du das erste Admin-Konto und den ersten Jahrgang
an. Danach ist der Link ungültig.

Selbst bauen statt Image laden:
`docker compose -f docker-compose.yml -f compose.build.yml up -d --build`.

## Mit Portainer

1. _Stacks → Add stack_, Inhalt von `docker-compose.yml` in den Web-Editor kopieren (oder
   _Repository_ mit der Repo-URL wählen).
2. Unter _Environment variables_ mindestens `POSTGRES_PASSWORD` und `PUBLIC_URL` setzen, optional
   `WICHTEL_PORT`, `WICHTEL_BIND` und `SMTP_*`.
3. Deployen; den Einrichtungslink zeigen die Logs des `app`-Containers.

Falls GitHub das Image privat führt: unter _Packages → wichtel → Package settings_ auf „Public“
stellen.

## Umgebungsvariablen

| Variable            | Zweck                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`        | Öffentliche Adresse, z. B. `https://helfen.example.de` – für Links in E-Mails und die KI-Anmeldung |
| `POSTGRES_PASSWORD` | Passwort der mitgelieferten Datenbank                                                              |
| `WICHTEL_PORT`      | Port auf dem Host (Standard `3006`)                                                                |
| `WICHTEL_BIND`      | Adresse auf dem Host (Standard `127.0.0.1`; `0.0.0.0` für das Netz)                                |
| `SMTP_HOST` …       | Mailserver; ohne ihn landen E-Mails im Log und Konten brauchen keine Bestätigung                   |
| `SETUP_TOKEN`       | Fester Einrichtungs-Token statt eines zufälligen                                                   |

Alle Variablen mit Erklärung stehen in [.env.example](../.env.example).

## Reverse Proxy und HTTPS

Wichtel gehört hinter einen Reverse Proxy mit TLS (Caddy, Traefik, nginx …). Die
`docker-compose.yml` vertraut bereits den `X-Forwarded-*`-Headern. Beispiel für Caddy:

```
helfen.example.de {
	reverse_proxy 127.0.0.1:3006
}
```

Läuft der Proxy selbst in Docker, `WICHTEL_BIND=0.0.0.0` setzen oder beide Container in ein
gemeinsames Netzwerk hängen.

## E-Mail

Für echten Versand `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` und
`SMTP_FROM` setzen. Damit Mails nicht im Spam landen, sollten SPF, DKIM und DMARC für die
Absender-Domain eingerichtet sein. Mails gehen über eine Warteschlange und werden bei Fehlern
mehrfach wiederholt.

## Sichern und aktualisieren

- **Sichern**: die Volumes `postgres` (Datenbank) und `uploads` (Logos, Geländepläne, Nachweise).
  Für eine konsistente Datenbanksicherung: `docker compose exec db pg_dump -U wichtel wichtel > backup.sql`.
- **Aktualisieren**: `docker compose pull && docker compose up -d` – Migrationen laufen beim Start.
- **Gesundheit**: `GET /healthz` meldet, ob App und Datenbank erreichbar sind.

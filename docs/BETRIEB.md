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

| Variable            | Zweck                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`        | Öffentliche Adresse, z. B. `https://helfen.example.de` – für Links in E-Mails und die KI-Anmeldung                |
| `POSTGRES_PASSWORD` | Passwort der mitgelieferten Datenbank                                                                             |
| `WICHTEL_PORT`      | Port auf dem Host (Standard `3006`)                                                                               |
| `WICHTEL_BIND`      | Adresse auf dem Host (Standard `127.0.0.1`; `0.0.0.0` für das Netz)                                               |
| `SMTP_HOST` …       | Mailserver; ohne ihn landen E-Mails im Log und Konten brauchen keine Bestätigung                                  |
| `SETUP_TOKEN`       | Fester Einrichtungs-Token (mindestens 24 Zeichen); leer = zufälliger Token im Log. Nach der Einrichtung entfernen |
| `LOG_LEVEL`         | `debug`, `info` (Standard), `warn` oder `error`                                                                   |
| `LOG_FORMAT`        | `json` (Standard im Container) oder `text`                                                                        |
| `LOG_MAIL_BODIES`   | Ohne SMTP auch Mailtexte loggen (enthalten Reset-Links); Standard nur in der Entwicklung                          |

Alle Variablen mit Erklärung stehen in [.env.example](../.env.example).

## Reverse Proxy und HTTPS

Wichtel gehört hinter einen Reverse Proxy mit TLS (Caddy, Traefik, nginx …). Die
`docker-compose.yml` vertraut bereits den `X-Forwarded-*`-Headern. Beispiel für Caddy:

```
helfen.example.de {
	request_body {
		max_size 16MB
	}
	reverse_proxy 127.0.0.1:3006
}
```

Läuft der Proxy selbst in Docker, beide Container in ein gemeinsames Netzwerk hängen. Den
App-Port **nie direkt** ins Internet freigeben (`WICHTEL_BIND=0.0.0.0` nur, wenn eine Firewall
den Port von außen sperrt): Wichtel vertraut `X-Forwarded-For` und `X-Forwarded-Proto`. Ohne Proxy
davor könnte jede:r die eigene IP-Adresse vortäuschen und die Login-Begrenzung umgehen. Steht mehr
als ein Proxy davor (z. B. Cloudflare und Caddy), `XFF_DEPTH` auf die Zahl der Proxys setzen.

Kommt beim Start oder Login die Warnung `client address unknown`, schickt der Proxy kein
`X-Forwarded-For` mit. Die Login-Begrenzung gilt dann nur noch pro Konto.

Wichtel setzt selbst eine Content-Security-Policy, `Permissions-Policy` und bei https-`PUBLIC_URL`
auch HSTS und `Secure`-Cookies. Wer über http testet, braucht deshalb eine http-`PUBLIC_URL`.
Anfragen über 1 MB werden außer bei Datei-Uploads abgelehnt.

## E-Mail

Mit Mailserver meldet man sich nach der Registrierung erst an, wenn die Adresse bestätigt ist.
Ist eine Adresse schon registriert, zeigt Wichtel dieselbe Meldung wie bei einem neuen Konto und
schickt der Inhaberin stattdessen einen Link zum Zurücksetzen. So lässt sich nicht ausprobieren,
wer ein Konto hat.

Für echten Versand `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` und
`SMTP_FROM` setzen. Damit Mails nicht im Spam landen, sollten SPF, DKIM und DMARC für die
Absender-Domain eingerichtet sein. Mails gehen über eine Warteschlange und werden bei Fehlern
mehrfach wiederholt.

**Ohne Mailserver** werden keine Mails verschickt, Adressen gelten ohne Bestätigung, und niemand
kann sein Passwort selbst zurücksetzen. Die Verwaltung zeigt dann einen Hinweis. Admins erzeugen
auf der Seite einer Person einen Link zum Zurücksetzen (eine Stunde gültig, protokolliert) und
geben ihn persönlich weiter. Mailtexte stehen nur in der Entwicklung im Log, weil sie geheime
Links enthalten (`LOG_MAIL_BODIES=true` erzwingt es; in Produktion nicht empfohlen).

## Logs und Fehlermeldungen

Wichtel schreibt eine Zeile pro Ereignis nach stdout/stderr, im Container als JSON:

```
{"time":"2027-06-01T10:00:00.000Z","level":"info","msg":"request","method":"GET","path":"/app/shifts","status":200,"ms":12}
```

Anfragen werden ohne IP-Adresse und ohne Suchparameter protokolliert. Fehlgeschlagene E-Mails
erscheinen als `mail failed …` mit der ID der Mail. Ansehen und filtern zum Beispiel mit
`docker compose logs -f app | jq 'select(.level != "info")'`.

Bei unerwarteten Fehlern sehen Nutzer:innen eine kurze **Fehler-ID**. Dieselbe ID steht im Log
und in der E-Mail, die alle Admins bekommen (abschaltbar unter Einstellungen → Betrieb;
derselbe Fehler höchstens einmal pro Stunde, insgesamt höchstens zehn Mails pro Stunde).
Mails, die endgültig nicht zugestellt werden konnten, zeigt die Übersicht der Verwaltung an;
unter Kommunikation → Zustellung lassen sie sich erneut senden.

## Datenschutz im Betrieb

- **Impressum und Datenschutzerklärung** pflegt ihr unter Verwaltung → Datenschutz & Impressum.
  Die Vorlage nennt die Stellen, die vom Betrieb abhängen (Webserver-Logs, Hosting- und
  Mail-Anbieter, zuständige Aufsichtsbehörde).
- **Aufräumen** läuft automatisch alle sechs Stunden: Konten ohne Aktivität werden nach der
  eingestellten Frist (Standard 24 Monate) anonymisiert, zwei Wochen vorher gibt es eine Mail.
  IP-Adressen im Protokoll werden nach 90 Tagen entfernt, Kopien verschickter Mails nach 30 Tagen.
- **Logs des Reverse Proxys** enthalten IP-Adressen. Deren Aufbewahrung legt ihr dort fest
  (z. B. bei Caddy über `log { output file … { roll_keep_for 14d } }`).
- **Backups** enthalten auch gelöschte Daten, bis sie rotiert sind; nennt die Aufbewahrungsdauer
  der Sicherungen in der Datenschutzerklärung.

## Sichern und aktualisieren

- **Sichern**: die Volumes `postgres` (Datenbank) und `uploads` (Logos, Geländepläne, Nachweise).
  Für eine konsistente Datenbanksicherung: `docker compose exec db pg_dump -U wichtel wichtel > backup.sql`.
- **Aktualisieren**: `docker compose pull && docker compose up -d` – Migrationen laufen beim Start.
- **Gesundheit**: `GET /healthz` meldet, ob App und Datenbank erreichbar sind.

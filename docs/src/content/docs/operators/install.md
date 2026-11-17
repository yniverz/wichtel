---
title: Installation mit Docker Compose
description: Wichtel mit Docker Compose installieren, den Einrichtungslink finden und das erste Admin-Konto anlegen.
---

:::tip[Auf einen Blick]

- `docker-compose.yml` und `.env.example` (als `.env`) herunterladen, `PUBLIC_URL` und
  `POSTGRES_PASSWORD` setzen, `docker compose up -d`.
- Den **Einrichtungslink** zeigt `docker compose logs app`. Darüber legst du das erste Admin-Konto
  und den ersten Jahrgang an; danach ist der Link ungültig.
- Wichtel lauscht danach auf `127.0.0.1:3006` – davor gehört ein [Reverse Proxy mit TLS](/wichtel/operators/reverse-proxy/).

:::

## Voraussetzungen

- Ein Linux-Server (amd64 oder arm64) mit **Docker** und dem **Compose-Plugin** (`docker compose`).
- Eine **(Sub-)Domain**, z. B. `helfen.example.de`, die auf den Server zeigt.
- Ein **Reverse Proxy mit TLS** auf dem Server oder davor (Caddy, nginx, Traefik …).
- Empfohlen: Zugangsdaten für einen **SMTP-Mailserver**, siehe [E-Mail](/wichtel/operators/email/).

Die mitgelieferte `docker-compose.yml` startet zwei Container: `app` (Wichtel, Image
`ghcr.io/yniverz/wichtel:latest`) und `db` (PostgreSQL 17). Das Image wird nach jedem
erfolgreichen Build von `main` neu veröffentlicht.

## Schritt für Schritt

1. Ein Verzeichnis anlegen und die beiden Dateien herunterladen:

   ```bash
   mkdir wichtel && cd wichtel
   curl -O https://raw.githubusercontent.com/yniverz/wichtel/main/docker-compose.yml
   curl -o .env https://raw.githubusercontent.com/yniverz/wichtel/main/.env.example
   ```

2. `.env` bearbeiten. Pflicht sind:
   - `PUBLIC_URL` – die öffentliche Adresse, genau so, wie sie im Browser steht, z. B.
     `https://helfen.example.de` (ohne Pfad). Für einen ersten Test ohne Proxy geht auch die
     http-Adresse des Servers, z. B. `http://192.168.1.10:3006` mit `WICHTEL_BIND=0.0.0.0`.
   - `POSTGRES_PASSWORD` – ein langes, zufälliges Passwort für die Datenbank, z. B. aus
     `openssl rand -hex 24`.

   Für E-Mail die `SMTP_*`-Zeilen ausfüllen. Alle Variablen erklärt
   [Konfiguration](/wichtel/operators/configuration/).

3. Starten:

   ```bash
   docker compose up -d
   ```

   Die App wartet, bis die Datenbank bereit ist, und spielt dann die Migrationen ein.

4. Den Einrichtungslink aus dem Log holen (siehe unten) und öffnen.
5. [Reverse Proxy](/wichtel/operators/reverse-proxy/) einrichten, falls noch nicht geschehen.

## Einrichtungslink

Solange es noch kein Admin-Konto gibt, schreibt Wichtel beim Start eine Zeile wie diese ins Log:

```
{"time":"…","level":"info","msg":"Wichtel is not set up yet. Open this link to create the first admin account.","url":"https://helfen.example.de/setup?token=…"}
```

Finden mit:

```bash
docker compose logs app | grep setup
```

Der Link beginnt mit `PUBLIC_URL`. Auf der Seite gibst du ein:

- _Dein Festival_: den Namen des Festivals,
- _Dein Admin-Konto_: Vor- und Nachname, E-Mail, Telefon und Passwort (mindestens 10 Zeichen),
- _Erster Jahrgang_: Name und Zeitraum (inklusive Aufbau und Abbau).

Mit _Einrichtung abschließen_ bist du als Admin angemeldet und landest in der Verwaltung. Die
E-Mail-Adresse dieses ersten Kontos gilt sofort als bestätigt. Danach ist der Link ungültig, und
`/setup` leitet zur Anmeldung weiter. Weiter geht es mit den
[ersten Schritten für die Organisation](/wichtel/organizers/first-steps/).

<details>
<summary>Der Link ist abgelaufen oder verloren gegangen</summary>

Ohne `SETUP_TOKEN` erzeugt Wichtel **bei jedem Start einen neuen, zufälligen Token**, solange die
Einrichtung nicht abgeschlossen ist. Ein Link von vor einem Neustart gilt dann nicht mehr; die Seite
meldet „Der Einrichtungslink ist ungültig“. Lösung: den neuesten Link aus dem Log nehmen
(`docker compose logs app | grep setup | tail -n 1`) oder den Container neu starten
(`docker compose restart app`) und den dann geloggten Link verwenden.

</details>

<details>
<summary>Einen festen Einrichtungs-Token verwenden (SETUP_TOKEN)</summary>

Wer das Log nicht lesen kann (z. B. bei manchen Hostern), setzt `SETUP_TOKEN` in der `.env` auf einen
eigenen Wert mit **mindestens 24 Zeichen**. Kürzere Werte lehnt Wichtel im Betrieb ab und startet
nicht. Der Link lautet dann `PUBLIC_URL/setup?token=<SETUP_TOKEN>`.

Wer den Token kennt, kann sich vor dir zum Admin machen. Nach der Einrichtung `SETUP_TOKEN` daher
wieder entfernen; Wichtel erinnert im Log daran („SETUP_TOKEN is no longer needed and can be
removed“).

</details>

<details>
<summary>Der Link zeigt auf die falsche Adresse</summary>

Der Link wird aus `PUBLIC_URL` gebaut. Stimmt die Adresse nicht, `PUBLIC_URL` korrigieren und
`docker compose up -d` ausführen – sonst stimmen auch die Links in allen E-Mails nicht. Zum
schnellen Testen kannst du auch nur den Teil `/setup?token=…` an die richtige Adresse hängen.

</details>

## Image selbst bauen

Statt das fertige Image zu laden, kannst du es aus dem Quellcode bauen, z. B. für eigene Änderungen:

```bash
git clone https://github.com/yniverz/wichtel.git
cd wichtel
cp .env.example .env   # PUBLIC_URL und POSTGRES_PASSWORD setzen
docker compose -f docker-compose.yml -f compose.build.yml up -d --build
```

`compose.build.yml` ersetzt das Image durch einen lokalen Build (`wichtel:local`). Zum
Aktualisieren `git pull` und denselben Befehl noch einmal.

Ein anderes fertiges Image (z. B. aus einem eigenen Fork) wählst du mit `WICHTEL_IMAGE` in der
`.env`. Die CI veröffentlicht jedes Image als `latest` und zusätzlich unter dem Commit-Hash, z. B.
`ghcr.io/yniverz/wichtel:<commit>` – so lässt sich auch eine bestimmte Version festhalten.

## Siehe auch

- [Installation mit Portainer](/wichtel/operators/portainer/)
- [Konfiguration](/wichtel/operators/configuration/)
- [Reverse Proxy und HTTPS](/wichtel/operators/reverse-proxy/)
- [Probleme lösen](/wichtel/operators/troubleshooting/)

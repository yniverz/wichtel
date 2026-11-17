---
title: Updates und Backups
description: Wichtel aktualisieren, Datenbank und Uploads sichern, eine Sicherung zurückspielen und den Health-Check nutzen.
---

:::tip[Auf einen Blick]

- **Aktualisieren:** `docker compose pull && docker compose up -d` – Migrationen laufen beim Start.
- **Sichern:** Volumes `postgres` und `uploads`; für die Datenbank
  `docker compose exec -T db pg_dump -U wichtel wichtel > backup.sql`.
- **Gesundheit:** `GET /healthz` antwortet `ok`, wenn App und Datenbank erreichbar sind.

:::

## Aktualisieren

1. Vorher [sichern](#sichern).
2. Im Verzeichnis mit der `docker-compose.yml`:

   ```bash
   docker compose pull
   docker compose up -d
   ```

3. Die App startet neu und spielt neue Datenbank-Migrationen selbst ein. Im Log prüfen, ob sie sauber
   hochkommt: `docker compose logs -f app`.

Wer das Image selbst baut: `git pull`, dann
`docker compose -f docker-compose.yml -f compose.build.yml up -d --build`.

<details>
<summary>Eine bestimmte Version festhalten oder zurückgehen</summary>

Jedes veröffentlichte Image trägt neben `latest` auch den Commit-Hash als Tag. Mit
`WICHTEL_IMAGE=ghcr.io/yniverz/wichtel:<commit>` in der `.env` bleibt Wichtel auf dieser Version.

Migrationen laufen nur vorwärts. Wer nach einem Update auf eine ältere Version zurück will, spielt
deshalb zusammen mit dem älteren Image die **Sicherung von vor dem Update** zurück.

</details>

## Sichern

Zu sichern sind die beiden Volumes aus der `docker-compose.yml`:

| Volume     | Inhalt                                                             |
| ---------- | ------------------------------------------------------------------ |
| `postgres` | die Datenbank – alle Konten, Schichten, Einstellungen, Protokoll … |
| `uploads`  | hochgeladene Dateien: Logos, Hintergründe, Geländepläne, Nachweise |

Für eine **konsistente Datenbanksicherung** im laufenden Betrieb einen Dump erstellen:

```bash
docker compose exec -T db pg_dump -U wichtel wichtel > backup-$(date +%F).sql
```

Die Uploads als Archiv aus dem laufenden Container holen:

```bash
docker compose exec -T app tar -czf - -C /data uploads > uploads-$(date +%F).tar.gz
```

Beides regelmäßig, z. B. per Cronjob, an einen anderen Ort kopieren. Sicherungen enthalten auch
Daten, die in Wichtel inzwischen gelöscht wurden – siehe [Datenschutz im Betrieb](/wichtel/operators/privacy/).

:::note
`-T` schaltet das Terminal von `docker compose exec` ab, damit die Ausgabe unverändert in der Datei
landet.
:::

## Zurückspielen

:::caution
Das ersetzt alle aktuellen Daten durch den Stand der Sicherung.
:::

1. Die Uploads zurückspielen (die App läuft dabei noch):

   ```bash
   docker compose exec -T app tar -xzf - -C /data < uploads-2027-06-01.tar.gz
   ```

2. Die App anhalten, damit niemand während des Zurückspielens schreibt:

   ```bash
   docker compose stop app
   ```

3. Die Datenbank leeren und aus dem Dump neu füllen:

   ```bash
   docker compose exec -T db dropdb -U wichtel wichtel
   docker compose exec -T db createdb -U wichtel wichtel
   docker compose exec -T db psql -U wichtel -d wichtel -v ON_ERROR_STOP=1 < backup.sql
   ```

4. Die App wieder starten:

   ```bash
   docker compose start app
   ```

Ist die Sicherung älter als das laufende Image, spielt die App fehlende Migrationen beim Start ein.

<details>
<summary>Auf einen neuen Server umziehen</summary>

Auf dem neuen Server wie bei der [Installation](/wichtel/operators/install/) die `docker-compose.yml`
und dieselbe `.env` ablegen und `docker compose up -d` ausführen. Dann wie oben die Uploads und die
Datenbank zurückspielen. Den Einrichtungslink, der beim ersten Start im Log steht, nicht benutzen –
nach dem Zurückspielen gibt es das Admin-Konto aus der Sicherung, und der Link ist ungültig.

</details>

## Health-Check

`GET /healthz` prüft, ob die App läuft und die Datenbank antwortet:

- `200 ok` – alles in Ordnung,
- `503 database unavailable` – die Datenbank ist nicht erreichbar.

Das Image nutzt den Endpunkt als Docker-Health-Check (alle 30 Sekunden); `docker compose ps` zeigt
dann `healthy` oder `unhealthy`. Für ein externes Monitoring einfach
`https://helfen.example.de/healthz` abfragen. Aufrufe von `/healthz` erscheinen nicht im Log.

```bash
curl -s http://127.0.0.1:3006/healthz
```

## Siehe auch

- [Logs und Fehlermeldungen](/wichtel/operators/logs/)
- [Probleme lösen](/wichtel/operators/troubleshooting/)

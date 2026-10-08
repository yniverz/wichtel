# Lasttest

Simuliert viele Helfende gleichzeitig, vor allem eine Buchungswelle, und zeigt, wo die Grenzen
einer Installation liegen. Die App läuft dabei auf einem eigenen, möglichst kleinen Server (wie im
echten Betrieb); die simulierten Nutzer kommen von einem anderen Rechner. Laufen beide auf
demselben Rechner, misst man vor allem diesen.

## Aufbau

- **Server (Prüfling):** `load/vm/compose.yml` – Wichtel, PostgreSQL mit Abfragestatistik und
  Mailpit als Postfach, das alle Mails annimmt (Mailversand wird mitgemessen).
  `load/vm/monitor.sh` schreibt CPU, Speicher und Datenbankverbindungen als CSV mit.
- **Lastrechner:** [k6](https://k6.io) mit den Szenarien in `load/k6/`, dazu `load/db.ts` für
  Testdaten und Prüfungen.

k6 schickt die Header eines Reverse Proxys mit (`X-Forwarded-For` usw.) und gibt jeder simulierten
Person eine eigene Client-Adresse. So greifen Login- und Registrierungsgrenzen wie bei echten
Besuchern, statt alle Anfragen einer einzigen Adresse zuzurechnen.

## Ablauf

Auf dem Server (Docker installiert, Repository nach `/opt/wichtel` kopiert):

```
cd /opt/wichtel
printf 'PUBLIC_URL=http://<server>:3006\nPOSTGRES_PASSWORD=<zufällig>\n' > load/vm/.env
docker compose -f load/vm/compose.yml --env-file load/vm/.env up -d --build
```

Auf dem Lastrechner (Datenbank über einen SSH-Tunnel):

```
ssh -f -N -L 15432:127.0.0.1:5432 root@<server>
export DATABASE_URL=postgres://wichtel:<passwort>@127.0.0.1:15432/wichtel
BASE_URL=http://<server>:3006 npx tsx load/db.ts seed      # 3000 Helfende, 1500 Schichten
ssh root@<server> 'cd /opt/wichtel && docker compose -f load/vm/compose.yml restart app'
```

`seed` schreibt `load/out/fixture.json` (Sitzungen, Positionen, Passwort der Testkonten; nicht
im Repository). Größe über `HELPERS`, `SHIFTS`, `LEADS`.

### Szenarien

| Befehl                                                                                     | Was                                                                                                        |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `npx tsx load/db.ts wave 130` dann `k6 run -e WAVE_AT=<ms> -e PEOPLE=1500 load/k6/wave.js` | Buchungswelle: alle warten auf die Öffnung, buchen dann gleichzeitig; beliebte Schichten sind schnell voll |
| `k6 run -e RATE=40 load/k6/login.js`                                                       | Login-Ansturm in Stufen bis `RATE` Logins/s                                                                |
| `npx tsx load/db.ts wave 0` dann `k6 run -e PROFILE=stress load/k6/mixed.js`               | Alltag (Helfende, Leitungen, Kalender-Abos) mit steigender Last bis zum Abbruch                            |
| `k6 run -e PROFILE=soak -e RATE=3 -e DURATION=60 load/k6/mixed.js`                         | Dauerlast, um Speicherlecks zu finden                                                                      |

Danach:

```
npx tsx load/db.ts check   # keine Überbuchung, keine Doppel- oder Überschneidungsbuchung
npx tsx load/db.ts stats   # teuerste Datenbankabfragen (stats reset setzt zurück)
```

Mit `K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=load/out/report.html` erzeugt k6 zusätzlich
einen HTML-Bericht.

## Ergebnisse (Oktober 2026)

VM mit 2 vCPU (generische QEMU-CPU) und 2 GB RAM ohne Swap, 3000
Helfende, 1500 Schichten mit 2090 Positionen an fünf Tagen. Vorher = Stand vor den
Optimierungen der Schichtansichten.

| Messung                       | vorher                     | nachher                                                                                                         |
| ----------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Schichtliste, eine Person     | 0,9 s, 2,5 MB              | 0,12 s, 440 KB (ein Tag)                                                                                        |
| Schichtliste, Grenze          | ~1 Aufruf/s                | ~20 Aufrufe/s                                                                                                   |
| Alltag (`mixed.js`, Stufen)   | Abbruch bei ~4 Besuchen/s  | Abbruch bei ~15–20 Besuchen/s, ohne Fehler                                                                      |
| Dauerlast 30 min, 8 Besuche/s | –                          | p95 93 ms, Speicher konstant ~105 MB                                                                            |
| Logins                        | 40/s, p95 83 ms            | unverändert                                                                                                     |
| Buchungswelle, 300 Personen   | Absturz (Speicher, 1,5 GB) | –                                                                                                               |
| Buchungswelle, 1500 Personen  | –                          | kein Absturz, alle Buchungen korrekt; in den ersten Minuten Median 8 s, 13 % der Seitenaufrufe abgewiesen (503) |

Engpass ist danach der eine Node-Prozess (CPU), nicht die Datenbank (alle Abfragen im Mittel
unter 2 ms). Die Buchungslogik blieb in allen Läufen korrekt: keine Überbuchung, keine Doppel-
oder Überschneidungsbuchung.

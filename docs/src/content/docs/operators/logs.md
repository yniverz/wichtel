---
title: Logs und Fehlermeldungen
description: Wie Wichtel loggt, wie man die Logs mit jq filtert, was Fehler-IDs und Fehler-Mails sind und wo fehlgeschlagene Mails auftauchen.
---

:::tip[Auf einen Blick]

- `docker compose logs -f app` zeigt die Logs; im Container ist jede Zeile ein JSON-Objekt.
- Nur Warnungen und Fehler:
  `docker compose logs -f --no-log-prefix app | jq -R 'fromjson? | select(.level != "info")'`
- Meldet jemand eine **Fehler-ID**, steht dieselbe ID im Log und in der Fehler-Mail an alle Admins.

:::

## Das Format

Wichtel schreibt eine Zeile pro Ereignis nach stdout (Warnungen und Fehler nach stderr), im
Container als JSON:

```
{"time":"2027-06-01T10:00:00.000Z","level":"info","msg":"request","method":"GET","path":"/app/shifts","status":200,"ms":12}
```

- `level` ist `debug`, `info`, `warn` oder `error`. Was erscheint, steuert `LOG_LEVEL` (Standard
  `info`).
- Mit `LOG_FORMAT=text` sieht dieselbe Zeile so aus:
  `10:00:00 INFO  request method=GET path=/app/shifts status=200 ms=12`.
- **Anfragen** werden ohne IP-Adresse und ohne Suchparameter protokolliert. `path` ist die Route,
  bei Seiten mit ID z. B. `/admin/editions/[id=uuid]`. Aufrufe von `/healthz` und statischen Dateien
  erscheinen nicht.
- Wichtel loggt keine Namen, Passwörter oder Tokens. Ausnahmen: der Einrichtungslink vor der
  Einrichtung, und ohne Mailserver Empfänger und Betreff nicht verschickter Mails.

## Filtern mit jq

`docker compose logs` setzt vor jede Zeile den Containernamen; `--no-log-prefix` lässt ihn weg, damit
`jq` die Zeilen lesen kann. `jq -R 'fromjson? | …'` überspringt Zeilen, die kein JSON sind.

```bash
# Warnungen und Fehler, laufend
docker compose logs -f --no-log-prefix app | jq -R 'fromjson? | select(.level != "info")'

# Serverfehler (Status 500 und höher)
docker compose logs --no-log-prefix app | jq -R 'fromjson? | select(.status >= 500)'

# Langsame Anfragen über eine Sekunde
docker compose logs --no-log-prefix app | jq -R 'fromjson? | select(.msg == "request" and .ms > 1000)'

# Eine bestimmte Fehler-ID
docker compose logs --no-log-prefix app | grep 3f9a1c2b
```

## Fehler-IDs und Fehler-Mails

Bei einem unerwarteten Fehler sehen Nutzer:innen eine Fehlerseite mit einer kurzen **Fehler-ID**
(„Fehler-ID für Rückfragen: 3f9a1c2b“). Dieselbe ID steht

- im Log, als Zeile `unexpected error` mit `errorId`, Methode, Route und dem Stacktrace unter `err`,
- in einer **E-Mail an alle Admins** mit bestätigter Adresse, Betreff `[Festivalname] Fehler <ID>`.

Damit die Mails nicht überhandnehmen, meldet Wichtel denselben Fehler höchstens einmal pro Stunde und
verschickt insgesamt höchstens zehn Fehler-Mails pro Stunde. Ins Log kommt jeder Fehler. Auch Fehler in
Hintergrundaufgaben (Mailversand, Erinnerungen, Aufräumen) werden so gemeldet.

Abschalten: _Verwaltung → Einstellungen → Betrieb_ → _Fehler per E-Mail an alle Admins melden_
(standardmäßig an). Ohne Mailserver landen die Fehler-Mails nur im Log.

## Fehlgeschlagene Mails

Kann eine Mail nicht verschickt werden, erscheint im Log

- `mail failed, will retry` (Warnung) – Wichtel versucht es später noch einmal,
- `mail failed for good` (Fehler) – nach sechs Versuchen aufgegeben.

Beide Zeilen enthalten die ID der Mail (`mailId`), die Zahl der Versuche und die Fehlermeldung des
Mailservers, aber keine Adresse. Endgültig fehlgeschlagene Mails zeigt die _Übersicht_ der
Verwaltung an; unter _Kommunikation → Zustellung_ lassen sie sich erneut senden. Mehr:
[E-Mail](/wichtel/operators/email/).

## Wichtige Meldungen

| Meldung                                                                 | Bedeutung                                                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Wichtel is not set up yet. Open this link …`                           | Einrichtungslink, siehe [Installation](/wichtel/operators/install/#einrichtungslink).                                     |
| `SETUP_TOKEN is no longer needed and can be removed`                    | Einrichtung ist fertig; `SETUP_TOKEN` aus der Konfiguration entfernen.                                                    |
| `No mail server (SMTP_HOST): …`                                         | Kein Mailserver eingerichtet, siehe [ohne Mailserver](/wichtel/operators/email/#ohne-mailserver).                         |
| `e-mail not sent (SMTP_HOST unset)`                                     | Eine Mail, die ohne Mailserver nur geloggt wurde.                                                                         |
| `client address unknown – does the reverse proxy send X-Forwarded-For?` | Proxy schickt kein passendes `X-Forwarded-For`, siehe [Reverse Proxy](/wichtel/operators/reverse-proxy/).                 |
| `server busy: requests turned away`                                     | Sehr viel Andrang, Aufrufe der Schichtliste wurden abgewiesen, siehe [Kapazität](/wichtel/operators/capacity/).           |
| `unexpected error`                                                      | Unerwarteter Fehler mit Fehler-ID.                                                                                        |
| `mail failed, will retry` / `mail failed for good`                      | Mailversand fehlgeschlagen, siehe oben.                                                                                   |
| `retention run`                                                         | Das automatische Aufräumen hat Konten benachrichtigt oder anonymisiert, siehe [Datenschutz](/wichtel/operators/privacy/). |

## Siehe auch

- [Probleme lösen](/wichtel/operators/troubleshooting/)
- [Konfiguration](/wichtel/operators/configuration/) – `LOG_LEVEL`, `LOG_FORMAT`

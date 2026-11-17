---
title: E-Mail
description: Mailserver für Wichtel einrichten, Zustellung prüfen und verstehen, was ohne Mailserver passiert.
---

:::tip[Auf einen Blick]

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` und `SMTP_FROM` setzen,
  dann `docker compose up -d`.
- Prüfen: _Verwaltung → Kommunikation → Zustellung_ → _Testmail an mich senden_ zeigt sofort die
  Antwort des Mailservers.
- Für die Absender-Domain **SPF, DKIM und DMARC** einrichten, sonst landen Mails im Spam.
- **Ohne Mailserver** gehen keine Mails raus, und Admins müssen Reset-Links von Hand weitergeben.

:::

## Schritt für Schritt

1. Zugangsdaten beim Mail-Anbieter besorgen und in die `.env` eintragen:

   ```bash
   SMTP_HOST=mail.example.de
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=helfen@example.de
   SMTP_PASSWORD=…
   SMTP_FROM="Festival Helfende <helfen@example.de>"
   ```

   `SMTP_SECURE=true` für Port `465` (TLS von Anfang an), `false` für Port `587`. Ohne `SMTP_USER`
   meldet sich Wichtel nicht am Mailserver an. `SMTP_FROM` muss eine Adresse sein, die der
   Mailserver als Absender erlaubt.

2. `docker compose up -d` – der Container startet mit den neuen Werten neu.
3. Als Admin _Verwaltung → Kommunikation → Zustellung_ öffnen und _Testmail an mich senden_
   klicken. Die Mail geht sofort an deine eigene Adresse, und die Seite zeigt, ob der Mailserver sie
   angenommen hat – oder seine Fehlermeldung. So fallen falsche Zugangsdaten oder ein abgelehnter
   Absender direkt auf.
4. Für die Domain von `SMTP_FROM` **SPF, DKIM und DMARC** einrichten (beim Mail- bzw. DNS-Anbieter),
   damit Mails nicht im Spam landen.

## Was Wichtel mit Mailserver tut

- **Bestätigung:** Nach der Registrierung meldet man sich erst an, wenn die Adresse bestätigt ist.
- **Keine Kontensuche:** Ist eine Adresse schon registriert, zeigt Wichtel dieselbe Meldung wie bei
  einem neuen Konto und schickt der Inhaberin stattdessen einen Link zum Zurücksetzen. So lässt sich
  nicht ausprobieren, wer ein Konto hat.
- **Warteschlange:** Mails gehen über eine Warteschlange, die alle 10 Sekunden abgearbeitet wird.
  Schlägt der Versand fehl, versucht Wichtel es mit wachsendem Abstand erneut (nach 1, 4, 9, 16 und
  25 Minuten), insgesamt sechsmal. Ein nicht erreichbarer Mailserver bricht nach etwa 15 Sekunden ab.
- **Verlauf:** Unter _Zustellung_ stehen alle Mails der letzten 30 Tage mit Empfänger, Betreff und
  Stand, durchsuchbar nach Empfänger oder Betreff. Die Mailtexte fehlen bewusst, weil sie geheime
  Links enthalten können.
- **Endgültig fehlgeschlagen:** Mails, die nach sechs Versuchen nicht zugestellt wurden, zeigt die
  _Übersicht_ der Verwaltung an („… E-Mails konnten nicht zugestellt werden“). Unter _Zustellung_
  lassen sie sich mit _Erneut senden_ wieder in die Warteschlange stellen oder _Verwerfen_.

## Ohne Mailserver

Ist `SMTP_HOST` leer:

- werden **keine Mails verschickt**. Wichtel schreibt stattdessen Empfänger und Betreff ins Log
  (`e-mail not sent (SMTP_HOST unset)`), den Text nur mit `LOG_MAIL_BODIES=true`;
- gelten **Adressen ohne Bestätigung**;
- kann **niemand sein Passwort selbst zurücksetzen**.

Die Verwaltung zeigt dann einen Hinweis, und beim Start steht eine Warnung im Log. Admins erzeugen
auf der Seite einer Person mit _Link zum Zurücksetzen erzeugen_ einen Link (eine Stunde gültig, nur
einmal verwendbar, protokolliert) und geben ihn persönlich weiter. Mit Mailserver lässt er sich dort
auch direkt _Per E-Mail senden_.

:::caution[LOG_MAIL_BODIES]
Mailtexte stehen nur in der Entwicklung im Log, weil sie geheime Links enthalten (Passwort
zurücksetzen, Bestätigung). `LOG_MAIL_BODIES=true` erzwingt es auch im Betrieb – nicht empfohlen:
Wer das Log lesen kann, kann dann fremde Konten übernehmen. Die `docker-compose.yml` reicht die
Variable nicht von selbst weiter; sie müsste im `environment` des Dienstes `app` ergänzt werden.
:::

## Häufige Fragen

### Die Testmail klappt, aber andere Mails kommen nicht an.

Spam-Ordner prüfen und SPF, DKIM und DMARC kontrollieren. Unter _Zustellung_ zeigt der Stand, ob die
Mail verschickt wurde, noch wartet oder fehlgeschlagen ist.

### Wo sehe ich, warum eine Mail fehlschlug?

Unter _Zustellung_ steht die letzte Fehlermeldung des Mailservers. Im Log erscheinen Fehlschläge als
`mail failed, will retry` bzw. `mail failed for good` mit der ID der Mail.
Siehe [Logs](/wichtel/operators/logs/#fehlgeschlagene-mails).

## Siehe auch

- [E-Mail-Vorlagen und Versand für Admins](/wichtel/organizers/mail/)
- [Konfiguration](/wichtel/operators/configuration/)
- [Probleme lösen](/wichtel/operators/troubleshooting/)

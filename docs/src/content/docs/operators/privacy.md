---
title: Datenschutz im Betrieb
description: Was Wichtel automatisch aufräumt und worum sich der Betrieb selbst kümmern muss – Proxy-Logs, Backups und Rechtstexte.
---

:::tip[Auf einen Blick]

- Wichtel **räumt alle sechs Stunden selbst auf**: inaktive Konten, IP-Adressen im Protokoll, alte
  Mailkopien.
- **Logs des Reverse Proxys** enthalten IP-Adressen – deren Aufbewahrung legst du im Proxy fest.
- **Backups** enthalten auch gelöschte Daten, bis sie rotiert sind.
- Impressum und Datenschutzerklärung pflegen Admins unter _Verwaltung → Datenschutz & Impressum_.

:::

## Was Wichtel automatisch aufräumt

Das Aufräumen läuft beim Start und danach alle sechs Stunden:

- **Inaktive Konten** – ohne Anmeldung und ohne Schicht – werden nach der eingestellten Frist
  anonymisiert (Standard **24 Monate**). Zwei Wochen vorher bekommt die Person eine Mail und kann das
  durch eine Anmeldung verhindern. Admin-Konten werden nie automatisch gelöscht.
- **IP-Adressen im Protokoll** werden nach **90 Tagen** entfernt; das Protokoll selbst bleibt.
- **Kopien verschickter Mails** werden nach **30 Tagen** gelöscht, endgültig fehlgeschlagene nach
  90 Tagen.

Die Fristen für Konten und IP-Adressen stellen Admins unter _Verwaltung → Datenschutz & Impressum → Löschfristen_ ein (`0` =
nie). Hat das Aufräumen etwas getan, steht `retention run` im Log.

Wichtels eigene Logs enthalten keine IP-Adressen und keine Suchparameter. Ohne Mailserver stehen
aber Empfänger und Betreff nicht verschickter Mails darin – siehe [Logs](/wichtel/operators/logs/).

## Worum du dich kümmern musst

### Logs des Reverse Proxys

Die Zugriffslogs des Proxys enthalten IP-Adressen. Wie lange sie aufbewahrt werden, legst du dort fest.
Bei Caddy schreibt eine Site nur mit einer `log`-Anweisung ein Zugriffslog, zum Beispiel:

```
helfen.example.de {
	log {
		output file /var/log/caddy/helfen.log {
			roll_keep_for 14d
		}
	}
	# … wie unter Reverse Proxy
}
```

### Logs von Docker

Docker hebt Container-Logs standardmäßig unbegrenzt auf. Begrenzen lässt sich das z. B. in einer
`docker-compose.override.yml`:

```yaml
services:
  app:
    logging:
      driver: json-file
      options:
        max-size: 10m
        max-file: '5'
```

### Backups

Sicherungen enthalten auch Daten, die in Wichtel inzwischen gelöscht oder anonymisiert wurden – bis
die Sicherung selbst rotiert ist. Lege fest, wie lange ihr Sicherungen aufbewahrt, und nennt diese
Dauer in der Datenschutzerklärung. Siehe [Updates und Backups](/wichtel/operators/updates-backups/#sichern).

### Impressum und Datenschutzerklärung

Admins pflegen beides unter _Verwaltung → Datenschutz & Impressum_. Die Vorlage für die
Datenschutzerklärung markiert in eckigen Klammern die Stellen, die vom Betrieb abhängen und die nur
ihr kennt: Aufbewahrung der Webserver-Logs, Hosting- und Mail-Anbieter (Auftragsverarbeitung) und die
zuständige Aufsichtsbehörde. Als Betrieb liefert ihr dafür die Angaben.
Ausführlich: [Datenschutz für Admins](/wichtel/organizers/privacy/).

## Siehe auch

- [Datenschutz für Admins](/wichtel/organizers/privacy/)
- [Reverse Proxy und HTTPS](/wichtel/operators/reverse-proxy/)

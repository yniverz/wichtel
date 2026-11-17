---
title: E-Mails und Zustellung
description: Die Texte der automatischen E-Mails anpassen, Platzhalter nutzen und unter Zustellung prüfen, ob alle Mails ankommen.
---

:::tip[Auf einen Blick]

- **Texte anpassen:** _Verwaltung → Kommunikation → E-Mail-Vorlagen_ → Vorlage aufklappen → Deutsch
  und Englisch getrennt bearbeiten.
- **Platzhalter** wie `{name}` oder `{shift}` setzt Wichtel beim Versand ein. Welche eine Vorlage
  kennt, steht beim Aufklappen unter „Platzhalter in dieser Vorlage“.
- **Zurück zum Original:** _Standard wiederherstellen_.
- **Kommt alles an?** _Verwaltung → Kommunikation → Zustellung_: _Testmail an mich senden_,
  hängende Mails _Erneut senden_ oder _Verwerfen_, Verlauf der letzten 30 Tage.

:::

## Vorlagen anpassen

1. Öffne _E-Mail-Vorlagen_.
2. Klapp die Vorlage auf, z. B. _Erinnerung_. Du siehst die deutsche und die englische Fassung
   nebeneinander.
3. Ändere _Betreff_ und _Text_ und speichere die Fassung.
4. Angepasste Vorlagen tragen das Abzeichen _angepasst_. Mit _Standard wiederherstellen_ gilt wieder
   der mitgelieferte Text.

Jede Person bekommt die Fassung in ihrer eigenen Sprache. Passt du nur die deutsche Fassung an,
bekommen englischsprachige Helfende weiter den englischen Standardtext – denk an beide.

Wichtel verschickt die Mails als einfachen Text; Links werden klickbar und in der Hauptfarbe
dargestellt. Leerzeilen trennen Absätze.

## Platzhalter

Diese Platzhalter gibt es in allen Vorlagen zu Schichten:

| Platzhalter  | Wird ersetzt durch                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `{name}`     | Vorname der empfangenden Person                                                                       |
| `{festival}` | Name des Festivals aus den [Einstellungen](/wichtel/organizers/settings/)                             |
| `{shift}`    | Titel der Schicht                                                                                     |
| `{date}`     | Tag der Schicht, ausgeschrieben                                                                       |
| `{time}`     | Uhrzeit von–bis                                                                                       |
| `{location}` | Ort und Treffpunkt mit Kartenlink, jeweils in einer eigenen Zeile (leer, wenn nichts eingetragen ist) |
| `{link}`     | Link in die App                                                                                       |

Einige Vorlagen haben zusätzliche Platzhalter. Die Seite zeigt beim Aufklappen unter „Platzhalter in
dieser Vorlage“ genau die, die diese Vorlage kennt:

| Vorlage                                 | Zusätzlich                                                 |
| --------------------------------------- | ---------------------------------------------------------- |
| _Platz von der Gruppe reserviert_       | `{person}` (wer reserviert hat), `{until}` (bis wann)      |
| _Schicht angeboten (direkt)_            | `{person}`                                                 |
| _Tausch vorgeschlagen_                  | `{person}`, `{given}`                                      |
| _Übergabe wartet auf Leitung_           | `{person}`                                                 |
| _Schicht übernommen_                    | `{person}`                                                 |
| _Übergabe abgelehnt_                    | `{person}`                                                 |
| _Dringend-Aufruf_                       | `{position}`, `{free}` (freie Plätze), `{bonus}`, `{note}` |
| _Konto wird wegen Inaktivität gelöscht_ | `{months}`; `{date}` ist hier der Tag der Löschung         |

Die beiden Vorlagen zu Konten (_Konto wird wegen Inaktivität gelöscht_ und _E-Mail-Adresse von der
Leitung geändert (an die alte Adresse)_) betreffen keine Schicht: Sie kennen nur `{name}`,
`{festival}` und `{link}` (die Löschungs-Vorlage zusätzlich `{months}` und `{date}`). `{shift}`,
`{time}` und `{location}` würden dort unverändert als Text in der Mail stehen. Dasselbe passiert mit
einem falsch geschriebenen Platzhalter. Speicherst du einen Text mit einem Platzhalter, den die
Vorlage nicht kennt, speichert Wichtel ihn trotzdem und weist darauf hin („Diese Vorlage kennt …
nicht“). Trag dich nach Änderungen am besten zur Probe selbst in eine Schicht ein und lies die
Mail.

### Alle Vorlagen

_Buchung bestätigt_, _Anfrage eingegangen_, _Anfrage bestätigt_, _Anfrage abgelehnt_, _Von der
Leitung eingetragen_, _Von der Leitung ausgetragen_, _Schicht geändert_, _Schicht abgesagt_,
_Erinnerung_, _Von der Warteliste nachgerückt_, _Platz von der Gruppe reserviert_, _Reservierung
abgelaufen_, _Schicht angeboten (direkt)_, _Tausch vorgeschlagen_, _Übergabe wartet auf Leitung_,
_Schicht übernommen_, _Übergabe abgelehnt_, _Dringend-Aufruf_, _Konto wird wegen Inaktivität
gelöscht_, _E-Mail-Adresse von der Leitung geändert (an die alte Adresse)_.

Nicht anpassbar sind die Mails zum Bestätigen der Adresse und zum Zurücksetzen des Passworts. Mails
zu [Neuigkeiten](/wichtel/leads/news/) enthalten den Text der Neuigkeit.

Die Vorlagen gelten für die ganze Installation, also für alle Jahrgänge.

## Zustellung prüfen

Unter _Zustellung_ (Seitentitel _E-Mail-Zustellung_) siehst du, ob Mails rausgehen.

### Testmail an mich senden

Schickt sofort eine kurze Mail an deine eigene Adresse und zeigt die Antwort des Mailservers. So
merkst du direkt, ob der Versand funktioniert. Kommt die Mail nicht an, obwohl der Mailserver sie
angenommen hat, schau im Spam-Ordner nach.

### Hängende und gescheiterte Mails

Wichtel verschickt Mails über eine Warteschlange. Klappt der Versand nicht, versucht Wichtel es
sechsmal mit wachsendem Abstand. Die Liste zeigt Mails mit _Neuer Versuch geplant_ und solche, die
_aufgegeben_ wurden, jeweils mit Fehlermeldung.

- _Erneut senden_ – die ausgewählten Mails kommen sofort wieder in die Warteschlange, die Versuche
  beginnen neu. Sinnvoll, nachdem der Fehler (z. B. falsches Passwort des Mailservers) behoben ist.
- _Verwerfen_ – die ausgewählten Mails werden gelöscht und nie verschickt.

### Verlauf

Darunter steht der _Verlauf_ aller Mails der letzten 30 Tage mit Empfänger, Betreff und Stand
(_verschickt_, _wartet_, _neuer Versuch geplant_, _gescheitert_), durchsuchbar nach Empfänger oder
Betreff. So beantwortest du die Frage „Habe ich eine Mail bekommen?“. Die Texte selbst zeigt Wichtel
nicht, weil sie geheime Links enthalten können.

Verschickte Mails löscht Wichtel nach 30 Tagen, endgültig gescheiterte nach 90 Tagen.

## Ohne Mailserver

Ist auf dem Server kein Mailserver eingerichtet, zeigt die Seite _Zustellung_ einen Hinweis.
Dann gilt:

- Wichtel verschickt keine E-Mails – auch keine Erinnerungen oder Benachrichtigungen.
- E-Mail-Adressen gelten ohne Bestätigung.
- Niemand kann sein Passwort selbst zurücksetzen. Admins erzeugen auf der Seite der Person einen Link
  zum Zurücksetzen und geben ihn persönlich weiter (siehe [Personen](/wichtel/organizers/people/)).

Den Mailserver richtet ein, wer den Server betreibt: [E-Mail einrichten](/wichtel/operators/email/).

## Siehe auch

- [Buchungsregeln](/wichtel/organizers/booking-rules/) – wann Erinnerungen verschickt werden
- [E-Mails (für Helfende)](/wichtel/helpers/emails/)
- [E-Mail einrichten (Betrieb)](/wichtel/operators/email/)

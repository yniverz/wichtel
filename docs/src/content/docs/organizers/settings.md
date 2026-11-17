---
title: Einstellungen
description: Alle Karten und Felder der Seite Einstellungen der Reihe nach – was sie bewirken und welche Werte voreingestellt sind.
---

:::tip[Auf einen Blick]

- **Wo:** _Verwaltung → System → Einstellungen_. Nur Admins sehen die Seite.
- Die Einstellungen gelten für die ganze Installation, also für alle Jahrgänge.
- Erst _Speichern_ (unten auf der Seite) übernimmt Änderungen – für alle Karten auf einmal.
- Jede Änderung steht im [Protokoll](/wichtel/organizers/audit/).

:::

Die Seite besteht aus Karten. Hier sind sie in der Reihenfolge, in der sie auf der Seite stehen.

## Erscheinungsbild

| Feld                                                  | Standard            | Wirkung                                                          |
| ----------------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| _Name des Festivals_                                  | aus der Einrichtung | Überall in der App, im Browser-Tab und in E-Mails (`{festival}`) |
| _Untertitel (Deutsch)_, _Untertitel (Englisch)_       | leer                | Unter dem Namen auf der Startseite und neben der Anmeldung       |
| _Hauptfarbe_                                          | `#c03a1c`           | Knöpfe, Markierungen, Links                                      |
| _Akzentfarbe_                                         | `#f4c430`           | Hervorhebungen wie Punkte-Abzeichen                              |
| _Logo_, _Hintergrundbild_, _Browser-Symbol (Favicon)_ | keins               | Bilder, je höchstens 5 MB; _Bild entfernen_ löscht eins          |

Rechts zeigt die _Vorschau_ deine Änderungen sofort. Alles dazu: [Erscheinungsbild](/wichtel/organizers/appearance/).

## Buchung

| Feld                                             | Standard | Wirkung                                                                                           |
| ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------- |
| _Frist zum Austragen (Stunden vor Beginn)_       | 48       | Bis dahin können sich Helfende selbst austragen. Bereiche und Schichten können sie überschreiben. |
| _Mindestpause zwischen zwei Schichten (Minuten)_ | 0        | Abstand, den zwei Schichten derselben Person haben müssen                                         |
| _Erinnerungs-Mail (Stunden vor Beginn)_          | 24       | Wann die Erinnerung verschickt wird; 0 = keine Erinnerungen                                       |
| _Warteliste für volle Positionen anbieten_       | an       | Volle Positionen bieten eine Warteliste mit automatischem Nachrücken                              |

Details: [Buchungsregeln](/wichtel/organizers/booking-rules/).

## Tausch & Gruppen

| Feld                                                                           | Standard | Wirkung                                                                     |
| ------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------- |
| _Schichtbörse und direkten Tausch erlauben_                                    | an       | Helfende können gebuchte Schichten abgeben oder tauschen                    |
| _Übergaben nach Ablauf der Austragungsfrist von der Leitung bestätigen lassen_ | aus      | Späte Übergaben brauchen die Leitung; Bereiche können das überschreiben     |
| _Gruppen erlauben_                                                             | an       | Helfende können Gruppen bilden und gemeinsam buchen                         |
| _Höchstens Personen pro Gruppe_                                                | 8        | 2 bis 50                                                                    |
| _Reservierung für Gruppenmitglieder (Stunden)_                                 | 24       | So lange hält Wichtel einen reservierten Platz, höchstens bis Schichtbeginn |

Bei Positionen _auf Anfrage_ muss die Leitung Übergaben immer bestätigen. Details:
[Buchungsregeln](/wichtel/organizers/booking-rules/).

## KI-Assistenten (MCP)

Wer das Recht _KI-Assistent verbinden_ hat, kann z. B. Claude mit Wichtel verbinden. Der Assistent hat
nie mehr Rechte als die Person selbst.

| Feld                                              | Standard                                               | Wirkung                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| _Was Assistenten ändern dürfen_                   | _Schichten planen_, _Besetzung_, _Bereiche und Orte_   | Welche Gruppen von Änderungen erlaubt sind; dazu gibt es _Neuigkeiten & Rundmails_ und _Punkte_. Lesen geht immer. |
| _Personenbezogene Daten für Assistenten_          | _Nur Namen, keine Telefonnummern oder E-Mail-Adressen_ | Alternativ Namen und Kontaktdaten oder Pseudonyme                                                                  |
| _Erlaubte Rücksprung-Adressen für KI-Assistenten_ | `claude.ai`, `claude.com`                              | Wohin ein Assistent nach der Zustimmung zurückleiten darf                                                          |

Rollen, Einstellungen und Konten können Assistenten grundsätzlich nicht ändern. Details:
[KI-Assistenten](/wichtel/organizers/ai/).

## Punkte

| Feld                                                     | Standard     | Wirkung                                                      |
| -------------------------------------------------------- | ------------ | ------------------------------------------------------------ |
| _Punkte pro Schicht_                                     | 1            | Grundregel, Bereiche und Positionen können sie überschreiben |
| _Punkte pro Stunde_                                      | 0            | Grundregel, Bereiche können sie überschreiben                |
| _Nachtbonus (Punkte)_                                    | 0 (aus)      | Extrapunkte für Schichten im Nachtfenster                    |
| _Nacht von_, _Nacht bis_                                 | 00:00, 06:00 | Das Nachtfenster                                             |
| _Kurzfrist-Bonus (Punkte)_                               | 0 (aus)      | Extrapunkte für kurzfristige Buchungen                       |
| _Kurzfristig = gebucht weniger als … Stunden vor Beginn_ | 24           | Was als kurzfristig gilt                                     |

Details und Rechenbeispiele: [Punkte-Regeln](/wichtel/organizers/points/).

## Karten

| Feld                      | Standard                                         | Wirkung                                                                                              |
| ------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| _Kartenserver (Tile-URL)_ | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Woher eingebettete Karten kommen. Muss mit `https://` beginnen und `{z}`, `{x}` und `{y}` enthalten. |
| _Quellenangabe der Karte_ | `© OpenStreetMap contributors`                   | Steht auf der Karte                                                                                  |

Eingebettete Karten lädt Wichtel erst, wenn jemand auf „Karte laden“ tippt. Geländeplan und
Navigations-Links funktionieren ohne externen Dienst. Mehr dazu:
[Orte & Geländeplan](/wichtel/organizers/places/).

## Allgemein

| Feld                                       | Standard            | Wirkung                                                                                      |
| ------------------------------------------ | ------------------- | -------------------------------------------------------------------------------------------- |
| _Registrierung für neue Helfende geöffnet_ | an                  | Ohne Haken kann sich niemand neu registrieren; bestehende Konten melden sich weiter an.      |
| _Standardsprache_                          | aus der Einrichtung | Sprache für Besucher, deren Browser weder Deutsch noch Englisch bevorzugt                    |
| _Zeitzone_                                 | `Europe/Berlin`     | Alle Zeiten in App und E-Mails, z. B. `Europe/Vienna`                                        |
| _Kontakt-E-Mail_                           | leer                | Link _Kontakt_ in der Fußzeile; auch für das Impressum, wenn dort keine eigene Adresse steht |

Der Link _Impressum und Datenschutzerklärung_ führt zu _Datenschutz & Impressum_, wo du beides
pflegst: [Datenschutz](/wichtel/organizers/privacy/).

:::caution
Ändere die _Zeitzone_ nicht mehr, wenn schon Schichten geplant sind. Gespeicherte Zeitpunkte bleiben
gleich, werden dann aber in der neuen Zeitzone angezeigt – beim Wechsel von `Europe/Berlin` auf
`Europe/London` wird z. B. aus 18:00 Uhr 17:00 Uhr.
:::

## Hilfe

| Feld                | Standard | Wirkung                                                      |
| ------------------- | -------- | ------------------------------------------------------------ |
| _Eigene Hilfeseite_ | leer     | Adresse eurer eigenen FAQ für Helfende; leer = Wichtel-Hilfe |

Details: [Hilfe-Links und eigene FAQ](/wichtel/organizers/help-link/).

## Betrieb

| Feld                                      | Standard | Wirkung                                                                                                                                           |
| ----------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| _Fehler per E-Mail an alle Admins melden_ | an       | Bei unerwarteten Serverfehlern bekommen alle Admins eine Mail mit Fehler-ID und technischen Details; derselbe Fehler höchstens einmal pro Stunde. |

Darunter führt ein Link zur [E-Mail-Zustellung](/wichtel/organizers/mail/).

## Siehe auch

- [Erste Schritte](/wichtel/organizers/first-steps/)
- [Buchungsregeln](/wichtel/organizers/booking-rules/)
- [Erscheinungsbild](/wichtel/organizers/appearance/)

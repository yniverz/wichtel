---
title: Rechte
description: Jedes Recht, das eine Rolle enthalten kann – was es erlaubt, wo es in der App wirkt und was nur Admins dürfen.
---

:::tip[Auf einen Blick]

- **Rechte** sind einzelne Fähigkeiten in der Verwaltung. Vergeben werden sie nie einzeln, sondern
  gebündelt als **Rolle**.
- Eine Rolle bekommt man **für einen Jahrgang** und **für einen Geltungsbereich**: den gesamten
  Jahrgang oder einen Bereich samt Unterbereichen.
- **Niemand kann mehr Rechte vergeben**, als er dort selbst hat.
- Einstellungen, Jahrgänge, Rollen-Definitionen und Admins sind **kein Recht**, sondern Admins
  vorbehalten.

:::

Rollen richtest du unter _Verwaltung_ → _Rollen_ ein und vergibst sie unter _Personen_ → Person →
_Rolle vergeben_. Wie das geht, steht unter [Rollen](/wichtel/organizers/roles/). Die Bezeichnungen
unten sind die aus der App, der Schlüssel in `Code` ist der interne Name (z. B. im Protokoll oder für
Entwickler\*innen).

## Alle Rechte

Die Spalte „Geltungsbereich“ sagt, ob das Recht in einem Bereich genügt oder ob die Rolle für den
_gesamten Jahrgang_ gelten muss.

### Struktur & Überblick

| Recht                                                          | Schlüssel        | Was es erlaubt                                                                                                                                                                                    | Wo es wirkt                                                       | Geltungsbereich                                                     |
| -------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| _Bereiche anlegen und bearbeiten_                              | `area.manage`    | Unterbereiche anlegen, Bereiche umbenennen, verschieben und löschen, ihre Frist zum Austragen und Punkte-Regeln festlegen.                                                                        | _Bereiche_                                                        | Bereich; neue Bereiche auf oberster Ebene nur mit gesamtem Jahrgang |
| _Rollen vergeben (nur mit eigenen Rechten)_                    | `role.assign`    | Personen Rollen geben und wieder entziehen – nur Rollen, deren Rechte man dort selbst alle hat. Öffnet außerdem die Personenliste.                                                               | _Personen_ → Person → _Rolle vergeben_                            | Bereich                                                             |
| _Besetzungs-Dashboard sehen_                                   | `dashboard.view` | Gedacht für die Besetzungsübersicht. Wird derzeit nicht gesondert geprüft: Die Besetzung auf der _Übersicht_ sieht jede Person mit einem der Rechte aus der Gruppe _Schichten_, für deren Bereiche. | _Übersicht_                                                       | –                                                                   |
| _Protokoll einsehen_                                           | `audit.view`     | Das Protokoll des gewählten Jahrgangs lesen. Admins sehen alle Einträge.                                                                                                                         | _Protokoll_                                                       | gesamter Jahrgang                                                   |
| _KI-Assistent verbinden (z. B. Claude), mit den eigenen Rechten_ | `mcp.use`        | Einen KI-Assistenten verbinden, der mit genau den eigenen Rechten handelt. Zählt nur im aktuellen Jahrgang.                                                                                     | _Profil_ → _Mit Claude verbinden_                                 | irgendwo im aktuellen Jahrgang                                      |

### Schichten

| Recht                                                       | Schlüssel             | Was es erlaubt                                                                                                                                                         | Wo es wirkt                                                         | Geltungsbereich                                                                 |
| ----------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| _Schichten anlegen und bearbeiten_                          | `shift.manage`        | Schichten und Serien anlegen, bearbeiten, duplizieren und löschen, Positionen mit Plätzen, Buchungsmodus, Punkten und Qualifikationen festlegen.                      | _Schichten_                                                         | Bereich                                                                         |
|                                                             |                       | Mit Geltungsbereich gesamter Jahrgang zusätzlich: Buchungswellen und Orte verwalten, den Geländeplan hochladen.                                                        | _Buchungswellen_, _Orte & Geländeplan_                              | gesamter Jahrgang                                                               |
| _Helfende ein- und austragen, Anfragen bestätigen_          | `assignment.manage`   | Personen eintragen und austragen, Anfragen bestätigen oder ablehnen, Übergaben und Tausch entscheiden, einen Dringend-Aufruf senden.                                  | Schicht → _Besetzung_, _Anfragen_, _Dringend aufrufen_              | Bereich (bei Tausch für beide Schichten)                                        |
| _Regeln übergehen (Überschneidung, Fristen, Anforderungen)_ | `assignment.override` | Beim Eintragen _Trotzdem eintragen_, obwohl die Position voll ist, die Person zur selben Zeit eine andere Schicht hat, die Schicht schon begonnen hat oder eine Pflicht-Qualifikation fehlt. Nur zusammen mit `assignment.manage` sinnvoll. | Schicht → _Besetzung_ → _Person eintragen_                          | Bereich                                                                         |
| _Anwesenheit bestätigen (Check-in)_                         | `attendance.confirm`  | Anwesenheit in der Besetzung setzen (_da_, _nicht erschienen_) und Personen an _Ausgabe & Check-in_ einchecken – ab 0 Uhr am Tag der Schicht.                         | Schicht → _Anwesenheit_, _Ausgabe & Check-in_                       | Bereich der jeweiligen Schicht                                                  |

Jedes der drei Rechte `shift.manage`, `assignment.manage` und `attendance.confirm` öffnet die Seite
_Schichten_ für die Bereiche, in denen man es hat – auch interne Schichten.

### Personen

| Recht                                           | Schlüssel                      | Was es erlaubt                                                                                                                                                                          | Wo es wirkt                                                         | Geltungsbereich                                                               |
| ----------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| _Kontaktdaten der Helfenden sehen_              | `helper.contact.view`          | Die Handynummer der Eingetragenen in der Besetzung und in der gedruckten Helferliste sehen, die E-Mail-Adresse an _Ausgabe & Check-in_. Öffnet die Personenliste; E-Mail, Telefon und Angaben dort nur mit gesamtem Jahrgang. | Schicht → _Besetzung_, Druckansichten, _Personen_, _Ausgabe & Check-in_ | Bereich der Schicht bzw. gesamter Jahrgang; nur im aktuellen Jahrgang         |
| _Qualifikationen prüfen und vergeben_           | `qualification.review`         | Nachweise bestätigen oder ablehnen, Qualifikationen direkt vergeben und entziehen.                                                                                                     | _Qualifikationen_ → _Zu prüfen_, _Personen_ → Person                | irgendwo im Jahrgang (Qualifikationen gelten für die ganze Instanz)          |
| _Hochgeladene Nachweise ansehen_                | `qualification.documents.view` | Hochgeladene Dokumente öffnen. Ohne dieses Recht sieht man nur, dass es einen Nachweis gibt.                                                                                          | _Qualifikationen_ → _Nachweis ansehen_                              | irgendwo im Jahrgang; nur im aktuellen Jahrgang                               |
| _Neuigkeiten veröffentlichen (auch per E-Mail)_ | `mail.send`                    | Neuigkeiten an alle mit Schichten in einem Bereich oder an alle in einer Schicht schreiben, auf Wunsch auch per E-Mail. Mit gesamtem Jahrgang auch an alle Helfenden, die Crew oder eine Rolle. | _Neuigkeiten_, Schicht → _Nachricht an alle_                        | Bereich; Helfende/Crew/Rolle nur mit gesamtem Jahrgang                        |

### Punkte & Goodies

| Recht                     | Schlüssel       | Was es erlaubt                                                                                                    | Wo es wirkt                                    | Geltungsbereich      |
| ------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------- |
| _Goodies verwalten_       | `goodie.manage` | Goodies anlegen und bearbeiten (Preis, Varianten, Kontingent, Pflicht-Goodie …) und sehen, wer was bekommen hat. | _Goodies_                                      | gesamter Jahrgang    |
| _Goodies ausgeben_        | `goodie.issue`  | Ausgewählte Goodies ausgeben, Goodies direkt ausgeben, Erstattungen als erledigt markieren.                       | _Ausgabe & Check-in_                           | irgendwo im Jahrgang |
| _Punkte manuell anpassen_ | `points.adjust` | Punkte mit Begründung gutschreiben oder abziehen.                                                                 | _Ausgabe & Check-in_ → _Punkte korrigieren_    | gesamter Jahrgang    |

## Geltungsbereich und Vererbung

- Eine Rolle gilt entweder für den **gesamten Jahrgang** (_Gilt für_ → _Gesamten Jahrgang_) oder für
  **einen Bereich und alle seine Unterbereiche**. Wer eine Rolle auf „AG Infrastruktur“ hat, hat die
  Rechte auch in „AG Infrastruktur → Aufbau“.
- Eine Person kann mehrere Rollen haben, auch auf verschiedenen Bereichen. Die Rechte addieren sich.
- Manche Seiten brauchen das Recht für den **gesamten Jahrgang**, weil sie nicht zu einem Bereich
  gehören: _Protokoll_, _Goodies_, _Buchungswellen_, _Orte & Geländeplan_, _Punkte korrigieren_,
  Neuigkeiten an alle Helfenden.
- **Niemand kann mehr Rechte vergeben, als er hat:** Wer eine Rolle vergeben oder entziehen will,
  braucht dort `role.assign` _und_ jedes Recht der Rolle. Sonst erscheint „Du kannst nur Rollen
  vergeben, deren Rechte du dort selbst hast.“

## Rollen gelten pro Jahrgang

- Rollenvergaben gehören zu einem Jahrgang. Eine Rolle wirkt nur auf Bereiche, Schichten und Goodies
  dieses Jahrgangs – auch wenn sie für den gesamten Jahrgang vergeben ist.
- Rollen in einem **archivierten** Jahrgang geben keine Rechte mehr.
- Kontaktdaten (`helper.contact.view`) und Nachweise (`qualification.documents.view`) zählen **nur im
  aktuellen Jahrgang**. Konten gelten für die ganze Instanz; eine alte Rolle soll keine aktuellen
  persönlichen Daten öffnen.
- Beim [Kopieren eines Jahrgangs](/wichtel/organizers/editions/) lassen sich die Rollenvergaben
  mitnehmen (_Rollenvergaben (Leitungen)_).
- Die _Rollen_ selbst (Name und enthaltene Rechte) gelten für alle Jahrgänge.

## Nur für Admins

Instanzweite Verwaltung ist kein Recht, das in einer Rolle stecken kann. Sie ist Konten mit dem
Häkchen _Instanz-Admin_ vorbehalten. Admins haben außerdem überall alle Rechte, in jedem Jahrgang.

Nur Admins können:

- _Einstellungen_: Erscheinungsbild, Buchungsregeln (Frist zum Austragen, Mindestpause, Warteliste),
  Grundregel für Punkte, Tausch & Gruppen, Erinnerungen, Karten, KI-Assistenten, Betrieb
- _Jahrgänge_ anlegen, kopieren, zum aktuellen machen, archivieren
- _Rollen_ anlegen, ändern und löschen
- andere Personen _Zum Admin machen_ oder ihnen die Adminrechte entziehen
- _Profilfelder_ und die eingerichteten _Qualifikationen_ verwalten
- _E-Mail-Vorlagen_, _Zustellung_ und _Datenschutz & Impressum_
- Konten bearbeiten (Name, E-Mail, Telefon, Sprache, Angaben), eine Adresse _Als bestätigt markieren_,
  einen _Link zum Zurücksetzen erzeugen_, Datenauskunft herunterladen und Konten löschen
- Neuigkeiten an _Alle Konten_ und _Öffentlich (auch ohne Konto)_ veröffentlichen
- das Protokoll aller Jahrgänge sehen

Mehr dazu: [Personen](/wichtel/organizers/people/), [Einstellungen](/wichtel/organizers/settings/)

## Vorgegebene Rollen

Bei der Einrichtung legt Wichtel diese Rollen als Startpunkt an. Du kannst sie frei ändern, löschen
oder neue anlegen.

| Rolle               | Rechte                                                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gesamtleitung**   | alle außer `mcp.use`                                                                                                                                                                                                                        |
| **Bereichsleitung** | `area.manage`, `role.assign`, `dashboard.view`, `shift.manage`, `assignment.manage`, `assignment.override`, `attendance.confirm`, `qualification.review`, `helper.contact.view`, `mail.send`                                                |
| **Schichtleitung**  | `attendance.confirm`, `helper.contact.view`, `dashboard.view`                                                                                                                                                                               |
| **Helferanmeldung** | `dashboard.view`, `assignment.manage`, `attendance.confirm`, `qualification.review`, `helper.contact.view`, `goodie.issue`                                                                                                                  |
| **Goodie-Ausgabe**  | `goodie.issue`                                                                                                                                                                                                                              |

Den KI-Zugang (`mcp.use`) hat zunächst keine Rolle – ihn bekommen nur Admins, bis ihr ihn einer Rolle
gezielt hinzufügt.

## Siehe auch

- [Rollen einrichten und vergeben](/wichtel/organizers/roles/)
- [Die Verwaltung](/wichtel/leads/admin-area/)
- [Glossar: Rolle](/wichtel/reference/glossary/#rolle)

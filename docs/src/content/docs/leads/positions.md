---
title: Positionen
description: Positionen innerhalb einer Schicht – Plätze, Buchung direkt oder auf Anfrage, Punkte und Qualifikationen.
---

:::tip[Auf einen Blick]

- Eine **Position** ist ein Platz-Typ in einer Schicht, z. B. „Helfer\*in“ (8 Plätze) und
  „Schichtleitung“ (1 Platz).
- **Bearbeiten:** im Formular der Schicht unter _Positionen_; _+ Position hinzufügen_ für eine weitere.
- **_Buchung_:** _direkt_ = Helfende tragen sich selbst ein; _auf Anfrage_ = du bestätigst jede
  Buchung.
- **_Qualifikationen_:** _Pflicht_ sperrt alle ohne Nachweis; _gern gesehen_ ist nur ein Hinweis.
- **_Punkte_:** leer lassen („auto“) für die Punkte-Regeln des Bereichs.

:::

## Die Felder einer Position

| Feld              | Bedeutung                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| _Bezeichnung_     | Name der Position, z. B. „Helfer\*in“ oder „Kasse“. Pflicht.                                                                            |
| _Englisch_        | Englischer Name, optional. Fehlt er, sehen alle den deutschen.                                                                          |
| _Plätze_          | Wie viele Personen gebraucht werden, 1 bis 500.                                                                                         |
| _Buchung_         | _direkt_ oder _auf Anfrage_ (siehe unten).                                                                                              |
| _Punkte_          | Punkte pro Schicht für diese Position. Leer („auto“) = Punkte nach Bereich bzw. Instanz.                                                |
| _Qualifikationen_ | Für jede eingerichtete Qualifikation: _—_ (egal), _Pflicht_ oder _gern gesehen_. Die Zeile erscheint nur, wenn es Qualifikationen gibt. |

Eine neue Position heißt anfangs „Helfer\*in“, hat 4 Plätze und die Buchung _direkt_. Eine Schicht
braucht mindestens eine und höchstens 20 Positionen.

## Schritt für Schritt

1. Öffne die Schicht (oder _Neue Schicht_ bzw. _Serie anlegen_).
2. Im Abschnitt _Positionen_ füllst du die Felder jeder Position aus.
3. Mit _+ Position hinzufügen_ kommt eine weitere dazu, mit ✕ entfernst du eine.
4. Speichere die Schicht.

## Buchung: direkt oder auf Anfrage

- **_direkt_** – Helfende sehen _Eintragen_ und sind sofort eingetragen, solange Plätze frei sind.
- **_auf Anfrage_** – Helfende sehen _Anfragen_ und den Hinweis „Die Leitung bestätigt deine
  Anfrage.“ Die Anfrage landet bei dir unter [_Anfragen_](/wichtel/leads/requests/) und auf der
  Seite der Schicht. Erst wenn du bestätigst, ist der Platz vergeben.

Nimm _auf Anfrage_ für Positionen, bei denen du wissen willst, wer kommt – z. B. Schichtleitung, Kasse
oder Awareness.

## Qualifikationen

- **_Pflicht_** – Wer die Qualifikation nicht bestätigt (und nicht abgelaufen) hat, kann sich nicht
  eintragen. Helfende sehen „Benötigt: …“ und können den Nachweis direkt einreichen. Auch ein
  [Dringend-Aufruf](/wichtel/leads/urgent/) geht nur an Personen mit der Qualifikation.
- **_gern gesehen_** – Helfende sehen „Gern gesehen: …“, können sich aber ohne Nachweis eintragen.

Welche Qualifikationen es gibt, legen die Admins fest. Wie du Nachweise prüfst, steht unter
[Qualifikationen prüfen](/wichtel/leads/qualifications/).

## Punkte

Lässt du _Punkte_ leer, gelten die Punkte-Regeln des Bereichs bzw. der Instanz. Trägst du eine Zahl
ein, ersetzt sie die Punkte pro Schicht für genau diese Position – z. B. mehr Punkte für die
Schichtleitung. Gibt es auf deinem Festival zusätzlich Punkte pro Stunde, Nacht- oder
Kurzfrist-Bonus, kommen diese weiterhin dazu.

Punkte gibt es erst, wenn die Person als _da_ abgehakt ist (siehe
[Besetzung](/wichtel/leads/staffing/)).

## Häufige Fragen

### Kann ich eine Position nur für bestimmte Leute sichtbar machen?

Nein, die Sichtbarkeit gilt für die ganze Schicht (_Sichtbar für_). Für einzelne Positionen nutzt du
_auf Anfrage_ oder eine Qualifikation als _Pflicht_.

### Warum kann ich eine Position nicht entfernen?

Positionen mit Buchungen oder Anfragen lassen sich nicht entfernen; dann steht dort „{Anzahl}
gebucht“ statt ✕. Die einzige Position einer Schicht lässt sich auch nicht entfernen.

### Ich habe die Plätze verringert und bekomme einen Fehler

„Die Platzzahl darf nicht unter die Zahl der Buchungen sinken.“ Trag zuerst Personen aus.

## Sonderfälle

<details>
<summary>Kann ich selbst jemanden auf eine Position „auf Anfrage“ eintragen?</summary>

Ja. Wenn du jemanden über _+ Person eintragen_ einträgst, ist die Person sofort gebucht, auch bei
_auf Anfrage_.

</details>

<details>
<summary>Was ändert „auf Anfrage“ an Warteliste, Gruppen und Übergaben?</summary>

- Rückt jemand von der Warteliste nach, wird daraus eine Anfrage, keine Buchung.
- Gruppen können sich dort nicht gemeinsam eintragen; jede Person fragt einzeln an.
- Will jemand seinen Platz an eine andere Person abgeben, musst du die Übergabe immer bestätigen.

</details>

## Siehe auch

- [Schichten anlegen und bearbeiten](/wichtel/leads/shifts/)
- [Punkte-Regeln (für Admins)](/wichtel/organizers/points/)
- [Qualifikationen einrichten (für Admins)](/wichtel/organizers/qualifications/)

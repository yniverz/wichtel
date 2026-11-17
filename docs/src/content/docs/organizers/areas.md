---
title: Bereiche
description: Die Struktur des Festivals als Baum anlegen, verschachteln, verschieben und löschen – und welche Regeln Bereiche überschreiben.
---

:::tip[Auf einen Blick]

- **Anlegen:** _Bereiche_ → _Neuer Bereich_; einen Unterbereich mit _+ Unterbereich_ in der Liste.
- **Beliebig tief:** z. B. AG → Bereich → Team. Was auf einem Bereich gilt, gilt auch für alle
  Unterbereiche – Rollen, Fristen, Punkte.
- **Verschieben:** Bereich bearbeiten → _Liegt in_ ändern.
- **Löschen** geht nur ohne Unterbereiche und ohne Schichten.
- Bereiche gehören zu einem Jahrgang und werden beim Kopieren immer übernommen.

:::

## Schritt für Schritt

### Einen Bereich anlegen

1. Öffne _Bereiche_ und tippe auf _Neuer Bereich_ – oder in der Liste beim übergeordneten Bereich auf
   _+ Unterbereich_.
2. Wähle unter _Liegt in_, wo der Bereich hängt (_Oberste Ebene_ oder ein anderer Bereich).
3. Gib den _Namen (Deutsch)_ ein, am besten auch den _Namen (Englisch)_. Fehlt er, zeigt die Liste
   _Englisch fehlt_.
4. Optional: eine _Beschreibung_ und die _Reihenfolge_ (kleinere Zahlen stehen weiter oben).
5. Lass die Regeln leer, wenn der Bereich die Vorgaben übernehmen soll (siehe unten).
6. Tippe auf _Anlegen_.

### Einen Bereich verschieben

Bereich → _Bearbeiten_ → unter _Liegt in_ den neuen übergeordneten Bereich wählen → _Speichern_. Alle
Unterbereiche und Schichten wandern mit. Ein Bereich kann nicht unter sich selbst oder einen seiner
Unterbereiche gehängt werden.

### Einen Bereich löschen

Bereich → _Bearbeiten_ → _Löschen_ → bestätigen. Vorher müssen alle Unterbereiche verschoben oder
gelöscht sein, und im Bereich dürfen keine Schichten mehr liegen. Sonst steht statt _Löschen_ ein
Hinweis, z. B. „Im Bereich gibt es noch Schichten. Verschiebe sie in einen anderen Bereich oder
lösche sie zuerst.“

:::caution
Rollenvergaben auf diesem Bereich verschwinden beim Löschen mit. Das lässt sich nicht rückgängig
machen.
:::

## Was Bereiche überschreiben

Jeder Bereich kann die Vorgaben aus den _Einstellungen_ ändern. **Leer** heißt: wie der übergeordnete
Bereich, und ganz oben wie die Einstellungen.

| Feld                            | Bedeutung                                                       | Mehr                                                 |
| ------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| _Frist zum Austragen (Stunden)_ | Bis wie viele Stunden vor Beginn sich Helfende selbst austragen | [Buchungsregeln](/wichtel/organizers/booking-rules/) |
| _Späte Übergaben bestätigen_    | _wie übergeordnet_, _ja, Leitung bestätigt_ oder _nein, sofort_ | [Buchungsregeln](/wichtel/organizers/booking-rules/) |
| _Punkte pro Schicht_            | Grundpunkte für jede Schicht im Bereich                         | [Punkte-Regeln](/wichtel/organizers/points/)         |
| _Punkte pro Stunde_             | Punkte je Schichtstunde im Bereich                              | [Punkte-Regeln](/wichtel/organizers/points/)         |

Es gilt immer die nächstliegende Angabe: bei der Frist zuerst die der Schicht, dann die des Bereichs,
dann die der übergeordneten Bereiche, zuletzt die Einstellung. Bei den Punkten entsprechend zuerst die
der Position.

## Häufige Fragen

### Wer darf Bereiche anlegen?

Admins und alle mit dem Recht _Bereiche anlegen und bearbeiten_. Mit einer Rolle für einen Bereich
legst du Unterbereiche darin an und bearbeitest ihn; Bereiche auf oberster Ebene brauchen das Recht
für den ganzen Jahrgang. [Rollen und Rechte](/wichtel/organizers/roles/)

### Wie tief soll ich verschachteln?

So tief, wie ihr Verantwortung verteilt. Ein Bereich lohnt sich, wenn er eine eigene Leitung, eigene
Regeln oder einen eigenen Filter für Helfende braucht.

### Sehe ich, wer einen Bereich leitet?

Ja. Auf der Seite des Bereichs zeigt _Rollen hier_ alle Personen mit einer Rolle genau auf diesem
Bereich.

## Hintergrund

Rollen auf einem Bereich gelten für ihn und alle Unterbereiche. Eine Bereichsleitung für „Bar“ kann
also auch „Bar → Cocktails“ planen, aber nicht „Awareness“. Deshalb ist der Baum das Rückgrat der
Rechte. Jede Änderung (anlegen, ändern, verschieben, löschen) steht im
[Protokoll](/wichtel/organizers/audit/).

## Siehe auch

- [Rollen und Rechte](/wichtel/organizers/roles/)
- [Jahrgänge](/wichtel/organizers/editions/)
- [Glossar](/wichtel/reference/glossary/#bereich)

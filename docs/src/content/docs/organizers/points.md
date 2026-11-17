---
title: Punkte-Regeln
description: Wie viele Punkte eine Schicht bringt, wie Bereiche und Positionen die Grundregel überschreiben, wie Boni funktionieren und wann Punkte gutgeschrieben werden.
---

:::tip[Auf einen Blick]

- **Grundregel** unter _Einstellungen → Punkte_: _Punkte pro Schicht_ (Standard 1) und _Punkte pro
  Stunde_ (Standard 0). Beides wird addiert.
- **Bereiche** können beide Werte überschreiben, **Positionen** die _Punkte_ pro Schicht.
- **Boni**: _Nachtbonus_ und _Kurzfrist-Bonus_, jeweils 0 = aus.
- **Gutgeschrieben** wird erst, wenn die Anwesenheit bestätigt ist. Vorher sind die Punkte
  „vorgemerkt“.
- **Korrekturen** mit Begründung an der [Ausgabe](/wichtel/leads/desk/).

:::

## So rechnet Wichtel

Für jede Schicht einer Person:

> **Punkte = Punkte pro Schicht + (Stunden × Punkte pro Stunde, gerundet) + Nachtbonus +
> Kurzfrist-Bonus + Bonus aus einem Dringend-Aufruf**

- Stunden × Punkte pro Stunde wird auf ganze Punkte gerundet (ab ,5 aufwärts).
- Der Nachtbonus kommt einmal pro Schicht dazu, wenn die Schicht das Nachtfenster berührt.
- Der Kurzfrist-Bonus kommt dazu, wenn die Buchung weniger als die eingestellte Zahl an Stunden vor
  Beginn entstanden ist.
- Bonuspunkte aus einem [Dringend-Aufruf](/wichtel/leads/urgent/) gibt es für alle, die sich auf
  den Aufruf hin eintragen.

## Wo die Regeln stehen

| Ebene    | Wo                                                              | Was                                             |
| -------- | --------------------------------------------------------------- | ----------------------------------------------- |
| Instanz  | _Einstellungen_ → Karte _Punkte_                                | _Punkte pro Schicht_, _Punkte pro Stunde_, Boni |
| Bereich  | _Bereiche_ → Bereich bearbeiten → _Punkte_                      | _Punkte pro Schicht_, _Punkte pro Stunde_       |
| Position | Schicht bearbeiten → Positionen → Feld _Punkte_ (leer = _auto_) | Punkte pro Schicht                              |

Jeder Wert kommt von der genauesten Ebene, die ihn setzt: erst die Position, dann der Bereich der
Schicht, dann dessen übergeordnete Bereiche, zuletzt die Einstellungen. Ein leeres Feld heißt „wie
darüber“. Das gilt für _Punkte pro Schicht_ und _Punkte pro Stunde_ **getrennt**.

:::caution
Das Feld _Punkte_ an einer Position ersetzt nur die Punkte **pro Schicht**. Punkte pro Stunde aus
Bereich oder Einstellungen kommen weiterhin dazu. Soll eine Position genau eine feste Zahl bringen,
setz _Punkte pro Stunde_ im Bereich auf 0.
:::

Die Boni (_Nachtbonus_, _Kurzfrist-Bonus_) gibt es nur in den Einstellungen; sie gelten überall
gleich.

## Boni einstellen

### Nachtbonus

- _Nachtbonus (Punkte)_: wie viele Extrapunkte. 0 = aus.
- _Nacht von_ und _Nacht bis_: das Nachtfenster, Standard 00:00 bis 06:00. Es darf über Mitternacht
  gehen, z. B. 22:00 bis 06:00. Es gilt in der Zeitzone aus den Einstellungen.

Eine Schicht bekommt den Bonus, wenn sie das Fenster auch nur kurz überlappt. Endet sie genau zu
Beginn des Fensters (z. B. um 00:00), zählt das nicht.

### Kurzfrist-Bonus

- _Kurzfrist-Bonus (Punkte)_: wie viele Extrapunkte. 0 = aus.
- _Kurzfristig = gebucht weniger als … Stunden vor Beginn_: Standard 24.

Maßgeblich ist der Zeitpunkt, an dem der Eintrag entstanden ist – also auch, wenn eine Leitung
jemanden kurzfristig einträgt oder jemand kurz vorher eine Schicht von der Schichtbörse übernimmt.

## Beispiele

Einstellungen: _Punkte pro Schicht_ 0, _Punkte pro Stunde_ 2, _Nachtbonus_ 3 (00:00–06:00),
_Kurzfrist-Bonus_ 2 (24 Stunden).

| Schicht                                      | Rechnung                                  | Punkte |
| -------------------------------------------- | ----------------------------------------- | ------ |
| Einlass 14:00–18:00, Wochen vorher gebucht   | 0 + 4 × 2                                 | 8      |
| Bar 22:00–02:00                              | 0 + 4 × 2 + 3 (Nacht)                     | 11     |
| Bar 18:00–00:00                              | 0 + 6 × 2 (endet genau 00:00)             | 12     |
| Aufbau 09:00–10:45, am Vortag abends gebucht | 0 + 1,75 × 2 = 3,5 → 4, + 2 (kurzfristig) | 6      |

Jetzt setzt der Bereich _Bar_ _Punkte pro Schicht_ auf 2 und lässt _Punkte pro Stunde_ leer:

| Schicht         | Rechnung              | Punkte |
| --------------- | --------------------- | ------ |
| Bar 22:00–02:00 | 2 + 4 × 2 + 3 (Nacht) | 13     |

Und eine Position _Kasse_ in der Bar hat im Feld _Punkte_ den Wert 5:

| Schicht                | Rechnung  | Punkte |
| ---------------------- | --------- | ------ |
| Bar 18:00–22:00, Kasse | 5 + 4 × 2 | 13     |

## Wann Punkte gutgeschrieben werden

1. **Gebucht**: Die Punkte erscheinen bei der Person als „vorgemerkt aus gebuchten Schichten“. Sie
   zählen noch nicht – außer für Goodies mit _Vorschuss_ (siehe [Goodies](/wichtel/organizers/goodies/)).
2. **Anwesenheit bestätigt** (Check-in an der [Ausgabe](/wichtel/leads/desk/) oder in der
   [Besetzung](/wichtel/leads/staffing/)): Jetzt werden die Punkte gutgeschrieben, berechnet mit den
   Regeln, die in diesem Moment gelten. Danach löst Wichtel automatisch fällige
   [Pflicht-Goodies](/wichtel/organizers/goodies/) ein.
3. **Anwesenheit zurückgenommen** oder auf „nicht erschienen“ gesetzt: Die Punkte werden wieder
   abgezogen.

Jede Änderung steht als eigene Zeile im _Punkteverlauf_ der Person; nichts wird still überschrieben.

:::note
Änderst du die Regeln später, ändern sich schon gutgeschriebene Punkte nicht von selbst. Vorgemerkte
Punkte zeigen dagegen immer den aktuellen Stand der Regeln.
:::

## Punkte korrigieren

1. Öffne _Ausgabe & Check-in_ und such die Person (oder scanne ihren Code).
2. Unter _Punkte korrigieren_ trag bei _Punkte (+/−)_ eine Zahl ein, z. B. `5` oder `-2`.
3. Gib einen _Grund_ an – er ist Pflicht.
4. Tippe auf _Buchen_.

Die Korrektur erscheint im Punkteverlauf der Person als „Korrektur: _Grund_“ und im
[Protokoll](/wichtel/organizers/audit/). Die Person sieht den Grund also – formuliere ihn
entsprechend.

Korrigieren dürfen Admins und alle mit dem Recht _Punkte manuell anpassen_ für den ganzen Jahrgang.

## Häufige Fragen

### Soll ich pro Schicht oder pro Stunde vergeben?

Pro Schicht ist einfach zu erklären („jede Schicht ein Punkt“). Pro Stunde ist gerechter, wenn
Schichten sehr unterschiedlich lang sind. Du kannst beides kombinieren, z. B. 1 pro Schicht plus 1
pro Stunde.

### Gelten Punkte über Jahrgänge hinweg?

Nein. Punkte gehören zu einem [Jahrgang](/wichtel/organizers/editions/); beim Kopieren eines
Jahrgangs werden sie nie übernommen. Die Regeln der Bereiche kommen dagegen mit.

## Siehe auch

- [Goodies](/wichtel/organizers/goodies/)
- [Bereiche](/wichtel/organizers/areas/)
- [Punkte und Goodies (für Helfende)](/wichtel/helpers/points-goodies/)

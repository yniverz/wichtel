---
title: Buchungsregeln
description: Welche Regeln beim Eintragen, Austragen, Tauschen und in Gruppen gelten, wo du sie einstellst und was Helfende davon merken.
---

:::tip[Auf einen Blick]

- Die meisten Regeln stehen unter _Verwaltung → System → Einstellungen_ in den Karten _Buchung_ und
  _Tausch & Gruppen_.
- Die **Frist zum Austragen** lässt sich pro Bereich und pro Schicht überschreiben, die Bestätigung
  später Übergaben pro Bereich.
- **Überschneidungen** verhindert Wichtel immer; die **Mindestpause** kommt auf Wunsch dazu.
- Wer wann buchen darf, steuern [Buchungswellen](/wichtel/organizers/waves/).

:::

## Alle Regeln im Überblick

| Einstellung                                                                     | Standard        | Wo                                                         |
| ------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------- |
| _Frist zum Austragen (Stunden vor Beginn)_                                      | 48              | Einstellungen → _Buchung_; überschreibbar in Bereich und Schicht |
| _Mindestpause zwischen zwei Schichten (Minuten)_                                | 0 (keine Pause) | Einstellungen → _Buchung_                                  |
| _Erinnerungs-Mail (Stunden vor Beginn)_                                         | 24              | Einstellungen → _Buchung_ (0 = keine Erinnerungen)         |
| _Warteliste für volle Positionen anbieten_                                      | an              | Einstellungen → _Buchung_                                  |
| _Schichtbörse und direkten Tausch erlauben_                                     | an              | Einstellungen → _Tausch & Gruppen_                         |
| _Übergaben nach Ablauf der Austragungsfrist von der Leitung bestätigen lassen_ | aus             | Einstellungen → _Tausch & Gruppen_; überschreibbar im Bereich |
| _Gruppen erlauben_                                                              | an              | Einstellungen → _Tausch & Gruppen_                         |
| _Höchstens Personen pro Gruppe_                                                 | 8 (2–50)        | Einstellungen → _Tausch & Gruppen_                         |
| _Reservierung für Gruppenmitglieder (Stunden)_                                  | 24              | Einstellungen → _Tausch & Gruppen_                         |
| Überschneidungen                                                                | immer verhindert | nicht abschaltbar                                         |

Die Einstellungen gelten für die ganze Installation, also für alle Jahrgänge. Nur Admins können sie
ändern. Speichern nicht vergessen – der Knopf _Speichern_ steht unten auf der Seite.

## Frist zum Austragen

Bis zu dieser Zahl von Stunden vor Schichtbeginn können sich Helfende selbst austragen. Danach sehen
sie „Austragen nur noch über die Schichtleitung.“ und können die Schicht nur noch über die
[Schichtbörse](/wichtel/helpers/cancel-swap/) abgeben oder sich an die Leitung wenden.

Welche Frist gilt, entscheidet Wichtel von innen nach außen:

1. die Frist an der **Schicht** selbst (Feld _Frist zum Austragen (Stunden)_ beim Bearbeiten der
   Schicht),
2. sonst die Frist des **nächstgelegenen Bereichs**, der eine setzt – erst der Bereich der Schicht,
   dann seine übergeordneten Bereiche,
3. sonst die Frist aus den **Einstellungen**.

Ein leeres Feld bedeutet jeweils „wie darüber“. Mit 0 können sich Helfende bis zum Schichtbeginn
selbst austragen.

:::note
Anfragen, Wartelisten-Plätze und von der Gruppe reservierte Plätze lassen sich unabhängig von der
Frist zurückziehen – die Frist gilt nur für feste Buchungen.
:::

## Überschneidungen und Mindestpause

Niemand kann zwei Schichten buchen, die sich zeitlich überschneiden. Mit der _Mindestpause zwischen
zwei Schichten (Minuten)_ verlangst du zusätzlich einen Abstand: Bei 30 Minuten kann niemand direkt
nach einer Schicht bis 18:00 Uhr eine Schicht ab 18:00 Uhr buchen, wohl aber eine ab 18:30 Uhr.

Helfende sehen bei einem Verstoß „Das überschneidet sich mit einer anderen Schicht.“ – auch wenn es
nur um die Pause geht. Die Regel gilt auch beim Nachrücken von der Warteliste, beim Übernehmen von
der Schichtbörse und in Gruppen. Leitungen mit dem Recht _Regeln übergehen (Überschneidung, Fristen,
Anforderungen)_ können eine Person trotzdem eintragen (siehe
[Besetzung](/wichtel/leads/staffing/)).

## Warteliste

Ist eine Position voll, können sich Helfende _Auf die Warteliste_ setzen. Wird ein Platz frei, rückt
die erste Person auf der Liste automatisch nach und bekommt die E-Mail „Von der Warteliste
nachgerückt“. Wer inzwischen eine Schicht zur selben Zeit hat, wird übersprungen und bleibt auf der
Liste. Bei Positionen _auf Anfrage_ wird aus dem Nachrücken eine Anfrage, die die Leitung bestätigt.

Schaltest du _Warteliste für volle Positionen anbieten_ aus, verschwindet der Knopf; volle Positionen
sind dann einfach voll.

## Schichtbörse und Tausch

Mit _Schichtbörse und direkten Tausch erlauben_ können Helfende eine gebuchte Schicht für alle
anbieten oder einer bestimmten Person anbieten; die Person kann übernehmen oder eine eigene Schicht
zum Tausch vorschlagen. Ausgeschaltet gibt es weder Börse noch Tausch.

Wann eine Übergabe die Leitung braucht:

- **Positionen _auf Anfrage_:** immer.
- **Alle anderen:** nur, wenn _Übergaben nach Ablauf der Austragungsfrist von der Leitung bestätigen
  lassen_ gilt und die Frist zum Austragen der Schicht schon vorbei ist. Vorher geht die Übergabe
  sofort durch.

Pro Bereich kannst du das unter _Späte Übergaben bestätigen_ ändern: _wie übergeordnet_, _ja, Leitung
bestätigt_ oder _nein, sofort_. Wie bei der Frist gilt der nächstgelegene Bereich, der etwas
festlegt, sonst die Einstellung.

Wer übernimmt, muss dieselben Regeln erfüllen wie beim Eintragen (keine Überschneidung, nötige
Qualifikationen). Schichten, die schon begonnen haben oder bei denen die Person eingecheckt ist,
lassen sich nicht mehr übergeben.

## Gruppen

Mit _Gruppen erlauben_ können sich Helfende zu Gruppen zusammenschließen (siehe
[Gruppen für Helfende](/wichtel/helpers/group/)). Wer für die Gruppe bucht, bekommt einen festen
Platz; für die anderen reserviert Wichtel je einen Platz und schickt die E-Mail „Platz von der Gruppe
reserviert“.

- _Höchstens Personen pro Gruppe_ begrenzt die Gruppengröße (2 bis 50).
- _Reservierung für Gruppenmitglieder (Stunden)_ legt fest, wie lange ein reservierter Platz
  gehalten wird – höchstens bis zum Schichtbeginn. Nimmt die Person ihn nicht an, wird er wieder
  frei, sie bekommt die E-Mail „Reservierung abgelaufen“, und die Warteliste rückt nach.

Auch in Gruppen gilt für jede Person: Sie muss die Schicht sehen und buchen dürfen (Buchungswellen),
die Qualifikationen haben und darf keine Überschneidung haben.

## Erinnerungen

Mit _Erinnerungs-Mail (Stunden vor Beginn)_ bekommen alle mit fester Buchung so viele Stunden vor
Schichtbeginn eine Erinnerung. Wer erst innerhalb dieses Zeitraums bucht, bekommt die Erinnerung kurz
nach der Buchung. Jede Buchung wird höchstens einmal erinnert. 0 schaltet Erinnerungen ab. Den Text
änderst du unter [E-Mail-Vorlagen](/wichtel/organizers/mail/).

## Häufige Fragen

### Kann ich die Frist für einen einzelnen Bereich verkürzen?

Ja. Öffne den Bereich unter _Bereiche_ und trag bei _Frist zum Austragen (Stunden)_ einen Wert ein.
Er gilt auch für alle Unterbereiche, solange die keinen eigenen Wert haben.

### Wirkt eine geänderte Frist auch auf schon gebuchte Schichten?

Ja. Wichtel rechnet die Frist bei jedem Austragen neu aus den aktuellen Einstellungen.

## Sonderfälle

<details>
<summary>Was ist mit Schichten, die schon begonnen haben?</summary>

Schichten, die schon begonnen haben, können Helfende weder buchen noch austragen, noch auf die
Warteliste gehen oder übergeben. Leitungen können Personen mit dem Recht _Regeln übergehen_ trotzdem
noch eintragen.

</details>

<details>
<summary>Gilt die Buchungswelle auch für Dringend-Aufrufe?</summary>

Nein. Positionen mit einem laufenden [Dringend-Aufruf](/wichtel/leads/urgent/) können alle buchen,
die die Schicht sehen – auch wenn ihre Buchungswelle noch nicht offen ist.

</details>

## Siehe auch

- [Buchungswellen](/wichtel/organizers/waves/)
- [Bereiche](/wichtel/organizers/areas/)
- [Alle Einstellungen](/wichtel/organizers/settings/)
- [Austragen und tauschen (für Helfende)](/wichtel/helpers/cancel-swap/)

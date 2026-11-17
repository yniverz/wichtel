---
title: Buchungswellen
description: Schichten zeitgesteuert freigeben – zuerst für die Crew, dann für Wiederkehrende, Eingeladene und schließlich für alle.
---

:::tip[Auf einen Blick]

- **Ohne Wellen** können alle jederzeit buchen.
- **Sobald es eine Welle gibt**, kann nur noch buchen, für wen gerade eine passende Welle offen ist.
- Eine Welle hat einen Namen, _Öffnet am_, optional _Schließt am_, eine Zielgruppe (_Für_) und
  optional bestimmte _Bereiche_.
- Typisch: _Crew_ → _Wiederkehrende_ → _alle Helfenden_, jeweils ein paar Tage später.
- Zu finden unter _Verwaltung → Planung → Buchungswellen_.

:::

## Schritt für Schritt

1. Öffne _Buchungswellen_ und klapp _+ Neue Welle_ auf.
2. Gib einen _Namen_ ein, z. B. „Crew-Vorlauf“. Helfende sehen ihn, wenn sie einen Einladungslink
   annehmen.
3. Wähle _Öffnet am_ und die _Uhrzeit_. Die Zeiten gelten in der Zeitzone aus den
   [Einstellungen](/wichtel/organizers/settings/).
4. Lass _Schließt am_ leer, wenn die Welle offen bleiben soll. Mit einem Datum endet sie dort.
5. Wähle unter _Für_ die Zielgruppe (siehe unten).
6. Wähle unter _Bereiche_ die Bereiche, die diese Welle öffnet. Unterbereiche zählen mit. Keine
   Auswahl = alle Bereiche.
7. _Anlegen_. In der Liste steht die Welle mit Status _geplant_, _offen_ oder _beendet_.

Ändern oder löschen kannst du eine Welle, indem du sie in der Liste aufklappst.

## Zielgruppen

| _Für_                                                        | Wer darf buchen                                                                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| _alle Helfenden_                                             | alle mit Konto                                                                                                 |
| _Crew (Personen mit einer Rolle in diesem Jahrgang)_         | alle, die im aktuellen Jahrgang eine [Rolle](/wichtel/organizers/roles/) haben, und alle Admins                |
| _Wiederkehrende (in einem früheren Jahrgang dabei) und Crew_ | alle, die in einem früheren Jahrgang bei mindestens einer Schicht als anwesend bestätigt wurden, plus die Crew |
| _Personen mit Einladungslink_                                | alle, die den Einladungslink dieser Welle geöffnet haben                                                       |

„Dabei gewesen“ heißt: Die Anwesenheit wurde bestätigt (Check-in). Wer früher nur gebucht hatte,
aber nicht eingecheckt wurde, zählt nicht als wiederkehrend.

## Einladungslinks

Bei einer Welle _Für_ _Personen mit Einladungslink_ zeigt die aufgeklappte Welle einen
_Einladungslink_ mit dem Knopf _Link kopieren_. Gib ihn z. B. an einen befreundeten Verein oder an
Leute, die du für ein bestimmtes Team gewinnen willst.

- Wer den Link öffnet und nicht angemeldet ist, kommt zuerst zur Anmeldung und danach automatisch
  zurück. Danach landet die Person bei den Schichten und sieht „Einladung angenommen: … Du kannst
  jetzt Schichten buchen, sobald die Welle offen ist.“
- Wer noch kein Konto hat, registriert sich über _Noch kein Konto?_ → _Registrieren_. Nach dem
  Bestätigen der E-Mail-Adresse und dem Anmelden geht es ebenfalls automatisch weiter.
- Der Link gilt dauerhaft für diese eine Welle. Wer ihn hat, kann ihn weitergeben – teile ihn also
  nur dort, wo das in Ordnung ist.
- Ist die Registrierung in den Einstellungen geschlossen, können über den Link nur Personen mit
  bestehendem Konto teilnehmen.

## Was Helfende sehen

Ist die Buchung für jemanden noch nicht offen, kann die Person trotzdem alle Schichten ansehen:

- Ist für sie gerade nirgends etwas buchbar, steht oben „Die Buchung öffnet für dich am … Du kannst
  dich jetzt schon umsehen.“ – mit dem frühesten Termin einer Welle, die für sie in Frage kommt.
- An den Schichten steht statt _Eintragen_ „Buchung öffnet …“ oder, wenn keine Welle mehr für sie
  kommt, „Buchung gerade geschlossen“. Positionen mit laufendem
  [Dringend-Aufruf](/wichtel/leads/urgent/) zeigen trotzdem _Eintragen_.

Wann die Buchung für sie öffnet, sieht also jede Person selbst. Eine E-Mail zum Start einer Welle
verschickt Wichtel nicht – kündige sie z. B. über [Neuigkeiten](/wichtel/leads/news/) an.

## Beispiel: Crew zuerst, dann Wiederkehrende, dann alle

| Name          | Für                                                          | Öffnet am      | Bereiche |
| ------------- | ------------------------------------------------------------ | -------------- | -------- |
| Crew-Vorlauf  | _Crew (Personen mit einer Rolle in diesem Jahrgang)_         | 1. Mai, 18:00  | alle     |
| Stammhelfende | _Wiederkehrende (in einem früheren Jahrgang dabei) und Crew_ | 8. Mai, 18:00  | alle     |
| Freunde Bar   | _Personen mit Einladungslink_                                | 8. Mai, 18:00  | Bar      |
| Alle          | _alle Helfenden_                                             | 15. Mai, 18:00 | alle     |

Keine der Wellen hat ein Ende, also bleibt die Buchung für jede Gruppe ab ihrem Start offen. Die
Crew kann ab dem 1. Mai buchen, Wiederkehrende ab dem 8. Mai, eingeladene Freunde ab dem 8. Mai nur
in der Bar, und ab dem 15. Mai alle überall.

## Tipps für großen Andrang

Wenn sehr viele Leute in derselben Minute buchen, wird Wichtel kurz langsamer; Buchungen kommen
trotzdem korrekt an, niemand wird überbucht. Bei sehr großem Andrang weist Wichtel einzelne Aufrufe
mit „Gerade ist sehr viel los“ ab. So verteilst du den Andrang:

- **Mehrere Wellen statt einer**: z. B. eine Welle pro Bereich oder Bereichsgruppe, im Abstand von
  einer halben Stunde.
- **Personengruppen nacheinander**: Crew, Wiederkehrende und alle anderen an verschiedenen Tagen.
- **Ungerade Uhrzeiten**, die zu euch passen, und eine Ankündigung, damit niemand die Seite ständig
  neu lädt.

Mehr dazu für die Technik: [Kapazität](/wichtel/operators/capacity/).

## Häufige Fragen

### Ich habe nur eine Crew-Welle angelegt – warum kann sonst niemand mehr buchen?

Sobald es mindestens eine Welle gibt, ist die Buchung für alle geschlossen, für die gerade keine
passende Welle offen ist. Leg zusätzlich eine Welle _Für_ _alle Helfenden_ an.

### Was passiert mit Buchungen, wenn eine Welle schließt?

Nichts. Gebuchte Schichten bleiben gebucht, und Austragen geht weiter nach den
[Buchungsregeln](/wichtel/organizers/booking-rules/). Nur neue Buchungen und neue Einträge auf der
Warteliste sind dann für diese Gruppe nicht mehr möglich.

### Können Leitungen trotzdem Leute eintragen?

Ja. Wellen gelten nur, wenn sich Helfende selbst eintragen. Leitungen können Personen jederzeit über
die [Besetzung](/wichtel/leads/staffing/) eintragen.

## Sonderfälle

<details>
<summary>Eine Person passt zu mehreren Wellen</summary>

Dann reicht es, wenn eine davon gerade offen ist und den Bereich der Schicht abdeckt.

</details>

<details>
<summary>Dringend-Aufrufe</summary>

Positionen mit einem laufenden [Dringend-Aufruf](/wichtel/leads/urgent/) sind für alle buchbar, die
die Schicht sehen – auch außerhalb ihrer Welle.

</details>

<details>
<summary>Gruppen</summary>

Bucht jemand für eine Gruppe, muss für jedes Mitglied die Buchung offen sein. Sonst steht bei der
Person „darf noch nicht buchen“.

</details>

## Hintergrund

Wellen gehören zu einem [Jahrgang](/wichtel/organizers/editions/). Beim Kopieren eines Jahrgangs
können sie mitkommen – mit neuen Einladungslinks, die alten gelten dann nur für den alten Jahrgang.
Wellen anlegen dürfen Admins und alle mit dem Recht _Schichten anlegen und bearbeiten_ für den ganzen
Jahrgang.

## Siehe auch

- [Buchungsregeln](/wichtel/organizers/booking-rules/)
- [Rollen](/wichtel/organizers/roles/)
- [Warum kann ich nicht buchen? (für Helfende)](/wichtel/helpers/cannot-book/)

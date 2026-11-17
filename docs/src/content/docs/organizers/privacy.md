---
title: Datenschutz & Impressum
description: Impressum und Datenschutzerklärung in Wichtel pflegen, Löschfristen einstellen und Anfragen zu Auskunft und Löschung erledigen.
---

:::tip[Auf einen Blick]

- **Alles unter** _Datenschutz & Impressum_ (Gruppe _System_), nur für Admins.
- **Impressum:** _Name und Rechtsform_ und _Anschrift_ ausfüllen – dann erscheint es.
- **Datenschutzerklärung:** _Vorlage einfügen_, alle Stellen in [eckigen Klammern] ergänzen,
  speichern.
- **Löschfristen:** inaktive Konten nach 24 Monaten, IP-Adressen im Protokoll nach 90 Tagen (ab Werk).
- Die Vorlage ist **keine Rechtsberatung**. Lass den Text im Zweifel prüfen.

:::

## Schritt für Schritt

### Das Impressum

1. Öffne _Datenschutz & Impressum_.
2. Fülle unter _Betreiber und Impressum_ aus:
   - _Name und Rechtsform_, so wie im Register eingetragen, z. B. „Kulturverein Beispiel e. V.“,
   - _Anschrift (kein Postfach)_,
   - optional _Vertreten durch_ (bei Vereinen der vertretungsberechtigte Vorstand mit Funktion),
   - _E-Mail-Adresse_ und _Telefon_ – neben der E-Mail ist ein zweiter schneller Kontaktweg nötig,
   - falls vorhanden _Registereintrag_ und _Umsatzsteuer-ID_,
   - optional _Weitere Angaben_ auf Deutsch und Englisch.
3. Ganz unten _Speichern_.

Sobald Name und Anschrift ausgefüllt sind, erscheint das Impressum als eigene Seite und wird im
Fußbereich verlinkt.

### Die Datenschutzerklärung

1. Fülle zuerst das Impressum aus, trage unter _Datenschutzerklärung_ die _Datenschutzbeauftragte
   Person_ ein, falls ihr eine benannt habt, prüfe die _Löschfristen_ und tippe auf _Speichern_. Die
   Vorlage übernimmt nur gespeicherte Angaben.
2. Unter _Text (Deutsch)_ auf _Vorlage einfügen_ tippen, ebenso unter _Text (Englisch)_.
3. Ergänze alle Stellen in [eckigen Klammern]. Unter dem Text steht, wie viele noch offen sind.
4. _Speichern_.

Sobald ein Text gespeichert ist, erscheint die Datenschutzerklärung als eigene Seite und wird im
Fußbereich und bei der Registrierung verlinkt.

Die Vorlage passt zu eurer Installation: Sie kennt eure Profilfelder, die Löschfristen, den
Kartendienst, ob ein Mailserver eingerichtet ist, ob es Qualifikationen gibt und ob Rollen
KI-Assistenten nutzen dürfen.

:::caution
_Vorlage einfügen_ ersetzt den bisherigen Text (nach Rückfrage). Hast du den Text schon
angepasst, übertrage Änderungen lieber von Hand.
:::

### Stattdessen auf eigene Seiten verlinken

Habt ihr Impressum und Datenschutzerklärung schon auf eurer Festival-Website, trage unter _Externe
Seiten_ den _Link zum Impressum_ und den _Link zur Datenschutzerklärung_ ein. Diese Links gelten nur,
solange oben nichts eingetragen ist.

## Löschfristen

Wichtel räumt automatisch auf. Du stellst unter _Löschfristen_ ein:

| Feld                                             | Ab Werk  | Bedeutung                                                                                      |
| ------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------- |
| _Inaktive Konten löschen nach (Monaten)_         | 24       | Konten ohne Anmeldung und ohne Schicht werden anonymisiert. Zwei Wochen vorher kommt eine E-Mail. 0 = nie. |
| _IP-Adressen im Protokoll löschen nach (Tagen)_  | 90       | Danach entfernt Wichtel die IP-Adressen aus dem [Protokoll](/wichtel/organizers/audit/). Das Protokoll selbst bleibt. |

Admins werden nie automatisch gelöscht.

<details>
<summary>Wann gilt ein Konto als inaktiv?</summary>

Gezählt wird ab dem spätesten dieser Zeitpunkte: letzter Besuch in Wichtel, Registrierung, Ende der
letzten Schicht (abgesagte und abgelehnte zählen nicht). Zwei Wochen bevor die Frist abläuft, bekommt
die Person eine E-Mail mit dem Löschdatum und einem Link zur Anmeldung – aber nur, wenn ihre Adresse
bestätigt ist. Meldet sie sich vorher an, bleibt das Konto. Sonst wird es anonymisiert, frühestens
14 Tage nach der Warnung. Den Text der Warnung passt du unter
[E-Mail-Vorlagen](/wichtel/organizers/mail/) an.

</details>

## Anfragen zu Auskunft und Löschung

Helfende können beides selbst: unter _Meine Daten_ ihre Daten herunterladen und ihr Konto löschen
([Meine Daten](/wichtel/helpers/privacy/)). Kommt eine Anfrage per E-Mail oder Brief:

1. Prüfe, ob die Anfrage wirklich von der Person kommt.
2. Öffne sie unter _Personen_.
3. Unter _Datenschutz_:
   - **Auskunft:** _Datenauskunft herunterladen_ – eine Datei mit Profil, Angaben, Schichten,
     Punkten, Goodies, Qualifikationen, Gruppen, Rollen, KI-Verbindungen, Anmeldungen und den
     Protokolleinträgen zur Person. Passwörter und geheime Links sind nicht enthalten.
   - **Löschen:** _Konto löschen_ → bestätigen.
   - **Berichtigung:** _Daten bearbeiten_. [Personen verwalten](/wichtel/organizers/people/)

Beides steht im [Protokoll](/wichtel/organizers/audit/).

<details>
<summary>Was passiert beim Löschen eines Kontos?</summary>

- Name, E-Mail, Telefon, Angaben aus Profilfeldern, Qualifikationen samt hochgeladenen Nachweisen,
  Rollen, Gruppenmitgliedschaften, Anmeldungen und KI-Verbindungen werden gelöscht.
- Kommende Schichten werden ausgetragen; die Warteliste rückt nach. Offene Übergaben werden
  zurückgezogen, ausgewählte, noch nicht ausgegebene Goodies storniert.
- Vergangene Schichten, Punkte und ausgegebene Goodies bleiben ohne Namen für die Statistik – als
  „Gelöschtes Konto“.
- Das lässt sich nicht rückgängig machen. Das letzte Admin-Konto lässt sich nicht löschen, und dein
  eigenes Konto löschst du in deinem Profil.

</details>

## Häufige Fragen

### Ist die Vorlage rechtssicher?

Sie ist sorgfältig erstellt, ersetzt aber keine Rechtsberatung. Ergänze alle Stellen in [eckigen
Klammern] und lass den Text im Zweifel prüfen.

### Ich habe die Löschfrist geändert – stimmt die Datenschutzerklärung noch?

Nicht automatisch. Speichere zuerst und füge dann die Vorlage neu ein, oder passe die Zahl im Text
von Hand an. Dasselbe gilt, wenn du Profilfelder, Karten oder KI-Assistenten änderst.

### Muss ich beide Sprachen ausfüllen?

Fehlt der englische Text, sehen auch Personen mit englischer Sprache den deutschen – und umgekehrt.
Besser ist, beide zu pflegen.

### Was müssen die Leute beachten, die den Server betreiben?

Das steht unter [Datenschutz im Betrieb](/wichtel/operators/privacy/).

## Siehe auch

- [Protokoll](/wichtel/organizers/audit/)
- [Personen verwalten](/wichtel/organizers/people/)
- [Meine Daten (für Helfende)](/wichtel/helpers/privacy/)

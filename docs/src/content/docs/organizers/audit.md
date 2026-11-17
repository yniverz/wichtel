---
title: Protokoll
description: Was das Protokoll festhält, wie du es liest, woran du Änderungen durch KI-Assistenten erkennst und wann IP-Adressen gelöscht werden.
---

:::tip[Auf einen Blick]

- **Öffnen:** _Protokoll_ in der Verwaltung (Gruppe _System_).
- Jede Zeile: **was** passiert ist, **wer** es getan hat und **wann** – die neuesten oben.
- _Details_ aufklappen zeigt, was sich genau geändert hat.
- Änderungen durch KI-Assistenten tragen in den Details den Vermerk `via: "MCP: …"`.
- IP-Adressen werden nach einer Frist entfernt (Standard 90 Tage), die Einträge bleiben.

:::

## Schritt für Schritt

1. Öffne _Protokoll_.
2. Lies die Einträge von oben nach unten: Aktion, Person (oder _System_), Zeitpunkt.
3. Gibt es eine Begründung – etwa bei einer Punktekorrektur –, steht sie unter der Zeile.
4. Tippe auf _Details_, um die geänderten Werte zu sehen (vorher/nachher).
5. Für frühere Einträge ganz unten auf _Ältere Einträge_ tippen. Eine Seite zeigt 100 Einträge.

:::note
Das Protokoll hat keine Suche und keine Filter. Für eine bestimmte Änderung blätterst du zum
passenden Zeitraum.
:::

## Was wird protokolliert?

Alle Aktionen, die etwas ändern, zum Beispiel:

- **Struktur:** Jahrgänge (anlegen, kopieren, aktuell machen, archivieren), Bereiche, Orte,
  Geländeplan, Rollen und Rollenvergaben, Profilfelder, Einstellungen (auch _Datenschutz &
  Impressum_).
- **Planung:** Schichten und Serien, Buchungswellen, Dringend-Aufrufe.
- **Besetzung:** Personen eintragen und austragen, Anfragen entscheiden, Anwesenheit, Nachrücken von
  der Warteliste, Übergaben und Tausch, Gruppen.
- **Punkte und Goodies:** Goodies anlegen, ausgeben, stornieren, erstatten; Punktekorrekturen.
- **Personen:** Kontodaten ändern, Adresse von Hand bestätigen, Links zum Zurücksetzen,
  Adminrechte, Datenauskunft, Konto löschen, Qualifikationen.
- **Kommunikation:** Neuigkeiten, E-Mail-Vorlagen, erneut gesendete oder verworfene E-Mails.
- **KI-Assistenten:** verbunden, getrennt.

Nicht im Protokoll stehen Anmeldungen und reines Ansehen – mit einer Ausnahme: Das Herunterladen
einer Datenauskunft wird protokolliert.

## Häufige Fragen

### Wer darf das Protokoll sehen?

Admins sehen alle Einträge. Wer die Rolle mit _Protokoll einsehen_ für den _Gesamten Jahrgang_ hat,
sieht die Einträge des Jahrgangs, der oben im Schalter _Jahrgang_ gewählt ist – ohne Einträge, die zu
keinem Jahrgang gehören, etwa Einstellungen oder Adminrechte. [Rollen und Rechte](/wichtel/organizers/roles/)

### Woran erkenne ich Änderungen durch einen KI-Assistenten?

Als Person steht dort, wer den Assistenten verbunden hat – er handelt in ihrem Namen. In den _Details_
steht zusätzlich `via` mit `MCP:` und dem Namen der App, z. B. `"via": "MCP: Claude"`.
[KI-Assistenten](/wichtel/organizers/ai/)

### Was bedeutet „System“?

Die Aktion hat Wichtel selbst ausgelöst, ohne dass jemand angemeldet war – zum Beispiel das
automatische Löschen inaktiver Konten.

### Kann man Einträge ändern oder löschen?

Nein, nicht in der Oberfläche. Nur wenn ein Konto gelöscht wird, verlieren die Einträge **über**
diese Person ihre Details und IP-Adressen, und Einträge, die sie selbst ausgelöst hat, ihre
IP-Adressen. Als Person steht dann „Gelöschtes Konto“. Dass etwas passiert ist, bleibt sichtbar.

## Sonderfälle

<details>
<summary>Wann werden IP-Adressen entfernt?</summary>

Zu jeder Aktion einer Person speichert Wichtel die IP-Adresse, von der sie kam. Angezeigt wird sie im
Protokoll nicht. Nach der Frist _IP-Adressen im Protokoll löschen nach (Tagen)_ unter
_Datenschutz & Impressum_ → _Löschfristen_ entfernt Wichtel sie automatisch; ab Werk nach 90 Tagen.
Das Protokoll selbst bleibt erhalten. [Datenschutz & Impressum](/wichtel/organizers/privacy/)

</details>

<details>
<summary>Warum stehen bei manchen Änderungen keine Werte?</summary>

Bei geänderten Kontodaten nennt das Protokoll nur, **welche** Felder sich geändert haben, nicht die
alten oder neuen Werte – damit keine persönlichen Daten im Protokoll landen.

</details>

## Siehe auch

- [Datenschutz & Impressum](/wichtel/organizers/privacy/)
- [KI-Assistenten](/wichtel/organizers/ai/)

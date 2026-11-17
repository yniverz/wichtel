---
title: Claude als KI-Assistent verbinden
description: Claude mit Wichtel verbinden – über claude.ai, die Claude-App oder Claude Code –, nur lesen oder auch ändern, und die Verbindung wieder trennen.
---

:::tip[Auf einen Blick]

- **Voraussetzung:** Deine Rolle im aktuellen Jahrgang hat das Recht _KI-Assistent verbinden (z. B.
  Claude), mit den eigenen Rechten_.
- **Anleitung und Adresse:** in der App unter _Profil_ → _Mit Claude verbinden_.
- Beim Verbinden wählst du _Lesen und ändern_ oder _Nur lesen_.
- Claude hat **genau deine Rechte**, nie mehr. Folgenreiche Aktionen zeigt Claude erst als Vorschau.
- **Trennen:** _Profil_ → _Verbundene Zugänge_ → _Trennen_.

:::

Mit einem verbundenen Assistenten kannst du z. B. schreiben: „Welche Schichten am Samstag sind
unterbesetzt?“ oder „Leg für Samstag drei Abbau-Schichten von 10 bis 14 Uhr mit je 6 Plätzen an.“

## Schritt für Schritt

1. Öffne in der Helfer-Ansicht dein _Profil_. Hat deine Rolle das Recht, steht dort der Abschnitt
   _Mit Claude verbinden_ mit der _Adresse des Connectors_ (sie endet auf `/mcp`). Kopiere sie mit
   _Link kopieren_.
2. Verbinde Claude – je nachdem, was du nutzt:
   - **claude.ai oder die Claude-App:** _Einstellungen_ → _Connectors_ → „Eigenen Connector
     hinzufügen“. Adresse eintragen, speichern, dann _Verbinden_ wählen.
   - **Claude Code:** den Befehl aus deinem Profil ausführen
     (`claude mcp add --transport http wichtel …/mcp`), danach in Claude Code mit `/mcp` anmelden.
3. Du landest bei Wichtel. Melde dich an, falls nötig.
4. Auf der Seite _Zugriff erlauben_ siehst du, welche App zugreifen will und wohin der Zugangscode
   geht. Erlaube nur, wenn du die Verbindung gerade selbst angestoßen hast.
5. Wähle unter _Was darf die Verbindung?_:
   - _Lesen und ändern_ – z. B. Schichten anlegen oder Leute eintragen, soweit deine Rolle das darf.
   - _Nur lesen_ – Pläne, Besetzung und Anfragen ansehen, nichts ändern.
6. Tippe auf _Erlauben_.

Die Verbindung gilt 90 Tage. Danach verbindest du neu.

## Was der Assistent darf

- **Lesen** geht immer: Jahrgänge, Bereiche, Orte, Qualifikationen, Schichten mit Besetzung, die
  Übersicht, offene Anfragen und Personen suchen – jeweils nur, was du selbst sehen darfst.
- **Ändern** geht nur mit _Lesen und ändern_, nur in den Bereichen, die die Admins für Assistenten
  freigegeben haben, und nur soweit deine Rolle es erlaubt. Möglich sind:
  - Schichten planen: Schicht oder Serie anlegen, ändern, löschen,
  - Besetzung: Personen ein- und austragen, Anfragen und Übergaben entscheiden, Dringend-Aufrufe
    starten und beenden,
  - Bereiche und Orte anlegen,
  - Neuigkeiten veröffentlichen (auch per E-Mail),
  - Punkte gutschreiben oder abziehen.

  Neuigkeiten und Punkte sind anfangs für Assistenten gesperrt, bis die Admins sie freigeben.
- Rollen, Einstellungen und Konten kann ein Assistent nie ändern.

Ob ein Assistent Namen und Kontaktdaten, nur Namen oder Pseudonyme wie „Person 4F2A9C“ sieht, legen
die Admins fest. Was der Assistent sieht, verarbeitet dessen Anbieter.

## Vorschau und Bestätigung

Aktionen mit großer Wirkung – eine Serie anlegen, eine Schicht löschen, ein Dringend-Aufruf, eine
Neuigkeit – führt der Assistent nicht sofort aus. Er bekommt zuerst eine Vorschau (z. B. wie viele
Schichten entstehen oder wie viele Personen eine Neuigkeit erreicht) und soll dich fragen. Erst wenn
du zustimmst, wird die Aktion ausgeführt.

Jede Änderung über den Assistenten steht im Protokoll, mit dem Vermerk „MCP“ und dem Namen der App.

## Trennen

1. Öffne dein _Profil_ → _Mit Claude verbinden_ → _Verbundene Zugänge_. Dort steht jede Verbindung
   mit _Lesen und ändern_ oder _Nur lesen_, „gültig bis …“ und „zuletzt genutzt …“.
2. Tippe auf _Trennen_ und bestätige. Der Zugang funktioniert sofort nicht mehr.

Änderst du dein Passwort oder setzt es zurück, werden alle Verbindungen getrennt.

## Häufige Fragen

### Ich sehe „Mit Claude verbinden“ nicht in meinem Profil

Deine Rolle im aktuellen Jahrgang hat das Recht nicht. Beim Verbinden steht dann „Deine Rolle erlaubt
keinen KI-Zugang. Frag die Verwaltung, wenn du ihn brauchst.“ Wende dich an die Admins.

### Was passiert, wenn ich meine Rolle verliere?

Wichtel prüft bei jedem Aufruf, ob du das Recht noch hast. Ohne Recht funktioniert die Verbindung
nicht mehr.

### Kann ich auch einen anderen Assistenten als Claude verbinden?

Nur, wenn die Admins dessen Adresse erlaubt haben. Frag sie.

## Siehe auch

- [KI-Assistenten einrichten (für Admins)](/wichtel/organizers/ai/)
- [Welche Rechte es gibt](/wichtel/reference/permissions/)

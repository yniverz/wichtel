---
title: KI-Assistenten freischalten
description: Rollen das Recht für KI-Assistenten wie Claude geben und festlegen, was Assistenten ändern dürfen und welche persönlichen Daten sie sehen.
---

:::tip[Auf einen Blick]

- **1. Recht vergeben:** Unter _Rollen_ das Recht _KI-Assistent verbinden_ den Rollen geben, die es
  nutzen sollen. Admins haben es immer.
- **2. Einstellen:** _Einstellungen_ → _KI-Assistenten (MCP)_ – was Assistenten ändern dürfen, welche
  persönlichen Daten sie sehen, welche Apps sich verbinden dürfen.
- **3. Server:** Wichtel muss unter einer öffentlichen https-Adresse erreichbar sein.
- Ein Assistent hat **nie mehr Rechte** als die Person, die ihn verbindet. Jede Änderung steht im
  Protokoll.

:::

## Schritt für Schritt

### 1. Das Recht vergeben

1. Öffne _Rollen_ und die Rolle, die KI-Assistenten nutzen soll, z. B. _Bereichsleitung_.
2. Hake unter _Struktur & Überblick_ _KI-Assistent verbinden (z. B. Claude), mit den eigenen Rechten_
   an → _Speichern_.

Von den Rollen-Vorlagen hat nur die _Gesamtleitung_ dieses Recht ab Werk (in Installationen, die mit
einer älteren Version eingerichtet wurden, auch sie nicht). Es zählt nur, wenn die Rolle im
**aktuellen** Jahrgang vergeben ist. [Rollen und Rechte](/wichtel/organizers/roles/)

### 2. Die Einstellungen prüfen

Unter _Einstellungen_ → _KI-Assistenten (MCP)_:

**Was Assistenten ändern dürfen.** Lesen geht immer. Ändern nur in den angehakten Gruppen – und auch
dann nur, soweit die Person es selbst darf:

| Gruppe                    | Was der Assistent dann darf                                                              | Ab Werk |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------- |
| _Schichten planen_        | Schichten und Serien anlegen, ändern, löschen                                            | an      |
| _Besetzung_               | Leute ein- und austragen, Anfragen und Übergaben entscheiden, Dringend-Aufrufe           | an      |
| _Bereiche und Orte_       | Bereiche und Orte anlegen                                                                | an      |
| _Neuigkeiten & Rundmails_ | Neuigkeiten für Bereiche, Schichten oder alle Helfenden veröffentlichen, auch per E-Mail | aus     |
| _Punkte_                  | Punkte manuell gutschreiben oder abziehen                                                | aus     |

Rollen, Einstellungen und Konten können Assistenten grundsätzlich nicht ändern.

**Personenbezogene Daten für Assistenten.** Was ein Assistent sieht, verarbeitet dessen Anbieter
(z. B. Anthropic). Wähle:

- _Namen und Kontaktdaten (soweit die Person sie sehen darf)_,
- _Nur Namen, keine Telefonnummern oder E-Mail-Adressen_ (ab Werk),
- _Pseudonyme statt Namen („Person 4F2A9C“)_. Ein- und Austragen funktioniert auch so.

**Erlaubte Rücksprung-Adressen für KI-Assistenten.** Nur Apps, die nach der Anmeldung zu einer
dieser Adressen zurückleiten, können sich verbinden. Ein Host pro Zeile, Unterdomains zählen mit.
Ab Werk stehen dort `claude.ai` und `claude.com`. Apps auf demselben Rechner (`localhost`, z. B.
Claude Code) sind immer erlaubt. Für andere Assistenten trägst du deren Host hier ein.

Zum Schluss _Speichern_. Die Einstellungen gelten sofort, auch für schon verbundene Assistenten.

### 3. Den Server prüfen

Die Adresse in `PUBLIC_URL` muss die öffentliche https-Adresse von Wichtel sein, und der Server muss
aus dem Internet erreichbar sein – claude.ai ruft ihn von dort auf. Das richtet ein, wer den Server
betreibt. [Konfiguration](/wichtel/operators/configuration/)

## Häufige Fragen

### Wie verbinden die Leitungen dann Claude?

Im eigenen Profil unter _Mit Claude verbinden_ steht die Adresse und eine Anleitung. Die Person
wählt dabei selbst „Lesen und ändern“ oder „Nur lesen“. [KI-Assistent nutzen](/wichtel/leads/ai/)

### Woran erkenne ich, was ein Assistent geändert hat?

Im [Protokoll](/wichtel/organizers/audit/) steht die Person, die den Assistenten verbunden hat. In
den _Details_ steht zusätzlich `via` mit `MCP:` und dem Namen der App. Das Verbinden und Trennen
eines Assistenten wird ebenfalls protokolliert.

### Wie schalte ich das wieder ab?

Nimm das Recht _KI-Assistent verbinden_ aus den Rollen. Ab dem nächsten Aufruf lehnt Wichtel die
Assistenten dieser Personen ab. Admins behalten das Recht immer. Willst du nur das Ändern
verhindern, nimm alle Haken unter _Was Assistenten ändern dürfen_ heraus.

### Muss ich die Datenschutzerklärung anpassen?

Ja. Die Vorlage unter _Datenschutz & Impressum_ erwähnt KI-Assistenten, sobald eine Rolle das Recht
hat, und berücksichtigt die Einstellung zu personenbezogenen Daten. Füge sie danach neu ein oder
ergänze den Text von Hand. [Datenschutz & Impressum](/wichtel/organizers/privacy/)

## Sonderfälle

<details>
<summary>Wann wird eine Verbindung getrennt?</summary>

Eine Verbindung gilt 90 Tage. Die Person kann sie in ihrem Profil jederzeit trennen. Ändert jemand
sein Passwort oder setzt es zurück, trennt Wichtel alle KI-Verbindungen dieser Person. Bei jedem
Aufruf prüft Wichtel, ob die Person das Recht noch hat.

</details>

## Hintergrund

Wichtel spricht das offene Protokoll MCP (Model Context Protocol). Ein Assistent arbeitet immer im
Namen einer angemeldeten Person und mit genau ihren Rechten. Ohne andere Angabe arbeitet er im
aktuellen Jahrgang.

## Siehe auch

- [KI-Assistent nutzen (für Leitungen)](/wichtel/leads/ai/)
- [Rollen und Rechte](/wichtel/organizers/roles/)

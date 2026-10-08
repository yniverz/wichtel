# KI-Assistenten (MCP)

Wichtel lässt sich als Connector in KI-Assistenten wie Claude einbinden. Dann kann man z. B.
schreiben: „Welche Schichten am Samstag sind unterbesetzt?“ oder „Leg für Sonntag drei
Abbau-Schichten von 10 bis 14 Uhr mit je 6 Plätzen an.“ Der Assistent handelt dabei **immer mit
den Rechten der angemeldeten Person** – nie mit mehr.

## Für Admins: freischalten

1. **Recht vergeben**: In _Rollen_ das Recht „KI-Assistent verbinden“ den Rollen geben, die es
   nutzen sollen (z. B. Gesamt- und Bereichsleitungen). Admins haben es immer.
2. **Einstellungen → KI-Assistenten**:
   - _Was Assistenten ändern dürfen_: Schichten planen, Besetzung, Bereiche und Orte, Rundmails,
     Punkte. Rundmails und Punkte sind anfangs aus. Lesen geht immer; Rollen, Einstellungen und
     Konten können Assistenten grundsätzlich nicht ändern.
   - _Personenbezogene Daten_: Namen und Kontaktdaten, nur Namen (Standard) oder Pseudonyme
     („Person 4F2A9C“). Was ein Assistent sieht, verarbeitet dessen Anbieter.
   - _Erlaubte Rücksprung-Adressen_: Nur Apps, die auf diese Hosts zurückleiten, können sich
     verbinden (Standard: `claude.ai`, `claude.com`; `localhost` für Claude Code geht immer).
     Andere Assistenten hier ergänzen.
3. `PUBLIC_URL` muss die öffentliche https-Adresse sein, und der Server muss aus dem Internet
   erreichbar sein (claude.ai ruft ihn von dort auf).

## Für Leitungen: verbinden

Im Profil unter **Mit Claude verbinden** steht die Adresse (`https://…/mcp`).

- **claude.ai / Claude-App**: _Einstellungen → Connectors → Eigenen Connector hinzufügen_, Adresse
  eintragen, _Verbinden_. Du landest bei Wichtel, meldest dich an und wählst „Lesen und ändern“
  oder „Nur lesen“.
- **Claude Code**: `claude mcp add --transport http wichtel https://…/mcp`, danach im Claude-Code-Menü
  `/mcp` anmelden.

Eine Verbindung gilt 90 Tage und lässt sich im Profil jederzeit trennen.

## Was der Assistent kann

| Gruppe            | Werkzeuge                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Lesen (immer)     | Jahrgänge, Bereiche, Orte, Qualifikationen, Schichten suchen, Schicht mit Besetzung, Übersicht, offene Anfragen, Personen suchen |
| Schichten planen  | Schicht anlegen, Serie anlegen, ändern, löschen                                                                                  |
| Besetzung         | Person eintragen/austragen, Anfragen und Übergaben entscheiden, Dringend-Aufruf starten/beenden                                  |
| Bereiche und Orte | Bereich anlegen, Ort anlegen                                                                                                     |
| Rundmails         | Rundmail an Bereich, Schicht, Helfende oder Crew                                                                                 |
| Punkte            | Punkte gutschreiben oder abziehen                                                                                                |

Folgenreiche Aktionen (Serien, Löschen, Dringend-Aufrufe, Rundmails) liefern zuerst eine Vorschau
und laufen erst nach Bestätigung. Jede Änderung steht im Protokoll mit dem Vermerk „über MCP“.

## Technik

- Endpunkt `/mcp` (Streamable HTTP, zustandslos).
- Anmeldung per OAuth 2.1: Metadaten unter `/.well-known/oauth-protected-resource` und
  `/.well-known/oauth-authorization-server`, dynamische Client-Registrierung, Code-Flow mit PKCE
  (S256), rotierende Refresh-Tokens (Zugriffstoken 1 Stunde). Wird ein schon benutzter
  Refresh-Token erneut eingereicht, wird die ganze Verbindung getrennt.
- Ändert oder setzt jemand sein Passwort zurück, werden alle KI-Verbindungen der Person getrennt.
- Bei jedem Aufruf wird geprüft, ob die Person das Recht noch hat.

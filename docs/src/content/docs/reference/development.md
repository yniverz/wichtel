---
title: Entwicklung
description: Wichtel lokal starten, Befehle, Aufbau des Codes, Leitlinien und wie man diese Hilfeseite bearbeitet.
---

Diese Seite ist für alle, die an Wichtel selbst mitarbeiten. Wer Wichtel für ein Festival
installieren will, findet alles unter [Ich betreibe den Server](/wichtel/operators/).

## Loslegen

Voraussetzung: Node.js ≥ 22.17. Eine Datenbank wird **nicht** benötigt – ohne `DATABASE_URL`
startet eine eingebettete PostgreSQL (PGlite) in `./data`.

```bash
npm install
npm run dev
```

Beim ersten Start steht im Terminal ein Einrichtungslink (`/setup?token=…`). Ohne `SMTP_HOST`
werden E-Mails ins Terminal geschrieben.

## Befehle

| Befehl                | Zweck                                                                |
| --------------------- | -------------------------------------------------------------------- |
| `npm run dev`         | Entwicklungsserver                                                   |
| `npm run check`       | Typprüfung                                                           |
| `npm run lint`        | Prettier + ESLint                                                    |
| `npm test`            | Unit- und Integrationstests (gegen PGlite im Speicher)               |
| `npm run test:e2e`    | Browser-Tests (Playwright), vorher `npx playwright install chromium` |
| `npm run verify`      | Alles davon – vor jedem Commit                                       |
| `npm run db:generate` | Migration aus `src/lib/server/db/schema.ts` erzeugen                 |

## Aufbau

```
src/
  env.ts                  Umgebungsvariablen (validiert)
  hooks.server.ts         Start, Sitzungen, Sprache, CSRF-Schutz, Sicherheits-Header
  lib/domain/             reine Logik (Rechte, Bereichsbaum, Zeiten, Punkte …) – ohne DB, gut testbar
  lib/server/services/    Anwendungsfälle inkl. Rechteprüfung und Protokoll
  lib/server/mcp/         Werkzeuge für KI-Assistenten
  lib/server/db/          Drizzle-Schema und Datenbankverbindung (PostgreSQL oder PGlite)
  lib/i18n/               Übersetzungen (de ist die Quelle, en wird vom Typchecker erzwungen)
  lib/components/         UI-Bausteine
  routes/                 Seiten: (auth), app (Helfende), admin (Verwaltung), print, oauth, mcp
drizzle/                  SQL-Migrationen
e2e/                      Browser-Tests
docs/                     diese Hilfeseite (Starlight): Anleitungen, Konzept, Design-Richtlinien
```

## Leitlinien

- Fachlogik gehört in `lib/domain` (rein) bzw. `lib/server/services` (mit DB); Seiten rufen nur
  Services auf. Erwartbare Fehler sind `DomainError`s mit Text unter `error.<code>`.
- Jede Änderung an Daten schreibt einen Protokolleintrag.
- Gestaltung nach den [Design-Richtlinien](/wichtel/reference/design/): Programmheft statt
  Dashboard-Baukasten.
- Neue Texte zuerst in `de.ts`, dann in `en.ts`.
- Welche Rechte es gibt und wie sie wirken, steht unter [Rechte](/wichtel/reference/permissions/);
  die fachlichen Hintergründe im [Konzept](/wichtel/reference/concept/).

## Hilfeseite bearbeiten

Diese Hilfe liegt im Ordner `docs/` des Repositorys und wird mit
[Starlight](https://starlight.astro.build) gebaut. Bei jedem Push auf `main` wird sie automatisch
veröffentlicht. Die vollständige Anleitung mit Seitenvorlage und Schreibregeln steht in
[`docs/README.md`](https://github.com/yniverz/wichtel/blob/main/docs/README.md).

```bash
cd docs
npm install
npm run dev     # http://localhost:4321/wichtel/
npm run build   # prüft auch alle internen Links
```

- **Zwei Sprachen:** Jede Seite gibt es auf Deutsch (`src/content/docs/…`) und auf Englisch
  (`src/content/docs/en/…`) unter demselben Dateinamen. Wer eine Seite ändert, ändert beide.
- **Seitenleiste:** Welche Seiten es gibt, legt `docs/astro.config.mjs` fest.
- **Links** immer absolut mit `/wichtel/` vorne (Englisch: `/wichtel/en/`) und Schrägstrich am Ende,
  damit der Build sie prüfen kann.
- **Begriffe** genau wie in der Oberfläche (`src/lib/i18n/de.ts` bzw. `en.ts`), und nur beschreiben,
  was die App wirklich tut.
- **Verknüpfung mit der App:** Die App verlinkt von jeder Seite auf die passende Hilfeseite. Diese
  Zuordnung steht in
  [`src/lib/help.ts`](https://github.com/yniverz/wichtel/blob/main/src/lib/help.ts); ein Test prüft,
  dass jede verlinkte Seite in beiden Sprachen existiert. Wer eine Hilfeseite umbenennt, passt diese
  Datei mit an.

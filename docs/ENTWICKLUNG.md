# Entwicklung

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
docs/                     Konzept, Design-Richtlinien und Anleitungen
```

## Leitlinien

- Fachlogik gehört in `lib/domain` (rein) bzw. `lib/server/services` (mit DB); Seiten rufen nur
  Services auf. Erwartbare Fehler sind `DomainError`s mit Text unter `error.<code>`.
- Jede Änderung an Daten schreibt einen Protokolleintrag.
- Gestaltung nach [DESIGN.md](DESIGN.md): Programmheft statt Dashboard-Baukasten.
- Neue Texte zuerst in `de.ts`, dann in `en.ts`.

---
title: Development
description: Running Wichtel locally, commands, code structure, guidelines and how to edit this help site.
---

This page is for everyone who works on Wichtel itself. If you want to install Wichtel for a festival,
everything is under [I run the server](/wichtel/en/operators/).

## Getting started

Requirement: Node.js ≥ 22.17. A database is **not** required – without `DATABASE_URL`, an embedded
PostgreSQL (PGlite) starts in `./data`.

```bash
npm install
npm run dev
```

On first start, the terminal shows a setup link (`/setup?token=…`). Without `SMTP_HOST`, e-mails are
written to the terminal.

## Commands

| Command               | Purpose                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| `npm run dev`         | Development server                                                      |
| `npm run check`       | Type check                                                              |
| `npm run lint`        | Prettier + ESLint                                                       |
| `npm test`            | Unit and integration tests (against in-memory PGlite)                   |
| `npm run test:e2e`    | Browser tests (Playwright); run `npx playwright install chromium` first |
| `npm run verify`      | All of the above – before every commit                                  |
| `npm run db:generate` | Generate a migration from `src/lib/server/db/schema.ts`                 |

## Structure

```
src/
  env.ts                  Environment variables (validated)
  hooks.server.ts         Startup, sessions, language, CSRF protection, security headers
  lib/domain/             Pure logic (permissions, area tree, times, points …) – no DB, easy to test
  lib/server/services/    Use cases incl. permission checks and audit log
  lib/server/mcp/         Tools for AI assistants
  lib/server/db/          Drizzle schema and database connection (PostgreSQL or PGlite)
  lib/i18n/               Translations (de is the source, en is enforced by the type checker)
  lib/components/         UI building blocks
  routes/                 Pages: (auth), app (volunteers), admin (admin area), print, oauth, mcp
drizzle/                  SQL migrations
e2e/                      Browser tests
docs/                     This help site (Starlight): guides, concept, design guidelines
```

## Guidelines

- Domain logic belongs in `lib/domain` (pure) or `lib/server/services` (with DB); pages only call
  services. Expected errors are `DomainError`s with their text under `error.<code>`.
- Every change to data writes an audit log entry.
- Design follows the [design guidelines](/wichtel/en/reference/design/): a printed programme, not a
  dashboard kit.
- New texts go into `de.ts` first, then `en.ts`.
- Which permissions exist and how they work is described under
  [Permissions](/wichtel/en/reference/permissions/); the domain background in the
  [concept](/wichtel/en/reference/concept/).

## Editing the help site

This help lives in the `docs/` folder of the repository and is built with
[Starlight](https://starlight.astro.build). It is published automatically on every push to `main`. The
full guide with a page template and writing rules is in
[`docs/README.md`](https://github.com/yniverz/wichtel/blob/main/docs/README.md) (in German).

```bash
cd docs
npm install
npm run dev     # http://localhost:4321/wichtel/
npm run build   # also checks all internal links
```

- **Two languages:** every page exists in German (`src/content/docs/…`) and in English
  (`src/content/docs/en/…`) under the same file name. If you change a page, change both.
- **Sidebar:** `docs/astro.config.mjs` defines which pages exist.
- **Links** are always absolute, starting with `/wichtel/` (English: `/wichtel/en/`) and ending with a
  slash, so the build can check them.
- **Terms** exactly as in the interface (`src/lib/i18n/de.ts` and `en.ts`), and only describe what the
  app really does.
- **Connection to the app:** the app links from every page to the matching help page. This mapping
  lives in [`src/lib/help.ts`](https://github.com/yniverz/wichtel/blob/main/src/lib/help.ts); a test
  checks that every linked page exists in both languages. If you rename a help page, update that file
  too.

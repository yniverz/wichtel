# Screenshots für die Hilfe

Erzeugt die Bildschirmfotos der App für die Hilfeseiten (`docs/`), auf Deutsch und Englisch, immer mit
denselben Beispieldaten. Wenn sich die Oberfläche ändert, einfach neu erzeugen und die geänderten
PNGs committen.

```sh
npm run docs:screenshots                                   # alles: Daten, Build, App, Fotos
npm run docs:screenshots -- helper-goodies admin-waves     # nur diese Fotos
npm run docs:screenshots -- --no-build                     # vorhandenes build/ wiederverwenden
```

Dauer etwa eine Minute plus Build. Chromium für Playwright muss installiert sein
(`npx playwright install chromium`).

## Was passiert

1. **`seed.ts`** legt in einem temporären Ordner eine frische PGlite-Datenbank an und füllt sie über
   die Services der App (Regeln und Protokoll gelten also wie im echten Betrieb): das fiktive
   **Lindenfest** mit Bereichen, gut 30 Schichten, Orten, Punkteregeln, Goodies, Qualifikationen,
   Buchungswellen, Neuigkeiten, Rollen und rund 40 Helfenden mit Buchungen, Anfragen, Wartelisten,
   einem dringenden Aufruf und Anwesenheiten. Alle Daten hängen am heutigen Tag: Der Aufbau läuft
   seit vorgestern, das Festival ist übermorgen bis in vier Tagen. So sehen die Bilder nie veraltet
   aus.
2. **`capture.ts`** baut die App (`npm run build`), startet sie mit `node build` auf dieser
   Datenbank und fotografiert mit Playwright (Chromium, helles Design, doppelte Auflösung) jede
   Ansicht aus der Liste `SHOTS`, einmal pro Sprache. Die Sprache wird wie von Hand über den
   DE/EN-Schalter gewechselt. Danach werden App und Datenbank weggeräumt.

Die Bilder landen in `docs/src/assets/screenshots/{de,en}/<name>.png`. Handy-Ansichten haben
390 × 844 Punkte (iPhone 13), Verwaltungsansichten 1280 × 800.

### Personen

| Person          | E-Mail                           | Passwort            | Rolle                                   |
| --------------- | -------------------------------- | ------------------- | --------------------------------------- |
| Kai Lindner     | `admin@lindenfest.example`       | `lindenfest-admin`  | Admin                                   |
| Mo Schuster     | `mo.schuster@lindenfest.example` | `lindenfest-lead`   | Bereichsleitung Bar                     |
| Lena Vogt       | `lena.vogt@example.org`          | `lindenfest-helper` | Helferin mit Schichten, Punkten, Gruppe |
| alle 40 anderen | `vorname.nachname@example.org`   | `lindenfest-helper` | Helfende                                |

Zum Ausprobieren von Hand:

```sh
DATABASE_URL=pglite://./data/demo npx tsx scripts/screenshots/seed.ts ./data/demo
DATABASE_URL=pglite://./data/demo UPLOAD_DIR=./data/demo/uploads npm run dev
```

## Ein Foto hinzufügen

In `capture.ts` einen Eintrag zu `SHOTS` hinzufügen:

```ts
{
	name: 'admin-places',          // Dateiname, bleibt stabil
	persona: 'admin',              // 'admin' | 'lead' | 'helper'
	device: 'desktop',             // 'phone' | 'desktop'
	path: () => '/admin/places',
	// optional:
	scrollTo: (page, l) => heading(page, t(l, 'Orte', 'Places')),  // Abschnitt nach oben holen
	element: (page, l) => section(page, t(l, 'Hilfe', 'Help')),     // nur diese Karte fotografieren
	prepare: async (page, l, ids) => { /* Dialog öffnen, Formular füllen … */ }
}
```

Fehlen Daten, gehören sie in `seed.ts`; Ids, die ein Foto braucht, kommen in `personas.json`
(`ids`). Dann `npm run docs:screenshots -- admin-places` und das Ergebnis ansehen.

## In eine Hilfeseite einbinden

Normales Markdown-Bild mit relativem Pfad; Astro verkleinert und optimiert es beim Bauen. Von einer
deutschen Seite eine Ebene unter `docs/src/content/docs/`, z. B. `helpers/shifts.md`:

```md
![Schichtliste auf dem Handy](../../../assets/screenshots/de/helper-shifts.png)
```

Von der englischen Seite `en/helpers/shifts.md` (eine Ebene tiefer):

```md
![Shift list on a phone](../../../../assets/screenshots/en/helper-shifts.png)
```

Von der Startseite `index.mdx` (deutsch) wäre es `../../assets/screenshots/de/…`, von
`en/index.mdx` `../../../assets/screenshots/en/…`. Der Alternativtext beschreibt, was zu sehen ist,
in der Sprache der Seite.

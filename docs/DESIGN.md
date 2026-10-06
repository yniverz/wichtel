# Wichtel – Design-Richtlinien

Ziel: Wichtel soll wie ein bewusst gestaltetes Werkzeug eines Festivals wirken, nicht wie eine
generische (KI-)Vorlage. Leitbild ist ein **gedrucktes Festivalprogramm**: warmes Papier,
tintenschwarze Schrift, eine laute Signalfarbe, klare Linien.

## Grundsätze

1. **Hierarchie über Typografie, Linien und Abstand** – nicht über Schatten, Verläufe oder Karten.
2. **Eine Signalfarbe.** Die Hauptfarbe (Standard: Signalrot `#c03a1c`) markiert die eine
   wichtigste Aktion und aktive Zustände. Die Akzentfarbe (Standard: Bändchen-Gelb `#f4c430`)
   ist für Hinweise und kleine Markierungen reserviert.
3. **Wenig Rundung.** 3 px für kleine Elemente (Badges, Checkboxen), 4–6 px für Bedienelemente
   und Flächen. Keine Pillen außer bei echten Pillen.
4. **Ehrliche Inhalte.** Texte sagen etwas Konkretes über das Festival; keine Platzhalter-Slogans,
   keine Emojis als Icons, keine dekorativen „Live“-Badges.
5. **Mobil zuerst** für Helfende, große Trefferflächen (≥ 44 px), Navigation unten.

## Tokens (`src/routes/layout.css`)

| Token              | Hell                  | Dunkel     | Verwendung                 |
| ------------------ | --------------------- | ---------- | -------------------------- |
| `surface`          | `#f5f2eb`             | `#161512`  | Seitenhintergrund (Papier) |
| `surface-raised`   | `#fffdf8`             | `#1f1d19`  | Eingabefelder, Flächen     |
| `ink`              | `#1d1b17`             | `#f2eee6`  | Text, starke Linien        |
| `ink-muted`        | `#696358`             | `#a29c90`  | Sekundärtext               |
| `line`             | `#dcd5c7`             | `#36322b`  | feine Trennlinien          |
| `brand` / `accent` | aus den Einstellungen |            | Signalfarbe / Hinweise     |
| `brand-text`       | `brand`               | aufgehellt | Links und farbiger Text    |

## Schrift

**Archivo** (variabel, lokal eingebunden – keine Google-Fonts-Anfragen):

- `font-display` – schmal (72 %), sehr fett, für Seitentitel und große Zahlen, meist in Versalien.
- Fließtext und Bedienelemente in normaler Breite, 400–700.
- Zahlen mit `tabular-nums`.

## Muster

- **Seitentitel**: `PageHeader` – großer schmaler Titel, darunter eine tintenschwarze Linie.
- **Listen statt Kartenraster**: Einträge mit Trennlinien; Karten (`Card`) nur für Formularbereiche.
- **Zahlen**: groß in `font-display`, nicht in Kacheln.
- **Bestätigungen**: immer `ConfirmForm` (gleicher Dialog für alle folgenreichen Aktionen).
- **Kontrast**: Text mindestens 4,5 : 1; die Einstellungen warnen bei zu schwachen Markenfarben.

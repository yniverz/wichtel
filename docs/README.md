# Wichtel Hilfe – Quelle der Hilfeseite

Diese Ordner enthält die Hilfeseite unter **https://yniverz.github.io/wichtel/**, gebaut mit
[Starlight](https://starlight.astro.build). Sie wird bei jedem Push auf `main` automatisch
veröffentlicht (`.github/workflows/docs.yml`).

```bash
cd docs
npm install
npm run dev     # http://localhost:4321/wichtel/
npm run build   # prüft auch alle internen Links
```

## Aufbau

```
src/content/docs/
  index.mdx            Startseite (Deutsch)
  helpers/             Ich helfe mit             – Helfende
  leads/               Ich leite einen Bereich   – Leitungen (Verwaltung mit Bereichsrechten)
  organizers/          Ich organisiere           – Admins (Einstellungen, Rollen, Jahrgänge …)
  operators/           Ich betreibe den Server   – Installation und Betrieb
  reference/           Nachschlagen              – Glossar, Funktionen, Rechte, Entwicklung
  en/                  dieselben Seiten auf Englisch, gleiche Dateinamen
```

Die Seitenleiste ist in `astro.config.mjs` festgelegt. Jede Seite gibt es **auf Deutsch und auf
Englisch** unter demselben Pfad (`helpers/shifts.md` und `en/helpers/shifts.md`).

Die App verlinkt von jeder Seite auf die passende Hilfeseite (`src/lib/help.ts` im Hauptprojekt).
Ein Test dort prüft, dass jede verlinkte Seite in beiden Sprachen existiert. Wer eine Seite
umbenennt, passt `src/lib/help.ts` mit an.

## Grundidee: drei Ebenen

Wer nur schnell etwas wissen will, soll nicht durch alles durch müssen. Deshalb hat jeder Bereich
drei Ebenen:

1. **Schnelle Hilfe** – die Startseite des Bereichs (`helpers/index.md` usw.): die häufigsten
   Fragen mit Antworten in ein bis drei Sätzen und einem Link „Ausführlich“.
2. **Anleitungen** – eine Seite pro Aufgabe, oben eine Box „Auf einen Blick“, dann die Schritte.
3. **Hintergrund** – Regeln, Grenzfälle und das Warum, unten auf der Seite und in aufklappbaren
   Abschnitten.

## Vorlage für eine Seite

```md
---
title: Schichten eintragen
description: Ein Satz, der in Suche und Linkvorschau erscheint.
---

:::tip[Auf einen Blick]

- **Eintragen:** _Schichten_ → Schicht antippen → _Eintragen_.
- Höchstens fünf Punkte. Das Wichtigste zuerst.

:::

## Schritt für Schritt

1. …
2. …

## Häufige Fragen

### Kann ich …?

Antwort in ein bis drei Sätzen.

## Sonderfälle

<details>
<summary>Was passiert, wenn …?</summary>

Text (Leerzeile nach `<summary>` nicht vergessen, sonst wird Markdown nicht umgewandelt).

</details>

## Hintergrund

Wie es funktioniert und warum.

## Siehe auch

- [Glossar](/wichtel/reference/glossary/)
```

Englische Überschriften: _At a glance_, _Step by step_, _Common questions_, _Special cases_,
_Background_, _See also_. Abschnitte, die nichts zu sagen haben, weglassen.

## Schreibregeln

- **Die Box „Auf einen Blick“ beantwortet die häufigste Frage**, ohne dass man auf dem Handy
  scrollen muss.
- **Begriffe genau wie in der Oberfläche**, also wie in `src/lib/i18n/de.ts` bzw. `en.ts`.
  Knöpfe, Menüpunkte und Feldnamen _kursiv_, Klickpfade mit →.
- **Nur beschreiben, was die App wirklich tut.** Im Zweifel im Code nachsehen, nicht im Konzept –
  das Konzept beschreibt auch Ideen, die (noch) nicht umgesetzt sind.
- Helfende werden geduzt, auf Englisch „you“. Kurze Sätze, keine Fachwörter ohne Erklärung; im
  Helfer-Teil keine technischen Begriffe wie „Server“ oder „Datenbank“.
- Sonderfälle und Ausnahmen gehören in `<details>`, nicht in den Fließtext.
- Hinweisboxen sparsam: `:::tip` für Abkürzungen, `:::note` für Wissenswertes, `:::caution` für
  Dinge, die sich nicht rückgängig machen lassen.
- **Links immer absolut mit `/wichtel/` vorne** und Schrägstrich am Ende: auf Deutsch
  `/wichtel/helpers/shifts/`, auf Englisch `/wichtel/en/helpers/shifts/`. Nur so prüft der Build,
  ob das Ziel existiert.
- Was nur für das eigene Festival gilt (Zeiten, Ausgabeort, Anfahrt), kann die Hilfe nicht wissen.
  Dann auf _Neuigkeiten_ und den Kontakt der Orga verweisen.

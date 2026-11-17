---
title: Kapazität
description: Wie viel ein kleiner Server mit Wichtel schafft, was bei sehr großem Andrang passiert und wie man Buchungswellen entschärft.
---

:::tip[Auf einen Blick]

- Eine VM mit **2 vCPU und 2 GB RAM** (Wichtel und PostgreSQL zusammen) reichte im Test für
  **3000 Helfende und 1500 Schichten** – mit viel Reserve im Alltag.
- Engpass ist der **eine Prozessorkern**, den Wichtel nutzt, nicht die Datenbank.
- Bei sehr großem Andrang zeigt Wichtel „Gerade ist sehr viel los“, statt abzustürzen. Große
  Buchungswellen besser **aufteilen**.

:::

## Gemessen

Lasttest vom Oktober 2026 auf einer VM mit 2 vCPU und 2 GB RAM ohne Swap, Wichtel und PostgreSQL
zusammen, 3000 Helfende, 1500 Schichten mit 2090 Positionen an fünf Tagen. Die simulierten Nutzer
kamen von einem anderen Rechner.

- **Alltag** (Schichten ansehen, buchen, Kalender-Abos, Leitungen im Adminbereich): mindestens
  10 Besuche pro Sekunde mit Antwortzeiten unter 0,2 s – weit mehr, als ein Festival dieser Größe
  braucht. Mit steigender Last kam der Abbruch erst bei etwa 15–20 Besuchen pro Sekunde, ohne Fehler.
- **Dauerlast** 30 Minuten mit 8 Besuchen pro Sekunde: 95 % der Antworten unter 93 ms, Speicher
  konstant bei etwa 105 MB.
- **Logins:** 40 pro Sekunde ohne Verzögerung (95 % unter 83 ms).
- **Schichtliste** für eine Person: 0,12 s und etwa 440 KB (ein Tag, unkomprimiert); bis etwa 20
  Aufrufe pro Sekunde.
- **Buchungswelle**, bei der 1500 Personen innerhalb weniger Sekunden gleichzeitig buchen: alle
  Buchungen kommen korrekt an – keine Überbuchung, keine Doppel- oder Überschneidungsbuchung. In den
  ersten Minuten warten Seiten und Buchungen aber mehrere Sekunden (Median 8 s), und 13 % der
  Seitenaufrufe wurden mit „Gerade ist sehr viel los“ abgewiesen.

Die Datenbank war dabei nie der Engpass (alle Abfragen im Mittel unter 2 ms), sondern der eine
Node-Prozess. Werkzeuge und Ablauf des Lasttests beschreibt `load/README.md` im Repository.

## Was bei sehr großem Andrang passiert

Wichtel läuft als ein Node-Prozess und nutzt **einen Prozessorkern**; mehr Kerne helfen vor allem der
Datenbank. Damit ein Ansturm den Speicher nicht überlastet, berechnet Wichtel höchstens vier
Schichtlisten bzw. Startseiten von Helfenden gleichzeitig. Weitere Aufrufe warten in einer Schlange.
Wartet ein Aufruf länger als **20 Sekunden** oder ist die Schlange voll (200), bekommt er die Meldung
„Gerade ist sehr viel los. Bitte versuche es in ein paar Sekunden noch einmal.“ (Status 503).

Im Log steht dann höchstens einmal pro Minute `server busy: requests turned away` mit der Zahl der
abgewiesenen Aufrufe.

## Große Buchungswellen

Wer erwartet, dass sehr viele Menschen zur selben Minute buchen:

- **Wellen aufteilen** – mehrere [Buchungswellen](/wichtel/organizers/waves/) für verschiedene
  Bereiche oder Personengruppen, zu verschiedenen Zeiten.
- **Schnelleren Prozessor** wählen. Mehr Kerne allein helfen Wichtel wenig.
- Im Proxy **Kompression** einschalten, damit die Schichtliste schnell übers Mobilfunknetz kommt
  ([Reverse Proxy](/wichtel/operators/reverse-proxy/)).
- Während der Welle das Log beobachten:
  `docker compose logs -f --no-log-prefix app | jq -R 'fromjson? | select(.level != "info")'`.

## Siehe auch

- [Buchungswellen](/wichtel/organizers/waves/)
- [Logs und Fehlermeldungen](/wichtel/operators/logs/)

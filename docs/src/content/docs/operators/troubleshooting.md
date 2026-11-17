---
title: Probleme lösen
description: Häufige Probleme beim Betrieb von Wichtel nach Symptom – jeweils mit Ursache und Lösung.
---

:::tip[Auf einen Blick]

- Zuerst ins Log schauen: `docker compose logs --tail 100 app`.
- Läuft alles? `docker compose ps` und `curl -s http://127.0.0.1:3006/healthz`.
- Die meisten Probleme kommen von `PUBLIC_URL` oder vom Reverse Proxy.

:::

## Einrichtung

<details>
<summary>Der Einrichtungslink ist verloren oder „ungültig“</summary>

**Ursache:** Ohne `SETUP_TOKEN` erzeugt Wichtel bei jedem Start einen neuen Token, solange es kein
Admin-Konto gibt. Ein Link von vor einem Neustart gilt nicht mehr.

**Lösung:** Den neuesten Link aus dem Log nehmen:
`docker compose logs app | grep setup | tail -n 1`. Steht keiner (mehr) im Log, den Container neu
starten (`docker compose restart app`). Leitet `/setup` zur Anmeldung weiter, ist die Einrichtung schon
abgeschlossen. Mehr: [Einrichtungslink](/wichtel/operators/install/#einrichtungslink).

</details>

## Start

<details>
<summary>docker compose meldet „set POSTGRES_PASSWORD“ oder „set PUBLIC_URL“</summary>

**Ursache:** Die Variable fehlt in der `.env` (bzw. bei Portainer in den Umgebungsvariablen des
Stacks), oder die `.env` liegt nicht neben der `docker-compose.yml`.

**Lösung:** Beide Werte setzen und `docker compose up -d` im Verzeichnis der `docker-compose.yml`
ausführen.

</details>

<details>
<summary>Der App-Container startet immer wieder neu – Fehler zu einer Variable</summary>

**Ursache:** Wichtel prüft beim Start einige Variablen. Typische Meldungen im Log:
„SETUP_TOKEN must be at least 24 characters“, „SMTP_PORT must be an integer“,
„LOG_LEVEL must be debug, info, warn or error“, „LOG_FORMAT must be json or text“.

**Lösung:** Den Wert korrigieren (`SETUP_TOKEN` mindestens 24 Zeichen oder leer lassen) und
`docker compose up -d`. Siehe [Konfiguration](/wichtel/operators/configuration/).

</details>

<details>
<summary>Der App-Container startet immer wieder neu – „password authentication failed“</summary>

**Ursache:** `POSTGRES_PASSWORD` wurde nach dem ersten Start geändert. Die Datenbank im Volume
`postgres` behält das Passwort vom ersten Start; ein neuer Wert in der `.env` ändert es nicht.

**Lösung:** Das alte Passwort wieder eintragen – oder das Passwort in der Datenbank anpassen und dann
neu starten:

```bash
docker compose exec db psql -U wichtel -d wichtel -c "ALTER USER wichtel PASSWORD 'neues-passwort';"
docker compose up -d
```

</details>

<details>
<summary>„port is already allocated“</summary>

**Ursache:** Auf dem Host belegt schon etwas den Port `3006` (bzw. `WICHTEL_PORT`).

**Lösung:** `WICHTEL_PORT` in der `.env` auf einen freien Port setzen und den Reverse Proxy
entsprechend anpassen.

</details>

<details>
<summary>docker compose ps zeigt „unhealthy“</summary>

**Ursache:** `/healthz` antwortet nicht mit `ok` – meist ist die Datenbank nicht erreichbar
(`503 database unavailable`) oder die App hängt beim Start.

**Lösung:** `docker compose logs db` und `docker compose logs app` ansehen; läuft der Container `db`?

</details>

## Anmeldung und Formulare

<details>
<summary>Nach der Anmeldung lande ich wieder auf der Anmeldeseite</summary>

**Ursache:** `PUBLIC_URL` beginnt mit `https://`, du öffnest Wichtel aber über http. Dann setzt Wichtel
das Sitzungs-Cookie mit `Secure`, und der Browser schickt es über http nicht zurück.

**Lösung:** Wichtel über https aufrufen. Zum Testen ohne TLS eine http-`PUBLIC_URL` setzen –
siehe [Testen über http](/wichtel/operators/reverse-proxy/#sonderfälle). Hat der Browser schon
einmal HSTS für die Adresse bekommen, erzwingt er ohnehin https.

</details>

<details>
<summary>„Cross-site POST form submissions are forbidden“ (Status 403)</summary>

**Ursache:** Wichtel vergleicht die Herkunft eines Formulars mit der Adresse, die der Reverse Proxy
meldet. Passen sie nicht, wird das Formular abgelehnt. Typisch: Der Proxy schickt kein
`X-Forwarded-Proto` (dann nimmt Wichtel `https` an), gibt nicht den echten Hostnamen weiter (bei nginx
fehlt `proxy_set_header Host $host`) oder der App-Port wird ohne Proxy direkt aufgerufen.

**Lösung:** Den Proxy wie unter [Reverse Proxy](/wichtel/operators/reverse-proxy/) einrichten.

</details>

<details>
<summary>Im Log steht „client address unknown“</summary>

**Ursache:** Eine Anfrage kam ohne passendes `X-Forwarded-For` an: Der Proxy setzt den Header nicht,
jemand ruft den App-Port direkt auf, oder `XFF_DEPTH` ist größer als die Zahl der Adressen im Header.
Die Login-Begrenzung gilt dann nur noch pro Konto.

**Lösung:** Proxy prüfen; bei mehreren Proxys `XFF_DEPTH` passend setzen. Siehe
[Mehrere Proxys](/wichtel/operators/reverse-proxy/#mehrere-proxys-zum-beispiel-cloudflare).

</details>

## E-Mail

<details>
<summary>Es kommen keine Mails an</summary>

**Ursache und Lösung**, der Reihe nach:

1. **Kein Mailserver:** Steht beim Start `No mail server (SMTP_HOST)` im Log, ist `SMTP_HOST` leer.
   Dann verschickt Wichtel nichts. `SMTP_*` setzen und `docker compose up -d`.
2. **Mailserver lehnt ab:** _Verwaltung → Kommunikation → Zustellung_ → _Testmail an mich senden_
   zeigt die Antwort des Mailservers. Häufig: falsches Passwort, `SMTP_SECURE` passt nicht zum Port
   (`true` für 465, `false` für 587) oder `SMTP_FROM` ist nicht gesetzt – der Standard
   `wichtel@localhost` wird meist abgelehnt.
3. **Server nicht erreichbar:** Bricht die Testmail nach etwa 15 Sekunden ab, blockiert oft eine
   Firewall oder der Hoster den ausgehenden SMTP-Port.
4. **Im Spam:** SPF, DKIM und DMARC für die Absender-Domain einrichten.
5. **Einzelne Mails:** Unter _Zustellung_ zeigt der Verlauf, ob eine Mail verschickt wurde, wartet oder
   fehlgeschlagen ist.

Mehr: [E-Mail](/wichtel/operators/email/).

</details>

<details>
<summary>Links in E-Mails zeigen auf die falsche Adresse</summary>

**Ursache:** Links in Mails werden aus `PUBLIC_URL` gebaut.

**Lösung:** `PUBLIC_URL` auf die öffentliche Adresse setzen und `docker compose up -d`. Schon
verschickte Mails behalten die alten Links.

</details>

## Uploads, Karten und KI

<details>
<summary>Beim Hochladen kommt „413“</summary>

**Ursache:** Die Datei ist größer als erlaubt. Kommt die Meldung als nginx-Seite („413 Request Entity
Too Large“), lässt der Proxy weniger durch – nginx standardmäßig nur 1 MB. Kommt sie als
`Payload too large` von Wichtel, ist die Datei größer als 16 MB.

**Lösung:** Im Proxy 16 MB erlauben (`client_max_body_size 16m;` bei nginx,
`request_body { max_size 16MB }` bei Caddy). Dateien über 16 MB verkleinern.

</details>

<details>
<summary>Die Karte lädt nicht</summary>

**Ursache:** Eingebettete Karten laden erst, wenn jemand auf _Karte laden_ tippt. Die
Content-Security-Policy erlaubt Kartenbilder nur vom Server aus _Einstellungen → Karten →
Kartenserver (Tile-URL)_, und nur, wenn diese Adresse mit `https://` beginnt. Eine http-Adresse
oder eine zusätzliche CSP aus dem Reverse Proxy blockiert die Bilder.

**Lösung:** Eine https-Tile-URL eintragen (Standard:
`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) und keine eigene CSP im Proxy setzen. In der
Browser-Konsole stehen blockierte Adressen als CSP-Fehler. Geländeplan und Navigations-Links
funktionieren auch ohne Kartenserver.

</details>

<details>
<summary>Der KI-Connector (z. B. Claude) lässt sich nicht verbinden</summary>

**Ursache und Lösung:**

- **`PUBLIC_URL` ist nicht öffentlich oder nicht https.** Die Anmeldung (OAuth) und der Endpunkt
  `/mcp` nennen dem Assistenten Adressen aus `PUBLIC_URL`. Sie muss die öffentliche https-Adresse
  sein, und der Server muss aus dem Internet erreichbar sein – claude.ai ruft ihn von dort auf.
- **Rücksprung-Adresse nicht erlaubt.** Meldung „This redirect URI is not allowed“: Der Host des
  Assistenten fehlt unter _Einstellungen → KI-Assistenten (MCP) → Erlaubte Rücksprung-Adressen für
  KI-Assistenten_ (Standard `claude.ai` und `claude.com`; `localhost` ist immer erlaubt).
- **Der Proxy blockiert Pfade.** `/mcp`, `/oauth/…` und `/.well-known/…` müssen erreichbar sein.

Mehr: [KI-Assistenten](/wichtel/organizers/ai/).

</details>

<details>
<summary>Helfende sehen „Gerade ist sehr viel los“</summary>

**Ursache:** Sehr großer Andrang, z. B. beim Öffnen einer Buchungswelle. Wichtel weist Aufrufe der
Schichtliste nach 20 Sekunden Wartezeit ab, statt den Speicher zu überlasten.

**Lösung:** Kurz warten; künftig Wellen aufteilen oder einen schnelleren Prozessor nehmen. Siehe
[Kapazität](/wichtel/operators/capacity/).

</details>

## Siehe auch

- [Logs und Fehlermeldungen](/wichtel/operators/logs/)
- [Konfiguration](/wichtel/operators/configuration/)

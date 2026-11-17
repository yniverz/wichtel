---
title: Installation mit Portainer
description: Wichtel als Portainer-Stack einrichten, Umgebungsvariablen setzen und den Einrichtungslink finden.
---

:::tip[Auf einen Blick]

- _Stacks → Add stack_, den Inhalt von `docker-compose.yml` einfügen (oder das Repository angeben).
- Unter _Environment variables_ mindestens `POSTGRES_PASSWORD` und `PUBLIC_URL` setzen.
- Deployen; den Einrichtungslink zeigen die Logs des `app`-Containers.

:::

Die `docker-compose.yml` von Wichtel funktioniert unverändert als Portainer-Stack. Die Werte, die bei
Docker Compose in der `.env` stehen, kommen hier aus den Umgebungsvariablen des Stacks.

## Schritt für Schritt

1. In Portainer _Stacks → Add stack_ öffnen und einen Namen vergeben, z. B. `wichtel`.
2. Den Inhalt von
   [`docker-compose.yml`](https://raw.githubusercontent.com/yniverz/wichtel/main/docker-compose.yml)
   in den _Web editor_ kopieren. Alternativ _Repository_ wählen, die Repository-URL
   `https://github.com/yniverz/wichtel` eintragen und als Compose-Pfad `docker-compose.yml` angeben.
3. Unter _Environment variables_ setzen:
   - `POSTGRES_PASSWORD` – langes, zufälliges Passwort (Pflicht)
   - `PUBLIC_URL` – z. B. `https://helfen.example.de` (Pflicht)
   - optional `WICHTEL_PORT`, `WICHTEL_BIND` und die `SMTP_*`-Variablen, siehe
     [Konfiguration](/wichtel/operators/configuration/).
4. _Deploy the stack_ klicken.
5. Unter _Containers_ den Container des Dienstes `app` öffnen, _Logs_ wählen und die Zeile mit
   `setup?token=` suchen. Den Link öffnen und das erste Admin-Konto anlegen – wie bei der
   [Installation mit Docker Compose](/wichtel/operators/install/#einrichtungslink).

## Häufige Fragen

### Portainer meldet „set POSTGRES_PASSWORD“ oder „set PUBLIC_URL“.

Die Variable fehlt in den Umgebungsvariablen des Stacks. Ohne diese beiden startet der Stack nicht.

### Das Image lässt sich nicht laden (unauthorized / denied).

Falls GitHub das Image privat führt, muss der Inhaber des Repositorys es freigeben: auf GitHub unter
_Packages → wichtel → Package settings_ die Sichtbarkeit auf „Public“ stellen. Das betrifft vor
allem eigene Forks: Deren CI veröffentlicht das Image unter dem eigenen Konto
(`ghcr.io/<konto>/wichtel`); im Stack wählst du es mit `WICHTEL_IMAGE`.

### Wie aktualisiere ich?

Den Stack neu deployen und dabei das Image neu ziehen lassen (Portainer bietet dafür beim
Aktualisieren des Stacks eine Option zum erneuten Pullen). Die Migrationen laufen beim Start. Vorher sichern – siehe [Updates und Backups](/wichtel/operators/updates-backups/).

### Mein Reverse Proxy läuft auch in Portainer.

Beide Container in ein gemeinsames Docker-Netzwerk hängen und den Proxy auf den App-Container,
Port `3000`, zeigen lassen. Den App-Port nicht ins Internet freigeben. Details: [Reverse Proxy](/wichtel/operators/reverse-proxy/).

## Siehe auch

- [Konfiguration](/wichtel/operators/configuration/)
- [Probleme lösen](/wichtel/operators/troubleshooting/)

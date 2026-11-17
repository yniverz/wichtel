---
title: Privacy in operation
description: What Wichtel cleans up automatically and what the operator has to take care of – proxy logs, backups and legal texts.
---

:::tip[At a glance]

- Wichtel **cleans up by itself every six hours**: inactive accounts, IP addresses in the audit log,
  old mail copies.
- **Reverse proxy logs** contain IP addresses – you decide in the proxy how long they are kept.
- **Backups** also contain deleted data until they are rotated.
- Admins maintain the legal notice and privacy policy under _Admin → Privacy & legal notice_.

:::

## What Wichtel cleans up automatically

The cleanup runs on start and then every six hours:

- **Inactive accounts** – no sign-in and no shift – are anonymised after the configured period
  (default **24 months**). Two weeks before, the person gets an e-mail and can prevent it by signing
  in. Admin accounts are never deleted automatically.
- **IP addresses in the audit log** are removed after **90 days**; the audit log itself stays.
- **Copies of sent mails** are deleted after **30 days**, mails that failed for good after 90 days.

Admins set the periods for accounts and IP addresses under _Admin → Privacy & legal notice →
Retention_ (`0` = never). If the cleanup did something, the log shows `retention run`.

Wichtel's own logs contain no IP addresses, e-mail addresses or query parameters. Without a mail
server they contain the subject of unsent mails, and their recipient and text only with
`LOG_MAIL_BODIES=true` – see [Logs](/wichtel/en/operators/logs/).

## What you have to take care of

### Reverse proxy logs

The proxy's access logs contain IP addresses. You decide there how long they are kept. In Caddy a site
only writes an access log with a `log` directive, for example:

```
helfen.example.de {
	log {
		output file /var/log/caddy/helfen.log {
			roll_keep_for 14d
		}
	}
	# … as under Reverse proxy
}
```

### Docker logs

By default Docker keeps container logs without limit. You can limit this e.g. in a
`docker-compose.override.yml`:

```yaml
services:
  app:
    logging:
      driver: json-file
      options:
        max-size: 10m
        max-file: '5'
```

### Backups

Backups also contain data that has since been deleted or anonymised in Wichtel – until the backup
itself is rotated. Decide how long you keep backups and state that period in the privacy policy. See
[Updates and backups](/wichtel/en/operators/updates-backups/#backing-up).

### Legal notice and privacy policy

Admins maintain both under _Admin → Privacy & legal notice_. The privacy policy template marks in
square brackets the parts that depend on how you run the server and that only you know: retention of
web server logs, hosting and mail providers (processing on your behalf) and the competent supervisory
authority. As operator, you provide that information.
In detail: [Privacy for admins](/wichtel/en/organizers/privacy/).

## See also

- [Privacy for admins](/wichtel/en/organizers/privacy/)
- [Reverse proxy and HTTPS](/wichtel/en/operators/reverse-proxy/)

---
title: Logs and error messages
description: How Wichtel logs, how to filter the logs with jq, what error IDs and error e-mails are and where failed e-mails show up.
---

:::tip[At a glance]

- `docker compose logs -f app` shows the logs; in the container every line is a JSON object.
- Only warnings and errors:
  `docker compose logs -f --no-log-prefix app | jq -R 'fromjson? | select(.level != "info")'`
- If someone reports an **error ID**, the same ID is in the log and in the error e-mail to all admins.

:::

## The format

Wichtel writes one line per event to stdout (warnings and errors to stderr), in the container as JSON:

```
{"time":"2027-06-01T10:00:00.000Z","level":"info","msg":"request","method":"GET","path":"/app/shifts","status":200,"ms":12}
```

- `level` is `debug`, `info`, `warn` or `error`. `LOG_LEVEL` controls what appears (default `info`).
- With `LOG_FORMAT=text` the same line looks like this:
  `10:00:00 INFO  request method=GET path=/app/shifts status=200 ms=12`.
- **Requests** are logged without IP address and without query parameters. `path` is the route, for
  pages with an ID e.g. `/admin/editions/[id=uuid]`. Calls to `/healthz` and static files do not
  appear.
- Wichtel does not log names, passwords or tokens. Exceptions: the setup link before setup, and
  without a mail server the recipient and subject of unsent mails.

## Filtering with jq

`docker compose logs` puts the container name in front of every line; `--no-log-prefix` leaves it out
so `jq` can read the lines. `jq -R 'fromjson? | …'` skips lines that are not JSON.

```bash
# Warnings and errors, live
docker compose logs -f --no-log-prefix app | jq -R 'fromjson? | select(.level != "info")'

# Server errors (status 500 and above)
docker compose logs --no-log-prefix app | jq -R 'fromjson? | select(.status >= 500)'

# Slow requests over one second
docker compose logs --no-log-prefix app | jq -R 'fromjson? | select(.msg == "request" and .ms > 1000)'

# A specific error ID
docker compose logs --no-log-prefix app | grep 3f9a1c2b
```

## Error IDs and error e-mails

On an unexpected error, users see an error page with a short **error ID** (“Error ID for support:
3f9a1c2b”). The same ID appears

- in the log, as an `unexpected error` line with `errorId`, method, route and the stack trace under
  `err`,
- in an **e-mail to all admins** with a confirmed address, subject `[Festival name] Fehler <ID>`.

So the mails do not get out of hand, Wichtel reports the same error at most once an hour and sends at
most ten error e-mails an hour in total. Every error goes to the log. Errors in background jobs (sending
mail, reminders, cleanup) are reported the same way.

Turn off: _Admin → Settings → Operations_ → _Report errors to all admins by e-mail_ (on by default).
Without a mail server, the error e-mails only end up in the log.

## Failed e-mails

If a mail cannot be sent, the log shows

- `mail failed, will retry` (warning) – Wichtel tries again later,
- `mail failed for good` (error) – given up after six attempts.

Both lines contain the mail's ID (`mailId`), the number of attempts and the mail server's error
message, but no address. Mails that failed for good are shown on the admin _Overview_; under
_Communication → Delivery_ they can be sent again. More: [E-mail](/wichtel/en/operators/email/).

## Important messages

| Message                                                                 | Meaning                                                                                                          |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Wichtel is not set up yet. Open this link …`                           | Setup link, see [Installation](/wichtel/en/operators/install/#setup-link).                                       |
| `SETUP_TOKEN is no longer needed and can be removed`                    | Setup is done; remove `SETUP_TOKEN` from the configuration.                                                      |
| `No mail server (SMTP_HOST): …`                                         | No mail server set up, see [without a mail server](/wichtel/en/operators/email/#without-a-mail-server).          |
| `e-mail not sent (SMTP_HOST unset)`                                     | A mail that was only logged because there is no mail server.                                                     |
| `client address unknown – does the reverse proxy send X-Forwarded-For?` | The proxy does not send a matching `X-Forwarded-For`, see [Reverse proxy](/wichtel/en/operators/reverse-proxy/). |
| `server busy: requests turned away`                                     | Very heavy load, shift list requests were turned away, see [Capacity](/wichtel/en/operators/capacity/).          |
| `unexpected error`                                                      | Unexpected error with error ID.                                                                                  |
| `mail failed, will retry` / `mail failed for good`                      | Sending a mail failed, see above.                                                                                |
| `retention run`                                                         | The automatic cleanup notified or anonymised accounts, see [Privacy](/wichtel/en/operators/privacy/).            |

## See also

- [Troubleshooting](/wichtel/en/operators/troubleshooting/)
- [Configuration](/wichtel/en/operators/configuration/) – `LOG_LEVEL`, `LOG_FORMAT`

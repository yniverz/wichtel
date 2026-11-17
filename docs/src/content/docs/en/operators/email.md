---
title: E-mail
description: Set up a mail server for Wichtel, check delivery and understand what happens without a mail server.
---

:::tip[At a glance]

- Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM`, then
  run `docker compose up -d`.
- Check: _Admin → Communication → Delivery_ → _Send a test e-mail to me_ shows the mail server's
  answer right away.
- Set up **SPF, DKIM and DMARC** for the sender domain, otherwise mails end up in spam.
- **Without a mail server** no mails go out, and admins have to hand out reset links themselves.

:::

## Step by step

1. Get the credentials from your mail provider and enter them in `.env`:

   ```bash
   SMTP_HOST=mail.example.de
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=helfen@example.de
   SMTP_PASSWORD=…
   SMTP_FROM="Festival Volunteers <helfen@example.de>"
   ```

   `SMTP_SECURE=true` for port `465` (TLS from the start), `false` for port `587`. Without
   `SMTP_USER`, Wichtel does not log in to the mail server. `SMTP_FROM` must be an address the mail
   server allows as sender. Without `SMTP_FROM`, Wichtel sends as `wichtel@localhost` – almost every
   mail server rejects that, so a warning appears in the log on start (`SMTP_FROM is not set`).

2. `docker compose up -d` – the container restarts with the new values.
3. As admin open _Admin → Communication → Delivery_ and click _Send a test e-mail to me_. The mail goes
   to your own address right away, and the page shows whether the mail server accepted it – or its
   error message. Wrong credentials or a rejected sender show up immediately.
4. Set up **SPF, DKIM and DMARC** for the domain of `SMTP_FROM` (with your mail or DNS provider) so
   mails do not end up in spam.

## What Wichtel does with a mail server

- **Confirmation:** after registering, people can only sign in once the address is confirmed.
- **Only to confirmed addresses:** news and urgent calls only go to accounts whose address is
  confirmed.
- **No account probing:** if an address is already registered, Wichtel shows the same message as for a
  new account and sends the owner a password reset link instead. So nobody can find out who has an
  account.
- **Queue:** mails go through a queue that is processed every 10 seconds. If sending fails, Wichtel
  retries with growing delays (after 1, 4, 9, 16 and 25 minutes), six attempts in total. An unreachable
  mail server gives up after about 15 seconds.
- **History:** _Delivery_ lists all mails of the last 30 days with recipient, subject and status,
  searchable by recipient or subject. The mail texts are left out on purpose because they can contain
  secret links.
- **Failed for good:** mails that could not be delivered after six attempts are shown on the admin
  _Overview_ (“… e-mails could not be delivered”). Under _Delivery_ you can put them back into the
  queue with _Send again_ or _Discard_ them.

## Without a mail server

If `SMTP_HOST` is empty:

- **no mails are sent**. Instead Wichtel writes only the subject to the log
  (`e-mail not sent (SMTP_HOST unset)`); recipient address and text only with `LOG_MAIL_BODIES=true`;
- **addresses count as confirmed** without checking;
- **nobody can reset their own password**.

The admin area then shows a notice, and a warning appears in the log on start. Admins create a link on
a person's page with _Create reset link_ (valid for one hour, single use, logged in the audit log) and
hand it over personally. With a mail server they can also _Send by e-mail_ from there.

:::caution[LOG_MAIL_BODIES]
Recipient addresses and mail texts only appear in the log in development: the addresses are personal
data, and the texts contain secret links (password reset, confirmation). `LOG_MAIL_BODIES=true` in
`.env` forces both in production too – not recommended: anyone who can read the log could then take
over other people's accounts.
:::

## Common questions

### The test e-mail works, but other mails do not arrive.

Check the spam folder and SPF, DKIM and DMARC. Under _Delivery_ the status shows whether the mail was
sent, is still waiting or failed.

### Where do I see why a mail failed?

_Delivery_ shows the mail server's last error message. In the log, failures appear as
`mail failed, will retry` or `mail failed for good` with the mail's ID.
See [Logs](/wichtel/en/operators/logs/#failed-e-mails).

## See also

- [E-mail templates and sending for admins](/wichtel/en/organizers/mail/)
- [Configuration](/wichtel/en/operators/configuration/)
- [Troubleshooting](/wichtel/en/operators/troubleshooting/)

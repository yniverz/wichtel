---
title: E-mails and delivery
description: Adjust the texts of automatic e-mails, use placeholders and check under Delivery whether all e-mails arrive.
---

:::tip[At a glance]

- **Adjust texts:** _Admin → Communication → Email templates_ → expand a template → edit German and
  English separately.
- **Placeholders** such as `{name}` or `{shift}` are filled in by Wichtel when sending.
- **Back to the original:** _Restore default_.
- **Does everything arrive?** _Admin → Communication → Delivery_: _Send a test e-mail to me_, _Send
  again_ or _Discard_ stuck e-mails, history of the last 30 days.

:::

## Adjusting templates

1. Open _Email templates_.
2. Expand a template, e.g. _Reminder_. You see the German and the English version side by side.
3. Change _Subject_ and _Text_ and save that version.
4. Customised templates carry the badge _customised_. With _Restore default_, the built-in text
   applies again.

Every person gets the version in their own language. If you only adjust the German version,
English-speaking volunteers keep getting the English default text – remember both.

Wichtel sends e-mails as plain text; links become clickable and are shown in the primary colour. Blank
lines separate paragraphs.

## Placeholders

These placeholders exist in all templates about shifts:

| Placeholder  | Replaced by                                                                          |
| ------------ | ------------------------------------------------------------------------------------ |
| `{name}`     | first name of the recipient                                                          |
| `{festival}` | festival name from the [settings](/wichtel/en/organizers/settings/)                  |
| `{shift}`    | title of the shift                                                                   |
| `{date}`     | day of the shift, written out                                                        |
| `{time}`     | time from–to                                                                         |
| `{location}` | location and meeting point with map link, each on its own line (empty if nothing is set) |
| `{link}`     | link into the app                                                                    |

Some templates have additional placeholders. The page shows them when you expand the template under
“Also available in this template”:

| Template                              | Additionally                                            |
| ------------------------------------- | ------------------------------------------------------- |
| _Place reserved by group_             | `{person}` (who reserved), `{until}` (until when)       |
| _Shift offered (direct)_              | `{person}`                                              |
| _Swap suggested_                      | `{person}`, `{given}`                                   |
| _Handover waiting for a lead_         | `{person}`                                              |
| _Shift taken over_                    | `{person}`                                              |
| _Handover declined_                   | `{person}`                                              |
| _Urgent call_                         | `{position}`, `{free}` (free places), `{bonus}`, `{note}` |
| _Account deleted for inactivity_      | `{months}`; `{date}` is the day of deletion here        |

The two account templates (_Account deleted for inactivity_ and _E-mail address changed by the
organisers (to the old address)_) are not about a shift – `{shift}`, `{time}` and `{location}` would
appear there literally as text in the e-mail. The same happens with a misspelt placeholder. After
changes, best sign yourself up for a shift as a test and read the e-mail.

### All templates

_Booking confirmed_, _Request received_, _Request approved_, _Request declined_, _Added by a lead_,
_Removed by a lead_, _Shift changed_, _Shift cancelled_, _Reminder_, _Moved up from waiting list_,
_Place reserved by group_, _Reservation expired_, _Shift offered (direct)_, _Swap suggested_,
_Handover waiting for a lead_, _Shift taken over_, _Handover declined_, _Urgent call_, _Account
deleted for inactivity_, _E-mail address changed by the organisers (to the old address)_.

The e-mails for confirming an address and resetting a password cannot be adjusted. E-mails about
[news](/wichtel/en/leads/news/) contain the text of the news post.

The templates apply to the whole installation, i.e. to all editions.

## Checking delivery

Under _Delivery_ (page title _E-mail delivery_) you see whether e-mails go out.

### Send a test e-mail to me

Sends a short e-mail to your own address right away and shows the mail server's answer. This tells you
immediately whether sending works. If the mail server accepted it but it does not arrive, check the
spam folder.

### Stuck and failed e-mails

Wichtel sends e-mails through a queue. If sending fails, Wichtel tries six times with growing gaps.
The list shows e-mails with _Retry scheduled_ and those it _gave up_ on, each with the error message.

- _Send again_ – the selected e-mails go back into the queue right away and the attempts start over.
  Useful once the problem (e.g. a wrong mail server password) is fixed.
- _Discard_ – the selected e-mails are deleted and never sent.

### History

Below is the _History_ of all e-mails of the last 30 days with recipient, subject and state (_sent_,
_waiting_, _retry planned_, _failed_), searchable by recipient or subject. This answers the question
“Did I get an e-mail?”. Wichtel does not show the texts themselves because they can contain secret
links.

Wichtel deletes sent e-mails after 30 days and e-mails that failed for good after 90 days.

## Without a mail server

If no mail server is set up on the server, the _Delivery_ page shows a notice. Then:

- Wichtel sends no e-mails – no reminders or notifications either.
- E-mail addresses count as confirmed without confirmation.
- Nobody can reset their password themselves. Admins create a reset link on the person's page and pass
  it on personally (see [People](/wichtel/en/organizers/people/)).

The mail server is set up by whoever runs the server: [Setting up e-mail](/wichtel/en/operators/email/).

## See also

- [Booking rules](/wichtel/en/organizers/booking-rules/) – when reminders are sent
- [E-mails (for volunteers)](/wichtel/en/helpers/emails/)
- [Setting up e-mail (operations)](/wichtel/en/operators/email/)

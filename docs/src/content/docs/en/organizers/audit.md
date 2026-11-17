---
title: Audit log
description: What the audit log records, how to read it, how to spot changes made by AI assistants and when IP addresses are removed.
---

:::tip[At a glance]

- **Open:** _Audit log_ in the admin area (group _System_).
- Each line: **what** happened, **who** did it and **when** – newest first.
- Expanding _Details_ shows exactly what changed.
- Changes made by AI assistants carry the marker `via: "MCP: …"` in the details.
- IP addresses are removed after a period (default 90 days); the entries stay.

:::

## Step by step

1. Open _Audit log_.
2. Read the entries from top to bottom: action, person (or _System_), time.
3. If there is a reason – for example for a points correction – it appears below the line.
4. Tap _Details_ to see the changed values (before/after).
5. For earlier entries, tap _Older entries_ at the very bottom. One page shows 100 entries.

:::note
The audit log has no search and no filters. To find a particular change, page back to the matching
period.
:::

## What is recorded?

All actions that change something, for example:

- **Structure:** editions (create, copy, make current, archive), areas, places, site plan, roles and
  role assignments, profile fields, settings (including _Privacy & legal notice_).
- **Planning:** shifts and series, booking waves, urgent calls.
- **Staffing:** adding and removing people, deciding requests, attendance, moving up from the waiting
  list, handovers and swaps, groups.
- **Points and goodies:** creating, handing out, cancelling and refunding goodies; points
  corrections.
- **People:** changing account details, confirming an address by hand, reset links, admin rights,
  data exports, deleting accounts, qualifications.
- **Communication:** news, e-mail templates, e-mails sent again or discarded.
- **AI assistants:** connected, disconnected.

Sign-ins and merely looking at things are not recorded – with one exception: downloading a data
export is recorded.

## Common questions

### Who may see the audit log?

Admins see all entries. Whoever has a role with _View audit log_ for the _Whole edition_ sees the
entries of the edition selected in the _Edition_ switch at the top – without entries that belong to no
edition, such as settings or admin rights. [Roles and permissions](/wichtel/en/organizers/roles/)

### How do I spot changes made by an AI assistant?

The person shown is whoever connected the assistant – it acts in their name. In the _Details_ there is
also `via` with `MCP:` and the name of the app, e.g. `"via": "MCP: Claude"`.
[AI assistants](/wichtel/en/organizers/ai/)

### What does "System" mean?

Wichtel triggered the action itself, without anyone signed in – for example the automatic deletion
of inactive accounts.

### Can entries be changed or deleted?

No, not in the interface. Only when an account is deleted do entries **about** this person lose their
details and IP addresses, and entries they triggered themselves lose their IP addresses. The person is
then shown as "Deleted account". That something happened stays visible.

## Special cases

<details>
<summary>When are IP addresses removed?</summary>

For every action by a person, Wichtel stores the IP address it came from. It is not shown in the audit
log. After the period _Remove IP addresses from the log after (days)_ under _Privacy & legal notice_ →
_Retention_, Wichtel removes them automatically; out of the box after 90 days. The audit log itself is
kept. [Privacy & legal notice](/wichtel/en/organizers/privacy/)

</details>

<details>
<summary>Why do some changes show no values?</summary>

For changed account details, the audit log only names **which** fields changed, not the old or new
values – so that no personal data ends up in the log.

</details>

## See also

- [Privacy & legal notice](/wichtel/en/organizers/privacy/)
- [AI assistants](/wichtel/en/organizers/ai/)

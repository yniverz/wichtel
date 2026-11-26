---
title: Connecting Claude as an AI assistant
description: Connect Claude to Wichtel – via claude.ai, the Claude app or Claude Code –, read only or also change, and disconnect again.
---

:::tip[At a glance]

- **Requirement:** your role in the current edition has the permission _Connect an AI assistant (e.g.
  Claude) with one’s own permissions_.
- **Instructions and address:** in the app under _Profile_ → _Connect Claude_.
- When connecting you choose _Read and change_ or _Read only_.
- Claude has **exactly your permissions**, never more. Consequential actions are shown as a preview
  first.
- **Disconnect:** _Profile_ → _Connected apps_ → _Disconnect_.

:::

With a connected assistant you can write, for example: “Which shifts on Saturday are understaffed?”
or “Create three teardown shifts on Saturday from 10 to 14 with 6 places each.”

## Step by step

1. Open your _Profile_ in the volunteer view. If your role has the permission, you find the section
   _Connect Claude_ with the _Connector address_ (it ends in `/mcp`). Copy it with _Copy link_.
2. Connect Claude – depending on what you use:
   - **claude.ai or the Claude app:** _Settings_ → _Connectors_ → “Add custom connector”. Enter the
     address, save, then choose _Connect_.
   - **Claude Code:** run the command from your profile
     (`claude mcp add --transport http wichtel …/mcp`), then sign in within Claude Code with `/mcp`.
3. You come to Wichtel. Log in if needed.
4. On the _Allow access_ page you see which app wants access and where the access code goes. Only
   allow it if you just started the connection yourself.
5. Under _What may the connection do?_ choose:
   - _Read and change_ – e.g. create shifts or sign people up, as far as your role allows.
   - _Read only_ – see plans, staffing and requests, change nothing.
6. Tap _Allow_.

The connection is valid for 90 days. After that you connect again.

## What the assistant may do

- **Reading** always works: editions, areas, places, qualifications, shifts with staffing, the
  overview, open requests and searching for people – each only what you may see yourself.
- **Changing** only works with _Read and change_, only for the tasks the admins have enabled for
  assistants, and only as far as your role allows. Possible are:
  - Planning shifts: create a shift or a series, change, delete,
  - Staffing: add and remove people, decide requests and handovers, start and end urgent calls,
  - Creating, changing and deleting areas, places and booking waves,
  - Publishing news (also by e-mail), correcting and deleting it,
  - Crediting or deducting points,
  - Managing people, qualifications and profile fields, giving roles,
  - Managing goodies and handing them out at the desk,
  - Editions, settings, legal texts and e-mail templates (admins only),
  - for yourself: booking, cancelling and swapping shifts, group, goodies, profile.

  Everything from “news” on is initially blocked for assistants until the admins enable it.

- Never possible: making someone an administrator, deleting accounts, password links, changing
  e-mail addresses or passwords, and the AI assistant settings themselves.

Whether an assistant sees names and contact details, only names, or pseudonyms such as “Person
4F2A9C” is set by the admins. What the assistant sees is processed by its provider.

## Preview and confirmation

Actions with a big effect – creating a series, deleting a shift, an urgent call, a news post – are
not carried out by the assistant straight away. It first gets a preview (e.g. how many shifts would
be created or how many people a post reaches) and is meant to ask you. Only once you agree is the
action carried out.

Every change made through the assistant is recorded in the audit log, marked “MCP” with the name of
the app.

## Disconnecting

1. Open your _Profile_ → _Connect Claude_ → _Connected apps_. Each connection is listed there with
   _Read and change_ or _Read only_, “valid until …” and “last used …”.
2. Tap _Disconnect_ and confirm. Access stops immediately.

If you change or reset your password, all connections are disconnected.

## Common questions

### I don't see “Connect Claude” in my profile

Your role in the current edition does not have the permission. When connecting, you then see “Your
role does not allow AI access. Ask the admins if you need it.” Contact the admins.

### What happens if I lose my role?

Wichtel checks on every request whether you still have the permission. Without it, the connection
stops working.

### Can I connect an assistant other than Claude?

Only if the admins have allowed its address. Ask them.

## See also

- [Setting up AI assistants (for admins)](/wichtel/en/organizers/ai/)
- [Which permissions exist](/wichtel/en/reference/permissions/)

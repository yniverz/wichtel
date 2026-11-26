---
title: Enabling AI assistants
description: Give roles the permission for AI assistants such as Claude and decide what assistants may change and which personal data they see.
---

:::tip[At a glance]

- **1. Grant the permission:** under _Roles_, give the permission _Connect an AI assistant_ to the
  roles that should use it. Admins always have it.
- **2. Configure:** _Settings_ → _AI assistants (MCP)_ – what assistants may change, which personal
  data they see, which apps may connect.
- **3. Server:** Wichtel must be reachable at a public https address.
- An assistant **never has more permissions** than the person who connects it. Every change is
  recorded in the audit log.

:::

## Step by step

### 1. Granting the permission

1. Open _Roles_ and the role that should use AI assistants, e.g. _Area lead_.
2. Under _Structure & overview_, tick _Connect an AI assistant (e.g. Claude) with one’s own
   permissions_ → _Save_.

Of the role templates, only _Festival lead_ has this permission out of the box (in installations set
up with an older version, not even that one). It only counts if the role is assigned in the
**current** edition.
[Roles and permissions](/wichtel/en/organizers/roles/)

### 2. Checking the settings

Under _Settings_ → _AI assistants (MCP)_:

**What assistants may change.** Reading is always possible. Changing only in the ticked groups – and
even then only as far as the person may do it themselves:

| Group                             | What the assistant may then do                                                                    | Default |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | ------- |
| _Plan shifts_                     | Create, change and delete shifts and series                                                       | on      |
| _Staffing_                        | Sign people up or off, decide requests and handovers, urgent calls, attendance                    | on      |
| _Areas, places and booking waves_ | Create, change and delete areas, places and booking waves, choose the volunteer desk              | on      |
| _News & group e-mails_            | Publish news (also by e-mail), correct and delete it                                              | off     |
| _Points_                          | Add or remove points manually                                                                     | off     |
| _People & qualifications_         | Correct names, phone numbers and profile answers, confirm addresses, manage qualifications/fields | off     |
| _Roles_                           | Create, change and delete roles, give them to people and take them away                           | off     |
| _Goodies & desk_                  | Manage goodies, hand them out at the desk, cancel picks, confirm returns                          | off     |
| _Editions_                        | Create, copy, change and archive editions, make one current                                       | off     |
| _Settings, legal texts & e-mails_ | Change settings and legal texts, edit e-mail templates, retry failed e-mails                      | off     |
| _Own shifts & profile_            | For the person themself: book, cancel and swap shifts, group, goodies, profile                    | off     |

Defining roles, editions, settings, legal texts, e-mail templates and other people's profiles stay
reserved for administrators, also through an assistant.

Never possible, whatever is ticked: making someone an administrator, deleting accounts, creating password links, changing e-mail addresses or passwords, and the AI assistant settings themselves. Images (logo, site plan) and proof documents are uploaded in Wichtel itself.

**Personal data for assistants.** What an assistant sees is processed by its provider (e.g.
Anthropic). Choose:

- _Names and contact details (where the person may see them)_,
- _Names only, no phone numbers or e-mail addresses_ (default),
- _Pseudonyms instead of names (“Person 4F2A9C”)_. Signing people up also works this way.

**Allowed return addresses for AI assistants.** Only apps that return to one of these addresses after
sign-in can connect. One host per line, sub-domains included. Out of the box the list holds
`claude.ai` and `claude.com`. Apps on the same machine (`localhost`, e.g. Claude Code) are always
allowed. For other assistants, add their host here.

Finally _Save_. The settings apply immediately, also to assistants already connected.

### 3. Checking the server

The address in `PUBLIC_URL` must be Wichtel's public https address, and the server must be reachable
from the internet – claude.ai calls it from there. This is set up by whoever runs the server.
[Configuration](/wichtel/en/operators/configuration/)

## Common questions

### How do leads then connect Claude?

In their own profile under _Connect Claude_ they find the address and instructions. The person chooses
"Read and change" or "Read only" themselves. [Using an AI assistant](/wichtel/en/leads/ai/)

### How do I see what an assistant changed?

The [audit log](/wichtel/en/organizers/audit/) shows the person who connected the assistant. In the
_Details_ there is also `via` with `MCP:` and the name of the app. Connecting and disconnecting an
assistant is recorded as well.

### How do I switch it off again?

Remove the permission _Connect an AI assistant_ from the roles. From the next request on, Wichtel
rejects these people's assistants. Admins always keep the permission. If you only want to prevent
changes, untick everything under _What assistants may change_.

### Do I need to adapt the privacy policy?

Yes. The template under _Privacy & legal notice_ mentions AI assistants as soon as a role has the
permission, and takes the personal data setting into account. Insert it again afterwards or extend the
text by hand. [Privacy & legal notice](/wichtel/en/organizers/privacy/)

## Special cases

<details>
<summary>When is a connection ended?</summary>

A connection is valid for 90 days. The person can disconnect it in their profile at any time. If
someone changes or resets their password, Wichtel ends all of that person's AI connections. On every
request Wichtel checks whether the person still has the permission.

</details>

## Background

Wichtel speaks the open protocol MCP (Model Context Protocol). An assistant always works in the name of
a signed-in person and with exactly their permissions. Unless told otherwise, it works in the current
edition.

## See also

- [Using an AI assistant (for leads)](/wichtel/en/leads/ai/)
- [Roles and permissions](/wichtel/en/organizers/roles/)

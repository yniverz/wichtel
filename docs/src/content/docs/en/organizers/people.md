---
title: Managing people
description: Search accounts, correct details, confirm addresses, create reset links, appoint admins and handle data protection requests.
---

:::tip[At a glance]

- **Search:** _People_ → enter a name or email → open the person.
- **Correct details:** _Edit details_ – name, e-mail, mobile number, language and details.
- **Confirmation e-mail does not arrive:** _Mark as confirmed_ – only if the address surely belongs to
  the person.
- **Forgotten password:** _Reset password_ → _Create reset link_ → hand it over in person or _Send by
  e-mail_.
- What is described here is for admins only. What leads do on this page is described in
  [People (for leads)](/wichtel/en/leads/people/).

:::

## Step by step

### Finding a person

Open _People_ and enter part of the name or e-mail address. The list shows all accounts of the
instance, with the badge _Admin_ or _unconfirmed_ where it applies. Tap a person to open their page.

A person's page shows their shifts and roles in the selected edition, their contact details, their
_Details_ from the profile fields and their qualifications.

### Correcting details

1. On the person's page, tap _Edit details_.
2. Under _Personal details_, change _First name_, _Last name_, _Email address_, _Mobile number_ or
   _Language_ → _Save_.
3. Below, under _Details_, change the profile fields → _Save_.

If the e-mail address changes, the new one counts as confirmed right away. The old address is told,
and links already sent to it stop working. If there already is an account for the new address,
Wichtel refuses the change.

You cannot set the password – the person does that themselves with a reset link.

### Marking an address as confirmed

If a person shows _unconfirmed_, they have not opened the link from the confirmation e-mail. If the
e-mail does not arrive (spam folder, strict mail server), tap _Mark as confirmed_ and confirm. Open
confirmation links then stop working.

:::caution
Only do this if you are sure the address belongs to the person – for example because they are
standing in front of you. Otherwise someone could use an account with somebody else's address.
:::

### Creating a reset link

1. On the person's page, under _Reset password_, tap _Create reset link_.
2. Copy the link with _Copy link_ and hand it over in person – or send it to the person's address with
   _Send by e-mail_. Do not share it in group chats.

The link is valid for one hour and works once. A new link invalidates the old one. When the person
opens it and sets a new password, their address also counts as confirmed.

### Making someone admin

Under _Instance admin_, tap _Make admin_ and confirm. _Revoke admin_ takes it back. There must always
be at least one admin.

:::caution
Admins may do everything: settings, editions, roles, other admins and all data. For lead tasks, a
[role](/wichtel/en/organizers/roles/) is almost always enough.
:::

### Correcting a person's points

On the person's page, under _Points_, tap _Open desk_. There you correct points under _Correct
points_ with a reason. [Desk & check-in](/wichtel/en/leads/desk/) ·
[Point rules](/wichtel/en/organizers/points/)

### Data export and deletion on request

Under _Data protection_ on the person's page:

- _Download data export_ gives you a file with everything Wichtel stores about the person.
- _Delete account_ removes the personal data and cancels upcoming shifts. This cannot be undone.

When and how is described in [Privacy & legal notice](/wichtel/en/organizers/privacy/).

## Common questions

### Without a mail server – how do people get into their account?

Without a mail server, new accounts count as confirmed right away, but nobody can reset their
password themselves. Create a reset link and hand it over in person; _Send by e-mail_ is not
available in that case.

### Can I delete my own account here?

No. You delete your own account in your profile under _My data_.
[My data](/wichtel/en/helpers/privacy/)

### Do leads see the same page?

Leads with _Assign roles_ or _View volunteer contact details_ open the same page but only see what
their permissions allow. Editing, confirming, resetting, admin rights and data protection are
reserved for admins.

## Special cases

<details>
<summary>What does the audit log record?</summary>

Each of these actions is recorded in the [audit log](/wichtel/en/organizers/audit/): changed account
details (only which fields, not the values), addresses confirmed by hand, reset links created and
sent, admin rights granted and revoked, data exports and deleted accounts.

</details>

<details>
<summary>Which profile fields can I edit?</summary>

Those asked at sign-up or in the profile. Fields that are only asked when choosing certain goodies do
not appear here. [Profile fields](/wichtel/en/organizers/fields/)

</details>

## See also

- [Roles and permissions](/wichtel/en/organizers/roles/)
- [Privacy & legal notice](/wichtel/en/organizers/privacy/)
- [E-mails](/wichtel/en/organizers/mail/)

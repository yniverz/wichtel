---
title: Privacy & legal notice
description: Maintain the legal notice and privacy policy in Wichtel, set retention periods and handle requests for data access and deletion.
---

:::tip[At a glance]

- **Everything under** _Privacy & legal notice_ (group _System_), admins only.
- **Legal notice:** fill in _Name and legal form_ and _Postal address_ – then it appears.
- **Privacy policy:** _Insert template_, complete every part in [square brackets], save.
- **Retention:** inactive accounts after 24 months, IP addresses in the audit log after 90 days (out of
  the box).
- The template is **not legal advice**. Have the text checked if in doubt.

:::

## Step by step

### The legal notice

1. Open _Privacy & legal notice_.
2. Under _Operator and legal notice_, fill in:
   - _Name and legal form_, as registered, e.g. "Kulturverein Beispiel e. V.",
   - _Postal address (no P.O. box)_,
   - optional _Represented by_ (for associations, the board members authorised to represent it, with
     their role),
   - _E-mail address_ and _Phone_ – besides e-mail, a second fast way to get in touch is required,
   - if applicable _Register entry_ and _VAT ID_,
   - optional _Further details_ in German and English.
3. _Save_ at the very bottom.

As soon as name and address are filled in, the legal notice appears as its own page and is linked in
the footer.

### The privacy policy

1. First fill in the legal notice, enter the _Data protection officer_ under _Privacy policy_ if you
   have appointed one, check the _Retention_ periods and tap _Save_. The template only uses saved
   details.
2. Under _Text (German)_, tap _Insert template_, and likewise under _Text (English)_.
3. Complete every part in [square brackets]. Below the text you see how many are still open.
4. _Save_.

As soon as a text is saved, the privacy policy appears as its own page and is linked in the footer and
at sign-up.

The template fits your installation: it knows your profile fields, the retention periods, the map
service, whether a mail server is set up, whether there are qualifications and whether roles may use
AI assistants.

:::caution
_Insert template_ replaces the current text (after asking). If you have already adapted the text,
better carry changes over by hand.
:::

### Linking to your own pages instead

If you already have a legal notice and privacy policy on your festival website, enter the _Legal
notice link_ and the _Privacy policy link_ under _External pages_. These links only apply while nothing
is entered above.

## Retention

Wichtel cleans up automatically. Under _Retention_ you set:

| Field                                           | Default | Meaning                                                                                                                   |
| ----------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| _Delete inactive accounts after (months)_       | 24      | Accounts without sign-in and without a shift are anonymised. An e-mail goes out two weeks before. 0 = never.              |
| _Remove IP addresses from the log after (days)_ | 90      | After that, Wichtel removes the IP addresses from the [audit log](/wichtel/en/organizers/audit/). The log itself is kept. |

Admins are never deleted automatically.

<details>
<summary>When does an account count as inactive?</summary>

Counting starts from the latest of these: last visit to Wichtel, sign-up, end of the last shift
(cancelled and rejected ones do not count). Two weeks before the period ends, the person gets an
e-mail with the deletion date and a sign-in link – but only if their address is confirmed. If they sign
in before then, the account stays. Otherwise it is anonymised, at the earliest 14 days after the
warning. You adapt the text of the warning under [Email templates](/wichtel/en/organizers/mail/).

</details>

## Requests for access and deletion

Volunteers can do both themselves: under _My data_ they download their data and delete their account
([My data](/wichtel/en/helpers/privacy/)). If a request comes by e-mail or letter:

1. Check that the request really comes from the person.
2. Open them under _People_.
3. Under _Data protection_:
   - **Access:** _Download data export_ – a file with profile, details, shifts, points, goodies,
     qualifications, groups, roles, AI connections, sign-ins and the audit log entries about the
     person. Passwords and secret links are not included.
   - **Deletion:** _Delete account_ → confirm.
   - **Correction:** _Edit details_. [Managing people](/wichtel/en/organizers/people/)

Both are recorded in the [audit log](/wichtel/en/organizers/audit/).

<details>
<summary>What happens when an account is deleted?</summary>

- Name, e-mail, phone, profile field details, qualifications including uploaded proofs, roles, group
  memberships, sign-ins and AI connections are deleted.
- Upcoming shifts are cancelled; the waiting list moves up. Open handovers are withdrawn, chosen goodies
  not yet handed out are cancelled.
- Past shifts, points and handed-out goodies stay without a name for the statistics – as "Deleted
  account".
- This cannot be undone. The last admin account cannot be deleted, and you delete your own account in
  your profile.

</details>

## Common questions

### Is the template legally watertight?

It is carefully written but is not legal advice. Complete every part in [square brackets] and have the
text checked if in doubt.

### I changed the retention period – is the privacy policy still right?

Not automatically. Save first and insert the template again, or adjust the number in the text by hand.
The same applies if you change profile fields, maps or AI assistants.

### Do I have to fill in both languages?

If the English text is missing, people using English see the German one – and vice versa. Better
maintain both.

### What do the people running the server need to consider?

That is covered in [Privacy in operation](/wichtel/en/operators/privacy/).

## See also

- [Audit log](/wichtel/en/organizers/audit/)
- [Managing people](/wichtel/en/organizers/people/)
- [My data (for volunteers)](/wichtel/en/helpers/privacy/)

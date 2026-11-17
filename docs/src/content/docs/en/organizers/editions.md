---
title: Editions
description: Create festival years, switch the current edition, archive old years and copy an edition with all its times.
---

:::tip[At a glance]

- An **edition** is one festival year with its own areas, shifts, points and goodies.
- **Preparing next year:** _Editions_ → _Copy edition_ → choose the template and the new first day →
  _Create copy_.
- **Volunteers always see the current edition.** Switch it with _Make current edition_.
- The _Edition_ switch at the top of the admin area only changes what **you** are working on.
- Only admins manage editions.

:::

## Step by step

### Copying an edition (the usual way)

1. Open _Editions_ and tap _Copy edition_.
2. Under _Template_, choose the edition to take over.
3. Enter a _Name_, e.g. "Festival 2027", and the _New first day_. The end follows from the length of
   the template.
4. Under _What should come along?_, tick what to take over (see below).
5. Tap _Create copy_.
6. Select the new edition in the _Edition_ switch at the top and check it.
7. When everything is right: _Editions_ → next to the new edition _Make current edition_.

:::tip
Choose the same weekday as last year for the new first day. Then all shifts land on the same
weekdays again – the copy moves everything by whole days.
:::

### Creating an empty edition

_Editions_ → _New edition_ → _Name_, _Start (incl. setup)_ and _End (incl. teardown)_ → _Create_. The
new edition is empty; you create areas and everything else from scratch. If there is no current
edition yet, the new one automatically becomes current.

### Switching the current edition

_Editions_ → next to the edition you want, _Make current edition_ → confirm. From now on all
volunteers see this edition: its shifts, points, goodies and news. There is never more than one
current edition.

### Working on another edition in the admin area

At the top of the sidebar (on a phone under _Menu_), choose another edition in the _Edition_ switch.
This only applies to you and your browser; volunteers notice nothing. This way you can prepare next
year while the current one is still running.

Admins see all editions in the switch. Leads only see the editions that are not archived and in which
they have a role – so they cannot lock themselves out by accident.

### Archiving an edition

_Editions_ → edition → _Edit_ → _Archive_. _Restore_ undoes it.

If it is the **current** edition, a warning appears above the button and the confirmation repeats it:
afterwards there is no current edition any more, and volunteers only see “There is no volunteer
season running right now”. If things go on, make the new edition current first.

## What is copied?

| What                                             | Copied                       |
| ------------------------------------------------ | ---------------------------- |
| Areas with their deadline and point rules        | **always**                   |
| _Places, site plan and volunteer desk_           | if ticked                    |
| _Shifts with positions_                          | if ticked, times moved       |
| _Goodies_                                        | if ticked                    |
| _Role assignments (leads)_                       | if ticked, on the same areas |
| _Booking waves (with new invite links)_          | if ticked, times moved       |
| Bookings, points, handed-out goodies             | **never**                    |
| Profile fields, qualifications, e-mail templates | apply to all editions anyway |

## Common questions

### How are the times moved?

By as many whole days as lie between the old and the new first day. The time of day stays the same –
a shift at 18:00 also starts at 18:00 in the new year, even if daylight saving time changes in
between.

### Do I have to appoint the leads again?

Only if you did not tick _Role assignments (leads)_. Roles always apply to one edition: whoever was
area lead last year is only lead in the new one through the copy or a new assignment.
[Roles and permissions](/wichtel/en/organizers/roles/)

### What happens to the volunteers' accounts?

Nothing. Accounts apply to all editions; volunteers sign in to the new year with the same account.
Points, however, only count within their edition.

### Can I change the start and end later?

Yes, under _Editions_ → edition → _Edit_. This only changes the edition's dates; it does not move
existing shifts.

## Special cases

<details>
<summary>What exactly does archiving do?</summary>

An archived edition is no longer the current one, and roles in that edition no longer give any
permissions – so former leads keep nothing. Admins still see the edition in the _Edition_ switch.

If you archive the **current** edition, there is no current edition afterwards – the page warns you
about this. Volunteers then only see a note that no volunteer season is running. That is fine once
the season is over; if things go on, first make the new edition current, then archive the old one.
_Restore_ does not make an edition current again; use _Make current edition_ for that.

</details>

<details>
<summary>What happens to places, goodies and waves if I do not tick everything?</summary>

- **Goodies without places:** a goodie loses its pickup place if places are not copied. The volunteer
  desk then applies, as soon as you set it in the new edition.
- **Shifts without places:** the links to places with a pin are dropped; free-text details remain.
- **Waves:** each copied wave gets a new invite link. Anyone invited by link last year needs a new
  invitation.
- **Urgent calls** and **news** are never copied.

</details>

## Background

Almost everything in Wichtel belongs to exactly one edition: areas, shifts, bookings, points,
goodies, waves, places, news and role assignments. Shared by all editions are the accounts, the roles
themselves (which permissions a role bundles), profile fields, qualifications, e-mail templates and
the settings. Every change to editions is recorded in the [audit log](/wichtel/en/organizers/audit/).

## See also

- [Areas](/wichtel/en/organizers/areas/)
- [Booking waves](/wichtel/en/organizers/waves/)
- [Glossary](/wichtel/en/reference/glossary/)

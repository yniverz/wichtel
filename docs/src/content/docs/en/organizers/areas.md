---
title: Areas
description: Build the structure of the festival as a tree – create, nest, move and delete areas, and which rules areas override.
---

:::tip[At a glance]

- **Create:** _Areas_ → _New area_; a sub-area with _+ Sub-area_ in the list.
- **Any depth:** e.g. working group → area → team. Whatever applies to an area also applies to all
  its sub-areas – roles, deadlines, points.
- **Move:** edit the area → change _Located in_.
- **Delete** only works without sub-areas and without shifts.
- Areas belong to one edition and are always included when copying.

:::

## Step by step

### Creating an area

1. Open _Areas_ and tap _New area_ – or, in the list next to the parent area, _+ Sub-area_.
2. Under _Located in_, choose where the area belongs (_Top level_ or another area).
3. Enter the _Name (German)_, ideally also the _Name (English)_. If it is missing, the list shows
   _English missing_.
4. Optional: a _Description_ and the _Order_ (lower numbers come first).
5. Leave the rules empty if the area should take over the defaults (see below).
6. Tap _Create_.

### Moving an area

Area → _Edit_ → under _Located in_, choose the new parent area → _Save_. All sub-areas and shifts move
along. An area cannot be placed below itself or one of its sub-areas.

### Deleting an area

Area → _Edit_ → _Delete_ → confirm. All sub-areas must have been moved or deleted first, and there
must be no shifts left in the area.

:::caution
Role assignments on this area disappear along with it. This cannot be undone.
:::

## What areas override

Every area can change the defaults from _Settings_. **Empty** means: as the parent area, and at the
top as the settings.

| Field                            | Meaning                                                              | More                                                   |
| -------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------ |
| _Cancellation deadline (hours)_  | Up to how many hours before the start volunteers can cancel themselves | [Booking rules](/wichtel/en/organizers/booking-rules/) |
| _Approve late handovers_         | _as parent_, _yes, a lead approves_ or _no, immediately_             | [Booking rules](/wichtel/en/organizers/booking-rules/) |
| _Points per shift_               | Base points for every shift in the area                              | [Point rules](/wichtel/en/organizers/points/)          |
| _Points per hour_                | Points per shift hour in the area                                    | [Point rules](/wichtel/en/organizers/points/)          |

The closest setting always wins: for the deadline first the shift's, then the area's, then the parent
areas', and finally the setting. For points, the position's comes first in the same way.

## Common questions

### Who may create areas?

Admins and everyone with the permission _Create and edit areas_. With a role for an area you create
sub-areas in it and edit it; top-level areas need the permission for the whole edition.
[Roles and permissions](/wichtel/en/organizers/roles/)

### How deep should I nest?

As deep as you share out responsibility. An area is worth it if it needs its own lead, its own rules
or its own filter for volunteers.

### Can I see who leads an area?

Yes. On the area's page, _Roles here_ shows everyone with a role on exactly this area.

## Background

Roles on an area apply to it and all its sub-areas. An area lead for "Bar" can therefore also plan
"Bar → Cocktails", but not "Awareness". That is why the tree is the backbone of permissions. Every
change (create, edit, move, delete) is recorded in the [audit log](/wichtel/en/organizers/audit/).

## See also

- [Roles and permissions](/wichtel/en/organizers/roles/)
- [Editions](/wichtel/en/organizers/editions/)
- [Glossary](/wichtel/en/reference/glossary/)

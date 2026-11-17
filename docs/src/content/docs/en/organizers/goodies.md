---
title: Setting up goodies
description: Create rewards volunteers trade their points for – with price, options, contingent, pickup place and mandatory goodies such as the free ticket.
---

:::tip[At a glance]

- **Create:** _Admin → Planning → Goodies_ → _New goodie_.
- The key fields are _Price in points_, _Max. per person_ and the _Pickup place_.
- **Mandatory goodies** (e.g. the free ticket) are redeemed automatically as soon as there are enough
  points – before all others.
- Volunteers choose themselves and pick up at the counter; you tick it off under
  [Desk & check-in](/wichtel/en/leads/desk/).

:::

## Step by step

1. Open _Goodies_ and tap _New goodie_.
2. Enter _Name (German)_ and _Name (English)_, optionally a _Description_.
3. Set the _Price in points_. 0 means it is available without points (“free”).
4. Set _Max. per person_ (default 1).
5. If needed, enter _Options_, comma-separated, e.g. `S, M, L, XL`.
6. Under _Pickup_, choose the _Pickup place_ and write _Pickup details_, e.g. “Fri–Sun 10am–6pm”.
7. Under _Rules_, set contingent, stock and the checkboxes (see below).
8. Tap _Create_. The goodie is visible to volunteers right away as long as _Active (visible to
   volunteers)_ is ticked.

## All fields

| Field                                                         | Meaning                                                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _Price in points_                                             | How many points the goodie costs. They are deducted as soon as it is chosen.                                                                            |
| _Max. per person_                                             | How often one person can get the goodie.                                                                                                                |
| _Order_                                                       | Sort order in the list.                                                                                                                                 |
| _Options_                                                     | Choices such as sizes. Whoever chooses the goodie must pick an option.                                                                                  |
| _Pickup place_                                                | A [place](/wichtel/en/organizers/places/) of this edition. _Volunteer desk (default)_ means the place set as volunteer desk under _Places & site plan_. |
| _Pickup details_                                              | Free text, e.g. opening times.                                                                                                                          |
| _Self-service contingent_                                     | How many volunteers can choose themselves in total. Empty = unlimited. The desk can always hand out more.                                               |
| _Stock (for overview only)_                                   | How many you have. Blocks nothing; the list shows how many are left.                                                                                    |
| _Active (visible to volunteers)_                              | Without the tick, volunteers cannot choose the goodie.                                                                                                  |
| _Advance: may be chosen with pending points_                  | Volunteers can choose the goodie with points from booked, not yet confirmed shifts.                                                                     |
| _Refund instead of handing out possible (“already have one”)_ | Volunteers can choose a refund instead of the item, e.g. if they have already bought a ticket.                                                          |
| _Mandatory: redeemed automatically_                           | See below.                                                                                                                                              |
| _Order of mandatory goodies_                                  | With several mandatory goodies: lower number first.                                                                                                     |
| _Only for volunteers of these areas_                          | Only people with at least one confirmed shift in one of these areas (or a sub-area). No selection = everyone.                                           |

## Mandatory goodies (e.g. the free ticket)

Everyone gets a mandatory goodie as soon as they have enough **confirmed** points. Wichtel redeems it
automatically when attendance is confirmed – volunteers don't have to do anything.

- **The first points go to mandatory goodies.** As long as a mandatory goodie is still open, Wichtel
  holds back its price. Other goodies can only use what is left.
- **Order:** with several mandatory goodies, the one with the lower number in _Order of mandatory
  goodies_ comes first. If there is not enough for the first one, no later one is redeemed either.
- **Options:** when redeeming automatically, Wichtel takes the first option in the list.
- **Giving back:** volunteers cannot return a mandatory goodie for points themselves.
- **Refund instead of handing out:** if _Refund instead of handing out possible_ is ticked, the person
  can tap “I already have one”. The goodie then shows “refund pending”, the points stay used, and
  you mark it as refunded at the desk. How you refund (e.g. money back) is up to you.

:::note
An area restriction also applies to mandatory goodies: a free ticket for the bar only goes to people
with a confirmed bar shift.
:::

## What volunteers see

Under _Points & goodies_, volunteers see their confirmed points, their pending points, the goodies
they chose and the list _Trade in_. Each goodie shows the price, the pickup place with details and –
if it is not possible right now – the reason, for example:

- “You need … more.” – not enough points,
- “Only for volunteers of: …” – area restriction,
- “Already chosen.” – _Max. per person_ reached,
- “Currently gone – ask at the counter.” – contingent used up,
- “Redeemed automatically as soon as you have enough points.” – mandatory goodie.

Once chosen, a goodie shows “ready for pickup”. Until it is handed out, volunteers can undo their
choice and get the points back. If there are [profile fields](/wichtel/en/organizers/fields/) for this
goodie (e.g. T-shirt cut), Wichtel asks for them when choosing.

## At the desk

Handing out happens under [Desk & check-in](/wichtel/en/leads/desk/): scan the code or find the
person, then under _To pick up_ tap _Hand out_ or _Mark refunded_. With _Hand out directly_ you also
hand out something the person did not choose beforehand – this does not count against the
contingent, but against _Max. per person_ and the points. Goodies with _Advance_ may go below zero
here.

In the admin goodie list you see per goodie the used _Contingent_, the remaining _Stock_ and, under
_Who has what_, who chose or received it.

## Common questions

### Can I delete a goodie?

Only as long as nobody has chosen it. After that, untick _Active (visible to volunteers)_.

### Are goodies carried over to the next edition?

Goodies belong to an edition. When [copying an edition](/wichtel/en/organizers/editions/) you can
take them along; handed-out goodies never come along.

## Background

Admins and everyone with the permission _Manage goodies_ for the whole edition can set up goodies.
Anyone with _Hand out goodies_ can hand them out.

## See also

- [Points rules](/wichtel/en/organizers/points/)
- [Places & site plan](/wichtel/en/organizers/places/)
- [Points and goodies (for volunteers)](/wichtel/en/helpers/points-goodies/)

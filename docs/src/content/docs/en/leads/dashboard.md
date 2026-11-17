---
title: The overview
description: What the admin overview shows – staffing, heatmap, understaffed shifts, today's attendance and open requests.
---

:::tip[At a glance]

- **Open:** _Admin_ → _Overview_ (the first page after you enter).
- **Filled** shows what percentage of the places in your areas are taken.
- **Where people are missing:** in the table _Staffing by area and day_ – the stronger the colour, the
  more is missing. Tap a field to open its shifts.
- **Understaffed next** lists the next shifts with free places.
- The page refreshes itself every minute.

:::

The numbers always refer to the edition selected at the top, and only to the areas in which your role
has _View staffing dashboard_ or shift permissions (_Create and edit shifts_, _Add and remove
volunteers, approve requests_ or _Confirm attendance (check-in)_). Without one of these permissions
the overview stays mostly empty.

With _View staffing dashboard_ alone you can only look: the figures are not links then, because you
may not open the shifts themselves.

## What you see

### Filled

The big percentage: places taken divided by all places of all shifts in your areas, with “{booked} of
{capacity} places” below. Bookings and places reserved for groups count; open requests do not.

### Helpers signed up

How many different people are signed up for your shifts, and below it in how many shifts.

### Open

Only appears when something is waiting for you:

- _{number} requests_ – booking requests, handovers and swaps. The link leads to
  [_Requests_](/wichtel/en/leads/requests/).
- _{number} proofs_ – qualification proofs to review, only if you may review them. The link leads to
  [_Qualifications_](/wichtel/en/leads/qualifications/).

### Today

All shifts of your areas that start today, with the attendance so far: “{x} of {y} here” and, if
any, “{n} no-show”. A click opens the shift, where you tick people off (see
[Staffing](/wichtel/en/leads/staffing/)).

### Staffing by area and day

A table with one row per area and one column per festival day. Each field shows “booked/places” for
all shifts of that area starting on that day.

- The stronger the colour, the more is still missing. Full fields are grey.
- A dash means: there is no shift there on that day.
- Tapping a field opens the _Shifts_ list, filtered to the area and scrolled to the day.

### Understaffed next

The next ten shifts that have not started yet and have free places, soonest first – with day, time,
area and “{n} free”. If an [urgent call](/wichtel/en/leads/urgent/) is running for a position, it
shows _Urgent_. If all upcoming shifts are full, it says “All upcoming shifts are full.”

## Common questions

### Do I have to reload the page?

No. As long as the tab is visible, the overview fetches the new numbers every minute. Good for a
screen in the volunteer office.

### Why don't requests count as filled?

A request is not a commitment yet. Only when you approve it does it become a booking, and the place
counts.

### Why do I see my sub-area as its own row, but not the area above it?

The rows are the topmost areas you are allowed to see. If you lead a sub-area, it appears as a row;
if you lead a whole area, its sub-areas are combined into it.

## Special cases

<details>
<summary>I see “Getting started” on the overview</summary>

That list is really meant for the setup by admins. Leads allowed to create areas or to see people get
the matching items from it shown as long as they are not done. You can ignore them.

</details>

<details>
<summary>What about shifts that are already over?</summary>

_Filled_, _Helpers signed up_ and the table count all shifts of the edition, past ones included.
_Understaffed next_ only shows shifts that have not started yet.

</details>

## See also

- [Creating and editing shifts](/wichtel/en/leads/shifts/)
- [Urgent call](/wichtel/en/leads/urgent/)
- [Finding your way in the admin area](/wichtel/en/leads/admin-area/)

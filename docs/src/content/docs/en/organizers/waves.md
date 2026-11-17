---
title: Booking waves
description: Release shifts on a schedule – first for the crew, then for returning volunteers, invited people and finally everyone.
---

:::tip[At a glance]

- **Without waves**, everyone can book at any time.
- **As soon as there is one wave**, only people for whom a matching wave is open right now can book.
- A wave has a name, _Opens on_, optionally _Closes on_, an audience (_For_) and optionally specific
  _Areas_.
- Typical: _Crew_ → _Returning volunteers_ → _all volunteers_, a few days apart each.
- Found under _Admin → Planning → Booking waves_.

:::

## Step by step

1. Open _Booking waves_ and expand _+ New wave_.
2. Enter a _Name_, e.g. “Crew early access”. Volunteers see it when they accept an invitation link.
3. Choose _Opens on_ and the _Time_. Times are in the time zone from the
   [settings](/wichtel/en/organizers/settings/).
4. Leave _Closes on_ empty if the wave should stay open. With a date, it ends then.
5. Choose the audience under _For_ (see below).
6. Under _Areas_, choose the areas this wave opens. Sub-areas are included. No selection = all areas.
7. _Create_. The list shows the wave with the status _scheduled_, _open_ or _ended_.

To change or delete a wave, expand it in the list.

## Audiences

| _For_                                                              | Who may book                                                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| _all volunteers_                                                   | everyone with an account                                                                                      |
| _Crew (people with a role in this edition)_                        | everyone with a [role](/wichtel/en/organizers/roles/) in the current edition, and all admins                   |
| _Returning volunteers (worked in an earlier edition) and crew_     | everyone whose attendance was confirmed for at least one shift in an earlier edition, plus the crew           |
| _People with the invitation link_                                  | everyone who opened this wave's invitation link                                                               |

“Worked” means: attendance was confirmed (check-in). Someone who only booked in the past but was
never checked in does not count as returning.

## Invitation links

For a wave _For_ _People with the invitation link_, the expanded wave shows an _Invitation link_ with
a _Copy link_ button. Give it, for example, to a partner club or to people you want to win for a
particular team.

- Anyone who opens the link while not logged in goes to the login first and comes back
  automatically. They then land on the shifts and see “Invitation accepted: … You can book shifts as
  soon as this wave is open.”
- People without an account sign up first and then open the link again. Best mention this in your
  invitation.
- The link stays valid for this one wave. Anyone who has it can pass it on – so only share it where
  that is fine.
- If registration is closed in the settings, only people with an existing account can join via the
  link.

## What volunteers see

If booking is not open for someone yet, they can still look at all shifts:

- If nothing at all can be booked for them right now, the top of the page says “Booking opens for you
  on … Feel free to look around already.” – with the earliest start of a wave that applies to them.
- On the shifts, instead of _Sign up_ it says “Booking opens …” or, if no wave is coming
  for them, “Booking currently closed”.

So everyone sees for themselves when booking opens. Wichtel does not send an e-mail when a wave
starts – announce it, for example, via [news](/wichtel/en/leads/news/).

## Example: crew first, then returning volunteers, then everyone

| Name              | For                                                                | Opens on        | Areas |
| ----------------- | ------------------------------------------------------------------ | --------------- | ----- |
| Crew early access | _Crew (people with a role in this edition)_                        | 1 May, 18:00    | all   |
| Regulars          | _Returning volunteers (worked in an earlier edition) and crew_     | 8 May, 18:00    | all   |
| Friends of the bar | _People with the invitation link_                                 | 8 May, 18:00    | Bar   |
| Everyone          | _all volunteers_                                                   | 15 May, 18:00   | all   |

None of the waves has an end, so booking stays open for each group from its start. The crew can book
from 1 May, returning volunteers from 8 May, invited friends from 8 May in the bar only, and from
15 May everyone everywhere.

## Tips for a big rush

When very many people book in the same minute, Wichtel slows down for a moment; bookings still arrive
correctly and nobody is overbooked. Under a very big rush, Wichtel turns some page loads away with
“It is very busy right now.” How to spread the rush:

- **Several waves instead of one**: e.g. one wave per area or group of areas, half an hour apart.
- **Groups of people one after another**: crew, returning volunteers and everyone else on different
  days.
- **Odd start times** that suit you, and an announcement, so nobody keeps reloading the page.

More for the technical side: [Capacity](/wichtel/en/operators/capacity/).

## Common questions

### I only created a crew wave – why can nobody else book any more?

As soon as there is at least one wave, booking is closed for everyone for whom no matching wave is
open right now. Also create a wave _For_ _all volunteers_.

### What happens to bookings when a wave closes?

Nothing. Booked shifts stay booked, and cancelling still follows the
[booking rules](/wichtel/en/organizers/booking-rules/). Only new bookings and new waiting-list entries
are then no longer possible for that group.

### Can leads still add people?

Yes. Waves only apply when volunteers sign up themselves. Leads can add people at any time via
[Staffing](/wichtel/en/leads/staffing/).

## Special cases

<details>
<summary>A person matches several waves</summary>

Then it is enough if one of them is open right now and covers the shift's area.

</details>

<details>
<summary>Urgent calls</summary>

Positions with a running [urgent call](/wichtel/en/leads/urgent/) can be booked by everyone who can
see the shift – even outside their wave.

</details>

<details>
<summary>Groups</summary>

When someone books for a group, booking must be open for every member. Otherwise that person shows
“cannot book yet”.

</details>

## Background

Waves belong to an [edition](/wichtel/en/organizers/editions/). When copying an edition, they can come
along – with new invitation links; the old ones then only apply to the old edition. Admins and
everyone with the permission _Create and edit shifts_ for the whole edition can create waves.

## See also

- [Booking rules](/wichtel/en/organizers/booking-rules/)
- [Roles](/wichtel/en/organizers/roles/)
- [Why can't I book? (for volunteers)](/wichtel/en/helpers/cannot-book/)

---
title: Positions
description: Positions within a shift – places, booking direct or on request, points and qualifications.
---

:::tip[At a glance]

- A **position** is a type of place in a shift, e.g. “Volunteer” (8 places) and “Shift lead” (1
  place).
- **Edit:** in the shift's form under _Positions_; _+ Add position_ for another one.
- **_Booking_:** _direct_ = volunteers sign up themselves; _on request_ = you confirm every booking.
- **_Qualifications_:** _required_ blocks everyone without proof; _nice to have_ is just a hint.
- **_Points_:** leave empty (“auto”) to use the area's points rules.

:::

## The fields of a position

| Field            | Meaning                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| _Name_           | Name of the position, e.g. “Volunteer” or “Till”. Required.                                                                           |
| _English_        | English name, optional. Without it, everyone sees the German one.                                                                     |
| _Places_         | How many people are needed, 1 to 500.                                                                                                 |
| _Booking_        | _direct_ or _on request_ (see below).                                                                                                 |
| _Points_         | Points per shift for this position. Empty (“auto”) = default of the area or instance. Points per hour are added on top.               |
| _Qualifications_ | For every configured qualification: _—_ (doesn't matter), _required_ or _nice to have_. The row only appears if qualifications exist. |

A new position is initially called “Volunteer”, has 4 places and the booking _direct_. A shift needs
at least one and at most 20 positions.

## Step by step

1. Open the shift (or _New shift_ or _Create series_).
2. In the _Positions_ section, fill in the fields of each position.
3. _+ Add position_ adds another one, ✕ removes one.
4. Save the shift.

## Booking: direct or on request

- **_direct_** – volunteers see _Sign up_ and are signed up immediately as long as places are free.
- **_on request_** – volunteers see _Request_ and the hint “A lead will confirm your request.” The
  request lands with you under [_Requests_](/wichtel/en/leads/requests/) and on the shift's page. Only
  when you approve it is the place taken.

Use _on request_ for positions where you want to know who is coming – e.g. shift lead, till or
awareness.

## Qualifications

- **_required_** – anyone who does not have the qualification confirmed (and not expired) cannot sign
  up. Volunteers see “Requires: …” and can submit their proof right away. An
  [urgent call](/wichtel/en/leads/urgent/) also only goes to people with the qualification.
- **_nice to have_** – volunteers see “Nice to have: …”, but can sign up without proof.

The admins decide which qualifications exist. How to review proofs is described under
[Reviewing qualifications](/wichtel/en/leads/qualifications/).

## Points

If you leave _Points_ empty, the points rules of the area or instance apply. If you enter a number,
it replaces the points per shift for exactly this position – e.g. more points for the shift lead. If
your festival also gives points per hour, a night bonus or a last-minute bonus, those are still
added.

Points per hour for a single position can only be set through an
[AI assistant](/wichtel/en/leads/ai/). They are kept when you save the shift here.

Points are only credited once the person is ticked off as _present_ (see
[Staffing](/wichtel/en/leads/staffing/)).

## Common questions

### Can I make a position visible only to certain people?

No, visibility applies to the whole shift (_Visible to_). For individual positions use _on request_
or make a qualification _required_.

### Why can't I remove a position?

Positions with bookings or requests cannot be removed; they show “2 booked” instead of ✕. The
only position of a shift cannot be removed either.

### I reduced the places and get an error

“Capacity cannot be lower than the number of bookings.” Remove people first.

## Special cases

<details>
<summary>Can I sign someone up myself for a position “on request”?</summary>

Yes. When you add someone with _+ Add person_, the person is booked immediately, even for _on
request_.

</details>

<details>
<summary>What does “on request” change about waiting lists, groups and handovers?</summary>

- If someone moves up from the waiting list, it becomes a request, not a booking.
- Groups cannot sign up together there; each person requests individually.
- If someone wants to hand their place over to another person, you always have to approve the
  handover.

</details>

## See also

- [Creating and editing shifts](/wichtel/en/leads/shifts/)
- [Points rules (for admins)](/wichtel/en/organizers/points/)
- [Setting up qualifications (for admins)](/wichtel/en/organizers/qualifications/)

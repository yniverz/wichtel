---
title: Booking rules
description: Which rules apply to signing up, cancelling, swapping and groups, where you set them and what volunteers notice.
---

:::tip[At a glance]

- Most rules live under _Admin → System → Settings_ in the cards _Booking_ and _Swaps & groups_.
- The **cancellation deadline** can be overridden per area and per shift, approval of late handovers
  per area.
- Wichtel always prevents **overlaps**; a **minimum break** can be added.
- Who may book when is controlled by [booking waves](/wichtel/en/organizers/waves/).

:::

## All rules at a glance

| Setting                                                      | Default          | Where                                                      |
| ------------------------------------------------------------ | ---------------- | ---------------------------------------------------------- |
| _Cancellation deadline (hours before start)_                 | 48               | Settings → _Booking_; can be overridden in area and shift  |
| _Minimum break between two shifts (minutes)_                 | 0 (no break)     | Settings → _Booking_                                       |
| _Reminder email (hours before start)_                        | 24               | Settings → _Booking_ (0 = no reminders)                    |
| _Offer a waiting list for full positions_                    | on               | Settings → _Booking_                                       |
| _Allow the shift market and direct swaps_                    | on               | Settings → _Swaps & groups_                                |
| _Handovers after the cancel deadline need a lead’s approval_ | off              | Settings → _Swaps & groups_; can be overridden in the area |
| _Allow groups_                                               | on               | Settings → _Swaps & groups_                                |
| _Maximum people per group_                                   | 8 (2–50)         | Settings → _Swaps & groups_                                |
| _Reservation for group members (hours)_                      | 24               | Settings → _Swaps & groups_                                |
| Overlaps                                                     | always prevented | cannot be switched off                                     |

The settings apply to the whole installation, i.e. to all editions. Only admins can change them.
Don't forget to save – the _Save_ button is at the bottom of the page.

## Cancellation deadline

Volunteers can cancel a booking themselves until this many hours before the shift starts. After that
they see “Only the shift lead can cancel now.” and can only hand the shift over via the
[shift market](/wichtel/en/helpers/cancel-swap/) or contact the lead.

Wichtel decides which deadline applies from the inside out:

1. the deadline on the **shift** itself (field _Cancellation deadline (hours)_ when editing the
   shift),
2. otherwise the deadline of the **closest area** that sets one – first the shift's area, then its
   parent areas,
3. otherwise the deadline from the **settings**.

An empty field always means “same as above”. With 0, volunteers can cancel themselves until the
shift starts.

:::note
Requests, waiting-list places and places reserved by a group can be withdrawn regardless of the
deadline – the deadline only applies to confirmed bookings.
:::

## Overlaps and minimum break

Nobody can book two shifts that overlap in time. With _Minimum break between two shifts (minutes)_
you also require a gap: with 30 minutes, nobody can book a shift starting at 18:00 right after a shift
ending at 18:00, but one starting at 18:30 is fine.

When this rule is broken, volunteers see “This overlaps with another shift.” – even if only the break
is too short. The rule also applies when moving up from the waiting list, when taking over from the
shift market and in groups. Leads with the permission _Override rules (overlaps, deadlines,
requirements)_ can still add a person (see [Staffing](/wichtel/en/leads/staffing/)).

## Waiting list

When a position is full, volunteers can tap _Join waiting list_. When a place becomes free, the first
person on the list moves up automatically and gets the e-mail “Moved up from waiting list”. Anyone who
meanwhile has a shift at the same time is skipped and stays on the list. For positions _on request_,
moving up creates a request that a lead confirms.

If you switch off _Offer a waiting list for full positions_, the button disappears; full positions
are then simply full.

## Shift market and swaps

With _Allow the shift market and direct swaps_, volunteers can offer a booked shift to everyone or to
one specific person; that person can take it over or suggest one of their own shifts in exchange.
Switched off, there is neither a market nor swapping.

When a handover needs a lead:

- **Positions _on request_:** always.
- **All others:** only if _Handovers after the cancel deadline need a lead’s approval_ applies and the
  shift's cancellation deadline has already passed. Before that, the handover goes through
  immediately.

You can change this per area under _Approve late handovers_: _as parent_, _yes, a lead approves_ or
_no, immediately_. As with the deadline, the closest area that sets something wins, otherwise the
setting applies.

Whoever takes over must meet the same rules as when signing up (no overlap, required
qualifications). Shifts that have already started, or where the person is checked in, can no longer
be handed over.

## Groups

With _Allow groups_, volunteers can form groups (see [Groups for volunteers](/wichtel/en/helpers/group/)).
Whoever books for the group gets a confirmed place; for the others Wichtel reserves a place each and
sends the e-mail “Place reserved by group”.

- _Maximum people per group_ limits the group size (2 to 50).
- _Reservation for group members (hours)_ sets how long a reserved place is held – at most until the
  shift starts. If the person does not accept it, the place becomes free again, they get the e-mail
  “Reservation expired”, and the waiting list moves up.

In groups, too, every person must be able to see the shift and be allowed to book it (booking waves),
have the qualifications and have no overlap.

## Reminders

With _Reminder email (hours before start)_, everyone with a confirmed booking gets a reminder this
many hours before the shift starts. Anyone who books within that period gets the reminder shortly
after booking. Each booking is reminded at most once. 0 switches reminders off. You change the text
under [Email templates](/wichtel/en/organizers/mail/).

## Common questions

### Can I shorten the deadline for a single area?

Yes. Open the area under _Areas_ and enter a value in _Cancellation deadline (hours)_. It also applies
to all sub-areas as long as they have no value of their own.

### Does a changed deadline also apply to shifts already booked?

Yes. Wichtel works out the deadline from the current settings every time someone cancels.

## Special cases

<details>
<summary>What about shifts that have already started?</summary>

Volunteers can no longer book, cancel, join the waiting list or hand over a shift that has already
started. Leads with the permission _Override rules_ can still add people.

</details>

<details>
<summary>Does the booking wave also apply to urgent calls?</summary>

No. Positions with a running [urgent call](/wichtel/en/leads/urgent/) can be booked by everyone who
can see the shift – even if their booking wave is not open yet.

</details>

## See also

- [Booking waves](/wichtel/en/organizers/waves/)
- [Areas](/wichtel/en/organizers/areas/)
- [All settings](/wichtel/en/organizers/settings/)
- [Cancelling and swapping (for volunteers)](/wichtel/en/helpers/cancel-swap/)

---
title: Staffing – adding people and ticking them off
description: Add people to shifts and remove them, override rules and record attendance – and what that means for points.
---

:::tip[At a glance]

- **Add:** open the shift → at the position _+ Add person_ → search name or email → _Add_.
- **Remove:** at the person _Remove_ → confirm.
- **Tick off:** at the person choose _present_ or _no-show_ – from the day of the shift.
- **Points** are only given for _present_.
- The person gets an e-mail when added or removed.

:::

Everything happens on a shift's page in the _Staffing_ section: _Shifts_ → tap the shift. For each
position you see who is signed up and “booked/places”.

## The staffing list

For each person you see the name (it leads to the person's page if you may open _People_) and – if
your role has _View volunteer contact details_ for the area – the phone number to tap. Below that are
profile details the admins have released for leads (e.g. T-shirt size).

Next to the name is the status:

- _Request_ – with _Approve_ and _Decline_ (see [Requests](/wichtel/en/leads/requests/)).
- _Waiting list_ – the person moves up automatically when a place becomes free.
- _reserved until …_ – someone from the person's group has kept a place free for them; they still
  have to accept it.
- People who are signed up have the switch _open_ / _present_ / _no-show_.

## Adding someone

1. Tap _+ Add person_ at the position.
2. Type at least two letters of the name or email address and choose the person.
3. Tap _Add_.

The person is signed up immediately – also for positions _on request_, for internal shifts and
regardless of booking waves. They get the e-mail “You were added: …”.

### When a rule stands in the way

When adding, Wichtel checks whether

- the position is full,
- the person has another shift at the same time (or without the required break),
- the shift has already started,
- the person lacks a required qualification.

If any of these applies, the person is **not** added and you see “Note:” with the reasons. If your
role has the permission _Override rules (overlaps, deadlines, requirements)_, _Add anyway_ appears.
Otherwise it says “You are not allowed to override these rules.”

Every addition is recorded in the audit log – when overriding, together with the rules that were
overridden. No separate reason text is asked for.

## Removing someone

1. Tap _Remove_ at the person.
2. Confirm the question “Remove {name} from this shift?”.

Anyone who was signed up, had requested or held a reserved place gets the e-mail “Removed: …”. If
this frees a place, the next person on the waiting list moves up automatically. As a lead you can
always remove people, even after the cancellation deadline.

## Ticking off attendance

For each person who is signed up you choose:

- _present_ – the person was there. They are now credited with the shift's points, bonuses
  included.
- _no-show_ – no points.
- _open_ – not decided yet, no points.

This works from 0:00 on the day of the shift (festival time zone), so even before it starts – handy
for checking in at the [volunteer desk](/wichtel/en/leads/desk/). Before that the buttons are greyed
out and below them it says “Attendance can only be confirmed on the day of the shift.” After that you
can correct it at any time.

### What this means for points

- From _open_ or _no-show_ to _present_: the points are credited.
- From _present_ back to _open_ or _no-show_: the points are deducted again.
- Anyone who is removed also loses the points for this shift.
- If after ticking off the points are enough for a mandatory goodie (e.g. the free ticket), it is
  redeemed automatically and is ready at the desk.

Every change can be traced in the person's points history.

## Which permissions you need

| What                       | Permission                                                    |
| -------------------------- | ------------------------------------------------------------- |
| Add, remove                | _Add and remove volunteers, approve requests_                 |
| Add despite a conflict     | additionally _Override rules (overlaps, deadlines, requirements)_ |
| Tick off attendance        | _Confirm attendance (check-in)_                               |
| See phone numbers          | _View volunteer contact details_                              |

Each in the shift's area (or for the whole edition).

## Common questions

### I cannot find the person in the search

Deleted accounts do not appear. The person needs an account; whether their email address is shown in
the search depends on your permissions.

### “There already is a booking for this shift.”

The person is already on a position in this shift (also as a request or reservation). Remove them
there if they should switch positions.

## Special cases

<details>
<summary>Does someone removed from the waiting list get an e-mail?</summary>

No. The e-mail only goes to people who were signed up, had requested or held a reserved place.

</details>

<details>
<summary>Are there bonus points when I add someone at short notice?</summary>

Points are calculated by the festival's rules. If there is a last-minute bonus, what counts is the
time the person was added – even if you added them.

</details>

## See also

- [Requests and handovers](/wichtel/en/leads/requests/)
- [Desk & check-in](/wichtel/en/leads/desk/)
- [Points rules (for admins)](/wichtel/en/organizers/points/)

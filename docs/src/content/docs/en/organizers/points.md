---
title: Points rules
description: How many points a shift is worth, how areas and positions override the base rule, how bonuses work and when points are credited.
---

:::tip[At a glance]

- **Base rule** under _Settings → Points_: _Points per shift_ (default 1) and _Points per hour_
  (default 0). Both are added up.
- **Areas** can override both values, **positions** the _Points_ per shift.
- **Bonuses**: _Night bonus_ and _Last-minute bonus_, 0 = off each.
- Points are **credited** only once attendance is confirmed. Until then they are “pending”.
- **Corrections** with a reason at the [desk](/wichtel/en/leads/desk/).

:::

## How Wichtel calculates

For each shift of a person:

> **Points = points per shift + (hours × points per hour, rounded) + night bonus + last-minute
> bonus + bonus from an urgent call**

- Hours × points per hour is rounded to whole points (.5 rounds up).
- The night bonus is added once per shift if the shift touches the night window.
- The last-minute bonus is added if the booking was made less than the configured number of hours
  before the start.
- Bonus points from an [urgent call](/wichtel/en/leads/urgent/) go to everyone who signs up in
  response to the call.

## Where the rules live

| Level    | Where                                                     | What                                         |
| -------- | --------------------------------------------------------- | -------------------------------------------- |
| Instance | _Settings_ → card _Points_                                | _Points per shift_, _Points per hour_, bonuses |
| Area     | _Areas_ → edit area → _Points_                            | _Points per shift_, _Points per hour_        |
| Position | edit shift → positions → field _Points_ (empty = _auto_)  | points per shift                             |

Each value comes from the most specific level that sets it: first the position, then the shift's
area, then its parent areas, finally the settings. An empty field means “same as above”. This applies
to _Points per shift_ and _Points per hour_ **separately**.

:::caution
The _Points_ field on a position only replaces the points **per shift**. Points per hour from the area
or the settings are still added. If a position should be worth exactly one fixed number, set _Points
per hour_ in the area to 0.
:::

The bonuses (_Night bonus_, _Last-minute bonus_) only exist in the settings; they apply everywhere
the same way.

## Setting up bonuses

### Night bonus

- _Night bonus (points)_: how many extra points. 0 = off.
- _Night from_ and _Night until_: the night window, default 00:00 to 06:00. It may span midnight,
  e.g. 22:00 to 06:00. It uses the time zone from the settings.

A shift gets the bonus if it overlaps the window even briefly. If it ends exactly when the window
begins (e.g. at 00:00), that does not count.

### Last-minute bonus

- _Last-minute bonus (points)_: how many extra points. 0 = off.
- _Last-minute = booked less than … hours before start_: default 24.

What counts is the moment the booking was created – including when a lead adds someone at short
notice or someone takes over a shift from the shift market shortly before.

## Examples

Settings: _Points per shift_ 0, _Points per hour_ 2, _Night bonus_ 3 (00:00–06:00), _Last-minute
bonus_ 2 (24 hours).

| Shift                                          | Calculation                 | Points |
| ---------------------------------------------- | --------------------------- | ------ |
| Entrance 14:00–18:00, booked weeks ahead       | 0 + 4 × 2                   | 8      |
| Bar 22:00–02:00                                | 0 + 4 × 2 + 3 (night)       | 11     |
| Bar 18:00–00:00                                | 0 + 6 × 2 (ends exactly at 00:00) | 12 |
| Set-up 09:00–10:45, booked the evening before  | 0 + 1.75 × 2 = 3.5 → 4, + 2 (last minute) | 6 |

Now the area _Bar_ sets _Points per shift_ to 2 and leaves _Points per hour_ empty:

| Shift           | Calculation              | Points |
| --------------- | ------------------------ | ------ |
| Bar 22:00–02:00 | 2 + 4 × 2 + 3 (night)    | 13     |

And a position _Till_ in the bar has the value 5 in the _Points_ field:

| Shift                   | Calculation           | Points |
| ----------------------- | --------------------- | ------ |
| Bar 18:00–22:00, Till   | 5 + 4 × 2             | 13     |

## When points are credited

1. **Booked**: the points show up for the person as “pending from booked shifts”. They do not count
   yet – except for goodies with _Advance_ (see [Goodies](/wichtel/en/organizers/goodies/)).
2. **Attendance confirmed** (check-in at the [desk](/wichtel/en/leads/desk/) or in
   [Staffing](/wichtel/en/leads/staffing/)): now the points are credited, calculated with the rules
   valid at that moment. Wichtel then automatically redeems any
   [mandatory goodies](/wichtel/en/organizers/goodies/) that are due.
3. **Attendance withdrawn** or set to “no-show”: the points are deducted again.

Every change appears as a separate line in the person's _Points history_; nothing is silently
overwritten.

:::note
If you change the rules later, points already credited do not change by themselves. Pending points,
on the other hand, always reflect the current rules.
:::

## Correcting points

1. Open _Desk & check-in_ and find the person (or scan their code).
2. Under _Correct points_, enter a number in _Points (+/−)_, e.g. `5` or `-2`.
3. Enter a _Reason_ – it is required.
4. Tap _Book_.

The correction appears in the person's points history as “Correction: _reason_” and in the
[audit log](/wichtel/en/organizers/audit/). So the person sees the reason – word it accordingly.

Admins and everyone with the permission _Adjust points manually_ for the whole edition can make
corrections.

## Common questions

### Should I give points per shift or per hour?

Per shift is easy to explain (“every shift is one point”). Per hour is fairer when shifts vary a lot
in length. You can combine both, e.g. 1 per shift plus 1 per hour.

### Do points carry over between editions?

No. Points belong to an [edition](/wichtel/en/organizers/editions/); they are never carried over when
copying an edition. The areas' rules, however, come along.

## See also

- [Goodies](/wichtel/en/organizers/goodies/)
- [Areas](/wichtel/en/organizers/areas/)
- [Points and goodies (for volunteers)](/wichtel/en/helpers/points-goodies/)

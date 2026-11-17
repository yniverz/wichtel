---
title: Creating a series
description: Create many similar shifts at once – days times time slots – and edit them afterwards.
---

:::tip[At a glance]

- **Create:** _Shifts_ → _Create series_ → choose the date range, _Weekdays_ and _Time slots_ →
  _Create series_.
- **Every selected day and every time slot** becomes a shift of its own with the same details and
  positions.
- **Before creating**, the page shows: “{number} shifts will be created.”
- **Afterwards** every shift stands on its own: you edit or delete them one by one.

:::

## Step by step

1. Open _Shifts_ and tap _Create series_.
2. Choose the _Area_ and enter the _Title (German)_ (English optional).
3. Under _Date_:
   - _From_ and _To_ – initially the start and end of the edition.
   - _Weekdays_ – initially all are selected. Tap days to deselect or reselect them.
   - _Time slots_ – start and end, initially 10:00–14:00. _+ Add time slot_ adds another one (it
     starts where the last one ends). If the end is before the start, the shift ends the next day,
     e.g. 22:00–02:00.
4. Read the number below: “{number} shifts will be created.” It changes immediately when you change
   days or time slots.
5. Set the [positions](/wichtel/en/leads/positions/) – they apply to every shift of the series.
6. Fill in location, contact, description, _Visible to_ and _Cancellation deadline (hours)_ as for a
   [single shift](/wichtel/en/leads/shifts/).
7. Tap _Create series_. You land in the _Shifts_ list with the message “{number} shifts created.”

### Example

Friday to Sunday, time slots 18:00–22:00 and 22:00–02:00, weekdays Fri, Sat, Sun: six shifts are
created. Saturday's night shift ends on Sunday at 02:00.

## Checking

The number before creating is the most important check: if it is much bigger than expected, the date
range is usually too wide or too many weekdays are selected. After creating, you see all new shifts
in the _Shifts_ list, sorted by day.

## Editing afterwards

The shifts of a series are ordinary shifts, independent of each other. There is no function that
changes or deletes them all at once.

- **Change one shift:** tap it in the list → _Edit shift_.
- **Cancel one shift:** open it → _Delete shift_.
- **Change many:** one by one, or – if your role allows it – with an
  [AI assistant](/wichtel/en/leads/ai/).

## Common questions

### How many shifts can a series have?

At most 500. If the number turns red, it is too many; split the series up.

### What does “These settings do not produce any shift.” mean?

None of the selected weekdays falls within the date range, or no weekday is selected.

### For night shifts, does the start day or the end day count?

The start day. A 22:00–02:00 shift on a Friday belongs to Friday.

## Special cases

<details>
<summary>Is anything created if an error occurs?</summary>

No. The series is created completely or not at all. After an error, what you entered stays in the
form.

</details>

<details>
<summary>Can the date range go beyond the edition?</summary>

The date fields only allow days between the start and end of the edition.

</details>

## See also

- [Creating and editing shifts](/wichtel/en/leads/shifts/)
- [Positions](/wichtel/en/leads/positions/)

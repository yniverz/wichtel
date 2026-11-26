---
title: Settings
description: Every card and field on the Settings page in order – what it does and what the defaults are.
---

:::tip[At a glance]

- **Where:** _Admin → System → Settings_. Only admins see the page.
- The settings apply to the whole installation, i.e. to all editions.
- Changes only take effect with _Save_ (at the bottom of the page) – for all cards at once.
- Every change is recorded in the [audit log](/wichtel/en/organizers/audit/).

:::

The page consists of cards. Here they are in the order they appear on the page.

## Appearance

| Field                                                | Default    | Effect                                                                  |
| ---------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| _Festival name_                                      | from setup | Everywhere in the app, in the browser tab and in e-mails (`{festival}`) |
| _Tagline (German)_, _Tagline (English)_              | empty      | Below the name on the start page and next to the login                  |
| _Primary color_                                      | `#c03a1c`  | Buttons, highlights, links                                              |
| _Accent color_                                       | `#f4c430`  | Small highlights such as points badges                                  |
| _Logo_, _Background image_, _Browser icon (favicon)_ | none       | Images, max. 5 MB each; _Remove image_ deletes one                      |

On the right, the _Preview_ shows your changes immediately. Everything about it:
[Appearance](/wichtel/en/organizers/appearance/).

## Booking

| Field                                        | Default | Effect                                                                         |
| -------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| _Cancellation deadline (hours before start)_ | 48      | Until then volunteers can cancel themselves. Areas and shifts can override it. |
| _Minimum break between two shifts (minutes)_ | 0       | Gap two shifts of the same person must have                                    |
| _Reminder email (hours before start)_        | 24      | When the reminder is sent; 0 = no reminders                                    |
| _Offer a waiting list for full positions_    | on      | Full positions offer a waiting list with automatic moving up                   |

Details: [Booking rules](/wichtel/en/organizers/booking-rules/).

## Swaps & groups

| Field                                                        | Default | Effect                                                                  |
| ------------------------------------------------------------ | ------- | ----------------------------------------------------------------------- |
| _Allow the shift market and direct swaps_                    | on      | Volunteers can give away or swap booked shifts                          |
| _Handovers after the cancel deadline need a lead’s approval_ | off     | Late handovers need a lead; areas can override this                     |
| _Allow groups_                                               | on      | Volunteers can form groups and book together                            |
| _Maximum people per group_                                   | 8       | 2 to 50                                                                 |
| _Reservation for group members (hours)_                      | 24      | How long Wichtel holds a reserved place, at most until the shift starts |

For positions _on request_, a lead always has to approve handovers. Details:
[Booking rules](/wichtel/en/organizers/booking-rules/).

## AI assistants (MCP)

People with the permission _Connect an AI assistant_ can connect e.g. Claude to Wichtel. The
assistant never has more rights than the person.

| Field                                        | Default                                                      | Effect                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| _What assistants may change_                 | _Plan shifts_, _Staffing_, _Areas, places and booking waves_ | Which groups of changes are allowed; further groups are off at first. Reading is always possible. |
| _Personal data for assistants_               | _Names only, no phone numbers or e-mail addresses_           | Alternatively names and contact details, or pseudonyms                                            |
| _Allowed return addresses for AI assistants_ | `claude.ai`, `claude.com`                                    | Where an assistant may send people back to after they agree                                       |

Administrator rights, deleting accounts, passwords, e-mail addresses and these settings themselves
are never within an assistant's reach. Details:
[AI assistants](/wichtel/en/organizers/ai/).

## Points

| Field                                                 | Default      | Effect                                         |
| ----------------------------------------------------- | ------------ | ---------------------------------------------- |
| _Points per shift_                                    | 1            | Base rule; areas and positions can override it |
| _Points per hour_                                     | 0            | Base rule; areas can override it               |
| _Night bonus (points)_                                | 0 (off)      | Extra points for shifts in the night window    |
| _Night from_, _Night until_                           | 00:00, 06:00 | The night window                               |
| _Last-minute bonus (points)_                          | 0 (off)      | Extra points for short-notice bookings         |
| _Last-minute = booked less than … hours before start_ | 24           | What counts as short notice                    |

Details and worked examples: [Points rules](/wichtel/en/organizers/points/).

## Maps

| Field                   | Default                                          | Effect                                                                                        |
| ----------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| _Map tile server (URL)_ | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Where embedded maps come from. Must start with `https://` and contain `{z}`, `{x}` and `{y}`. |
| _Map attribution_       | `© OpenStreetMap contributors`                   | Shown on the map                                                                              |

Embedded maps only load when someone taps “Load map”. The site plan and navigation links work without
an external service. More: [Places & site plan](/wichtel/en/organizers/places/).

## General

| Field                                  | Default         | Effect                                                                                  |
| -------------------------------------- | --------------- | --------------------------------------------------------------------------------------- |
| _Registration open for new volunteers_ | on              | Without the tick, nobody can sign up; existing accounts can still log in.               |
| _Default language_                     | from setup      | Language for visitors whose browser prefers neither German nor English                  |
| _Time zone_                            | `Europe/Berlin` | All times in the app and in e-mails, e.g. `Europe/Vienna`                               |
| _Contact email_                        | empty           | _Contact_ link in the footer; also used for the legal notice if no address is set there |

The link _Legal notice and privacy policy_ leads to _Privacy & legal notice_, where you maintain both:
[Privacy](/wichtel/en/organizers/privacy/).

:::caution
Do not change the _Time zone_ once shifts are planned. Stored points in time stay the same but are then
shown in the new time zone – switching from `Europe/Berlin` to `Europe/London`, for example, turns
18:00 into 17:00.
:::

## Help

| Field           | Default | Effect                                                       |
| --------------- | ------- | ------------------------------------------------------------ |
| _Own help page_ | empty   | Address of your own FAQ for volunteers; empty = Wichtel help |

Details: [Help links and own FAQ](/wichtel/en/organizers/help-link/).

## Operations

| Field                                   | Default | Effect                                                                                                                           |
| --------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| _Report errors to all admins by e-mail_ | on      | For unexpected server errors, all admins get an e-mail with error ID and technical details; the same error at most once an hour. |

Below it, a link leads to [e-mail delivery](/wichtel/en/organizers/mail/).

## See also

- [First steps](/wichtel/en/organizers/first-steps/)
- [Booking rules](/wichtel/en/organizers/booking-rules/)
- [Appearance](/wichtel/en/organizers/appearance/)

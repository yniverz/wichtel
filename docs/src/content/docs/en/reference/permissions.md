---
title: Permissions
description: Every permission a role can contain – what it allows, where it matters in the app, and what only admins can do.
---

:::tip[At a glance]

- **Permissions** are single capabilities in the admin area. They are never granted one by one, only
  bundled as a **role**.
- You get a role **for one edition** and **for one scope**: the whole edition or one area including
  its sub-areas.
- **Nobody can grant more permissions** than they hold there themselves.
- Settings, editions, role definitions and admins are **not a permission** but reserved for admins.

:::

Set up roles under _Admin_ → _Roles_ and assign them under _People_ → person → _Assign role_. How
that works is described under [Roles](/wichtel/en/organizers/roles/). The labels below are the ones
the app shows; the key in `code` is the internal name (e.g. for the audit log or for developers).

## All permissions

The “Scope” column says whether holding the permission in an area is enough or whether the role must
apply to the _whole edition_.

### Structure & overview

| Permission                                                         | Key              | What it allows                                                                                                                                                                   | Where it matters                  | Scope                                                 |
| ------------------------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| _Create and edit areas_                                            | `area.manage`    | Create sub-areas; rename, move and delete areas; set their cancellation deadline and points rules.                                                                               | _Areas_                           | area; new top-level areas only with the whole edition |
| _Assign roles (only with own permissions)_                         | `role.assign`    | Give roles to people and take them away again – only roles whose permissions you hold there yourself. Also opens the people list.                                                | _People_ → person → _Assign role_ | area                                                  |
| _View staffing dashboard_                                          | `dashboard.view` | Meant for the staffing overview. Currently not checked separately: anyone with one of the permissions in the _Shifts_ group sees the staffing on the _Overview_ for their areas. | _Overview_                        | –                                                     |
| _View audit log_                                                   | `audit.view`     | Read the audit log of the selected edition. Admins see all entries.                                                                                                              | _Audit log_                       | whole edition                                         |
| _Connect an AI assistant (e.g. Claude) with one’s own permissions_ | `mcp.use`        | Connect an AI assistant that acts with exactly your own permissions. Only counts in the current edition.                                                                         | _Profile_ → _Connect Claude_      | anywhere in the current edition                       |

### Shifts

| Permission                                           | Key                   | What it allows                                                                                                                                                                                                                      | Where it matters                              | Scope                          |
| ---------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------ |
| _Create and edit shifts_                             | `shift.manage`        | Create, edit, duplicate and delete shifts and series; set positions with places, booking mode, points and qualifications.                                                                                                           | _Shifts_                                      | area                           |
|                                                      |                       | With the whole edition as scope, also: manage booking waves and places, upload the site plan.                                                                                                                                       | _Booking waves_, _Places & site plan_         | whole edition                  |
| _Add and remove volunteers, approve requests_        | `assignment.manage`   | Add and remove people, approve or decline requests, decide handovers and swaps, send an urgent call.                                                                                                                                | shift → _Staffing_, _Requests_, _Urgent call_ | area (for a swap: both shifts) |
| _Override rules (overlaps, deadlines, requirements)_ | `assignment.override` | _Add anyway_ when adding someone although the position is full, the person has another shift at the same time, the shift has already started or a required qualification is missing. Only useful together with `assignment.manage`. | shift → _Staffing_ → _Add person_             | area                           |
| _Confirm attendance (check-in)_                      | `attendance.confirm`  | Set attendance in the staffing list (_present_, _no-show_) and check people in at _Desk & check-in_ – from midnight on the day of the shift.                                                                                        | shift → _Attendance_, _Desk & check-in_       | area of the shift              |

Each of the three permissions `shift.manage`, `assignment.manage` and `attendance.confirm` opens the
_Shifts_ page for the areas where you hold it – including internal shifts.

### People

| Permission                        | Key                            | What it allows                                                                                                                                                                                                             | Where it matters                                             | Scope                                                      |
| --------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| _View volunteer contact details_  | `helper.contact.view`          | See the phone number of people on a shift in the staffing list and the printed crew list, and the e-mail address at _Desk & check-in_. Opens the people list; e-mail, phone and details there only with the whole edition. | shift → _Staffing_, print views, _People_, _Desk & check-in_ | area of the shift or whole edition; current edition only   |
| _Review and grant qualifications_ | `qualification.review`         | Confirm or decline proofs, grant and revoke qualifications directly.                                                                                                                                                       | _Qualifications_ → _To review_, _People_ → person            | anywhere in the edition (qualifications are instance-wide) |
| _View uploaded documents_         | `qualification.documents.view` | Open uploaded documents. Without it you only see that a proof exists.                                                                                                                                                      | _Qualifications_ → _View proof_                              | anywhere in the edition; current edition only              |
| _Publish news (also by e-mail)_   | `mail.send`                    | Write news for everyone with shifts in an area or everyone on a shift, optionally also by e-mail. With the whole edition also to all volunteers, the crew or a role.                                                       | _News_, shift → _Message everyone_                           | area; volunteers/crew/role only with the whole edition     |

### Points & goodies

| Permission               | Key             | What it allows                                                                                 | Where it matters                     | Scope                   |
| ------------------------ | --------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------- |
| _Manage goodies_         | `goodie.manage` | Create and edit goodies (price, options, contingent, mandatory goodie …) and see who got what. | _Goodies_                            | whole edition           |
| _Hand out goodies_       | `goodie.issue`  | Hand out chosen goodies, hand out goodies directly, mark refunds as done.                      | _Desk & check-in_                    | anywhere in the edition |
| _Adjust points manually_ | `points.adjust` | Credit or deduct points with a reason.                                                         | _Desk & check-in_ → _Correct points_ | whole edition           |

## Scope and inheritance

- A role applies either to the **whole edition** (_Applies to_ → _Whole edition_) or to **one area and
  all its sub-areas**. Someone with a role on “Infrastructure” also has those permissions in
  “Infrastructure → Set-up”.
- A person can have several roles, also on different areas. The permissions add up.
- Some pages need the permission for the **whole edition** because they do not belong to an area:
  _Audit log_, _Goodies_, _Booking waves_, _Places & site plan_, _Correct points_, news to all
  volunteers.
- **Nobody can grant more permissions than they have:** to assign or remove a role you need
  `role.assign` _and_ every permission of the role there. Otherwise you see “You can only assign roles
  whose permissions you hold there yourself.”

## Roles apply per edition

- Role assignments belong to an edition. A role only acts on areas, shifts and goodies of that edition
  – even when it is assigned for the whole edition.
- Roles in an **archived** edition no longer grant anything.
- Contact details (`helper.contact.view`) and documents (`qualification.documents.view`) count **only
  in the current edition**. Accounts are instance-wide; an old role should not open current personal
  data.
- When [copying an edition](/wichtel/en/organizers/editions/), the role assignments can be taken along
  (_Role assignments (leads)_).
- The _roles_ themselves (name and contained permissions) apply to all editions.

## Admin only

Instance-wide administration is not a permission that can be part of a role. It is reserved for
accounts with the _Instance admin_ switch. Admins also have every permission everywhere, in every
edition.

Only admins can:

- _Settings_: appearance, booking rules (cancellation deadline, minimum break, waiting list), the basic
  points rule, swaps & groups, reminders, maps, AI assistants, operations
- create, copy, make current and archive _Editions_
- create, change and delete _Roles_
- make other people admins (_Make admin_) or remove their admin rights
- manage _Profile fields_ and the set-up _Qualifications_
- _Email templates_, _Delivery_ and _Privacy & legal notice_
- edit accounts (name, e-mail, phone, language, details), _Mark as confirmed_, _Create reset link_, download a data export and delete accounts
- publish news to _All accounts_ and _Public (also without an account)_
- see the audit log of all editions

More: [People](/wichtel/en/organizers/people/), [Settings](/wichtel/en/organizers/settings/)

## Predefined roles

During setup, Wichtel creates these roles as a starting point. You can change or delete them freely or
create new ones.

| Role               | Permissions                                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Festival lead**  | all except `mcp.use`                                                                                                                                                                         |
| **Area lead**      | `area.manage`, `role.assign`, `dashboard.view`, `shift.manage`, `assignment.manage`, `assignment.override`, `attendance.confirm`, `qualification.review`, `helper.contact.view`, `mail.send` |
| **Shift lead**     | `attendance.confirm`, `helper.contact.view`, `dashboard.view`                                                                                                                                |
| **Volunteer desk** | `dashboard.view`, `assignment.manage`, `attendance.confirm`, `qualification.review`, `helper.contact.view`, `goodie.issue`                                                                   |
| **Goodie desk**    | `goodie.issue`                                                                                                                                                                               |

No role has AI access (`mcp.use`) at first – only admins have it until you add it to a role on
purpose.

## See also

- [Setting up and assigning roles](/wichtel/en/organizers/roles/)
- [The admin area](/wichtel/en/leads/admin-area/)
- [Glossary: role](/wichtel/en/reference/glossary/#role)

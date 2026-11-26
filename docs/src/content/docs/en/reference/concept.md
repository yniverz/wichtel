---
title: Concept
description: The original domain concept of Wichtel with its domain model, rules and rationale – for contributors.
---

:::note[For contributors]

This is the original concept with the reasoning behind how Wichtel is built. Some parts describe
ideas that are not implemented (yet) or were implemented differently – such as freely assembled
conditions, admin-managed groups or automatic confirmation of attendance. How the app actually
behaves is described in the help pages, e.g. [Features](/wichtel/en/reference/features/) and
[Permissions](/wichtel/en/reference/permissions/).

:::

Wichtel is a volunteer and shift system for non-profit festivals (target size: up to about 500
volunteers, a set-up/festival/tear-down phase lasting several weeks). Volunteers sign up, book shifts,
collect points and trade them for goodies.

As of: 2026-10-08 · Status: milestones 1–7 implemented

---

## 1. Guiding principles

Derived from criticism of the previous system (Engelsystem):

1. **Usable without explanation.** Every page has exactly one main action. First-time visitors are
   guided through a short introduction (profile → interests → first shift).
2. **Mobile first for volunteers**, desktop-optimised for leads/admins (tables, planning views).
3. **Consistent interaction.** Confirmation dialogs exist _only_ for irreversible or consequential
   actions (e.g. cancelling after the deadline, handing out a goodie) – always following the same
   pattern. Booking is one tap, undoing is one tap (as long as it is allowed).
4. **Status is always visible.** Every booking/request clearly shows: _booked · requested · waiting
   list · declined · confirmed (points credited)_. Every blocked action says _why_ (“Requires the
   qualification food-hygiene training – apply now”).
5. **Filters people understand.** Few, visible filters (day, area, “only suitable for me”, “only free
   places”) as chips; the result updates immediately. Default view: _shifts I can book_.
6. **Everything festival-specific is configuration**, nothing is hard-coded (names, areas, roles,
   profile fields, points rules, goodies, texts, branding).
7. **Flat rather than nested admin interface.** Few main sections, global search, every entity has a
   detail page with all related actions in one place.

---

## 2. Terms & domain model

| Term                           | Meaning                                                                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Instance**                   | One Wichtel installation (e.g. `helfen.example.de`). Global settings, branding, user accounts.                                                                                               |
| **Edition** (Jahrgang)         | One festival year. Shifts, bookings, points, goodies and waves always belong to exactly one edition. Can be copied from the previous year (all times shifted by X days).                     |
| **Account** (User)             | Persists across editions. Participation in an edition is confirmed once per year (`participation`).                                                                                          |
| **Area**                       | Tree node of any depth, e.g. _Overall → Infrastructure working group → Set-up_. Per edition.                                                                                                 |
| **Shift**                      | A period in an area, with place, meeting point, description, contact person, notes. Can be generated in series from a **shift template**.                                                    |
| **Position** (slot type)       | Within a shift: e.g. “4× volunteer, 1× shift lead”. Each position has its own number, booking mode, requirements, points rule, visibility.                                                   |
| **Booking** (assignment)       | Person ↔ position. Status: `requested`, `booked`, `waitlisted`, `declined`, `cancelled`, `attended`, `no_show`.                                                                              |
| **Qualification**              | Configurable (e.g. food-hygiene training, driving licence). Applied for by volunteers (tick box and/or upload), confirmed by an authorised role. Optionally with an expiry date.             |
| **Role**                       | Configurable bundle of permissions (e.g. _area lead_, _working-group lead_, _festival lead_, _volunteer desk_, _goodie desk_, _admin_).                                                      |
| **Role assignment**            | Person + role + **scope** (one or more area nodes or global) + edition. Permissions are inherited by sub-areas.                                                                              |
| **Group**                      | (a) _Buddy group_: created by volunteers themselves, via invite code. (b) _Admin group_: maintained by admins (e.g. “Crew”, “Here last year”) – usable for waves, visibility, group e-mails. |
| **Wave** (booking wave)        | Time-controlled release of shifts/positions for a target group.                                                                                                                              |
| **Condition**                  | Reusable rule building block (see §5).                                                                                                                                                       |
| **Points account**             | Ledger of entries per person and edition. Balance = sum.                                                                                                                                     |
| **Goodie**                     | Reward with a points price (also 0), conditions, optional profile fields, contingent, options.                                                                                               |
| **Goodie transaction** (claim) | Person ↔ goodie. Status: `selected`, `issued`, `cancelled`, `refunded`.                                                                                                                      |
| **Profile field**              | Configurable form field (types: text, number, date, choice, multiple choice, yes/no, file). Context: _registration_, _edition participation_, _goodie_, _position_, _qualification_.         |

---

## 3. Permissions & hierarchy

- **Permissions** are fine-grained capabilities defined in code, e.g. `area.manage`, `role.assign`,
  `shift.manage`, `assignment.manage`, `assignment.override`, `attendance.confirm`,
  `qualification.review`, `qualification.documents.view`, `helper.contact.view`, `goodie.manage`,
  `goodie.issue`, `points.adjust`, `mail.send`, `dashboard.view`, `audit.view`, `mcp.use`.
  Instance-wide administration (settings, editions, role definitions, admins) is not a permission but
  reserved for admins.
- **Roles** are freely configurable sets of them (with sensible templates at first installation).
- **Assignment with scope:** a role applies globally or to one/several area nodes including all their
  sub-nodes. This also allows cross-cutting roles (e.g. _volunteer desk_ = a role with
  `attendance.confirm`, `assignment.manage`, `qualification.review` on the root node; or an area lead
  who additionally looks after another sub-tree).
- **Multiple roles** per person are possible (an instance setting can forbid e.g. “volunteer and lead
  in the same area”).
- **Override:** whoever has `assignment.override` may add people despite a conflict (overlap, missing
  qualification, deadline, full). A warning appears, and the reason is stored in the audit log.
- **Roles apply per edition:** a role only acts on areas and objects of its edition, even when it is
  assigned for the whole edition. Roles of archived editions no longer grant any permissions.
- **Data visibility:** volunteers do not see other volunteers – except members of their own buddy
  group. Contact details (name, phone) are only visible to roles with `helper.contact.view` in the
  matching scope, and only in the current edition (people are instance-wide; old roles do not open
  current data).

---

## 4. Accounts & registration

- Registration with e-mail + password, e-mail confirmation, forgotten password. With a mail server,
  you log in after confirming; registration does not reveal whether an address already exists.
  Without a mail server, accounts count as confirmed immediately, and admins create reset links when
  needed.
- **Short registration**: name, e-mail, password, phone, language + fields configured as required.
  Everything else is asked _only when_ it is needed (goodie choice, position, qualification).
- **Edition participation**: when logging in to a new edition, once “I’m in this year” + any
  edition-specific fields (e.g. availability, interests).
- **Preferences**: favourite areas and availability periods → sorting/highlighting “suits you”.
- **Date of birth** optionally configurable as a field; age conditions usable (minors).
- **SSO**: not for now. The architecture provides for linkable external identities (OIDC/SAML) per
  account.
- **Data protection**: volunteers download their data themselves (JSON) and delete their account.
  On deletion all personal data disappears; shifts and points remain anonymously for statistics and
  accounting. Accounts without activity are anonymised automatically after an adjustable period
  (default 24 months), with a warning by mail. Admins are exempt.

---

## 5. Conditions (rule building block)

A uniform condition tree (AND/OR/NOT) that can be assembled by clicking in the UI – reused for
position requirements, visibility, waves, goodie eligibility and profile field display.

Building blocks (extensible):

- has qualification _Q_ (confirmed, not expired)
- member of admin group _G_
- age ≥ _n_ (on the day of the shift)
- profile field _F_ has value _V_
- has ≥ _n_ shifts / ≥ _h_ hours (attended) in area _A_ (including sub-areas)
- has received / not received goodie _X_
- has role _R_

Positions distinguish **required** and **preferred requirements** (“nice to have”): required blocks
the booking, preferred is only displayed and highlighted for leads.

---

## 6. Shifts & booking

### 6.1 Creating

- Individually, via **template + series** (days × time slots, e.g. “bar daily 18–22 and 22–02”), or by
  duplicating. Bulk editing (move, change places) in a planning view (timeline per area).
- Fields: title, area, start/end, place, meeting point, description, what to bring/dress code, contact
  person, visibility (condition), positions.
- Multilingual texts: German required, English optional with fallback; missing translations are
  flagged in the admin UI.

### 6.2 Booking modes per position

| Mode                   | Behaviour                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **Open**               | Tap → booked immediately.                                                                 |
| **With qualification** | Booked immediately if the required condition is met, otherwise a “Request access” button. |
| **On request**         | Request → lead approves/declines (with an optional message).                              |

### 6.3 Rules

- **Overlaps** with your own bookings are always blocked (including requests & waiting-list places,
  depending on the instance setting).
- **Minimum break** between shifts: configurable (default 0).
- **Cancellation deadline**: configurable global → area → shift (default 48 h). After that,
  cancelling only via a lead or via the shift market/swap.
- **Waiting list** per position: automatic moving up (default) or moving up with a confirmation
  deadline; notification by e-mail.
- **Shift market**: “give away” your own shift → visible to other eligible people; taking it over
  transfers the booking. After the cancellation deadline optionally with a lead’s approval
  (configurable per area).
- **Direct swap**: person A proposes a swap to person B (A↔B shifts), B accepts; same approval rule as
  the market.
- **Buddy groups**: group booking only if enough places are free and everyone meets all conditions;
  all members must accept (until then the places are reserved, with an expiry time).
- **Lead adds people**: directly, with the option to override (§3).

### 6.4 Waves

A wave = point in time (start, optional end) + target group (condition, e.g. group “Crew”, invitation
link) + scope (whole areas, single shifts or single positions) + optional limit (e.g. max. _n_
bookings in this wave). Without a wave, “everything open” applies.

### 6.5 Attendance

- The shift lead or a role with `attendance.confirm` ticks people off in a list **or** scans the
  volunteer’s personal QR code.
- Points are credited **when attendance is confirmed**, i.e. on arrival/at the start of the shift, not
  only after the shift ends.
- **Early check-in** (e.g. at the volunteer desk): attendance can be confirmed before the shift
  starts, so that the points are real immediately and e.g. the mandatory free ticket can be handed out
  directly. Time window configurable (default: from 00:00 on the day of the shift).
- **Check-in view of the volunteer desk**: scan QR → see the person’s shifts today → confirm with one
  tap → due mandatory goodies are shown immediately and can be handed out directly.
- “No-show” → no points + internal note. A confirmation already given can be corrected (points are
  reversed; if an already handed-out goodie is then no longer covered, an internal note is created).
- Later corrections possible at any time (audit log). Auto-confirmation after _x_ hours: configurable,
  off by default.

### 6.6 Short-notice replacement

A lead marks a place as “urgent” → group e-mail to suitable volunteers who are available at that time
(conditions + no overlap) with a direct link. Optional points bonus.

---

## 7. Points

- **Points rule** per position (inherited area → shift → position): fixed points per shift and/or per
  hour, multipliers for time windows (e.g. night) or days, optional bonuses (e.g. stepping in at short
  notice: “booking < _x_ h before start”).
- **Points account as a ledger** (immutable entries): `shift_credit`, `goodie_debit`,
  `goodie_refund`, `manual_correction` (with a mandatory reason), `cancellation_credit`.
- Points are credited when attendance is confirmed (including early check-in, §6.5).
- Shown to volunteers: **confirmed points** (spendable) and **pending points** (from booked, not yet
  confirmed shifts, for information only).
- Points are only valid in their edition. No leaderboard.

---

## 8. Goodies

### 8.1 Definition

- Name, description, image, **points price** (≥ 0), **eligibility** (condition, e.g. “≥ 1 shift in the
  tear-down area” for folding rulers), **max. per person**, **options** (e.g. size), **additional
  profile fields** (only asked when chosen, e.g. T-shirt size).
- **Self-service contingent** (optional, e.g. “max. 50 may be chosen by volunteers themselves”).
  Allocations by authorised people are exempt.
- **Stock** (optional, for the overview only).
- **Advance** (optional, off by default): the goodie may be handed out before the points are confirmed
  (e.g. a T-shirt before the first shift). If an advance is not covered, an internal note is created.

### 8.2 Mandatory goodies

- Goodies can be marked as **mandatory** with a priority (e.g. free ticket = 1 point). The first
  confirmed points are used for them automatically, in order of priority.
- **Refund instead of handing out** configurable, e.g. “I already bought a ticket”: the points are
  still spent on the mandatory goodie (it does not become free); instead of handing it out, the status
  is `refund_pending` → marked as `refunded` by authorised people. The repayment itself happens outside
  Wichtel; optionally with fields for the refund (e.g. ticket number), configurable like profile
  fields.

### 8.3 Flow

1. In the goodie section, volunteers see: what they can get, what they are still missing (“2 more
   points”, “only for tear-down volunteers”), balance.
2. **Choosing** only with confirmed points (except advance goodies) → points are deducted, status
   `selected`. Cancelling before handout refunds them.
3. **Handout on site**: the goodie desk scans the QR code → sees chosen and eligible goodies → “Hand
   out” (one tap). Alternatively manual search for the person (e.g. for requests by e-mail).
4. Exchange (change option) and return are possible, everything in the audit log.
5. Overview: who has what, handed out vs. chosen, contingent and stock levels.

---

## 9. Qualifications

- Configurable: name, description, type of proof (_tick box_, _upload_, _both_), expiry (optional),
  which role/area reviews.
- Flow: volunteers apply → review (confirm/decline with a reason) → unlocks positions.
- Leads can also grant qualifications directly.
- **Document retention** configurable per qualification: _keep_, _delete after confirmation_ (what
  remains is “confirmed on … by …”), _delete after the edition ends_. Viewing only with
  `qualification.documents.view` in the scope.

---

## 10. Communication

- E-mail via SMTP; sent asynchronously through a queue (retries on errors).
- **Automatic mails** (templates in DE/EN with default texts, customisable in the admin UI,
  placeholders): registration/confirmation, password, booking, cancellation, request approved/declined,
  moved up from waiting list, shift changed/cancelled, reminder (default 24 h before), swap/market,
  qualification reviewed, urgent call.
- **News** (replaces group e-mails) to target groups (area, shift, role, crew, volunteers, everyone,
  public), optionally also by e-mail. Who may write to whom follows from `mail.send` + scope (lead →
  own sub-tree, admin → everyone and public). A post is visible to everyone currently in the target
  group; the mail goes to those concerned at the time of publishing.
- **iCal feed** with your own shifts (secret, rotatable link).
- Print view/PDF: shift plan per area/day, crew list per shift.

---

## 11. Dashboards

- **Volunteers**: next shift, points, open requests, hints (“profile field missing”, “waiting list”).
- **Lead** (per scope): target/actual staffing as a timeline/heatmap per area and day, understaffed
  shifts, open requests and qualification reviews, today’s attendance.
- **Overall/admin**: aggregate across all areas, registration numbers, goodie overview.
- Live updates (server-sent events or polling).

---

## 12. Copying editions

A new edition from an existing one: choose what to take over (areas, role assignments, shift
templates/shifts, positions, points rules, goodies, profile fields, waves, mail templates) + time shift
(anchor date old → new). Bookings, points and goodie transactions are never copied.

---

## 12a. AI assistants (MCP)

- Endpoint `/mcp` (Streamable HTTP, stateless) in the app; log-in via OAuth 2.1 (dynamic client
  registration, code flow with PKCE S256, rotating refresh tokens, connection valid for 90 days).
- The permission `mcp.use` decides who may connect; every call checks it again. Tools use the same
  functions and permission checks as the interface.
- Per connection “read only” or “read and change”. The admin enables groups (shifts, staffing,
  areas/places/waves on by default; group e-mails, points, people, roles, goodies, editions,
  settings, own actions off by default). Never via MCP: administrator rights, deleting accounts,
  password links, changing e-mail address or password, the MCP settings themselves.
- Personal data: full / names only (default) / pseudonyms. In pseudonym mode the assistant only
  searches for pseudonyms, not for names.
- Only apps that redirect back to allowed hosts (admin setting, default `claude.ai`/`claude.com`,
  `localhost` always) can connect. A password change and refresh tokens used more than once
  disconnect connections.
- Consequential actions (series, deleting, urgent call, group e-mail) first return a preview; changes
  appear in the audit log with “via MCP: `<App>`”.

---

## 13. Audit log

Log of all writing actions by leads/admins and of all security- and points-relevant actions by
volunteers: who, when, what, before/after, reason. Filterable by person, entity, area. Entries are not
edited; for data protection, IP addresses are removed after a period (default 90 days), and when an
account is deleted, entries about the person lose their details.

---

## 14. Branding & language

- Instance settings in the admin UI: festival name, logo, favicon, primary/accent colours, background
  images, contact address. Live preview while editing; colour contrasts are checked for readability.
- Legal notice (from the operator details) and privacy policy (with a template that fits the
  configuration) are maintained in the admin area; alternatively links to external pages.
- UI language DE/EN, selectable per person; content falls back to DE.
- Light/dark mode.

---

## 15. Technology

| Area           | Choice                                                                                 | Reason                                                                             |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Language       | TypeScript (strict)                                                                    | Types throughout DB → UI, one code base                                            |
| Framework      | SvelteKit (Node adapter)                                                               | Fast, mobile-friendly UI; server logic in the same project                         |
| Database       | PostgreSQL                                                                             | Transactions, constraints (e.g. preventing overbooking)                            |
| ORM/migrations | Drizzle                                                                                | Type-safe, close to SQL, versioned migrations                                      |
| Validation     | Zod                                                                                    | Shared schemas for forms and server                                                |
| Auth           | Own lean session management (hashed tokens in the DB), Argon2id                        | E-mail/password; OIDC can be added later                                           |
| i18n           | Own type-safe catalogues (`de.ts` is the source, `en.ts` enforced by the type checker) | No extra build step; missing translations show up in the type check                |
| Styling        | Tailwind CSS + own components                                                          | Theming via CSS variables (branding)                                               |
| Jobs           | Transactional outbox table + worker in the app process                                 | Mails are created in the same transaction as the change; no additional service     |
| Development    | PGlite (embedded PostgreSQL)                                                           | `npm run dev` without Docker/database; tests run against real PostgreSQL semantics |
| Mail           | Nodemailer (SMTP)                                                                      |                                                                                    |
| Files          | Local volume (later optionally S3-compatible)                                          | Qualification proofs, images                                                       |
| Tests          | Vitest (domain logic), Playwright (E2E, also mobile viewport)                          | Core rules (booking, points, goodies) fully tested                                 |
| Deployment     | One Docker image + `docker-compose.yml` with Postgres                                  |                                                                                    |
| CI             | GitHub Actions: lint, type check, tests, image build                                   |                                                                                    |

**Architecture principles**

- Domain logic (booking rules, conditions, points, goodies) as pure, testable modules independent of
  UI and database.
- Critical operations (booking, moving up, goodie choice with contingent) in database transactions
  with locks/constraints, so that there is no overbooking when a wave starts.
- Permission checks centrally on the server, never only in the UI.

---

## 16. Milestones (proposal)

Design guidelines: [Design guidelines](/wichtel/en/reference/design/).

1. **Foundation**: project setup, Docker, CI, auth (registration, log-in, confirmation), i18n,
   branding, editions, area tree, roles & permissions, audit log.
2. **Shifts & booking (core)**: shifts/positions/templates, conditions, booking modes, overlaps,
   cancellation deadlines, volunteer shift overview (mobile), lead views, attendance (list).
3. **Points & goodies**: points rules, ledger, goodies incl. mandatory goodies, contingent, handout via
   QR.
4. **Convenience**: profile fields/form builder, qualifications with upload, waves, waiting list,
   e-mail templates & group e-mails, reminders, iCal.
5. **Collaboration**: buddy groups, shift market, swaps, urgent call.
6. **Overview**: dashboards, print views, copying editions.
7. **Data protection & operations**: data access, account deletion, retention periods, legal
   notice/privacy policy, structured logs, error alerts to admins, delivery overview; security review.
8. **Later**: SSO (OIDC/SAML), more exports (e.g. CSV), volunteer certificate.

---

## 17. Open points

- Detailed screen designs (volunteer flow on mobile, lead planning view).
- Clarify the SSO protocol of the student union/university.
- Privacy policy: complete the template with the organiser (hosting and mail providers, supervisory
  authority, retention of web server logs and backups).

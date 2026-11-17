---
title: Capacity
description: How much a small server running Wichtel can handle, what happens under very heavy load and how to defuse booking waves.
---

:::tip[At a glance]

- A VM with **2 vCPU and 2 GB RAM** (Wichtel and PostgreSQL together) handled **3000 volunteers and
  1500 shifts** in the test – with lots of headroom for everyday use.
- The bottleneck is the **one processor core** Wichtel uses, not the database.
- Under very heavy load Wichtel shows “It is very busy right now” instead of crashing. Better **split**
  big booking waves.

:::

## Measured

Load test from October 2026 on a VM with 2 vCPU and 2 GB RAM without swap, Wichtel and PostgreSQL
together, 3000 volunteers, 1500 shifts with 2090 positions over five days. The simulated users came
from another machine.

- **Everyday use** (browsing shifts, booking, calendar subscriptions, leads in the admin area): at
  least 10 visits per second with response times under 0.2 s – far more than a festival of this size
  needs. With rising load it only broke down at about 15–20 visits per second, without errors.
- **Sustained load** for 30 minutes at 8 visits per second: 95 % of responses under 93 ms, memory
  constant at about 105 MB.
- **Logins:** 40 per second without delay (95 % under 83 ms).
- **Shift list** for one person: 0.12 s and about 440 KB (one day, uncompressed); up to about 20
  requests per second.
- **Booking wave** with 1500 people booking at the same time within a few seconds: all bookings arrive
  correctly – no overbooking, no double or overlapping bookings. In the first minutes, however, pages
  and bookings wait several seconds (median 8 s), and 13 % of page requests were turned away with “It
  is very busy right now”.

The database was never the bottleneck (all queries under 2 ms on average) – the single Node process
was. The load test's tools and procedure are described in `load/README.md` in the repository.

## What happens under very heavy load

Wichtel runs as one Node process and uses **one processor core**; more cores mainly help the database.
So a rush does not overload memory, Wichtel computes at most four volunteer shift lists or home pages
at the same time. Further requests wait in a queue. If a request waits longer than **20 seconds** or
the queue is full (200), it gets the message “It is very busy right now. Please try again in a few
seconds.” (status 503).

The log then shows `server busy: requests turned away` with the number of turned-away requests, at
most once a minute.

## Big booking waves

If you expect a lot of people to book in the same minute:

- **Split the waves** – several [booking waves](/wichtel/en/organizers/waves/) for different areas or
  groups of people, at different times.
- Choose a **faster processor**. More cores alone help Wichtel little.
- Turn on **compression** in the proxy so the shift list arrives quickly over mobile networks
  ([Reverse proxy](/wichtel/en/operators/reverse-proxy/)).
- Watch the log during the wave:
  `docker compose logs -f --no-log-prefix app | jq -R 'fromjson? | select(.level != "info")'`.

## See also

- [Booking waves](/wichtel/en/organizers/waves/)
- [Logs and error messages](/wichtel/en/operators/logs/)

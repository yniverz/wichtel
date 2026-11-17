---
title: Installing with Portainer
description: Set up Wichtel as a Portainer stack, set the environment variables and find the setup link.
---

:::tip[At a glance]

- _Stacks → Add stack_, paste the content of `docker-compose.yml` (or point to the repository).
- Under _Environment variables_ set at least `POSTGRES_PASSWORD` and `PUBLIC_URL`.
- Deploy; the logs of the `app` container show the setup link.

:::

Wichtel's `docker-compose.yml` works unchanged as a Portainer stack. The values that live in `.env`
with Docker Compose come from the stack's environment variables here.

## Step by step

1. In Portainer open _Stacks → Add stack_ and give it a name, e.g. `wichtel`.
2. Copy the content of
   [`docker-compose.yml`](https://raw.githubusercontent.com/yniverz/wichtel/main/docker-compose.yml)
   into the _Web editor_. Alternatively choose _Repository_, enter the repository URL
   `https://github.com/yniverz/wichtel` and `docker-compose.yml` as the compose path.
3. Under _Environment variables_ set:
   - `POSTGRES_PASSWORD` – a long, random password (required)
   - `PUBLIC_URL` – e.g. `https://helfen.example.de` (required)
   - optionally `WICHTEL_PORT`, `WICHTEL_BIND` and the `SMTP_*` variables, see
     [Configuration](/wichtel/en/operators/configuration/).
4. Click _Deploy the stack_.
5. Under _Containers_ open the container of the `app` service, choose _Logs_ and look for the line
   with `setup?token=`. Open the link and create the first admin account – as in
   [Installing with Docker Compose](/wichtel/en/operators/install/#setup-link).

## Common questions

### Portainer says “set POSTGRES_PASSWORD” or “set PUBLIC_URL”.

The variable is missing from the stack's environment variables. The stack does not start without
these two.

### The image cannot be pulled (unauthorized / denied).

If GitHub lists the image as private, the repository owner has to release it: on GitHub under
_Packages → wichtel → Package settings_ set the visibility to “Public”. This mainly concerns your own
forks: their CI publishes the image under your own account (`ghcr.io/<account>/wichtel`); select it in
the stack with `WICHTEL_IMAGE`.

### How do I update?

Redeploy the stack and have it pull the image again (Portainer offers an option to re-pull the image
when updating the stack). Migrations run on start. Back up first – see
[Updates and backups](/wichtel/en/operators/updates-backups/).

### My reverse proxy also runs in Portainer.

Put both containers into a shared Docker network and point the proxy at the app container, port
`3000`. Do not expose the app port to the internet. Details: [Reverse proxy](/wichtel/en/operators/reverse-proxy/).

## See also

- [Configuration](/wichtel/en/operators/configuration/)
- [Troubleshooting](/wichtel/en/operators/troubleshooting/)

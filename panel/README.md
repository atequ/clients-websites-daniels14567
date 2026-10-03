# Internal client panel

Shared internal tool for the two developers of this repo: a list of client website
projects with the agreed price per site, payment status, project status and a
revenue summary.

This is **not** a client website. It is never handed to a client and it is the one
place in this repo where our own business data is tracked. Client site projects live
in their own `<Business name>/` folders — see `CLAUDE.md` at the repo root.

Outbound lead search (gisfinder import, WhatsApp queue, per-lead price pages) is a
possible later phase and is not part of this code.

## Stack

- Static frontend: plain HTML/CSS/JS with ES modules, no framework and no build step
- Supabase: Postgres + Auth (email/password sign-in)
- Netlify: hosting, auto-deploy from `main`, one function that serves public config
- Only external dependency is `@supabase/supabase-js`, loaded from jsDelivr at a
  pinned version, so there is no npm install and no lockfile

## Layout

```
panel/
├── public/              static frontend (Netlify publish directory)
│   ├── index.html       sign-in page
│   ├── admin/index.html panel: clients + analytics
│   └── assets/          styles and scripts
├── netlify/functions/
│   └── config.mjs       serves SUPABASE_URL and SUPABASE_ANON_KEY from env vars
├── netlify.toml         publish, functions and security headers
└── supabase/migrations/ schema migrations (schema only, never data)
```

## Netlify setup

This panel is its own Netlify site, separate from the client sites:

| Setting | Value |
| --- | --- |
| Base directory | `panel` |
| Build command | empty |
| Publish directory | empty (set by `netlify.toml`) |

Environment variables (Site configuration → Environment variables):

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Project URL from Supabase |
| `SUPABASE_ANON_KEY` | Public anon key, protected by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key, used only by the tasks function |
| `TASKS_API_TOKEN` | Shared secret an agent sends to `/api/tasks` |

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS, so it is read only inside
`netlify/functions/tasks.mjs` and is never returned to a browser. Putting it in
`SUPABASE_ANON_KEY` would publish it to every visitor; `config.mjs` refuses to serve
a secret key for exactly that reason.

## Tasks API

`/api/tasks` lets an AI agent work with the task list. Every request must carry the
shared secret in an `x-api-token` header; without it the endpoint answers 401 and
nothing else.

| Method | Does |
| --- | --- |
| `GET /api/tasks` | Lists tasks assigned to the agent. Add `?include_done=1` for finished ones. |
| `POST /api/tasks` | Creates a task from `{title, description, assignee, priority}`. |

A created task is marked `created_by: agent`, so the panel shows where it came from.
Agents cannot change status or delete tasks — people do that in the panel.

## Supabase setup

1. Run the files in `supabase/migrations/` in the SQL editor, in name order.
2. Authentication → disable new sign-ups, so only manually created accounts exist.
3. Authentication → Users → create one account per developer.

## Security

- Client data lives only in Supabase, never in this repo.
- Row Level Security is on for `clients`; only authenticated users can read or write.
- The panel is fully behind sign-in and has no public pages.
- `payment_status` is a generated column derived from `price` and `paid_amount`, so it
  cannot drift out of sync with the amounts.

## Local development

```bash
npm install -g netlify-cli
netlify link
netlify dev
```

`netlify dev` serves the static files and the `/api/config` function together, using
the environment variables of the linked site.

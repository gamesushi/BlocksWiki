# BlockWiki

> A block-based personal knowledge wiki. Capture anything, connect it, and grow a network of ideas.

BlockWiki is a personal knowledge-management app built around the idea of **blocks** — small, atomic pieces of content (a note, a quote, an image, a link). Instead of organizing content into folders, you connect blocks into **channels** to form a navigable graph, Are.na-style. It is designed for fast capture (including a PWA "quick capture" mode) and for curating what you collect.

## Features

- **Blocks** — atomic content units (text / image / link). Create, edit, and delete your own blocks.
- **Channels** — curated collections of blocks. Connect any block into a channel; reorder the channel's contents.
- **Connections graph** — blocks and channels are linked through typed edges, forming a personal knowledge graph.
- **Quick Capture (PWA)** — add-to-homescreen install; open straight to a capture box, paste from clipboard, and store offline (queued, synced when back online).
- **Social layer** — follow users and channels, comment on blocks, receive notifications.
- **Wiki pages** — admin-authored documentation pages (write access restricted to admins).
- **Search & Explore** — full-text search across blocks and a public-channel discovery view.
- **Auth** — email/username + password via Strapi users-permissions (JWT stored in an http-only cookie; the frontend never sees the token).

## Tech Stack

| Layer        | Technology                                              |
|--------------|---------------------------------------------------------|
| Backend      | [Strapi](https://strapi.io/) v5.50 (Node.js, SQLite)    |
| Frontend     | [Next.js](https://nextjs.org/) 16.2 (React 19, Tailwind)|
| Language     | TypeScript (strict)                                     |
| Auth         | Strapi users-permissions (JWT, http-only cookie)        |
| PWA          | Web manifest + standalone display + share target        |
| Deploy (ref) | Docker (Strapi) on a VM + Vercel (Next.js)              |

## Project Structure

```
blockwiki/
├── api/          # Strapi v5 backend (the live application backend)
│   ├── src/      # content-types, controllers, bootstrap seed/permissions
│   └── .tmp/     # SQLite DB + uploads (gitignored, created at runtime)
├── web/          # Next.js 16 frontend (the live application frontend)
│   ├── app/      # App Router pages (channel, block, explore, capture, ...)
│   └── components/
├── backend/      # early prototype (not the live backend; kept for reference)
├── frontend/     # early prototype (not the live frontend; kept for reference)
├── deploy/       # deployment helpers
├── scripts/      # setup scripts (e.g. Oracle VM bootstrap)
├── docker-compose.yml  # production Strapi service definition
└── .env.example  # backend environment template
```

`api/` and `web/` are the real application. `backend/` and `frontend/` are earlier prototypes and are **not** kept in sync with the running app.

## Prerequisites

- **Node.js** 18 LTS or newer (20+ recommended).
- **npm**.
- For production: Docker, a Linux VM (or any host), and a Vercel account (or any static/SSR host).

> **Apple Silicon note:** native modules (`sharp`, `@next/swc`, `@tailwindcss/oxide`, `lightningcss`, …) must match your CPU architecture. If `web/` or `api/` was installed under Rosetta/x64, reinstall with an arm64 Node:
> ```bash
> rm -rf node_modules && npm install --include=optional
> ```

## Local Development

### 1. Backend (Strapi) — `http://localhost:1338`

```bash
cd api
cp .env.example .env
# Fill the secrets in .env (any random strings are fine for local dev):
#   openssl rand -base64 16   # run once per variable
npm install
npm run develop
```

The admin panel is at <http://localhost:1338/admin>. On first boot, `bootstrap` idempotently:
- creates the users-permissions roles/actions the app needs,
- promotes the usernames listed in `BLOCKWIKI_ADMINS` (default: `midori`) to admin,
- creates indexes and backfills connection counters.

You can register a normal account from the frontend, or log in with the promoted admin account.

### 2. Frontend (Next.js) — `http://localhost:3000` (or `3001` if 3000 is taken)

```bash
cd web
# tell the frontend where Strapi lives:
echo 'STRAPI_URL=http://localhost:1338' > .env.local
npm install
npm run dev
```

Open <http://localhost:3001> (Next auto-increments the port if 3000 is busy).

## Environment Variables

Backend (`.env`, copied from `.env.example`):

| Variable             | Purpose                                                      |
|----------------------|--------------------------------------------------------------|
| `APP_KEYS`           | Strapi app keys (comma-separated random strings)             |
| `API_TOKEN_SALT`     | API token salt                                              |
| `ADMIN_JWT_SECRET`   | Admin JWT secret                                            |
| `JWT_SECRET`         | End-user JWT secret                                         |
| `TRANSFER_TOKEN_SALT` | Transfer token salt                                       |
| `ENCRYPTION_KEY`     | Data encryption key                                         |
| `DATABASE_CLIENT`    | `sqlite` (default)                                          |
| `DATABASE_FILENAME`  | `".tmp/data.db"`                                            |
| `CORS_ORIGINS`       | Comma-separated frontend origin(s), e.g. `https://blockwiki.yourdomain.com` |
| `BLOCKWIKI_ADMINS`   | Comma-separated usernames promoted to admin on boot (default `midori`) |

Frontend (`.env.local`):

| Variable      | Purpose                          |
|---------------|----------------------------------|
| `STRAPI_URL`  | Backend base URL, e.g. `http://localhost:1338` |

## Production Deployment

The reference setup runs the Strapi backend on a small VM (Oracle Free Tier used in testing) behind Docker + nginx with TLS, and deploys the Next.js frontend to Vercel. See [`DEPLOY.md`](./DEPLOY.md) for the full runbook (VM provisioning, `docker compose up -d --build`, nginx/Let's Encrypt, Vercel project settings, and the `scripts/setup-oracle-vm.sh` helper that generates real secrets).

High-level steps:

1. **Backend** — on the VM: `cp .env.example .env`, run `scripts/setup-oracle-vm.sh` (generates secrets + nginx config), then `docker compose up -d --build`. The compose file binds Strapi to `127.0.0.1:1338`; nginx terminates TLS and proxies `/` → `1338`.
2. **Frontend** — deploy `web/` to Vercel. Set the `STRAPI_URL` environment variable to your backend's public URL and `CORS_ORIGINS` on the backend to your Vercel domain.
3. **Go public** — in the GitHub repo Settings, set the repository to **Public**.

## Scripts

| Command            | Location | Description                          |
|--------------------|----------|--------------------------------------|
| `npm run develop`  | `api/`   | Start Strapi in dev mode             |
| `npm run build`    | `api/`   | Build Strapi for production          |
| `npm run dev`      | `web/`   | Start Next.js dev server             |
| `npm run build`    | `web/`   | Build Next.js for production         |
| `docker compose up -d --build` | repo root | Build & run the production Strapi container |

## License

BlockWiki is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license.

- You may **share** and **adapt** the material for **non-commercial** purposes only, provided appropriate credit is given.
- For the full legal text, see the [LICENSE](./LICENSE) file.

Copyright © 2026 gamesushi.

---

*BlockWiki is a rebrand of the earlier "LifeWiki" project.*

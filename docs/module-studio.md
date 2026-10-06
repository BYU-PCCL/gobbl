# Module Studio

Module Studio is a workspace at `/studio` where the poli-sci team builds and
iterates on module drafts. It lives inside the Gobbl app but is kept separate
from it: Studio code is under `src/app/(studio)/`, `src/app/api/studio/`,
`src/lib/studio/` and `src/components/studio/`. The only places it touches
Gobbl are the `User.studioAccess` flag and one link in the desktop sidebar.

## Who can open it

Only signed-in users whose `User.studioAccess` is `true`. Everyone else sees no
link, `/studio` sends them to `/dashboard`, and the Studio API answers 403.

To grant access, set `studioAccess = true` on the user's row (Prisma Studio or
the Supabase dashboard). It takes effect on their next page load; no sign-out
needed. There is no UI for this yet.

## Trying it without running anything

The `module-studio` branch deploys to a stable preview URL:

https://gobbl-git-module-studio-aphasiavercel.vercel.app

It uses the Studio database (below), so the seed accounts work:
`CivilSam` / `password123` has Studio access; the other seed users do not.
Preview deployments are SSO-protected, so you need to be a member of the
AphasiaVercel team on Vercel to open it.

## Running it locally

Assumes you already have Gobbl cloned and a working `.env`.

1. Switch branches and install:

   ```bash
   git fetch
   git checkout module-studio
   npm install
   ```

2. Create `.env.studio.local` in the repo root (git ignores it). Ask Boston for
   the two connection strings; they are for a Supabase **preview branch** that
   holds a copy of the schema plus seed data, not the production database.

   ```
   DATABASE_URL=postgresql://...   # transaction pooler, port 6543, ?pgbouncer=true
   DIRECT_URL=postgresql://...     # session pooler, port 5432
   ```

3. Run the app with those loaded:

   ```bash
   npm run studio:dev
   ```

   Then sign in as `CivilSam` / `password123` and open `/studio`.

The `studio:*` scripts load `.env.studio.local` on top of your `.env` before
running the normal command, and work the same in PowerShell and bash:

| Script | What it does |
|---|---|
| `npm run studio:dev` | `next dev` against the Studio database |
| `npm run studio:db:push` | `prisma db push` (plus the RLS script) against the Studio database |
| `npm run studio:db:studio` | Prisma Studio on the Studio database, e.g. to flip `studioAccess` |

## Do not run `db:push` or `build` on this branch without the `studio:` prefix

Your `.env` points at **production**. This branch's `prisma/schema.prisma`
adds a column and a table, so a plain `npm run db:push` or `npm run build` on
this branch would push the Studio schema to the production database. Use
`npm run studio:db:push` instead. Production will get the schema when the
branch merges to `main`, and not before.

## What exists so far

- Drafts list (`/studio`): create, rename, delete. Drafts are shared with
  everyone who has Studio access.
- Editor (`/studio/[id]`): title and description, plus the three regions the
  editor will grow into: component palette, module flow (canvas) and preview.
- API under `/api/studio/`: access check and draft CRUD.
- A draft is stored as JSON: `{ version: 1, steps: [{ id, type, props }] }`.
  `type` names an entry in `STUDIO_COMPONENTS` (`src/lib/studio/components.ts`),
  which is the one place to add a component. It is empty for now.

Next up, in order: drag-and-drop editor with the first components (mirroring
the existing diagnostic, content, practice and reflection steps), then preview,
then export to a `ModuleConfig`, then SSO and flag management.

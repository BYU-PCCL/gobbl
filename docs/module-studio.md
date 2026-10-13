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

- Drafts list (`/studio`): create, rename, duplicate, delete, and search once there
  are more than a few. Drafts are shared with everyone who has Studio access.
- Editor (`/studio/[id]`):
  - Title, description, skill and estimated minutes.
  - A **Standard** version and an optional **Advanced** one (started empty or as a
    copy of Standard), matching a `ModuleConfig`'s variants.
  - Components: survey questions, content cards, quiz, AI chat, reflection. Click
    one to add it after the selected step, or drag it into place. Steps can be
    dragged, moved with the arrows, duplicated and removed.
  - Changes save on their own a moment after you stop (Ctrl+S saves straight
    away). Undo and redo cover everything, including removing a step or a version
    (Ctrl+Z / Ctrl+Shift+Z outside text fields). Leaving with unsaved changes asks
    first.
  - Half-finished drafts always save. Problems with a step show as "N to fix" in
    the flow and under each field once you've left it; they only block preview.
  - If someone else saves while you're editing, you choose whose version to keep.
    Either way the other one stays in History.
- Version history: every save is kept. Saves by the same person within 10 minutes
  are grouped into one entry, and naming a version freezes it. Any version can be
  previewed, or restored into the editor (which can be undone).
- Preview: the whole module, or from any step, using the module runner's own
  screens (`src/components/skills/StepView.tsx`). The AI chat uses the real prompt
  pipeline through `/api/studio/preview/chat`. Nothing is saved. "Back to editor"
  stays pinned at the top; Esc and the browser's back button also return to the
  editor.
- API under `/api/studio/`: access check, draft CRUD, `modules/[id]/versions`.
- A draft is stored as JSON:
  `{ version: 2, settings: { skill, estimatedMinutes }, variants: [{ key, steps: [{ id, type, props }] }] }`.
  Version 1 drafts (`{ version: 1, steps }`) are read as a Standard version.
  `type` names an entry in `STUDIO_COMPONENTS` (`src/lib/studio/components.ts`),
  which is the one place to add a component. `src/lib/studio/runtime.ts` turns a
  step into the runner's `ModuleStep`.
- Answer variables: a reflection, survey question or quiz question can "save the
  answer as" a name (stored in its props as `saveAs`), and any text in a later step
  can write `{name}` to show it (the picked option's label, or the reflection text).
  Text fields offer an "Insert an earlier answer" menu, and the module flow shows
  which answers each step saves and uses. Problems like a use before the answer, an
  unknown name, or two answers with one name show up as "to fix". `{name}`,
  `{backstory}`, `{beliefs}` and `{topic}` stay reserved for the AI chat. A component
  offers answers through `answers` in its `STUDIO_COMPONENTS` entry. Filling-in
  is `fillAnswers` in `src/lib/studio/variables.ts`. For the AI chat, the server fills
  them in after checking the author's settings
  (`/api/studio/preview/chat` takes `answers`).
  The real runner doesn't fill them in yet. Export needs to build the answers from
  `stepResponses` and `statement1/2`, then run `fillAnswers` on each step the
  `start`/`advance` routes return, and on the topic before `createDebate`.

Next up: export to a `ModuleConfig`, then SSO and flag management.

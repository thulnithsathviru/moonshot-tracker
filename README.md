# Moonshot Programme Tracker

A single-file tracker for the Moonshot refit programme: milestone matrix, outlet calendar,
and editable critical paths — built from the critical-path workbook and shareable as a plain
web page. No build step, no server code: `index.html` + `data.json` is the whole app.

## The three files

| File | What it is |
|---|---|
| `index.html` | The entire app (open it anywhere, host it on GitHub Pages) |
| `data.json` | The published dataset — outlets, tasks, categories, programme calendar |
| `README.md` | This file |

## Where the data comes from (priority order)

1. **Supabase** — if connected, the cloud copy wins. Every device sees the same data.
2. **Local draft** — unsaved/offline edits kept in the browser.
3. **`data.json`** — the published file sitting next to `index.html`.
4. **Baked-in copy** — a snapshot inside `index.html`, so the file works even alone.

## The database (Supabase) — already wired in

The tracker is connected to a Supabase project in the code itself, so there is **no
sign-in and nothing to configure** — open the link and it reads and writes the shared
dataset. Anyone you give the link to can view *and* edit; there is no separate login.

The project URL and the *publishable* (anon) key are baked into `index.html`. These are
not secrets — Supabase designs them to live in frontend code. They grant only what the
database's Row Level Security policy allows, which for this project is deliberately open:
read + write to anyone with the link.

### One-time database setup

If the `tracker_state` table isn't set up yet, run this once in the Supabase
**SQL Editor** (New query → paste → Run):

```sql
create table if not exists tracker_state (
  id int primary key,
  data jsonb,
  updated_at timestamptz
);

alter table tracker_state enable row level security;

-- remove any locked-down policies from an earlier attempt (safe if none exist)
drop policy if exists "team read"   on tracker_state;
drop policy if exists "team insert" on tracker_state;
drop policy if exists "team update" on tracker_state;
drop policy if exists "team access" on tracker_state;

-- open read + write to anyone with the link
create policy "public access" on tracker_state
  for all to anon using (true) with check (true);

-- make sure the anon role can reach the table
-- (needed because "Automatically expose new tables" is off)
grant select, insert, update on tracker_state to anon;
```

That's the whole backend. No users, no auth settings to touch. (The "Allow new users to
sign up" toggle is irrelevant here since nobody signs in — leave it off.)

### Seeding the data (first run)

1. Open the deployed tracker. The cloud starts empty, so it shows the built-in snapshot
   (all 20 outlets) and the banner reads *"Cloud is empty — press Save to publish."*
2. Press **Save** in the top bar. That pushes the current data up to Supabase.
3. Done. From now on every device that opens the link loads the same live data, and
   **Save** publishes changes for everyone.

### Day-to-day

- **Everything autosaves.** Edit anywhere and the change publishes to the database within a
  second or two — the status bar shows "Saving…" then "All changes saved". There is no
  Save button.
- **View choices are remembered** — outlet selections and the chosen critical path
  persist on each device across reloads.
- **Categories are managed once, centrally** (Setup → Task categorisation). Every unique
  task name across all outlets is listed there; pick its category and every outlet updates,
  and future imports of the same task name land in the right category automatically.
- **A milestone is a category.** Tick **Milestone** on a category (Setup, or the chips on
  the Milestones page) and it becomes a row of the matrix; each cell spans from the first
  to the last day of that category's tasks for the outlet. No per-task flags.
- **Special days** are marked per type in Setup — add one day or a from–to range and every
  outlet's chart recalculates. The chart label always shows the day type's name, so
  renaming a type updates every chart instantly.
- **The Edit switch (top bar) guards all editing.** Off, the tracker is fully view-only —
  chart clicks do nothing. On, the frozen columns become editable and chart clicks pick
  the exact days a task runs — start and end set themselves, and gaps between picked days
  are simply days the work doesn't carry. In Edit mode, clicking a special-day column
  adjusts that day (type, range, works-anyway); otherwise special days are managed in Setup.
- **Export** (top bar) opens a dialog to pick the type (PNG, PDF, or — on a Critical
  Path — a styled Excel of the current outlet) and the size, then renders the complete
  table including everything scrolled out of view.
- **Backup** (Setup page) downloads a full safety copy, exports every critical path as a
  colour-styled Excel workbook (one sheet per outlet, category-coloured bars, tinted
  special-day columns with rotated labels), and can restore from a backup file — restoring
  replaces the live data.

### Who can access — read this once

There is no login, so **the link is the key**: anyone who has it can view and edit the
programme data. Share it only within the team (WhatsApp, email), the way you'd share an
"anyone with the link can edit" Google Sheet. If the link ever leaks and you need to cut
access, rotate the project's anon key in Supabase (**Project Settings → API → roll the
anon key**) and redeploy `index.html` with the new key — the old link then stops working.

## The `data.json` fallback

`data.json` in the repo is only a **fallback snapshot** — the tracker uses it when the
database can't be reached (offline, or before the one-time seed). Day to day, the live
data lives in Supabase and you don't need to touch this file. If you want to refresh the
snapshot, press **Download backup** and commit the file. Because it carries live handover
dates, a **private repo is strongly recommended**.

## How the pieces work

**Milestones.** The matrix is the slide layout: milestone categories as numbered rows,
outlets as coloured columns. Each cell runs from the first day of the earliest task to the
last day of the latest task in that category for the outlet. Choose which categories count
via the chips (or Setup); pick which outlets show with the outlet chips. Launch dates are
set by hand — click a Launch cell.

**Calendar.** Month, week and day views, chips coloured per outlet. Categorised tasks group
into one chip per outlet+category; uncategorised tasks always show individually. Every
category appears on the calendar.

**Critical Path.** The workbook view with a frozen pane: Task, Start, End, Responsible and
Department columns pinned left, the date row (with special-day labels) pinned top. Turn on
**Edit** to change names, people and departments inline; click chart cells to pick the
exact work days — dates derive themselves. Scrolling down auto-pans the chart to the rows
you're looking at.

**Setup.** Categories (with the Milestone tick), the central task-to-category list, special
days per type, outlet cards, and backup/restore.

**Import.** Press **Import Excel** in the top bar. Sheets become outlets; holiday text
blocks land on the shared calendar; where a sheet shows work on a marked day, that outlet
gets the works-anyway exception automatically. Categories come from the central task list —
re-importing keeps all your choices for any task name it has seen before.

## Hosting

GitHub Pages: put the three files in a repo → Settings → Pages → deploy from branch.
Works equally from any static host or a shared drive (opened from disk, the page uses its
baked-in data plus your local draft; connect Supabase and even that limitation disappears).

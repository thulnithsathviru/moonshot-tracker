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

- **Edit anywhere, press Save** — the change lands in the database and every other device
  picks it up on its next open/refresh.
- **New outlets or a revised critical path** — press **Import Excel** (top bar), pick the
  workbook, choose the sheets, and Save. Re-importing an existing outlet refreshes its
  **dates** while keeping your category and milestone choices for tasks whose names are
  unchanged.
- **Download backup** (in the status bar) saves a `data.json` copy to your computer. Since
  anyone with the link can overwrite the data, grab a backup before big changes — you can
  restore it, or reseed from the Excel, at any time.

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

**Milestones.** The matrix is the slide layout: work packages as numbered rows, outlets as
coloured columns. Each cell is the **combined range of every milestone-flagged task** in
that category — e.g. all the flagged Back Wall tasks from 27 Jul to 10 Aug show as
"27 Jul – 10 Aug". Flag tasks with ◆ on the Critical Path, or press **Edit cells** and pick
the tasks per cell. The Launch row is set by hand (click a cell). **Strike past** crosses
out finished milestones. PNG/PDF export from the toolbar.

**Calendar.** Month, week and day views of every outlet at once, chips coloured per outlet.
Grouped mode collapses each outlet's category into one chip with a task count — but tasks
that don't belong to a category (Other) always show individually by name. Click any chip
for the full day breakdown.

**Critical Path.** The workbook view, editable. Click a task's ✎ to edit dates, people,
category, progress; click a cell inside a bar to knock a day out or put it back; click a
cell beyond the bar to extend it. ◆ toggles the milestone flag.

**Holidays are programme-wide.** Click a date header to mark a day: it lands on the shared
calendar, so every outlet pauses there and all bars recalculate. If one outlet genuinely
works that day, tick **"works on this day anyway"** in the same dialog — the exception
applies only to that outlet, and the chart shows a faint curtain behind its bars. Fully
blocked days show the solid curtain with the vertical label, exactly like the Excel sheets.

**Setup.** Rename/recolour categories, day types, outlets; the whole programme calendar in
one table, with each date's per-outlet exceptions listed.

**Import.** Press **Import Excel** in the top bar to drop the critical-paths workbook in
any time. Sheets become outlets; holiday text blocks land on the shared calendar; where a
sheet shows work on a marked day, that outlet gets the works-anyway exception
automatically. Re-importing refreshes an existing outlet's **dates** while keeping your
category and milestone choices for any task whose name hasn't changed.

## Hosting

GitHub Pages: put the three files in a repo → Settings → Pages → deploy from branch.
Works equally from any static host or a shared drive (opened from disk, the page uses its
baked-in data plus your local draft; connect Supabase and even that limitation disappears).

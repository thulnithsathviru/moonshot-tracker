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

## Cloud sync with Supabase (recommended)

One free Supabase project makes every device read and write the same dataset — no more
downloading and committing `data.json` to move edits between the laptop and the phone.

1. Create a free account at **supabase.com** → **New project** (any name/region; note the database password it asks you to set, though the tracker never uses it).
2. In the project, open **SQL Editor** → **New query**, paste and **Run**:

```sql
create table tracker_state (
  id int primary key,
  data jsonb,
  updated_at timestamptz
);
alter table tracker_state enable row level security;
create policy "team access" on tracker_state
  for all to anon using (true) with check (true);
```

3. Go to **Settings → API** and copy two things: the **Project URL**
   (`https://xxxx.supabase.co`) and the **anon public** key.
4. Open the tracker → **Data** tab → paste both → **Connect & load**.
   The cloud is empty at first, so let it **push** the current dataset up.
5. Repeat step 4 on every device (phone included). From then on **Save** writes to the
   cloud and opening the page loads from it.

**Sharing note:** the anon key + URL together grant edit access to the tracker's data.
Share them only with the team — don't paste them into the public repo. They live in each
browser's local storage, never inside `data.json`.

## Publishing without Supabase

Edit → **Save** → **Download data.json** → replace the file in the repo → commit.
Everyone gets the new data on refresh. (The repo holds live handover dates — a private
repo is strongly recommended.)

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

**Import.** Drop the critical-paths workbook in any time. Sheets become outlets; holiday
text blocks land on the shared calendar; where a sheet shows work on a marked day, that
outlet gets the works-anyway exception automatically. Re-importing keeps your category and
milestone choices for any task whose name hasn't changed.

## Hosting

GitHub Pages: put the three files in a repo → Settings → Pages → deploy from branch.
Works equally from any static host or a shared drive (opened from disk, the page uses its
baked-in data plus your local draft; connect Supabase and even that limitation disappears).

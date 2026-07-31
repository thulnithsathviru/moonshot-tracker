# Moonshot Programme Tracker

Browser-based tool for the Moonshot retail refit programme: milestone plan, work calendar, and
editable critical paths for every outlet. One HTML file, no build step, no server.

## The three views

**Milestone Plan** — outlets down the side, milestone categories across the top. Each cell shows the
milestones flagged in that category with their dates, and the last column carries the handover date.
Toggle categories on and off to keep the table to what a given audience needs.

**Calendar** — day, week, and month. By default each entry is one outlet + one category with a count,
rather than every task listed separately, so a busy day reads as `Kandy 2 · Back Wall Work (7)` instead
of seven lines. Switch to *Every task listed* when you want the detail. Filter by outlet and by
category; click any day to drill in.

**Critical Path** — the Gantt, per outlet, fully editable:

- add, edit, duplicate, reorder, and delete tasks;
- pick start and end dates from a date picker;
- click a date header to mark a holiday or non-working day, choose its type and colour, and apply it
  either programme-wide or to that outlet alone;
- click a cell to extend a bar, or to knock a single day out of a task without moving its dates.

Working-day counts recalculate the moment a holiday changes. That is the fix for bars that used to go
stale when the dates moved in Excel.

## Non-working days

A day type carries a colour and one decision: does work continue on it. Poya Day, Public Holiday, Stock
Count Programme, and No Work Day ship as non-working; add your own under **Categories & Holidays**.
Days marked there apply to every outlet; a day marked from a Gantt header can be scoped to one outlet
and overrides the programme calendar for it.

## Categories

Tasks are grouped into work packages — Back Wall Work, Juice & Bakery Fit-out, Merchandising, Kitchen
Works and so on. Each category has a colour and two switches: show it on the Milestone Plan, show it in
the Calendar. Add, rename, recolour, and delete categories freely; deleting one moves its tasks to
*Other* rather than losing them.

A milestone is any task you have flagged with the ◆ button. It shows on the Milestone Plan under
whichever category the task belongs to.

## Getting one dataset onto every device

Edits are held in the browser they were made in. To publish a set that all devices see:

1. Edit on the PC.
2. **Data → Download data.json**.
3. Commit that file into this repo next to `index.html`.

Every device that opens the Pages link then loads `data.json` automatically — no upload, no re-entry.
The file also carries a baked-in copy of the data, so it still works opened straight off disk with no
network. If the published file moves ahead of a device's local draft, that device says so and offers
both options rather than silently picking one.

## Importing a workbook

**Import Excel** reads a critical-path workbook, one sheet per outlet. It looks for a row of dates
across the top, columns headed Description / Responsibility / Completed Level / Department, a `1` in a
date column to draw the bar, and a merged vertical block of text (`POYA DAY` and the like) to mark a
non-working day.

Categories are assigned from the task wording and the obvious milestones are flagged, as a starting
point only. Re-importing an updated workbook keeps your category and milestone choices for any task
whose name has not changed, so tidying up is a one-off.

Where a task bar breaks for no marked reason, the tool flags those dates and offers to add them as
non-working days across the programme.

## Tech

Plain HTML, CSS, and JavaScript in a single file. Loaded from public CDNs:

- [SheetJS (xlsx)](https://sheetjs.com/) — reading Excel workbooks
- [html2canvas](https://html2canvas.hertzen.com/) — rendering views to images
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export

Everything runs locally in the browser. Nothing is uploaded anywhere.

## Note on the repository

`data.json` contains live outlet dates. Keep the repository private, or strip the file before making it
public.

---

*Built during a project internship at Jaykay Marketing Services (John Keells Holdings), Project &
Properties Division.*

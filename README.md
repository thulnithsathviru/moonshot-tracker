# Moonshot Milestone Tracker

A single-file, browser-based tool for tracking outlet-level milestones and critical-path progress across the Moonshot retail refit programme. Built as one self-contained HTML file — no build step, no server, no dependencies to install.

## What it does

- **Milestone Matrix** — view every outlet against its milestones in a single grid, month by month, so slippage is visible at a glance.
- **Excel / CSV import** — pull milestone dates straight from a workbook, or type them in by hand per outlet.
- **Custom table builder** — create, import, edit, and save your own tables (insert/delete rows and columns, merge cells, header styles, alignment, custom colours).
- **Outlet view** — manage the list of outlets and their per-milestone dates.
- **Export** — generate clean PNG or PDF summaries of the critical path, ready to drop into SteerCo decks or progress reports.
- **Project gallery** — keep multiple table projects side by side and reopen them anytime.

## How to use

1. Open `index.html` in any modern browser (Chrome, Edge, or Firefox).
2. Import an Excel/CSV file, or start a blank table and enter data manually.
3. Adjust milestones, dates, and outlets as needed.
4. Use **Export** to save a PNG or PDF of the current view.

Everything runs locally in the browser. No data is uploaded anywhere — imported workbooks are read on your machine only.

## Tech

Plain HTML, CSS, and JavaScript in a single file. External libraries are loaded from public CDNs:

- [SheetJS (xlsx)](https://sheetjs.com/) — reading Excel/CSV files
- [html2canvas](https://html2canvas.hertzen.com/) — rendering views to images
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export

## Notes

This tool holds no data of its own — it's a shell that you load data into at runtime. Avoid committing files that contain live outlet dates or status if the repository is ever made public.

---

*Built during a project internship at Jaykay Marketing Services (John Keells Holdings), Project & Properties Division.*

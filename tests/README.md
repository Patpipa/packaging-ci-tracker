# CI Tracker — test suite

This folder is the safety net that is run before every change to the Packaging CI Tracker is published.
It never touches the real data: every test runs the app in a headless browser with `fakefb.js`, an in-memory stand-in for Firebase.

## Run it

```
npm install playwright        # once
npx playwright install chromium   # once
node tests/run-all.js
```

`node tests/run-all.js some-other-copy.html` tests a different copy of the app (for example the version that is live now, to compare).

## What it checks

1. **Regression scripts** (32 files): each one plays a real floor scenario — lines, breaks, side machines, garbage runs, lent crew, cross-dept help, scales, film, End Shift, cancelled runs — and fails on any crash or page error.
2. **Audit suite** (`audit-run.js` + `audit-scenarios.js`): 33 scenarios, 133 checks. Every expected answer was worked out **by hand** (written in the comments), never with the app's own formulas — PLH, labour hours, paid break, downtime, edits, deletes, duplicates, coverage, film rolls.
3. **Cross-report reconciliation** (`megaday.js` + `replay2.js` + `checks.js`): builds a busy day, exports it like the app's backup, and checks the same numbers agree in the Daily, Staffing Report, Crew Hours and PLH.

A change is only pushed when all three pass.

## Files

| File | What it is |
|---|---|
| `run-all.js` | runs everything, prints ✓ / ✗, exits 1 on any failure |
| `fakefb.js` | in-memory Firebase stand-in |
| `prelude.js` | test helpers (clock, start / finish a run, place crew) |
| `checks.js` | the cross-report reconciliation checks |
| `audit-scenarios.js` | the hand-calculated audit scenarios |

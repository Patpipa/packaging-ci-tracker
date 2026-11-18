# Packaging CI Tracker: Independent End-to-End Audit

**Scope:** application `index.html` **v205.62** (2026-11-17) plus data export `Packaging_CI_Data_2026-11-17.json` (exported 2026-11-18 01:43 UTC)
**Audit date:** 2026-11-18
**Rules followed:** read-only. The original export is unchanged (SHA-256 `af3105d2…e337`, identical to the upload). No production record was modified. `index.html` was **not** changed. Every correction below is a *proposal* awaiting approval.

---

## A. Executive summary

**The calculation engine is correct. The data it is fed, and the way some numbers are labelled and kept, are not yet safe enough to send to a plant manager without conditions.**

| | Result |
|---|---|
| PLH arithmetic (gross and net, all 518 weighed runs) | **Exact match**: 0 differences at 1e-9 tolerance |
| Net labour hours (all 777 PLH runs, rebuilt from segments) | **Exact match** |
| Gross labour hours (all 777, rebuilt with the app's paid-break rule) | **Exact match** |
| Department, machine, month and product pounds, boxes and hours | **Exact match**: app functions and independent Python agree to the 3rd decimal |
| Saved daily reports reproduced from current records | **37 of 40 match exactly; 3 differ** (records were added or deleted after the report was saved) |
| Scenario tests run against the real app code | **14 PASS, 11 FAIL** (25 tests) |
| Confirmed data-integrity problems | Duplicate run, overlapping states (375 min double-counted), planned stops logged as Waiting (797 min), PLH outliers, rework weight counted |
| PLH coverage | Only **61.5 %** of line labour hours have a weight. Variovac 2 PLH rests on only **31.6 %** of its labour |

**Verdict: CONDITIONAL PASS (YES, WITH CONDITIONS)** for *new* daily reports, under the conditions in section G. **Do not re-send** the historical reports listed in D-1 to D-4 until they are corrected.

---

## B. Audit coverage

**Application inspected (`index.html`, 8,164 lines; every function behind a reported number was read):**

| Area | Functions |
|---|---|
| Entry | `saveRecord`, `_saveRecordInner`, `editRecord` override, `confirmNoOverlap`, `confirmAddPLHData`, `deleteRecord`, `deleteRangeRecords` |
| Live runs | `closeOutLiveRun`, `switchProduct`, `endStandaloneDowntime`, `closeAllOpenForEndShift`, `recalcLiveRunRecord` |
| Labour | `runLabourMinutes`, `paidBreakLeftFor`, `applyPaidBreakRule` (runs on every `render()`), `garbageMinFor`, `placeGarbageMinFor` |
| Side machines | `buildSideJobRecord`, `saveSideJob`, `mergeSideJobs`, `saveLooseSideJobs`, `sideHoursOutputHTML` |
| Aggregation | `recordsForDate`, `machineTotals`, `dayTotals`, `totalBreakMinutes`, `mergeIntervals`, `efficiencyPct`, `bottlenecks`, `machineMostWaiting`, `computeDowntimeAnalysis` |
| PLH | `plhRecordsInRange`, `incompletePLHRecordsInRange`, `plhJobKey`, `groupPLHJobs`, `computePLHSummary`, `dailyPLHSeries`, `plhHeadline` |
| Reports | `buildReport`, `getReportForView`, `endShiftReport`, `buildRangeReport` (Weekly), `plhPresetRange`, `summaryText`, `weeklySummaryText`, `exportReportPDF`, `craftSuggestions`, `craftWeeklySuggestions` |
| Storage | `Store.saveRecords`, `refreshRecords`, `migrateReasonLabels`, `renameReasonsDeep`, `repairOvernightRecords` |

**Data tested:**
- **Records:** 2,925 records over 54 dates (2026-08-15 to 2026-11-17). All IDs are unique.
- **PLH runs:** 777. Of these, 518 are weighed (505 lines + 13 side) and 259 have no weight (256 lines + 3 side).
- **Segments:** 2,206 labour segments (1,924 longer than 0 minutes) and 920 downtime segments.
- **Saved daily reports:** 40 (2026-09-10 to 2026-11-17). 14 dates with records have no saved report: 2026-08-15 through 2026-09-11, and 2026-10-01.
- **Machines covered:** all 8 stations (V1, V2, V3, Manual Pack, Fajita, Vacuum Sealer, Slicer, Cutlet).

**How it was tested:**
1. `audit/audit.py`: an independent Python recalculation of every record, segment, PLH value and report.
2. `audit/apptests.js`: loads the **real app code** in an isolated headless browser. The network is blocked, Firebase never loads and save functions are stubbed, so nothing could reach live data. It does two things:
   - (a) replays the whole export through the app's own report and PLH functions and compares the results with (1);
   - (b) runs 25 scenario tests with expected values worked out by hand.

**Evidence files (all in `audit/`):**
- `findings.csv`: every finding with record ID, date, machine, field, expected, actual and explanation.
- `plh_verification.csv`: one row per PLH run with stored and recalculated hours and PLH.
- `daily_report_reconciliation.csv`
- `totals_by_machine / date / isoweek / month / product .csv`
- `app_test_results.json`

---

## C. Calculation verification

### C-1 How the app defines each metric (established from the code, then tested)

| Metric | Application definition (source) | Assessment |
|---|---|---|
| `durationMin` (RUNNING, Live) | Sum of the run's own running segments only. Stops are saved as **separate** status records (`closeOutLiveRun`). | Verified on 777 runs: the only exception is D-5. Start/end = first to last running segment, so `end − start ≠ durationMin` is **by design**, not an error. |
| `durationMin` (other) | `endTime − startTime`; 0 if the end is before the start (no midnight crossing) | Verified on all 2,148 non-Live records: 0 differences |
| Net labour hours | Σ (running-segment minutes × employees) ÷ 60 | PASS, 777/777 |
| Gross labour hours | Net + every stop's minutes × crew on the line when it began. Exclusions: **NO_WORK**, and **Break beyond 30 paid min per line per day**. Plus garbage-run minutes. | PASS, 777/777. The definition itself needs your sign-off (C-3). |
| Gross / Net PLH | weight ÷ gross hours / weight ÷ net hours; `null` if weight or hours is 0. Never rounded before display. | PASS 518/518; 0 invented PLH on the 259 unweighed runs |
| Job / period / department PLH | Σ lbs ÷ Σ hours (pooled), never an average of PLH values | PASS (tests 4, 5, 17). A simple average of machine PLH would wrongly give 173.56 instead of 178.15. |
| Efficiency | Running ÷ (Running + Waiting + Changeover); Break, No Work and Planned are excluded | Formula correct; inflated Waiting distorts it (D-3) |
| Department BREAK | **Clock minutes** (overlapping breaks merged); the machine rows are machine-minutes | Correct but **not additive** with the machine rows (D-9) |
| "Machine most affected / with most downtime" | Most **Waiting** minutes only; Changeover excluded | Labelling issue (D-8) |
| Daily report scope | V1, V2, V3, Manual Pack. **Side machines excluded** (v157, `recordsForDate`) | Intentional but not stated on the report (D-10) |

### C-2 Results: application vs independent

| Metric | App result | Independent | Diff | Status |
|---|---|---|---|---|
| Lines production weight (all dates) | 174,549.248 lb | 174,549.248 lb | 0 | PASS |
| Lines boxes / quantity | 15,016 | 15,016 | 0 | PASS |
| Lines gross labour hours | 979.800 h | 979.800 h | 0 | PASS |
| Lines net labour hours | 721.417 h | 721.417 h | 0 | PASS |
| Lines gross / net PLH | 178.148 / 241.953 | 178.148 / 241.953 | 0 | PASS |
| Variovac 1: lb, qty, gross h, net h, gross PLH, net PLH | 29,993.102 · 3,758 · 240.800 · 165.283 · 124.56 · 181.46 | identical | 0 | PASS (coverage 54 %) |
| Variovac 2 | 17,591.298 · 1,782 · 155.883 · 101.083 · 112.85 · 174.03 | identical | 0 | PASS (coverage **31.6 %**) |
| Variovac 3 | 69,734.829 · 6,292 · 369.750 · 269.483 · 188.60 · 258.77 | identical | 0 | PASS (coverage 96.8 %) |
| Manual Pack | 57,230.019 · 3,184 · 213.367 · 185.567 · 268.22 · 308.41 | identical | 0 | PASS (coverage 78.3 %) |
| Fajita / Vacuum Sealer / Slicer / Cutlet (side output) | 1,719.593 / 593.790 / 1,874.700 / 189.000 lb | identical | 0 | PASS (kept separate from line totals) |
| Side total | 4,377.083 lb · 493 qty · 45.467 gross h | identical | 0 | PASS |
| Monthly (lines): Sep / Oct / Nov | 21,310.099 lb, 216.86 PLH / 101,306.220 lb, 180.54 PLH / 51,932.929 lb, 162.08 PLH | identical | 0 | PASS (but no calendar-month report exists: D-12) |
| Week 2026-11-11 to 11-17 (Weekly page) | 23,629.368 lb · 132.333 h · 178.56 PLH | identical | 0 | PASS |
| Daily status totals (RUN/CHG/WAIT/BREAK/PLANNED/NO_WORK, upstream/internal), recordCount, bottlenecks, most affected | 37 of 40 saved reports | rebuilt from records | 0 | PASS |
| Same, for 2026-09-28, 2026-10-05, 2026-10-29 | saved snapshot | records now | see D-1 | **FAIL** |
| Saved report internal consistency (Σ machine = department for RUN/CHG/WAIT/NO_WORK; upstream + internal = Waiting) | 40/40 | | 0 | PASS |
| Observation text vs saved numbers | 40/40 numbers match | | | PASS (18 quote pre-rename reason names: L-1) |
| Status minutes are correct state minutes | | 375 min in two states at once | 375 | **FAIL** (D-2) |
| Gross labour definition matches *your* business definition | | not documented | — | **UNVERIFIED** (C-3) |
| Weights match the scale / ERP / inventory | | no source supplied | — | **UNVERIFIED** |
| Who actually worked each run | names on only 485 of 1,924 segments | 0 conflicts among the named ones | — | **UNVERIFIED** for 75 % of segments |

### C-3 Definitions that need your sign-off (assumptions inside the gross labour hours)
1. A stop **before the first running segment** is charged at the first segment's headcount, and the headcount defaults to **1** if the run has no segments (`runLabourMinutes`, `empAtMin`). Example: `rmuyg6v2xw75p5` (2026-10-07, V2) is a 10-minute run carrying 5 h 46 m of earlier waiting, so gross PLH is 2.3 and net is 41.
2. **Only 30 minutes of break per line per day are paid.** Breaks recorded as standalone records do not use up that allowance.
3. **Planned stops count in gross** labour; NO_WORK does not.
4. Garbage-run minutes (`plh.garbageMin`, 239 runs) are taken as stored. They come from the day log, which is **not in this export**, so they could not be re-derived.

### C-4 Scenario tests (real app code, `audit/app_test_results.json`)

| # | Test | Expected (by hand) | App result | Status |
|---|---|---|---|---|
| 1 | One machine, 1 employee | 1 h, 300 PLH | 1 h, 300/300 | PASS |
| 2 | 2 employees | 2 h, 150 | 2 h, 150 | PASS |
| 3 | 3 employees | 6 h, 100 | 6 h, 100 | PASS |
| 4 | 3 machines at once | pooled 1100/6 = 183.33 (not 200) | 183.33 | PASS |
| 5 | Multiple products, one machine | 2 jobs; A = 300/4 = 75 | 2 jobs; 75 | PASS |
| 6 | Employee changes machine | 180 person-min total | 90 + 90 = 180 | PASS |
| 7 | Break during production | net 300, gross 360, run 150 min | same | PASS |
| 8 | Downtime during a session | net 180, gross 240; PLH 67.5/90 | same | PASS |
| 9 | Multiple stop categories | gross 250 (NO_WORK unpaid); report splits | same | PASS |
| 10 | Zero production | PLH null; flagged incomplete | null; listed | PASS |
| 11 | Missing weight | NOT CALCULABLE | stored as 0; summary returns 0 | FAIL |
| 12 | Run with 0 running min + weight | weight kept | **no record saved; weight lost** | FAIL |
| 12b | Job with 0 labour hours | null | grossPLH **0**, netPLH null | FAIL |
| 13 | Duplicate production record | counted once or flagged | **600 lb (double)**, no flag | FAIL |
| 13b | Same live run finished on two devices | 1 record | **2 records** | FAIL |
| 14 | Edit finish time | 150 min, 116.67 PLH | same | PASS |
| 14b | Edit honours the 30-min paid-break rule | 160 | 220 | FAIL |
| 15 | Record deleted after report saved | flagged | saved 120 vs shown 60; no warning | FAIL |
| 16 | Daily aggregation | RUN 120, WAIT 50 (30/20), 5 records, V2 | same | PASS |
| 17 | Weekly aggregation | 1300/9 = 144.44 | 144.44 | PASS |
| 18 | Monthly aggregation | calendar month | no monthly report | FAIL |
| 19 | Department PLH (lines + side separate) | 150; side separate | same | PASS |
| 20 | Side machines in daily report | shown or noted | silently omitted | FAIL |
| 21 | Record crossing midnight | handled or flagged | 0 min | FAIL (acceptable for a single day shift) |
| 22 | Overlapping states | flagged | 85 min shown for 55 clock min | FAIL |
| 23 | Planned stop typed as Waiting → Other | treated as planned | ranked as top bottleneck; efficiency 0 % | FAIL |
| 24 | No early rounding | 205.7088 | 205.70880000000002 | PASS |

---

## D. Errors and risks

Severity: **Critical** = management numbers wrong or changeable without trace · **High** = material production, labour, PLH or downtime inaccuracy · **Medium** = inconsistent or incomplete handling · **Low** = cosmetic.

### Confirmed data errors (in your records)

**D-1 · Critical · Saved daily reports no longer match what the app shows, and nothing flags it.**
`getReportForView` and the PDF always recompute from current records. The saved snapshot (which may already have gone to your manager) is never compared.

| Date | Saved | Records now | Cause |
|---|---|---|---|
| 2026-10-05 | 80 records; RUN 795, WAIT 699, CHG 76, NO_WORK 274; top bottleneck "MAREL – Meat Ready, but Cutting for Variovac 2" 150 min | 62 records; RUN 613, WAIT 444, CHG 26, NO_WORK 54; top "TRIMMERS – Not Started Yet" | **18 records deleted after the report**. Their contents cannot be recovered from the export. |
| 2026-09-28 | NO_WORK 219, RUN 596 | NO_WORK 483, RUN 594 | 3 NO_WORK records added after; V1 run edited by −2 min |
| 2026-10-29 | 63 records; shift end 17:12 | 64; shift end **23:36** | Stray run `rmvulmgamqnfpc` (V1, 23:34–23:36) added after |

**D-2 · High · The same machine is recorded in two states at once: 375 minutes double-counted (13 cases).**
Each case is listed in `findings.csv`. Examples:
- **2026-09-29 V1, a duplicated live run:** `rmun962e9fxde0` (11:38–15:33, 205 min) and `rmunczuu2080b3` (11:38–16:45, 233 min) have identical segments up to 15:13. The break was also saved twice (`rmunczuu2ytv4f` = `rmun962e9ze5sw`). Running minutes are inflated by 205 min, gross labour by 6.72 h, and BREAK by 30 min in the 09-29 report. Both runs have no weight, so PLH is unaffected today; if weight is entered on both, it would be double-counted. Test 13b reproduces the cause: a second device finishing a stale copy of the same live run.
- **2026-09-15 V3:** `rmu3chul6xkto2` duplicates `rmu3c2yi9ucl2c` (WAITING 15:10–15:25, Employee Shortage). It is included in that saved report.
- **2026-09-01 V1:** `rmtk9r3klt10ss` WAITING 14:35–15:20 sits on top of RUNNING `rmtk9qjwhte22y` 14:35–15:20.
- **2026-08-19 and 2026-08-21** (9 cases): manual BREAK records overlapping WAITING or RUNNING records. Example: `rmt0nwxyoguux6` WAITING 10:00–10:55 overlaps BREAK `rmt0n5tprpoffs` 10:00–10:30.

**D-3 · High · Planned stops logged as WAITING: 77 records, 797 min (647 min on dates with saved reports), September to October.**
Crew Talk, Metal Detector Test, Town Hall, Scheduled Stretching and QA Crew Talk were entered under Labour/Operational (57) or QA/Pre-Op (20). The effects:
- they count as **internal packaging delay**;
- they lower efficiency;
- they appear as bottlenecks in **9 saved reports** (09-10, 09-14, 09-15, 09-16, 09-23, 09-25, 09-28, 09-29, 10-02).

Spelling variants also split the totals: "CREW TALK" vs "Crew Talk", "YOWN HALL MEETING".

**D-4 · High · PLH outliers from data entry distort the "Best/Lowest Product" lines on management cards.**
- **Best on record:** 601129 BEEF STROGI at **4,117.5 PLH** (`rmvspv56b04wrv`, 2026-10-28 Manual Pack: 137.25 lb in a 2-minute run by 1 person).
- **Also implausible:** 3,300 PLH twice (`rmw2f49ovn8c5r` 2026-11-04 and `rmw47z8n6wlyt7` 2026-11-05: 55 lb in 1 minute).
- **Lowest:** 2.34 PLH (`rmuyg6v2xw75p5`).
- **16 runs below 20 PLH**, all listed in `findings.csv`.

Pooled totals barely move (Manual Pack 268.2 → 267.1 without the three high outliers), but the per-product claims are not credible. Two more items need checking:
- **Possible duplicate weight (UNVERIFIED):** `rmw137htn711gj` and `rmw0vyoaqjo206`, 2026-11-03 V2, same product 603631, both exactly 234 lb / 26 boxes.
- **Unit inconsistency:** `rmw11idt9rbrai` is a "1lb" product recorded at 350 lb / 35 units = 10 lb per unit.

**D-5 · Medium · `rmumz2tpj8hiyg` (2026-09-29 V3):** `durationMin` 102 but its running segments total 72. The 10:00–10:30 break is counted as running *and* exists as a BREAK record. `plh.product` is blank while the record says "PORK CUTLET 6oz". Labour and PLH are correct (gross 102 / net 72 min); RUNNING minutes are overstated by 30.

**D-6 · Medium · Rework and relabel weight is counted as production:** 5 runs, 1,840.025 lb. This includes `rmw11idt9rbrai`, whose own note says "REWORK AND RELABEL ONLY – not included in today's inventory". Also `rmvisjggu8vb0g` (1,220.625 lb, V3, 2026-10-21) and three runs on 2026-11-12. Whether rework belongs in PLH is a business decision; today it is included.

**D-7 · Medium · Other data gaps:**
- **No product:** 236 production/changeover records have no product. 3 weighed runs have no record product; 17 have no product ID, so job grouping falls back to the product name.
- **Zero-headcount segments:** 3 running segments have 0 employees (`rmw59zpkfdbyrk`, `rmw9uisu5p3tdz`, `rmw9wnu7vbwdmx`; 6 min in total), so their labour is 0. `rmw9uisu5p3tdz` also has 3 counted but 2 named.
- **No labour data:** 223 manual RUNNING records (12,498 min, August–September) have no labour data, so no PLH is possible for them.
- **Unexplained run minutes:** 8 runs contain minutes covered by neither running nor stop segments. One is confirmed as a NO_WORK stop (`rmundssr2t8rkv`, 42 min); the other 7 are unverified (e.g. `rmv06o2vkqmdly`, 08:49–09:58).
- **Stop without a record:** `rmu4mvclokiyux` has a BREAK 12:54–13:31 with no matching status record.
- **After-hours records:** on 2026-10-16, runs and waits continue to 19:10 (`rmvbre6awfi4ug`, `rmvbre10ow7bfi`, `rmvbre10oe3sqh`). Possibly left open; confirm whether this was real overtime.

### Application issues (code)

**D-8 · High · "Machine with Most Downtime" and "Total Waiting/Downtime" count Waiting only.**
They appear in `renderReportView`, `renderWeeklyView`, `summaryText`, `weeklySummaryText` and the PDF; the underlying functions are `machineMostWaiting` and `t.WAITING`. Changeover is excluded. On 2026-09-29 and 2026-11-06, Waiting + Changeover would name **Variovac 2**, not the machine the report shows. The weekly suggestion says "carried the most downtime" using the waiting-only figure.

**D-9 · Medium · Department Break is clock time while machine Break is machine time** (`dayTotals`/`totalBreakMinutes` vs `machineTotals`). Example: 2026-09-10 shows 60 min for the department vs 180 across machines. Both are shown in the same report without a label. Running, Waiting and Changeover in the department total are machine-minutes, so the department column mixes units.

**D-10 · Medium · Side stations (Fajita, Vacuum Sealer, Slicer, Cutlet) are silently left out** of the Daily Report, Weekly Summary, efficiency and bottlenecks (`recordsForDate`, `recordsInRange`: `!r.side`). Excluding them from **line** PLH is correct: their product is packed again on a Variovac (`plh.outputFrom` on 6 jobs), so adding side pounds to line pounds would **double-count**. The problem is that no report says they were excluded. The 5 earliest saved reports (09-10 to 09-17) have no Manual Pack row and 13 have no PLANNED key (older app version). I verified there were no Manual Pack or Planned records on those dates, so nothing was lost.

**D-11 · High · PLH coverage is not shown alongside the headline PLH.**
`plhHeadline` says "lbs ÷ labour hrs on the lines", but 256 line runs (614.0 of 1,593.8 gross labour hours) have no weight and are left out. By hours, coverage is V1 54.0 %, **V2 31.6 %**, V3 96.8 %, Manual Pack 78.3 %. Machine PLH comparisons are therefore not like-for-like. A general disclaimer exists (`PLH_DISCLAIMER`), but no count of excluded runs or hours is shown.

**D-12 · Medium · There is no calendar-month report.** Only rolling "Last 7/30 days", "This week" and custom ranges exist (`plhPresetRange`, `setWeeklyPreset`). Weeks are rolling, not Monday to Sunday, on the Weekly page. The maths is pooled and correct (test 17); a calendar month can be produced by typing the range manually.

**D-13 · High · Data can be lost or duplicated, with no audit trail.**
- **Weight discarded:** `closeOutLiveRun` drops the RUNNING record, and the weight typed in, when every segment is 0 min (test 12).
- **Concurrent saves:** `Store.saveRecords` overwrites whole-month documents with no transaction or merge, so two devices can overwrite each other or, as in D-2, duplicate a run.
- **No duplicate check on finish:** finishing a live run never runs `confirmNoOverlap`.
- **Permanent deletion:** "Delete Records in This Range" on the Weekly Summary page permanently deletes records *and* saved reports.
- **No history:** there is no edit or delete log.

**D-14 · Medium · Inconsistent "not calculable" handling.**
- `computePLHSummary` returns PLH **0**, not null, when there are no hours.
- `groupPLHJobs` sets gross PLH **0** but net PLH `null` when hours are 0. A 0 can then appear as "Lowest Product" (test 12b).
- `recalcLiveRunRecord` (used when editing) gives the edited run a fresh 30 paid break minutes (test 14b). `render()` re-applies the correct rule in memory, so screens are right but the stored value can differ. It does not affect this export: re-applying the rule changed 0 stored values.

**D-15 · Medium · Report shift start and end = earliest and latest record time**, not the real shift. One stray entry moves it (2026-10-29 now shows end 11:36 PM).

**D-16 · Low.**
- 18 saved observations quote old reason names ("waiting for marel cut meat") because `renameReasonsDeep` renames lists but not sentences. The minutes match.
- Free-text "Other" reasons are not normalised (119 records), splitting bottleneck totals.
- Records crossing midnight count as 0 min (acceptable for a single day shift).

### What cannot be verified from this export
1. **Correctness of the weights.** There was no scale, ERP or inventory source to compare against.
2. **Individual labour allocation.** Names are on only 25 % of segments; no double-booked person was found among them. Floaters and shared labour are only as good as the headcount taps.
3. **Garbage-run minutes, the Staffing report, Crew Hours, the Scale report and side-machine timing.** These need the **day log, live runs, settings and product library**, which v205.62 is supposed to export but which are **absent** from this file. It was probably exported from an older version or another device. Please re-export from v205.62.
4. **Contents of the 18 records deleted from 2026-10-05.**
5. **Target PLH variance.** `targetPLH` is null on all 777 runs, so the "vs target" figures are never produced.
6. **Whether this export equals the live Firestore data.**

---

## E. Required corrections (proposed, not applied)

| # | File / function | Problem | Proposed correction | Impact | Confirming test |
|---|---|---|---|---|---|
| E-1 | `index.html` `getReportForView`, `renderReportView`, `exportReportPDF` | A saved report can silently differ from the one shown or printed | Compare live vs saved `totals` and `recordCount`. If different, show "Changed since saved on …: +X / −Y records" and keep the saved snapshot read-only | Management sees when history changed | Test 15 must flag; replay 2026-10-05 |
| E-2 | `closeOutLiveRun`, `Store.saveRecords` | Duplicate run from two devices; whole-month overwrite | Before saving, re-read live runs and refuse if the run is already closed (or the record ID already exists). Save with a Firestore transaction or merge by ID | Stops D-2-type duplicates | Test 13b → 1 record |
| E-3 | `closeOutLiveRun` | Weight lost when there are no running minutes | Keep the record and flag "NOT CALCULABLE: no labour time", or block finishing with a message | No silent weight loss | Test 12 |
| E-4 | New `validateDay(date)`, shown on the Daily Report and End Shift (see section G) | No checks for overlaps, duplicates, outliers or missing weight | Implement the GREEN / YELLOW / RED checks | Every report carries its own reconciliation | Run on all 40 dates; expect the D-1 to D-7 flags |
| E-5 | `saveRecord` / `editRecord` WAITING path | Planned stops can be typed as Waiting → Other | When the "Other" text matches a planned reason, prompt to switch to Planned Stop; normalise case | Correct internal delay and efficiency | Test 23 |
| E-6 | Labels in `renderReportView`, `renderWeeklyView`, `summaryText`, `weeklySummaryText`, PDF | "Most Downtime" means Waiting only; mixed break units | Rename to "Machine with most Waiting", or add Waiting + Changeover as a separate line. Label department Break "clock minutes (overlaps merged)" | Text matches numbers | 09-29 and 11-06 cases |
| E-7 | `plhHeadline`, `renderPLHCard`, PLH PDF | Coverage hidden | Add "Based on N of M runs, X of Y labour hours (Z %); K runs awaiting weight", per machine | Honest PLH | Coverage figures in D-11 |
| E-8 | `renderPLHCard` best/worst | Outliers headline | Exclude runs under 15 min or outside a plausible PLH band from best/worst, or flag them | Credible product claims | D-4 records |
| E-9 | `computePLHSummary`, `groupPLHJobs` | 0 used for not calculable | Return `null` and display "n/a" | No invented 0 PLH | Tests 11, 12b |
| E-10 | `recalcLiveRunRecord` | Edits ignore the paid-break allowance already used | Pass `paidBreakLeftFor(date, machine, start)` | Stored gross equals displayed gross | Test 14b |
| E-11 | Daily/Weekly report | Side machines silently omitted | Add a "Side stations (separate, not added to line totals)" section with hours and lbs per station | Nothing silently excluded | Test 20 |
| E-12 | `plhPresetRange` / Weekly page | No calendar month | Add "This month" and "Last month" presets (1st to last day) | Monthly reporting | Test 18 |
| E-13 | Data (not code), **with your approval** | D-2, D-3, D-5, D-6, D-7 records | Correct them through History edits. Then regenerate and re-issue the affected reports | Correct history | Rerun `audit.py` |

After any approved change: rerun `node audit/apptests.js` and `python3 audit/audit.py` (commands are in `audit/README.md`). Every FAIL above must turn PASS, with tests 1–10, 14, 16, 17, 19 and 24 still passing.

---

## F. Final reconciliation

| Check | Result |
|---|---|
| Machine totals (lbs, qty, hours, PLH) | **Reconcile**: app = independent, all 8 stations |
| Department totals (lines) | **Reconcile**: Σ machines = department, 174,549.248 lb. Side stations are correctly kept separate |
| Labour hours | **Reconcile to the app's definition** (777/777); the definition is **unverified** against your business rules (C-3) |
| PLH | **Reconciles** (518/518 runs; pooled at every level). **Coverage 61.5 %** must be stated |
| Daily reports | **37/40 reconcile**; 3 changed after saving (D-1). Status minutes on 6 dates contain double-counted minutes (D-2) or misclassified planned time (D-3) |
| Weekly | **Reconciles** (pooled; checked for 2026-11-11 to 11-17 and every ISO week, `totals_by_isoweek_lines.csv`) |
| Monthly | **Reconciles** as custom ranges. **No built-in monthly report** |
| Report completeness | 14 dates with records have no saved report; side stations not shown; day log missing from the export |

---

## G. Management readiness verdict

**CONDITIONAL PASS / YES, WITH CONDITIONS.**

**Evidence for:** every formula behind PLH, labour hours, status minutes, bottlenecks and weekly pooling was traced in the code and reproduced independently, with zero differences. That covers 2,925 records, 777 runs, 40 reports and both the app's own functions and an independent re-implementation.

**Evidence against an unconditional PASS:**
- the records contain double-counted minutes, a duplicated run and misclassified planned stops;
- saved reports can change after the fact without trace;
- PLH covers only 61.5 % of labour hours;
- two report labels do not describe their numbers.

**Conditions for sending a daily report to your manager:**
1. **Before sending,** check the day for: overlapping entries on any machine; RUNNING runs without weight (state the count and hours); PLH under 20 or over 2,000; and Waiting reasons that are really planned stops. Use the RED / YELLOW / GREEN scheme below until E-4 is built.
2. **Quote PLH with its coverage,** e.g. "178 lbs/hr gross, based on the N runs (X of Y labour hours) that have a weight; K runs still awaiting weight". Do not use the Best/Lowest product lines without checking them.
3. **Read "Machine with Most Downtime" as "most Waiting"**, and the department Break figure as clock time.
4. **State that side stations are reported separately** and are not part of line PLH.
5. **Do not re-send the historical reports** for 2026-08-19, 08-21, 09-01, 09-15, 09-28, 09-29 or 10-05, or any date in D-3, until the records are corrected and the reports regenerated.
6. **Re-export from v205.62,** including the day log, so staffing and garbage-run figures can also be audited.

**Validation scheme (for E-4, or a manual check until then):**
- **GREEN:** no overlaps, no duplicates, all runs weighed or the weight-pending count is stated, no PLH outliers, saved = live.
- **YELLOW:** runs awaiting weight, missing product, custom "Other" reasons, after-hours records.
- **RED:** overlapping or duplicate records, PLH outside 20–2,000, planned reason under Waiting, a saved report that differs from the live one, weight with 0 labour. **Never send a RED day.**

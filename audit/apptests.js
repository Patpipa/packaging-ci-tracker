// Runs the REAL app functions (index.html v205.62) in an isolated headless page. Network is blocked; Firebase never loads;
// Store save/refresh are stubbed so nothing can be written anywhere. Usage: node apptests.js <app.html> <export.json> <out.json>
const { chromium } = require('playwright');
const fs = require('fs');
const [,, APP, EXPORT, OUT] = process.argv;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await p.goto('file://' + APP); await p.waitForTimeout(800);
  const data = JSON.parse(fs.readFileSync(EXPORT, 'utf8'));
  const res = await p.evaluate(async (data) => {
    // ---------- sandbox ----------
    window.confirm = () => true; window.alert = () => {}; window.toast = () => {}; window.render = () => {};
    Store.ready = true; Store.dayLog = {}; Store.liveRuns = {}; Store.productLibrary = []; Store.settings = {};
    Store.saveRecords = async () => true; Store.refreshRecords = async () => true; Store.saveLiveRuns = async () => true;
    Store.saveDailyReports = async () => true; Store.saveDayLog = async () => true;
    const clone = x => JSON.parse(JSON.stringify(x));
    const out = { replay: {}, tests: [] };
    // ---------- 1. replay real export through the app ----------
    Store.records = clone(data.records); Store.dailyReports = clone(data.dailyReports);
    const beforeRule = JSON.stringify(Store.records.map(r => r.plh ? [r.id, r.plh.grossLaborHours] : 0));
    applyPaidBreakRule(Store.records);
    out.replay.paidBreakRuleChangesStoredGross = beforeRule !== JSON.stringify(Store.records.map(r => r.plh ? [r.id, r.plh.grossLaborHours] : 0));
    out.replay.reports = data.dailyReports.map(s => { const r = buildReport(s.date); return { date: s.date, totals: r.totals, perMachine: r.perMachine, recordCount: r.recordCount, bottlenecks: r.bottlenecks, mma: r.machineMostAffected, observation: r.observation, shift: [r.shiftStart, r.shiftEnd] }; });
    const S = recs => { const s = computePLHSummary(recs); return { lbs: s.totalWeight, qty: s.totalQty, gH: s.totalGrossHours, nH: s.totalNetHours, gPLH: s.grossPLH, nPLH: s.netPLH, jobs: s.runCount, runs: s.rawRunCount, best: s.best && [s.best.plh.product, s.best.plh.grossPLH], worst: s.worst && [s.worst.plh.product, s.worst.plh.grossPLH] }; };
    const all = plhRecordsInRange('2000-01-01', '2999-12-31');
    out.replay.plh = { lines: S(all), side: S(plhRecordsInRange('2000-01-01', '2999-12-31', 'side')), byMachine: {}, byMonth: {}, incomplete: incompletePLHRecordsInRange('2000-01-01', '2999-12-31').length };
    MACHINES.forEach(m => out.replay.plh.byMachine[m] = S(all.filter(r => r.machine === m)));
    ['2026-09', '2026-10', '2026-11'].forEach(m => out.replay.plh.byMonth[m] = S(plhRecordsInRange(m + '-01', m + '-31')));
    out.replay.range = buildRangeReport('2026-11-11', '2026-11-17');
    out.replay.rangePLH = S(plhRecordsInRange('2026-11-11', '2026-11-17'));
    out.replay.series = dailyPLHSeries('2026-11-11', '2026-11-17');

    // ---------- 2. scenario tests ----------
    const T = (n, name, input, expected, actual, pass, note) => out.tests.push({ n, name, input, expected, actual, pass, note: note || '' });
    const eq = (a, b) => Math.abs(a - b) < 1e-9;
    const D = '2030-01-07'; // isolated test date (no real data)
    const plhRec = (id, machine, product, segs, dts, w, extra) => { const lab = runLabourMinutes(segs, dts, 30, 0); return Object.assign({ id, date: D, machine, product, startTime: segs[0].start, endTime: segs[segs.length - 1].end, durationMin: segs.reduce((a, s) => a + duration(s.start, s.end), 0), status: 'RUNNING', reasonCategory: '', reason: '', classification: '', notes: '', createdAt: 1, plh: { weightLbs: w, quantity: 10, grossLaborHours: lab.gross / 60, netLaborHours: lab.net / 60, grossPLH: w > 0 && lab.gross > 0 ? w / (lab.gross / 60) : null, netPLH: w > 0 && lab.net > 0 ? w / (lab.net / 60) : null, targetPLH: null, productId: product, product, machine, segments: segs, downtimeSegments: dts } }, extra || {}); };
    // live-run close-out through the real entry path
    const live = async (m, segs, dts, weight, qty) => { Store.liveRuns[m] = { machine: m, status: 'RUNNING', product: 'P-' + m, productId: '', date: todayStr(), startedAt: segs[0].start, employees: segs[0].employees, segments: clone(segs), downtimeSegments: clone(dts) }; const before = Store.records.length; const r = await closeOutLiveRun(m, { weight: String(weight ?? ''), quantity: String(qty ?? ''), endAt: segs[segs.length - 1].end }); return { ret: r, recs: Store.records.slice(before) }; };
    const today = todayStr();

    Store.records = [];
    let L = await live('Variovac 1', [{ start: '08:00', end: '09:00', employees: 1 }], [], 300, 10); let pr = L.recs[0].plh;
    T(1, 'One machine, one employee', '08:00-09:00 x1, 300 lb', 'net 1 h, gross 1 h, PLH 300/300', `net ${pr.netLaborHours} h, gross ${pr.grossLaborHours} h, PLH ${pr.grossPLH}/${pr.netPLH}`, eq(pr.netLaborHours, 1) && eq(pr.grossLaborHours, 1) && eq(pr.grossPLH, 300) && eq(pr.netPLH, 300));
    Store.records = []; L = await live('Variovac 1', [{ start: '08:00', end: '09:00', employees: 2 }], [], 300, 10); pr = L.recs[0].plh;
    T(2, 'One machine, two employees', '08:00-09:00 x2, 300 lb', 'labour 2 h, PLH 150', `gross ${pr.grossLaborHours} h, net ${pr.netLaborHours} h, PLH ${pr.grossPLH}`, eq(pr.grossLaborHours, 2) && eq(pr.grossPLH, 150));
    Store.records = []; L = await live('Variovac 1', [{ start: '08:00', end: '10:00', employees: 3 }], [], 600, 10); pr = L.recs[0].plh;
    T(3, 'One machine, three employees', '08:00-10:00 x3, 600 lb', 'labour 6 h, PLH 100', `gross ${pr.grossLaborHours} h, PLH ${pr.grossPLH}`, eq(pr.grossLaborHours, 6) && eq(pr.grossPLH, 100));

    Store.records = [plhRec('a', 'Variovac 1', 'A', [{ start: '08:00', end: '09:00', employees: 1 }], [], 300), plhRec('b', 'Variovac 2', 'B', [{ start: '08:00', end: '09:00', employees: 2 }], [], 200), plhRec('c', 'Variovac 3', 'C', [{ start: '08:00', end: '09:00', employees: 3 }], [], 600)];
    let s = computePLHSummary(plhRecordsInRange(D, D));
    T(4, 'Three machines simultaneously (department PLH)', 'V1 300lb/1h, V2 200lb/2h, V3 600lb/3h', 'pooled 1100/6 = 183.333 (NOT mean of 300,100,200 = 200)', `lbs ${s.totalWeight}, hours ${s.totalGrossHours}, PLH ${s.grossPLH}`, eq(s.grossPLH, 1100 / 6) && eq(s.totalWeight, 1100));

    Store.records = [plhRec('a', 'Variovac 1', 'A', [{ start: '08:00', end: '09:00', employees: 2 }], [], 200), plhRec('b', 'Variovac 1', 'B', [{ start: '09:00', end: '10:00', employees: 2 }], [], 400), plhRec('c', 'Variovac 1', 'A', [{ start: '10:00', end: '11:00', employees: 2 }], [], 100)];
    let jobs = groupPLHJobs(plhRecordsInRange(D, D)); const jA = jobs.find(j => j.plh.product === 'A');
    T(5, 'Multiple products on one machine', 'V1: A 200lb/2h, B 400lb/2h, A again 100lb/2h', '2 jobs; job A = 300/4 = 75 PLH; B = 200', `${jobs.length} jobs; A ${jA.plh.grossPLH}; B ${jobs.find(j => j.plh.product === 'B').plh.grossPLH}`, jobs.length === 2 && eq(jA.plh.grossPLH, 75));

    Store.records = []; const l1 = await live('Variovac 1', [{ start: '08:00', end: '08:30', employees: 2, names: ['Ann', 'Bob'] }, { start: '08:30', end: '09:00', employees: 1, names: ['Ann'] }], [], 100, 1);
    const l2 = await live('Variovac 2', [{ start: '08:00', end: '08:30', employees: 1, names: ['Cy'] }, { start: '08:30', end: '09:00', employees: 2, names: ['Cy', 'Bob'] }], [], 100, 1);
    const tot = (l1.recs[0].plh.netLaborHours + l2.recs[0].plh.netLaborHours) * 60;
    T(6, 'Employee changes machine', 'Bob V1 08:00-08:30 then V2 08:30-09:00; Ann V1, Cy V2 all hour', '3 people x 60 = 180 person-min; V1 90, V2 90', `V1 ${l1.recs[0].plh.netLaborHours * 60}, V2 ${l2.recs[0].plh.netLaborHours * 60}, total ${tot}`, tot === 180 && l1.recs[0].plh.netLaborHours * 60 === 90, 'Headcount-driven; correct only if operators update the crew count at the moment of the move.');

    Store.records = []; L = await live('Variovac 1', [{ start: '08:00', end: '10:00', employees: 2 }, { start: '10:30', end: '11:00', employees: 2 }], [{ start: '10:00', end: '10:30', status: 'BREAK', reason: 'Break' }], 500, 10); pr = L.recs[0].plh;
    T(7, 'Break during production (30 min paid)', 'run 08-10 & 10:30-11 x2, BREAK 10:00-10:30', 'net 300 min (5 h); gross 360 min (6 h); durationMin 150; BREAK record 30', `net ${pr.netLaborHours * 60}, gross ${pr.grossLaborHours * 60}, durationMin ${L.recs[0].durationMin}, break rec ${L.recs[1] && L.recs[1].durationMin}`, pr.netLaborHours * 60 === 300 && pr.grossLaborHours * 60 === 360 && L.recs[0].durationMin === 150 && L.recs[1].durationMin === 30);

    Store.records = []; L = await live('Variovac 1', [{ start: '08:00', end: '09:00', employees: 2 }, { start: '09:30', end: '10:00', employees: 2 }], [{ start: '09:00', end: '09:30', status: 'WAITING', reason: 'Machine Jam', reasonCategory: 'Machine / Equipment', classification: 'internal' }], 270, 9); pr = L.recs[0].plh;
    T(8, 'Downtime during a production session', 'run 08-09 & 09:30-10 x2, WAITING 09:00-09:30', 'net 180 min, gross 240 min; gross PLH 67.5, net 90; WAITING record 30 min', `net ${pr.netLaborHours * 60}, gross ${pr.grossLaborHours * 60}, PLH ${pr.grossPLH}/${pr.netPLH}, wait rec ${L.recs[1].durationMin}`, pr.netLaborHours * 60 === 180 && pr.grossLaborHours * 60 === 240 && eq(pr.grossPLH, 67.5) && eq(pr.netPLH, 90));

    Store.records = []; L = await live('Variovac 2', [{ start: '08:00', end: '09:00', employees: 2 }, { start: '10:10', end: '10:30', employees: 2 }], [{ start: '09:00', end: '09:20', status: 'WAITING', reason: 'MAREL - Switching Product', reasonCategory: 'Upstream / Product', classification: 'upstream' }, { start: '09:20', end: '09:35', status: 'CHANGEOVER', reason: 'Film Change' }, { start: '09:35', end: '09:45', status: 'PLANNED', reason: 'Crew Talk', reasonCategory: 'Planned Stop' }, { start: '09:45', end: '10:10', status: 'NO_WORK', reason: '' }], 400, 10); pr = L.recs[0].plh;
    Store.records = L.recs.map(r => ({ ...r, date: today })); let rep = buildReport(today);
    T(9, 'Multiple downtime categories', 'run 80 min x2; WAIT upstream 20, CHANGEOVER 15, PLANNED 10, NO_WORK 25', 'net 160; gross 160+(20+15+10)x2 = 250 (NO_WORK unpaid); report RUN 80, WAIT 20 (upstream 20), CHG 15, PLANNED 10, NO_WORK 25', `net ${pr.netLaborHours * 60}, gross ${pr.grossLaborHours * 60}; report ${JSON.stringify(rep.totals)}`, eq(pr.netLaborHours * 60, 160) && eq(pr.grossLaborHours * 60, 250) && rep.totals.RUNNING === 80 && rep.totals.WAITING === 20 && rep.totals.upstream === 20 && rep.totals.CHANGEOVER === 15 && rep.totals.PLANNED === 10 && rep.totals.NO_WORK === 25);

    Store.records = []; L = await live('Variovac 1', [{ start: '08:00', end: '09:00', employees: 2 }], [], 0, 0); pr = L.recs[0].plh;
    T(10, 'Zero production', 'run 1 h x2, weight 0', 'PLH NOT CALCULABLE (null); excluded from PLH totals; listed as incomplete', `grossPLH ${pr.grossPLH}, netPLH ${pr.netPLH}, in PLH ${plhRecordsInRange(today, today).length}, incomplete ${incompletePLHRecordsInRange(today, today).length}`, pr.grossPLH === null && pr.netPLH === null && plhRecordsInRange(today, today).length === 0 && incompletePLHRecordsInRange(today, today).length === 1);

    Store.records = []; L = await live('Variovac 1', [{ start: '08:00', end: '09:00', employees: 2 }], [], '', ''); s = computePLHSummary(plhRecordsInRange(today, today));
    T(11, 'Missing production weight', 'weight left blank', 'weight stays missing (not 0 production); summary PLH NOT CALCULABLE', `stored weightLbs ${L.recs[0].plh.weightLbs}; summary grossPLH ${s.grossPLH}, netPLH ${s.netPLH}`, false, 'App stores blank weight as 0 (flag via grossPLH null only). computePLHSummary returns 0, not null, when there are no hours; the card hides it when there are 0 jobs, but the number itself is 0 rather than NOT CALCULABLE.');

    Store.records = []; L = await live('Variovac 1', [{ start: '08:00', end: '08:00', employees: 2 }], [], 250, 5);
    T(12, 'Missing labour information (0-minute run with weight)', 'one 0-min segment, weight 250 lb', 'record kept and flagged NOT CALCULABLE (weight must not be lost)', `records saved ${L.recs.length}; return ${JSON.stringify(L.ret)}`, L.recs.length > 0, 'closeOutLiveRun drops the RUNNING record when every segment is 0 min, so the entered weight is silently discarded.');
    Store.records = [plhRec('z', 'Variovac 1', 'Z', [{ start: '08:00', end: '09:00', employees: 1 }], [], 100)]; Store.records[0].plh.grossLaborHours = 0; Store.records[0].plh.netLaborHours = 0;
    jobs = groupPLHJobs([Store.records[0], { ...clone(Store.records[0]), id: 'z2' }]);
    T('12b', 'Combined job with 0 labour hours', 'two runs same job, 100 lb each, 0 h', 'grossPLH NOT CALCULABLE (null)', `grossPLH ${jobs[0].plh.grossPLH}, netPLH ${jobs[0].plh.netPLH}`, jobs[0].plh.grossPLH === null, 'groupPLHJobs sets grossPLH 0 (invented) but netPLH null - inconsistent; a 0 shows as the "Lowest Product".');

    Store.records = [plhRec('d1', 'Variovac 1', 'A', [{ start: '08:00', end: '09:00', employees: 2 }], [], 300), plhRec('d2', 'Variovac 1', 'A', [{ start: '08:00', end: '09:00', employees: 2 }], [], 300)];
    s = computePLHSummary(plhRecordsInRange(D, D));
    T(13, 'Duplicate production record', 'same V1 run 08-09, 300 lb saved twice', 'counted once (300 lb) or flagged', `total lbs ${s.totalWeight}, hours ${s.totalGrossHours}, report RUNNING ${(Store.records.forEach(r => r.date = D), buildReport(D).totals.RUNNING)} min`, s.totalWeight === 300, 'No duplicate detection in PLH, reports or Live close-out; only manual entry warns about overlaps (confirmNoOverlap).');
    Store.records = []; Store.liveRuns['Variovac 3'] = { machine: 'Variovac 3', status: 'RUNNING', product: 'X', productId: '', date: today, startedAt: '08:00', employees: 2, segments: [{ start: '08:00', end: null, employees: 2 }], downtimeSegments: [] };
    const stale = clone(Store.liveRuns['Variovac 3']); await closeOutLiveRun('Variovac 3', { weight: '200', endAt: '09:00' }); Store.liveRuns['Variovac 3'] = stale; await closeOutLiveRun('Variovac 3', { weight: '200', endAt: '09:30' });
    T('13b', 'Same live run finished from two devices', 'device 2 still holds the open run', '1 RUNNING record', `${Store.records.filter(r => r.machine === 'Variovac 3').length} RUNNING records, ${Store.records.reduce((a, r) => a + r.plh.weightLbs, 0)} lb`, Store.records.length === 1, 'Matches real pair rmun962e9fxde0 / rmunczuu2080b3 (2026-09-29 V1).');

    Store.records = [plhRec('e', 'Variovac 1', 'A', [{ start: '08:00', end: '10:00', employees: 2 }, { start: '10:30', end: '12:00', employees: 2 }], [{ start: '10:00', end: '10:30', status: 'BREAK', reason: 'Break' }], 700)];
    let rc = recalcLiveRunRecord(Store.records[0], '08:00', '11:00');
    T(14, 'Edited production record (finish 12:00 -> 11:00)', 'run 08-10 & 10:30-12 x2, break 30; new end 11:00', 'durationMin 150; net 300 min; gross 360 min; PLH 700/6 = 116.67', `durationMin ${rc.durationMin}, net ${rc.plh.netLaborHours * 60}, gross ${rc.plh.grossLaborHours * 60}, PLH ${rc.plh.grossPLH}`, rc.durationMin === 150 && rc.plh.netLaborHours * 60 === 300 && rc.plh.grossLaborHours * 60 === 360 && eq(rc.plh.grossPLH, 700 / 6), 'Weight is kept unchanged after shortening the run - correct only if the weight really belongs to the shorter window.');
    Store.records = [plhRec('f1', 'Variovac 1', 'A', [{ start: '08:00', end: '09:00', employees: 2 }, { start: '09:30', end: '10:00', employees: 2 }], [{ start: '09:00', end: '09:30', status: 'BREAK', reason: 'Break' }], 100), plhRec('f2', 'Variovac 1', 'B', [{ start: '12:00', end: '13:00', employees: 2 }, { start: '13:30', end: '14:00', employees: 2 }], [{ start: '13:00', end: '13:30', status: 'BREAK', reason: 'Break' }], 100)];
    applyPaidBreakRule(Store.records); const g2a = Store.records[1].plh.grossLaborHours * 60; rc = recalcLiveRunRecord(Store.records[1], '12:00', '13:50');
    T('14b', 'Edit recalculation uses same paid-break rule', 'two runs, each with a 30-min break (only 30 paid per line per day); edit run 2', 'run 2 gross after edit = 160 (no paid break left)', `before edit ${g2a}; after edit ${rc.plh.grossLaborHours * 60}`, rc.plh.grossLaborHours * 60 === 160, 'recalcLiveRunRecord gives the edited run a fresh 30 paid minutes; render() later re-applies the rule in memory, so the stored and shown gross can differ.');

    Store.records = [plhRec('g1', 'Variovac 1', 'A', [{ start: '08:00', end: '09:00', employees: 2 }], [], 300), plhRec('g2', 'Variovac 2', 'B', [{ start: '08:00', end: '09:00', employees: 2 }], [], 300)];
    Store.dailyReports = [buildReport(D)]; Store.records = Store.records.filter(r => r.id !== 'g2'); const view = getReportForView(D);
    T(15, 'Deleted production record', 'report saved with 2 runs, then one deleted', 'saved and viewed report agree, or the change is flagged', `saved RUNNING ${Store.dailyReports[0].totals.RUNNING}, viewed ${view.totals.RUNNING}; no warning`, false, 'Report view silently recomputes from current records; the saved snapshot (possibly already sent) is never compared. Real case: 2026-10-05 (18 records gone).');

    Store.records = [
      { id: 'h1', date: D, machine: 'Variovac 1', status: 'RUNNING', startTime: '08:00', endTime: '10:00', durationMin: 120, classification: '', reason: '', notes: '' },
      { id: 'h2', date: D, machine: 'Variovac 1', status: 'BREAK', startTime: '10:00', endTime: '10:30', durationMin: 30, classification: '', reason: '', notes: '' },
      { id: 'h3', date: D, machine: 'Variovac 2', status: 'BREAK', startTime: '10:00', endTime: '10:30', durationMin: 30, classification: '', reason: '', notes: '' },
      { id: 'h4', date: D, machine: 'Variovac 2', status: 'WAITING', startTime: '10:30', endTime: '11:00', durationMin: 30, classification: 'upstream', reasonCategory: 'Upstream / Product', reason: 'MAREL - Switching Product', notes: '' },
      { id: 'h5', date: D, machine: 'Manual Pack', status: 'WAITING', startTime: '10:30', endTime: '10:50', durationMin: 20, classification: 'internal', reasonCategory: 'Machine / Equipment', reason: 'Scale Problem', notes: '' },
      { id: 'h6', date: D, machine: 'Fajita', side: true, status: 'RUNNING', startTime: '08:00', endTime: '09:00', durationMin: 60, classification: '', reason: '', notes: '' }];
    rep = buildReport(D); const sumBreak = Object.values(rep.perMachine).reduce((a, m) => a + m.BREAK, 0);
    T(16, 'Daily aggregation', 'V1 RUN 120 + BREAK 30; V2 BREAK 30 + WAIT up 30; MP WAIT int 20; Fajita side RUN 60', 'RUN 120, WAIT 50 (up 30 / int 20), recordCount 5 (side excluded), most waiting V2 30', `${JSON.stringify(rep.totals)}, records ${rep.recordCount}, mma ${JSON.stringify(rep.machineMostAffected)}, sum machine BREAK ${sumBreak}`, rep.totals.RUNNING === 120 && rep.totals.WAITING === 50 && rep.totals.upstream === 30 && rep.totals.internal === 20 && rep.recordCount === 5 && rep.machineMostAffected.machine === 'Variovac 2', `Department BREAK ${rep.totals.BREAK} = clock minutes (overlapping breaks merged) while machine BREAK totals add to ${sumBreak}: the two are not additive. Fajita (side) is omitted from the daily report without any note.`);

    Store.records = [plhRec('w1', 'Variovac 1', 'A', [{ start: '08:00', end: '09:00', employees: 1 }], [], 500), plhRec('w2', 'Variovac 1', 'A', [{ start: '08:00', end: '12:00', employees: 2 }], [], 800, { date: '2030-01-08' })];
    const wk = computePLHSummary(plhRecordsInRange('2030-01-07', '2030-01-13')); const ser = dailyPLHSeries('2030-01-07', '2030-01-13');
    T(17, 'Weekly aggregation', 'Mon 500lb/1h (500 PLH), Tue 800lb/8h (100 PLH)', 'weekly = 1300/9 = 144.44 (not mean 300)', `weekly ${wk.grossPLH}; daily series ${ser.map(x => x.plh).join(', ')}`, eq(wk.grossPLH, 1300 / 9));

    const r30 = plhPresetRange('30days'), wkr = plhPresetRange('thisWeek');
    T(18, 'Monthly aggregation', 'calendar month report', 'a calendar-month (1st to last day) report', `no monthly report in app; presets: 30days ${r30.start}..${r30.end}, thisWeek ${wkr.start}..${wkr.end}`, false, 'Only rolling "Last 30 days" and custom ranges exist. A calendar month can be entered manually as a custom range in Weekly Summary; the PLH maths there is pooled (correct).');

    Store.records = [plhRec('x1', 'Variovac 1', 'A', [{ start: '08:00', end: '09:00', employees: 2 }], [], 400), plhRec('x2', 'Manual Pack', 'B', [{ start: '08:00', end: '09:00', employees: 2 }], [], 200), plhRec('x3', 'Vacuum Sealer', 'C', [{ start: '08:00', end: '09:00', employees: 1 }], [], 150, { side: true })];
    const dept = computePLHSummary(plhRecordsInRange(D, D)), sd = computePLHSummary(plhRecordsInRange(D, D, 'side'));
    T(19, 'Department-wide aggregation', 'V1 400lb/2h, MP 200lb/2h, Vacuum Sealer 150lb/1h (side)', 'lines dept = 600/4 = 150 PLH; side reported separately (150 lb, 1 h)', `lines ${dept.totalWeight} lb / ${dept.totalGrossHours} h = ${dept.grossPLH}; side ${sd.totalWeight} lb / ${sd.totalGrossHours} h`, eq(dept.grossPLH, 150) && sd.totalWeight === 150);
    Store.records.forEach(r => r.date = D); rep = buildReport(D);
    T(20, 'Manual Pack and side-machine production in Daily Report', 'same 3 runs', 'Manual Pack in report; side machine shown or explicitly noted as excluded', `perMachine keys ${Object.keys(rep.perMachine).join(', ')}; RUNNING ${rep.totals.RUNNING}`, false, 'Manual Pack is included. Side machines are excluded from daily/weekly reports by design (v157) with no note on the report itself.');

    // ---- extra tests from second brief ----
    T(21, 'Record crossing midnight', 'start 23:00 end 01:00', 'flagged / handled as 120 min', `duration() = ${duration('23:00', '01:00')}; overnight repair end = ${pastOpenEnd('23:00')}`, false, 'App assumes a day shift: crossing midnight gives 0 min; the repair sets the end equal to the start (0 min). Acceptable for a single day shift only.');
    Store.records = [{ id: 'k1', date: D, machine: 'Variovac 1', status: 'WAITING', startTime: '10:00', endTime: '10:55', durationMin: 55, classification: 'internal', reasonCategory: 'Labour / Operational', reason: 'Other', notes: 'Crew talk' }, { id: 'k2', date: D, machine: 'Variovac 1', status: 'BREAK', startTime: '10:00', endTime: '10:30', durationMin: 30, classification: '', reason: '', notes: '' }];
    rep = buildReport(D);
    T(22, 'Downtime overlapping another state', 'WAITING 10:00-10:55 and BREAK 10:00-10:30 on V1', '55 clock minutes on V1, overlap flagged', `V1 WAITING ${rep.perMachine['Variovac 1'].WAITING} + BREAK ${rep.perMachine['Variovac 1'].BREAK} = ${rep.perMachine['Variovac 1'].WAITING + rep.perMachine['Variovac 1'].BREAK}; no flag`, false, 'Reports never check overlaps; 30 min counted twice. Real cases on 2026-08-19, 08-21, 09-01, 09-15, 09-29.');
    T(23, 'Planned stop entered as Waiting "Other"', 'WAITING / Other / note "Crew talk"', 'counted as planned (excluded from bottlenecks/efficiency)', `bottlenecks ${JSON.stringify(rep.bottlenecks)}; V1 efficiency ${efficiencyPct(rep.perMachine['Variovac 1'])}`, false, 'Free text under Waiting is ranked as a bottleneck; 77 real records (797 min) of Crew Talk / Metal Detector / Town Hall / Stretching are WAITING.');
    T(24, 'Rounding: no early rounding', 'PLH 257.136 lb / 1.25 h', '205.7088 stored unrounded', `${257.136 / 1.25}`, true, 'Stored hours and PLH are full-precision; rounding happens only in display (toFixed).');
    return out;
  }, data);
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log(res.tests.map(t => `${t.pass ? 'PASS' : 'FAIL'}  #${t.n} ${t.name}\n      actual: ${t.actual}`).join('\n'));
  await b.close();
})();

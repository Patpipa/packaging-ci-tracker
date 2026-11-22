// Expected values are worked out by hand in each comment — never with the app's own functions.
module.exports = [
{ id:'A', name:'Single machine, one employee', input:'V1 · Mandy · 8:00–12:00 · 1,000 lbs',
  // labour 4h × 1 = 4.0 h = 240 min · PLH 1000/4 = 250
  code:`await H.start('Variovac 1',['Mandy']); H.at('12:00'); await H.fin('Variovac 1',1000,50); const r=H.run('Variovac 1')[0]; return r;`,
  expect:[['Run minutes',240,'dur'],['Net labour (min)',240,'net'],['Gross labour (min)',240,'gross'],['Gross PLH',250,'gPLH'],['Net PLH',250,'nPLH']] },
{ id:'B', name:'Single machine, two employees', input:'V1 · 2 people · 8:00–12:00 · 2,000 lbs',
  // 2 × 4 h = 8 h = 480 min · 2000/8 = 250
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('12:00'); await H.fin('Variovac 1',2000,100); return H.run('Variovac 1')[0];`,
  expect:[['Run minutes',240,'dur'],['Labour (min)',480,'gross'],['Gross PLH',250,'gPLH']] },
{ id:'C', name:'Single machine, three employees (3 × 8 h)', input:'V1 · 3 people · 8:00–16:00, no break · 4,800 lbs',
  // 3 × 8 h = 24 h = 1440 min · 4800/24 = 200
  code:`await H.start('Variovac 1',['Mandy','Harpreet','Stanley']); H.at('16:00'); await H.fin('Variovac 1',4800,200); return H.run('Variovac 1')[0];`,
  expect:[['Labour (min)',1440,'gross'],['Labour hours',24,'h'],['Gross PLH',200,'gPLH']].map(x=>x[2]==='h'?['Labour hours',24,'gross',0]:x).slice(0,1).concat([['Gross PLH',200,'gPLH']]) },
{ id:'D', name:'Three machines at once — department PLH from totals, not an average', input:'8:00–10:00 · V1 2 people 1,000 lbs · V2 2 people 1,500 lbs · V3 1 person 600 lbs',
  // labour V1 4h, V2 4h, V3 2h = 10h · lbs 3100 · dept PLH 3100/10 = 310 (average of 250/375/300 would be 308.33 — wrong)
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); await H.start('Variovac 2',['Stanley','Winston']); await H.start('Variovac 3',['Sandeep']); H.at('10:00'); await H.fin('Variovac 1',1000,1); await H.fin('Variovac 2',1500,1); await H.fin('Variovac 3',600,1);
    const s=computePLHSummary(plhRecordsInRange(H.T,H.T)); const t=H.txt(renderPLHReportHTML(H.T,H.T)); return {lbs:s.totalWeight, hrs:s.totalGrossHours, plh:s.grossPLH, v1:H.run('Variovac 1')[0].gPLH, v2:H.run('Variovac 2')[0].gPLH, v3:H.run('Variovac 3')[0].gPLH, shown: (t.match(/([\\d.]+) lbs\\/hr/)||[])[1]};`,
  expect:[['Department lbs',3100,'lbs'],['Department labour hours',10,'hrs'],['Department PLH',310,'plh'],['V1 PLH',250,'v1'],['V2 PLH',375,'v2'],['V3 PLH',300,'v3'],['PLH shown on report','310.0','shown']] },
{ id:'E', name:'Two products on one machine in one shift', input:'V1 · 2 people · Product A 8:00–9:00 500 lbs · Product B 9:00–11:00 1,200 lbs',
  // A: 2h labour → 250 · B: 4h → 300 · machine 1700/6 = 283.33
  code:`await H.start('Variovac 1',['Mandy','Harpreet'],'Product A'); H.at('09:00'); await H.fin('Variovac 1',500,1); await H.start('Variovac 1',['Mandy','Harpreet'],'Product B'); H.at('11:00'); await H.fin('Variovac 1',1200,1);
    const R=H.run('Variovac 1'); const s=computePLHSummary(plhRecordsInRange(H.T,H.T)); const jobs=groupPLHJobs(plhRecordsInRange(H.T,H.T)); return {a:R.find(r=>r.product==='Product A').gPLH, b:R.find(r=>r.product==='Product B').gPLH, m:s.grossPLH, jobs:jobs.length, lbs:s.totalWeight};`,
  expect:[['Product A PLH',250,'a'],['Product B PLH',300,'b'],['Machine PLH',283.3333,'m',0.01],['Jobs kept separate',2,'jobs'],['Machine lbs',1700,'lbs']] },
{ id:'F', name:'Employee moves from one machine to another', input:'V1 Mandy+Harpreet 8:00 · V2 Stanley 8:00 · Harpreet → V2 at 9:00 · both finish 10:00 · V1 900 lbs · V2 600 lbs',
  // V1 = 2×60 + 1×60 = 180 min (3h) → 300 · V2 = 1×60 + 2×60 = 180 min → 200 · Harpreet 60 on V1 + 60 on V2 = 120 (not counted twice)
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); await H.start('Variovac 2',['Stanley']); H.at('09:00'); await sendNamesTo(['Harpreet'],'Variovac 2'); await H.sync(); H.at('10:00'); await H.fin('Variovac 1',900,1); await H.fin('Variovac 2',600,1);
    const p=H.person('Harpreet'); const all=personDay(H.T).people.reduce((t,q)=>t+(q.tot['V1 running']||0)+(q.tot['V2 running']||0),0); return {v1:H.run('Variovac 1')[0].gross, v2:H.run('Variovac 2')[0].gross, p1:H.run('Variovac 1')[0].gPLH, p2:H.run('Variovac 2')[0].gPLH, hv1:p.tot['V1 running']||0, hv2:p.tot['V2 running']||0, crewLine:all};`,
  expect:[['V1 labour (min)',180,'v1'],['V2 labour (min)',180,'v2'],['V1 PLH',300,'p1'],['V2 PLH',200,'p2'],['Harpreet on V1 (min)',60,'hv1'],['Harpreet on V2 (min)',60,'hv2'],['Crew line minutes = machine labour (360)',360,'crewLine']] },
{ id:'G', name:'Partial day and a run crossing noon', input:'V3 2 people 13:00–15:00 800 lbs · V1 1 person 11:30–12:30 300 lbs',
  // V3 2×2h = 240 min → 200 · V1 60 min → 300
  code:`H.at('11:30'); await H.start('Variovac 1',['Mandy']); H.at('12:30'); await H.fin('Variovac 1',300,1); H.at('13:00'); await H.start('Variovac 3',['Sandeep','Stanley']); H.at('15:00'); await H.fin('Variovac 3',800,1); return {v3:H.run('Variovac 3')[0].gross, p3:H.run('Variovac 3')[0].gPLH, v1:H.run('Variovac 1')[0].gross, p1:H.run('Variovac 1')[0].gPLH};`,
  expect:[['V3 labour (min)',240,'v3'],['V3 PLH',200,'p3'],['Noon run labour (min)',60,'v1'],['Noon run PLH',300,'p1']] },
{ id:'H', name:'Downtime over 30 minutes + alarm', input:'V1 2 people 8:00–10:00 · waiting (meat) 9:00–9:45 · 1,000 lbs',
  // running 75 min → net 150 · gross 150 + 45×2 = 240 · gross PLH 1000/4 = 250 · net 1000/2.5 = 400 · alarm on at 9:31, off after resume
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('09:00'); await H.down('Variovac 1','WAITING','Meat Still Thawing'); H.at('09:29'); Router.go('dashboard'); render(); const a1=!!document.querySelector('.alarm-flash'); H.at('09:31'); render(); const a2=!!document.querySelector('.alarm-flash'); H.at('09:45'); await H.resume('Variovac 1'); H.at('09:46'); Router.go('dashboard'); render(); const a3=!!document.querySelector('.alarm-flash'); Router.go('live'); H.at('10:00'); await H.fin('Variovac 1',1000,1);
    const r=H.run('Variovac 1')[0]; const w=H.recs('Variovac 1','WAITING'); return {...r, wait:w.reduce((t,x)=>t+x.durationMin,0), nW:w.length, a1, a2, a3};`,
  expect:[['Running minutes',75,'dur'],['Net labour',150,'net'],['Gross labour',240,'gross'],['Gross PLH',250,'gPLH'],['Net PLH',400,'nPLH'],['Waiting minutes recorded once',45,'wait'],['One waiting record',1,'nW'],['Alarm off at 29 min',false,'a1'],['Alarm on at 31 min',true,'a2'],['Alarm clears after resume',false,'a3']] },
{ id:'I', name:'Machine with zero production', input:'V1 1 person 8:00–9:00 · weight 0',
  // must not show 0 PLH as a real result — must be listed as missing weight and left out of totals
  code:`await H.start('Variovac 1',['Mandy']); H.at('09:00'); await H.fin('Variovac 1',0,0); return {inTotals: plhRecordsInRange(H.T,H.T).length, flagged: incompletePLHRecordsInRange(H.T,H.T).length};`,
  expect:[['Left out of PLH totals',0,'inTotals'],['Flagged as missing weight',1,'flagged']] },
{ id:'J', name:'Missing weight, then entered later in History', input:'V1 2 people 8:00–10:00 · no weight · later 1,000 lbs',
  // before: incomplete, not in totals · after: 4h labour → 250
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('10:00'); await H.fin('Variovac 1','',''); const before={inT:plhRecordsInRange(H.T,H.T).length, inc:incompletePLHRecordsInRange(H.T,H.T).length};
    const id=H.run('Variovac 1')[0].id; openAddPLHData(id); render(); document.getElementById('plhWeightInput').value='1000'; document.getElementById('plhQtyInput').value='10'; await confirmAddPLHData();
    const s=computePLHSummary(plhRecordsInRange(H.T,H.T)); return {...before, after:s.grossPLH, incAfter:incompletePLHRecordsInRange(H.T,H.T).length};`,
  expect:[['Before: not in totals',0,'inT'],['Before: flagged incomplete',1,'inc'],['After: PLH',250,'after'],['After: no longer incomplete',0,'incAfter']] },
{ id:'K', name:'Missing employee assignment', input:'Start V1 with nobody picked',
  code:`startLiveRunSetup('Variovac 1'); await confirmStartRun(); return {started: !!Store.liveRuns['Variovac 1']};`,
  expect:[['Run refused without crew',false,'started']] },
{ id:'L', name:'Several downtime events, no double counting', input:'V1 2 people 8:00–12:00 · wait 9:00–9:20 · changeover 10:00–10:15 · wait 11:00–11:10 · 2,400 lbs',
  // stops 45 → running 195 · net 390 · gross 390+90 = 480 (8h) → 300 · net PLH 2400/6.5 = 369.23 · running+waiting+changeover = 240 · efficiency 195/240 = 81%
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('09:00'); await H.down('Variovac 1','WAITING','Meat Still Thawing'); H.at('09:20'); await H.resume('Variovac 1'); H.at('10:00'); await H.down('Variovac 1','CHANGEOVER'); H.at('10:15'); await H.resume('Variovac 1'); H.at('11:00'); await H.down('Variovac 1','WAITING','Meat Still Thawing'); H.at('11:10'); await H.resume('Variovac 1'); H.at('12:00'); await H.fin('Variovac 1',2400,1);
    const r=H.run('Variovac 1')[0]; const mt=machineTotals(Store.records.filter(x=>x.date===H.T),'Variovac 1'); return {...r, W:mt.WAITING, C:mt.CHANGEOVER, R:mt.RUNNING, wall:mt.RUNNING+mt.WAITING+mt.CHANGEOVER, eff:efficiencyPct(mt)};`,
  expect:[['Running minutes',195,'dur'],['Net labour',390,'net'],['Gross labour',480,'gross'],['Gross PLH',300,'gPLH'],['Net PLH',369.2308,'nPLH',0.01],['Waiting total',30,'W'],['Changeover total',15,'C'],['Running + stops = 240 (no double count)',240,'wall'],['Efficiency %',81,'eff']] },
{ id:'M', name:'Weekly total across two days — from totals, not an average of days', input:'Yesterday V1 2 people 8:00–10:00 1,000 lbs · Today V1 1 person 8:00–10:00 600 lbs',
  // lbs 1600 · labour 4h + 2h = 6h · weekly PLH 266.67 (average of days 250 & 300 would be 275 — wrong)
  code:`const T0=H.T, Y=shiftDate(T0,-1); const real=todayStr; todayStr=()=>Y; await confirmTodaysCrew(false); await H.start('Variovac 1',['Mandy','Harpreet']); H.at('10:00'); await H.fin('Variovac 1',1000,1); todayStr=real; H.at('08:00'); await H.start('Variovac 1',['Mandy']); H.at('10:00'); await H.fin('Variovac 1',600,1);
    const s=computePLHSummary(plhRecordsInRange(Y,T0)); weeklyRange={start:Y,end:T0}; const wt=weeklySummaryText(); const days=dailyPLHSeries(Y,T0).map(x=>Math.round(x.plh)); return {lbs:s.totalWeight, hrs:s.totalGrossHours, plh:s.grossPLH, weeklyShown:(wt.match(/Gross (\\d+)/)||[])[1], days};`,
  expect:[['Week lbs',1600,'lbs'],['Week labour hours',6,'hrs'],['Week PLH',266.6667,'plh',0.01],['Weekly Summary shows','267','weeklyShown'],['Daily PLHs (250, 300)',[250,300],'days']] },
{ id:'N', name:'Department total = sum of the machines; side machines kept apart', input:'V1 1,000 lbs · V2 1,500 lbs · V3 600 lbs · plus a Fajita job (side machine)',
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); await H.start('Variovac 2',['Stanley','Winston']); await H.start('Variovac 3',['Sandeep']); openSideSetup('Fajita'); H.pick('side',['Mohamad']); await confirmSide(); await H.sync(); H.at('10:00'); await H.fin('Variovac 1',1000,1); await H.fin('Variovac 2',1500,1); await H.fin('Variovac 3',600,1); const f=openSideRuns(H.T).find(x=>x.machine==='Fajita'); openSideEnd(f.id); await finishSideJob(f.id); await H.sync();
    const lines=computePLHSummary(plhRecordsInRange(H.T,H.T)); const byM=MACHINES.map(m=>computePLHSummary(plhRecordsInRange(H.T,H.T).filter(r=>r.machine===m)).totalWeight); const sideRecs=Store.records.filter(r=>r.date===H.T && r.side); return {dept:lines.totalWeight, sum:byM.reduce((a,b)=>a+b,0), sideInLines: plhRecordsInRange(H.T,H.T).filter(r=>r.side).length, sideJobs: sideRecs.length};`,
  expect:[['Lines department lbs',3100,'dept'],['Sum of machines',3100,'sum'],['Side jobs not mixed into line totals',0,'sideInLines']] },
{ id:'O', name:'Edited records recalculate', input:'Run of test H · then (1) waiting 9:00–9:45 edited to 9:00–9:30 · (2) run finish 10:00 edited to 9:50',
  // (1) waiting 30 · run gross must become 150 + 30×2 = 210 → PLH 1000/3.5 = 285.71
  // (2) running 75 → 65 · net 130 · gross 130 + 30×2 = 190 → 315.79
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('09:00'); await H.down('Variovac 1','WAITING','Meat Still Thawing'); H.at('09:45'); await H.resume('Variovac 1'); H.at('10:00'); await H.fin('Variovac 1',1000,1);
    const ed=async(id,s,e)=>{ editRecord(id); render(); draft.startTime=s; draft.endTime=e; const a=document.getElementById('startTimeInput'), b=document.getElementById('endTimeInput'); if(a) a.value=s; if(b) b.value=e; await saveRecord(); };
    const w=H.recs('Variovac 1','WAITING')[0]; await ed(w.id,'09:00','09:30'); const r1=H.run('Variovac 1')[0]; const w1=H.recs('Variovac 1','WAITING')[0].durationMin;
    await ed(r1.id,'08:00','09:50'); const r2=H.run('Variovac 1')[0]; return {w1, g1:r1.gross, p1:r1.gPLH, d2:r2.dur, n2:r2.net, g2:r2.gross, p2:r2.gPLH};`,
  expect:[['Waiting after edit',30,'w1'],['Run gross after stop edit',210,'g1'],['PLH after stop edit',285.7143,'p1',0.01],['Running after finish edit',65,'d2'],['Net after finish edit',130,'n2'],['Gross after finish edit',190,'g2'],['PLH after finish edit',315.7895,'p2',0.01]] },
{ id:'P', name:'Deleted record leaves every total', input:'Run of test H · delete the 45-min waiting record',
  // waiting 0 · run gross back to running labour only = 150 → PLH 400 · weekly waiting 0
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('09:00'); await H.down('Variovac 1','WAITING','Meat Still Thawing'); H.at('09:45'); await H.resume('Variovac 1'); H.at('10:00'); await H.fin('Variovac 1',1000,1);
    const w=H.recs('Variovac 1','WAITING')[0]; await deleteRecord(w.id); const r=H.run('Variovac 1')[0]; const rep=buildRangeReport(H.T,H.T); return {wait:rep.totals.WAITING, g:r.gross, p:r.gPLH};`,
  expect:[['Weekly waiting after delete',0,'wait'],['Run gross after delete',150,'g'],['PLH after delete',400,'p']] },
{ id:'Q', name:'Duplicate / overlapping records', input:'(1) a manual waiting entry on top of a logged run — answer No to "Save anyway?" · (2) import the same backup twice',
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('10:00'); await H.fin('Variovac 1',1000,1); const n0=Store.records.length;
    window.confirm=()=>false; draft=freshDraft(); draft.date=H.T; draft.machine='Variovac 1'; draft.status='WAITING'; draft.waitCategory=Object.keys(WAITING_CATEGORIES)[0]; draft.startTime='09:00'; draft.endTime='09:20'; Router.go('new'); render(); const a=document.getElementById('startTimeInput'), b=document.getElementById('endTimeInput'); if(a) a.value='09:00'; if(b) b.value='09:20'; await saveRecord(); const n1=Store.records.length;
    window.confirm=()=>true; const json=JSON.stringify(fullBackupData()); const ev=()=>({target:{files:[{text:async()=>json}], value:''}}); await importData(ev()); await importData(ev()); return {n0, n1, n2:Store.records.length, same1: n1===n0, same2: Store.records.length===n0};`,
  expect:[['Overlap refused (record count unchanged)',true,'same1'],['Importing twice adds nothing',true,'same2']].map(x=>x) },
{ id:'R', name:'Breaks — 30 paid minutes per line, rest unpaid', input:'V1 2 people 8:00–12:00 · break 10:00–10:30 · break 11:00–11:20 · 2,000 lbs',
  // running 240−50 = 190 → net 380 · gross 380 + 30×2 paid = 440 → 272.73 · net 315.79 · each person: 190 on V1, 50 break · floor break time 50
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('10:00'); await startBreakAll(); await H.sync(); H.at('10:30'); await endBreakAll(); await H.sync(); H.at('11:00'); await startBreakAll(); await H.sync(); H.at('11:20'); await endBreakAll(); await H.sync(); H.at('12:00'); await H.fin('Variovac 1',2000,1);
    const r=H.run('Variovac 1')[0]; const p=H.person('Mandy'); const rep=buildRangeReport(H.T,H.T); return {...r, pRun:p.tot['V1 running']||0, pBrk:p.tot['Break']||0, floorBrk:rep.totals.BREAK};`,
  expect:[['Running minutes',190,'dur'],['Net labour',380,'net'],['Gross labour (30 paid break min × 2)',440,'gross'],['Gross PLH',272.7273,'gPLH',0.01],['Net PLH',315.7895,'nPLH',0.01],['Mandy on V1 (min)',190,'pRun'],['Mandy break (min)',50,'pBrk'],['Floor break time',50,'floorBrk']] },
{ id:'S', name:'Bad input is refused', input:'(1) finish a run with weight −500 · (2) manual entry ending before it starts (overnight not supported)',
  code:`await H.start('Variovac 1',['Mandy']); H.at('09:00'); await H.fin('Variovac 1',-500,1); const neg = H.run('Variovac 1').length===0 && !!Store.liveRuns['Variovac 1'];
    const n0=Store.records.length; draft=freshDraft(); draft.date=H.T; draft.machine='Variovac 2'; draft.status='WAITING'; draft.waitCategory=Object.keys(WAITING_CATEGORIES)[0]; draft.startTime='23:00'; draft.endTime='01:00'; Router.go('new'); render(); const a=document.getElementById('startTimeInput'), b=document.getElementById('endTimeInput'); if(a) a.value='23:00'; if(b) b.value='01:00'; await saveRecord(); return {neg, back: Store.records.length===n0};`,
  expect:[['Negative weight refused',true,'neg'],['End before start refused',true,'back']] },
{ id:'T', name:'CSV export matches the records', input:'Run of test L exported to CSV',
  // CSV durations for V1 must add to 240 (195 running + 30 waiting + 15 changeover)
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('09:00'); await H.down('Variovac 1','WAITING','Meat Still Thawing'); H.at('09:20'); await H.resume('Variovac 1'); H.at('10:00'); await H.down('Variovac 1','CHANGEOVER'); H.at('10:15'); await H.resume('Variovac 1'); H.at('12:00'); await H.fin('Variovac 1',2400,1);
    let csv=''; const dl=downloadBlob; downloadBlob=(c)=>{ csv=c; }; exportCSV(); downloadBlob=dl; const rows=csv.trim().split('\\n').slice(1).map(l=>l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map(x=>x.replace(/,$/,'').replace(/^"|"$/g,''))); const durI=7; const sum=rows.filter(r=>r[3]==='Variovac 1').reduce((t,r)=>t+(+r[durI]||0),0); return {sum, n:rows.length};`,
  expect:[['CSV minutes for V1',240,'sum']] },
{ id:'U', name:'Two runs share the 30 paid break minutes; a break edit moves them', input:'V1 2 people · run 1 8:00–11:00 with break 10:00–10:30, 1,000 lbs · run 2 11:00–13:00 with break 12:00–12:20, 800 lbs · then break 1 edited to 10:00–10:15',
  // run1: running 150 → net 300 · gross 300 + 30×2 = 360 → 166.67 · run2: running 100 → net 200 · break 20 unpaid (30 used) → gross 200 → 240
  // after edit: run1 paid 15 → gross 330 → 181.82 · run2 gets the other 15 paid → gross 230 → 208.70
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('10:00'); await startBreakAll(); await H.sync(); H.at('10:30'); await endBreakAll(); await H.sync(); H.at('11:00'); await H.fin('Variovac 1',1000,1);
    await H.start('Variovac 1',['Mandy','Harpreet']); H.at('12:00'); await startBreakAll(); await H.sync(); H.at('12:20'); await endBreakAll(); await H.sync(); H.at('13:00'); await H.fin('Variovac 1',800,1);
    const R0=H.run('Variovac 1').sort((a,b)=>a.start.localeCompare(b.start)); const b1=H.recs('Variovac 1','BREAK').find(r=>r.startTime==='10:00');
    editRecord(b1.id); render(); draft.startTime='10:00'; draft.endTime='10:15'; const a=document.getElementById('startTimeInput'), b=document.getElementById('endTimeInput'); if(a) a.value='10:00'; if(b) b.value='10:15'; await saveRecord();
    const R1=H.run('Variovac 1').sort((a,b)=>a.start.localeCompare(b.start)); return {g1:R0[0].gross, p1:R0[0].gPLH, g2:R0[1].gross, p2:R0[1].gPLH, g1b:R1[0].gross, p1b:R1[0].gPLH, g2b:R1[1].gross, p2b:R1[1].gPLH};`,
  expect:[['Run 1 gross',360,'g1'],['Run 1 PLH',166.6667,'p1',0.01],['Run 2 gross (break unpaid)',200,'g2'],['Run 2 PLH',240,'p2',0.01],['Run 1 gross after edit',330,'g1b'],['Run 1 PLH after edit',181.8182,'p1b',0.01],['Run 2 gross after edit',230,'g2b'],['Run 2 PLH after edit',208.6957,'p2b',0.01]] },
{ id:'V', name:'A stop changed to No Work leaves gross labour', input:'Run of test H · waiting 9:00–9:45 changed to No Work Scheduled',
  // No Work is never paid labour → gross = net = 150 → PLH 400
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('09:00'); await H.down('Variovac 1','WAITING','Meat Still Thawing'); H.at('09:45'); await H.resume('Variovac 1'); H.at('10:00'); await H.fin('Variovac 1',1000,1);
    const w=H.recs('Variovac 1','WAITING')[0]; editRecord(w.id); render(); draft.status='NO_WORK'; await saveRecord(); const r=H.run('Variovac 1')[0]; return {g:r.gross, p:r.gPLH, st: (Store.records.find(x=>x.id===w.id)||{}).status};`,
  expect:[['Stop now No Work','NO_WORK','st'],['Gross labour',150,'g'],['PLH',400,'p']] },
{ id:'W', name:'Planned stop typed under Waiting is saved as Planned', input:'V1 2 people 8:00–10:00 · stop 9:00–9:15 picked as Waiting → Other "Crew talk" · answer Yes to the prompt · 1,000 lbs',
  // stop saved as PLANNED, not WAITING · waiting total 0 · efficiency = 105/105 = 100% (planned is not in efficiency) · gross = 210 + 15×2 = 240
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('09:00'); openDowntimeSetup('Variovac 1'); liveDowntimeSetup.status='WAITING'; liveDowntimeSetup.waitCategory='Labour / Operational'; liveDowntimeSetup.waitReason='Other'; liveDowntimeSetup.waitReasonOther='Crew talk'; await confirmDowntime(); await H.sync(); H.at('09:15'); await H.resume('Variovac 1'); H.at('10:00'); await H.fin('Variovac 1',1000,1);
    const mt=machineTotals(Store.records.filter(x=>x.date===H.T),'Variovac 1'); return {pl:mt.PLANNED, w:mt.WAITING, eff:efficiencyPct(mt), g:H.run('Variovac 1')[0].gross};`,
  expect:[['Saved as planned (min)',15,'pl'],['Waiting (min)',0,'w'],['Efficiency %',100,'eff'],['Gross labour',240,'g']] },
{ id:'X', name:'Same run finished twice (two devices) is saved once', input:'V1 2 people 8:00–10:00 1,000 lbs · a second device finishes the same run again',
  // RUNNING records for V1 = 1 · labour 240 counted once
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('10:00'); const copy=JSON.parse(JSON.stringify(Store.liveRuns['Variovac 1'])); await H.fin('Variovac 1',1000,1); Store.liveRuns['Variovac 1']=copy; await H.fin('Variovac 1',1000,1);
    return {n:H.run('Variovac 1').length, lab:H.run('Variovac 1').reduce((t,r)=>t+r.gross,0), plhLbs: computePLHSummary(plhRecordsInRange(H.T,H.T)).totalWeight};`,
  expect:[['Run records',1,'n'],['Labour counted once',240,'lab'],['Pounds counted once',1000,'plhLbs']] },
{ id:'Y', name:'Weight on a run with no running time is not lost', input:'V1 started 8:00 and stopped the same minute · Finish at 8:30 with 500 lbs',
  // refused with a message, run stays open, nothing saved
  code:`await H.start('Variovac 1',['Mandy']); await H.down('Variovac 1','WAITING','Meat Still Thawing'); H.at('08:30'); await H.fin('Variovac 1',500,1); return {open: !!Store.liveRuns['Variovac 1'], saved: H.recs('Variovac 1').length, dtOpen: !Store.liveRuns['Variovac 1'].downtimeSegments.slice(-1)[0].end};`,
  expect:[['Run still open',true,'open'],['Nothing saved',0,'saved'],['Stop still open',true,'dtOpen']] },
{ id:'Z', name:'Editing a run re-shares the 30 paid break minutes', input:'Test U runs · then run 1 edited to 8:00–9:55 (its 10:00 break falls outside)',
  // run1: running 8:00–9:55 = 115 → net 230 · no break left → gross 230 → 1000/(230/60) = 260.87
  // run2: break 12:00–12:20 now gets the paid minutes (20) → gross 200 + 20×2 = 240 → 800/4 = 200
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('10:00'); await startBreakAll(); await H.sync(); H.at('10:30'); await endBreakAll(); await H.sync(); H.at('11:00'); await H.fin('Variovac 1',1000,1);
    await H.start('Variovac 1',['Mandy','Harpreet']); H.at('12:00'); await startBreakAll(); await H.sync(); H.at('12:20'); await endBreakAll(); await H.sync(); H.at('13:00'); await H.fin('Variovac 1',800,1);
    const r1=H.run('Variovac 1').sort((a,b)=>a.start.localeCompare(b.start))[0]; editRecord(r1.id); render(); draft.startTime='08:00'; draft.endTime='09:55'; const a=document.getElementById('startTimeInput'), b=document.getElementById('endTimeInput'); if(a) a.value='08:00'; if(b) b.value='09:55'; await saveRecord();
    const R=H.run('Variovac 1').sort((a,b)=>a.start.localeCompare(b.start)); return {g1:R[0].gross, p1:R[0].gPLH, g2:R[1].gross, p2:R[1].gPLH};`,
  expect:[['Run 1 gross',230,'g1'],['Run 1 PLH',260.8696,'p1',0.01],['Run 2 gross',240,'g2'],['Run 2 PLH',200,'p2',0.01]] },
{ id:'AA', name:'Best / Lowest product skip a 2-minute outlier', input:'V1 2 people 8:00–8:02 137 lbs (PLH 2,055) · V1 2 people 8:10–10:10 1,000 lbs (250) · V2 1 person 8:00–9:00 300 lbs (300)',
  // best = V2 300 · lowest = V1 250 · the 2-min run is flagged as unusual PLH
  code:`await H.start('Variovac 1',['Mandy','Harpreet'],'Short'); await H.start('Variovac 2',['Stanley'],'Steaks'); H.at('08:02'); await H.fin('Variovac 1',137,1); H.at('08:10'); await H.start('Variovac 1',['Mandy','Harpreet'],'Roast'); H.at('09:00'); await H.fin('Variovac 2',300,1); H.at('10:10'); await H.fin('Variovac 1',1000,1);
    const s=computePLHSummary(plhRecordsInRange(H.T,H.T)); const c=reportCheck(H.T); return {best: Math.round(s.best.plh.grossPLH), worst: Math.round(s.worst.plh.grossPLH), flagged: c.items.some(i=>/unusual PLH 2055/.test(i.name))};`,
  expect:[['Best product PLH',300,'best'],['Lowest product PLH',250,'worst'],['2-min run flagged',true,'flagged']] },
{ id:'AB', name:'PLH coverage shown', input:'V1 2 people 8:00–10:00 1,000 lbs · V2 2 people 8:00–10:00 no weight',
  // 1 of 2 runs · 4h of 8h = 50% · 1 awaiting weight
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); await H.start('Variovac 2',['Stanley','Winston']); H.at('10:00'); await H.fin('Variovac 1',1000,1); await H.fin('Variovac 2','',''); const c=plhCoverage(H.T,H.T); return {text:c.text, pct:c.pct, head: /Based on 1 of 2 runs/.test(plhHeadline(H.T).main)};`,
  expect:[['Coverage text','Based on 1 of 2 runs · 50% of labour hours · 1 awaiting weight','text'],['Coverage %',50,'pct'],['Shown in Daily PLH line',true,'head']] },
{ id:'AC', name:'Report changed after End Shift is flagged and logged', input:'Run of test H · End Shift · then the 45-min waiting record is deleted',
  // check: yellow "Records changed after End Shift" with Waiting 45m → 0m · edit history has 1 delete
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('09:00'); await H.down('Variovac 1','WAITING','Meat Still Thawing'); H.at('09:45'); await H.resume('Variovac 1'); H.at('10:00'); await H.fin('Variovac 1',1000,1); H.at('16:30'); await confirmEndShift(); await H.sync();
    const w=H.recs('Variovac 1','WAITING')[0]; await deleteRecord(w.id); const c=reportCheck(H.T); const it=c.items.find(i=>/changed after End Shift/.test(i.name)); return {flag: !!it, says: !!(it && /Waiting 45m → 0m/.test(it.name)), log: ((dayLogFor(H.T)||{}).changes||[]).filter(x=>x.act==='delete').length};`,
  expect:[['Flagged',true,'flag'],['Shows Waiting 45m → 0m',true,'says'],['Edit history entries',1,'log']] },
{ id:'AD', name:'Machine in two states at once is RED', input:'V1 running 8:00–10:00 · a manual Waiting 9:00–9:20 saved on top (answer Yes to "Save anyway?")',
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); H.at('10:00'); await H.fin('Variovac 1',1000,1); draft=freshDraft(); draft.date=H.T; draft.machine='Variovac 1'; draft.status='WAITING'; draft.waitCategory=Object.keys(WAITING_CATEGORIES)[0]; draft.startTime='09:00'; draft.endTime='09:20'; Router.go('new'); render(); const a=document.getElementById('startTimeInput'), b=document.getElementById('endTimeInput'); if(a) a.value='09:00'; if(b) b.value='09:20'; await saveRecord();
    const c=reportCheck(H.T); return {level:c.level, overlap: c.items.some(i=>i.lvl==='red' && /counted twice/.test(i.name))};`,
  expect:[['Level','red','level'],['Overlap named',true,'overlap']] },
{ id:'AE', name:'Calendar month presets', input:'Weekly Summary → Last Month and This Month',
  code:`const now=new Date(); const p=n=>String(n).padStart(2,'0'); const lm=new Date(now.getFullYear(), now.getMonth()-1, 1), lme=new Date(now.getFullYear(), now.getMonth(), 0);
    const exp1=lm.getFullYear()+'-'+p(lm.getMonth()+1)+'-01', exp2=lme.getFullYear()+'-'+p(lme.getMonth()+1)+'-'+p(lme.getDate()), exp3=now.getFullYear()+'-'+p(now.getMonth()+1)+'-01';
    Router.go('weekly'); setWeeklyMonth(-1); const a={...weeklyRange}; setWeeklyMonth(0); return {last: a.start===exp1 && a.end===exp2, thisM: weeklyRange.start===exp3 && weeklyRange.end===todayStr()};`,
  expect:[['Last month = 1st to last day',true,'last'],['This month = 1st to today',true,'thisM']] },
{ id:'AF', name:'Side machines in the Weekly Summary, not in line PLH', input:'V1 2 people 8:00–10:00 1,000 lbs · Fajita 1 person 8:00–10:00',
  code:`await H.start('Variovac 1',['Mandy','Harpreet']); openSideSetup('Fajita'); H.pick('side',['Mohamad']); await confirmSide(); await H.sync(); H.at('10:00'); await H.fin('Variovac 1',1000,1); const f=openSideRuns(H.T).find(x=>x.machine==='Fajita'); openSideEnd(f.id); await finishSideJob(f.id); await H.sync();
    weeklyRange={start:H.T,end:H.T}; const t=weeklySummaryText(); return {side: /SIDE MACHINES \\(reported separately, not in line PLH\\):\\nFajita: 2h 0m on · 2h 0m labour/.test(t), linePLH: computePLHSummary(plhRecordsInRange(H.T,H.T)).grossPLH};`,
  expect:[['Fajita listed separately (2h on, 2h labour)',true,'side'],['Line PLH unchanged (1000 ÷ 4h)',250,'linePLH']] },
{ id:'AG', name:'Delete Records in This Range needs DELETE typed', input:'One finished run · Delete range → type "no"',
  code:`await H.start('Variovac 1',['Mandy']); H.at('09:00'); await H.fin('Variovac 1',100,1); const n=Store.records.length; weeklyRange={start:H.T,end:H.T}; window.prompt=()=>'no'; await deleteRangeRecords(); const kept=Store.records.length===n; let backup=false; const dl=downloadBlob; downloadBlob=()=>{ backup=true; }; window.prompt=()=>'DELETE'; await deleteRangeRecords(); downloadBlob=dl; return {kept, backup, gone: Store.records.filter(r=>r.date===H.T).length};`,
  expect:[['Not deleted without DELETE',true,'kept'],['Backup made before deleting',true,'backup'],['Deleted after DELETE',0,'gone']] },
];
// Q post-processing keys
module.exports.find(s=>s.id==='Q').code += '';

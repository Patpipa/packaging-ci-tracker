const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext()).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200); await page.addScriptTag({content: fs.readFileSync(require('path').join(__dirname,'prelude.js'),'utf8')});
  const R = await page.evaluate(async()=>{ const H = await window.__P(); const T=H.T, Y=shiftDate(T,-1), F=window.__fbstore; const out={}; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    // 1. fresh start + a real day
    await H.start('Variovac 1',['Mandy','Harpreet']); H.at('09:00'); await sendNamesTo(['Stanley'],'Runner / Floater'); await H.sync(); H.at('10:00'); await H.fin('Variovac 1',1000,1);
    out.fresh = {index: !!F.dayLogIndex && !!F.dayLogIndex.migratedAt, dayDoc: !!F['day_'+T], oldDocWritten: !!(F.dayLog && F.dayLog.data && F.dayLog.data.length>2), dayBytes: (F['day_'+T]||{}).data ? F['day_'+T].data.length : 0};
    const hoursBefore = personDay(T).people.map(p=>p.name+':'+p.total).join(',');
    // 2. migration from an old single document holding two days
    const legacy = {[Y]: JSON.parse(JSON.stringify(Store.dayLog[T])), [T]: JSON.parse(JSON.stringify(Store.dayLog[T]))};
    Object.keys(F).filter(k=>k.startsWith('day_')||k==='dayLogIndex').forEach(k=>delete F[k]);
    F.dayLog = {data: JSON.stringify(legacy), updatedAt: Date.now()-5000};
    Store.dlSaved={}; Store.dlUpd={}; Store.dlIndex=null; Store.dayLog={};
    await Store.loadDayLog();
    out.migrate = {days: Object.keys(Store.dayLog).sort().join(','), docs: Object.keys(F).filter(k=>k.startsWith('day_')).length, idxDays: Object.keys(F.dayLogIndex).filter(k=>k.startsWith('d_')).length, legacyKept: !!F.dayLog, same: JSON.stringify(Store.dayLog[T])===JSON.stringify(legacy[T])};
    // 3. reload reads the same data
    const snapBefore = JSON.stringify(Store.dayLog); Store.dayLog={}; Store.dlSaved={}; await Store.loadDayLog(); out.reloadSame = JSON.stringify(Store.dayLog)===snapBefore; out.hoursSame = personDay(T).people.map(p=>p.name+':'+p.total).join(',')===hoursBefore;
    // 4. old-version device writes the old single document (today changed)
    const old = JSON.parse(F.dayLog.data); old[T].oldDeviceMark = 'yes'; await Store.db.collection('tracker').doc('dayLog').set({data: JSON.stringify(old), updatedAt: Date.now()+1000}); await sleep(300);
    out.legacyMerged = Store.dayLog[T].oldDeviceMark==='yes' && JSON.parse(F['day_'+T].data).oldDeviceMark==='yes';
    // 5. a normal tap writes only today's document
    const ySaved = F['day_'+Y].updatedAt; H.at('11:00'); await sendNamesTo(['Mandy'],'Runner / Floater'); await H.sync(); out.onlyToday = F['day_'+Y].updatedAt===ySaved && F['day_'+T].updatedAt>ySaved;
    // 6. delete a day
    delete Store.dayLog[Y]; await Store.saveDayLog(); out.deleted = F['day_'+Y].data==='' && F.dayLogIndex['d_'+Y]===false; Store.dayLog={}; Store.dlSaved={}; await Store.loadDayLog(); out.deletedAfterReload = !Store.dayLog[Y] && !!Store.dayLog[T];
    return out; });
  console.log(JSON.stringify(R,null,1)); console.log(errs.join('|')||'no page errors'); await b.close(); })();

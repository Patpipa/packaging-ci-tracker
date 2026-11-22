const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext()).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1500);
  const R = await page.evaluate(async()=>{ toast=()=>{}; window.confirm=()=>true; window.CLOCK='08:00'; nowHHMM=()=>CLOCK; askSideKind=async()=>'start'; Router.go('live'); await confirmTodaysCrew(false); const T=todayStr();
    const d0=ensureDayLog(T); d0.shift={}; await saveDayLogNow();
    const pick=(ctx,names)=>{ namePickHTML(ctx); names.forEach(n=>toggleName(ctx,pickLists[ctx].indexOf(n))); };
    startLiveRunSetup('Variovac 1'); pick('line',['Mandy','Harpreet']); await confirmStartRun();
    startLiveRunSetup('Variovac 2'); pick('line',['Stanley']); await confirmStartRun();
    openSidePrep('Fajita'); pick('prep',['Winston']); await confirmSidePrep();
    askGarbageKind=async()=>'Trimmer'; await sendNamesTo(['Sandeep'],'Garbage run');
    await sendNamesTo(['Mohamad'],'Closing · Closing tasks');
    await sendNamesTo(['Jeevan'],'Break · own');
    CLOCK='09:00'; const r1 = staffTimeline(shortStaffFor(T)).map(g=>`${g.status}: ${g.t}${g.where?' || WHERE: '+g.where:''}`);
    // phase 2: lent + clean + runner
    await sendNamesTo(['Mohamad'],'Lent · Warehouse'); await sendNamesTo(['Jeevan'],'Runner / Floater'); await sendNamesTo(['Sandeep'],'Clean-up · Variovac 1');
    CLOCK='10:00'; const r2 = staffTimeline(shortStaffFor(T)).slice(-1).map(g=>`${g.status}: ${g.t}${g.where?' || WHERE: '+g.where:''}`);
    return {r1, r2}; });
  console.log(JSON.stringify(R,null,1)); console.log(errs.join('|')||'no page errors'); await b.close(); })();

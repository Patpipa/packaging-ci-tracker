const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext()).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1500);
  const R = await page.evaluate(async()=>{ toast=()=>{}; window.confirm=()=>true; window.CLOCK='08:00'; nowHHMM=()=>CLOCK; askSideKind=async()=>'start'; askGarbageKind=async()=>'Burger Room'; Router.go('live'); await confirmTodaysCrew(false); const T=todayStr();
    const d0=ensureDayLog(T); d0.shift={}; await saveDayLogNow();
    const pick=(ctx,names)=>{ namePickHTML(ctx); names.forEach(n=>toggleName(ctx,pickLists[ctx].indexOf(n))); };
    startLiveRunSetup('Variovac 1'); pick('line',['Mandy','Harpreet']); await confirmStartRun();
    const crew=['Stanley','Winston','Sandeep','Mohamad','Jeevan'];
    const places=['Setup / Opening','Cleaning / Sanitation','Runner / Floater','Break · own','Lent · Trimmer helper','Lent · MAREL helper','Not here · Late','Not here · Went home','Closing · Closing tasks','Garbage run','Clean-up · Fajita','Other · Training new hire'];
    let t=8*60; const out=[];
    for(let k=0;k<places.length;k+=5){ CLOCK=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0'); for(let j=0;j<5;j++){ const pl=places[k+j]; if(!pl) continue; await sendNamesTo([crew[j]], pl); } t+=30; }
    CLOCK=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
    // read per-minute layouts directly at 3 sample minutes
    const x=shortStaffFor(T); const tl=staffTimeline(x);
    Router.go('crew'); crewSec='list'; render(); window.__b=(document.querySelector('#main .card')||{}).innerText; return [window.__b].concat(tl.map(g=>`${chFmtHM(g.a)}-${chFmtHM(g.b)} ${g.status}: ${g.t}${g.where?' || '+g.where:''}`)); });
  console.log(R.join('\n')); console.log(errs.join('|')||'no page errors'); await b.close(); })();

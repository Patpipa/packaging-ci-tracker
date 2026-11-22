const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:816,height:1000}})).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1500);
  const R = await page.evaluate(async()=>{ toast=()=>{}; window.confirm=()=>true; window.CLOCK='08:00'; nowHHMM=()=>CLOCK; askSideKind=async()=>'start'; Router.go('live'); await confirmTodaysCrew(false); const T=todayStr();
    const pick=(ctx,names)=>{ namePickHTML(ctx); names.forEach(n=>toggleName(ctx,pickLists[ctx].indexOf(n))); };
    if(!helperList().some(h=>h.n==='Krishan')) Store.settings={...Store.settings, helpers:[...helperList(),{n:'Krishan',dept:'Burger Room'}]};
    startLiveRunSetup('Variovac 1'); pick('line',['Mandy','Harpreet']); await confirmStartRun();
    startLiveRunSetup('Variovac 2'); pick('line',['Winston','Lead Hand']); await confirmStartRun();          // Lead Hand on the line 8-10
    openSidePrep('Fajita'); pick('prep',['Sandeep']); await confirmSidePrep();                                 // set-up 8:00-8:15
    CLOCK='08:15'; openSideSetup('Fajita'); await confirmSide();                                               // run 8:15-10:15
    openSideSetup('Slicer'); pick('side',['Stanley']); await confirmSide();                                    // slicer 8:15-9:15
    askGarbageKind=async()=>'Packaging'; await sendNamesTo(['Mohamad'],'Garbage run');                       // 8:15-8:45 packaging
    CLOCK='08:45'; askGarbageKind=async()=>'Trimming'; await sendNamesTo(['Mohamad'],'Garbage run');           // 8:45-9:05 trimming
    CLOCK='09:05'; await sendNamesTo(['Mohamad'],'Runner / Floater');
    CLOCK='09:00'; await helperJoin('Krishan'); await sendNamesTo(['Krishan'],'Variovac 1');
    CLOCK='09:15'; let s=openSideRuns(T).find(x=>x.machine==='Slicer'); openSideEnd(s.id); await finishSideJob(s.id); await sendNamesTo(['Stanley'],'Variovac 1');
    CLOCK='10:00'; await sendNamesTo(['Jeevan'],'Variovac 2'); await sendNamesTo(['Lead Hand'],'Runner / Floater');
    CLOCK='10:15'; let f=openSideRuns(T).find(x=>x.machine==='Fajita'); openSideEnd(f.id); await finishSideJob(f.id);
    openSidePrep('Fajita','Dismantle'); pick('prep',['Sandeep']); await confirmSidePrep(); CLOCK='10:45'; await prepDone('Fajita','Runner / Floater');  // clean 10:15-10:45
    CLOCK='11:00'; await helperBack('Krishan');
    CLOCK='12:00';
    const html=crewReportHTML(T,T,true); document.body.innerHTML='<div id="rep" style="width:816px;background:#fff">'+html+'</div>';
    const t=document.getElementById('rep').innerText;
    const cut=(a,b)=>{ const i=t.indexOf(a); return t.slice(i, t.indexOf(b,i)).replace(/\n+/g,' | ').replace(/\t/g,' '); };
    return {hasLabour: t.includes('LABOUR BREAKDOWN')||t.includes('Labour breakdown'), sections:(t.match(/\n\d · [^\n]+/g)||[]).map(x=>x.trim()), away:cut('4 · TIME AWAY','5 · '), lead:cut('5 · LEAD','6 · '), help:cut('6 · CROSS','7 · '), fajitaHead:(t.match(/FAJITA ·[^\n]*/)||[''])[0], slicerHead:(t.match(/SLICER ·[^\n]*/)||[''])[0]}; });
  console.log(JSON.stringify(R,null,1)); const el=await page.$('#rep'); await el.screenshot({path:require('path').join(require('os').tmpdir(),'c29.png')}); console.log(errs.join('|')||'no page errors'); await b.close(); })();

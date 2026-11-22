const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1500);
  const R = await page.evaluate(async()=>{ toast=()=>{}; window.confirm=()=>true; window.CLOCK='08:00'; nowHHMM=()=>CLOCK; Router.go('live'); await confirmTodaysCrew(false); const R={};
    const pick=(ctx,names)=>{ namePickHTML(ctx); names.forEach(n=>toggleName(ctx,pickLists[ctx].indexOf(n))); };
    startLiveRunSetup('Variovac 1'); pick('line',['Harpreet','Stanley']); await confirmStartRun();
    startLiveRunSetup('Variovac 2'); pick('line',['Mandy','Winston']); await confirmStartRun();
    CLOCK='10:00'; await startBreakAll(); CLOCK='10:01'; await toggleWorkThrough('Mandy');
    const st=()=>({v1:lineNowInfo('Variovac 1').label, v2:lineNowInfo('Variovac 2').label, v2names:lineNowInfo('Variovac 2').names.join(','), mandy:crewStatusOf('Mandy').t, winston:crewStatusOf('Winston').t, dash:crewNamesOn('Variovac 2').join(',')});
    R.during=st(); CLOCK='10:30'; await endBreakAll(); R.after=st();
    R.segs=Store.liveRuns['Variovac 2'].segments.map(s=>`${s.start}-${s.end||''}:${s.employees}:${(s.names||[]).join('/')}`).join(' | ');
    R.dts=Store.liveRuns['Variovac 2'].downtimeSegments.map(s=>`${s.start}-${s.end||''}:${s.status}`).join(' | ');
    CLOCK='11:00'; const pd=personDay(todayStr()); R.hours=pd.people.filter(p=>['Mandy','Winston'].includes(p.name)).map(p=>p.name+' '+JSON.stringify(p.segs.map(g=>g.w+'@'+g.a+'-'+g.b+(g.k?'/'+g.k:'')), JSON.stringify(p.cbk||''), JSON.stringify(p.wtl||''))).join(' ;; ');
    // toggle off case
    CLOCK='13:00'; await startBreakAll(); CLOCK='13:01'; await toggleWorkThrough('Mandy'); CLOCK='13:05'; await toggleWorkThrough('Mandy'); R.untoggle=st(); CLOCK='13:30'; await endBreakAll(); R.after2=st();
    R.segs2=Store.liveRuns['Variovac 2'].segments.slice(-3).map(s=>`${s.start}-${s.end||''}:${s.employees}`).join(' | ');
    return R; });
  console.log(JSON.stringify(R,null,1)); console.log(errs.join('|')||'no page errors'); await b.close(); })();

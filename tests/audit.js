const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1500);
  const R = await page.evaluate(async()=>{ const log=[]; toast=()=>{}; window.confirm=()=>true; window.CLOCK='08:00'; nowHHMM=()=>CLOCK; askSideKind=async()=>'start'; askGarbageKind=async()=>'Packaging';
    const errsIn=[]; const tabs=async(step)=>{ for(const v of ['dashboard','live','crew','history','reports']){ try{ Router.go(v); render(); }catch(e){ errsIn.push(step+' '+v+': '+e.message); } } Router.go('live'); };
    const pick=(ctx,names)=>{ namePickHTML(ctx); names.forEach(n=>{ const i=pickLists[ctx].indexOf(n); if(i<0) errsIn.push('pick missing '+n+' in '+ctx); toggleName(ctx,i); }); };
    const step=async(t,fn,label)=>{ CLOCK=t; try{ await fn(); }catch(e){ errsIn.push(label+': '+e.message); } try{ await syncSideBreaks(); }catch(e){ errsIn.push('sync '+label+': '+e.message); } await tabs(label); };
    Router.go('live'); await confirmTodaysCrew(false);
    await step('08:00', async()=>{ startLiveRunSetup('Variovac 1'); pick('line',['Mandy','Harpreet']); await confirmStartRun(); }, 'V1 start');
    await step('08:00', async()=>{ startLiveRunSetup('Variovac 2'); pick('line',['Stanley','Winston']); await confirmStartRun(); }, 'V2 start');
    await step('08:00', async()=>{ openSidePrep('Fajita'); pick('prep',['Sandeep']); await confirmSidePrep(); }, 'Fajita setup');
    await step('08:20', async()=>{ openSideSetup('Fajita'); await confirmSide(); }, 'Fajita start');
    await step('08:30', async()=>{ await sendNamesTo(['Mohamad'],'Runner / Floater'); await sendNamesTo(['Jeevan'],'Garbage run'); }, 'runner+garbage');
    await step('09:00', async()=>{ const f=openSideRuns(todayStr()).find(x=>x.machine==='Fajita'); openSidePause(f.id); sidePause.reason='Meat still frozen'; await confirmSidePause(); }, 'Fajita pause');
    await step('09:15', async()=>{ const f=openSideRuns(todayStr()).find(x=>x.machine==='Fajita'); await sideWaitEnd(f.id); }, 'Fajita resume');
    await step('09:30', async()=>{ const sc=SCALES[0]; tapScale(sc); scaleSetup.reason=SCALE_REASONS[0]; await confirmScaleDown(); tapScale(sc); await scaleRemove(); }, 'scale mistake');
    await step('10:00', async()=>{ await startBreakAll(); await toggleWorkThrough('Mandy'); }, 'break + WT');
    await step('10:30', async()=>{ await endBreakAll(); }, 'end break');
    await step('11:00', async()=>{ openAllLineSetup(); allLineSetup.reason='Town Hall Meeting'; await startAllLineStop(); }, 'planned');
    await step('11:20', async()=>{ await startBreakAll(); }, 'break in planned');
    await step('11:50', async()=>{ await endBreakAll(); }, 'end break2');
    await step('12:00', async()=>{ await resumePlannedAll(); }, 'resume planned');
    await step('13:00', async()=>{ startLiveRunSetup('Variovac 3'); pick('line',['Mohamad','Jeevan']); await confirmStartRun(); }, 'V3 start w/ busy');
    await step('14:00', async()=>{ const f=openSideRuns(todayStr()).find(x=>x.machine==='Fajita'); openSideEnd(f.id); await finishSideJob(f.id); }, 'Fajita finish');
    await step('14:05', async()=>{ openSidePrep('Fajita','Dismantle'); pick('prep',['Sandeep']); await confirmSidePrep(); }, 'dismantle');
    await step('14:40', async()=>{ await prepDone('Fajita','Closing · Closing tasks'); }, 'dismantle done');
    const stg=sideStage('Fajita').st;
    await step('15:00', async()=>{ await sendNamesTo(['Sandeep'],'Fajita'); }, 'move to closed Fajita');
    await step('16:30', async()=>{}, 'end');
    // invariants
    const T=todayStr(), pd=personDay(T), sum=[];
    pd.people.forEach(p=>{ const tot=p.segs.reduce((a,g)=>a+(g.b-g.a),0); const w=shiftWindow(T,p.name); sum.push(p.name+' '+tot+(w?'/'+(toMin(w.end||'16:30')-toMin(w.start||'08:00')):'')); });
    const names=['Mandy','Harpreet','Stanley','Winston','Sandeep','Mohamad','Jeevan'];
    const leak=[]; const chk=(lbl,html)=>{ const t=String(html||''); names.forEach(n=>{ if(t.includes(n)) leak.push(lbl+':'+n); }); };
    try{ chk('daily', sectionsText(dayLogSections(T))); }catch(e){ errsIn.push('daily '+e.message); }
    try{ chk('plh', renderPLHReportHTML(T,T)); }catch(e){ errsIn.push('plh '+e.message); }
    try{ chk('scale', scaleReportHTML(T,T)); }catch(e){ errsIn.push('scale '+e.message); }
    try{ chk('upstream', renderUpstreamReportHTML(T,T)); }catch(e){ errsIn.push('up '+e.message); }
    try{ crewReportHTML(T,T); }catch(e){ errsIn.push('crew rep '+e.message); }
    return {errsIn, stage:stg, sums:sum, leak, daily: sectionsText(dayLogSections(T)).slice(0,2500)}; });
  console.log(JSON.stringify(R,null,1)); console.log(errs.join('\n')||'no page errors'); await b.close(); })();

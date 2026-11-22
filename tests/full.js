const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1500);
  const R = await page.evaluate(async()=>{
    window.__t=[]; toast=m=>__t.push(CLOCK+' '+m); let ask=[]; window.confirm=m=>{ask.push(m.slice(0,90)); return true;}; window.CLOCK='08:00'; nowHHMM=()=>CLOCK; const at=t=>{CLOCK=t;};
    let kind='start'; askSideKind=async()=>kind;
    const R={c:{}}; const T=todayStr(); Router.go('live'); const c=(k,v)=>{R.c[k]=v;};
    const pick=(ctx,names)=>{ namePickHTML(ctx); names.forEach(n=>{ const i=pickLists[ctx].indexOf(n); if(i<0) throw new Error(ctx+' no '+n); toggleName(ctx,i); }); };
    const line=async(m,names)=>{ startLiveRunSetup(m); pick('line',names); await confirmStartRun(); };
    { const _d=ensureDayLog(todayStr()); _d.crewDay=_d.crewDay||{}; _d.crewDay.Krishan={st:'here',start:'08:00',end:'',helper:true,dept:'Burger Room'}; } /*KRISHAN_HELPER*/ await confirmTodaysCrew(false);
    await line('Variovac 1',['Harpreet','Stanley','Mandy']); await line('Variovac 2',['Winston','Sandeep']); await line('Variovac 3',['Krishan','Mohamad']); await line('Manual Pack',['Jeevan']);
    // 08:30 V3 trimmer schedule change
    at('08:30'); openDowntimeSetup('Variovac 3'); Object.assign(liveDowntimeSetup,{status:'WAITING',waitCategory:'Upstream / Product',waitReason:'TRIMMERS - Schedule Change: Trimming Moved to After Lunch / Afternoon'}); await confirmDowntime();
    at('08:39'); c('remind0839', !!stuckCrewState('Variovac 3', Store.liveRuns['Variovac 3'])); at('08:40'); c('remind0840', !!stuckCrewState('Variovac 3', Store.liveRuns['Variovac 3']));
    __t.length=0; stuckNudge(); at('08:44'); stuckNudge(); at('08:45'); stuckNudge(); c('nudges', __t.filter(x=>x.includes('crew still')).length);
    // 08:50 V3 crew help V1
    at('08:50'); openMoveCrew('Variovac 3'); toggleMoveSel(0); toggleMoveSel(1); moveCrew.dest='Variovac 1'; await doMoveCrew();
    c('v3after', liveNames(Store.liveRuns['Variovac 3'])); c('v1after', liveNames(Store.liveRuns['Variovac 1'])); c('remindGone', !stuckCrewState('Variovac 3', Store.liveRuns['Variovac 3']));
    // 09:00 Fajita set-up by Winston (from V2) via move "What for?" = setup
    at('09:00'); kind='setup'; openMoveCrew('Variovac 2'); toggleMoveSel(0); moveCrew.dest='Fajita'; await doMoveCrew(); c('winston0900', whereOf('Winston')); c('v2_0900', liveNames(Store.liveRuns['Variovac 2']));
    // Jeevan alone on Manual → Cutlet: stop offer
    ask=[]; openSideSetup('Cutlet'); pick('side',['Jeevan']); await confirmSide(); c('askJeevan', ask[0]); const M=Store.liveRuns['Manual Pack']; c('manual', M.status+' / '+M.downtimeSegments.slice(-1)[0].reason+' / crew '+liveNames(M).length);
    at('09:15'); openSideSetup('Fajita'); c('fajPrefill', sideSetup.names.slice()); await confirmSide();
    at('10:00'); await startBreakAll(); await new Promise(r=>setTimeout(r,200)); c('fajOnBreak', !openSideRuns(T).some(x=>x.machine==='Fajita')); at('10:30'); await endBreakAll(); render(); await new Promise(r=>setTimeout(r,200)); c('fajBack', openSideRuns(T).some(x=>x.machine==='Fajita'));
    at('11:00'); { const f=openSideRuns(T).find(x=>x.machine==='Fajita'); openSideEnd(f.id); await finishSideJob(f.id); liveAfterFinish=null; }
    { const f=openSideRuns(T).find(x=>x.machine==='Cutlet'); openSideEnd(f.id); await finishSideJob(f.id); liveAfterFinish=null; }
    placeSetup={name:'Winston',w:'__none',at:'11:00'}; await savePlace();
    at('12:00'); await resumeRun('Variovac 3'); c('bringBack', liveBringBack && liveBringBack.names); await doBringBack(); c('v3back', liveNames(Store.liveRuns['Variovac 3'])); c('v1back', liveNames(Store.liveRuns['Variovac 1']));
    at('13:00'); kind='start'; openSideSetup('Fajita'); pick('side',['Winston']); await confirmSide(); at('14:00'); { const f=openSideRuns(T).find(x=>x.machine==='Fajita'); openSideEnd(f.id); await finishSideJob(f.id); liveAfterFinish=null; }
    c('fajJobs', Store.records.filter(r=>r.side && r.machine==='Fajita').length);
    at('14:30'); openFinishSetup('Variovac 2'); render(); liveFinishSetup.linkSide = sideJobsAwaitingOutput().filter(r=>r.machine==='Fajita').map(r=>r.id); liveFinishSetup.quantity='100'; liveFinishSetup.weight='2000'; await confirmFinishProduct(); liveAfterFinish=null;
    const fr=Store.records.find(r=>r.side && r.machine==='Fajita'); c('faj', {ran:fr.durationMin, q:fr.plh.quantity, w:fr.plh.weightLbs, from:fr.plh.outputFrom, plhInNotes:/PLH/.test(fr.notes)});
    const v2=Store.records.filter(r=>r.machine==='Variovac 2' && r.status==='RUNNING' && r.plh && r.plh.grossPLH!=null); c('v2plh', v2.map(r=>`${r.startTime}-${r.endTime} lbs ${r.plh.weightLbs} gross ${(r.plh.grossLaborHours*60).toFixed(0)}m net ${(r.plh.netLaborHours*60).toFixed(0)}m PLH ${r.plh.grossPLH.toFixed(1)}/${r.plh.netPLH.toFixed(1)}`));
    // 15:00 Fajita dismantle/clean Winston, +Add Sandeep 15:10, done → closing tasks 15:30
    at('15:00'); openSidePrep('Fajita','Dismantle'); pick('prep',['Winston']); await confirmSidePrep(); at('15:10'); openSidePrep('Fajita','Dismantle',true); pick('prep',['Sandeep']); await confirmSidePrep();
    c('dis', peopleAtPlace('Dismantle · Fajita')); at('15:30'); await prepDone('Fajita','Closing · Closing tasks'); c('closing', whereOf('Winston')+' / '+whereOf('Sandeep'));
    at('16:30'); for(const m of ['Variovac 1','Variovac 3','Manual Pack']){ openFinishSetup(m); await confirmFinishProduct(); liveAfterFinish=null; }
    at('16:45'); openGoHome(); await confirmGoHome(); at('16:50');
    const pd=personDay(T); R.people=pd.people.map(p=>`${p.name}: ${m2t(p.a)}-${m2t(p.b)} total ${p.total} segsum ${p.segs.reduce((t,s)=>t+s.b-s.a,0)} ${p.total===p.segs.reduce((t,s)=>t+s.b-s.a,0)?'OK':'MISMATCH'} | `+p.segs.map(s=>`${m2t(s.a)}-${m2t(s.b)} ${s.k}`).join(', '));
    R.run = Store.records.filter(r=>r.date===T && r.status==='RUNNING' && !r.side).map(r=>`${r.machine} ${r.startTime}-${r.endTime} gross ${r.plh?(r.plh.grossLaborHours*60).toFixed(0):'-'} net ${r.plh?(r.plh.netLaborHours*60).toFixed(0):'-'}`);
    R.down = Store.records.filter(r=>r.date===T && !r.side && r.status!=='RUNNING').map(r=>`${r.machine} ${r.status} ${r.startTime}-${r.endTime} ${r.reason}`);
    c('dept', upstreamDeptFor('TRIMMERS - Schedule Change: Trimming Moved to After Lunch / Afternoon'));
    const up=computeUpstreamImpact(T,T); R.upstream=up.list.map(g=>`${g.name} ${g.totalMin}`);
    R.daily = sectionsText(dayLogSections(T)).split('\n').filter(l=>/Fajita|Cutlet|Slicer|crew|Packaging/i.test(l)).slice(0,12);
    Router.go('history'); render(); R.hist=[...document.querySelectorAll('.hist-item')].map(e=>e.innerText.replace(/\n+/g,' | ').slice(0,120)).filter(x=>/Fajita|Cutlet/.test(x));
    plhKind='side'; plhLogRange={preset:'today',...plhPresetRange('today')}; Router.go('plhLog'); render(); const sv=document.body.innerText; c('sideViewPLHnums', /\d+(\.\d)? PLH/.test(sv));
    plhKind='lines'; render();
    const scr={}; for(const v of ['dashboard','live','crew','history','reports','weekly','settings','crewHours','upstreamImpact','plhLog','scales']){ try{ Router.go(v); render(); scr[v]='ok'; }catch(e){ scr[v]='ERR '+e.message; } } R.screens=scr;
    const el=document.createElement('div'); el.innerHTML=crewReportHTML(T,T); R.crewRep = el.innerText.split('\n').filter(l=>/Winston|Jeevan|Krishan/.test(l)).slice(0,6);
    return R; });
  fs.writeFileSync(__dirname+'/full.json', JSON.stringify(R,null,1)); console.log(errs.join('\n')||'no page errors'); await b.close(); })();

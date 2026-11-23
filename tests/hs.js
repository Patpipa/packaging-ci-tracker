const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[];
  page.on('pageerror', e=>errs.push('PAGEERR '+e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1500);
  const R = await page.evaluate(async()=>{
    window.__t=[]; toast=m=>__t.push(CLOCK+' '+m); window.confirm=()=>true; window.CLOCK='06:55'; nowHHMM=()=>CLOCK; const at=t=>{CLOCK=t;};
    const R={step:{}}; const T=todayStr(); Router.go('live'); askGarbageKind=async()=>'Packaging'; const chk=(k,v)=>{R.step[k]=v;};
    const pick=(ctx,names)=>{ namePickHTML(ctx); names.forEach(n=>toggleName(ctx, pickLists[ctx].indexOf(n))); };
    // 06:55 today's crew
    await setCrewDay('Mohamad',{st:'sick'}); await setCrewDay('Jeevan',{st:'lent',dept:'Warehouse'}); await setCrewDay('Harpreet',{end:'12:30'});
    { const _d=ensureDayLog(todayStr()); _d.crewDay=_d.crewDay||{}; _d.crewDay.Krishan={st:'here',start:'08:00',end:'',helper:true,dept:'Burger Room'}; } /*KRISHAN_HELPER*/ await confirmTodaysCrew(false); chk('mandyStart', crewRowOf(T,'Mandy').start); chk('crewTotal', crewTotalFor(T));
    // 07:00 V3 morning set-up (standalone stop with names)
    at('07:00'); openDowntimeSetup('Variovac 3'); chk('dtCrewEdit', liveDowntimeSetup.crewEdit); liveDowntimeSetup.status='CHANGEOVER'; liveDowntimeSetup.changeReason='Machine Setup'; pick('dt',['Mandy']); await confirmDowntime();
    chk('mandyWhere0700', whereOf('Mandy'));
    at('07:20'); startLiveRunSetup('Variovac 3'); chk('v3prefill', liveSetup.names.slice()); pick('line',['Krishan']); await confirmStartRun(); chk('v3names', liveNames(Store.liveRuns['Variovac 3']));
    // 08:00 stretching for everyone
    at('08:00'); openAllLineSetup(); chk('stretchPeople', allLineSetup.people.slice()); allLineSetup.machines=['Variovac 3']; await startAllLineStop();
    chk('harpWhere0800', whereOf('Harpreet')); at('08:15'); await resumeAllLineStop(openAllLineStops()[0].id); chk('harpWhere0815', whereOf('Harpreet'));
    at('08:16'); startLiveRunSetup('Variovac 1'); pick('line',['Harpreet','Stanley']); await confirmStartRun();
    startLiveRunSetup('Variovac 2'); pick('line',['Winston','Sandeep']); await confirmStartRun();
    // 09:00 V2 required cleaning, same crew
    at('09:00'); openDowntimeSetup('Variovac 2'); liveDowntimeSetup.status='WAITING'; liveDowntimeSetup.waitCategory='Cleaning / Sanitation'; liveDowntimeSetup.waitReason='Required Cleaning'; await confirmDowntime();
    chk('v2namesClean', liveNames(Store.liveRuns['Variovac 2']));
    // 09:20 move Sandeep to Other
    at('09:20'); openMoveCrew('Variovac 2'); toggleMoveSel(1); moveCrew.dest='__other'; moveCrew.otherText='Restocking boxes'; await doMoveCrew(); chk('sandeep0920', whereOf('Sandeep')); chk('recentOther', recentOther());
    // 09:30 Fajita set-up by Sandeep (trainee Jeevan? he's lent) 
    at('09:30'); openSidePrep('Fajita'); pick('prep',['Sandeep']); await confirmSidePrep(); chk('sandeep0930', whereOf('Sandeep'));
    at('09:45'); openSideSetup('Fajita'); chk('fajPrefill', sideSetup.names.slice()); await confirmSide();
    at('10:00'); await startBreakAll(); at('10:30'); await endBreakAll();
    at('10:40'); await resumeRun('Variovac 2'); liveBringBack=null;
    at('11:00'); const fj = openSideRuns(T).find(x=>x.machine==='Fajita'); chk('fajOpen', !!fj); if(fj){ openSidePause(fj.id); sidePause.reason='Waiting for strogi meat'; await confirmSidePause(); }
    at('11:20'); { const f2=openSideRuns(T).find(x=>x.machine==='Fajita'); await sideWaitEnd(f2.id); }
    at('11:50'); { const f3=openSideRuns(T).find(x=>x.machine==='Fajita'); openSideEnd(f3.id); await finishSideJob(f3.id); }
    chk('afterSide', liveAfterFinish && {...liveAfterFinish}); await afterFinishGo('Clean-up · Fajita'); chk('sandeep1150', whereOf('Sandeep'));
    at('12:10'); openMoveCrew('Variovac 1'); /* not used */ moveCrew=null; placeSetup={name:'Sandeep',w:'__none',at:'12:10'}; await savePlace(); liveStaffSetup={machine:'Variovac 2', names:['Winston','Sandeep'], employees:2}; await confirmStaffChange();
    // 12:31 Harpreet half day
    at('12:31'); await applyCrewEnds(); chk('harp1231', whereOf('Harpreet')); chk('v1names1231', liveNames(Store.liveRuns['Variovac 1']));
    // Lead hand helps V1, then Off line
    at('13:40'); liveStaffSetup={machine:'Variovac 1', names:['Stanley','Lead Hand'], employees:2}; await confirmStaffChange(); chk('leadOn', openOffline(T).map(o=>o.role));
    at('14:00'); await stopOffline(openOffline(T).find(o=>o.role==='Lead Hand').id); chk('v1after', liveNames(Store.liveRuns['Variovac 1']));
    // 16:00 finish V2 linking Fajita output
    at('16:00'); openFinishSetup('Variovac 2'); render(); const lk = finishLinkHTML(); chk('linkShown', lk.includes('Fajita')); liveFinishSetup.linkSide = sideJobsAwaitingOutput().map(r=>r.id); liveFinishSetup.quantity='85'; liveFinishSetup.weight='1240'; await confirmFinishProduct();
    const fr = Store.records.find(r=>r.side && r.machine==='Fajita'); chk('fajOutput', fr && {q:fr.plh.quantity, w:fr.plh.weightLbs, from:fr.plh.outputFrom, dts: fr.plh.downtimeSegments.map(d=>d.reason)});
    await afterFinishGo('Clean-up · Variovac 2');
    at('16:30'); openFinishSetup('Variovac 1'); await confirmFinishProduct(); await afterFinishGo('Garbage run');
    at('17:00'); openFinishSetup('Variovac 3'); await confirmFinishProduct(); liveAfterFinish.mode='other'; liveAfterFinish.otherText='Rebox'; liveAfterFinish.dest='__other'; await afterFinishSend();
    at('17:30'); openGoHome(); await confirmGoHome(); at('17:35');
    Router.go('history'); render(); const fr2=Store.records.find(r=>r.side); if(fr2){ expandedTimelineIds.add(fr2.id); render(); }
    R.hist=[...document.querySelectorAll('.hist-item')].map(e=>e.innerText.replace(/\n+/g,' | ')); R.sideLog=JSON.stringify(dayLogFor(T).side);
    R.sideRecs=Store.records.filter(r=>r.side).length; histFilters.machine='Fajita'; render(); R.faj=[...document.querySelectorAll('.hist-item')].map(e=>e.innerText.replace(/\n+/g,' | ')); histFilters.machine=''; histFilters.status='WAITING'; render(); R.wait=[...document.querySelectorAll('.hist-item')].map(e=>e.innerText.replace(/\n+/g,' | ').slice(0,90)); histFilters.status=''; R.opts=[...document.querySelectorAll('.filterbar select')][1].innerText.replace(/\n/g,','); return R; });
  fs.writeFileSync(require('path').join(require('os').tmpdir(),'hs.json'), JSON.stringify(R,null,1)); console.log(errs.join('\n')||'no page errors'); await b.close(); })();

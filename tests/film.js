const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:430,height:900}})).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200); await page.addScriptTag({content: fs.readFileSync(require('path').join(__dirname,'prelude.js'),'utf8')});
  const R = await page.evaluate(async()=>{ const H = await window.__P(); const T=H.T; const out={};
    const film=async(m,f)=>{ openDowntimeSetup(m); liveDowntimeSetup.status='CHANGEOVER'; liveDowntimeSetup.changeReason='Film Change'; render(); out.tiles = out.tiles || [...document.querySelectorAll('button')].filter(x=>/film$/i.test(x.innerText.trim())||/both films/i.test(x.innerText)).length; out.readyNoFilm = dtReady(liveDowntimeSetup); liveDowntimeSetup.film=f; await confirmDowntime(); await H.sync(); };
    await H.start('Variovac 1',['Mandy','Harpreet']); await H.start('Variovac 3',['Sandeep','Jeevan']);
    H.at('09:00'); await film('Variovac 1','Forming'); H.at('09:10'); await H.resume('Variovac 1');
    H.at('10:00'); await film('Variovac 3','Non-forming'); H.at('10:05'); await H.resume('Variovac 3');
    H.at('11:00'); await film('Variovac 1','Both'); H.at('11:20'); await H.resume('Variovac 1');
    H.at('12:00'); await H.fin('Variovac 1',1000,1); await H.fin('Variovac 3',1000,1);
    // History manual entry with film
    draft=freshDraft(); draft.date=T; draft.machine='Variovac 2'; draft.status='CHANGEOVER'; draft.changeReason='Film Change'; draft.film='Non-forming'; draft.startTime='13:00'; draft.endTime='13:10'; Router.go('new'); render(); const a=document.getElementById('startTimeInput'), b=document.getElementById('endTimeInput'); if(a) a.value='13:00'; if(b) b.value='13:10'; await saveRecord();
    // legacy record, no film
    Store.records.push({id:'old1', date:T, machine:'Variovac 2', status:'CHANGEOVER', reason:'Film Change', startTime:'14:00', endTime:'14:15', durationMin:15});
    const fu=filmUsage(T,T); out.M=fu.M; out.T=fu.T;
    out.daily=(sectionsText(dayLogSections(T)).match(/FILM CHANGES[\s\S]*?(?=\n[A-Z ]{5,}\n|$)/)||[''])[0];
    weeklyRange={start:T,end:T}; out.weekly=(weeklySummaryText().match(/FILM USAGE[\s\S]*?Total[^\n]*/)||[''])[0];
    Router.go('history'); render(); out.hist=(document.body.innerText.match(/Film Change[^\n]*film/gi)||[]).slice(0,3);
    // edit keeps film
    const rec=Store.records.find(r=>r.machine==='Variovac 1'&&r.film==='Both'); editRecord(rec.id); out.editFilm=draft.film; draft.film='Forming'; await saveRecord(); out.afterEdit=Store.records.find(r=>r.id===rec.id).film;
    return out; });
  console.log(JSON.stringify(R,null,1)); console.log(errs.join('|')||'no page errors'); await b.close(); })();

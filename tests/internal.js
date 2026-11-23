const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:430,height:900}, deviceScaleFactor:2})).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200); await page.addScriptTag({content: fs.readFileSync(require('path').join(__dirname,'prelude.js'),'utf8')});
  const R = await page.evaluate(async()=>{ const H = await window.__P(); const T=H.T, Y=shiftDate(T,-1), P=shiftDate(T,-2); const out={}; const txt=h=>{ const d=document.createElement('div'); d.innerHTML=h; document.body.appendChild(d); const t=d.innerText; d.remove(); return t; };
    const co=async(m,reason,f)=>{ openDowntimeSetup(m); liveDowntimeSetup.status='CHANGEOVER'; liveDowntimeSetup.changeReason=reason; if(f) liveDowntimeSetup.film=f; await confirmDowntime(); await H.sync(); };
    const wt=async(m,cat,reason,note)=>{ openDowntimeSetup(m); liveDowntimeSetup.status='WAITING'; liveDowntimeSetup.waitCategory=cat; liveDowntimeSetup.waitReason=reason; liveDowntimeSetup.notes=note||''; await confirmDowntime(); await H.sync(); };
    const real=todayStr;
    // two days before: one film change of 20m on V1 (previous period for Today-vs-Yesterday is Yesterday; for 2-day range it is P and the day before)
    todayStr=()=>Y; await confirmTodaysCrew(false);
    H.at('08:00'); await H.start('Variovac 1',['Mandy','Harpreet']); H.at('09:00'); await co('Variovac 1','Film Change','Forming'); H.at('09:20'); await H.resume('Variovac 1'); H.at('12:00'); await H.fin('Variovac 1',1000,1);
    todayStr=real; await confirmTodaysCrew(false);
    H.at('08:00'); await H.start('Variovac 1',['Mandy','Harpreet']); await H.start('Variovac 2',['Stanley','Winston']);
    H.at('09:00'); await wt('Variovac 1','Machine / Equipment',reasonsForMachine('Machine / Equipment','Variovac 1')[0],'sealer jam'); H.at('09:30'); await H.resume('Variovac 1');   // 30m internal
    H.at('10:00'); await co('Variovac 1','Film Change','Both'); H.at('10:10'); await H.resume('Variovac 1');  // 10m film
    H.at('10:00'); await wt('Variovac 2','Upstream / Product',reasonsForMachine('Upstream / Product','Variovac 2')[0]); H.at('10:45'); await H.resume('Variovac 2'); // 45m upstream
    H.at('11:00'); await wt('Variovac 2','Machine / Equipment',reasonsForMachine('Machine / Equipment','Variovac 2')[0]); H.at('11:15'); await H.resume('Variovac 2'); // 15m internal
    H.at('12:00'); await H.fin('Variovac 1',1000,1); await H.fin('Variovac 2',1000,1);
    const x=computeInternalDelay(T,T); out.today={intWait:x.intWait, co:x.co, up:x.up, total:x.total, all:x.allStops, mach:x.mach, coTypes:x.coTypes, areas:x.areas};
    const y=computeInternalDelay(Y,Y); out.yday={total:y.total,co:y.co};
    out.weeklyInternal = (()=>{ weeklyRange={start:T,end:T}; const m=weeklySummaryText().match(/Internal[^\n]*/gi); return m; })();
    Router.go('reports'); render(); out.btn=[...document.querySelectorAll('button')].some(x=>/internal delay report/i.test(x.innerText));
    out.text=txt(internalReportHTML(T,T,true)); out.range=txt(internalReportHTML(Y,T,true));
    out.names = ['Mandy','Harpreet','Stanley','Winston'].filter(n=>out.text.includes(n)||out.range.includes(n));
    setInternalPreset('lmonth'); setInternalPreset('month'); setInternalPreset('30'); setInternalPreset('yday'); setInternalPreset('today');
    Router.go('internalDelay'); render(); out.view=/Internal Delay Report/.test(document.body.innerText); window.scrollTo(0,0); return out; });
  const t=R.today, ok = t.intWait===45 && t.co===10 && t.up===45 && t.total===55 && t.all===100 && R.yday.total===20 && R.btn && R.view && !R.names.length && /down 20m|up 35m/.test(R.text);
  console.log(JSON.stringify({today:R.today, yday:R.yday, weekly:R.weeklyInternal, btn:R.btn, view:R.view, names:R.names})); console.log(R.text); console.log('---- RANGE ----'); console.log(R.range);
  await page.screenshot({path:require('path').join(require('os').tmpdir(),'internal-sample.png'), fullPage:true});
  console.log(errs.join('|')||'no page errors'); console.log(ok&&!errs.length?'PASS':'FAIL'); await b.close(); })();

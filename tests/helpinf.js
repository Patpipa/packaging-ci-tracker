const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext()).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200); await page.addScriptTag({content: fs.readFileSync(require('path').join(__dirname,'prelude.js'),'utf8')});
  const R = await page.evaluate(async()=>{ const H = await window.__P(); const T=H.T; const txt=h=>{ const d=document.createElement('div'); d.innerHTML=h; document.body.appendChild(d); const t=d.innerText; d.remove(); return t; };
    Store.settings={...Store.settings, helpers:[...helperList(), {n:'Ailen', dept:'Dicer / Grinding'}, {n:'Jeff', dept:'Marel'}]};
    await H.start('Variovac 3',['Sandeep','Stanley']); H.at('10:00'); await sendNamesTo(['Ailen','Jeff'],'Variovac 3'); await H.sync();
    H.at('16:30'); await H.fin('Variovac 3',3000,1); await H.sync();
    // exact times as in Walter's day: Jeff off at 10:45, Ailen off at 12:08 (taken off the line, not sent back)
    const W=dayLogFor(T).where; W.Jeff=[{at:'10:00',w:'Variovac 3'},{at:'10:45',w:''}]; W.Ailen=[{at:'10:00',w:'Variovac 3'},{at:'12:08',w:''}]; dayLogFor(T).crewDay.Jeff.start='10:00'; dayLogFor(T).crewDay.Ailen.start='10:00';
    const grab=()=>{ const daily=sectionsText(dayLogSections(T)); const c=txt(crewReportHTML(T,T,true)); const i=c.toUpperCase().indexOf('5 · CROSS-DEPT HELP'); const P=personDay(T).people;
      return {dailyCrew:(daily.match(/Packaging crew: [^\n]*/)||[''])[0], dailyHelp:(daily.match(/Cross-dept help:[^\n]*/)||[''])[0], crossSection:c.slice(i,i+260).replace(/\n/g,' | '),
        ailen:(P.find(p=>p.name==='Ailen')||{}), jeff:(P.find(p=>p.name==='Jeff')||{})}; };
    const a = grab(); const rec = JSON.stringify(dayLogFor(T).crewDay.Ailen||null);
    delete dayLogFor(T).crewDay.Ailen; delete dayLogFor(T).crewDay.Jeff; // old data: no helper record saved
    const b2 = grab();
    const f=x=>({nhA:(x.ailen.grp||{})['Not here']||0, a:x.ailen.a/60, b:x.ailen.b/60, tot:x.ailen.total, notHere:(x.ailen.grp||{})['Not here']||0, jA:x.jeff.a/60, jB:x.jeff.b/60, jTot:x.jeff.total});
    return {autoRecord: rec, crossOld:b2.crossSection, now:{dailyCrew:a.dailyCrew, dailyHelp:a.dailyHelp, cross:a.crossSection, ...f(a)}, oldData:{dailyHelp:b2.dailyHelp, cross:b2.crossSection, ...f(b2)}}; });
  console.log(JSON.stringify(R,null,1)); console.log(errs.join('|')||'no page errors'); await b.close(); })();

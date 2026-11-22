const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext()).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200); await page.addScriptTag({content: fs.readFileSync(require('path').join(__dirname,'prelude.js'),'utf8')});
  const R = await page.evaluate(async()=>{ const H = await window.__P(); const T=H.T; const hrs=()=>personDay(T).people.filter(p=>['Mandy','Stanley'].includes(p.name)).map(p=>`${p.name} total ${p.total} OT ${p.ot}`).join(' | ');
    await H.start('Variovac 1',['Mandy','Stanley']); H.at('16:30'); await H.fin('Variovac 1',2000,1); H.at('16:35'); await confirmEndShift(); await H.sync();
    const before=hrs(); H.at('22:00'); await H.start('Variovac 2',['Mandy','Stanley']); H.at('22:05');
    delete Store.liveRuns['Variovac 2']; await Store.saveLiveRuns(); await H.sync(); // OLD cancel: run gone, crew moves stay
    const stuck=hrs();
    Router.go('crew'); crewSec='history'; render(); const links=[...document.querySelectorAll('.cb-link')].filter(x=>/remove/i.test(x.innerText)); const n=links.length;
    for(const who of ['Mandy','Stanley']){ const lg=dayLogFor(T).where[who]; const i=lg.findIndex(e=>e.w==='Variovac 2'); await removeCrewMove(who, i); }
    await H.sync(); return {before, stuck, after: hrs(), removeLinks:n, err:''}; });
  console.log(JSON.stringify(R,null,1)); console.log(errs.join('|')||'no page errors'); await b.close(); })();

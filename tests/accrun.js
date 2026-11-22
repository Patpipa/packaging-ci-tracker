const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const out={};
  for(const mode of ['cancel','history']){ const page = await (await b.newContext()).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200); await page.addScriptTag({content: fs.readFileSync(require('path').join(__dirname,'prelude.js'),'utf8')});
  out[mode] = await page.evaluate(async(mode)=>{ const H = await window.__P(); const T=H.T; const hrs=()=>personDay(T).people.filter(p=>['Mandy','Stanley'].includes(p.name)).map(p=>`${p.name} ${p.b/60}h end · total ${p.total} · OT ${p.ot}`).join(' | ');
    await H.start('Variovac 1',['Mandy','Stanley']); H.at('16:30'); await H.fin('Variovac 1',2000,1); H.at('16:35'); await confirmEndShift(); await H.sync(); H.at('21:00'); await H.sync();
    const before = hrs(); const recBefore = Store.records.length;
    H.at('22:00'); await H.start('Variovac 2',['Mandy','Stanley']); H.at('22:05'); await H.sync(); const during = hrs();
    if(mode==='cancel'){ await cancelLiveRun('Variovac 2'); } else { await H.fin('Variovac 2','',''); const r=Store.records.find(x=>x.machine==='Variovac 2'&&x.status==='RUNNING'); await deleteRecord(r.id); }
    H.at('22:10'); await H.sync(); render(); await H.sync();
    return {before, during, after: hrs(), recordsBack: Store.records.length===recBefore, v2left: Store.records.filter(x=>x.machine==='Variovac 2').length, check: reportCheck(T).level}; }, mode);
  await page.context().close(); }
  console.log(JSON.stringify(out,null,1)); await b.close(); })();

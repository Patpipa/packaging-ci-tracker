const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:430,height:900}})).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200);
  await page.addScriptTag({content: fs.readFileSync(require('path').join(__dirname,'prelude.js'),'utf8')});
  const R = await page.evaluate(async()=>{ const H = await window.__P(); const T=H.T; const out={};
    // a full normal day: everyone placed, finished, End Shift
    await H.start('Variovac 1',['Mandy','Harpreet']); await H.start('Variovac 2',['Stanley','Winston']); await H.start('Variovac 3',['Sandeep','Jeevan']); await sendNamesTo(['Mohamad'],'Runner / Floater'); await H.sync();
    H.at('16:30'); await H.fin('Variovac 1',3000,1); await H.fin('Variovac 2',3000,1); await H.fin('Variovac 3',3000,1); await confirmEndShift(); await H.sync();
    let c = reportCheck(T); out.normal = {level:c.level, notOk: c.items.filter(i=>i.lvl!=='ok').map(i=>i.lvl+': '+i.name+' '+i.a), n:c.items.length};
    // plant a duplicate run → must be RED
    const r0 = Store.records.find(r=>r.machine==='Variovac 1' && r.status==='RUNNING'); Store.records.push({...r0, id:'dup1'}); c = reportCheck(T); out.dup = {level:c.level, red:c.items.filter(i=>i.lvl==='red').map(i=>i.name)};
    Store.records = Store.records.filter(r=>r.id!=='dup1');
    // missing weight → YELLOW
    const r1 = Store.records.find(r=>r.machine==='Variovac 2' && r.status==='RUNNING'); const keep = r1.plh; r1.plh = {...keep, weightLbs:0, grossPLH:null, netPLH:null}; c = reportCheck(T); out.missing = {level:c.level}; r1.plh = keep;
    Router.go('reportView', T); render(); out.card = (document.getElementById('reportCheck')||{}).innerText||'NO CARD';
    out.pdfHasCheck = /Report check/.test(crewReportHTML(T,T,true)) || /Report check/.test(staffingReportHTML(T,T,true)) || /Report check/.test(sectionsText(dayLogSections(T)));
    return out; });
  console.log(JSON.stringify(R,null,1)); console.log(errs.join('|')||'no page errors'); await b.close(); })();

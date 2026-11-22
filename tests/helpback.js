const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:430,height:900}})).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200); await page.addScriptTag({content: fs.readFileSync(require('path').join(__dirname,'prelude.js'),'utf8')});
  const R = await page.evaluate(async()=>{ const H = await window.__P(); const T=H.T; const out={};
    Store.settings={...Store.settings, helpers:[...helperList(), {n:'Ailen', dept:'Dicer / Grinding'}]};
    H.at('09:00'); await helperJoin('Ailen'); openSideSetup('Slicer'); H.pick('side',['Ailen','Sandeep']); await confirmSide(); await H.sync();
    H.at('11:00'); Router.go('crew'); crewSec='list'; render(); const strip=[...document.querySelectorAll('.card')].find(c=>/Cross-dept help with us/.test(c.innerText)); out.strip = strip ? strip.innerText.replace(/\n/g,' | ') : 'NO STRIP';
    const msgs=[]; toast=m=>msgs.push(m); const btn = strip && [...strip.querySelectorAll('button')].find(x=>/back to dicer/i.test(x.innerText)); if(btn) btn.click(); await new Promise(r=>setTimeout(r,400)); await H.sync(); out.msgs=msgs; out.placeSetup=JSON.stringify(placeSetup);
    const hd = helperDay(T,'Ailen'); const sl = openSideRuns(T).find(x=>x.machine==='Slicer'); out.backAt = hd && hd.backAt; out.slicerNames = sl ? sl.names : 'closed'; out.where = whereOf('Ailen');
    render(); out.stripAfter = !![...document.querySelectorAll('.card')].find(c=>/Cross-dept help with us/.test(c.innerText));
    const p = personDay(T).people.find(x=>x.name==='Ailen'); out.hours = p ? `${p.a/60}-${p.b/60} total ${p.total}` : 'none';
    // name sheet for a second helper
    Store.settings={...Store.settings, helpers:[...helperList(), {n:'Lin', dept:'Burger Room'}]}; H.at('12:00'); await helperJoin('Lin'); await sendNamesTo(['Lin'],'Runner / Floater'); await H.sync();
    crewSheet={n:'Lin'}; render(); const sb=[...document.querySelectorAll('button')].find(x=>/back to burger room/i.test(x.innerText)); out.sheetBtn = !!sb; out.sheetHome = [...document.querySelectorAll('button')].some(x=>/going home now/i.test(x.innerText));
    if(sb) sb.click(); await new Promise(r=>setTimeout(r,400)); await H.sync(); out.linBack = (helperDay(T,'Lin')||{}).backAt;
    crewSheet={n:'Mandy'}; render(); out.mandyHome = [...document.querySelectorAll('button')].some(x=>/going home now/i.test(x.innerText)); crewSheet=null;
    return out; });
  console.log(JSON.stringify(R,null,1)); console.log(errs.join('|')||'no page errors'); await b.close(); })();

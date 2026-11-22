// node replay.js index.html data.json [date]
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const [,, app, file, date] = process.argv; const data = JSON.parse(fs.readFileSync(file,'utf8'));
  const b = await chromium.launch(); const page = await (await b.newContext()).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+app); await page.waitForTimeout(1500);
  await page.addScriptTag({content: fs.readFileSync(require('path').join(__dirname,'checks.js'),'utf8')});
  const R = await page.evaluate(async({data, date})=>{ toast=()=>{};
    Store.records = data.records||[]; Store.dailyReports = data.dailyReports||[]; Store.dayLog = data.dayLog||{}; Store.liveRuns = data.liveRuns||{}; Store.settings = data.settings||{}; Store.productLibrary = data.productLibrary||[];
    const ex = data.exportedAt ? new Date(data.exportedAt) : new Date(); const hm = ex.toTimeString().slice(0,5);
    const days = date ? [date] : Object.keys(Store.dayLog).sort().slice(-7);
    nowHHMM = ()=>'23:59'; const out = {};
    for(const T of days){ try{ out[T] = window.__numbersCheck(T); const rc = reportCheck(T); out[T].push({ok: rc.level!=="red", name:"In-app report check level: "+rc.level, a: rc.items.filter(i=>i.lvl!=="ok").map(i=>i.name+" "+i.a).join(" | ")||"all ok", b:"not red"}); }catch(e){ out[T] = [{ok:false, name:'CHECK CRASHED', a:e.message, b:(e.stack||'').split('\n')[1]}]; } }
    return out; }, {data, date});
  for(const T of Object.keys(R)){ const L = R[T], bad = L.filter(x=>!x.ok); console.log(`\n=== ${T}: ${bad.length ? '⚠ '+bad.length+' of '+L.length+' checks do not match' : '✅ all '+L.length+' checks tally'}`);
    L.forEach(x=>console.log(`${x.ok?'✅':'⚠ '} ${x.name}: ${x.a}${x.ok?'':'  vs  '+x.b}`)); }
  console.log(errs.length ? 'page errors: '+errs.join('|') : ''); await b.close(); })();

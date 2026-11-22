const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext()).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1500);
  const r = await page.evaluate(async()=>{ window.CLOCK='08:00'; nowHHMM=()=>CLOCK; toast=()=>{}; window.confirm=()=>true; await confirmTodaysCrew(false);
    startLiveRunSetup('Variovac 2'); namePickHTML('line'); ['Mandy','Winston'].forEach(n=>toggleName('line', pickLists.line.indexOf(n))); await confirmStartRun();
    CLOCK='12:00'; openFinishSetup('Variovac 2'); liveFinishSetup.quantity='50'; liveFinishSetup.weight='1600'; await confirmFinishProduct();
    return plhHeadline(todayStr()).main; });
  console.log(r); console.log(errs.join('|')||'no page errors'); await b.close(); })();

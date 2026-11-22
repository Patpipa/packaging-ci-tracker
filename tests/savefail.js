const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext()).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200); await page.addScriptTag({content: fs.readFileSync(require('path').join(__dirname,'prelude.js'),'utf8')});
  const R = await page.evaluate(async()=>{ const H = await window.__P(); const col = Store.db.collection('tracker'); const orig = col.doc;
    Store.db.collection = ()=>({doc: id=>({...orig(id), set: async()=>{ const e = new Error('Missing or insufficient permissions.'); e.code='permission-denied'; throw e; }}), get: col.get});
    await H.start('Variovac 1',['Mandy']); await sendNamesTo(['Stanley'],'Runner / Floater'); await Store.saveDayLog();
    openSyncPanel(); return document.getElementById('syncPanel').innerText; });
  console.log(R); console.log(errs.join('|')||'no page errors'); await b.close(); })();

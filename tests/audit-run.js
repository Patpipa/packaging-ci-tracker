// node run.js app.html  -> runs every scenario in its own fresh page
const { chromium } = require('playwright'); const fs=require('fs');
const S = require('./audit-scenarios.js');
(async()=>{ const app = process.argv[2]; const b = await chromium.launch(); const results = [];
  for(const sc of S){ const page = await (await b.newContext()).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
    await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(require('path').join(__dirname,'fakefb.js'),'utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
    await page.goto('file://'+app); await page.waitForTimeout(1200);
    await page.addScriptTag({content: fs.readFileSync(__dirname+'/prelude.js','utf8')});
    let actual; try{ actual = await page.evaluate(`(async()=>{ const H = await window.__P(); ${sc.code} })()`); }catch(e){ actual = {CRASH: e.message.split('\n')[0]}; }
    const checks = sc.expect.map(([label, exp, key, tol])=>{ const a = key.split('.').reduce((o,k)=>o==null?o:o[k], actual); const pass = (typeof exp==='number' && typeof a==='number') ? Math.abs(a-exp) <= (tol==null?0.001:tol) : JSON.stringify(a)===JSON.stringify(exp); return {label, exp, act:a, diff: (typeof exp==='number'&&typeof a==='number') ? +(a-exp).toFixed(3) : (pass?0:'≠'), pass}; });
    results.push({id:sc.id, name:sc.name, input:sc.input, checks, errs, raw: actual});
    await page.context().close(); }
  fs.writeFileSync(require('path').join(require('os').tmpdir(),'ci-audit-results.json'), JSON.stringify(results,null,1));
  let P=0,F=0; results.forEach(r=>{ console.log(`\n${r.id}. ${r.name}`); r.checks.forEach(c=>{ c.pass?P++:F++; console.log(`  ${c.pass?'PASS':'FAIL'}  ${c.label}: expected ${JSON.stringify(c.exp)} · actual ${JSON.stringify(c.act)} · diff ${c.diff}`); }); if(r.errs.length) console.log('  page errors: '+r.errs.join('|')); });
  console.log(`\nTOTAL: ${P} pass · ${F} fail`); await b.close(); })();

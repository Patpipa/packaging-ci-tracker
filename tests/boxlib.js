const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:430,height:900}, deviceScaleFactor:2})).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200); await page.addScriptTag({content: fs.readFileSync(require('path').join(__dirname,'prelude.js'),'utf8')});
  const R = await page.evaluate(async()=>{ const H = await window.__P(); const o={};
    Store.productLibrary = [{id:'603630',name:'Earls Sirloin',category:'',targetPLH:300},{id:'605201',name:'Stew Trim',category:'',targetPLH:null},{id:'',name:'No ID thing',category:'',targetPLH:null}]; await Store.saveProductLibrary();
    Router.go('products'); render(); o.counter0 = /0 of 3/.test(document.body.innerText);
    await setProductBoxIdx(1,'t3-plain'); o.counter1 = /1 of 3/.test(document.body.innerText);
    productsBoxFilter=true; render(); o.filter = !document.body.innerText.includes('Stew Trim') && document.body.innerText.includes('Earls Sirloin'); productsBoxFilter=false;
    // ask once on finish
    Router.go('live'); H.at('08:00'); await H.start('Variovac 1',['Mandy','Harpreet']); Store.liveRuns['Variovac 1'].product='603630 Earls Sirloin'; Store.liveRuns['Variovac 1'].productId='603630';
    openFinishSetup('Variovac 1'); render(); o.ask = /What box is 603630/.test(document.body.innerText);
    await setProductBox('603630','s3-buckhead'); o.askGone = !/What box is 603630/.test(document.body.innerText) && /Steak Box #3 · Buckhead/.test(document.body.innerText);
    H.at('10:00'); liveFinishSetup.weight='1000'; liveFinishSetup.quantity='44'; await confirmFinishProduct(); await H.sync();
    // edit keeps box
    editLibraryProduct(0); liveProductPicker.newTargetPLH='320'; await confirmAddProduct(); o.editKeeps = Store.productLibrary[0].box==='s3-buckhead' && Store.productLibrary[0].targetPLH===320;
    // add with box
    openProductPicker('library'); Object.assign(liveProductPicker,{newId:'604880',newName:'Fireriver Ribeye',newBox:'s3-fireriver'}); await confirmAddProduct();
    o.added = (Store.productLibrary.find(x=>x.id==='604880')||{}).box==='s3-fireriver';
    // PLH add-later form shows box
    const rec = Store.records.find(r=>r.machine==='Variovac 1' && r.status==='RUNNING'); plhDataFormId=rec.id; Router.go('addPLHData'); render(); o.plhForm = /Box: Steak Box #3 · Buckhead/.test(document.body.innerText);
    // persisted to cloud doc
    const doc = await Store.db.collection('tracker').doc('productLibrary').get(); const saved = JSON.parse(doc.data().data); o.cloud = saved.filter(x=>x.box).length===3;
    o.numbersSame = rec.plh.weightLbs===1000 && rec.plh.quantity===44;
    Router.go('products'); render(); window.scrollTo(0,0); return o; });
  await page.screenshot({path:require('path').join(require('os').tmpdir(),'boxlib.png')});
  console.log(JSON.stringify(R)); const ok = Object.values(R).every(v=>v===true);
  console.log(errs.join('|')||'no page errors'); console.log(ok&&!errs.length?'PASS':'FAIL'); await b.close(); })();

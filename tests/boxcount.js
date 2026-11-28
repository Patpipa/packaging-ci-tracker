const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:430,height:900}, deviceScaleFactor:2})).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200); await page.addScriptTag({content: fs.readFileSync(path.join(__dirname,'prelude.js'),'utf8')});
  const R = await page.evaluate(async()=>{ const H = await window.__P(); const T=H.T, Y=shiftDate(T,-1), o={}, chk=[]; const ok=(name,c)=>{ if(!c) chk.push(name); };
    window.confirm=()=>true;
    Store.productLibrary = [{id:'603630',name:'Earls Sirloin',category:'',targetPLH:300,box:'s3-buckhead'},{id:'605201',name:'Stew Trim',category:'',targetPLH:null,box:'t3-plain'},{id:'604112',name:'Grill Strip',category:'',targetPLH:null}]; await Store.saveProductLibrary();
    const prod=(m,id,name)=>{ Store.liveRuns[m].product=id+' '+name; Store.liveRuns[m].productId=id; };
    const co=async(m)=>{ openDowntimeSetup(m); liveDowntimeSetup.status='CHANGEOVER'; liveDowntimeSetup.changeReason='Film Change'; liveDowntimeSetup.film='Forming'; await confirmDowntime(); await H.sync(); };
    const real=todayStr;
    todayStr=()=>Y; await confirmTodaysCrew(false); H.at('08:00'); await H.start('Variovac 1',['Mandy','Harpreet']); prod('Variovac 1','603630','Earls Sirloin'); H.at('09:00'); await H.fin('Variovac 1',300,10);
    todayStr=real; await confirmTodaysCrew(false);
    H.at('08:00'); await H.start('Variovac 1',['Mandy','Harpreet']); prod('Variovac 1','603630','Earls Sirloin');
    H.at('09:00'); await co('Variovac 1'); H.at('09:10'); await H.resume('Variovac 1'); H.at('10:00'); await H.fin('Variovac 1',1000,44);
    await H.start('Variovac 1',['Mandy','Harpreet']); prod('Variovac 1','603630','Earls Sirloin'); H.at('11:00'); await H.fin('Variovac 1',700,30);
    H.at('08:00'); await H.start('Variovac 2',['Stanley','Winston']); prod('Variovac 2','605201','Stew Trim'); H.at('10:00'); await H.fin('Variovac 2',500,20);
    await H.start('Variovac 2',['Stanley','Winston']); prod('Variovac 2','605201','Stew Trim'); H.at('11:00'); await H.fin('Variovac 2','','');
    H.at('08:00'); await H.start('Variovac 3',['Sandeep','Mohamad']); prod('Variovac 3','604112','Grill Strip'); H.at('10:00'); await H.fin('Variovac 3',300,12);
    let a = boxAuto(T); o.start = {by:a.by, unset:a.unset.map(u=>u.id+':'+u.qty).join(','), runs:a.runs, withQty:a.withQty, lines:a.lines.map(l=>l.code+':'+l.qty+'/'+l.runs.length).join(',')};
    ok('start', a.by['s3-buckhead']===74 && a.by['t3-plain']===20 && o.start.unset==='604112:12' && a.runs===5 && a.withQty===4 && o.start.lines==='603630:74/2,604112:12/1,605201:20/2');
    Router.go('dashboard'); render(); ok('dash0', /106 boxes · 0 of 3 codes checked/.test(document.body.innerText) && /12 box not set/.test(document.body.innerText));
    openBoxes(); render();
    // 1) code from runs typed again → warning, then change instead
    Object.assign(boxEdit.add,{code:'603630',qty:'76'}); boxAddCheck(); ok('warnRuns', boxEdit.add.warn && boxEdit.add.warn.kind==='runs' && /already counted — 74 from 2 runs/.test(document.body.innerText));
    ok('noAddYet', boxAuto(T).lines.find(l=>l.code==='603630').qty===74);
    await boxAddDo('603630',76,'replace'); let L=boxAuto(T).lines.find(l=>l.code==='603630'); ok('replaced', L.qty===76 && L.typed && L.checked && L.runsQty===74);
    // 2) a code not in the library → name + box → saved to library
    Object.assign(boxEdit.add,{code:'601990',qty:'8'}); boxAddCheck(); ok('warnNew', boxEdit.add.warn && boxEdit.add.warn.kind==='new' && /isn't in your Product Library yet/.test(document.body.innerText));
    boxEdit.add.name='Short Rib'; boxEdit.add.box='r57-plain'; await boxAddNewProduct(); const lib = Store.productLibrary.find(x=>x.id==='601990'); ok('libSaved', lib && lib.box==='r57-plain' && lib.name==='Short Rib');
    L=boxAuto(T).lines.find(l=>l.code==='601990'); ok('summaryOnly', L.qty===8 && L.added && !L.runs.length);
    // 3) same code typed from the summary again → add to it / replace
    Object.assign(boxEdit.add,{code:'601990',qty:'5'}); boxAddCheck(); ok('warnTyped', boxEdit.add.warn && boxEdit.add.warn.kind==='typed' && /already in from the summary — 8/.test(document.body.innerText) && /Add to it \(8 \+ 5 = 13\)/i.test(document.body.innerText));
    await boxAddDo('601990',5,'add'); ok('added13', boxAuto(T).lines.find(l=>l.code==='601990').qty===13);
    Object.assign(boxEdit.add,{code:'601990',qty:'9'}); boxAddCheck(); await boxAddDo('601990',9,'replace'); ok('replaced9', boxAuto(T).lines.find(l=>l.code==='601990').qty===9);
    // 4) tick, swap
    await boxToggle('605201'); ok('tick', boxAuto(T).lines.find(l=>l.code==='605201').checked);
    Object.assign(boxEdit.swap,{out:'s3-buckhead',used:'s3-plain',n:'30',note:'order not in yet'}); await addBoxSwap();
    let x = boxDay(T); o.mid = {fin:x.fin, total:x.total}; ok('mid', x.fin['s3-buckhead']===46 && x.fin['s3-plain']===30 && x.fin['t3-plain']===20 && x.fin['r57-plain']===9 && x.unsetQty===12 && x.total===117);
    // 5) open a code, back to runs
    boxOpen('603630'); ok('panel', /Runs counted 74/.test(document.body.innerText) && /Back to runs \(74\)/i.test(document.body.innerText)); await boxBackToRuns('603630'); ok('backRuns', boxDay(T).total===115 && !boxAuto(T).lines.find(l=>l.code==='603630').typed);
    // 6) change a number via the panel
    boxOpen('605201'); boxEdit.val='22'; await boxUseNumber('605201'); ok('useNum', boxDay(T).fin['t3-plain']===22 && boxDay(T).total===117);
    // 7) number typed on the old per-box page still wins for that box until cleared
    const d = ensureDayLog(T); d.boxes.ov = {'t3-plain':25}; await Store.saveDayLog(); ok('legacy', boxDay(T).fin['t3-plain']===25 && boxDay(T).total===120); await boxClearOv(); ok('legacyClear', boxDay(T).total===117);
    // 8) cloud
    const doc = await Store.db.collection('tracker').doc('day_'+T).get(); const dd = doc.exists ? (doc.data().data ? JSON.parse(doc.data().data) : doc.data()) : null; ok('cloud', dd && dd.boxes && dd.boxes.codes && dd.boxes.codes['601990'].qty===9 && dd.boxes.codes['605201'].qty===22 && dd.boxSwaps.length===1);
    // 9) bad numbers
    boxOpen('603630'); boxEdit.val='-3'; await boxUseNumber('603630'); ok('rejectNeg', boxDay(T).total===117); boxEdit.open=null;
    Object.assign(boxEdit.add,{code:'abc',qty:'4'}); boxAddCheck(); ok('rejectCode', !boxEdit.add.warn && boxDay(T).total===117); boxEdit.add={code:'',qty:'',name:'',box:'',warn:null};
    Router.go('dashboard'); render(); ok('dash1', /117 boxes · 2 of 4 codes checked/.test(document.body.innerText));
    // 10) report, not-counted day, names
    openBoxes(Y); await markBoxesNotCounted(); ok('yNot', boxDay(Y).status==='not counted');
    const u = boxUsage(Y,T); o.usage={total:u.total,counted:u.counted,prod:u.prod}; ok('usage', u.total===117 && u.counted===1 && u.prod===2 && u.notCounted.length===1 && u.unset===12);
    const txt = H.txt(boxReportHTML(Y,T,true)); ok('rep', /117/.test(txt) && /Not counted:/.test(txt) && /Box swaps — ran out/i.test(txt) && /Box not set/.test(txt) && /Prepared by Walter/.test(txt) && !/Share/i.test(txt) && /Avg \/ day/i.test(txt) && !/Avg/i.test(H.txt(boxReportHTML(T,T,true))));
    ok('noNames', !['Mandy','Harpreet','Stanley','Winston','Sandeep','Mohamad'].some(n=>txt.includes(n)));
    // 11) tag the unset product
    await setProductBox('604112','s3-plain'); ok('afterTag', boxDay(T).fin['s3-plain']===42 && boxDay(T).unsetQty===0 && boxDay(T).total===117);
    Router.go('reports'); render(); ok('btn', [...document.querySelectorAll('button')].some(x=>/box usage/i.test(x.innerText)));
    o.failed = chk; return o; });
  await page.evaluate(()=>{ openBoxes(); boxOpen('603630'); window.scrollTo(0,0); }); await page.screenshot({path:path.join(require('os').tmpdir(),'boxcard.png'), fullPage:true});
  await page.evaluate(()=>{ boxEdit.open=null; Object.assign(boxEdit.add,{code:'605201',qty:'25'}); boxAddCheck(); }); await page.screenshot({path:path.join(require('os').tmpdir(),'boxwarn.png'), fullPage:true});
  console.log(JSON.stringify(R)); const good = !R.failed.length;
  console.log(errs.join('|')||'no page errors'); console.log(good&&!errs.length?'PASS':'FAIL'); await b.close(); })();

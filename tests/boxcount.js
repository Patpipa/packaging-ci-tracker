const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{ const b = await chromium.launch(); const page = await (await b.newContext({viewport:{width:430,height:900}, deviceScaleFactor:2})).newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message));
  await page.route('**/*', r=>{ const u=r.request().url(); if(u.includes('firebase-app-compat')) return r.fulfill({body: fs.readFileSync(__dirname+'/fakefb.js','utf8'), contentType:'application/javascript'}); if(u.startsWith('file:')) return r.continue(); return r.fulfill({body:'',contentType:'application/javascript'}); });
  await page.goto('file://'+process.argv[2]); await page.waitForTimeout(1200); await page.addScriptTag({content: fs.readFileSync(path.join(__dirname,'prelude.js'),'utf8')});
  const R = await page.evaluate(async()=>{ const H = await window.__P(); const T=H.T, Y=shiftDate(T,-1), o={};
    Store.productLibrary = [{id:'603630',name:'Earls Sirloin',category:'',targetPLH:300,box:'s3-buckhead'},{id:'605201',name:'Stew Trim',category:'',targetPLH:null,box:'t3-plain'},{id:'604112',name:'Grill Strip',category:'',targetPLH:null}]; await Store.saveProductLibrary();
    const prod=(m,id,name)=>{ Store.liveRuns[m].product=id+' '+name; Store.liveRuns[m].productId=id; };
    const co=async(m)=>{ openDowntimeSetup(m); liveDowntimeSetup.status='CHANGEOVER'; liveDowntimeSetup.changeReason='Film Change'; liveDowntimeSetup.film='Forming'; await confirmDowntime(); await H.sync(); };
    const real=todayStr;
    // yesterday: 10 boxes of 603630, later marked not counted
    todayStr=()=>Y; await confirmTodaysCrew(false); H.at('08:00'); await H.start('Variovac 1',['Mandy','Harpreet']); prod('Variovac 1','603630','Earls Sirloin'); H.at('09:00'); await H.fin('Variovac 1',300,10);
    todayStr=real; await confirmTodaysCrew(false);
    H.at('08:00'); await H.start('Variovac 1',['Mandy','Harpreet']); prod('Variovac 1','603630','Earls Sirloin');
    H.at('09:00'); await co('Variovac 1'); H.at('09:10'); await H.resume('Variovac 1'); H.at('10:00'); await H.fin('Variovac 1',1000,44);   // changeover inside the run: still 44 once
    await H.start('Variovac 1',['Mandy','Harpreet']); prod('Variovac 1','603630','Earls Sirloin'); H.at('11:00'); await H.fin('Variovac 1',700,30);
    H.at('08:00'); await H.start('Variovac 2',['Stanley','Winston']); prod('Variovac 2','605201','Stew Trim'); H.at('10:00'); await H.fin('Variovac 2',500,20);
    await H.start('Variovac 2',['Stanley','Winston']); prod('Variovac 2','605201','Stew Trim'); H.at('11:00'); await H.fin('Variovac 2','',''); // no QTY
    H.at('08:00'); await H.start('Variovac 3',['Sandeep','Mohamad']); prod('Variovac 3','604112','Grill Strip'); H.at('10:00'); await H.fin('Variovac 3',300,12);
    const a = boxAuto(T); o.auto = {by:a.by, unset:a.unset.map(u=>u.id+':'+u.qty).join(','), runs:a.runs, withQty:a.withQty};
    o.dash = (()=>{ Router.go('dashboard'); render(); const t=document.body.innerText; return /Boxes used today/.test(t) && /106 boxes so far from runs · 4 of 5 runs have QTY/.test(t) && /12 box not set/.test(t); })();
    // swap 30 buckhead -> plain, then type the summary number for trim, save
    openBoxes(); render(); Object.assign(boxEdit.swap,{out:'s3-buckhead',used:'s3-plain',n:'30',note:'order not in yet'}); await addBoxSwap();
    boxEdit.ov['t3-plain']='22'; await saveBoxes();
    const x = boxDay(T); o.day = {fin:x.fin, src:x.src, total:x.total, status:x.status};
    o.page = /Ran out\? Note a box swap/i.test(document.body.innerText) && /Out of Steak Box #3 · Buckhead/i.test(document.body.innerText);
    // saved to the day doc in the cloud
    const doc = await Store.db.collection('tracker').doc('day_'+T).get(); const dd = doc.exists ? (doc.data().data ? JSON.parse(doc.data().data) : doc.data()) : null; o.cloud = !!(dd && dd.boxes && dd.boxes.ov && dd.boxes.ov['t3-plain']===22 && dd.boxSwaps && dd.boxSwaps.length===1);
    // validation: bad number refused
    boxEdit.ov['s3-plain']='-4'; await saveBoxes(); o.rejectNeg = boxDay(T).fin['s3-plain']===30; boxEdit.ov['s3-plain']='';
    // yesterday not counted
    openBoxes(Y); await markBoxesNotCounted(); o.yNot = boxDay(Y).status==='not counted';
    const u = boxUsage(Y,T); o.usage = {total:u.total, counted:u.counted, prod:u.prod, notCounted:u.notCounted.length, unset:u.unset};
    const txt = H.txt(boxReportHTML(Y,T,true)); o.rep = /108/.test(txt) && !/Share/i.test(txt) && /Avg \/ day/i.test(txt) && !/Avg/i.test(H.txt(boxReportHTML(T,T,true))) && /Not counted:/.test(txt) && /Box swaps — ran out/i.test(txt) && /Box not set/.test(txt) && /Prepared by Walter/.test(txt);
    o.names = ['Mandy','Harpreet','Stanley','Winston','Sandeep','Mohamad'].filter(n=>txt.includes(n));
    // tag the unset product: its 12 move into a box
    await setProductBox('604112','s3-plain'); o.afterTag = boxDay(T).fin['s3-plain']===42 && boxDay(T).unsetQty===0 && boxDay(T).total===108;
    // daily report and weekly have no box section
    o.notInDaily = !/Box Usage|Boxes used/i.test(H.txt(typeof buildDailyReportHTML==='function'?buildDailyReportHTML(T):'')) ;
    Router.go('reports'); render(); o.btn = [...document.querySelectorAll('button')].some(x=>/box usage/i.test(x.innerText));
    Router.go('boxReport'); setBoxPreset('today'); render(); o.view = /Box Usage/.test(document.body.innerText);
    window.__txt = txt; return o; });
  await page.screenshot({path:path.join(require('os').tmpdir(),'boxreport.png'), fullPage:true});
  await page.evaluate(()=>{ openBoxes(); render(); window.scrollTo(0,0); }); await page.screenshot({path:path.join(require('os').tmpdir(),'boxcard.png'), fullPage:true});
  console.log(JSON.stringify(R,null,0));
  const ok = R.auto.by['s3-buckhead']===74 && R.auto.by['t3-plain']===20 && R.auto.unset==='604112:12' && R.auto.runs===5 && R.auto.withQty===4 && R.dash
    && R.day.fin['s3-buckhead']===44 && R.day.fin['s3-plain']===30 && R.day.fin['t3-plain']===22 && R.day.src['t3-plain']==='summary' && R.day.total===108 && R.day.status==='checked'
    && R.page && R.cloud && R.rejectNeg && R.yNot && R.usage.total===108 && R.usage.counted===1 && R.usage.prod===2 && R.usage.notCounted===1 && R.usage.unset===12 && R.rep && !R.names.length && R.afterTag && R.btn && R.view;
  console.log(errs.join('|')||'no page errors'); console.log(ok&&!errs.length?'PASS':'FAIL'); await b.close(); })();

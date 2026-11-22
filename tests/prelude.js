window.__P = async function(){
  toast=()=>{}; window.confirm=()=>true; window.CLOCK='08:00'; nowHHMM=()=>CLOCK; askSideKind=async()=>'start'; askGarbageKind=async()=>'Packaging';
  Router.go('live'); await confirmTodaysCrew(false); const T=todayStr(); const d0=ensureDayLog(T); d0.shift={}; await saveDayLogNow();
  const H = {T};
  H.at = t=>{ CLOCK=t; };
  H.sync = async()=>{ try{ render(); }catch(e){} await new Promise(r=>setTimeout(r,60)); await syncWhere(); await syncSideBreaks(); await syncGarbage(); };
  H.pick = (ctx,names)=>{ namePickHTML(ctx); names.forEach(n=>{ const i=pickLists[ctx].indexOf(n); if(i<0) throw new Error('no '+n); toggleName(ctx,i); }); };
  H.start = async(m, names, product)=>{ startLiveRunSetup(m); H.pick('line', names); if(product){ liveSetup.product=product; } await confirmStartRun(); await H.sync(); };
  H.down = async(m, status, reason, cat)=>{ openDowntimeSetup(m); liveDowntimeSetup.status=status; if(status==='WAITING'){ liveDowntimeSetup.waitCategory=cat||'Upstream / Product'; liveDowntimeSetup.waitReason=reason; } if(status==='CHANGEOVER'){ liveDowntimeSetup.changeReason=reason||CHANGEOVER_REASONS[0]; } await confirmDowntime(); await H.sync(); };
  H.resume = async m=>{ await resumeRun(m); await H.sync(); };
  H.fin = async(m, w, q)=>{ openFinishSetup(m); liveFinishSetup.weight = w==null?'':String(w); liveFinishSetup.quantity = q==null?'':String(q); await confirmFinishProduct(); await H.sync(); };
  H.run = (m, date)=>Store.records.filter(r=>r.machine===m && r.status==='RUNNING' && (r.date===(date||T))).map(r=>({start:r.startTime, end:r.endTime, dur:r.durationMin, w: r.plh&&r.plh.weightLbs, net: r.plh&&Math.round(r.plh.netLaborHours*60), gross: r.plh&&Math.round(r.plh.grossLaborHours*60), gPLH: r.plh&&r.plh.grossPLH, nPLH: r.plh&&r.plh.netPLH, product:r.product, id:r.id}));
  H.recs = (m, st)=>Store.records.filter(r=>r.date===T && (!m||r.machine===m) && (!st||r.status===st));
  H.txt = h=>{ const d=document.createElement('div'); d.innerHTML=h; document.body.appendChild(d); const t=d.innerText; d.remove(); return t; };
  H.person = n=>personDay(T).people.find(p=>p.name===n);
  return H; };

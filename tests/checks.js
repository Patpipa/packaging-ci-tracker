window.__numbersCheck = function(T){
  const out = []; const ok=(name, a, b, note)=>{ const same = (typeof a==='number' && typeof b==='number') ? Math.abs(a-b)<=1 : a===b; out.push({ok:same, name, a, b, note:note||''}); };
  const txt=h=>{ const d=document.createElement('div'); d.innerHTML=h; document.body.appendChild(d); const t=d.innerText; d.remove(); return t; };
  const dur=s=>{ if(!s) return null; if(/none/i.test(s)) return 0; let m=0; const h=s.match(/(\d+)h/); const mm=s.match(/(\d+)m/); if(h) m+=+h[1]*60; if(mm) m+=+mm[1]; return (h||mm)?m:null; };
  const pd = personDay(T), P = pd.people.filter(p=>!p.away);
  const daily = sectionsText(dayLogSections(T)), staff = txt(staffingReportHTML(T,T,true)), crew = txt(crewReportHTML(T,T,true));
  const grab=(t,re)=>{ const m=t.match(re); return m?m[1]:null; };
  // 1 every person adds up
  P.forEach(p=>{ const seg=p.segs.reduce((t,s)=>t+s.b-s.a,0), grp=Object.values(p.grp).reduce((a,b)=>a+b,0); ok(`${p.name}: time pieces add up to shift`, seg, p.total); ok(`${p.name}: groups add up`, grp, p.total); });
  // 2 line labour: crew minutes on running line = PLH net labour
  const recs = Store.records.filter(r=>r.date===T && !r.side && r.plh);
  MACHINES.forEach(m=>{ const rs = recs.filter(r=>r.machine===m); if(!rs.length) return; const net = Math.round(rs.reduce((t,r)=>t+(r.plh.netLaborHours||0)*60,0)); const crewMin = P.reduce((t,p)=>t+(p.tot[`${shortM(m)} running`]||0),0); ok(`${shortM(m)}: crew minutes running = PLH net labour`, crewMin, net); });
  // 3 garbage
  const gs = garbageSummary([T]); const gP = P.reduce((t,p)=>t+Object.keys(p.tot).filter(k=>/^Garbage run/.test(k)).reduce((a,k)=>a+p.tot[k],0),0);
  ok('Garbage total: Staffing Report = Crew Hours', gs.min, gP);
  GARBAGE_KINDS.forEach(k=>{ const a = P.reduce((t,p)=>t+(p.tot[`Garbage run (${k})`]||0),0); const sm = (gs.kinds.find(x=>x.startsWith(k+' '))||''); const b = sm ? dur(sm.replace(/^.*\(/,'')) : 0; if(a||b) ok(`Garbage ${k}: Staffing = Crew Hours`, b, a); });
  const noArea = P.reduce((t,p)=>t+(p.tot['Garbage run']||0),0); ok('Garbage runs with no area picked', noArea, 0);
  // 4 short-staffed
  const x = shortStaffFor(T); const dS = dur(grab(daily,/Short-staffed: ([^\n·]+)/)), sS = dur(grab(staff,/Short-staffed\t([^\n]+)/)), cS = dur(grab(crew,/Short-staffed\t([^\n]+)/));
  ok('Short-staffed: Daily = Staffing Report', dS, sS); ok('Short-staffed: Staffing Report = Crew Hours', sS, cS); ok('Short-staffed: report = calculation', sS, x.total);
  // 5 Lead / Yield
  OFFLINE_ROLES.forEach(r=>{ const dl = grab(daily, new RegExp(r+': ([^\\n]+)')); if(!dl || /off today/.test(dl)) return; const dM = /on the line ([^\n]+)/.test(dl) ? dur(dl.match(/on the line ([^\n]+)/)[1]) : 0; const lyS = crew.slice(Math.max(0, crew.toUpperCase().indexOf('LEAD HAND & YIELD'))); const cl = grab(lyS, new RegExp(r+'\\t(?:on the line )?([^\\t\\n]+)')); ok(`${r} on a machine: Daily = Crew Hours`, dM, dur(cl)); });
  { const sr = dur(grab(staff,/Lead Hand \/ Yield running a machine\t([^\n]+)/)); const cr = OFFLINE_ROLES.reduce((t,r)=>t+(dur(grab(crew.slice(Math.max(0, crew.toUpperCase().indexOf('LEAD HAND & YIELD'))), new RegExp(r+'\\t(?:on the line )?([^\\t\\n]+)')))||0),0); ok('Lead/Yield on a machine: Staffing Report = Crew Hours', sr, cr); }
  // 6 lent
  { const L = {}; P.forEach(p=>p.segs.forEach(sg=>{ if(sg.g==='Lent to other dept') L.t=(L.t||0)+sg.b-sg.a; })); const blk = (daily.split('Crew lent to other depts:')[1]||'').split('Cross-dept')[0]; const dL = [...blk.matchAll(/· (\d+h \d+m|\d+h|\d+m)/g)].reduce((t,m0)=>t+dur(m0[1]),0); const cL = dur(grab(crew,/Total \(part of the day\)[^\n]*?\t(\d+h \d+m|\d+m|\d+h)\s*$/m)); ok('Lent (part of day): Daily = Crew Hours', dL, cL ?? (L.t||0)); }
  // 7 cross-dept help
  { const dH = dur(grab(daily,/Cross-dept help: [^\n]*· ([^\n]+)/)) || 0; const hb = (crew.toUpperCase().indexOf('CROSS-DEPT HELP')); const sec = hb>=0 ? crew.slice(hb, crew.indexOf('LENT TO', hb)>0 ? crew.indexOf('LENT TO', hb) : hb+800) : ''; const cH = dur(grab(sec,/Total\t\t?([^\n]+)/)) || 0; ok('Cross-dept help: Daily = Crew Hours', dH, cH); }
  // 8 crew count
  ok('Packaging crew: Daily = Staffing Report', grab(daily,/Packaging crew: (\d+)/), grab(staff,/Packaging crew in\t(\d+)/));
  // 9 side machines: Daily labour = crew minutes running there
  const sl = computeSideLabour(T,T); SIDE_MACHINES.forEach(m=>{ const pm = sl.perMachine[m.name]; if(!pm || !pm.runMin) return; const crewMin = P.reduce((t,p)=>t+(p.tot[m.name]||0),0); ok(`${m.name}: Daily labour = crew minutes running`, Math.round(pm.packMin), crewMin); });
  // 10 open items
  const d = dayLogFor(T)||{}; const open = [];
  Object.keys(Store.liveRuns||{}).forEach(m=>{ const l=Store.liveRuns[m]; if(l && (l.date||T)===T) open.push(`${m} still running`); });
  (d.side||[]).filter(s=>!s.end).forEach(s=>open.push(`${s.machine} still open`));
  (d.garbage||[]).filter(g=>!g.end).forEach(g=>open.push('garbage run not brought back'));
  if(!d.shiftEnd && T!==todayStr()) open.push('End Shift not tapped');
  out.push({ok: !open.length, name:'Nothing left open', a: open.join(', ')||'none', b:'none'});
  return out; };

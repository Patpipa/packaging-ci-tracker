// Runs the whole CI Tracker test suite against ../index.html (or a file given as the first argument).
//   node tests/run-all.js            → tests the app in this repo
//   node tests/run-all.js other.html → tests another copy (e.g. the live version saved to a file)
// Exit code 0 = everything passed. Nothing here touches Firebase: every test uses fakefb.js, an in-memory stand-in.
const { spawnSync } = require('child_process'); const path = require('path'); const fs = require('fs'); const os = require('os');
const app = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const node = process.execPath, here = __dirname;
const run = (file, args=[], timeout=240000)=>spawnSync(node, [path.join(here, file), app, ...args], {encoding:'utf8', timeout, cwd: here});
const REG = ['crewemb','staffrep','audit','full','hs','day3','garbline','garbplace','lentnb','noisy2','wt','tl','miss','acct','places2','places3','crew29','plh','rcheck','helpback','notmeas','markall','scalefx','accrun','rmmove','film','filmadd','filmrep','daysplit','crewnh','helpinf','savefail','internal'];
let bad = 0; const t0 = Date.now();
console.log(`Testing ${app}\n`);
console.log('1 · Regression scripts (each plays a floor scenario; fails on any page error or crash)');
for(const n of REG){ const r = run(n+'.js'); const out = (r.stdout||'')+(r.stderr||'');
  const err = r.status!==0 || /pageerror|page errors?: (?!none)|TypeError|ReferenceError|SyntaxError|ERR /i.test(out.replace(/no page errors/g,''));
  if(err){ bad++; console.log(`   ✗ ${n}\n${out.split('\n').filter(l=>/error|ERR|fail/i.test(l)).slice(0,3).map(l=>'       '+l.slice(0,200)).join('\n')}`); } else process.stdout.write(`   ✓ ${n}\n`); }
console.log('\n2 · Audit suite (hand-calculated expected answers)');
{ const r = run('audit-run.js', [], 600000); const m = (r.stdout||'').match(/TOTAL: (\d+) pass · (\d+) fail/);
  if(!m){ bad++; console.log('   ✗ audit suite did not finish\n'+(r.stderr||'').slice(0,400)); }
  else { console.log(`   ${m[2]==='0'?'✓':'✗'} ${m[1]} pass · ${m[2]} fail`); if(m[2]!=='0'){ bad++; (r.stdout||'').split('\n').filter(l=>/FAIL/.test(l)).slice(0,10).forEach(l=>console.log('     '+l)); } } }
console.log('\n3 · Cross-report reconciliation (busy day: Daily = Staffing = Crew Hours = PLH)');
{ const m = run('megaday.js'); const r = run('replay2.js', [path.join(os.tmpdir(),'ci-backup.json')]); const out = r.stdout||'';
  const ok = /all \d+ checks tally/.test(out); if(!ok) bad++;
  console.log('   '+(ok ? '✓ '+(out.match(/all \d+ checks tally/)||[''])[0] : '✗ '+out.split('\n').filter(l=>/⚠/.test(l)).slice(0,6).join('\n     '))); }
console.log(`\n${bad ? '✗ '+bad+' part(s) failed' : '✓ Everything passed'} · ${Math.round((Date.now()-t0)/1000)}s`);
process.exit(bad ? 1 : 0);

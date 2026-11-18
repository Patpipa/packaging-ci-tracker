"""Independent audit of the Packaging CI Tracker export. Read-only: never writes to the export."""
import json, sys, re, collections as C, datetime as DT, os, csv
from fractions import Fraction

EXPORT = sys.argv[1]; OUT = sys.argv[2]
d = json.load(open(EXPORT))
K = json.load(open(os.path.join(os.path.dirname(__file__), 'consts.json')))
RENAMES = K['REASON_RENAMES']; WCAT = K['WAITING_CATEGORIES']
R = d['records']; REPORTS = d['dailyReports']
LINES = ['Variovac 1', 'Variovac 2', 'Variovac 3', 'Manual Pack']
SIDE = ['Fajita', 'Vacuum Sealer', 'Slicer', 'Cutlet']
F = []  # findings

def find(sev, area, rec, field, expected, actual, why):
    F.append(dict(severity=sev, area=area, id=(rec or {}).get('id', ''), date=(rec or {}).get('date', ''),
                  machine=(rec or {}).get('machine', ''), field=field, expected=expected, actual=actual, explanation=why))

def tm(t):
    if not t: return None
    h, m = t.split(':'); return int(h) * 60 + int(m)
def dur(s, e):
    a, b = tm(s), tm(e)
    if a is None or b is None: return 0
    return b - a if b > a else 0
def close(a, b, tol=1e-9):
    if a is None or b is None: return a is None and b is None
    return abs(a - b) <= tol * max(1, abs(a), abs(b))

# ---------------- PART 2: records ----------------
ids = C.Counter(r['id'] for r in R)
for i, n in ids.items():
    if n > 1: find('RED', 'records', {'id': i}, 'id', 'unique', f'{n} copies', 'Duplicate record ID')
for r in R:
    try: DT.date.fromisoformat(r['date'])
    except Exception: find('RED', 'records', r, 'date', 'YYYY-MM-DD', r['date'], 'Invalid date')
    if r['machine'] not in LINES + SIDE: find('RED', 'records', r, 'machine', 'known station', r['machine'], 'Unknown machine')
    if bool(r.get('side')) != (r['machine'] in SIDE):
        find('RED', 'records', r, 'side', r['machine'] in SIDE, r.get('side'), 'Side flag disagrees with machine type (would be counted in wrong report)')
    s, e = tm(r['startTime']), tm(r['endTime'])
    if s is None or e is None: find('RED', 'records', r, 'startTime/endTime', 'HH:MM', f"{r['startTime']}-{r['endTime']}", 'Missing time'); continue
    if e < s: find('RED', 'records', r, 'endTime', '>= startTime', f"{r['startTime']}-{r['endTime']}", 'End before start')
    if s < 5 * 60 or e > 18 * 60: find('YELLOW', 'records', r, 'time', 'within 05:00-18:00', f"{r['startTime']}-{r['endTime']}", 'Outside normal shift window')
    if r['durationMin'] <= 0 and not r.get('side'):
        find('YELLOW', 'records', r, 'durationMin', '>0', r['durationMin'], 'Zero-length record')
    # product
    if r['status'] in ('RUNNING', 'CHANGEOVER') and not (r.get('product') or '').strip():
        find('YELLOW', 'records', r, 'product', 'non-empty', '', 'No product on a production/changeover record')
    # classification consistency
    st = r['status']
    if st == 'WAITING':
        cat = r.get('reasonCategory')
        if cat not in WCAT: find('RED', 'classification', r, 'reasonCategory', 'valid waiting category', cat, 'Unknown waiting category')
        else:
            exp = WCAT[cat]['cls']
            if r['classification'] != exp: find('RED', 'classification', r, 'classification', exp, r['classification'], 'Upstream/internal split disagrees with category')
            reason = RENAMES.get(r['reason'], r['reason'])
            if reason != r['reason']: find('YELLOW', 'classification', r, 'reason', reason, r['reason'], 'Old reason label not migrated')
            if reason not in WCAT[cat]['reasons'] and not re.search('other', reason or '', re.I):
                other = [k for k, v in WCAT.items() if reason in v['reasons']]
                find('YELLOW', 'classification', r, 'reason', f"a reason listed under {cat}" + (f" (it is listed under {other[0]})" if other else ''), reason,
                     'Reason not in its category list' + ('; recorded under the wrong category' if other else ' (custom text)'))
            if reason.startswith('MAREL - ') and r['machine'] not in ('Variovac 1', 'Variovac 2', 'Variovac 3'):
                find('YELLOW', 'classification', r, 'reason', 'not MAREL on this machine', reason, 'MAREL only feeds Variovacs')
            m = re.search(r'for (Variovac \d)$', reason)
            if m and m.group(1) == r['machine']:
                find('YELLOW', 'classification', r, 'reason', 'not own machine', reason, 'Line waiting on meat cut for itself')
        if not r.get('reason'): find('YELLOW', 'classification', r, 'reason', 'non-empty', '', 'Waiting record without reason')
    else:
        if r.get('classification'): find('YELLOW', 'classification', r, 'classification', '', r['classification'], 'Non-waiting record carries an upstream/internal class')
    if st == 'CHANGEOVER' and not r.get('reason'): find('YELLOW', 'classification', r, 'reason', 'non-empty', '', 'Changeover without reason')
    if st == 'PLANNED' and r.get('reasonCategory') != 'Planned Stop': find('YELLOW', 'classification', r, 'reasonCategory', 'Planned Stop', r.get('reasonCategory'), '')

# duration vs clock
plain_mismatch = []
for r in R:
    p = r.get('plh')
    if r['status'] == 'RUNNING' and p and p.get('segments'):
        segmin = sum(dur(s['start'], s['end']) for s in p['segments'])
        if segmin != r['durationMin']:
            find('RED', 'duration', r, 'durationMin', f'{segmin} (sum of running segments)', r['durationMin'], 'Running minutes do not equal the run\'s own segments')
        segs = [s for s in p['segments'] if dur(s['start'], s['end']) > 0]
        if segs:
            if segs[0]['start'] != r['startTime'] or max(segs, key=lambda s: tm(s['end']))['end'] != r['endTime']:
                find('YELLOW', 'duration', r, 'startTime/endTime', f"{segs[0]['start']}-{max(segs, key=lambda s: tm(s['end']))['end']}", f"{r['startTime']}-{r['endTime']}", 'Record window differs from its running segments (record edited?)')
        span = dur(r['startTime'], r['endTime'])
        dts = sum(dur(x['start'], x['end']) for x in p['downtimeSegments'])
        gap = span - segmin - dts
        if gap != 0 and not r.get('side'):
            find('YELLOW' if gap > 0 else 'RED', 'timeline', r, 'span', f'{span} = run {segmin} + stops {dts}', f'unexplained {gap} min',
                 'Start-to-end window not fully explained by running + downtime segments' + (' (NO_WORK stops are dropped from plh.downtimeSegments, so a positive gap can be a No Work stop)' if gap > 0 else ' (segments overlap)'))
    else:
        c = dur(r['startTime'], r['endTime'])
        if c != r['durationMin']:
            find('RED', 'duration', r, 'durationMin', c, r['durationMin'], 'durationMin != endTime - startTime'); plain_mismatch.append(r)

# exact / near duplicates
grp = C.defaultdict(list)
for r in R: grp[(r['date'], r['machine'], r['startTime'], r['endTime'], r['status'], r['reason'])].append(r)
dups = [g for g in grp.values() if len(g) > 1]
for g in dups:
    for r in g[1:]:
        find('RED', 'duplicates', r, 'record', 'one entry', f"same as {g[0]['id']} ({r['startTime']}-{r['endTime']} {r['status']} {r['reason']})", 'Identical machine/date/time/status/reason - likely double entry')
# PLH duplicates: same machine/date/product/weight
pg = C.defaultdict(list)
for r in R:
    p = r.get('plh')
    if p and p.get('weightLbs'): pg[(r['date'], r['machine'], (p.get('productId') or p.get('product')), round(p['weightLbs'], 3))].append(r)
plh_dups = [g for g in pg.values() if len(g) > 1]
for g in plh_dups:
    for r in g[1:]:
        find('RED', 'duplicates', r, 'plh.weightLbs', 'unique production entry', f"same weight {r['plh']['weightLbs']} lbs as {g[0]['id']} ({g[0]['startTime']}-{g[0]['endTime']} vs {r['startTime']}-{r['endTime']})", 'Same product, machine, day and exact weight - possible duplicated production')

# overlap of occupied minutes per machine/day
def busy(r):
    p = r.get('plh')
    if r['status'] == 'RUNNING' and p and p.get('segments'):
        return [(tm(s['start']), tm(s['end'])) for s in p['segments'] if dur(s['start'], s['end']) > 0]
    return [(tm(r['startTime']), tm(r['endTime']))]
bymd = C.defaultdict(list)
for r in R: bymd[(r['date'], r['machine'])].append(r)
overlap_pairs = []
for (dt, m), rs in bymd.items():
    iv = [(a, b, r) for r in rs for a, b in busy(r) if b > a]
    iv.sort(key=lambda x: x[0])
    for i in range(len(iv)):
        for j in range(i + 1, len(iv)):
            if iv[j][0] >= iv[i][1]: break
            a, b, r1 = iv[i]; c, e, r2 = iv[j]
            if r1['id'] == r2['id']: continue
            ov = min(b, e) - c
            if ov > 0: overlap_pairs.append((r1, r2, ov))
seenp = set()
for r1, r2, ov in overlap_pairs:
    k = tuple(sorted((r1['id'], r2['id'])))
    if k in seenp: continue
    seenp.add(k)
    find('RED', 'overlap', r2, 'time', f"no overlap with {r1['id']} ({r1['status']} {r1['startTime']}-{r1['endTime']})", f"{r2['status']} {r2['startTime']}-{r2['endTime']}, overlap {ov} min",
         'Same machine counted in two states at the same time - minutes double-counted in totals')

# ---------------- PART 5/6/7: PLH, labour, downtime ----------------
def run_labour(segments, dts, paid_left=30, extra=0):
    segs = sorted([s for s in segments if s.get('start')], key=lambda s: tm(s['start']))
    def emp_at(t):
        best = None
        for sg in segs:
            if tm(sg['start']) <= t: best = sg
        sg = best or (segs[0] if segs else None)
        return (float(sg.get('employees') or 0)) if sg else 1
    net = sum(dur(s['start'], s['end']) * float(s.get('employees') or 0) for s in segs)
    gross = net
    for x in sorted(dts, key=lambda x: tm(x['start'])):
        if x.get('status') == 'NO_WORK': continue
        dd = dur(x['start'], x['end'])
        if x.get('status') == 'BREAK':
            paid = max(0, min(dd, paid_left)); paid_left -= paid; dd = paid
        st = tm(x['start']); en = st + dd
        cuts = sorted(tm(sg['start']) for sg in segs if st < tm(sg['start']) < en)
        frm = st
        for t in cuts + [en]: gross += (t - frm) * emp_at(frm); frm = t
    gross += float(extra or 0)
    return net, gross, paid_left

P = [r for r in R if r.get('plh')]
# paid-break allocation exactly as applyPaidBreakRule (grouped by date|machine, ordered by start)
elig = lambda r: r['status'] == 'RUNNING' and r['plh'].get('segments') and isinstance(r['plh'].get('downtimeSegments'), list) \
    and not any(not x.get('status') for x in r['plh']['downtimeSegments']) and not any(not s.get('start') or not s.get('end') for s in r['plh']['segments'])
app_gross = {}
g2 = C.defaultdict(list)
for r in P:
    if elig(r): g2[(r['date'], r['machine'])].append(r)
for k, lst in g2.items():
    lst.sort(key=lambda r: tm(r['startTime'])); left = 30
    for r in lst:
        net, gross, left = run_labour(r['plh']['segments'], r['plh']['downtimeSegments'], left, r['plh'].get('garbageMin'))
        app_gross[r['id']] = gross

plh_rows = []
for r in P:
    p = r['plh']; w = p.get('weightLbs') or 0
    segs = p.get('segments') or []
    net_min = sum(dur(s['start'], s['end']) * float(s.get('employees') or 0) for s in segs)
    _, gross_full, _ = run_labour(segs, p['downtimeSegments'], 10 ** 9, p.get('garbageMin'))  # if every break minute were paid
    gross_app = app_gross.get(r['id'])
    gH, nH = p['grossLaborHours'], p['netLaborHours']
    row = dict(id=r['id'], date=r['date'], machine=r['machine'], side=bool(r.get('side')), product=p.get('product') or r.get('product'),
               productId=p.get('productId'), weight=w, qty=p.get('quantity') or 0, gross_h=gH, net_h=nH, grossPLH=p['grossPLH'], netPLH=p['netPLH'],
               calc_net_h=net_min / 60, calc_gross_h_app_rule=(gross_app / 60 if gross_app is not None else None), garbageMin=p.get('garbageMin') or 0)
    # PLH math
    exp_g = w / gH if (w > 0 and gH and gH > 0) else None
    exp_n = w / nH if (w > 0 and nH and nH > 0) else None
    row['calc_grossPLH'] = exp_g; row['calc_netPLH'] = exp_n
    if not close(exp_g, p['grossPLH'], 1e-9):
        find('RED', 'PLH', r, 'plh.grossPLH', exp_g if exp_g is not None else 'NOT CALCULABLE', p['grossPLH'], f'weight {w} / gross hours {gH}')
    if not close(exp_n, p['netPLH'], 1e-9):
        find('RED', 'PLH', r, 'plh.netPLH', exp_n if exp_n is not None else 'NOT CALCULABLE', p['netPLH'], f'weight {w} / net hours {nH}')
    if w <= 0 and p['grossPLH'] is not None: find('RED', 'PLH', r, 'plh.grossPLH', 'null (no weight)', p['grossPLH'], 'PLH invented for zero weight')
    # labour
    if abs(net_min / 60 - nH) > 1e-9:
        find('RED', 'labour', r, 'plh.netLaborHours', round(net_min / 60, 6), nH, f'Sum(segment minutes x employees)/60 = {net_min} min')
    if gross_app is not None and abs(gross_app / 60 - gH) > 1e-9:
        find('RED', 'labour', r, 'plh.grossLaborHours', round(gross_app / 60, 6), gH, f'App gross rule (net + paid stop minutes x crew + garbage) = {gross_app:.1f} min; stored differs by {gH*60-gross_app:+.1f} min')
    if gross_app is None:
        find('YELLOW', 'labour', r, 'plh.grossLaborHours', 'recomputable', gH, 'Record not eligible for gross recalculation (missing segment end/status); gross cannot be independently verified')
    if gH + 1e-9 < nH: find('RED', 'labour', r, 'plh.grossLaborHours', f'>= net {nH}', gH, 'Gross labour below net labour')
    row['unpaid_break_min_excluded'] = (gross_full - (gross_app if gross_app is not None else gross_full))
    # segments
    for s in segs:
        if s.get('employees') in (None, '') : find('RED', 'segments', r, 'segments.employees', 'number', s.get('employees'), 'Missing headcount')
        elif float(s['employees']) <= 0 and dur(s['start'], s['end']) > 0:
            find('YELLOW', 'segments', r, 'segments.employees', '>=1', s['employees'], f"Running segment {s['start']}-{s['end']} with 0 employees counts 0 labour")
        if s.get('end') and tm(s['end']) < tm(s['start']): find('RED', 'segments', r, 'segments', 'end>=start', f"{s['start']}-{s['end']}", 'Segment ends before it starts')
        if not s.get('end'): find('RED', 'segments', r, 'segments.end', 'HH:MM', None, 'Open segment')
        names = s.get('names') or []
        if names and len(names) != int(float(s.get('employees') or 0)) and dur(s['start'], s['end']) > 0:
            find('YELLOW', 'segments', r, 'segments.names', f"{s.get('employees')} names", f'{len(names)} names', f"Headcount used for labour ({s.get('employees')}) differs from named crew ({len(names)}) on {s['start']}-{s['end']}")
    ss = sorted([s for s in segs if dur(s['start'], s['end']) > 0], key=lambda s: tm(s['start']))
    for a, b in zip(ss, ss[1:]):
        if tm(b['start']) < tm(a['end']): find('RED', 'segments', r, 'segments', 'no overlap', f"{a['start']}-{a['end']} & {b['start']}-{b['end']}", 'Overlapping labour segments double-count labour')
    for x in p['downtimeSegments']:
        for s in ss:
            ov = min(tm(x['end']), tm(s['end'])) - max(tm(x['start']), tm(s['start']))
            if ov > 0: find('RED', 'downtime', r, 'downtimeSegments', 'no overlap with running', f"{x['status']} {x['start']}-{x['end']} overlaps run {s['start']}-{s['end']} by {ov} min", 'Stop overlaps running time: labour counted twice in gross')
    dd = sorted(p['downtimeSegments'], key=lambda x: tm(x['start']))
    for a, b in zip(dd, dd[1:]):
        if tm(b['start']) < tm(a['end']): find('RED', 'downtime', r, 'downtimeSegments', 'no overlap', f"{a['start']}-{a['end']} & {b['start']}-{b['end']}", 'Overlapping downtime segments')
    # downtime segment -> matching status record?
    if not r.get('side'):
        for x in p['downtimeSegments']:
            if dur(x['start'], x['end']) <= 0: continue
            match = [o for o in bymd[(r['date'], r['machine'])] if o['status'] == x['status'] and o['startTime'] == x['start'] and o['endTime'] == x['end']]
            if not match:
                find('YELLOW', 'downtime', r, 'downtimeSegments', f"a {x['status']} record {x['start']}-{x['end']}", 'none', 'Stop inside a run has no matching status record (missing from downtime totals, or record later edited)')
    # notes text consistency
    m = re.search(r'PLH: (\d+) gross(?: / (\d+) net)?', r.get('notes') or '')
    if m and p['grossPLH'] is not None and int(m.group(1)) != round(p['grossPLH']):
        find('YELLOW', 'notes', r, 'notes', f"PLH: {round(p['grossPLH'])} gross", m.group(0), 'Generated note text is stale vs stored PLH')
    if m and p['grossPLH'] is None: find('YELLOW', 'notes', r, 'notes', 'no PLH text', m.group(0), 'Note shows PLH but no PLH stored')
    # machine/product attribution
    if p.get('machine') and p['machine'] != r['machine']: find('RED', 'attribution', r, 'plh.machine', r['machine'], p['machine'], 'PLH machine differs from record machine')
    if (p.get('product') or '') != (r.get('product') or '') and not r.get('side'):
        find('YELLOW', 'attribution', r, 'plh.product', r.get('product'), p.get('product'), 'PLH product differs from record product')
    # weight / quantity sanity
    if w > 0 and not (p.get('quantity') or 0): find('YELLOW', 'weight', r, 'plh.quantity', '>0', p.get('quantity'), 'Weight entered without quantity')
    if (p.get('quantity') or 0) > 0 and w <= 0: find('YELLOW', 'weight', r, 'plh.weightLbs', '>0', w, 'Quantity entered without weight')
    mm = re.search(r'(\d+(?:\.\d+)?)\s*(?:LB|Lb|lb)s?\b', p.get('product') or '')
    if w > 0 and (p.get('quantity') or 0) > 0 and mm:
        nominal = float(mm.group(1)); per = w / p['quantity']
        row['lb_per_unit'] = per; row['nominal'] = nominal
        ratio = per / nominal
        if ratio < 0.5 or ratio > 6 or (ratio > 1.5 and abs(ratio - round(ratio)) > 0.25):
            find('YELLOW', 'weight', r, 'plh.weightLbs', f'~{nominal} lb x n per unit (name says {mm.group(0)})', f'{per:.2f} lb per unit ({w} lbs / {p["quantity"]})', 'Weight per unit inconsistent with product pack size - check units/quantity')
    if w > 0 and gH > 0 and not r.get('side'):
        g = w / gH
        if g > 2000 or g < 20: find('YELLOW', 'PLH', r, 'plh.grossPLH', '20-2000 plausible', round(g, 1), 'Implausible PLH magnitude - check weight or labour')
    if w > 0 and gH == 0: find('RED', 'PLH', r, 'plh.grossLaborHours', '>0', 0, 'Weight with zero labour: PLH NOT CALCULABLE')
    plh_rows.append(row)

# --- cross-machine employee double counting (names) ---
name_iv = C.defaultdict(list)
for r in P:
    for s in r['plh']['segments']:
        if dur(s['start'], s['end']) > 0:
            for n in s.get('names') or []: name_iv[(r['date'], n)].append((tm(s['start']), tm(s['end']), r))
emp_dbl = []
for (dt, n), iv in name_iv.items():
    iv.sort(key=lambda x: x[0])
    for i in range(len(iv)):
        for j in range(i + 1, len(iv)):
            if iv[j][0] >= iv[i][1]: break
            if iv[i][2]['id'] != iv[j][2]['id']:
                ov = min(iv[i][1], iv[j][1]) - iv[j][0]
                emp_dbl.append((dt, n, iv[i][2], iv[j][2], ov))
for dt, n, a, b, ov in emp_dbl:
    find('RED', 'labour-allocation', b, 'segments.names', f'{n} on one station at a time', f"{n} on {a['machine']} ({a['id']}) and {b['machine']} ({b['id']}) for {ov} min", 'Same named person counted in labour on two runs at once')
names_cov = sum(1 for r in P for s in r['plh']['segments'] if s.get('names'))
segs_total = sum(1 for r in P for s in r['plh']['segments'] if dur(s['start'], s['end']) > 0)

# ---------------- PART 4: totals ----------------
done = [x for x in plh_rows if x['weight'] > 0]
inc = [x for x in plh_rows if x['weight'] <= 0]
def agg(rows, key):
    t = C.defaultdict(lambda: dict(lbs=0.0, qty=0, gross_h=0.0, net_h=0.0, n=0))
    for x in rows:
        a = t[key(x)]; a['lbs'] += x['weight']; a['qty'] += x['qty']; a['gross_h'] += x['gross_h']; a['net_h'] += x['net_h']; a['n'] += 1
    for a in t.values():
        a['grossPLH'] = a['lbs'] / a['gross_h'] if a['gross_h'] > 0 else None
        a['netPLH'] = a['lbs'] / a['net_h'] if a['net_h'] > 0 else None
    return dict(sorted(t.items()))
iso_week = lambda x: '%d-W%02d' % DT.date.fromisoformat(x['date']).isocalendar()[:2]
lines_done = [x for x in done if not x['side']]
totals = dict(
    lines_all=agg(lines_done, lambda x: 'Lines (V1-V3 + Manual Pack)')['Lines (V1-V3 + Manual Pack)'],
    by_machine=agg(done, lambda x: x['machine']),
    by_week=agg(lines_done, iso_week), by_month=agg(lines_done, lambda x: x['date'][:7]),
    by_date=agg(lines_done, lambda x: x['date']), by_product=agg(lines_done, lambda x: x['product']),
    incomplete_by_machine={k: v['n'] for k, v in agg(inc, lambda x: x['machine']).items()},
    incomplete_hours_by_machine={k: round(v['gross_h'], 2) for k, v in agg(inc, lambda x: x['machine']).items()},
)
# averaging-trap demo: mean of machine PLH vs pooled
mp = [v['grossPLH'] for k, v in totals['by_machine'].items() if k in LINES and v['grossPLH']]
totals['avg_of_machine_grossPLH_WRONG'] = sum(mp) / len(mp)
# side machine weight that may duplicate Variovac weight
side_rows = [x for x in plh_rows if x['side']]
totals['side'] = side_rows

# ---------------- PART 8/9: daily reports ----------------
def eff_label(r):
    if r.get('reason') and re.search('other', r['reason'], re.I) and (r.get('notes') or '').strip(): return r['notes'].strip()
    return RENAMES.get(r['reason'], r['reason'])
def day_totals(recs):
    t = dict(RUNNING=0, CHANGEOVER=0, WAITING=0, NO_WORK=0, BREAK=0, PLANNED=0, upstream=0, internal=0)
    for r in recs:
        if r['status'] != 'BREAK': t[r['status']] += r['durationMin']
        if r['status'] == 'WAITING': t['upstream' if r['classification'] == 'upstream' else 'internal'] += r['durationMin']
    by = C.defaultdict(list)
    for r in recs:
        if r['status'] == 'BREAK':
            s, e = tm(r['startTime']), tm(r['endTime']); by[r['date']].append([s, max(s, e)])
    tot = 0
    for ivs in by.values():
        ivs.sort(); cur = None
        for a, b in ivs:
            if cur and a <= cur[1]: cur[1] = max(cur[1], b)
            else:
                if cur: tot += cur[1] - cur[0]
                cur = [a, b]
        if cur: tot += cur[1] - cur[0]
    t['BREAK'] = tot; t['BREAK_machine_minutes'] = sum(r['durationMin'] for r in recs if r['status'] == 'BREAK')
    return t
def mach_tot(recs, m):
    t = dict(RUNNING=0, CHANGEOVER=0, WAITING=0, NO_WORK=0, BREAK=0, PLANNED=0, upstream=0, internal=0)
    for r in recs:
        if r['machine'] != m: continue
        t[r['status']] += r['durationMin']
        if r['status'] == 'WAITING': t['upstream' if r['classification'] == 'upstream' else 'internal'] += r['durationMin']
    return t
def bottl(recs):
    mp = C.defaultdict(int)
    for r in recs:
        if r['status'] in ('WAITING', 'CHANGEOVER'): mp[eff_label(r) or r['status']] += r['durationMin']
    return sorted(mp.items(), key=lambda kv: -kv[1])  # JS sort stable on insertion order for ties
def mmw(recs):
    best, bm = None, -1
    for m in LINES:
        v = sum(r['durationMin'] for r in recs if r['machine'] == m and r['status'] == 'WAITING')
        if v > bm: best, bm = m, v
    return best, bm
def fmt(m):
    m = round(m); h, mm = divmod(m, 60); return f'{h}h {mm}m' if h else f'{mm}m'
rep_rows = []
for rep in sorted(REPORTS, key=lambda x: x['date']):
    dt = rep['date']
    now = [r for r in R if r['date'] == dt and not r.get('side')]
    asof = [r for r in now if r['createdAt'] <= rep['generatedAt']]
    later = [r for r in now if r['createdAt'] > rep['generatedAt']]
    side_day = [r for r in R if r['date'] == dt and r.get('side')]
    tnow = day_totals(now); tas = day_totals(asof)
    issues = []
    for k in ('RUNNING', 'CHANGEOVER', 'WAITING', 'NO_WORK', 'BREAK', 'PLANNED', 'upstream', 'internal'):
        sv = rep['totals'].get(k)
        if sv is None:
            if tnow[k]: issues.append(f'totals.{k} missing (current data has {tnow[k]})')
            continue
        if sv != tnow[k]: issues.append(f'totals.{k}: saved {sv}, records now {tnow[k]}' + (f', as-of-generation {tas[k]}' if tas[k] != tnow[k] else ''))
    for m in LINES:
        cur = mach_tot(now, m); sv = rep['perMachine'].get(m)
        if sv is None:
            if any(cur[k] for k in ('RUNNING', 'WAITING', 'CHANGEOVER', 'NO_WORK', 'BREAK', 'PLANNED')): issues.append(f'perMachine.{m} missing but has {sum(cur[k] for k in ("RUNNING","WAITING","CHANGEOVER","NO_WORK","BREAK","PLANNED"))} min of records')
            continue
        for k, v in sv.items():
            if cur.get(k, 0) != v: issues.append(f'perMachine.{m}.{k}: saved {v}, records now {cur.get(k,0)}')
    # internal consistency of saved report
    for k in ('RUNNING', 'CHANGEOVER', 'WAITING', 'NO_WORK'):
        s = sum(v.get(k, 0) for v in rep['perMachine'].values())
        if s != rep['totals'].get(k, 0): issues.append(f'saved totals.{k} {rep["totals"].get(k)} != sum perMachine {s}')
    if rep['totals']['upstream'] + rep['totals']['internal'] != rep['totals']['WAITING']: issues.append('saved upstream+internal != WAITING')
    if rep['recordCount'] != len(now): issues.append(f'recordCount: saved {rep["recordCount"]}, now {len(now)} (as-of {len(asof)}, added later {len(later)})')
    bn = bottl(now)[:5]
    if [list(x) for x in bn] != rep['bottlenecks']: issues.append(f'bottlenecks differ: saved {rep["bottlenecks"][:3]} now {bn[:3]}')
    mb, mmin = mmw(now)
    if rep['machineMostAffected'] != {'machine': mb, 'minutes': mmin}: issues.append(f'machineMostAffected: saved {rep["machineMostAffected"]}, now {mb} {mmin}')
    # observation must match saved numbers
    sb = rep['bottlenecks']
    if sb:
        if fmt(sb[0][1]) not in rep['observation'] or sb[0][0].lower() not in rep['observation']: issues.append('observation does not quote saved top bottleneck')
        ma = rep['machineMostAffected']
        if ma['minutes'] > 0 and (ma['machine'] not in rep['observation'] or fmt(ma['minutes']) not in rep['observation']): issues.append('observation machine/minutes differ from machineMostAffected')
    # most affected by total lost time (waiting + changeover) vs waiting only
    lost = {m: sum(r['durationMin'] for r in now if r['machine'] == m and r['status'] in ('WAITING', 'CHANGEOVER')) for m in LINES}
    ml = max(lost, key=lambda m: lost[m])
    alt = f'by waiting+changeover the most affected is {ml} ({lost[ml]} min)' if ml != mb else ''
    # shift
    if now:
        ss = min(r['startTime'] for r in now); se = max(r['endTime'] for r in now)
        if (ss, se) != (rep['shiftStart'], rep['shiftEnd']): issues.append(f'shift window: saved {rep["shiftStart"]}-{rep["shiftEnd"]}, records now {ss}-{se}')
    gen = DT.datetime.fromtimestamp(rep['generatedAt'] / 1000, DT.timezone.utc)
    rep_rows.append(dict(date=dt, generated=gen.isoformat(), saved_recordCount=rep['recordCount'], records_now=len(now), added_after=len(later),
                         side_records_excluded=len(side_day), perMachine=list(rep['perMachine'].keys()), issues=issues, alt_most_affected=alt,
                         break_clock=tnow['BREAK'], break_machine=tnow['BREAK_machine_minutes'], status='GREEN' if not issues else 'RED'))
    for i in issues: find('RED' if not i.startswith('shift window') else 'YELLOW', 'daily-report', {'id': 'report', 'date': dt}, i.split(':')[0], '', i, 'Saved report snapshot does not match underlying records')

# per-day clock coverage per machine (gaps) for report dates
cover = []
for dt in sorted({r['date'] for r in R}):
    for m in LINES:
        rs = [r for r in R if r['date'] == dt and r['machine'] == m]
        if not rs: continue
        mins = set()
        for r in rs:
            for a, b in busy(r): mins.update(range(a, b))
            p = r.get('plh')
            if p and r['status'] == 'RUNNING':
                for x in p['downtimeSegments']: pass
        lo = min(tm(r['startTime']) for r in rs); hi = max(tm(r['endTime']) for r in rs)
        accounted = sum(r['durationMin'] for r in rs)
        cover.append(dict(date=dt, machine=m, first=lo, last=hi, span=hi - lo, distinct_minutes=len(mins), summed_minutes=accounted, gap=hi - lo - len(mins), double=accounted - len(mins)))

json.dump(dict(findings=F, plh_rows=plh_rows, totals=totals, reports=rep_rows, coverage=cover, dups=len(dups), plh_dups=len(plh_dups),
               emp_dbl=len(emp_dbl), names_cov=names_cov, segs_total=segs_total, overlap_pairs=len(seenp), plain_mismatch=len(plain_mismatch)),
          open(OUT, 'w'), indent=1, default=str)
sev = C.Counter((f['severity'], f['area']) for f in F)
for k, v in sorted(sev.items()): print(k, v)
print('PLH done', len(done), 'incomplete', len(inc), 'dups', len(dups), 'plh_dups', len(plh_dups), 'overlaps', len(seenp), 'emp dbl', len(emp_dbl), 'names segs', names_cov, '/', segs_total)
print('reports RED', sum(1 for x in rep_rows if x['issues']), 'of', len(rep_rows))

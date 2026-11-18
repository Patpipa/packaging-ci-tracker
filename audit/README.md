# Audit tools (read-only)

- `AUDIT_REPORT.md`: the audit report.
- `audit.py`: the independent recalculation in Python. It only reads the export.
  `python3 -I audit/audit.py <export.json> <out.json>` (needs `consts.json` next to it; the reason lists come from `index.html`).
- `apptests.js`: runs the real `index.html` functions headless. The network is blocked, Firebase never loads and saves are stubbed, so nothing can be written anywhere.
  `node audit/apptests.js $PWD/index.html <export.json> <out.json>` (needs Playwright with Chromium).
- `findings.csv`: every finding, with record ID, date, machine, field, expected, actual and explanation.
- `plh_verification.csv`: one row per PLH run, stored vs recalculated.
- `daily_report_reconciliation.csv`: each saved report vs its records.
- `totals_*.csv`: independent totals by machine, date, ISO week, month and product.

#!/usr/bin/env python3
"""Compare a private computed snapshot with a supplied Excel reference.
Requires an identical scope; does not write a workbook or database.
"""
import argparse,json,subprocess
from pathlib import Path
from decimal import Decimal,ROUND_HALF_UP
from openpyxl import load_workbook
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--result',required=True,type=Path);p.add_argument('--workbook',required=True,type=Path);a=p.parse_args()
root=Path(subprocess.check_output(['git','rev-parse','--show-toplevel'],text=True).strip()).resolve()
for path in [a.result,a.workbook]:
 if path.resolve().is_relative_to(root):raise SystemExit('Private inputs must be outside the checkout')
actual=json.loads(a.result.read_text());s=load_workbook(a.workbook,data_only=True)['Licences&Presta']
for key,cell in [('population','D3'),('meters','D4')]:
 if actual['input']['dimensions'][key]!=s[cell].value:raise SystemExit(f'Scope mismatch: {key}')
for key,cell in [('investment','I3'),('annual','I2'),('tco5y','F5')]:
 if s[cell].value is None:raise SystemExit(f'Missing cached source total: {cell}')
 difference=(Decimal(str(actual['result']['summary'][key]))-Decimal(str(s[cell].value))).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
 print(f'{key}: difference {difference} CHF')
 if difference:raise SystemExit(f'Excel parity failed: {key}')
print('Exact agreement at CHF 0.01 for this supplied scope. No broader parity is implied.')

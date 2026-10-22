#!/usr/bin/env python3
"""Prepare an inactive private catalog using the supplied grid and verified VBA.
Requires openpyxl and oletools. Reads macros as text; never executes a workbook.
No database writes. Output must remain outside this public checkout.
"""
import argparse,hashlib,json,re,subprocess
from pathlib import Path
from openpyxl import load_workbook
from oletools.olevba import VBA_Parser
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--source',required=True,type=Path);p.add_argument('--catalog',required=True,type=Path)
p.add_argument('--version',required=True);p.add_argument('--output',required=True,type=Path)
a=p.parse_args();root=Path(subprocess.check_output(['git','rev-parse','--show-toplevel'],text=True).strip()).resolve()
for path in [a.source,a.catalog,a.output]:
 if path.resolve().is_relative_to(root):raise SystemExit('Private paths must be outside the checkout')
vba=VBA_Parser(str(a.source));macros={name:text for _,_,name,text in vba.extract_macros()};text=macros['Funktionen.bas']
for pattern in ['nLizenzwert = nLizenzwert / Diff1 * Diff2','nLizenzwert = Int((nLizenzwert + 50) / 100) * 100','If InStr(1, ";501;502;", ";" & nSWId & ";") > 0 Then']:
 if pattern not in text:raise SystemExit('Unrecognized source algorithm; manual review required')
minimum=int(re.search(r'If Vorgaben.Messstellen_WA < (\d+) Then',text)[1])
w=load_workbook(a.source,data_only=True,keep_vba=True);s=w['PL_Versorger']
discount=s['K5'].value
if not isinstance(discount,(int,float)):raise SystemExit('Missing source municipality multiplier')
raw=json.loads(a.catalog.read_text());items=[row.get('content',row) for row in (raw.get('items',[]) if isinstance(raw,dict) else raw)]
for item in items:
 if item['vendor']!='innosolv':continue
 item['catalog_version']=a.version
 if item['product']!='Versorger' or item['item_code'] not in ['501','502','533']:continue
 row=next(r for r in range(1,s.max_row+1) if str(s.cell(r,1).value)==item['item_code'])
 tiers=[{'up_to':s.cell(1,c).value,'value':s.cell(row,c).value} for c in range(14,31)]
 if any(not isinstance(t[k],(int,float)) for t in tiers for k in ['up_to','value']):raise SystemExit('Missing cached source grid')
 item['pricing_rule']={'kind':'linear_rounded','basis':'meters','round_to':100,'tiers':tiers,'below_first':'hold','quantity_round_to':100,'zero_is_free':True}
 if item['item_code'] in ['501','502']:item['pricing_rule'].update(minimum_basis=minimum,value_multiplier=discount)
 item['source']=f'{a.source.name}:PL_Versorger:{row}; VBA Funktionen.bas:Preise_Modul/Preise_Calc (Gemeinde)'
 item['source_sha256']=hashlib.sha256(a.source.read_bytes()).hexdigest()
 item['source_grid_note']='Cached source grid; municipality context verified in VBA. Main-module usage minimum and municipality reduction applied before rounding.'
a.output.write_text(json.dumps({'version':a.version,'effective_from':'2027-01-01','items':items},ensure_ascii=False,indent=2)+'\n')
print('Prepared private catalog. Only 501, 502 and 533 gain verified automatic pricing. No database writes.')

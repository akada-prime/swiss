// Shared commercial (PV-only) taxonomy for all Prime Communes presentations.
// No price computation, catalog data, PA, margin or private references.
export const offerPriceGroups = Object.freeze([
  ['licenses','Licences et support','Lizenzen und Support'],
  ['implementation','Mise en œuvre','Implementierung'],
  ['migration','Reprise de données','Datenübernahme'],
  ['management','Gestion de projet','Projektleitung'],
  ['training','Formation et aide au démarrage','Schulung und Unterstützung beim Start'],
  ['otherServices','Prestations complémentaires','Zusätzliche Leistungen'],
  ['database','Bases de données et technique','Datenbanken und Technik'],
  ['primePartners','Prime et partenaires','Prime und Partner'],
  ['lcm','LCM (mises à jour annualisées)','LCM (annualisierte Aktualisierungen)'],
  ['hosting','Hébergement','Hosting']
]);

export function commercialPriceGroup(line) {
  if (line.category === 'hosting') return 'hosting';
  if (line.family === 'lcm') return 'lcm';
  if (line.software || ['innosolv', 'pce', 'abacus'].includes(line.family)) return 'licenses';
  if (line.family === 'technique') return 'database';
  if (['prime','partenaires'].includes(line.family)) return 'primePartners';
  if (line.family === 'prestations_module') return 'implementation';
  if (line.family === 'prestations') {
    const code = String(line.item_code ?? '').toLowerCase();
    if (code === 'reprise') return 'migration';
    if (code === 'projet') return 'management';
    if (code === 'formation' || code === 'demarrage') return 'training';
    if (code === 'installation' || code === 'technique' || code === 'interfaces' ||
      code.startsWith('pce-')) return 'implementation';
    return 'otherServices';
  }
  return 'otherServices';
}

export function publicPriceBreakdown(lines) {
  const values = new Map(offerPriceGroups.map(([key]) => [key, { investment:0, annual:0 }]));
  for (const line of lines) {
    const amount=values.get(commercialPriceGroup(line));
    amount.investment += line.investment_pv ?? 0;
    amount.annual += line.annual_pv ?? 0;
  }
  return offerPriceGroups.map(([key]) => ({ key, ...values.get(key) }))
    .filter(x => Math.abs(x.investment) > .005 || Math.abs(x.annual) > .005);
}

// Additional public allowlist: labels and selling totals only, no raw engine rows.
export function publicCostDetails(lines) {
  const names={innosolv:'innosolvcity',abacus:'Abacus',pce:'ProConcept',prime:'Prime',partenaires:'Partenaires'};
  const groups=new Map();
  for (const line of lines) {
    const key=(['prime','partenaires'].includes(line.family)&&line.category==='license')?'licenses':commercialPriceGroup(line);
    const base=offerPriceGroups.find(row=>row[0]===key);
    let fr=base[1],de=base[2];
    if (key==='licenses') fr=de=names[line.family]||fr;
    else if (key==='implementation') {
      const vendor=line.family==='prestations_module' ? String(line.item_code??'').split('/')[0] :
        String(line.item_code??'').startsWith('pce-')?'pce':String(line.item_code??'').startsWith('abacus-')?'abacus':null;
      if(names[vendor]) {fr='Mise en œuvre · '+names[vendor];de='Implementierung · '+names[vendor];}
    } else if (['otherServices','primePartners'].includes(key)) {
      const text=String(line.label??'').trim();
      if(text && text!==String(line.item_code??'') && !/[<>\/]/.test(text)) fr=de=text.slice(0,160);
      else if(key==='primePartners') fr=de=names[line.family]||fr;
    }
    const id=key+'\0'+fr+'\0'+de;
    if(!groups.has(id))groups.set(id,{key,label_fr:fr,label_de:de,investment:0,annual:0});
    const row=groups.get(id);row.investment+=line.investment_pv??0;row.annual+=line.annual_pv??0;
  }
  return [...groups.values()];
}

export function annualComponents(rows) {
  const values={solutions:0,lcm:0,hosting:0};
  for(const row of rows)values[row.key==='hosting'?'hosting':row.key==='lcm'?'lcm':'solutions']+=row.annual??0;
  return values;
}

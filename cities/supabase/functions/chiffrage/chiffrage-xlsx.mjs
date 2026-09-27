import { deflateRawSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

// Standalone XLSX writer for the authenticated function. It never needs a
// browser bundle, a static price file, or a deployment-time spreadsheet.
const xml = value => String(value ?? '').replace(/&/g, '&amp;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');
const col = index => {
  let number = index + 1, result = '';
  while (number) { number--; result = String.fromCharCode(65 + number % 26) + result;
    number = Math.floor(number / 26); }
  return result;
};
const cell = (value, row, index) => {
  if (value == null) return '';
  const ref = `${col(index)}${row}`;
  if (typeof value === 'number' && Number.isFinite(value))
    return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`;
};
const sheet = rows => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetData>` +
  rows.map((values, index) => `<row r="${index + 1}">` +
    values.map((value, column) => cell(value, index + 1, column)).join('') + '</row>')
    .join('') + '</sheetData></worksheet>';

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
function crc32(data) {
  let crc = -1;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}
function zip(files) {
  const pieces = [], directory = [];
  let offset = 0;
  for (const [name, body] of Object.entries(files)) {
    const path = Buffer.from(name), source = Buffer.from(body), compressed = deflateRawSync(source);
    const checksum = crc32(source);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 6); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(checksum, 14); local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(source.length, 22); local.writeUInt16LE(path.length, 26);
    pieces.push(local, path, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 8);
    central.writeUInt16LE(8, 10); central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(source.length, 24);
    central.writeUInt16LE(path.length, 28); central.writeUInt32LE(offset, 42);
    directory.push(central, path);
    offset += local.length + path.length + compressed.length;
  }
  const centralBytes = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...pieces, centralBytes, end]);
}

export function exportQuoteXlsx(quote) {
  const { input, result, catalog_versions: versions, created_at: revisionDate } = quote.snapshot;
  const { summary, lines } = result;
  const date = revisionDate ?? quote.updated_at;
  const versionText = Object.entries(versions).map(([vendor, id]) => `${vendor}: ${id}`).join(' | ');
  const totals = new Map();
  for (const line of lines) {
    const previous = totals.get(line.family) ?? [0, 0, 0, 0];
    previous[0] += line.investment_pv ?? 0; previous[1] += line.annual_pv ?? 0;
    previous[2] += line.investment_pa ?? 0; previous[3] += line.annual_pa ?? 0;
    totals.set(line.family, previous);
  }
  const resume = [
    ['Chiffrage Prime Communes', quote.title], ['Commune', input.name],
    ['OFS', input.bfs_id], ['Canton', input.canton],
    ['Population', input.dimensions.population], ['Compteurs', input.dimensions.meters],
    ['Taxes', input.dimensions.taxes], ['Date de calcul', date],
    ['Révision', quote.snapshot.revision], ['Version tarifaire', versionText],
    ['Investissement', summary.investment], ['Coût annuel dès N+1', summary.annual],
    ['TCO 5 ans hors LCM', summary.tco5y_excluding_lcm],
    ['LCM Gold', summary.lcm.gold?.effective_value],
    ['Option Gold 5 ans', summary.lcm.gold?.five_year_option],
    ['LCM Platinium', summary.lcm.platinium?.effective_value],
    ['Option Platinium 5 ans', summary.lcm.platinium?.five_year_option],
    ['Famille', 'Investissement PV', 'Annuel PV', 'Investissement PA', 'Annuel PA', 'Marge connue année 3+']
  ];
  for (const [family, [invPv, annualPv, invPa, annualPa]] of totals)
    resume.push([family, invPv, annualPv, invPa, annualPa, annualPv - annualPa]);
  resume.push(['Marge logicielle année 2', summary.software_margin_year2],
    ['Marge logicielle année 3+', summary.software_margin_year3plus],
    ['Marge logicielle 5 ans', summary.software_margin_5y],
    ['Coûts non renseignés', summary.incomplete_costs.join(', ')]);
  const detail = [[
    'Famille', 'Produit', 'Module', 'Identifiant licence', 'Fournisseur', 'Source', 'Version tarifaire',
    'Dimension', 'Quantité', 'Règle / palier', 'Valeur logiciel', 'Jours',
    'PA investissement', 'PV investissement', 'PA annuel', 'PV annuel',
    'Marge CHF annuelle', 'Marge % annuelle', 'Calcul théorique', 'Override',
    'Valeur retenue', 'Note'
  ]];
  for (const line of lines) {
    const explanation = line.explanation ?? {};
    const override = line.overrides?.pv ?? line.overrides?.investment ?? null;
    const margin = line.annual_pa == null ? null : (line.annual_pv ?? 0) - line.annual_pa;
    detail.push([line.family, line.family, line.label, line.item_code, line.supplier,
      explanation.source, explanation.catalog_version, explanation.basis,
      line.quantity ?? explanation.quantity, explanation.tier_up_to ?? explanation.regime,
      line.license_value, line.selected_days,
      line.investment_pa, line.investment_pv, line.annual_pa, line.annual_pv,
      margin, margin != null && line.annual_pv ? margin / line.annual_pv : null,
      line.calculated_investment ?? line.license_value,
      override, line.investment_pv ?? line.annual_pv, line.note ?? '']);
  }
  const assumptions = [
    ['Hypothèse / source', 'Valeur'], ['Habitants', input.dimensions.population],
    ['Compteurs', input.dimensions.meters], ['Taxes', input.dimensions.taxes],
    ['Employés', input.dimensions.employees], ['SQL users', input.sql?.users],
    ['SQL cores', input.sql?.cores],
    ['Oracle Full', input.oracle?.full], ['Oracle Light', input.oracle?.light],
    ['Date de calcul', date], ['OFS', input.bfs_id],
    ['Source LCM Gold', JSON.stringify(summary.lcm.gold?.source ?? null)],
    ['Source LCM Platinium', JSON.stringify(summary.lcm.platinium?.source ?? null)],
    ...Object.entries(versions).map(([vendor, id]) => [`Version ${vendor}`, id]),
    ['Révision', quote.snapshot.revision], ['Entrées complètes', JSON.stringify(input)],
    ['Résultats complets', JSON.stringify(result)]
  ];
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${[1,2,3].map(n => `<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Résumé" sheetId="1" r:id="rId1"/><sheet name="Détail" sheetId="2" r:id="rId2"/><sheet name="Hypothèses et sources" sheetId="3" r:id="rId3"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${[1,2,3].map(n => `<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/>`).join('')}</Relationships>`,
    'xl/worksheets/sheet1.xml': sheet(resume),
    'xl/worksheets/sheet2.xml': sheet(detail),
    'xl/worksheets/sheet3.xml': sheet(assumptions)
  };
  return zip(files);
}

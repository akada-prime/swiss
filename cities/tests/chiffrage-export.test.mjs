import {inflateRawSync} from 'node:zlib';
import test from 'node:test';
import assert from 'node:assert/strict';
import {exportQuoteXlsx} from '../supabase/functions/chiffrage/chiffrage-xlsx.mjs';
const workbookText=bytes=>{
 let offset=0, result='';
 while(bytes.readUInt32LE(offset)===0x04034b50){
  const size=bytes.readUInt32LE(offset+18),name=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28),start=offset+30+name+extra;
  result+=inflateRawSync(bytes.subarray(start,start+size)).toString('utf8');offset=start+size;
 }
 return result;
};
const quote={title:'Fixture',snapshot:{input:{name:'Fixture',bfs_id:9999,canton:'JU',dimensions:{population:1500,meters:500,taxes:500},commercial:{hiddenCoefficient:'INTERNAL_SENTINEL'},reference:{label:'Fixture reference'}},catalog_versions:{commercial:'fixture'},revision:1,result:{summary:{investment:200,annual:100,tco5y:600,lcm:{},incomplete_costs:[],software_margin_year2:71,software_margin_year3plus:61,software_margin_5y:251},lines:[{family:'innosolv',label:'Fixture licence',item_code:'A',investment_pv:200,annual_pv:100,investment_pa:987654321,annual_pa:987654322}]}}};
test('the default client workbook contains sales prices and scope but no internal columns or complete snapshots',()=>{
 const data=workbookText(exportQuoteXlsx(quote));
 assert.ok(data.includes('Fixture licence'));assert.ok(data.includes('Investissement HT'));
 for(const secret of ['PA investissement','Marge logicielle','Entrées complètes','Résultats complets','INTERNAL_SENTINEL','987654321','987654322'])assert.equal(data.includes(secret),false,secret);
});
test('the separate deliberate internal export retains the full financial control workbook',()=>{
 const data=workbookText(exportQuoteXlsx(quote,{internal:true}));
 for(const secret of ['PA investissement','Marge logicielle','Entrées complètes','INTERNAL_SENTINEL','987654321'])assert.ok(data.includes(secret),secret);
});

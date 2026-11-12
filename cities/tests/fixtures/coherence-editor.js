// Isolated real editor with synthetic API responses. No live quote data or credential.
import {calculateQuote} from '../../app/chiffrage/calculate.js';
import {publicOfferFromSaved} from '../../supabase/functions/chiffrage/client-projection.mjs';
import {offerFigures,offerScope,offerBreakdown} from '../../app/offer/presentation.js';
import {annualOfferBudget} from '../../app/chiffrage/commercial-breakdown.js';
const query=new URLSearchParams(location.search);
document.documentElement.dataset.skin=query.get('skin')||'prime-darkweb';
document.documentElement.lang=query.get('lang')||'fr';
const item=(vendor,item_code,label_fr)=>({vendor,item_code,label_fr,product:vendor==='innosolv'?'Gemeinde':'ERP',default_selected:true,pricing_rule:{kind:'lookup',basis:'population',below_first:'hold',tiers:[{up_to:10000,value:1000}]}});
const catalog={items:[item('innosolv','1','Système de base'),item('abacus','10510.1','Comptabilité financière'),{...item('abacus','92101.202','Portail MyAbacus ESS medium'),billing_mode:'publisher_direct',rate_class:'direct',pricing_rule:{kind:'monthly_per_user',basis:'employees',users_per_unit:.5,monthly_price:1}},{...item('innosolv','104','Centre d’infos web Habitants'),default_selected:false}],parameters:{day_rate:100,publisher_rent:{innosolv:{standard:{pa_rate:.2,pv_rate:.27}},abacus:{standard:{pa_rate:.2,pv_rate:.27},direct:{pa_rate:1,pv_rate:1}}},sql:{suggestion:{kind:'per_population',divisor:300,round_to:1,min:1},core_from_population:10000,user_base:100,price_per_user:20,default_cores:4,price_per_core:null},lcm:[{up_to:10000,gold:30,platinium:40}],configuration_profiles:[{id:'standard',label:'Référence Tolochenaz',default:true,module_days:{'innosolv/Gemeinde/104':0}}],service_presets:{standard:{}},prime_options:[]}};
// Known SQL count avoids dependence on suggestion metadata in this synthetic profile.
catalog.parameters.sql.suggestion={lowerPopulation:0,lowerUsers:1,upperPopulation:10000,upperUsers:20};
const input={bfs_id:5744,name:'Commune de démonstration',canton:'VD',products:['innosolv','abacus'],dimensions:{population:1200,licensedPopulation:1500,meters:500,taxes:500,employees:20,portalUsers:10},reference:{id:'standard'},modules:catalog.items.filter(x=>x.default_selected).map(x=>({vendor:x.vendor,product:x.product,item_code:x.item_code})),moduleServices:catalog.items.filter(x=>x.default_selected).map(x=>({family:'prestations_module',item_code:`${x.vendor}/${x.product}/${x.item_code}`,days:1})),services:[{family:'prestations',item_code:'reprise',label:'Reprise de données',days:15},{family:'prestations',item_code:'formation',label:'Formation',days:4}],projectManagement:{basis:'prime_service_days',percent:9,round_days:1},primeLines:[{family:'prime',category:'license',item_code:'prime-demo',label:'Formules de démonstration',days:2,annual_pv:50},{family:'prime',category:'hosting',item_code:'hosting-demo',label:'Hébergement',investment_pv:100,annual_pv:300}],partners:[],sql:{users:5,override:200},oracle:{full:0,light:0},pce:{finances:false,salaires:false},lcm:{selection:'gold'},hosting:{included:true},investmentDiscount:100,client_options:[]};
let saved={id:'synthetic',title:'Commune de démonstration — Variante de recette',commune_name:input.name,bfs_id:5744,population:1200,canton:'VD',current_revision:1,workflow_stage:0,save_number:0,snapshot:{revision:1,input,catalog_versions:{commercial:'synthetic'},result:calculateQuote(input,catalog)}};
window.SUPABASE_URL='https://synthetic.invalid';
window.PrimeCommunesRuntime={escapeHtml:value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),rows:[{id:5744,name:input.name,canton:'VD'}]};
window.openDrawer=()=>{};
const originalFetch=window.fetch.bind(window);
window.fetch=async(url,options={})=>{
 const u=new URL(url,location.href);
 if(u.hostname==='synthetic.invalid'){
  const action=u.searchParams.get('action');let data;
  if(action==='status')data={authenticated:true};
  else if(action==='catalog')data={catalog,active:{commercial:'synthetic'}};
  else if(action==='list')data=[saved];
  else if(action==='quote')data=structuredClone(saved);
  else if(action==='board')data={version:1,column_titles:['Brouillon','Client','Finale'],quotes:[saved]};
  else if(action==='save'){const body=JSON.parse(options.body);saved.snapshot={...saved.snapshot,input:body.input,result:calculateQuote(body.input,catalog)};saved.current_revision++;saved.save_number++;data={id:saved.id,revision:saved.current_revision,save_number:saved.save_number};}
  else return new Response(JSON.stringify({error:'Fixture action unavailable'}),{status:400});
  return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
 }
 if(u.origin===location.origin)return originalFetch(url,options);
 return new Response('{}',{status:404});
};
if(query.get('surface')==='client'){
 const o=publicOfferFromSaved(saved,catalog),l=(fr,de)=>query.get('lang')==='de'?de:fr,money=n=>`${Math.round(n).toLocaleString('de-CH')} CHF HT`;
 document.getElementById('chiffrageRoot').innerHTML=`<article class="chiffrage-offer"><div class="prime-offer-banner">${offerFigures(o.amounts,{label:l,money,municipal:true,annualBudget:annualOfferBudget(o.amounts,o.annual_breakdown,o.publisher_billing)})}</div><div class="chiffrage-offer-body"><section><h3>${l('Logiciels retenus','Ausgewählte Software')}</h3>${offerScope(o.scope.map(g=>({product:g.product,items:g.items.map(x=>({label:l(x.fr,x.de),section:x.section_fr,included:(x.included??[]).map(y=>({label:y.fr}))}))})),{asset:p=>'public/'+p,label:l})}</section><section><h3>${l('Ce que comprend votre offre','Was Ihr Angebot umfasst')}</h3>${offerBreakdown(o.cost_details.map(x=>({...x,label:l(x.label_fr,x.label_de)})),{label:l,money,publisherRows:o.publisher_billing})}</section></div></article>`;
 await import('../../app/core/navigation.js');
}else await import('../../app/chiffrage/view.js');

document.documentElement.dataset.skin=query.get('skin')||'prime-darkweb';

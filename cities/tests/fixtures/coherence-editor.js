// Isolated real editor with synthetic API responses. No live quote data or credential.
import {calculateQuote} from '../../app/chiffrage/calculate.js';
import {publicOfferFromSaved} from '../../supabase/functions/chiffrage/client-projection.mjs';
import {offerFigures,offerScope,offerBreakdown} from '../../app/offer/presentation.js';
import {annualOfferBudget} from '../../app/chiffrage/commercial-breakdown.js';
const query=new URLSearchParams(location.search);
const {setPreference}=await import('../../app/core/preferences.js?v=20261107-jura-r1');
setPreference('skin',query.get('skin')||'prime-darkweb');
setPreference('language',query.get('lang')||'fr');
let columnTitles=['Brouillon','Client','Finale'];
document.documentElement.dataset.skin=query.get('skin')||'prime-darkweb';
document.documentElement.lang=query.get('lang')||'fr';
const item=(vendor,item_code,label_fr)=>({vendor,item_code,label_fr,product:vendor==='innosolv'?'Gemeinde':'ERP',default_selected:true,pricing_rule:{kind:'lookup',basis:'population',below_first:'hold',tiers:[{up_to:10000,value:1000}]}});
const catalog={items:[item('innosolv','1','Système de base'),item('abacus','10510.1','Comptabilité financière'),{...item('abacus','92101.202','Portail MyAbacus ESS medium'),billing_mode:'publisher_direct',rate_class:'direct',pricing_rule:{kind:'monthly_per_user',basis:'employees',users_per_unit:.5,monthly_price:1}},{...item('innosolv','104','Centre d’infos web Habitants'),default_selected:false}],parameters:{day_rate:5000,publisher_rent:{innosolv:{standard:{pa_rate:.2,pv_rate:.27}},abacus:{standard:{pa_rate:.2,pv_rate:.27},direct:{pa_rate:1,pv_rate:1}}},sql:{suggestion:{kind:'per_population',divisor:300,round_to:1,min:1},core_from_population:10000,user_base:100,price_per_user:20,default_cores:4,price_per_core:null},lcm:[{up_to:10000,gold:30,platinium:40}],configuration_profiles:[{id:'standard',label:'Référence Tolochenaz',default:true,module_days:{'innosolv/Gemeinde/104':0}}],service_presets:{standard:{}},prime_options:[{item_code:"prime-extra",label_fr:"Option Prime de démonstration",label_de:"Prime-Beispieloption",days:2,annual_pv:75}]}};
// Known SQL count avoids dependence on suggestion metadata in this synthetic profile.
catalog.parameters.sql.suggestion={lowerPopulation:0,lowerUsers:1,upperPopulation:10000,upperUsers:20};
const input={bfs_id:5744,name:'Commune de démonstration',canton:'VD',products:['innosolv','abacus'],dimensions:{population:1200,licensedPopulation:1500,meters:500,taxes:500,employees:20,portalUsers:10},reference:{id:'standard'},modules:catalog.items.filter(x=>x.default_selected).map(x=>({vendor:x.vendor,product:x.product,item_code:x.item_code})),moduleServices:catalog.items.filter(x=>x.default_selected).map(x=>({family:'prestations_module',item_code:`${x.vendor}/${x.product}/${x.item_code}`,days:1})),services:[{family:'prestations',item_code:'reprise',label:'Reprise de données',days:15},{family:'prestations',item_code:'formation',label:'Formation',days:4}],projectManagement:{basis:'prime_service_days',percent:9,round_days:1},primeLines:[{family:'prime',category:'license',item_code:'prime-demo',label:'Formules de démonstration',days:2,annual_pv:50},{family:'prime',category:'hosting',item_code:'hosting-demo',label:'Hébergement',investment_pv:100,annual_pv:300}],partners:[],sql:{users:5,override:200},oracle:{full:0,light:0},pce:{finances:false,salaires:false},lcm:{selection:'gold'},hosting:{included:true},investmentDiscount:100,client_options:[]};
catalog.parameters.pce={finance_ratio:.4,finance_adjustment:100,finance_round_to:100,salary_round_to:50,pv_margin:.2,pv_round_to:50};
catalog.parameters.oracle={full_price:25,light_price:5,full_maintenance:3,light_maintenance:1};
input.products.push('pce');input.oracle={full:4,light:0};input.services.push({family:'prestations',item_code:'pce-finances',requires_products:['pce'],requires_pce_option:'finances',days:2},{family:'prestations',item_code:'pce-salaires',requires_products:['pce'],requires_pce_option:'salaires',days:1});
input.partners=[{family:'partenaires',category:'license',item_code:'partner-demo',label:'Logiciel partenaire de démonstration',investment_pv:250,annual_pv:40}];
if(query.get('surface')==='client'){input.hosting.synergy=true;input.investmentTarget=100000;}
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
  else if(action==='board')data={version:saved.workflow_version??1,column_titles:columnTitles,quotes:[saved]};
  else if(action==='moveQuote'){const body=JSON.parse(options.body);saved.workflow_stage=body.stage;saved.workflow_version=(saved.workflow_version??1)+1;data={version:saved.workflow_version,column_titles:columnTitles};}
  else if(action==='renameColumn'){const body=JSON.parse(options.body);columnTitles[body.column]=body.title;saved.workflow_version=(saved.workflow_version??1)+1;data={version:saved.workflow_version,column_titles:columnTitles};}
  else if(action==='sharedOffers')data=[{id:'synthetic-link',public_slug:'A'.repeat(43),public_version:'v1.0',revision:1,open_count:0}];
  else if(action==='save'){const body=JSON.parse(options.body);saved.snapshot={...saved.snapshot,input:body.input,result:calculateQuote(body.input,catalog)};saved.current_revision++;saved.save_number++;data={id:saved.id,revision:saved.current_revision,save_number:saved.save_number};}
  else return new Response(JSON.stringify({error:'Fixture action unavailable'}),{status:400});
  return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
 }
 if(u.origin===location.origin)return originalFetch(url,options);
 return new Response('{}',{status:404});
};
if(query.get('surface')==='client'){
 const o=publicOfferFromSaved(saved,catalog),l=(fr,de)=>query.get('lang')==='de'?de:fr,money=n=>`${Math.round(n).toLocaleString('de-CH')} CHF HT`;
 document.getElementById('chiffrageRoot').innerHTML=`<article class="chiffrage-offer"><div class="prime-offer-banner">${offerFigures(o.amounts,{label:l,money,municipal:true,synergy:o.hosting_synergy===true,annualBudget:annualOfferBudget(o.amounts,o.annual_breakdown,o.publisher_billing)})}</div><div class="chiffrage-offer-body"><section>${offerScope(o.scope.map(g=>({product:g.product,items:g.items.map(x=>({label:l(x.fr,x.de),section:x.section_fr,included:(x.included??[]).map(y=>({label:y.fr}))}))})),{asset:p=>'public/'+p,label:l})}</section><section><h3>${l('Ce que comprend votre offre','Was Ihr Angebot umfasst')}</h3>${offerBreakdown(o.cost_details.map(x=>({...x,label:l(x.label_fr,x.label_de)})),{label:l,money,publisherRows:o.publisher_billing})}</section></div></article>`;
 const {bindOfferScope}=await import('../../app/offer/interactions.js');bindOfferScope(document.getElementById('chiffrageRoot'));
 await import('../../app/core/navigation.js');
}else await import('../../app/chiffrage/view.js');

document.documentElement.dataset.skin=query.get('skin')||'prime-darkweb';

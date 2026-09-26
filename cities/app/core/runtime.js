import { t, number, date } from './i18n.js';
// Prime Communes 2.0 — shell and shared compatibility contract.

const fmt={format:value=>number(value)},pct={format:value=>number(value,{minimumFractionDigits:1,maximumFractionDigits:1})};let all=[],primeOnly=false,eadminOnly=false,issuesOnly=false,districtsMode=false,marketOnly='',ofsMode=false,sortKey='population',sortDirection='desc',mapGeometry=null,mapMode='integrator',mapPerspective='impact',mapProduct='eAdmin',mapViewBox=null,mapInitialViewBox=null,mapFullViewBox=null,mapDragging=false,mapMoved=false,statsMetric='population',statsThreshold=0;
const supplierChoices=['Abraxas','Axians','Ciges','Data','Epsitec','OBT','Ofisa','Prime','SIACG','SIEN','T2i','Talus']; const softwareChoices=['innosolvcity','Urbanus','Calvin','Citizen','ETIC','BDI','Crésus','Epsilon','Ruf'];
const ERP_BY_METIER={ETIC:'Abacus',Urbanus:'Urbanus',Citizen:'Citizen',BDI:'BDI',Epsilon:'Epsilon','Crésus':'Crésus',Ruf:'Ruf',Calvin:'Opale'};
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalizeSearchText=value=>(window.PrimeCommunesData?.normalizeText?.(value)??String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-CH').trim()).replace(/[’'._/\\-]+/g,' ').replace(/\s+/g,' ').trim();
function isNearSearchToken(left,right){
  if(!left||!right||Math.abs(left.length-right.length)>1)return false;
  const rows=left.length+1,cols=right.length+1,matrix=Array.from({length:rows},(_,i)=>{const row=Array(cols).fill(0);row[0]=i;return row});
  for(let j=0;j<cols;j++)matrix[0][j]=j;
  for(let i=1;i<rows;i++)for(let j=1;j<cols;j++){
    const cost=left[i-1]===right[j-1]?0:1;
    matrix[i][j]=Math.min(matrix[i-1][j]+1,matrix[i][j-1]+1,matrix[i-1][j-1]+cost);
    if(i>1&&j>1&&left[i-1]===right[j-2]&&left[i-2]===right[j-1])matrix[i][j]=Math.min(matrix[i][j],matrix[i-2][j-2]+1);
  }
  return matrix[left.length][right.length]<=1;
}
function communeSearchFields(x){return[
  {label:t('common.commune'),value:x.name||''},
  {label:t('common.canton'),value:x.canton||''},
  {label:t('common.market'),value:x.market||''},
  {label:t('common.district'),value:x.district||''},
  {label:t('common.integrator'),value:x.integrator||t('common.empty')},
  {label:t('common.software'),value:x.software||''},
  {label:'ERP',value:x.erp||''},
  {label:t('common.modules'),value:(x.products||[]).join(' · ')},
  {label:t('common.hosting'),value:x.hosting||''},
  {label:t('common.client'),value:x.isPrime?t('common.customerPrime'):''},
  {label:t('common.population'),value:String(x.expectedPopulation||'')},
  {label:t('common.notes'),value:x.notes||''}
]}
function communeSearchMeta(x,query){
  const q=normalizeSearchText(query),fields=communeSearchFields(x),name=normalizeSearchText(x.name);
  if(!q)return{score:100,label:t('common.commune'),value:x.name||''};
  if(name===q)return{score:0,label:t('common.commune'),value:x.name||''};
  if(name.startsWith(q))return{score:1,label:t('common.commune'),value:x.name||''};
  if(name.split(/[^a-z0-9]+/).some(word=>word.startsWith(q)))return{score:2,label:t('common.commune'),value:x.name||''};
  if(name.includes(q))return{score:3,label:t('common.commune'),value:x.name||''};
  if(q.length>=4&&name.split(/[^a-z0-9]+/).some(word=>isNearSearchToken(word,q)))return{score:4,label:t('common.approxCommune'),value:x.name||''};
  for(let index=1;index<fields.length;index++){
    const value=normalizeSearchText(fields[index].value);
    if(!value)continue;
    if(value===q)return{score:10+index,label:fields[index].label,value:fields[index].value};
    if(value.startsWith(q))return{score:30+index,label:fields[index].label,value:fields[index].value};
    if(value.includes(q))return{score:50+index,label:fields[index].label,value:fields[index].value};
    if(/\d/.test(q)&&value.replace(/\s/g,'').includes(q.replace(/\s/g,'')))return{score:60+index,label:fields[index].label,value:fields[index].value};
  }
  return null;
}
const SUPABASE_URL='https://ozdvmllgxduzquiujcbg.supabase.co',SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZHZtbGxneGR1enF1aXVqY2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzkwNTIsImV4cCI6MjEwMzE1NTA1Mn0.mVT0_dqcpAzb3QxmC5xDmB8bq7RZrpDd5dpvnGKPaTw';
const decodeEntities=value=>{const node=document.createElement('textarea');node.innerHTML=String(value??'');return node.value};
function applyData(data,source){
  all=data.municipalities.map(x=>{const products=[...(x.products??[])];if(Number(x.id)===2206&&!products.includes('Clever.Tax'))products.push('Clever.Tax');const explicitPrime=x.primeClient??x.prime_client,isPrime=explicitPrime==null?Boolean(x.isPrime||x.integrator==='Prime'||(x.canton==='GE'&&products.includes('eAdmin'))):Boolean(explicitPrime);const erp=Object.prototype.hasOwnProperty.call(x,'erp')?(x.erp||''):(ERP_BY_METIER[x.software]||'');return{...x,name:decodeEntities(x.name),district:decodeEntities(x.district),comment:decodeEntities(x.comment),products,isPrime,primeClient:isPrime,erp}});
  $('population').textContent=fmt.format(data.meta.expectedPopulation);$('communeCount').textContent=fmt.format(data.meta.municipalityCount);$('headerCommuneCount').textContent=fmt.format(data.meta.municipalityCount);
  const over=all.filter(x=>x.expectedPopulation>=10000),prime=all.filter(x=>x.isPrime),issues=all.filter(x=>x.deliveryStatus!=='accepted');
  const overPop=over.reduce((s,x)=>s+x.expectedPopulation,0);$('over10k').textContent=over.length;$('over10kPop').textContent=fmt.format(overPop);$('over10kShare').textContent=pct.format(over.length/all.length*100)+'%';$('over10kPopShare').textContent=pct.format(overPop/data.meta.expectedPopulation*100)+'%';$('prime').textContent=prime.length;$('primePop').textContent=fmt.format(prime.reduce((s,x)=>s+x.expectedPopulation,0));$('issues').textContent=issues.length;
  $('canton').innerHTML='<option>'+t('common.all')+'</option>';fill('canton',[...new Set(all.map(x=>x.canton))].sort());
  updateDistrictOptions();
  const solutions=[...new Map(all.filter(x=>x.integrator||x.software).map(x=>{const value=(x.integrator||'')+'|||'+(x.software||''),label=(x.integrator||t('common.empty'))+' | '+(x.software||'—');return[value,{value,label}]})).values()].sort((a,b)=>a.label.localeCompare(b.label,'fr-CH',{sensitivity:'base'}));
  $('solution').innerHTML='<option value="Tous">'+t('common.allFeminine')+'</option>'+solutions.map(x=>`<option value="${esc(x.value)}">${esc(x.label)}</option>`).join('');
  const products=[...new Set(all.flatMap(x=>x.products||[]))].sort((a,b)=>a.localeCompare(b,'fr-CH',{sensitivity:'base'}));$('mapProduct').innerHTML=products.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(products.includes(mapProduct))$('mapProduct').value=mapProduct;
  updateStatsScopeOptions();$('syncText').textContent=t('common.dataAt',{date:date(new Date(data.meta.referenceDate+'T00:00:00')),source});render();renderStats();if(mapGeometry)renderMap();
}
function mapDb(x){return{id:x.bfs_id,name:x.name,canton:x.canton,market:x.market,districtCode:x.bezirk_code??'',district:x.bezirk??'',expectedPopulation:x.expected_population??0,receivedPopulation:x.received_population,receivedOn:x.received_on??'',comment:x.comment??'',echVersion:x.ech_version??'',missingEwid:x.missing_ewid,ewidErrorRate:x.ewid_error_rate,deliveryStatus:x.delivery_status??'unknown',software:x.software??'',integrator:x.integrator??'',primeClient:x.prime_client,erp:x.erp??'',salesStatus:x.sales_status??'none',notes:x.notes??'',products:x.products??[]}}
async function loadData(manual=false){
  const isManual=manual===true,started=performance.now(),sync=$('syncReload');
  if(sync){sync.dataset.state='loading';sync.disabled=true}
  $('syncText').textContent=t('common.refreshing');
  try{
    const rows=[];for(let from=0;;from+=1000){const r=await fetch(SUPABASE_URL+'/rest/v1/GemeindeAktuell?select=*&order=bfs_id',{headers:{apikey:SUPABASE_KEY,Range:from+'-'+(from+999)},cache:'no-store'});if(!r.ok)throw new Error('Supabase '+r.status);const page=await r.json();rows.push(...page);if(page.length<1000)break}
    const municipalities=rows.map(mapDb),referenceDate=rows.find(x=>x.reference_date)?.reference_date??'2026-06-30';applyData({meta:{referenceDate,municipalityCount:municipalities.length,expectedPopulation:municipalities.reduce((s,x)=>s+x.expectedPopulation,0)},municipalities},'base live');
    if(isManual){
      const seconds=Math.max(.1,(performance.now()-started)/1000).toFixed(1).replace('.',',');
      sync.dataset.state='success';
      $('syncText').textContent=t('common.upToDate',{count:fmt.format(municipalities.length),seconds});
    }else sync.dataset.state='ready';
  }catch(e){
    try{
      const r=await fetch('public/data/municipalities-v4.json');const fallback=await r.json();applyData(fallback,'copie locale');
      if(isManual){sync.dataset.state='fallback';$('syncText').textContent=t('common.localCopy')}
      else sync.dataset.state='ready';
    }catch(fallbackError){
      if(sync)sync.dataset.state='error';
      $('syncText').textContent=t('common.errorLoading');
      throw fallbackError;
    }
  }finally{if(sync)sync.disabled=false}
}
loadData().catch(e=>{$('syncText').textContent=t('common.errorLoading');$('rows').innerHTML='<tr><td colspan="8">'+esc(e?.message||e)+'</td></tr>'});
function fill(id,values){values.forEach(v=>$(id).insertAdjacentHTML('beforeend',`<option>${esc(v)}</option>`))}
function updateDistrictOptions(){const previous=$('district').value,canton=$('canton').value,active=districtsMode&&canton!=='Tous';$('districtFilter').hidden=!active;if(!active){$('district').value='';$('district').innerHTML='<option value="">'+t('common.allDistricts')+'</option>';return}const districts=[...new Map(all.filter(x=>x.districtCode&&x.canton===canton).map(x=>[x.districtCode,{code:x.districtCode,label:x.district}])).values()].sort((a,b)=>a.label.localeCompare(b.label,'fr-CH',{sensitivity:'base'}));$('district').innerHTML='<option value="">'+t('common.allDistricts')+'</option>'+districts.map(x=>`<option value="${esc(x.code)}">${esc(x.label)}</option>`).join('');if(districts.some(x=>x.code===previous))$('district').value=previous}
function filtered(){
  const q=normalizeSearchText($('query').value),exploring=Boolean(q||$('canton').value!=='Tous'||$('district').value||$('solution').value!=='Tous'||marketOnly||primeOnly||eadminOnly||issuesOnly),scores=new Map();
  const list=all.filter(x=>{
    const search=q?communeSearchMeta(x,q):null;if(q&&!search)return false;if(search)scores.set(x.id,search.score);
    return(exploring||x.expectedPopulation>=10000)&&($('canton').value==='Tous'||x.canton===$('canton').value)&&(!$('district').value||x.districtCode===$('district').value)&&($('solution').value==='Tous'||(x.integrator+'|||'+x.software)===$('solution').value)&&(!marketOnly||x.market===marketOnly)&&(!primeOnly||x.isPrime)&&(!eadminOnly||x.products?.includes('eAdmin'))&&(!issuesOnly||x.deliveryStatus!=='accepted')
  });
  return list.sort((a,b)=>{const relevance=q?(scores.get(a.id)-scores.get(b.id)):0;if(relevance)return relevance;const c=sortKey==='population'?a.expectedPopulation-b.expectedPopulation:a.name.localeCompare(b.name,'fr-CH',{sensitivity:'base'});return sortDirection==='asc'?c:-c})
}
function changeSort(key){if(sortKey===key)sortDirection=sortDirection==='asc'?'desc':'asc';else{sortKey=key;sortDirection=key==='population'?'desc':'asc'}render()}
function renderModules(x){const modules=x.products||[],known=[];if(modules.includes('eAdmin'))known.push('<img class="module-mark eadmin-mark" src="public/eadmin-mark-negative.png" alt="eAdmin" title="eAdmin · guichet virtuel">');if(modules.includes('Clever.Tax'))known.push('<img class="module-mark clevertax-mark" src="public/clevertax-mark-negative.png?v=1" alt="Clever.Tax" title="Clever.Tax · KMS">');const other=modules.filter(name=>!['eAdmin','Clever.Tax'].includes(name)).map(name=>`<span class="module-chip">${esc(name)}</span>`);return [...known,...other].join('')}
function renderSoftware(x){const software=String(x.software||'').trim();if(!software)return '<span class="empty">—</span>';const key=software.toLocaleLowerCase('fr-CH');if(key==='innosolvcity'||key==='innosolv')return '<img class="solution-mark innosolvcity-mark" src="public/assets/logos/innosolvcity.png?v=1" alt="innosolvcity" title="innosolvcity">';return esc(software)}
function renderErp(x,drawer=false){const erp=String(x.erp||'').trim();if(!erp)return drawer?t('common.unset'):'<span class="empty">—</span>';const key=erp.toLocaleLowerCase('fr-CH'),extra=drawer?' drawer-solution-mark':'';if(key==='proconcept'||key==='proconcept erp'||key==='pce')return `<img class="solution-mark proconcept-mark${extra}" src="public/assets/logos/proconcept.png?v=1" alt="ProConcept ERP" title="ProConcept ERP">`;if(key==='innosolvcity'||key==='innosolv')return `<img class="solution-mark innosolvcity-mark${extra}" src="public/assets/logos/innosolvcity.png?v=1" alt="innosolvcity" title="innosolvcity">`;return esc(erp)}
function render(){
  const list=filtered(); $('resultCount').textContent=fmt.format(list.length); $('limit').textContent=list.length>120?t('common.topResults'):'';
  $('tableHead').innerHTML=`<tr>${ofsMode?`<th>${t('common.state')}</th>`:''}<th class="sortable" id="sortName">${t('common.commune')} ${sortKey==='name'?(sortDirection==='asc'?'↑':'↓'):''}</th><th class="client-heading">${t('common.client')}</th><th id="columnCanton">${t('page.030')}</th>${districtsMode?`<th class="territory-column">${t('common.market')}</th><th class="territory-column">${t('common.district')}</th>`:''}<th class="sortable" id="sortPopulation">${t('common.population')} ${sortKey==='population'?(sortDirection==='asc'?'↑':'↓'):''}</th><th class="ecosystem-start">${t('common.integrator')}</th><th>${t('common.software')}</th><th id="columnErp">ERP</th><th id="columnModules">${t('common.modules')}</th>${ofsMode?`<th>${t('common.errorEwid')}</th>`:''}<th></th></tr>`;
  $('rows').innerHTML=list.slice(0,120).map(x=>`<tr data-id="${x.id}">${ofsMode?`<td><span class="status-help" title="${esc((x.comment||t('common.statusDelimo'))+' — '+t('common.details'))}" aria-label="${esc(x.comment||t('common.statusDelimo'))}"><span class="status-dot ${esc(x.deliveryStatus)}"></span><span class="status-info" aria-hidden="true">i</span></span></td>`:''}<td><strong>${esc(x.name)}</strong></td><td class="client-cell">${x.isPrime?'<img class="prime-client-mark" src="public/prime-one-negative.png?v=4" alt="Client Prime" title="Client Prime">':''}</td><td><span class="canton-cell"><img src="public/cantons/${esc(x.canton.toLowerCase())}.svg" alt="">${esc(x.canton)}</span></td>${districtsMode?`<td class="market-cell territory-column">${esc(x.market)}</td><td class="territory-column">${x.district?esc(x.district):'<span class="empty">—</span>'}</td>`:''}<td class="numeric">${fmt.format(x.expectedPopulation)}</td><td class="ecosystem-start">${x.integrator?esc(x.integrator):'<span class="empty">'+t('common.empty')+'</span>'}</td><td class="metier-cell">${renderSoftware(x)}</td><td class="erp-cell">${renderErp(x)}</td><td class="modules-cell">${renderModules(x)||'<span class="empty">—</span>'}</td>${ofsMode?`<td><span class="rate ${(x.ewidErrorRate??0)>1?'high':''}">${x.ewidErrorRate==null?'—':x.ewidErrorRate.toFixed(1)}%</span></td>`:''}<td class="arrow">›</td></tr>`).join('');
  $('sortName').onclick=()=>changeSort('name');$('sortPopulation').onclick=()=>changeSort('population');document.querySelectorAll('tbody tr').forEach(tr=>tr.onclick=()=>openDrawer(all.find(x=>String(x.id)===tr.dataset.id)));
}
function openDrawer(x){
  const vpOptions=[...new Set([...supplierChoices,x.integrator].filter(Boolean))].sort().map(v=>`<option ${v===x.integrator?'selected':''}>${esc(v)}</option>`).join('');
  const swOptions=[...new Set([...softwareChoices,x.software].filter(Boolean))].sort().map(v=>`<option ${v===x.software?'selected':''}>${esc(v)}</option>`).join('');
  const delivery=ofsMode?`<section><h3>Livraison Delimo</h3><dl><div><dt>Population reçue</dt><dd>${fmt.format(x.receivedPopulation??0)}</dd></div><div><dt>Erreur EWID</dt><dd>${x.ewidErrorRate?.toFixed(1)??'—'}%</dd></div><div><dt>EWID manquants</dt><dd>${x.missingEwid?.toFixed(1)??'—'}%</dd></div><div><dt>Version eCH</dt><dd>${esc(x.echVersion)}</dd></div></dl><p class="delivery-comment">${esc(x.comment)}</p></section>`:'';
  $('drawerRoot').innerHTML=`<div class="drawer-backdrop"><aside class="drawer"><button class="drawer-close">×</button><div class="drawer-title">${ofsMode?`<span class="status-dot ${esc(x.deliveryStatus)}"></span>`:''}<div><p>${esc(x.canton)} · OFS ${x.id}</p><h2>${esc(x.name)}</h2></div>${x.isPrime?'<img class="drawer-prime-mark" src="public/prime-one-negative.png?v=4" alt="Client Prime" title="Client Prime">':''}</div><div class="drawer-pop"><strong>${fmt.format(x.expectedPopulation)}</strong><span>habitants attendus</span></div>${delivery}<section><h3>Écosystème communal</h3><label>Intégrateur<select><option value="">Non renseigné</option>${vpOptions}</select></label><label>Produit métier<select><option value="">Non renseigné</option>${swOptions}</select></label><dl class="drawer-ecosystem"><div><dt>ERP</dt><dd>${renderErp(x,true)}</dd></div><div><dt>Modules</dt><dd>${esc((x.products||[]).join(' · ')||'Aucun')}</dd></div></dl><label>Notes<textarea placeholder="Informations utiles…">${esc(x.notes)}</textarea></label><button class="save-button">Enregistrer les informations</button><p class="prototype-note">V0 · l’enregistrement sera activé avec la base de données</p></section></aside></div>`;
  document.querySelector('.drawer-close').onclick=closeDrawer; document.querySelector('.drawer-backdrop').onclick=e=>{if(e.target===e.currentTarget)closeDrawer()};
}
function closeDrawer(){$('drawerRoot').innerHTML=''}

const mapPalettes={
  integrator:{Prime:'#289cff',Ofisa:'#f08a4b',T2i:'#8c6cff',SIEN:'#36bca5',Ciges:'#e76369',Talus:'#d7a941',Data:'#d15fa4',OBT:'#78bc62',Abraxas:'#4f7fd5',Axians:'#43a6b5',Epsitec:'#b271d7',SIACG:'#cf7354'},
  software:{innosolvcity:'#289cff',Calvin:'#f08a4b',Citizen:'#8c6cff',ETIC:'#36bca5',BDI:'#e76369','Crésus':'#d7a941',Urbanus:'#d15fa4',Epsilon:'#78bc62',Ruf:'#4f7fd5'}
};
const mapFallback='#182534',mapWestCantons=new Set(['GE','VD','NE','JU','FR','VS','BE','BS','BL','SO']);
function mapColor(commune){if(mapMode==='product')return commune.products?.includes(mapProduct)?'#36d494':'#253142';const value=mapMode==='software'?commune.software:commune.integrator;return mapPalettes[mapMode]?.[value]||mapFallback}
function renderMap(){
  if(!mapGeometry||!all.length)return;
  const lookup=new Map(all.map(x=>[String(x.id),x])),svg=$('swissMap'),impact=mapPerspective==='impact';
  $('mapPanel').classList.toggle('impact-layout',impact);
  svg.classList.toggle('impact-mode',impact);svg.classList.toggle('factual-mode',!impact);
  svg.innerHTML=`<image class="map-basemap" href="public/swiss-base.webp" x="2480000" y="-1305000" width="360000" height="260000" preserveAspectRatio="none"></image><g class="map-context">${mapGeometry.cantons.map(x=>`<path class="map-canton ${mapWestCantons.has(x.code)?'context-west':''}" d="${x.d}" data-canton="${x.code}"></path>`).join('')}</g><g class="impact-halos"></g><g class="map-municipalities">${mapGeometry.municipalities.map(x=>`<path class="map-commune" data-id="${x.id}" d="${x.d}"></path>`).join('')}</g><g class="impact-dots"></g><g class="map-canton-outlines">${mapGeometry.cantons.map(x=>`<path class="map-canton-outline" d="${x.d}" data-canton="${x.code}"></path>`).join('')}</g>`;
  const halos=svg.querySelector('.impact-halos'),dots=svg.querySelector('.impact-dots');
  svg.querySelectorAll('.map-commune').forEach(path=>{const commune=lookup.get(path.dataset.id);path.classList.toggle('prime',Boolean(commune?.isPrime));path.style.fill=impact?(commune?.isPrime?'#188bdc':'rgba(225,232,232,.28)'):(commune?mapColor(commune):mapFallback);if(!impact||!commune)return;const box=path.getBBox(),cx=box.x+box.width/2,cy=box.y+box.height/2,hasEadmin=commune.isPrime&&commune.products?.includes('eAdmin'),hasCity=commune.software==='innosolvcity',offset=hasEadmin&&hasCity?900:0;if(commune.isPrime){const radius=Math.min(7600,Math.max(1800,1100+Math.sqrt(commune.expectedPopulation||0)*16)),halo=document.createElementNS('http://www.w3.org/2000/svg','circle'),core=document.createElementNS('http://www.w3.org/2000/svg','circle');halo.setAttribute('class','prime-halo');halo.setAttribute('cx',cx);halo.setAttribute('cy',cy);halo.setAttribute('r',radius);core.setAttribute('class','prime-core');core.setAttribute('cx',cx);core.setAttribute('cy',cy);core.setAttribute('r',Math.max(430,radius*.12));halos.append(halo,core)}if(hasCity){const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('class',`map-solution-dot innosolv-dot ${commune.isPrime?'is-prime':'is-ecosystem'}`);dot.setAttribute('cx',cx-offset);dot.setAttribute('cy',cy);dot.setAttribute('r',820);dots.append(dot)}if(hasEadmin){const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('class','map-solution-dot eadmin-dot');dot.setAttribute('cx',cx+offset);dot.setAttribute('cy',cy);dot.setAttribute('r',820);dots.append(dot)}});
  updateMapImpact();updateMapSearch();updateMapLegend();$('mapLoading').hidden=true;$('mapCommuneCount').textContent=fmt.format(mapGeometry.meta.municipalityCount);
}
function updateMapImpact(){const romandie=all.filter(x=>x.market==='Welsch'),prime=romandie.filter(x=>x.isPrime),total=romandie.reduce((sum,x)=>sum+x.expectedPopulation,0),covered=prime.reduce((sum,x)=>sum+x.expectedPopulation,0),share=covered/total*100,ratio=Math.max(1,Math.round(total/covered));$('mapImpactRatio').textContent=t('common.mapRatio',{ratio});$('mapImpactPopulation').textContent=fmt.format(covered);$('mapImpactShare').textContent=pct.format(share)+'%'}
function updateStatsScopeOptions(){
  if(!all.length)return;const current=$('statsScope').value||'romandie';
  $('statsScope').innerHTML='<option value="romandie">'+t('common.romandie')+'</option><option value="JU">Jura</option><option value="jura-bernois">'+t('common.juraBernois')+'</option><option value="VD">Vaud</option><option value="FR-welsch">Fribourg</option><option value="VS-welsch">Valais</option>';
  $('statsScope').value=[...$('statsScope').options].some(x=>x.value===current)?current:'romandie';
}
function statsScopeRows(scope,threshold=statsThreshold){
  let rows=scope==='romandie'?all.filter(x=>x.market==='Welsch'):scope==='jura-bernois'?all.filter(x=>x.canton==='BE'&&/jura bernois/i.test(x.district||'')):scope==='FR-welsch'?all.filter(x=>x.canton==='FR'&&x.market==='Welsch'):scope==='VS-welsch'?all.filter(x=>x.canton==='VS'&&x.market==='Welsch'):all.filter(x=>x.canton===scope);
  return rows.filter(x=>x.expectedPopulation>=threshold);
}
function statsAggregate(rows,key){
  const groups=new Map();rows.forEach(x=>{const name=x[key]||t('common.empty'),entry=groups.get(name)||{name,communes:0,population:0};entry.communes++;entry.population+=x.expectedPopulation||0;groups.set(name,entry)});return [...groups.values()].sort((a,b)=>b[statsMetric]-a[statsMetric]);
}
function statsShare(rows){const total=rows.reduce((s,x)=>s+x.expectedPopulation,0),prime=rows.filter(x=>x.isPrime),covered=prime.reduce((s,x)=>s+x.expectedPopulation,0);return{total,covered,communes:rows.length,primeCommunes:prime.length,populationShare:total?covered/total*100:0,communeShare:rows.length?prime.length/rows.length*100:0}}
function renderStatsRanking(target,groups,palette){
  const max=Math.max(1,...groups.map(x=>x[statsMetric])),total=groups.reduce((s,x)=>s+x[statsMetric],0);$(target).innerHTML=groups.slice(0,8).map((x,index)=>{const value=x[statsMetric],share=total?value/total*100:0,color=palette?.[x.name]||(x.name==='Prime'?'#289cff':['#7457ff','#36b89a','#f08a4b','#d15fa4','#4f7fd5','#cf7354'][index%6]);return`<div class="stats-rank"><div class="stats-rank-label"><strong>${esc(x.name)}</strong><span>${statsMetric==='population'?t('common.rankPopulation',{value:fmt.format(value)}):t('common.rankCommunes',{value:fmt.format(value)})} · ${pct.format(share)}%</span></div><div class="stats-bar"><i style="--bar-width:${value/max*100}%;--bar-color:${color}"></i></div><small>${t('common.rankDetail',{communes:x.communes,population:fmt.format(x.population)})}</small></div>`}).join('')||'<p class="stats-empty">'+t('common.noResults')+'</p>';
}
function renderStats(){
  if(!all.length)return;const scope=$('statsScope').value||'romandie',rows=statsScopeRows(scope),summary=statsShare(rows),metricShare=statsMetric==='population'?summary.populationShare:summary.communeShare,integrators=statsAggregate(rows,'integrator'),softwares=statsAggregate(rows,'software'),competitor=integrators.find(x=>x.name!=='Prime'&&x.name!==t('common.empty')),metricTotal=rows.reduce((s,x)=>s+(statsMetric==='population'?x.expectedPopulation:1),0),competitorShare=competitor&&metricTotal?competitor[statsMetric]/metricTotal*100:0;
  $('statsPrimeShare').textContent=pct.format(metricShare)+'%';$('statsPrimeDetail').textContent=statsMetric==='population'?t('common.covered',{count:fmt.format(summary.covered)}):t('common.primeMunicipalities',{prime:summary.primeCommunes,total:summary.communes});$('statsMunicipalities').textContent=fmt.format(summary.communes);$('statsPopulation').textContent=t('common.analyzed',{count:fmt.format(summary.total)});$('statsCompetitor').textContent=competitor?.name||'—';$('statsCompetitorShare').textContent=competitor?`${fmt.format(competitor[statsMetric])} · ${pct.format(competitorShare)}%`:t('common.noData');
  const territories=[['Jura','JU'],['Jura bernois','jura-bernois'],['Vaud','VD'],['Fribourg','FR-welsch'],['Valais','VS-welsch'],['Suisse romande','romandie']].map(([name,value])=>({name,value,...statsShare(statsScopeRows(value,0))}));
  $('territoryComparison').innerHTML=territories.map(x=>`<button data-stats-scope="${x.value}"><span><strong>${x.name}</strong><small>${t('common.primeCommunes',{prime:x.primeCommunes,total:x.communes})}</small></span><b>${pct.format(x.populationShare)}%</b><i><em style="width:${Math.min(100,x.populationShare)}%"></em></i><small>${t('common.inhabitantsCoveredOf',{covered:fmt.format(x.covered),total:fmt.format(x.total)})}</small></button>`).join('');
  $('territoryComparison').querySelectorAll('button').forEach(button=>button.onclick=()=>{$('statsScope').value=button.dataset.statsScope;renderStats()});
  const large5=statsScopeRows(scope,5000),large10=statsScopeRows(scope,10000),prime5=large5.filter(x=>x.isPrime).length,prime10=large10.filter(x=>x.isPrime).length,scopeName=$('statsScope').selectedOptions[0]?.textContent||'ce territoire';
  $('statsPrime5').textContent=`${prime5}/${large5.length}`;$('statsPrime5Detail').textContent=t('common.primeScope',{scope:scopeName});$('statsPrime10').textContent=`${prime10}/${large10.length}`;$('statsPrime10Detail').textContent=t('common.primeScope',{scope:scopeName});
  $('statsRankingTitle').textContent=t('common.rankingTitle',{threshold:statsThreshold?`≥ ${fmt.format(statsThreshold)}`:t('common.allSizes')});renderStatsRanking('statsIntegratorRanking',integrators,mapPalettes.integrator);renderStatsRanking('statsSoftwareRanking',softwares,mapPalettes.software);
}
function updateMapLegend(){
  if(!all.length)return;const romandie=all.filter(x=>x.market==='Welsch');let entries;
  if(mapPerspective==='impact'){entries=[['Communes Prime',romandie.filter(x=>x.isPrime).length,'#289cff','solid'],['innosolvcity · Prime',romandie.filter(x=>x.isPrime&&x.software==='innosolvcity').length,'#44dc98','solid'],['innosolvcity · écosystème',romandie.filter(x=>!x.isPrime&&x.software==='innosolvcity').length,'#44dc98','outline'],['eAdmin · Prime',romandie.filter(x=>x.isPrime&&x.products?.includes('eAdmin')).length,'#e52332','solid']]}
  else if(mapMode==='product'){const count=romandie.filter(x=>x.products?.includes(mapProduct)).length;entries=[[mapProduct,count,'#36d494'],[`Sans ${mapProduct}`,romandie.length-count,'#253142']]}
  else{const key=mapMode==='software'?'software':'integrator',counts=new Map();romandie.forEach(x=>{const value=x[key]||t('common.empty');counts.set(value,(counts.get(value)||0)+1)});entries=[...counts].sort((a,b)=>b[1]-a[1]).map(([name,count])=>[name,count,mapPalettes[mapMode]?.[name]||mapFallback])}
  $('mapLegend').innerHTML=entries.map(([name,count,color,kind='solid'])=>`<span><i class="${kind}" style="--legend-color:${color}"></i>${esc(name)} · ${count}</span>`).join('');
}
function updateMapSearch(){
  const query=normalizeSearchText($('mapQuery').value),lookup=new Map(all.map(x=>[String(x.id),x]));let matches=0;
  document.querySelectorAll('.map-commune').forEach(path=>{const commune=lookup.get(path.dataset.id),hit=!query||normalizeSearchText(commune?.name).includes(query);path.classList.toggle('dimmed',!hit);path.classList.toggle('search-hit',Boolean(query&&hit));if(hit)matches++});
  $('mapCommuneCount').textContent=fmt.format(query?matches:(mapGeometry?.meta.municipalityCount||621));
}
async function loadMap(){
  if(mapGeometry)return;try{const response=await fetch('public/data/swiss-map-v1.json');if(!response.ok)throw new Error('Carte indisponible');mapGeometry=await response.json();mapFullViewBox=[...mapGeometry.meta.viewBox];mapInitialViewBox=impactInitialViewBox();mapViewBox=[...mapInitialViewBox];setMapView();renderMap()}catch(error){$('mapLoading').innerHTML=t('common.mapUnavailable')}
}
function impactInitialViewBox(){return window.matchMedia('(max-width:680px)').matches?[2480000,-1323000,205000,285000]:[2480000,-1292000,250000,182000]}
function setMapView(){if(mapViewBox)$('swissMap').setAttribute('viewBox',mapViewBox.join(' '))}
function zoomMap(factor,clientX,clientY){const svg=$('swissMap'),rect=svg.getBoundingClientRect(),[x,y,w,h]=mapViewBox,minW=mapInitialViewBox[2]*.22,maxW=mapInitialViewBox[2],nextW=Math.min(maxW,Math.max(minW,w*factor)),nextH=nextW*(mapInitialViewBox[3]/mapInitialViewBox[2]),px=clientX==null ? .5 : (clientX-rect.left)/rect.width,py=clientY==null ? .5 : (clientY-rect.top)/rect.height;mapViewBox=[x+(w-nextW)*px,y+(h-nextH)*py,nextW,nextH];setMapView()}
function showMapTooltip(event,path){const commune=all.find(x=>String(x.id)===path.dataset.id);if(!commune)return;const tooltip=$('mapTooltip'),stage=$('mapStage'),rect=stage.getBoundingClientRect();tooltip.innerHTML=`<strong>${esc(commune.name)}</strong><span>${esc(commune.canton)} · ${fmt.format(commune.expectedPopulation)} habitants${commune.isPrime?' · Client Prime':''}</span><small>${esc(commune.integrator||'Intégrateur à compléter')} · ${esc(commune.software||'métier à compléter')}${commune.erp?' · ERP '+esc(commune.erp):''}${commune.products?.length?' · '+esc(commune.products.join(' · ')):''}</small>`;tooltip.hidden=false;const left=Math.min(rect.width-230,Math.max(10,event.clientX-rect.left+14)),top=Math.min(rect.height-90,Math.max(10,event.clientY-rect.top+14));tooltip.style.left=left+'px';tooltip.style.top=top+'px'}
$('mapQuery').addEventListener('input',updateMapSearch);$('mapQuery').addEventListener('keydown',event=>{if(event.key==='Enter'){const query=normalizeSearchText(event.currentTarget.value),exact=all.find(x=>x.market==='Welsch'&&normalizeSearchText(x.name)===query),hit=document.querySelector('.map-commune.search-hit'),commune=exact||all.find(x=>String(x.id)===hit?.dataset.id);if(commune)openDrawer(commune)}});
document.querySelectorAll('[data-map-mode]').forEach(button=>button.onclick=()=>{mapMode=button.dataset.mapMode;document.querySelectorAll('[data-map-mode]').forEach(x=>x.classList.toggle('active',x===button));renderMap()});
$('mapProduct').addEventListener('change',event=>{mapProduct=event.currentTarget.value;renderMap()});document.querySelectorAll('[data-map-perspective]').forEach(button=>button.onclick=()=>{mapPerspective=button.dataset.mapPerspective;document.querySelectorAll('[data-map-perspective]').forEach(x=>x.classList.toggle('active',x===button));$('mapModeControls').hidden=mapPerspective!=='factual';$('mapImpact').hidden=mapPerspective!=='impact';mapInitialViewBox=mapPerspective==='impact'?impactInitialViewBox():[...mapFullViewBox];mapViewBox=[...mapInitialViewBox];$('swissMap').setAttribute('preserveAspectRatio','xMidYMid slice');setMapView();renderMap()});
$('swissMap').addEventListener('wheel',event=>{event.preventDefault();zoomMap(event.deltaY<0?.82:1.2,event.clientX,event.clientY)},{passive:false});
$('swissMap').addEventListener('pointerdown',event=>{mapDragging=true;mapMoved=false;$('swissMap').classList.add('dragging');$('swissMap').setPointerCapture(event.pointerId);$('swissMap').dataset.dragX=event.clientX;$('swissMap').dataset.dragY=event.clientY});
$('swissMap').addEventListener('pointermove',event=>{const path=event.target.closest?.('.map-commune');if(path&&!mapDragging)showMapTooltip(event,path);else $('mapTooltip').hidden=true;if(!mapDragging)return;const svg=$('swissMap'),rect=svg.getBoundingClientRect(),dx=event.clientX-Number(svg.dataset.dragX),dy=event.clientY-Number(svg.dataset.dragY);if(Math.abs(dx)+Math.abs(dy)>3)mapMoved=true;mapViewBox[0]-=dx*mapViewBox[2]/rect.width;mapViewBox[1]-=dy*mapViewBox[3]/rect.height;svg.dataset.dragX=event.clientX;svg.dataset.dragY=event.clientY;setMapView()});
$('swissMap').addEventListener('pointerup',event=>{const path=event.target.closest?.('.map-commune');mapDragging=false;$('swissMap').classList.remove('dragging');if(path&&!mapMoved)openDrawer(all.find(x=>String(x.id)===path.dataset.id))});$('swissMap').addEventListener('pointerleave',()=>{$('mapTooltip').hidden=true});
$('mapZoomIn').onclick=()=>zoomMap(.72);$('mapZoomOut').onclick=()=>zoomMap(1.35);$('mapReset').onclick=()=>{mapViewBox=[...mapInitialViewBox];setMapView();$('mapQuery').value='';updateMapSearch()};
$('statsScope').addEventListener('change',renderStats);document.querySelectorAll('[data-stats-metric]').forEach(button=>button.onclick=()=>{statsMetric=button.dataset.statsMetric;document.querySelectorAll('[data-stats-metric]').forEach(x=>x.classList.toggle('active',x===button));renderStats()});document.querySelectorAll('[data-stats-threshold]').forEach(button=>button.onclick=()=>{statsThreshold=Number(button.dataset.statsThreshold);document.querySelectorAll('[data-stats-threshold]').forEach(x=>x.classList.toggle('active',x===button));renderStats()});
$('query').addEventListener('input',()=>render());$('solution').addEventListener('change',()=>render());$('district').addEventListener('change',()=>render());$('canton').addEventListener('change',()=>{$('district').value='';updateDistrictOptions();render()});$('primeOnly').onclick=()=>{primeOnly=!primeOnly;$('primeOnly').classList.toggle('on',primeOnly);render()};$('eadminOnly').onclick=()=>{eadminOnly=!eadminOnly;$('eadminOnly').classList.toggle('on',eadminOnly);$('eadminOnly').classList.toggle('eadmin-on',eadminOnly);render()};$('districtsToggle').onclick=()=>{districtsMode=!districtsMode;if(!districtsMode)$('district').value='';updateDistrictOptions();$('districtsToggle').classList.toggle('on',districtsMode);$('districtsToggle').setAttribute('aria-expanded',String(districtsMode));render()};document.querySelectorAll('.market-toggle').forEach(button=>button.onclick=()=>{marketOnly=marketOnly===button.dataset.market?'':button.dataset.market;document.querySelectorAll('.market-toggle').forEach(x=>x.classList.toggle('on',x.dataset.market===marketOnly));render()});$('issuesOnly').onclick=()=>{issuesOnly=!issuesOnly;$('issuesOnly').classList.toggle('on',issuesOnly);$('issuesOnly').classList.toggle('warning',issuesOnly);render()};$('issuesCard').onclick=()=>{ofsMode=!ofsMode;if(!ofsMode)issuesOnly=false;$('issuesOnly').hidden=!ofsMode;$('issuesCard').classList.toggle('ofs-active',ofsMode);$('issuesCard').setAttribute('aria-pressed',String(ofsMode));$('ofsLabel').textContent=ofsMode?t('common.deliveryActive'):t('common.deliveryQuality');$('ofsCopy').textContent=ofsMode?t('common.deliveryDescriptionActive'):t('common.deliveryDescription');$('ofsCount').textContent=t('common.watchCount',{count:$('issues').textContent});$('ofsAction').textContent=ofsMode?t('common.reloadMarket'):t('common.openControl');$('ofsArrow').textContent=ofsMode?'←':'→';render()};$('reset').onclick=()=>{$('query').value='';$('canton').value='Tous';$('district').value='';$('solution').value='Tous';primeOnly=eadminOnly=issuesOnly=districtsMode=false;marketOnly='';updateDistrictOptions();document.querySelectorAll('.filter-toggle').forEach(x=>x.classList.remove('on','warning'));render()};$('syncReload').onclick=()=>loadData(true);$('exportBtn').onclick=()=>{const rows=filtered(),withTerritory=districtsMode,header=[t('common.name'),t('common.customerPrime'),t('common.canton'),...(withTerritory?[t('common.market'),t('common.district')]:[]),t('common.population'),t('common.integrator'),t('common.software'),'ERP',t('common.modules')],lines=[header.join('\t'),...rows.map(x=>[x.name,x.isPrime?t('common.yes'):t('common.no'),x.canton,...(withTerritory?[x.market,x.district]:[]),x.expectedPopulation,x.integrator,x.software,x.erp,(x.products||[]).join(' | ')].join('\t'))];const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/tab-separated-values'}));a.download='communes.tsv';a.click()};
document.querySelectorAll('.view-tab').forEach(button=>button.onclick=()=>{const view=button.dataset.view;document.querySelectorAll('.view-tab').forEach(tab=>tab.classList.toggle('active',tab===button));$('communesView').hidden=view!=='communes';$('mapView').hidden=view!=='map';$('statsView').hidden=view!=='stats';$('newsView').hidden=view!=='news';$('storiesView').hidden=view!=='stories';$('roadmapView').hidden=view!=='roadmap';$('syncReload').hidden=view!=='communes';if(view==='map')loadMap();if(view==='stats')renderStats();window.scrollTo({top:0,behavior:'smooth'})});

const sharedBindings = {
  all: [() => all, value => { all = value; }],
  primeOnly: [() => primeOnly, value => { primeOnly = value; }],
  eadminOnly: [() => eadminOnly, value => { eadminOnly = value; }],
  districtsMode: [() => districtsMode, value => { districtsMode = value; }],
  marketOnly: [() => marketOnly, value => { marketOnly = value; }],
  issuesOnly: [() => issuesOnly, value => { issuesOnly = value; }],
  ofsMode: [() => ofsMode, value => { ofsMode = value; }],
  sortKey: [() => sortKey, value => { sortKey = value; }],
  sortDirection: [() => sortDirection, value => { sortDirection = value; }],
  mapGeometry: [() => mapGeometry, value => { mapGeometry = value; }],
  mapMode: [() => mapMode, value => { mapMode = value; }],
  mapPerspective: [() => mapPerspective, value => { mapPerspective = value; }],
  mapProduct: [() => mapProduct, value => { mapProduct = value; }],
  mapViewBox: [() => mapViewBox, value => { mapViewBox = value; }],
  mapInitialViewBox: [() => mapInitialViewBox, value => { mapInitialViewBox = value; }],
  mapFullViewBox: [() => mapFullViewBox, value => { mapFullViewBox = value; }],
  statsMetric: [() => statsMetric, value => { statsMetric = value; }],
  statsThreshold: [() => statsThreshold, value => { statsThreshold = value; }],
  render: [() => render, value => { render = value; }],
  renderModules: [() => renderModules, value => { renderModules = value; }],
  renderErp: [() => renderErp, value => { renderErp = value; }],
  openDrawer: [() => openDrawer, value => { openDrawer = value; }],
  loadData: [() => loadData, value => { loadData = value; }],
  loadMap: [() => loadMap, value => { loadMap = value; }],
  mapDb: [() => mapDb, value => { mapDb = value; }],
  applyData: [() => applyData, value => { applyData = value; }],
  statsScopeRows: [() => statsScopeRows, value => { statsScopeRows = value; }]
};

for (const [name, [get, set]] of Object.entries(sharedBindings)) {
  Object.defineProperty(window, name, { configurable: true, get, set });
}

Object.assign(window, {
  PrimeCommunesRuntime: Object.freeze({
    get rows() { return all; },
    filtered,
    normalizeSearchText,
    escapeHtml: esc,
    formatNumber: fmt,
    openPortrait: commune => openDrawer(commune)
  }),
  ERP_BY_METIER,
  SUPABASE_URL,
  SUPABASE_KEY,
  closeDrawer,
  communeSearchMeta,
  esc,
  filtered,
  fmt,
  impactInitialViewBox,
  pct,
  renderMap,
  renderStats,
  setMapView,
  updateDistrictOptions,
  updateMapSearch
});

document.addEventListener('prime-language-change', () => {
  updateStatsScopeOptions();
  if (all.length) { render(); renderStats(); if (mapGeometry) { updateMapImpact(); updateMapLegend(); } }
});

// Prime Communes 2.0 — deterministic application entry.
// Transitional checkpoint: one bundled entry, identical baseline contracts.

const fmt=new Intl.NumberFormat('fr-CH'),pct=new Intl.NumberFormat('fr-CH',{minimumFractionDigits:1,maximumFractionDigits:1});let all=[],primeOnly=false,eadminOnly=false,issuesOnly=false,districtsMode=false,marketOnly='',ofsMode=false,sortKey='population',sortDirection='desc',mapGeometry=null,mapMode='integrator',mapPerspective='impact',mapProduct='eAdmin',mapViewBox=null,mapInitialViewBox=null,mapFullViewBox=null,mapDragging=false,mapMoved=false,statsMetric='population',statsThreshold=0;
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
  {label:'Commune',value:x.name||''},
  {label:'Canton',value:x.canton||''},
  {label:'Marché',value:x.market||''},
  {label:'District',value:x.district||''},
  {label:'Intégrateur',value:x.integrator||'À compléter'},
  {label:'Métier',value:x.software||''},
  {label:'ERP',value:x.erp||''},
  {label:'Modules',value:(x.products||[]).join(' · ')},
  {label:'Hébergeur',value:x.hosting||''},
  {label:'Client',value:x.isPrime?'Client Prime':''},
  {label:'Population',value:String(x.expectedPopulation||'')},
  {label:'Notes',value:x.notes||''}
]}
function communeSearchMeta(x,query){
  const q=normalizeSearchText(query),fields=communeSearchFields(x),name=normalizeSearchText(x.name);
  if(!q)return{score:100,label:'Commune',value:x.name||''};
  if(name===q)return{score:0,label:'Commune',value:x.name||''};
  if(name.startsWith(q))return{score:1,label:'Commune',value:x.name||''};
  if(name.split(/[^a-z0-9]+/).some(word=>word.startsWith(q)))return{score:2,label:'Commune',value:x.name||''};
  if(name.includes(q))return{score:3,label:'Commune',value:x.name||''};
  if(q.length>=4&&name.split(/[^a-z0-9]+/).some(word=>isNearSearchToken(word,q)))return{score:4,label:'Commune approchante',value:x.name||''};
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
  $('canton').innerHTML='<option>Tous</option>';fill('canton',[...new Set(all.map(x=>x.canton))].sort());
  updateDistrictOptions();
  const solutions=[...new Map(all.filter(x=>x.integrator||x.software).map(x=>{const value=(x.integrator||'')+'|||'+(x.software||''),label=(x.integrator||'À compléter')+' | '+(x.software||'—');return[value,{value,label}]})).values()].sort((a,b)=>a.label.localeCompare(b.label,'fr-CH',{sensitivity:'base'}));
  $('solution').innerHTML='<option value="Tous">Toutes</option>'+solutions.map(x=>`<option value="${esc(x.value)}">${esc(x.label)}</option>`).join('');
  const products=[...new Set(all.flatMap(x=>x.products||[]))].sort((a,b)=>a.localeCompare(b,'fr-CH',{sensitivity:'base'}));$('mapProduct').innerHTML=products.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(products.includes(mapProduct))$('mapProduct').value=mapProduct;
  updateStatsScopeOptions();$('syncText').textContent='Données au '+new Date(data.meta.referenceDate+'T00:00:00').toLocaleDateString('fr-CH')+' · '+source;render();renderStats();if(mapGeometry)renderMap();
}
function mapDb(x){return{id:x.bfs_id,name:x.name,canton:x.canton,market:x.market,districtCode:x.bezirk_code??'',district:x.bezirk??'',expectedPopulation:x.expected_population??0,receivedPopulation:x.received_population,receivedOn:x.received_on??'',comment:x.comment??'',echVersion:x.ech_version??'',missingEwid:x.missing_ewid,ewidErrorRate:x.ewid_error_rate,deliveryStatus:x.delivery_status??'unknown',software:x.software??'',integrator:x.integrator??'',primeClient:x.prime_client,erp:x.erp??'',salesStatus:x.sales_status??'none',notes:x.notes??'',products:x.products??[]}}
async function loadData(manual=false){
  const isManual=manual===true,started=performance.now(),sync=$('syncReload');
  if(sync){sync.dataset.state='loading';sync.disabled=true}
  $('syncText').textContent='Actualisation…';
  try{
    const rows=[];for(let from=0;;from+=1000){const r=await fetch(SUPABASE_URL+'/rest/v1/GemeindeAktuell?select=*&order=bfs_id',{headers:{apikey:SUPABASE_KEY,Range:from+'-'+(from+999)},cache:'no-store'});if(!r.ok)throw new Error('Supabase '+r.status);const page=await r.json();rows.push(...page);if(page.length<1000)break}
    const municipalities=rows.map(mapDb),referenceDate=rows.find(x=>x.reference_date)?.reference_date??'2026-06-30';applyData({meta:{referenceDate,municipalityCount:municipalities.length,expectedPopulation:municipalities.reduce((s,x)=>s+x.expectedPopulation,0)},municipalities},'base live');
    if(isManual){
      const seconds=Math.max(.1,(performance.now()-started)/1000).toFixed(1).replace('.',',');
      sync.dataset.state='success';
      $('syncText').textContent='À jour ✓ · '+municipalities.length.toLocaleString('fr-CH')+' communes · '+seconds+' s';
    }else sync.dataset.state='ready';
  }catch(e){
    try{
      const r=await fetch('public/data/municipalities-v4.json');const fallback=await r.json();applyData(fallback,'copie locale');
      if(isManual){sync.dataset.state='fallback';$('syncText').textContent='Copie locale chargée · base indisponible'}
      else sync.dataset.state='ready';
    }catch(fallbackError){
      if(sync)sync.dataset.state='error';
      $('syncText').textContent='Erreur de chargement';
      throw fallbackError;
    }
  }finally{if(sync)sync.disabled=false}
}
loadData().catch(e=>{$('syncText').textContent='Erreur de chargement';$('rows').innerHTML='<tr><td colspan="8">'+esc(e?.message||e)+'</td></tr>'});
function fill(id,values){values.forEach(v=>$(id).insertAdjacentHTML('beforeend',`<option>${esc(v)}</option>`))}
function updateDistrictOptions(){const previous=$('district').value,canton=$('canton').value,active=districtsMode&&canton!=='Tous';$('districtFilter').hidden=!active;if(!active){$('district').value='';$('district').innerHTML='<option value="">Tous les districts</option>';return}const districts=[...new Map(all.filter(x=>x.districtCode&&x.canton===canton).map(x=>[x.districtCode,{code:x.districtCode,label:x.district}])).values()].sort((a,b)=>a.label.localeCompare(b.label,'fr-CH',{sensitivity:'base'}));$('district').innerHTML='<option value="">Tous les districts</option>'+districts.map(x=>`<option value="${esc(x.code)}">${esc(x.label)}</option>`).join('');if(districts.some(x=>x.code===previous))$('district').value=previous}
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
function renderErp(x,drawer=false){const erp=String(x.erp||'').trim();if(!erp)return drawer?'Non renseigné':'<span class="empty">—</span>';const key=erp.toLocaleLowerCase('fr-CH'),extra=drawer?' drawer-solution-mark':'';if(key==='proconcept'||key==='proconcept erp'||key==='pce')return `<img class="solution-mark proconcept-mark${extra}" src="public/assets/logos/proconcept.png?v=1" alt="ProConcept ERP" title="ProConcept ERP">`;if(key==='innosolvcity'||key==='innosolv')return `<img class="solution-mark innosolvcity-mark${extra}" src="public/assets/logos/innosolvcity.png?v=1" alt="innosolvcity" title="innosolvcity">`;return esc(erp)}
function render(){
  const list=filtered(); $('resultCount').textContent=fmt.format(list.length); $('limit').textContent=list.length>120?'120 premiers résultats affichés · affinez les filtres pour aller plus loin':'';
  $('tableHead').innerHTML='<tr>'+(ofsMode?'<th>État</th>':'')+`<th class="sortable" id="sortName">Commune ${sortKey==='name'?(sortDirection==='asc'?'↑':'↓'):''}</th>`+'<th class="client-heading">Client</th><th>Canton</th>'+(districtsMode?'<th class="territory-column">Marché</th><th class="territory-column">District</th>':'')+`<th class="sortable" id="sortPopulation">Population ${sortKey==='population'?(sortDirection==='asc'?'↑':'↓'):''}</th>`+'<th class="ecosystem-start">Intégrateur</th><th>Métier</th><th>ERP</th><th>Modules</th>'+(ofsMode?'<th>Erreur EWID</th>':'')+'<th></th></tr>';
  $('rows').innerHTML=list.slice(0,120).map(x=>`<tr data-id="${x.id}">${ofsMode?`<td><span class="status-help" title="${esc((x.comment||'Statut Delimo')+' — cliquer pour le détail')}" aria-label="${esc(x.comment||'Statut Delimo')}"><span class="status-dot ${esc(x.deliveryStatus)}"></span><span class="status-info" aria-hidden="true">i</span></span></td>`:''}<td><strong>${esc(x.name)}</strong></td><td class="client-cell">${x.isPrime?'<img class="prime-client-mark" src="public/prime-one-negative.png?v=4" alt="Client Prime" title="Client Prime">':''}</td><td><span class="canton-cell"><img src="public/cantons/${esc(x.canton.toLowerCase())}.svg" alt="">${esc(x.canton)}</span></td>${districtsMode?`<td class="market-cell territory-column">${esc(x.market)}</td><td class="territory-column">${x.district?esc(x.district):'<span class="empty">—</span>'}</td>`:''}<td class="numeric">${fmt.format(x.expectedPopulation)}</td><td class="ecosystem-start">${x.integrator?esc(x.integrator):'<span class="empty">À compléter</span>'}</td><td class="metier-cell">${renderSoftware(x)}</td><td class="erp-cell">${renderErp(x)}</td><td class="modules-cell">${renderModules(x)||'<span class="empty">—</span>'}</td>${ofsMode?`<td><span class="rate ${(x.ewidErrorRate??0)>1?'high':''}">${x.ewidErrorRate==null?'—':x.ewidErrorRate.toFixed(1)}%</span></td>`:''}<td class="arrow">›</td></tr>`).join('');
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
function updateMapImpact(){const romandie=all.filter(x=>x.market==='Welsch'),prime=romandie.filter(x=>x.isPrime),total=romandie.reduce((sum,x)=>sum+x.expectedPopulation,0),covered=prime.reduce((sum,x)=>sum+x.expectedPopulation,0),share=covered/total*100,ratio=Math.max(1,Math.round(total/covered));$('mapImpactRatio').textContent=`1 Romand sur ${ratio}`;$('mapImpactPopulation').textContent=fmt.format(covered);$('mapImpactShare').textContent=pct.format(share)+'%'}
function updateStatsScopeOptions(){
  if(!all.length)return;const current=$('statsScope').value||'romandie';
  $('statsScope').innerHTML='<option value="romandie">Suisse romande</option><option value="JU">Jura</option><option value="jura-bernois">Jura bernois</option><option value="VD">Vaud</option><option value="FR-welsch">Fribourg</option><option value="VS-welsch">Valais</option>';
  $('statsScope').value=[...$('statsScope').options].some(x=>x.value===current)?current:'romandie';
}
function statsScopeRows(scope,threshold=statsThreshold){
  let rows=scope==='romandie'?all.filter(x=>x.market==='Welsch'):scope==='jura-bernois'?all.filter(x=>x.canton==='BE'&&/jura bernois/i.test(x.district||'')):scope==='FR-welsch'?all.filter(x=>x.canton==='FR'&&x.market==='Welsch'):scope==='VS-welsch'?all.filter(x=>x.canton==='VS'&&x.market==='Welsch'):all.filter(x=>x.canton===scope);
  return rows.filter(x=>x.expectedPopulation>=threshold);
}
function statsAggregate(rows,key){
  const groups=new Map();rows.forEach(x=>{const name=x[key]||'À compléter',entry=groups.get(name)||{name,communes:0,population:0};entry.communes++;entry.population+=x.expectedPopulation||0;groups.set(name,entry)});return [...groups.values()].sort((a,b)=>b[statsMetric]-a[statsMetric]);
}
function statsShare(rows){const total=rows.reduce((s,x)=>s+x.expectedPopulation,0),prime=rows.filter(x=>x.isPrime),covered=prime.reduce((s,x)=>s+x.expectedPopulation,0);return{total,covered,communes:rows.length,primeCommunes:prime.length,populationShare:total?covered/total*100:0,communeShare:rows.length?prime.length/rows.length*100:0}}
function renderStatsRanking(target,groups,palette){
  const max=Math.max(1,...groups.map(x=>x[statsMetric])),total=groups.reduce((s,x)=>s+x[statsMetric],0);$(target).innerHTML=groups.slice(0,8).map((x,index)=>{const value=x[statsMetric],share=total?value/total*100:0,color=palette?.[x.name]||(x.name==='Prime'?'#289cff':['#7457ff','#36b89a','#f08a4b','#d15fa4','#4f7fd5','#cf7354'][index%6]);return`<div class="stats-rank"><div class="stats-rank-label"><strong>${esc(x.name)}</strong><span>${statsMetric==='population'?fmt.format(value)+' hab.':fmt.format(value)+' communes'} · ${pct.format(share)}%</span></div><div class="stats-bar"><i style="--bar-width:${value/max*100}%;--bar-color:${color}"></i></div><small>${x.communes} commune${x.communes>1?'s':''} · ${fmt.format(x.population)} habitants</small></div>`}).join('')||'<p class="stats-empty">Aucune donnée pour ce périmètre.</p>';
}
function renderStats(){
  if(!all.length)return;const scope=$('statsScope').value||'romandie',rows=statsScopeRows(scope),summary=statsShare(rows),metricShare=statsMetric==='population'?summary.populationShare:summary.communeShare,integrators=statsAggregate(rows,'integrator'),softwares=statsAggregate(rows,'software'),competitor=integrators.find(x=>x.name!=='Prime'&&x.name!=='À compléter'),metricTotal=rows.reduce((s,x)=>s+(statsMetric==='population'?x.expectedPopulation:1),0),competitorShare=competitor&&metricTotal?competitor[statsMetric]/metricTotal*100:0;
  $('statsPrimeShare').textContent=pct.format(metricShare)+'%';$('statsPrimeDetail').textContent=statsMetric==='population'?`${fmt.format(summary.covered)} habitants couverts`:`${summary.primeCommunes} communes sur ${summary.communes}`;$('statsMunicipalities').textContent=fmt.format(summary.communes);$('statsPopulation').textContent=fmt.format(summary.total)+' habitants';$('statsCompetitor').textContent=competitor?.name||'—';$('statsCompetitorShare').textContent=competitor?`${fmt.format(competitor[statsMetric])} · ${pct.format(competitorShare)}%`:'Aucune donnée';
  const territories=[['Jura','JU'],['Jura bernois','jura-bernois'],['Vaud','VD'],['Fribourg','FR-welsch'],['Valais','VS-welsch'],['Suisse romande','romandie']].map(([name,value])=>({name,value,...statsShare(statsScopeRows(value,0))}));
  $('territoryComparison').innerHTML=territories.map(x=>`<button data-stats-scope="${x.value}"><span><strong>${x.name}</strong><small>${x.primeCommunes}/${x.communes} communes Prime</small></span><b>${pct.format(x.populationShare)}%</b><i><em style="width:${Math.min(100,x.populationShare)}%"></em></i><small>${fmt.format(x.covered)} habitants couverts sur ${fmt.format(x.total)}</small></button>`).join('');
  $('territoryComparison').querySelectorAll('button').forEach(button=>button.onclick=()=>{$('statsScope').value=button.dataset.statsScope;renderStats()});
  const large5=statsScopeRows(scope,5000),large10=statsScopeRows(scope,10000),prime5=large5.filter(x=>x.isPrime).length,prime10=large10.filter(x=>x.isPrime).length,scopeName=$('statsScope').selectedOptions[0]?.textContent||'ce territoire';
  $('statsPrime5').textContent=`${prime5}/${large5.length}`;$('statsPrime5Detail').textContent=`clients Prime · ${scopeName}`;$('statsPrime10').textContent=`${prime10}/${large10.length}`;$('statsPrime10Detail').textContent=`clients Prime · ${scopeName}`;
  $('statsRankingTitle').textContent=`Intégrateurs · ${statsThreshold?`≥ ${fmt.format(statsThreshold)}`:'toutes tailles'}`;renderStatsRanking('statsIntegratorRanking',integrators,mapPalettes.integrator);renderStatsRanking('statsSoftwareRanking',softwares,mapPalettes.software);
}
function updateMapLegend(){
  if(!all.length)return;const romandie=all.filter(x=>x.market==='Welsch');let entries;
  if(mapPerspective==='impact'){entries=[['Communes Prime',romandie.filter(x=>x.isPrime).length,'#289cff','solid'],['innosolvcity · Prime',romandie.filter(x=>x.isPrime&&x.software==='innosolvcity').length,'#44dc98','solid'],['innosolvcity · écosystème',romandie.filter(x=>!x.isPrime&&x.software==='innosolvcity').length,'#44dc98','outline'],['eAdmin · Prime',romandie.filter(x=>x.isPrime&&x.products?.includes('eAdmin')).length,'#e52332','solid']]}
  else if(mapMode==='product'){const count=romandie.filter(x=>x.products?.includes(mapProduct)).length;entries=[[mapProduct,count,'#36d494'],[`Sans ${mapProduct}`,romandie.length-count,'#253142']]}
  else{const key=mapMode==='software'?'software':'integrator',counts=new Map();romandie.forEach(x=>{const value=x[key]||'À compléter';counts.set(value,(counts.get(value)||0)+1)});entries=[...counts].sort((a,b)=>b[1]-a[1]).map(([name,count])=>[name,count,mapPalettes[mapMode]?.[name]||mapFallback])}
  $('mapLegend').innerHTML=entries.map(([name,count,color,kind='solid'])=>`<span><i class="${kind}" style="--legend-color:${color}"></i>${esc(name)} · ${count}</span>`).join('');
}
function updateMapSearch(){
  const query=normalizeSearchText($('mapQuery').value),lookup=new Map(all.map(x=>[String(x.id),x]));let matches=0;
  document.querySelectorAll('.map-commune').forEach(path=>{const commune=lookup.get(path.dataset.id),hit=!query||normalizeSearchText(commune?.name).includes(query);path.classList.toggle('dimmed',!hit);path.classList.toggle('search-hit',Boolean(query&&hit));if(hit)matches++});
  $('mapCommuneCount').textContent=fmt.format(query?matches:(mapGeometry?.meta.municipalityCount||621));
}
async function loadMap(){
  if(mapGeometry)return;try{const response=await fetch('public/data/swiss-map-v1.json');if(!response.ok)throw new Error('Carte indisponible');mapGeometry=await response.json();mapFullViewBox=[...mapGeometry.meta.viewBox];mapInitialViewBox=impactInitialViewBox();mapViewBox=[...mapInitialViewBox];setMapView();renderMap()}catch(error){$('mapLoading').innerHTML='Impossible de charger la carte'}
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
$('query').addEventListener('input',render);$('solution').addEventListener('change',render);$('district').addEventListener('change',render);$('canton').addEventListener('change',()=>{$('district').value='';updateDistrictOptions();render()});$('primeOnly').onclick=()=>{primeOnly=!primeOnly;$('primeOnly').classList.toggle('on',primeOnly);render()};$('eadminOnly').onclick=()=>{eadminOnly=!eadminOnly;$('eadminOnly').classList.toggle('on',eadminOnly);$('eadminOnly').classList.toggle('eadmin-on',eadminOnly);render()};$('districtsToggle').onclick=()=>{districtsMode=!districtsMode;if(!districtsMode)$('district').value='';updateDistrictOptions();$('districtsToggle').classList.toggle('on',districtsMode);$('districtsToggle').setAttribute('aria-expanded',String(districtsMode));render()};document.querySelectorAll('.market-toggle').forEach(button=>button.onclick=()=>{marketOnly=marketOnly===button.dataset.market?'':button.dataset.market;document.querySelectorAll('.market-toggle').forEach(x=>x.classList.toggle('on',x.dataset.market===marketOnly));render()});$('issuesOnly').onclick=()=>{issuesOnly=!issuesOnly;$('issuesOnly').classList.toggle('on',issuesOnly);$('issuesOnly').classList.toggle('warning',issuesOnly);render()};$('issuesCard').onclick=()=>{ofsMode=!ofsMode;if(!ofsMode)issuesOnly=false;$('issuesOnly').hidden=!ofsMode;$('issuesCard').classList.toggle('ofs-active',ofsMode);$('issuesCard').setAttribute('aria-pressed',String(ofsMode));$('ofsLabel').textContent=ofsMode?'Contrôle Delimo actif':'Qualité des livraisons';$('ofsCopy').textContent=ofsMode?'Les statuts OFS et erreurs EWID sont affichés dans le tableau.':'Afficher les statuts, erreurs EWID et commentaires OFS.';$('ofsCount').textContent=$('issues').textContent+' à surveiller';$('ofsAction').textContent=ofsMode?'Revenir au marché':'Ouvrir le contrôle';$('ofsArrow').textContent=ofsMode?'←':'→';render()};$('reset').onclick=()=>{$('query').value='';$('canton').value='Tous';$('district').value='';$('solution').value='Tous';primeOnly=eadminOnly=issuesOnly=districtsMode=false;marketOnly='';updateDistrictOptions();document.querySelectorAll('.filter-toggle').forEach(x=>x.classList.remove('on','warning'));render()};$('syncReload').onclick=()=>loadData(true);$('exportBtn').onclick=()=>{const rows=filtered(),withTerritory=districtsMode,header=['Nom','Client Prime','Canton',...(withTerritory?['Marché','District']:[]),'Population','Intégrateur','Métier','ERP','Modules'],lines=[header.join('\t'),...rows.map(x=>[x.name,x.isPrime?'Oui':'Non',x.canton,...(withTerritory?[x.market,x.district]:[]),x.expectedPopulation,x.integrator,x.software,x.erp,(x.products||[]).join(' | ')].join('\t'))];const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/tab-separated-values'}));a.download='communes.tsv';a.click()};
document.querySelectorAll('.view-tab').forEach(button=>button.onclick=()=>{const view=button.dataset.view;document.querySelectorAll('.view-tab').forEach(tab=>tab.classList.toggle('active',tab===button));$('communesView').hidden=view!=='communes';$('mapView').hidden=view!=='map';$('statsView').hidden=view!=='stats';$('newsView').hidden=view!=='news';$('storiesView').hidden=view!=='stories';$('roadmapView').hidden=view!=='roadmap';$('syncReload').hidden=view!=='communes';if(view==='map')loadMap();if(view==='stats')renderStats();window.scrollTo({top:0,behavior:'smooth'})});


// ---- app/prime-communes-data-1.5.js ----
(() => {
  'use strict';

  // Prime Communes · DATA 1.5
  // One read-only source layer for every view. It owns transport, normalization,
  // language scopes and the shared data-ready event; views only consume rows.
  const LOCAL_FALLBACK = 'public/data/municipalities-v4.json';
  const PAGE_SIZE = 1000;
  const FRENCH_MARKET = 'Welsch';
  const PRIME_INNOSOLV_SOFTWARE = new Set(['innosolvcity', 'innosolv']);
  const ERP_BY_METIER_LOCAL = {
    ETIC: 'Abacus', Urbanus: 'Urbanus', Citizen: 'Citizen', BDI: 'BDI',
    Epsilon: 'Epsilon', 'Crésus': 'Crésus', Ruf: 'Ruf', Calvin: 'Opale'
  };

  const listeners = new Set();
  let snapshot = null;
  let readyResolve;
  const firstReady = new Promise(resolve => { readyResolve = resolve; });

  const nf = new Intl.NumberFormat('fr-CH');
  const pf = new Intl.NumberFormat('fr-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const byId = id => document.getElementById(id);
  const normalizeText = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-CH')
    .trim();
  const decode = value => {
    const node = document.createElement('textarea');
    node.innerHTML = String(value ?? '');
    return node.value;
  };

  function mapRow(row) {
    return {
      id: row.bfs_id,
      name: row.name,
      canton: row.canton,
      market: row.market,
      districtCode: row.bezirk_code ?? '',
      district: row.bezirk ?? '',
      expectedPopulation: row.expected_population ?? 0,
      receivedPopulation: row.received_population,
      receivedOn: row.received_on ?? '',
      comment: row.comment ?? '',
      echVersion: row.ech_version ?? '',
      missingEwid: row.missing_ewid,
      ewidErrorRate: row.ewid_error_rate,
      deliveryStatus: row.delivery_status ?? 'unknown',
      software: row.software ?? '',
      integrator: row.integrator ?? '',
      primeClient: row.prime_client,
      erp: row.erp ?? '',
      hosting: row.hosting ?? '',
      hostingCode: row.hosting_code ?? '',
      salesStatus: row.sales_status ?? 'none',
      notes: row.notes ?? '',
      products: row.products ?? []
    };
  }

  function normalizeMunicipality(row) {
    const products = [...(row.products ?? [])];
    if (Number(row.id) === 2206 && !products.includes('Clever.Tax')) products.push('Clever.Tax');
    const explicitPrime = row.primeClient ?? row.prime_client;
    const isPrime = explicitPrime == null
      ? Boolean(row.isPrime || row.integrator === 'Prime' || (row.canton === 'GE' && products.includes('eAdmin')))
      : Boolean(explicitPrime);
    const hasExplicitErp = Object.prototype.hasOwnProperty.call(row, 'erp');
    const erp = hasExplicitErp ? (row.erp || '') : (ERP_BY_METIER_LOCAL[row.software] || '');
    return {
      ...row,
      name: decode(row.name),
      district: decode(row.district),
      comment: decode(row.comment),
      products,
      isPrime,
      primeClient: isPrime,
      erp
    };
  }

  const isFrench = row => row?.market === FRENCH_MARKET;
  const isInnosolv = row => PRIME_INNOSOLV_SOFTWARE.has(normalizeText(row?.software));
  const isPrimeInnosolv = row => Boolean(row?.isPrime) && isInnosolv(row);

  function scopeRows(rows, scope = 'romandie', threshold = 0) {
    const source = Array.isArray(rows) ? rows : [];
    let scoped;
    if (scope === 'romandie') {
      scoped = source.filter(isFrench);
    } else if (scope === 'jura-bernois') {
      scoped = source.filter(row => row.canton === 'BE' && isFrench(row) && /jura bernois/i.test(row.district || ''));
    } else if (scope === 'FR-welsch') {
      scoped = source.filter(row => row.canton === 'FR' && isFrench(row));
    } else if (scope === 'VS-welsch') {
      scoped = source.filter(row => row.canton === 'VS' && isFrench(row));
    } else {
      scoped = source.filter(row => row.canton === scope);
    }
    return scoped.filter(row => Number(row.expectedPopulation || 0) >= Number(threshold || 0));
  }

  function publish(rows, meta, source) {
    snapshot = { rows, meta, source };
    if (readyResolve) {
      readyResolve(snapshot);
      readyResolve = null;
    }
    listeners.forEach(listener => {
      try { listener(snapshot); } catch (error) { console.error('Prime Communes · data consumer', error); }
    });
    window.dispatchEvent(new CustomEvent('prime:data-ready', { detail: snapshot }));
  }

  function populateSharedUi(rows, meta, source) {
    const expectedPopulation = Number(meta?.expectedPopulation ?? rows.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0));
    const municipalityCount = Number(meta?.municipalityCount ?? rows.length);
    const over = rows.filter(row => row.expectedPopulation >= 10000);
    const prime = rows.filter(row => row.isPrime);
    const issues = rows.filter(row => row.deliveryStatus !== 'accepted');
    const overPopulation = over.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);

    if (byId('population')) byId('population').textContent = nf.format(expectedPopulation);
    if (byId('communeCount')) byId('communeCount').textContent = nf.format(municipalityCount);
    if (byId('headerCommuneCount')) byId('headerCommuneCount').textContent = nf.format(municipalityCount);
    if (byId('over10k')) byId('over10k').textContent = nf.format(over.length);
    if (byId('over10kPop')) byId('over10kPop').textContent = nf.format(overPopulation);
    if (byId('over10kShare')) byId('over10kShare').textContent = `${pf.format(rows.length ? over.length / rows.length * 100 : 0)}%`;
    if (byId('over10kPopShare')) byId('over10kPopShare').textContent = `${pf.format(expectedPopulation ? overPopulation / expectedPopulation * 100 : 0)}%`;
    if (byId('prime')) byId('prime').textContent = nf.format(prime.length);
    if (byId('primePop')) byId('primePop').textContent = nf.format(prime.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0));
    if (byId('issues')) byId('issues').textContent = nf.format(issues.length);
    if (byId('mapCommuneCount')) byId('mapCommuneCount').textContent = nf.format(scopeRows(rows, 'romandie', 0).length);

    const cantonSelect = byId('canton');
    if (cantonSelect) {
      const cantons = [...new Set(rows.map(row => row.canton).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr-CH'));
      cantonSelect.innerHTML = '<option>Tous</option>' + cantons.map(canton => `<option>${String(canton).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))}</option>`).join('');
    }
    if (typeof updateDistrictOptions === 'function') updateDistrictOptions();

    const solutionSelect = byId('solution');
    if (solutionSelect) {
      const solutions = [...new Map(rows.filter(row => row.integrator || row.software).map(row => {
        const value = `${row.integrator || ''}|||${row.software || ''}`;
        const label = `${row.integrator || 'À compléter'} | ${row.software || '—'}`;
        return [value, { value, label }];
      })).values()].sort((a, b) => a.label.localeCompare(b.label, 'fr-CH', { sensitivity: 'base' }));
      const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      solutionSelect.innerHTML = '<option value="Tous">Toutes</option>' + solutions.map(item => `<option value="${escape(item.value)}">${escape(item.label)}</option>`).join('');
    }

    if (typeof updateStatsScopeOptions === 'function') updateStatsScopeOptions();
    const syncText = byId('syncText');
    if (syncText) {
      const referenceDate = meta?.referenceDate || '2026-06-30';
      syncText.textContent = `Données au ${new Date(`${referenceDate}T00:00:00`).toLocaleDateString('fr-CH')} · ${source}`;
    }
  }

  function applyPayload(data, source = 'base live') {
    const rows = (data?.municipalities || []).map(normalizeMunicipality);
    const meta = {
      referenceDate: data?.meta?.referenceDate || '2026-06-30',
      municipalityCount: data?.meta?.municipalityCount ?? rows.length,
      expectedPopulation: data?.meta?.expectedPopulation ?? rows.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0)
    };

    // `all` remains the temporary compatibility store for the 1.1 shell.
    // Consumers in 1.5 can use PrimeCommunesData.getSnapshot()/subscribe().
    all = rows;
    populateSharedUi(rows, meta, source);
    if (typeof render === 'function') render();
    if (typeof renderStats === 'function') renderStats();
    publish(rows, meta, source);
  }

  async function fetchLive() {
    const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
    const supabaseKey = typeof SUPABASE_KEY !== 'undefined' ? SUPABASE_KEY : '';
    if (!supabaseUrl || !supabaseKey) throw new Error('Configuration Supabase indisponible.');

    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const response = await fetch(`${supabaseUrl}/rest/v1/GemeindeAktuell?select=*&order=bfs_id`, {
        headers: { apikey: supabaseKey, Range: `${from}-${from + PAGE_SIZE - 1}` },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Supabase ${response.status}`);
      const page = await response.json();
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const municipalities = rows.map(mapRow);
    const referenceDate = rows.find(row => row.reference_date)?.reference_date ?? '2026-06-30';
    return {
      data: {
        meta: {
          referenceDate,
          municipalityCount: municipalities.length,
          expectedPopulation: municipalities.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0)
        },
        municipalities
      },
      source: 'base live'
    };
  }

  async function load() {
    try {
      return await fetchLive();
    } catch (liveError) {
      const response = await fetch(LOCAL_FALLBACK, { cache: 'no-store' });
      if (!response.ok) throw liveError;
      return { data: await response.json(), source: 'copie locale' };
    }
  }

  async function reload() {
    const syncText = byId('syncText');
    if (syncText) syncText.textContent = 'Actualisation…';
    try {
      const result = await load();
      applyPayload(result.data, result.source);
      return result;
    } catch (error) {
      if (syncText) syncText.textContent = 'Erreur de chargement';
      const rowsNode = byId('rows');
      if (rowsNode) rowsNode.innerHTML = `<tr><td colspan="9">${String(error?.message || error)}</td></tr>`;
      throw error;
    }
  }

  const api = {
    load,
    reload,
    mapRow,
    normalizeMunicipality,
    normalizeText,
    isFrench,
    isInnosolv,
    isPrimeInnosolv,
    scopeRows,
    getSnapshot: () => snapshot,
    whenReady: () => snapshot ? Promise.resolve(snapshot) : firstReady,
    subscribe(listener) {
      listeners.add(listener);
      if (snapshot) listener(snapshot);
      return () => listeners.delete(listener);
    }
  };

  window.PrimeCommunesData = api;

  // Replace the historical transport/scope functions as soon as this layer loads.
  // The visible shell remains unchanged while data ownership moves out of index.html.
  try { mapDb = mapRow; } catch (_) {}
  try { applyData = applyPayload; } catch (_) {}
  try { loadData = reload; } catch (_) {}
  try {
    statsScopeRows = (scope, threshold = statsThreshold) => scopeRows(all, scope, threshold);
  } catch (_) {}

  const reloadButton = byId('syncReload');
  if (reloadButton) reloadButton.onclick = () => reload().catch(() => {});

  // mapProduct belonged to the retired SVG/product map. DATA no longer writes it,
  // so it can leave the DOM before MapLibre retires the rest of the legacy controls.
  byId('mapProduct')?.remove();

  // If the very first legacy request won the race before this file loaded,
  // adopt its rows so 1.5 consumers still receive a canonical ready signal.
  queueMicrotask(() => {
    try {
      if (!snapshot && Array.isArray(all) && all.length) {
        const meta = {
          referenceDate: '2026-06-30',
          municipalityCount: all.length,
          expectedPopulation: all.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0)
        };
        publish(all, meta, 'base live');
      }
    } catch (_) {}
  });
})();
// ---- app/prime-communes-maplibre-1.2.js ----
(() => {
  'use strict';

  // Prime Communes · Carte 1.2
  // Canonical MapLibre runtime. It owns map loading, geometry and interaction.
  // Business data stays read-only here.
  const MAPLIBRE_VERSION = '6.7.0';
  const MAPLIBRE_MODULE = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`;
  const MAPLIBRE_CSS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
  const GLYPHS_URL = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
  const GEOMETRY_URL = 'public/data/swiss-map-v1.json';
  const RASTER_URL = 'public/swiss-base.webp';
  const COUNTRY_BORDER_URL = 'public/data/switzerland-border-2026.geojson';
  const ACTIVE_TERRITORIES = new Set(['JU', 'BE', 'VD', 'FR']);
  const ACTIVE_TERRITORY_LABEL = 'Jura · Berne · Vaud · Fribourg (romands)';
  const PRIME_INNOSOLV_SOFTWARE = new Set(['innosolvcity', 'innosolv']);

  const panel = document.getElementById('mapPanel');
  const legacyStage = document.getElementById('mapStage');
  let query = document.getElementById('mapQuery');
  if (!panel || !legacyStage || !query) return;

  const nf = new Intl.NumberFormat('fr-CH');
  const pf = new Intl.NumberFormat('fr-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const html = value => typeof esc === 'function'
    ? esc(value)
    : String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const normalizeText = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-CH')
    .trim();
  const isPrimeInnosolv = row => Boolean(row?.isPrime) && PRIME_INNOSOLV_SOFTWARE.has(normalizeText(row?.software));
  const isInnosolv = row => PRIME_INNOSOLV_SOFTWARE.has(normalizeText(row?.software));

  let metrics = null;
  let stage = null;
  let map = null;
  let maplibregl = null;
  let geometry = null;
  let municipalityGeoJSON = null;
  let cantonGeoJSON = null;
  let countryBorderGeoJSON = null;
  let pointGeoJSON = null;
  let hoverPopup = null;
  let clickPopup = null;
  let loadingPromise = null;
  let selectedId = '';
  let viewButtons = [];
  let activeView = 'impact';
  let suggestionsBox = null;
  let suggestions = [];
  let suggestionIndex = -1;
  let resizeTimer = null;

  // Warm the slow pieces before the user opens Carte.
  const mapLibreModulePromise = import(MAPLIBRE_MODULE);
  const geometryPromise = fetch(GEOMETRY_URL, { cache: 'force-cache' })
    .then(response => {
      if (!response.ok) throw new Error('Géométrie cartographique indisponible.');
      return response.json();
    });
  const countryBorderPromise = fetch(COUNTRY_BORDER_URL, { cache: 'force-cache' })
    .then(response => {
      if (!response.ok) throw new Error('Frontière nationale indisponible.');
      return response.json();
    });
  const rasterPreload = new Image();
  rasterPreload.decoding = 'async';
  try { rasterPreload.fetchPriority = 'low'; } catch (_) {}
  rasterPreload.src = RASTER_URL;

  function injectAssets() {
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
      const external = document.createElement('link');
      external.rel = 'stylesheet';
      external.href = MAPLIBRE_CSS;
      external.crossOrigin = 'anonymous';
      document.head.append(external);
    }
  }

  function ensureMetrics() {
    if (metrics) return metrics;
    metrics = document.createElement('div');
    metrics.className = 'maplibre-metrics maplibre-metrics-b';
    metrics.id = 'mapLibreMetrics';
    metrics.innerHTML = `
      <article class="maplibre-metric">
        <div class="maplibre-metric-copy">
          <p>Suisse romande</p>
          <strong id="mapLibreRomandieRatio">—</strong>
          <span id="mapLibreRomandiePopulation">—</span>
          <div class="maplibre-progress" aria-hidden="true"><i id="mapLibreRomandieProgress"></i></div>
          <small id="mapLibreRomandieTotal">—</small>
        </div>
        <div class="maplibre-mini-map" id="mapLibreRomandieMap" aria-hidden="true"></div>
      </article>
      <article class="maplibre-metric">
        <div class="maplibre-metric-copy">
          <p>Territoire innosolvcity Prime</p>
          <strong id="mapLibreActiveRatio">—</strong>
          <span id="mapLibreActivePopulation">—</span>
          <div class="maplibre-progress" aria-hidden="true"><i id="mapLibreActiveProgress"></i></div>
          <small>${ACTIVE_TERRITORY_LABEL}</small>
          <div class="maplibre-territory-chips" aria-hidden="true"><i>JU</i><i>BE</i><i>VD</i><i>FR</i></div>
        </div>
        <div class="maplibre-mini-map" id="mapLibreActiveMap" aria-hidden="true"></div>
      </article>`;
    panel.insertAdjacentElement('beforebegin', metrics);
    return metrics;
  }

  function retireLegacyUi() {
    const toolbar = panel.querySelector('.map-toolbar');
    const legacyControls = toolbar?.querySelector('.map-controls');
    const legacyProduct = legacyControls?.querySelector('#mapProduct');

    // The current shared data loader still writes its historical product select.
    // Keep that compatibility node invisible; Carte itself no longer exposes or uses it.
    if (legacyProduct) {
      let bridge = document.getElementById('mapCompatibilityBridge');
      if (!bridge) {
        bridge = document.createElement('div');
        bridge.id = 'mapCompatibilityBridge';
        bridge.hidden = true;
        document.body.append(bridge);
      }
      bridge.append(legacyProduct);
    }
    legacyControls?.remove();
    legacyStage.remove();
  }

  function ensureStage() {
    if (stage) return stage;
    stage = document.createElement('div');
    stage.className = 'maplibre-stage';
    stage.id = 'mapLibreStage';
    stage.innerHTML = `
      <div id="primeMapLibre" aria-label="Carte interactive des communes suisses"></div>
      <div class="maplibre-loading" id="mapLibreLoading"><span></span>Chargement de la carte…</div>`;
    panel.append(stage);
    return stage;
  }

  function configureToolbar() {
    const toolbar = panel.querySelector('.map-toolbar');
    const search = toolbar?.querySelector('.map-search');
    if (!toolbar || !search) return;

    const freshQuery = query.cloneNode(true);
    query.replaceWith(freshQuery);
    query = freshQuery;
    query.setAttribute('autocomplete', 'off');
    query.setAttribute('spellcheck', 'false');
    query.setAttribute('aria-autocomplete', 'list');
    query.setAttribute('aria-expanded', 'false');
    query.placeholder = 'Rechercher une commune…';

    toolbar.classList.add('maplibre-toolbar');
    search.classList.add('maplibre-search');

    suggestionsBox = document.createElement('div');
    suggestionsBox.id = 'mapAutocomplete';
    suggestionsBox.className = 'map-autocomplete';
    suggestionsBox.hidden = true;
    suggestionsBox.setAttribute('role', 'listbox');
    search.append(suggestionsBox);

    const viewSwitch = document.createElement('div');
    viewSwitch.className = 'maplibre-view-switch';
    viewSwitch.setAttribute('role', 'group');
    viewSwitch.setAttribute('aria-label', 'Choisir la lecture cartographique');
    viewSwitch.innerHTML = `
      <span>Affichage</span>
      <div class="maplibre-view-buttons">
        <button type="button" data-map-view="impact" aria-pressed="true">Empreinte Prime</button>
        <button type="button" data-map-view="integrator" aria-pressed="false">Intégrateur</button>
        <button type="button" data-map-view="software" aria-pressed="false">Logiciel</button>
      </div>`;
    toolbar.append(viewSwitch);
    viewButtons = [...viewSwitch.querySelectorAll('[data-map-view]')];
    setActiveView('impact');

    const params = new URLSearchParams(window.location.search);
    query.value = params.get('mq') || query.value || '';

    bindSearch();
    viewButtons.forEach(button => button.addEventListener('click', () => {
      setActiveView(button.dataset.mapView);
      syncViewSelection();
      closeSuggestions();
      syncMapUrl();
    }));
  }

  function setActiveView(value) {
    activeView = ['impact', 'integrator', 'software'].includes(value) ? value : 'impact';
    viewButtons.forEach(button => {
      const selected = button.dataset.mapView === activeView;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function syncMapUrl() {
    const params = new URLSearchParams(window.location.search);
    params.set('view', 'map');
    const mq = query?.value.trim();
    if (mq) params.set('mq', mq); else params.delete('mq');
    params.delete('mapCanton');
    params.delete('mapProduct');
    const view = activeView;
    if (view === 'impact') {
      params.delete('mapPerspective');
      params.delete('mapMode');
    } else {
      params.set('mapPerspective', 'factual');
      params.set('mapMode', view);
    }
    const queryString = params.toString();
    const next = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
    window.history.replaceState({ primeCommunes: true }, '', next);
  }

  function syncToolbarFromUrl() {
    if (!all.length || !viewButtons.length) return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('mapMode');
    const perspective = params.get('mapPerspective');
    setActiveView(perspective === 'factual' && ['integrator', 'software'].includes(requested)
      ? requested
      : (mapPerspective === 'factual' && ['integrator', 'software'].includes(mapMode) ? mapMode : 'impact'));
  }

  function coverage(rows) {
    const total = rows.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);
    const covered = rows.filter(isPrimeInnosolv).reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);
    return { total, covered, share: total ? covered / total * 100 : 0, ratio: covered ? Math.max(1, Math.round(total / covered)) : 0 };
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setProgress(id, value) {
    const node = document.getElementById(id);
    if (node) node.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  function syncMetrics() {
    if (!all.length) return;
    const romandie = all.filter(row => row.market === 'Welsch');
    const active = all.filter(row => row.market === 'Welsch' && ACTIVE_TERRITORIES.has(row.canton));
    const r = coverage(romandie);
    const a = coverage(active);
    setText('mapLibreRomandieRatio', r.ratio ? `1 Romand sur ${r.ratio}` : '—');
    setText('mapLibreRomandiePopulation', `${nf.format(r.covered)} habitants · ${pf.format(r.share)}%`);
    setText('mapLibreRomandieTotal', `Clients Prime innosolvcity · sur ${nf.format(r.total)} habitants`);
    setProgress('mapLibreRomandieProgress', r.share);
    setText('mapLibreActiveRatio', a.ratio ? `1 habitant sur ${a.ratio}` : '—');
    setText('mapLibreActivePopulation', `${nf.format(a.covered)} habitants · ${pf.format(a.share)}%`);
    setProgress('mapLibreActiveProgress', a.share);
  }

  async function ensureGeometry() {
    if (geometry) return geometry;
    geometry = await geometryPromise;
    return geometry;
  }

  function renderMetricMap(targetId, predicate) {
    const target = document.getElementById(targetId);
    if (!target || !geometry?.meta?.viewBox) return;
    const [x, y, w, h] = geometry.meta.viewBox.map(Number);
    const lookup = new Map(all.map(row => [String(row.id), row]));
    const base = (geometry.cantons || []).map(shape => `<path class="metric-swiss-base" d="${html(shape.d)}"></path>`).join('');
    const active = (geometry.municipalities || [])
      .filter(shape => {
        const commune = lookup.get(String(shape.id));
        return commune && predicate(commune);
      })
      .map(shape => `<path class="metric-swiss-active" d="${html(shape.d)}"></path>`)
      .join('');
    target.innerHTML = `<svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet" focusable="false">${base}${active}</svg>`;
  }

  function renderMetricMaps() {
    if (!geometry || !all.length) return;
    renderMetricMap('mapLibreRomandieMap', row => row.market === 'Welsch');
    renderMetricMap('mapLibreActiveMap', row => row.market === 'Welsch' && ACTIVE_TERRITORIES.has(row.canton));
  }

  function lv95ToWgs84(easting, northing) {
    const y = (Number(easting) - 2600000) / 1000000;
    const x = (Number(northing) - 1200000) / 1000000;
    const lon = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y * y * y;
    const lat = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.0140 * x * x * x;
    return [lon * 100 / 36, lat * 100 / 36];
  }

  function parsePathRings(d) {
    const tokens = String(d || '').match(/[MLZ]|-?\d+(?:\.\d+)?/gi) || [];
    const rings = [];
    let ring = [];
    let command = '';
    const closeRing = () => {
      if (ring.length < 3) { ring = []; return; }
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
      if (ring.length >= 4) rings.push(ring);
      ring = [];
    };
    for (let index = 0; index < tokens.length;) {
      const token = tokens[index++];
      if (/^[MLZ]$/i.test(token)) {
        command = token.toUpperCase();
        if (command === 'M' && ring.length) closeRing();
        if (command === 'Z') closeRing();
        continue;
      }
      const px = Number(token);
      const py = Number(tokens[index++]);
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      if (command === 'M' && ring.length) closeRing();
      ring.push(lv95ToWgs84(px, -py));
      command = 'L';
    }
    if (ring.length) closeRing();
    return rings;
  }

  function geometryFromRings(rings) {
    if (!rings.length) return null;
    return rings.length === 1
      ? { type: 'Polygon', coordinates: [rings[0]] }
      : { type: 'MultiPolygon', coordinates: rings.map(ring => [ring]) };
  }

  function municipalityFeature(shape, lookup) {
    const commune = lookup.get(String(shape.id));
    const shapeGeometry = geometryFromRings(parsePathRings(shape.d));
    if (!shapeGeometry) return null;
    return {
      type: 'Feature', id: String(shape.id),
      properties: {
        id: String(shape.id),
        name: commune?.name || '', canton: commune?.canton || '', market: commune?.market || '',
        population: Number(commune?.expectedPopulation || 0), isPrime: Boolean(commune?.isPrime),
        integrator: commune?.integrator || '', software: commune?.software || '', erp: commune?.erp || '',
        products: (commune?.products || []).join(' · '),
        isInnosolv: isInnosolv(commune),
        hasEadmin: Boolean(commune?.products?.includes('eAdmin'))
      },
      geometry: shapeGeometry
    };
  }

  function cantonFeature(shape) {
    const shapeGeometry = geometryFromRings(parsePathRings(shape.d));
    return shapeGeometry ? { type: 'Feature', id: String(shape.code), properties: { code: String(shape.code) }, geometry: shapeGeometry } : null;
  }

  function coordinatesOf(value) {
    const result = [];
    const walk = item => {
      if (!Array.isArray(item)) return;
      if (item.length >= 2 && Number.isFinite(Number(item[0])) && Number.isFinite(Number(item[1]))) result.push([Number(item[0]), Number(item[1])]);
      else item.forEach(walk);
    };
    walk(value?.coordinates);
    return result;
  }

  function pointFeature(feature, commune) {
    const points = coordinatesOf(feature?.geometry);
    if (!points.length || !commune) return null;
    const lngs = points.map(point => point[0]);
    const lats = points.map(point => point[1]);
    return {
      type: 'Feature', id: String(commune.id),
      properties: {
        id: String(commune.id), name: commune.name || '', canton: commune.canton || '',
        population: Number(commune.expectedPopulation || 0), isPrime: Boolean(commune.isPrime),
        isInnosolv: isInnosolv(commune), hasEadmin: Boolean(commune.products?.includes('eAdmin'))
      },
      geometry: { type: 'Point', coordinates: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2] }
    };
  }

  function buildGeoJSON() {
    const lookup = new Map(all.map(row => [String(row.id), row]));
    const municipalities = [];
    const points = [];
    for (const shape of geometry?.municipalities || []) {
      const feature = municipalityFeature(shape, lookup);
      if (!feature) continue;
      municipalities.push(feature);
      const point = pointFeature(feature, lookup.get(String(shape.id)));
      if (point) points.push(point);
    }
    municipalityGeoJSON = { type: 'FeatureCollection', features: municipalities };
    pointGeoJSON = { type: 'FeatureCollection', features: points };
    cantonGeoJSON = { type: 'FeatureCollection', features: (geometry?.cantons || []).map(cantonFeature).filter(Boolean) };
  }

  const mapFallback = '#182534';
  const mapPalettes = {
    integrator: { Prime: '#289cff', Ofisa: '#f08a4b', T2i: '#8c6cff', SIEN: '#36bca5', Ciges: '#e76369', Talus: '#d7a941', Data: '#d15fa4', OBT: '#78bc62', Abraxas: '#4f7fd5', Axians: '#43a6b5', Epsitec: '#b271d7', SIACG: '#cf7354' },
    software: { innosolvcity: '#289cff', Calvin: '#f08a4b', Citizen: '#8c6cff', ETIC: '#36bca5', BDI: '#e76369', 'Crésus': '#d7a941', Urbanus: '#d15fa4', Epsilon: '#78bc62', Ruf: '#4f7fd5' }
  };

  function paletteExpression(key, palette) {
    const values = Object.entries(palette || {}).flatMap(([name, color]) => [name, color]);
    return ['match', ['get', key], ...values, mapFallback];
  }

  function fillColorExpression() {
    if (mapPerspective === 'impact') return ['case', ['==', ['get', 'isPrime'], true], '#1596e6', '#d8e1e6'];
    return paletteExpression(mapMode === 'software' ? 'software' : 'integrator', mapPalettes[mapMode]);
  }

  function fillOpacityExpression() {
    return mapPerspective === 'impact' ? ['case', ['==', ['get', 'isPrime'], true], 0.54, 0.09] : 0.72;
  }

  function syncMapData() {
    if (!geometry || !all.length) return;
    buildGeoJSON();
    map?.getSource('municipalities')?.setData(municipalityGeoJSON);
    map?.getSource('municipality-points')?.setData(pointGeoJSON);
    map?.getSource('cantons')?.setData(cantonGeoJSON);
    map?.getSource('country-border')?.setData(countryBorderGeoJSON);
  }

  function syncLayerFilters() {
    if (!map || !map.isStyleLoaded()) return;
    for (const id of ['municipalities-fill', 'municipalities-line', 'municipality-labels']) {
      if (map.getLayer(id)) map.setFilter(id, null);
    }
    if (map.getLayer('prime-halo')) map.setFilter('prime-halo', ['==', ['get', 'isPrime'], true]);
    if (map.getLayer('prime-core')) map.setFilter('prime-core', ['==', ['get', 'isPrime'], true]);
    if (map.getLayer('innosolv-dots')) map.setFilter('innosolv-dots', ['==', ['get', 'isInnosolv'], true]);
    if (map.getLayer('eadmin-dots')) map.setFilter('eadmin-dots', ['all', ['==', ['get', 'hasEadmin'], true], ['==', ['get', 'isPrime'], true]]);
    if (map.getLayer('municipality-selected')) map.setFilter('municipality-selected', ['==', ['get', 'id'], selectedId || '__none__']);
  }

  function syncStyle({ fit = false } = {}) {
    if (!map || !map.isStyleLoaded()) return;
    syncMapData();
    map.setPaintProperty('municipalities-fill', 'fill-color', fillColorExpression());
    map.setPaintProperty('municipalities-fill', 'fill-opacity', fillOpacityExpression());
    for (const id of ['prime-halo', 'prime-core', 'innosolv-dots', 'eadmin-dots']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', mapPerspective === 'impact' ? 'visible' : 'none');
    }
    syncLayerFilters();
    syncMetrics();
    if (fit) fitCountryScope();
  }

  function boundsFromBox(box) {
    const [x, y, w, h] = box.map(Number);
    const points = [lv95ToWgs84(x, -y), lv95ToWgs84(x + w, -y), lv95ToWgs84(x + w, -(y + h)), lv95ToWgs84(x, -(y + h))];
    return [[Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1]))], [Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))]];
  }

  function boundsFromFeatures(features) {
    const points = (features || []).flatMap(feature => coordinatesOf(feature.geometry));
    if (!points.length) return null;
    return [[Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1]))], [Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))]];
  }

  function swissBounds() {
    return boundsFromBox(geometry?.meta?.viewBox || [2480000, -1305000, 360000, 260000]);
  }

  function romandieBounds() {
    return [[5.78, 45.72], [7.72, 47.32]];
  }

  function countryBounds() {
    return boundsFromFeatures(cantonGeoJSON?.features) || swissBounds();
  }

  function mercatorX(lon) { return (Number(lon) + 180) / 360; }
  function mercatorY(lat) {
    const radians = Number(lat) * Math.PI / 180;
    return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
  }

  function applyMapBounds() {
    if (!map || !geometry) return;
    const bounds = swissBounds();
    map.setMaxBounds(bounds);
    const container = map.getContainer();
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const dx = Math.abs(mercatorX(bounds[1][0]) - mercatorX(bounds[0][0]));
    const dy = Math.abs(mercatorY(bounds[0][1]) - mercatorY(bounds[1][1]));
    const zoomX = Math.log2(width / (512 * Math.max(dx, 1e-9)));
    const zoomY = Math.log2(height / (512 * Math.max(dy, 1e-9)));
    map.setMinZoom(Math.max(0, Math.min(zoomX, zoomY) - 0.03));
  }

  function fitCountryScope() {
    if (!map || !geometry) return;
    const mobile = window.matchMedia('(max-width:680px)').matches;
    map.fitBounds(mobile ? romandieBounds() : countryBounds(), { padding: mobile ? 12 : 18, duration: 380 });
  }

  function addLayers() {
    const [x, y, w, h] = geometry.meta.viewBox;
    const imageCoordinates = [lv95ToWgs84(x, -y), lv95ToWgs84(x + w, -y), lv95ToWgs84(x + w, -(y + h)), lv95ToWgs84(x, -(y + h))];
    map.addSource('swisstopo-base', { type: 'image', url: RASTER_URL, coordinates: imageCoordinates });
    map.addLayer({ id: 'swisstopo-base', type: 'raster', source: 'swisstopo-base', paint: { 'raster-opacity': 1, 'raster-brightness-min': 0.24, 'raster-brightness-max': 0.98, 'raster-contrast': -0.15, 'raster-saturation': -0.08 } });
    map.addSource('municipalities', { type: 'geojson', data: municipalityGeoJSON, promoteId: 'id' });
    map.addLayer({ id: 'municipalities-fill', type: 'fill', source: 'municipalities', paint: { 'fill-color': fillColorExpression(), 'fill-opacity': fillOpacityExpression() } });
    map.addLayer({ id: 'municipalities-line', type: 'line', source: 'municipalities', paint: { 'line-color': 'rgba(236,247,252,.98)', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.08, 8, 0.25, 10, 0.68, 12, 0.94], 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.22, 8, 0.42, 10, 0.9, 12, 1.5] } });
    map.addSource('cantons', { type: 'geojson', data: cantonGeoJSON });
    map.addLayer({ id: 'cantons-border-casing', type: 'line', source: 'cantons', paint: { 'line-color': 'rgba(13,28,39,.86)', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.8, 9, 3.5, 12, 4.6], 'line-opacity': 0.82 } });
    map.addLayer({ id: 'cantons-border', type: 'line', source: 'cantons', paint: { 'line-color': 'rgba(242,249,252,.96)', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.9, 9, 1.25, 12, 1.85], 'line-opacity': 0.92 } });
    map.addSource('country-border', { type: 'geojson', data: countryBorderGeoJSON });
    map.addLayer({ id: 'country-border-casing', type: 'line', source: 'country-border', paint: { 'line-color': 'rgba(5,15,24,.98)', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 5.2, 9, 6.4, 12, 8.0], 'line-opacity': 0.96 } });
    map.addLayer({ id: 'country-border', type: 'line', source: 'country-border', paint: { 'line-color': 'rgba(111,203,255,.99)', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.0, 9, 2.7, 12, 3.5], 'line-opacity': 0.99 } });
    map.addSource('municipality-points', { type: 'geojson', data: pointGeoJSON, promoteId: 'id' });
    map.addLayer({ id: 'prime-halo', type: 'circle', source: 'municipality-points', filter: ['==', ['get', 'isPrime'], true], paint: { 'circle-color': '#159cff', 'circle-opacity': 0.12, 'circle-blur': 0.68, 'circle-radius': ['interpolate', ['linear'], ['get', 'population'], 0, 11, 10000, 18, 100000, 29, 500000, 43] } });
    map.addLayer({ id: 'prime-core', type: 'circle', source: 'municipality-points', filter: ['==', ['get', 'isPrime'], true], paint: { 'circle-color': '#087bc4', 'circle-opacity': 0.92, 'circle-stroke-color': 'rgba(229,247,255,.85)', 'circle-stroke-width': 0.6, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.4, 10, 4.2, 13, 6.5] } });
    map.addLayer({ id: 'innosolv-dots', type: 'circle', source: 'municipality-points', filter: ['==', ['get', 'isInnosolv'], true], paint: { 'circle-color': ['case', ['==', ['get', 'isPrime'], true], '#44dc98', 'rgba(247,250,252,.92)'], 'circle-stroke-color': '#31be7f', 'circle-stroke-width': ['case', ['==', ['get', 'isPrime'], true], 1.1, 2.1], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.8, 10, 4.2, 13, 6] } });
    map.addLayer({ id: 'eadmin-dots', type: 'circle', source: 'municipality-points', filter: ['all', ['==', ['get', 'hasEadmin'], true], ['==', ['get', 'isPrime'], true]], paint: { 'circle-color': '#e52332', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.4, 10, 4, 13, 5.8] } });
    map.addLayer({ id: 'municipality-labels', type: 'symbol', source: 'municipality-points', minzoom: 9.2, layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 9.2, 10, 11, 11.5, 13, 13], 'text-offset': [0, 0.95], 'text-anchor': 'top', 'text-max-width': 8, 'text-allow-overlap': false, 'text-ignore-placement': false }, paint: { 'text-color': '#f7fbfd', 'text-halo-color': 'rgba(13,25,34,.95)', 'text-halo-width': 1.35, 'text-halo-blur': 0.25 } });
    map.addLayer({ id: 'municipality-selected', type: 'line', source: 'municipalities', filter: ['==', ['get', 'id'], '__none__'], paint: { 'line-color': '#ff7047', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 3.2, 13, 4.2], 'line-opacity': 0.96 } });
    applyMapBounds();
    syncStyle({ fit: true });
  }

  function popupNode(commune, interactive = false) {
    const root = document.createElement('div');
    root.className = 'maplibre-popup';
    const tags = [commune.isPrime ? 'Client Prime' : '', commune.integrator || '', commune.software || '', commune.erp ? `ERP ${commune.erp}` : ''].filter(Boolean);
    root.innerHTML = `<strong>${html(commune.name)}</strong><span>${html(commune.canton)} · ${nf.format(commune.expectedPopulation)} habitants</span><div class="maplibre-popup-meta">${tags.map(tag => `<i>${html(tag)}</i>`).join('')}</div>${commune.products?.length ? `<small>Modules · ${html(commune.products.join(' · '))}</small>` : ''}`;
    if (interactive) {
      const button = document.createElement('button');
      button.className = 'maplibre-popup-action';
      button.type = 'button';
      button.textContent = 'Fiche complète →';
      button.onclick = event => { event.stopPropagation(); clickPopup?.remove(); if (typeof openDrawer === 'function') openDrawer(commune); };
      root.append(button);
    }
    return root;
  }

  function selectMunicipality(id) {
    selectedId = String(id || '');
    syncLayerFilters();
  }

  function showClickPopup(commune, lngLat) {
    hoverPopup?.remove();
    if (!clickPopup) clickPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 10, maxWidth: '300px' });
    clickPopup.setLngLat(lngLat).setDOMContent(popupNode(commune, true)).addTo(map);
    selectMunicipality(commune.id);
  }

  function bindInteractions() {
    map.on('mouseenter', 'municipalities-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'municipalities-fill', () => { map.getCanvas().style.cursor = ''; hoverPopup?.remove(); });
    map.on('mousemove', 'municipalities-fill', event => {
      if (window.matchMedia('(max-width:680px)').matches || clickPopup?.isOpen()) return;
      const commune = all.find(row => String(row.id) === String(event.features?.[0]?.properties?.id));
      if (!commune) return;
      if (!hoverPopup) hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 9, maxWidth: '280px' });
      hoverPopup.setLngLat(event.lngLat).setDOMContent(popupNode(commune)).addTo(map);
    });
    map.on('click', 'municipalities-fill', event => {
      const commune = all.find(row => String(row.id) === String(event.features?.[0]?.properties?.id));
      if (commune) showClickPopup(commune, event.lngLat);
    });
    map.on('click', event => {
      const features = map.queryRenderedFeatures(event.point, { layers: ['municipalities-fill'] });
      if (!features.length) { selectMunicipality(''); clickPopup?.remove(); }
    });
  }

  async function waitForData() {
    if (all.length) return;
    await new Promise(resolve => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (all.length || Date.now() - started > 7000) { clearInterval(timer); resolve(); }
      }, 80);
    });
  }

  function revealMap() {
    const loading = document.getElementById('mapLibreLoading');
    if (!loading || loading.hidden) return;
    loading.classList.add('is-revealing');
    window.setTimeout(() => { loading.hidden = true; }, 180);
  }

  async function ensureMapLibre() {
    if (map) {
      setTimeout(() => { map.resize(); applyMapBounds(); }, 0);
      return map;
    }
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
      ensureMetrics();
      ensureStage();
      const [, , officialBorder] = await Promise.all([waitForData(), ensureGeometry(), countryBorderPromise]);
      countryBorderGeoJSON = officialBorder;
      if (!all.length) throw new Error('Données communales indisponibles.');
      syncToolbarFromUrl();
      syncMetrics();
      renderMetricMaps();
      buildGeoJSON();
      maplibregl = await mapLibreModulePromise;

      map = new maplibregl.Map({
        container: document.getElementById('primeMapLibre'),
        style: { version: 8, glyphs: GLYPHS_URL, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#26343f' } }] },
        center: [6.75, 46.65], zoom: 7.25, attributionControl: false,
        dragRotate: false, pitchWithRotate: false, renderWorldCopies: false, maxBounds: swissBounds()
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 80, unit: 'metric' }), 'bottom-left');
      map.touchZoomRotate.disableRotation();

      map.on('load', () => {
        addLayers();
        bindInteractions();
        syncMetrics();
        renderMetricMaps();

        const revealWhenRasterReady = event => {
          if (event?.sourceId === 'swisstopo-base' && map.isSourceLoaded('swisstopo-base')) {
            map.off('sourcedata', revealWhenRasterReady);
            revealMap();
          }
        };
        map.on('sourcedata', revealWhenRasterReady);
        window.setTimeout(revealMap, 1400);
      });
      map.on('error', event => { if (event?.error) console.error('Prime Communes · MapLibre', event.error); });
      return map;
    })().catch(error => {
      const loading = document.getElementById('mapLibreLoading');
      if (loading) loading.innerHTML = `<div class="maplibre-error">La carte n’a pas pu démarrer sur cet appareil.<br>${html(error?.message || error)}</div>`;
      loadingPromise = null;
      throw error;
    });

    return loadingPromise;
  }

  function closeSuggestions() {
    suggestions = [];
    suggestionIndex = -1;
    if (suggestionsBox) suggestionsBox.hidden = true;
    query?.setAttribute('aria-expanded', 'false');
  }

  function suggestionMatches(value) {
    const needle = normalizeText(value);
    if (needle.length < 2) return [];
    return all
      .map(row => {
        const name = normalizeText(row.name);
        if (!name.includes(needle)) return null;
        return { row, rank: name.startsWith(needle) ? 0 : 1 };
      })
      .filter(Boolean)
      .sort((a, b) => a.rank - b.rank || a.row.name.localeCompare(b.row.name, 'fr-CH'))
      .slice(0, 8)
      .map(item => item.row);
  }

  function renderSuggestions(value) {
    if (!suggestionsBox) return;
    suggestions = suggestionMatches(value);
    suggestionIndex = -1;
    if (!suggestions.length) return closeSuggestions();
    suggestionsBox.innerHTML = suggestions.map((commune, index) => `<button type="button" role="option" data-index="${index}"><strong>${html(commune.name)}</strong><b>${nf.format(commune.expectedPopulation)}</b></button>`).join('');
    suggestionsBox.hidden = false;
    query.setAttribute('aria-expanded', 'true');
    suggestionsBox.querySelectorAll('button').forEach(button => {
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => chooseSuggestion(Number(button.dataset.index)));
    });
  }

  function paintSuggestionIndex() {
    suggestionsBox?.querySelectorAll('button').forEach((button, index) => button.classList.toggle('active', index === suggestionIndex));
  }

  function findCommune(value) {
    const needle = normalizeText(value);
    if (!needle) return null;
    return all.find(row => normalizeText(row.name) === needle)
      || all.find(row => normalizeText(row.name).startsWith(needle))
      || all.find(row => normalizeText(row.name).includes(needle))
      || null;
  }

  function focusCommune(commune) {
    if (!commune) return;
    query.value = commune.name;
    closeSuggestions();
    ensureMapLibre().then(() => {
      const point = pointGeoJSON?.features?.find(feature => String(feature.properties.id) === String(commune.id));
      if (!point) return;
      map.easeTo({ center: point.geometry.coordinates, zoom: Math.max(map.getZoom(), 11), duration: 520 });
      showClickPopup(commune, point.geometry.coordinates);
      syncMapUrl();
    }).catch(() => {});
  }

  function chooseSuggestion(index) {
    const commune = suggestions[index];
    if (commune) focusCommune(commune);
  }

  function bindSearch() {
    query.addEventListener('input', event => { renderSuggestions(event.currentTarget.value); syncMapUrl(); });
    query.addEventListener('focus', event => renderSuggestions(event.currentTarget.value));
    query.addEventListener('blur', () => window.setTimeout(closeSuggestions, 120));
    query.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' && suggestions.length) { event.preventDefault(); suggestionIndex = (suggestionIndex + 1) % suggestions.length; return paintSuggestionIndex(); }
      if (event.key === 'ArrowUp' && suggestions.length) { event.preventDefault(); suggestionIndex = (suggestionIndex - 1 + suggestions.length) % suggestions.length; return paintSuggestionIndex(); }
      if (event.key === 'Escape') return closeSuggestions();
      if (event.key !== 'Enter') return;
      const commune = suggestionIndex >= 0 ? suggestions[suggestionIndex] : findCommune(event.currentTarget.value);
      if (!commune) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      focusCommune(commune);
      query.blur();
    }, true);
  }

  function syncViewSelection() {
    if (!viewButtons.length) return;
    const value = activeView;
    if (value === 'impact') {
      mapPerspective = 'impact';
      mapMode = 'integrator';
    } else {
      mapPerspective = 'factual';
      mapMode = value === 'software' ? 'software' : 'integrator';
    }
    syncStyle();
    fitCountryScope();
  }

  injectAssets();
  ensureMetrics();
  retireLegacyUi();
  ensureStage();
  configureToolbar();

  // Replace the historical global map entry point before the shared state bridge loads.
  window.loadMap = ensureMapLibre;
  try { loadMap = ensureMapLibre; } catch (_) {}

  Promise.all([waitForData(), ensureGeometry()]).then(() => {
    syncToolbarFromUrl();
    syncMetrics();
    renderMetricMaps();
  }).catch(() => {});

  document.getElementById('syncReload')?.addEventListener('click', () => {
    setTimeout(() => {
      syncToolbarFromUrl();
      syncMetrics();
      renderMetricMaps();
      if (map) syncStyle();
    }, 700);
  });

  document.querySelector('[data-view="map"]')?.addEventListener('click', () => {
    ensureMapLibre().then(() => setTimeout(() => { map?.resize(); applyMapBounds(); fitCountryScope(); }, 100)).catch(() => {});
  });

  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!map) return;
      map.resize();
      applyMapBounds();
    }, 140);
  });
})();

// ---- app/prime-communes-1.1-base.js ----
(() => {
  'use strict';

  // Prime Communes 1.1 · stabilized bridge
  // The historical single-file prototype remains the rendering foundation.
  // This bridge owns the 1.1 data/editor/deep-link behaviour without changing
  // the visible product contract frozen in snapshot/prime-communes-1.1-final.

  const byId = id => document.getElementById(id);
  const truthyParam = value => value === '1' || value === 'true';
  const validViews = new Set(['communes', 'map', 'stats', 'news', 'stories', 'roadmap']);
  const validSortKeys = new Set(['population', 'name']);
  const validDirections = new Set(['asc', 'desc']);
  const validMarkets = new Set(['Welsch', 'Uf Tüütsch', 'Ticino']);
  const EDIT_RPC = 'save_commune_profile_v11';
  let restoringUrlState = false;
  let logicielsMode = false;

  // Dedicated stabilization stylesheet. Historical CSS remains the base layer.
  if (!document.querySelector('link[href*="prime-communes-1.1.5.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'app/prime-communes-1.1.5.css?v=4';
    document.head.append(link);
  }

  // Refresh logo CSS after previous cached iterations.
  const productCss = document.querySelector('link[href*="product-assets.css"]');
  if (productCss) productCss.href = 'app/product-assets.css?v=9';

  function abacusMark(extraClass = '') {
    return `<img class="solution-mark abacus-mark${extraClass ? ` ${extraClass}` : ''}" src="public/assets/logos/abacus.png?v=2" alt="Abacus" title="Abacus">`;
  }

  // Prime-sold products get their marks. Competitor products remain text.
  renderModules = function renderModulesWithPrimeMarks(x) {
    const modules = x.products || [];
    const known = [];
    if (modules.includes('eAdmin')) {
      known.push('<img class="module-mark eadmin-mark" src="public/eadmin-mark-negative.png" alt="eAdmin" title="eAdmin · guichet virtuel">');
    }
    if (modules.includes('Clever.Tax')) {
      known.push('<img class="module-mark clevertax-mark" src="public/clevertax-mark-negative.png?v=1" alt="Clever.Tax" title="Clever.Tax · KMS">');
    }
    if (modules.includes('Abacus')) {
      known.push('<img class="module-mark abacus-module-mark" src="public/assets/logos/abacus.png?v=2" alt="Abacus" title="Abacus · SIRH Prime">');
    }
    const other = modules
      .filter(name => !['eAdmin', 'Clever.Tax', 'Abacus'].includes(name))
      .map(name => `<span class="module-chip">${esc(name)}</span>`);
    return [...known, ...other].join('');
  };

  const baseRenderErp = renderErp;
  renderErp = function renderErpWithPrimeMarks(x, drawer = false) {
    const erp = String(x.erp || '').trim();
    if (erp.toLocaleLowerCase('fr-CH') === 'abacus') {
      return abacusMark(drawer ? 'drawer-solution-mark' : '');
    }
    return baseRenderErp(x, drawer);
  };

  function injectLogicielsToggle() {
    if (byId('logicielsToggle')) return;
    const districts = byId('districtsToggle');
    if (!districts) return;
    const button = document.createElement('button');
    button.className = 'filter-toggle';
    button.id = 'logicielsToggle';
    button.type = 'button';
    button.textContent = 'Systèmes';
    button.title = 'Afficher / masquer ERP, modules et hébergeur';
    districts.insertAdjacentElement('afterend', button);
    button.addEventListener('click', () => {
      logicielsMode = !logicielsMode;
      button.classList.toggle('on', logicielsMode);
      decorateSoftwareColumns();
      syncAfterEvent(true);
    });
  }

  function decorateSoftwareColumns() {
    const wrap = document.querySelector('.table-wrap');
    if (!wrap) return;
    wrap.classList.toggle('logiciels-hidden', !logicielsMode);
    const headings = [...wrap.querySelectorAll('thead th')];
    headings.forEach(th => {
      const label = th.textContent.trim().toLocaleLowerCase('fr-CH');
      if (label === 'erp') th.dataset.softwareColumn = 'erp';
      if (label === 'modules') th.dataset.softwareColumn = 'modules';
    });
    byId('logicielsToggle')?.classList.toggle('on', logicielsMode);
  }

  function decorateTerritoryControls() {
    const controls = document.querySelector('.market-toggles');
    if (controls) controls.hidden = false;
    const district = byId('districtFilter');
    if (district) district.hidden = !(districtsMode && byId('canton')?.value !== 'Tous');
    const button = byId('districtsToggle');
    button?.classList.toggle('on', districtsMode);
    button?.setAttribute('aria-expanded', String(districtsMode));
  }

  // The original render rebuilds the table. Re-decorate both optional readings.
  const baseRender = render;
  render = function renderWithOptionalColumns() {
    baseRender();
    decorateSoftwareColumns();
    decorateTerritoryControls();
  };

  const uniqueSorted = values => [...new Set(values.filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), 'fr-CH', { sensitivity: 'base' }));

  const optionList = (values, selected, blankLabel = 'Non renseigné') => {
    const items = uniqueSorted([...values, selected]);
    return `<option value="">${esc(blankLabel)}</option>` + items.map(value =>
      `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`
    ).join('');
  };

  function moduleEditor(products) {
    const available = uniqueSorted([
      ...all.flatMap(row => row.products || []),
      ...products,
      'eAdmin',
      'Clever.Tax',
      'Abacus'
    ]);
    if (!available.length) return '<span class="empty">Aucun module au catalogue</span>';
    return `<div class="drawer-module-grid">${available.map(name => `
      <label class="drawer-module-option">
        <input type="checkbox" name="drawerModule" value="${esc(name)}" ${products.includes(name) ? 'checked' : ''}>
        <span>${esc(name)}</span>
      </label>`).join('')}</div>`;
  }

  function saveStatus(message = '', kind = '') {
    const node = byId('drawerSaveStatus');
    if (!node) return;
    node.textContent = message;
    node.className = `drawer-save-status${kind ? ` ${kind}` : ''}`;
  }

  async function saveDrawerProfile(x) {
    const button = byId('drawerSave');
    if (!button) return;
    let editKey = sessionStorage.getItem('primeCommunesEditKey') || '';
    if (!editKey) {
      editKey = window.prompt('Clé d’édition Prime Communes') || '';
      if (!editKey) return;
    }

    const selectedModules = [...document.querySelectorAll('input[name="drawerModule"]:checked')].map(input => input.value);
    const payload = {
      p_key: editKey,
      p_bfs_id: Number(x.id),
      p_prime_client: Boolean(byId('drawerPrimeClient')?.checked),
      p_integrator: byId('drawerIntegrator')?.value || null,
      p_software: byId('drawerSoftware')?.value || null,
      p_erp: byId('drawerErp')?.value || null,
      p_products: selectedModules,
      p_notes: byId('drawerNotes')?.value || ''
    };

    const send = key => fetch(`${SUPABASE_URL}/rest/v1/rpc/${EDIT_RPC}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...payload, p_key: key })
    });
    const responseDetail = async response => ({
      detail: await response.text(),
      rejectedKey: response.status === 401 || response.status === 403
    });

    button.disabled = true;
    saveStatus('Enregistrement…');
    try {
      let response = await send(editKey);
      if (!response.ok) {
        const failed = await responseDetail(response);
        const rejectedKey = failed.rejectedKey || /clé|key|denied|forbidden/i.test(failed.detail);
        if (rejectedKey) {
          sessionStorage.removeItem('primeCommunesEditKey');
          const replacement = window.prompt('Ancienne clé refusée. Saisis la nouvelle clé d’édition :') || '';
          if (!replacement) throw new Error('Clé d’édition requise');
          editKey = replacement;
          saveStatus('Nouvelle clé · nouvel essai…');
          response = await send(editKey);
          if (!response.ok) {
            const retry = await responseDetail(response);
            throw new Error(retry.detail || `Erreur ${response.status}`);
          }
        } else {
          throw new Error(failed.detail || `Erreur ${response.status}`);
        }
      }
      sessionStorage.setItem('primeCommunesEditKey', editKey);
      await loadData();
      saveStatus(`Enregistré ✓ · ${new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`, 'success');
    } catch (error) {
      console.error(error);
      saveStatus('Enregistrement impossible · vérifie la clé d’édition.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  // Full editable non-OFS ecosystem. OFS identity, canton, district and population remain read-only.
  openDrawer = function openEditableDrawer(x) {
    if (!x) return;
    const integrators = uniqueSorted(all.map(row => row.integrator));
    const softwares = uniqueSorted(all.map(row => row.software));
    const erps = uniqueSorted(all.map(row => row.erp));
    const products = [...(x.products || [])];
    const cantonCode = String(x.canton || '').toLowerCase();
    const delivery = ofsMode ? `<section><h3>Livraison Delimo</h3><dl><div><dt>Population reçue</dt><dd>${fmt.format(x.receivedPopulation ?? 0)}</dd></div><div><dt>Erreur EWID</dt><dd>${x.ewidErrorRate?.toFixed(1) ?? '—'}%</dd></div><div><dt>EWID manquants</dt><dd>${x.missingEwid?.toFixed(1) ?? '—'}%</dd></div><div><dt>Version eCH</dt><dd>${esc(x.echVersion)}</dd></div></dl><p class="delivery-comment">${esc(x.comment)}</p></section>` : '';

    byId('drawerRoot').innerHTML = `<div class="drawer-backdrop"><aside class="drawer">
      <button class="drawer-close" aria-label="Fermer">×</button>
      <div class="drawer-title">
        <div>
          <p>OFS ${x.id}</p>
          <h2>${esc(x.name)}</h2>
          <div class="drawer-location">
            <img src="public/cantons/${esc(cantonCode)}.svg" alt="${esc(x.canton)}">
            <strong>${esc(x.canton)}</strong>
            ${x.district ? `<span>·</span><span class="district-name">${esc(x.district)}</span>` : ''}
          </div>
        </div>
        ${x.isPrime ? '<img class="drawer-prime-mark" src="public/prime-one-negative.png?v=4" alt="Client Prime" title="Client Prime">' : ''}
      </div>
      <div class="drawer-pop"><strong>${fmt.format(x.expectedPopulation)}</strong><span>habitants attendus</span></div>
      ${delivery}
      <section>
        <h3>Écosystème communal</h3>
        <div class="drawer-edit-grid">
          <label class="drawer-client-toggle full-width"><span>Client Prime</span><input id="drawerPrimeClient" type="checkbox" ${x.isPrime ? 'checked' : ''}></label>
          <label>Intégrateur<select id="drawerIntegrator">${optionList(integrators, x.integrator)}</select></label>
          <label>Métier<select id="drawerSoftware">${optionList(softwares, x.software)}</select></label>
          <label>ERP<select id="drawerErp">${optionList(erps, x.erp)}</select></label>
          <label class="full-width">Modules${moduleEditor(products)}</label>
          <label class="full-width">Notes<textarea id="drawerNotes" placeholder="Informations utiles…">${esc(x.notes)}</textarea></label>
        </div>
        <button class="save-button" id="drawerSave">Enregistrer les informations</button>
        <p class="drawer-save-status" id="drawerSaveStatus">Données OFS verrouillées · écosystème modifiable</p>
      </section>
    </aside></div>`;

    document.querySelector('.drawer-close').onclick = closeDrawer;
    document.querySelector('.drawer-backdrop').onclick = event => {
      if (event.target === event.currentTarget) closeDrawer();
    };
    byId('drawerSave').onclick = () => saveDrawerProfile(x);
  };

  function currentView() {
    return document.querySelector('.view-tab.active')?.dataset.view || 'communes';
  }

  function setView(view, { scroll = false } = {}) {
    const next = validViews.has(view) ? view : 'communes';
    document.querySelectorAll('.view-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === next));
    byId('communesView').hidden = next !== 'communes';
    byId('mapView').hidden = next !== 'map';
    byId('statsView').hidden = next !== 'stats';
    byId('newsView').hidden = next !== 'news';
    byId('storiesView').hidden = next !== 'stories';
    byId('roadmapView').hidden = next !== 'roadmap';
    byId('syncReload').hidden = next !== 'communes';
    document.documentElement.removeAttribute('data-initial-view');
    if (next === 'map') loadMap().then(restoreMapUi);
    if (next === 'stats') renderStats();
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function optionExists(select, value) {
    return Boolean(select && [...select.options].some(option => option.value === value));
  }

  function setSelectIfAvailable(id, value, fallback) {
    const select = byId(id);
    if (!select) return;
    const next = value && optionExists(select, value) ? value : fallback;
    if (next != null && optionExists(select, next)) select.value = next;
  }

  function restoreFilterUi() {
    byId('primeOnly')?.classList.toggle('on', primeOnly);
    byId('eadminOnly')?.classList.toggle('on', eadminOnly);
    byId('eadminOnly')?.classList.toggle('eadmin-on', eadminOnly);
    byId('districtsToggle')?.classList.toggle('on', districtsMode);
    byId('logicielsToggle')?.classList.toggle('on', logicielsMode);
    byId('issuesOnly')?.classList.toggle('on', issuesOnly);
    byId('issuesOnly')?.classList.toggle('warning', issuesOnly);
    if (byId('issuesOnly')) byId('issuesOnly').hidden = !ofsMode;
    byId('issuesCard')?.classList.toggle('ofs-active', ofsMode);
    byId('issuesCard')?.setAttribute('aria-pressed', String(ofsMode));
    if (byId('ofsLabel')) byId('ofsLabel').textContent = ofsMode ? 'Contrôle Delimo actif' : 'Qualité des livraisons';
    if (byId('ofsCopy')) byId('ofsCopy').textContent = ofsMode ? 'Les statuts OFS et erreurs EWID sont affichés dans le tableau.' : 'Afficher les statuts, erreurs EWID et commentaires OFS.';
    if (byId('ofsCount')) byId('ofsCount').textContent = `${byId('issues')?.textContent || '—'} à surveiller`;
    if (byId('ofsAction')) byId('ofsAction').textContent = ofsMode ? 'Revenir au marché' : 'Ouvrir le contrôle';
    if (byId('ofsArrow')) byId('ofsArrow').textContent = ofsMode ? '←' : '→';
    document.querySelectorAll('.market-toggle').forEach(button => button.classList.toggle('on', button.dataset.market === marketOnly));
    decorateSoftwareColumns();
    decorateTerritoryControls();
  }

  function restoreStatsUi() {
    document.querySelectorAll('[data-stats-metric]').forEach(button => {
      button.classList.toggle('active', button.dataset.statsMetric === statsMetric);
    });
    document.querySelectorAll('[data-stats-threshold]').forEach(button => {
      button.classList.toggle('active', Number(button.dataset.statsThreshold) === statsThreshold);
    });
  }

  function restoreMapUi() {
    document.querySelectorAll('[data-map-perspective]').forEach(button => {
      button.classList.toggle('active', button.dataset.mapPerspective === mapPerspective);
    });
    document.querySelectorAll('[data-map-mode]').forEach(button => {
      button.classList.toggle('active', button.dataset.mapMode === mapMode);
    });
    if (byId('mapModeControls')) byId('mapModeControls').hidden = mapPerspective !== 'factual';
    if (byId('mapImpact')) byId('mapImpact').hidden = mapPerspective !== 'impact';
    if (mapGeometry && mapFullViewBox) {
      mapInitialViewBox = mapPerspective === 'impact' ? impactInitialViewBox() : [...mapFullViewBox];
      mapViewBox = [...mapInitialViewBox];
      setMapView();
      renderMap();
      updateMapSearch();
    }
  }

  function restoreFromUrl() {
    restoringUrlState = true;
    const params = new URLSearchParams(window.location.search);

    if (byId('query')) byId('query').value = params.get('q') || '';
    marketOnly = validMarkets.has(params.get('market')) ? params.get('market') : '';
    districtsMode = truthyParam(params.get('districts')) || Boolean(params.get('district'));
    setSelectIfAvailable('canton', params.get('canton'), 'Tous');
    updateDistrictOptions();
    setSelectIfAvailable('district', params.get('district'), '');
    setSelectIfAvailable('solution', params.get('solution'), 'Tous');

    primeOnly = truthyParam(params.get('prime'));
    eadminOnly = truthyParam(params.get('eadmin'));
    logicielsMode = truthyParam(params.get('logiciels'));
    ofsMode = truthyParam(params.get('ofs'));
    issuesOnly = ofsMode && truthyParam(params.get('issues'));

    sortKey = validSortKeys.has(params.get('sort')) ? params.get('sort') : 'population';
    sortDirection = validDirections.has(params.get('dir')) ? params.get('dir') : 'desc';

    const requestedPerspective = params.get('mapPerspective');
    mapPerspective = requestedPerspective === 'factual' ? 'factual' : 'impact';
    const requestedMapMode = params.get('mapMode');
    mapMode = ['integrator', 'software', 'product'].includes(requestedMapMode) ? requestedMapMode : 'integrator';
    if (byId('mapQuery')) byId('mapQuery').value = params.get('mq') || '';
    setSelectIfAvailable('mapProduct', params.get('mapProduct'), mapProduct);
    if (byId('mapProduct')?.value) mapProduct = byId('mapProduct').value;

    setSelectIfAvailable('statsScope', params.get('statsScope'), 'romandie');
    statsMetric = params.get('statsMetric') === 'communes' ? 'communes' : 'population';
    const threshold = Number(params.get('statsThreshold'));
    statsThreshold = [0, 5000, 10000].includes(threshold) ? threshold : 0;

    restoreFilterUi();
    restoreStatsUi();
    restoreMapUi();

    const requestedView = validViews.has(params.get('view')) ? params.get('view') : 'communes';
    setView(requestedView);

    render();
    renderStats();
    if (mapGeometry) {
      renderMap();
      updateMapSearch();
    }
    restoringUrlState = false;
  }

  function syncUrl(push = false) {
    if (restoringUrlState) return;
    const params = new URLSearchParams();
    const view = currentView();
    if (view !== 'communes') params.set('view', view);

    const q = byId('query')?.value.trim();
    if (q) params.set('q', q);
    if (byId('canton')?.value && byId('canton').value !== 'Tous') params.set('canton', byId('canton').value);
    if (byId('district')?.value) params.set('district', byId('district').value);
    if (byId('solution')?.value && byId('solution').value !== 'Tous') params.set('solution', byId('solution').value);
    if (marketOnly) params.set('market', marketOnly);
    if (primeOnly) params.set('prime', '1');
    if (eadminOnly) params.set('eadmin', '1');
    if (districtsMode) params.set('districts', '1');
    if (logicielsMode) params.set('logiciels', '1');
    if (ofsMode) params.set('ofs', '1');
    if (issuesOnly) params.set('issues', '1');
    if (sortKey !== 'population') params.set('sort', sortKey);
    if (sortDirection !== 'desc') params.set('dir', sortDirection);

    if (view === 'map') {
      const mq = byId('mapQuery')?.value.trim();
      if (mq) params.set('mq', mq);
      if (mapPerspective !== 'impact') params.set('mapPerspective', mapPerspective);
      if (mapMode !== 'integrator') params.set('mapMode', mapMode);
      if (mapMode === 'product' && byId('mapProduct')?.value) params.set('mapProduct', byId('mapProduct').value);
    }

    if (view === 'stats') {
      if (byId('statsScope')?.value && byId('statsScope').value !== 'romandie') params.set('statsScope', byId('statsScope').value);
      if (statsMetric !== 'population') params.set('statsMetric', statsMetric);
      if (statsThreshold) params.set('statsThreshold', String(statsThreshold));
    }

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history[push ? 'pushState' : 'replaceState']({ primeCommunes: true }, '', nextUrl);
  }

  function syncAfterEvent(push = true) {
    queueMicrotask(() => syncUrl(push));
  }

  const baseApplyData = applyData;
  applyData = function applyDataWithDeepLink(data, source) {
    baseApplyData(data, source);
    restoreFromUrl();
  };

  injectLogicielsToggle();

  byId('query')?.addEventListener('input', () => syncAfterEvent(false));
  byId('mapQuery')?.addEventListener('input', () => syncAfterEvent(false));

  ['canton', 'district', 'solution', 'statsScope', 'mapProduct'].forEach(id => {
    byId(id)?.addEventListener('change', () => syncAfterEvent(true));
  });

  ['primeOnly', 'eadminOnly', 'districtsToggle', 'issuesOnly', 'issuesCard', 'mapReset'].forEach(id => {
    byId(id)?.addEventListener('click', () => syncAfterEvent(true));
  });

  byId('reset')?.addEventListener('click', () => {
    logicielsMode = false;
    restoreFilterUi();
    syncAfterEvent(true);
  });

  document.querySelectorAll('.market-toggle, .view-tab, [data-map-perspective], [data-map-mode], [data-stats-metric], [data-stats-threshold]').forEach(button => {
    button.addEventListener('click', () => syncAfterEvent(true));
  });

  byId('tableHead')?.addEventListener('click', event => {
    if (event.target.closest('th.sortable')) syncAfterEvent(true);
  });

  byId('territoryComparison')?.addEventListener('click', event => {
    if (event.target.closest('button[data-stats-scope]')) syncAfterEvent(true);
  });

  window.addEventListener('popstate', restoreFromUrl);

  // Roadmap 2.0 is now semantic HTML. Runtime mutation is intentionally retired.
  // The footer version/counter is authored in HTML and must not be overwritten at runtime.

  const backToTop = byId('backToTop');
  if (backToTop) {
    let scrollFrame = 0;
    const updateBackToTop = () => {
      scrollFrame = 0;
      const threshold = Math.max(420, window.innerHeight * 0.65);
      backToTop.classList.toggle('is-visible', window.scrollY > threshold);
    };
    window.addEventListener('scroll', () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateBackToTop);
    }, { passive: true });
    backToTop.addEventListener('click', () => {
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
    updateBackToTop();
  }

  restoreFromUrl();
})();

// ---- app/prime-communes-stats-1.5.js ----
(() => {
  'use strict';

  // Prime Communes · Stats 1.5
  // Canonical Stats enhancement: Prime + innosolvcity hero, compact KPI rhythm,
  // and a data-driven Switzerland footprint. Reads DATA 1.5 only.
  const GEOMETRY_URL = 'public/data/swiss-map-v1.json';
  const nf = new Intl.NumberFormat('fr-CH');
  const pf = new Intl.NumberFormat('fr-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const root = document.getElementById('statsView');
  const hero = root?.querySelector('.stats-kpi-prime');
  const scopeSelect = document.getElementById('statsScope');
  const metricButtons = [...document.querySelectorAll('[data-stats-metric]')];
  const thresholdButtons = [...document.querySelectorAll('[data-stats-threshold]')];
  const statsTab = document.querySelector('[data-view="stats"]');
  if (!root || !hero || !window.PrimeCommunesData) return;

  let snapshot = null;
  let geometry = null;
  const geometryPromise = fetch(GEOMETRY_URL, { cache: 'force-cache' })
    .then(response => response.ok ? response.json() : null)
    .catch(() => null);

  function currentMetric() {
    return metricButtons.find(button => button.classList.contains('active'))?.dataset.statsMetric || 'population';
  }

  function currentThreshold() {
    return Number(thresholdButtons.find(button => button.classList.contains('active'))?.dataset.statsThreshold || 0);
  }

  function scopeLabel() {
    return scopeSelect?.selectedOptions?.[0]?.textContent?.trim() || 'Suisse romande';
  }

  function isRomandieScope() {
    return (scopeSelect?.value || 'romandie') === 'romandie';
  }

  function ensureHeroMarkup() {
    if (hero.dataset.stats15 === '1') return;
    hero.dataset.stats15 = '1';
    hero.classList.add('stats-prime-hero');
    hero.innerHTML = `
      <div class="stats-prime-copy">
        <span class="stats-prime-eyebrow">Part Prime · innosolvcity</span>
        <strong id="statsPrimeShare">—</strong>
        <small id="statsPrimeDetail">—</small>
        <div class="stats-prime-meta">
          <span id="statsPrimeCommunes">—</span>
          <span id="statsPrimeRatio">—</span>
        </div>
        <div class="stats-prime-progress" aria-hidden="true"><i id="statsPrimeProgress"></i></div>
      </div>
      <div class="stats-prime-visual" aria-hidden="true">
        <div class="stats-prime-map" id="statsPrimeMap"></div>
      </div>`;
  }

  function scopedRows() {
    if (!snapshot) return [];
    return window.PrimeCommunesData.scopeRows(snapshot.rows, scopeSelect?.value || 'romandie', currentThreshold());
  }

  function primeInnosolvRows(rows) {
    return rows.filter(window.PrimeCommunesData.isPrimeInnosolv);
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setProgress(share) {
    const node = document.getElementById('statsPrimeProgress');
    if (node) node.style.width = `${Math.max(0, Math.min(100, share))}%`;
  }

  function renderHero() {
    ensureHeroMarkup();
    const rows = scopedRows();
    const coveredRows = primeInnosolvRows(rows);
    const metric = currentMetric();
    const totalPopulation = rows.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);
    const coveredPopulation = coveredRows.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);
    const totalCommunes = rows.length;
    const coveredCommunes = coveredRows.length;
    const total = metric === 'communes' ? totalCommunes : totalPopulation;
    const covered = metric === 'communes' ? coveredCommunes : coveredPopulation;
    const share = total ? covered / total * 100 : 0;
    const ratio = covered ? Math.max(1, Math.round(total / covered)) : 0;
    const label = scopeLabel();

    setText('statsPrimeShare', `${pf.format(share)}%`);
    setText('statsPrimeDetail', metric === 'communes'
      ? `${nf.format(coveredCommunes)} communes couvertes`
      : `${nf.format(coveredPopulation)} habitants couverts`);
    setText('statsPrimeCommunes', `${nf.format(coveredCommunes)} communes clientes Prime · ${label}`);
    setText('statsPrimeRatio', ratio
      ? (metric === 'population'
          ? `${isRomandieScope() ? '1 Romand' : '1 habitant'} sur ${ratio}`
          : `1 commune sur ${ratio}`)
      : '—');
    setProgress(share);
    renderMiniMap(rows, coveredRows);
  }

  function renderMiniMap(rows, coveredRows) {
    const target = document.getElementById('statsPrimeMap');
    if (!target || !geometry?.meta?.viewBox) return;
    const [x, y, w, h] = geometry.meta.viewBox.map(Number);
    const scopeIds = new Set(rows.map(row => String(row.id)));
    const coveredIds = new Set(coveredRows.map(row => String(row.id)));
    const base = (geometry.cantons || [])
      .map(shape => `<path class="stats-swiss-base" d="${shape.d}"></path>`)
      .join('');
    const scope = (geometry.municipalities || [])
      .filter(shape => scopeIds.has(String(shape.id)))
      .map(shape => `<path class="stats-swiss-scope" d="${shape.d}"></path>`)
      .join('');
    const active = (geometry.municipalities || [])
      .filter(shape => coveredIds.has(String(shape.id)))
      .map(shape => `<path class="stats-swiss-active" d="${shape.d}"></path>`)
      .join('');
    target.innerHTML = `<svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet" focusable="false">${base}${scope}${active}</svg>`;
  }

  function syncContextKpiLabelHeight() {
    const cards = [...root.querySelectorAll('.stats-kpi:not(.stats-kpi-prime)')];
    if (!cards.length || root.hidden) return;
    cards.forEach(card => card.style.removeProperty('--pc-kpi-label-height'));
    const height = Math.ceil(Math.max(0, ...cards.map(card => card.querySelector(':scope > span')?.getBoundingClientRect().height || 0)));
    if (!height) return;
    cards.forEach(card => card.style.setProperty('--pc-kpi-label-height', `${height}px`));
  }

  function queueRender() {
    window.requestAnimationFrame(() => {
      renderHero();
      window.requestAnimationFrame(syncContextKpiLabelHeight);
    });
  }

  window.PrimeCommunesData.subscribe(next => {
    snapshot = next;
    queueRender();
  });

  geometryPromise.then(result => {
    geometry = result;
    if (snapshot) queueRender();
  });

  scopeSelect?.addEventListener('change', queueRender);
  metricButtons.forEach(button => button.addEventListener('click', queueRender));
  thresholdButtons.forEach(button => button.addEventListener('click', queueRender));
  statsTab?.addEventListener('click', queueRender);
  window.addEventListener('resize', () => window.requestAnimationFrame(syncContextKpiLabelHeight));

  ensureHeroMarkup();
  window.PrimeCommunesData.whenReady().then(next => {
    snapshot = next;
    queueRender();
  });
})();

// ---- app/prime-communes-communes-1.2.js ----
(() => {
  'use strict';

  // Prime Communes · Communes view
  // Municipality identity is one semantic unit on every viewport:
  // row number → canton flag → commune name.
  // Hosting belongs to the enriched Logiciels view, alongside ERP and Modules.
  const baseRender = render;
  const WIKIPEDIA_API = 'https://fr.wikipedia.org/w/api.php';
  const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
  const WIKIPEDIA_CACHE_KEY = 'primeCommunesWikipediaV1';
  const WIKIPEDIA_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
  const CANTON_NAMES = {
    AG:'Argovie', AI:'Appenzell Rhodes-Intérieures', AR:'Appenzell Rhodes-Extérieures', BE:'Berne',
    BL:'Bâle-Campagne', BS:'Bâle-Ville', FR:'Fribourg', GE:'Genève', GL:'Glaris', GR:'Grisons',
    JU:'Jura', LU:'Lucerne', NE:'Neuchâtel', NW:'Nidwald', OW:'Obwald', SG:'Saint-Gall',
    SH:'Schaffhouse', SO:'Soleure', SZ:'Schwytz', TG:'Thurgovie', TI:'Tessin', UR:'Uri',
    VD:'Vaud', VS:'Valais', ZG:'Zoug', ZH:'Zurich'
  };

  function normalizeWikiText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-CH');
  }

  function wikipediaCache() {
    try { return JSON.parse(localStorage.getItem(WIKIPEDIA_CACHE_KEY) || '{}'); }
    catch { return {}; }
  }

  function readWikipediaCache(commune) {
    const item = wikipediaCache()[String(commune.id)];
    return item && Date.now() - item.savedAt < WIKIPEDIA_CACHE_TTL ? item.data : null;
  }

  function writeWikipediaCache(commune, data) {
    try {
      const cache = wikipediaCache();
      cache[String(commune.id)] = { savedAt: Date.now(), data };
      localStorage.setItem(WIKIPEDIA_CACHE_KEY, JSON.stringify(cache));
    } catch { /* A private browser may refuse storage; the portrait still works. */ }
  }

  function wikipediaCandidateScore(page, commune) {
    if (!page?.extract || page.pageprops?.disambiguation !== undefined) return -1;
    const title = normalizeWikiText(page.title);
    const extract = normalizeWikiText(page.extract);
    const name = normalizeWikiText(commune.name);
    const canton = normalizeWikiText(CANTON_NAMES[commune.canton] || commune.canton);
    const district = normalizeWikiText(commune.district);
    const nameTokens = name.split(/[^a-z0-9]+/).filter(token => token.length > 2);
    if (!nameTokens.every(token => `${title} ${extract}`.includes(token))) return -1;
    let score = title === name ? 120 : title.startsWith(`${name} (`) ? 105 : title.includes(name) ? 75 : 30;
    if (/commune|ville suisse|municipalite/.test(extract)) score += 30;
    if (canton && extract.includes(canton)) score += 25;
    if (district && extract.includes(district)) score += 15;
    return score;
  }

  async function wikipediaPageMatchingOFS(ranked, commune) {
    const ids = [...new Set(ranked.map(item => item.page.pageprops?.wikibase_item).filter(Boolean))];
    if (!ids.length) throw new Error('Aucun identifiant Wikidata communal');
    const params = new URLSearchParams({
      action: 'wbgetentities', ids: ids.join('|'), props: 'claims', format: 'json', origin: '*'
    });
    const response = await fetch(`${WIKIDATA_API}?${params}`);
    if (!response.ok) throw new Error(`Wikidata ${response.status}`);
    const entities = (await response.json())?.entities || {};
    const expected = String(commune.id).replace(/\D/g, '');
    return ranked.find(item => {
      const entity = entities[item.page.pageprops?.wikibase_item];
      const claims = entity?.claims?.P771 || [];
      return claims.some(claim => String(claim?.mainsnak?.datavalue?.value || '').replace(/\D/g, '') === expected);
    })?.page || null;
  }

  async function fetchWikipediaPortrait(commune) {
    const cached = readWikipediaCache(commune);
    if (cached) return cached;
    const canton = CANTON_NAMES[commune.canton] || commune.canton || '';
    const params = new URLSearchParams({
      action: 'query', generator: 'search', gsrsearch: `"${commune.name}" commune ${canton}`,
      gsrnamespace: '0', gsrlimit: '6', prop: 'extracts|pageimages|info|pageprops',
      exintro: '1', explaintext: '1', exsentences: '5', piprop: 'thumbnail', pithumbsize: '720',
      inprop: 'url', redirects: '1', format: 'json', formatversion: '2', origin: '*'
    });
    const response = await fetch(`${WIKIPEDIA_API}?${params}`);
    if (!response.ok) throw new Error(`Wikipédia ${response.status}`);
    const payload = await response.json();
    const pages = payload?.query?.pages || [];
    const ranked = pages.map(page => ({ page, score: wikipediaCandidateScore(page, commune) }))
      .filter(item => item.score >= 0).sort((a, b) => b.score - a.score);
    const page = await wikipediaPageMatchingOFS(ranked, commune);
    if (!page) throw new Error(`Aucun article correspondant à l’OFS ${commune.id}`);
    const data = { title: page.title, extract: page.extract, url: page.fullurl, thumbnail: page.thumbnail?.source || '', ofs: String(commune.id), ofsVerified: true };
    writeWikipediaCache(commune, data);
    return data;
  }

  function closeCommunePortrait() {
    const root = document.getElementById('portraitRoot');
    if (root) root.innerHTML = '';
    document.documentElement.classList.remove('portrait-open');
    document.body.classList.remove('portrait-open');
  }

  function portraitWikipediaMarkup(data) {
    if (!data) return `<div class="portrait-wiki-fallback"><strong>Résumé Wikipédia indisponible</strong><p>Les faits Prime Communes restent affichés. Aucun article n’a été retenu plutôt que de risquer une confusion entre deux communes.</p></div>`;
    return `<span class="portrait-ofs-match">OFS ${esc(data.ofs)} vérifié ✓</span><article class="portrait-wiki-card">
      ${data.thumbnail ? `<img src="${esc(data.thumbnail)}" alt="Illustration de ${esc(data.title)} sur Wikipédia">` : ''}
      <div><p>${esc(data.extract)}</p><a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer">Lire sur Wikipédia ↗</a></div>
    </article>`;
  }

  async function openCommunePortrait(commune) {
    if (!commune) return;
    const root = document.getElementById('portraitRoot');
    if (!root) return;
    const cantonName = CANTON_NAMES[commune.canton] || commune.canton || '—';
    root.innerHTML = `<div class="portrait-backdrop">
      <aside class="commune-portrait" role="dialog" aria-modal="true" aria-labelledby="portraitTitle">
        <button class="portrait-close" type="button" aria-label="Fermer le portrait">×</button>
        <header class="portrait-heading">
          <img src="public/cantons/${esc(String(commune.canton || '').toLowerCase())}.svg" alt="">
          <div><p>Portrait communal · 2.0.5</p><h2 id="portraitTitle">${esc(commune.name)}</h2><span>OFS ${esc(commune.id)}</span></div>
        </header>
        <dl class="portrait-facts">
          <div><dt>Canton</dt><dd>${esc(cantonName)}</dd></div>
          <div><dt>District</dt><dd>${esc(commune.district || '—')}</dd></div>
          <div><dt>Population</dt><dd>${fmt.format(commune.expectedPopulation || 0)}</dd></div>
          <div><dt>Marché</dt><dd>${esc(commune.market || '—')}</dd></div>
        </dl>
        <section class="portrait-public-context">
          <div class="portrait-section-title"><div><span>Contexte public</span><h3>En quelques lignes</h3></div><span class="portrait-no-ai">Sans IA</span></div>
          <div class="portrait-wikipedia" aria-live="polite"><div class="portrait-loading"><i></i><span>Lecture de Wikipédia à la demande…</span></div></div>
          <p class="portrait-source">Source : Wikipédia · texte sous licence CC BY-SA. La source originale reste la référence.</p>
        </section>
        <button class="portrait-edit" type="button"><span aria-hidden="true">✎</span> Modifier les informations</button>
      </aside>
    </div>`;
    document.documentElement.classList.add('portrait-open');
    document.body.classList.add('portrait-open');
    root.querySelector('.portrait-close').onclick = closeCommunePortrait;
    root.querySelector('.portrait-backdrop').onclick = event => { if (event.target === event.currentTarget) closeCommunePortrait(); };
    root.querySelector('.portrait-edit').onclick = () => {
      closeCommunePortrait();
      if (mobileSearchIsOpen()) closeMobileSearch();
      openDrawer(commune);
    };
    const target = root.querySelector('.portrait-wikipedia');
    try { target.innerHTML = portraitWikipediaMarkup(await fetchWikipediaPortrait(commune)); }
    catch (error) { console.warn('Prime Communes · portrait Wikipédia indisponible', error); target.innerHTML = portraitWikipediaMarkup(null); }
  }

  window.openCommunePortrait = openCommunePortrait;
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('portrait-open')) closeCommunePortrait(); });

  function decorateCommuneIdentity() {
    const table = document.querySelector('.table-wrap table');
    const headRow = table?.querySelector('thead tr');
    const bodyRows = [...(table?.querySelectorAll('tbody tr') || [])];
    if (!table || !headRow) return;

    const headings = [...headRow.children];
    const communeIndex = headings.findIndex(th => /^Commune\b/i.test(th.textContent.trim()));
    const cantonIndex = headings.findIndex(th => th.textContent.trim().toLocaleLowerCase('fr-CH') === 'canton');
    if (communeIndex < 0) return;

    headings[communeIndex].dataset.column = 'commune';
    headings[communeIndex].classList.add('commune-heading');

    if (cantonIndex >= 0) {
      headings[cantonIndex].dataset.column = 'canton';
      headings[cantonIndex].classList.add('canton-column');
    }

    bodyRows.forEach((row, rowIndex) => {
      const commune = all.find(item => String(item.id) === String(row.dataset.id));
      if (!commune) return;

      row.title = `Consulter le portrait de ${commune.name}`;
      row.onclick = () => openCommunePortrait(commune);

      const cells = [...row.children];
      const communeCell = cells[communeIndex];
      if (!communeCell) return;

      communeCell.dataset.column = 'commune';
      communeCell.classList.add('commune-cell');

      const name = communeCell.querySelector('strong');
      if (name && !communeCell.querySelector('.commune-identity')) {
        const identity = document.createElement('span');
        identity.className = 'commune-identity';

        const rank = document.createElement('button');
        rank.type = 'button';
        rank.className = 'commune-rank';
        rank.textContent = String(rowIndex + 1);
        rank.title = `Découvrir ${commune.name}`;
        rank.setAttribute('aria-label', `Découvrir le portrait de ${commune.name}`);
        rank.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          openCommunePortrait(commune);
        });

        const flag = document.createElement('img');
        flag.className = 'commune-canton-flag';
        flag.src = `public/cantons/${String(commune.canton || '').toLowerCase()}.svg`;
        flag.alt = '';
        flag.title = `Canton ${commune.canton || ''}`;
        flag.setAttribute('aria-hidden', 'true');

        name.replaceWith(identity);
        identity.append(rank, flag, name);
      }

      if (cantonIndex >= 0 && cells[cantonIndex]) {
        cells[cantonIndex].dataset.column = 'canton';
        cells[cantonIndex].classList.add('canton-column');
      }
    });
  }

  function decorateHostingColumn() {
    const table = document.querySelector('.table-wrap table');
    const headRow = table?.querySelector('thead tr');
    const bodyRows = [...(table?.querySelectorAll('tbody tr') || [])];
    if (!table || !headRow || headRow.querySelector('.hosting-heading')) return;

    const headings = [...headRow.children];
    const modulesIndex = headings.findIndex(th => th.textContent.trim().toLocaleLowerCase('fr-CH') === 'modules');
    if (modulesIndex < 0) return;

    const modulesHeading = headings[modulesIndex];
    const hostingHeading = document.createElement('th');
    hostingHeading.className = 'hosting-heading';
    hostingHeading.dataset.softwareColumn = 'hosting';
    hostingHeading.textContent = 'Hébergeur';
    modulesHeading.insertAdjacentElement('afterend', hostingHeading);

    bodyRows.forEach(row => {
      const commune = all.find(item => String(item.id) === String(row.dataset.id));
      const modulesCell = row.children[modulesIndex];
      if (!commune || !modulesCell) return;

      const hostingCell = document.createElement('td');
      hostingCell.className = 'hosting-cell';
      hostingCell.dataset.softwareColumn = 'hosting';
      const hosting = String(commune.hosting || '').trim();
      hostingCell.innerHTML = hosting ? esc(hosting) : '<span class="cell-empty">—</span>';
      modulesCell.insertAdjacentElement('afterend', hostingCell);
    });
  }

  function normalizeEmptyCells() {
    document.querySelectorAll('.table-wrap tbody .empty').forEach(node => {
      node.classList.remove('empty');
      node.classList.add('cell-empty');
    });
  }

  const mobileMedia = window.matchMedia('(max-width:680px)');
  let mobileSearchOverlay = null;

  function mobileSearchIsOpen() {
    return Boolean(mobileSearchOverlay && !mobileSearchOverlay.hidden);
  }

  function matchExplanation(commune, query) {
    const meta = typeof communeSearchMeta === 'function' ? communeSearchMeta(commune, query) : null;
    if (!meta || meta.label === 'Commune') return '';
    const value = String(meta.value || '').trim();
    return value ? `<span><b>${esc(meta.label)}</b>${esc(value)}</span>` : '';
  }

  function syncMobileSearchFilters() {
    if (!mobileSearchOverlay) return;
    mobileSearchOverlay.querySelectorAll('[data-mobile-market]').forEach(button => {
      button.classList.toggle('active', button.dataset.mobileMarket === marketOnly);
    });
    mobileSearchOverlay.querySelector('[data-mobile-filter="prime"]')?.classList.toggle('active', primeOnly);
    mobileSearchOverlay.querySelector('[data-mobile-filter="eadmin"]')?.classList.toggle('active', eadminOnly);
  }

  function renderMobileSearchResults() {
    if (!mobileSearchIsOpen()) return;
    const results = filtered();
    const query = document.getElementById('query')?.value || '';
    const count = mobileSearchOverlay.querySelector('[data-mobile-search-count]');
    const list = mobileSearchOverlay.querySelector('[data-mobile-search-results]');
    if (count) count.textContent = `${fmt.format(results.length)} résultat${results.length > 1 ? 's' : ''}`;
    if (!list) return;
    list.innerHTML = results.slice(0, 80).map(commune => `
      <button class="mobile-search-result" data-commune-id="${esc(commune.id)}">
        <img src="public/cantons/${esc(String(commune.canton || '').toLowerCase())}.svg" alt="">
        <span class="mobile-search-result-main">
          <strong>${esc(commune.name)}</strong>
          <small>${esc(commune.canton)}${commune.district ? ` · ${esc(commune.district)}` : ''} · ${fmt.format(commune.expectedPopulation)} habitants</small>
          ${matchExplanation(commune, query)}
        </span>
        ${commune.isPrime ? '<img class="mobile-search-prime" src="public/prime-one-negative.png?v=4" alt="Client Prime">' : ''}
        <i aria-hidden="true">›</i>
      </button>`).join('') || '<p class="mobile-search-empty"><strong>Aucune commune trouvée.</strong><span>Essaie un autre nom, logiciel, intégrateur, ERP ou module.</span></p>';
    const limited = mobileSearchOverlay.querySelector('[data-mobile-search-limit]');
    if (limited) limited.hidden = results.length <= 80;
    syncMobileSearchFilters();
  }

  function closeMobileSearch() {
    if (!mobileSearchOverlay) return;
    mobileSearchOverlay.hidden = true;
    document.documentElement.classList.remove('mobile-search-open');
    document.body.classList.remove('mobile-search-open');
    mobileSearchOverlay.querySelector('input')?.blur();
  }

  function openMobileSearch() {
    if (!mobileMedia.matches || !mobileSearchOverlay) return;
    const mobileInput = mobileSearchOverlay.querySelector('input');
    mobileInput.value = document.getElementById('query')?.value || '';
    mobileSearchOverlay.hidden = false;
    document.documentElement.classList.add('mobile-search-open');
    document.body.classList.add('mobile-search-open');
    renderMobileSearchResults();
    // iOS only opens the keyboard when focus stays inside the original tap.
    mobileInput.focus({ preventScroll: true });
  }

  function buildMobileSearch() {
    if (mobileSearchOverlay) return;
    mobileSearchOverlay = document.createElement('section');
    mobileSearchOverlay.className = 'mobile-search-overlay';
    mobileSearchOverlay.hidden = true;
    mobileSearchOverlay.setAttribute('role', 'dialog');
    mobileSearchOverlay.setAttribute('aria-modal', 'true');
    mobileSearchOverlay.setAttribute('aria-label', 'Recherche universelle des communes');
    mobileSearchOverlay.innerHTML = `
      <header class="mobile-search-header">
        <button class="mobile-search-back" type="button" aria-label="Revenir aux communes">‹</button>
        <label><span aria-hidden="true">⌕</span><input type="search" placeholder="Commune, logiciel, ERP, module…" autocomplete="off" autocapitalize="none" enterkeyhint="search"></label>
      </header>
      <div class="mobile-search-scopes" aria-label="Filtres rapides">
        <button type="button" data-mobile-market="Welsch">Welsch</button>
        <button type="button" data-mobile-market="Uf Tüütsch">Uf Tüütsch</button>
        <button type="button" data-mobile-market="Ticino">TI</button>
        <button type="button" data-mobile-filter="prime">Clients Prime</button>
        <button type="button" data-mobile-filter="eadmin">eAdmin</button>
      </div>
      <div class="mobile-search-summary">
        <strong data-mobile-search-count>0 résultat</strong>
        <span>Touchez une commune · portrait public</span>
      </div>
      <div class="mobile-search-results" data-mobile-search-results></div>
      <p class="mobile-search-limit" data-mobile-search-limit hidden>80 premiers résultats · précise ta recherche pour aller plus loin.</p>`;
    document.body.append(mobileSearchOverlay);

    const sourceInput = document.getElementById('query');
    const mobileInput = mobileSearchOverlay.querySelector('input');
    sourceInput?.addEventListener('pointerdown', event => {
      if (!mobileMedia.matches) return;
      event.preventDefault();
      openMobileSearch();
    });
    sourceInput?.addEventListener('focus', () => {
      if (mobileMedia.matches) openMobileSearch();
    });
    mobileInput.addEventListener('input', () => {
      sourceInput.value = mobileInput.value;
      sourceInput.dispatchEvent(new Event('input', { bubbles: true }));
      // The desktop listener was registered before the mobile render wrapper.
      // Refresh the visible overlay explicitly on every mobile keystroke.
      renderMobileSearchResults();
    });
    mobileInput.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMobileSearch();
    });
    mobileSearchOverlay.querySelector('.mobile-search-back').onclick = closeMobileSearch;
    mobileSearchOverlay.querySelectorAll('[data-mobile-market]').forEach(button => {
      button.onclick = () => document.querySelector(`#territoryFilters [data-market="${CSS.escape(button.dataset.mobileMarket)}"]`)?.click();
    });
    mobileSearchOverlay.querySelector('[data-mobile-filter="prime"]').onclick = () => document.getElementById('primeOnly')?.click();
    mobileSearchOverlay.querySelector('[data-mobile-filter="eadmin"]').onclick = () => document.getElementById('eadminOnly')?.click();
    mobileSearchOverlay.querySelector('[data-mobile-search-results]').onclick = event => {
      const result = event.target.closest('[data-commune-id]');
      if (!result) return;
      const commune = all.find(item => String(item.id) === result.dataset.communeId);
      if (!commune) return;
      openCommunePortrait(commune);
    };
    mobileMedia.addEventListener('change', event => { if (!event.matches) closeMobileSearch(); });
  }

  render = function renderCommunesView() {
    baseRender();
    decorateCommuneIdentity();
    decorateHostingColumn();
    normalizeEmptyCells();
    renderMobileSearchResults();
  };

  buildMobileSearch();

  // The historic inline filters keep a reference to the original renderer.
  // Observe row replacements so the consultation layer is restored whatever
  // the order in which live data and view scripts finish loading.
  const rowsRoot = document.getElementById('rows');
  if (rowsRoot) {
    new MutationObserver(() => {
      if (!rowsRoot.querySelector('tr') || rowsRoot.querySelector('.commune-identity')) return;
      decorateCommuneIdentity();
      decorateHostingColumn();
      normalizeEmptyCells();
    }).observe(rowsRoot, { childList: true });
  }

  // Apply the canonical layout immediately if the live data arrived before
  // this view module finished loading.
  if (all.length) render();
})();

// ---- app/prime-communes-news-2.0.js ----
(() => {
  'use strict';

  const DATA_URL = 'public/data/news-radar-v1.json?v=20260914-2';
  const ANALYSIS_URL = 'public/data/news-analysis-v1.json?v=20260920-1';
  const RADAR_STATUS_URL = 'public/data/radar-state-v1.json?v=20260921-1';
  const RADAR_CANDIDATES_URL = 'public/data/radar-candidates-v1.json?v=20260921-1';
  const CHAT_URL = 'https://chatgpt.com/c/6a9ef456-9284-83ed-9f8b-5e32c1fdfcc3';
  const levelOrder = { strong: 0, watch: 1, info: 2 };
  const levelLabels = { strong: 'Signal fort', watch: 'À surveiller', info: 'Information' };
  const confidenceLabels = { confirmed: 'Confirmé', probable: 'Probable', verify: 'À vérifier' };
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const formatDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('fr-CH', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  let signals = [];
  let analysisItems = [];
  let radarMeta = {};
  let radarStatus = null;
  let radarCandidates = [];
  let activeLevel = 'all';
  const REFRESH_REQUEST_KEY = 'primeCommunesNewsRefreshRequest';
  const QUALIFICATION_KEY = 'primeCommunesNewsQualificationsV1';

  function refreshPrompt() {
    const pending = radarCandidates.filter(item => (item.status || 'pending') === 'pending');
    const lines = pending.map(item => [
      '- ' + (item.municipality || item.scopeLabel || 'Périmètre communal'),
      item.title || item.url,
      item.url ? 'Source: ' + item.url : '',
      item.reason ? 'Détection mécanique: ' + item.reason : ''
    ].filter(Boolean).join(' · '));
    return [
      'Analyse uniquement les candidats détectés mécaniquement par Radar! dans Prime Communes.',
      '',
      'Ne lance pas une veille générale du web. Ne cherche pas de nouvelles communes au hasard : la collecte est le rôle du Radar déterministe.',
      'Pour chaque candidat ci-dessous, consulte la source primaire indiquée seulement si nécessaire, puis décide s’il mérite un signal Prime.',
      '',
      'Sépare strictement : fait public → déduction documentée → lecture Prime.',
      'Ne transforme jamais une hypothèse en fait.',
      'Exclus les projets déjà devisés, attribués, gagnés, livrés ou payés lorsqu’ils sont connus.',
      "n'exclus jamais un signal uniquement parce que la commune est cliente Prime : publie-le avec une réserve explicite si son statut commercial est inconnu.",
      'Ne demande pas une validation supplémentaire : si un candidat est solide et actionnable, mets à jour news-radar-v1.json et news-analysis-v1.json.',
      'Après traitement, marque le candidat comme analyzed ou discarded dans radar-candidates-v1.json afin qu’il ne soit pas réanalysé.',
      '',
      'Candidats détectés (' + pending.length + ') :',
      lines.length ? lines.join('\\n') : '- aucun',
      '',
      'À la fin, résume uniquement les candidats analysés, publiés ou écartés.'
    ].join('\\n');
  }

  async function copyRefreshPrompt() {
    const prompt = refreshPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = prompt;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  }

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = value;
  }

  function renderRadarOperations() {
    const coverage = radarStatus?.coverage || {};
    const sourceHealth = radarStatus?.sources || {};
    const detection = radarStatus?.detection || {};
    const economy = radarStatus?.economy || {};
    const analysis = radarStatus?.analysis || {};
    const target = Number(coverage.targetMunicipalities || 621);
    const direct = Number(coverage.directMunicipalities || 0);
    const procurement = Number(coverage.procurementMunicipalities || 0);
    const configured = Number(sourceHealth.configured || 0);
    const active = Number(sourceHealth.active || 0);
    const errors = Number(sourceHealth.error || 0);
    const pending = radarCandidates.filter(item => (item.status || 'pending') === 'pending');

    setText('radarCoverageCount', procurement + '/' + target);
    setText('radarCoverageDetail', 'marchés publics · ' + direct + '/' + target + ' sources communales directes');
    setText('radarSourceCount', active + '/' + configured);
    setText('radarSourceDetail', errors ? errors + ' source' + (errors > 1 ? 's' : '') + ' en erreur' : 'aucune erreur connue');
    setText('radarChangeCount', String(Number(detection.newDocuments || 0)));
    setText('radarChangeDetail', Number(detection.changes || 0) + ' changement' + (Number(detection.changes || 0) > 1 ? 's' : '') + ' au dernier passage');
    setText('radarCandidateCount', String(pending.length));
    setText('radarPublishedCount', String(Number(analysis.published || signals.length || 0)));
    setText('radarEconomyDetail',
      Number(economy.requests || 0) + ' requêtes · ' +
      Number(economy.notModified || 0) + ' réponses sans contenu · ' +
      Number(economy.aiCalls || 0) + ' appel IA automatique');

    const button = byId('newsManualRefresh');
    const status = byId('newsRefreshStatus');
    if (button) button.disabled = pending.length === 0;
    if (status) {
      if (pending.length) status.textContent = pending.length + ' candidat' + (pending.length > 1 ? 's' : '') + ' détecté' + (pending.length > 1 ? 's' : '') + ' · prêt' + (pending.length > 1 ? 's' : '') + ' à analyser';
      else if (radarStatus?.meta?.generatedAt) status.textContent = 'Aucun candidat · 0 appel IA nécessaire ✓';
      else status.textContent = 'Premier passage mécanique en attente';
    }
  }

  async function loadRadarOperations() {
    try {
      const [statusResponse, candidatesResponse] = await Promise.all([
        fetch(RADAR_STATUS_URL, { cache: 'no-store' }),
        fetch(RADAR_CANDIDATES_URL, { cache: 'no-store' })
      ]);
      if (!statusResponse.ok) throw new Error('Radar status ' + statusResponse.status);
      if (!candidatesResponse.ok) throw new Error('Radar candidates ' + candidatesResponse.status);
      radarStatus = await statusResponse.json();
      const candidateData = await candidatesResponse.json();
      radarCandidates = Array.isArray(candidateData.items) ? candidateData.items : [];
    } catch (error) {
      console.error(error);
      radarStatus = null;
      radarCandidates = [];
    }
    renderRadarOperations();
  }

  function filteredSignals() {
    const needle = byId('newsQuery')?.value.trim().toLocaleLowerCase('fr-CH') || '';
    return signals.filter(signal => {
      const interpretation = analysisItems.find(item => item.signalId === signal.id)?.interpretation || {};
      const affected = interpretation.affected || {};
      const haystack = [signal.municipality, signal.canton, signal.title, signal.summary,
        signal.why, signal.sourceLabel, interpretation.change, interpretation.deduction,
        interpretation.primeReading, ...Object.values(affected).flat(), ...(signal.tags || [])]
        .join(' ').toLocaleLowerCase('fr-CH');
      return (activeLevel === 'all' || signal.level === activeLevel) && (!needle || haystack.includes(needle));
    }).sort((a, b) => levelOrder[a.level] - levelOrder[b.level] || b.date.localeCompare(a.date));
  }

  function sourceMarkup(signal) {
    const label = escapeHtml(signal.sourceLabel);
    if (!signal.sourceUrl) return `<span class="news-source-label">${label}</span>`;
    return `<a class="news-source-link" href="${escapeHtml(signal.sourceUrl)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  }

  function analysisFor(signalId) {
    return analysisItems.find(item => item.signalId === signalId) || null;
  }

  function readQualifications() {
    try {
      return JSON.parse(localStorage.getItem(QUALIFICATION_KEY) || '{}') || {};
    } catch {
      localStorage.removeItem(QUALIFICATION_KEY);
      return {};
    }
  }

  function writeQualifications(value) {
    localStorage.setItem(QUALIFICATION_KEY, JSON.stringify(value));
  }

  function qualificationFor(signalId) {
    const proposal = analysisFor(signalId)?.qualificationProposal || {};
    const saved = readQualifications()[signalId] || {};
    return { ...proposal, ...saved, saved: Boolean(saved.savedAt) };
  }

  function money(value) {
    return value > 0 ? new Intl.NumberFormat('fr-CH', {
      style: 'currency', currency: 'CHF', maximumFractionDigits: 0
    }).format(value) : 'À compléter';
  }

  function renderForecast() {
    const drafts = signals.map(signal => qualificationFor(signal.id));
    const saved = drafts.filter(item => item.saved);
    const actions = saved.filter(item => item.decision === 'act');
    const gross = saved.reduce((sum, item) => sum + (Number(item.estimatedValue) || 0), 0);
    const weighted = saved.reduce((sum, item) => sum + ((Number(item.estimatedValue) || 0) * (Number(item.probability) || 0) / 100), 0);
    if (byId('newsQualifiedCount')) byId('newsQualifiedCount').textContent = `${saved.length}/${signals.length}`;
    if (byId('newsActionCount')) byId('newsActionCount').textContent = String(actions.length);
    if (byId('newsForecastGross')) byId('newsForecastGross').textContent = money(gross);
    if (byId('newsForecastWeighted')) byId('newsForecastWeighted').textContent = money(weighted);
  }

  function affectedMarkup(affected = {}) {
    const groups = [
      ['Communes', affected.municipalities],
      ['Territoires', affected.territories],
      ['Produits', affected.products],
      ['Intégrateurs', affected.integrators]
    ];
    return groups.map(([label, values]) => `<div><span>${label}</span><p>${(values || []).map(value => `<b>${escapeHtml(value)}</b>`).join('') || '<b>Non établi</b>'}</p></div>`).join('');
  }

  function decisionOptions(selected) {
    return [
      ['to_qualify', 'À qualifier'], ['watch', 'Surveiller'], ['act', 'Agir'], ['discard', 'Écarter']
    ].map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');
  }

  function signalTools(signal) {
    const item = analysisFor(signal.id);
    if (!item) return '';
    const interpretation = item.interpretation || {};
    const qualification = qualificationFor(signal.id);
    return `<div class="news-tools">
      <div class="news-tool-buttons" role="group" aria-label="Approfondir ${escapeHtml(signal.municipality)}">
        <button type="button" data-news-tool="impact" data-news-signal="${escapeHtml(signal.id)}" aria-expanded="false"><span>2.0.3</span> Comprendre l'impact</button>
        <button type="button" data-news-tool="qualification" data-news-signal="${escapeHtml(signal.id)}" aria-expanded="false"><span>2.0.4</span> Qualifier ce signal</button>
      </div>
      <section class="news-tool-panel news-impact-panel" data-news-panel="impact" data-news-signal="${escapeHtml(signal.id)}" hidden>
        <header><div><span>Actualité interprétée · 2.0.3</span><strong>Ce que ce fait change</strong></div><small>Trois niveaux, jamais confondus</small></header>
        <div class="news-proof-line">
          <article class="is-fact"><span>1 · Fait public</span><p>${escapeHtml(signal.summary)}</p></article>
          <article class="is-deduction"><span>2 · Déduction documentée</span><p>${escapeHtml(interpretation.deduction)}</p></article>
          <article class="is-prime"><span>3 · Lecture Prime</span><p>${escapeHtml(interpretation.primeReading)}</p></article>
        </div>
        <div class="news-change"><span>En clair</span><strong>${escapeHtml(interpretation.change)}</strong></div>
        <div class="news-affected">${affectedMarkup(interpretation.affected)}</div>
      </section>
      <section class="news-tool-panel news-qualification-panel" data-news-panel="qualification" data-news-signal="${escapeHtml(signal.id)}" hidden>
        <header><div><span>Qualification légère · 2.0.4</span><strong>Décider de la prochaine action</strong></div><small>Brouillon sur cet appareil · aucun CRM créé</small></header>
        <form data-qualification-form="${escapeHtml(signal.id)}">
          <label><span>Décision</span><select name="decision">${decisionOptions(qualification.decision)}</select></label>
          <label><span>Responsable</span><input name="owner" value="${escapeHtml(qualification.owner || '')}" placeholder="À attribuer"></label>
          <label class="wide"><span>Prochaine action</span><textarea name="nextAction" rows="2">${escapeHtml(qualification.nextAction || '')}</textarea></label>
          <label><span>Échéance</span><input name="dueDate" type="date" value="${escapeHtml(qualification.dueDate || '')}"></label>
          <label><span>Probabilité</span><div class="news-unit-input"><input name="probability" type="number" min="0" max="100" inputmode="numeric" value="${qualification.probability ?? ''}" placeholder="—"><b>%</b></div></label>
          <label><span>Valeur estimée</span><div class="news-unit-input"><input name="estimatedValue" type="number" min="0" step="1000" inputmode="numeric" value="${qualification.estimatedValue ?? ''}" placeholder="—"><b>CHF</b></div></label>
          <div class="news-qualification-actions wide"><button type="submit">Enregistrer sur cet appareil</button><button type="button" data-qualification-reset="${escapeHtml(signal.id)}">Réinitialiser</button><small data-qualification-status>${qualification.saved ? 'Brouillon enregistré ✓' : escapeHtml(qualification.basis || '')}</small></div>
        </form>
      </section>
    </div>`;
  }

  function signalCard(signal) {
    const tags = (signal.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
    return `<article class="news-card news-card-${escapeHtml(signal.level)}">
      <div class="news-card-rail" aria-hidden="true"></div>
      <div class="news-card-main">
        <header>
          <span class="news-level news-level-${escapeHtml(signal.level)}"><i></i>${levelLabels[signal.level] || 'Information'}</span>
          <time datetime="${escapeHtml(signal.date)}">${formatDate(signal.date)}</time>
        </header>
        <button class="news-municipality" data-news-bfs="${Number(signal.bfsId)}" title="Ouvrir la fiche de ${escapeHtml(signal.municipality)}">
          <img src="public/cantons/${escapeHtml(signal.canton.toLowerCase())}.svg" alt="">
          <span><strong>${escapeHtml(signal.municipality)}</strong><small>${escapeHtml(signal.canton)} · OFS ${Number(signal.bfsId)}</small></span><b>Ouvrir la fiche&nbsp;›</b>
        </button>
        <h3>${escapeHtml(signal.title)}</h3>
        <div class="news-fact"><span>Fait public</span><p>${escapeHtml(signal.summary)}</p></div>
        <div class="news-why"><span>Lecture de l'IA d'Axel</span><p>${escapeHtml(signal.why)}</p></div>
        <div class="news-tags">${tags}</div>
        ${signalTools(signal)}
      </div>
      <aside class="news-card-proof">
        <span>Provenance</span><strong>${escapeHtml(signal.sourceType)}</strong>
        ${sourceMarkup(signal)}
        <div class="news-update"><span>Mise à jour</span><b>${escapeHtml(signal.updatedBy || "IA d'Axel")}</b></div>
        <div><span>Confiance</span><b class="news-confidence news-confidence-${escapeHtml(signal.confidence)}"><i></i>${confidenceLabels[signal.confidence] || 'À vérifier'}</b></div>
      </aside>
    </article>`;
  }

  function render() {
    const list = filteredSignals();
    if (byId('newsResultCount')) byId('newsResultCount').textContent = String(list.length);
    renderForecast();
    renderRadarOperations();
    const feed = byId('newsFeed');
    if (!feed) return;
    feed.innerHTML = list.length ? list.map(signalCard).join('') : '<div class="news-empty"><strong>Aucun signal dans cette vue.</strong><span>Essaie un autre niveau ou efface la recherche.</span></div>';
    feed.querySelectorAll('[data-news-bfs]').forEach(button => {
      button.addEventListener('click', () => {
        const municipality = all.find(item => Number(item.id) === Number(button.dataset.newsBfs));
        if (municipality && typeof openDrawer === 'function') openDrawer(municipality);
      });
    });
    feed.querySelectorAll('[data-news-tool]').forEach(button => {
      button.addEventListener('click', () => {
        const card = button.closest('.news-card');
        const panel = card?.querySelector(`[data-news-panel="${button.dataset.newsTool}"]`);
        const opening = Boolean(panel?.hidden);
        card?.querySelectorAll('[data-news-panel]').forEach(item => { item.hidden = true; });
        card?.querySelectorAll('[data-news-tool]').forEach(item => {
          item.classList.remove('active');
          item.setAttribute('aria-expanded', 'false');
        });
        if (panel && opening) {
          panel.hidden = false;
          button.classList.add('active');
          button.setAttribute('aria-expanded', 'true');
        }
      });
    });
    feed.querySelectorAll('[data-qualification-form]').forEach(form => {
      form.addEventListener('submit', event => {
        event.preventDefault();
        const formData = new FormData(form);
        const values = readQualifications();
        values[form.dataset.qualificationForm] = {
          decision: formData.get('decision'),
          owner: String(formData.get('owner') || '').trim(),
          nextAction: String(formData.get('nextAction') || '').trim(),
          dueDate: formData.get('dueDate') || '',
          probability: formData.get('probability') === '' ? null : Number(formData.get('probability')),
          estimatedValue: formData.get('estimatedValue') === '' ? null : Number(formData.get('estimatedValue')),
          currency: 'CHF',
          savedAt: new Date().toISOString()
        };
        writeQualifications(values);
        const status = form.querySelector('[data-qualification-status]');
        if (status) status.textContent = 'Brouillon enregistré sur cet appareil ✓';
        renderForecast();
      });
    });
    feed.querySelectorAll('[data-qualification-reset]').forEach(button => {
      button.addEventListener('click', () => {
        const values = readQualifications();
        delete values[button.dataset.qualificationReset];
        writeQualifications(values);
        render();
      });
    });
  }

  async function loadAnalysis() {
    try {
      const response = await fetch(ANALYSIS_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Analyses ${response.status}`);
      const data = await response.json();
      analysisItems = Array.isArray(data.items) ? data.items : [];
    } catch (error) {
      console.error(error);
      analysisItems = [];
    }
  }

  async function load() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Radar ${response.status}`);
      const data = await response.json();
      radarMeta = data.meta || {};
      signals = Array.isArray(data.signals) ? data.signals : [];
      renderRadarOperations();
      render();
    } catch (error) {
      console.error(error);
      if (byId('newsFeed')) byId('newsFeed').innerHTML = '<div class="news-empty"><strong>Le Radar ne peut pas être chargé.</strong><span>Les autres vues restent disponibles.</span></div>';
    }
  }

  byId('newsQuery')?.addEventListener('input', render);
  byId('newsManualRefresh')?.addEventListener('click', async () => {
    const status = byId('newsRefreshStatus');
    const pending = radarCandidates.filter(item => (item.status || 'pending') === 'pending');
    if (!pending.length) {
      if (status) status.textContent = 'Aucun candidat · aucun appel IA lancé ✓';
      return;
    }
    try {
      localStorage.setItem(REFRESH_REQUEST_KEY, JSON.stringify({
        candidateCount: pending.length,
        requestedAt: new Date().toISOString()
      }));
      await copyRefreshPrompt();
      byId('newsManualRefresh')?.classList.add('is-launching');
      if (status) status.textContent = 'Candidats copiés · ouverture de l’analyse…';
      window.setTimeout(() => window.location.assign(CHAT_URL), 900);
    } catch (error) {
      console.error(error);
      if (status) status.textContent = 'Copie impossible · réessaie';
    }
  });

  document.querySelectorAll('[data-news-level]').forEach(button => {
    button.addEventListener('click', () => {
      activeLevel = button.dataset.newsLevel || 'all';
      document.querySelectorAll('[data-news-level]').forEach(item => item.classList.toggle('active', item === button));
      render();
    });
  });

  window.PrimeCommunesNews = { render, reload: load };
  void loadAnalysis().then(load);
  void loadRadarOperations();
})();

// ---- app/prime-communes-stories-2.0.js ----
(() => {
  'use strict';

  const STORY_URL = 'public/data/stories-v1.json?v=20260921-1';
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  let stories = [];

  function storySource(story, sourceId) {
    return (story.sources || []).find(source => source.id === sourceId) || null;
  }

  function storySourceLink(source, compact = false) {
    if (!source) return '';
    const label = compact ? 'Source' : source.label;
    if (!source.url) return `<span>${escapeHtml(label)}</span>`;
    return `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`;
  }

  function storyCard(story) {
    const facts = (story.facts || []).map(fact => `<article class="story-fact">
      <span>${escapeHtml(fact.dateLabel)}</span>
      <h4>${escapeHtml(fact.title)}</h4>
      <p>${escapeHtml(fact.text)}</p>
      ${storySourceLink(storySource(story, fact.sourceId), true)}
    </article>`).join('');
    const angles = story.angles || [];
    const firstAngle = angles[0] || { id: '', label: '', title: '', text: '' };
    const angleButtons = angles.map((angle, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-story-id="${escapeHtml(story.id)}" data-story-angle="${escapeHtml(angle.id)}" aria-pressed="${index === 0}">${escapeHtml(angle.label)}</button>`).join('');
    const deliverables = (story.deliverables || []).map(item => `<span>${escapeHtml(item)}</span>`).join('');
    const sources = (story.sources || []).map(source => `<li><b>${escapeHtml(source.type)}</b>${storySourceLink(source)}</li>`).join('');
    return `<article class="story-card" id="story-${escapeHtml(story.id)}">
      <header class="story-hero">
        <div>
          <p>${escapeHtml(story.kicker)}</p>
          <h3>${escapeHtml(story.title)}</h3>
          <div class="story-places">
            <button type="button" data-story-bfs="${Number(story.bfsId)}"><img src="public/cantons/${escapeHtml(story.canton.toLowerCase())}.svg" alt=""><span>${escapeHtml(story.municipality)}</span></button>
            <i aria-hidden="true">↔</i>
            <span><img src="public/cantons/${escapeHtml(story.counterpartCanton.toLowerCase())}.svg" alt="">${escapeHtml(story.counterpart)}</span>
          </div>
        </div>
        <p>${escapeHtml(story.standfirst)}</p>
      </header>
      <div class="story-timeline">${facts}</div>
      <div class="story-reading-grid">
        <section class="story-prime-fact"><span>${escapeHtml(story.primeFact.label)}</span><p>${escapeHtml(story.primeFact.text)}</p><small>${escapeHtml(story.primeFact.sourceLabel)} · ${escapeHtml(story.primeFact.confidence)}</small></section>
        <section class="story-axel-reading"><span>${escapeHtml(story.axelReading.label)}</span><p>${escapeHtml(story.axelReading.text)}</p></section>
      </div>
      <section class="story-angles">
        <header><div><span>Angles éditoriaux</span><strong>Une histoire, plusieurs usages</strong></div><button type="button" class="story-copy" data-story-copy="${escapeHtml(story.id)}">Copier cet angle</button></header>
        <div class="story-angle-tabs" role="group" aria-label="Choisir un angle éditorial">${angleButtons}</div>
        <div class="story-angle-copy" data-story-angle-copy="${escapeHtml(story.id)}" aria-live="polite"><strong>${escapeHtml(firstAngle.title)}</strong><p>${escapeHtml(firstAngle.text)}</p></div>
        <div class="story-deliverables"><b>Prêt pour</b>${deliverables}</div>
      </section>
      <footer class="story-sources"><strong>Sources du récit</strong><ul>${sources}</ul></footer>
    </article>`;
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  }

  function bindStories() {
    const feed = byId('storiesFeed');
    if (!feed) return;
    feed.querySelectorAll('[data-story-bfs]').forEach(button => button.addEventListener('click', () => {
      const municipality = all.find(item => Number(item.id) === Number(button.dataset.storyBfs));
      if (municipality && typeof openDrawer === 'function') openDrawer(municipality);
    }));
    feed.querySelectorAll('[data-story-angle]').forEach(button => button.addEventListener('click', () => {
      const story = stories.find(item => item.id === button.dataset.storyId);
      const angle = story?.angles?.find(item => item.id === button.dataset.storyAngle);
      if (!story || !angle) return;
      feed.querySelectorAll(`[data-story-id="${story.id}"]`).forEach(item => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      const copy = feed.querySelector(`[data-story-angle-copy="${story.id}"]`);
      if (copy) copy.innerHTML = `<strong>${escapeHtml(angle.title)}</strong><p>${escapeHtml(angle.text)}</p>`;
    }));
    feed.querySelectorAll('[data-story-copy]').forEach(button => button.addEventListener('click', async () => {
      const story = stories.find(item => item.id === button.dataset.storyCopy);
      const selected = feed.querySelector(`[data-story-id="${button.dataset.storyCopy}"].active`);
      const angle = story?.angles?.find(item => item.id === selected?.dataset.storyAngle) || story?.angles?.[0];
      if (!story || !angle) return;
      await copyText(`${story.title}\n\n${angle.title}\n${angle.text}\n\n${story.standfirst}`);
      button.textContent = 'Angle copié ✓';
      window.setTimeout(() => { button.textContent = 'Copier cet angle'; }, 1800);
    }));
  }

  async function loadStories() {
    const feed = byId('storiesFeed');
    if (!feed) return;
    try {
      const response = await fetch(STORY_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Histoires ${response.status}`);
      const data = await response.json();
      stories = Array.isArray(data.stories) ? data.stories : [];
      feed.innerHTML = stories.length ? stories.map(storyCard).join('') : '<div class="news-empty"><strong>Aucun récit publié.</strong><span>Les histoires validées apparaîtront ici.</span></div>';
      bindStories();
    } catch (error) {
      console.error(error);
      feed.innerHTML = '<div class="news-empty"><strong>Le récit ne peut pas être chargé.</strong><span>Réessaie plus tard.</span></div>';
    }
  }


  window.PrimeCommunesStories = { reload: loadStories };
  void loadStories();
})();

// ---- app/prime-communes-roadmap-1.2.js ----
(() => {
  'use strict';

  // Prime Communes · Roadmap 2.0
  // The roadmap is intentionally stored as semantic HTML in index.html.
  // This file remains as a stable loader boundary for future interactions.
  document.getElementById('roadmapView')?.setAttribute('data-roadmap-version', '2.0');
})();





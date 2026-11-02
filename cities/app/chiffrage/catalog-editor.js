// Catalog editor UI; transport and editor session stay in view.js.
const e = value => String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const brands={innosolv:'innosolvcity',abacus:'Abacus',pce:'ProConcept',prime:'Prime'};
export function catalogEditor(data, label, editing = null) {
  const contents=data.module_contents ?? [], options=data.prime_options ?? [];
  const rows=(kind,items)=>items.map((row,index)=>`<div class="chiffrage-catalog-record"><span><strong>${e(row.label_fr)}</strong><small>${kind==='included'?e(data.parents.find(p=>p.key===row.parent)?.label_fr || row.parent):label('Option Prime indépendante','Eigenständige Prime-Option')}${row.enabled===false?' · '+label('Désactivé','Deaktiviert'):''}</small></span><button type="button" class="chiffrage-button quiet" data-action="catalogEdit" data-kind="${kind}" data-index="${index}">${label('Modifier','Bearbeiten')}</button></div>`).join('');
  const row=editing ? (editing.kind==='included'?contents:options)[editing.index] ?? {} : {};
  const input=(name,title,value='',type='text',attrs='')=>`<label>${title}<input name="${name}" type="${type}" value="${e(value ?? '')}" ${attrs}></label>`;
  const included=editing?.kind==='included';
  const form=editing ? `<form id="chiffrageCatalogForm" class="chiffrage-panel" data-kind="${editing.kind}" data-index="${editing.index ?? ''}">
    <h3>${included?label('Fonction incluse','Enthaltene Funktion'):label('Option Prime indépendante','Eigenständige Prime-Option')}</h3>
    <div class="chiffrage-grid">
      ${input('label_fr',label('Nom français','Französischer Name'),row.label_fr,'text','required maxlength="120"')}
      ${input('label_de',label('Nom allemand (facultatif)','Deutscher Name (optional)'),row.label_de,'text','maxlength="120"')}
      ${included ? `<label>${label('Incluse avec le module','Enthalten im Modul')}<select name="parent" required>${data.parents.map(p=>`<option value="${e(p.key)}" ${row.parent===p.key?'selected':''}>${e(brands[p.vendor] || p.vendor)} · ${e(p.label_fr)}</option>`).join('')}</select></label>
        ${input('theme_fr',label('Thème français (facultatif)','Französisches Thema (optional)'),row.theme_fr)}
        ${input('theme_de',label('Thème allemand (facultatif)','Deutsches Thema (optional)'),row.theme_de)}
        ${input('order',label('Ordre dans le module','Reihenfolge im Modul'),row.order ?? contents.length,'number','step="1"')}` :
      `<label>${label('Logiciel nécessaire','Erforderliche Software')}<select name="requires_product"><option value="">${label('Tous','Alle')}</option>${Object.entries(brands).filter(([key])=>key!=='prime').map(([key,name])=>`<option value="${key}" ${row.requires_product===key?'selected':''}>${name}</option>`).join('')}</select></label>
      <label>${label('Condition ProConcept','ProConcept-Bedingung')}<select name="requires_pce_option"><option value="">${label('Aucune','Keine')}</option><option value="finances" ${row.requires_pce_option==='finances'?'selected':''}>${label('Finances','Finanzen')}</option><option value="salaires" ${row.requires_pce_option==='salaires'?'selected':''}>${label('Salaires','Löhne')}</option></select></label>
      ${input('days',label('Jours de prestations proposés','Vorgeschlagene Dienstleistungstage'),row.days,'number','min="0" step="0.5"')}
      ${input('investment_fixed_pv',label('Licence initiale CHF HT (hors prestations)','Einmalige Lizenz CHF exkl. MWST (ohne Dienstleistungen)'),row.investment_fixed_pv ?? 0,'number','min="0" step="0.01"')}
      <label>${label('Tarification annuelle','Jährliche Preisberechnung')}<select name="annual_mode"><option value="fixed" ${!row.annual_rule?'selected':''}>${label('Montant fixe','Festbetrag')}</option><option value="population" ${row.annual_rule?'selected':''}>${label('Selon les habitants','Nach Einwohnerzahl')}</option></select></label>
      ${input('annual_pv',label('Montant annuel fixe CHF HT','Jährlicher Festbetrag CHF exkl. MWST'),row.annual_pv,'number','min="0" step="0.01"')}
      ${input('per_capita',label('CHF par habitant et par an','CHF pro Einwohner und Jahr'),row.annual_rule?.per_capita,'number','min="0" step="0.001"')}
      ${input('round_to',label('Arrondi annuel CHF','Jährliche Rundung CHF'),row.annual_rule?.round_to ?? 1,'number','min="0.01" step="0.01"')}`}
      <label class="chiffrage-choice"><input name="enabled" type="checkbox" ${row.enabled!==false?'checked':''}>${label('Disponible au catalogue','Im Katalog verfügbar')}</label>
    </div><p class="chiffrage-helper">${included?label('Cette fonction suit son module parent. Aucun tarif ni jour supplémentaire.','Diese Funktion folgt ihrem übergeordneten Modul. Kein zusätzlicher Preis und keine zusätzlichen Tage.'):label('Les jours et prix sont proposés lors de la sélection. Vide signifie « à préciser » ; 0 reste un montant valide.','Tage und Preise werden bei der Auswahl vorgeschlagen. Leer bedeutet « noch offen »; 0 ist ein gültiger Betrag.')}</p>
    <button type="submit" class="chiffrage-button primary">${label('Enregistrer au catalogue','Im Katalog speichern')}</button>
    <button type="button" class="chiffrage-button" data-action="catalogCancel">${label('Annuler','Abbrechen')}</button>
  </form>` : '';
  return `<section class="chiffrage-section chiffrage-catalog-manager"><h2>${label('Catalogue des modules','Modulkatalog')}</h2>
    <p>${label('Les fonctions incluses suivent leur module parent. Les options Prime restent sélectionnables et facturées séparément. Chaque enregistrement crée une nouvelle version pour les futurs chiffrages.','Enthaltene Funktionen folgen ihrem übergeordneten Modul. Prime-Optionen bleiben separat wählbar und verrechenbar. Jede Speicherung erstellt eine neue Version für zukünftige Kalkulationen.')}</p>
    <div class="chiffrage-actions"><button class="chiffrage-button" data-action="catalogNew" data-kind="included">${label('Ajouter une fonction incluse','Enthaltene Funktion hinzufügen')}</button><button class="chiffrage-button" data-action="catalogNew" data-kind="option">${label('Ajouter une option indépendante','Eigenständige Option hinzufügen')}</button><button class="chiffrage-button" data-action="catalogBack">${label('Revenir au chiffrage','Zurück zur Kalkulation')}</button></div>
    ${form}<h3>${label('Fonctions incluses','Enthaltene Funktionen')}</h3>${rows('included',contents) || '<p>—</p>'}
    <h3>${label('Options Prime','Prime-Optionen')}</h3>${rows('option',options)}
  </section>`;
}
export function readCatalogRecord(form, previous = {}) {
  const value = name=>String(form.elements.namedItem(name)?.value ?? '').trim();
  const numeric = name=>value(name)===''?null:Number(value(name));
  const base={...previous,label_fr:value('label_fr'),label_de:value('label_de') || value('label_fr'),enabled:form.elements.namedItem('enabled').checked};
  if(form.dataset.kind==='included')return {...base,id:previous.id || 'included-'+crypto.randomUUID(),
    parent:value('parent'),theme_fr:value('theme_fr'),theme_de:value('theme_de'),order:numeric('order') ?? 0};
  return {...base,item_code:previous.item_code || 'prime-custom-'+crypto.randomUUID(),
    requires_product:value('requires_product') || null,requires_pce_option:value('requires_pce_option') || null,
    days:numeric('days'),investment_fixed_pv:numeric('investment_fixed_pv') ?? 0,
    annual_pv:value('annual_mode')==='fixed'?numeric('annual_pv'):0,
    annual_rule:value('annual_mode')==='population'?{per_capita:numeric('per_capita'),round_to:numeric('round_to')}:null,
    source:previous.source || 'Catalogue Prime',method:previous.method || 'catalog_editor',sample_size:previous.sample_size ?? 0};
}

// Only the frozen, customer-safe publication enters this renderer.
import { PDFDocument,StandardFonts,rgb } from 'pdf-lib';
import { pdfLogo } from './pdf-logo.mjs';
const clean=value=>String(value??'').replace(/[\u2018\u2019]/g,"'").replace(/[\u2010-\u2015]/g,'-').replace(/[\u00a0\u202f]/g,' ').replace(/[^\x20-\x7e\xa0-\xffŒœŸ€•]/g,' ').trim();
const fmt=value=>new Intl.NumberFormat('de-CH',{maximumFractionDigits:0}).format(value??0).replace(/’/g,"'");
export const pdfFilename=o=>`Prime_${clean(o.commune).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]/g,'_')}_${o.canton}_${o.public_version||'v1.0'}_R${o.revision}.pdf`;
export async function exportClientPdf(o) {
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold),logo=await doc.embedPng(pdfLogo);
  const navy=rgb(.07,.12,.21),ink=rgb(.1,.16,.24),muted=rgb(.36,.41,.47),orange=rgb(.94,.35,.12),line=rgb(.84,.87,.9),pale=rgb(.95,.97,.99);
  const W=595.28,H=841.89,M=44,CW=W-2*M;
  let page,y;
  const t=(value,x,top,size=10,b=false,color=ink)=>page.drawText(clean(value),{x,y:H-top-size,font:b?bold:font,size,color});
  const rule=()=>{page.drawLine({start:{x:M,y:H-y},end:{x:W-M,y:H-y},color:line,thickness:.6});y+=12;};
  const newPage=()=>{page=doc.addPage([W,H]);page.drawRectangle({x:0,y:H-78,width:W,height:78,color:navy});const w=104,h=logo.height/logo.width*w;page.drawImage(logo,{x:M,y:H-38-h/2,width:w,height:h});t(`${o.commune} ${o.canton}`,W-280,22,11,true,rgb(1,1,1));t(`${o.public_version||'v1.0'} - Révision ${o.revision}`,W-280,42,9,false,rgb(.79,.85,.93));y=101;};
  const need=height=>{if(y+height>H-58)newPage();};
  const wrap=(value,width,size=10,b=false)=>{const words=clean(value).split(/\s+/),lines=[];let current='';for(const word of words){let candidate=current?current+' '+word:word;if((b?bold:font).widthOfTextAtSize(candidate,size)<=width){current=candidate;continue;}if(current)lines.push(current);current='';for(const char of word){if((b?bold:font).widthOfTextAtSize(current+char,size)>width){lines.push(current);current='';}current+=char;}}if(current)lines.push(current);return lines;};
  const paragraph=(value,{indent=0,size=10,b=false,color=ink,gap=5}={})=>{for(const text of wrap(value,CW-indent,size,b)){need(size*1.45);t(text,M+indent,y,size,b,color);y+=size*1.45;}y+=gap;};
  const heading=(value,level=1)=>{need(52);y+=level===1?13:7;paragraph(value,{size:level===1?15:12,b:true,gap:8,color:level===1?navy:ink});};
  const tableHeader=()=>{t('Poste',M+6,y,9,true,muted);t('Initial',M+309,y,9,true,muted);t('Annuel',M+414,y,9,true,muted);y+=19;};
  const moneyRow=(title,investment,annual,{total=false}={})=>{const lines=wrap(title,270,10,total),height=Math.max(28,lines.length*14+12);if(y+height>H-58){newPage();tableHeader();}if(total)page.drawRectangle({x:M,y:H-y-height,width:CW,height,color:pale});lines.forEach((v,i)=>t(v,M+6,y+6+i*14,10,total));t(fmt(investment),M+309,y+6,10,total);t(fmt(annual),M+414,y+6,10,total);y+=height;};
  newPage();paragraph('Votre projet, en chiffres.',{size:23,b:true,gap:8});paragraph(`OFS ${o.bfs_id} - ${fmt(o.population)} habitants`,{color:muted,gap:18});
  const figures=[['Investissement',o.amounts.investment,22],['Annuel dès N+1',o.amounts.annual,22],['Total sur 5 ans',o.amounts.tco5y,16]];
  figures.forEach(([name,value,size],i)=>{const x=M+i*(CW/3+3);t(name,x,y,9,false,muted);t(fmt(value),x,y+19,size,true,navy);t('CHF HT',x,y+46,9,false,muted);});y+=78;
  paragraph('Investissement initial + quatre annuités. Montants en CHF HT.',{size:9,color:muted});rule();
  heading('Solutions et modules retenus');
  for(const group of o.scope??[]){heading(group.product,2);let section='';for(const entry of group.items??[]){if(entry.section_fr&&section!==entry.section_fr){section=entry.section_fr;paragraph(section,{b:true,size:10,color:muted});}paragraph(entry.fr+(entry.included?.length?' - modules inclus':''),{b:true});for(const child of entry.included??[])paragraph('- '+child.fr,{indent:14,size:10,gap:2});}}
  if(o.lcm)paragraph(`Accompagnement LCM : ${o.lcm}`,{b:true});if(o.hosting)paragraph(`Hébergement${o.hosting_provider==='az'?' : AZ Informatique':''}`,{b:true});
  need(140);heading('Ce que comprend votre offre');
  const names={implementation:'Mise en oeuvre',migration:'Reprise de données',management:'Gestion de projet',training:'Formation et aide au démarrage',otherServices:'Prestations complémentaires',licenses:'Logiciels et maintenance',database:'Bases de données et technique',primePartners:'Prime et partenaires',lcm:'LCM',hosting:'Hébergement'};
  tableHeader();
  for(const row of o.cost_details??o.breakdown??[]){moneyRow(row.label_fr||names[row.key]||row.key,row.investment,row.annual);}
  moneyRow('Total',o.amounts.investment,o.amounts.annual,{total:true});y+=12;
  if(o.optional_options?.length){heading('Pour aller plus loin - options non comprises');paragraph('Les suppléments suivants sont hors des totaux ci-dessus. Chaque option est chiffrée séparément.',{color:muted});for(const option of o.optional_options){need(85);paragraph(option.label_fr,{b:true,size:12,color:orange});paragraph(option.benefit_fr);paragraph(`Supplément initial : ${fmt(option.investment)} CHF HT - annuel dès N+1 : ${fmt(option.annual)} CHF HT`,{b:true,size:10});if(option.description_fr)paragraph(option.description_fr,{size:9,color:muted});y+=8;}}
  for(const [i,p] of doc.getPages().entries()){p.drawLine({start:{x:M,y:41},end:{x:W-M,y:41},color:line,thickness:.5});p.drawText('Prime Technologies SA - Proposition financière',{x:M,y:26,size:8,font,color:muted});p.drawText(`${i+1} / ${doc.getPageCount()}`,{x:W-M-30,y:26,size:8,font,color:muted});}
  doc.setTitle(`Proposition ${o.commune} ${o.canton} - ${o.public_version||'v1.0'} R${o.revision}`);doc.setAuthor('Prime Technologies SA');
  return doc.save();
}

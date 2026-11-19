// Render the customer-only HTML with the browser's own layout, not a second template.
import {PDFDocument,StandardFonts,PDFString,rgb} from '../../public/vendor/pdf-lib-1.17.1.esm.min.js';
export const pdfWidth=960;
export const pageHeight=pdfWidth*297/210;
export const pageMargin=pdfWidth*12/210;
export const pageContentHeight=pageHeight-2*pageMargin;
const styleProperties=`display position box-sizing width height min-width min-height max-width max-height top right bottom left inset float clear overflow overflow-x overflow-y visibility opacity z-index isolation padding-top padding-right padding-bottom padding-left margin-top margin-right margin-bottom margin-left color background-color background-image background-position background-size background-repeat background-clip border-top-width border-right-width border-bottom-width border-left-width border-top-style border-right-style border-bottom-style border-left-style border-top-color border-right-color border-bottom-color border-left-color border-top-left-radius border-top-right-radius border-bottom-right-radius border-bottom-left-radius box-shadow font-family font-size font-weight font-style line-height letter-spacing text-align text-decoration text-transform text-indent white-space word-break overflow-wrap vertical-align list-style-type list-style-position grid-template-columns grid-template-rows grid-column grid-row grid-auto-flow gap row-gap column-gap justify-content justify-items justify-self align-content align-items align-self flex-direction flex-wrap flex-grow flex-shrink flex-basis order transform transform-origin object-fit object-position fill stroke stroke-width paint-order clip-path -webkit-text-fill-color`.split(' ');
const toDataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
const safeText=value=>String(value).replace(/[\u2018\u2019]/g,"'").replace(/[\u2010-\u2015\u2212]/g,'-').replace(/[\u00a0\u202f]/g,' ').replace(/[^\x20-\x7e\xa0-\xffŒœŸ€•]/g,' ');
export function pageSlices(height,intervals,limit=pageContentHeight){
  const pages=[];let start=0;
  while(start<height){
    let end=Math.min(height,start+limit);
    for(let pass=0;pass<20;pass++){
      const crossing=intervals.filter(row=>row.top>start+4&&row.top<end&&row.bottom>end&&row.bottom-row.top<limit).sort((a,b)=>a.top-b.top)[0];
      if(!crossing)break;end=crossing.top;
    }
    if(end<=start+4)end=Math.min(height,start+limit);
    pages.push({start,end});start=end;
  }
  return pages;
}
function visibleTextLines(root){
  const doc=root.ownerDocument,walker=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT),lines=[];
  while(walker.nextNode()){
    const node=walker.currentNode,parent=node.parentElement;
    if(!node.textContent.trim()||parent.closest('svg')||!parent.getClientRects().length)continue;
    const style=doc.defaultView.getComputedStyle(parent);
    if(style.visibility==='hidden'||style.display==='none')continue;
    let line=null;
    for(let i=0;i<node.textContent.length;i++){
      const range=doc.createRange();range.setStart(node,i);range.setEnd(node,i+1);
      const rect=range.getBoundingClientRect();if(!rect.width&&!rect.height)continue;
      if(!line||Math.abs(line.top-rect.top)>1){line={text:'',x:rect.left,top:rect.top,bottom:rect.bottom,size:parseFloat(style.fontSize),bold:Number(style.fontWeight)>=600};lines.push(line);}
      line.text+=node.textContent[i];line.bottom=Math.max(line.bottom,rect.bottom);
    }
  }
  return lines;
}
async function frozenHtml(root){
  const doc=root.ownerDocument,view=doc.defaultView,copy=root.cloneNode(true),cache=new Map();
  const asset=async url=>{
    const absolute=new URL(url,doc.baseURI).href;
    if(!cache.has(absolute))cache.set(absolute,(async()=>{const response=await fetch(absolute,{credentials:'omit'});if(!response.ok)throw Error('PDF image unavailable');return toDataUrl(await response.blob());})());
    return cache.get(absolute);
  };
  const copyStyle=async(style,target)=>{
    for(const property of styleProperties){let value=style.getPropertyValue(property);if(!value)continue;
      if(property==='background-image'&&value.includes('url(')){
        const urls=[...value.matchAll(/url\(["']?(.*?)["']?\)/g)];
        for(const match of urls)value=value.replace(match[0],`url("${await asset(match[1])}")`);
      }
      target.style.setProperty(property,value);
    }
  };
  const sources=[root,...root.querySelectorAll('*')],targets=[copy,...copy.querySelectorAll('*')];
  for(let i=0;i<sources.length;i++){
    const source=sources[i],target=targets[i];await copyStyle(view.getComputedStyle(source),target);
    if(source.tagName==='IMG')target.setAttribute('src',await asset(source.currentSrc||source.src));
    // Native markers and brand artwork are CSS pseudo-elements in the web page.
    for(const pseudo of ['::before','::after']){
      const style=view.getComputedStyle(source,pseudo);
      if(style.content==='none'||style.content==='normal'||style.display==='none')continue;
      const child=doc.createElement('span');await copyStyle(style,child);
      if(style.content&&!['""',"''"].includes(style.content))child.textContent=style.content.replace(/^["']|["']$/g,'');
      if(pseudo==='::before')target.prepend(child);else target.append(child);
    }
  }
  copy.style.margin='0';copy.style.position='relative';copy.style.left='0';copy.style.top='0';
  return new XMLSerializer().serializeToString(copy);
}
async function rasterPage(html,{start,end},background){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${pdfWidth}" height="${pageHeight}" viewBox="0 0 ${pdfWidth} ${pageHeight}"><foreignObject x="0" y="0" width="${pdfWidth}" height="${pageHeight}"><style xmlns="http://www.w3.org/1999/xhtml">details::details-content{display:contents}summary::-webkit-details-marker{display:none}summary::marker{content:""}</style><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${pdfWidth}px;height:${pageHeight}px;background:${background}"><div style="position:absolute;top:${pageMargin}px;left:0;width:${pdfWidth}px;height:${end-start}px;overflow:hidden"><div style="transform:translateY(-${start}px)">${html}</div></div></div></foreignObject></svg>`;
  const image=new Image();image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=pdfWidth*2;canvas.height=Math.ceil(pageHeight*2);
  const context=canvas.getContext('2d');context.scale(2,2);context.drawImage(image,0,0);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PDF page unavailable');
  const bytes=new Uint8Array(await blob.arrayBuffer());canvas.width=canvas.height=0;return bytes;
}
export async function downloadOfferPdf(article,offer,{theme='dark',label=fr=>fr,onProgress=()=>{}}={}){
  const frame=document.createElement('iframe');frame.className='client-pdf-render-frame';frame.title=label('Préparation du PDF','PDF-Vorbereitung');frame.setAttribute('aria-hidden','true');
  frame.src=new URL('../../offre-pdf.html?v=20261119-two-columns-r1',import.meta.url).href;
  const loaded=new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=reject;});document.body.append(frame);
  try{
    await loaded;const doc=frame.contentDocument;doc.documentElement.dataset.pdfTheme=theme;doc.documentElement.lang=document.documentElement.lang;
    const clone=article.cloneNode(true);clone.querySelectorAll('button,[role=status],.client-offer-footer').forEach(node=>node.remove());clone.querySelectorAll('details').forEach(node=>node.open=true);
    if(theme==='light')clone.querySelectorAll('img[src*="prime-logo-negative.svg"]').forEach(node=>{node.src=new URL('../../public/prime-logo.png',import.meta.url).href;node.classList.remove('logo-on-dark');});
    doc.querySelector('#pdfRoot').append(clone);
    await Promise.all([...clone.querySelectorAll('img')].map(img=>img.decode().catch(()=>{img.remove();})));
    await doc.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const height=Math.ceil(clone.getBoundingClientRect().height),lines=visibleTextLines(clone);
    const intervals=[...lines.map(({top,bottom})=>({top,bottom})),...[...clone.querySelectorAll('.prime-offer-options,.prime-offer-option,.prime-offer-table-row,.prime-offer-contact-card,.prime-offer-contacts,.prime-offer-investment-adjustment,.prime-offer-price-section,.prime-offer-module-group,.prime-offer-service,.prime-offer-recurring-budget,li')].map(node=>{const r=node.getBoundingClientRect();return{top:r.top,bottom:r.bottom};})];
    for(const heading of clone.querySelectorAll('h3,h4')){
      const r=heading.getBoundingClientRect();intervals.push({top:r.top,bottom:r.bottom+40});
      const section=heading.closest('.prime-offer-price-section');
      if(section){const first=section.querySelector('.prime-offer-table-row');if(first)intervals.push({top:section.getBoundingClientRect().top,bottom:first.getBoundingClientRect().bottom});}
      const group=heading.closest('.prime-offer-module-group');
      if(group){const first=group.querySelector('li');if(first)intervals.push({top:group.getBoundingClientRect().top,bottom:Math.min(first.getBoundingClientRect().top+44,group.getBoundingClientRect().bottom)});}
      if(heading.closest('.prime-offer-scope-header')){const first=clone.querySelector('.prime-offer-module-group li');if(first)intervals.push({top:r.top,bottom:first.getBoundingClientRect().top+44});}
    }
    // Keep the options title, column units and the first proposal together.
    for(const options of clone.querySelectorAll('.prime-offer-options')){
      const first=options.querySelector('.prime-offer-option');
      if(first){const heading=first.querySelector('.prime-offer-option-heading'),paragraph=first.querySelector('.prime-offer-option-detail p');intervals.push({top:options.getBoundingClientRect().top,bottom:(paragraph??heading??first).getBoundingClientRect().bottom});}
    }
    for(const option of clone.querySelectorAll('.prime-offer-option')){
      const heading=option.querySelector('.prime-offer-option-heading'),paragraph=option.querySelector('.prime-offer-option-detail p');
      if(heading&&paragraph)intervals.push({top:option.getBoundingClientRect().top,bottom:paragraph.getBoundingClientRect().bottom});
    }
    const links=[...clone.querySelectorAll('a[href^="mailto:"],a[href^="tel:"]')].flatMap(node=>[...node.getClientRects()].map(rect=>({url:node.href,x:rect.left,top:rect.top,bottom:rect.bottom,width:rect.width})));
    const pages=pageSlices(height,intervals),html=await frozenHtml(clone),pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
    const W=595.28,H=841.89,scale=W/pdfWidth,background=theme==='light'?'#ffffff':doc.defaultView.getComputedStyle(clone).getPropertyValue('--offer-gradient')||'#14233b';
    for(let i=0;i<pages.length;i++){
      onProgress(i+1,pages.length);const section=pages[i],page=pdf.addPage([W,H]);
      page.drawImage(await pdf.embedPng(await rasterPage(html,section,background)),{x:0,y:0,width:W,height:H});
      // Invisible selectable text follows the exact browser line positions.
      for(const line of lines.filter(line=>line.top>=section.start-.5&&line.bottom<=section.end+.5)){
        const text=safeText(line.text);if(text.trim())page.drawText(text,{x:line.x*scale,y:H-(pageMargin+line.top-section.start+line.size)*scale,size:line.size*scale,font:line.bold?bold:font,opacity:0});
      }
      for(const link of links.filter(link=>link.top>=section.start&&link.bottom<=section.end)){
        const annotation=pdf.context.obj({Type:'Annot',Subtype:'Link',Rect:[link.x*scale,H-(pageMargin+link.bottom-section.start)*scale,(link.x+link.width)*scale,H-(pageMargin+link.top-section.start)*scale],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(link.url)}});
        page.node.addAnnot(pdf.context.register(annotation));
      }
      page.drawText(label('© Prime Technologies SA · Proposition confidentielle','© Prime Technologies SA · Vertrauliches Angebot'),{x:pageMargin*scale,y:pageMargin*scale/2-4,size:8,font,color:theme==='light'?rgb(.28,.34,.42):rgb(.76,.82,.9)});
      const pageLabel=`${i+1} / ${pages.length}`;
      page.drawText(pageLabel,{x:W-pageMargin*scale-font.widthOfTextAtSize(pageLabel,8),y:pageMargin*scale/2-4,size:8,font,color:theme==='light'?rgb(.28,.34,.42):rgb(.76,.82,.9)});
    }
    pdf.setTitle(`${offer.commune} ${offer.canton} · ${offer.public_version??'v1.0'} R${offer.revision}`);pdf.setAuthor('Prime Technologies SA');
    const bytes=await pdf.save(),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),link=document.createElement('a');
    const name=String(offer.commune).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]/g,'_');
    link.href=url;link.download=`Prime_${name}_${offer.canton}_${offer.public_version??'v1.0'}_R${offer.revision}_${theme==='light'?'impression':'consultation'}.pdf`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }finally{frame.remove();}
}

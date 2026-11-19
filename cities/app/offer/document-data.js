// Document identity is independent of download time and private dossier notes.
export function validOfferDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(`${value}T12:00:00Z`);
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function swissDate(value=Date.now()){
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(part=>[part.type,part.value]));
 return `${parts.year}-${parts.month}-${parts.day}`;
}
export function documentDate(offer){return validOfferDate(offer?.offer_date)?offer.offer_date:offer?.issued_at?swissDate(offer.issued_at):'';}
export function formattedOfferDate(date){return validOfferDate(date)?date.split('-').reverse().join('.'):'';}
export function offerFooter(offer,label=fr=>fr){
 const commune=[offer.commune,offer.canton].filter(Boolean).join(' '),date=formattedOfferDate(documentDate(offer));
 return {identity:[commune,date||label('Date à préciser','Datum ergänzen'),offer.public_version||'v1.0',`${label('Révision','Version')} ${offer.revision}`].join(' · '),legal:label('© Prime Technologies SA · Proposition confidentielle','© Prime Technologies SA · Vertrauliches Angebot')};
}

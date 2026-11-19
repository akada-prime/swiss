import {validOfferDate} from '../offer/document-data.js';
const limits={name:160,position:160,email:254,phone:60};
export function safeContact(value={}){
  return Object.fromEntries(Object.entries(limits).map(([key,max])=>[key,String(value?.[key]??'').trim().slice(0,max)]));
}
export function validateContact(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid contact');
  for(const [key,max] of Object.entries(limits))if(value[key]!=null&&(typeof value[key]!=='string'||value[key].length>max||/[\x00-\x1f\x7f]/.test(value[key])))throw Error('Invalid contact');
  const contact=safeContact(value);
  if(contact.email&&!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(contact.email))throw Error('Invalid contact email');
  return contact;
}
export function validateDossier(input){
  if(input.offer_date!==undefined&&!validOfferDate(input.offer_date))throw Error('Invalid offer date');
  if(input.internal_notes!==undefined&&(typeof input.internal_notes!=='string'||input.internal_notes.length>20000||input.internal_notes.includes('\0')))throw Error('Invalid internal notes');
  if(input.client_contact!==undefined)input.client_contact=validateContact(input.client_contact);
  if(input.prime_contact_id!=null&&!/^[a-z][a-z0-9-]{0,39}$/.test(input.prime_contact_id))throw Error('Invalid Prime contact');
  return input;
}

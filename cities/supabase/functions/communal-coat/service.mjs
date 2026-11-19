import { Buffer } from 'node:buffer';
import { verifiedCoat } from '../../../app/chiffrage/coat-identity.js';

const maxBytes=512*1024;
export function verifiedImage(bytes,mime) {
  if(!bytes.length || bytes.length>maxBytes)throw Error('Invalid image size');
  if(mime==='image/svg+xml'){
    const svg=new TextDecoder().decode(bytes);
    if(!/<svg(?:\s|>)/i.test(svg) || !/<\/svg>/i.test(svg) ||
      /<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|iframe|object|embed|image)\b|\bon[a-z]+\s*=|@import/i.test(svg))throw Error('Unsafe SVG');
    for(const m of svg.matchAll(/\b(?:xlink:)?href\s*=\s*(['"])(.*?)\1/gi))if(!m[2].startsWith('#'))throw Error('External SVG link');
    for(const m of svg.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi))if(!m[2].startsWith('#'))throw Error('External SVG resource');
  }else if(mime==='image/png'){
    if(!Buffer.from(bytes.slice(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid PNG');
  }else if(mime==='image/jpeg'){
    if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('Invalid JPEG');
  }else if(mime==='image/webp'){
    if(Buffer.from(bytes.slice(0,4)).toString()!=='RIFF'||Buffer.from(bytes.slice(8,12)).toString()!=='WEBP')throw Error('Invalid WebP');
  }else throw Error('Unsupported image');
  return Buffer.from(bytes).toString('base64');
}

export async function lookupCoat(bfsId,fetcher=fetch){
  const get=async url=>{
    const response=await fetcher(url,{signal:AbortSignal.timeout(15000),redirect:'error',headers:{'User-Agent':'PrimeCommunes/1.0 (https://akada-prime.github.io/swiss/cities/)'}});
    if(!response.ok)throw Error('Source unavailable');return response;
  };
  const api=async(base,params)=>(await get(`${base}?${new URLSearchParams({...params,format:'json'})}`)).json();
  const wiki='https://www.wikidata.org/w/api.php';
  const search=await api(wiki,{action:'query',list:'search',srsearch:`haswbstatement:P771=${bfsId}`,srnamespace:'0',srlimit:'5'});
  const ids=(search.query?.search??[]).map(row=>row.title).filter(id=>/^Q\d+$/.test(id));
  if(!ids.length)return null;
  const data=await api(wiki,{action:'wbgetentities',ids:ids.join('|'),props:'claims'});
  const coat=verifiedCoat(data.entities,bfsId);if(!coat)return null;
  const title=`File:${coat.filename}`;
  const commons=await api('https://commons.wikimedia.org/w/api.php',{action:'query',titles:title,prop:'imageinfo',iiprop:'url'});
  const pages=Object.values(commons.query?.pages??{});
  const info=pages.length===1?pages[0].imageinfo?.[0]:null;
  if(!info?.url)return null;
  const url=new URL(info.url);
  if(url.protocol!=='https:'||url.hostname!=='upload.wikimedia.org'||!url.pathname.startsWith('/wikipedia/commons/'))throw Error('Untrusted image URL');
  const response=await get(url.href);
  if(Number(response.headers.get('content-length'))>maxBytes)throw Error('Image too large');
  const mime_type=response.headers.get('content-type')?.split(';')[0];
  const image_base64=verifiedImage(new Uint8Array(await response.arrayBuffer()),mime_type);
  return {filename:coat.filename,source:coat.source,file_page:`https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,mime_type,image_base64};
}

export function createCoatHandler({read,write,known,lookup=lookupCoat,now=Date.now}){
  const pending=new Map();
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'X-Coat-Cache,Link','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox"};
  const failure=status=>new Response(null,{status,headers:{...headers,'Cache-Control':'public, max-age=60'}});
  const resolve=async id=>{
    const cached=await read(id);
    if(cached?.status==='ready'||cached?.retry_after&&Date.parse(cached.retry_after)>now())return {row:cached,hit:true};
    if(!await known(id))return null;
    let row;
    try{
      const image=await lookup(id);
      row=image?{...image,status:'ready',retry_after:null}:{status:'missing',retry_after:new Date(now()+86400000).toISOString()};
    }catch(error){console.warn('Coat source unavailable',id,String(error));row={status:'unavailable',retry_after:new Date(now()+600000).toISOString()};}
    row={bfs_id:id,checked_at:new Date(now()).toISOString(),...row};
    await write(row);return {row,hit:false};
  };
  return async request=>{
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS'}});
    if(request.method!=='GET')return new Response(null,{status:405,headers});
    const url=new URL(request.url),raw=url.searchParams.get('bfs');
    if(!/^[1-9]\d{0,4}$/.test(raw??''))return failure(400);
    const id=Number(raw);
    try{
      if(!pending.has(id))pending.set(id,resolve(id).finally(()=>pending.delete(id)));
      const result=await pending.get(id);
      if(!result)return failure(404);
      const {row,hit}=result;
      if(row.status!=='ready')return failure(row.status==='missing'?404:503);
      if(url.searchParams.get('source')==='1')return new Response(null,{status:302,headers:{...headers,Location:row.source,'Cache-Control':'public, max-age=86400'}});
      return new Response(Buffer.from(row.image_base64,'base64'),{headers:{...headers,'Content-Type':row.mime_type,'Cache-Control':'public, max-age=31536000, immutable','X-Coat-Cache':hit?'hit':'miss',Link:`<${row.source}>; rel="describedby"`}});
    }catch(error){const response=failure(503);response.headers.set('X-Coat-Failure',/^db-\d{3}-[A-Z0-9]+$/i.test(error.message)?error.message:'cache-unavailable');return response;}
  };
}

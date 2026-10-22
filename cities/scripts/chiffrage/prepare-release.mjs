#!/usr/bin/env node
// Prepare reviewable private SQL; never connect or modify the database.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
const [catalogPath,parametersPath,activePath,outputPrefix]=process.argv.slice(2);
if(!outputPrefix)throw new Error('Usage: prepare-release.mjs <private-catalog.json> <private-parameters.json> <active-version-rows.json> <private-output-prefix>');
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
for(const path of [catalogPath,parametersPath,activePath,outputPrefix])if(resolve(path)===root||resolve(path).startsWith(root+sep))throw new Error('Private files must be outside the checkout');
if(existsSync(outputPrefix+'-manifest.json'))throw new Error('Release prefix already exists; inspect the prepared release before replacing it');
const catalog=JSON.parse(readFileSync(catalogPath)),parameters=JSON.parse(readFileSync(parametersPath)),activeRows=JSON.parse(readFileSync(activePath));
const base=Object.fromEntries(activeRows.map(row=>[row.vendor,row.id]));
if(!base.innosolv||!base.commercial||!base.abacus||!parameters.configuration_profiles?.length)throw new Error('Incomplete private release');
const versions={innosolv:randomUUID(),commercial:randomUUID(),abacus:base.abacus};
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const json=value=>`convert_from(decode('${Buffer.from(JSON.stringify(value)).toString('base64')}','base64'),'UTF8')::jsonb`;
const items=catalog.items.filter(row=>row.vendor==='innosolv');
if(!items.length||items.some(row=>row.catalog_version!==catalog.version))throw new Error('Catalog version mismatch');
const inactive=`BEGIN;\nINSERT INTO public.chiffrage_catalog_versions(id,vendor,version,effective_from,active) VALUES\n(${quote(versions.innosolv)},'innosolv',${quote(catalog.version)},${quote(catalog.effective_from)},false),\n(${quote(versions.commercial)},'commercial',${quote(catalog.version)},${quote(catalog.effective_from)},false);\nINSERT INTO public.chiffrage_parameters(catalog_version_id,content) VALUES(${quote(versions.commercial)},${json(parameters)});\nINSERT INTO public.chiffrage_catalog_items(catalog_version_id,product,item_code,content) SELECT ${quote(versions.innosolv)}::uuid,item->>'product',item->>'item_code',item FROM jsonb_array_elements(${json(items)}) AS item;\nCOMMIT;\n`;
const activation=(expected,target)=>`BEGIN;\nDO $$ BEGIN\nPERFORM id FROM public.chiffrage_catalog_versions WHERE vendor IN ('innosolv','commercial') FOR UPDATE;\nIF (SELECT count(*) FROM public.chiffrage_catalog_versions WHERE active AND id IN (${quote(expected.innosolv)},${quote(expected.commercial)}))<>2 THEN RAISE EXCEPTION 'Active versions changed: inspect before activation'; END IF;\nIF (SELECT count(*) FROM public.chiffrage_catalog_versions WHERE id IN (${quote(target.innosolv)},${quote(target.commercial)}))<>2 THEN RAISE EXCEPTION 'Target versions missing'; END IF;\nUPDATE public.chiffrage_catalog_versions SET active=false WHERE vendor IN ('innosolv','commercial') AND active;\nUPDATE public.chiffrage_catalog_versions SET active=true WHERE id IN (${quote(target.innosolv)},${quote(target.commercial)});\nEND $$;\nCOMMIT;\n`;
for(const [suffix,body] of [['inactive.sql',inactive],['activate.sql',activation(base,versions)],['rollback.sql',activation(versions,base)]])writeFileSync(outputPrefix+'-'+suffix,body,{mode:0o600});
const manifest={version:catalog.version,base,versions,private_item_count:items.length,reference_count:parameters.configuration_profiles.length,files:[catalogPath,parametersPath].map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}))};
writeFileSync(outputPrefix+'-manifest.json',JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
process.stdout.write('Prepared inactive import, guarded activation and guarded rollback. No database writes.\n');

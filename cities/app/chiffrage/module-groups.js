// Per-quote editorial groups. They never change vendor, prices or the catalog.
export function validateModuleGroups(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 1000) throw new Error('Invalid module groups');
  const rows = Object.entries(value).map(([key, title]) => {
    if (!/^(prime|partners)\/[\w.-]+\/[\w.-]+$/.test(key) || typeof title !== 'string' || title.length > 100) throw new Error('Invalid module group');
    return [key, title.trim()];
  }).filter(([, title]) => title);
  return Object.fromEntries(rows);
}
export function moduleGroup(input, key, catalog) {
  const common=catalog?.parameters?.prime_layout?.groups?.find(group=>group.modules.includes(key));
  if(catalog?.parameters?.prime_layout)return common?.title??'';
  return String(input?.module_groups?.[key] ?? '').trim().slice(0, 100);
}
export function groupModuleRows(rows, titleFor) {
  const groups = new Map();
  for (const row of rows) {
    const title = titleFor(row);
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push(row);
  }
  return [...groups].map(([title, items]) => ({ title, items }));
}

export function validatePrimeLayout(value) {
  if(!value||!Array.isArray(value.groups)||value.groups.length>40)throw new Error('Invalid Prime groups');
  const ids=new Set(),modules=new Set();
  const groups=value.groups.map(group=>{
    if(typeof group.id!=='string'||!/^[\w-]{1,80}$/.test(group.id)||ids.has(group.id)||group.id==='unclassified'||typeof group.title!=='string'||!group.title.trim()||group.title.length>100||!Array.isArray(group.modules)||group.modules.length>1000)throw new Error('Invalid Prime group');
    ids.add(group.id);
    for(const key of group.modules){if(typeof key!=='string'||!/^prime\/[\w.-]+\/[\w.-]+$/.test(key)||modules.has(key))throw new Error('Invalid Prime placement');modules.add(key);}
    return {id:group.id,title:group.title.trim(),modules:[...group.modules]};
  });
  return {groups};
}
export function primeModuleOrder(catalog,key){
 const groups=catalog?.parameters?.prime_layout?.groups??[];
 for(let i=0;i<groups.length;i++){const n=groups[i].modules.indexOf(key);if(n>=0)return i*1001+n;}
 return Number.MAX_SAFE_INTEGER;
}

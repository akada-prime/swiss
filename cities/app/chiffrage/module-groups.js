// Per-quote editorial groups. They never change vendor, prices or the catalog.
export function validateModuleGroups(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 1000) throw new Error('Invalid module groups');
  const rows = Object.entries(value).map(([key, title]) => {
    if (!/^(prime|partners)\/[\w.-]+\/[\w.-]+$/.test(key) || typeof title !== 'string' || title.length > 100) throw new Error('Invalid module group');
    return [key, title.trim()];
  }).filter(([, title]) => title);
  return Object.fromEntries(rows);
}
export function moduleGroup(input, key) {
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

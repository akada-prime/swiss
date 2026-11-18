// The original evolution counter counts commits touching cities/ on main.
// A release fallback remains visible if GitHub is unavailable or rate limited.
const endpoint = 'https://api.github.com/repos/akada-prime/swiss/commits?sha=main&path=cities&per_page=1';
const cacheKey = 'prime-communes-evolution-v1';
const cacheLifetime = 15 * 60 * 1000;

export function evolutionCount(link, page) {
  const last = String(link ?? '').split(',').find(part => /rel="last"/.test(part));
  if (last) {
    try {
      const url = new URL(last.match(/<([^>]+)>/)?.[1]);
      const count = Number(url.searchParams.get('page'));
      if (url.origin === 'https://api.github.com' && ['/repos/akada-prime/swiss/commits', '/repositories/1345177269/commits'].includes(url.pathname) && url.searchParams.get('path') === 'cities' && url.searchParams.get('sha') === 'main' && url.searchParams.get('per_page') === '1' && Number.isSafeInteger(count) && count > 0) return count;
    } catch { /* Invalid metadata never replaces the release fallback. */ }
    return null;
  }
  return Array.isArray(page) && page.length <= 1 ? page.length : null;
}

export async function refreshEvolution(node, { fetcher = fetch, storage = null, now = Date.now() } = {}) {
  const baseline = Number(node.dataset.evolutionCount);
  const show = count => {
    if (!Number.isSafeInteger(count) || count < baseline) return false;
    node.textContent = `#${count}`;
    return true;
  };
  try {
    const cached = JSON.parse(storage?.getItem(cacheKey) ?? 'null');
    if (cached && now >= cached.checkedAt && now - cached.checkedAt < cacheLifetime && show(cached.count)) return cached.count;
  } catch { /* Storage can be disabled without affecting the page. */ }
  try {
    const response = await fetcher(endpoint, { credentials: 'omit', headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return null;
    const count = evolutionCount(response.headers.get('link'), await response.json());
    if (!show(count)) return null;
    try { storage?.setItem(cacheKey, JSON.stringify({ count, checkedAt: now })); } catch { /* Optional cache. */ }
    return count;
  } catch { return null; }
}

if (typeof document !== 'undefined') {
  const node = document.querySelector('[data-evolution-count]');
  if (node) {
    let storage = null;
    try { storage = localStorage; } catch { /* Optional cache. */ }
    void refreshEvolution(node, { storage });
  }
}

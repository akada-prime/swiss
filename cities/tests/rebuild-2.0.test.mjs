import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('rebuild owns one deterministic module graph and one style entry', async () => {
  const html = await read('index.html');
  const entry = await read('app/main.js');
  const styles = await read('app/styles/main.css');
  assert.equal((html.match(/<script type="module"/g) || []).length, 1);
  assert.equal((html.match(/app\/styles\/main\.css/g) || []).length, 1);
  assert.doesNotMatch(html, /prime-communes-1\.1\.js|const normalizeSearchText|const SUPABASE_URL/);
  for (const module of ['core/runtime', 'data-1.5', 'maplibre-1.2', 'stats-1.5', 'communes-1.2', 'news-2.0', 'stories-2.0', 'roadmap-1.2']) {
    assert.match(entry, new RegExp(module.replace('.', '\\.') + '\\.js'));
  }
  assert.doesNotMatch(await read('app/prime-communes-communes-1.2.js'), /MutationObserver/);
  assert.doesNotMatch(await read('app/prime-communes-1.1-base.js'), /createElement\(['"]link/);
  const runtime = await read('app/core/runtime.js');
  for (const binding of ['renderModules', 'renderErp', 'openDrawer', 'loadData', 'loadMap']) {
    assert.match(runtime, new RegExp(`${binding}: `));
  }
  for (const stylesheet of ['foundation.css', 'components.css', 'views/map.css', 'views/stats.css', 'views/radar.css', 'views/stories.css', 'views/roadmap.css', 'responsive.css']) {
    assert.match(styles, new RegExp(stylesheet.replace('.', '\\.')));
  }
  assert.ok(styles.indexOf('foundation.css') < styles.indexOf('components.css'));
  assert.ok(styles.indexOf('components.css') < styles.indexOf('views/map.css'));
  assert.ok(styles.indexOf('views/roadmap.css') < styles.indexOf('responsive.css'));
});

test('important declarations are reduced to the documented hidden contract', async () => {
  const cssFiles = (await readdir(new URL('app/', root), { recursive: true }))
    .filter(path => path.endsWith('.css'));
  const sources = await Promise.all(cssFiles.map(async path => [path, await read(`app/${path}`)]));
  const declarations = sources.flatMap(([path, css]) =>
    [...css.matchAll(/!important/g)].map(() => path));
  assert.deepEqual(declarations, ['styles/responsive.css']);
  assert.match(await read('app/styles/responsive.css'), /\[hidden\] \{ display: none !important; \}/);
});

test('shared mobile controls keep a readable floor and six reachable tabs', async () => {
  const html = await read('index.html');
  const css = await read('app/styles/responsive.css');
  assert.equal((html.match(/class="view-tab(?: |")/g) || []).length, 6);
  assert.match(css, /--pc-type-min: 12px/);
  assert.match(css, /--pc-control-height: 40px/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.view-tab \{[\s\S]*font-size: 12px/);
  assert.match(css, /\.kpi-badge,[\s\S]*\.commune-rank \{[\s\S]*font-size: var\(--pc-type-min\)/);
  assert.match(css, /\.filters input,[\s\S]*font-size: 16px/);
});

test('deep-link flash guard, footer counter and global back-to-top remain explicit', async () => {
  const html = await read('index.html');
  assert.match(html, /document\.documentElement\.dataset\.initialView = initialView/);
  assert.match(html, /data-initial-view="news"\] #newsView/);
  assert.match(html, /Prime Communes · version 2\.0\.5 · #460/);
  assert.match(html, /id="backToTop"/);
});

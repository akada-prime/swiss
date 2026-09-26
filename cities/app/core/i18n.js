import fr from '../i18n/fr.js';
import de from '../i18n/de.js';
import { getPreference, subscribePreferences } from './preferences.js';

const catalogues = { fr, de };
const markedNodes = [];
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT);
while (walker.nextNode()) {
  const match = /^i18n:([a-z0-9.]+)$/.exec(walker.currentNode.nodeValue);
  if (match && walker.currentNode.nextSibling?.nodeType === Node.TEXT_NODE) {
    markedNodes.push({ key: match[1], node: walker.currentNode.nextSibling });
  }
}

export function locale() { return getPreference('language') === 'de' ? 'de-CH' : 'fr-CH'; }
export function number(value, options) { return new Intl.NumberFormat(locale(), options).format(value); }
export function date(value, options) { return new Intl.DateTimeFormat(locale(), options).format(value); }
export function t(key, variables = {}) {
  const translation = catalogues[getPreference('language')][key] ?? fr[key];
  if (translation == null) throw new TypeError(`Missing translation: ${key}`);
  return translation.replace(/\{(\w+)\}/g, (_, variable) => String(variables[variable] ?? ''));
}

const attributes = [
  ['settingsTrigger', 'aria-label', 'settings.trigger'],
  ['settingsClose', 'aria-label', 'settings.close'],
  ['query', 'placeholder', 'search.communeSoftware'],
  ['mapQuery', 'placeholder', 'search.commune'],
  ['newsQuery', 'placeholder', 'search.radar'],
  ['backToTop', 'aria-label', 'common.backToTop'],
  ['backToTop', 'title', 'common.backToTop'],
  ['syncReload', 'title', 'a11y.refresh'],
  ['territoryFilters', 'aria-label', 'a11y.market'],
  ['mapPanel', 'aria-label', 'a11y.mapPanel'],
  ['swissMap', 'aria-label', 'a11y.mapPanel'],
  ['mapProduct', 'aria-label', 'a11y.mapProduct'],
  ['mapZoomIn', 'aria-label', 'a11y.zoomIn'],
  ['mapZoomOut', 'aria-label', 'a11y.zoomOut'],
  ['mapReset', 'aria-label', 'a11y.mapReset'],
  ['newsView', 'aria-label', 'a11y.radar']
];
const selectors = [
  ['.topbar > a', 'aria-label', 'a11y.home'],
  ['.view-tabs', 'aria-label', 'a11y.navigation'],
  ['.map-perspective', 'aria-label', 'a11y.mapReading'],
  ['.map-mode', 'aria-label', 'a11y.mapColours'],
  ['.map-zoom', 'aria-label', 'a11y.zoom'],
  ['.stats-segment', 'aria-label', 'a11y.measure'],
  ['.stats-segment + .stats-segment', 'aria-label', 'a11y.threshold'],
  ['.news-beta-note', 'aria-label', 'a11y.sobriety'],
  ['.news-panel', 'aria-label', 'a11y.radar'],
  ['.news-kpis-operations', 'aria-label', 'a11y.radarMeasure'],
  ['.news-sobriety', 'aria-label', 'a11y.sobrietyPrinciple'],
  ['.news-forecast', 'aria-label', 'a11y.forecast'],
  ['.news-filters', 'aria-label', 'a11y.signalLevel'],
  ['.story-panel', 'aria-label', 'a11y.stories'],
  ['.roadmap-journey', 'aria-label', 'a11y.roadmap'],
  ['.site-footer', 'aria-label', 'a11y.legal']
];
const syncButton = document.getElementById('syncReload');
const mobileStatus = { loading:'a11y.mobileLoading', success:'a11y.mobileSuccess', fallback:'a11y.mobileFallback', error:'a11y.mobileError' };
function localizeMobileStatus() {
  syncButton?.setAttribute('data-mobile-label', t(mobileStatus[syncButton.dataset.state] || 'a11y.mobileRefresh'));
}
if (syncButton) new MutationObserver(localizeMobileStatus).observe(syncButton, { attributes:true, attributeFilter:['data-state'] });
export function localizeStatic() {
  for (const { key, node } of markedNodes) {
    if (node.isConnected) node.nodeValue = t(key);
  }
  for (const [id, attribute, key] of attributes) {
    document.getElementById(id)?.setAttribute(attribute, t(key));
  }
  for (const [selector, attribute, key] of selectors) {
    document.querySelector(selector)?.setAttribute(attribute, t(key));
  }
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('a11y.description'));
  localizeMobileStatus();
}

subscribePreferences((name) => {
  if (name !== 'language') return;
  localizeStatic();
  document.dispatchEvent(new CustomEvent('prime-language-change'));
});
localizeStatic();

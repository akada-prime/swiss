import { stories as germanStories } from './i18n/editorial-de.js';
import { getPreference } from './core/preferences.js';
import { t } from './core/i18n.js?v=20260926-preferences-2';

(() => {
  'use strict';

  const STORY_URL = 'public/data/stories-v1.json?v=20260921-1';
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  let stories = [];
  function displayedStory(story) {
    const translation = getPreference('language') === 'de' && germanStories[story.id];
    if (!translation) return story;
    return {
      ...story, ...translation,
      primeFact: { ...story.primeFact, ...translation.primeFact, sourceLabel: story.primeFact?.sourceLabel },
      facts: story.facts.map((fact, index) => ({ ...fact, ...translation.facts[index] })),
      angles: story.angles.map((angle, index) => ({ ...angle, ...translation.angles[index] })),
      sources: story.sources // References and source titles remain in their original language.
    };
  }

  function storySource(story, sourceId) {
    return (story.sources || []).find(source => source.id === sourceId) || null;
  }

  function storySourceLink(source, compact = false) {
    if (!source) return '';
    const label = compact ? t('stories.source') : source.label;
    if (!source.url) return `<span>${escapeHtml(label)}</span>`;
    return `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`;
  }

  function storyCard(story) {
    const facts = (story.facts || []).map(fact => `<article class="story-fact">
      <span>${escapeHtml(fact.dateLabel)}</span>
      <h4>${escapeHtml(fact.title)}</h4>
      <p>${escapeHtml(fact.text)}</p>
      ${storySourceLink(storySource(story, fact.sourceId), true)}
    </article>`).join('');
    const angles = story.angles || [];
    const firstAngle = angles[0] || { id: '', label: '', title: '', text: '' };
    const angleButtons = angles.map((angle, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-story-id="${escapeHtml(story.id)}" data-story-angle="${escapeHtml(angle.id)}" aria-pressed="${index === 0}">${escapeHtml(angle.label)}</button>`).join('');
    const deliverables = (story.deliverables || []).map(item => `<span>${escapeHtml(item)}</span>`).join('');
    const sources = (story.sources || []).map(source => `<li><b>${t(source.type === 'Source publique' ? 'stories.publicSource' : 'stories.internalSource')}</b>${storySourceLink(source)}</li>`).join('');
    return `<article class="story-card" id="story-${escapeHtml(story.id)}">
      <header class="story-hero">
        <div>
          <p>${escapeHtml(story.kicker)}</p>
          <h3>${escapeHtml(story.title)}</h3>
          <div class="story-places">
            <button type="button" data-story-bfs="${Number(story.bfsId)}"><img src="public/cantons/${escapeHtml(story.canton.toLowerCase())}.svg" alt=""><span>${escapeHtml(story.municipality)}</span></button>
            <i aria-hidden="true">↔</i>
            <span><img src="public/cantons/${escapeHtml(story.counterpartCanton.toLowerCase())}.svg" alt="">${escapeHtml(story.counterpart)}</span>
          </div>
        </div>
        <p>${escapeHtml(story.standfirst)}</p>
      </header>
      <div class="story-timeline">${facts}</div>
      <div class="story-reading-grid">
        <section class="story-prime-fact"><span>${escapeHtml(story.primeFact.label)}</span><p>${escapeHtml(story.primeFact.text)}</p><small>${escapeHtml(story.primeFact.sourceLabel)} · ${escapeHtml(story.primeFact.confidence)}</small></section>
        <section class="story-axel-reading"><span>${escapeHtml(story.axelReading.label)}</span><p>${escapeHtml(story.axelReading.text)}</p></section>
      </div>
      <section class="story-angles">
        <header><div><span>${t('stories.angles')}</span><strong>${t('stories.multipleUses')}</strong></div><button type="button" class="story-copy" data-story-copy="${escapeHtml(story.id)}">${t('stories.copy')}</button></header>
        <div class="story-angle-tabs" role="group" aria-label="${t('stories.chooseAngle')}">${angleButtons}</div>
        <div class="story-angle-copy" data-story-angle-copy="${escapeHtml(story.id)}" aria-live="polite"><strong>${escapeHtml(firstAngle.title)}</strong><p>${escapeHtml(firstAngle.text)}</p></div>
        <div class="story-deliverables"><b>${t('stories.readyFor')}</b>${deliverables}</div>
      </section>
      <footer class="story-sources"><strong>${t('stories.sources')}</strong><ul>${sources}</ul></footer>
    </article>`;
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  }

  function bindStories() {
    const feed = byId('storiesFeed');
    if (!feed) return;
    feed.querySelectorAll('[data-story-bfs]').forEach(button => button.addEventListener('click', () => {
      const municipality = all.find(item => Number(item.id) === Number(button.dataset.storyBfs));
      if (municipality && typeof openDrawer === 'function') openDrawer(municipality);
    }));
    feed.querySelectorAll('[data-story-angle]').forEach(button => button.addEventListener('click', () => {
      const original = stories.find(item => item.id === button.dataset.storyId);
      const story = original && displayedStory(original);
      const angle = story?.angles?.find(item => item.id === button.dataset.storyAngle);
      if (!story || !angle) return;
      feed.querySelectorAll(`[data-story-id="${story.id}"]`).forEach(item => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      const copy = feed.querySelector(`[data-story-angle-copy="${story.id}"]`);
      if (copy) copy.innerHTML = `<strong>${escapeHtml(angle.title)}</strong><p>${escapeHtml(angle.text)}</p>`;
    }));
    feed.querySelectorAll('[data-story-copy]').forEach(button => button.addEventListener('click', async () => {
      const original = stories.find(item => item.id === button.dataset.storyCopy);
      const story = original && displayedStory(original);
      const selected = feed.querySelector(`[data-story-id="${button.dataset.storyCopy}"].active`);
      const angle = story?.angles?.find(item => item.id === selected?.dataset.storyAngle) || story?.angles?.[0];
      if (!story || !angle) return;
      await copyText(`${story.title}\n\n${angle.title}\n${angle.text}\n\n${story.standfirst}`);
      button.textContent = t('stories.copied');
      window.setTimeout(() => { if (button.isConnected) button.textContent = t('stories.copy'); }, 1800);
    }));
  }

  async function loadStories() {
    const feed = byId('storiesFeed');
    if (!feed) return;
    try {
      const response = await fetch(STORY_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Histoires ${response.status}`);
      const data = await response.json();
      stories = Array.isArray(data.stories) ? data.stories : [];
      feed.innerHTML = stories.length ? stories.map(story => storyCard(displayedStory(story))).join('') : `<div class="news-empty"><strong>${t('stories.emptyTitle')}</strong><span>${t('stories.emptyDetail')}</span></div>`;
      bindStories();
    } catch (error) {
      console.error(error);
      feed.innerHTML = `<div class="news-empty"><strong>${t('stories.loadingError')}</strong><span>${t('stories.retryLater')}</span></div>`;
    }
  }


  window.PrimeCommunesStories = { reload: loadStories };
  document.addEventListener('prime-language-change', () => {
    const selected = [...document.querySelectorAll('.story-angle-tabs button.active')].map(button => ({story:button.dataset.storyId, angle:button.dataset.storyAngle}));
    const feed = byId('storiesFeed');
    if (!feed || !stories.length) return;
    feed.innerHTML = stories.map(story => storyCard(displayedStory(story))).join('');
    bindStories();
    for (const {story,angle} of selected) feed.querySelector(`[data-story-id="${story}"][data-story-angle="${angle}"]`)?.click();
  });
  void loadStories();
})();

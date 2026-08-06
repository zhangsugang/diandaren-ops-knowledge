(() => {
  const kb = window.DIANDAREN_KB;
  if (!kb || !Array.isArray(kb.docs)) return;

  const docs = kb.docs;
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  const categoryMap = new Map(kb.categories.map((category) => [category.name, category]));
  const state = {
    view: 'home',
    category: null,
    evidence: 'all',
    query: '',
    sort: 'relevance',
    selectedId: 'curated-01-新人培训-01-30分钟入门-md',
  };

  const els = {
    sidebar: document.getElementById('sidebar'),
    categoryNav: document.getElementById('categoryNav'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    documentList: document.getElementById('documentList'),
    detailPlaceholder: document.getElementById('detailPlaceholder'),
    detailCard: document.getElementById('detailCard'),
    sectionTitle: document.getElementById('sectionTitle'),
    sectionKicker: document.getElementById('sectionKicker'),
    resultCount: document.getElementById('resultCount'),
    breadcrumbCurrent: document.getElementById('breadcrumbCurrent'),
    filterTabs: document.getElementById('filterTabs'),
    sortSelect: document.getElementById('sortSelect'),
    quickLinks: document.getElementById('quickLinks'),
    toast: document.getElementById('toast'),
    dashboardGrid: document.getElementById('dashboardGrid'),
  };

  const iconFor = (doc) => categoryMap.get(doc.category)?.icon || '•';
  const evidenceLabel = { official: '官网帮助', training: '培训模板', video: '视频证据', inference: '推断/边界' };
  const badgeClass = { official: 'badge-official', training: 'badge-training', video: 'badge-video', inference: 'badge-inference' };

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function linkify(value) {
    return value.replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
  }

  function markdownLite(text = '') {
    const lines = text.split('\n');
    const html = [];
    let listType = null;
    let listItems = [];
    const closeList = () => {
      if (!listType) return;
      html.push(`<${listType}>${listItems.join('')}</${listType}>`);
      listType = null;
      listItems = [];
    };
    const addParagraph = (line) => {
      const safe = linkify(escapeHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'));
      if (/^提示[：:]/.test(line) || /^验收[：:]/.test(line) || /^注意[：:]/.test(line)) {
        html.push(`<div class="content-quote">${safe}</div>`);
      } else if (/^[^。！？]{2,22}[：:]$/.test(line)) {
        html.push(`<div class="content-label">${safe}</div>`);
      } else if (/^\|/.test(line)) {
        html.push(`<div class="content-table-line">${safe}</div>`);
      } else {
        html.push(`<p>${safe}</p>`);
      }
    };
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) { closeList(); html.push('<div class="content-spacer"></div>'); continue; }
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) { closeList(); html.push(`<h3>${linkify(escapeHtml(heading[2]))}</h3>`); continue; }
      const bullet = line.match(/^[-*]\s+(.+)$/);
      const ordered = line.match(/^\d+[.)]\s+(.+)$/);
      if (bullet || ordered) {
        const nextType = ordered ? 'ol' : 'ul';
        if (listType && listType !== nextType) closeList();
        listType = nextType;
        listItems.push(`<li>${linkify(escapeHtml((bullet || ordered)[1]))}</li>`);
        continue;
      }
      closeList();
      addParagraph(line);
    }
    closeList();
    return html.join('');
  }

  function searchScore(doc, query) {
    if (!query) return 0;
    const normalized = query.toLowerCase();
    const title = doc.title.toLowerCase();
    const summary = doc.summary.toLowerCase();
    const keywords = doc.keywords.join(' ').toLowerCase();
    const content = doc.content.toLowerCase();
    let score = 0;
    if (title === normalized) score += 1000;
    if (title.includes(normalized)) score += 260;
    if (keywords.includes(normalized)) score += 120;
    if (summary.includes(normalized)) score += 80;
    if (content.includes(normalized)) score += 15;
    for (const token of normalized.split(/\s+/).filter(Boolean)) {
      if (title.includes(token)) score += 40;
      else if (keywords.includes(token)) score += 20;
      else if (content.includes(token)) score += 3;
    }
    return score;
  }

  function filteredDocs() {
    let result = docs.filter((doc) => {
      if (state.category && doc.category !== state.category) return false;
      if (state.evidence !== 'all' && doc.evidence !== state.evidence) return false;
      if (state.view === 'training' && !['training', 'video', 'inference'].includes(doc.evidence) && doc.category !== '新人培训') return false;
      return true;
    });
    if (state.query) result = result.filter((doc) => searchScore(doc, state.query) > 0);
    result = result.map((doc) => ({ doc, score: searchScore(doc, state.query) }));
    result.sort((a, b) => {
      if (state.sort === 'title') return a.doc.title.localeCompare(b.doc.title, 'zh-CN');
      if (state.sort === 'category') return a.doc.category.localeCompare(b.doc.category, 'zh-CN') || a.doc.title.localeCompare(b.doc.title, 'zh-CN');
      if (state.sort === 'updated') return String(b.doc.updated).localeCompare(String(a.doc.updated));
      return b.score - a.score || (a.doc.evidence === 'training' ? -1 : 1) || a.doc.title.localeCompare(b.doc.title, 'zh-CN');
    });
    return result.map((item) => item.doc);
  }

  function renderSidebar() {
    els.categoryNav.innerHTML = kb.categories.map((category) => `
      <button class="category-item ${state.category === category.name ? 'is-active' : ''}" data-category="${escapeHtml(category.name)}">
        <span class="nav-icon">${escapeHtml(category.icon || '•')}</span><span>${escapeHtml(category.name)}</span><span class="category-count">${category.count}</span>
      </button>`).join('');
  }

  function renderQuickLinks() {
    els.quickLinks.innerHTML = kb.quickLinks.map((link, index) => `
      <button class="quick-link" data-open-doc="${escapeHtml(link.docId)}">
        <span class="quick-link-icon">${['↗', '▦', '◇', '↺', '◌'][index] || '•'}</span>
        <span class="quick-link-copy"><span class="quick-link-label">${escapeHtml(link.label)}</span><span class="quick-link-hint">${escapeHtml(link.hint)}</span></span>
      </button>`).join('');
  }

  function sectionLabels() {
    let title = '推荐操作路径';
    let kicker = '全部路径';
    let breadcrumb = '总览';
    if (state.query) { title = `搜索：${state.query}`; kicker = '检索结果'; breadcrumb = '搜索'; }
    else if (state.category) { title = state.category; kicker = '功能模块'; breadcrumb = state.category; }
    else if (state.view === 'training') { title = '新人训练路径'; kicker = '带教工作台'; breadcrumb = '新人训练'; }
    else if (state.view === 'all') { title = '全部文档'; kicker = '知识库目录'; breadcrumb = '全部文档'; }
    els.sectionTitle.textContent = title;
    els.sectionKicker.textContent = kicker;
    els.breadcrumbCurrent.textContent = breadcrumb;
  }

  function renderDocuments() {
    const result = filteredDocs();
    els.resultCount.textContent = `${result.length} 篇`;
    if (!result.length) {
      els.documentList.innerHTML = `<div class="empty-state"><strong>没有匹配到文档</strong>换个关键词试试，例如“商品上架”“退款”或“工作流”。</div>`;
      return;
    }
    els.documentList.innerHTML = result.map((doc) => `
      <article class="document-card ${doc.id === state.selectedId ? 'is-selected' : ''}" data-doc-id="${escapeHtml(doc.id)}" tabindex="0" role="button" aria-label="打开 ${escapeHtml(doc.title)}">
        <span class="doc-icon color-${escapeHtml(doc.color || 'blue')}">${escapeHtml(iconFor(doc))}</span>
        <span class="doc-copy">
          <span class="doc-title-line"><span class="doc-title">${escapeHtml(doc.title)}</span><span class="badge ${badgeClass[doc.evidence] || ''}">${evidenceLabel[doc.evidence] || escapeHtml(doc.badge)}</span></span>
          <span class="doc-summary">${escapeHtml(doc.summary)}</span>
          <span class="doc-meta"><span>${escapeHtml(doc.category)}</span><span>·</span><span>${escapeHtml(doc.updated)}</span><span>·</span><span>${doc.keywords.slice(0, 3).map(escapeHtml).join(' / ')}</span></span>
        </span>
        <span class="doc-arrow">›</span>
      </article>`).join('');
  }

  function evidenceNote(doc) {
    if (doc.evidence === 'official') return '<strong>证据：</strong>官网帮助中心文章。按钮和字段以当前客户端版本为准。';
    if (doc.evidence === 'video') return '<strong>证据：</strong>用户提供的视频演示。它能确认画面路径，不单独证明平台最终成功。';
    if (doc.evidence === 'inference') return '<strong>证据：</strong>根据官网功能、页面行为和视频演示归纳的使用层架构，不是内部代码实现。';
    return '<strong>用途：</strong>培训与带教模板。遇到版本差异时回到官网文章和当前客户端核验。';
  }

  function renderDetail() {
    const doc = byId.get(state.selectedId);
    if (!doc) {
      els.detailPlaceholder.hidden = false;
      els.detailCard.hidden = true;
      return;
    }
    els.detailPlaceholder.hidden = true;
    els.detailCard.hidden = false;
    const source = doc.sourceUrl ? `<a href="${escapeHtml(doc.sourceUrl)}" target="_blank" rel="noreferrer">打开来源 ↗</a>` : '素材未随页面上传';
    els.detailCard.innerHTML = `
      <div class="detail-head">
        <div class="detail-head-top"><span class="detail-category">${escapeHtml(doc.category)}</span><span class="badge ${badgeClass[doc.evidence] || ''}">${evidenceLabel[doc.evidence] || escapeHtml(doc.badge)}</span></div>
        <h2>${escapeHtml(doc.title)}</h2>
        <p class="detail-summary">${escapeHtml(doc.summary)}</p>
        <div class="detail-meta"><span class="meta-chip">更新 ${escapeHtml(doc.updated)}</span><span class="meta-chip">${escapeHtml(doc.keywords.slice(0, 3).join(' · '))}</span><span class="meta-chip">${source}</span></div>
        <div class="detail-actions"><button class="detail-action" data-copy-doc="${escapeHtml(doc.id)}">复制 AI 提问模板</button><button class="detail-action" data-back-to-list>回到列表</button></div>
      </div>
      <div class="detail-body"><h3>操作说明</h3>${markdownLite(doc.content)}<div class="evidence-note">${evidenceNote(doc)}</div></div>`;
  }

  function updateNav() {
    document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('is-active', !state.category && button.dataset.view === state.view));
    document.querySelectorAll('.filter-tab').forEach((button) => button.classList.toggle('is-active', button.dataset.filter === state.evidence));
    renderSidebar();
  }

  function render() {
    updateNav();
    sectionLabels();
    renderDocuments();
    renderDetail();
    els.clearSearch.hidden = !state.query;
    els.searchInput.value = state.query;
    if (state.query || state.category || state.view !== 'home') els.dashboardGrid.classList.add('is-contextual');
    else els.dashboardGrid.classList.remove('is-contextual');
  }

  function selectDoc(id, scroll = true) {
    if (!byId.has(id)) return;
    state.selectedId = id;
    renderDocuments();
    renderDetail();
    if (scroll && window.matchMedia('(max-width: 900px)').matches) els.detailColumn.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  let toastTimer;
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), 2200);
  }

  function aiPrompt(doc) {
    return `你是店大人运营教练。请根据《${doc.title}》讲解“${doc.category}”任务。先列出开始前准备，再按点击路径给出步骤，每一步写出验收标准和失败时的排查动作。明确哪些内容来自官网、哪些来自视频或培训推断；不要编造当前版本没有确认的按钮。`;
  }

  document.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-open-doc]');
    if (openButton) { state.category = null; state.view = 'all'; state.evidence = 'all'; selectDoc(openButton.dataset.openDoc); render(); return; }
    const categoryButton = event.target.closest('[data-category]');
    if (categoryButton) { state.category = categoryButton.dataset.category; state.view = 'all'; state.evidence = 'all'; state.query = ''; render(); return; }
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) { state.category = null; state.view = viewButton.dataset.view; state.evidence = 'all'; state.query = ''; render(); if (window.innerWidth <= 900) els.sidebar.classList.remove('is-open'); return; }
    const card = event.target.closest('[data-doc-id]');
    if (card) { selectDoc(card.dataset.docId); return; }
    const filter = event.target.closest('[data-filter]');
    if (filter) { state.evidence = filter.dataset.filter; state.category = null; state.view = 'all'; render(); return; }
    const queryButton = event.target.closest('[data-query]');
    if (queryButton) { state.query = queryButton.dataset.query; state.category = null; state.view = 'all'; render(); els.searchInput.focus(); return; }
    const copyButton = event.target.closest('[data-copy-doc]');
    if (copyButton) {
      const doc = byId.get(copyButton.dataset.copyDoc);
      if (!doc) return;
      const prompt = aiPrompt(doc);
      navigator.clipboard?.writeText(prompt).then(() => showToast('AI 提问模板已复制')).catch(() => showToast(prompt));
      return;
    }
    if (event.target.closest('[data-back-to-list]')) { document.querySelector('.document-column')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (event.target.closest('#mobileMenu')) els.sidebar.classList.toggle('is-open');
  });

  els.documentList.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('[data-doc-id]')) {
      event.preventDefault(); selectDoc(event.target.closest('[data-doc-id]').dataset.docId);
    }
  });
  els.searchInput.addEventListener('input', (event) => { state.query = event.target.value.trim(); state.category = null; state.view = 'all'; render(); });
  els.clearSearch.addEventListener('click', () => { state.query = ''; render(); els.searchInput.focus(); });
  els.sortSelect.addEventListener('change', (event) => { state.sort = event.target.value; renderDocuments(); });
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); els.searchInput.focus(); }
    if (event.key === '/' && document.activeElement !== els.searchInput) { event.preventDefault(); els.searchInput.focus(); }
    if (event.key === 'Escape' && document.activeElement === els.searchInput && state.query) { state.query = ''; render(); }
  });

  renderQuickLinks();
  render();
})();

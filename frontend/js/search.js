// 搜索页逻辑（使用后端 API）

let searchKeyword = '';

async function initSearch() {
  document.getElementById('navbar').innerHTML = generateNavbar('');

  const params = new URLSearchParams(window.location.search);
  searchKeyword = params.get('q') || '';

  const searchInput = document.getElementById('searchInput');
  if (searchInput && searchKeyword) {
    searchInput.value = searchKeyword;
  }

  await performSearch();
}

async function performSearch() {
  const content = document.getElementById('searchContent');

  let filterHtml = `
    <div class="search-header">
      <h2>搜索结果${searchKeyword ? `：<span>${searchKeyword}</span>` : ''}</h2>
      <div class="search-filter">
        <select id="categoryFilter" onchange="filterResults()">
          <option value="">全部板块</option>
          ${CATEGORIES.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
        </select>
        <select id="sortFilter" onchange="filterResults()">
          <option value="latest">最新发布</option>
          <option value="hot">最多浏览</option>
        </select>
      </div>
    </div>
  `;

  if (!searchKeyword.trim()) {
    content.innerHTML = filterHtml + `<div id="resultList">` + renderEmptyState('请输入搜索关键词') + '</div>';
    return;
  }

  content.innerHTML = filterHtml + `<div id="resultList">` + renderLoading() + '</div>';
  await filterResults();
}

async function filterResults() {
  const category = document.getElementById('categoryFilter')?.value || '';
  const sort = document.getElementById('sortFilter')?.value || 'latest';
  const listEl = document.getElementById('resultList');

  if (!listEl) return;

  try {
    const result = await searchPosts(searchKeyword, category, sort);

    if (result.posts.length === 0) {
      listEl.innerHTML = renderEmptyState(`没有找到与"${searchKeyword}"相关的帖子`);
    } else {
      listEl.innerHTML = result.posts.map(post => renderPostCard(post)).join('');
    }
  } catch (error) {
    listEl.innerHTML = renderEmptyState('搜索失败');
  }
}

initSearch();

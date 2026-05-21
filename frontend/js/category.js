// 板块页逻辑（使用后端 API）

async function initCategory() {
  const params = new URLSearchParams(window.location.search);
  const categoryId = params.get('id') || '';

  document.getElementById('navbar').innerHTML = generateNavbar('');
  document.getElementById('sidebarLeft').innerHTML = renderSidebarLeft(categoryId);

  const sidebarRight = await renderSidebarRight();
  document.getElementById('sidebarRight').innerHTML = sidebarRight;

  if (!categoryId) {
    document.getElementById('categoryContent').innerHTML = renderEmptyState('板块不存在');
    return;
  }

  const category = getCategoryById(categoryId);
  if (!category) {
    document.getElementById('categoryContent').innerHTML = renderEmptyState('板块不存在');
    return;
  }

  document.getElementById('categoryContent').innerHTML = renderLoading();

  try {
    const result = await getPosts(1, 100, 'latest', categoryId);
    const posts = result.posts;

    let html = `
      <div class="category-header">
        <h2>${category.icon} ${category.name}</h2>
        <p>${category.desc}</p>
        <div class="stats">共 ${posts.length} 篇帖子</div>
      </div>
    `;

    if (posts.length === 0) {
      html += renderEmptyState('该板块暂无帖子');
    } else {
      html += posts.map(post => renderPostCard(post)).join('');
    }

    document.getElementById('categoryContent').innerHTML = html;
    document.title = `校园论坛 - ${category.name}`;
  } catch (error) {
    document.getElementById('categoryContent').innerHTML = renderEmptyState('加载失败');
  }
}

initCategory();
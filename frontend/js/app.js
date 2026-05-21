// ============================================================
// app.js — 公共逻辑（使用后端 API）
// ============================================================

// 生成导航栏
function generateNavbar(currentPage = '') {
  const user = getCurrentUser();

  const navHtml = `
    <nav class="navbar">
      <div class="navbar-inner">
        <a href="index.html" class="navbar-logo">校园<span>论坛</span></a>
        <div class="navbar-search">
          <input type="text" id="searchInput" placeholder="搜索帖子..." />
          <button onclick="handleSearch()">🔍</button>
        </div>
        <div class="navbar-nav">
          <a href="index.html" class="${currentPage === 'index' ? 'active' : ''}">首页</a>
          <a href="create-post.html" class="${currentPage === 'create' ? 'active' : ''}">发帖</a>
        </div>
        <div class="navbar-actions">
          ${user ? `
            <a href="profile.html" class="navbar-user">
              <div class="avatar">${user.username.charAt(0)}</div>
              <span class="username">${user.username}</span>
            </a>
            <button class="btn btn-ghost btn-sm" onclick="handleLogout()">退出</button>
          ` : `
            <a href="login.html" class="btn btn-outline btn-sm">登录</a>
            <a href="register.html" class="btn btn-primary btn-sm">注册</a>
          `}
        </div>
      </div>
    </nav>
  `;

  return navHtml;
}

// 搜索处理
function handleSearch() {
  const keyword = document.getElementById('searchInput').value.trim();
  if (keyword) {
    window.location.href = `search.html?q=${encodeURIComponent(keyword)}`;
  }
}

// 登出（使用 api.js 的 logout）
function handleLogout() {
  logout();
  showToast('已退出登录', 'success');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

// Toast 提示
function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// 帖子卡片渲染（后端返回的数据已经包含 author_name）
function renderPostCard(post) {
  const category = getCategoryById(post.category_id || post.categoryId);
  const authorName = post.author_name || post.authorName || '匿名';
  const commentCount = post.comment_count || post.commentCount || 0;

  return `
    <div class="post-card" onclick="goToPost(${post.id})">
      <div class="avatar">${authorName.charAt(0)}</div>
      <div class="post-content">
        <div class="post-title">${post.title}</div>
        <div class="post-excerpt">${truncate((post.content || '').replace(/\n/g, ' '), 80)}</div>
        <div class="post-meta">
          <span class="author">${authorName}</span>
          <span class="category-tag">${category ? category.name : '未分类'}</span>
          <span>${formatTime(post.created_at || post.createdAt)}</span>
        </div>
      </div>
      <div class="post-stats">
        <div class="stat-item">
          <span class="count">${post.views || 0}</span>
          <span>浏览</span>
        </div>
      </div>
    </div>
  `;
}

// 跳转到帖子详情
function goToPost(postId) {
  window.location.href = `post.html?id=${postId}`;
}

// 侧边栏（板块列表）
function renderSidebarLeft(currentCategory = '') {
  let html = '<div class="card sidebar-left"><div class="sidebar-menu">';
  html += `<a href="index.html" class="${currentCategory === '' ? 'active' : ''}">
    <span class="icon">🏠</span>全部帖子
  </a>`;
  CATEGORIES.forEach(cat => {
    html += `<a href="category.html?id=${cat.id}" class="${currentCategory === cat.id ? 'active' : ''}">
      <span class="icon">${cat.icon}</span>${cat.name}
    </a>`;
  });
  html += '</div></div>';
  return html;
}

// 热门话题（需要后端数据）
async function renderSidebarRight() {
  try {
    const result = await getPosts(1, 5, 'hot');
    const posts = result.posts;

    let html = '<div class="card sidebar-right"><div class="card-header">热门话题</div><div class="card-body">';
    posts.forEach((post, index) => {
      html += `
        <div class="hot-topic">
          <span class="rank ${index < 3 ? 'top' : ''}">${index + 1}</span>
          <a href="post.html?id=${post.id}">${truncate(post.title, 20)}</a>
        </div>
      `;
    });
    html += '</div></div>';
    return html;
  } catch (error) {
    return '<div class="card sidebar-right"><div class="card-header">热门话题</div><div class="card-body">加载失败</div></div>';
  }
}

// 检查登录状态
function requireLogin() {
  const user = getCurrentUser();
  if (!user) {
    showToast('请先登录', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return false;
  }
  return true;
}

// 分页组件
function renderPagination(currentPage, totalPages, onPageChange) {
  if (totalPages <= 1) return '';

  let html = '<div class="pagination">';
  html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChange}(1)">首页</button>`;
  html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChange}(${currentPage - 1})">上一页</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      html += `<button class="${i === currentPage ? 'active' : ''}" onclick="${onPageChange}(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += '<span style="padding: 8px;">...</span>';
    }
  }

  html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChange}(${currentPage + 1})">下一页</button>`;
  html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChange}(${totalPages})">末页</button>`;
  html += '</div>';

  return html;
}

// 空状态
function renderEmptyState(message = '暂无内容') {
  return `
    <div class="empty-state">
      <div class="icon">📭</div>
      <p>${message}</p>
    </div>
  `;
}

// 加载状态
function renderLoading() {
  return '<div class="loading">加载中...</div>';
}
// 个人中心逻辑（使用后端 API）

let currentTab = 'posts';
let userPosts = [];
let userComments = [];
let userFavorites = [];

async function initProfile() {
  document.getElementById('navbar').innerHTML = generateNavbar('');

  const user = getCurrentUser();
  if (!user) {
    document.getElementById('profileContent').innerHTML = renderEmptyState('请先登录');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return;
  }

  document.getElementById('profileContent').innerHTML = renderLoading();

  // 获取用户数据（目前需要遍历帖子来获取）
  try {
    const postsResult = await getPosts(1, 100);
    userPosts = postsResult.posts.filter(p => p.author_id === user.id);

    // 评论数据需要单独获取（简化实现：遍历用户所有帖子的评论）
    // 实际项目中应该有专门的 API 获取用户的评论
    const allComments = [];
    for (const post of postsResult.posts) {
      try {
        const commentsResult = await getComments(post.id);
        allComments.push(...commentsResult.comments.filter(c => c.author_id === user.id));
      } catch (e) {}
    }
    userComments = allComments;

    // 收藏数据
    // 实际项目应该有专门的 API，这里简化处理
    userFavorites = [];

    renderProfile(user);
  } catch (error) {
    document.getElementById('profileContent').innerHTML = renderEmptyState('加载失败');
  }
}

function renderProfile(user) {
  const html = `
    <div class="profile-header">
      <div class="avatar-lg">${user.username.charAt(0)}</div>
      <div class="profile-info">
        <h2>${user.username}</h2>
        <div class="bio">${user.bio || '这个人很懒，什么都没写'}</div>
        <div class="meta">注册于 ${formatTime(user.created_at || user.createdAt)} · ${user.email}</div>
      </div>
    </div>

    <div class="profile-tabs">
      <div class="tab ${currentTab === 'posts' ? 'active' : ''}" onclick="switchTab('posts')">
        我的帖子 (${userPosts.length})
      </div>
      <div class="tab ${currentTab === 'comments' ? 'active' : ''}" onclick="switchTab('comments')">
        我的评论 (${userComments.length})
      </div>
      <div class="tab ${currentTab === 'favorites' ? 'active' : ''}" onclick="switchTab('favorites')">
        我的收藏 (${userFavorites.length})
      </div>
    </div>

    <div id="tabContent">
      ${renderTabContent(currentTab)}
    </div>
  `;

  document.getElementById('profileContent').innerHTML = html;
}

function renderTabContent(tab) {
  switch (tab) {
    case 'posts':
      if (userPosts.length === 0) return renderEmptyState('还没有发过帖子');
      return userPosts.map(post => renderPostCard(post)).join('');

    case 'comments':
      if (userComments.length === 0) return renderEmptyState('还没有发表过评论');
      return userComments.map(comment => `
        <div class="comment-item">
          <div class="comment-body" style="flex:1;">
            <div class="comment-header">
              <span class="comment-time">${formatTime(comment.created_at)}</span>
            </div>
            <div class="comment-text">${comment.content}</div>
          </div>
        </div>
      `).join('');

    case 'favorites':
      return renderEmptyState('暂无收藏');

    default:
      return '';
  }
}

function switchTab(tab) {
  const user = getCurrentUser();
  if (!user) return;
  currentTab = tab;
  renderProfile(user);
}

initProfile();
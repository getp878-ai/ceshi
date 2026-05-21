// 帖子详情页逻辑（使用后端 API）

let currentPostId = null;

async function initPostDetail() {
  document.getElementById('navbar').innerHTML = generateNavbar('');

  const params = new URLSearchParams(window.location.search);
  currentPostId = parseInt(params.get('id'));

  if (!currentPostId) {
    document.getElementById('postDetail').innerHTML = renderEmptyState('帖子不存在');
    return;
  }

  document.getElementById('postDetail').innerHTML = renderLoading();

  try {
    // 并行请求：帖子详情 + 评论列表 + 点赞收藏状态
    const [postResult, commentsResult, statusResult] = await Promise.all([
      getPost(currentPostId),
      getComments(currentPostId),
      getPostStatus(currentPostId, getCurrentUser()?.id),
    ]);

    renderPostDetail(postResult.post, commentsResult.comments, statusResult);
  } catch (error) {
    document.getElementById('postDetail').innerHTML = renderEmptyState('加载失败，帖子可能不存在');
  }
}

function renderPostDetail(post, comments, status) {
  const user = getCurrentUser();
  const category = getCategoryById(post.category_id);
  const liked = status.liked;
  const favorited = status.favorited;
  const authorName = post.author_name || '匿名';

  const html = `
    <div class="post-detail">
      <div class="post-header">
        <div class="post-title">${post.title}</div>
        <div class="post-info">
          <div class="avatar" style="width:32px;height:32px;font-size:14px;">${authorName.charAt(0)}</div>
          <span class="author-name">${authorName}</span>
          <span>发布于 ${formatTime(post.created_at)}</span>
          <span class="category-tag">${category ? category.name : '未分类'}</span>
          <span>${post.views} 浏览</span>
        </div>
      </div>

      <div class="post-body">${post.content}</div>

      <div class="post-actions">
        <button class="action-btn ${liked ? 'active' : ''}" onclick="handleLike(${post.id})">
          👍 <span id="likeCount">${post.likes}</span> 赞
        </button>
        <button class="action-btn ${favorited ? 'active' : ''}" id="favBtn" onclick="handleFavorite(${post.id})">
          ⭐ ${favorited ? '已收藏' : '收藏'}
        </button>
        <button class="action-btn" onclick="document.getElementById('commentTextarea').focus()">
          💬 评论 (${comments.length})
        </button>
        ${user && user.id === post.author_id ? `<button class="action-btn" onclick="showEditForm()">✏️ 编辑</button>` : ''}
      </div>

      <div id="editForm" class="hidden" style="padding:20px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:20px;">
        <div class="form-group">
          <label>标题</label>
          <input type="text" id="editTitle" class="form-control" value="${post.title}" />
        </div>
        <div class="form-group">
          <label>板块</label>
          <select id="editCategory" class="form-control">
            ${CATEGORIES.map(cat => `<option value="${cat.id}" ${cat.id === post.category_id ? 'selected' : ''}>${cat.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>正文</label>
          <textarea id="editContent" class="form-control">${post.content}</textarea>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button class="btn btn-ghost" onclick="document.getElementById('editForm').classList.add('hidden')">取消</button>
          <button class="btn btn-primary" onclick="handleEdit(${post.id})">保存</button>
        </div>
      </div>

      <div class="comment-section">
        <h3>评论 (${comments.length})</h3>

        <div class="comment-input">
          <div class="avatar">${user ? user.username.charAt(0) : '?'}</div>
          <div class="input-wrapper">
            <textarea id="commentTextarea" placeholder="${user ? '写下你的评论...' : '请先登录后评论'}" ${user ? '' : 'disabled'}></textarea>
            <div class="submit-row">
              <button class="btn btn-primary btn-sm" onclick="submitComment(${post.id})" ${user ? '' : 'disabled'}>发表评论</button>
            </div>
          </div>
        </div>

        <div id="commentList">
          ${comments.length === 0 ? renderEmptyState('暂无评论，来说两句吧') : comments.map(c => renderComment(c)).join('')}
        </div>
      </div>
    </div>
  `;

  document.getElementById('postDetail').innerHTML = html;
}

function renderComment(comment) {
  const authorName = comment.author_name || '匿名';
  return `
    <div class="comment-item">
      <div class="avatar">${authorName.charAt(0)}</div>
      <div class="comment-body">
        <div class="comment-header">
          <span class="comment-author">${authorName}</span>
          <span class="comment-time">${formatTime(comment.created_at)}</span>
        </div>
        <div class="comment-text">${comment.content}</div>
      </div>
    </div>
  `;
}

async function handleLike(postId) {
  const user = getCurrentUser();
  if (!user) { showToast('请先登录', 'error'); return; }

  try {
    const result = await toggleLike(postId, user.id);
    const btn = event.currentTarget;
    btn.classList.toggle('active', result.liked);

    // 更新点赞数
    const postResult = await getPost(postId);
    document.getElementById('likeCount').textContent = postResult.post.likes;
  } catch (error) {
    showToast('操作失败', 'error');
  }
}

async function handleFavorite(postId) {
  const user = getCurrentUser();
  if (!user) { showToast('请先登录', 'error'); return; }

  try {
    const result = await toggleFavorite(postId, user.id);
    const btn = document.getElementById('favBtn');
    btn.classList.toggle('active', result.favorited);
    btn.innerHTML = result.favorited ? '⭐ 已收藏' : '⭐ 收藏';
    showToast(result.message, 'success');
  } catch (error) {
    showToast('操作失败', 'error');
  }
}

function showEditForm() {
  document.getElementById('editForm').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleEdit(postId) {
  const user = getCurrentUser();
  if (!user) { showToast('请先登录', 'error'); return; }

  const title = document.getElementById('editTitle').value.trim();
  const categoryId = document.getElementById('editCategory').value;
  const content = document.getElementById('editContent').value.trim();

  if (!title || !content) { showToast('标题和内容不能为空', 'error'); return; }

  try {
    await updatePost(postId, title, content, categoryId, user.id);
    showToast('编辑成功', 'success');
    initPostDetail();
  } catch (error) {
    showToast('编辑失败: ' + error.message, 'error');
  }
}

async function submitComment(postId) {
  const user = getCurrentUser();
  if (!user) { showToast('请先登录', 'error'); return; }

  const textarea = document.getElementById('commentTextarea');
  const content = textarea.value.trim();

  if (!content) {
    showToast('请输入评论内容', 'error');
    return;
  }

  try {
    await createComment(content, postId, user.id);
    textarea.value = '';
    showToast('评论成功', 'success');
    initPostDetail();
  } catch (error) {
    showToast('评论失败', 'error');
  }
}

initPostDetail();

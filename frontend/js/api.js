// ============================================================
// api.js — 前端 API 请求层
// ============================================================
//
// 【fetch 讲解】
// fetch 是浏览器提供的原生 API，用于发送 HTTP 请求
//
// 基本用法：
//   fetch(url, options)
//     .then(response => response.json())
//     .then(data => console.log(data))
//
// options 参数：
//   method: 'GET' | 'POST' | 'PUT' | 'DELETE'
//   headers: { 'Content-Type': 'application/json' }
//   body: JSON.stringify(data)  // POST/PUT 时发送的数据
//
// ============================================================

// 后端 API 基础地址
// 自动识别：本地用 localhost，线上用实际域名
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : window.location.origin + '/api';

// 封装请求函数
async function request(url, options = {}) {
  // 默认配置
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  // 如果有 body，转为 JSON 字符串
  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(API_BASE + url, config);
    const data = await response.json();

    // HTTP 状态码判断
    if (!response.ok) {
      // 返回错误信息
      throw new Error(data.error || '请求失败');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ============================================================
// 用户认证 API
// ============================================================

// 注册
async function register(username, email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: { username, email, password },
  });
}

// 登录
async function login(username, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  // 登录成功后保存用户信息到 localStorage（会话管理）
  localStorage.setItem('forum_user', JSON.stringify(data.user));
  return data;
}

// 获取用户信息
async function getUser(userId) {
  return request(`/auth/me/${userId}`);
}

// 获取当前登录用户（从 localStorage）
function getCurrentUser() {
  const userStr = localStorage.getItem('forum_user');
  return userStr ? JSON.parse(userStr) : null;
}

// 登出
function logout() {
  localStorage.removeItem('forum_user');
}

// ============================================================
// 帖子 API
// ============================================================

// 获取帖子列表
async function getPosts(page = 1, pageSize = 5, sort = 'latest', category = '') {
  const params = new URLSearchParams({ page, pageSize, sort });
  if (category) params.append('category', category);
  return request(`/posts?${params}`);
}

// 获取单个帖子
async function getPost(postId) {
  return request(`/posts/${postId}`);
}

// 创建帖子
async function createPost(title, content, categoryId, authorId) {
  return request('/posts', {
    method: 'POST',
    body: { title, content, categoryId, authorId },
  });
}

// 编辑帖子
async function updatePost(postId, title, content, categoryId, userId) {
  return request(`/posts/${postId}`, {
    method: 'PUT',
    body: { title, content, categoryId, userId },
  });
}

// 删除帖子
async function deletePost(postId, userId) {
  return request(`/posts/${postId}?userId=${userId}`, {
    method: 'DELETE',
  });
}

// 点赞/取消点赞
async function toggleLike(postId, userId) {
  return request(`/posts/${postId}/like`, {
    method: 'POST',
    body: { userId },
  });
}

// 收藏/取消收藏
async function toggleFavorite(postId, userId) {
  return request(`/posts/${postId}/favorite`, {
    method: 'POST',
    body: { userId },
  });
}

// 获取点赞/收藏状态
async function getPostStatus(postId, userId) {
  const params = userId ? `?userId=${userId}` : '';
  return request(`/posts/${postId}/status${params}`);
}

// ============================================================
// 评论 API
// ============================================================

// 获取评论列表
async function getComments(postId) {
  return request(`/comments?postId=${postId}`);
}

// 发表评论
async function createComment(content, postId, authorId) {
  return request('/comments', {
    method: 'POST',
    body: { content, postId, authorId },
  });
}

// 删除评论
async function deleteComment(commentId, userId) {
  return request(`/comments/${commentId}?userId=${userId}`, {
    method: 'DELETE',
  });
}

// ============================================================
// 搜索
// ============================================================

async function searchPosts(keyword, category = '', sort = 'latest') {
  const params = new URLSearchParams({ keyword, sort });
  if (category) params.append('category', category);
  return request(`/posts?${params}`);
}

// ============================================================
// 板块数据（前端静态）
// ============================================================
const CATEGORIES = [
  { id: 'study', name: '学习交流', icon: '📖', desc: '课程讨论、学习资源、考试经验' },
  { id: 'campus', name: '校园生活', icon: '🏫', desc: '校园趣事、美食推荐、生活吐槽' },
  { id: 'trade', name: '二手交易', icon: '💰', desc: '教材转让、物品买卖、租房信息' },
  { id: 'lost', name: '失物招领', icon: '🔍', desc: '丢失物品、捡到物品、寻物启事' },
  { id: 'club', name: '社团活动', icon: '🎭', desc: '社团招新、活动预告、精彩回顾' },
  { id: 'job', name: '兼职招聘', icon: '💼', desc: '实习信息、兼职推荐、求职经验' },
];

function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id);
}

// ============================================================
// 工具函数
// ============================================================

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + '分钟前';
  if (hours < 24) return hours + '小时前';
  if (days < 7) return days + '天前';
  return date.toLocaleDateString('zh-CN');
}

function truncate(str, len) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}
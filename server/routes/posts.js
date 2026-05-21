// ============================================================
// routes/posts.js — 帖子路由（CRUD：增删改查）
// ============================================================
//
// 【CRUD 讲解】
// CRUD 是数据操作的四种基本动作：
//   C - Create  创建 → POST   /api/posts
//   R - Read    读取 → GET    /api/posts 或 GET /api/posts/:id
//   U - Update  更新 → PUT    /api/posts/:id
//   D - Delete  删除 → DELETE /api/posts/:id
//
// 几乎所有 Web 应用的核心都是 CRUD
// 你现在用的每个 APP（微信、淘宝、知乎）底层都是这四种操作
//
// ============================================================

const express = require('express');
const { db } = require('../database');

const router = express.Router();

// ============================================================
// GET /api/posts — 获取帖子列表（支持分页、排序、筛选）
// ============================================================
//
// 查询参数（URL 中 ? 后面的部分）：
//   GET /api/posts?page=1&pageSize=5&sort=latest&category=study
//   req.query = { page: '1', pageSize: '5', sort: 'latest', category: 'study' }
//
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const sort = req.query.sort || 'latest';
  const category = req.query.category || '';
  const keyword = req.query.keyword || '';

  // 计算 OFFSET（分页偏移量）
  // 第1页：跳过 0 条  → OFFSET 0
  // 第2页：跳过 10 条 → OFFSET 10
  const offset = (page - 1) * pageSize;

  // 构建查询条件
  let whereClause = '';
  const params = [];

  if (category) {
    whereClause += ' WHERE p.category_id = ?';
    params.push(category);
  }

  if (keyword) {
    const keywordClause = `(p.title LIKE ? OR p.content LIKE ?)`;
    whereClause += whereClause ? ` AND ${keywordClause}` : ` WHERE ${keywordClause}`;
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  // 排序方式
  const orderClause = sort === 'hot'
    ? 'ORDER BY p.views DESC'
    : 'ORDER BY p.created_at DESC';

  // 查询帖子列表
  // LEFT JOIN = 左连接：即使没有对应用户也显示帖子
  // COUNT(c.id) 统计每篇帖子的评论数
  const postsQuery = `
    SELECT
      p.*,
      u.username AS author_name,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `;

  const posts = db.prepare(postsQuery).all(...params, pageSize, offset);

  // 查询总数（用于分页计算）
  const totalQuery = `SELECT COUNT(*) as total FROM posts p ${whereClause}`;
  const { total } = db.prepare(totalQuery).get(...params);

  res.json({
    posts,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

// ============================================================
// GET /api/posts/:id — 获取单个帖子详情
// ============================================================
router.get('/:id', (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.username AS author_name, u.bio AS author_bio
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!post) {
    return res.status(404).json({ error: '帖子不存在' });
  }

  // 增加浏览量
  // UPDATE 语句修改已有数据
  db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(req.params.id);
  post.views += 1;

  res.json({ post });
});

// ============================================================
// POST /api/posts — 创建新帖子
// ============================================================
router.post('/', (req, res) => {
  const { title, content, categoryId, authorId } = req.body;

  if (!title || !content || !categoryId || !authorId) {
    return res.status(400).json({ error: '请填写完整信息' });
  }

  const result = db.prepare(
    'INSERT INTO posts (title, content, category_id, author_id) VALUES (?, ?, ?, ?)'
  ).run(title, content, categoryId, authorId);

  // 返回创建的帖子
  const newPost = db.prepare(`
    SELECT p.*, u.username AS author_name
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ message: '发布成功', post: newPost });
});

// ============================================================
// PUT /api/posts/:id — 编辑帖子
// ============================================================
router.put('/:id', (req, res) => {
  const { title, content, categoryId, userId } = req.body;

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  if (post.author_id !== parseInt(userId)) return res.status(403).json({ error: '无权编辑' });

  db.prepare('UPDATE posts SET title = ?, content = ?, category_id = ? WHERE id = ?')
    .run(title, content, categoryId, req.params.id);

  const updated = db.prepare('SELECT p.*, u.username AS author_name FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE p.id = ?').get(req.params.id);
  res.json({ message: '编辑成功', post: updated });
});

// ============================================================
// DELETE /api/posts/:id — 删除帖子
// ============================================================
router.delete('/:id', (req, res) => {
  const { userId } = req.query;

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) {
    return res.status(404).json({ error: '帖子不存在' });
  }

  // 权限校验：只有作者本人才能删除
  if (post.author_id !== parseInt(userId)) {
    return res.status(403).json({ error: '无权删除此帖子' });
  }

  // 删除帖子关联的评论
  db.prepare('DELETE FROM comments WHERE post_id = ?').run(req.params.id);
  // 删除帖子关联的点赞
  db.prepare('DELETE FROM likes WHERE post_id = ?').run(req.params.id);
  // 删除帖子关联的收藏
  db.prepare('DELETE FROM favorites WHERE post_id = ?').run(req.params.id);
  // 删除帖子本身
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);

  res.json({ message: '删除成功' });
});

// ============================================================
// POST /api/posts/:id/like — 点赞/取消点赞
// ============================================================
router.post('/:id/like', (req, res) => {
  const { userId } = req.body;
  const postId = req.params.id;

  // 检查是否已点赞
  const existing = db.prepare(
    'SELECT * FROM likes WHERE user_id = ? AND post_id = ?'
  ).get(userId, postId);

  if (existing) {
    // 取消点赞
    db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(userId, postId);
    db.prepare('UPDATE posts SET likes = likes - 1 WHERE id = ?').run(postId);
    res.json({ liked: false, message: '已取消点赞' });
  } else {
    // 点赞
    db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(userId, postId);
    db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(postId);
    res.json({ liked: true, message: '已点赞' });
  }
});

// ============================================================
// POST /api/posts/:id/favorite — 收藏/取消收藏
// ============================================================
router.post('/:id/favorite', (req, res) => {
  const { userId } = req.body;
  const postId = req.params.id;

  const existing = db.prepare(
    'SELECT * FROM favorites WHERE user_id = ? AND post_id = ?'
  ).get(userId, postId);

  if (existing) {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND post_id = ?').run(userId, postId);
    res.json({ favorited: false, message: '已取消收藏' });
  } else {
    db.prepare('INSERT INTO favorites (user_id, post_id) VALUES (?, ?)').run(userId, postId);
    res.json({ favorited: true, message: '已收藏' });
  }
});

// ============================================================
// GET /api/posts/:id/status — 检查当前用户对帖子的点赞/收藏状态
// ============================================================
router.get('/:id/status', (req, res) => {
  const { userId } = req.query;
  const postId = req.params.id;

  const liked = userId
    ? !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?').get(userId, postId)
    : false;

  const favorited = userId
    ? !!db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND post_id = ?').get(userId, postId)
    : false;

  res.json({ liked, favorited });
});

module.exports = router;

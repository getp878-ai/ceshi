// ============================================================
// routes/comments.js — 评论路由
// ============================================================
//
// 【路由设计】
//   GET    /api/comments?postId=1     获取某个帖子的评论列表
//   POST   /api/comments              发表评论
//   DELETE /api/comments/:id           删除评论
//
// ============================================================

const express = require('express');
const { db } = require('../database');

const router = express.Router();

// ============================================================
// GET /api/comments — 获取评论列表
// ============================================================
router.get('/', (req, res) => {
  const postId = req.query.postId;

  if (!postId) {
    return res.status(400).json({ error: '缺少 postId 参数' });
  }

  // 联表查询：评论 + 评论作者信息
  const comments = db.prepare(`
    SELECT c.*, u.username AS author_name
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(postId);

  res.json({ comments });
});

// ============================================================
// POST /api/comments — 发表评论
// ============================================================
router.post('/', (req, res) => {
  const { content, postId, authorId } = req.body;

  if (!content || !postId || !authorId) {
    return res.status(400).json({ error: '请填写完整信息' });
  }

  // 验证帖子是否存在
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) {
    return res.status(404).json({ error: '帖子不存在' });
  }

  const result = db.prepare(
    'INSERT INTO comments (content, post_id, author_id) VALUES (?, ?, ?)'
  ).run(content, postId, authorId);

  const newComment = db.prepare(`
    SELECT c.*, u.username AS author_name
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ message: '评论成功', comment: newComment });
});

// ============================================================
// DELETE /api/comments/:id — 删除评论
// ============================================================
router.delete('/:id', (req, res) => {
  const { userId } = req.query;

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) {
    return res.status(404).json({ error: '评论不存在' });
  }

  // 权限校验
  if (comment.author_id !== parseInt(userId)) {
    return res.status(403).json({ error: '无权删除此评论' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

module.exports = router;

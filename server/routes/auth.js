// ============================================================
// routes/auth.js — 认证路由（登录 / 注册）
// ============================================================
//
// 【RESTful API 讲解】
// REST 是一种 API 设计风格，核心规则：
//
//   HTTP方法   + URL路径        = 操作
//   ─────────────────────────────────────────
//   POST       /api/auth/register  注册（创建用户）
//   POST       /api/auth/login     登录（验证身份）
//   GET        /api/auth/me        获取当前用户信息
//
// HTTP 方法决定"做什么"：
//   GET    = 获取数据（读）
//   POST   = 创建数据（写）
//   PUT    = 更新数据（改）
//   DELETE = 删除数据（删）
//
// 【请求和响应】
// 前端发送：
//   fetch('/api/auth/login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ username: 'xxx', password: 'xxx' })
//   })
//
// 后端处理：
//   req.body = { username: 'xxx', password: 'xxx' }  ← Express 自动解析
//   res.json({ success: true, user: {...} })          ← 返回 JSON 响应
//
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');

const router = express.Router();
// router 是一个"迷你版"的 app，专门处理某个前缀下的请求
// 在 server.js 中：app.use('/api/auth', authRoutes)
// 所以这里 router.get('/me') 实际处理的是 GET /api/auth/me

// ============================================================
// POST /api/auth/register — 注册
// ============================================================
router.post('/register', (req, res) => {
  // req = 请求对象（包含前端发来的数据）
  // res = 响应对象（用来给前端返回数据）

  const { username, password, email } = req.body;

  // 1. 参数校验（永远不要信任前端传来的数据！）
  if (!username || !password || !email) {
    return res.status(400).json({ error: '请填写完整信息' });
    // status(400) = HTTP 状态码 400（客户端错误）
    // json() = 返回 JSON 格式数据
  }

  // 2. 检查用户名是否已存在
  // db.prepare().get() 查询一条记录，找不到返回 undefined
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  // 3. 加密密码
  // bcrypt.hashSync(明文, 盐轮数) → 返回加密后的密码
  // 为什么不直接存明文？因为数据库泄露后，黑客也看不到原始密码
  const hashedPassword = bcrypt.hashSync(password, 10);

  // 4. 插入数据库
  const result = db.prepare(
    'INSERT INTO users (username, password, email) VALUES (?, ?, ?)'
  ).run(username, hashedPassword, email);

  // 5. 返回成功响应
  res.status(201).json({
    message: '注册成功',
    user: {
      id: result.lastInsertRowid,
      username,
      email,
    },
  });
});

// ============================================================
// POST /api/auth/login — 登录
// ============================================================
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }

  // 查找用户
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
    // status(401) = 未授权（认证失败）
  }

  // 验证密码
  // bcrypt.compareSync(明文, 密文) → 返回 true/false
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  // 登录成功
  // 注意：不返回密码！即使是加密的也不返回
  res.json({
    message: '登录成功',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      created_at: user.created_at,
    },
  });
});

// ============================================================
// GET /api/auth/me — 获取当前登录用户信息
// ============================================================
router.get('/me/:id', (req, res) => {
  // req.params.id = URL 中的 :id 部分
  // 例如 GET /api/auth/me/3 → req.params.id = '3'
  const user = db.prepare(
    'SELECT id, username, email, bio, created_at FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json({ user });
});

module.exports = router;

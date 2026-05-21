// ============================================================
// server.js — 后端服务器入口文件
// ============================================================
//
// 【原理讲解】
// 这个文件是整个后端的"大脑"。它做三件事：
// 1. 创建一个 HTTP 服务器（监听端口，等待前端请求）
// 2. 注册各种"中间件"（处理请求的流水线）
// 3. 把不同类型的请求分发给对应的"路由"处理
//
// 类比：server.js 就像一个餐厅的前台
//   - 客人（前端）进来点单（发送请求）
//   - 前台（server.js）把订单转给对应的厨师（路由）
//   - 厨师做好菜（处理完数据）再由前台端给客人
// ============================================================

// ---------- 1. 导入依赖包 ----------
// require() 是 Node.js 的模块导入语法，相当于前端的 import
const express = require('express');   // Web 框架
const cors = require('cors');         // 跨域中间件

// ---------- 2. 创建 Express 应用 ----------
// express() 创建一个应用实例，它会自动处理 HTTP 协议的细节
const app = express();

// ---------- 3. 设置端口 ----------
// 后端服务器需要一个端口号来监听请求
// 前端通过 http://localhost:3000 访问后端
const PORT = 3001;

// ---------- 4. 注册中间件 ----------
//
// 【什么是中间件？】
// 中间件是处理请求的"流水线工人"。
// 每个请求进来后，会依次经过每个中间件处理。
//
// 请求 → 中间件1 → 中间件2 → 路由处理 → 响应
//

// 中间件1: cors — 允许跨域请求
// 前端跑在 file:// 或 localhost:5500，后端跑在 localhost:3000
// 端口不同 = 跨域，浏览器默认会拦截。cors 中间件告诉浏览器"放行"
app.use(cors());

// 中间件2: express.json() — 解析请求体中的 JSON 数据
// 前端用 fetch 发送 POST 请求时，数据放在 body 里，格式是 JSON
// 这个中间件自动把 JSON 字符串转成 JS 对象，挂到 req.body 上
app.use(express.json());

// 中间件3: 静态文件服务
// 把上一层的 frontend 目录作为静态资源目录
// 这样前端页面可以通过 http://localhost:3000/ 直接访问
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ---------- 5. 导入数据库初始化 ----------
// 连接数据库并创建表结构
const { initDatabase } = require('./database');
initDatabase();

// ---------- 6. 导入路由 ----------
// 路由 = 处理特定 URL 请求的函数
// 把不同功能的路由分到不同文件，代码更清晰
const authRoutes = require('./routes/auth');       // 认证相关（登录/注册）
const postRoutes = require('./routes/posts');      // 帖子相关（增删改查）
const commentRoutes = require('./routes/comments');// 评论相关

// ---------- 7. 注册路由 ----------
// app.use(前缀, 路由模块)
// 这样所有以 /api/auth 开头的请求都交给 authRoutes 处理
// 所有以 /api/posts 开头的请求都交给 postRoutes 处理
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// ---------- 8. 启动服务器 ----------
// app.listen() 让服务器开始监听指定端口
// 启动后，前端就可以通过 http://localhost:3000 访问了
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`  校园论坛后端已启动！`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  API:  http://localhost:${PORT}/api/posts`);
  console.log(`=================================`);
});

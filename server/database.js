// ============================================================
// database.js — 数据库初始化与操作
// ============================================================
//
// 【原理讲解】
// 数据库就像一个 Excel 文件：
//   - 每个"表"(Table) = 一个 Sheet（工作表）
//   - 每个"行"(Row) = 一条数据记录
//   - 每个"列"(Column) = 一个字段
//
// 我们的论坛需要 4 个表：
//   1. users    — 用户表（存账号信息）
//   2. posts    — 帖子表（存帖子内容）
//   3. comments — 评论表（存评论内容）
//   4. likes    — 点赞表（记录谁赞了哪个帖子）
//
// 【为什么用关系型数据库？】
// 帖子有作者（关联 users 表），评论属于帖子（关联 posts 表）
// 关系型数据库擅长处理这种"关联"关系
//
// 【SQLite vs MySQL】
// SQLite：数据存在一个文件里（forum.db），不需要安装服务
// MySQL：数据存在独立的数据库服务里，需要安装和启动
// 两者 SQL 语法 99% 相同，学到的知识可以直接迁移
// ============================================================

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// 创建/打开数据库文件
// 数据会持久化存储在 forum.db 文件中
const db = new Database(path.join(__dirname, '..', 'forum.db'));

// ============================================================
// 创建表结构
// ============================================================
//
// 【SQL 语法讲解】
// CREATE TABLE IF NOT EXISTS — 如果表不存在就创建
// INTEGER PRIMARY KEY AUTOINCREMENT — 自增主键（自动编号）
// TEXT NOT NULL — 文本类型，不能为空
// UNIQUE — 唯一约束（不能重复）
// DEFAULT — 默认值
// REFERENCES — 外键（关联另一个表）
//

function initDatabase() {
  // ---------- 用户表 ----------
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      email       TEXT NOT NULL,
      bio         TEXT DEFAULT '这个人很懒，什么都没写',
      avatar      TEXT DEFAULT '',
      created_at  TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);
  // 解释：
  // id          — 用户唯一编号，自动递增（1, 2, 3...）
  // username    — 用户名，UNIQUE 表示不能重复
  // password    — 密码（加密后存储，不是明文！）
  // email       — 邮箱
  // bio         — 个人签名
  // avatar      — 头像（预留字段）
  // created_at  — 注册时间，自动填入当前时间

  // ---------- 帖子表 ----------
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL,
      category_id TEXT NOT NULL,
      author_id   INTEGER NOT NULL,
      likes       INTEGER DEFAULT 0,
      views       INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);
  // 解释：
  // title       — 帖子标题
  // content     — 帖子正文
  // category_id — 板块ID（用字符串如 'study', 'campus' 等）
  // author_id   — 作者ID，关联 users 表的 id（外键）
  // likes       — 点赞数，默认 0
  // views       — 浏览量，默认 0
  // FOREIGN KEY — 外键约束，确保 author_id 必须是 users 表中存在的 id

  // ---------- 评论表 ----------
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      content     TEXT NOT NULL,
      post_id     INTEGER NOT NULL,
      author_id   INTEGER NOT NULL,
      created_at  TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);
  // 解释：
  // post_id — 评论属于哪个帖子（关联 posts 表）
  // author_id — 评论的作者（关联 users 表）

  // ---------- 收藏表 ----------
  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      post_id     INTEGER NOT NULL,
      created_at  TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )
  `);
  // 解释：
  // UNIQUE(user_id, post_id) — 同一个用户不能重复收藏同一个帖子

  // ---------- 点赞表 ----------
  db.exec(`
    CREATE TABLE IF NOT EXISTS likes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      post_id     INTEGER NOT NULL,
      created_at  TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(user_id, post_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )
  `);

  // 插入示例数据（如果表为空）
  seedData();

  console.log('数据库初始化完成');
}

// ============================================================
// 插入示例数据
// ============================================================
function seedData() {
  // 检查是否已有数据，避免重复插入
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) return;

  console.log('正在插入示例数据...');

  // 密码加密
  // bcrypt.hashSync(明文密码, 加盐轮数)
  // 加盐 = 在密码中加入随机字符串再加密，防止彩虹表攻击
  const hashedPassword = bcrypt.hashSync('123456', 10);

  // 插入用户
  // db.prepare() 预编译 SQL 语句（提高性能，防止 SQL 注入）
  // .run() 执行插入/更新/删除操作
  const insertUser = db.prepare(`
    INSERT INTO users (username, password, email, bio) VALUES (?, ?, ?, ?)
  `);

  const users = [
    ['数学小王子', hashedPassword, 'math@campus.edu', '热爱数学，乐于分享'],
    ['吃货学姐', hashedPassword, 'food@campus.edu', '吃遍全校食堂'],
    ['代码搬运工', hashedPassword, 'code@campus.edu', 'CS专业，即将毕业'],
    ['校园小喇叭', hashedPassword, 'news@campus.edu', '校园新鲜事第一时间知道'],
    ['音乐青年', hashedPassword, 'music@campus.edu', '吉他社社长，音乐是生命'],
    ['求职达人', hashedPassword, 'job@campus.edu', '分享实习和求职信息'],
  ];

  users.forEach(u => insertUser.run(...u));

  // 插入帖子
  const insertPost = db.prepare(`
    INSERT INTO posts (title, content, category_id, author_id, likes, views) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const posts = [
    ['高等数学期末复习笔记分享（附思维导图）',
     '大家好！经过一学期的整理，我把高数上下册的重点知识做了一个系统的复习笔记。\n\n主要内容包括：\n1. 极限与连续 - 重点掌握等价无穷小替换\n2. 导数与微分 - 链式法则一定要熟练\n3. 积分学 - 换元积分法和分部积分法是重点\n4. 多元函数微积分 - 偏导数和重积分\n\n每个章节我都做了思维导图和典型例题分析，希望对大家有帮助。\n\n祝大家期末考试顺利！',
     'study', 1, 128, 1532],
    ['食堂三楼新开的麻辣烫真的绝了！',
     '今天中午去试了一下三楼新开的麻辣烫档口，真的太好吃了！\n\n汤底很浓郁，食材也很新鲜，关键是价格很实惠，一大碗才15块钱。推荐搭配：土豆片、豆皮、午餐肉、宽粉、藕片。\n\n不过排队的人有点多，建议错峰去。\n\n评分：⭐⭐⭐⭐⭐\n人均：15元',
     'campus', 2, 89, 876],
    ['出大三教材一套（计算机科学与技术专业）',
     '毕业季大甩卖！出一套计算机专业的教材，基本都是九成新。\n\n书目清单：\n1. 《数据结构与算法》- 30元\n2. 《操作系统概念》- 35元\n3. 《计算机网络》- 28元\n4. 《数据库系统概论》- 25元\n5. 《编译原理》- 30元\n\n打包带走全部只要120元！有意向的留言或者私信我。',
     'trade', 3, 34, 423],
    ['在图书馆丢了一个蓝色的水杯',
     '今天下午在三楼自习室学习，走的时候忘记拿水杯了。\n是一个蓝色的保温杯，上面贴了一个小熊贴纸，对我很重要。\n\n丢失时间：5月18日下午4点左右\n丢失地点：图书馆三楼东侧靠窗位置\n\n捡到的同学请联系我，万分感谢！',
     'lost', 4, 12, 234],
    ['吉他社招新啦！零基础也能加入',
     '吉他社开始招新了！无论你是零基础小白还是弹唱大神，都欢迎加入我们！\n\n社团活动：\n- 每周三晚上7-9点集体排练\n- 每月一次校园路演\n- 不定期参加校际音乐节\n\n报名时间：即日起至5月30日\n报名地点：社团纳新摊位（食堂门口）',
     'club', 5, 67, 567],
    ['暑假实习推荐 - 字节跳动前端开发实习生',
     '岗位：前端开发实习生\n公司：字节跳动\n薪资：400元/天\n\n岗位要求：\n1. 本科及以上学历，计算机相关专业\n2. 熟悉 HTML/CSS/JavaScript\n3. 了解 React 或 Vue 框架\n4. 良好的沟通能力和团队协作能力\n\n投递方式：发送简历到 hr@example.com\n截止日期：2026年6月15日',
     'job', 6, 156, 2341],
    ['四级考试倒计时！分享我的备考经验',
     '距离四级考试还有不到一个月了，给大家分享一下备考经验。\n\n听力：每天听30分钟BBC或VOA，真题至少做3遍。\n阅读：背单词是基础，推荐墨墨背单词APP。\n写作：背诵10篇不同类型的范文。\n翻译：注意中英文表达习惯差异。\n\n加油，四级必过！',
     'study', 2, 78, 945],
    ['宿舍楼下的小橘猫生了三只小猫咪',
     '太可爱了！北苑3号楼下面的小橘猫前天晚上生了三只小猫咪，一只橘色一只白色一只黑色。\n\n今天去看的时候小猫咪已经开始睁眼了，毛茸茸的一团，简直太治愈了。\n\n有想领养的同学可以联系流浪动物保护协会。',
     'campus', 4, 203, 1876],
    ['求购一台二手iPad，预算2000左右',
     '想买一台二手iPad用来做笔记和看网课，预算2000左右。\n\n期望配置：\n- iPad Air 4 或 iPad 9代以上\n- 64G以上存储\n- 无明显划痕和磕碰\n\n有的同学请私信我，校内交易优先。',
     'trade', 1, 8, 189],
    ['篮球社周末友谊赛报名',
     '这周六下午篮球社组织一场友谊赛，欢迎所有篮球爱好者参加！\n\n时间：5月22日（周六）下午2:00-5:00\n地点：体育馆B区篮球场\n赛制：5v5全场，随机分组\n\n名额有限，先到先得！',
     'club', 3, 45, 312],
  ];

  posts.forEach(p => insertPost.run(...p));

  // 插入评论
  const insertComment = db.prepare(`
    INSERT INTO comments (content, post_id, author_id) VALUES (?, ?, ?)
  `);

  const comments = [
    ['感谢分享！笔记做得太好了，收藏了！', 1, 2],
    ['请问思维导图是用什么软件做的？想学一下', 1, 3],
    ['用的是XMind，免费的版本就够用了', 1, 1],
    ['今天去吃了，确实不错！藕片必点！', 2, 4],
    ['排队半小时了...不过闻着确实香', 2, 5],
    ['好像看到保洁阿姨捡到一个杯子放在一楼前台了，去看看', 4, 6],
    ['零基础真的可以吗？一直想学吉他', 5, 2],
    ['当然可以！我们有专门的零基础教学课程', 5, 5],
    ['已投递！请问大概多久会有回复？', 6, 1],
    ['啊啊啊啊太可爱了！想领养黑色的那只！', 8, 1],
  ];

  comments.forEach(c => insertComment.run(...c));

  console.log('示例数据插入完成');
}

// 导出数据库实例，让其他文件也能使用
module.exports = { db, initDatabase };

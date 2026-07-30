# cipher.room

> 一个端对端加密的私密聊天工具。消息在离开你的屏幕之前就已经加密，服务器只负责转发乱码，连标点符号都看不懂。
>
> 在线体验：https://cipher-room-i79s.onrender.com/

[![Release](https://img.shields.io/github/v/release/GreyD097/cipher-room?style=for-the-badge)](https://github.com/GreyD097/cipher-room/releases)
[![Stars](https://img.shields.io/github/stars/GreyD097/cipher-room?style=for-the-badge)](https://github.com/GreyD097/cipher-room/stargazers)
[![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](https://github.com/GreyD097/cipher-room/blob/master/LICENSE)

---

## 两种聊天模式

> 主页右上角的太阳/月亮图标可切换深色/浅色主题，偏好自动保存。

### 密室聊天

适合说那些不想留下任何痕迹的话。

- **端到端加密** — 消息出浏览器前就已加密，服务器看到的是一团乱码
- **仅限两人** — 第三个人连门都进不来
- **60秒自毁** — 消息发出后一分钟自动消失，像从没存在过
- **快速进入** — 固定房间号，无需创建，输密码直接进，消息保留 120 秒
- **内置 emoji** — 聊天面板自带 emoji 选择器，500+ 表情随手发
- **邀请链接** — 一键复制链接，对方点开只需输入口令
- **截屏软防护** — 切窗口自动模糊、按 PrintScreen 清空消息、禁止右键和开发者工具

### 公共聊天室

适合一群人正经聊天，或者不正经聊天。

- **系统大厅** — 默认官方聊天室，服务器启动自动创建，永远不会消失
- **消息持久化** — 保留最近 1000 条消息，新加入的人能看到历史
- **数据落盘** — 房间和消息自动保存到文件，服务器重启不丢失
- **独立昵称** — 每个房间可以设不同的名字，不用注册账号
- **最多50人** — 小型群聊，不会变成广场
- **创建需密钥** — 只有管理员能生成一次性密钥，防止房间泛滥

---

## 快速开始

```bash
# 克隆项目
git clone https://github.com/GreyD097/cipher-room.git
cd cipher-room

# 安装依赖
npm install

# 启动开发服务器（前后端一起）
npm run dev

# 或者单独启动后端
npm run server
```

访问 http://localhost:5173 即可使用。

---

## 页面导航

| 路径 | 功能 |
|------|------|
| `/` | 主页，选密室还是公共聊天室，管理安全锁 |
| `/unlock` | 进密室，输房间号和口令 |
| `/unlock?room=xxx` | 被邀请的，直接输口令 |
| `/quick` | 快速进入，固定房间号，输密码直接进 |
| `/r/:roomId` | 密室聊天中 |
| `/public` | 逛逛有哪些公共聊天室 |
| `/public/create` | 用密钥创建新聊天室 |
| `/public/:roomId` | 公共聊天室开聊 |
| `/admin` | 管理员后台 |
| `/lock` | 安全锁验证 |

---

## 技术栈

**前端**
- React 19 + TypeScript
- Vite + Tailwind CSS
- Zustand（状态管理）
- Web Crypto API（本地加密）

**后端**
- Express + WebSocket（ws 库）
- 双 Hub 架构：密室 `/ws/r/` + 公共聊天室 `/ws/p/`
- 纯内存存储，无数据库
- 令牌桶限流：30 条/秒

**加密方案**
- PBKDF2 密钥派生，250,000 次迭代
- 盐值 = 房间号的 SHA-256 哈希（确保双方密钥一致）
- AES-256-GCM 加密

---

## 部署

### Render（推荐）

已配置 `render.yaml`，推送到 GitHub 后自动部署。

环境变量：
- `ADMIN_SECRET` — 管理员口令（默认 `3068986342`）
- `NODE_ENV` — 设为 `production`

### Vercel

前端可部署到 Vercel，`vercel.json` 已配置。WebSocket 后端需要单独部署。

---

## 安全说明

> 密室聊天的安全性建立在**双方使用相同的房间号和口令**之上。如果口令泄露，第三方可以解密消息。请通过安全渠道（如面对面、Signal）分享口令。

- 密室消息在浏览器端完成加密和解密
- 服务器只接收和转发密文，无法读取内容
- 消息不写入磁盘，全部在内存中，60 秒后自动清理
- 安全锁密码使用 PBKDF2 + AES-GCM 加密存储在本地
- 连续 5 次输入错误口令将触发锁定

---

## 项目结构

```
.
├── api/                    # 后端
│   ├── app.ts              # Express 路由
│   ├── server.ts           # 服务器入口
│   ├── wsHub.ts            # 密室 WebSocket Hub
│   ├── publicHub.ts        # 公共聊天室 WebSocket Hub
│   └── index.ts            # Vercel 适配入口
├── src/
│   ├── pages/              # 页面组件
│   ├── lib/                # 加密、状态管理、工具函数
│   ├── App.tsx             # 路由配置
│   └── index.css           # 全局样式
├── render.yaml             # Render 部署配置
├── vercel.json             # Vercel 部署配置
└── package.json
```

---

## 版本历史

| 版本 | 更新内容 |
|------|----------|
| v1.5.0 | 浅色/深色主题切换、系统默认聊天室（大厅）、主页布局优化 |
| v1.4.0 | 快速进入（管理员房间）、内置 emoji 选择器、公共聊天室持久化、PWA 支持 |
| v1.3.0 | 公共聊天室、昵称系统、一次性密钥、邀请链接优化 |
| v1.2.0 | 截屏防护、界面中文化 |
| v1.1.0 | 修复限流和连接断开问题 |
| v1.0.0 | 初始版本，密室端到端加密聊天 |

---

## License

MIT

# cipher.room

> 一个端对端加密的私密聊天工具，支持两人密室和多人公共聊天室。

> An end-to-end encrypted private chat tool with 2-person cipher rooms and multi-user public chat rooms.

---

## 简介 / Introduction

cipher.room 是一个注重隐私的实时聊天工具，所有消息在发送前已在本地加密，服务器只转发密文，无法读取内容。提供两种模式：仅供两人使用的加密密室，以及可多人参与的公共聊天室。

cipher.room is a privacy-focused real-time chat tool where all messages are encrypted locally before sending. The server only relays ciphertext and cannot read the content. Two modes are available: a 2-person encrypted cipher room, and a multi-user public chat room.

---

## 功能特性 / Features

### 密室 / Cipher Room

| 功能 | 说明 |
|------|------|
| 端对端加密 | 消息在发送前用 AES-256-GCM 加密，服务器看不到内容 |
| 两人上限 | 每个房间最多 2 人，第三人被拒绝 |
| 阅后即焚 | 消息 60 秒后自动消失，离开页面即销毁 |
| 无记录存储 | 服务器不存储任何消息，全部在内存中 |
| 邀请链接 | 一键复制邀请链接，对方点击后只需输入口令 |
| 截屏防护 | 离开窗口自动模糊消息，PrintScreen 清空消息 |

### 公共聊天室 / Public Chat Room

| 功能 | 说明 |
|------|------|
| 消息持久化 | 消息保留在服务器内存中，最多 1000 条 |
| 昵称系统 | 每个房间独立设置昵称 |
| 多人聊天 | 单房间最多 50 人在线 |
| 历史记录 | 进入房间自动同步历史消息 |
| 创建密钥 | 需管理员在后台生成一次性密钥才能创建 |

### 通用 / General

| 功能 | 说明 |
|------|------|
| 安全锁 | 可设置密码，每次进入网站需验证 |
| 管理员后台 | 查看活跃房间、踢掉房间、生成创建密钥 |
| 限流保护 | 30 条/秒，超出仅丢弃消息不踢人 |

---

## 页面结构 / Pages

| 路径 | 功能 |
|------|------|
| `/` | 主页，选择密室或公共聊天室入口，管理安全锁 |
| `/unlock` | 密室入口，输入房间号和口令 |
| `/unlock?room=xxx` | 通过邀请链接进入，只需输入口令 |
| `/r/:roomId` | 密室聊天页 |
| `/public` | 公共聊天室列表 |
| `/public/create` | 创建公共聊天室（需密钥） |
| `/public/:roomId` | 公共聊天室聊天页 |
| `/admin` | 管理员后台 |
| `/lock` | 安全锁验证页 |

---

## 技术架构 / Tech Stack

### 前端 / Frontend

- React 19 + TypeScript
- Vite（构建工具）
- Tailwind CSS
- Zustand（状态管理）
- Web Crypto API（端对端加密）

### 后端 / Backend

- Express + WebSocket（ws 库）
- 双 WebSocket Hub：密室（`/ws/r/`）和公共聊天室（`/ws/p/`）
- 内存存储，无数据库
- 限流：令牌桶算法，30 条/秒

### 加密方案 / Encryption

- **密钥派生**：PBKDF2，250,000 次迭代，SHA-256
- **盐值**：房间号的 SHA-256 哈希（确保同房间同口令双方密钥一致）
- **加密算法**：AES-256-GCM
- **密钥长度**：256 位

---

## 本地运行 / Local Development

```bash
# 安装依赖
npm install

# 启动开发服务器（前端 + 后端）
npm run dev

# 单独启动后端
npm run server

# 构建生产版本
npm run build
```

默认端口：
- 前端：5173
- 后端：3001

---

## 部署 / Deployment

### Render（推荐）

本项目已配置 `render.yaml`，推送到 GitHub 后 Render 会自动部署。

环境变量：
- `ADMIN_SECRET`：管理员后台口令（默认 `3068986342`）
- `NODE_ENV`：`production`

### Vercel

前端部分可部署到 Vercel，`vercel.json` 已配置路由回退。后端 WebSocket 需要单独部署。

---

## 管理员后台 / Admin Panel

访问 `/admin`，输入管理员口令（默认 `3068986342`，可通过环境变量 `ADMIN_SECRET` 覆盖）。

功能：
- 查看活跃密室列表（在线人数）
- 查看公共聊天室列表（在线人数、消息数）
- 踢掉指定房间/聊天室
- 生成一次性创建密钥（用于创建公共聊天室）

---

## 安全说明 / Security Notes

- **端对端加密**：密室消息在浏览器端加密，服务器只转发密文
- **无持久化**：密室消息不存储，60 秒后自动销毁
- **截屏软防护**：
  - 按 PrintScreen 键清空本地消息
  - 窗口失焦/切换标签页自动模糊消息
  - 禁用右键和开发者工具快捷键
  - 消息气泡禁止选择和拖拽
- **安全锁**：可选设置，开启后每次进入网站需验证密码（存储在 localStorage，PBKDF2 + AES-GCM 加密）
- **失败锁定**：口令输入错误 5 次后锁定

---

## 项目结构 / Project Structure

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
│   │   ├── Home.tsx        # 主页
│   │   ├── Unlock.tsx      # 密室入口
│   │   ├── Room.tsx        # 密室聊天
│   │   ├── PublicList.tsx  # 公共聊天室列表
│   │   ├── PublicCreate.tsx # 创建公共聊天室
│   │   ├── PublicChat.tsx  # 公共聊天室聊天
│   │   ├── Admin.tsx       # 管理员后台
│   │   └── Lock.tsx        # 安全锁
│   ├── lib/
│   │   ├── cipher.ts       # 加密/解密逻辑
│   │   ├── store.ts        # Zustand 状态管理
│   │   ├── lock.ts         # 安全锁逻辑
│   │   └── utils.ts        # 工具函数
│   ├── App.tsx             # 路由配置
│   └── index.css           # 全局样式
├── render.yaml             # Render 部署配置
├── vercel.json             # Vercel 部署配置
└── package.json
```

---

## 版本历史 / Changelog

| 版本 | 内容 |
|------|------|
| v1.3.0 | 新增公共聊天室、昵称系统、一次性密钥、邀请链接优化 |
| v1.2.0 | 截屏防护、界面中文化 |
| v1.1.0 | 修复限流和连接断开问题 |
| v1.0.0 | 初始版本，密室端对端加密聊天 |

---

## License

MIT

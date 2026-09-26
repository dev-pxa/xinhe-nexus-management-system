# 芯河智能管理系统前端

技术框架与 `training-management-system` 保持一致：Umi Max、Ant Design、Ant Design Pro Components、TypeScript、pnpm。

## 本地开发

```bash
pnpm install
pnpm dev
```

访问 http://localhost:18082，开发代理指向后端 http://localhost:18081。

登录使用后端 Cookie 会话，默认超级管理员账号和密码均为 `admin`。本地开发前需先启动后端及其 MySQL、Redis 服务。

## 单独 Docker 部署

```bash
cp .env.example .env
./deploy.sh
```

访问 http://localhost:18080。前端 Compose 只负责 Web 容器，后端需在 `xinhe-nexus` 仓库单独启动。

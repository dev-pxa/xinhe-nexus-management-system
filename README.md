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

## 服务器与 GitHub Actions 部署

域名入口为 `http://nexus.glowlink.ren`。前端容器固定使用宿主机端口 `18080`，
容器内 Nginx 将 `/api` 代理到管理端 `18081`，将 `/api/app` 代理到 App 端 `18083`。
因此页面、管理 API 与 App API 均可通过同一个域名访问，且不会占用培训系统的
Web `80` 或 API `8080` 端口。

在共享服务器中，training 前端必须先迁移到宿主机端口 `18000`，然后由宿主机 Nginx
统一监听 `80`：Nexus 按域名转发至 `18080`，其他未匹配域名默认转发至 training `18000`。
按以下顺序首次执行：

```bash
# 1. 先发布 training-management-system，使其监听 18000，而非 80。
# 2. 在服务器安装并启用宿主机 Nginx：
sudo apt-get update && sudo apt-get install -y nginx
sudo rm -f /etc/nginx/sites-enabled/default
sudo cp deploy/nginx/00-training-default.conf /etc/nginx/conf.d/
sudo cp deploy/nginx/nexus.glowlink.ren.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx
```

如服务器由面板或负载均衡器管理 Nginx，请在对应入口创建同等规则，而不要将前端容器
改为占用 `80`。

本机通过 SSH 发布：

```bash
chmod +x scripts/deploy-ssh.sh
scripts/deploy-ssh.sh
```

GitHub Actions 在 `master` 分支推送时自动发布。配置本项目专用 SSH Secrets：
`NEXUS_SSH_HOST`、`NEXUS_SSH_USER`、`NEXUS_SSH_PORT`、`NEXUS_SSH_PRIVATE_KEY`。
如需覆盖默认目录，设置 Repository Variable `NEXUS_FRONTEND_DEPLOY_PATH`；默认目录为
`/opt/xinhe-nexus-management-system`。

GitHub Actions 会在 Runner 上缓存依赖并构建 `dist`，服务器只构建 Nginx 运行镜像，避免
服务器重复执行 pnpm 安装与 Webpack 编译。本机执行 `scripts/deploy-ssh.sh` 时仍使用完整
Dockerfile 构建，不依赖预先生成的 `dist`。

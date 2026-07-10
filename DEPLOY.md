# LifeWiki 部署手册（免费线上方案）

**架构**
```
浏览器
  ├── 前端 Next.js ──────► Vercel (Hobby, 免费)
  └── 后端 Strapi ──────► Oracle Always-Free VM (Ubuntu ARM, 永久免费)
                              └── Docker (Strapi + SQLite)
                                    └── nginx + Let's Encrypt SSL (443→1338)
```
- 前端（Vercel）：纯静态/Serverless，免费。
- 后端（Oracle VM）：一台永远免费的 ARM 虚拟机（4 OCPU / 24 GB），用 Docker 跑 Strapi，SQLite 数据落在持久卷里，重启不丢。
- 两者通过 `STRAPI_URL` + CORS 互通。

---

## 0. 前提
| 需要 | 说明 |
|---|---|
| Oracle Cloud 账号 | 免费注册，需绑定信用卡（仅验证，Always-Free 不收费） |
| Always-Free VM | 创建 Ampere A1（ARM）实例：**4 OCPU / 24 GB RAM / 200 GB 启动盘**，镜像选 **Ubuntu 22.04/24.04** |
| 域名 | 任意域名，把一条 A 记录（如 `api.yourdomain.com`）指向 VM 公网 IP |
| OCI 安全列表 | 在 VCN 的 Security List / NSG 放行入站 **22 / 80 / 443**（0.0.0.0/0） |
| Vercel 账号 | 免费 Hobby，用 GitHub 登录 |
| GitHub 仓库 | 已推送：`github.com/gamesushi/lifewiki`（本仓库） |

> Oracle 控制台里的「安全列表」不放行 80/443，外界就访问不到——这是最常见的卡点。

---

## 1. 后端：Oracle VM 上部署 Strapi

SSH 进 VM 后，一条命令完成全部安装（Docker / nginx / certbot / 克隆 / 构建 / 启动 / 配 SSL）：

```bash
sudo apt-get update -y && sudo apt-get install -y git curl
git clone https://github.com/gamesushi/lifewiki.git /tmp/lw && \
  bash /tmp/lw/scripts/setup-oracle-vm.sh \
    --domain api.yourdomain.com \
    --cors https://lifewiki.yourdomain.com \
    --email you@yourdomain.com
```

脚本会自动：
1. 装 Docker（含 compose 插件）并把当前用户加入 docker 组；
2. 装 nginx + certbot；
3. `git clone` 仓库到 `/opt/lifewiki`；
4. 用 `openssl rand` 生成**随机密钥**写入 `/opt/lifewiki/.env`（gitignored，不在仓库里）；
5. `docker compose up -d --build` 构建并启动 Strapi（首次构建约 2–5 分钟）；
6. 写 nginx 反代、申请 Let's Encrypt 证书并强制 HTTPS。

完成后打开 **`https://api.yourdomain.com/admin`** → **首次访问会让你注册管理员账号**（新库无用户）。

验证：
```bash
cd /opt/lifewiki && sudo docker compose ps
curl -sI https://api.yourdomain.com/api/channels | head -1   # 期望 200
```

### 保留本地已有数据（可选）
如果本机 `api/.tmp/data.db` 里已有频道/Block，想搬到线上：
```bash
# 在 VM 上，停容器后把文件塞进命名卷
sudo docker compose stop strapi
sudo docker run --rm -v lifewiki_strapi-data:/data -v $PWD/api/.tmp:/src \
  busybox cp /src/data.db /data/data.db
sudo docker compose start strapi
```
（`.env` / 密钥不会进仓库，迁移的是你自己的数据文件。）

---

## 2. 前端：Vercel 部署

1. Vercel 控制台 **Add New > Project**，导入 `gamesushi/lifewiki`。
2. **Root Directory** 设为 **`web`**（仓库是 monorepo，前后端分目录）。
3. Framework 会自动识别 Next.js（`web/vercel.json` 已声明）。
4. **Environment Variables** 添加：
   | 变量 | 值 |
   |---|---|
   | `STRAPI_URL` | `https://api.yourdomain.com` |
   | `REVALIDATE_SECRET` | 任意随机串 |
5. Deploy。成功后 Vercel 给一个 `*.vercel.app` 域名。

> 构建期不需要后端可达——前端所有 API 调用都是运行时 fetch，`STRAPI_URL` 在运行时注入。
> 想用自己域名：Vercel 里 Add Domain，按提示加 CNAME 即可。

---

## 3. 打通前后端
- 前端 `STRAPI_URL` = 你的 API 公网地址（步骤 2 已设）。
- 后端 `CORS_ORIGINS` = 前端域名（setup 脚本的 `--cors` 已设，如 `https://lifewiki.yourdomain.com`）。
- 改 CORS 后重启：`cd /opt/lifewiki && sudo docker compose restart strapi`。

---

## 4. 环境变量速查
| 变量 | 在哪设 | 作用 |
|---|---|---|
| `APP_KEYS` 等 6 个密钥 | VM 的 `/opt/lifewiki/.env` | Strapi 运行必需，脚本随机生成 |
| `DATABASE_CLIENT` / `DATABASE_FILENAME` | VM `.env` | SQLite 文件位置（卷内 `.tmp/data.db`） |
| `CORS_ORIGINS` | VM `.env` | 允许跨域的前端域名，逗号分隔 |
| `STRAPI_URL` | Vercel 环境变量 | 前端指向的后端地址 |
| `REVALIDATE_SECRET` | Vercel 环境变量 | 按需重新验证密钥 |

---

## 5. 更新线上版本
代码 push 到 GitHub 后：
```bash
# 后端（VM 上）
cd /opt/lifewiki && sudo git pull && sudo docker compose up -d --build
# 前端：Vercel 自动从 GitHub 重新部署（或在控制台 Redeploy）
```

---

## 6. 注意事项 / 坑
- **SQLite 并发**：单实例够用；若以后要做写入高峰，可换 Postgres（Strapi 已支持，改 `DATABASE_CLIENT` + 连接串）。
- **Oracle 实例回收**：Always-Free 实例长时间不活跃可能被 Oracle 回收（少见），建议偶尔登录一下；数据在持久盘，重建后重挂即可。
- **`/admin` 暴露公网**：任何人可访问登录页。若想限制，可在 nginx 加 IP 白名单或改 `/admin` 路径——需要时我帮你加。
- **Secrets 不要提交**：`.env`、`.env.*` 已被 `.gitignore` 排除，仅 `.env.example` 模板进仓库。

---

## 7. 成本
| 组件 | 费用 |
|---|---|
| Oracle Always-Free VM (4 OCPU/24GB) | **永久免费** |
| Let's Encrypt 证书 | 免费 |
| Vercel Hobby | 免费（有带宽/构建额度） |
| 域名 | 看你注册商（约 ¥50–100/年） |
| **合计** | 仅域名年费，运行零成本 |

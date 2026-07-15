# Bio Heroes 部署交接 v1.0

2026-07-15 · 生产环境:`https://bio.socialcontract.capital`(国内直连)

---

## 1. 架构现状

```
开发(Mac)── npm run build → dist/(纯静态 SPA + PWA,约 1.5MB)
   │
   └─ rsync → VPS(搬瓦工 CN2 GIA · 67.230.186.254 · Debian 12)
        Caddy 2(自动 HTTPS,配置源:spacev repo 的 deploy/Caddyfile)
        ├─ socialcontract.capital       → /var/www/spacev(SpaceV 主站,勿动)
        ├─ bio.socialcontract.capital   → /var/www/bio(本游戏)
        └─ 主站 /api/* → 127.0.0.1:3001(阅读计数,与游戏无关)

DNS:Cloudflare 仅解析(灰云 DNS only,不套 CDN——国内直连是刻意决策,勿开橙云)
Vercel(bio-heroes.vercel.app):保留作海外镜像/预览,git push 仍自动部署,互不影响
```

## 2. 日常部署(唯一新增步骤)

```bash
npm run deploy        # = vite build && rsync dist/ → VPS /var/www/bio/
```

- 前提:SSH 免密登录,只需配置一次:`ssh-copy-id root@67.230.186.254`(否则每次输 root 密码)
- 只影响 `/var/www/bio`,不碰主站
- **给 Claude Code 的约定:改完代码、测试通过后,跑 `npm run deploy` 发布;不要修改 VPS 上的其他目录和服务**

### 验证发布成功

```bash
curl -sI https://bio.socialcontract.capital | head -3   # HTTP/2 200
```

### PWA 缓存提醒

sw.js 会缓存旧版本:发版后玩家端要**二次访问**(或强刷)才见新版;HTML 缓存 5 分钟(Caddy max-age=300),带 hash 的 /assets/* 永久缓存,不用操心。

## 3. Caddy 配置归属

bio 子域的 server block 写在 **spacev repo**:`Personal website dev/spacev/deploy/Caddyfile`。
改了它之后同步到 VPS:

```bash
scp "/Users/YangYANG/Projects/Personal website dev/spacev/deploy/Caddyfile" root@67.230.186.254:/etc/caddy/Caddyfile
ssh root@67.230.186.254 "caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy"
```

## 4. 未来:账号系统 + 对战系统预案

**容量结论:同时 10 人在线,当前 VPS 绰绰有余。** 回合制卡牌对战的消息量是 KB/s 级,
一个 Node WebSocket 服务 + SQLite 常驻内存 <50MB;静态托管本身近乎零负载。

- **方案 A(推荐,国内友好)**:自托管,照抄主站 counter 模式——
  Node 服务(WebSocket + better-sqlite3)监听 `127.0.0.1:3002`,systemd 常驻,
  Caddyfile 的 bio block 里加:

  ```caddy
  handle /api/* {
      reverse_proxy 127.0.0.1:3002
  }
  ```

  账号起步用"房间码 + 昵称"即可(亲子/朋友对战不需要真账号);
  真要密码登录时用成熟方案(argon2 哈希),HTTPS 已就位。

- **方案 B(CLAUDE.md 原计划)**:Supabase Auth + Realtime——开发省事,
  但国内直连 Supabase 不稳,与"国内可玩"目标冲突,选它之前先在无梯子环境实测。

- **注意**:数据库用 SQLite,别上 Postgres(小内存 VPS 没必要);
  上了对战服务后给 VPS 加每日备份(参考主站 counter/backup.sh 模式)。

## 5. 排障速查

| 症状 | 排查 |
|---|---|
| 打不开 / 证书错误 | Cloudflare 里 bio 的 A 记录必须是灰云;VPS 80/443 放行;`journalctl -u caddy -n 50` |
| 部署了但页面没变 | PWA 缓存:强刷 / 等 5 分钟;确认 rsync 无报错 |
| rsync 报 Permission denied | root 密码错或没配 ssh-copy-id |
| 以后 /api/* 502 | 对战服务没起:`systemctl status <服务名>` |

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

## 4. PvP 对战 + 云存档:已决架构

> 状态(2026-07-17):架构**已定**,引擎 de-fork 进行中,中继尚未开工。
> 本节此前是"预案"并列了 Supabase 作为选项 B —— 那个选择**已经关闭**(见下)。

**容量结论:同时 10 人在线,当前 VPS 绰绰有余。** 回合制卡牌对战的消息量是 KB/s 级,
一个 Node 服务 + SQLite 常驻内存 <50MB;静态托管本身近乎零负载。

### 4.1 已决方案:房间码 + 哑中继 + host 权威

- **自托管**,照抄主站 counter 模式:Node 服务监听 `127.0.0.1:3002`,systemd 常驻。
  (**不选 Supabase**:国内直连不稳,与"国内可玩"这个刻意决策直接冲突。此路已关闭,
  别再把它当活选项讨论。)
- **传输用 WebSocket**,不用 SSE / 轮询。理由不是偏好,是 `public/sw.js`:
  它只对 navigate/text-html 走 network-first,**其余 GET 全部落进 cache-first** ——
  轮询会被永久重放(客户端冻在第一帧),SSE 会把无限流 tee 进 `cache.put`。
  WS 握手根本不触发 SW 的 fetch 事件,天然免疫。
  (已另外加了 `/api/*` 旁路 + CACHE_NAME v2 作为云存档的保险,见 commit `396db5a`;
   守卫在 `scripts/test-sw-api-bypass.mjs`。)
- **依赖选型**:中继**实际用了 `ws`**(`relay/server.js` import `WebSocketServer`,`relay/package.json` 有 `ws`),
  不是手写 WS upgrade。⚠️ 曾设想「零依赖」(只用 `node:http`/`crypto`/`net` 手写)以贴合前端零服务端依赖 +
  绕开 CI 的坑(`ci.yml` 只在根目录 `npm ci`,中继若自带 `package.json` 其依赖根本不被安装)——
  但中继是**独立部署**的(`npm run deploy:api` 会 `npm ci --omit=dev` 装 `ws` 再 restart,不走前端 CI),
  故 `ws` 没问题;**前端 bundle 仍零服务端依赖**。
- **host 权威**:只有 host 挂载 `useBattle` 并掷骰(全项目 52 处 `Math.random`,
  `BattleScreen` 里 0 处)。所以**不需要拆引擎、不需要 RNG 确定性**。
- 场景:齐齐 vs 远方朋友(跨网络)· 实时 · **公平模式**(双方全卡池自由组卡)。
- 答题:同题抢答,**中性加成**(先答对者拿 +1能量/抽卡/回血/科学家印记)。
  streak 按方计分,奖励中性;**各端只把自己的答题结果写进本地 Leitner**
  (host 不得替双方写 —— 那会用朋友的答题污染齐齐的间隔重复计划表)。

### 4.2 三条不变量(违反任何一条 = 设计错了,不是 bug)

1. **中继永远不懂游戏规则**。它只转发字节。它不知道什么是卡、什么是回合。
2. **PvP 不产生任何持久化收益**。host 是别人家小孩的浏览器 —— 它说"我赢了"就发
   金币 = 凭空印钱。
   ⚠️ 现成的正确样板在 `App.jsx:135`(测试场的零收益守卫),**照抄它的 ref 写法**:
   它读的是 `testArenaConfigRef.current`(`App.jsx:89-90` 在 deps 外镜像),因为
   `handleExitBattle` 的 deps 只有 `[economy]`(`App.jsx:295`)。
   **PvP 守卫若写成普通 state 会是 stale 的,然后静默不触发** —— 不报错、战斗照常
   结束、金币照发,而且在 dev 里看不出来,除非真打完一局 PvP。
   另外注意:走 deckBuilder 漏斗进来的 PvP **默认落在 `App.jsx:283-286`**
   (calculateBattleReward + claimBattleReward)—— 那是 fall-through 分支,不是边缘情况。
3. **不校验卡牌所有权**(公平模式)。因此 PvP 不需要服务端收藏系统。
   `DeckBuilder.jsx:75` 已经免费支持:`collection` 传 `undefined` 即给出全卡池。

### 4.3 两条部署纪律(会毁数据的那种)

- ☠️ **存档/房间数据绝不能放 `/var/www/bio/`**。
  `npm run deploy` = `rsync -az --delete dist/ …:/var/www/bio/` —— `--delete` 让那个
  目录成为 `dist/` 的**精确镜像**。任何放在那儿的 DB 会被下一次前端热修**静默销毁**,
  无报错、无备份。且 bio 的 deploy 不像主站(`spacev/Makefile:30`)有 pre-delete 检查。
  正确样板:`counter/server.ts:14` 的 `DB_PATH = resolve(HERE, "views.db")` —— 相对
  **服务端文件**解析,落在 `/var/www` 之外。
- **`deploy:api` 必须与 `deploy` 分开**。重启 Node = 打断正在进行的对局。前端热修
  不该踢掉两个正在打的小孩。

### 4.4 开工前必须知道的三件事

- **Caddy 的改动在另一个仓库**:bio 的 server block 写在
  `Personal website dev/spacev/deploy/Caddyfile`,用 scp + `caddy validate && systemctl reload`
  发布 —— **`npm run deploy` 两头都不管**,PvP 的部署跨两个仓库。
- **今天 `GET /api/rooms` 返回的是 index.html + HTTP 200**,不是 404、不是 502。
  bio block 用裸 `root`/`try_files {path} /index.html`/`file_server`,没有 `handle` 块。
  → 第一次调试会看到**误导性的 JSON 解析错误**,不是连接失败。
  加 `/api/*` 需要先把该 block 重构成 `handle` 块(主站 block 里有现成模板)。
  ⚠️ 因此第 5 节"以后 /api/* 502"那一行描述的现象,在重构之前**不可能发生**。
- **dev 下 `/api/*` 会 404**:`vite.config.js` 没有 `server.proxy`。PvP 在本地跑起来
  之前必须先加 —— 否则会重演"在 localhost 上不工作"的老戏码(那次是 dev 配置问题,
  不是真 bug)。

### 4.5 云存档(P2,排在 PvP 之后)

服务端挂进 PvP 同一个 Node 进程。**不做密码账号**(<20 人熟人场景零收益、7 岁记不住、
且新增丢档路径);`credentials` 分表预留 —— 日后要加密码 = 插一行,saves 表零迁移。

- **恢复码 = 4 个中文词**(40bit),**不能用 6 位数字**(20bit 可枚举,而
  **写路径被枚举 = 存档被覆盖销毁**)。
- **自动推(本地→云)+ 手动拉(云→本地)**,绝不自动双向合并。本地是唯一真相源,
  云只是镜像 → VPS 全挂时游戏照常。脏判定用 hash 比对,不用 setItem 触发。
  LWW 冲突时**默认按钮必须是无损选项**。
- 数据库用 SQLite,别上 Postgres(小内存 VPS 没必要);上线后加每日备份
  (参考主站 `counter/backup.sh`)。

### 4.6 备选架构:服务器权威(前后端分离)—— 已评估,未采用(2026-07-18)

> **备查记录。** 当前 PvP 走 host 权威(§4.1),host 迁移作为韧性补丁。这一节存的是**评估过但
> 没走的那条路**,以及**什么条件下该翻案**——将来定位若从「熟人对战」变了,第一个来看这里。

**是什么**:引擎跑在**服务器**上(不是某个玩家的浏览器),两个玩家都是瘦客户端,都发 intent、
都收快照,谁都不是权威。这是竞技游戏的教科书模型。与 host 权威的**唯一实质区别是「引擎那个
方块在谁手里」**——浏览器 vs 服务器,所有优劣从这一个位置推出来。

**两种架构对比**:

| 维度 | host 权威(现在) | 服务器权威(前后端分离) |
|---|---|---|
| 引擎跑在哪 | 其中一个玩家的浏览器 | 服务器 |
| 中继/服务器 | 哑的,只转字节,零游戏逻辑 | 智能,跑完整引擎 |
| 作弊/隐藏信息 | host 浏览器持双方手牌,靠纪律隐藏 | 服务器持双方手牌,**架构级真隐藏** |
| 掉线韧性 | **双方 socket 闪断都可重连**(2026-07-22 修;此前 host 断=整局死);host **刷页面**仍需 host 迁移 | 任一方断,服务器仍持全局,都能重连 |
| 延迟公平 | host 零延迟、guest 全程往返(回合制下无感) | 双方对称往返 |
| 引擎抽取成本 | **零**(引擎留在 React 里,host 权威就是为省这个) | **巨大**:把 2400 行 React 纠缠的 useBattle 拆成无头引擎 |
| 服务器崩溃爆炸半径 | 只杀正在进行的对局,引擎 bug 进不了服务器 | 杀掉**所有**对局+丢状态,引擎全部 bug 面搬上服务器 |
| 国内可玩 | 一样(同 VPS + Caddy) | 一样 |

**为什么没选(对本项目)**:
1. **引擎抽取成本是整个 PvP 最大的单块工作**。`useBattle` 是 2400 行、和 React 深度纠缠的 hook
   (useReducer/useState/useRef/一堆 useEffect,effect 把回合流转编码进渲染时序)。要它跑服务器得
   拆成无头、Node 可跑、时序确定的引擎——而当初选 host 权威**就是为了绕开它**。且这项目已被状态
   时序 bug 反复烧过(假绿、dispatch 不 eager),重写最复杂的文件上服务器 = 重踩那些坑,踩在「崩一次
   杀所有对局」的服务器上。
2. **服务器权威唯二真优势在熟人场景近乎无用**:防作弊对「齐齐 vs 朋友」值≈0;掉线韧性用**便宜得多的
   host 迁移**补大半(guest 浏览器本就跑同一份 useBattle,中继顺手托管最新热备,host 掉线时把权威交给
   guest——见 §4.1)。
3. **它把引擎 bug 面搬上服务器**,一崩杀掉所有对局,正好抵消了「哑中继不可能有游戏 bug」这个红利。

**☠️ 什么条件下该翻案(触发条件)**:如果定位从「熟人对战、<10 人」变成 **公开匹配 / 排位 / 跟不信任
的陌生人打**——那作弊防护和真隐藏信息从「值 0」变成「必需」,服务器权威就值那笔抽取成本了。
在那之前,host 权威 + host 迁移是对的。

**翻案时能复用的**:de-fork(side 参数化)、wire.js(mirror/viewpoint/intent 格式)、中继的房间配对纯核心
都转移;变的是中继从「盲转」改成「跑引擎」,以及那笔引擎抽取。**不是全损,但引擎抽取不可避免。**

## 5. 排障速查

| 症状 | 排查 |
|---|---|
| 打不开 / 证书错误 | Cloudflare 里 bio 的 A 记录必须是灰云;VPS 80/443 放行;`journalctl -u caddy -n 50` |
| 部署了但页面没变 | PWA 缓存:强刷 / 等 5 分钟;确认 rsync 无报错 |
| rsync 报 Permission denied | root 密码错或没配 ssh-copy-id |
| 以后 /api/* 502 | 对战服务没起:`systemctl status <服务名>`。⚠️ **在 Caddy 的 bio block 重构成 `handle` 块之前,这个 502 不可能出现** —— 现在 `/api/*` 会被 `try_files` 兜成 index.html + 200,症状是客户端 JSON 解析报错。详见 §4.4 |

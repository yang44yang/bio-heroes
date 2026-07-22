# relay — Bio Heroes PvP 哑中继

host↔guest 之间**盲转字节**的 WebSocket 中继。零游戏逻辑：它不懂卡、回合、side，只知道
`{host, guest}` 两个槽位 + 把一方的帧原样转给另一方。见 `DEPLOY.md §4`。

## 架构（为什么这么哑）

- **host 权威**：只有 host 的浏览器跑引擎（`useBattle`）。中继不跑引擎、不持游戏状态。
- **中继崩一次只影响当前对局**：它零游戏状态，重启只断掉正在进行的 socket（对局本就短暂）。
- **零 `src/` import、零 `wire.js`**：中继一次都不 `JSON.parse` 对端消息体。连「齐齐出的是攻击
  还是出牌」都不知道 —— `smoke/run.mjs` 用一个**非法 JSON 探针帧**证明这一点（能逐字节转过去
  = 中继确实没解析）。

## 目录

```
lib/          纯函数核心（零 ws / 零 socket / 零 src import，node 可裸测）
  roomCode.js   4 位房间码：字母表(32=A-Z去OI + 0-9去01)、生成、归一、校验
  rooms.js      房间注册表状态机：create/join/drop/reconnect/reap → 效果描述符
  control.js    握手解析：URL query → {role, code?, token?}
  routing.js    peersFor：一个 conn 在同房间的对端（不含自己、跨房隔离）
server.js     IO 外壳：http + WebSocketServer + 心跳 + 信号 + 崩溃处理
smoke/run.mjs 本地冒烟（用 ws，起真 server + 双客户端 + 盲转探针）
deploy/       systemd unit
```

纯核心的守卫在 `../scripts/test-relay-{roomcode,rooms,control}.mjs`（进主 `npm test`，不需 ws）。

## 协议

WS 端点 `/api/relay`，握手信息全在 URL query：

| 连接 | URL | 中继回 |
|---|---|---|
| host 建房 | `?role=host` | `{t:'relay.created', code, token}` |
| host 重连 | `?role=host&room=CODE&token=T` | `{t:'relay.resumed'}`；guest 收 `{t:'relay.peer-joined'}` |
| guest 加入 | `?role=guest&room=CODE` | `{t:'relay.joined', token}`；host 收 `{t:'relay.peer-joined'}` |
| guest 重连 | `?role=guest&room=CODE&token=T` | `{t:'relay.resumed'}`；host 收 `{t:'relay.peer-joined'}` |

- ☠️ **token 是「建房 vs 重连」的唯一闸门**：无 token 的 `role=host` 一律按建房处理，
  **客户端给的 `room` 会被忽略**（`?role=host&room=ABCD` 照样铸新码）——否则客户端就能自选
  房间码建房（占码/碰撞攻击）。有 token 则必须带合法 `room`，凭证真伪由 `rooms.reconnect` 逐字校验。
  历史坑：host 分支曾无条件返回 `{code:null, token:null}` → host 闪断重连带不出凭证 →
  被当成新 host **静默铸新房**，原房里的 guest 从此一帧收不到（真机实测 4BZU → QWJV，还漏孤儿房）。
- 出站控制帧一律 `t: 'relay.*'` 命名空间（wire 的 `t` 只会是 `sync`/`intent`/`resume`，永不撞）。
- 掉线：中继通知对端 `{t:'relay.peer-left'}`，保留槽位 token 等重连。
  ⚠️ 僵尸 socket 的**迟到 close**（重连已完成、旧 socket 的 close 才到）**不发** peer-left ——
  对端其实已经回来了，发了会让 UI 永久显示「对手跑了」。
- 拒绝：`{t:'relay.error', reason}` + close。`reason ∈ full|no-room|bad-role|bad-room|bad-token|…`
  ⚠️ 拒绝发生在 **WS 握手之后**（客户端的 `onopen` 已经触发过）→ 客户端收到 `relay.error`
  必须**停止重连**（同一个 URL 重试必然同样被拒；不停会退化成每 500ms 一次的永久循环）。
- **游戏帧（sync/intent/resume）**：中继逐字节盲转，不改不看。

⚠️ **动过 `control.js` / `rooms.js` / `server.js` 请跑 `npm run smoke`** —— 主 CI 的四套纯函数测试
覆盖不到 server.js 的接线（`if (hs.token) → reconnect` 那条分支）。

## 本地跑

```bash
cd relay && npm install      # 唯一依赖 ws（零运行时依赖）
npm start                    # 监听 127.0.0.1:3002
npm run smoke                # 冒烟（SMOKE_PORT 可改端口，默认 3999）
```

本地前端经 `vite.config.js` 的 `^/api/` 代理（`ws:true`）连到 3002。

## 部署（⚠️ 与前端 deploy 分开）

- 中继住 **`/opt/bio-relay`**，**不是 `/var/www/bio`**（后者是 `npm run deploy` 的 rsync --delete
  镜像，放这里会被静默销毁，DEPLOY.md §4.3）。
- **`deploy:api` 必须与 `deploy` 分开**：重启 Node = 打断正在进行的对局，前端热修不该踢掉两个
  正在打的小孩（DEPLOY.md §4.3）。根 `package.json` 的 `deploy:api` 单独跑。
- systemd：`deploy/bio-relay.service` → `/etc/systemd/system/`，`systemctl enable --now bio-relay`。
- Caddy（在 spacev 仓库）：bio block 加 `handle /api/* { reverse_proxy 127.0.0.1:3002 }`
  （Caddy v2 自动透传 WS Upgrade）。`npm run deploy` 两头都不管，PvP 部署跨两仓库。

## host 迁移（第 4 步，中继零改动）

host 掉线 = 整局死，除非做 **host 迁移**：host 平时额外发一份完整权威热备给 guest 缓存（经中继
盲转，中继不解析）；host 掉线时 guest 用热备在自己浏览器接管引擎，通过重连通道续上。
**中继眼里「谁跑引擎」不存在** —— 迁移完全是第 4 步 host adapter 的事，中继这套代码零改动。

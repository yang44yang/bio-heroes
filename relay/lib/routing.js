// routing.js —— 盲转的路由核心。**纯函数**：给一个 connId，返回它在同一房间里的对端 connId。
//
// ## 这是「哑中继」的心脏（PvP 第 3 步）
// 中继收到一帧游戏消息（sync/intent/resume 的不透明字节），唯一要做的判断是「转给谁」。
// 答案完全由**连接所属的房间 + 角色**决定，与消息内容无关 —— 中继从不 JSON.parse 消息体。
//
// ## ☠️ 两条不变量，各对应一个恶性 bug
//   ① **不含自己**：peersFor(host) 必须是 [guest]，绝不含 host 自己。含了 → host 发的 sync
//      回声给自己、guest 发的 intent 回声给自己。回声在回合制里是灾难（自己给自己重放动作）。
//   ② **跨房隔离**：A 房的 connId 永远不路由到 B 房。破了 → 齐齐的动作漏进陌生人的对局。
//   这两条不是「小心就好」，是 test-relay-rooms 的变异靶子（返回全体成员 / 全局广播 → 红）。
//
// 本模块零 import，只读传入的 registry 结构。

import { HOST, GUEST } from './rooms.js'

/**
 * connId 在同一房间里的对端（活连接）。
 * 2 人房里就是「另一个槽位」。返回数组是为了：对端不在线时返回 []（外壳自然不转发，帧被丢弃 ——
 * 这是对的：对端掉线时的帧无处可去，等它重连后由 host adapter 的 resume 补，不是中继缓存）。
 * @returns {string[]} 0 或 1 个对端 connId
 */
export function peersFor(reg, connId) {
  const entry = reg.byConn.get(connId)
  if (!entry) return []
  const room = reg.rooms.get(entry.code)
  if (!room) return []

  const peerRole = entry.role === HOST ? GUEST : HOST
  const peer = room[peerRole]
  // 对端槽位存在且有活连接才转发；且**绝不把帧转回发送者自己**（peerRole ≠ entry.role 已保证，
  // 但显式排除 connId 本身，防将来有人把 host/guest 存进同一 connId 时的自环）。
  if (peer && peer.connId != null && peer.connId !== connId) return [peer.connId]
  return []
}

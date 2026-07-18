// HostBattleScreen.jsx —— host / 单机的 battle 数据源 wrapper（PvP 第 4b 步）。
//
// 把「引擎 + 手牌」的 hook 调用（useBattle + 两个 useHand）收到这一层，作为 prop 传给 BattleScreen
// 的表现层。**单机和 host 走同一条真引擎路**（它俩本来就一样，都跑 useBattle 掷骰）。
//
// guest（4d）会有一个对称的 GuestBattleScreen —— 用 useGuestBattle 供**同形状**的 battle
// （数据来自快照、方法发 intent），渲染同一个 BattleScreen。这正是把 battle 提成 prop 的目的。
//
// ⚠️ 零行为变化：这三个 hook 调用原本就在 BattleScreen 顶部（:34-36），只是上移一层、结果 prop 下传。

import { useBattle } from '../hooks/useBattle'
import { useHand } from '../hooks/useHand'
import BattleScreen from './BattleScreen'

export default function HostBattleScreen(props) {
  const battle = useBattle()
  const playerHand = useHand(props.playerDeckCards, 'player')
  const enemyHand = useHand(props.enemyDeckCards, 'enemy')
  return <BattleScreen {...props} battle={battle} playerHand={playerHand} enemyHand={enemyHand} />
}

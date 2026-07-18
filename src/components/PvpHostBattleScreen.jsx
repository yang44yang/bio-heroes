// PvpHostBattleScreen.jsx —— PvP host 的战斗数据源 wrapper（PvP 第 4c 步；4e 接事件环）。
//
// HostBattleScreen（单机/host 同源）的 PvP 版：同样调 useBattle + 两个 useHand，多做三件事：
//   · usePvpHost —— 推快照 / 收 intent / 敌方回合 bootstrap / **事件环发射**（返回包装后的
//     pvpBattle：play/attack 出结果时自动铸事件进环 → BattleScreen 必须渲染这个包装版，
//     host 自己的动作才会被 guest 看见）
//   · floatBridgeRef —— BattleScreen 把 showFloat 借出来，host 给 guest 的攻击放浮字
//   · remoteEnemy —— 关 useAITurn + 关开局替敌方出牌
//
// 里程碑简化：双方用默认测试卡组。onExit 直接回大厅、不走 App.handleExitBattle → 结构上零收益。

import { useRef } from 'react'
import { useBattle } from '../hooks/useBattle'
import { useHand } from '../hooks/useHand'
import { usePvpHost } from '../hooks/usePvpHost'
import BattleScreen from './BattleScreen'
import { playerTestDeck, enemyTestDeck } from '../data/testDecks'

export default function PvpHostBattleScreen({ client, gameFrameRef, onExit }) {
  const battle = useBattle()
  const playerHand = useHand(playerTestDeck, 'player')
  const enemyHand = useHand(enemyTestDeck, 'enemy')
  const floatBridgeRef = useRef(null)
  const pvpBattle = usePvpHost({ enabled: true, client, gameFrameRef, battle, playerHand, enemyHand, floatBridgeRef })
  return (
    <BattleScreen
      battle={pvpBattle}
      playerHand={playerHand}
      enemyHand={enemyHand}
      playerDeckCards={playerTestDeck}
      enemyDeckCards={enemyTestDeck}
      remoteEnemy
      floatBridgeRef={floatBridgeRef}
      onExit={onExit}
    />
  )
}

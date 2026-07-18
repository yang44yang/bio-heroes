// PvpHostBattleScreen.jsx —— PvP host 的战斗数据源 wrapper（PvP 第 4c 步）。
//
// HostBattleScreen（单机/host 同源）的 PvP 版：同样调 useBattle + 两个 useHand，多做两件事：
//   · usePvpHost —— 推快照 / 收 intent / 敌方回合 bootstrap（AI 的位置由远端真人取代）
//   · remoteEnemy —— 关 useAITurn + 关开局替敌方出牌
//
// 里程碑简化：双方用默认测试卡组（PvP 卡组选择漏斗 = 后续打磨）。
// ⚠️ onExit 直接回大厅、**不走 App.handleExitBattle** → 结构上不触碰发奖路径
//   （4f 零收益守卫的完整版后补；本路径天然零收益）。

import { useBattle } from '../hooks/useBattle'
import { useHand } from '../hooks/useHand'
import { usePvpHost } from '../hooks/usePvpHost'
import BattleScreen from './BattleScreen'
import { playerTestDeck, enemyTestDeck } from '../data/testDecks'

export default function PvpHostBattleScreen({ client, gameFrameRef, onExit }) {
  const battle = useBattle()
  const playerHand = useHand(playerTestDeck, 'player')
  const enemyHand = useHand(enemyTestDeck, 'enemy')
  usePvpHost({ enabled: true, client, gameFrameRef, battle, playerHand, enemyHand })
  return (
    <BattleScreen
      battle={battle}
      playerHand={playerHand}
      enemyHand={enemyHand}
      playerDeckCards={playerTestDeck}
      enemyDeckCards={enemyTestDeck}
      remoteEnemy
      onExit={onExit}
    />
  )
}

// PvpHostBattleScreen.jsx —— PvP host 的战斗数据源 wrapper（PvP 第 4c 步；4e 接事件环；选卡组步）。
//
// HostBattleScreen（单机/host 同源）的 PvP 版：同样调 useBattle + 两个 useHand，多做三件事：
//   · usePvpHost —— 推快照 / 收 intent / 敌方回合 bootstrap / **事件环发射**（返回包装后的
//     pvpBattle：play/attack 出结果时自动铸事件进环 → BattleScreen 必须渲染这个包装版，
//     host 自己的动作才会被 guest 看见）
//   · floatBridgeRef —— BattleScreen 把 showFloat 借出来，host 给 guest 的攻击放浮字
//   · remoteEnemy —— 关 useAITurn + 关开局替敌方出牌
//
// 卡组：playerDeck/enemyDeck = { mainCards:[objs], spCards:[objs] }，由 PvpLobby 用 resolveDeck 解析后传入。
//   host 权威握双方牌 → enemyDeck = guest 在大厅阶段经中继发来、host 解析的卡组（不再是写死测试卡组）。
//   ⚠️ useHand 首渲染即把卡组冻进 ref → 本组件挂载时双方卡组必须都已就位（PvpLobby 的开战门控保证）。
//
// 里程碑简化：onExit 直接回大厅、不走 App.handleExitBattle → 结构上零收益。

import { useRef } from 'react'
import { useBattle } from '../hooks/useBattle'
import { useHand } from '../hooks/useHand'
import { usePvpHost } from '../hooks/usePvpHost'
import BattleScreen from './BattleScreen'

export default function PvpHostBattleScreen({ client, gameFrameRef, playerDeck, enemyDeck, onExit }) {
  const battle = useBattle()
  const playerHand = useHand(playerDeck.mainCards, 'player')
  const enemyHand = useHand(enemyDeck.mainCards, 'enemy')
  const floatBridgeRef = useRef(null)
  const pvpBattle = usePvpHost({ enabled: true, client, gameFrameRef, battle, playerHand, enemyHand, floatBridgeRef })
  return (
    <BattleScreen
      battle={pvpBattle}
      playerHand={playerHand}
      enemyHand={enemyHand}
      playerDeckCards={playerDeck.mainCards}
      enemyDeckCards={enemyDeck.mainCards}
      // ☠️ 传数组（哪怕空 []）—— BattleScreen 的 `spDeck || testSp` 里空数组是 truthy，
      //    故 [] 天然屏蔽测试 SP 兜底；玩家没选 SP 就零 SP 打。绝不传 undefined。
      playerSpDeckCards={playerDeck.spCards || []}
      enemySpDeckCards={enemyDeck.spCards || []}
      remoteEnemy
      floatBridgeRef={floatBridgeRef}
      onExit={onExit}
    />
  )
}

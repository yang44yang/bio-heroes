// GuestBattleScreen.jsx —— PvP guest 的战斗数据源 wrapper（PvP 第 4d 步）。
//
// HostBattleScreen 的镜像：host 供真引擎（useBattle），guest 供快照适配器（useGuestBattle），
// 渲染**同一个** BattleScreen —— 这正是 4b 把 battle 提成 prop 买到的东西。
// remoteEnemy：guest 视角的「敌方」是远端 host（真人）→ 关 AI + 关开局替敌方摆卡。

import { useGuestBattle } from '../hooks/useGuestBattle'
import BattleScreen from './BattleScreen'

export default function GuestBattleScreen({ client, gameFrameRef, initialSyncRef, onExit }) {
  const { battle, playerHand, enemyHand } = useGuestBattle({ client, gameFrameRef, initialSyncRef })
  if (!battle) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p className="text-gray-400">等待对局数据…</p>
      </div>
    )
  }
  return (
    <BattleScreen
      battle={battle}
      playerHand={playerHand}
      enemyHand={enemyHand}
      playerDeckCards={[]}
      enemyDeckCards={[]}
      remoteEnemy
      onExit={onExit}
    />
  )
}

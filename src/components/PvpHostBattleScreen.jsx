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

import { useRef, useState, useEffect } from 'react'
import { useBattle } from '../hooks/useBattle'
import { useHand } from '../hooks/useHand'
import { usePvpHost } from '../hooks/usePvpHost'
import { saveMatch } from '../utils/matchStore'
import BattleScreen from './BattleScreen'

export default function PvpHostBattleScreen({ client, gameFrameRef, playerDeck, enemyDeck, resumeTick = 0, resumeFrom = null, onExit }) {
  // remoteEnemy：敌方席位是**真人 guest**，不是 AI → 他的 SP 由他自己选（候选走 self 私有通道，
  // 回传 spChoose intent；见 usePvpHost）。单机的 HostBattleScreen 不传 → 敌方仍由 AI 人格代选。
  const battle = useBattle({ remoteEnemy: true })
  const playerHand = useHand(playerDeck.mainCards, 'player')
  const enemyHand = useHand(enemyDeck.mainCards, 'enemy')
  const floatBridgeRef = useRef(null)
  const adapterRef = useRef(null)
  // resumeTick：大厅在 relay.resumed / peer-joined 时 +1 → 强制重推一帧全量 sync（见 usePvpHost）
  const pvpBattle = usePvpHost({ enabled: true, client, gameFrameRef, battle, playerHand, enemyHand, floatBridgeRef, resumeTick, adapterRef })

  // ---- 续局：装载快照（host 自恢复 / 4g 场景）----
  // ☠️ 必须在 BattleScreen 挂载**之前**装完，并且给它 skipInit —— 否则它的初始化 effect 会
  //    initHand()（重洗重抽）+ startBattle()（整局重置）把刚恢复的一切当场清掉，
  //    症状是「恢复成功了但回到第 1 回合」，最容易被误判成快照没存对。
  const [hydrated, setHydrated] = useState(!resumeFrom)
  useEffect(() => {
    if (hydrated || !resumeFrom) return
    battle.hydrateEngine(resumeFrom.engine)
    playerHand.hydrate(resumeFrom.hands?.player)
    enemyHand.hydrate(resumeFrom.hands?.enemy)
    adapterRef.current?.hydrate(resumeFrom.adapter)
    setHydrated(true)
  }, [hydrated, resumeFrom, battle, playerHand, enemyHand])

  // ---- 续局：每次棋盘变化后落盘（节流在 matchStore 里）----
  // ⚠️ 依赖与 usePvpHost 的推送 effect 对齐：那边推给 guest，这边存给自己，同一批触发条件。
  //    ☠️ 快照**永不离开本机**：里面装着双方手牌与问答答案卡（host 权威的隐藏信息）——
  //       这正是不做「热备发给 guest 接管」的原因，见 src/engine/matchSnapshot.js 文件头。
  useEffect(() => {
    if (!hydrated) return                       // 还没装载完就存 = 把空局盖掉刚存的好快照
    const room = client?.getCode?.(); const token = client?.getToken?.()
    if (!room || !token) return                 // 凭证还没到手（首连中）→ 存了也回不去，跳过
    saveMatch({
      engine: battle.snapshotEngine(),
      adapter: adapterRef.current?.snapshot(),
      hands: { player: playerHand, enemy: enemyHand },
      meta: { room, token, decks: { player: playerDeck.ids, enemy: enemyDeck.ids } },
    })
  }, [hydrated, client, battle, playerHand, enemyHand, playerDeck, enemyDeck,
    battle.battleState, playerHand.hand, enemyHand.hand])

  return (
    <BattleScreen
      battle={pvpBattle}
      skipInit={!!resumeFrom}
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

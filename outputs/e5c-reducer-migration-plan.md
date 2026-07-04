# E5c — battleReducer 迁移计划（棋盘状态收进 reducer）

> 状态：**计划（未改代码）** · 作者交接窗口 2026-07-04
> 前置：E5a（`e96ec1c`，14 处双写收进 `useLatestRef`）、E5b（`21a5a6b`，停止泄漏原始 `*Ref` → 只读 `latest` 快照）均已完成并 push。
> 本文是 SESSION「下次启动时优先」里 E5c 明确要求的**动手前必出**产物：state shape + action 清单 + 分步迁移计划。**一次只迁一组、迁一组测一组，别一把梭。**

---

## 0. 为什么做 E5c（目标）

当前 `useBattle` 的「棋盘状态」是十几个独立 `useState`，callbacks（attack/aiAttack/技能事件/死亡 effect/startBattle…）要读**最新值**只能靠 E5a 的 `useLatestRef` 镜像（`xRef.current`）。这套「state + 手动镜像 ref」有两个根本脆弱性：

1. **漏同步就竞态**：每加一个 state，都要记得配一个 `useLatestRef`，忘了就在异步 AI 回合里读到旧值。
2. **跨 state 非原子**：一次攻击要同时改 `playerField`/`enemyField`/`leaderHp`/`discard`，现在是 N 个独立 setState 各读各的 `prev`，靠闭包变量（`defKilled`/`atkKilled`）回传耦合，读起来像"条件汤"。

`useReducer` 天然解决这两点：**reducer 每次都拿到最新 `state`**（无需 ref 镜像 → E5a 的 `useLatestRef` 大量退役），且一个 `dispatch` 里可以**原子地**改多组状态。

**非目标**：不改任何玩法/数值/结算语义。纯结构迁移，行为逐字节保真。不碰 UI-only 状态（见 §2 "留在 useState"）。

---

## 1. 目标 state shape（`battleState`）

只迁「棋盘/回合」状态。建议 shape（扁平、按 side 分组）：

```js
const initialBattleState = {
  turn: 1,
  phase: 'init',                 // init|mulligan|main|battle|animating|enemy|over
  winner: null,                  // null|'player'|'enemy'
  player: {
    field: Array(5).fill(null),  // (card|null)[]
    leaderHp: LEADER_HP,         // 30000
    energy: 1,
    powerBank: { stored: 0, intact: true },
    discard: [],
  },
  enemy: { field, leaderHp, energy, powerBank, discard },  // 同形
}
```

> **形状决策**：按 `player`/`enemy` 分组（而非 `playerField`/`enemyField` 平铺），让"给某一侧应用结算"能写成 `state[side]`，attack/aiAttack 的 side 差异从"选哪个 setter"变成"传哪个 side 字符串" —— 这也顺手削掉 E3 判定"不值得合并"的一部分理由。

### 迁移**进** reducer 的状态（12 个 useState）
`turn` · `phase` · `winner` · `playerField` · `enemyField` · `playerLeaderHp` · `enemyLeaderHp` · `playerEnergy` · `enemyEnergy` · `playerPowerBank` · `enemyPowerBank` · `playerDiscard` · `enemyDiscard`

### 对应可退役的 `useLatestRef`（E5a 的 14 个里这些可删）
`turnRef` · `playerFieldRef` · `enemyFieldRef` · `playerLeaderHpRef` · `enemyLeaderHpRef` · `playerEnergyRef` · `enemyEnergyRef` · `playerPowerBankRef` · `enemyPowerBankRef` · `playerDiscardRef` · `enemyDiscardRef`
→ reducer 内读 `state.player.field` 即最新值；对外 `latest` 快照（E5b）改成 `get playerField() { return stateRef.current.player.field }`（保留一个 `stateRef = useLatestRef(state)` 供 **异步 AI 回合**读最新，见 §4 风险①）。

---

## 2. **不**迁的状态（留在 useState / useRef）

- **UI/展示态**：`battleLog` · `currentQuiz` · `skillEvents` · `pendingSpSummon` · `activeEnvEvent` · `pendingEnvEvent` · `bossMechanicEvents` —— 与结算原子性无关，迁了只增噪音。
- **SP 卡组**：`playerSpDeck`/`enemySpDeck`（+ 其 ref）—— 边界状态、改动少，Phase 2 再看。
- **准记忆 ref**：`attackedThisTurn` · `summonedThisTurn` · `spTriggeredRef` · `campaignConfigRef` · `bossStateRef` · `battleStatsRef` · 各 `*InitLeaderHpRef` —— 本就是 ref，不是 state 镜像，保留。
- `quizStreak` · `scientistMode` —— 与棋盘结算解耦，留 useState。

---

## 3. Action 清单（初版，按迁移切片补全）

| action | payload | 改哪些 state | 现对应 setState |
|--------|---------|-------------|-----------------|
| `RESET_BATTLE` | `{ initial }` | 全量 | startBattle 里一串 set* |
| `SET_PHASE` | `phase` | phase | setPhase ×15 |
| `NEXT_TURN` | `{ side }` | turn(+1)、energy | setTurn/setPlayerEnergy… |
| `SET_ENERGY` | `{ side, value }` | `[side].energy` | setPlayerEnergy/setEnemyEnergy ×20 |
| `SPEND_ENERGY` | `{ side, cost }` | `[side].energy -= cost` | 出牌扣能量 |
| `SET_POWERBANK` | `{ side, powerBank }` | `[side].powerBank` | set*PowerBank ×14 |
| `BREAK_POWERBANK` | `{ side }` | `[side].powerBank/energy` | breakPowerBank |
| `SET_LEADER_HP` | `{ side, value }` | `[side].leaderHp` | set*LeaderHp ×24 |
| `DAMAGE_LEADER` | `{ side, amount }` | `[side].leaderHp -= a` | 直攻主人 |
| `SET_FIELD` | `{ side, field }` | `[side].field` | set*Field ×62（多为整场替换） |
| `PLACE_CARD` | `{ side, slot, card }` | `[side].field[slot]` | 出牌/召唤 |
| `APPLY_COMBAT` | `{ atkSide, atkSlot, defSlot, outcome, mods }` | 双方 field（原子） | applyCombatOutcome 的两个 setter |
| `PUSH_DISCARD` | `{ side, cards }` | `[side].discard` | set*Discard ×15 |

> **原子结算是最大收益点**：`APPLY_COMBAT` 把现在 `applyCombatOutcome` 里两个独立 `defSetter(prev=>…)/atkSetter(prev=>…)` + 闭包回传 `defKilled/atkKilled` 合成**一个** reducer case —— kill 判定在 reducer 内算完，通过后续读 `state` 或让 callback 用 `outcome` 自己判（见 §4 风险②）。

---

## 4. 关键风险（动手前必须想清楚）

**① 异步 AI 回合读最新值**：`useAITurn` 在 `await delay()` 之间反复读 `battle.latest.*`。`useReducer` 的 `state` 在闭包里是**渲染时快照**，异步点之后是旧的。→ **必须保留一个 `stateRef = useLatestRef(state)`**，`latest` 快照与 AI 回合内部都读 `stateRef.current.*`。这不是倒退：从"每个 state 一个 ref"收敛成"整个 battleState 一个 ref"，仍是净简化。**这条不做，AI 回合必读旧值、直接错。**

**② 更新闭包里的 kill 判定**：现 `applyCombatOutcome` 靠 `defSetter(prev => { …; if(<=0) defKilled=true })` 在 setState 更新函数里读 `prev` 定 kill。reducer case 里直接读传入 `state` 算 kill，把 `{defKilled, atkKilled}` 塞进一个"结算结果"里 —— 但 reducer **不能有副作用/返回额外值**。方案：kill 判定移到 **callback**（用 `outcome` 的伤害 + `stateRef.current` 的当前 HP 纯算），reducer 只管改血。死亡清理已是"提交后 useEffect 扫 currentHp≤0"（E1），所以 kill 布尔只用于**日志文案** → callback 层算完直接 addLog 即可。

**③ 状态引用相等 / 重渲染**：现在改一侧 field 只重算依赖该 state 的东西；合成大 `battleState` 后每次 dispatch 换新对象，`useCallback`/`useMemo`/`memo` 依赖 `battle.playerField` 的地方要复核（拆选择器或保持字段引用稳定：reducer 里没改的 side 复用旧引用 `{...state, player: {...}}`——enemy 引用不变）。**reducer 必须做到"没改的子树引用不变"**，否则触发无谓重渲染/动画抖动。

**④ E5a 的 `pendingSpSummonRef` 坑**：上次脚本转换把 init≠同步值的 ref 转错、被 test-phase-b 抓到。迁移里凡"init 值 ≠ 每渲染同步值"的都要手工核对，别信批量替换一把过。

**⑤ grep 锚点测试**：`test-counter-routing`（`attackerField: playerFieldRef.current`）、`test-phase-b`（`playerLeaderHpRef.current <= …`）grep 的是 useBattle **内部** ref 用法。迁移后这些内部读法会变（改读 `state`）→ **这两个测试的正则要同步更新**，且更新前先确认新代码语义等价（别为了过测试改错）。

---

## 5. 分步切片（leaf-first，安全 → 高杠杆；每刀 test+build+preview 冒烟）

顺序原则：**先迁"独立、少跨状态耦合"的叶子组，最后迁 field**（62 处、且是结算/动画核心）。每刀独立 commit + push。

- **E5c-0（脚手架，零行为变化）**：建 `src/engine/battleReducer.js` + `useReducer`，**但只装一个 state 组进去当试点**。先选 `powerBank`（14 处、逻辑简单、`breakPowerBank` 是唯一复杂点）。把 `playerPowerBank/enemyPowerBank` 两 useState → reducer 的 `player.powerBank/enemy.powerBank`，`set*PowerBank` → `dispatch(SET_POWERBANK)`，退役 2 个 `useLatestRef`，`latest.enemyPowerBank` 改读 `stateRef`。**证明 stateRef 模式在异步 AI 回合成立**（AI 打破 Power Bank 冒烟）。
- **E5c-1**：`discard`（15 处，纯 append，`canPlayWithMarkers` 读它）。
- **E5c-2**：`energy`（20 处）+ `SPEND_ENERGY`。
- **E5c-3**：`leaderHp`（24 处）+ `DAMAGE_LEADER`。注意 `*InitLeaderHpRef`（SP 阈值）不动、Phase-B 触发 useEffect 依赖 `playerLeaderHp/enemyLeaderHp` 要改成读 reducer state。
- **E5c-4**：`turn` + `phase` + `winner`（turn 3、phase 15、winner 少）。`turnRef` 退役。
- **E5c-5（最大、最后）**：`playerField`/`enemyField`（62 处）+ `APPLY_COMBAT` 原子结算（吃掉 applyCombatOutcome 的两 setter）+ `PLACE_CARD`/`SET_FIELD`。风险③（引用相等/重渲染）在这刀集中爆发，务必 preview 看动画不抖、showSkillFloats 正确。
- **E5c-6（收尾）**：删净退役的 `useLatestRef`、更新 `test-counter-routing`/`test-phase-b` grep 锚点、`ARCHITECTURE.md` 更新状态模型段、新增 `scripts/test-battle-reducer.mjs`（纯函数驱动 reducer：给 state+action 断言 next state，第一个**真正单测棋盘状态机**的测试）。

> 若单窗口只能做前 2-3 刀，**在 E5c-0 之前先做 §4 风险① 的 `stateRef` 决策验证**（哪怕先只迁 powerBank），把"异步读最新"这条主路跑通，后续刀就是重复套路。

---

## 6. 每刀验证协议（沿用绞杀式）

1. `npm test`（31 套）全绿 + 迁移刀涉及的 grep 锚点测试同步改。
2. `npm run build` 绿。
3. `vite preview`（4174，非 dev——HMR 沙箱连不上）走**测试场**：摆双方卡 → 满能量开打 → 玩家攻击（showSkillFloats）→ 结束回合 → AI 回合（读 `latest.*`/结算/死亡）→ 回到玩家回合，**0 console error**。E5c-0 额外冒烟 AI 打破 Power Bank；E5c-5 额外看动画不抖 + 直攻主人 + 击杀清场。
4. 新增 reducer 单测（E5c-6）：纯 `reducer(state, action)` 断言，不 grep 源码。

---

## 7. 回滚 / 中断策略

- 每刀独立 commit + push，任一刀 preview 冒烟出错即 `git revert` 该刀、不带病往下。
- 迁移期允许"reducer 管一部分 + useState 管一部分"的**过渡态**存在（这正是切片法的代价），但**每刀结束时必须是绿的可运行态**，不留半截 dispatch。
- ⚠️ 大改热路径 + 齐齐仍未真机实测 B/C/D/F/E1-E5b：E5c-5（field）落地后强烈建议**在推进 E5c-6 前先请齐齐 iPad 实测一轮**，因为 field 结算是最可能出细微时序回归的地方。

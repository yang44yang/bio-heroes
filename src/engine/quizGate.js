// quizGate.js —— 问答的**纯函数核心**：触发节流、题面脱敏、判卷。
//
// ## 为什么把它从 useBattle 里绞出来（同 rules.js / combat.js 那条路）
// 原来节流住在 useBattle 的两个 `useRef` 里，而 useBattle 是 React hook —— 在 node 里 import 不了，
// 于是「每侧独立冷却」这条规则只能靠 source-grep 假装测过。搬成纯函数后能真喂序列真断言。
//
// ## ☠️ 三条各自踩过坑的纪律
//
// 1) **节流必须每侧一份**。旧实现是**单实例共享**的 ref：单机只有玩家在攻击，看不出问题；
//    一进 PvP，host 首攻把 `fired` 用掉、又占住冷却 → **guest 全程一道题都拿不到**。
//    这正是「host ×2 / guest 恒 ×1」那条不公平的另一半根因。
//
// 2) **脱敏是投影，不是删字段**。`getRandomQuiz` 返回体里带 `correct`（正确选项下标）——
//    它绝不能上 wire。这里按白名单**重建**一个新对象（而不是 delete），
//    这样将来题库多加字段也不会顺着缝溜出去。
//    ⚠️ 连 `fact` 也不能随题面一起发：实测题库 805 题里 **86.7% 的 fact 与正确选项重合度最高、
//    31.9% 近乎逐字复述答案**（「青霉素破坏细菌的细胞壁」这种）。而 `fact` 这个名字**不在**
//    wire 的 PRIVATE_KEYS 里、findPrivate 放行 —— 挡住它的是形状棘轮，不是隐私词表。
//    所以 fact 只在**揭晓帧**下发。
//
// 3) **qid 必须是「题目实例 id」，不能直接用题库的 `_qid`**。`_qid` 是题干的稳定哈希，
//    同一道题下次被抽中时逐字相同（当天题抽干后 getRandomQuiz 会允许重复出题）——
//    那样一条迟到的上一轮答案会被当成本轮的，正好是要防的错算。
//
// 本模块 **side-blind**：只认 sides.js 的常量，不写死 player/enemy 字面量。

import { SIDES } from './sides.js'

/** 两次问答之间至少间隔几个回合（`turn` 只数整轮，见 battleReducer 顶部注释）。 */
export const QUIZ_COOLDOWN_TURNS = 3

/** 每侧一份的初始闸门。`fired` = 该侧是否已用掉「首次攻击必触发」的额度。 */
export function initialQuizGate() {
  const g = {}
  for (const s of SIDES) g[s] = { fired: false, lastTurn: -Infinity }
  return g
}

/**
 * 该不该给 side 出题？**纯函数、不 mutate 入参**（返回新 gate）。
 *
 * 规则（与单机逐字一致，只是从「全局一份」变成「每侧一份」）：
 *   · 该侧首次攻击 → 必触发
 *   · 之后距该侧上次触发满 QUIZ_COOLDOWN_TURNS 个回合 → 触发
 *
 * @returns {{fire: boolean, gate: object}}
 */
export function nextQuizGate(gate, side, turn) {
  const cur = gate[side]
  if (!cur) throw new Error(`nextQuizGate: 未知的 side ${JSON.stringify(side)}`)

  const fire = !cur.fired || (turn - cur.lastTurn >= QUIZ_COOLDOWN_TURNS)
  if (!fire) return { fire: false, gate }

  return {
    fire: true,
    // 只替换这一侧 —— 另一侧的额度和冷却**不受影响**（这就是「每侧独立」的全部含义）
    gate: { ...gate, [side]: { fired: true, lastTurn: turn } },
  }
}

/** 空的定形题槽。☠️ 键必须恒在（值可 null）—— 理由见 emptyQuizSlot 下方长注释。 */
export function emptyQuizSlot() {
  return {
    qid: null, question: null, options: [], difficulty: null,
    chosenIdx: null, rightIdx: null, fact: null,
  }
}
// ☠️ **定形槽，不是 nullable 子树。**
//   `assertPublicShape` 是逐路径比对的：写成 `quiz: null` 时，collectPaths 会因为「有没有题」
//   产出**三种不同**的路径集（都空 → `<side>.quiz` 一条；一侧有 → 多出 `<side>.quiz.*`；
//   两侧都有 → 只剩子路径）。SHAPES 只能申报一种 → **每局第一次出题时 buildSync 当场抛**。
//   而唯一的调用点 usePvpHost 把这个抛错吞进 try/catch 只打 console.error →
//   现场表现是「快照突然不推了、guest 整块冻屏、零提示」。实测三种形状确实不同；
//   定形之后三种情况路径集**完全一致**。

/**
 * 题面脱敏：按白名单重建给对手/客户端看的版本。**答案与 fact 都不在里面。**
 * @param {object} quiz getRandomQuiz 的返回（含 correct / fact / _qid）
 * @param {string} qid  本次出题的**实例 id**（不是题库的 _qid，见文件头纪律 3）
 */
export function publicQuiz(quiz, qid) {
  return {
    qid,
    question: quiz.question,
    options: [...(quiz.options || [])],
    difficulty: quiz.difficulty ?? null,
    // 揭晓帧才填（提问帧恒 null）——键必须在，否则形状会变
    chosenIdx: null, rightIdx: null, fact: null,
  }
}

/** 揭晓帧：在脱敏题面上补齐「选了哪个 / 正确是哪个 / 知识卡」。 */
export function revealQuiz(publicQ, chosenIdx, rightIdx, fact) {
  return { ...publicQ, chosenIdx, rightIdx, fact: fact ?? null }
}

/**
 * 判卷。**host 权威**：只用自己手里那份 pending（含正确答案），
 * 绝不读客户端送来的任何倍率/对错（wire 的 decodeIntent 本来也把那些字段投影掉了）。
 *
 * @param {object|null} pending {side, qid, correct} —— host 自己存的答案卡
 * @param {object} intent {qid, choice} —— 解码后的 answer intent（side 由座位决定，客户端改不了）
 * @param {string} side   intent 的来源座位
 * @returns {{ok:boolean, correct?:boolean, reason?:string}}
 */
export function gradeAnswer(pending, intent, side) {
  // 没挂着题 → 已结算/已超时清空后的重传，安静丢弃（绝不能顺手改 quizStreak）
  if (!pending) return { ok: false, reason: 'no-pending' }
  // ☠️ 抢答别人的题：座位对不上一律拒。缺这条，host 点一下就能替 guest 答题。
  if (pending.side !== side) return { ok: false, reason: 'wrong-side' }
  // ☠️ 过期题：qid 不匹配（重传 / 乱序 / 同题再次被抽中）
  if (pending.qid !== intent.qid) return { ok: false, reason: 'stale-qid' }
  return { ok: true, correct: intent.choice === pending.correct }
}

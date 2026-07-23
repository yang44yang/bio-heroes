// test-pvp-quiz.mjs —— guest 答题的**端到端**守卫（不跑 React）。
//
// 直接驱动 battleReducer + quizGate + wire，把「guest 攻击 → host 出题 → guest 答 → host 判卷 →
// 倍率生效」这条链走完，断言 guest 真的能拿到 ×2、且答案一个字节都没上 wire。
//
// ## 为什么必须有这一套
// 接线做完时 61 套测试**一条都没红** —— 那不是安全，是**零覆盖**（「no-red」是 fake-green 的镜像面）。
// 本文件就是补上那块覆盖：它对着「host 恒 ×1 地替 guest 结算」这个原状态是红的。
//
// ⚠️ 只 import src/engine/*.js + src/data/*.js（零 React）→ 进主 CI。
// ⚠️ localStorage 垫片：Node 25 **自带** localStorage，不垫的话 quizzes 的「当天已见」和
//    Leitner 盒子会真的写盘、在多次运行间累积 → 选到不同题、走不同降级分支（照 test-quiz-system 的做法）。

const _mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (_mem.has(k) ? _mem.get(k) : null),
  setItem: (k, v) => _mem.set(k, String(v)),
  removeItem: (k) => _mem.delete(k),
  clear: () => _mem.clear(),
}

const { battleReducer, initialBattleState } = await import('../src/engine/battleReducer.js')
const { initialQuizGate, nextQuizGate, publicQuiz, gradeAnswer, emptyQuizSlot } =
  await import('../src/engine/quizGate.js')
const { buildSync, PROTOCOL_VERSION, SHAPES } = await import('../src/engine/wire.js')
const { PLAYER, ENEMY } = await import('../src/engine/sides.js')
const { getRandomQuiz } = await import('../src/data/quizzes.js')

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }

// ---- 迷你 host：把生产里那条链路的**决策**原样搬过来（不含 React/渲染）----
function makeHost() {
  let state = initialBattleState
  const gate = { cur: initialQuizGate() }
  const keys = { [PLAYER]: null, [ENEMY]: null }
  let seq = 0
  const dispatch = (a) => { state = battleReducer(state, a) }

  return {
    get state() { return state },
    /** 收到某侧的 attack：先问要不要出题；出题则挂起并返回 {suspended:true} */
    attack(side) {
      const { fire, gate: g } = nextQuizGate(gate.cur, side, state.turn)
      if (!fire) return { suspended: false, multiplier: 1 }
      gate.cur = g
      const q = getRandomQuiz({ battleCardIds: [], streak: state[side].quizStreak, mode: 'normal' })
      const qid = `q${++seq}`
      keys[side] = { side, qid, correct: q.correct, fact: q.fact }
      dispatch({ type: 'QUIZ_ASK', side, quiz: publicQuiz(q, qid) })
      return { suspended: true, qid, rightIdx: q.correct }
    },
    /** 收到某侧的 answer：host 权威判卷，返回结算用的倍率 */
    answer(side, intent) {
      const g = gradeAnswer(keys[side], intent, side)
      if (!g.ok) return { rejected: g.reason }
      const key = keys[side]
      keys[side] = null
      dispatch({ type: 'QUIZ_REVEAL', side, chosenIdx: intent.choice, rightIdx: key.correct, fact: key.fact })
      dispatch({ type: 'QUIZ_STREAK_SET', side, value: g.correct ? state[side].quizStreak + 1 : 0 })
      return { correct: g.correct, multiplier: g.correct ? 2 : 1 }
    },
    /** 收到某侧的 endTurn：兜底 —— 还挂着没答的题就清掉（镜像 usePvpHost 的 abandon 分支）。 */
    endTurn(side) {
      if (keys[side]) { keys[side] = null; dispatch({ type: 'QUIZ_CLEAR', side }); return { abandoned: true } }
      return { abandoned: false }
    },
  }
}

const syncTo = (state, to) => buildSync({
  state,
  sources: { [PLAYER]: { hand: [], drawPileCount: 0, spChoice: null }, [ENEMY]: { hand: [], drawPileCount: 0, spChoice: null } },
  ring: [], to, since: 0, ack: 0, g: 'm_test',
})

// ---- ① 前提自检：题库真的带答案（否则下面「不含 correct」是空转）----
{
  const raw = getRandomQuiz({ battleCardIds: [], streak: 0, mode: 'normal' })
  assert('correct' in raw && Number.isInteger(raw.correct), '① 前提：getRandomQuiz 的返回带 correct（否则脱敏断言是空转）')
  assert(typeof raw.fact === 'string' && raw.fact.length > 0, '① 前提：题目带 fact 知识卡')
}

// ---- ② ☠️ guest 攻击 → host 出题 → 题落在 guest 那侧 ----
const host = makeHost()
{
  const r = host.attack(ENEMY)
  assert(r.suspended === true, '② ☠️ guest 首次攻击必触发问答（缺这条 = guest 全程 0 题，恒 ×1）')
  assert(host.state.enemy.quiz.qid === r.qid, '② 题落在 guest（enemy）那侧的槽里')
  assert(host.state.player.quiz.qid === null, '② ☠️ host 自己那侧的题槽没被污染（否则爸爸屏幕会弹出齐齐的题）')
}

// ---- ③ ☠️ 答案不上 wire（整条消息的字节级扫描）----
{
  const sync = syncTo(host.state, ENEMY)
  const wireBytes = JSON.stringify(sync)
  // 变异：publicQuiz 不脱敏 → 本条红
  assert(!wireBytes.includes('"correct"'), '③ ☠️ 整条 sync 的字节里不得出现 "correct"')
  const q = sync.state.player.quiz     // mirror 后 guest 自己的题在 player 侧
  assert(q.qid != null && typeof q.question === 'string' && q.options.length > 0, '③ guest 收到的题面完整（脱敏没脱成空壳）')
  assert(!('correct' in q), '③ ☠️ 题面对象里没有 correct 键')
  // 变异：publicQuiz 随题面一起带上 fact → 本条红
  assert(q.fact === null, '③ ☠️ 提问帧不下发 fact —— 题库多数 fact 直接复述正确选项，等于剧透')
  assert(q.rightIdx === null, '③ 提问帧不下发 rightIdx')
}

// ---- ④ ☠️ 答对 → 倍率 ×2；答错 → ×1（这就是「不公平」被修掉的地方）----
{
  const qid = host.state.enemy.quiz.qid
  const right = host.state.enemy.quiz   // 此刻还没揭晓，正确答案只在 host 的 keys 里
  assert(right.rightIdx === null, '④ 判卷前 rightIdx 仍为 null')

  // 用 host 自己那份答案卡算出正确下标（模拟 guest 恰好答对）
  const probe = makeHost()
  const p = probe.attack(ENEMY)
  const okRes = probe.answer(ENEMY, { qid: p.qid, choice: p.rightIdx })
  assert(okRes.correct === true && okRes.multiplier === 2,
    '④ ☠️ guest 答对 → 倍率 ×2（原状态是 host 写死空 opts、guest 恒 ×1）')

  const probe2 = makeHost()
  const p2 = probe2.attack(ENEMY)
  const badRes = probe2.answer(ENEMY, { qid: p2.qid, choice: (p2.rightIdx + 1) % 4 })
  assert(badRes.correct === false && badRes.multiplier === 1, '④ 答错 → ×1（差分：不是无论如何都 ×2）')
  assert(probe.state.enemy.quizStreak === 1 && probe2.state.enemy.quizStreak === 0,
    '④ 连对数记在 guest（enemy）那一侧')
  assert(probe.state.player.quizStreak === 0,
    '④ ☠️ guest 答对**不得**给 host 刷连对数（那会顺带把 SP 开闸/科学家模式记到爸爸头上）')
  void qid
}

// ---- ⑤ ☠️ 揭晓帧才下发 fact + rightIdx ----
{
  const p = makeHost()
  const a = p.attack(ENEMY)
  p.answer(ENEMY, { qid: a.qid, choice: a.rightIdx })
  const q = syncTo(p.state, ENEMY).state.player.quiz
  assert(q.rightIdx === a.rightIdx, '⑤ 揭晓帧带 rightIdx（guest 的 QuizModal 靠它进反馈阶段）')
  assert(typeof q.fact === 'string' && q.fact.length > 0, '⑤ ☠️ 揭晓帧带 fact —— 这就是齐齐要看的知识卡')
  assert(q.chosenIdx === a.rightIdx, '⑤ 揭晓帧带 chosenIdx（标出他点的那个）')
}

// ---- ⑥ ☠️ 判卷是 host 权威：过期 / 抢答 一律拒 ----
{
  const p = makeHost()
  const a = p.attack(ENEMY)
  assert(p.answer(ENEMY, { qid: 'q999', choice: 0 }).rejected === 'stale-qid', '⑥ ☠️ qid 不匹配 → 拒（防重传/乱序错算）')

  // ☠️ host 不得替 guest 答题。第一道防线是**答案卡每侧一份**（host 根本够不到 guest 那份，
  //   故理由是 no-pending 而非 wrong-side）；gradeAnswer 里的 side 比对是第二道，
  //   由 test-quiz-gate ⑤ 单独钉。这里断言的是**不变式本身**，不是某条具体理由。
  //   变异：把答案卡改回单例（两侧共用一份）→ host 这次调用会真的判卷成功 → 本条红。
  const steal = p.answer(PLAYER, { qid: a.qid, choice: 0 })
  assert(!!steal.rejected, `⑥ ☠️ host 拿 guest 的 qid 来答必须被拒（实测理由 ${steal.rejected}）`)
  assert(steal.correct === undefined, '⑥ 被拒时不产出判卷结果（调用方无从"顺手"结算）')
  // 拒绝之后题还挂着、连对数没被动过
  assert(p.state.enemy.quiz.qid === a.qid, '⑥ 被拒的答案不影响挂着的题')
  assert(p.state.player.quizStreak === 0 && p.state.enemy.quizStreak === 0, '⑥ 被拒的答案不改任何一侧的连对数')
}

// ---- ⑦ 每侧独立：host 出过题，不妨碍 guest 同回合也出题 ----
{
  const p = makeHost()
  assert(p.attack(PLAYER).suspended === true, '⑦ host 首攻触发')
  // 变异：节流退回单实例共享 → 本条红（guest 会被 host 的冷却挡住 = 原来的不公平）
  assert(p.attack(ENEMY).suspended === true, '⑦ ☠️ host 刚出过题，guest 同回合仍能出题（每侧独立）')
  assert(p.state.player.quiz.qid !== p.state.enemy.quiz.qid, '⑦ 两侧各拿到不同的题目实例')
}

// ---- ⑧ 定形槽：有题/无题都不破坏 wire 形状（守门人不抛）----
{
  const p = makeHost()
  const before = () => { try { syncTo(p.state, ENEMY); return 'ok' } catch (e) { return String(e.message).slice(0, 60) } }
  assert(before() === 'ok', '⑧ 无题时能推快照')
  p.attack(ENEMY)
  assert(before() === 'ok', '⑧ ☠️ 一侧有题时仍能推快照（定形槽；nullable 会在这里当场抛、快照停推、guest 冻屏）')
  p.attack(PLAYER)
  assert(before() === 'ok', '⑧ 两侧都有题时仍能推快照')
  assert(JSON.stringify(Object.keys(emptyQuizSlot()).sort()) ===
         JSON.stringify(Object.keys(p.state.enemy.quiz).sort()), '⑧ 空槽与有题槽键集一致')
}

// ---- ⑨ 协议版本棘轮：quiz 路径必须申报在**当前**版本里 ----
{
  const cur = SHAPES[PROTOCOL_VERSION]
  assert(Array.isArray(cur), `⑨ SHAPES[${PROTOCOL_VERSION}] 存在`)
  const quizPaths = cur.filter((p) => p.startsWith('<side>.quiz.'))
  // 变异：就地改老版本而不 bump → 本条红
  assert(quizPaths.length === 7, `⑨ ☠️ 当前版本申报了 7 条 <side>.quiz.* 路径（实测 ${quizPaths.length}）`)
  assert(!cur.some((p) => p.includes('correct')), '⑨ ☠️ 公开形状里绝不出现叫 correct 的路径')
  assert(PROTOCOL_VERSION >= 4, '⑨ 加 quiz 槽必须 bump 到 v4+（旧客户端吃不下新形状）')
}

// ---- ⑩ ☠️ 兜底：guest 回合结束时若还挂着没答的题，题槽必须清掉（不让陈旧 pending 跨回合）----
{
  const p = makeHost()
  const a = p.attack(ENEMY)
  assert(a.suspended === true && p.state.enemy.quiz.qid != null, '⑩ 前提：挂着一道没答的题')
  const r = p.endTurn(ENEMY)
  // 变异：usePvpHost 的 endTurn 分支删掉 abandon（不清题槽）→ 本组红
  assert(r.abandoned === true, '⑩ endTurn 报告确实清掉了一道未答的题')
  assert(p.state.enemy.quiz.qid == null, '⑩ ☠️ 题槽已清空（guest 弹窗随快照关闭，陈旧 pending 不跨回合）')
  // 清空后 guest 视角的 currentQuiz 派生为 null（定形槽，键仍在）
  assert(p.state.enemy.quiz.rightIdx == null, '⑩ 清空后揭晓字段也归 null')
  // 没挂题时 endTurn 是 no-op（不误清、不误报）
  assert(p.endTurn(ENEMY).abandoned === false, '⑩ 没挂题时 endTurn 不误报 abandon')
}

assert(pass > 29, `⑪ 断言真的跑了（实测 ${pass} 条）`)

if (fails.length) {
  console.error(`❌ test-pvp-quiz: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-pvp-quiz: ${pass} 条断言通过`)

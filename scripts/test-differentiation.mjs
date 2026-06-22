#!/usr/bin/env node
// 干细胞·分化变身 bug 修复回归测试
// 直接测 skillTemplates.onDeathEffect 模板 revive_as 分支
import { onDeathEffect } from '../src/engine/skillTemplates.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// 模拟一张"干细胞·万能变身者"卡(死亡 ctx)
const stemCard = { id: 'stem_cell_morph', name: '干细胞·万能变身者', faction: 'body', atk: 3000, hp: 5000, maxHp: 5000, uid: 'stem_uid_1' }

// 模拟弃牌堆 — 含人体系 R 卡、其他阵营卡、稀有度卡、事件卡
const mockDiscard = [
  { id: 'red_blood_cell',    name: '红细胞·氧气搬运工', type: 'character', faction: 'body', rarity: 'R', atk: 1000, hp: 2500, maxHp: 2500 },
  { id: 'platelet_guardian', name: '血小板·伤口守护者', type: 'character', faction: 'body', rarity: 'R', atk: 500,  hp: 3000, maxHp: 3000 },
  { id: 'white_blood_cell',  name: '白细胞·免疫尖兵',   type: 'character', faction: 'body', rarity: 'SR', atk: 2500, hp: 4000, maxHp: 4000 },
  { id: 'flu_virus',         name: '流感病毒·变异入侵者', type: 'character', faction: 'pathogen', rarity: 'R', atk: 2000, hp: 1500, maxHp: 1500 },
  { id: 'event_immune',      name: '免疫应答',           type: 'event',     faction: 'body', rarity: 'R' },
]
const friendlyField = [null, stemCard, null, null, null] // slot 1 是干细胞死前所在(暂不重要，关键是有空位)

// === 主路径：弃牌堆有 nature/rarity 匹配卡 → 分化成功 ===
const ctx1 = { card: stemCard, friendlyField: [null, null, null, null, null], discardPile: mockDiscard }
const params = { effect: 'revive_as', revive_source: 'discard', faction_filter: 'body', rarity_filter: 'R', revive_hp_percent: 0.5 }
const e1 = onDeathEffect(ctx1, params)
ok('返回非 null', e1 !== null)
ok('返回 SUMMON_CARD 事件', e1?.type === 'SUMMON_CARD')
ok('召唤到友方', e1?.side === 'friendly')
ok('召唤到空位 0 (findEmptySlot 取第一个空)', e1?.slot === 0)
const revivedCard = e1?.card
ok('召唤的卡是 body 系 R 卡', revivedCard && revivedCard.faction === 'body' && revivedCard.rarity === 'R')
ok('召唤的卡是 character 类型(非事件)', revivedCard && (revivedCard.type === 'character' || !revivedCard.type))
const isAcceptableTarget = ['red_blood_cell','platelet_guardian'].includes(revivedCard?.id)
ok(`召唤的卡 id 在 body+R 候选里(实际: ${revivedCard?.id})`, isAcceptableTarget)
ok('召唤的卡 NOT 是 white_blood_cell(SR 应被过滤)', revivedCard?.id !== 'white_blood_cell')
ok('召唤的卡 NOT 是 flu_virus(pathogen 应被过滤)', revivedCard?.id !== 'flu_virus')
ok('召唤的卡 NOT 是 event_immune(事件应被过滤)', revivedCard?.id !== 'event_immune')
ok('召唤的卡 NOT 是干细胞本身(防自循环)', revivedCard?.id !== 'stem_cell_morph')
// HP 应为 50%
const expectedHp = Math.floor((revivedCard?.maxHp || 0) * 0.5)
ok(`HP 是 maxHp 的 50% (期望 ${expectedHp}, 实际 ${revivedCard?.currentHp})`, revivedCard?.currentHp === expectedHp)
ok('保留 maxHp', revivedCard?.maxHp === (revivedCard?.id === 'red_blood_cell' ? 2500 : 3000))
ok('summonSick = true (出场召唤疲劳)', revivedCard?.summonSick === true)
ok('statuses 清空', Array.isArray(revivedCard?.statuses) && revivedCard.statuses.length === 0)
ok('uid 唯一(含 "_diff_")', revivedCard?.uid && revivedCard.uid.includes('_diff_'))
ok('message 含分化文案 + 目标卡名', e1?.message && e1.message.includes('分化为') && e1.message.includes(revivedCard.name))

// === 边缘 1：弃牌堆为空 → 返回 null(优雅降级，不崩) ===
const e2 = onDeathEffect({ card: stemCard, friendlyField: [null], discardPile: [] }, params)
ok('弃牌堆空 → 返回 null(不崩)', e2 === null)

// === 边缘 2：ctx.discardPile 缺失 → 返回 null ===
const e3 = onDeathEffect({ card: stemCard, friendlyField: [null] }, params)
ok('ctx.discardPile 缺失 → 返回 null(向后兼容)', e3 === null)

// === 边缘 3：弃牌堆只有不匹配的卡 → 返回 null ===
const e4 = onDeathEffect(
  { card: stemCard, friendlyField: [null], discardPile: [{ id: 'flu_virus', type: 'character', faction: 'pathogen', rarity: 'R', hp: 1500, maxHp: 1500 }] },
  params
)
ok('弃牌堆全是不匹配卡 → 返回 null', e4 === null)

// === 边缘 4：场上无空位 → 返回 null(无地方召唤) ===
const fullField = [stemCard, stemCard, stemCard, stemCard, stemCard].map(c => ({ ...c, currentHp: 1 }))
const e5 = onDeathEffect({ card: stemCard, friendlyField: fullField, discardPile: mockDiscard }, params)
ok('场上无空位 → 返回 null', e5 === null)

// === 边缘 5：弃牌堆里同时有干细胞本身(防自循环) ===
const discardWithSelf = [...mockDiscard, { id: 'stem_cell_morph', type: 'character', faction: 'body', rarity: 'R', hp: 5000, maxHp: 5000 }]
const e6 = onDeathEffect({ card: stemCard, friendlyField: [null], discardPile: discardWithSelf }, params)
ok('e6 仍能分化(因 mockDiscard 里有合格 body R)', e6?.type === 'SUMMON_CARD')
ok('e6 召唤的不是干细胞本身', e6?.card?.id !== 'stem_cell_morph')

// === 边缘 6：100 次随机抽 — 验证分布合理(双卡候选时两个都该出现过) ===
const ids = new Set()
for (let i = 0; i < 100; i++) {
  const e = onDeathEffect({ card: stemCard, friendlyField: [null], discardPile: mockDiscard }, params)
  if (e?.card?.id) ids.add(e.card.id)
}
ok('100 次随机里两个候选(red_blood_cell + platelet_guardian)都出现过', ids.has('red_blood_cell') && ids.has('platelet_guardian'))
ok('100 次随机没出现不该出现的(white_blood_cell/flu_virus/event)', !ids.has('white_blood_cell') && !ids.has('flu_virus') && !ids.has('event_immune'))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)

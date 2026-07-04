// ----------------------------------------------------------------
//  battleReducer — 棋盘状态机（E5c）
//
//  把原本散落在 useBattle 里的十几个 useState「棋盘状态」逐组收进 reducer：
//  reducer 每次拿到最新 state（消掉 useLatestRef 手动镜像的根本需求），
//  且一个 dispatch 可原子地改多组状态。
//
//  迁移是**分组切片**推进（见 outputs/e5c-reducer-migration-plan.md）：
//  E5c-0 只迁 powerBank（本文件当前形态）；后续切片往 player/enemy 子树
//  和顶层逐步加 field/leaderHp/energy/turn/phase…
//
//  ⚠️ 不变式：reducer 必须让「没改的子树引用不变」（只 spread 被改的一侧），
//  否则触发无谓重渲染/动画抖动。纯函数、无副作用、无返回额外值。
// ----------------------------------------------------------------

export const initialBattleState = {
  player: { powerBank: { stored: 0, intact: true }, discard: [] },
  enemy: { powerBank: { stored: 0, intact: true }, discard: [] },
}

export function battleReducer(state, action) {
  switch (action.type) {
    // --- Power Bank（E5c-0）---
    case 'POWERBANK_SET': {
      const { side, powerBank } = action
      return { ...state, [side]: { ...state[side], powerBank } }
    }
    case 'POWERBANK_ADD': {
      const { side, amount } = action
      const pb = state[side].powerBank
      return { ...state, [side]: { ...state[side], powerBank: { ...pb, stored: pb.stored + amount } } }
    }
    case 'POWERBANK_RESTORE': {
      const { side } = action
      const pb = state[side].powerBank
      return { ...state, [side]: { ...state[side], powerBank: { ...pb, intact: true } } }
    }

    // --- 弃牌堆 discard（E5c-1）---
    case 'DISCARD_ADD': {
      // 追加卡（等价旧 setDiscard(prev => [...prev, ...cards])）
      const { side, cards } = action
      return { ...state, [side]: { ...state[side], discard: [...state[side].discard, ...cards] } }
    }
    case 'DISCARD_SET': {
      // 整堆替换（阵营标记消耗后的 updatedPile / 重置为 []）
      const { side, pile } = action
      return { ...state, [side]: { ...state[side], discard: pile } }
    }
    case 'DISCARD_REMOVE_UID': {
      // 按 uid 移除首个匹配（discard_to_hand / revive_from_discard / 长老记忆取回）
      const { side, uid } = action
      const pile = state[side].discard
      const idx = pile.findIndex(c => c.uid === uid)
      if (idx === -1) return state
      return { ...state, [side]: { ...state[side], discard: [...pile.slice(0, idx), ...pile.slice(idx + 1)] } }
    }

    default:
      return state
  }
}

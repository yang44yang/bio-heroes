import { useRef } from 'react'

// 「最新值 ref」—— 每次渲染把最新 value 写进 ref，供 useCallback / effect 里读到最新 state（绕开 stale-closure）。
// 取代 useBattle 里 14 处手写的 `const xRef = useRef(x); xRef.current = x` 双写（决策E5a）：
//   - 让"漏同步一处就竞态"的脆弱性从结构上消失（helper 保证每渲染必同步，无法忘写）；
//   - 明确标出哪些 ref 是 state-mirror（区别于 Set/计数器等真·可变 ref），为后续 reducer 迁移铺路。
// 行为与手写双写完全一致：首渲染 useRef(value) 初始化，之后每渲染 ref.current = value。
export function useLatestRef(value) {
  const ref = useRef(value)
  ref.current = value
  return ref
}

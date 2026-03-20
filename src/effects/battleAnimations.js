/**
 * 战斗动画序列 — 使用 Web Animations API (WAAPI)
 * 原生浏览器 API，无第三方依赖
 */

function animateEl(el, props, opts = {}) {
  if (!el) return Promise.resolve()
  const { duration = 200 } = opts

  const parts = []
  if (props.x != null) parts.push(`translateX(${props.x}px)`)
  if (props.y != null) parts.push(`translateY(${props.y}px)`)
  if (props.scale != null) parts.push(`scale(${props.scale})`)
  if (props.rotate != null) parts.push(`rotate(${props.rotate}deg)`)
  const transform = parts.length > 0 ? parts.join(' ') : undefined

  const keyframe = {}
  if (transform) keyframe.transform = transform
  if (props.opacity != null) keyframe.opacity = props.opacity
  if (props.filter != null) keyframe.filter = props.filter

  el.getAnimations().forEach(a => {
    try { a.commitStyles() } catch (e) { /* ignore */ }
    a.cancel()
  })

  const anim = el.animate([keyframe], {
    duration,
    fill: 'forwards',
    easing: opts.easing || 'ease-out',
  })

  return anim.finished.then(() => {
    try { anim.commitStyles() } catch (e) { /* ignore */ }
    anim.cancel()
  }).catch(() => {})
}

function resetEl(el) {
  if (!el) return
  el.getAnimations().forEach(a => a.cancel())
  el.style.transform = ''
  el.style.opacity = ''
  el.style.filter = ''
}

/**
 * 攻击冲撞：蓄力 → 冲刺 → 命中闪光 → 目标抖动 → 退回
 */
export async function attackSequence(atkEl, defEl, opts = {}) {
  if (!atkEl) return
  const { isPlayerAttacking = true, onHit } = opts
  const rushX = isPlayerAttacking ? 120 : -120
  const rushY = isPlayerAttacking ? -30 : 30
  const windupX = isPlayerAttacking ? -15 : 15

  // 蓄力
  await animateEl(atkEl, { x: windupX, scale: 1.08 }, { duration: 120 })
  // 冲刺
  await animateEl(atkEl, { x: rushX, y: rushY, scale: 1.15 }, { duration: 150 })
  // 命中
  onHit?.()

  if (defEl) {
    // 命中闪光 + 抖动
    await animateEl(defEl, { x: 12, filter: 'brightness(2.5)' }, { duration: 40 })
    await animateEl(defEl, { x: -12, filter: 'brightness(2.0)' }, { duration: 40 })
    await animateEl(defEl, { x: 10, filter: 'brightness(1.5)' }, { duration: 40 })
    await animateEl(defEl, { x: -10 }, { duration: 30 })
    await animateEl(defEl, { x: 0, filter: 'brightness(1)' }, { duration: 30 })
  }

  // 退回
  await animateEl(atkEl, { x: 0, y: 0, scale: 1 }, { duration: 250 })
  resetEl(atkEl)
  if (defEl) resetEl(defEl)
}

/**
 * 受伤抖动 — 红色闪烁 + 左右震动
 */
export async function hurtShake(el) {
  if (!el) return
  await animateEl(el, { x: -8, filter: 'brightness(1.8) saturate(2)' }, { duration: 50 })
  await animateEl(el, { x: 8 }, { duration: 50 })
  await animateEl(el, { x: -5 }, { duration: 40 })
  await animateEl(el, { x: 5 }, { duration: 40 })
  await animateEl(el, { x: 0, filter: 'brightness(1) saturate(1)' }, { duration: 60 })
  resetEl(el)
}

/**
 * 击败消散 — 缩小 + 旋转 + 淡出
 */
export async function defeatSequence(el) {
  if (!el) return
  await animateEl(el, { scale: 1.1, filter: 'brightness(1.5)' }, { duration: 100 })
  await animateEl(el, { opacity: 0, scale: 0.3, rotate: 15, y: 50, filter: 'brightness(0.5) grayscale(1)' }, { duration: 400 })
  resetEl(el)
}

/**
 * Power Bank 碎裂 — 放大 → 闪白 → 震动 → 缩回
 */
export async function powerBankBreak(el) {
  if (!el) return
  await animateEl(el, { scale: 1.3, filter: 'brightness(3)' }, { duration: 100 })
  await animateEl(el, { x: -6 }, { duration: 40 })
  await animateEl(el, { x: 6 }, { duration: 40 })
  await animateEl(el, { x: -4 }, { duration: 30 })
  await animateEl(el, { x: 0, scale: 1, filter: 'brightness(1)' }, { duration: 200 })
  resetEl(el)
}

/**
 * SP 觉醒光柱 — 从小到大放大 + 金色闪光
 */
export async function spSummonFlash(el) {
  if (!el) return
  await animateEl(el, { scale: 0.3, opacity: 0, filter: 'brightness(3)' }, { duration: 0 })
  await animateEl(el, { scale: 1.2, opacity: 1, filter: 'brightness(2.5)' }, { duration: 300, easing: 'ease-out' })
  await animateEl(el, { scale: 0.95, filter: 'brightness(1.5)' }, { duration: 150 })
  await animateEl(el, { scale: 1, filter: 'brightness(1)' }, { duration: 200 })
  resetEl(el)
}

/**
 * 事件卡飞入效果 — 从下方飞入中央
 */
export async function eventCardFlyIn(el) {
  if (!el) return
  await animateEl(el, { y: 80, opacity: 0, scale: 0.5 }, { duration: 0 })
  await animateEl(el, { y: 0, opacity: 1, scale: 1.1 }, { duration: 250, easing: 'ease-out' })
  await animateEl(el, { scale: 1 }, { duration: 150 })
  resetEl(el)
}

/**
 * 出牌放置动画 — 从手牌区飞入战场位
 */
export async function cardPlaceAnimation(el) {
  if (!el) return
  await animateEl(el, { y: 30, opacity: 0, scale: 0.8 }, { duration: 0 })
  await animateEl(el, { y: -5, opacity: 1, scale: 1.05 }, { duration: 200, easing: 'ease-out' })
  await animateEl(el, { y: 0, scale: 1 }, { duration: 100 })
  resetEl(el)
}

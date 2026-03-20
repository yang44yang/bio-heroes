/**
 * soundManager.js — Bio Heroes 音效系统
 * 使用 Web Audio API 生成合成音效（无需外部音频文件）
 *
 * 风格：8-bit / 像素风 + 龙珠卡牌游戏感
 */

let audioCtx = null
let masterGain = null
let muted = false
let volume = 0.5

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = volume
    masterGain.connect(audioCtx.destination)
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

function getOutput() {
  getCtx()
  return masterGain
}

// === 基础工具 ===

function playTone(freq, duration, type = 'square', gainVal = 0.3, detune = 0) {
  if (muted) return
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  if (detune) osc.detune.value = detune
  gain.gain.value = gainVal
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(getOutput())
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

function playNoise(duration, gainVal = 0.2, filter = null) {
  if (muted) return
  const ctx = getCtx()
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.value = gainVal
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  if (filter) {
    const biquad = ctx.createBiquadFilter()
    biquad.type = filter.type || 'lowpass'
    biquad.frequency.value = filter.freq || 1000
    source.connect(biquad)
    biquad.connect(gain)
  } else {
    source.connect(gain)
  }
  gain.connect(getOutput())
  source.start()
  source.stop(ctx.currentTime + duration)
}

// === 音效定义 ===

const sounds = {
  /** 出牌到战场 — 短促清脆的放置音 */
  cardPlay() {
    playTone(800, 0.08, 'square', 0.25)
    setTimeout(() => playTone(1200, 0.06, 'square', 0.15), 40)
  },

  /** 普通攻击 — 中等力度撞击音 */
  attack() {
    playNoise(0.12, 0.35, { type: 'highpass', freq: 800 })
    playTone(200, 0.15, 'sawtooth', 0.3)
    setTimeout(() => playTone(150, 0.1, 'sawtooth', 0.2), 50)
  },

  /** 卡牌被击杀 — 低沉碎裂消散音 */
  cardKill() {
    playNoise(0.3, 0.3, { type: 'lowpass', freq: 600 })
    playTone(300, 0.15, 'sawtooth', 0.25)
    setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.2), 80)
    setTimeout(() => playTone(80, 0.25, 'sawtooth', 0.15), 160)
  },

  /** 受到伤害 — 短促受击音 */
  hit() {
    playTone(250, 0.1, 'square', 0.25)
    playNoise(0.08, 0.2, { type: 'highpass', freq: 1200 })
  },

  /** 回复HP — 明亮上升治愈音 */
  heal() {
    playTone(523, 0.12, 'sine', 0.2)
    setTimeout(() => playTone(659, 0.12, 'sine', 0.2), 80)
    setTimeout(() => playTone(784, 0.15, 'sine', 0.25), 160)
  },

  /** 主人受到伤害 — 厚重震撼重击音 */
  leaderHit() {
    playTone(80, 0.3, 'sawtooth', 0.4)
    playNoise(0.2, 0.35, { type: 'lowpass', freq: 400 })
    setTimeout(() => playTone(60, 0.25, 'sawtooth', 0.3), 100)
  },

  /** Power Bank 充能 — 持续低频蓄力音 */
  bankCharge() {
    const ctx = getCtx()
    if (muted) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 120
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.4)
    gain.gain.value = 0.15
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.connect(gain)
    gain.connect(getOutput())
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  },

  /** Power Bank 打破 — 爆！释放音（最强最爽） */
  bankBreak() {
    // 低频爆发
    playTone(60, 0.4, 'sawtooth', 0.5)
    playNoise(0.3, 0.45, { type: 'lowpass', freq: 800 })
    // 上升扫频
    setTimeout(() => {
      const ctx = getCtx()
      if (muted) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.value = 200
      osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3)
      gain.gain.value = 0.35
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(getOutput())
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    }, 100)
    // 高频闪光
    setTimeout(() => playTone(1500, 0.15, 'square', 0.2), 250)
    setTimeout(() => playTone(2000, 0.1, 'square', 0.15), 350)
  },

  /** 回合开始 — 简短提示音 */
  turnStart() {
    playTone(660, 0.08, 'square', 0.15)
    setTimeout(() => playTone(880, 0.1, 'square', 0.18), 60)
  },

  /** 胜利 — 龙珠风格胜利号角 */
  victory() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, 'square', 0.25), i * 120)
    })
    setTimeout(() => {
      playTone(1047, 0.4, 'square', 0.3)
      playTone(1047, 0.4, 'sine', 0.2)
    }, 500)
  },

  /** 失败 — 低沉鼓点（不要太沮丧） */
  defeat() {
    playTone(330, 0.25, 'sine', 0.2)
    setTimeout(() => playTone(262, 0.25, 'sine', 0.2), 200)
    setTimeout(() => playTone(196, 0.4, 'sine', 0.25), 400)
  },

  /** 问答弹出 — 铛~挑战音 */
  quizPopup() {
    playTone(880, 0.15, 'square', 0.2)
    setTimeout(() => playTone(1100, 0.12, 'square', 0.18), 100)
    setTimeout(() => playTone(1320, 0.2, 'square', 0.22), 200)
  },

  /** 答对 — 叮叮叮！连续上升音 */
  quizCorrect() {
    const notes = [660, 880, 1100, 1320]
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.1, 'square', 0.22), i * 70)
    })
  },

  /** 答错 — 嗡~低沉短音（不要惩罚感太强） */
  quizWrong() {
    playTone(200, 0.2, 'sine', 0.15)
    setTimeout(() => playTone(180, 0.25, 'sine', 0.12), 120)
  },

  /** 觉醒触发 — 轰隆！觉醒爆发音 */
  awaken() {
    playTone(110, 0.3, 'sawtooth', 0.35)
    playNoise(0.2, 0.3, { type: 'lowpass', freq: 600 })
    setTimeout(() => {
      playTone(440, 0.15, 'square', 0.25)
      playTone(880, 0.15, 'square', 0.2)
    }, 150)
    setTimeout(() => playTone(1760, 0.2, 'square', 0.25), 300)
  },

  /** 科学家模式激活 — 华丽上升音 */
  scientistMode() {
    const notes = [440, 554, 659, 880, 1047, 1320]
    notes.forEach((f, i) => {
      setTimeout(() => {
        playTone(f, 0.15, 'square', 0.2)
        playTone(f, 0.15, 'sine', 0.15)
      }, i * 80)
    })
  },

  /** 换卡确认 */
  mulligan() {
    playTone(400, 0.08, 'square', 0.15)
    setTimeout(() => playTone(600, 0.08, 'square', 0.15), 60)
    setTimeout(() => playTone(500, 0.1, 'square', 0.18), 120)
  },

  /** 阶段切换（出牌→战斗） */
  phaseChange() {
    playTone(440, 0.06, 'square', 0.15)
    setTimeout(() => playTone(660, 0.08, 'square', 0.18), 50)
  },

  /** SP 觉醒召唤 — 史诗登场音 */
  spSummon() {
    // 低频震动开场
    playTone(80, 0.5, 'sawtooth', 0.4)
    playNoise(0.3, 0.3, { type: 'lowpass', freq: 500 })
    // 上升号角
    setTimeout(() => {
      const notes = [330, 440, 554, 660, 880]
      notes.forEach((f, i) => {
        setTimeout(() => {
          playTone(f, 0.15, 'square', 0.25)
          playTone(f * 2, 0.1, 'sine', 0.15)
        }, i * 60)
      })
    }, 200)
    // 最终闪光
    setTimeout(() => playTone(1760, 0.25, 'square', 0.3), 600)
    setTimeout(() => playTone(2200, 0.15, 'sine', 0.2), 700)
  },
}

// === 公共 API ===

export function playSound(name) {
  try {
    if (sounds[name]) sounds[name]()
  } catch (e) {
    // 忽略音频错误（例如 Safari 初始化限制）
  }
}

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v))
  if (masterGain) masterGain.gain.value = volume
}

export function getVolume() {
  return volume
}

export function toggleMute() {
  muted = !muted
  return muted
}

export function isMuted() {
  return muted
}

/**
 * 初始化音频上下文（需要在用户交互时调用）
 */
export function initAudio() {
  getCtx()
}

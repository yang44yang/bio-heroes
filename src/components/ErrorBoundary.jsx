import React from 'react'
import { exportSave, resetSave } from '../utils/saveManager'

/**
 * 根错误边界 —— 把「白屏砖」变成「可恢复界面」
 *
 * 为什么需要它：存档的各个 load 函数（loadTutorialProgress / loadCampaignProgress 等）
 * 对 JSON.parse 的结果零形状校验，直接返回。一份形状歪掉的存档 → 消费方读
 * `tut.completedLevels.length` → undefined.length → 渲染期抛错 → 整个 app 白屏。
 * 而白屏时玩家**够不到设置里的「重置存档」按钮**（app 根本没渲染），游戏就砖了，
 * 只能靠爸爸开 devtools 手动清 localStorage 救 —— 7 岁的齐齐自己无解。
 *
 * ★ 按钮顺序是刻意的：先「导出备份」（无损）再「重置」（毁灭性）。
 *   永远不能只给重置 —— 那等于让一个慌了的小孩一键抹掉自己三个月的收藏。
 */
export default class ErrorBoundary extends React.Component {
  state = { error: null, exported: false }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // 留给爸爸在 devtools 里看
    console.error('[Bio Heroes] 渲染崩溃：', error, info?.componentStack)
  }

  handleExport = () => {
    try {
      exportSave()
      this.setState({ exported: true })
    } catch (e) {
      console.error('[Bio Heroes] 导出存档失败：', e)
    }
  }

  handleReset = () => {
    if (!window.confirm('确定要重置存档吗？\n\n所有卡牌、金币、战役进度都会清空，且无法撤销。\n建议先点上面的「先备份我的存档」。')) return
    resetSave()
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <div className="text-5xl text-center mb-3">🔬</div>
          <h1 className="text-xl font-bold text-center mb-2">游戏遇到了一点问题</h1>
          <p className="text-sm text-gray-300 text-center mb-6">
            别担心，你的存档还在。先把它备份下来，再看要不要重置。
          </p>

          <button
            onClick={this.handleExport}
            className="w-full mb-3 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold transition-colors"
          >
            {this.state.exported ? '✓ 已备份（可再存一份）' : '① 先备份我的存档'}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full mb-3 px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-bold transition-colors"
          >
            ② 重新打开试试
          </button>

          <button
            onClick={this.handleReset}
            className="w-full px-4 py-2 rounded-xl bg-transparent border border-red-800 text-red-400 text-sm hover:bg-red-950 transition-colors"
          >
            ③ 还是不行 → 重置存档（会清空一切）
          </button>

          <details className="mt-5 text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-400">技术细节（给爸爸看）</summary>
            <pre className="mt-2 p-2 bg-gray-950 rounded overflow-x-auto whitespace-pre-wrap break-all">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// 申请持久化存储 —— WebKit/ITP 会在「用了浏览器但满 7 天没访问本站」后清空 localStorage
// （计的是浏览器使用天数而非自然日：天天用 iPad、但两周没开本游戏，一样会被清）。
// 加到主屏幕的 PWA 天然豁免；这个调用是给「在浏览器标签页里玩」的场景争取的一层保险。
// 不支持/被拒绝都无所谓 —— 静默忽略，绝不阻塞启动。
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  navigator.storage.persisted()
    .then((already) => (already ? true : navigator.storage.persist()))
    .catch(() => { /* 不支持就算了 */ })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

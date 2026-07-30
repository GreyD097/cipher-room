import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// 初始化主题（防止刷新时闪烁）
const savedTheme = localStorage.getItem('cipher:theme')
if (savedTheme === 'light') {
  document.documentElement.classList.add('light')
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

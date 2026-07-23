import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { useEditor } from './store.ts'

// PWA: 新バージョン公開時は「更新があります」トーストを表示し、ユーザー操作で更新(要件8章)
const updateSW = registerSW({
  onNeedRefresh() {
    useEditor.getState().notifyUpdateReady(() => void updateSW(true))
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { createRoot } from 'react-dom/client'
import './design-system/tokens.css'
import './design-system/foundations.css'
import './index.css'
import App from './App.tsx'
import { brandFavicon } from './lib/assets'

const staleChunkReloadKey = 'tap2connect-stale-chunk-reload'

function recoverFromStaleChunk() {
  const lastReload = Number(sessionStorage.getItem(staleChunkReloadKey) || 0)
  if (Date.now() - lastReload < 15_000) return
  sessionStorage.setItem(staleChunkReloadKey, String(Date.now()))
  window.location.reload()
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  recoverFromStaleChunk()
})

window.addEventListener('unhandledrejection', (event) => {
  const message = String(event.reason?.message || event.reason || '')
  if (/dynamically imported module|importing a module script failed|error loading dynamically imported module/i.test(message)) {
    event.preventDefault()
    recoverFromStaleChunk()
  }
})

const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null
if (favicon) favicon.href = brandFavicon

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('React root element was not found.')
}

createRoot(rootElement).render(<App />)

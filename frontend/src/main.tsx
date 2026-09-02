import { createRoot } from 'react-dom/client'
import './design-system/tokens.css'
import './design-system/foundations.css'
import './index.css'
import App from './App.tsx'
import { brandFavicon } from './lib/assets'

const favicon = document.getElementById('app-favicon') as HTMLLinkElement | null
if (favicon) favicon.href = brandFavicon

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('React root element was not found.')
}

createRoot(rootElement).render(<App />)

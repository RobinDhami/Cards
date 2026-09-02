import LogOut from 'lucide-react/dist/esm/icons/log-out.js'
import { apiFetch, backendHref } from '../../lib/api'
import { brandLogo } from '../../lib/assets'
import { platformNavigation } from './platformNavigation'
import './ManageShell.css'

export function PlatformSidebar({
  allowedModules,
  userName,
  userRole,
}: {
  allowedModules: string[]
  userName: string
  userRole: string
}) {
  const nav = platformNavigation(allowedModules)

  async function signOut() {
    try {
      const response = await apiFetch<{ redirectPath?: string }>('/api/session/logout/', { method: 'POST' })
      window.location.assign(response.redirectPath || '/platform/login/')
    } catch {
      window.location.assign(backendHref('/logout/'))
    }
  }

  return (
    <aside className="manage-sidebar platform-editor-sidebar">
      <div className="manage-brand">
        <span className="manage-brand-mark"><img src={brandLogo} alt="" /></span>
        <span><strong>Tap2Connect</strong><small>Platform workspace</small></span>
      </div>
      <nav className="manage-nav" aria-label="Platform navigation">
        {nav.map((item) => {
          const Icon = item.icon
          return <a className={item.active ? 'is-active' : ''} href={item.href} key={item.href}><Icon size={17} /><span>{item.label}</span></a>
        })}
      </nav>
      <div className="manage-account">
        <span className="manage-avatar">{userName.slice(0, 2).toUpperCase()}</span>
        <span><strong>{userName}</strong><small>{userRole}</small></span>
        <button type="button" onClick={() => void signOut()} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
      </div>
    </aside>
  )
}

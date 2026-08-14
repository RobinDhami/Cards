import { useState } from 'react'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import Bell from 'lucide-react/dist/esm/icons/bell.js'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down.js'
import LogOut from 'lucide-react/dist/esm/icons/log-out.js'
import Menu from 'lucide-react/dist/esm/icons/menu.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { apiFetch, backendHref } from '../../lib/api'
import './ManageShell.css'

export type ShellIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

export type ShellNavItem = {
  label: string
  href: string
  icon: ShellIcon
  active?: boolean
}
type ManageShellProps = {
  brand: string
  brandDetail?: string
  logo?: string
  nav: ShellNavItem[]
  title: string
  subtitle?: string
  userName?: string
  userRole?: string
  actions?: ReactNode
  notificationsHref?: string
  children: ReactNode
  accent?: string
  schoolOptions?: Array<{ id: number; name: string }>
  selectedSchool?: number | null
  onSchoolChange?: (schoolId: number) => void
}

export function ManageShell({
  brand,
  brandDetail,
  logo,
  nav,
  title,
  subtitle,
  userName = 'Account',
  userRole = 'Workspace',
  actions,
  notificationsHref,
  children,
  accent = '#0b4bcb',
  schoolOptions,
  selectedSchool,
  onSchoolChange,
}: ManageShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function signOut() {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      const response = await apiFetch<{ redirectPath?: string }>('/api/session/logout/', {
        method: 'POST',
      })
      window.location.assign(response.redirectPath || '/login/')
    } catch {
      window.location.assign(backendHref('/logout/'))
    }
  }

  const sidebar = (
    <aside className="manage-sidebar">
      <div className="manage-brand">
        <span className="manage-brand-mark">
          {logo ? <img src={logo} alt="" /> : brand.slice(0, 1).toUpperCase()}
        </span>
        <span>
          <strong>{brand}</strong>
          <small>{brandDetail}</small>
        </span>
      </div>
      <nav className="manage-nav" aria-label={`${brand} navigation`}>
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <a
              className={item.active ? 'is-active' : ''}
              href={item.href}
              key={item.href}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>
      <div className="manage-account">
        <span className="manage-avatar">{userName.slice(0, 2).toUpperCase()}</span>
        <span>
          <strong>{userName}</strong>
          <small>{userRole}</small>
        </span>
        <button type="button" onClick={signOut} title="Sign out" aria-label="Sign out" disabled={isSigningOut}>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )

  return (
    <div className="manage-app" style={{ '--manage-accent': accent } as React.CSSProperties}>
      {sidebar}
      <div
        className={`manage-overlay${menuOpen ? ' is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <div className={`manage-mobile-drawer${menuOpen ? ' is-open' : ''}`}>
        <button
          className="manage-icon-button manage-close"
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
        {sidebar}
      </div>

      <main className="manage-main">
        <header className="manage-header">
          <button
            className="manage-icon-button manage-menu"
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={19} />
          </button>
          <div className="manage-title">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="manage-header-actions">
            {schoolOptions && schoolOptions.length > 0 ? (
              <label className="manage-school-select">
                <span className="sr-only">School workspace</span>
                <select
                  value={selectedSchool ?? ''}
                  onChange={(event) => onSchoolChange?.(Number(event.target.value))}
                >
                  {schoolOptions.map((school) => (
                    <option value={school.id} key={school.id}>{school.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </label>
            ) : null}
            {actions}
            {notificationsHref ? (
              <a className="manage-icon-button" href={notificationsHref} title="Notifications" aria-label="Notifications">
                <Bell size={17} />
              </a>
            ) : (
              <button className="manage-icon-button" type="button" title="Notifications" aria-label="Notifications">
                <Bell size={17} />
              </button>
            )}
          </div>
        </header>
        <div className="manage-content">{children}</div>
      </main>
    </div>
  )
}

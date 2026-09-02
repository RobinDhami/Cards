import { useEffect, useState } from 'react'
import { ManageShell } from '../../components/manage/ManageShell'
import { platformNavigation } from '../../components/manage/platformNavigation'
import { apiFetch } from '../../lib/api'
import { brandLogo } from '../../lib/assets'
import { AdvancedCardEditor } from './CardEditor'


export function CardEditorPage() {
  const isTemplateStudio = window.location.pathname === '/dashboard/templates/'
    || window.location.pathname === '/dashboard/templates'

  const [session, setSession] = useState<{
    redirectPath: string
    user: { displayName: string; role: string }
    platformAccess: { isSuperAdmin: boolean; allowedModules: string[] }
  } | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [platformSidebarMode, setPlatformSidebarMode] = useState<'default' | 'compact'>('compact')

  useEffect(() => {
    if (!isTemplateStudio) return
    document.title = 'Templates | Tap2Connect'
    apiFetch<NonNullable<typeof session>>('/api/session/').then(setSession).catch(() => {
      window.location.assign('/platform/login/')
    })
  }, [isTemplateStudio])

  const editor = (
    <AdvancedCardEditor
      open
      initialFrontDesign="midnight"
      initialBackDesign="minimal"
      finish="pvc"
      mode={isTemplateStudio ? 'template-studio' : 'design'}
      focusMode={focusMode}
      compactPlatformSidebar={isTemplateStudio && platformSidebarMode === 'compact'}
      onFocusModeChange={setFocusMode}
      onClose={() => {
        window.location.assign(isTemplateStudio ? (session?.redirectPath || '/platform/login/') : '/')
      }}
    />
  )

  if (!isTemplateStudio) return editor
  if (!session) return <div className="manage-state">Loading Template Studio…</div>

  return (
    <ManageShell
      brand="Tap2Connect"
      brandDetail="Platform administration"
      logo={brandLogo}
      nav={platformNavigation(session.platformAccess.allowedModules)}
      title="Templates"
      subtitle="Create and manage reusable platform card templates"
      userName={session.user.displayName}
      userRole={session.platformAccess.isSuperAdmin ? 'Super Admin' : 'Platform Staff'}
      sidebarMode={focusMode ? 'hidden' : platformSidebarMode}
      onSidebarModeChange={setPlatformSidebarMode}
    >
      {editor}
    </ManageShell>
  )
}

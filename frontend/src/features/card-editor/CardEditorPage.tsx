import { useEffect, useState } from 'react'
import { apiFetch } from '../../lib/api'
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
      onFocusModeChange={setFocusMode}
      onClose={() => {
        window.location.assign(isTemplateStudio ? (session?.redirectPath || '/platform/login/') : '/')
      }}
    />
  )

  if (!isTemplateStudio) return editor
  if (!session) return <div className="manage-state">Loading Template Studio…</div>
  return editor
}

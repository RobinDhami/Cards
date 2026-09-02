import { useEffect, useState } from 'react'
import { PlatformSidebar } from '../../components/manage/PlatformSidebar'
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

  useEffect(() => {
    if (!isTemplateStudio) return
    apiFetch<NonNullable<typeof session>>('/api/session/').then(setSession).catch(() => {
      window.location.assign('/platform/login/')
    })
  }, [isTemplateStudio])

  return (
    <>
      {isTemplateStudio && session ? (
        <PlatformSidebar
          allowedModules={session.platformAccess.allowedModules}
          userName={session.user.displayName}
          userRole={session.platformAccess.isSuperAdmin ? 'Super Admin' : 'Platform Staff'}
        />
      ) : null}
      <AdvancedCardEditor
        open
        initialFrontDesign="midnight"
        initialBackDesign="minimal"
        finish="pvc"
        mode={isTemplateStudio ? 'template-studio' : 'design'}
        onClose={() => {
          window.location.assign(isTemplateStudio ? (session?.redirectPath || '/platform/login/') : '/')
        }}
      />
    </>
  )
}

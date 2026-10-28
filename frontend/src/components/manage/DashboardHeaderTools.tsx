import { useState } from 'react'
import Headphones from 'lucide-react/dist/esm/icons/headphones.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Ticket from 'lucide-react/dist/esm/icons/ticket.js'
import type { ShellNavItem } from './ManageShell'
import { organizationWorkspaceHref } from '../../lib/organizationRoute'
import './DashboardHeaderTools.css'

export function DashboardHeaderTools({
  nav: _nav,
  organizationId,
  enableSupport = false,
  canRaiseSupport = true,
}: {
  nav: ShellNavItem[]
  organizationId?: number
  enableSupport?: boolean
  canRaiseSupport?: boolean
}) {
  const [supportOpen, setSupportOpen] = useState(false)
  const supportHref = organizationId ? organizationWorkspaceHref(organizationId, 'support') : ''

  return (
    <div className="dashboard-header-tools">
      {enableSupport && supportHref ? (
        <div className="dashboard-support-control">
          <button type="button" className="manage-icon-button" aria-label="Support" title="Support" aria-expanded={supportOpen} onClick={() => setSupportOpen((open) => !open)}><Headphones size={17} /></button>
          {supportOpen ? <div className="dashboard-support-popover" role="dialog" aria-label="Support options"><strong>Support</strong>{canRaiseSupport ? <a className="dashboard-support-action is-primary" href={`${supportHref}?new=1`}><Plus size={15} />Raise ticket</a> : null}<a className="dashboard-support-action is-secondary" href={supportHref}><Ticket size={15} />View tickets</a></div> : null}
        </div>
      ) : null}
    </div>
  )
}

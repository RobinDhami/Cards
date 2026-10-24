import { useDeferredValue, useMemo, useState } from 'react'
import Headphones from 'lucide-react/dist/esm/icons/headphones.js'
import Plus from 'lucide-react/dist/esm/icons/plus.js'
import Search from 'lucide-react/dist/esm/icons/search.js'
import Ticket from 'lucide-react/dist/esm/icons/ticket.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import type { ShellNavItem } from './ManageShell'
import './DashboardHeaderTools.css'

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function fuzzyScore(candidate: string, query: string) {
  const target = normalize(candidate)
  const term = normalize(query)
  if (!term) return -1
  if (target === term) return 1000
  if (target.startsWith(term)) return 800 - (target.length - term.length)
  const containedAt = target.indexOf(term)
  if (containedAt >= 0) return 600 - containedAt
  let targetIndex = 0
  let gaps = 0
  for (const character of term) {
    const matchIndex = target.indexOf(character, targetIndex)
    if (matchIndex < 0) return -1
    gaps += matchIndex - targetIndex
    targetIndex = matchIndex + 1
  }
  return 300 - gaps
}

export function DashboardHeaderTools({
  nav,
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const matches = useMemo(() => {
    if (!deferredQuery.trim()) return []
    return nav
      .map((item) => ({ item, score: fuzzyScore(`${item.label} ${item.href}`, deferredQuery) }))
      .filter((result) => result.score >= 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8)
      .map((result) => result.item)
  }, [deferredQuery, nav])
  const supportHref = organizationId ? `/dashboard/organizations/${organizationId}/support/` : ''

  return (
    <div className="dashboard-header-tools">
      <button type="button" className="manage-icon-button" aria-label="Search dashboard" title="Search dashboard" onClick={() => setSearchOpen(true)}><Search size={17} /></button>
      {enableSupport && supportHref ? (
        <div className="dashboard-support-control">
          <button type="button" className="manage-icon-button" aria-label="Support" title="Support" aria-expanded={supportOpen} onClick={() => setSupportOpen((open) => !open)}><Headphones size={17} /></button>
          {supportOpen ? <div className="dashboard-support-popover" role="dialog" aria-label="Support options"><strong>Support</strong>{canRaiseSupport ? <a className="dashboard-support-action is-primary" href={`${supportHref}?new=1`}><Plus size={15} />Raise ticket</a> : null}<a className="dashboard-support-action is-secondary" href={supportHref}><Ticket size={15} />View tickets</a></div> : null}
        </div>
      ) : null}
      {searchOpen ? (
        <div className="dashboard-search-backdrop" role="presentation" onMouseDown={() => setSearchOpen(false)}>
          <section className="dashboard-search-dialog" role="dialog" aria-modal="true" aria-label="Search dashboard" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dashboard-search-input"><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dashboard" /><button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={16} /></button></div>
            <div className="dashboard-search-results">
              {!query.trim() ? <span>Type to search your dashboard.</span> : null}
              {matches.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
              {query.trim() && matches.length === 0 ? <span>No matching section.</span> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

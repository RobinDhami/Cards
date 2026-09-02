import { useEffect, useMemo, useState } from 'react'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check.js'
import Building2 from 'lucide-react/dist/esm/icons/building-2.js'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card.js'
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template.js'
import UserPlus from 'lucide-react/dist/esm/icons/user-plus.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import { ManageShell } from '../../components/manage/ManageShell'
import { platformNavigation } from '../../components/manage/platformNavigation'
import { apiFetch, displayError } from '../../lib/api'
import { brandLogo } from '../../lib/assets'
import './PlatformInsights.css'

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
type ActivityType = 'organization_created' | 'member_added' | 'professional_profile_created' | 'template_published' | 'card_assigned'
type ActivityItem = { id: string; type: ActivityType; title: string; detail: string; createdAt: string }
type GrowthMonth = { key: string; label: string; longLabel: string; members: number; organizations: number }
type CompositionItem = { key: string; label: string; value: number; color: string }
type OrganizationRanking = { id: number; name: string; memberCount: number; url: string }
type PlatformContext = {
  user: { displayName: string; roleLabel: string }
  platformAccess: { isSuperAdmin: boolean; allowedModules: string[] }
}
type ActivityPayload = PlatformContext & { recentActivity: ActivityItem[] }
type ReportsPayload = PlatformContext & {
  kpis: {
    organizations: number
    organizationMembers: number
    professionalProfiles: number
    publishedTemplates: number
    activeAssignedCards: number
  }
  growth: { months: GrowthMonth[] }
  organizationsByMemberCount: OrganizationRanking[]
  memberComposition: CompositionItem[]
}

const numberFormatter = new Intl.NumberFormat('en-US')
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const activityMeta: Record<ActivityType, { icon: Icon; label: string }> = {
  organization_created: { icon: Building2, label: 'Organizations' },
  member_added: { icon: UserPlus, label: 'Members' },
  professional_profile_created: { icon: BadgeCheck, label: 'Profiles' },
  template_published: { icon: LayoutTemplate, label: 'Templates' },
  card_assigned: { icon: CreditCard, label: 'Cards' },
}

function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000], ['month', 2_592_000], ['week', 604_800],
    ['day', 86_400], ['hour', 3_600], ['minute', 60],
  ]
  for (const [unit, unitSeconds] of ranges) {
    if (Math.abs(seconds) >= unitSeconds) return relativeTimeFormatter.format(Math.round(seconds / unitSeconds), unit)
  }
  return 'just now'
}

function PlatformShell({ context, title, subtitle, children }: {
  context: PlatformContext
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <ManageShell
      brand="Tap2Connect"
      brandDetail="Platform administration"
      logo={brandLogo}
      nav={platformNavigation(context.platformAccess.allowedModules)}
      title={title}
      subtitle={subtitle}
      userName={context.user.displayName}
      userRole={context.user.roleLabel}
    >
      {children}
    </ManageShell>
  )
}

function LoadingState({ error, label }: { error: string; label: string }) {
  return <div className="manage-state">{error || `Loading ${label}…`}</div>
}

export function PlatformActivity() {
  const [data, setData] = useState<ActivityPayload | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<ActivityType | 'all'>('all')

  useEffect(() => {
    document.title = 'Activity | Tap2Connect'
    apiFetch<ActivityPayload>('/api/dashboard/platform-activity/')
      .then(setData)
      .catch((reason) => setError(displayError(reason)))
  }, [])

  const visibleActivity = useMemo(
    () => data?.recentActivity.filter((item) => filter === 'all' || item.type === filter) ?? [],
    [data, filter],
  )

  if (!data) return <LoadingState error={error} label="platform activity" />

  return (
    <PlatformShell context={data} title="Activity" subtitle="Recent reliable changes across the platform">
      <div className="platform-insights-page">
        <section className="manage-card platform-activity-card">
          <header className="platform-section-heading">
            <div><h2>Recent platform activity</h2><p>Created, published, and assigned records ordered by timestamp</p></div>
            <span aria-live="polite">{visibleActivity.length} {visibleActivity.length === 1 ? 'event' : 'events'}</span>
          </header>
          <div className="platform-activity-filters" role="group" aria-label="Filter platform activity">
            <button aria-pressed={filter === 'all'} className={filter === 'all' ? 'is-active' : ''} type="button" onClick={() => setFilter('all')}>All</button>
            {(Object.entries(activityMeta) as Array<[ActivityType, { icon: Icon; label: string }]>).map(([type, meta]) => (
              <button aria-pressed={filter === type} className={filter === type ? 'is-active' : ''} type="button" onClick={() => setFilter(type)} key={type}>{meta.label}</button>
            ))}
          </div>
          {visibleActivity.length > 0 ? (
            <div className="platform-activity-feed">
              {visibleActivity.map((item) => {
                const meta = activityMeta[item.type]
                const ItemIcon = meta.icon
                return (
                  <article key={item.id}>
                    <span className={`platform-event-icon is-${item.type}`}><ItemIcon size={17} aria-hidden="true" /></span>
                    <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                    <time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>{relativeTime(item.createdAt)}</time>
                  </article>
                )
              })}
            </div>
          ) : <div className="platform-insights-empty">No activity matches this filter.</div>}
        </section>
      </div>
    </PlatformShell>
  )
}

function ReportMetric({ icon: MetricIcon, label, value }: { icon: Icon; label: string; value: number }) {
  return (
    <article className="manage-card platform-report-metric">
      <span><MetricIcon size={18} aria-hidden="true" /></span>
      <div><small>{label}</small><strong>{numberFormatter.format(value)}</strong></div>
    </article>
  )
}

export function PlatformReports() {
  const [data, setData] = useState<ReportsPayload | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Reports | Tap2Connect'
    apiFetch<ReportsPayload>('/api/dashboard/platform-reports/')
      .then(setData)
      .catch((reason) => setError(displayError(reason)))
  }, [])

  if (!data) return <LoadingState error={error} label="platform reports" />
  const maximumGrowth = Math.max(...data.growth.months.flatMap((month) => [month.members, month.organizations]), 1)
  const totalMembers = data.memberComposition.reduce((total, item) => total + item.value, 0)

  return (
    <PlatformShell context={data} title="Reports" subtitle="Platform-wide growth, distribution, and organization performance">
      <div className="platform-insights-page">
        <section className="platform-report-metrics" aria-label="Platform reporting summary">
          <ReportMetric icon={Building2} label="Organizations" value={data.kpis.organizations} />
          <ReportMetric icon={Users} label="Organization Members" value={data.kpis.organizationMembers} />
          <ReportMetric icon={BadgeCheck} label="Professional Profiles" value={data.kpis.professionalProfiles} />
          <ReportMetric icon={LayoutTemplate} label="Published Templates" value={data.kpis.publishedTemplates} />
          <ReportMetric icon={CreditCard} label="Active Assigned Cards" value={data.kpis.activeAssignedCards} />
        </section>

        <section className="platform-report-grid">
          <article className="manage-card platform-growth-report">
            <header className="platform-section-heading"><div><h2>Platform additions</h2><p>Organizations and members added over the last six months</p></div></header>
            <div className="platform-report-legend"><span className="is-members">Members</span><span className="is-organizations">Organizations</span></div>
            <div className="platform-growth-bars">
              {data.growth.months.map((month) => (
                <div key={month.key} title={`${month.longLabel}: ${month.members} ${month.members === 1 ? 'member' : 'members'}, ${month.organizations} ${month.organizations === 1 ? 'organization' : 'organizations'}`}>
                  <span className="platform-growth-columns">
                    <i className="is-members" style={{ height: `${Math.max((month.members / maximumGrowth) * 100, month.members ? 4 : 0)}%` }} />
                    <i className="is-organizations" style={{ height: `${Math.max((month.organizations / maximumGrowth) * 100, month.organizations ? 4 : 0)}%` }} />
                  </span>
                  <small>{month.label}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="manage-card platform-composition-report">
            <header className="platform-section-heading"><div><h2>Member composition</h2><p>Current organization-member distribution</p></div><span>{numberFormatter.format(totalMembers)} total</span></header>
            <div className="platform-composition-bars">
              {data.memberComposition.map((item) => {
                const percentage = totalMembers ? Math.round((item.value / totalMembers) * 100) : 0
                return (
                  <div key={item.key}>
                    <span><strong>{item.label}</strong><small>{numberFormatter.format(item.value)} · {percentage}%</small></span>
                    <i><b style={{ width: `${percentage}%`, background: item.color }} /></i>
                  </div>
                )
              })}
            </div>
          </article>

          <article className="manage-card platform-ranking-report">
            <header className="platform-section-heading"><div><h2>Top organizations</h2><p>Ranked by current organization member count</p></div></header>
            {data.organizationsByMemberCount.length > 0 ? (
              <div className="platform-report-ranking">
                {data.organizationsByMemberCount.map((organization, index) => (
                  <a href={organization.url} key={organization.id}>
                    <span>{index + 1}</span><strong>{organization.name}</strong><b>{numberFormatter.format(organization.memberCount)} {organization.memberCount === 1 ? 'member' : 'members'}</b>
                  </a>
                ))}
              </div>
            ) : <div className="platform-insights-empty">Organizations will appear after they are created.</div>}
          </article>
        </section>
      </div>
    </PlatformShell>
  )
}

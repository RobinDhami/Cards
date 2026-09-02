import { useEffect, useMemo, useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check.js'
import Building2 from 'lucide-react/dist/esm/icons/building-2.js'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card.js'
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template.js'
import UserPlus from 'lucide-react/dist/esm/icons/user-plus.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import { ManageShell } from '../../components/manage/ManageShell'
import { apiHref } from '../../lib/api'
import { brandLogo } from '../../lib/assets'
import { schoolWorkspaceNav } from '../school/schoolWorkspaceNav'
import './DashboardHome.css'

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>
type GrowthMetric = 'members' | 'organizations'

type SchoolOption = { id: number; name: string }
type CurrentSchool = SchoolOption & { logoUrl: string; themePrimary: string }
type UserSummary = { displayName: string; roleLabel: string }
type GrowthMonth = {
  key: string
  label: string
  longLabel: string
  members: number
  organizations: number
}
type OrganizationRanking = { id: number; name: string; memberCount: number; url: string }
type CompositionItem = {
  key: 'student' | 'teacher' | 'other'
  label: string
  value: number
  color: string
}
type ActivityType =
  | 'organization_created'
  | 'member_added'
  | 'card_assigned'
  | 'professional_profile_created'
  | 'template_published'
type ActivityItem = {
  id: string
  type: ActivityType
  title: string
  detail: string
  createdAt: string
}
type DashboardData = {
  isSuperAdmin: boolean
  user: UserSummary
  currentSchool: CurrentSchool | null
  schoolOptions: SchoolOption[]
  kpis: {
    organizations: number
    organizationMembers: number
    professionalProfiles: number
    publishedTemplates: number
    activeAssignedCards: number
  }
  growth: { months: GrowthMonth[]; defaultMetric: GrowthMetric }
  organizationsByMemberCount: OrganizationRanking[]
  memberComposition: CompositionItem[]
  recentActivity: ActivityItem[]
  links: {
    organizations: string
    professionalProfiles: string
    publishedTemplates: string
  }
}

const numberFormatter = new Intl.NumberFormat('en-US')
const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const activityIcons: Record<ActivityType, LucideIcon> = {
  organization_created: Building2,
  member_added: UserPlus,
  card_assigned: CreditCard,
  professional_profile_created: BadgeCheck,
  template_published: LayoutTemplate,
}

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const seconds = Math.round((timestamp - Date.now()) / 1000)
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, secondsPerUnit] of ranges) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return relativeTimeFormatter.format(Math.round(seconds / secondsPerUnit), unit)
    }
  }
  return 'just now'
}

function niceMaximum(value: number) {
  if (value <= 4) return Math.max(4, value)
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const nice = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

function KpiCard({ icon: Icon, label, value, tone, href }: {
  icon: LucideIcon
  label: string
  value: number
  tone: string
  href?: string
}) {
  const content = (
    <>
      <span className={`platform-kpi-icon is-${tone}`}><Icon size={20} aria-hidden="true" /></span>
      <span className="platform-kpi-copy">
        <span className="platform-kpi-label">{label}</span>
        <strong>{formatNumber(value)}</strong>
      </span>
    </>
  )
  if (href) {
    return (
      <a className="dashboard-panel platform-kpi is-linked" href={href} aria-label={`${label}: ${formatNumber(value)}`}>
        {content}
      </a>
    )
  }
  return <article className="dashboard-panel platform-kpi" aria-label={`${label}: ${formatNumber(value)}`}>{content}</article>
}

function GrowthChart({ months, metric }: { months: GrowthMonth[]; metric: GrowthMetric }) {
  const values = months.map((month) => month[metric])
  const chartMaximum = niceMaximum(Math.max(...values, 0))
  const left = 48
  const right = 628
  const top = 22
  const bottom = 198
  const chartHeight = bottom - top
  const xStep = months.length > 1 ? (right - left) / (months.length - 1) : 0
  const points = values.map((value, index) => ({
    x: left + (index * xStep),
    y: bottom - ((value / chartMaximum) * chartHeight),
    value,
  }))
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ')
  const areaPoints = `${left},${bottom} ${linePoints} ${right},${bottom}`
  const label = metric === 'members' ? 'Members added' : 'Organizations added'

  return (
    <div className="platform-growth-chart">
      <p className="platform-sr-only">
        {label} by month: {months.map((month) => `${month.longLabel}, ${month[metric]}`).join('; ')}
      </p>
      <svg viewBox="0 0 660 235" role="img" aria-label={`${label} during the last six months`}>
        {[0, 1, 2, 3, 4].map((index) => {
          const value = chartMaximum - ((chartMaximum / 4) * index)
          const y = top + ((chartHeight / 4) * index)
          return (
            <g key={index}>
              <line x1={left} y1={y} x2={right} y2={y} className="platform-chart-gridline" />
              <text x="38" y={y + 4} textAnchor="end" className="platform-chart-axis-label">
                {compactNumberFormatter.format(value)}
              </text>
            </g>
          )
        })}
        <polygon points={areaPoints} className="platform-chart-area" />
        <polyline points={linePoints} className="platform-chart-line" />
        {points.map((point, index) => (
          <g key={months[index].key}>
            <circle cx={point.x} cy={point.y} r="4" className="platform-chart-point">
              <title>{months[index].longLabel}: {formatNumber(point.value)} {label.toLowerCase()}</title>
            </circle>
            <text x={point.x} y="224" textAnchor="middle" className="platform-chart-month">{months[index].label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function PlatformAdditions({ growth }: { growth: DashboardData['growth'] }) {
  const [metric, setMetric] = useState<GrowthMetric>(growth.defaultMetric)
  const total = growth.months.reduce((sum, month) => sum + month[metric], 0)
  return (
    <article className="dashboard-panel platform-panel platform-growth-panel">
      <div className="platform-panel-heading">
        <div><h2>Platform Additions</h2><p>New records added during the last six months</p></div>
        <div className="platform-metric-toggle" role="group" aria-label="Platform additions metric">
          <button type="button" className={metric === 'members' ? 'is-active' : ''} aria-pressed={metric === 'members'} onClick={() => setMetric('members')}>Members</button>
          <button type="button" className={metric === 'organizations' ? 'is-active' : ''} aria-pressed={metric === 'organizations'} onClick={() => setMetric('organizations')}>Organizations</button>
        </div>
      </div>
      <div className="platform-growth-summary">
        <strong>{formatNumber(total)}</strong>
        <span>{metric === 'members' ? 'members added' : 'organizations added'}</span>
      </div>
      <GrowthChart months={growth.months} metric={metric} />
    </article>
  )
}

function TopOrganizations({ organizations }: { organizations: OrganizationRanking[] }) {
  const largestCount = Math.max(...organizations.map((organization) => organization.memberCount), 1)
  return (
    <article className="dashboard-panel platform-panel platform-ranking-panel">
      <div className="platform-panel-heading"><div><h2>Top Organizations</h2><p>Ranked by organization member count</p></div></div>
      {organizations.length > 0 ? (
        <div className="platform-ranking-list">
          {organizations.map((organization, index) => (
            <a className="platform-ranking-row" href={organization.url} key={organization.id} aria-label={`${organization.name}: ${formatNumber(organization.memberCount)} members`}>
              <span className="platform-ranking-position">{index + 1}</span>
              <span className="platform-ranking-data">
                <span className="platform-ranking-copy"><strong>{organization.name}</strong><span>{formatNumber(organization.memberCount)}</span></span>
                <span className="platform-ranking-track" aria-hidden="true"><span style={{ width: `${(organization.memberCount / largestCount) * 100}%` }} /></span>
              </span>
            </a>
          ))}
        </div>
      ) : <div className="platform-empty-state">Organizations will appear here after they are created.</div>}
    </article>
  )
}

function MemberComposition({ items }: { items: CompositionItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  let cursor = 0
  const segments = items.map((item) => {
    const start = cursor
    cursor += total > 0 ? (item.value / total) * 100 : 0
    return `${item.color} ${start}% ${cursor}%`
  })
  const background = total > 0 ? `conic-gradient(${segments.join(', ')})` : '#e7edf5'
  return (
    <article className="dashboard-panel platform-panel platform-composition-panel">
      <div className="platform-panel-heading"><div><h2>Member Composition</h2><p>Organization members by supported member type</p></div></div>
      <div className="platform-composition-content">
        <div className="platform-composition-donut" style={{ background }} role="img" aria-label={`${formatNumber(total)} organization members`}>
          <div><strong>{formatNumber(total)}</strong><span>Total members</span></div>
        </div>
        <div className="platform-composition-list">
          {items.map((item) => {
            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0
            return (
              <div className="platform-composition-row" key={item.key}>
                <i style={{ background: item.color }} />
                <span><strong>{item.label}</strong><small>{percentage}% of members</small></span>
                <b>{formatNumber(item.value)}</b>
              </div>
            )
          })}
        </div>
      </div>
    </article>
  )
}

function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <article className="dashboard-panel platform-panel platform-activity-panel">
      <div className="platform-panel-heading"><div><h2>Recent Activity</h2><p>Latest reliable additions across the platform</p></div></div>
      {items.length > 0 ? (
        <div className="platform-activity-list">
          {items.map((item) => {
            const Icon = activityIcons[item.type]
            return (
              <div className={`platform-activity-row is-${item.type}`} key={item.id}>
                <span className="platform-activity-icon"><Icon size={16} aria-hidden="true" /></span>
                <span className="platform-activity-copy"><strong>{item.title}</strong><span>{item.detail}</span></span>
                <time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>{relativeTime(item.createdAt)}</time>
              </div>
            )
          })}
        </div>
      ) : <div className="platform-empty-state">Recent platform additions will appear here.</div>}
    </article>
  )
}

function PlatformOverview({ data }: { data: DashboardData }) {
  return (
    <div className="platform-overview">
      <section className="platform-kpi-grid" aria-label="Platform summary">
        <KpiCard icon={Building2} label="Organizations" value={data.kpis.organizations} tone="blue" href={data.links.organizations} />
        <KpiCard icon={Users} label="Organization Members" value={data.kpis.organizationMembers} tone="teal" />
        <KpiCard icon={BadgeCheck} label="Professional Profiles" value={data.kpis.professionalProfiles} tone="violet" href={data.links.professionalProfiles} />
        <KpiCard icon={LayoutTemplate} label="Published Templates" value={data.kpis.publishedTemplates} tone="amber" href={data.links.publishedTemplates} />
        <KpiCard icon={CreditCard} label="Active Assigned Cards" value={data.kpis.activeAssignedCards} tone="cyan" />
      </section>
      <section className="platform-primary-grid">
        <PlatformAdditions growth={data.growth} />
        <TopOrganizations organizations={data.organizationsByMemberCount} />
      </section>
      <section className="platform-secondary-grid">
        <MemberComposition items={data.memberComposition} />
        <RecentActivity items={data.recentActivity} />
      </section>
    </div>
  )
}

export function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const endpoint = useMemo(() => `/api/dashboard/overview/${window.location.search}`, [])

  useEffect(() => {
    let isCurrent = true
    async function loadDashboard() {
      try {
        const response = await fetch(apiHref(endpoint), { credentials: 'include', headers: { Accept: 'application/json' } })
        const contentType = response.headers.get('content-type') ?? ''
        if (!contentType.includes('application/json')) {
          window.location.href = '/login/'
          return
        }
        const payload = (await response.json()) as DashboardData & { error?: string; redirectTo?: string }
        if (payload.redirectTo) {
          window.location.href = payload.redirectTo
          return
        }
        if (!response.ok) throw new Error(payload.error ?? 'Dashboard could not be loaded.')
        if (isCurrent) setData(payload)
      } catch (caughtError) {
        if (isCurrent) setError(caughtError instanceof Error ? caughtError.message : 'Dashboard could not be loaded.')
      }
    }
    void loadDashboard()
    return () => { isCurrent = false }
  }, [endpoint])

  if (error) {
    return <div className="dashboard-state-screen"><div className="dashboard-state-card"><strong>Dashboard unavailable</strong>{error}</div></div>
  }
  if (!data) {
    return <div className="dashboard-state-screen"><div className="dashboard-state-card"><strong>Loading dashboard</strong>Preparing your dashboard...</div></div>
  }

  const school = data.currentSchool
  return (
    <ManageShell
      brand={school?.name || 'Tap2Connect'}
      brandDetail={school ? 'School administration' : 'Platform administration'}
      logo={school?.logoUrl || brandLogo}
      nav={schoolWorkspaceNav(school?.id, data.isSuperAdmin)}
      title="Overview"
      subtitle="Platform organizations, members, profiles, templates, and assigned cards"
      userName={data.user.displayName}
      userRole={data.user.roleLabel}
      accent={school?.themePrimary || '#0b4bcb'}
    >
      <div className="dashboard-page dashboard-overview-page"><PlatformOverview data={data} /></div>
    </ManageShell>
  )
}

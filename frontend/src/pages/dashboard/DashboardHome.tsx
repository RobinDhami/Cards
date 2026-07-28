import { useEffect, useMemo, useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.mjs'
import BadgeCheck from 'lucide-react/dist/esm/icons/badge-check.mjs'
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3.mjs'
import Bell from 'lucide-react/dist/esm/icons/bell.mjs'
import BriefcaseBusiness from 'lucide-react/dist/esm/icons/briefcase-business.mjs'
import Check from 'lucide-react/dist/esm/icons/check.mjs'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up.mjs'
import CreditCard from 'lucide-react/dist/esm/icons/credit-card.mjs'
import Eye from 'lucide-react/dist/esm/icons/eye.mjs'
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap.mjs'
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid.mjs'
import LogOut from 'lucide-react/dist/esm/icons/log-out.mjs'
import MapPin from 'lucide-react/dist/esm/icons/map-pin.mjs'
import Menu from 'lucide-react/dist/esm/icons/menu.mjs'
import Plus from 'lucide-react/dist/esm/icons/plus.mjs'
import School from 'lucide-react/dist/esm/icons/school.mjs'
import Settings from 'lucide-react/dist/esm/icons/settings.mjs'
import User from 'lucide-react/dist/esm/icons/user.mjs'
import UserCheck from 'lucide-react/dist/esm/icons/user-check.mjs'
import Users from 'lucide-react/dist/esm/icons/users.mjs'
import Wifi from 'lucide-react/dist/esm/icons/wifi.mjs'
import X from 'lucide-react/dist/esm/icons/x.mjs'
import './DashboardHome.css'

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

type SchoolOption = {
  id: number
  name: string
}

type CurrentSchool = SchoolOption & {
  address: string
  principalName: string
  logoUrl: string
}

type UserSummary = {
  username: string
  displayName: string
  initials: string
  roleLabel: string
}

type NavItem = {
  key: string
  label: string
  href: string
  icon: string
}

type ClassRow = {
  key: string
  label: string
  total: number
  percentage: number
}

type ActivityMixItem = {
  label: string
  value: number
  percentage: number
  color: string
}

type DailyEngagement = {
  label: string
  date_label: string
  total: number
  x: number
  y: number
}

type TopProfile = {
  id: number
  name: string
  classLabel: string
  interactions: number
  photoUrl: string
  url: string
}

type Analytics = {
  studentCount: number
  teacherCount: number
  liveCount: number
  activeCardCount: number
  profileViews: number
  contactActions: number
  vcardDownloads: number
  totalEngagement: number
  liveCoverage: number
  cardCoverage: number
  classRows: ClassRow[]
  activityMix: ActivityMixItem[]
  donutStyle: string
  dailyEngagement: DailyEngagement[]
  engagementPoints: string
  topProfiles: TopProfile[]
  links: {
    manageStudents: string
    addStudent: string
    reports: string
    printStudio: string
  }
}

type DashboardData = {
  activeModule: string
  isSuperAdmin: boolean
  user: UserSummary
  currentSchool: CurrentSchool | null
  schoolOptions: SchoolOption[]
  navSchoolQuery: string
  navItems: NavItem[]
  logoutUrl: string
  schoolsUrl: string
  analytics: Analytics | null
}

const iconMap: Record<string, LucideIcon> = {
  'badge-check': BadgeCheck,
  'bar-chart-3': BarChart3,
  'briefcase-business': BriefcaseBusiness,
  'credit-card': CreditCard,
  'layout-grid': LayoutGrid,
  school: School,
  settings: Settings,
  users: Users,
}

const backendOrigin = import.meta.env.DEV ? 'http://127.0.0.1:8000' : ''

function legacyHref(href: string) {
  if (!href || href.startsWith('http') || href.startsWith('#')) {
    return href
  }
  return `${backendOrigin}${href}`
}

function reactOverviewHref(search = window.location.search) {
  return `/dashboard/${search}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function NavIcon({ name }: { name: string }) {
  const Icon = iconMap[name] ?? LayoutGrid
  return <Icon aria-hidden="true" />
}

function Sidebar({
  data,
  onNavigate,
}: {
  data: DashboardData
  onNavigate?: () => void
}) {
  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-header">
        <div className="dashboard-brand-row">
          {data.currentSchool ? (
            <>
              <div className="dashboard-school-mark">
                {data.currentSchool.logoUrl ? (
                  <img src={data.currentSchool.logoUrl} alt={data.currentSchool.name} />
                ) : (
                  <GraduationCap size={20} aria-hidden="true" />
                )}
              </div>
              <div className="dashboard-brand-copy">
                <div className="dashboard-brand-title">{data.currentSchool.name}</div>
                <div className="dashboard-brand-subtitle">School administration</div>
                <div className="dashboard-brand-powered">
                  <span>by</span>
                  <img className="dashboard-mini-logo" src="/static/branding/tap2connect-logo.png" alt="Tap2Connect platform" />
                </div>
              </div>
            </>
          ) : (
            <>
              <img className="dashboard-logo" src="/static/branding/tap2connect-logo.png" alt="Tap2Connect" />
              <div className="dashboard-brand-copy">
                <div className="dashboard-brand-title">Tap2Connect</div>
                <div className="dashboard-brand-subtitle">Platform administration</div>
              </div>
            </>
          )}
        </div>
      </div>

      <nav className="dashboard-nav" aria-label="Dashboard navigation">
        {data.navItems.map((item) => {
          const isOverview = item.key === 'home'
          const href = isOverview ? reactOverviewHref() : legacyHref(item.href)
          return (
            <a
              key={item.key}
              className={`dashboard-nav-link${item.key === data.activeModule ? ' is-active' : ''}`}
              href={href}
              onClick={isOverview ? onNavigate : undefined}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </a>
          )
        })}
      </nav>

      <div className="dashboard-sidebar-footer">
        <details className="dashboard-user-card">
          <summary className="dashboard-user-summary">
            <div className="dashboard-avatar">{data.user.initials}</div>
            <div className="dashboard-user-meta">
              <strong>{data.user.displayName}</strong>
              <span>{data.user.roleLabel}</span>
            </div>
            <ChevronUp size={16} aria-hidden="true" />
          </summary>
          <div className="dashboard-user-menu">
            <div className="dashboard-user-menu-header">
              <strong>{data.user.username}</strong>
              <span>Signed-in account</span>
            </div>
            <a className="dashboard-logout" href={legacyHref(data.logoutUrl)}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </a>
          </div>
        </details>
      </div>
    </aside>
  )
}

function MetricCard({
  icon: Icon,
  tone,
  label,
  value,
  note,
  noteTone,
}: {
  icon: LucideIcon
  tone: string
  label: string
  value: number
  note: string
  noteTone?: string
}) {
  return (
    <article className="dashboard-panel dashboard-metric">
      <div className={`dashboard-metric-icon is-${tone}`}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <div>
        <div className="dashboard-metric-label">{label}</div>
        <div className="dashboard-metric-value">{formatNumber(value)}</div>
        <div className={`dashboard-metric-note${noteTone ? ` is-${noteTone}` : ''}`}>{note}</div>
      </div>
    </article>
  )
}

function SchoolSummary({ school, analytics }: { school: CurrentSchool; analytics: Analytics }) {
  return (
    <section className="dashboard-panel dashboard-school-summary">
      <div className="dashboard-school-mark">
        {school.logoUrl ? <img src={school.logoUrl} alt={school.name} /> : <School size={24} aria-hidden="true" />}
      </div>
      <div className="dashboard-school-summary-copy">
        <h2>{school.name}</h2>
        <div className="dashboard-school-facts">
          {school.address ? (
            <span>
              <MapPin size={14} aria-hidden="true" />
              {school.address}
            </span>
          ) : null}
          {school.principalName ? (
            <span>
              <UserCheck size={14} aria-hidden="true" />
              {school.principalName}
            </span>
          ) : null}
          <span>
            <Users size={14} aria-hidden="true" />
            {formatNumber(analytics.teacherCount)} staff records
          </span>
        </div>
      </div>
      <div className="dashboard-school-actions">
        <a className="dashboard-button is-secondary" href={legacyHref(analytics.links.manageStudents)}>
          <Users size={15} aria-hidden="true" />
          Manage students
        </a>
        <a className="dashboard-button is-primary" href={legacyHref(analytics.links.addStudent)}>
          <Plus size={15} aria-hidden="true" />
          Add student
        </a>
      </div>
    </section>
  )
}

function ClassChart({ rows }: { rows: ClassRow[] }) {
  if (rows.length === 0) {
    return <div className="dashboard-empty-chart">Assign classes to students to populate this chart.</div>
  }
  return (
    <div className="dashboard-chart-scroll">
      <div className="dashboard-class-chart">
        {rows.map((row) => (
          <div className="dashboard-class-bar-wrap" key={row.key} title={row.label}>
            <span className="dashboard-class-count">{row.total}</span>
            <div className="dashboard-class-bar" style={{ height: `${row.percentage}%` }} />
            <span className="dashboard-class-label">{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EngagementDonut({ analytics }: { analytics: Analytics }) {
  return (
    <div className="dashboard-donut-row">
      <div className="dashboard-donut" style={{ background: analytics.donutStyle }}>
        <div className="dashboard-donut-center">
          <span>Total engagement</span>
          <strong>{formatNumber(analytics.totalEngagement)}</strong>
        </div>
      </div>
      <div className="dashboard-activity-list">
        {analytics.activityMix.map((item) => (
          <div className="dashboard-activity-item" key={item.label}>
            <i className="dashboard-activity-dot" style={{ background: item.color }} />
            <div>
              <span>{item.label}</span>
              <p>{item.percentage}% of tracked activity</p>
            </div>
            <strong>{formatNumber(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopProfiles({ analytics }: { analytics: Analytics }) {
  return (
    <article className="dashboard-panel dashboard-list-panel">
      <div className="dashboard-list-header">
        <h2 className="dashboard-panel-title">Top Card Users</h2>
        <p>Highest all-time engagement</p>
      </div>
      <div className="dashboard-profile-list">
        {analytics.topProfiles.length > 0 ? (
          analytics.topProfiles.map((profile) => (
            <a className="dashboard-profile-row" href={legacyHref(profile.url)} target="_blank" rel="noreferrer" key={profile.id}>
              <div className="dashboard-profile-photo">
                {profile.photoUrl ? <img src={profile.photoUrl} alt="" /> : <User size={14} aria-hidden="true" />}
              </div>
              <div className="dashboard-profile-copy">
                <strong>{profile.name}</strong>
                <span>{profile.classLabel}</span>
              </div>
              <span className="dashboard-profile-score">{formatNumber(profile.interactions)}</span>
            </a>
          ))
        ) : (
          <div className="dashboard-empty-chart">Engagement will appear after cards are opened.</div>
        )}
      </div>
      <a className="dashboard-list-link" href={legacyHref(analytics.links.reports)}>
        View all reports
      </a>
    </article>
  )
}

function EngagementLineChart({ analytics }: { analytics: Analytics }) {
  return (
    <article className="dashboard-panel dashboard-card">
      <div className="dashboard-card-header">
        <div>
          <h2>Engagement Over Time</h2>
          <p>All tracked card actions - last 7 days</p>
        </div>
        <span className="dashboard-metric-note">7 days</span>
      </div>
      <svg viewBox="0 0 100 100" className="dashboard-line-chart" role="img" aria-label="Seven day engagement chart">
        <line x1="7" y1="20" x2="93" y2="20" stroke="#eef2f7" strokeWidth=".6" />
        <line x1="7" y1="42.5" x2="93" y2="42.5" stroke="#eef2f7" strokeWidth=".6" />
        <line x1="7" y1="65" x2="93" y2="65" stroke="#eef2f7" strokeWidth=".6" />
        <line x1="7" y1="88" x2="93" y2="88" stroke="#cbd5e1" strokeWidth=".7" />
        <polyline points={analytics.engagementPoints} fill="none" stroke="#0b4bcb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {analytics.dailyEngagement.map((row) => (
          <g key={row.date_label}>
            <circle cx={row.x} cy={row.y} r="1.8" fill="#fff" stroke="#0b4bcb" strokeWidth="1.1">
              <title>
                {row.date_label}: {row.total} interactions
              </title>
            </circle>
            <text x={row.x} y="97" textAnchor="middle" fontSize="3.1" fill="#64748b">
              {row.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="dashboard-chart-legend">
        <span />
        Views, contacts, and downloads
      </div>
    </article>
  )
}

function WorkflowCard({ analytics }: { analytics: Analytics }) {
  const liveDone = analytics.liveCoverage === 100
  const cardsDone = analytics.cardCoverage === 100
  return (
    <article className="dashboard-panel dashboard-card">
      <h2>Student ID Workflow</h2>
      <p>Current rollout progress</p>
      <div className="dashboard-workflow">
        <div className="dashboard-workflow-step">
          <span className="dashboard-workflow-index is-done">
            <Check size={16} aria-hidden="true" />
          </span>
          <div className="dashboard-workflow-copy">
            <strong>Student records</strong>
            <span>{formatNumber(analytics.studentCount)} profiles added</span>
          </div>
        </div>
        <div className="dashboard-workflow-step">
          <span className={`dashboard-workflow-index${liveDone ? ' is-done' : ' is-current'}`}>
            {liveDone ? <Check size={16} aria-hidden="true" /> : '2'}
          </span>
          <div className="dashboard-workflow-copy">
            <strong>Digital IDs live</strong>
            <span>
              {formatNumber(analytics.liveCount)} of {formatNumber(analytics.studentCount)}
            </span>
          </div>
        </div>
        <div className="dashboard-workflow-step">
          <span className={`dashboard-workflow-index${cardsDone ? ' is-done' : ''}`}>
            {cardsDone ? <Check size={16} aria-hidden="true" /> : '3'}
          </span>
          <div className="dashboard-workflow-copy">
            <strong>NFC cards assigned</strong>
            <span>
              {formatNumber(analytics.activeCardCount)} of {formatNumber(analytics.studentCount)}
            </span>
          </div>
        </div>
      </div>
      <a className="dashboard-card-link" href={legacyHref(analytics.links.manageStudents)}>
        Review students
        <ArrowRight size={14} aria-hidden="true" />
      </a>
    </article>
  )
}

function AnalyticsContent({ data }: { data: DashboardData }) {
  const { analytics, currentSchool } = data
  if (!analytics || !currentSchool) {
    return (
      <section className="dashboard-panel dashboard-empty-state">
        <div className="dashboard-empty-icon">
          <School size={26} aria-hidden="true" />
        </div>
        <h2>{data.isSuperAdmin ? 'Select a school workspace' : 'No school workspace assigned'}</h2>
        <p>
          {data.isSuperAdmin
            ? 'Choose a school above or open Schools to create and manage an institution.'
            : 'Ask the platform administrator to assign your account to a school.'}
        </p>
        {data.isSuperAdmin ? (
          <a className="dashboard-button is-primary" href={legacyHref(data.schoolsUrl)}>
            Open Schools
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        ) : null}
      </section>
    )
  }

  return (
    <>
      <SchoolSummary school={currentSchool} analytics={analytics} />

      <section className="dashboard-metric-grid">
        <MetricCard icon={Users} tone="blue" label="Total Students" value={analytics.studentCount} note="Current school records" />
        <MetricCard icon={BadgeCheck} tone="green" label="Digital IDs Live" value={analytics.liveCount} note={`${analytics.liveCoverage}% profile coverage`} noteTone="green" />
        <MetricCard icon={Wifi} tone="violet" label="Active NFC Cards" value={analytics.activeCardCount} note={`${analytics.cardCoverage}% of students assigned`} />
        <MetricCard icon={Eye} tone="amber" label="Profile Views" value={analytics.profileViews} note={`${formatNumber(analytics.totalEngagement)} total interactions`} />
      </section>

      <section className="dashboard-analytics-grid">
        <article className="dashboard-panel dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h2>Students by Class</h2>
              <p>Academic distribution in this school</p>
            </div>
            <BarChart3 size={20} aria-hidden="true" />
          </div>
          <ClassChart rows={analytics.classRows} />
        </article>

        <article className="dashboard-panel dashboard-card">
          <h2>Card Engagement</h2>
          <p>How people use student digital cards</p>
          <EngagementDonut analytics={analytics} />
        </article>
      </section>

      <section className="dashboard-lower-grid">
        <TopProfiles analytics={analytics} />
        <EngagementLineChart analytics={analytics} />
        <WorkflowCard analytics={analytics} />
      </section>

      <section className="dashboard-panel dashboard-cta">
        <div className="dashboard-cta-icon">
          <CreditCard size={22} aria-hidden="true" />
        </div>
        <div className="dashboard-cta-copy">
          <h2>Everything you need for secure student identity</h2>
          <p>Create digital IDs, issue NFC cards, choose card designs, and export print-ready files.</p>
        </div>
        <div className="dashboard-cta-actions">
          <a className="dashboard-button is-primary" href={legacyHref(analytics.links.printStudio)}>
            Go to ID Card Studio
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
    </>
  )
}

export function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const endpoint = useMemo(() => `/api/dashboard/overview/${window.location.search}`, [])

  useEffect(() => {
    let isCurrent = true

    async function loadDashboard() {
      try {
        const response = await fetch(endpoint, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        const contentType = response.headers.get('content-type') ?? ''
        if (!contentType.includes('application/json')) {
          window.location.href = legacyHref('/login/')
          return
        }
        const payload = (await response.json()) as DashboardData & { error?: string; redirectTo?: string }
        if (payload.redirectTo) {
          window.location.href = legacyHref(payload.redirectTo)
          return
        }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Dashboard could not be loaded.')
        }
        if (isCurrent) {
          setData(payload)
        }
      } catch (caughtError) {
        if (isCurrent) {
          setError(caughtError instanceof Error ? caughtError.message : 'Dashboard could not be loaded.')
        }
      }
    }

    void loadDashboard()
    return () => {
      isCurrent = false
    }
  }, [endpoint])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  if (error) {
    return (
      <div className="dashboard-state-screen">
        <div className="dashboard-state-card">
          <strong>Dashboard unavailable</strong>
          {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="dashboard-state-screen">
        <div className="dashboard-state-card">
          <strong>Loading dashboard</strong>
          Preparing your school workspace...
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-layout">
        <Sidebar data={data} />

        <div className="dashboard-main">
          <header className="dashboard-header">
            <div className="dashboard-heading-row">
              <button className="dashboard-menu-button" type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
                <Menu size={18} aria-hidden="true" />
              </button>
              <h1 className="dashboard-title">Overview</h1>
            </div>

            <div className="dashboard-actions">
              {data.isSuperAdmin && data.schoolOptions.length > 0 ? (
                <select
                  className="dashboard-school-select"
                  aria-label="Select school"
                  value={data.currentSchool?.id ?? ''}
                  onChange={(event) => {
                    const nextSchool = event.target.value
                    window.location.href = nextSchool ? `/dashboard/?school=${nextSchool}` : '/dashboard/'
                  }}
                >
                  <option value="">Select a school</option>
                  {data.schoolOptions.map((school) => (
                    <option value={school.id} key={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <button className="dashboard-icon-button" type="button" aria-label="Notifications">
                <Bell size={17} aria-hidden="true" />
              </button>
              <div className="dashboard-user-inline">
                <div className="dashboard-avatar">{data.user.initials}</div>
                <div className="dashboard-user-inline-copy dashboard-user-meta">
                  <strong>{data.user.displayName}</strong>
                  <span>{data.user.roleLabel}</span>
                </div>
              </div>
            </div>
          </header>

          <main className="dashboard-content">
            <div className="dashboard-stack">
              <AnalyticsContent data={data} />
            </div>
          </main>
        </div>
      </div>

      <div className={`dashboard-mobile-overlay${mobileOpen ? ' is-open' : ''}`} onClick={() => setMobileOpen(false)} />
      <div className={`dashboard-mobile-drawer${mobileOpen ? ' is-open' : ''}`}>
        <button className="dashboard-mobile-close" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
          <X size={18} aria-hidden="true" />
        </button>
        <Sidebar data={data} onNavigate={() => setMobileOpen(false)} />
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3.js'
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days.js'
import ArrowDownRight from 'lucide-react/dist/esm/icons/arrow-down-right.js'
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right.js'
import FileText from 'lucide-react/dist/esm/icons/file-text.js'
import { apiFetch, displayError, queryString } from '../../lib/api'
import './HospitalityAnalytics.css'

type Metrics = { profileViews: number; menuOpens: number; menuItemDetailViews: number; linkClicks: number; googleReviewClicks: number; feedbackSubmissions: number; estimatedUniqueVisitors: number | null }
type AnalyticsData = {
  range: { preset: string; startDate: string; endDate: string; timezone: string }
  metrics: Metrics
  previousMetrics: Omit<Metrics, 'estimatedUniqueVisitors'>
  daily: Array<{ date: string; profileViews: number; menuOpens: number; linkClicks: number; feedbackSubmissions: number }>
  linkDestinations: Array<{ destination: string; count: number }>
  menuItems: Array<{ name: string; count: number }>
  touchpointActivity: Array<{ source: string; name: string; profileViews: number; menuOpens: number; linkClicks: number; feedbackSubmissions: number }>
  definitions: Record<string, string>
}

const presets = [
  ['today', 'Today'], ['last_7_days', 'Last 7 days'], ['last_30_days', 'Last 30 days'], ['custom', 'Custom'],
] as const

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function TrendChart({ rows }: { rows: AnalyticsData['daily'] }) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.profileViews, row.menuOpens]))
  const yTicks = [0, Math.ceil(max / 4), Math.ceil(max / 2), Math.ceil(max * .75), max]
  const points = (field: 'profileViews' | 'menuOpens') => rows.map((row, index) => {
    const x = rows.length <= 1 ? 54 : 54 + (index / (rows.length - 1)) * 410
    return `${x},${178 - (row[field] / max) * 136}`
  }).join(' ')
  if (!rows.some((row) => row.profileViews || row.menuOpens)) return <div className="hospitality-analytics-empty">No profile views or menu opens have been recorded in this date range.</div>
  return <div className="hospitality-analytics-chart-wrap">
    <svg viewBox="0 0 500 220" role="img" aria-label="Daily profile views and menu opens" preserveAspectRatio="none">
      {yTicks.map((value, index) => { const y = 178 - (value / max) * 136; return <g key={`${value}-${index}`}><line x1="54" x2="470" y1={y} y2={y} className="hospitality-analytics-gridline" /><text x="45" y={y + 4} textAnchor="end">{value}</text></g> })}
      <polyline points={points('profileViews')} className="hospitality-analytics-line is-profile" />
      <polyline points={points('menuOpens')} className="hospitality-analytics-line is-menu" />
      {rows.map((row, index) => { const x = rows.length <= 1 ? 54 : 54 + (index / (rows.length - 1)) * 410; const y = 178 - (row.profileViews / max) * 136; return <circle key={row.date} cx={x} cy={y} r="3" className="hospitality-analytics-dot"><title>{`${dateLabel(row.date)}: ${row.profileViews} profile views, ${row.menuOpens} menu opens`}</title></circle> })}
    </svg>
    <div className="hospitality-analytics-x-axis">{rows.filter((_, index) => index === 0 || index === rows.length - 1 || index % Math.max(1, Math.ceil(rows.length / 5)) === 0).map((row) => <span key={row.date}>{dateLabel(row.date)}</span>)}</div>
  </div>
}

function HorizontalBars({ rows }: { rows: AnalyticsData['linkDestinations'] }) {
  const max = Math.max(1, ...rows.map((row) => row.count))
  if (!rows.length) return <div className="hospitality-analytics-empty">No public link clicks have been recorded in this date range.</div>
  return <div className="hospitality-analytics-bars">{rows.map((row) => <div key={row.destination}><span>{row.destination.replaceAll('_', ' ')}</span><i><b style={{ width: `${(row.count / max) * 100}%` }} /></i><strong>{row.count}</strong></div>)}</div>
}

function AnalyticsStatCard({ label, value, previous, tint, note }: { label: string; value: number; previous: number; tint: string; note?: string }) {
  const change = previous > 0 ? Math.round(((value - previous) / previous) * 100) : 0
  const isPositive = change >= 0
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight
  const path = isPositive ? '2,20 11,15 18,17 27,8 38,11 48,3' : '2,4 11,9 18,7 27,15 38,12 48,20'
  return <article className={`hospitality-analytics-stat is-${tint}`}>
    <span>{label}</span>
    <strong>{value.toLocaleString()}</strong>
    <div className="hospitality-analytics-stat-trend"><svg viewBox="0 0 50 24" aria-hidden="true"><polyline points={path} /></svg><TrendIcon size={14} /><b>{Math.abs(change)}%</b><em>vs previous period</em></div>
    {note ? <small>{note}</small> : null}
  </article>
}

export function HospitalityAnalytics({ organizationId }: { organizationId: number }) {
  const [preset, setPreset] = useState('last_7_days')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const rangeQuery = useMemo(() => ({ range: preset, ...(preset === 'custom' ? { start, end } : {}) }), [preset, start, end])
  useEffect(() => {
    if (preset === 'custom' && (!start || !end)) return
    setLoading(true); setError('')
    void apiFetch<{ analytics: AnalyticsData }>(`/api/organizations/${organizationId}/venue/analytics/${queryString(rangeQuery)}`)
      .then((response) => setData(response.analytics))
      .catch((reason) => setError(displayError(reason)))
      .finally(() => setLoading(false))
  }, [organizationId, preset, start, end, rangeQuery])
  const metricRows = data ? [
    { label: 'Profile views', value: data.metrics.profileViews, previous: data.previousMetrics.profileViews, tint: 'blue' },
    { label: 'Menu opens', value: data.metrics.menuOpens, previous: data.previousMetrics.menuOpens, tint: 'green' },
    { label: 'Google review clicks', value: data.metrics.googleReviewClicks, previous: data.previousMetrics.googleReviewClicks, tint: 'amber', note: 'Clicks only · not posted reviews' },
    { label: 'Feedback submitted', value: data.metrics.feedbackSubmissions, previous: data.previousMetrics.feedbackSubmissions, tint: 'red' },
  ] : []
  return <div className="hospitality-analytics-page">
    <header className="hospitality-analytics-heading"><div className="hospitality-analytics-range"><CalendarDays size={17} /><label><span className="sr-only">Analytics date range</span><select value={preset} onChange={(event) => setPreset(event.target.value)}>{presets.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>{preset === 'custom' ? <><label><span className="sr-only">Start date</span><input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label><span className="sr-only">End date</span><input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label></> : null}</div></header>
    {error ? <div className="manage-alert" role="alert">{error}</div> : null}
    {loading && !data ? <div className="hospitality-analytics-empty" role="status">Loading analytics…</div> : null}
    {data ? <><div className={`hospitality-analytics-stat-grid${loading ? ' is-refreshing' : ''}`} aria-busy={loading}>{metricRows.map((metric) => <AnalyticsStatCard key={metric.label} {...metric} />)}</div>
      <div className="hospitality-analytics-layout"><section className="hospitality-analytics-panel is-trend"><header><div><h3>Daily visitor trend</h3></div><div className="hospitality-analytics-legend"><span><i className="is-profile" />Profile views</span><span><i className="is-menu" />Menu opens</span></div></header><TrendChart rows={data.daily} /></section><section className="hospitality-analytics-panel"><header><div><h3>Link clicks by destination</h3></div></header><HorizontalBars rows={data.linkDestinations} /></section></div>
      <div className="hospitality-analytics-layout"><section className="hospitality-analytics-panel"><header><div><h3>Top viewed menu items</h3></div><FileText size={18} /></header>{data.menuItems.length ? <ol className="hospitality-analytics-ranking">{data.menuItems.map((item) => <li key={item.name}><span>{item.name}</span><strong>{item.count}</strong></li>)}</ol> : <div className="hospitality-analytics-empty">No menu-item views yet.</div>}</section><section className="hospitality-analytics-panel"><header><div><h3>Touchpoint activity</h3></div><BarChart3 size={18} /></header>{data.touchpointActivity.length ? <div className="hospitality-touchpoint-table"><div className="hospitality-touchpoint-head"><span>Touchpoint</span><span>Profile</span><span>Menu</span><span>Links</span><span>Feedback</span></div>{data.touchpointActivity.map((touchpoint) => <div key={touchpoint.source}><strong>{touchpoint.name}</strong><span>{touchpoint.profileViews}</span><span>{touchpoint.menuOpens}</span><span>{touchpoint.linkClicks}</span><span>{touchpoint.feedbackSubmissions}</span></div>)}</div> : <div className="hospitality-analytics-empty">No touchpoint activity yet.</div>}</section></div>
    </> : null}
  </div>
}

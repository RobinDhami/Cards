import { useEffect, useState } from 'react'
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list.js'
import { apiFetch, displayError } from '../../lib/api'
import './HospitalityOperationalActivity.css'

type Activity = { id: number; type: string; summary: string; actor: string; createdAt: string }

export function HospitalityOperationalActivity({ organizationId }: { organizationId: number }) {
  const [rows, setRows] = useState<Activity[]>([]); const [error, setError] = useState('')
  useEffect(() => { let active = true; void apiFetch<{ activity: Activity[] }>(`/api/organizations/${organizationId}/venue/activity/`).then((data) => { if (active) setRows(data.activity) }).catch((reason) => { if (active) setError(displayError(reason)) }); return () => { active = false } }, [organizationId])
  return <section className="operational-activity"><header className="operational-activity__intro manage-card"><span><ClipboardList size={21} /></span><div><h2>Business activity</h2></div></header>{error ? <div className="manage-alert">{error}</div> : null}<div className="operational-activity__list manage-card">{rows.length ? rows.map((row) => <article key={row.id}><i>{row.type.replaceAll('_', ' ')}</i><div><strong>{row.summary}</strong><span>{row.actor} · {new Date(row.createdAt).toLocaleString()}</span></div></article>) : <p>No activity yet.</p>}</div></section>
}

import { useCallback, useEffect, useState } from 'react'
import ArrowDownLeft from 'lucide-react/dist/esm/icons/arrow-down-left.js'
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right.js'
import Search from 'lucide-react/dist/esm/icons/search.js'
import Users from 'lucide-react/dist/esm/icons/users.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './HospitalityRewardsMembers.css'

type Member = { memberId: string; phone: string; rewardBalance: string; lifetimeEarned: string; lifetimeRedeemed: string; lastActivityAt: string | null; expiresAt: string | null; isActive: boolean }
type Ledger = { id: number; type: string; amount: string; balanceAfter: string; orderAmount: string | null; receiptReference: string; createdAt: string; createdBy: string }
type Program = { isActive: boolean; rewardLabel: string; rewardRatePercent: string; minimumOrderAmount: string; maxRedemptionPercent: string }

const money = (value: string) => `Rs. ${Number(value || 0).toFixed(2)}`
const dateText = (value: string | null) => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No activity yet'

export function HospitalityRewardsMembers({ organizationId }: { organizationId: number }) {
  const [members, setMembers] = useState<Member[]>([]); const [program, setProgram] = useState<Program | null>(null)
  const [query, setQuery] = useState(''); const [selected, setSelected] = useState<Member | null>(null); const [ledger, setLedger] = useState<Ledger[]>([])
  const [billAmount, setBillAmount] = useState(''); const [rewardAmount, setRewardAmount] = useState(''); const [receiptReference, setReceiptReference] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true)
  const load = useCallback(async (search = '') => { setLoading(true); try { const data = await apiFetch<{ members: Member[]; program: Program }>(`/api/organizations/${organizationId}/venue/rewards/members/${search ? `?q=${encodeURIComponent(search)}` : ''}`); setMembers(data.members); setProgram(data.program); setMessage('') } catch (reason) { setMessage(displayError(reason)) } finally { setLoading(false) } }, [organizationId])
  useEffect(() => { void load() }, [load])
  const open = async (member: Member) => { setSelected(member); setBillAmount(''); setRewardAmount(''); setReceiptReference(''); try { const data = await apiFetch<{ member: Member; transactions: Ledger[] }>(`/api/organizations/${organizationId}/venue/rewards/members/${member.memberId}/`); setSelected(data.member); setLedger(data.transactions) } catch (reason) { setMessage(displayError(reason)) } }
  const submit = async (action: 'earn' | 'redeem') => { if (!selected) return; try { const data = await apiFetch<{ member: Member }>(`/api/organizations/${organizationId}/venue/rewards/transactions/`, { method: 'POST', body: jsonBody({ action, memberId: selected.memberId, billAmount, rewardAmount, receiptReference }) }); setSelected(data.member); setMessage(action === 'earn' ? 'Rewards added.' : 'Rewards redeemed.'); await load(query); await open(data.member) } catch (reason) { setMessage(displayError(reason)) } }
  return <section className="rewards-members">
    <header className="rewards-members__intro manage-card"><span><Users size={21} /></span><div><h2>Members</h2><p>Phone-based loyalty members and their rewards balance. Customer engagement remains in Analytics.</p></div></header>
    <div className="rewards-members__toolbar"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void load(query) }} placeholder="Search phone number or member ID" /></label><button className="manage-button" onClick={() => void load(query)}>Search</button></div>
    {message ? <div className="manage-alert">{message}</div> : null}
    {!program?.isActive ? <div className="manage-alert">Rewards are paused. You can still view existing members.</div> : null}
    <div className="rewards-members__list manage-card">{loading ? <p>Loading members…</p> : members.length ? members.map((member) => <button key={member.memberId} className="rewards-member" onClick={() => void open(member)}><div><strong>{member.phone}</strong><span>Last visit: {dateText(member.lastActivityAt)}</span></div><div><small>{program?.rewardLabel || 'Rewards balance'}</small><b>{money(member.rewardBalance)}</b></div></button>) : <p>No loyalty members found yet.</p>}</div>
    {selected ? <div className="rewards-member-dialog" role="dialog" aria-modal="true"><div className="rewards-member-dialog__panel"><button className="rewards-member-dialog__close" onClick={() => setSelected(null)} aria-label="Close"><X size={20} /></button><header><small>LOYALTY MEMBER</small><h2>{selected.phone}</h2><p>{program?.rewardLabel || 'Rewards balance'} <strong>{money(selected.rewardBalance)}</strong></p></header><div className="rewards-transaction"><label>Final bill amount<input type="number" min="0" step="0.01" value={billAmount} onChange={(event) => setBillAmount(event.target.value)} placeholder="0.00" /></label><label>Receipt reference <em>optional</em><input value={receiptReference} onChange={(event) => setReceiptReference(event.target.value)} placeholder="Receipt no." /></label><button className="manage-button is-primary" disabled={!program?.isActive || !billAmount} onClick={() => void submit('earn')}><ArrowUpRight size={15} />Add rewards</button></div><div className="rewards-transaction rewards-transaction--redeem"><label>Redeem rewards amount<input type="number" min="0" step="0.01" value={rewardAmount} onChange={(event) => setRewardAmount(event.target.value)} placeholder="0.00" /></label><button className="manage-button" disabled={!program?.isActive || !billAmount || !rewardAmount} onClick={() => void submit('redeem')}><ArrowDownLeft size={15} />Redeem rewards</button></div><section className="rewards-ledger"><h3>Activity</h3>{ledger.length ? ledger.map((row) => <div key={row.id}><span className={row.type}>{row.type === 'earn' ? 'Added' : row.type === 'redeem' ? 'Redeemed' : 'Expired'}</span><strong>{row.amount.startsWith('-') ? '-' : '+'}{money(row.amount.replace('-', ''))}</strong><small>{new Date(row.createdAt).toLocaleString()} · {row.createdBy}</small></div>) : <p>No reward activity yet.</p>}</section></div></div> : null}
  </section>
}

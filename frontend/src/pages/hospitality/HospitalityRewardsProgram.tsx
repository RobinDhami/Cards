import { useEffect, useMemo, useState } from 'react'
import Gift from 'lucide-react/dist/esm/icons/gift.js'
import Save from 'lucide-react/dist/esm/icons/save.js'
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check.js'
import { Field, TextInput } from '../../components/manage/FormControls'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './HospitalityRewardsProgram.css'

type RewardsProgram = {
  isActive: boolean
  rewardRatePercent: string
  minimumOrderAmount: string
  maxRedemptionPercent: string
  rewardLabel: string
  expiryDays: number | null
}

const blankProgram: RewardsProgram = {
  isActive: false,
  rewardRatePercent: '5.00',
  minimumOrderAmount: '0.00',
  maxRedemptionPercent: '20.00',
  rewardLabel: 'Rewards balance',
  expiryDays: null,
}

export function HospitalityRewardsProgram({ organizationId }: { organizationId: number }) {
  const [saved, setSaved] = useState<RewardsProgram | null>(null)
  const [draft, setDraft] = useState<RewardsProgram>(blankProgram)
  const [status, setStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const changed = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  useEffect(() => {
    let active = true
    void apiFetch<{ rewardsProgram?: RewardsProgram }>(`/api/organizations/${organizationId}/venue/settings/`)
      .then((payload) => {
        if (!active) return
        const program = payload.rewardsProgram || blankProgram
        setSaved(program); setDraft(program); setStatus('saved')
      })
      .catch((reason) => { if (active) { setStatus('error'); setMessage(displayError(reason)) } })
    return () => { active = false }
  }, [organizationId])

  async function save() {
    if (!changed || status === 'saving') return
    setStatus('saving'); setMessage('')
    try {
      const response = await apiFetch<{ rewardsProgram: RewardsProgram }>(`/api/organizations/${organizationId}/venue/settings/`, {
        method: 'PATCH',
        body: jsonBody({ action: 'rewards_program', ...draft, expiryDays: draft.expiryDays || null }),
      })
      setSaved(response.rewardsProgram); setDraft(response.rewardsProgram)
      setStatus('saved'); setMessage('Rewards program saved.')
    } catch (reason) {
      setStatus('error'); setMessage(displayError(reason))
    }
  }

  if (status === 'loading') return <div className="manage-state">Loading rewards program…</div>

  return <section className="hospitality-rewards-program">
    <div className="rewards-program-intro manage-card">
      <span><Gift size={22} /></span>
      <div><h2>Spend-based rewards</h2><p>Customers earn a rewards balance from eligible bills. Staff confirm the final bill before crediting or redeeming rewards.</p></div>
    </div>
    <div className="rewards-program-layout">
      <form className="rewards-program-form manage-card" onSubmit={(event) => { event.preventDefault(); void save() }}>
        <header><div><h2>Program rules</h2><p>These rules apply to every eligible order after staff confirm it.</p></div><label className="rewards-program-toggle"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /><span>{draft.isActive ? 'Active' : 'Paused'}</span></label></header>
        <div className="form-grid">
          <Field label="Customer-facing label" wide hint="Shown on the customer’s card."><TextInput maxLength={80} value={draft.rewardLabel} onChange={(event) => setDraft({ ...draft, rewardLabel: event.target.value })} placeholder="Rewards balance" /></Field>
          <Field label="Reward rate (%)" hint="Percent returned to the customer from each eligible bill."><TextInput type="number" min="0.01" max="100" step="0.01" value={draft.rewardRatePercent} onChange={(event) => setDraft({ ...draft, rewardRatePercent: event.target.value })} /></Field>
          <Field label="Minimum eligible bill (Rs.)" hint="Orders below this amount earn no rewards."><TextInput type="number" min="0" step="0.01" value={draft.minimumOrderAmount} onChange={(event) => setDraft({ ...draft, minimumOrderAmount: event.target.value })} /></Field>
          <Field label="Maximum redemption per bill (%)" hint="Protects the business from full-bill redemptions."><TextInput type="number" min="0" max="100" step="0.01" value={draft.maxRedemptionPercent} onChange={(event) => setDraft({ ...draft, maxRedemptionPercent: event.target.value })} /></Field>
          <Field label="Rewards expiry (days)" hint="Leave blank for no expiry."><TextInput type="number" min="1" max="3650" value={draft.expiryDays ?? ''} onChange={(event) => setDraft({ ...draft, expiryDays: event.target.value ? Number(event.target.value) : null })} /></Field>
        </div>
        <footer><div>{message ? <span className={status === 'error' ? 'is-error' : ''} role={status === 'error' ? 'alert' : 'status'}>{message}</span> : <span>Customers will not earn rewards while the program is paused.</span>}</div><button className="manage-button is-primary" disabled={!changed || status === 'saving'}><Save size={14} />{status === 'saving' ? 'Saving…' : 'Save program'}</button></footer>
      </form>
      <aside className="rewards-program-preview manage-card"><span><ShieldCheck size={20} /></span><small>CUSTOMER EXAMPLE</small><h3>{draft.rewardLabel || 'Rewards balance'}</h3><strong>Rs. 60.00</strong><p>On a Rs. 1,200 eligible bill, the customer earns Rs. {((Number(draft.rewardRatePercent || 0) / 100) * 1200).toFixed(2)}.</p><dl><div><dt>Eligible from</dt><dd>Rs. {Number(draft.minimumOrderAmount || 0).toFixed(2)}</dd></div><div><dt>Can use per bill</dt><dd>Up to {draft.maxRedemptionPercent || '0'}%</dd></div></dl></aside>
    </div>
  </section>
}

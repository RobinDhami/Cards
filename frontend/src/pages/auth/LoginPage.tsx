import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.mjs'
import LockKeyhole from 'lucide-react/dist/esm/icons/lock-keyhole.mjs'
import UserRound from 'lucide-react/dist/esm/icons/user-round.mjs'
import { Field, TextInput } from '../../components/manage/FormControls'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './LoginPage.css'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Sign in | Tap2Connect'
    apiFetch<{ authenticated: boolean; redirectPath: string }>('/api/session/')
      .then((session) => {
        if (session.authenticated) window.location.replace(session.redirectPath)
      })
      .catch(() => undefined)
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const session = await apiFetch<{ redirectPath: string }>('/api/session/login/', {
        method: 'POST',
        body: jsonBody({ username, password }),
      })
      window.location.href = session.redirectPath
    } catch (reason) {
      setError(displayError(reason))
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <a href="/" className="auth-logo">
          <img src="/static/branding/tap2connect-logo.png" alt="Tap2Connect" />
        </a>
        <div>
          <span>Digital identity platform</span>
          <h1>Manage every card, school, and business from one secure workspace.</h1>
          <p>Use the credentials assigned to your platform, school, professional profile, or organization account.</p>
        </div>
      </section>
      <form className="auth-form-panel" onSubmit={submit}>
        <span className="auth-lock"><LockKeyhole size={21} /></span>
        <h2>Welcome back</h2>
        <p>Sign in to open your Tap2Connect dashboard.</p>
        {error ? <div className="manage-alert">{error}</div> : null}
        <Field label="Username">
          <span className="auth-input">
            <UserRound size={15} aria-hidden="true" />
            <TextInput
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </span>
        </Field>
        <Field label="Password">
          <span className="auth-input">
            <LockKeyhole size={15} aria-hidden="true" />
            <TextInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </span>
        </Field>
        <button className="manage-button is-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
          <ArrowRight size={15} />
        </button>
        <a href="/">Return to Tap2Connect home</a>
      </form>
    </main>
  )
}

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import './LoginPage.css'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Login | Tap2Connect'
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
      <header className="auth-topbar">
        <a href="/" className="auth-logo" aria-label="Tap2Connect home">
          <span><img src="/static/branding/tap2connect-logo-official.png" alt="Tap2Connect" /></span>
        </a>
        <a className="auth-top-action" href="/">Back to website</a>
      </header>

      <section className="auth-card" aria-labelledby="login-title">
        <h1 id="login-title">Welcome back!</h1>
        <p className="auth-copy">Login to manage your Tap2Connect profiles, cards, and workspace.</p>

        {error ? <div className="manage-alert">{error}</div> : null}

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>Username</span>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Login to your account'}
          </button>
        </form>

        <p className="auth-support">Need access? Contact your school or Tap2Connect admin.</p>
      </section>
    </main>
  )
}

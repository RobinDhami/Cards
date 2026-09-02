import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Eye from 'lucide-react/dist/esm/icons/eye.js'
import EyeOff from 'lucide-react/dist/esm/icons/eye-off.js'
import { apiFetch, displayError, jsonBody } from '../../lib/api'
import logoAsset from '../../../../theme/static/branding/tap2connect-logo-optimized.webp'
import './LoginPage.css'

type LoginSurface = 'normal' | 'platform'

function LoginForm({ surface }: { surface: LoginSurface }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const isPlatform = surface === 'platform'
    document.title = `${isPlatform ? 'Platform Admin Login' : 'Login'} | Tap2Connect`
    apiFetch<{ authenticated: boolean; redirectPath: string; user: { role: string } }>('/api/session/')
      .then((session) => {
        const matchesSurface = isPlatform
          ? ['super_admin', 'platform_staff'].includes(session.user.role)
          : !['super_admin', 'platform_staff'].includes(session.user.role)
        if (session.authenticated && matchesSurface && session.redirectPath) {
          window.location.replace(session.redirectPath)
        }
      })
      .catch(() => undefined)
  }, [surface])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const endpoint = surface === 'platform'
        ? '/api/platform/session/login/'
        : '/api/session/login/'
      const session = await apiFetch<{ redirectPath: string }>(endpoint, {
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
          <img className="auth-logo__symbol" src={logoAsset} alt="" />
          <span className="auth-logo__wordmark">
            <strong><span>TAP</span><span className="auth-logo__two">2</span><span>CONNECT</span></strong>
            <small>Nepal</small>
          </span>
        </a>
        <a className="auth-top-action" href={surface === 'platform' ? '/login/' : '/'}>
          {surface === 'platform' ? 'User login' : 'Back to website'}
        </a>
      </header>

      <section className="auth-card" aria-labelledby="login-title">
        <h1 id="login-title">{surface === 'platform' ? 'Platform administration' : 'Welcome back!'}</h1>
        <p className="auth-copy">
          {surface === 'platform'
            ? 'Sign in with a Super Admin or Platform Staff account.'
            : 'Login to manage your Tap2Connect profiles, cards, and workspace.'}
        </p>

        {error ? <div className="manage-alert">{error}</div> : null}

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <div className="auth-password-field">
              <input
                id="login-password"
                type={passwordVisible ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                className="auth-password-toggle"
                type="button"
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                {passwordVisible
                  ? <EyeOff size={18} aria-hidden="true" />
                  : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Logging in...' : (surface === 'platform' ? 'Login to Platform' : 'Login to your account')}
          </button>
        </form>

        <p className="auth-support">
          {surface === 'platform'
            ? 'This login is restricted to authorized platform accounts.'
            : 'Need access? Contact your school or Tap2Connect admin.'}
        </p>
      </section>
    </main>
  )
}

export function LoginPage() {
  return <LoginForm surface="normal" />
}

export function PlatformLoginPage() {
  return <LoginForm surface="platform" />
}

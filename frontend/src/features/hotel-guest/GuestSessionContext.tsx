import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { GuestSessionContext } from './guest-session-context'
import { apiFetch, jsonBody } from '../../lib/api'

export function GuestSessionProvider({ children, publicIdentifier, guestAccessEnabled = true }: { children: ReactNode; publicIdentifier: string; guestAccessEnabled?: boolean }) {
  const [guestToken, setGuestToken] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null)
  const refreshStatus = useCallback(() => apiFetch<{ verified: boolean; sessionExpiresAt?: string }>(`/api/hotels/guest/${encodeURIComponent(publicIdentifier)}/access/status/`).then((status) => { setVerified(status.verified); setSessionExpiresAt(status.sessionExpiresAt ?? null) }).catch(() => { setVerified(false); setSessionExpiresAt(null) }), [publicIdentifier])
  useEffect(() => { if (guestAccessEnabled) void refreshStatus(); else { setVerified(false); setSessionExpiresAt(null) } }, [guestAccessEnabled, refreshStatus])
  const activate = useCallback(async (accessCode: string) => {
    const status = await apiFetch<{ verified: boolean; sessionExpiresAt?: string }>(`/api/hotels/guest/${encodeURIComponent(publicIdentifier)}/access/activate/`, { method: 'POST', body: jsonBody({ accessCode }) })
    setVerified(status.verified)
    setSessionExpiresAt(status.sessionExpiresAt ?? null)
  }, [publicIdentifier])
  const logout = useCallback(async () => {
    await apiFetch(`/api/hotels/guest/${encodeURIComponent(publicIdentifier)}/access/logout/`, { method: 'POST' })
    setVerified(false)
    setSessionExpiresAt(null)
    window.dispatchEvent(new Event('guest-access-logout'))
  }, [publicIdentifier])
  const value = useMemo(() => ({ guestToken, setGuestToken, verified, sessionExpiresAt, activate, logout }), [guestToken, verified, sessionExpiresAt, activate, logout])
  return <GuestSessionContext.Provider value={value}>{children}</GuestSessionContext.Provider>
}

import { useContext } from 'react'
import { GuestSessionContext } from './guest-session-context'

export function useGuestSession() {
  const context = useContext(GuestSessionContext)
  if (!context) throw new Error('useGuestSession must be used inside GuestSessionProvider')
  return context
}

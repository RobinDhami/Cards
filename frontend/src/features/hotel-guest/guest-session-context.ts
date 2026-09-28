import { createContext } from 'react'

export type GuestSessionContextValue = {
  guestToken: string | null
  setGuestToken: (token: string | null) => void
  verified: boolean
  sessionExpiresAt: string | null
  activate: (accessCode: string) => Promise<void>
  logout: () => Promise<void>
}

export const GuestSessionContext = createContext<GuestSessionContextValue | null>(null)

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type GuestCartLine = { identifier: string; name: string; price: string; currency: string; image: string; quantity: number; instructions: string }
type GuestCartValue = { lines: GuestCartLine[]; itemCount: number; estimatedSubtotal: number; add: (line: Omit<GuestCartLine, 'quantity'>) => void; increment: (identifier: string) => void; decrement: (identifier: string) => void; remove: (identifier: string) => void; updateInstructions: (identifier: string, instructions: string) => void; clear: () => void; setContext: (contextKey: string) => void }
const GuestCartContext = createContext<GuestCartValue | null>(null)

export function GuestCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<GuestCartLine[]>([])
  const [contextKey, setContextKey] = useState('')
  useEffect(() => { const clearOnLogout = () => setLines([]); window.addEventListener('guest-access-logout', clearOnLogout); return () => window.removeEventListener('guest-access-logout', clearOnLogout) }, [])
  const setContext = useCallback((next: string) => { if (contextKey && contextKey !== next) setLines([]); setContextKey(next) }, [contextKey])
  const add = useCallback((line: Omit<GuestCartLine, 'quantity'>) => setLines((current) => { const existing = current.find((item) => item.identifier === line.identifier); if (existing) return current.map((item) => item.identifier === line.identifier ? { ...item, quantity: Math.min(50, item.quantity + 1) } : item); return current.length >= 50 ? current : [...current, { ...line, quantity: 1 }] }), [])
  const increment = useCallback((identifier: string) => setLines((current) => current.map((line) => line.identifier === identifier ? { ...line, quantity: Math.min(50, line.quantity + 1) } : line)), [])
  const decrement = useCallback((identifier: string) => setLines((current) => current.flatMap((line) => line.identifier !== identifier ? [line] : line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : [])), [])
  const remove = useCallback((identifier: string) => setLines((current) => current.filter((line) => line.identifier !== identifier)), [])
  const updateInstructions = useCallback((identifier: string, instructions: string) => setLines((current) => current.map((line) => line.identifier === identifier ? { ...line, instructions: instructions.slice(0, 500) } : line)), [])
  const clear = useCallback(() => setLines([]), [])
  const value = useMemo(() => ({ lines, itemCount: lines.reduce((sum, line) => sum + line.quantity, 0), estimatedSubtotal: lines.reduce((sum, line) => sum + Number(line.price || 0) * line.quantity, 0), add, increment, decrement, remove, updateInstructions, clear, setContext }), [lines, add, increment, decrement, remove, updateInstructions, clear, setContext])
  return <GuestCartContext.Provider value={value}>{children}</GuestCartContext.Provider>
}

export function useGuestCart() { const context = useContext(GuestCartContext); if (!context) throw new Error('useGuestCart must be used inside GuestCartProvider'); return context }

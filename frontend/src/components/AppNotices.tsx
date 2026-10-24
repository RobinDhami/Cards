import { useEffect, useState } from 'react'
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2.js'
import CircleAlert from 'lucide-react/dist/esm/icons/circle-alert.js'
import Info from 'lucide-react/dist/esm/icons/info.js'
import X from 'lucide-react/dist/esm/icons/x.js'
import { type AppNotice, noticeEventName } from '../lib/notices'
import './AppNotices.css'

type NoticeWithId = AppNotice & { id: number }

export function AppNotices() {
  const [notices, setNotices] = useState<NoticeWithId[]>([])
  useEffect(() => {
    let nextId = 1
    const addNotice = (event: Event) => {
      const detail = (event as CustomEvent<AppNotice>).detail
      if (!detail?.title) return
      const notice = { ...detail, id: nextId++ }
      setNotices((current) => [...current.slice(-3), notice])
      window.setTimeout(() => setNotices((current) => current.filter((item) => item.id !== notice.id)), 5000)
    }
    window.addEventListener(noticeEventName, addNotice)
    return () => window.removeEventListener(noticeEventName, addNotice)
  }, [])
  if (!notices.length) return null
  return <aside className="app-notices" aria-live="polite" aria-label="Notifications">{notices.map((notice) => {
    const Icon = notice.kind === 'success' ? CheckCircle2 : notice.kind === 'error' ? CircleAlert : Info
    return <article className={`app-notice is-${notice.kind}`} key={notice.id} role={notice.kind === 'error' ? 'alert' : 'status'}><Icon aria-hidden="true" /><div><strong>{notice.title}</strong>{notice.message ? <p>{notice.message}</p> : null}</div><button type="button" aria-label="Dismiss notification" onClick={() => setNotices((current) => current.filter((item) => item.id !== notice.id))}><X size={16} /></button></article>
  })}</aside>
}
